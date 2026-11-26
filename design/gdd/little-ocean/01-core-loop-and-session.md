# Little Ocean — 01 Core Loop and Session

> **Status**: In Design
> **Author**: systems-designer (agent A1) for owner
> **Last Updated**: 2026-11-26
> **Last Verified**: 2026-11-26
> **Implements Pillar**: P1 The ocean is the attraction, P2 Hands off the line, P3 Curiosity (H1 owner doc)

## Summary

The loop is: sail out → crew auto-fishes → hold fills → sail home → sell → fit the boat / hire crew → (Cutter + Keel) → Region 2 opens.
It is modelled as a small `PhaseKey` state machine with pacing targets — first fish ≤ 2 min, first sale ≤ 8 min, Region 2 at
20–35 min — and a 5-step, text-light first-time user experience (FTUE).

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `02 Sailing`, `03 World`, `04 Crew & Fishing`, `05 Economy`, `07 Persistence`, `10 HUD`, `11 Ship Fitting`

## Overview

This doc owns the shape of a session and the `PhaseKey` values every other system reads. It does not own any numbers
except pacing targets; rates and prices come from 04/05, distances from 02/03. Each trip is 5–9 min; a 45-min playtest
contains ~5 trips, every gate-path purchase (FishHold, Bunk + Tomo, Cutter + Keel), and a first look at Region 2.

## Player Fantasy

A captain on holiday (00 §1). Session emotional arc: settle in at the harbour → drift out and look → small surprise (a rare
fish pop, a discovery, a passing whale) → come home with a full hold (quiet satisfaction) → linger, or tuck the game into
companion mode. The player should never feel they are *working*; the crew works.

## Detailed Design

### Core Rules

1. **CONFIRMED (brief §2)** Loop order: sail → auto-fish → cargo fills → return → sell to NPC → upgrade the boat (Shipyard fit/buy, Inn hire; D9) → unlock region → discover → socialise.
2. **CONFIRMED (brief §12; 00 P2)** The player's verbs are sail, look, choose, sell, upgrade (fit, buy, hire), chat. No fishing verb.
3. **CONFIRMED (brief §5, §12)** Progress happens only while the app runs; nothing accrues while closed; no catch-up on load.
4. **CONFIRMED (owner D2)** A full hold pauses fishing; it never stops sailing, and nothing auto-returns or auto-sells.
5. **PROPOSED** Returning home is always the player's choice. A full hold shows one calm prompt and a harbour compass marker; no timer, no decay, no repeated nag.
6. **CONFIRMED (00 P4)** No loop step requires another player. Hangout features (doc 06) are paper-only in the prototype (D3).
7. **PROPOSED** No daily/login rewards, no session timers, no "come back" pressure (brief §12 no chores).

### States and Transitions (`PhaseKey`, shared with doc 10)

| PhaseKey | Entry condition | Fishing (doc 04) | Exit |
|---|---|---|---|
| `Docked` | boat inside harbour dock trigger, speed < 0.5 m/s | none (Harbour) | throttle out of trigger → `Sailing`; interact counter → `Selling` |
| `Selling` | Fishmonger, Shipyard or Inn crew board screen open (while `Docked`) | none | close UI → `Docked` |
| `Sailing` | outside dock trigger AND `CargoLoad < CargoCapacity` | `Fishing` if in `ZoneId`, else `NotInZone` | hold fills → `Returning`; enter dock → `Docked` |
| `Returning` | outside dock trigger AND `CargoLoad == CargoCapacity` | paused (`HoldFull`) | enter dock → `Docked` |

**CONFIRMED (00 §6, loop-1 ruling 6)** `Compact` is NOT a `PhaseKey`; it is a `ViewMode` overlay (doc 08). The underlying loop phase
(`Sailing`/`Returning`/`Docked`) is retained and resumes unchanged; doc 04 keeps reading it. `Returning` describes the hold state, not
the boat's heading — a player may keep exploring while `Returning`. The Fishmonger, Shipyard (doc 11) and Inn crew board
(doc 04) are sub-screens of `Selling`, not their own `PhaseKey`s (avoids coining new shared names; the old 00 §5 diagram's
"Shipwright" step = `Selling`; D9).

### FTUE (first session, PROPOSED, ≤ 1 line of text per step)

| Step | Trigger | What happens | Target time |
|---|---|---|---|
| 1 Greet | new save | Spawn `Docked`; Mabel & Pip wave (pose only, faceless — D7); bubble "Ready when you are, Captain." Compass marker on R1 shallows | 0:00 |
| 2 Cast off | player throttles | Controls hint (doc 02/10) fades after first 5 s of steering | 0:45 |
| 3 First fish | enter R1 `ZoneId` | Crew starts fishing; first fish pop at 12 s; cargo bar appears with a single pulse | ~1:42 |
| 4 Hold full | `CargoLoad == CargoCapacity` | Crew lounge; bubble "Hold's full — fishmonger's open whenever you are." Harbour marker | ~5:56 |
| 5 First sale & shop | dock + Sell all | +~84 Shells; Shipyard highlighted once; `FishHold` (60) is affordable and auto-proposed into the Skiff's M slot; Keel row reads "Needs a keel mount (Cutter) · opens The Swells" (doc 10/11) | ~6:56 |

If the player idles at the dock 60 s at step 1, Pip points toward the shallows once (no repeats).

### Interactions with Other Systems

02 (dock trigger, speed), 03 (`ZoneId`, region entry for telemetry), 04 (`HoldFull`, first fish, hiring), 05 (sale, purchases, gate cost),
07 (autosave on every `Selling` exit and every 60 s), 08 (`ViewMode`), 10 (PhaseKey → HUD/prompts), 11 (Shipyard fitting, `fit_change`).

## Formulas

**F1 — First-sale time** `T_firstSale = FTUE_Dock + TravelOut_R1 + CargoCapacity / (CatchRatePerMin × AvgSpeedFactor) + TravelBack_R1 + Sell`

| Symbol | Type | Default | Range | Source |
|---|---|---|---|---|
| FTUE_Dock | min | 0.75 | 0.25–2 | ASSUMPTION – telemetry `session_start→leave_dock` |
| TravelOut_R1 / TravelBack_R1 | min | 0.75 / 0.75 | 0.75–1.5 | CONFIRMED (03, loop-1 ruling 2: 45 s each way); upper range = wandering |
| CargoCapacity | units | 20 | 16–28 | doc 11 (Skiff 14 + `FishCrate` 6) |
| CatchRatePerMin | fish/min | 5.0 | 5.0 | doc 04 (2 crew, R1) |
| AvgSpeedFactor | float | 0.9 | 0.85–1.0 | doc 04 F2 |
| Sell | min | 0.25 | 0.1–0.5 | doc 05 |
| T_firstSale | min | 6.94 | 5.85–10.2 | — |

Worked example: 0.75 + 0.75 + 20/(5.0 × 0.9) + 0.75 + 0.25 = 0.75 + 0.75 + 4.44 + 0.75 + 0.25 = **6.94 min (≈ 6.9)**.
Range: best (all minimums, factor 1.0, cap 20) = 0.25+0.75+4.0+0.75+0.1 = 5.85; slow (2 min dock, 1.5 travel each way, factor 0.85) = 2+1.5+4.71+1.5+0.5 = 10.2 min → exceeds 8. Slack to the 8-min target is 1.06 min (~15%).
**ASSUMPTION – validate by H1 `first_sale` ≥75% ≤ 8 min.** If it fails, first lever: start `CargoCapacity` 20 → 16 (−0.9 min).

**F2 — Time to Region 2**: defined in doc 05 F4 (catalogue from 11 F4). Modelled A' 27.8 / B 19.8 / C 28.3 / D 25.2 min across purchase orders; target 20–35 (H1).

### Pacing targets (session)

| Milestone | Target | Model | Owner of lever |
|---|---|---|---|
| First fish | ≤ 2 min from spawn (≤ 15 s after zone entry) | 1:42 (0.75 + 0.75 min + 12 s) | 04 offsets |
| First sale | ≤ 8 min (≥75% players) | 6.9 min | 05 cap / 04 rate |
| First purchase | ≤ 8 min | 6.9 min (`FishHold`, 60) | 05 price |
| R2 unlock | 20–35 min median | 19.8–28.3 min (+20% slack → 23.8–34.0; path A' 27.8) | 05 gate cost (`Cutter` + `Keel`) |
| Trip length | 5–10.5 min | 4.96–10.44 (R2 incl. 143/137 s crossing) | 04/05 |
| Playtest 45 min | ≥ 1 R2 trip | path A': R2 sale at 38.2 min | — |

### Session structure (PROPOSED)

- **Playtest session (45 min)**: FTUE → 4 R1 trips (one Skiff fitting choice) → Cutter + Keel → 1–2 R2 trips; compact mode suggested once by facilitator, not by game.
- **Typical home session (ASSUMPTION – 20–60 min)**: 1 trip ≈ one "song" of attention; any stopping point is safe because cargo and Shells persist and nothing decays.
- **Companion session**: drift in a zone (D2); hold fills in ~4–8 min, then crew rest indefinitely. Natural cap = one hold per check-in; it rewards glancing back, never punishes absence.

## Edge Cases

| Case | Result |
|---|---|
| Player never leaves harbour | No catch; one Pip pointing gesture at 60 s; nothing else. |
| Player sells partial hold early | Allowed; FTUE step 4 skipped, step 5 still fires on first sale. |
| Player ignores full hold and explores | Stays `Returning`; sailing/discoveries unaffected; no repeated prompt. |
| Quit mid-trip | Position, cargo, Shells saved (doc 07); reload resumes in the same phase; no catch for time away. |
| Quit during `Selling` | Last completed transaction saved; on load spawn `Docked`. |
| Toggle compact while `Returning` | Overlay; boat drifts (D2); still `HoldFull`; no auto-return. |
| Boat enters dock while full and moving fast | `Docked` requires speed < 0.5 m/s; marker says "slow down to dock" (doc 02 owns docking). |
| Player reaches R2 edge without Keel | Swell push-back (doc 02/03); phase unchanged; Keel row hint in the Shipyard ("Needs a keel mount (Cutter) · opens The Swells"). |
| FTUE on loaded save | FTUE flags saved; completed steps never repeat. |

## Dependencies

02, 03, 04, 05, 11 (hard); 07 (save phase + FTUE flags); 08 (`ViewMode`); 10 (prompts). Each of those docs must reference
`PhaseKey` from here. Effort: **~3 dev-days** (phase state machine 1, FTUE prompts 1, telemetry CSV 1). **ASSUMPTION.**

**Telemetry (local CSV, 00 §2)**: `session_start`, `leave_dock`, `first_fish`, `hold_full`, `sale(Shells)`, `purchase(ItemId|HullId)`,
`fit_change(HullId, Fitting)` (on Shipyard Done when the loadout changed; doc 11 AC 6), `hire(CrewId)`,
`region_enter(RegionId)`, `viewmode_change`, each with session seconds. Derived: time-to-first-sale, time-to-R2.

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| Idle-at-dock hint delay | 60 s | 30–120 s | FTUE nudging (never repeats) |
| Hold-full prompt duration | 4 s | 2–8 s | calmness vs clarity |
| Autosave interval | 60 s | 30–300 s | data loss on crash (doc 07 owns) |
| Dock speed threshold | 0.5 m/s | 0.3–1.5 | docking friction (doc 02 agrees) |
| Pacing levers | see 04/05 | — | first sale, R2 time |

## Visual/Audio Requirements

Prompts are speech bubbles from inked crew (**ActsLayer**), not system pop-ups. Harbour marker is an inked buoy-style glyph.
Returning home: the harbour's painted lighthouse warms in colour as you approach (doc 09). Audio bed per region crossfades on
`TransitionBand` (doc 08); a gentle bell on docking.

## Game Feel

No failure states, no countdowns. Every phase change is announced by a character or a sound, not a modal. The first 2 min must
produce a visible fish; the first 7 min must produce a purchase.

## UI Requirements

HUD reads `PhaseKey` (doc 10): `Sailing` cargo + Shells + compass + action bar (region name on entry only); `Returning` adds
the harbour marker pulse; `Docked` inserts `E` Talk in the action bar; `Selling` is ≤ 2 clicks deep (doc 10). No quest log, no checklist.

## Cross-References

00 §1, §2 H1, §5 A1, §6, §9 D2/D3/D5/D9 · 02 · 03 · 04 · 05 · 07 · 08 · 10 · 11.

## Acceptance Criteria

1. Scripted bot run (start → R1 anchor → return → sell) records first sale ≤ 7.2 min with model inputs. (H1)
2. `PhaseKey` transitions match the table for all 4 phases; `Compact` toggle round-trips to the same underlying phase.
3. Closing and reopening restores phase, cargo, Shells and FTUE flags; no fish added for time closed. (§12)
4. No prompt repeats more than once per trigger; no timer exists in any loop phase.
5. Playtest H1: ≥75% first sale ≤ 8 min; median R2 unlock 20–35 min; ≥70% rate "relaxing" ≥ 4/5; ≤1 player says "nothing to do while the crew fishes".
6. Telemetry CSV contains all listed events for every playtest session.

## Open Questions

1. Should the hold-full prompt also appear in companion mode, or only as a cargo-bar colour change (doc 08)?
2. ~~`Compact` in `PhaseKey`~~ — CLOSED (loop-1 ruling 6): `ViewMode` overlay only.
3. Is a 45-min playtest long enough to judge R2, given modelled entry at ~27.8 min (path A')?

## Interface values

| Name | Value | Owner doc |
|---|---|---|
| `PhaseKey` | `Docked`, `Selling`, `Sailing`, `Returning` (`Compact` is a `ViewMode`, not a PhaseKey) | 01 |
| First fish target / model | ≤ 2 min from spawn / 102 s | 01 (lever 04) |
| First sale target / model | ≤ 8 min / 6.9 min | 01 (levers 04/05) |
| R2 unlock target / model | 20–35 min / A' 27.8, B 19.8, C 28.3, D 25.2 min | 01 (lever 05, catalogue 11) |
| Dock speed threshold | 0.5 m/s | 01 (agree with 02) |
| Autosave | on every `Selling` exit + 60 s | 07 |
| FTUE flags in `PlayerProgress` | `FtueStep` (int 0–5) | 07 |
| Telemetry events | list above | 01 |
