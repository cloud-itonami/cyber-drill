# ADR-0001 — 抽出で WebVR SDK のリンクが切れた（記録し、黙って直さない）

- **状態**: superseded-in-place（2026-09-24 に修復。本文は当時の観測のまま残し、
  下の「2026-09-24 追記」に帰結を書く。過去の観測を書き換えない —— 文書は
  最新状態のみを表す原則の例外として、この ADR は「何が起きたか」の記録その
  ものが価値なので削除しない）
- **日付**: 2026-08-13（追記 2026-09-24）
- **範囲**: `cloud-itonami/cyber-drill`
- **上流**: ADR-2605172400（3 軸分割 / vendor 判定）、ADR-2607102200（`-clj` 接尾辞の撤去と改名）

## 2026-09-24 追記 — 修復した

この ADR が名指した後継 `kotoba-lang/kami-webvr`（`kami.webvr.incident-pregel`
の `initial-state` / `apply-selection`）を実際に配線した。consumer は
Svelte/TS から reagent + re-frame + jp-go-dds の cljs SPA（`cljs/`）へ
書き換え、`svelte/` は削除した。`scenarios/semiconductor-chem-plant.ts` の
内容は `cljs/src/cyber_drill/scenario.cljc` へ EDN 形で 1:1 移植し、
シナリオ到達性の不変条件（§4.2 が「検査されていない」と記録したもの）は
`cljs/test/cyber_drill/app_test.cljk` で実際に検査するようになった。

**未完のまま残したもの**: 3D の WebXR/`immersive-vr` ビューポート
（`svelte/src/lib/three-renderer/webvr/*.ts`、Three.js）は移植していない。
本ワークスペースは Three.js を全面禁止しており（3D は kami-engine の
WebGPU/WGSL 優先・WebGL 2.0 fallback のみ）、この移行のスコープでも
kami-engine 側のビューポートには手を付けていない。現在はシナリオの状態
（briefing / KPI / 選択肢 / 終端）を jp-go-dds の 2D UI で表示する
（`cljs/src/cyber_drill/app.cljk` の `incident-view` / `three-d-notice`）。
`svelte/src/lib/three-renderer/spark/*.ts`（Three.js Spark 2.0 デモ 4 種、
`spark/+page.svelte` が表示していたもの）はシナリオ・ロジックと無関係の
render tech demo で、対応する kami-webvr / kami-engine 実装が無いため移植せず、
削除した（デモ名のみ `spark-view` に記録として残る）。
`wrangler deploy` はこの移行では実行していない（UNVERIFIED、
`docs/operator-quickstart.md` §4.1）。

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
