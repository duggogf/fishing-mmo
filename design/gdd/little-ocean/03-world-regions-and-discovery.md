# Little Ocean — 03 World, Regions and Discovery

> **Status**: In Design
> **Author**: level-designer (agent A2) for owner
> **Last Updated**: 2026-11-26
> **Last Verified**: 2026-11-26
> **Implements Pillar**: P1 The ocean is the attraction, P3 Curiosity is the currency of progress (primary), P4 Together, never required

## Summary

One continuous 1.6 km × 1.6 km hand-built sea: a sheltered `Harbour`, the warm `R1_Shallows`, a 150 m
`TransitionBand`, and the northern swell region `R2_Swells` (display name "The Rolling Swells", owner D1). The
swell is telegraphed long before it is felt and pushes un-upgraded boats back gently (model in 02). Five
hand-placed discoveries, one R2-only drizzle weather cycle, and travel-time math tuned for H1.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: 02 Sailing (swell model), 04 Crew (`ZoneId`, species tables), 05 Economy (`Keel` price), 06 Hangout (paper: room bounds, encounter lane), 08/09 (audio beds, palettes)

## Overview

**CONFIRMED (brief §3)** one continuous navigable ocean whose regions transition naturally; **CONFIRMED (00 §3)**
prototype = harbour + R1 + R2 with one distinct condition, seamless, no level load; **CONFIRMED (owner D1)** that
condition is swell, gated by the Keel. All region logic is an analytic function of boat position (no streaming,
no volumes overlapping in complex ways), so a solo dev can whitebox it in about two weeks.

## Player Fantasy

Leaving the harbour mouth, the lighthouse is on your left, a wreck's mast pokes up ahead, and far to the north the
sky goes slate-blue over tall sea stacks and rolling white crests. You *want* to go there. The first time you try,
the sea lifts your little boat and politely sets it back down facing home. Twenty minutes later, with a new keel,
you roll through the same swell and the Thunder Arch booms at you through the drizzle.

## Detailed Design

### Core Rules

**Layout (PROPOSED; coordinates in m, origin = harbour mouth centre, +y = north)**

```
 y=1400 +--------------------------------------------------------------+  world-edge push band (100 m)
        |  E                                                         E |
 y=1300 |   . . . . . . . . . . . . . . . . . . . . . . . . . . . .    |
        |        ^ D4 Thunder Arch          D5 Bell Buoy (drizzle) o   |  R2_Swells "Rolling Swells"
        |       /#\ (-300,1000)                         (350,1180)     |  Tier 2, y 650-1300
        |  ##  sea stacks          ~~~ ~~~ swell crests ~~~ ~~~    ##  |  drizzle cycle, overcast
 y= 650 |==============================================================|  species switch line (R2 table)
        |  ~ ~ ~ ~ ~ ~ ~  TransitionBand 150 m (swell ramps 0->1)  ~ ~ |  stall line y~607 (no Keel)
 y= 500 |--o------o------o------o--Swell Buoys--o------o------o------o-|  buoy line, every 100 m
        |                                                              |
        |            ...whale lane E_WhalePod  y=350 ...........>      |  R1_Shallows
        |                             D2 Marigold wreck (250,300) |    |  Tier 1, y 0-500
        |   D1 Gull Lighthouse                                  @@     |
        |  /^\ (-450,80)                            D3 Turtle Rock @@  |
 y=   0 |##########^^######___mouth (0,0)___##################(620,180)|  coastline
        |          headland  |B1 B2 B3 B4 B5 B6 B7 B8|  Harbour basin   |
 y=-160 |               [Fishmonger]  [Inn]  [Shipyard/slipway]  quay   |
        +--------------------------------------------------------------+
       x=-800                          x=0                       x=+800
```

1. **PROPOSED — Map bounds** x ∈ [−800, 800], y ∈ [−200, 1400] (1600 × 1600 m, 2.56 km²). Playable water is
   x ∈ [−700, 700], y ≤ 1300; outside, a 100 m **world-edge push band** uses 02 F5 with `KeelResist = 0` (soft
   current, no wall, no damage). Rationale: small enough to whitebox, big enough for 3–4 min trips (H1 pacing).
2. **PROPOSED — `Harbour`** (`RegionTier` 0): basin x ∈ [−120, 120], y ∈ [−160, 0], 40 m breakwater mouth at (0,0).
   8 berths `B1–B8` at x = −70 + 20·i, y = −130, bow north (boat 8 m × 3 m, 20 m spacing). Quay boardwalk
   y −160..−140 with one place per verb (**CONFIRMED (owner D9)**, screens in 10): Fishmonger (−90, −150, sell),
   Inn with the crew board on its quay wall (0, −155, hire; PROPOSED position: centre of the quay, behind B4/B5) and
   Shipyard with a slipway running into the basin's east corner (90, −150, fit/buy/paint; run by the Shipwright NPC;
   the yard view shows the boat on the slipway, doc 11). Open "mingle water" x ±80, y −110..−40.
   No fishing in the harbour (**CONFIRMED (00 §5 A1)**). Harbour speed cap per 02.
3. **PROPOSED — `R1_Shallows`** (`RegionTier` 1): x ±700, y 0..500 (0.70 km²). Always clear, warm palette.
4. **PROPOSED — `TransitionBand`** y 500..650, **width 150 m**. Blend weight `w = s((y − 500)/150)` drives palette,
   haze, audio bed, cosmetic motion and swell (02 F4). Region-name label flips at y = 575.
5. **PROPOSED — `R2_Swells`** (`RegionTier` 2): x ±700, y 650..1300 (0.91 km²). Full swell everywhere, overcast,
   drizzle cycle. `GateRequirement(R2_Swells) = Keel` (**CONFIRMED (owner D1)**; price in 05). `Keel` is an `ItemId`
   that fits only the `Cutter`'s keel mount; the gate checks `HasKeel` = Keel fitted (doc 11, D9).
6. **PROPOSED — `ZoneId`s**: `Z_R1` = y 0..650 minus a 60 m radius around the mouth (keeps the harbour lane
   calm); `Z_R2` = y 650..1300. **Species switch is hard at y = 650**, not blended: an un-Keeled boat stalls at
   y ≈ 607 (02 F6), so it can see but never fish R2 species. Rationale: the gate stays honest for 05's curve.
7. **PROPOSED — Band hygiene**: no colliding geometry in y 450..700; Swell Buoys are non-colliding. Prevents a
   boat being pinned on rock by the push.
8. **PROPOSED — Sightlines**: from the mouth, D1 lighthouse (left, 457 m), D2 wreck mast (ahead-right, 390 m)
   and R2 sea stacks + Thunder Arch silhouette on the north horizon (≈1000 m, through haze) are all visible.
   From the stall line, the Arch is ≈ 450 m away: the "not yet" moment always shows the reward.
9. **PROPOSED — Encounter lane** `E_WhalePod` (content for 06's paper `EncounterPing`): y = 350, x −700 → 700 at
   2 m/s (≈ 11.7 min pass), inside R1 so every player can reach it (P4, no gate on shared moments).

**Swell telegraphing — cozy, no damage (CONFIRMED owner D1 "never damages")**

| Distance to band | Channel | Signal |
|---|---|---|
| Harbour | Dialogue | Shipwright (Shipyard) idle line: "Those northern swells bounce a little Skiff like a cork. A Cutter with a keel, now..." |
| Anywhere in R1 | Sky/palette | North horizon slate-teal, low cloud; R2 sea stacks painted in haze |
| ≤ 300 m | Audio | Low surf roar fades in (0 → −12 dB at y = 500) |
| y = 500 | Landmark | Swell Buoys (inked red/cream cel), bob grows with `w`; bells clank softly |
| In band | Water VFX | Inked whitecap crests, larger painted swell bands; boat heave/roll rises (02 F7) |
| Stall | Crew + HUD | One bark + one toast per sail-out (02 rule 8) |

**Discoveries** (**CONFIRMED (brief §3)** some require region/weather/equipment). Entering the trigger radius
adds a "seen" journal entry + 4 s toast + inked ping ripple; reward is the entry itself (**PROPOSED**, P3; any
Shells reward is 05's call, named `DiscoveryReward`). **CONFIRMED (owner D9)**: some discoveries also unlock a cosmetic
(doc 11 §Cosmetics: Marigold wreck → "Wreck-wood" hull paint; whale pod seen → "Whale-song sail"; all R1 places seen →
"Shallows pennant"), shown as a stamp on the journal entry + one log line. Never a stat.

| Id | Name | Pos (x,y) | Radius | Requirement | Hook |
|---|---|---|---|---|---|
| `Disc_GullLighthouse` | Gull Point Lighthouse | (−450, 80) | 60 m | none | Landmark from harbour; beam at dusk, visible from R2 to steer home |
| `Disc_MarigoldWreck` | Wreck of the *Marigold* | (250, 300) | 40 m | none | Mast + dark hull shape under painted water |
| `Disc_TurtleRock` | Turtle Rock | (620, 180) | 50 m | none | Off-route east; rewards wandering, not routing |
| `Disc_ThunderArch` | Thunder Arch | (−300, 1000) | 60 m | `Keel` (location) | Blowhole spouts on each swell crest (7 s) |
| `Disc_BellBuoy` | Lantern Bell Buoy | (350, 1180) | 40 m | `Keel` + Drizzle | Lantern lit and bell rings only in drizzle |

**Weather (one type)** — **PROPOSED** `Drizzle`, R2 only, deterministic cycle from session clock: Clear 6 min →
30 s fade → Drizzle 4 min → 30 s fade. Visual + audio only; no effect on push, catch or visibility of the boat
(no hazard, brief §12). Seen from R1 as a grey rain curtain over the north (telegraph + teaser).

**Region flavour (one paragraph each)** — *Harbour*: a pastel fishing town tucked behind a stone breakwater,
where gulls argue on bollards. *R1 Shallows*: turquoise water over sand, a retired lighthouse, the old *Marigold*
that sank in a calm. *R2 Rolling Swells*: the open northern sea, long grey rollers, sea stacks and an arch that
thunders when the waves pass through it.

### States and Transitions

Per boat position: `Harbour` → (cross mouth) `R1_Shallows` → (y ≥ 500) `TransitionBand` → (y ≥ 650) `R2_Swells`.
`RegionId` reported = Harbour / R1 for y < 575 / R2 for y ≥ 575 (label only); `ZoneId` per rule 6.
Weather: `Clear ↔ Drizzle` (R2 render/audio only). Discovery: `Unseen → Seen` (one-way, saved in `PlayerProgress`).

### Interactions with Other Systems

- **02**: provides `SwellStrength(p)`, `SwellDir`, world-edge bands, berth transforms.
- **04 (A1)**: provides `ZoneId`, `RegionTier`; species table per `ZoneId`; no fishing in `Harbour`.
- **05**: `GateRequirement = Keel`; `KeelPrice`, optional `DiscoveryReward`.
- **11**: `HasKeel` (Keel fitted on the `Cutter`) is the gate flag; discovery `Seen` events unlock cosmetics.
- **10**: harbour places (Fishmonger, Inn crew board, Shipyard) are counter triggers at the quay positions in rule 2.
- **06 (paper)**: room bounds = full map; spawn = berths B1–B8 by join order; `E_WhalePod` lane.
- **07**: journal `Seen` flags; on load inside land/blocked geometry, snap to nearest free berth.
- **08/09**: palette + audio bed per `RegionId`, crossfaded by `w`; drizzle layer.

## Formulas

**F1 Band blend** — `w(y) = s(clamp((y − 500)/150, 0, 1))`, `s(t) = 3t² − 2t³`. Example y = 575 → t = 0.5 → w = 0.5.
**F2 Travel time** — `T = d_ramp/v̄_ramp + (d − d_ramp)/v`, ramps from 02 F2. Harbour leg capped at 3.09 m/s.

| Leg (base boat, 12 kn) | Distance | Time | Notes |
|---|---|---|---|
| Berth → mouth | 100 m | **34 s** | 3 s ramp (4.6 m) + 95.4/3.09 |
| Mouth → `Z_R1` edge | 60 m | 10.5 s | ramp 3.09→6.17 (13.9 m, 3 s) + 46.1/6.17 |
| **Berth → R1 fishing** | 160 m | **≈ 45 s** | |
| Mouth → band start (y 500) | 500 m | 82 s | 3 s + 486.1/6.17 |
| **Berth → R2 edge (y 500)** | 600 m | **≈ 116 s** | target 60–120 s ✓ |
| Band crossing with Keel | 150 m | 27 s | 02 F6 |
| **Berth → R2 proper (y 650), Keel** | 750 m | **≈ 143 s** | |
| Berth → Thunder Arch, Keel | ≈ 1144 m | ≈ 219 s (3.7 min) | R2 leg at net 5.0 m/s |
| R2 edge (y 650) → berth | 750 m | ≈ 137 s | swell assists south |
| Mouth → Lighthouse | 457 m | 75 s | |
| R1 east–west crossing | 1400 m | 227 s | |

**F3 H1 sanity** — first sale ≈ 45 s out + hold fill (04, target 4–6 min) + 45 s back + mooring 3 s
≈ **5.5–7.5 min ≤ 8 min** ✓. **ASSUMPTION – validate by H1 time-to-first-sale median.**

## Edge Cases

- **Un-Keeled player tries the band at every x**: band is full-width and meets edge bands; stall at y ≈ 607 everywhere.
- **Un-Keeled boat anchors at the stall line**: fishes `Z_R1` table (y < 650). Allowed; it is a nice view spot.
- **Player waits for drizzle at the Bell Buoy**: max wait 6.5 min; inside radius during Clear, toast once:
  "The old bell only lights its lantern in the rain." Trigger re-checks every 0.5 s; drizzle counts at intensity ≥ 0.5.
- **Discovery inside radius when switching to Compact** (boat holds position, 02): still triggers; toast queued for Full.
- **Load position inside land / quay**: snap to nearest free berth, state `Docked`.
- **Whale lane crosses a player's boat**: whales are non-colliding, pass under/around (06 owns ping rules).
- **Two discoveries in one frame**: none overlap (min separation 300 m); toasts queue anyway.

## Dependencies

02 Sailing (bidirectional: 02 reads the field, 03 reads stall depth), 04 Crew (`ZoneId`), 05 Economy (`Keel`,
`DiscoveryReward`), 06 Hangout (paper lane/bounds), 07 Persistence (journal, position), 08 Audio, 09 Art, 10 HUD,
11 Ship Fitting (`HasKeel` gate flag; discovery-earned cosmetics).

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| Map playable size | 1400 × 1300 m | 1000–2000 per axis | All travel times, emptiness |
| R1 depth (band start y) | 500 m | 350–700 | Berth→R2 edge time (keep 60–120 s) |
| `TransitionBand` width | 150 m | 100–300 | Swell ramp softness; stall depth |
| Discovery radius | 40–60 m | 25–100 | Ease of "finding" |
| Drizzle cycle | 6 / 4 min | Clear 3–10, Drizzle 2–6 | Wait for D5 |
| Whale lane speed | 2 m/s | 1–4 | Time window to reach the encounter |

## Visual/Audio Requirements

- `StaysLayer` (painted): sea surface, coast, sea stacks, arch, lighthouse building, harbour town, sky, rain curtain.
- `ActsLayer` (inked): Swell Buoys, Bell Buoy (it rings/lights), boats, vendors, Inn crew board, Shipyard slipway cradle, whales, blowhole spout + whitecaps
  + rain streaks as hard-edged VFX on twos (00 §1). Palettes per region owned by 09; R1 warm turquoise/sand,
  R2 slate-teal/cool grey, lerped by `w`.
- Audio beds (08): Harbour gulls/rigging; R1 lapping waves; band + R2 surf roar and wind; drizzle patter layer.

## Game Feel

Arrival in R2 should feel like a reward: the moment `w` reaches 1, a 4 s musical swell sting plays once per
session. The band must never feel like a wall: push ramps over 150 m and heave rises *before* speed drops.

## UI Requirements

Region name label on crossing y = 575 (fade 3 s); discovery toast + journal "seen" list; stall toast (02).
Owned by 10.

## Cross-References

00 §3, §5 A2, §9 D1/D3/D9 · 02 (F4–F6) · 04 · 05 · 06 · 07 · 08 · 09 · 10 · 11.
Effort (solo UE5): whitebox coast/islands 3 d, region/zone function + `w` blend MPC 2 d, discoveries + journal
trigger 1.5 d, drizzle cycle 1.5 d, buoys + lighthouse beam 1 d ⇒ **~9 dev-days** (art dressing in 09).

## Acceptance Criteria

1. Berth → y = 500 at default settings takes 116 s ± 5 (automated autopilot test) — H1.
2. No level load or hitch > 33 ms when crossing y 500–650 (profiling capture) — H1/H2.
3. Without `Keel`, no boat ever receives an R2 species (`Z_R2` never entered across a 20-x sweep) — H1 gate.
4. ≥ 6/8 playtesters point to the north/R2 when asked "where do you want to go next?" before unlocking it — P3.
5. ≥ 5/8 playtesters find ≥ 3 of 5 discoveries in a 45-min session; ≥ 2/8 find `Disc_BellBuoy` — P3.
6. No region, weather or discovery state alters a health/damage value (none exists) — brief §12.

## Open Questions

1. **`RegionId` name**: §6 fixes `R2_Swells`, but owner D1 made R2 a swell region. This doc keeps the id and uses
   display name "The Rolling Swells"; reviewer to decide whether to rename to e.g. `R2_Swells`.
2. ~~`Keel` shared name~~ — CLOSED (D9): `Keel` is an `ItemId` in 00 §6 (doc 11).
3. Should `E_WhalePod` fire solo (local timer) given D3 makes multiplayer paper-only? A1/A4 to decide.
4. `DiscoveryReward` in Shells (05) or journal-only? Recommend journal-only (P3: curiosity, not optimisation).

## Interface values

| Name | Value | Owner doc |
|---|---|---|
| Map size / playable | 1600 × 1600 m / 1400 × 1300 m | 03 |
| `Harbour` basin, mouth | 240 × 160 m, 40 m at (0,0) | 03 |
| Berths | 8 (B1–B8), 20 m spacing, y = −130 | 03 |
| `R1_Shallows` | y 0–500, 0.70 km², Tier 1 | 03 |
| `TransitionBand` | y 500–650, 150 m | 03 |
| `R2_Swells` | y 650–1300, 0.91 km², Tier 2 | 03 |
| `ZoneId` | `Z_R1` (y 0–650 minus 60 m mouth), `Z_R2` (y 650–1300) | 03 |
| `GateRequirement(R2)` | `Keel` (`ItemId`, fitted on the `Cutter`; `HasKeel`) | 03 (id), 05 (`KeelPrice`), 11 (fit) |
| Harbour places | Fishmonger (−90, −150) · Inn crew board (0, −155) · Shipyard slipway (90, −150) | 03 (screens 10) |
| Berth → R1 / R2 edge / R2 proper | 45 s / 116 s / 143 s | 03 |
| `PushMax`, `KeelResist`, stall y | 7.71 m/s, 0.85, ≈ 607 m | 02 |
| Discoveries | 5 (3 R1, 2 R2) | 03 |
| Weather | `Drizzle`, R2, 6 min clear / 4 min | 03 |
| Hold-fill time | 4–6 min (target) | 04 |
