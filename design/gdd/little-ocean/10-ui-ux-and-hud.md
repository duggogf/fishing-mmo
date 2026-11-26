# Little Ocean — 10 UI/UX and HUD

> **Status**: In Design · **Author**: ux-designer (agent A5) for owner · **Last Updated**: 2026-11-26 · **Last Verified**: 2026-11-26
> **Implements Pillar**: P1, P2, P3, P4 · Supports **H1** (first sale ≤8 min), **H3** (paper), **H4**
> Sources: brief §6, §9, §12; 00-direction §5 A5, **§9 D1–D4 (override)**; painted-cel UI spec (vfx-and-ui.md §UI);
> **owner UX pass 2026-11-26** (desktop scale, no crew HUD, action bar, activity log); references listed in §References.

## Summary
A small, desktop-scaled HUD: cargo and Shells in the top corners, a thin compass at top centre, an action bar of
key prompts at bottom left with a quiet activity log / chat box above it. Persistent HUD covers ≤3% of the screen.
Three harbour places with one job each (Fishmonger sells, Shipyard fits and paints, Inn crew board hires), a crew panel, a "seen" journal, paper-only multiplayer chat, a
hint-led first 10 minutes, and a KB/M + gamepad map.
> **Quick reference** — Layer: `Presentation` · Priority: `MVP` · Key deps: 01, 02, 03, 04, 05, 06 (paper), 08, 09, 11

## Overview
UI exists to get out of the way of the sea (P1). While sailing the HUD shows only what changes a decision right
now: how full the hold is (go home?), how many `Shells` (what can I buy?), and where the harbour is. Everything
else is one key away, and the keys are always shown in the action bar so nothing has to be memorised. The crew
is read from the deck itself (D4: they are visible on the boat) and from the activity log, not from a HUD list.
No timers, no red badges, no daily prompts (P3, brief §12). Fishing has no input of any kind (P2, **CONFIRMED
brief §12**).

## Player Fantasy
"The screen is mostly sea. A small count in the corner tells me the hold is nearly full; a line drifts up in the
corner — *Pip landed a Mackerel, new!* — and fades. I look at the horizon again." Screens feel like a paper
note handed across a counter, never a dashboard.

## Detailed Design

### Core Rules
1. **Desktop scale (owner UX pass)**: the game targets a PC monitor at desk distance, 1080p reference. Text sizes
   follow the Xbox Accessibility Guideline 101 PC/VR minimum (18 px body height at 1080p), not the 26–28 px
   console/TV (10-foot) values the first draft used. Type scale, sizes and scale formula: §Formulas, §Interface values.
2. **Attention follows relevance (owner UX pass, `/clean-ui`)**: every HUD element is in one state at a time, chosen
   by what the player is doing. Plates are a *focus signal*, not a legibility crutch.
   - **Hidden**: not drawn (reachable by Inspect or its own screen).
   - **Ambient** (default at sea): no plate, no outline, no shadow. Cream `#FFF6E3` glyphs at 92% so the HUD reads as
     printed into the scene, not floating above it (owner pass). Keyboard keycaps are always **solid** cream chips with
     ink letters, so the controls read at a glance. No motion while values are static. Legibility risk: §Formulas F3.
   - **Focused**: Ink Glass plate (Aubergine Ink `#33273B` at 70%, radius 10 px), scale 1.2× from its anchor corner,
     eases in over 150 ms with no bounce. It needs a named trigger and exit (§HUD relevance matrix).
   - **Interruptive**: none in normal play.
   - **Screens and dialogs = Paper**: opaque Paper Cream, 2 px Cocoa `#6B4A35` frame, radius 14 px, one soft
     shadow (0 4 16 px, Ink 25%); text Ink. Primary button = Cocoa fill + cream text; confirm = Collar Crimson
     `#D02A45` + cream text. Exact hex for Wisteria/Collar Crimson and region accents: doc 09.
   - No decorative bevels, sticker outlines, stacked shadows or oversized pills; one corner radius family (10/14).
3. **Show it only when it changes a decision** (owner UX pass). Each HUD element must answer a question the
   player has *while sailing*. Not shown on the HUD: crew list, crew state, efficiency, region name (except on
   entry), fish counts by species, save state beyond the 1 s buoy (07).
4. **UI is ActsLayer-adjacent** (it responds) but is 2D Slate/UMG, not post-processed by Kuwahara (PROPOSED).
5. **Depth rule**: any harbour action ≤2 clicks from walking up to the counter (CONFIRMED §5 A5); the one exception
   is doc 05's single confirm step for purchases ≥ 100 Shells (D8).
6. **No nagging (CONFIRMED §5 A5)**: no repeating prompts, no "you could be earning" text, no badge counters.
7. **Inspect**: hold `F` / `LB` and every HUD element is Focused (including Shells) for as long as it is held. `H` hides
   all. Settings → Accessibility → HUD style: **Ambient** (default), **Outlined** (ink outline on glyphs) or **Always backed**
   (plates on every element).

### HUD relevance matrix (sailing contexts; `/clean-ui` method)
H = Hidden · A = Ambient · F = Focused. Each non-default cell names its trigger → exit.

| Element | Sailing (rest) | Hold just filled | Docked at a counter | In a harbour screen | Chat open | Inspect held |
|---|---|---|---|---|---|---|
| Cargo | **A** ("go home yet?") | **F** 6 s · hold hits 100% → 6 s | A | **F** in Fishmonger only; H elsewhere | A | F |
| Shells | **H** (no decision at sea) | H | A | **F** · screen opens → closes | H | F |
| Shells change | `+N` lift 2 s, then back to its state | | | lift | | |
| Compass | **A** ticks + letters, no strip | A, harbour marker brightens until docked | H | H | A | F |
| Ping marker | **F** amber marker + subtitle 6 s → A marker | | | queued | | |
| Region name | **H**; F 6 s on crossing 50% of `TransitionBand` | | | | | F |
| Speed | **H**; A while the throttle changes (+3 s); A "Anchored" while anchored | | | | | F |
| Action prompts | **A** outlined keycaps | A | **F** `E` Talk chip · enter trigger → leave | **F** screen prompts | F (Enter send · Esc close) | — |
| Activity log | **A** lines fade 12 s; nothing when idle | A line "Hold full" | A | H (queued) | **F** box + history + input · Enter → Esc/send | A |
| Log history | H | H | H | H | F | — (hover / `L` / D-pad up opens it: F) |
| Hint pill | **F** once each · trigger → action or 8 s | | | | | — |
| Crew info | **H** (diegetic: crew pose on deck; `C` panel) | H (crew visibly rest) | H | F at the Inn crew board | H | H |

Budget: at rest, Focused = 0; per screen region ≤ 1 Focused element; Interruptive = 0.

### HUD (Sailing, 1920×1080 reference)
```
+--------------------------------------------------------------------------------------------------+
| fish ═══─── 23/32                    ı · N · ı · ⌂ · E · ı                                           |
|  cargo (Ambient)                   compass ticks (Ambient)              [Shells: Hidden at sea]   |
|                                      The Shallows   <- on region entry only (6 s)                |
|                                     (open sea, ≥98% of the frame, no plates)                     |
| Pip landed a Mackerel · new          <- log lines, Ambient, fade 12 s           6 kn ▮▮▮▯▯ (A, 3 s)|
| W A S D Sail   Space Anchor   M Map   F Inspect (hold)   Tab Menu    <- prompts (A), keycaps solid |
+--------------------------------------------------------------------------------------------------+
```
- **Cargo** (top-left, `CargoLoad`/`CargoCapacity`, doc 04): fish icon 24 px + bar 120×8 + count `23/32` (18 px,
  tabular). At full: box-lid icon replaces the fish, bar stripes, count becomes "Full" (icon + word, never colour
  alone) and the element is Focused for 6 s. A landed fish shows a `+1` that rises 12 px and fades over 0.8 s.
- **Shells** (top-right when shown, doc 05): shell icon 24 px + integer 20 px/700. Hidden at sea; `+N` lift on a
  sale; Focused in the Fishmonger, Shipyard and Inn screens; shown by Inspect.
- **Compass** (top-centre, 420 wide): ticks and cardinal letters 15 px, 18 px markers (harbour always, discoveries
  once seen, Beacon Amber ping). No strip at rest. **Region name** (18 px/700) shows for 6 s on entry, then hides.
- **Speed readout** (bottom-right, doc 02): `6 kn` + 5-notch throttle ladder, Ambient, only while the throttle
  changes and 3 s after; "Anchored" stays while `Anchored`.
- **Action prompts** (bottom-left): one row of key/button glyph + verb (18 px/700, gap 20 px). Keycaps 24 px, always
  solid cream with ink letters; gamepad discs keep their letter inside (A green, B red, X blue, Y yellow) so they read without colour.
  - Sailing: `WASD` Sail · `Space` Anchor · `M` Map · hold `F` Inspect · `Tab` Menu (Ambient). Gamepad: `LS` Sail ·
    `Y` Anchor · `View` Map · hold `LB` Inspect · `Menu` Menu. Chat (`Enter`) is not on the bar: it is multiplayer-only
    (paper, D3) and a log line teaches it the first time someone speaks.
  - Docked at a counter: `E` Talk appears first as a Focused cream chip until used.
  - Inside a screen: the bar shows that screen's prompts and is Focused (plate).
  - Every item is also a mouse button (hover = Focused). Settings → Action bar: Full · Context only · Off.
- **Activity log + chat** (bottom-left, above the prompts, ≤440 px wide, ≤6 lines):
  - Ambient: each new line appears as plain cream text (no box, no outline), stays 12 s, fades over 1 s. No box, ever, unless asked.
  - Hover, `L` or D-pad up: history box (Focused, Ink Glass) with the last 20 lines and tabs `All · Crew · Chat`;
    closes on mouse-out / `L` / 4 s idle.
  - **Enter: chat box** (Focused): history + 32 px input row; Enter sends, Esc closes back to Ambient lines.
    MOCK-UP ONLY for multiplayer (D3). Rate/length values: doc 06.
  - Lines are 18 px, 24 px leading, max 2 lines each; crew lines start with the crew name in bold.
  - **Log events (BUILT, solo)**: first catch of each species this trip, new species ("· new" + journal), Uncommon+
    catch, hold half and full, region entered, discovery seen, sale total, hull bought, crew hired, cosmetic earned,
    whale pod ping, crew stopped fishing (left `ZoneId`). Routine catches are **not** logged (F5).
  - Rate cap: ≤1 new line per 3 s; queued lines of the same type merge ("Mabel and Tomo landed Sardines").
- **Hint pill** (onboarding / swell toast, doc 02 rule 8): bottom-centre, 112 px above the edge, Focused, max one.
- **Footprint at rest**: no plates; glyph bounds of cargo + compass ticks + prompts ≈ 1.6% of the frame (F4),
  down from 2.2% (plated) and 7.5% (first draft).

### Harbour: one place, one verb (owner UX pass, D9)
The harbour has one place for each job, so the player's mental map is the quay itself: **Fishmonger** sells,
**Shipyard** fits and paints the boat, **Inn crew board** hires. None of these screens shows another one's job.
Walking or sailing into a counter trigger puts `E` Talk first in the action bar. Screens are Paper panels, the world
is dimmed 30%, and the action bar shows the screen's own prompts. Depth: selling ≤2 clicks; hiring ≤2 (+1 confirm
when ≥100); buying a fitted-ready item ≤2 (+1 confirm when ≥100; doc 05, D8). Close is always `Esc` / bar Back,
with no ✕ button.

#### Fishmonger — sell only (paper 600×420)
```
+------------------------------------------------+
| Fishmonger                     "Fine catch!"   |
|------------------------------------------------|
| [fish] Sand sprat      ×9     2    18          |
| [fish] Harbour mackerel×6     3    18          |
| [fish] Blue wrasse     ×3     5    15  · new   |
| ...  rows 40 px, 20 px text, scroll after 6     |
|------------------------------------------------|
| 20 fish                      Total 71 Shells   |
|                               [ Sell all ]     |
+------------------------------------------------+
 action bar: [E] Sell all   [Esc] Back
```
- All-or-nothing sale (PROPOSED, P1). Prices from 04/05, fixed (brief §12). Fish as inked cel icons 28 px.
- After the sale the panel becomes a 1.5 s summary ("+71 Shells", count-up 0.6 s), then closes itself. Click skips.
- Empty hold: rows replaced by "Nothing to sell yet", button disabled.

#### Shipyard — fit and paint (full-screen view, docs 11)
The one screen that takes over the frame, because the boat itself is the interface.
```
+------------------------------------------------------------------------------------------------+
| Shipyard        ( Fit ) ( Paint ) ( Decor )                                  [shell] 286        |
|                                                                                                 |
|   [ 3D boat, 3/4 view, slow turntable; slots drawn as         | Hull                           |
|     inked outlines on the deck: S S M (Skiff) / S S M M L +   |  ( Skiff · owned )  ( Cutter 180) |
|     keel mount (Cutter). Fitted items are the real models. ]  |--------------------------------|
|                                                               | Shed & catalogue               |
|   Load  [==============------]  180 / 200 kg                  |  [ic] Fish crate  S 40 kg  shed |
|   Hold 32 → 26 · Crew 2 → 3        <- delta line, changes only|  [ic] Bunk  S 60 kg  40   (Buy) |
|   "20 kg too heavy for the Skiff"  <- reason line when blocked|  [ic] Swell keel  keel 220 kg 70|
|                                                               |      Needs a keel mount (Cutter)|
|                                                     [Cancel] [Done] |
+------------------------------------------------------------------------------------------------+
 action bar: [Click] Pick  [Drag] Fit  [R] Remove  [Tab] Next tab  [Esc] Cancel  [Enter] Done
```
- **Layout**: boat preview left ~60% (orbit with RMB, no zoom needed); right rail 560 px: Hull row, then one list
  that merges owned items in the shed and items for sale (price + Buy). Items that cannot fit right now still show,
  with the reason in words.
- **Fitting**: drag an item onto a slot, **or** click/A the item then click/A a slot (keyboard/gamepad path).
  Invalid slots dim and show the reason on hover. A fitted item clicked on the boat offers Remove (to shed).
- **Load bar** is the only meter: Cocoa fill on cream, numeric `180 / 200 kg`, and the over-limit part drawn as a
  hatched overflow + words (never colour alone).
- **Delta line** shows only values that change. No stat sheet, no DPS-style comparisons (P3).
- **Buying** from the list: < 100 Shells = one click (Buy → shed → auto-proposes a slot, accept with one click);
  ≥ 100 (Cutter, DeepHold, bow ornaments) = Buy + one confirm (doc 05, D8). Hulls: Buy + confirm, then "Switch
  to the Cutter?" is the same confirm ("Buy and switch").
- **Done** commits and saves; **Cancel** reverts every pending fit (purchases stay — they are already in the shed).
- **Paint tab**: same preview; right rail has part tabs (Hull · Trim · Sail · Pattern) with a 4-column grid of 56 px
  swatches. Hover = live preview with a brush wipe. Locked swatches show a price or the discovery that earns them
  ("Seen the Marigold wreck"). Owned = free to apply.
- **Decor tab** (doc 11 §Decor): the boat shows its decor points as small rings (Skiff 5, Cutter 7: masthead, roof,
  rail, bow/figurehead, stern), and only in this tab. Click or press A on a ring: the rail lists the objects that fit
  that point (owned first, then price or "Seen: …"). Hover previews the object in place, click places it, R removes it
  to the decor chest. The selected ring is drawn solid with its label; the others stay as quiet outlines.
  Boat name is edited on the stern name board point (Cutter) or the name field at the bottom of the Decor rail.

#### Inn crew board — hire (paper 640×370)
```
+--------------------------------------------------+
| Crew board                          Berths 2 / 3  |
|--------------------------------------------------|
| [#1 Mabel]  [#2 Pip]   [ empty berth ]           |
|--------------------------------------------------|
| Looking for a boat:                              |
| [dummy] Tomo   "Points at whales before anyone"  |
|         Steady hands · 50 Shells      ( Hire )   |
+--------------------------------------------------+
 action bar: [E] Hire   [Esc] Back
```
- Shows the crew aboard as small dummies with names and slot numbers, plus the free berths (from 11's Bunks).
- No berth free: Hire disabled + "No free bunk. The shipyard can fit one." This is a pointer, not a nag, and it
  is not repeated elsewhere.
- One-off hire fee, no wages (00 §3). Candidates: Tomo only in prototype (D5). Crew waiting ashore (berth removed)
  are listed here as "Waiting at the Inn" and re-board automatically when a berth is free.

### Menu (`Tab`) — everything that is not a harbour job (owner pass, 2026-11-26)
One Paper screen with a tab row, over the dimmed world (solo: the world keeps running; the boat holds its throttle,
so the menu is safe to open anywhere). `Q`/`E` or `LB`/`RB` switch tabs; `Tab`, `Esc` or `B` close. Shortcuts that
open a tab directly (not shown in the action bar): `C` Crew, `J` Journal, `M` Map, `Esc` at sea → System.
Harbour jobs (sell, fit, paint, decorate, hire) are **never** in this menu; they belong to their places.

| Tab | Shows | Read-only? |
|---|---|---|
| **Cargo** | Fish in the hold by species (cel icon, name, count), `CargoLoad / CargoCapacity`, "Hold full" state. No prices or totals at sea (P3: no optimising; the Fishmonger shows value). | yes |
| **Ship** | The boat as she is: hull, fitted items per slot, load bar, decor summary, boat name. A line "Change her at the Shipyard" — no editing here. | yes |
| **Crew** | Per crew: 36×48 dummy + slot number + name 20 px + state glyph and word 18 px (rod "Fishing", cup "Resting", dots "Not in a fishing spot") + efficiency as words (04), flavour line (poses, never faces, D7). Crew waiting at the Inn listed as such. | yes |
| **Journal** | Fish · Places sub-tabs; "seen" list only (00 §3 OUT); undiscovered = flat silhouettes; "7 of 11 seen"; earned-cosmetic stamps (11). Selecting a place shows it on the Map tab. | yes |
| **Map** | Same chart as the full-screen map (below), inside the menu frame. | pin only |
| **System** | Resume · Settings · Companion window (F9) · Controls · Quit to desktop. Settings tabs: Display (UI scale 80–150%, Action bar Full/Context/Off), Audio, Controls (rebind, glyph style), Accessibility (text scale, reduce motion/flashes, hints off, HUD style Ambient / Outlined / Always backed). Changes preview live. | — |

Size: Paper 1280×760 centred (tab row 56 px; content 1232×660). Shells are Focused in the menu's top-right corner
(the menu is a "looking at my things" context). Clean-ui: the menu is one Focused screen; nothing else on screen
is Focused while it is open.

### Map (`M`) — the big chart (no minimap)
A full-screen painted sea chart, drawn like a captain's paper chart in the cel style: cream paper, ink coastline,
watercolour sea in two tones (Shallows warm, Swells cool), a hatched band for the `TransitionBand`, and the swell-buoy
line. It answers three questions: *where am I, where is home, where haven't I been?*

- **Shows**: your boat (ink arrow with heading, 32 px), the harbour (always), region names (`The Shallows`,
  `The Swells`), discoveries you have seen (their journal icons, 28 px, name on hover), an active whale-pod ping
  (Beacon Amber ring with its remaining time as a thinning ring, no number), and your pin.
- **Never shows**: undiscovered places (no "?" markers, no completion %), fish locations, other players (solo; MP
  paper only, D3), anything to optimise.
- **Swells before the keel**: the region is drawn and named, with a small keel glyph and "Needs a keel" on hover.
- **Pin**: one player pin (click / A). It appears on the compass as a cream marker; place again to move, R to
  clear. Sailing within 30 m clears it.
- **Navigation**: drag or right stick to pan, wheel or triggers to zoom (2 levels: whole sea, region), F / RS click
  to recentre on the boat. Opens centred on the boat.
- **Prompts** (Focused bar): `Click` Pin · `R` Clear pin · `F` Centre · `Wheel` Zoom · `M` Close. Esc also closes.
- Map bounds and positions come from 03 (1.6 × 1.6 km; harbour at the south edge). Chart scale at "whole sea":
  1600 m → 900 px (0.56 px/m); at "region": 1.5×.

### Encounter ping and chat — MOCK-UP ONLY except the solo whale ping (CONFIRMED owner D3)
- **Ping**: Beacon Amber whale glyph on the compass + subtitle under the compass "Whale pod · NE · 240 m" (18 px,
  6 s) + one log line + world ink ripple ring on twos at source. Expiry: ring thins over last 20 s, glyph fades.
- **Chat**: lives in the activity log box (above), never a separate window. Mute per player in the hangout list.
- **Solo whale ping (BUILT; loop-1 ruling 5)**: offline `IEncounterBroadcast` local timer (first 10–15 min, then
  every 20–30 min; doc 06) fires the same compass marker, subtitle, ripple and a log line with no sender name.
  Reward = journal entry only. This is the only ping UI implemented in the prototype.

### Onboarding — first 10 minutes (target first sale ≤8 min, H1)
The action bar already shows every key, so hints only explain *why*, never *which key*.

| t (min) | Moment | UI behaviour |
|---|---|---|
| 0:00 | Docked, crew wave on deck | Hint pill: "Sail out to find fish" (action bar shows `WASD` Sail) |
| 0:45 | Leave harbour | Hint fades on first throttle; region name shows once |
| 1:30 | Enter R1 `ZoneId` | Hint: "Your crew fishes on their own. Enjoy the view." |
| ~1:42 | First catch (12 s after zone entry, doc 04) | Cargo `+1`; log "Mabel landed a Sardine · new" |
| ~5:56 | Hold full | Cargo "Full"; log "Hold full, crew's resting"; hint "Head home to sell" + harbour marker pulses once |
| ~6:41 | Docked (45 s back) | Action bar inserts `E` Talk (highlighted) |
| ~6:56 | First sale (≈ 6.9 min, doc 01 owns) | Shells `+N`; log sale total; hint "The shipyard can fit a bigger hold" (once) |
| ~7–10 | Shipyard | Fish hold auto-proposed into the M slot; Swell keel row reads "Needs a keel mount (Cutter) · opens The Swells"; mention `F9` companion mode once |
Rules: each hint shows once, max 1 on screen, dismiss on action or 8 s; "Hints off" in settings. No tutorial gates.

### States and Transitions
HUD state follows `PhaseKey`: `Sailing`/`Returning` → world HUD + sailing bar; `Docked` → world HUD + `E` Talk;
`Selling` → world HUD hidden, screen open, bar shows screen prompts (Fishmonger, Shipyard and crew board are sub-screens of `Selling`).
`ViewMode = Compact` (overlay, not a `PhaseKey`) → doc 08 window only. Screens stack depth ≤1 (a confirm dialog
is not a screen).

### Interactions with Other Systems
Reads: 04 (`CargoLoad`, `CargoCapacity`, `OnFishLanded`, crew state, names), 05 (`Shells`, prices, `ItemId`/`HullId`
costs, hire fee), 03 (`RegionId`, discoveries, `TransitionBand`), 02 (`BoatSpeed`, throttle notch, `Anchored`, stall toast),
01 (`PhaseKey`), 06 (paper chat/ping rules), 08 (`ViewMode`). Writes: sell/buy requests to 05; settings to 07.

## Formulas
- **F1 Cargo fill** = `CargoLoad / CargoCapacity`; bar fill width = 120 px × fill × S. Example 26/32 → 0.81 → 98 px.
- **F2 UI scale** `S = clamp(ViewportHeight / 1080 × UIScale, 0.75, 2.0)`, `UIScale` 0.8–1.5 (default 1.0); every px
  in this doc is multiplied by S. Text px = base × S. Examples: 1440p, 1.0 → S 1.33 → body 27 px; 4K, 1.0 → S 2.0 →
  body 40 px; 1080p, 1.25 → body 25 px. At `UIScale` < 1.0 text may go below the 18 px floor by player choice
  (XAG 101 allows smaller at the player's discretion); the default never does.
- **F3 Legibility.** *Ambient* (no plate, no outline): cream text relies on the scene behind it. Contrast ratios assume
  a flat background, so this is checked by screenshot (AC 4): the brightest sky/foam and the darkest dusk frame, plus
  greyscale. **Known risk**: over white wake or foam (L > 0.85) cream text nearly vanishes (seen in the 2026-11-26 mock,
  where "Anchor" and "Menu" sat over the wake). Fixes to test in that order: (1) camera/placement keeps the bottom-left
  band off the wake; (2) luma-adaptive tint: glyphs shift toward Ink when the sampled background behind them is
  bright; (3) last resort: the outline returns as an accessibility option (HUD style "Outlined"). *Focused* (Ink Glass plate): composite C = α·Ink + (1−α)·B. Worst case B = white `#FFFFFF`, α = 0.70 →
  C ≈ `#6E6876`(sRGB 112/104/118, L ≈ 0.15) → cream `#FFF6E3` (L ≈ 0.92) ratio (0.97)/(0.20) ≈ **4.9:1** ≥ 4.5:1.
  α = 0.62 gives ≈ 3.9:1 and fails, so 0.70 is the floor.
- **F4 HUD footprint at rest** = Σ(glyph bounds of Ambient elements) / (1920×1080). Cargo ≈ 200×24 (4.8k) + compass
  ticks/letters ≈ 420×22 (9.2k) + prompts ≈ 760×24 (18.2k) = 32.2k px² → **1.6%**, of which the eye-catching mass is
  smaller still because nothing is a filled block. Shells hidden. Budget ≤3% (Tuning Knob). Plated version was 2.2%.
- **F5 Log line rate** (why routine catches are not logged): catches/min = Σ crew rate = 2.5 × 3 = 7.5/min → one
  line every 8 s, above the ≤1 per 3 s cap and well above a "calm" rate. Logged events average ≈ 1 per 40 s in
  the 45-min H1 session estimate (≈ 11 species firsts + 4 half/full + ~4 sales + regions/discoveries/pings).
- **Ping distance label** = round(distance_m / 10) × 10 m; hide when <20 m.

## Edge Cases
- Hold full while in Harbour: cargo shows "Full", no hint, no log line repeat.
- Buy with insufficient Shells: button disabled + "Need N more". Sell with empty hold: Sell all disabled, "Nothing to sell".
- Everything owned and fitted: the Shipyard list says "She's ship-shape"; owned rows read "Fitted" or "In the shed".
- No 3rd crew yet: the crew panel lists only hired crew; the crew board shows an empty berth only once a Bunk is fitted (11).
- Log line arrives while a screen is open: it queues and shows (≤3 lines, merged) when the screen closes.
- Log box open (hovered) when lines expire: they stay listed in the open box; the 12 s fade only applies when closed.
- Solo whale ping while a harbour screen is open: marker queues until the screen closes, if not yet expired.
- Action bar at UIScale 1.5 (≈ 720 px wide for 5 items) still fits left of the speed readout; at higher scales it
  drops `Inspect` first (still works), never wraps to two rows.
- Map opened with no discoveries yet: harbour, regions and the boat only; no empty-state text needed.
- Pin placed inside The Swells without a keel: allowed (it is a goal), and the compass shows it.
- Menu or map opened while drifting toward the swell band: allowed; the push-back (02) continues and the hint
  queues until the screen closes.
- Gamepad disconnected mid-screen: glyphs switch to KB/M on next input; no pause.
- Ultrawide 21:9: HUD anchors to the 16:9 safe centre ±10% (PROPOSED); 4:3 not supported.
- Opening journal during swell push-back: allowed; the boat is already throttled by doc 02.

## Dependencies
Hard: 04, 05, 11, 03, 02, 01, 09 (hex tokens, fish/crew cels), 08. Paper: 06. Each must list 10 as a consumer.

## Tuning Knobs
| Knob | Default | Safe range | Affects |
|---|---|---|---|
| `UIScale` | 1.0 | 0.8–1.5 | all HUD/screen size (F2) |
| `AmbientOpacity` | 0.92 | 0.75–1.0 | how quiet Ambient elements are |
| `FocusScale` | 1.2 | 1.1–1.3 | how strongly Focused elements stand out |
| `FocusEase` | 150 ms | 100–250 ms | promote/demote transition |
| `CargoFullFocus` | 6 s | 3–10 s | how long the full-hold moment holds attention |
| `InkGlassAlpha` | 0.70 | 0.70–0.85 (never lower, F3) | Focused plate legibility |
| `LogLineLife` | 12 s | 6–30 s | how long log/chat lines stay |
| `LogMaxLines` | 6 | 3–8 | log box height when idle |
| `LogRateCap` | 1 per 3 s | 1 per 2–6 s | log calm |
| `ActionBarMode` | Full | Full / Context / Off | prompts on screen |
| `HudFootprintBudget` | 3% | 2–5% | review gate for adding HUD elements |
| `HintDuration` | 8 s | 5–15 s | onboarding pace |

## Visual/Audio Requirements
Motion: values fade/slide 6–12 px over ≤200 ms; `+1` rise 12 px / 0.8 s; button press 96%; no bounce or overshoot on
HUD (screens may pop 104% → 100% over 3 drawings). Sounds: soft paper "pap" on screen open, wooden knock on buy,
coin-shell rattle on sale; log lines are silent; no alarm sounds. Flash rule: ≤3 luminance flashes/s.

## Game Feel
Sell all = one satisfying rattle + numbers counting up 0.6 s (skippable by click). Nothing waits on the player.
The HUD should feel like it is barely there: a captain should be able to take a clean screenshot at any time by
just not touching anything for 8 s (fade) or pressing `H`.

## UI Requirements
### Input map
| Action | KB/M | Gamepad (Xbox labels) |
|---|---|---|
| Throttle / steer | W/S, A/D | LT/RT, Left stick |
| Anchor | Space | Y (owner, 2026-11-26) |
| Camera orbit / zoom | RMB drag / wheel | Right stick / RS click cycle |
| Interact (counter) / confirm | E | A |
| Menu (Cargo · Ship · Crew · Journal · Map · System) | Tab (tabs: Q / E) | Menu (tabs: LB / RB) |
| Map (full screen) | M | View |
| Crew / Journal tab shortcut | C / J | — |
| Activity log open | L or hover | D-pad up |
| Chat (mock) | Enter | — (POST-PROTOTYPE on-screen keyboard) |
| Companion mode | F9 | Hold View 0.6 s |
| Inspect (all HUD Focused while held) | hold F | hold LB |
| Hide HUD | H | D-pad down |
| Back / close; at sea opens Menu → System | Esc | B |
All remappable (Enhanced Input user mappings); the action bar always shows the current binding. No fishing action
exists on any device (P2).

### Accessibility baseline
- [x] Keyboard-only and gamepad-only complete the full H1 loop (focus ring: 2 px Wisteria outline + 2 px offset).
- [x] Text: body 20 px, floor 18 px at 1080p (XAG 101 PC minimum), `UIScale` up to 1.5; ink on cream ≥13:1;
  Focused: cream on Ink Glass ≥4.5:1 over any background; Ambient: plain glyphs pass the bright/dark screenshot
  check (F3), with Outlined as the fallback style. Players who want plates everywhere pick HUD style "Always backed".
- [x] Not colour alone: cargo full (icon+word), crew identity (name + slot number, crew panel), crew state (glyph +
  word), ping (shape + text), buy state (stamp/label), pad glyphs (letter inside the disc).
- [x] Colourblind: no red/green pairs carry meaning; validate with Deuteranopia/Protanopia/Tritanopia filters.
- [x] Subtitles/captions: ping callouts and crew barks also go to the activity log as text.
- [x] Reduce flashes / Reduce motion toggles; Action bar off; Hints off; remap all inputs.
- [x] UI scales 720p–4K via `S`; hold-to-confirm never required; mouse targets ≥ 32×32 px (WCAG 2.2 target ≥24).

## References (owner UX pass research)
- Xbox Accessibility Guideline 101 — text size: 18 px PC / 26 px console body height at 1080p, player-adjustable.
  https://learn.microsoft.com/gaming/accessibility/xbox-accessibility-guidelines/101
- Contextual prompts: show inputs when they are relevant rather than as always-on instruction text.
  https://medium.com/the-acagamic-tip-tuesday/the-acagamic-tip-tuesday-17-contextual-prompts-9d9fe0d13b13 ·
  https://gamedeveloper.com/design/implementing-context-sensitive-commands-in-ui-design
- MMO chat/log practice: per-line decay timers and fading the whole window beat a low-alpha background, which hurts
  legibility. https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_transparency.html ·
  https://us.forums.blizzard.com/en/wow/t/way-to-make-chat-window-less-transparent/1921105
- Minimal/diegetic HUD in calm games (Sable: the ship is the interface; A Short Hike; Dorfromantik).
  https://fictionhorizon.com/25-games-with-minimal-ui-that-still-guide-you/ ·
  https://80.lv/articles/how-dorfromantik-expands-its-cozy-world-through-minimalist-design

## Cross-References
00 §5 A5, §9 D1–D7; reviews/loop-1 rulings 5–7; 01 onboarding/loop; 02 speed/anchor/toast; 03 regions/discoveries;
04 crew names/states/`OnFishLanded`; 05 prices; 11 fitting/cosmetics; 06 paper chat/ping; 08 companion window; 09 colour tokens
and cels. Effort (PROPOSED): HUD 3 d, action bar + rebinding glyphs 2 d, activity log 2 d, harbour screens (fishmonger, crew board) 2 d, Shipyard UI in doc 11,
crew+journal 2 d, onboarding hints 1 d, input/remap 2 d, accessibility pass 2 d, solo whale ping UI 1 d =
**~17 dev-days** + Shipyard (doc 11) (multiplayer chat and ping: 0, paper only).

## Acceptance Criteria
1. (H1) Sell all reachable in ≤2 clicks from the `E` Talk prompt; items < 100 Shells bought in ≤2 clicks; upgrades
   ≥ 100 Shells (`Cutter`, `DeepHold`) in exactly 3 (open, Buy, one confirm; doc 05); hiring in ≤2 — verified by click count.
2. (H1) ≥75% of testers reach first sale ≤8 min with hints only (no verbal help).
3. Full loop playable with keyboard only and with gamepad only (QA run each).
4. At 1080p, `UIScale` 1.0: all text ≥18 px body height (measured descender-to-ascender, XAG 101); contrast ≥4.5:1
   everywhere, checked on a white-sky and a dark-dusk screenshot.
5. Resting Sailing screenshot: no plates on screen, Shells not visible, footprint ≤3% by glyph bounds (F4).
5b. Each Focused state in the relevance matrix appears on its trigger and returns to its resting state on its exit,
   with no manual dismissal (cargo full 6 s, Shells in screens, chat on Enter/Esc, Inspect on hold/release) — capture check.
6. No crew information on the Sailing HUD; in a 5-min sailing screenshot sequence the only HUD elements are cargo,
   Shells, compass, action bar and (transiently) log lines, speed readout, hint pill.
7. Every action bar item triggers its action when clicked, and its glyph updates within 1 frame of switching
   KB/M ↔ gamepad.
8. Log: no more than 1 new line per 3 s; routine catches never logged; every line gone 13 s after arrival when the
   box is closed (log + capture check).
9. No UI prompt repeats more than once per trigger event in a 45-min session (log check).
10. Each crew entry in the crew panel can be identified in a greyscale screenshot by name and slot number alone (D7).
11. (H1/H3) Solo whale ping shows compass marker, subtitle, ripple and one log line with no sender; first fire 10–15 min in.
12. (H3, paper) Chat/ping cards let ≥50% of paper-test players state ping direction and distance within 60 s.
13. Tab opens the Menu from anywhere at sea; every non-harbour screen (cargo, ship, crew, journal, map, system) is
    reachable from it in ≤2 inputs, and no harbour job (sell, fit, paint, decorate, hire) appears in it.
14. The map shows only seen discoveries; a placed pin appears on the compass within 1 frame and clears within 30 m.

## Open Questions
1. ~~Gamepad anchor~~ CLOSED by owner: **Y** (matches 02; B stays Back in screens).
2. ~~Action bar fade~~ CLOSED by `/clean-ui` pass: prompts are Ambient (outlined, no plate); Settings offer Context only / Off.
3. Should crew efficiency ever be shown as a number (e.g. tooltip)? PROPOSED: no.
4. ~~HUD auto-fade~~ CLOSED: replaced by attention states (Ambient at rest, Focused on trigger, Inspect). Validate by H1
   observer notes: do players find Shells when they want them (Inspect / screens)?

## Interface values
| Value | Number / name | Consumer |
|---|---|---|
| HUD elements | Cargo, Shells (hidden at sea), Compass (+region on entry), Action prompts, Activity log/chat, Speed (transient), Hint pill — states per relevance matrix | 02, 04, 05, 03 |
| HUD footprint | ≤3% at rest by glyph bounds (1.6% as specified), no plates at rest | review gate |
| HUD states | Hidden · Ambient (no plate, outlined cream glyphs 92%) · Focused (Ink Glass `#33273B` @ 70%, r10, 1.2×, 150 ms) · Inspect hold F/LB | 08, 09 |
| Surfaces | Paper = `#FFF6E3`, 2 px `#6B4A35`, r14 (screens) | 08, 09 |
| Type (1080p, S = 1) | screen title 28/600 · heading 22/600 · body 20/500 · small 18/500 (floor) · glyph 13–15/800 inside keycaps · mock fonts Fredoka (titles) + Nunito (all else); doc 09 picks the shipping pair | 08, 09 |
| Harbour places | Fishmonger (sell) 600×420 · Shipyard (fit + paint) full-screen, rail 560×880 · Inn crew board (hire) 640×370 · confirm 420×190; ≤2 clicks + 1 confirm ≥100 | 05, 11, 04 |
| Menu (Tab) | Paper 1280×760; tabs Cargo · Ship · Crew · Journal · Map · System | 04, 03, 11 |
| Map (M) | full screen chart; 2 zoom levels; 1 pin (shows on compass) | 03 |
| Crew glyph states | fishing / resting / not-in-zone (crew panel + log) | 04 |
| Log events | species first per trip, new species, Uncommon+, hold half/full, region, discovery, sale, hull bought, crew hired, cosmetic earned, ping, crew left zone | 04, 03, 05, 06, 11 |
| Region label | on crossing 50% of `TransitionBand`, 6 s | 03 |
| Speed readout | kn + 5 notches on change, 3 s; anchor icon while `Anchored` | 02 |
| Ping distance | rounded to 10 m, hidden <20 m (MP mock; solo whale ping built) | 06, 03 |
| Crew icon | 36×48 px dummy in crew panel, colour triplet from 09, `CrewId` name | 04, 09 |
| Companion toggle | F9 / hold View 0.6 s | 08 |
