# Little Ocean — 04 Crew and Automated Fishing

> **Status**: In Design
> **Author**: systems-designer (agent A1) for owner
> **Last Updated**: 2026-11-26
> **Last Verified**: 2026-11-26
> **Implements Pillar**: P2 Hands off the line (primary), P1 The ocean is the attraction, P3 Curiosity

## Summary

Named, visible crew members fish automatically whenever the app is running and the boat is inside a fishing
`ZoneId`. Each crew member adds `CrewMember.Efficiency × BaseRate(RegionTier) × BoatSpeedFactor` fish per minute
into the hold until `CargoLoad` reaches `CargoCapacity`; then fishing pauses (state `HoldFull`) until the player sells.
There is no player fishing input of any kind.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `02 Sailing (BoatSpeed)`, `03 World (ZoneId, RegionTier)`, `05 Economy (BaseValue, upgrades)`, `07 Persistence`

## Overview

The crew is the game's fishing machine and its emotional anchor. The player sails, looks and chooses where to drift;
the crew does the fishing in visible little inked animations, and the hold fills at a predictable, gentle pace
(~4–5 min on the starter boat in Region 1). The system is a per-crew accumulator plus a weighted species roll — small,
deterministic in pacing, and cheap to build with stock UE5 DataTables and a single actor component.

## Player Fantasy

"My crew has this handled." The player glances over and sees Mabel leaning on the rail with a line out, a splash, a
little fish pop-up, and the cargo bar ticks up. The satisfaction is ownership and watching, not effort (MDA:
Submission). A full hold reads as "the crew's done for now, they're lounging" — never as a failure or a nag.

## Detailed Design

### Core Rules

1. **CONFIRMED (brief §2, §12)** No manual fishing. No input, button, timing or minigame affects catch. **CONFIRMED (00 P2)** no active-play bonus.
2. **CONFIRMED (brief §5, §12; 00 §5 A1)** Crew fish **only while the app process is running** and the boat is inside a `ZoneId` (never in `Harbour`). **No offline fishing and no catch-up on load or on wake from sleep** (see Formula F4 dt clamp).
3. **CONFIRMED (owner D4, D5, D7)** Crew are visible, named, faceless blocky cel dummies (look owned by doc 09) with idle and fishing animations. The starter boat has 2 `CrewSlot`s filled by `CrewId` Mabel and Pip; the `Crew_2` upgrade adds a 3rd `CrewSlot` and Tomo.
4. **PROPOSED** Every `CrewMember` has exactly one stat, `Efficiency` (float, baseline 1.0). All prototype crew are 1.0. Traits are flavour text + idle-animation choice only (no mechanics). Rationale: 00 §3 OUT "crew levelling/traits beyond one efficiency stat".
5. **CONFIRMED (00 §5 A1)** No wages, upkeep, morale, hunger or timers. Crew never leave.
6. **CONFIRMED (owner D2)** When `CargoLoad == CargoCapacity` the boat enters `HoldFull`: all catch accumulation **stops** (nothing banks or overflows), crew switch to lounge idles, sailing is unaffected. Fishing resumes automatically once `CargoLoad < CargoCapacity` (i.e. after selling). Applies identically in `Full` and `Compact` `ViewMode`.
7. **PROPOSED** 1 fish = 1 `CargoLoad` unit (00 §6). Fish never spoil (no survival systems, brief §12). Cargo persists through save/quit.
8. **PROPOSED** Each landed fish calls `CatchRoll` on the species table of the boat's current region (F3). First catch of a `SpeciesId` adds a "seen" journal entry.
9. **PROPOSED** Rarity tiers in prototype: `Common`, `Uncommon`, `UncommonPlus` (cap — 00 §5 A1). `IRareDropService` is **not** called by this system in prototype; **POST-PROTOTYPE** the catch event is the hook (`OnFishLanded(SpeciesId, RegionId)`).

### States and Transitions

Per boat (fishing sub-state; the loop `PhaseKey` is owned in doc 01):

| State | Condition | Crew animation | Accumulates? |
|---|---|---|---|
| `NotInZone` | boat outside any `ZoneId` (incl. Harbour, open water, swell band) | idle (coil rope, chat) | No |
| `Fishing` | in `ZoneId` AND `CargoLoad < CargoCapacity` | fishing loop; "haul" 1.2 s on each landed fish | Yes |
| `HoldFull` | `CargoLoad == CargoCapacity` (any location) | lounge idle (sit on crates, wave at passing boats) | No |

Transitions: `NotInZone → Fishing` on entering a zone with free cargo; `Fishing → HoldFull` on the landing that fills the hold;
`HoldFull → Fishing/NotInZone` when a sale frees space; `Fishing ↔ NotInZone` on zone boundary crossing (progress is kept, not reset).

### Interactions with Other Systems

| System (doc) | Direction | Data |
|---|---|---|
| 02 Sailing | in | `BoatSpeed` (m/s), `BoatMaxSpeed` (m/s) → `BoatSpeedFactor` |
| 03 World | in | current `RegionId`, `RegionTier`, inside-`ZoneId` bool; in a `TransitionBand` the region with blend weight ≥ 0.5 supplies tier & species table |
| 05 Economy | out/in | landed `SpeciesId` list → sale value via `BaseValue`; `Crew_2`, `Hold_2`, `Hold_3` change slots/capacity |
| 07 Persistence | out | `CargoContents`, `CrewRoster`, `SpeciesSeen` in `PlayerProgress` |
| 08 Companion / 10 HUD | out | `CargoLoad`, `CargoCapacity`, `HoldFull` flag, `OnFishLanded` event |
| 09 Art | out | crew anim states (idle / fishing / haul / lounge) |

## Formulas

**F1 — Catch rate (boat)** `CatchRatePerMin = Σ_c CrewMember_c.Efficiency × BaseRate(RegionTier) × BoatSpeedFactor` (PROPOSED, form from 00 §5)

| Symbol | Type | Range | Description |
|---|---|---|---|
| Efficiency | float | 0.5–2.0 (proto: 1.0) | per-crew multiplier |
| BaseRate | float | R1 2.5, R2 2.25 fish/min | fish per minute per 1.0 Efficiency at factor 1.0 |
| BoatSpeedFactor | float | 0.85–1.0 | F2 |
| CatchRatePerMin | float | 0 – 7.5 (proto max) | 0 when `NotInZone`/`HoldFull` |

Range: min 0 (out of zone); max 3 × 1.0 × 2.5 × 1.0 = 7.5 (3 crew, R1, slow). Never negative; no division.
**Worked examples** (factor 1.0 / at average 0.9):

| Setup | R1 rate | R1 fill 20 / 32 | R2 rate | R2 fill 32 |
|---|---|---|---|---|
| 2 crew | 5.0 / 4.5 per min | 4.0 / 4.44 min (cap 20) | 4.5 / 4.05 | 7.9 min |
| 3 crew | 7.5 / 6.75 per min | 4.27 / 4.74 min (cap 32) | 6.75 / 6.08 | 5.27 min |

Starter (2 crew, cap 20, R1) fills in 4.0–4.4 min → meets the 4–6 min target (00 §5 A1). **ASSUMPTION – validate by H1 telemetry `hold_full` time on trip 1 (target median 4–6 min).**

**F2 — BoatSpeedFactor** (PROPOSED; A1 owns factor, A2 owns speeds)
`s = clamp(BoatSpeed / BoatMaxSpeed, 0, 1)`; `BoatSpeedFactor = 1.0 if s ≤ 0.6, else 1.0 − 0.375 × (s − 0.6)`

| Symbol | Type | Range | Description |
|---|---|---|---|
| BoatSpeed | float m/s | 0–BoatMaxSpeed | current speed (doc 02) |
| s | float | 0–1 | speed fraction |
| BoatSpeedFactor | float | 0.85–1.0 | 1.0 at anchor/drift (speed 0, satisfies D6 > 0) and cruise; 0.85 at full throttle |

Example: s = 0.8 → 1.0 − 0.375 × 0.2 = 0.925. Rationale: drifting and looking (P1) is the natural fishing posture; full-speed
transit is only 15% slower, so exploring is never punished hard and anchoring is never required. Pacing tables use 0.9 average.
**PROPOSED** (decision closed for prototype). **ASSUMPTION – validate by H1: ≤1 player reports "had to slow down to fish"; else set floor to 1.0 (flat).**
**Dependency (D6)**: doc 08 companion mode relies on `BoatSpeedFactor` = **1.0 at speed 0** (drift/anchor); any retune must keep this.

**F3 — CatchRoll (weighted pick)** `P(i) = RarityWeight_i / Σ_j RarityWeight_j` over species with `RegionId == current`.
Implementation: `r = RandRange(0, ΣW)`; walk cumulative weights; first row with cumulative > r wins. Stock `FRandomStream`.
Example (R1, ΣW = 100): r = 87.3 → cumulative 40, 70, 85, 93 → `RibbonEel`. P(LanternPuffer) = 2/100 = 2%.
Expected value per fish `EV = Σ P(i) × BaseValue_i` → R1 4.19, R2 7.65 Shells (used by doc 05).
Trip variance: per-fish SD R1 ≈ 3.9 Shells → 20-fish hold = 84 ± 17.5 Shells (1 SD). **ASSUMPTION – acceptable, validate by H1 survey: no "unlucky/unfair" complaints.**

**F4 — Per-crew accumulator (discrete landings)** (PROPOSED)
Each tick: `dt' = min(dt, MaxTickDt)`; if state = `Fishing`: `Progress_c += Efficiency_c × BaseRate × BoatSpeedFactor × dt' / 60`.
While `Progress_c ≥ 1` and `CargoLoad < CargoCapacity`: `Progress_c −= 1`, `CargoLoad += 1`, `CatchRoll`, play haul.
If the hold fills mid-loop, remaining progress is clamped to `< 1` and frozen.
Start offsets `Progress_c(0)` = [0.5, 0.0, 0.25] for slots 1–3 (not saved; re-applied on load).
Example: 2 crew, R1, factor 1.0: crew 1 lands at 12 s, then every 24 s; crew 2 at 24 s, every 24 s → first fish 12 s after entering a zone.
`MaxTickDt = 0.25 s`: after a 3-hour laptop sleep, the next tick adds at most 0.25 s of fishing (2 crew, R1: 2 × 0.25 / 24 ≈ 0.021 fish → no landing) — no catch-up. (D8: one name and value, also used by doc 07.)

### Sample data table — `DT_Species` (PROPOSED; all values ASSUMPTION – validate by H1 time-to-R2)

| SpeciesId | Region | Rarity | RarityWeight | BaseValue |
|---|---|---|---|---|
| SandSprat | R1_Shallows | Common | 40 | 2 |
| HarbourMackerel | R1_Shallows | Common | 30 | 3 |
| BlueWrasse | R1_Shallows | Common | 15 | 5 |
| RibbonEel | R1_Shallows | Uncommon | 8 | 8 |
| SunFlounder | R1_Shallows | Uncommon | 5 | 12 |
| LanternPuffer | R1_Shallows | UncommonPlus | 2 | 25 |
| SwellBream | R2_Swells | Common | 35 | 5 |
| KelpPollock | R2_Swells | Common | 30 | 6 |
| StripeBonito | R2_Swells | Common | 20 | 8 |
| MoonSnapper | R2_Swells | Uncommon | 10 | 13 |
| GlassSquid | R2_Swells | Uncommon | 4 | 20 |
| PearlTuna | R2_Swells | UncommonPlus | 1 | 40 |

Row struct `FSpeciesRow { SpeciesId (FName), DisplayName (FText), RegionId, Rarity (enum), RarityWeight (int), BaseValue (int), Icon (cel sprite) }`.

### Crew roster (CONFIRMED owner D5/D7: `CrewId`s; flavour PROPOSED — poses/idle actions only, no faces or expressions per D7)

| CrewId | Slot | Source | Efficiency | Flavour trait (pose / idle action; no mechanic) |
|---|---|---|---|---|
| Mabel | 1 | starter | 1.0 | Leans on the rail; idle = coils rope, lies on the cargo when the hold is full |
| Pip | 2 | starter | 1.0 | Restless; idle = waves both arms at every passing boat |
| Tomo | 3 | `Crew_2` (doc 05) | 1.0 | Steady; idle = points an arm toward whales/pings |

## Edge Cases

| Case | Result |
|---|---|
| Hold full in companion mode for hours | `HoldFull`; zero accumulation; nothing lost or banked; on return cargo is exactly `CargoCapacity`. |
| App closed with fish aboard | Cargo saved; sold next session; no fish added for time away. |
| Laptop sleep / long hitch (dt = minutes) | `MaxTickDt` clamps to 0.25 s of fishing. |
| Window minimised (not closed) | Counts as running → fishing continues (same as compact). **ASSUMPTION – validate with doc 08 that UE keeps ticking when minimised.** |
| Pause/settings menu open | Simulation continues (single-player cozy, no pressure). |
| Boat straddles `ZoneId` edge | Inside-test on boat pivot only; progress kept across crossings. |
| In `TransitionBand` | Region with blend weight ≥ 0.5 supplies `BaseRate` + table; tie (exactly 0.5) → lower tier. |
| In R2 swell push-back band without `Keel` | Outside any `ZoneId` (doc 03) → `NotInZone`. |
| Two crew land in the same frame | Both land (2 units); pop-ups offset 0.3 s visually. |
| Region species table empty / missing | No catch; log error once; crew show idle. |
| Sell while catch progress partial | Progress kept; fishing resumes from it. |
| Load from save | Offsets re-applied from F4; no saved progress. |

## Dependencies

- **02 Sailing** (hard): `BoatSpeed`, `BoatMaxSpeed`. 02 must list 04 as consumer of speed.
- **03 World** (hard): `ZoneId` volumes, `RegionTier`, `TransitionBand` weights; 03 must list 04 as consumer.
- **05 Economy** (hard, bidirectional): `BaseValue` lives here; upgrade effects defined in 05.
- **07 Persistence**: saves `CargoContents (SpeciesId→count)`, `CrewRoster`, `SpeciesSeen`.
- **08 / 10**: display only. **09**: crew cel spec. Effort: **~4 dev-days** (component 1.5, DataTable 0.5, anim hookup 1.5, tests 0.5). **ASSUMPTION.**

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| BaseRate R1 / R2 | 2.5 / 2.25 | 1.5–3.5 | trip length (fill time) |
| CrewMember.Efficiency | 1.0 | 0.5–2.0 | per-crew contribution |
| SpeedFactor threshold / floor | 0.6 / 0.85 | 0.4–1.0 / 0.7–1.0 | how much transit slows catch (1.0 floor = flat) |
| RarityWeight per row | table | ≥1 | rarity feel, EV |
| Start offsets | 0.5/0.0/0.25 | 0–0.9 | time to first catch |
| MaxTickDt | 0.25 s | 0.1–0.5 | catch-up protection; hitch tolerance (07) |

## Visual/Audio Requirements

Crew, catch pop-up fish and splash are **ActsLayer** (inked cel, two-tone, #33273B line, animated on twos) — 00 §1.
Water stays painted (`StaysLayer`); landing splash is a hard-edged drawn VFX. Audio: soft line-plop + gentle "tok" per
landing (≤ -18 LUFS short-term, no rising pitch "jackpot"); `UncommonPlus` adds one soft chime. No sound on `HoldFull` beyond one bell (doc 10).

## Game Feel

Rhythm, not reward spam: in R1 a landing every ~12 s per 2 crew — enough to feel alive in peripheral vision, not enough to demand attention.
Haul anim 1.2 s; pop-up rises 40 px over 0.8 s and fades. `HoldFull` lounge must look content (stretching, feet up).

## UI Requirements

HUD (doc 10): `CargoLoad / CargoCapacity` bar, `HoldFull` label "Hold full — crew's resting", species pop-up name + Rarity colour (colourblind-safe, doc 10).
Crew roster panel at shipwright: name, colour-swatch dummy icon (doc 10, D7), flavour line. No crew micro-management screens.

## Cross-References

00-direction §1, §5 A1, §6, §9 D2/D4 · 01 core loop (PhaseKey) · 02 (BoatSpeed) · 03 (ZoneId, TransitionBand) · 05 (BaseValue, upgrades) · 07 · 08 · 09 · 10.

## Acceptance Criteria

1. With 2 crew, Efficiency 1.0, anchored in R1, cap 20: hold fills in 240 s ± 1 s (F1/F4). (H1)
2. First fish lands ≤ 15 s after entering an R1 `ZoneId` on the starter boat. (H1)
3. In `Harbour` or outside any `ZoneId`, `CargoLoad` does not change over 5 min. (§12)
4. With `HoldFull`, 30 min of compact-mode running adds 0 fish and changes no state; selling resumes fishing within 1 tick. (D2, H4)
5. Closing the app for 10 min and reloading: `CargoLoad` identical to saved value. Suspending the PC for 10 min adds ≤ 0.25 s of catch. (§12)
6. Over 10,000 simulated `CatchRoll`s in R1, each species frequency is within ±1 pp of its weight %.
7. No input binding exists that alters catch (code review of input mappings). (§12, P2)
8. Playtest: ≤ 1 of ≥ 8 players names "nothing to do while the crew fishes" as top complaint. (H1)

## Open Questions

1. ~~BoatSpeedFactor floor~~ — CLOSED (loop 1): 0.85 floor PROPOSED, validated by H1 (F2); 1.0 at speed 0 fixed for 08.
2. ~~R2 RegionId~~ — CLOSED: §6 now uses `R2_Swells`.
3. Should Tomo's hire scene be a tiny dockside moment (cost ~1 dev-day) or just appear on deck?
4. Minimised-window ticking behaviour must be confirmed with doc 08/07 (UE background throttling).

## Interface values

| Name | Value | Owner doc |
|---|---|---|
| `BaseRate` R1 / R2 | 2.5 / 2.25 fish/min per Efficiency | 04 |
| `CrewMember.Efficiency` | 1.0 (all prototype crew) | 04 |
| `CrewSlot` count / `CrewId` | 2 at start (Mabel, Pip); 3 after `Crew_2` (adds slot + Tomo) — D5/D7 | 04 |
| `CatchRatePerMin` starter R1 | 5.0 (factor 1.0), 4.5 (avg 0.9) | 04 |
| `BoatSpeedFactor` | 1.0 at s ≤ 0.6 (incl. speed 0 — 08 depends, D6); 0.85 at s = 1.0 | 04 (speeds from 02) |
| Fishing sub-states | `NotInZone`, `Fishing`, `HoldFull` | 04 |
| Time to first fish | 12 s after zone entry | 04 |
| Starter R1 fill time | 4.0–4.4 min | 04 |
| EV per fish R1 / R2 | 4.19 / 7.65 Shells | 04 |
| Species count | 12 (6 R1, 6 R2) | 04 |
| `MaxTickDt` | 0.25 s | 04 |
| Event | `OnFishLanded(SpeciesId, RegionId)` | 04 → 07/10/IRareDropService stub |
