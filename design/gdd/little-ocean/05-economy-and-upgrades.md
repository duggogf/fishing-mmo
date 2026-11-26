# Little Ocean — 05 Economy and Upgrades

> **Status**: In Design
> **Author**: systems-designer (agent A1) for owner
> **Last Updated**: 2026-11-26
> **Last Verified**: 2026-11-26
> **Implements Pillar**: P3 Curiosity is the currency of progress (primary), P2, P4

## Summary

One soft currency, `Shells`, earned only by selling fish to the harbour fishmonger at fixed prices, and spent only at the
shipwright on 4 upgrades: `Hold_2`, `Crew_2`, `Keel` (the Region 2 gate) and `Hold_3`. Prices are tuned so the first sale
lands at ~6.9 min and Region 2 opens at ~20–30 min modelled on any purchase order.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `04 Crew & Fishing (EV, rates)`, `03 World (GateRequirement, travel)`, `02 Sailing (Keel push-through)`, `07 Persistence`

## Overview

A closed, personal, NPC-only economy (brief §5). No market simulation, no dynamic prices, no trading, no upkeep.
Upgrades exist to open the sea (Keel) and to make trips longer and calmer (Hold), not to create an optimisation puzzle:
every purchase order reaches Region 2 within a ~10-minute window, so "what should I buy?" never has a wrong answer.

## Player Fantasy

"I came home with a full hold, the fishmonger paid me, and I could afford something for my boat straight away." Spending
feels like dressing up the boat for a holiday, and the big purchase — the Keel — feels like buying the ticket to the horizon.

## Detailed Design

### Core Rules

1. **CONFIRMED (brief §5, §12)** `Shells` is the only currency (integer ≥ 0). Earned only by selling fish to the NPC fishmonger; spent only at NPC vendors. No player-to-player transfer of Shells, fish or upgrades. No shared market.
2. **CONFIRMED (00 §3 DO NOT BUILD)** Prices are fixed per `SpeciesId` (`BaseValue`, doc 04). No supply/demand, no daily price, no bulk penalty.
3. **PROPOSED** Selling is one action: **Sell all** at the fishmonger counter while `Docked`. Payout = Σ `BaseValue` of cargo (F1). `CargoLoad` → 0. Partial holds may be sold any time. Rationale: ≤2 clicks (doc 10), no inventory micromanagement.
4. **PROPOSED** Starting `Shells` = 0. Starting hull: 2 crew (D5), `CargoCapacity` = 20.
5. **PROPOSED** Upgrades are bought at the shipwright while `Docked`; effect is immediate and permanent; each bought once. Button disabled with "Need N more Shells" if unaffordable (no debt, no negative Shells).
6. **CONFIRMED (owner D1)** `Keel` is the `GateRequirement` for `R2_Swells`: without it the swell pushes the boat back (doc 02/03; never damage). Price owned here.
7. **CONFIRMED (00 §5 A1)** Max 4 upgrades; no wages, rent, repair or timers. **CONFIRMED (brief §11)** nothing purchasable with real money.

### Upgrade table — `DT_Upgrades` (PROPOSED; prices ASSUMPTION – validate by H1 time-to-R2 median 20–35 min)

| UpgradeId | Cost (Shells) | Effect | Prereq | Why it exists (pillar) |
|---|---|---|---|---|
| `Hold_2` | 60 | `CargoCapacity` 20 → 32 | — | Longer, calmer trips; affordable right after first sale (P1, H1 first-upgrade moment) |
| `Crew_2` | 90 | adds 3rd `CrewSlot` + Tomo (D5, D7); +50% catch rate | — | Visible new character on deck (D4) |
| `Keel` | 250 | ignore R2 swell push-back; `R2_Swells` accessible | — | Opens a place, not a number (P3, D1) |
| `Hold_3` | 300 | `CargoCapacity` 32 → 44 | `Hold_2` | Post-gate goal for R2 time; can be cut without affecting H1 |

### States and Transitions

Economy has no states of its own. Transactions occur only in loop phase `Selling` (doc 01): `Sell all` and `Buy(UpgradeId)`.
Each transaction triggers an immediate save (doc 07).

### Interactions with Other Systems

| System | Direction | Data |
|---|---|---|
| 04 Crew & Fishing | in | `CargoContents` (SpeciesId→count), `BaseValue`, EV per fish; out: `CargoCapacity`, `Crew_2` slot |
| 02/03 World & Sailing | out | `Keel` owned → disables R2 push-back; `GateRequirement` = `Keel` |
| 07 Persistence | out | `Shells`, `OwnedUpgrades` in `PlayerProgress`; save after each transaction |
| 10 HUD/UI | out | `Shells`, upgrade list, costs, affordability; sale summary |
| 01 Core loop | out | telemetry `sale`, `purchase` |

## Formulas

**F1 — Sale payout** `SalePayout = Σ_i Count_i × BaseValue_i` (no multipliers in prototype)

| Symbol | Type | Range | Description |
|---|---|---|---|
| Count_i | int | 0–44 | fish of species i in cargo |
| BaseValue_i | int | 2–40 | doc 04 table |
| SalePayout | int | 0–1,760 (44 × 40) | Shells added |

Example: 9 SandSprat, 6 HarbourMackerel, 3 BlueWrasse, 1 RibbonEel, 1 SunFlounder = 18+18+15+8+12 = **71 Shells**.
Expected: `E[SalePayout] = CargoCapacity × EV_region` → R1 20 × 4.19 ≈ **84**; R1 32 × 4.19 ≈ **134**; R2 32 × 7.65 ≈ **245**.

**F2 — Trip cycle time** `CycleMin = CargoCapacity / (CatchRatePerMin × AvgSpeedFactor) + TravelOut + TravelBack + DockMin`

| Symbol | Type | Default | Description |
|---|---|---|---|
| CatchRatePerMin | float | 5.0 / 7.5 (R1, 2/3 crew) | doc 04 F1 at factor 1.0 |
| AvgSpeedFactor | float | 0.9 | ASSUMPTION – validate by telemetry |
| TravelOut / TravelBack | min | R1 0.75 / 0.75 (45 s each way); R2 with `Keel` 2.38 / 2.28 (143 s / 137 s) | **CONFIRMED (03, loop-1 ruling 2)**; supersedes 00's 60–120 s R2 target |
| DockMin | min | 0.5 (0.25 first sale) | sell + shop time |
| CycleMin | min | 4.96–10.44 | — |

Worked example (start, R1): 20 / (5.0 × 0.9) + 0.75 + 0.75 + 0.5 = 4.44 + 2.0 = **6.44 min**.

**F3 — Income rate** `ShellsPerMin = E[SalePayout] / CycleMin`

| Setup | Fill | Cycle | Payout | Shells/min |
|---|---|---|---|---|
| R1 start (2 crew, 20) | 4.44 | 6.44 | 84 | 13.0 |
| R1 + `Hold_2` | 7.11 | 9.11 | 134 | 14.7 |
| R1 + `Crew_2` | 2.96 | 4.96 | 84 | 16.9 |
| R1 + both | 4.74 | 6.74 | 134 | 19.9 |
| R2 + both + `Keel` | 5.27 | 10.44 (5.27 + 2.38 + 2.28 + 0.5) | 245 | 23.5 |

R2 pays ~18% more per minute than R1 (longer crossing eats part of the higher fish value) — a reason to go, never a requirement to stay (P3).

**F4 — Time to gate** `T_R2 = t_firstSale + Σ CycleMin_k` until cumulative Shells − spent ≥ `Keel` cost. Results by purchase order:

| Path | Purchases | Modelled R2 unlock |
|---|---|---|
| A (intended, UI suggests cheapest first) | Hold_2 → Crew_2 → Keel | **29.5 min** (4 trips) |
| B straight-save | Keel only | **19.8 min** (3 trips; ruling 2 rounds to 19.9) |
| C crew first | Crew_2 → Keel | 28.3 min (5 trips) |
| D hold only | Hold_2 → Keel | 25.2 min (3 trips) |

All paths fall inside 20–30 min modelled; with an assumed +20% real-player slack (chatting, wandering) → 24–35.4 min. Path A
sits on H1's 35-min upper edge (ruling 2: accepted, H1 is a player median), and every path is far from both FAIL edges (<12, >45).
Fastest possible (B, factor 1.0, no wandering) = 6.5 + 2 × 6.0 = 18.5 min > 12. **`Keel` stays 250** (ruling 2: trips are discrete).
**Variance**: 3 trips = 252 ± 30 Shells, so ~half of path-B players need a 4th trip (→ 26.3 min). Acceptable; it pushes toward the band's middle.

### Minute-by-minute income table — Path A (model, factor 0.9; travel per ruling 2)

| Minute | Event | Phase | CargoLoad | Shells |
|---|---|---|---|---|
| 0.00 | Spawn docked; crew greet | Docked | 0/20 | 0 |
| 0.75 | Leave harbour | Sailing | 0/20 | 0 |
| 1.50 | Enter R1 zone; first fish 1.70 | Sailing | 0→ | 0 |
| 3.00 | — | Sailing | ~7/20 | 0 |
| 5.94 | Hold full | Returning | 20/20 | 0 |
| 6.94 | **First sale** +84; buy `Hold_2` −60 | Selling | 0/32 | 24 |
| 10.00 | — | Sailing | ~10/32 | 24 |
| 14.80 | Hold full | Returning | 32/32 | 24 |
| 16.05 | Sale +134; buy `Crew_2` −90 | Selling | 0/32 | 68 |
| 21.54 | Hold full (3 crew) | Returning | 32/32 | 68 |
| 22.79 | Sale +134 | Selling | 0/32 | 202 |
| 28.28 | Hold full | Returning | 32/32 | 202 |
| 29.53 | Sale +134; **buy `Keel` −250** | Selling | 0/32 | 86 |
| 31.91 | Enter R2 zone (143 s crossing) | Sailing | 0/32 | 86 |
| 37.18 | Hold full (R2) | Returning | 32/32 | 86 |
| 39.96 | Sale +245 (137 s back); buy `Hold_3` −300 | Selling | 0/44 | 31 |

Within a 45-min playtest, path A sees every upgrade, 1 full R2 trip and the start of a 2nd.

## Edge Cases

| Case | Result |
|---|---|
| Sell with empty cargo | Sell button disabled ("Nothing to sell"). |
| Unaffordable upgrade | Disabled; shows "Need N more Shells"; no partial payment. |
| Buy `Hold_3` without `Hold_2` | Hidden until `Hold_2` owned. |
| Buy while cargo full | Allowed; buying a Hold increases capacity → fishing resumes when back in a zone. |
| Crash between sale and save | Sale + save are one transaction: Shells and CargoLoad written together (doc 07); on failure, revert to pre-sale. |
| Shells overflow | Clamp at 9,999,999 (unreachable in prototype). |
| Save edited by player | Local single-player; no anti-cheat in prototype (POST-PROTOTYPE `ICloudSaveService` validates). |
| Player tries to give Shells/fish to another player | No such action exists (§12). |
| Player rushes Keel at 19 min | Allowed; starter boat in R2 fills 20 cap at 4.05/min = 4.9 min, payout ≈ 153 — upgrades remain affordable later. |

## Dependencies

04 (hard, bidirectional): rates, EV, `BaseValue`. 02/03: `Keel` flag consumer; travel times CONFIRMED from 03 (loop-1 ruling 2). 07: `Shells`, `OwnedUpgrades`, atomic sale save. 10: shop/sale screens. Effort: **~3 dev-days** (DataTable 0.5,
sell/buy logic 1, UI hookup 1, balance sim spreadsheet 0.5). **ASSUMPTION.**

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| `Keel` cost | 250 | 180–340 | time-to-R2 (each ±84 ≈ ±1 trip ≈ ±6 min) |
| `Hold_2` cost | 60 | 40–84 | must stay ≤ first expected payout (84) for the first-sale purchase moment |
| `Crew_2` cost | 90 | 70–150 | when Tomo joins |
| `Hold_3` cost | 300 | 200–400 | R2 goal; no H1 effect |
| Start `CargoCapacity` | 20 | 16–28 | first-sale time (each +4 ≈ +0.9 min) |
| `BaseValue` scale (global) | 1.0 | 0.7–1.4 | all pacing; prefer cost knobs instead |

## Visual/Audio Requirements

Fishmonger, shipwright and counters are **ActsLayer** (inked); harbour buildings **StaysLayer** (painted). Sale: fish cels hop off
the deck onto the counter (on twos), single soft coin-shell clink, no casino cascade. Keel purchase: short shipwright hammering,
then the R2 swell on the horizon gets a brief painted light-shaft (doc 09) — the sea, not a number, is the reward.

## Game Feel

No haggling, no confirmations for sale; one confirm for purchases ≥ 100 Shells. Sale summary shows species counts and total for
≤ 2 s, dismissible. Never show Shells/min or efficiency stats (P3: no optimisation screens).

## UI Requirements

Fishmonger: one "Sell all (N fish · X Shells)" button. Shipwright: 4 cards (icon, name, one-line effect, cost, state Owned/Buy/Need N).
Keel card shows a painted thumbnail of R2. HUD Shells counter (doc 10).

## Cross-References

00 §2 H1, §3, §5 A1, §9 D1/D5 · 01 (loop, telemetry) · 02 (swell push-back) · 03 (gate, travel) · 04 (EV, rates) · 07 · 10.

## Acceptance Criteria

1. Selling the example cargo in F1 yields exactly 71 Shells and sets `CargoLoad` to 0. 
2. No code path changes a price at runtime (DataTable read-only).
3. Without `Keel` the boat cannot remain in `R2_Swells`; buying `Keel` removes push-back immediately with no reload. (D1)
4. Shells never go below 0; disabled buttons cannot be activated by keyboard/gamepad.
5. Playtest H1: median time-to-R2 20–35 min (≥8 players); ≥75% complete first sale ≤ 8 min; ≥60% buy an upgrade within 1 min of first sale.
6. ≤ 2 players describe upgrades/economy as "spreadsheet" or "grind" in the survey. (H1, P3)

## Open Questions

1. Keep `Hold_3` (4th upgrade) or cut to 3 upgrades for scope? It does not affect H1.
2. Should the shipwright gently suggest the cheapest affordable upgrade (supports Path A) or show no suggestion?
3. ~~Travel times~~ — CLOSED (loop 1): CONFIRMED from 03 (R1 45 s each way; R2 143 s out / 137 s back with `Keel`); R2 income recomputed (23.5 Shells/min, still > R1).

## Interface values

| Name | Value | Owner doc |
|---|---|---|
| `Shells` start | 0 | 05 |
| `CargoCapacity` | 20 start / 32 `Hold_2` / 44 `Hold_3` | 05 |
| `Hold_2` / `Crew_2` / `Keel` / `Hold_3` cost | 60 / 90 / 250 / 300 Shells | 05 |
| `GateRequirement` (`R2_Swells`) | `Keel` | 05 (effect 02/03) |
| Expected first sale | 84 Shells at 6.9 min | 05 |
| Modelled R2 unlock | A 29.5 / B 19.8 / C 28.3 / D 25.2 min | 05 |
| Travel times (CONFIRMED) | R1 45 s each way; R2 with `Keel` 143 s out / 137 s back | 03 |
| `PlayerProgress` fields | `Shells` (int32), `OwnedUpgrades` (set of `UpgradeId`) | 07 |
| HUD values | `Shells`, upgrade card states | 10 |
