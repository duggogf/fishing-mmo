# Little Ocean — 08 Companion Mode and Ambient Audio

> **Status**: In Design · **Author**: ux-designer (agent A5) for owner · **Last Updated**: 2026-11-26 · **Last Verified**: 2026-11-26
> **Implements Pillar**: P1 (ocean is the attraction), P2 (hands off the line) · Tests **H4**
> Sources: brief §9, §12; 00-direction §2 H4, §5 A5, **§9 D2 (overrides)**.

## Summary
A single, fixed-size, game-owned compact window (`ViewMode = Compact`) that shows the boat drifting in place
with its named crew fishing, a cargo bar and three buttons, rendered at 20 fps, with an ambient sea audio bed.
> **Quick reference** — Layer: `Feature` · Priority: `MVP` · Key deps: 04 crew/fishing, 03 regions, 09 art, 10 UI, 07 settings save

## Overview
The player can tuck the game into a 512×320 corner window while doing something else. The boat stops, drifts in
place, and the crew keeps fishing (only while the game runs) until `CargoLoad = CargoCapacity`, then rests.
Nothing sails, returns or sells on its own (**CONFIRMED (owner D2)**). One layout, never resizable (**CONFIRMED (brief §9)**).

## Player Fantasy
"My boat is bobbing in the corner of my screen. I hear waves and gulls, I glance over and see Mabel pull in a fish.
When the hold is full they sit back and wait for me. No hurry." Ambient company, not a task list.

## Detailed Design

### Core Rules
1. **PROPOSED — Fixed size 512×320 DIP** (device-independent px; 16:10). **08 owns this value** (loop-1 must-fix 3);
   it is the source for 09's companion render profile (no 480×270 anywhere). Rationale: 320 tall fits a 256-tall
   scene plus a 64-tall control bar that honours the 28 px type floor (09/§UI); 480×270 left only ~40 px for controls.
2. **Wireframe (DIP)**:
```
+------------------------------------------------------------ 512 ------+
| [drag zone: whole scene area, 512x256]                    (pin) (x?)  |  <- pin/close? see Open Q2
|                                                                       |
|        ~ ~  painted sea + sky (StaysLayer)  ~ ~                       |
|                 __/\__   <- boat, 3/4 view, fills ~35% width          |
|      Mabel Pip (Tomo)    <- blocky crew dummies (ActsLayer, D7), names on hover |
|     ~~~ wake/splash on twos ~~~                                       |
+-----------------------------------------------------------------------+
| [fish] [====== cargo bar 260 ======] 38/40  | (Pin) (Mute) (Expand)   |  <- control bar 64 tall
+-----------------------------------------------------------------------+
  bar: 16 px pad | icon 32 | bar 260x20 | count 28 px text | 3 poms 44x44, 8 px gap
```
3. **Contents (CONFIRMED brief §9)**: animated ocean, boat + crew, cargo status, minimal controls. Region name is
   shown only as hover tooltip on the scene (PROPOSED — keeps scene clean). No Shells, no chat, no ping UI.
4. **Controls (PROPOSED)**: `Pin` (always-on-top toggle, default ON), `Mute` (ambient bed + SFX, not saved
   globally), `Expand` (back to Full). No return-to-harbour, anchor, or sell button (D2).
5. **Boat behaviour on enter**: throttle set to 0; boat decelerates with doc 02's decel and then drifts in place
   (bob + slow yaw ±10°, net displacement 0 — drift is a visual idle, position clamped). **CONFIRMED (owner D2)**.
   **CONFIRMED (loop-1 ruling 3; owner of rule: doc 02)**: on entering `CompactHold`, `PushVec` is set to 0 at once
   and the boat holds where it is — no push-back-completes-first step (safe: an un-Keeled boat stalls at y ≈ 607 < 650).
   Shared spec: net hold-point displacement 0, cosmetic circling ≤3 m, yaw ≤±10°, test "within 5 m for 30 min"
   (02 AC7). Swell push resumes on return to `Full`.
6. **Fishing**: runs per doc 04 only if the boat is in a `ZoneId` (not `Harbour`) and the process is running —
   including while the compact window is minimised or occluded. Pauses at `CargoLoad = CargoCapacity`.
   **CONFIRMED (brief §12, D2)**: no offline catch-up; closing the game stops fishing.
7. **Cargo full**: crew switch to rest idle (doc 04/09), cargo bar shows full state (icon + "Full", not colour
   only), one soft bell plays **once** per fill event (toggle in settings, default ON). No OS toast, no taskbar
   flashing, no repeat (PROPOSED — avoids nagging, §5 A5 must-not).
8. **Enter/exit**: Enter from Full via `F9`, gamepad hold View 0.6 s, or Settings → "Companion mode". Allowed in
   phases `Sailing`, `Returning`, `Docked` (shows "In harbour — crew resting"); blocked while a harbour screen is
   open (close it first). Exit via `Expand`, `F9`, or double-click scene. Exit restores the previous Full window
   mode, resolution and monitor exactly; the boat stays where it drifted; throttle stays 0.
9. **Position memory (PROPOSED)**: last compact top-left position + monitor id stored in local settings
   (GameUserSettings ini, not `PlayerProgress`). First use: bottom-right of primary work area, 24 DIP margin.
   On restore, if <50% of the window would be visible on current monitors, snap to the default spot.
10. **Multi-monitor & DPI**: size is in DIP; physical = DIP × monitor scale (125% → 640×400; 150% → 768×480).
    Re-evaluate scale on `WM_DPICHANGED` when dragged between monitors. Never larger than 40% of the work area;
    if it would be, fall back to 100% scale (edge case: 4K at 300% on small laptop).
11. **Input in compact**: mouse only on the three poms + drag + double-click; keyboard `F9`, `M` (mute),
    `P` (pin) when focused; gamepad: View-hold to expand only. Window must not steal focus on appear.

### States and Transitions
| From | Trigger | To | Notes |
|---|---|---|---|
| `ViewMode = Full` (any `PhaseKey` except open menu) | F9 / View-hold / menu | `ViewMode = Compact` (02 `CompactHold`) | Save Full window state; apply compact profile; throttle 0; `PushVec` 0 |
| Compact.Fishing | `CargoLoad` reaches cap | Compact.HoldFull | One bell; crew rest |
| Compact.* | window minimised | Compact.Hidden | Rendering off; sim + audio continue |
| Compact.Hidden | restore | previous Compact sub-state | |
| Compact.* | Expand / F9 / double-click | Full | Restore Full profile & window; swell push resumes |
`Compact` is a `ViewMode` overlay, not a `PhaseKey` (§6, loop-1 ruling 6); the loop `PhaseKey` underneath is kept
unchanged. Compact.HoldFull mirrors §6 `HoldFull` (owner 04).

### Interactions with Other Systems
04 Crew & fishing: reads `CatchRatePerMin`, `CargoLoad`, `CargoCapacity`, cargo-full flag; drift sets
`BoatSpeed = 0`; **CONFIRMED (owner D6, doc 04)**: `BoatSpeedFactor` = 1.0 at speed 0, so compact fishing runs
at the full doc-04 rate. 02 Sailing: throttle/decel, `CompactHold` / `PushVec` rule.
03 Regions: `RegionId`, `TransitionBand` blend alpha for audio. 09 Art: compact render profile co-owner.
10 UI: shared tokens and poms. 07 Persistence: autosave continues on its normal cadence in compact.

## Formulas
**Render profile cost (PROPOSED).** `GPU_c ≈ GPU_f × (P_c / P_f) × (F_c / F_f) × K_post + G_fixed`
- `GPU_f` full-mode GPU % at 1080p/60 (budget per doc 09); `P_c` compact pixels rendered = (512·s × 320·s)·r²,
  s = DPI scale, r = `CompactRenderScale`; `P_f` = 1920×1080; `F_c` = `CompactFpsCap`, `F_f` = 60;
  `K_post` = post-stack multiplier in compact (≈1.0 since post is per-pixel); `G_fixed` = per-frame fixed cost
  (draw calls, shadows-off scene) ≈ 2–4% at 20 fps — ASSUMPTION – validate by Unreal Insights capture.
- Worked example (s=1, r=0.75, GPU_f = 70% on GTX 1660): P_c = 384×240 = 92,160; P_c/P_f = 0.044; F ratio 0.333;
  GPU_c ≈ 70 × 0.044 × 0.333 + 3 ≈ **4.0%** → under H4's 10% target. At s=1.5: P_c = 207,360 → ≈ 6.4%.
**Audio layer gain.** `Gain_layer = Base_layer × RegionWeight(alpha) × WeatherWeight × Master × Ambient × CompactTrim`,
where `alpha` ∈ [0,1] is the `TransitionBand` blend (0 = R1, 1 = R2), `RegionWeight = lerp(W_R1, W_R2, alpha)`.
Example: Gulls Base 0.6, W_R1 1.0, W_R2 0.2, alpha 0.5 → 0.6 × 0.6 = 0.36 before bus volumes.

## Edge Cases
- **Enter while moving fast**: decelerate per doc 02 (≤ ~5 s), then drift; render profile applies immediately.
- **Enter inside the swell band (no Keel)**: `PushVec` = 0 at once, boat holds where it is (ruling 3); push resumes on Expand.
- **Hold already full on enter**: go straight to HoldFull; no bell (bell only on the transition into full).
- **In Harbour / not in `ZoneId`**: bar label "Crew resting — sail out to fish"; no catches; no prompt to move.
- **Minimised**: world rendering disabled; sim ticks at ≥10 Hz (`CompactMinTickHz`) so catch timing stays correct (tick dt ≤ 0.1 s, under 04's `MaxTickDt` = 0.25 s, so no fishing time is clamped away; the 5 Hz tuning floor gives 0.2 s, still under).
- **System sleep / lock screen**: process suspended → no fishing (consistent with "no offline fishing").
- **Monitor unplugged while compact**: OS moves window; on next display change, run the <50% visible rule.
- **Alt-Tab / fullscreen app on top**: if Pin ON, stays topmost over windowed apps; exclusive-fullscreen games
  will cover it — acceptable, documented.
- **Autosave during compact**: allowed; no hitch >50 ms (ASSUMPTION – validate by Insights).
- **Quit from compact** (OS close / Alt-F4): normal quit + save; no confirm dialog (state is saved).

## Dependencies
Hard: 04 (fishing tick, cargo-full state, rate at speed 0), 02 (decel, swell), 09 (compact render settings,
crew rest idle), 10 (tokens, poms, type floor), 07 (settings + autosave). Soft: 03 (`TransitionBand` alpha,
R2 weather). Doc 04 and 09 must list 08 as a dependent.

## Tuning Knobs
| Knob | Default | Safe range | Affects |
|---|---|---|---|
| `CompactWindowSize` | 512×320 DIP | fixed (one layout) | readability vs desk space |
| `CompactFpsCap` | 20 | 15–30 | GPU/CPU vs smoothness (cels animate on twos ≈12 fps so 20 is enough) |
| `CompactRenderScale` | 0.75 | 0.5–1.0 | sharpness vs GPU |
| `CompactMinTickHz` (minimised) | 10 | 5–20 | CPU vs timing precision |
| `CompactTrim` (ambient) | -3 dB | -9–0 dB | loudness while working |
| `HoldFullBell` | ON, once | on/off | awareness vs calm |
| `PinDefault` | ON | on/off | first-use expectation |

## Visual/Audio Requirements
**Reduced render profile (PROPOSED; values co-owned with doc 09, verify vs its budget):** t.MaxFPS 20;
r.ScreenPercentage 75; dynamic shadows OFF (violet shadow is painted per P5); volumetric fog → exponential
height fog only; Kuwahara kept but at the doc-09 "low" radius (pixel count is tiny, the look is H2/H4 evidence);
ink inverted-hull kept on boat + crew; remote boats N/A (D3); particles: wake/splash kept on twos, ambient
spray off; camera fixed 3/4 framing, no orbit; distant islands LOD-min; Lumen/Nanite off (should be off anyway).
Minimised: world rendering disabled, Slate not drawn.
**Ambient audio bed (PROPOSED)** — looping layers, each a stereo stem, crossfaded by `alpha` and weather:
| Layer | Harbour | R1_Shallows | R2_Swells (swell) | Weather/notes |
|---|---|---|---|---|
| Waves (lap, close) | 0.5 | 0.8 | 0.6 | always on |
| Swell (low surge) | 0 | 0.1 | 0.8 | R2 identity (D1) |
| Wind | 0.2 | 0.4 | 0.7 | +0.2 under rain |
| Gulls (random one-shots, 8–25 s) | 0.8 | 0.6 | 0.1 | off under rain |
| Harbour life (ropes, bell, murmur) | 0.7 | 0 | 0 | radial from harbour |
| Rain | 0 | 0 | 0 | 0 → 0.7 over 6 s when doc 03 R2 weather = `Drizzle` (intensity ≥ 0.5); in scope for R2 prototype (D8) |
| Crew (catch splash, small laugh) | — | event | event | ≤1 per 6 s; ActsLayer sync |
Rules: crossfade over the `TransitionBand` (not on a timer); weather fades 6 s; no layer above -12 LUFS-S bus;
SFX ducks ambient by 3 dB for 0.5 s. **While minimised audio continues** (PROPOSED; option "Mute when
minimised", default OFF). Storms: POST-PROTOTYPE (layer slot `Storm` reserved in the bed asset).

## Game Feel
Enter: pom-iris close to compact (≤200 ms, 3 drawings), window pops 110% → 100%. Boat bob 0.3 Hz, crew idles
offset so they never move in unison. Bell is a single 1.2 s soft chime. Nothing flashes (≤3 flashes/s rule).

## UI Requirements
Uses doc 10 tokens: Paper Cream bar, Cocoa 3 px frame scaled to 2 px at 512 width, Aubergine Ink text 28 px,
poms 44×44 DIP (Fitts: ≥44 target). Tooltips on every pom. Cargo bar uses fill + numeric + full icon (not colour alone).

## UE5 implementation notes (all "verify")
- Window resize/mode: `UGameUserSettings::SetFullscreenMode(EWindowMode::Windowed)` + `SetScreenResolution` +
  `ApplyResolutionSettings(false)`; store/restore previous values. **verify** DIP vs physical handling.
- Borderless + topmost: `GEngine->GameViewport->GetWindow()` → `SWindow`; `SWindow::SetWindowMode`,
  `MoveWindowTo`; topmost via `FGenericWindow::GetOSWindowHandle()` + Win32 `SetWindowPos(HWND_TOPMOST)`.
  **verify** whether `SWindow` exposes an always-on-top flag at runtime (it is a construct-time arg).
- Drag: custom hit-test zone (`SWindow` `GetWindowZoneForPoint` / title area) — **verify**.
- FPS: `t.MaxFPS 20` or `GEngine->SetMaxFPS`; background: `t.IdleWhenNotForeground 0` must stay 0 or the sim stalls — **verify**.
- Minimised: `UGameViewportClient::bDisableWorldRendering = true` — **verify**; audio: `[Audio] UnfocusedVolumeMultiplier=1.0` — **verify**.
- DPI: `FPlatformApplicationMisc::GetDPIScaleFactorAtPoint` — **verify**.
- Effort (PROPOSED): window switch 3 d, profile + minimise 2 d, position/DPI 2 d, audio bed 3 d, UI 2 d = **~12 dev-days**.

## Cross-References
00 §2 H4, §9 D2; 01 (`PhaseKey`); 02 (decel, swell); 03 (`RegionId`, `TransitionBand`, R2 weather); 04 (fishing
tick, cargo-full); 07 (settings, autosave); 09 (render budget, crew idles); 10 (tokens, input map).

## Acceptance Criteria
1. (H4) In compact on reference PC (GTX 1660 / R5 3600, 1080p, 100% DPI), 5-min Insights capture: GPU ≤10%,
   game-process CPU ≤5% averaged, RAM ≤1.5 GB; compact GPU ≤25% of full-mode GPU.
2. Window is exactly 512×320 DIP and cannot be resized; at 150% scale it is 768×480 physical.
3. Over 10 enter/exit cycles the Full window returns to its prior mode/resolution/monitor every time.
4. With boat in R1 `ZoneId` and hold not full, `CargoLoad` increases while compact is minimised for 5 min (matches doc 04 rate ±10%).
5. When `CargoLoad = CargoCapacity` catches stop, bell plays exactly once, no further prompts; boat stays within 5 m of its hold point for 30 min (02 AC7), cosmetic circling ≤3 m — also when entered inside the swell band.
6. No code path in compact moves the boat, returns, or sells (code review + 30-min soak).
7. Ambient bed audible while minimised; R1→R2 crossing changes layer mix continuously (no step >3 dB).
8. (H4 playtest) ≥50% of testers use compact ≥5 min; ≥60% rate ambient audio ≥4/5.

## Open Questions
1. ~~Doc 04 rate at `BoatSpeed = 0`~~ CLOSED by D6: `BoatSpeedFactor` = 1.0 at speed 0 (doc 04).
2. Should the compact window have its own close/quit button, or rely on OS close? (PROPOSED: no extra button.)
3. Hold-full bell default ON or OFF? Owner taste call.
4. Should `Pin` default ON (feels like a widget) or OFF (less intrusive)?
5. ~~R2 weather visual: fog or light rain~~ CLOSED by D8: `Drizzle` (03 owns); the Rain layer ships in the prototype for R2.

## Interface values
| Value | Number / name | Consumer |
|---|---|---|
| `ViewMode` | `Full` / `Compact` | 01, 10 |
| Compact window | 512×320 DIP, fixed | 09, 10 |
| `CompactFpsCap` | 20 fps (minimised: render off, sim ≥10 Hz) | 09, 04 |
| `CompactRenderScale` | 0.75 | 09 |
| Compact boat speed | 0 m/s; `PushVec` 0; circling ≤3 m, yaw ≤±10°, within 5 m / 30 min | 02, 04 |
| `BoatSpeedFactor` at 0 m/s | 1.0 (D6, owner 04) | 04 |
| Perf targets | GPU ≤10%, CPU ≤5%, RAM ≤1.5 GB | 00 H4, 09 |
| Audio layers | Waves, Swell, Wind, Gulls, HarbourLife, Rain, Crew (+Storm reserved) | 03, 09 |
| Toggle key | F9 / gamepad View hold 0.6 s | 10 |
