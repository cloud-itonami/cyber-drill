# etzhayyim-project-cyber-drill — VENDOR-PRIVATE

OT cybersecurity training experiences delivered as smartphone WebVR walkthroughs. Built on `kotoba-lang/kami-webvr` (ClojureScript port of the former `@etzhayyim/kami-engine-sdk/webvr`, see `docs/adr/0001-extraction-severed-the-webvr-sdk-link.md`) + proprietary branching-playbook scenarios (this project). As of 2026-09-24 the incident-progression logic (`kami.webvr.incident-pregel`) is wired into a reagent + re-frame + jp-go-dds SPA at `cljs/`; the 3D WebXR viewport itself is not yet ported (2D UI over the same state, see `cljs/src/cyber_drill/app.cljk`'s docstring).

## Boundary (ADR-2605172400 3-axis split)

| Axis | Classification | Reason |
|---|---|---|
| Liability | **vendor** | Customer-facing training IP; per-customer customization signed under NDA |
| Custody | **vendor** | Scenarios reference customer-specific regulatory exposure (METI, 消防法, 高圧ガス保安法, GHS) and may include proprietary OT topology |
| Settlement | **vendor** | Sold as paid SaaS / training engagement; Stripe / Japanese fiat |

**→ vendor-only.** This project is NOT eligible for the etzhayyim/root open-org mirror. Do not move to `github.com/etzhayyim/root`. The SDK runtime it consumes (`@etzhayyim/kami-engine-sdk`) is separately eligible for public mirror.

## Architecture

| 項目 | 値 |
|---|---|
| Domain | `cyber-drill.etzhayyim.com` *(planned)* |
| Runtime | Single Worker (TS Native), cljs SPA (reagent + re-frame + jp-go-dds) |
| Consumer of | `kotoba-lang/kami-webvr` (`kami.webvr.incident-pregel`, `kami.webvr.types`) |

## Layout

```
cyber-drill/
├── CLAUDE.md                              # this file
├── scenarios/                             # vendor-private scenario data
│   └── semiconductor-chem-plant.ts        # 半導体・電子材料プラント インシデント
├── cljs/                                  # SPA shell (single-page app, ADR-2608080100)
│   └── src/cyber_drill/{scenario.cljc,app.cljk}
└── worker/                                # CF Worker (key-gated static host)
```

## Adding a scenario

1. Create `scenarios/<slug>.ts` exporting an `IncidentScenario`, AND a matching entry in `cljs/src/cyber_drill/scenario.cljc` (EDN shape from `kami.webvr.types` — see that file's ns docstring for the key-casing convention, e.g. `mttdSec` -> `:mttd-sec`). The `.ts` file is the vendor-private record; the `.cljc` file is what the SPA actually runs.
2. Grade every `choice.grade` against an SSoT framework (`NIST-CSF-2.0`, `IEC-62443-3-3`, `METI-Factory-CSG`, `IPA-J-CSIP`, `JPCERT`) — empty `reference` is allowed only for follow-up nodes that route a player back to the main flow.
3. KPI invariants (AT Lexicon float-free): `mttdSec / mttrSec / downtimeMin / dataLossGb / costYenDeci` are non-negative integers; `regulatoryRiskPermille` is clamped 0–1000.
4. Verify reachability with `cd cljs && npm test` (`cyber_drill.app-test`'s `every-node-is-reachable-from-start` / `happy-path-reaches-a-success-terminal`): every node must be reachable from `start`; the graded-best path must reach a `:success` terminal.

## Float discipline

AT Lexicon disallows `number` (float). All real-valued quantities are integers with explicit units (`Sec`, `Min`, `Permille`, `Gb`, `YenDeci` = JPY × 10). See `90-docs/adr/2604231811-atproto-extension-service-layers.md` and root CLAUDE.md §LLM Coding Guardrails.

## Why WebVR

Smartphone-first because (a) the operators we train (factory engineers, on-call CSIRT) have phones in the field, not headsets; (b) Android Chrome supports WebXR `immersive-vr` natively, iOS Safari supports magic-window with `deviceorientation` fallback. No app install, no Quest/Vision Pro required. Selection UX = center-screen reticle gaze-dwell (1.5 s) with tap-to-confirm fallback.

## References

- NIST CSF 2.0 (Identify / Protect / Detect / Respond / Recover / Govern)
- IEC 62443-3-3 (System Security Requirements)
- METI 工場サイバーセキュリティガイドライン 2.0
- IPA J-CSIP / 重要インフラサイバーセキュリティ協議会
- JPCERT/CC 制御システムセキュリティ
