# etzhayyim-project-cyber-drill — VENDOR-PRIVATE

OT cybersecurity training experiences delivered as smartphone WebVR walkthroughs. The choice-scenario state machine the SPA drives (originally `@etzhayyim/kami-engine-sdk/webvr`) is ported 1:1 to ClojureScript upstream as `kotoba-lang/kami-webvr` + proprietary branching-playbook scenarios (this project, `scenarios/`).

**2026-09-24: the frontend was migrated from Svelte to ClojureScript** (reagent + re-frame + jp-go-dds, ADR-2608260900). `svelte/` no longer exists. See the root README.md "いま何が在るか" table and `docs/adr/0001-extraction-severed-the-webvr-sdk-link.md`'s 2026-09-24 addendum for the current (as of that date, not-building) state of `cljs/`.

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
| Runtime | Single Worker (TS Native), reagent + re-frame + jp-go-dds SPA (`cljs/`) |
| Consumer of | `kotoba-lang/kami-webvr` (`kami.webvr.incident-pregel` / `kami.webvr.types`) |

## Layout

```
cyber-drill/
├── CLAUDE.md                              # this file
├── scenarios/                             # vendor-private scenario data (out of scope for the cljs migration)
│   └── semiconductor-chem-plant.ts        # 半導体・電子材料プラント インシデント
├── cljs/                                  # reagent + re-frame + jp-go-dds SPA shell
│   └── src/cyber_drill_frontend/app.kotoba
└── legacy/three-renderer/                 # retired Three.js 3D view, unwired (3D rule bans new Three.js code)
```

## Adding a scenario

1. Create `scenarios/<slug>.ts` exporting an `IncidentScenario`.
2. Grade every `choice.grade` against an SSoT framework (`NIST-CSF-2.0`, `IEC-62443-3-3`, `METI-Factory-CSG`, `IPA-J-CSIP`, `JPCERT`) — empty `reference` is allowed only for follow-up nodes that route a player back to the main flow.
3. KPI invariants (AT Lexicon float-free): `mttdSec / mttrSec / downtimeMin / dataLossGb / costYenDeci` are non-negative integers; `regulatoryRiskPermille` is clamped 0–1000.
4. Reachability invariants (every node reachable from `start`, every terminal has an outcome) are asserted in `scenarios/semiconductor-chem-plant.test.ts`, but this repo has no `test` script wired to run it (`vitest` isn't a dependency) — see `docs/operator-quickstart.md` §4.2. Out of scope for the 2026-09-24 Svelte→cljs migration, which did not touch `scenarios/`.

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
