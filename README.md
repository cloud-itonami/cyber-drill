# cyber-drill

**OT（制御システム）サイバーセキュリティの意思決定訓練を、スマートフォンの WebVR
ウォークスルーとして届けるアプリ。** 名前は機能を示さないので最初に名乗る ——
`cyber-drill` は「サイバー攻撃の避難訓練」であって、脆弱性スキャナでも
ペネトレーションテストツールでもない。

工場のインシデント対応は、技術ではなく**分岐の選び方**で結果が変わる。
異常を検知した最初の 5 分で、シフトリーダーを呼ぶのか、ラインを止めるのか、
観測だけ続けるのか、社長を叩き起こすのか —— この repo が持っているのは、
その分岐と、各分岐が NIST CSF 2.0 / IEC 62443-3-3 / METI 工場ガイドライン /
IPA J-CSIP のどの要求に照らして良手・悪手なのかという採点である。

訓練対象（工場エンジニア、オンコールの CSIRT）は現場で**ヘッドセットではなく
電話**を持っているので、スマートフォン優先。Android Chrome は WebXR
`immersive-vr` をネイティブ対応し、iOS Safari は `deviceorientation` の
magic-window にフォールバックする。アプリのインストールは要らない。

## いま何が在るか（実測 2026-09-24、ADR-2608260900 の cljs 移行後）

| 部品 | 実体 | 状態 |
|---|---|---|
| シナリオ | `scenarios/semiconductor-chem-plant.ts`（20 KB） | 半導体・電子材料プラントのインシデント。**14 ノード / 終端 2**（`lessonsLearned` = success、`coverupFail` = failure）。この移行の対象外、無改変 |
| シナリオの不変条件テスト | `scenarios/semiconductor-chem-plant.test.ts` | **走らない**（`vitest` が依存に無い。移行前から未着地） |
| SPA | `cljs/`（reagent + re-frame + jp-go-dds、ADR-2608260900 で Svelte を退役） | **ビルドできない**（下記） |
| 3D レンダラ（Three.js） | `legacy/three-renderer/` | 移行時に `svelte/` から verbatim で退避。配線されていない。Three.js はこのワークスペースの 3D 規則で新規禁止（3D は kami-engine 経由）なので cljs へは移植していない |
| 配信 Worker | `worker/`（TS、CF Workers） | 型検査は通る。鍵ゲート + HMAC セッション cookie |
| 鍵発行 | `worker/scripts/gen-key.mjs` | 動く |

**この repo は現状ビルドできない。** `svelte/` の SDK リンク切れ（旧 ADR-0001）は
`svelte/` ごと削除したので解消したが、代わりに `cljs/` の
`amu compile --target wasm32-browser app` が別の理由で落ちる:
`--target wasm32-browser` は Kotoba 安全言語のネイティブ/WASM モジュールグラフ
向けで、`reagent` / `re-frame` / `jp-go-dds` のような通常の ClojureScript
ライブラリ require を解決しない（`amu check` は
`:kotoba/project-link-failed` — モジュールに明示的な `:export` を要求する）。
`npm install` は成功するので、install の緑をビルド可能性と読まないこと
（旧 ADR-0001 と同じ罠が形を変えて再発している）。

診断の経緯は **[docs/adr/0001-extraction-severed-the-webvr-sdk-link.md](docs/adr/0001-extraction-severed-the-webvr-sdk-link.md)**（旧問題の記録 + 2026-09-24 追記）、
いま実際に踏める手順は **[docs/operator-quickstart.md](docs/operator-quickstart.md)**。

## 境界 — vendor-only

ADR-2605172400 の 3 軸分割で、**liability / custody / settlement の 3 つとも
vendor**:

| 軸 | 分類 | 理由 |
|---|---|---|
| Liability | vendor | 顧客向けの訓練 IP。NDA 下で顧客ごとに作り込む |
| Custody | vendor | シナリオが顧客固有の規制エクスポージャ（METI・消防法・高圧ガス保安法・GHS）と OT トポロジに触れる |
| Settlement | vendor | 有償 SaaS / 訓練エンゲージメントとして販売 |

**したがって `etzhayyim/root` の公開ミラーには載せない。**
配信先も `*.etzhayyim.com` ではなく workers.dev
（`cyber-drill-vendor.<account>.workers.dev`）に置き、顧客向けインフラを
公開フットプリントから分離している。

## 構成

```
.
├── README.md                              ← この文書
├── CLAUDE.md                              エージェント向けの実装規約（シナリオの書き方・float 規律）
├── README.edn / migration.edn             抽出メタデータ（etzhayyim/root からの由来）
├── docs/
│   ├── operator-quickstart.md             実際に踏める手順だけを書いた運用手順
│   └── adr/0001-…                         抽出で切れた SDK リンクの記録 + cljs 移行後の追記
├── scenarios/                             vendor-private なシナリオ本体（この移行の対象外）
│   ├── semiconductor-chem-plant.ts
│   └── semiconductor-chem-plant.test.ts
├── cljs/                                  reagent + re-frame + jp-go-dds SPA（ADR-2608260900、ビルド未達）
│   ├── deps.edn / shadow-cljs.edn / package.json
│   ├── src/cyber_drill_frontend/app.kotoba
│   ├── test/cyber_drill_frontend/app_test.kotoba
│   └── public/index.html                  単一文書（ADR-2608080100）。ビュー切替は URL fragment（`#/spark`）
├── legacy/three-renderer/                 旧 Svelte SPA の Three.js レンダラ。verbatim 退避、未配線
└── worker/                                鍵ゲート付き配信 Worker（CF Workers）
    ├── README.md                          Worker 単体の設計メモ
    ├── src/{index,auth,unlock-page}.ts
    └── scripts/gen-key.mjs                顧客鍵の発行
```

## 出自

このリポジトリは `etzhayyim/root` の `60-apps/etzhayyim-project-cyber-drill`
（rev `cc681c5`、35 ファイル / 277,925 バイト）を単体 repo として切り出したもの
（`migration.edn` が正本）。**`worker/README.md` の一次セットアップ手順は
切り出し前のモノレポを前提に書かれたまま**なので、`cd 60-apps/…` のような
パスはこの repo には無い。手順は `docs/operator-quickstart.md` を正とする。

## 数値の規律（AT Lexicon）

浮動小数点を使わない。実数量はすべて単位を名前に持つ整数:
`mttdSec` / `mttrSec` / `downtimeMin` / `dataLossGb` /
`costYenDeci`（円 × 10）/ `regulatoryRiskPermille`（0–1000 に clamp）。
シナリオを足すときの規約は `CLAUDE.md` を参照。

## 参照する枠組み

- NIST CSF 2.0（Identify / Protect / Detect / Respond / Recover / Govern）
- IEC 62443-3-3（System Security Requirements）
- METI 工場サイバーセキュリティガイドライン 2.0
- IPA J-CSIP / 重要インフラサイバーセキュリティ協議会
- JPCERT/CC 制御システムセキュリティ
