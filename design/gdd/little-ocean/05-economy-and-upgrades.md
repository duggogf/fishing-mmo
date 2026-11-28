# Little Ocean — 05 Economy and Upgrades

> **Status**: In Design
> **Author**: systems-designer (agent A1) for owner
> **Last Updated**: 2026-11-26
> **Last Verified**: 2026-11-26
> **Implements Pillar**: P3 Curiosity is the currency of progress (primary), P2, P4
> **Feel override (D10, 2026-11-28)**: `12-prototype-feel-spec.md` owns sale price = BaseValue × 3 and the selling sequence (§9.3, §10). Where this doc's feel or presentation values differ, follow 12.

## Summary

One soft currency, `Shells`, earned only by selling fish to the harbour Fishmonger at fixed prices, and spent in two
places (owner D9): the **Shipyard** (ship items, the `Cutter` hull, cosmetics; doc 11) and the **Inn crew board** (hiring
Tomo; doc 04). The Region 2 gate costs `Cutter` 180 + `Keel` 70 = 250. Prices are tuned so the first sale lands at
~6.9 min and Region 2 opens at ~20–28 min modelled on any purchase order. This doc owns every price; doc 11 owns sizes,
weights and fit rules.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `04 Crew & Fishing (EV, rates, hiring)`, `11 Ship Fitting (catalogue, CargoCapacity)`, `03 World (GateRequirement, travel)`, `02 Sailing (Keel push-through)`, `07 Persistence`

## Overview

A closed, personal, NPC-only economy (brief §5). No market simulation, no dynamic prices, no trading, no upkeep.
Purchases exist to open the sea (Cutter + Keel), to make trips longer and calmer (holds) and to bring a third crew
member aboard (Bunk + hire), not to create an optimisation puzzle: every purchase order reaches Region 2 within a
~9-minute window, so "what should I buy?" never has a wrong answer. The one small choice (which two of three items fit
the Skiff) lives in doc 11 and is free to change.

## Player Fantasy

"I came home with a full hold, the fishmonger paid me, and I could afford something for my boat straight away." Spending
feels like dressing up the boat for a holiday, and the big purchase — the Cutter with her Keel — feels like buying the ticket to the horizon.

## Detailed Design

### Core Rules

1. **CONFIRMED (brief §5, §12)** `Shells` is the only currency (integer ≥ 0). Earned only by selling fish to the NPC fishmonger; spent only at NPC places (Shipyard, Inn crew board). No player-to-player transfer of Shells, fish, items or hulls. No shared market.
2. **CONFIRMED (00 §3 DO NOT BUILD)** Prices are fixed per `SpeciesId` (`BaseValue`, doc 04). No supply/demand, no daily price, no bulk penalty.
3. **PROPOSED** Selling is one action: **Sell all** at the fishmonger counter while `Docked`. Payout = Σ `BaseValue` of cargo (F1). `CargoLoad` → 0. Partial holds may be sold any time. Rationale: ≤2 clicks (doc 10), no inventory micromanagement.
4. **PROPOSED** Starting `Shells` = 0. Starting boat: `Skiff` with the `FishCrate` fitted, 2 crew (D5), `CargoCapacity` = 14 + 6 = 20 (doc 11).
5. **CONFIRMED (owner D9)** One place per verb: items, hulls and cosmetics are bought at the **Shipyard** (doc 11); crew are hired at the **Inn crew board** (doc 04). Both only while `Docked`. Each item/hull/cosmetic is bought once and owned forever; fitting it is free and reversible (11). Buy/Hire disabled with "Need N more" if unaffordable (no debt, no negative Shells).
6. **CONFIRMED (owner D1, D9)** `Keel` is the `GateRequirement` for `R2_Swells`: without it fitted the swell pushes the boat back (doc 02/03; never damage). It needs the `Cutter`'s keel mount (11), so the gate cost is `Cutter` + `Keel`. Prices owned here.
7. **CONFIRMED (00 §5 A1, as amended by D9)** Catalogue size: 2 hulls, 5 items, 1 hire, a small cosmetic set (replaces "max 4 upgrades"). No wages, rent, repair or timers. **CONFIRMED (brief §11)** nothing purchasable with real money, cosmetics included.
8. **CONFIRMED (11, D9)** Cosmetics never change stats; some are earned by discoveries instead of bought (11 §Cosmetics).

### Catalogue and prices (PROPOSED; prices ASSUMPTION – validate by H1 time-to-R2 median 20–35 min)

Sizes, weights, slots and the Skiff squeeze: doc 11 (`DT_Hulls`, `DT_Items`). This table owns the prices only.

| Id | Where | Price (Shells) | Effect (11) | Why it exists (pillar) |
|---|---|---|---|---|
| `FishCrate` (`ItemId`) | Shipyard | starter (fitted) | +6 hold | Start `CargoCapacity` 20 |
| `FishHold` (`ItemId`) | Shipyard | 60 | +12 hold | Longer, calmer trips; affordable right after first sale (P1, H1 first-purchase moment) |
| `Bunk` (`ItemId`) | Shipyard | 40 | +1 berth | Makes room for Tomo |
| Hire Tomo (`CrewId`) | Inn crew board | 50 (one-off) | 3rd crew; +50% catch rate | Visible new character on deck (D4); Bunk + hire = 90 = old `Crew_2` |
| `Cutter` (`HullId`) | Shipyard | 180 | bigger hull, keel mount, everything fits | The bigger boat (P1) |
| `Keel` (`ItemId`) | Shipyard | 70 | `HasKeel`: ignore R2 swell push-back | Opens a place, not a number (P3, D1); Cutter + Keel = 250 = old `Keel` |
| `DeepHold` (`ItemId`) | Shipyard | 300 | +12 hold (Cutter L slot) | Post-gate goal for R2 time; can be cut without affecting H1 |
| Cosmetics | Shipyard, Paint and Decor tabs | 20–120 each (11 table) | none (look only) | Identity in the harbour (P4); post-gate Shell sink |

### States and Transitions

Economy has no states of its own. Transactions occur only in loop phase `Selling` (doc 01): `Sell all` (Fishmonger),
`Buy(ItemId | HullId | CosmeticId)` (Shipyard) and `Hire(CrewId)` (Inn crew board). Fit/unfit costs nothing and is not
an economy transaction (11). Each transaction triggers an immediate save (doc 07).

### Interactions with Other Systems

| System | Direction | Data |
|---|---|---|
| 04 Crew & Fishing | in | `CargoContents` (SpeciesId→count), `BaseValue`, EV per fish; out: hire fee (50), Shells debit on `Hire` |
| 11 Ship Fitting | out | prices for hulls, items, cosmetics; Shells debit on `Buy`; in: `CargoCapacity` per loadout (pacing) |
| 02/03 World & Sailing | out | `GateRequirement` = `Keel` (effect via 11 `HasKeel`) |
| 07 Persistence | out | `Shells` in `PlayerProgress`; ownership fields (`OwnedHulls`, `OwnedItems`, `Cosmetics`, crew list) written with the debit; save after each transaction |
| 10 HUD/UI | out | `Shells`, catalogue prices, affordability ("Need N more"); sale summary |
| 01 Core loop | out | telemetry `sale`, `purchase(ItemId \| HullId)`, `hire` |

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

| Setup (hull: fitted items → cap, crew; doc 11) | Fill | Cycle | Payout | Shells/min |
|---|---|---|---|---|
| R1 start — Skiff: Crate (20, 2 crew) | 4.44 | 6.44 | 84 | 13.0 |
| R1 Skiff: Crate + Hold (32, 2 crew) | 7.11 | 9.11 | 134 | 14.7 |
| R1 Skiff: Crate + Bunk (20, 3 crew) | 2.96 | 4.96 | 84 | 16.9 |
| R1 Skiff: Hold + Bunk (26, 3 crew) | 3.85 | 5.85 | 109 | 18.6 |
| R1 Cutter: Crate + Hold + Bunk (32, 3 crew) | 4.74 | 6.74 | 134 | 19.9 |
| R2 Cutter: Crate + Hold + Bunk + `Keel` (32, 3 crew) | 5.27 | 10.44 (5.27 + 2.38 + 2.28 + 0.5) | 245 | 23.5 |

R2 pays ~18% more per minute than R1 (longer crossing eats part of the higher fish value) — a reason to go, never a requirement to stay (P3).

**F4 — Time to gate** `T_R2 = t_firstSale + Σ CycleMin_k` until cumulative Shells − spent ≥ gate cost
(`Cutter` 180 + `Keel` 70 = **250**). Results by purchase order (re-run with doc 11's catalogue, 11 F4):

| Path | Purchases | Modelled R2 unlock |
|---|---|---|
| A' (intended, UI suggests cheapest first) | FishHold → Bunk + hire Tomo (crate to shed) → Cutter + Keel | **27.8 min** (4 trips; was 29.5 for old path A) |
| B straight-save | Cutter + Keel only | **19.8 min** (3 trips; ruling 2 rounds to 19.9) |
| C crew first | Bunk + hire → Cutter + Keel | 28.3 min (5 trips) |
| D hold only | FishHold → Cutter + Keel | 25.2 min (3 trips) |

Path A' trip list (11 F4): sales at 6.94 (+84, FishHold −60 → 24), 16.05 (+134 → 158; Bunk −40, hire −50 → 68; Skiff
Hold + Bunk, cap 26), 21.90 (+109 → 177), 27.75 (+109 → 286; Cutter + Keel −250 → 36). B, C and D spend exactly what the
old paths spent (Bunk + hire = old `Crew_2` 90; Cutter + Keel = old `Keel` 250), so their times are unchanged.

All paths fall inside 19.8–28.3 min modelled; with an assumed +20% real-player slack (chatting, wandering) → 23.8–34.0 min,
inside H1's 20–35 min (path A' no longer sits on the 35-min edge), and every path is far from both FAIL edges (<12, >45).
Fastest possible (B, factor 1.0, no wandering) = 6.5 + 2 × 6.0 = 18.5 min > 12. **Gate cost stays 250** (ruling 2: trips are discrete).
**Variance**: 3 trips = 252 ± 30 Shells, so ~half of path-B players need a 4th trip (→ 26.3 min). Acceptable; it pushes toward the band's middle.

### Minute-by-minute income table — Path A' (model, factor 0.9; travel per ruling 2)

| Minute | Event | Phase | CargoLoad | Shells |
|---|---|---|---|---|
| 0.00 | Spawn docked on the Skiff (Crate fitted); crew greet | Docked | 0/20 | 0 |
| 0.75 | Leave harbour | Sailing | 0/20 | 0 |
| 1.50 | Enter R1 zone; first fish 1.70 | Sailing | 0→ | 0 |
| 3.00 | — | Sailing | ~7/20 | 0 |
| 5.94 | Hold full | Returning | 20/20 | 0 |
| 6.94 | **First sale** +84; buy `FishHold` −60, fit Crate + Hold | Selling | 0/32 | 24 |
| 10.00 | — | Sailing | ~10/32 | 24 |
| 14.80 | Hold full | Returning | 32/32 | 24 |
| 16.05 | Sale +134; buy `Bunk` −40, hire Tomo −50; Crate to shed (Hold + Bunk) | Selling | 0/26 | 68 |
| 20.65 | Hold full (3 crew; fill 26 / 6.75 = 3.85 min) | Returning | 26/26 | 68 |
| 21.90 | Sale +109 | Selling | 0/26 | 177 |
| 26.50 | Hold full | Returning | 26/26 | 177 |
| 27.75 | Sale +109; **buy `Cutter` −180 + `Keel` −70**; refit Crate + Hold + Bunk + Keel (440 / 650 kg) | Selling | 0/32 | 36 |
| 30.13 | Enter R2 zone (143 s crossing) | Sailing | 0/32 | 36 |
| 35.40 | Hold full (R2) | Returning | 32/32 | 36 |
| 38.18 | Sale +245 (137 s back) | Selling | 0/32 | 281 |
| 48.62 | Next R2 sale +245; buy `DeepHold` −300 | Selling | 0/44 | 226 |

Within a 45-min playtest, path A' sees every gameplay purchase except `DeepHold` (281 < 300 at 38.18; it lands on the 2nd R2
trip at ~48.6 min), a Skiff fitting choice, 1 full R2 trip and most of a 2nd. Cosmetics (20–120) are affordable from ~38 min
and compete with `DeepHold`; neither affects H1.

## Edge Cases

| Case | Result |
|---|---|
| Sell with empty cargo | Sell button disabled ("Nothing to sell"). |
| Unaffordable item, hull, cosmetic or hire | Disabled; shows "Need N more Shells"; no partial payment. |
| Buy `DeepHold` without the `Cutter` | Allowed; it waits in the shed tagged "Needs an L slot (Cutter)" (11); the tag shows before purchase. |
| Buy `Keel` before the `Cutter` | Allowed; shed tag "Needs a keel mount (Cutter)" (11). The gate opens only when both are owned and the Keel is fitted. |
| Buy while cargo full | Allowed; fitting a hold increases capacity → fishing resumes when back in a zone. Unfitting below `CargoLoad` is blocked (11). |
| Fit, unfit, swap or switch hull | Free; no Shells change; no refunds exist because nothing is consumed (11). |
| Hire with no free berth | Hire disabled ("No free bunk"); no Shells taken (04). |
| Buy and hire in one visit (path A') | Two places, two transactions, two saves; either can be done alone. |
| Crash between sale and save | Sale + save are one transaction: Shells and CargoLoad written together (doc 07); on failure, revert to pre-sale. |
| Shells overflow | Clamp at 9,999,999 (unreachable in prototype). |
| Save edited by player | Local single-player; no anti-cheat in prototype (POST-PROTOTYPE `ICloudSaveService` validates). |
| Player tries to give Shells/fish to another player | No such action exists (§12). |
| Player rushes Cutter + Keel at 19 min | Allowed; Cutter with Crate + Keel (cap 20, 2 crew) in R2 fills at 4.05/min = 4.9 min, payout ≈ 153 — holds and Bunk remain affordable later. |

## Dependencies

04 (hard, bidirectional): rates, EV, `BaseValue`, hiring. 11 (hard, bidirectional): catalogue, sizes/weights, `CargoCapacity` per loadout; 05 owns prices. 02/03: `Keel` flag consumer; travel times CONFIRMED from 03 (loop-1 ruling 2). 07: `Shells`, ownership fields, atomic sale/buy save. 10: Fishmonger, Shipyard, Inn crew board screens. Effort: **~3 dev-days** (DataTable 0.5,
sell/buy/hire logic 1, UI hookup 1, balance sim spreadsheet 0.5; fitting logic is in 11). **ASSUMPTION.**

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| Gate cost (`Cutter` + `Keel`) | 250 (180 + 70) | 180–340 total | time-to-R2 (each ±84 ≈ ±1 trip ≈ ±6 min) |
| `Cutter` price | 180 | 140–240 | share of the gate cost; bigger-boat moment |
| `Keel` price | 70 | 50–120 | share of the gate cost; keep Cutter + Keel ≈ 250 |
| `FishHold` price | 60 | 40–84 | must stay ≤ first expected payout (84) for the first-sale purchase moment |
| `Bunk` price | 40 | 25–60 | when a berth is ready |
| Hire fee (Tomo) | 50 | 30–90 | when Tomo joins; keep Bunk + hire ≈ 90 (path C) |
| `DeepHold` price | 300 | 200–400 | R2 goal; no H1 effect |
| Cosmetic prices | 20–120 (11 table) | ×0.5–2 | post-gate Shell sink; no H1 effect |
| Start `CargoCapacity` | 20 | 16–28 | first-sale time (each +4 ≈ +0.9 min) |
| `BaseValue` scale (global) | 1.0 | 0.7–1.4 | all pacing; prefer cost knobs instead |

## Visual/Audio Requirements

Fishmonger, Shipwright NPC (runs the Shipyard), Innkeeper and counters/crew board are **ActsLayer** (inked); harbour buildings
**StaysLayer** (painted). Sale: fish cels hop off the deck onto the counter (on twos), single soft coin-shell clink, no casino
cascade. Keel fitted on the Cutter: short hammering in the yard, then the R2 swell on the horizon gets a brief painted
light-shaft (doc 09) — the sea, not a number, is the reward.

## Game Feel

No haggling, no confirmations for sale; one confirm for purchases ≥ 100 Shells. Sale summary shows species counts and total for
≤ 2 s, dismissible. Never show Shells/min or efficiency stats (P3: no optimisation screens).

## UI Requirements

One place per verb (doc 10, D9). Fishmonger: one "Sell all (N fish · X Shells)" button. Shipyard (doc 10/11): catalogue rows
with price and Buy beside the owned items; unaffordable rows read "Need N more"; the Keel row reads "Needs a keel mount
(Cutter) · opens The Swells". Inn crew board: Tomo's row with fee and Hire. HUD Shells counter (doc 10).

## Cross-References

00 §2 H1, §3, §5 A1, §9 D1/D5/D9 · 01 (loop, telemetry) · 02 (swell push-back) · 03 (gate, travel) · 04 (EV, rates, hiring) · 07 · 10 · 11 (catalogue, F4).

## Acceptance Criteria

1. Selling the example cargo in F1 yields exactly 71 Shells and sets `CargoLoad` to 0. 
2. No code path changes a price at runtime (DataTable read-only).
3. Without `Keel` fitted the boat cannot remain in `R2_Swells`; fitting the `Keel` on the `Cutter` and pressing Done removes push-back immediately with no reload. (D1, D9)
4. Shells never go below 0; disabled buttons cannot be activated by keyboard/gamepad.
5. Playtest H1: median time-to-R2 20–35 min (≥8 players); ≥75% complete first sale ≤ 8 min; ≥60% buy an item within 1 min of first sale.
6. ≤ 2 players describe the shipyard/economy as "spreadsheet" or "grind" in the survey. (H1, P3)
7. Fit, unfit and hull switch never change `Shells` (log check over a full H1 session). (11)
8. Simulated path A' with factor 0.9 reproduces the trip list in F4 (sales at 6.94 / 16.05 / 21.90 / 27.75, Shells 36 after the gate purchase) (unit test on the balance sim).

## Open Questions

1. Keep `DeepHold` (post-gate goal) or cut it for scope? It does not affect H1.
2. Should the Shipyard gently suggest the cheapest affordable item (supports Path A') or show no suggestion?
3. ~~Travel times~~ — CLOSED (loop 1): CONFIRMED from 03 (R1 45 s each way; R2 143 s out / 137 s back with `Keel`); R2 income recomputed (23.5 Shells/min, still > R1).

## Interface values

| Name | Value | Owner doc |
|---|---|---|
| `Shells` start | 0 | 05 |
| `CargoCapacity` | 20 start; 32 / 26 / 20 Skiff loadouts; 32 Cutter; 44 Cutter + `DeepHold` | 11 |
| Prices: `FishHold` / `Bunk` / hire / `Cutter` / `Keel` / `DeepHold` | 60 / 40 / 50 / 180 / 70 / 300 Shells | 05 |
| Cosmetic prices | 20–120 Shells (11 table) | 05 (list 11) |
| Gate cost | `Cutter` 180 + `Keel` 70 = 250 | 05 |
| `GateRequirement` (`R2_Swells`) | `Keel` (fitted; needs `Cutter`) | 05 (effect 02/03, fit 11) |
| Expected first sale | 84 Shells at 6.9 min | 05 |
| Modelled R2 unlock | A' 27.8 / B 19.8 / C 28.3 / D 25.2 min | 05 |
| Travel times (CONFIRMED) | R1 45 s each way; R2 with `Keel` 143 s out / 137 s back | 03 |
| `PlayerProgress` fields | `Shells` (int32); ownership in `OwnedHulls`, `OwnedItems`, `Cosmetics`, crew list (07, 11) | 07 |
| HUD values | `Shells`, catalogue prices and affordability | 10 |
