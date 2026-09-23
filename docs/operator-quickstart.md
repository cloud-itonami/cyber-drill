# cyber-drill — operator quickstart

**この文書に書いてある手順は、実際に実行して出力を確認したものだけである。**
通らなかったものは「手順」ではなく「§4 いま通らないこと」に落としてある ——
踏めない手順を手順として書かない。§0〜3 は 2026-08-13 実測のまま
（Worker 側は SPA の移行と無関係）。§4.1 は 2026-09-24、Svelte → cljs 移行
（ADR-2608260900）後に実測し直した。

対象読者: この repo を clone して、顧客に訓練 URL を 1 本渡すところまでを
やる運用者。

前提: `node`（v20+）、`pnpm`（実測 10.26.2、Worker 用）、`npm`（`cljs/` 用）。
Cloudflare へ配信するなら `wrangler` の認証。

```sh
git clone git@github.com:cloud-itonami/cyber-drill.git
cd cyber-drill
```

### 実行記録

| § | コマンド | 実測 exit |
|---|---|---|
| 1 | `worker$ pnpm install` | 0（2026-08-13） |
| 2 | `worker$ npx tsc --noEmit` | 0（出力なし、2026-08-13） |
| 3 | `worker$ node scripts/gen-key.mjs --tenant=demo-jp` | 0（2026-08-13） |
| 3 | `worker$ node scripts/gen-key.mjs`（引数なし） | 2（usage、2026-08-13） |
| 4.1 | `cljs$ npm install` | **0（2026-09-24）** |
| 4.1 | `cljs$ npm run build`（= `amu compile --target wasm32-browser app`） | **64（usage error、2026-09-24）** |

`node_modules` を消した素の tree で逐語実行。旧 §0 の preflight
（`@etzhayyim/kami-engine-sdk` の `link:` 解決確認）は `svelte/` を削除した
この移行（2026-09-24、ADR-2608260900）で意味を失ったので削除した。

---

## 0. 現在の状態 —— SPA は今もビルドできない（別の理由で）

`svelte/` は 2026-09-24 の移行（ADR-2608260900）で削除され、`link:`
リンク切れという旧 §0 の問題は消えた。だが `cljs/` の
`npm run build`（= `amu compile --target wasm32-browser app`）は
**別の理由で exit 64 になる**（§4.1 で実測）: `--target wasm32-browser` は
Kotoba 安全言語のモジュールグラフ向けで、`reagent` / `re-frame` /
`jp-go-dds` のような通常の ClojureScript ライブラリの `:require` を解決
しない。`npm install` は exit 0 になるので、旧 §0 と同じ罠
（install の緑をビルド可能性と読まない）がここでも生きている。

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

### 4.1 SPA のビルド —— 落ちる（2026-09-24、cljs 移行後に実測し直し）

```sh
cd cljs && npm install && npm run build
```

`npm install` は **exit 0**。`npm run build`（=
`amu compile --target wasm32-browser app`）が **exit 64** で落ちる:

```
{:format :kotoba.cli-error/v1, :ok false, :error :usage,
 :diagnostic {:format :kotoba.diagnostic/v1, :code :kotoba/invalid-usage, :severity :error},
 :message "source input must use .kotoba, .cljk, or .cljc"}
```

`amu compile <entry.kotoba> --target wasm32-browser --output <file>`
（ファイルを先頭に置く）まで進めると別のエラーになる:

```
{:error :subset, :diagnostic {:code :kotoba.error/namespace-require-needs-project, ...},
 :message "this namespace declares (:require ...), so it is a module of a
   multi-file project; the single-module path admits only a standalone
   namespace. Pin the graph with `amu module-lock <entry> --source-path <dir>
   --blocks <dir>` then `amu compile --module-lock <lock> --blocks <dir>`; ..."}
```

`amu module-lock` / `amu check` に進めると
`:kotoba/project-link-failed`（「明示的な `:export` vector が要る」）で
止まる。**`--target wasm32-browser` は Kotoba 安全言語のネイティブ/WASM
モジュールグラフ向けの経路で、`reagent` / `re-frame` / `jp-go-dds` のような
Maven/npm 由来の通常の ClojureScript ライブラリを `:require` する
namespace は、この経路では解決できない。** これは `orgs/cloud-itonami/recap`
の `cljs/package.json`（同じ `amu compile --target wasm32-browser app`
という build script）をそのまま踏襲した結果分かったことで、あちら側も
実際にこのコマンドでビルドが通ったことを検証したログは無い
（`93e3795` のコミットメッセージは "Text only; no mirror;
fix-forward" — 機械的な文字列置換であって実行結果の確認ではない）。

したがって `worker/package.json` の `build:assets`、その先の
`wrangler deploy`（`assets.directory` が `../cljs/public`）も現状は通らない。
`git worktree`・deps.edn・shadow-cljs.edn・ソース自体（reagent + re-frame +
jp-go-dds、`kami-webvr` を git 依存として消費）は用意してあるので、amu 側の
「reagent/re-frame のような通常の ClojureScript ライブラリを含むブラウザ
バンドルをどう作るか」（shadow-cljs 相当の経路）が定まれば、そのまま
ビルドできる可能性がある。

> 重い build を回すときは、この workspace の規約どおり
> `node <root>/scripts/resource-guard.mjs run build -- amu compile --target wasm32-browser app`
> を通す（同時に 1 本だけ）。上の実測もこれ経由。

### 4.2 シナリオのテスト —— ランナーが無い

`scenarios/semiconductor-chem-plant.test.ts` の不変条件（全ノードが
`start` から到達可能 / 全終端が outcome を持つ / `applySelection` の
ハッピーパスが success 終端に着く）を検証する `test` script は、
`worker/package.json` にも `cljs/package.json` にも、ルートにも無い
（ルートに `package.json` が無い）。`scenarios/*.ts` はこの移行の対象外で
無改変。`scenarios/semiconductor-chem-plant.test.ts` は
`vitest` と `@etzhayyim/kami-engine-sdk/webvr` を import するが、
`vitest` は依存に入っていない。**この不変条件は現在どこでも検査されて
いない。**`cljs/test/cyber_drill_frontend/app_test.kotoba` はこの移行で
足した re-frame の単体テストで、`kami.webvr.incident-pregel` に対しては
書いてあるが、対象は小さいローカルのデモシナリオであって
`scenarios/semiconductor-chem-plant.ts` の 14 ノードではない。

### 4.3 ローカル開発サーバ —— この環境では確認できなかった

`npx wrangler dev` は Worker のバインディング（`DRILL_KEYS` / `COOKIE_NAME` /
`SESSION_TTL_HOURS`）を正しく読み込むところまで進んだが、この作業機で
`EMFILE: too many open files, watch` に当たって起動を完了できなかった。
**repo の欠陥ではなく作業機側の fd 枯渇**（多数の並行セッションが同居して
いる）。`ulimit -n` に余裕のある機械では別の結果になりうるので、
「通る」とも「通らない」とも書かない —— 未確認として残す。
なお `../cljs/public/js` が無い状態（§4.1）では、いずれにせよ静的アセットは
配れない。

---

## 5. 用語

| 語 | 意味 |
|---|---|
| **key** | 顧客に渡す 8 文字の入場鍵。KV には平文ではなく `key:<sha256hex>` として入る |
| **kid** | 鍵ハッシュの先頭 16 hex。セッションに載り、どの鍵で入ったかを追跡する |
| **session** | `base64url(payload).base64url(HMAC-SHA256)`。`SESSION_SECRET` で署名（`wrangler secret put` で投入、commit しない） |
| **terminal** | シナリオの終端ノード。`'success'` / `'failure'` を持ち、選択肢を持たない |
