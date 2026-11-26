# Little Ocean — 02 Sailing and Boat Handling

> **Status**: In Design
> **Author**: level-designer (agent A2) for owner
> **Last Updated**: 2026-11-26
> **Last Verified**: 2026-11-26
> **Implements Pillar**: P1 The ocean is the attraction (primary), P2 Hands off the line, P3 Curiosity is the currency of progress

## Summary

An arcade, kinematic boat model (no physics sim, no fuel, no damage) with telegraph-style throttle, speed-scaled
turning, a one-button anchor, soft harbour docking, and an orbit camera. Owns the **swell push-back model**
(owner D1): a world-space drift velocity that stalls an un-upgraded boat inside the R2 swell and is mostly
cancelled once the `Keel` upgrade is fitted. Never damages, never sinks, never takes control away.

> **Quick reference** — Layer: `Foundation` · Priority: `MVP` · Key deps: 03 World (swell field, volumes), 05 Economy (`Keel` price), 04 Crew (`BoatSpeedFactor` consumer), 08 Companion (Compact hold), 10 HUD

## Overview

The player's boat is a single pawn simulated entirely on the client (**CONFIRMED (brief §10)**: movement never
depends on network). The player sets a target speed with throttle notches and lets go: the boat holds speed and
heading, so sailing is a calm "set course and look" activity that coexists with crew auto-fishing
(**CONFIRMED (brief §2, §12)**) and with companion mode. Turning, accelerating and the swell are tuned to feel
like a sturdy little fishing boat, not a speedboat.

## Player Fantasy

"I nudge the throttle to Half, point the bow at the lighthouse, take my hands off and watch the sea go by."
When the boat meets the big northern swell it rises, slows, and is gently shouldered back — the sea saying
"not yet", not "game over". After the Keel is fitted the same swell becomes a satisfying, rolling push-through.

## Detailed Design

### Core Rules

1. **PROPOSED — Kinematic arcade model** (custom `UBoatMovementComponent`, not Chaos Vehicles; rationale: deterministic, cheap, trivially tunable, no physics jitter in Compact). Position integrates `GroundVel = Heading × BoatSpeed + PushVec` each tick.
2. **PROPOSED — Telegraph throttle**: 5 notches `Reverse (−3 kn)`, `Stop (0)`, `Slow (4 kn)`, `Half (8 kn)`, `Full (12 kn)`. W/S (or D-pad / RT-LT) steps one notch; the notch persists with no input held. Rationale: hands-off sailing supports P2 and idle play.
3. **PROPOSED — Rudder**: A/D or left stick X; spring-returns to centre on release (boat holds current heading). Turning in place allowed at 50% rate below 0.5 kn so the player can never get "stuck facing a rock".
4. **PROPOSED — Anchor** (key Space / gamepad Y): if `BoatSpeed ≤ 2 kn` it drops (2.0 s animation) and the boat is `Anchored` (BoatSpeed = 0, PushVec ignored). If faster, the boat brakes at 1.5 m/s² then anchors. Raising takes 2.0 s and resumes at notch `Stop`. Anchoring is allowed everywhere, including the swell band (cozy; no exploit, see Edge Cases).
5. **PROPOSED — Harbour speed cap**: inside the `Harbour` region volume, target speed is clamped to 6 kn (3.09 m/s). Rationale: keeps berths readable for 8 boats; ~33 s to clear the basin.
6. **PROPOSED — Docking**: within 25 m of a free berth at ≤ 3 kn, prompt "Moor (E)"; pressing it auto-glides the boat to the berth in 3.0 s (eased spline). `PhaseKey` → `Docked` (owned by 01). Casting off = any throttle input; the boat backs out 10 m automatically.
7. **CONFIRMED (owner D1) — Swell push-back**: R2 has heavy swell that pushes small boats back, never damages them; the `Keel` upgrade lets the boat push through. Implemented as `PushVec` (Formulas F4–F6). The player always keeps steering and throttle.
8. **PROPOSED — Soft turn-back message**: without `Keel`, if northward ground speed < 0.3 m/s for 3 s while `SwellStrength > 0`, play one crew bark + one HUD toast per sail-out: *"Swell's too big for our keel, Cap'n. The shipwright could fit a sturdier one."* No forced turn, no fade-out.
9. **PROPOSED — Collision**: islands/rocks/quays are blocking. On contact the velocity component into the surface is removed, a 0.5 m/s rebound applied, a soft wooden "bonk" plays. No damage state exists (**CONFIRMED (brief §12)** no survival systems).
10. **PROPOSED — Remote boats** (paper only, owner D3) are non-colliding ghosts; the local boat never collides with another player.
11. **PROPOSED — Cosmetic motion**: heave/pitch/roll are visual-only on the mesh, never on the camera, scaled by region (F7). A "Reduce motion" accessibility toggle multiplies all amplitudes by 0.25.

### States and Transitions

| State | Enter when | Exit to | Notes |
|---|---|---|---|
| `Docked` | Moor completes | `Sailing` on throttle input | Boat locked to berth; selling/shipwright UI available (01/05) |
| `Sailing` | Cast off / anchor raised | `Anchored`, `Docked`, `Stalled` | Normal model |
| `Stalled` (sub-state) | Rule 8 condition | `Sailing` when northward speed ≥ 0.3 m/s or SwellStrength = 0 | Only drives the bark/toast; physics unchanged |
| `Anchored` | Anchor dropped | `Sailing` after raise | Crew may still fish if inside a `ZoneId` (04) |
| `CompactHold` | `ViewMode = Compact` (08) | previous state on `Full` | **CONFIRMED (owner D2)** drift in place: PushVec × 0, BoatSpeed eased to 0 over 4 s, cosmetic circling ±3 m |

### Interactions with Other Systems

- **03 World**: reads `SwellStrength(p)` and `SwellDir` (analytic field defined in 03) and region volumes for harbour cap.
- **04/01 Crew & loop**: publishes `BoatSpeed` (m/s, speed over water, excluding PushVec) and `GroundSpeed`; A1 derives `BoatSpeedFactor`. Anchored ⇒ BoatSpeed = 0.
- **05 Economy**: `UpgradeId = Keel` sets `HasKeel = true`; price owned by 05 (`KeelPrice`).
- **07 Persistence**: saves position, heading, state (Docked/Anchored/Sailing). Load never restores speed (boat starts at `Stop`).
- **08 Companion**: on Compact enter, state → `CompactHold`; camera switches to the fixed Compact framing (below).
- **10 HUD**: throttle notch, speed in kn (ground speed), anchor icon, toast.

## Formulas

**F1 Unit conversion** — `v[m/s] = v[kn] × 0.5144`. Notches: 4 kn = 2.06 m/s, 6 kn = 3.09, 8 kn = 4.12, 12 kn = **6.17 m/s** (`BoatMaxSpeed`).

**F2 Acceleration** — `BoatSpeed += clamp(Target − BoatSpeed, −Decel·dt, Accel·dt)`.
`Accel = 1.03 m/s²` (0 → 12 kn in 6.0 s), `Decel = 0.77 m/s²` (12 kn → 0 coasting in 8.0 s), anchor brake 1.5 m/s².
Worked: Stop → Full covers `v²/2a = 6.17²/2.06 = 18.5 m` during the 6 s ramp.

**F3 Turn rate** — `TurnRate(v) = TurnMax × lerp(1.0, 0.6, v / BoatMaxSpeed)`, `TurnMax = 45 °/s`.
At Full: 27 °/s = 0.471 rad/s → turning radius `r = v/ω = 6.17/0.471 = 13.1 m` (~1.6 boat lengths, boat = 8 m).
At Slow (2.06 m/s): 39 °/s → r = 3.0 m. Below 0.5 kn: 22.5 °/s pivot.

**F4 Swell strength (field, owned by 03)** — `SwellStrength(p) ∈ [0,1]`, `s(t) = 3t² − 2t³`, t clamped to [0,1].
In the R1→R2 band: `SwellStrength = s((y − 500) / 150)`; inside R2 body (y ≥ 650) = 1.

**F5 Push vector** — `PushVec = SwellDir × PushMax × SwellStrength(p) × (1 − KeelResist·HasKeel)`
`SwellDir = (0, −1)` (rolling south toward shore), `PushMax = 1.25 × BoatMaxSpeed = 7.71 m/s (15 kn)`, `KeelResist = 0.85`.
World-edge bands (03) use the same formula with `KeelResist` forced to 0 (Keel never bypasses world edge).

**F6 Stall point without Keel** (heading north at Full): equilibrium when `PushMax·s(t) = BoatMaxSpeed` ⇒ `s(t) = 1/1.25 = 0.80` ⇒ `t ≈ 0.713` ⇒ **y ≈ 500 + 0.713 × 150 = 607 m**, i.e. the boat climbs ~107 m into the 150 m band, slows to a stop and rides the swell. Releasing throttle: it drifts back south, slowing as `s → 0` near y = 500 (no snap).
**With Keel**: max push `7.71 × 0.15 = 1.16 m/s`. Net northward speed in full swell = `6.17 − 1.16 = 5.01 m/s (9.7 kn)`; southward (home) = `7.33 m/s (14.3 kn)`. Average push across the band = `0.5 × 1.16 = 0.58 m/s` ⇒ band crossing `150 / 5.59 ≈ 27 s`.

**F7 Cosmetic motion** — `Heave(t) = A_h · sin(2πt / 7 s)`, `Roll(t) = A_r · sin(2πt / 5.3 s)`, amplitudes lerped by `SwellStrength`:
R1 `A_h = 0.15 m, A_r = 2°`; full swell no Keel `0.6 m, 8°`; full swell with Keel `0.45 m, 5°` (Keel *feels* steadier).

## Edge Cases

- **Anchored inside the swell band without Keel**: anchor holds; PushVec ignored. No exploit: the R2 species table only starts at y = 650 (03), which an un-Keeled boat cannot reach (F6).
- **Save/load places an un-Keeled boat at y ≥ 650** (e.g. corrupted save): push carries it out at up to 7.71 − 0 m/s; it settles near y ≈ 500 in < 60 s. No teleport, no message beyond the normal toast.
- **Steering sideways in the band**: allowed; the band spans the full map width and meets the world-edge bands, so there is no gap. 03 forbids colliding geometry in the band so a boat can never be pinned against rock by the push.
- **Swell + world-edge corner overlap**: PushVecs sum, then magnitude clamped to `PushMax`.
- **Reverse into the swell**: Reverse speed 1.54 m/s < push; boat drifts south. Fine.
- **Mooring attempt while another player holds the berth (paper MP)**: berths are local-only; remote boats are ghosts, so no conflict in the prototype.
- **Window loses focus mid-sail (Full mode)**: boat keeps its notch (no input held). Not paused — the app is running (brief §5).
- **Frame hitch (dt > 0.1 s)**: dt clamped to 0.1 s per substep, max 4 substeps, preventing tunnelling through quays.
- **Collision while turning in place against a cliff**: pivot allowed; rebound pushes 0.5 m/s away so the boat unsticks.

## Dependencies

| System | Direction | Contract |
|---|---|---|
| 03 World | reads | `SwellStrength(p)`, `SwellDir`, region volumes, berths |
| 05 Economy | reads | `HasKeel` from `PlayerProgress.Upgrades` contains `Keel` |
| 04 Crew / 01 Loop | provides | `BoatSpeed`, `GroundSpeed`, state (Anchored/Docked) |
| 07 Persistence | provides | position, heading, boat state |
| 08 Companion, 10 HUD | provides/reads | `CompactHold` state, Compact camera; HUD readouts |

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| `BoatMaxSpeed` | 6.17 m/s (12 kn) | 4.6–7.7 (9–15 kn) | All travel times in 03; H1 time-to-first-sale |
| `Accel` / `Decel` | 1.03 / 0.77 m/s² | 0.5–2.0 | Weightiness |
| `TurnMax` | 45 °/s | 30–60 | Responsiveness vs "boaty" feel |
| `HarbourSpeedCap` | 3.09 m/s (6 kn) | 2.0–4.1 | Basin exit time |
| `PushMax` multiplier | 1.25 × BoatMaxSpeed | 1.1–1.6 (must stay > 1.0 or gate leaks) | Stall depth y (F6) |
| `KeelResist` | 0.85 | 0.7–0.95 | R2 travel speed with Keel |
| `StallToastDelay` | 3 s | 1–6 | Gate readability |

## Visual/Audio Requirements

- Boat, crew, anchor chain and berth bollards are `ActsLayer` (inked cel); wake, bow foam and swell whitecap crests at the hull are hard-edged VFX on twos (doc 00 §1 water rule; spec owned by 09).
- Wake length scales with BoatSpeed (0 at Stop, ~25 m at Full); in the swell, bow spray bursts every crest (period 7 s).
- Audio: engine putter pitch +0–30% with BoatSpeed; anchor chain rattle; soft wooden bonk on collision; hull slap volume ∝ SwellStrength.

## Game Feel

- Input → visible response ≤ 100 ms (rudder visibly turns same frame; speed change readable in wake within 0.5 s).
- The swell must read as **lifting**, not hitting: heave rises before speed falls, no screen shake, no camera roll.
- Camera: spring arm 28 m, pitch −18°, FOV 60°, zoom 14–60 m (mouse wheel / right stick click cycles 3 presets), orbit RMB / right stick, lag 0.15 s; auto-recentres behind the boat after 4 s without camera input when > 2 kn.
- **Compact framing (co-owned with 08)**: fixed 3/4 side view, distance 18 m, pitch −12°, boat in lower-third, no orbit.

## UI Requirements

Throttle notch ladder (5 pips), speed "9.7 kn" (ground speed), anchor button state, "Moor (E)" prompt, stall toast (once per sail-out, 5 s, subtitle-safe). Layout owned by 10.

## Cross-References

00 §5 A2, §9 D1/D2/D3 · 03 (swell field, travel times) · 04/01 (`BoatSpeedFactor`) · 05 (`KeelPrice`) · 07 · 08 · 09 · 10.
Estimated effort (solo UE5): movement component 3 d, swell/edge field 1 d, anchor + docking 1.5 d, camera incl. Compact 1 d, cosmetic motion 0.5 d ⇒ **~7 dev-days**.

## Acceptance Criteria

1. Stop → Full reaches 12 kn ± 0.3 in 6.0 s ± 0.2 (automated test). 
2. Without `Keel`, at Full heading north, the boat never passes y = 615 m in 5 min of attempts from any x (automated sweep at 20 x positions) — protects H1 gate.
3. With `Keel`, harbour mouth → y = 650 completes in ≤ 115 s (03 math) — H1 time-to-R2.
4. No input path, state or collision reduces any value other than position/speed (no damage/health variable exists in the boat class) — brief §12.
5. Stall toast fires within 4 s of stalling and at most once per sail-out; ≥ 6/8 playtesters can say why they could not enter R2 (H1 observer form).
6. Zero camera-roll frames; ≥ 6/8 players report no motion discomfort (H1 "relaxing" ≥ 4/5 survey).
7. In `CompactHold`, boat stays within 5 m of its hold point for 30 min, including inside R2 (H4).

## Open Questions

1. **Compact in R2**: D2 says "drift in place"; this doc suspends PushVec in Compact so a Keel boat does not drift out of R2. Owner/08 to confirm.
2. Should `BoatSpeedFactor` (A1) use water speed `BoatSpeed` or `GroundSpeed`? This doc recommends `BoatSpeed` so the swell does not change catch.
3. Gamepad parity for 5 notches vs analog trigger — playtest with 2 gamepad users.

## Interface values

| Name | Value | Owner doc |
|---|---|---|
| `BoatMaxSpeed` | 12 kn = 6.17 m/s | 02 |
| Throttle notches | −3 / 0 / 4 / 8 / 12 kn | 02 |
| `Accel` / `Decel` | 1.03 / 0.77 m/s² | 02 |
| `TurnMax`, radius at Full | 45 °/s, 13.1 m | 02 |
| `HarbourSpeedCap` | 6 kn = 3.09 m/s | 02 |
| `PushMax` | 7.71 m/s (1.25 × max) | 02 |
| `KeelResist` | 0.85 → 1.16 m/s residual push | 02 |
| Stall depth without Keel | y ≈ 607 m (107 m into band) | 02 |
| `SwellStrength(p)`, `SwellDir` | smoothstep over y 500–650; (0,−1) | 03 |
| `UpgradeId` `Keel` (= `GateRequirement` of R2) | id only | 02/03 (id), 05 (`KeelPrice`) |
| `BoatSpeedFactor` | derived from `BoatSpeed` | 04/05 (A1) |
