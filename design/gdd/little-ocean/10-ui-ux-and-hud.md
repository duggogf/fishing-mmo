# Little Ocean — 10 UI/UX and HUD

> **Status**: In Design · **Author**: ux-designer (agent A5) for owner · **Last Updated**: 2026-11-26 · **Last Verified**: 2026-11-26
> **Implements Pillar**: P1, P2, P3, P4 · Supports **H1** (first sale ≤8 min), **H3** (paper), **H4**
> Sources: brief §6, §9, §12; 00-direction §5 A5, **§9 D1–D4 (override)**; painted-cel UI spec (vfx-and-ui.md §UI).

## Summary
A quiet, corner-anchored HUD (cargo, Shells, crew, compass/region), two harbour screens reachable in ≤2 clicks,
a crew panel, a "seen" journal, paper-only chat/ping mock-ups, a hint-led first 10 minutes, and a KB/M + gamepad map.
> **Quick reference** — Layer: `Presentation` · Priority: `MVP` · Key deps: 01, 03, 04, 05, 06 (paper), 08, 09

## Overview
UI exists to get out of the way of the sea (P1). The HUD shows only what a captain on holiday needs: how full is
the hold, how many `Shells`, is the crew fishing, where am I. Everything else lives one key away. No timers, no
red badges, no daily prompts (P3, brief §12). Fishing has no input of any kind (P2, **CONFIRMED brief §12**).

## Player Fantasy
"I glance at a little paper card in the corner — hold nearly full, Mabel and Pip still at it — and I keep looking at
the horizon." Panels feel like warm paper notes pinned to a boat, never a dashboard.

## Detailed Design

### Core Rules
1. **Visual language (CONFIRMED painted-cel spec)**: opaque Paper Cream `#FFF6E3` beans, Cocoa `#6B4A35` 3 px
   frame at 1080p, soft Wisteria shadow 3 px; text Aubergine Ink `#33273B`; primary pom = Cocoa fill + cream
   text; confirm pom = Collar Crimson + cream text; crew icons are faceless blocky dummies (D7); one rounded sans, 2 weights, body
   32 px, floor 28 px at 1080p. Exact hex for Wisteria/Collar Crimson and region accents: doc 09.
2. **UI is ActsLayer-adjacent** (it responds) but is 2D Slate/UMG, not post-processed by Kuwahara (PROPOSED).
3. **Depth rule**: any harbour action ≤2 clicks from walking up to the counter (CONFIRMED §5 A5); the one exception is doc 05's single confirm step for purchases ≥ 100 Shells (D8).
4. **No nagging (CONFIRMED §5 A5)**: no repeating prompts, no "you could be earning" text, no badge counters.
5. **HUD hides** in harbour screens and auto-fades to 40% after 8 s of no change while Sailing (PROPOSED;
   any value change restores 100% for 4 s). Toggle full hide: `H`.

### HUD (Full view, 1920×1080 reference)
```
+--------------------------------------------------------------------------------------------+
| [fish] [======== cargo ====    ] 28/40     ( N --- R1 Shallows --- E ---(o)ping 240 m )  [shell] 1,240 |
|  cargo bean 420x72                         compass strip 640x56, region label 28 px      Shells bean 220x72 |
|                                                                                            |
|                                   (open sea)                                               |
|                                                                                            |
| [#1 dummy]Mabel [#2 dummy]Pip [#3 dummy]Tomo  <- 48x64 icon + slot glyph + name, state glyph |
| crew bean 420x96 (2 or 3 entries)                                        [hint bean, rare] |
+--------------------------------------------------------------------------------------------+
```
- **Cargo** (`CargoLoad`/`CargoCapacity`, doc 04): bar + numerals; at full shows box-lid icon + "Hold full".
  Fill in Cocoa on cream; never colour alone (icon + text).
- **Shells** (`Shells`, doc 05): integer with thousands separator; +N pop on sale only (3 drawings).
- **Crew status** (D4, D7, doc 04/09): per `CrewSlot` a faceless blocky dummy icon (front view, 48×64 px) filled
  with that `CrewId`'s body/shirt/pants colour triplet (doc 09), **plus** a slot-number glyph (#1/#2/#3 = deck
  station, doc 09), **plus** the name label (28 px). State glyph stays: rod = fishing, cup = resting (`HoldFull`
  or Harbour), dots = not in `ZoneId`. Identity never depends on colour alone (name + slot number always shown).
  Hover/focus adds `CrewMember.Efficiency` as words. Starter: Mabel, Pip; Tomo appears with `Crew_2` (D5).
- **Compass/region**: heading strip with N/E/S/W, harbour icon always shown; `RegionId` display name centred;
  changes after crossing 50% of `TransitionBand` (doc 03). Discovery icons appear once seen.

### Harbour screens (Docked)
Walk/sail into the counter trigger → prompt "E / (A) Talk". Click 1 opens screen; click 2 sells / buys. Purchases ≥ 100 Shells add one confirm click (doc 05, D8).
```
FISHMONGER (bean 900x600)                       SHIPWRIGHT (bean 900x600)
+--------------------------------------+        +----------------------------------------+
| (portrait) "Fine catch today!"       |        | (portrait) "What'll it be, captain?"   |
| Sardine     x12   @ [BaseValue] =  N |        | [icon] Bigger Hold  Hold_2   [cost] (Buy)|
| Mackerel    x9    @ ...          =  N |        | [icon] Second Hand  Crew_2   [cost] (Buy)|
| ...  (scroll if >6 rows)             |        | [icon] Keel  "Push through the swell"  |
|--------------------------------------|        |        Opens: R2_Swells   [cost] (Buy)|
| Total: 1,240 Shells   (Sell all)     |        | owned = stamp "Fitted"; short = greyed |
|                       (Close)        |        |  + "Need N more Shells" (no nag)       |
+--------------------------------------+        +----------------------------------------+
```
- Sell is all-or-nothing in prototype (PROPOSED — no per-fish micro-management, P1). Prices from doc 05, no
  dynamic pricing (brief §12). Fish shown as inked cel icons (P5).
- Upgrade rows: max 4 (doc 05 owns ids/costs). The gate upgrade names the place it opens (P3: "opens places").
- Buy (doc 05 owns, D8): purchases < 100 Shells (`Hold_2` 60, `Crew_2` 90) = 1 click, no confirm; purchases ≥ 100 Shells (`Keel` 250, `Hold_3` 300) = Buy + one confirm pom ("Fit the Keel for 250 Shells?" Fit / Not yet). No undo.
- Wireframe note: on the `Keel` and `Hold_3` rows, (Buy) opens the confirm pom (Collar Crimson, rule 1) over the shipwright bean; `Hold_2` and `Crew_2` rows buy immediately.

### Crew panel (`C`) and Discovery journal (`J`)
```
CREW (bean 760x420)                              JOURNAL (bean 760x520)
+---------------------------------------+        +--------------------------------------+
| [#1 dummy] Mabel [swatch] "Hums, taps foot" |  | Fish seen 7/11   Places 2/5          |
|        Fishing · Steady hands         |        | [cel] Sardine  R1   [silhouette] ??? |
| [#2 dummy] Pip   [swatch] "Waves at gulls"  |  | [cel] Old Wreck  R1 "seen 14 min"    |
| [#3 dashed] Tomo — comes with Crew_2  |        | tabs: (Fish) (Places)                |
+---------------------------------------+        +--------------------------------------+
```
Crew panel is read-only at sea; the 3rd slot comes from `Crew_2` at the shipwright (D5, doc 05). Flavour lines
describe poses/idle actions, never faces (D7). Efficiency shown as words
("Steady hands" etc.; mapping in doc 04), not a number, to avoid optimisation framing (P3). Journal is a "seen"
list only (00 §3 OUT); undiscovered = flat silhouettes.

### Chat and encounter ping — MOCK-UP ONLY (CONFIRMED owner D3: not built)
```
CHAT (bottom-left above crew, bean 520x220)      PING (compass + world)
| Ana: whales by the lighthouse!   |              compass: (o) whale glyph + "Whale pod 240 m"
| Kai: omw                         |              world: ink ripple ring on twos at source
| [Type message... 140 chars] (Send)              expiry: ring thins over last 20 s, glyph fades
```
Purpose: paper-test props for doc 06's protocol; draw as printed cards. Rules to carry into a build: Enter opens
input, Esc closes; chat fades after 10 s; mute per player in hangout list; ping subtitle "Whale pod spotted —
NE, 240 m" (text callout, colourblind-safe glyph shape). Rate/length/expiry values: doc 06.
**Solo whale ping state (BUILT; loop-1 ruling 5)**: offline `IEncounterBroadcast` local timer (first 10–15 min,
then every 20–30 min; doc 06) fires the same compass marker, world ripple, subtitle and expiry — with **no chat
line** and no sender name. Reward = journal entry only. This is the only ping UI implemented in the prototype.

### Onboarding — first 10 minutes (target first sale ≤8 min, H1)
| t (min) | Moment | UI behaviour |
|---|---|---|
| 0:00 | Docked, crew wave (named cels) | Hint bean: "W/S throttle · A/D steer" (gamepad glyphs if pad) |
| 0:45 | Leave harbour | Hint fades on first throttle; compass highlights region name once |
| 1:30 | Enter R1 `ZoneId` | Crew glyph → rod; one-line hint "Your crew fishes on their own. Enjoy the view." |
| ~1:42 | First catch (12 s after zone entry, doc 04) | Catch pop (cel fish) + cargo bar fill; journal toast "New fish seen" (2 s, once/species) |
| ~5:56 | Hold full | Crew → cup; hint "Hold full — head home to sell" with harbour arrow on compass (once) |
| ~6:41 | Docked (45 s back) | Counter prompt pulses once; Fishmonger → Sell all |
| ~6:56 | First sale (≈ 6.9 min, doc 01 owns) | Shells +N pop; hint "The shipwright can fit upgrades" (once) |
| ~7–10 | Shipwright | Show Keel row with "Opens: R2_Swells"; mention `F9` companion mode once |
Rules: each hint shows once, max 1 on screen, dismiss on action or 8 s; "Hints off" in settings. No tutorial gates.

### States and Transitions
HUD state follows `PhaseKey`: `Sailing`/`Returning` → full HUD; `Docked` → HUD + counter prompts; `Selling`
→ HUD hidden, screen open (shipwright is a sub-screen of `Selling`). `ViewMode = Compact` (overlay, not a
`PhaseKey`) → doc 08 bar only. Screens stack depth ≤1 (no screen opens another).

### Interactions with Other Systems
Reads: 04 (`CargoLoad`, `CargoCapacity`, crew state, names), 05 (`Shells`, prices, `UpgradeId` costs),
03 (`RegionId`, discoveries, `TransitionBand`), 01 (`PhaseKey`), 06 (paper chat/ping rules), 08 (`ViewMode`).
Writes: sell/buy requests to 05; settings to 07.

## Formulas
- **Cargo fill %** = `CargoLoad / CargoCapacity` × 100, bar width = 260 px × fill. Example 28/40 → 70% → 182 px.
- **UI scale** `S = clamp(ViewportHeight / 1080 × UserTextScale, 0.75, 2.0)`; text px = 32 × S, never < 28 at
  S = 1. Example 1440p, UserTextScale 1.0 → S 1.33 → body 43 px.
- **Ping distance label** = round(distance_m / 10) × 10 m; hide when <20 m.

## Edge Cases
- Hold full while in Harbour: cup glyph, no hint. · Buy with insufficient Shells: button disabled + "Need N more".
- All upgrades owned: shipwright says "She's ship-shape" ; rows stamped "Fitted".
- Sell with empty hold: Sell all disabled, label "Nothing to sell".
- Crew slot empty (3rd slot before `Crew_2`): dashed dummy outline + "#3 — comes with Crew_2".
- Solo whale ping fires while a harbour screen is open: marker queues until the screen closes, if not yet expired.
- Gamepad disconnected mid-screen: glyphs switch to KB/M on next input; no pause.
- Ultrawide 21:9: HUD anchors to 16:9 safe centre ±10% (PROPOSED); 4:3 not supported.
- Opening journal during swell push-back: allowed; the boat is already throttled by doc 02.

## Dependencies
Hard: 04, 05, 03, 01, 09 (hex tokens, fish/crew cels), 08. Paper: 06. Each must list 10 as a consumer.

## Tuning Knobs
| Knob | Default | Safe range | Affects |
|---|---|---|---|
| `HudFadeDelay` | 8 s | 4–20 s | calm vs at-a-glance |
| `HudFadeAlpha` | 0.4 | 0.2–1.0 | visibility of HUD |
| `UserTextScale` | 1.0 | 0.85–1.5 (floor 28 px holds) | readability |
| `HintDuration` | 8 s | 5–15 s | onboarding pace |
| `ChatFade` (mock) | 10 s | 5–30 s | chat clutter |

## Visual/Audio Requirements
Motion: pop 110% → 100% over 3 drawings, press squash 92%, ≤200 ms; transitions = pom iris/halftone wipe.
Sounds: soft paper "pap" on open, wooden knock on buy, coin-shell rattle on sale; no alarm sounds.
Flash rule: ≤3 luminance flashes/s.

## Game Feel
Sell all = one satisfying rattle + numbers counting up 0.6 s (skippable by click). Nothing waits on the player.

## UI Requirements
### Input map
| Action | KB/M | Gamepad (Xbox labels) |
|---|---|---|
| Throttle / steer | W/S, A/D | LT/RT, Left stick |
| Anchor | Space | B |
| Camera orbit / zoom | RMB drag / wheel | Right stick / RS click cycle |
| Interact (counter) | E | A |
| Crew / Journal | C / J | View → tabs |
| Companion mode | F9 | Hold View 0.6 s |
| Hide HUD | H | D-pad down |
| Chat (mock) | Enter | — (POST-PROTOTYPE on-screen keyboard) |
| Menu / back | Esc | Menu / B |
All remappable (Enhanced Input user mappings). No fishing action exists on any device (P2).

### Accessibility baseline
- [x] Keyboard-only and gamepad-only complete the full H1 loop (focus ring: 4 px Aubergine outline).
- [x] Text: 32 px body, 28 px floor, `UserTextScale` up to 1.5; ink on cream ≥13:1.
- [x] Not colour alone: cargo full (icon+text), crew identity (name + slot number, colour swatch is extra), crew
  state (glyph), ping (shape + text), buy state (stamp/label).
- [x] Colourblind: no red/green pairs; validate with Deuteranopia/Protanopia/Tritanopia filters.
- [x] Subtitles/captions: ping callouts and crew one-liners as text; audio-only cues get a caption.
- [x] Reduce flashes / Reduce motion toggles (disable pop scale, halftone → cut). Remap all inputs.
- [x] UI scales 720p–4K via `S`; hold-to-confirm never required.

## Cross-References
00 §5 A5, §9 D1–D7; reviews/loop-1 rulings 5–7; 01 onboarding/loop; 03 regions/discoveries; 04 crew names/states; 05 prices/upgrades;
06 paper chat/ping; 08 compact bar; 09 colour tokens and cels. Effort (PROPOSED): HUD 3 d, harbour screens 3 d,
crew+journal 2 d, onboarding hints 2 d, input/remap 2 d, accessibility pass 2 d, solo whale ping UI 1 d = **~15 dev-days** (chat and multiplayer ping: 0, paper only).

## Acceptance Criteria
1. (H1) Sell all reachable in ≤2 clicks from counter prompt; upgrades < 100 Shells (`Hold_2`, `Crew_2`) in ≤2 clicks; upgrades ≥ 100 Shells (`Keel`, `Hold_3`) in exactly 3 (open, Buy, one confirm; doc 05) — verified by click count.
2. (H1) ≥75% of testers reach first sale ≤8 min with hints only (no verbal help).
3. Full loop playable with keyboard only and with gamepad only (QA run each).
4. All text ≥28 px at 1080p at `UserTextScale` 1.0; contrast ≥4.5:1 everywhere (≥13:1 body).
5. Cargo-full, crew state and ping are distinguishable in greyscale screenshots.
6. No UI prompt repeats more than once per trigger event in a 45-min session (log check).
7. Each crew entry can be identified in a greyscale screenshot by name and slot number alone (D7).
8. (H1/H3) Solo whale ping shows compass marker, subtitle and ripple with no chat line; first fire 10–15 min in.
9. (H3, paper) Chat/ping cards let ≥50% of paper-test players state ping direction and distance within 60 s.

## Open Questions
1. ~~`Keel` UpgradeId~~ CLOSED: `Keel` is now in §6.
2. ~~Buy without confirm~~ CLOSED by D8: doc 05 owns it; one confirm for purchases ≥ 100 Shells (`Keel`, `Hold_3`), one click below.
3. ~~Crew count~~ CLOSED by D5: 2 crew at start (Mabel, Pip), 3 with `Crew_2` (Tomo); HUD supports 2–3.
4. Should crew efficiency ever be shown as a number (e.g. tooltip)? PROPOSED: no.
5. Should the HUD auto-fade at all (calm) or stay fixed (glanceable)? Validate by H1 observer notes.

## Interface values
| Value | Number / name | Consumer |
|---|---|---|
| HUD elements | Cargo bean, Shells bean, Crew bean (2–3 dummy icons + slot # + name + state glyph), Compass+region strip | 04, 05, 03 |
| Harbour depth | ≤2 clicks; screens 900×600 at 1080p | 05 |
| Type | body 32 px, floor 28 px at 1080p; scale 0.75–2.0 | 08, 09 |
| Colour tokens | #FFF6E3, #6B4A35, #33273B (+Wisteria, Collar Crimson from 09) | 08, 09 |
| Crew glyph states | fishing / resting / not-in-zone | 04 |
| Region label switch | at 50% of `TransitionBand` | 03 |
| Ping distance | rounded to 10 m, hidden <20 m (MP mock; solo whale ping built) | 06, 03 |
| Crew icon | 48×64 px dummy, colour triplet from 09, `CrewId` name | 04, 09 |
| Companion toggle | F9 / hold View 0.6 s | 08 |
