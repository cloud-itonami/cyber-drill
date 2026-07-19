# etzhayyim-project-cyber-drill — VENDOR-PRIVATE

OT cybersecurity training experiences delivered as smartphone WebVR walkthroughs. Built on `@etzhayyim/kami-engine-sdk/webvr` (public SDK) + proprietary branching-playbook scenarios (this project).

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
| Runtime | Single Worker (TS Native), Svelte 5 SPA |
| Consumer of | `@etzhayyim/kami-engine-sdk/webvr` |

## Layout

```
60-apps/etzhayyim-project-cyber-drill/
├── CLAUDE.md                              # this file
├── scenarios/                             # vendor-private scenario data
│   └── semiconductor-chem-plant.ts        # 半導体・電子材料プラント インシデント
└── svelte/                                # Svelte SPA shell
    └── src/routes/+page.svelte
```

## Adding a scenario

1. Create `scenarios/<slug>.ts` exporting an `IncidentScenario`.
2. Grade every `choice.grade` against an SSoT framework (`NIST-CSF-2.0`, `IEC-62443-3-3`, `METI-Factory-CSG`, `IPA-J-CSIP`, `JPCERT`) — empty `reference` is allowed only for follow-up nodes that route a player back to the main flow.
3. KPI invariants (AT Lexicon float-free): `mttdSec / mttrSec / downtimeMin / dataLossGb / costYenDeci` are non-negative integers; `regulatoryRiskPermille` is clamped 0–1000.
4. Verify reachability with `pnpm test` against the SDK's `webvr.test.ts` invariants: every node must be reachable from `start`; every terminal must have an outcome.

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
