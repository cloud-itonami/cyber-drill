# ADR-0001 — 抽出で WebVR SDK のリンクが切れた（記録し、黙って直さない）

- **状態**: accepted（記録として）。**2026-09-24 追記で一部解消・一部再発** — 下記参照
- **日付**: 2026-08-13
- **範囲**: `cloud-itonami/cyber-drill`
- **上流**: ADR-2605172400（3 軸分割 / vendor 判定）、ADR-2607102200（`-clj` 接尾辞の撤去と改名）、ADR-2608260900（Svelte/React 退役、cljs/reagent/re-frame が既定）

## 文脈

この repo は `etzhayyim/root` の `60-apps/etzhayyim-project-cyber-drill`
（rev `cc681c5`、35 ファイル / 277,925 バイト）を単体 repo に切り出したもの
（`migration.edn`、抽出 commit `3008079`）。

抽出は**ファイルをそのまま運んだ**。`svelte/package.json` の依存もそのままで:

```json
"@etzhayyim/kami-engine-sdk": "link:../../../40-engine/kami-engine/kami-engine-sdk"
```

この `../../../` はモノレポの `60-apps/<app>/svelte/` から数えた相対パスであって、
単体 repo の中では**リポジトリの外を指す**。

## 観測（2026-08-13、実測）

1. **`pnpm install` は成功する。** pnpm の `link:` は遅延シンボリックリンクなので、
   リンク先が無くてもリンクだけ作って **exit 0** を返す。
   `node_modules/@etzhayyim/kami-engine-sdk` は作られるが dangling。
2. **ビルドで落ちる。**
   `[vite]: Rollup failed to resolve import "@etzhayyim/kami-engine-sdk/webvr"
   from ".../svelte/src/routes/+page.svelte"`。
3. 連鎖して、`worker` の `build:assets` と `wrangler deploy`
   （`assets.directory: "../svelte/build"`）も通らない。
4. `scenarios/*.test.ts` も同じ SDK を import するが、そもそも `test` script が
   この repo のどこにも無く、`vitest` も依存に入っていない。**シナリオの
   到達性不変条件は現在どこでも検査されていない。**
5. **Worker 側は無傷** —— `pnpm install` / `npx tsc --noEmit` とも exit 0、
   `gen-key.mjs` も動く。壊れているのは SPA の依存 1 本だけである。

**install の緑がビルド可能性と区別できない**ことが、この破損が抽出から
今日まで気付かれなかった経路である。

## 依存先はもう「戻せる場所」に無い

| 探した先 | 実際 |
|---|---|
| `kotoba-lang/kami-engine-sdk-svelte`（この TS パッケージの後身） | **GitHub で archived / read-only**（最終 push 2026-07-10）。ADR-2607102200 で改名され、その後 pruned |
| `kotoba-lang/kami-engine-sdk` | 同名だが**別物**。Clojure/ClojureScript の authoring SDK で、npm パッケージではない（`package.json` を持たない） |
| `kotoba-lang/kami-webvr` | **webvr モジュールそのもの**が 1:1 で ClojureScript に移植済み。README が自分で「originally used by `ai-gftd-cyber-drill`」と名指ししている。`kami.webvr.incident-pregel` に `initial-state` / `apply-selection` があり、`types.cljc` に `IncidentScenario` 相当の形がある |

つまり**機能は失われていない。言語が変わった。**
`link:` を書き換えて直る話ではない。

## 決定

**この反復では直さず、破損を文書化する。**

1. `README.md` と `docs/operator-quickstart.md` に、ビルドできないことと
   その理由・切り分け手順（1 コマンドの preflight）を書く。
2. quickstart には**実際に踏めた手順だけ**を載せ、落ちるものは「手順」ではなく
   「通らないこと」として分ける。
3. 修復そのものは着手しない。

### なぜ直さないか

- 直すとは実質「Svelte/TS の consumer を `kami-webvr`(cljs) 側へ移植する」ことで、
  SPA の書き換えになる。**依存 1 行の修正ではない。**
- その方向はワークスペースの既存規則（新規 TS を足さない / 3D は kami-engine
  スタック / cljc・cljs 優先）と一致するので、**やるなら正面から**やる仕事であって、
  ドキュメント整備の副産物にすべきではない。
- archived な `kami-engine-sdk-svelte` を復活させる選択肢は取らない
  （read-only であり、ADR-2607102200 が意図して退役させた）。

### 却下した代替案

| 案 | 却下理由 |
|---|---|
| `link:` を `../../kotoba-lang/kami-engine-sdk` に張り替える | 中身が cljc の SDK で、`@etzhayyim/kami-engine-sdk/webvr` という ESM サブパスを持たない。**リンクは通るがビルドは同じ場所で落ちる** —— 症状を隠すだけ悪い |
| archived repo から SDK を vendoring する | 退役した TS 実装を vendor-private repo に固定してしまい、`kami-webvr` との二重管理になる |
| 壊れている `svelte/` を消す | 訓練体験そのものが SPA。消したら repo に残るのは配信ゲートだけになる |
| 「動く」と書いておく | 嘘。install が緑になるので**一度は通ってしまう**のが、この破損が生き延びた理由そのもの |

## 帰結

- この repo は**現在デプロイできない**。Worker だけを配っても配る中身が無い。
- 次にこの repo を進める者への具体的な入口は
  `kotoba-lang/kami-webvr` の `src/kami/webvr/`（`types.cljc` /
  `incident_pregel.cljc` / `engine.cljs`）と、この repo の
  `scenarios/semiconductor-chem-plant.ts`（14 ノード / 終端 2）の対応付け。
  シナリオのデータ形（KPI は整数のみ、`terminal` は `'success'` / `'failure'`）は
  移植先でもそのまま持ち越せる。
- 移植が終わるまで、`CLAUDE.md` の「`pnpm test` で到達性を検証する」は
  **実行できない記述**である。`docs/operator-quickstart.md` §4.2 に明記した。

## 2026-09-24 追記 — cljs 移行で `svelte/` を消した。壊れ方は変わったが直っていない

ADR-2608260900（ワークスペース全体で Svelte/React の新規 UI を退役、
reagent + re-frame + jp-go-dds が既定）を受けて、`svelte/` をこの repo から
削除し `cljs/`（reagent + re-frame + jp-go-dds SPA）に置き換えた
（`agent/svelte-to-cljs-20260924`）。

**このリンク切れ自体は解消した**: `svelte/` が無いので
`@etzhayyim/kami-engine-sdk/webvr` への `link:` も無い。この ADR が名指し
した「戻せる場所」の 3 つ目 —— `kotoba-lang/kami-webvr`（webvr モジュールの
1:1 cljs 移植、`kami.webvr.incident-pregel` / `kami.webvr.types`）—— を
workspace git dep として `cljs/deps.edn` に足し、`cyber-drill-frontend.app`
から `:require` した（`src/cyber_drill_frontend/app.kotoba`）。

**だが SPA は今もビルドできない。** 理由はこの ADR が記録した SDK リンク
切れとは別物: `cljs/package.json` の build script（`orgs/cloud-itonami/recap`
の同型 build script をそのまま踏襲）が呼ぶ
`amu compile --target wasm32-browser app` は exit 64
（`"source input must use .kotoba, .cljk, or .cljc"`）。ファイルパスを渡す
形に直しても `amu check` まで進めると
`:kotoba.error/namespace-require-needs-project` →
`amu module-lock` / `--export` 要求で止まる。実測した限り、
`--target wasm32-browser` は Kotoba 安全言語のモジュールグラフ（`:export`
を宣言した `.kotoba` モジュール同士の依存）を WASM へコンパイルする経路で
あって、`reagent` / `re-frame` / `jp-go-dds`（Maven 由来の通常の
ClojureScript ライブラリ）を `:require` する namespace を解決する経路
ではない。詳細と実際のエラー全文は
`docs/operator-quickstart.md` §4.1（2026-09-24 実測）。

この build script は `orgs/cloud-itonami/recap/cljs/package.json` の
`amu compile --target wasm32-browser app` をそのまま複写したものだが、
recap 側がこのコマンドで実際にビルドが通ったことを検証したログは
見つからなかった（`recap` の `93e3795` は "Text only; no mirror;
fix-forward" — 呼び出し文字列の一括置換であって実行結果の確認ではない）。
つまり reagent/re-frame な cljs アプリを `amu compile --target
wasm32-browser` でブラウザ向けにビルドする経路は、この workspace の
どこでも実際に緑になったことが確認できていない可能性がある —— これは
cyber-drill 固有の欠陥ではなく、確認したもう 1 リポジトリでも同じ形で
再発した。

- `legacy/three-renderer/`（旧 Three.js WebVR/spark レンダラ）は verbatim で
  保存し、配線していない。Three.js はこのワークスペースの 3D 規則
  （すべての 3D は kami-engine 経由）で新規コードとして禁止されているため、
  移植の選択肢に入れなかった。kami-engine の上で再構築するかは製品判断
  として未決のまま残す。
- `scenarios/semiconductor-chem-plant.ts`（vendor-private な実シナリオ）は
  この移行の対象外で無改変。`cljs/src/cyber_drill_frontend/app.kotoba` が
  `kami.webvr.incident-pregel` を駆動するのに使っているのは、配線確認用の
  2 ノードのダミーシナリオ（`sample-incident`）であって、実際の訓練内容
  ではない。
