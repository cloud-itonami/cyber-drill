# cyber-drill — operator quickstart

**この文書に書いてある手順は、2026-08-13 に全部実際に実行して出力を確認したもの
だけである。** 通らなかったものは「手順」ではなく「§4 いま通らないこと」に
落としてある —— 踏めない手順を手順として書かない。

対象読者: この repo を clone して、顧客に訓練 URL を 1 本渡すところまでを
やる運用者。

前提: `node`（v20+）、`pnpm`（実測 10.26.2）。Cloudflare へ配信するなら
`wrangler` の認証。

```sh
git clone git@github.com:cloud-itonami/cyber-drill.git
cd cyber-drill
```

### 実行記録（2026-08-13、`node_modules` を消した素の tree で逐語実行）

| § | コマンド | 実測 exit |
|---|---|---|
| 0 | preflight one-liner | **1**（= SDK リンク切れ。現状これが正常な観測） |
| 1 | `worker$ pnpm install` | 0 |
| 2 | `worker$ npx tsc --noEmit` | 0（出力なし） |
| 3 | `worker$ node scripts/gen-key.mjs --tenant=demo-jp` | 0 |
| 3 | `worker$ node scripts/gen-key.mjs`（引数なし） | 2（usage） |
| 4.1 | `svelte$ pnpm install` | **0 ← 緑になるが直後のビルドは落ちる** |
| 4.1 | `svelte$ pnpm run build` | 1（Rollup 解決失敗） |

---

## 0. まず preflight —— SPA がビルドできる状態かを 1 コマンドで見る

**`pnpm install` の成功はビルド可能性を意味しない。** `svelte/package.json` の
SDK 依存は pnpm の `link:` 指定で、pnpm はリンク先が存在しなくても
シンボリックリンクだけ作って **exit 0 を返す**。ビルドまで進んで初めて落ちる。
先に見る:

```sh
node -e 'const fs=require("fs"),path=require("path");
const spec=JSON.parse(fs.readFileSync("svelte/package.json","utf8"))
  .dependencies["@etzhayyim/kami-engine-sdk"];
const p=path.resolve("svelte",spec.replace(/^link:/,""));
console.log(fs.existsSync(p)?"OK       "+p:"MISSING  "+p);
process.exit(fs.existsSync(p)?0:1)'
```

2026-08-13 時点の実際の出力（exit 1）:

```
MISSING  /private/40-engine/kami-engine/kami-engine-sdk
```

**MISSING が出るのが現在の正常な観測結果**である（理由は
[docs/adr/0001](adr/0001-extraction-severed-the-webvr-sdk-link.md)）。
この状態でも §1〜§3 —— Worker の検査と顧客鍵の発行 —— は全部通る。
SPA のビルドと配信だけが止まる。

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

## 4. いま通らないこと（手順として書けないもの）

### 4.1 SPA のビルド —— 落ちる

```sh
cd svelte && pnpm install && pnpm run build
```

`pnpm install` は **exit 0**（前述のとおりリンク切れを検出しない）。
ビルドが落ちる:

```
error during build:
[vite]: Rollup failed to resolve import "@etzhayyim/kami-engine-sdk/webvr"
  from ".../svelte/src/routes/+page.svelte".
```

したがって `worker/package.json` の `build:assets`、その先の
`wrangler deploy`（`assets.directory` が `../svelte/build`）も現状は通らない。
原因と選択肢は [docs/adr/0001](adr/0001-extraction-severed-the-webvr-sdk-link.md)。

> 重い build を回すときは、この workspace の規約どおり
> `node <root>/scripts/resource-guard.mjs run build -- pnpm run build` を通す
> （同時に 1 本だけ）。上の実測もこれ経由。

### 4.2 シナリオのテスト —— ランナーが無い

`AGENTS.md` は「`pnpm test` で `webvr.test.ts` の不変条件に照らして到達性を
検証する」と書いているが、**この repo に `test` script は 1 つも無い**
（`svelte/package.json` にも `worker/package.json` にも無く、ルートに
`package.json` が無い）。`scenarios/semiconductor-chem-plant.test.ts` は
`vitest` と `@etzhayyim/kami-engine-sdk/webvr` を import するが、
`vitest` は依存に入っていない。テストが検査するはずの不変条件
（全ノードが `start` から到達可能 / 全終端が outcome を持つ /
`applySelection` のハッピーパスが success 終端に着く）は、**現在どこでも
検査されていない**。

### 4.3 ローカル開発サーバ —— この環境では確認できなかった

`npx wrangler dev` は Worker のバインディング（`DRILL_KEYS` / `COOKIE_NAME` /
`SESSION_TTL_HOURS`）を正しく読み込むところまで進んだが、この作業機で
`EMFILE: too many open files, watch` に当たって起動を完了できなかった。
**repo の欠陥ではなく作業機側の fd 枯渇**（多数の並行セッションが同居して
いる）。`ulimit -n` に余裕のある機械では別の結果になりうるので、
「通る」とも「通らない」とも書かない —— 未確認として残す。
なお `../svelte/build` が無い状態では、いずれにせよ静的アセットは配れない。

---

## 5. 用語

| 語 | 意味 |
|---|---|
| **key** | 顧客に渡す 8 文字の入場鍵。KV には平文ではなく `key:<sha256hex>` として入る |
| **kid** | 鍵ハッシュの先頭 16 hex。セッションに載り、どの鍵で入ったかを追跡する |
| **session** | `base64url(payload).base64url(HMAC-SHA256)`。`SESSION_SECRET` で署名（`wrangler secret put` で投入、commit しない） |
| **terminal** | シナリオの終端ノード。`'success'` / `'failure'` を持ち、選択肢を持たない |
