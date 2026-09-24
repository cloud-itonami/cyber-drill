# cyber-drill — operator quickstart

**この文書は最新状態のみを表す。履歴は git。** 2026-08-13 の `svelte/` 実行記録
（当時 preflight / ビルドが exit 1 だった詳細）は git 履歴とこのファイルの過去版、
および `docs/adr/0001-…` を見ること。2026-09-24 の cljs 移行後にここへ残すのは、
いま実際に踏める手順だけ。

対象読者: この repo を clone して、顧客に訓練 URL を 1 本渡すところまでを
やる運用者。

前提: `node`（v20+）、`pnpm`（Worker 側）、`npm`（`cljs/` 側）。Cloudflare へ
配信するなら `wrangler` の認証。

```sh
git clone git@github.com:cloud-itonami/cyber-drill.git
cd cyber-drill
```

---

## 0. SPA（`cljs/`）をビルドする

```sh
cd cljs
npm install
npm run release   # amu compile --target wasm32-browser app -> public/js/app.js
cd ..
```

`public/index.html` は `js/app.js` を相対パスで読む単一ドキュメント
（single-page app、ADR-2608080100）。ユニットテストは
`cd cljs && npm test`（`amu compile --target wasm32-browser test` →
`node out/tests.js`）—— `cyber_drill.app-test` にシナリオ到達性の不変条件
（旧 §4.2 の後継。全ノードが `start` から到達可能 / 選択肢グレード最良の経路が
`:success` 終端に着く）が入っている。

`svelte/`（SvelteKit adapter-static、`@etzhayyim/kami-engine-sdk` への
dangling `link:` 依存でビルド不能だった旧 SPA）は削除済み。経緯は
[docs/adr/0001](adr/0001-extraction-severed-the-webvr-sdk-link.md)。

---

## 1. Worker の依存を入れる

```sh
cd worker
pnpm install
```

実測: **exit 0**。入るのは `wrangler 3.114.17` /
`@cloudflare/workers-types` / `typescript 5.9.3` の 3 つだけ
（Worker は実行時依存を持たない）。

pnpm 10 は `esbuild` / `sharp` / `workerd` の postinstall を既定でブロックし、
`Ignored build scripts: … Run "pnpm approve-builds" …` と告げる。
**このままでよい** —— §2 と §3 はこの 3 つを実行しない
（承認しない状態で type check も鍵発行も通ることを確認済み）。

## 2. 鍵ゲートの型検査を通す

この repo にテストランナーは無い（§4 参照）。Worker 側で今日実行できる
唯一の自動検査が型検査で、`src/auth.ts` の HMAC セッション・KV 参照・
cookie の読み書きがコンパイルできることを見る:

```sh
npx tsc --noEmit
```

実測: 出力なし、exit 0。

## 3. 顧客に渡す鍵を発行する

```sh
node scripts/gen-key.mjs --tenant=demo-jp --days=30 --notes="quickstart walk"
```

実測の出力（鍵はランダムなので毎回変わる）:

```
============ cyber-drill access key ============
  KEY (give to customer):  935828hu
  tenant:                  demo-jp
  issuedAt:                2026-08-12T19:37:52.421Z
  expiresAt:               2026-09-11T19:37:52.423Z
  notes:                   quickstart walk
  kid (first 16 of hash):  81429c690b9aa3d9

Hand the customer this URL (replace WORKER_HOST):
  https://WORKER_HOST/?key=935828hu

Register the key in CF KV by running ONE of:
  # wrangler v3 (current local copy in node_modules):
  npx wrangler kv:key put --binding=DRILL_KEYS \
    "key:81429c69…e611" \
    '{"tenant":"demo-jp","issuedAt":"…","expiresAt":"…","notes":"quickstart walk"}'
  # wrangler v4 (global / npx default):
  npx wrangler kv key put --binding=DRILL_KEYS --remote \
    "key:81429c69…e611" \
    '{…}'
```

`--tenant` を省くと usage を出して **exit 2**（実測）。

**鍵の見た目が文書と違う。** `worker/README.md` と `src/auth.ts` の docstring は
鍵を `sk_drill_<random>` と書いているが、`gen-key.mjs` が実際に出すのは
接頭辞なしの 8 文字（例 `935828hu`、混同しにくい 31 文字のアルファベットで
約 40 ビット）。**動作としては正しい** —— `auth.ts` は鍵文字列をそのまま
SHA-256 して `key:<hex>` を引くだけで、形式を検証していない。ずれているのは
文書だけなので、顧客に「`sk_drill_` で始まる鍵が届く」と説明しないこと。
鍵長を変えるなら `--len=<6..16>`。

発行したら、印字された `wrangler kv … put` を**自分で実行して**
KV に登録し、`https://WORKER_HOST/?key=…` を顧客に渡す。顧客が 1 回開くと
HttpOnly cookie（既定 24 時間、`wrangler.jsonc` の `SESSION_TTL_HOURS`）が
入り、以後 URL に鍵は要らない。

失効は KV から消す:

```sh
npx wrangler kv key delete --binding=DRILL_KEYS --remote "key:<sha256hex>"
```

**発行済み cookie は TTL が切れるまで生き続ける。** 即時に切りたいなら
`SESSION_TTL_HOURS` を短くして再デプロイする。

---

## 4. いま通らないこと・未確認のこと

2026-08-13 時点でここにあった「4.1 SPA のビルドが落ちる」「4.2 シナリオの
テストランナーが無い」は 2026-09-24 の cljs 移行で両方解消した（§0 参照、
かつ `cd cljs && npm test` がランナー）—— 古い記述は git 履歴を見ること。
まだ残っているのは配信そのものの未確認だけ:

### 4.1 `wrangler deploy` — この移行では実行していない

`worker/wrangler.jsonc` の `assets.directory` は `../cljs/public` を指すよう
更新した（§0 のビルドで `../cljs/public/js/app.js` が作られる前提）が、
**`wrangler deploy` / `wrangler dev` はこの移行作業では実行していない
（UNVERIFIED）。** デプロイ前に §0 のビルドが緑であることを自分で確認すること。

### 4.2 ローカル開発サーバ —— この環境では確認できなかった

`npx wrangler dev` は Worker のバインディング（`DRILL_KEYS` / `COOKIE_NAME` /
`SESSION_TTL_HOURS`）を正しく読み込むところまで進んだが、この作業機で
`EMFILE: too many open files, watch` に当たって起動を完了できなかった
（2026-08-13 実測）。**repo の欠陥ではなく作業機側の fd 枯渇**（多数の並行
セッションが同居している）。`ulimit -n` に余裕のある機械では別の結果に
なりうるので、「通る」とも「通らない」とも書かない —— 未確認として残す。

---

## 5. 用語

| 語 | 意味 |
|---|---|
| **key** | 顧客に渡す 8 文字の入場鍵。KV には平文ではなく `key:<sha256hex>` として入る |
| **kid** | 鍵ハッシュの先頭 16 hex。セッションに載り、どの鍵で入ったかを追跡する |
| **session** | `base64url(payload).base64url(HMAC-SHA256)`。`SESSION_SECRET` で署名（`wrangler secret put` で投入、commit しない） |
| **terminal** | シナリオの終端ノード。`'success'` / `'failure'` を持ち、選択肢を持たない |
