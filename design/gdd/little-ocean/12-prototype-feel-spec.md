# Little Ocean — 12 Prototype Feel Spec · UE5 implementation guide

> **Status**: Approved by owner through 6 playtest rounds of the web prototype (2026-11-26 → 11-28)
> **Last Updated**: 2026-11-28 · **Owner decision D10**: for *how the game moves, looks and responds* — handling,
> anchor, camera, VFX, the crew's fishing, selling, discovery, HUD behaviour — **this doc wins over 02, 03, 04, 05, 09
> and 10** wherever they differ.
> **Ground truth**: the web build at https://claude.ai/artifact/KpWAUED3P3LZ1qHoHigZ4x and its source
> `prototypes/little-ocean/` (`game.js` = all behaviour, `config.js` = all tuning, `scene/crew.js` = poses).
> Every formula below was transcribed from that code, and every sign was checked numerically. If this doc and the
> code ever disagree, the code wins: report the mismatch.

---

## 0. Read this first: why the UE5 build felt "off"

The prototype's feel comes from **dozens of small, exact rules layered every frame**. Leave out a few and it feels
generic. These are the ones a UE5 port most often gets wrong:

| # | Rule | Typical wrong port |
|---|---|---|
| 1 | Speed moves toward the notch target at a **constant rate** (1.6 m/s² up, 2.2 down): a linear ramp | `FInterpTo` / exponential ease, which feels mushy and never quite arrives |
| 2 | The boat is **kinematic**; the visual hull adds heave, wave pitch and roll, throttle pitch, lean and a **spring** on top | Chaos physics / buoyancy, or the pawn root itself rotating |
| 3 | **Braking and anchoring dip the bow; accelerating lifts it.** The anchor bite adds a spring kick downward | No pitch from acceleration, or the sign inverted |
| 4 | The anchor is a 4-stage state machine with exact timings (§5) and **only a fresh W/S press raises it** | An instant stop, or holding W re-raising it |
| 5 | The camera is a **custom rig**: separate exponential smoothing on yaw (with lead into turns), target, distance and FOV; shake is **roll-led** and squared | SpringArm with lag, which is the wrong curve and has no turn lead |
| 6 | All damping is **frame-rate independent**: `x += (target − x)·(1 − e^(−k·dt))` | `Lerp(x, t, 0.1)` per tick, which changes with frame rate |
| 7 | The crew animate in **held poses at 12 drawings per second with no blending** (stepped, "on twos") | Blended animation, which reads as a different art style |
| 8 | VFX are **depth-tested world particles** with exact spawn points on the hull (§7) | Screen-space overlays, pre-baked foam rings, engine-default splashes |
| 9 | Fishing has **timers, a fight with surges, escapes and a rare moment** with fish-only slow motion (§9) | A catch on a fixed timer; global time dilation |
| 10 | The speed readout is a **decal on the water**, not a widget (§8) | A UMG speedometer |

**Process requirement:** implement each section, then run its **reference checks** (the "Expect" lines and §17), and
compare side by side with the web build before moving on.

---

## 1. Conventions (applies to every formula in this doc)

### 1.1 Axes and units

The formulas are written **in UE axes** but in **metres, seconds and radians**. Convert at the engine boundary:
× 100 for cm, and `FMath::RadiansToDegrees` for rotators.

| Symbol | Meaning |
|---|---|
| X | north, out to sea |
| Y | east |
| Z | up; the sea's rest level is Z = 0 |
| ψ (heading) | 0 = north; increases clockwise seen from above (north → east), the same as UE yaw |
| F | the boat's forward vector = (cos ψ, sin ψ, 0) |
| R | the boat's **starboard** (right) vector = (−sin ψ, cos ψ, 0) |
| Boat-local (f, s, u) | f = forward from the hull centre, s = toward starboard, u = up from Z = 0 at the boat origin. World position = P + F·f + R·s + Z·u, rotated by the visual hull pose wherever the code says "on the hull" |
| Mapping from the web code | UE.X = web.x, UE.Y = web.z, UE.Z = web.y. Web local (lx, ly, lz) → (f = −lz, s = lx, u = ly). Web yaw → ψ = −yaw − π/2; web yawVel → ψ̇ = −yawVel |

### 1.2 Pose sign conventions (visual)

Use your own rotator mapping, but **verify these with a debug key before moving on**:

- **θ (pitch) > 0 = bow up.**
- **φ (roll) > 0 = starboard side down.**

### 1.3 Helpers (implement exactly)

```cpp
// Frame-rate-independent exponential approach. k is in 1/s. Used everywhere the doc says "follow ... k".
float Follow(float x, float target, float k, float dt) { return x + (target - x) * (1.f - FMath::Exp(-k * dt)); }
float AngDiff(float a, float b) { return FMath::Atan2(FMath::Sin(a - b), FMath::Cos(a - b)); } // shortest a-b
float Smooth(float a, float b, float x) { float t = FMath::Clamp((x - a) / (b - a), 0.f, 1.f); return t * t * (3 - 2 * t); }
float EaseOutCubic(float t) { return 1 - FMath::Pow(1 - t, 3); }
float EaseInOutCubic(float t) { return t < .5f ? 4 * t * t * t : 1 - FMath::Pow(-2 * t + 2, 3) / 2; }
```

- **dt is clamped to ≤ 0.066 s.**
- The prototype has a few per-frame multipliers, here converted to per-second rates:
  - `0.985/frame` → `e^(−0.91·dt)`
  - `0.99/frame` → `e^(−0.60·dt)`
  - `0.97/frame` → `e^(−1.83·dt)`
  - `0.9/frame` → `e^(−6.3·dt)`
- **Randomness**: U = uniform [0, 1) from a seeded stream (seed 20261126). Never use unseeded random.

### 1.4 Tick order (one game tick)

1. Clock and weather
2. Harbour (dock zone, berth lerp)
3. **Boat**: input → throttle → speed → steering → move → collide → pose → emitters
4. Fishing (crew timers, fights, flying fish)
5. Exploration
6. **Camera** (after the boat; in `APlayerCameraManager::UpdateCamera` or a post-physics tick)
7. Anchor visual
8. Crew poses and props
9. Particles
10. Gauge decal
11. World-anchored widgets (bubbles, labels, glints)

---

## 2. Tuning table (`config.js`)

Every value below must live in a data asset (`ULOFeelConfig` / DataTable). Never hard-code.

| Key | Value | Key | Value | Key | Value |
|---|---|---|---|---|---|
| maxSpeed | 9.0 m/s | reverseSpeed | 2.0 | accel | 1.6 m/s² |
| decel | 2.2 m/s² | anchorBrake | 3.0 m/s² | turnRate | 0.62 rad/s |
| turnAtRest | 0.22 | rudderEase | 5.5 /s | yawInertia | 3.2 /s |
| leanK | 0.055 | leanMax | 0.20 rad | noseUpK | 0.05 |
| surfK | 1.8 | notchRepeat | 0.28 s | swellShallows | 0.45 m |
| swellSwells | 1.35 m | regionSwellsX | 360 m | bandWidth | 70 m |
| camDist | 26 m | camHeight | 0.26 rad | camYawFollow | 2.4 /s |
| camLeadTurn | 0.38 s | camLeadAhead | 0.45 s | camSpeedPull | 0.55 s |
| fovBase | 36° (vertical) | fovSpeed | 6° | traumaDecay | 1.6 (applied ×0.5 → 0.8 /s) |
| traumaMax | 0.35 | idleWiden | 20 s | catchMin / catchMax | 16 / 30 s |
| biteLead | 0.9 s | fightBase | 1.8 s | fightPerTier | 1.1 s |
| escapeBase | 0.06 | escapePerTier | 0.11 | findChance | 0.03 |
| slowmo | 0.18 | valueScale | 3 | slowBonus | 1.35 |
| cargoCapacity | 20 | spotRadius | 34 m | discoverRadius | 42 m |
| glintRadius | 150 m | letterbox | 1.4 s | dayMinutes | 30 |
| startHour | 15.5 | drizzleClear / Wet | 180 / 90 s | coinFlight | 0.7 s |
| coinsPerSale | 28 | countUp | 1.1 s | volume | 0.7 |

> **FOV note:** the 36° is **vertical**. UE's `FieldOfView` is horizontal. Convert with
> `hFOV = 2·atan(tan(vFOV/2)·aspect)`, which gives ≈ 60.6° at 16:9 for 36°.

---

## 3. World and the swell (§ shared by water, boat, gauge, particles, buoys)

**Scale for the first slice: use the prototype's compressed world** (Open Q1).

| Thing | Value (UE axes, m) |
|---|---|
| Sea | X −44…690, Y −330…330; soft push-back (§4.6) |
| Coast / quay | land for X < −44.5; pier X −45…−25, Y −27.6…−24.4 |
| Harbour centre | `HARBOUR` = (−40, −20) |
| Regions | Swells when X > 360; band 70 m centred there |
| Spots (radius 34) | (92, 28), (205, −150), (190, 140) → Shallows; (470, −40), (575, 215) → Swells |
| Places (discover 42, glint 150) | Gull Point (−4, 150) · Wreck of the Marigold (150, −78) · Turtle Rock (272, 205) · Thunder Arch (520, −190) · Lantern Bell Buoy (600, 95) |
| Buildings (X, Y; w × d × h) | Fishmonger (−55, −44; 6 × 7 × 4.6) · Inn (−56, −33; 5.5 × 6.5 × 5.6) · Shipyard (−57, −10; 5 × 6 × 5.0) |
| Dock zone | centre (−28, −30), r 30 |
| Berth | (−36, −38), ψ = 0 (bow north) |
| Harbour camera | at (−4, −20, 31) looking at (−50, −28, 3), vFOV 40° |

```cpp
// Identical in C++ (gameplay) and in the water Material Function (WPO). t = game time (s).
struct FWave { FVector2D d; float L, a, phase; };
const FWave W[3] = { {{0.16f,0.987f},62,0.58f,0}, {{-0.42f,0.907f},34,0.30f,1.7f}, {{0.62f,0.785f},19,0.12f,4.1f} };
float Calm(FVector2D p) { return 0.18f + 0.82f * Smooth(40, 130, FVector2D::Distance(p, {-40,-20})); }
float SwellH(FVector2D p, float t, float A) {
  float h = 0, att = Calm(p);
  for (auto& w : W) { float k = 2*PI / w.L, om = FMath::Sqrt(9.81f * k) * 0.8f;
    h += w.a * att * FMath::Sin(k * FVector2D::DotProduct(w.d, p) - om * t + w.phase); }
  return h * A;
}
```

- **A is one global value, driven by the boat's X**, not by position on the sea:
  `A = Lerp(0.45, 1.35, Smooth(360 − 35, 360 + 35, Boat.X))`.
  - Push it every tick to a Material Parameter Collection (`SwellA`, plus `Time`).
  - The whole sea grows as you cross into the Swells. This is intended (one shared value, so a boat and its surroundings
    always agree).
- **Water colour**: body Lerp(#4FB3BF → #4A92B8) and trough Lerp(#449BAE → #3A76A2), both by the same Smooth factor.
- **Do not** use the Water plugin's waves or buoyancy for gameplay. Everything samples `SwellH`.
- **Expect**: in the harbour basin the sea is nearly flat (×0.18). The Swells read about 3× taller and visibly cooler.

---

## 4. Boat handling (`ALOBoatPawn`, kinematic)

**Hull**: 8 m long (bow f = +4, stern f = −4), half-beam 1.35 m.
- Deck height `Deck(f) = 0.76 + 0.42·((f+4)/8)²`, i.e. 0.76 at the stern and 1.18 at the bow.
- The pawn root holds (X, Y, ψ). **A child "Visual" component** carries the heave, pitch and roll (§4.5). The camera
  and gameplay never read the visual tilt.

### 4.1 State

`X, Y, ψ, speed v, notch ∈ {−1,0,1,2,3,4}, rudder, ψ̇, anchored, pitchK, rollK, spring {x, vel}, prevSpeed, heave, notchHold, notchT, lastCreak, lastSlap, bumpCD, trauma`.

### 4.2 Throttle notches (W/S or stick; telegraph)

```cpp
void Notch(int d, bool held) {
  if (bInHarbour) return;
  if (bAnchored) { if (!held && Anchor.State == Down) ToggleAnchor(); return; } // only a FRESH press raises it
  if (Anchor.State == Raise) return;                                            // input eaten while it raises
  notchT = t;                                                                   // shows the gauge for 3 s
  int n = Clamp(notch + d, -1, 4); if (n == notch) return;
  notch = n; PlayClick(n + 1);       // wooden click, pitch rises with the notch
  if (n > 0 && d > 0) pitchK += 0.04f;                                          // little nose-lift kick
}
// Key down (not auto-repeat): Notch(±1,false); notchHold = 0.
// Each tick while held (not in a screen, cine or harbour): notchHold += dt; if (notchHold > 0.28*1.6) { notchHold -= 0.28; Notch(±1, true); }
```

- Hold schedule: notch at 0 s, then 0.45, 0.73, 1.02, 1.30 … s.
- Leaving the harbour sets notch = 1 (¼).

### 4.3 Speed, surf, steering, movement (every tick, in this order)

```cpp
float steer = (D ? 1 : 0) - (A ? 1 : 0);                 // + = starboard; zero in screens/harbour
rudder = Follow(rudder, steer, 5.5, dt);
if (|rudder| > 0.85 && |v| > 3 && t - lastCreak > 2.5) { lastCreak = t; PlayCreak(); }

float target = bAnchored ? 0 : (notch >= 0 ? notch / 4.f * 9.0 : -2.0);
float a = target > v ? 1.6 : (bAnchored ? 3.0 * (Anchor.bBit ? 2.2 : 1) : 2.2);
v += Clamp(target - v, -a*dt, a*dt);                     // LINEAR approach: constant acceleration
if (bAnchored && Anchor.bBit) v *= Exp(-3*dt);

float hBow = SwellH(P + F*3.4), hStern = SwellH(P - F*3.4), slope = (hBow - hStern) / 6.8;
if (!bAnchored) v += -slope * 1.8 * dt * 9.8 * 0.12;     // surf: faster down a face, slower climbing
if (bAnchored) psiDot *= Exp(-2*dt);

float sf = Clamp(0.2 + |v|/4, 0, 1);
float turn = 0.62 * Lerp(0.22, 1, sf) * Sign(v == 0 ? 1 : v);  // reversing flips steering
psiDot = Follow(psiDot, rudder * turn, 3.2, dt);
psi += psiDot * dt;
FVector2D next = P + F * v * dt;  next = Collide(next);  P = next;
```

- While anchored the boat can still **pivot slowly** on the anchor (≈ 0.23 rad/s at rest, damped).
- **Expect**:
  - 0 → 9 m/s at Full takes **5.6 s**.
  - Full rudder at 9 m/s reaches 90% of its yaw rate in **0.97 s**. The turning circle radius is about **14.5 m**, and a
    full circle takes ≈ 10 s.
  - At rest the pivot is 0.233 rad/s.

### 4.4 Wave slam (Swells only, in practice)

`heaveVel = (heave − prevHeave)/dt`.
- If `heaveVel < −0.9·A`, `t − lastSlap > 1.2`, `|v| > 2` and `A > 0.8`:
  - slap sound;
  - `trauma = min(0.35, trauma + 0.12 + 0.12·(A − 0.8))`;
  - bow splash of 14 drops at f = +3.8 on the water.

### 4.5 Visual hull pose (every tick; **the order and signs matter**)

```cpp
float accelNow = (v - prevSpeed) / max(dt, 1e-3); prevSpeed = v;
pitchK = Follow(pitchK, Clamp(accelNow * 0.05, -0.07, +0.06), 4, dt);   // speeding up = bow UP, braking = bow DOWN
rollK  = Follow(rollK,  Clamp(-psiDot * v * 0.055, -0.2, 0.2), 3, dt);   // phi>0 = starboard down
float h0 = SwellH(P), hStb = SwellH(P + R*1.2), hPort = SwellH(P - R*1.2);
float wavePitch = Atan((hBow - hStern) / 6.8) * 0.85;                   // theta>0 = bow up
float waveRoll  = Atan((hStb - hPort) / 2.4) * 0.7;                     // phi>0 = starboard down (see note)
prevHeave = heave; heave = 0.9 * h0;
spring.vel += (-90 * spring.x - 7 * spring.vel) * dt;  spring.x += spring.vel * dt;  // semi-implicit Euler, in order
Visual.Location = (P.X, P.Y, heave);
Visual.Pitch(theta) = wavePitch + pitchK + spring.x;
Visual.Roll(phi)    = waveRoll + rollK;
Visual.Yaw          = psi;                     // apply yaw, then pitch, then roll (web Euler order YXZ)
```

- The **spring** is the impact system: about 1.5 Hz with damping ratio 0.37. A *negative* `spring.vel` impulse dips the
  bow and lets it rebound once or twice.
- **Lean direction (as built):** the boat rolls **toward the outside** of the turn: starboard dips in a left turn.
  - The juice bible says "lean into turns", but this is what the owner approved by feel. **Copy it as built** and see
    Open Q2.
- **Wave roll (as built):** the hull rolls *against* the local cross-slope (×0.7). It reads as a lively rock. **Copy it
  as built.**
- The blob shadow under the hull sits at `h0 + 0.05`. It is a 4.2 × 10.5 m soft ellipse at 45% opacity.
- **Expect** (§17 has the full trace):
  - A throttle-up from rest peaks at **+0.060 rad (3.4°) bow-up**, then settles.
  - At full rudder, roll reaches **0.2 rad (11.5°)**.

### 4.6 Collisions (`Collide(next)`)

- Probe three points along the keel: f = +3.4, 0, −3.4.
- For each probe:
  - **Coast**: if X < −44.5, push X out (hard).
  - **Pier box**: X −45…−25, Y −27.6…−24.4; push in Y to the nearer side.
  - **Round colliders**: radius r + 1.6.
    - Gull Point islet, wreck, Turtle Rock, arch legs: each `(centre, r)` comes from its mesh footprint.
    - Bell buoy: (600, 95), r 2.5.
  - **Bounds**: past X 690 or |Y| 330, push back 0.2 × overshoot per tick. This counts as a "hit" only beyond 6 m.
- On any hit with `t > bumpCD`:
  - `bumpCD = t + 0.8`;
  - if |v| > 1.2: bump sound, trauma +0.12, splash 12 at f = +3.6;
  - then `v *= 0.35`, and if `notch > 1` → `notch = 1`.
- No damage, ever.

---

## 5. Anchor (Space / pad Y) — exact state machine

**Model**: an inked iron anchor at ×1.6 scale.
- **Stowed point** `STOW` = hull (f 4.12, s +0.5, u Deck(3.75) − 0.75 ≈ 0.40): it **hangs outside the hull just
  starboard of the stem**, below the rail.
- Hawse (chain exit) = (f 3.95, s +0.42, u Deck(3.75) + 0.10).
- Points are "on the hull", so they include the visual pose.

| State | Enter | Per tick | Exit |
|---|---|---|---|
| **Stowed** | start / raise done | at STOW, hull rotation + yaw 0.25, pitch `−0.12 + 0.05·sin(2.1t) + 2·spring.x` (sways, and kicks when the boat dips); chain hidden | Space, when not anchored and not in harbour |
| **Drop** | `anchored = true; notch = 0; t = 0; bBit = false`; creak + short rope hiss; log "Anchor down." | `k = min(1, t/0.32)`. Before the splash: XY = current STOW, Z = Lerp(STOW.u, water − 0.2, **k²**), extra yaw 0.6k. At k = 1: **splash** (22 drops, power 1.1, splash sound) and remember that world point. After: fixed at the splash point, Z = water − 0.3 − 3·(t − 0.32) (sinks at 3 m/s) | t > 0.55 → **bite** |
| **Bite** (instant) | `f = min(1, |v|/9)`; `spring.vel −= 0.15 + 0.5f`; `trauma = min(0.35, trauma + 0.08 + 0.18f)`; if f > 0.25: creak + bow splash 14 at f = +4.1; `bBit = true`; state = Down | — | — |
| **Down** | — | at the remembered world point, Z = SwellH − 1.5 − min(2, 3t); the chain is a 10-point line from the hawse to anchor + 0.6 m, sag `sin(πu)·0.15`. Braking: §4.3 (6.6 m/s² + `e^(−3dt)`) | a **fresh** W or S press (or Space): `anchored = false`, from = current anchor position, state = Raise, rising rope sound, log "Anchor up." |
| **Raise** | (above) | `k = min(1, t/0.28)`, `e = k³`; XY = Lerp(from, STOW, min(1, 2k)) (it reaches the bow early), Z = Lerp(from.Z, STOW.Z, e) (whips up at the end); chain visible while k < 1; **throttle input ignored** | k ≥ 1 → **slam**: `spring.vel −= 0.55`, trauma +0.12, thunk + low pluck, splash 10 (power 0.6) 0.4 m under STOW; state = Stowed |

While anchored:
- no surf;
- yaw damped `e^(−2dt)`;
- catch speed ×1.35;
- gauge hidden.

Entering the harbour silently stows the anchor.

**Expect — Space at 9 m/s** (60 fps simulation of the code; reproduce this trace):

| t (s) | 0.30 | 0.55 (bite) | 0.70 | 0.90 | 1.05 | 1.20 | 1.60 | 2.0 |
|---|---|---|---|---|---|---|---|---|
| v (m/s) | 8.10 | 7.35 | 3.91 | 1.18 | < 0.05 | 0 | 0 | 0 |
| pitch θ (rad, wave-free) | −0.049 | −0.062 | **−0.098 (min ≈ −5.6°)** | −0.068 | | −0.036 | −0.008 | ≈ 0 |

- Stopping distance ≈ 5.8 m.
- **The bow never rises during an anchor stop.**
- Raise slam: the bow dips **−0.033 rad (−1.9°)** and rebounds.

---

## 6. Camera (`ALOPlayerCameraManager`, custom — no SpringArm lag)

**State**: `camPsi, tgt (X, Y, Z), dist, fov`, plus orbit offsets `oPsi, oPitch`, `idleK` and `trauma`.

**Initial state**:
- camPsi = ψ;
- tgt = boat;
- dist = 26;
- vFOV = 36.

```cpp
float k = |v| / 9;
bool idle = t - lastInput > 20 && !screen;  idleK = Follow(idleK, idle, 0.25, dt);
if (idle && t - lastHum > 45) { lastHum = t; CrewHum(); }
if (!dragging && t - lastInput > 1.6) { oPsi = Follow(oPsi, 0, 1.2, dt); oPitch = Follow(oPitch, 0, 1.2, dt); }
// mouse drag: oPsi += dx*0.005 rad/px; oPitch = Clamp(oPitch + dy*0.003, -0.15, 0.55). Wheel: zoom = {0.68, 1, 1.55}.

float wantPsi = psi + psiDot * 0.38 + oPsi - 0.6 * idleK * Sin(0.05 * t);       // leads INTO turns
FVector T = { X + F.X * 0.45 * v, Y + F.Y * 0.45 * v, 4.4 };                    // look-ahead point, 4.4 m above sea
float wantDist = (26 + 0.55 * |v|) * zoom * (1 + 0.45 * idleK);
float pitch = 0.26 + oPitch + 0.06 * idleK;                                     // NOT smoothed
// … special shots modify wantPsi / T / wantDist / pitch here (table below) …
camPsi += AngDiff(wantPsi, camPsi) * (1 - Exp(-2.4 * dt));
tgt.X = Follow(tgt.X, T.X, 3.5, dt);  tgt.Y = Follow(tgt.Y, T.Y, 3.5, dt);
tgt.Z = Follow(tgt.Z, T.Z + heave * 0.35, 3, dt);
dist  = Follow(dist, wantDist, 2.2, dt);
fov   = Follow(fov, 36 + 6 * k, 2, dt);                                         // vertical degrees
FVector Fc = { Cos(camPsi), Sin(camPsi), 0 };
Cam.Location = tgt - Fc * Cos(pitch) * dist + Z * Sin(pitch) * dist;
Cam.Rotation = LookAt(tgt);
// shake, applied as LOCAL rotations after LookAt (roll-led, squared):
trauma = max(0, trauma - 0.8 * dt);  float sh = trauma * trauma;
Cam.Roll += sh * 0.042 * Sin(23.1t);  Cam.Pitch += sh * 0.02 * Sin(17.3t + 1);  Cam.Yaw += sh * 0.02 * Sin(19.7t + 2);
Cam.Location.Z += 0.08 * Sin(0.6 * t);                                          // slow breathing bob (≈10 s period), NOT re-aimed
// harbour blend (hb = Follow(hb, inHarbour, 2.4, dt); w = EaseInOutCubic(hb)):
Cam.Location = Lerp(Cam.Location, HarbourCamPos, w); Cam.Rotation = Slerp(Cam.Rotation, HarbourCamRot, w); fov = Lerp(fov, 40, w);
```

**Trauma sources** (the only ones):

| Source | Trauma |
|---|---|
| Wave slam | +0.12…0.24 |
| Anchor bite | +0.08…0.26 |
| Anchor slam | +0.12 |
| Collision | +0.12 |
| Rare-leap apex | +0.08 |

Cap 0.35. **Never** shake for UI.

**Special shots**: these modify the *wanted* values before smoothing, so the smoothing carries the blend.

| Shot | Weight w | Modifications |
|---|---|---|
| **Discovery** (1.4 s; steering stays live) | `sin(π·min(1, u))^0.7`, u = t/1.4 | `ψto = atan2(place.Y − Y, place.X − X)`; wantPsi += AngDiff(ψto, wantPsi)·w; T.XY = Lerp(T.XY, (boat + place)/2, 0.55w); T.Z = Lerp(4.4, 0.45·placeTop, w); wantDist ×(1 − 0.18w); pitch −0.06w |
| **Rare bite** (until the cine ends) | `min(1, t/0.8)` | focus = the crew member's water point, and then **the flying fish**; ψto = atan2(focus − boat) **− 0.5**; wantPsi += AngDiff(ψto, wantPsi)·0.7w; T.XY = Lerp(T.XY, focus, 0.8w); T.Z = Lerp(4.4, focus.Z + 1, w); wantDist ×(1 − 0.55w); pitch −0.08w |
| **Harbour** | `EaseInOutCubic(hb)`, hb follow k 2.4 | final pose blend, above |

**Expect**:
- At 9 m/s: distance 30.95 m, vFOV 42°.
- The boat sits in the lower third.
- In a turn the camera swings *ahead* of the bow, toward the turn.

---

## 7. Boat VFX (Niagara; all depth-tested, unlit, no bloom; all positions "on the hull")

Speed fraction **k = |v|/9**. A pool or ribbon is fine, but these behaviours must match.

| Emitter | When | Spawn (boat-local f, s, u) | Rate | Initial velocity (m/s) | Size (radius, m) | Life | Opacity | Motion / death | Look |
|---|---|---|---|---|---|---|---|---|---|
| **Wake foam, 2 arms** | v > 0.4 and not anchored | f −3.5…−3.9, s ±(0.9…1.25), on the water | (6 + 34k)/s, each event = 1 puff per arm | R·side·0.6·(0.7 + 1.3k) − F·0.4 | 0.12 + 0.06k → 0.24 + 0.36k·(0.6…1.4), EaseOutCubic | 1.4 + 1.6k s | min(0.6, 0.3 + 0.3k) × (1 − u), fade-in over the first 10% | velocity × e^(−0.91dt); **Z = SwellH + 0.06 every tick** | flat disc on the water, #EAF8F5, no outline, no texture noise |
| **Bow wave** | in the same event, if k > 0.3, 60% chance | f +3.95, s ±0.5 | — | R·side·3k | 0.12 → 0.1 + 0.45k | 0.7 s | 0.75 × same curve | same | same |
| **Bow spray** | k > 0.35 | f +3.7…+4.0, s ±0.55, Z = SwellH + 0.15 | 60·(k − 0.3)·(1 + 0.6A)/s | R·side·(2 + 3k) + F·0.5v; Z: 2.2 + 2.5k·U | 0.1…0.2 → 0.04 | 0.6…0.9 s | 1 − 0.5u² | gravity 9.8; XY drag e^(−0.6dt); **dies when falling below SwellH** | camera-facing droplet: ink rim #33273B, cream #F4FBFA, aqua shade #BFE6E2 offset to the lower right. **The hull must occlude it** |
| **Exhaust** | not anchored and notch ≠ 0 (incl. reverse) | stern pipe at f −3.25, s +0.78, u Deck(−3.2) + 1.35 ≈ 2.1 | (1.6 + 1.4·|notch|)/s | F·0.75v + ±0.15 jitter; Z: 2.4…3.2 | 0.1 → 0.32 + 0.1k | 1.6…2.2 s | 0.6 × (1 − u) × min(1, 6u) | buoyancy +1 m/s² up; XYZ drag e^(−1.83dt) | soft cel puff: faint ink rim (18% alpha), cream #F2EEE8, lavender shade #C9C2D6 lower right. No hard outline |
| **Splash (generic)** | catch, thrash, anchor, bump, slam | the event point on the water | n drops at once | angle U·2π, horizontal (1.5 + 2.5U)·p, Z (3.5 + 4.5U)·p | 0.12 + 0.14U·p → 0.05 | 0.9…1.4 s | as bow spray | as bow spray | droplet |
| **Fish shimmer** | at each spot within 220 m | random within 0.8 × spot radius | 2.5/s | 0 | 0.1 → 0.7 | 0.6 s | 0.9 curve | on the water | wake disc |

- The pipe itself is a dark cylinder #4E4A56 (r 0.08 m, 0.7 m tall) with a #33273B cap.
- Sprite visual size = 2 × radius.
- **Rejected by the owner, do not add:**
  - a foam collar or ring around the hull;
  - a pre-baked wake texture;
  - screen-space spray;
  - glow or bloom on any of these.
- **Rain** (Swells drizzle):
  - streaks and ripple rings run on a 3-drawing loop at 12 drawings/s;
  - ripple positions re-scatter each drawing within ±22 m, never inside the hull footprint;
  - rain density scales with wetness.
  - It must **never freeze**: it was an owner bug.
- **Catch ring**: an SDF ring at the landing point (+0.6 m), 6 drawings at 12/s, then gone.

---

## 8. Speed gauge — painted on the sea (owner request)

- **Geometry**: a 5.6 × 7.5 m quad in boat space, centred at f −0.4, s −4.6 (port), lying flat. Subdivide it (4 × 40)
  and **displace every vertex with `SwellH` + 0.06 m in the material's WPO**, using the boat's (X, Y, ψ) **without
  the visual tilt**. Render translucent, depth test on, no depth write, a small depth bias toward the camera, drawn
  after the water.
  - Alternative: a DBuffer decal projected onto the water mesh.
  - Never a UMG or widget component.
- **Content** (texture or material; 512 × 1024 canvas mapped to the quad, top of the canvas = bow end):
  - **Line**: at canvas x = 60 px, i.e. **s ≈ −6.74 m**. It runs from f ≈ +3.06 (top speed) to f ≈ −3.86, is 7 px wide
    (≈ 0.08 m), cream #FFF6E3 at 55%, with round caps.
  - **Parked mark**: a short cross tick (32 px wide, 80% alpha) at **20% up from the stern end** (f ≈ −2.48).
  - **Dot**: radius 24 px (≈ 0.26 m), solid cream. Position fraction along the line:
    - forward: `0.2 + 0.8·clamp(v/9, 0, 1)`;
    - reverse: `0.2·(1 − clamp(−v/2, 0, 1))`.
  - **Number**: `|v|·1.944` knots, 1 decimal, rounded geometric font (Fredoka 600 at 150 px ≈ 1.1 m tall), cream,
    placed 50 px to the **starboard side** of the line (toward the hull), vertically centred on the dot. The tops of the
    letters face the bow, so it reads upright from the chase camera.
  - **No** outline, plate, dial, notch labels or units.
- **Visibility**:
  - `active = !harbour && !screen && !anchored && (|v| > 0.3 || t − notchT < 3)`;
  - `gk = Follow(gk, active, active ? 5 : 1.2, dt)`;
  - material opacity = 0.9·gk.
- **Expect**: in the Swells the gauge rises and falls *with* the swell and is never hidden by it.

---

## 9. Crew and the fishing loop (P2: fully automatic; the player never acts on it)

### 9.1 Rig, stations, animation style

- **Rig**: three faceless block "dummies" (head, torso, two-segment arms and legs). Joints: hips, hipL/R, kneeL/R,
  torso, neck, shL/R, elL/R, handL/R. Sizes and colours: `scene/crew.js` `CREW` + `buildDummy`.
- **Outline**: crew get the **outer silhouette only**.
  - The prototype pushes the inverted hull 0.24 m away from the camera so internal seams hide behind the body.
  - UE: an inverted-hull material with a camera-direction offset, or a per-character Custom Depth silhouette.
  - Never per-block lines.
- **Stations** (boat-local; facing is a direction on the deck):

| Crew | Position (f, s) | Facing | Water point (where their line or net meets the sea) | Prop | Skill |
|---|---|---|---|---|---|
| Mabel | (−2.75, −0.70) | port, 8.6° toward the bow | (−3.2, −2.5) | hand-net (1.5 m pole, hoop) | 1.0 |
| Tomo | (−1.05, −0.78) | port, 7° toward the stern | (−0.7, −2.6) | hand-line (via the rail at f −1.0, s −1.36) | 1.3 |
| Pip | (+2.55, +0.52) | starboard, 27.5° toward the bow | (+6.2, +4.4) | rod 2.0 m + bobber (cream top, #B83A4B bottom) | 0.6 |

- **Animation is stepped**: hold each pose for N × (1/12) s and **snap** to the next. No blending or interpolation in
  any state.
  - Idle/fishing loops: `TIMING` in `scene/crew.js` (Pip 8 drawings, Mabel 8, Tomo 5), with per-crew time offsets
    Mabel 0, Tomo 0.9 s, Pip 0.45 s. The loops play whenever not resting (also between spots).
  - Event poses (Appendix A): `pullA`/`pullB` alternating at 5 Hz (8 Hz for rare), `cheer`, `look`, `aw`, `rest`.
- **Cheer**: hop `|sin(9·stateT)|·0.16 m` for 0.9 s.
- **Look**: neck yaw toward the target, clamped ±1.2 rad; afterwards it returns with `e^(−6.3dt)`.
- **Rest**: when the hold is full.
- **Pip's prop motion**:
  - Bobber Z = SwellH at the water point; during a bite −0.25 + 0.12·sin(40t); during a fight −0.35 + 0.2·sin(17t).
  - Line sag: 0.35 m normally, 0.05 at the bite (taut).
  - Rod: rotation +(−0.35 + 0.15·sin 13t) while fighting.

### 9.2 Per-crew state machine

`slow` multiplier:
- ×1.35 if anchored or |v| < 2.5;
- ×0.6 if |v| > 6;
- otherwise ×1.

`fishing = inSpot && !holdFull`.

```
IDLE      if fishing && !rareCineActive: timer -= dt*slow; if timer <= 0 → BITE; timer = U(16, 30)
          if !fishing && timer <= 0: timer = U(2, 6)          // so the FIRST bite in a spot comes 2–6 s after arriving
BITE      roll catch (9.3). "!" bubble (gold "!!" if rarity 2 and no rare cine is running → start the RARE CINE)
          bite sound (2 plucks). After 0.9 s (rare cine: 2.2 s) → FIGHT
FIGHT     (9.4) → LAND, or → ESCAPE
LAND      fish flies (9.5) → on arrival: CHEER 0.9 s → IDLE
ESCAPE    → AW 1.4 s → IDLE
LOOK      (glint, §12) 2.2 s → IDLE
```

The timer only runs in IDLE, so a fight never eats into the wait.

### 9.3 Catch roll

- The region is the spot's region.
- With 3% chance it is a **find**: Message in a bottle (Shallows, value 45) / Moon pearl (Swells, value 80). Both are
  rarity 2, so they trigger the rare moment.
- Otherwise a weighted pick from that region's species (doc 04 table, unchanged).
- Size = `min + (max − min)·U^1.6` (skews small).

### 9.4 Fight

```
diff = rarity(0/1/2) + (region − 1) + (find ? 0.5 : 0)
pEscape = clamp(0.06 + 0.11·diff − 0.06·skill, 0, 0.65)      // decided at fight start
dur = 1.8 + 1.1·diff + 1.2U ;  escape = U < pEscape ;  escAt = 0.45 + 0.4U
each tick: f.t += dt; surge = sin(6.5·f.t)·sin(2.3·f.t); p = clamp(p + dt/dur·(1.15 + 0.9·surge), 0, 1)
  thrash: every 0.3–0.65 s a splash at the water point (5 + 4·rarity drops, power 0.7) + splash sound
  reel tick: every 0.09 s (0.21 s while surge < 0)
  bar: above the head, fill = p; jitter ±2·(1+rarity) px X, ±1.5 px Y every tick; border amber #FFB04D while surge < −0.3
if escape && p > escAt → ESCAPE ;  if p ≥ 1 → LAND
```

- **Bar**: 120 × 14 px at 1080p; rare is 200 × 18 px with a gold gradient (#FFE7A6 → #FF9B21). Dark glass
  rgba(51,39,59,.72) with a cream 2 px border.
- **Escape**:
  - line snap sound, splash 16 (power 1.1);
  - an italic muted label "It got away…" for 2 s;
  - AW pose;
  - a log line for rarity ≥ 1;
  - if this crew member owns the rare cine: end it and play a soft "aw".

### 9.5 Landing flight

- Spawn the fish mesh at the water point.
  - Scale = `clamp(size/(min+max)·2.2, 0.8, 2.6)`; finds use 2.2; ×1.8 if it is the rare-cine fish.
- Landing FX: splash (16 + 10·rarity, power 1.2), catch ring, splash sound; rarity 2 adds a beam pulse.
- Flight to the crew's chest (crew-local (0.1 side, 0.7 up, 0.4 front)):

```
u += dt / (rare ? 0.9 : 0.55) · (rare && 0.28 < u < 0.62 ? 0.18 : 1)     // ONLY this fish slows: CustomTimeDilation-equivalent
pos = Lerp(from(Z = SwellH), to, u) + Z · H·4u(1−u)                       // H = 3.2 m (rare 6 m)
rot: pitch −1.2 + 4.5u (tumbles), yaw faces the travel direction, wiggle 0.3·sin(30t) (8t in slow-mo)
rare: at u > 0.4 → CELEBRATE once ; camera focus = fish position
u ≥ 1 → ARRIVED
```

- A rare flight lasts ≈ **2.3 s**, ≈ 1.7 s of it in slow motion.
- **Never use `SetGlobalTimeDilation`**: the boat, sea and camera keep running.

### 9.6 Arrival (every catch)

- **Pose and sound**: cheer; streak = streak + 1 if this crew member's last catch was < 40 s ago, else 0. The catch
  marimba note index is `min(9, maxStreak + 2)`, so it rises with streaks.
- **Label** above the head for 2.4 s:
  - `[model icon] Sand sprat · 14 cm  +1`, with "+1" in #FFE7A6. Finds omit the size.
  - Pop: scale 0.5 → 1.12 (55%) → 1 over 320 ms with an overshoot ease.
  - Older labels move up 46 px and their remaining life is cut to ≥ 0.6 s.
- **Fly-to**:
  - a dot burst (stars for rarity ≥ 1);
  - the model icon flies on a Bezier (0.55 s) from the head to the cargo counter;
  - on arrival: cargo +1, the counter pops, a tick note (pitch = cargo mod 5), and the hold-full check.
- **Card**: only if the species is new, rarity ≥ 1, or a personal best.
  - Right-edge stack (max 3), 330 px wide cream card with a model icon, name, size and stars.
  - Ribbon "NEW!" or "Biggest yet!".
  - Slides in over 460 ms from the right (rotate 6° → −1° → 0).
  - A star burst after 280 ms for rarity ≥ 1.
  - Leaves after 3.6 s (rare 5.2 s).
- **New species**: a 4-note chime (+120 ms) and a log line with a "new" tag.
- **Hold full** (once):
  - the cargo HUD goes Focused for 6 s;
  - log "Hold full. The crew's resting.";
  - hint "Head home to sell" once;
  - plonk;
  - the crew REST.

### 9.7 Rare moment (rarity-2 bite; one at a time)

| t | Event |
|---|---|
| bite | the cine starts: **letterbox** bars 0 → 9% screen height each over 0.45 s (ease-out); HUD dims to 25%; a low **rumble** rises; beam (§9.8) fades up; gold "!!" bobs (0.3 s); camera rare shot (§6) |
| +2.2 s | longer fight (difficulty ≥ 2); faster pull poses (8 Hz) |
| land | 6 m leap at 1.8× size; slow-mo window |
| leap u > 0.4 | **celebrate**: fanfare; trauma +0.08; **3 confetti bursts** 90 ms apart from the top of the screen at 25/50/75% width (40 rectangles each, palette #FF9B21 #FFE7A6 #E8553F #6E6AA8 #86C445 #FFF6E3, gravity, drag, 1.8 s life); a star burst (36) at the fish; **title** "A rare catch!" / "A rare find!" (gold #FFE7A6, 72 px, cocoa stroke) + name, at 16% height, scale 1.6 → 1 in 18% of 2.6 s, hold, fade |
| arrival + 0.9 s | letterbox out; HUD back; beam off |
| escape instead | letterbox out at once; "aw" sound |

- No new bites start anywhere while the cine runs.
- The player can keep steering.

### 9.8 Beam (rare only)

- A flat, unlit, inked cylinder at the water point, golden #FFD45A, rising 6 m. Its radius breathes ±10% at 8 rad/s.
- Opacity:
  - during the build: `min(0.3, 0.12·cineT)·(0.8 + 0.2·sin 9t)`;
  - at the landing splash: a sine pulse to **0.55** over 1.6 s;
  - then 0.
- No bloom and no light shaft.

---

## 10. Selling (Fishmonger screen)

- **Layout**: right third of the screen; the world dims only 12%. Shells (with its plate) at the top right.
- **Tiles**: one square tile per species, rendered **from its 3D model** (SceneCapture once at load, transparent
  background), with a rarity tint, stars and a ×n badge. Sorted by rarity, then by value.
- **Sequence** (exact timings from `sellAll`):
  1. **Open**:
     - tiles pop in (translateY 16 px, scale 0.8 → 1, 320 ms, overshoot), staggered 60 ms, each with a UI note;
     - line "Fine catch today!".
  2. **Sell all** (E or click). For each tile in turn:
     - the tile pops (1.12);
     - up to 3 fish icons fly into the crate (0.38 s each, 60 ms apart; a pluck and a crate pop each);
     - the total counts up over **0.22 s** with coin ticks;
     - the tile fades;
     - 0.06 s gap.
  3. Shine on the total + plonk, then 0.25 s pause.
  4. **Coin pour**: `N = round(clamp(total/3, 8, 28))` shell-coins.
     - They launch every 1.1/N s from the total (±15 px), each flying a 0.7 s Bezier into the Shells counter.
     - Each landing:
       - the counter increments by total/N;
       - **the crate total counts down by the same amount**;
       - a rising coin tick;
       - a 3-dot burst;
       - a pop (1.08) every 3rd.
  5. **Settle**:
     - final value, soft plonk, shine, pop 1.12 over 420 ms;
     - "+N" rises 10 px → −14 px over 1.8 s;
     - a 26-star burst at the counter. Not a slam.
  6. The line changes to "Your first sale! Come again soon." (first time) or "Lovely. Come again!". The hold empties and
     the button reads **Done**. After the first sale only, the hint "The shipyard can fit a bigger hold" appears after
     1.5 s.
- **Price** = doc 04 `BaseValue × 3`.
- The Shells panel must **never stretch**: an owner bug, caused by an effect changing the panel's positioning.

## 11. Harbour dock mode (replaces "park at the spot")

1. The game **starts docked**: start button → chime → harbour mode.
2. Entering the dock zone (§3) at sea:
   - the action bar's first slot becomes **E · Dock** (highlighted, clickable) with a pop and tick;
   - hint "Press E to dock" (once).
3. **Dock**:
   - the boat eases from where it is to the berth over 1.3 s (EaseInOutCubic, position and ψ); speed and notch 0;
   - the camera blends to the harbour shot (§6);
   - rope sound + chime;
   - building outlines and pills appear (pills pop in 380 ms, 700 ms + 90 ms stagger).
4. **Building outline**: a house-shaped silhouette shell behind each building:
   - #1E1726 normally, **#FFF6E3 on hover**;
   - plus a dark pill (icon in a cream disc + name) at 60% of the height, which inverts to cream and scales 1.12 on
     hover.
   - Hover by mouse raycast (after 0.8 s), or A/D cycles; each change plays a tick. Click / E / Enter opens.
5. **Set sail**: button bottom centre, or W / Esc.
   - camera back to the chase; notch 1; click + creak;
   - hint "Tap W for more speed · sail out to the buoy rings to fish" after 0.9 s.
   - The dock prompt doesn't return until the boat leaves the zone.
6. Inn and Shipyard open preview panels (doc 11).

## 12. Exploration

- **Glint**: an unseen place within 150 m gets a 40 px star-glint at its top + 2 m:
  - pulses scale 0.6 → 1.15 → 0.6 and rotates 0 → 90° over 1.8 s, looping;
  - removed past 170 m;
  - an amber compass marker.
  - **The first time** for that place: Tomo goes to LOOK at it with a lavender "?" bubble (2.4 s) and a glass note.
    The crew notices first.
- **Discovery** at 42 m (not during another discovery):
  - the music bus ducks to 45% (τ 0.15 s) and returns at 1.3 s (τ 0.4 s);
  - discovery arpeggio;
  - letterbox + discovery camera shot (§6, 1.4 s).
  - **Stamp** at +0.42 s, centred at **30% screen height** (above the boat):
    - a 150 px ring (lavender fill 55%, cream border) with the icon, the place name (40 px) and
      "DISCOVERED · n OF 5";
    - lands in 420 ms with an ease-in: scale 2.1 / −8° → 1 / −3° at 70% → 1.04 at 85% → 1.
  - At +0.72 s: thud, a dust burst under the ring (34) and a star burst (16).
  - Fade at +3.32 s (500 ms).
  - Log line; the map badge.
- **Region title** when the region changes into Shallows or Swells (≤ once per 25 s):
  - "The Swells" in 76 px with letter-spacing 0.08 em, and the subtitle "ROLLING SWELL · TIER 2", at 22% height;
  - 4.2 s: rises 14 px while fading in over 20%, holds, then fades;
  - 3-note region chime.
  - The compass region name shows for 6 s.
  - Region rule: Swells if X > 360; Harbour if X ≤ −30 and within 70 m of HARBOUR; else Shallows.
- **Homecoming**: entering the Harbour region with the hold ≥ 60% full rings the bell; window glow +0.8, decaying with
  k 0.25.

## 13. Time and weather

- Clock: `hour += dt·15/(30·60)` (06:00 → 21:00 in 30 real minutes), start 15:30, wraps 21 → 6.
- Dusk weight = `Smooth(17.4, 19.4, h)·(1 − Smooth(20.6, 21, h))`: blends the sky, light and window glow.
- Drizzle:
  - wet = `(t mod 270) > 180`, multiplied by the Swells factor (§3);
  - wetness follows with k 0.5;
  - the rain curtain is 0.7 × wetness;
  - ripples show above 0.3.
- HUD time + weather icon at the top right (rain > sun/cloud; dusk).

## 14. HUD rules (doc 10 + clean-ui; prototype-confirmed)

- **Scale unit**: `u = min(screenW/1920, screenH/1080)`. All px values in this doc are at 1080p × u.
- **At rest, no plates**: cream text with no outline or shadow for:
  - cargo (top left);
  - compass (top centre);
  - time (top right);
  - log (bottom left; lines fade after 12 s).
- **Action bar** (bottom left):
  - keycaps are always solid cream;
  - it fades out after 60 s without input.
  - At sea: `W A S D Sail · Space Anchor · M Map · F Inspect · Tab Menu`.
  - Docked: `Click Visit · A D Choose · E Open · W Set sail`.
- **Focused states**: cargo when full; Shells (with its plate) in shops and while F is held; chat on Enter.
- **World-anchored widgets** (bubbles, labels, bars, glints):
  - project the world point each tick;
  - bottom-centre anchored (−50%, −100%);
  - bubbles offset 48 px left;
  - hidden when behind the camera.
- **Bubble**: a 44 px ink circle with a cream border and a 34 px glyph. Pop 0 → 1.3 → 1 in 300 ms with an overshoot
  ease. Gold: 56 px, #C98A1E, bobbing.
- **Hover card on any item tile**: model icon, name, stars + rarity word, size (or "Rare find"), your biggest, price
  each, region.

## 15. Audio cues (one key: F major pentatonic; soft marimba, glass and wood)

| Event | Cue |
|---|---|
| notch | wooden click, pitch by notch |
| rudder hard | creak |
| bow slap | slap |
| anchor | creak + rope hiss (drop); splash; rising rope (raise); thunk + low pluck (slam) |
| bite | 2 plucks |
| fight | reel ticks (faster on surges), thrash splashes |
| land | splash + marimba note rising with streak; new species: 4-note chime |
| escape | line snap; "aw" for rare |
| rare | low rumble rising → fanfare (plucks + chimes + shimmer) |
| sell | coin ticks rising, plonk, settle |
| discovery | glint (glass), arpeggio + duck, stamp thud |
| other | region chime, harbour bell, bump, crew hum (idle 45 s), UI tick |
| beds | sea (brown noise) + wind (band-passed), scaled by speed k and swell |

## 16. UE5 architecture (recommended)

| Piece | Implementation | Avoid |
|---|---|---|
| `ULOFeelConfig` (DataAsset) | every §2 value; hot-reload in PIE | literals in code |
| `ULOSwellLibrary` (BlueprintFunctionLibrary) + `MF_Swell` | §3, bit-identical constants; MPC `SwellA`, `Time` (game time, not real time) | Water plugin waves for gameplay |
| `ALOBoatPawn` | root (X, Y, ψ) + `Visual` scene component (heave, θ, φ); §4–§5 in C++ `Tick` (TG_PrePhysics); Enhanced Input with **pressed** events for notch (no auto-repeat) and the hold timer in code | `UFloatingPawnMovement`, `ChaosVehicles`, physics buoyancy |
| `ALOPlayerCameraManager` | §6 in `UpdateViewTarget`; vertical→horizontal FOV conversion | SpringArm lag, camera lag, motion blur (turn it off) |
| Niagara | NS_Wake, NS_BowSpray, NS_Exhaust, NS_Splash, NS_Rain: CPU sim, swell via a Niagara data interface or a user parameter + the same HLSL function; translucent unlit sprites with depth test | GPU sims that can't kill on the swell; lit or bloomed particles |
| Gauge | `UProceduralMeshComponent` or a static grid mesh + `M_Gauge` (WPO = swell; texture from a render target or SDF material) | widget components |
| Crew | skeletal or rigid-part meshes; a pose table (Appendix A) applied by a stepped player at 12 fps; `ULOCrewFishingComponent` for §9 | blend spaces, anim interpolation |
| Rare slow-mo | the fish actor's own `CustomTimeDilation` / u-rate | `SetGlobalTimeDilation` |
| UI | UMG + CommonUI; world-anchored widgets projected per tick in the HUD layer; Niagara UI or simple UMG particles for bursts and confetti | 3D widget components |
| Fish icons | SceneCapture2D render of each species once at load | hand-drawn icons |
| Building hover | Custom Depth stencil + outline post, or the inverted shell mesh, colour swapped on hover | full-screen highlight |

## 17. Reference checks (pass these before saying "done")

Log these values from a debug overlay (`stat LO`) or an automated functional test with a fixed dt of 1/60:

| # | Test | Expected |
|---|---|---|
| 1 | Full notch from rest, flat water | v hits 9.0 at **5.63 s**, linearly (4.5 at 2.81 s) |
| 2 | Hold W from notch 0 | notches at 0, 0.45, 0.73, 1.02, 1.30 s |
| 3 | Throttle up from rest | θ peaks at **+0.060 rad** (bow up) |
| 4 | Full rudder at 9 m/s | ψ̇ 90% of 0.62 at **0.97 s**; φ → 0.20 rad (starboard down in a left turn) |
| 5 | Turn at rest | 0.233 rad/s |
| 6 | Space at 9 m/s | the §5 table trace: bite at 0.55 s with v 7.35; min θ **−0.098 rad**; stopped by 1.05–1.2 s; ≈ 5.8 m travelled; θ never > 0 |
| 7 | Hold W through the anchor drop | the anchor stays down; it only rises on a new press |
| 8 | Raise | 0.28 s; slam θ min −0.033 rad; next W press = notch 1 |
| 9 | Camera at 9 m/s, straight | dist 30.95 m, vFOV 42°, target 4.05 m ahead of the boat |
| 10 | Spray occlusion | no droplet pixel drawn over the hull from the chase camera |
| 11 | Gauge in the Swells | the gauge stays visible over 60 s of sailing (never under the water) |
| 12 | Spot arrival | the first bite 2–6 s after entering a spot; afterwards 16–30 s per crew member (÷1.35 when anchored) |
| 13 | 200 Swells fights, Pip, common | escape rate ≈ 0.06 + 0.11 − 0.036 = **13.4%** |
| 14 | Rare leap | the fish takes ≈ 2.3 s; the boat, sea and camera keep running at normal speed |
| 15 | Search the code | no `SetGlobalTimeDilation`, no `FInterpTo` on speed, no SpringArm lag |

Also record a 30 s clip of the same route in both builds (harbour → spot 1 → anchor → a catch → Gull Point) and
compare them side by side; store it in `production/qa/evidence/`.

## 18. Open questions (owner)

1. **Scale**: keep the compressed world (≈ 730 × 660 m at 9 m/s) for the slice (recommended), or return to doc
   02/03's 1.6 km at 6.17 m/s? If returning, scale positions by ≈ 2.2 and keep every feel value here.
2. **Lean direction**: the build rolls *outward* in turns. The bible says "into". Keep as built unless the owner asks
   for an A/B.
3. Night: the clock skips 21:00–06:00.
4. Swells gate: the prototype lets you sail into the Swells without the keel. Turn doc 02's push-back gate back on?

---

## Appendix A — event poses and joint semantics (`scene/crew.js`)

**Pose fields**:

| Field | Meaning |
|---|---|
| `y` | hips height offset (m) |
| `tx`, `ty` | torso pitch, yaw (rad; + = lean forward) |
| `hx`, `hy` | head pitch, yaw |
| `L` / `R` | arm: [shoulder forward-raise, shoulder out (abduction), elbow bend] |
| `lL` / `lR` | leg: [hip forward, knee bend] |

Defaults: arms [0.15, 0.08, 0.2]; legs [0, 0]; everything else 0.

| Pose | Values (only the non-default fields) |
|---|---|
| rest | y −0.12, tx 0.2, hx 0.15, L/R [0.25, 0.1, 0.9], lL [1.2, 1.5], lR [1.1, 1.4] |
| cheer | y 0.06, tx −0.12, hx −0.3, L/R [2.85, 0.35, 0.15], lL [0.15, 0.1] |
| look | tx −0.05, hx −0.15, L [0.2, 0.1, 0.3], R [1.6, 0.2, 0.1] |
| pullA | y −0.05, tx −0.32, hx 0.1, L [1.5, 0.15, 0.6], R [1.3, 0.15, 0.8], lL [0.5, 0.6], lR [−0.2, 0.1] |
| pullB | y −0.02, tx −0.18, hx −0.05, L [1.9, 0.1, 0.3], R [1.7, 0.1, 0.4], lL [0.4, 0.5], lR [−0.1, 0.05] |
| aw | y −0.06, tx 0.38, hx 0.45, L/R [0.05, 0.05, 0.1] |

The idle/fishing loops below are copied verbatim from `scene/crew.js`. Each drawing is `[pose, hold]`, where hold
is in 1/12 s units, and the loop repeats. `P({...})` = defaults + the listed fields. `tool` is an unused marker
for Pip's rod-flick drawings (the prototype ignores it). Drawing = `floor((t + offset)·12) mod total`.

```js
// Each drawing: [pose, hold in twos (1 = 1/12 s)]. Loops.
export const TIMING = {
  Pip: [ // rod: 2-pose breathing hold, then the 4-drawing bob-and-wait (flick on drawing 2 = catch-pop sync point)
    [P({ tx: 0.06, hx: 0.12, R: [1.05, 0.1, 0.55], L: [0.85, -0.18, 0.95], lL: [0.12, 0.12], lR: [-0.08, 0.05] }), 8],
    [P({ y: -0.012, tx: 0.1, hx: 0.16, hy: 0.25, R: [1.0, 0.1, 0.6], L: [0.8, -0.18, 1.0], lL: [0.14, 0.16], lR: [-0.08, 0.08] }), 8],
    [P({ tx: 0.06, hx: 0.12, R: [1.05, 0.1, 0.55], L: [0.85, -0.18, 0.95], lL: [0.12, 0.12], lR: [-0.08, 0.05] }), 8],
    [P({ y: -0.012, tx: 0.1, hx: 0.16, hy: -0.2, R: [1.0, 0.1, 0.6], L: [0.8, -0.18, 1.0], lL: [0.14, 0.16], lR: [-0.08, 0.08] }), 8],
    [P({ tx: 0.12, hx: 0.2, R: [0.75, 0.1, 0.35], L: [0.65, -0.18, 0.7], lL: [0.12, 0.15], lR: [-0.06, 0.05], tool: 1 }), 3],
    [P({ tx: -0.12, hx: -0.1, R: [1.7, 0.12, 1.0], L: [1.4, -0.2, 1.3], lL: [0.25, 0.3], lR: [-0.12, 0.05], tool: 2 }), 3],
    [P({ tx: -0.06, hx: 0.0, R: [1.5, 0.1, 0.8], L: [1.2, -0.18, 1.1], lL: [0.2, 0.25], lR: [-0.1, 0.05], tool: 2 }), 4],
    [P({ tx: 0.04, hx: 0.1, R: [1.1, 0.1, 0.6], L: [0.9, -0.18, 0.95], lL: [0.14, 0.14], lR: [-0.08, 0.05] }), 6],
  ],
  Mabel: [ // hand-net over the rail: reach, scoop, haul, lift, swing in, tip; then a 2-pose breathing hold
    [P({ y: -0.05, tx: 0.65, hx: 0.2, R: [1.25, 0.05, 0.2], L: [1.05, -0.05, 0.4], lL: [0.35, 0.45], lR: [-0.1, 0.2] }), 4],
    [P({ y: -0.06, tx: 0.75, hx: 0.25, R: [1.05, 0.05, 0.15], L: [0.9, -0.05, 0.3], lL: [0.4, 0.5], lR: [-0.1, 0.25] }), 3],
    [P({ y: -0.03, tx: 0.35, hx: 0.05, R: [1.6, 0.05, 0.7], L: [1.4, -0.05, 0.9], lL: [0.25, 0.3], lR: [-0.05, 0.1] }), 3],
    [P({ y: 0.0, tx: -0.08, hx: -0.15, R: [2.4, 0.1, 0.5], L: [2.2, -0.1, 0.7], lL: [0.1, 0.05], lR: [0, 0.05] }), 4],
    [P({ y: 0.0, tx: 0.0, ty: 0.7, hx: 0.0, R: [2.0, 0.1, 0.7], L: [1.8, -0.1, 0.9], lL: [0.1, 0.05], lR: [0, 0.05] }), 3],
    [P({ y: -0.02, tx: 0.2, ty: 1.0, hx: 0.25, R: [1.4, 0.1, 0.4], L: [1.3, -0.1, 0.6], lL: [0.15, 0.1], lR: [0, 0.1] }), 5],
    [P({ tx: 0.05, ty: 0.2, hx: 0.05, hy: -0.4, R: [0.9, 0.05, 0.6], L: [0.8, -0.05, 0.7], lL: [0.08, 0.05], lR: [-0.05, 0.05] }), 9],
    [P({ y: -0.012, tx: 0.08, ty: 0.15, hx: 0.08, hy: -0.55, R: [0.85, 0.05, 0.65], L: [0.75, -0.05, 0.75], lL: [0.08, 0.08], lR: [-0.05, 0.08] }), 9],
  ],
  Tomo: [ // hand-line over the side: hand over hand, 5 drawings, plus a look at the horizon
    [P({ tx: 0.3, hx: 0.25, R: [1.3, 0.05, 0.3], L: [0.7, -0.05, 1.2], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.22, hx: 0.2, R: [0.7, 0.1, 1.3], L: [1.0, -0.05, 0.8], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.28, hx: 0.22, R: [0.9, 0.08, 1.0], L: [1.35, -0.05, 0.3], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.22, hx: 0.2, R: [1.25, 0.05, 0.35], L: [0.75, -0.08, 1.25], lL: [0.2, 0.3], lR: [-0.05, 0.15] }), 3],
    [P({ tx: 0.12, hx: -0.05, hy: 0.5, R: [1.0, 0.05, 0.6], L: [0.9, -0.05, 0.7], lL: [0.15, 0.2], lR: [-0.05, 0.1] }), 10],
  ],
};
```

## Appendix B — what changed vs. earlier GDD text (so nobody "fixes" it back)

| Topic | Earlier docs said | Now (owner-approved) |
|---|---|---|
| Top speed | 6.17 m/s (02) | 9 m/s, compressed world |
| Catch rhythm | faster test values / timer only | 16–30 s + fight + escapes |
| Prices | BaseValue | BaseValue × 3 |
| Docking | park at the spot | dock mode with outlined buildings; start docked |
| Anchor | one-button stop | the §5 state machine; hangs at the bow; fresh-press raise |
| Speed readout | HUD element | painted on the sea |
| Foam | foam collar + wake texture | generated foam-disc trail only |
| Crew outline | per-part ink | outer silhouette only |
| Rare catch | sparkle | the full §9.7 moment with fish-only slow-mo |
