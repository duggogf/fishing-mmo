# Little Ocean — UI/UX Knowledge Collection

> **Living document.** Read this before any UI, HUD, screen or mockup work on Little Ocean, and add to it after every
> owner review. It records what we learned, why, and how to check it, so the same mistake is not made twice.
> Owner of record: ux-designer. Started 2026-11-26 (owner UX pass). Specs live in `design/gdd/little-ocean/10` and `11`.

## 1. Principles (each one traced to a feedback item or a source)

| # | Principle | Test you can run | Origin |
|---|---|---|---|
| P-1 | **Show it only when it changes a decision now.** A HUD element must answer a question the player has *in that moment* (go home? afford it? where is home?). | For each element, name the decision it serves while sailing. No answer → remove it or move it one key away. | Owner FB-1 (crew list) |
| P-2 | **Design for the device and the distance.** PC at desk distance ≠ TV at 3 m ≠ phone. 1080p PC body text 18–20 px, not 28–32. | Measure text body height at 1080p: floor 18 px (XAG 101 PC), body 20. Compare a screenshot to 2–3 shipped PC games at the same resolution. | Owner FB-3; XAG 101 |
| P-3 | **Budget the screen.** Persistent HUD ≤ 3% of the frame. The sea is the content. | Sum the plate bounds in a sailing screenshot (doc 10 F4). | Owner FB-3 |
| P-4 | **Teach keys by showing them, not by hints.** An always-visible action bar of key/button prompts replaces "press X" tutorial text. Hints explain *why*, never *which key*. | No hint string contains a key name that is also on the action bar. | Owner FB-1 (reference image) |
| P-5 | **Transient by default.** Log/chat lines arrive, stay ~12 s and fade. The box only gains a background when opened. A low-alpha background is worse than no background (legibility). | 13 s after the last event the log area is empty in a screenshot. | Owner FB-2; MMO chat practice |
| P-6 | **One place, one verb.** Selling, fitting and hiring are different places in the harbour and different screens. The quay layout *is* the menu. | No screen contains an action that belongs to another place. | Owner FB-4 |
| P-7 | **Upgrades are objects, not numbers.** Progression that only raises a stat feels like a shop list. Fitting physical items under real limits (size, weight) creates a small, readable decision, and it is visible on the boat. | Each upgrade has a model in the world and at least one constraint that can block it. | Owner FB-5 |
| P-8 | **Management without spreadsheets.** One meter (load), one delta line, reasons in words. Every edit is free to undo. | Count numbers on the fitting screen: ≤ 6 visible at once. | Owner FB-5 + P3 pillar |
| P-9 | **Self-expression needs a home.** If players are seen by others (harbour hangout), they need a place to make the boat theirs: paint, sail, pennant, name. | The cosmetic entry point is reachable from the place the boat is already being worked on. | Owner FB-6 |
| P-10 | **Two surfaces, one family.** Over the world: Ink Glass (70% ink, cream text). Screens: Paper (opaque, thin frame). One radius family. | No third panel style in any mock. | Self-review FB-7 |
| P-11 | **Never colour alone.** Every state has a shape or word too: pad glyph letters, crew names + slot numbers, hatched overflow, "Full". | Greyscale screenshot still reads. | Accessibility baseline |

## 2. Owner feedback log (with reflection: what else it implies)

**FB-1 — "Crew list bottom-left gives zero benefit while sailing; use a horizontal button list instead" (2026-11-26)**
- Done: crew bean removed from the HUD; action bar of key prompts added (doc 10).
- Reflection: the first draft put *everything that exists* on the HUD, not *what the moment needs*. The same test
  removes the always-on region label (now shown on entry only), the always-on speed (now only while the throttle
  changes) and crew state (now read from the deck, the log and the crew panel).
- Also implied: the action bar must handle rebinding, gamepad glyphs, mouse clicks and a context mode. It must also
  have an "off" setting for players who have learned the keys.

**FB-2 — "MMO-style activity log + chat, small and transparent, not dominant" (2026-11-26)**
- Done: one log/chat box above the action bar, invisible when idle, lines fade in 12 s, opens on hover/L.
- Reflection: the log is also where crew information now lives ("Pip landed a Mackerel · new"), so removing the crew
  HUD loses nothing. It doubles as captions for barks and pings (accessibility).
- Risk caught: logging every catch would mean a line every ~8 s with 3 crew (doc 10 F5). Only firsts, rares and state
  changes are logged, and the cargo `+1` covers routine catches.
- Research note: in MMOs, players complain that low-alpha chat backgrounds hurt legibility. They ask for per-line
  fade or whole-window fade instead. Hence the alpha floor of 70% (F3 contrast proof).

**FB-3 — "UI scale too big for a 1080p PC game; pro PC UI is tidy and takes little space" (2026-11-26)**
- Done: type scale 28/22/20/18 (was 40/32/28), panels about 30–50% smaller, persistent HUD 7.5% → 2.2%.
- Reflection: the 28–32 px values came from console/TV (10-foot) guidance and were applied to a desk game. A
  platform-specific number must always say which platform it is for. Keep a `UIScale` slider (80–150%) so larger
  UI is the player's choice, not the default.
- Also implied: chunky 3 px frames, offset "sticker" shadows and big pill buttons read as "AI-generated / mobile".
  Thinner frames, a single soft shadow and fewer rounded containers read as crafted.

**FB-4 — "Rework sell/buy; drop the 'Second Hand'; hiring crew isn't the same UI as upgrading or buying" (2026-11-26)**
- Done: Fishmonger = sell only; Inn crew board = hire; the `Crew_2` upgrade is removed (a person is not a part).
- Reflection: mixing verbs in one list was a symptom of designing screens from the data table instead of from places
  and people. Hiring a person deserves a moment: a face-less dummy with a line of character, a berth to give them.
- Also implied: hiring needs a *capacity* (berths), which links crew to fitting without a separate crew economy.

**FB-5 — "Fitting deserves its own UI with real management: too big / too heavy, upgrade the hull" (2026-11-26)**
- Done: doc 11 (hulls with S/M/L slots, keel mount, load limit; 5 items; one deliberate squeeze on the Skiff;
  the Keel needs the Cutter).
- Reflection: the constraint needs to create a *choice* (which two of three), not just a *wait* (save up). The
  squeeze table in 11 shows three valid Skiff loadouts that each feel different.
- Guardrail kept: total spend to Region 2 still 250 + 90 + 60, so the H1 timing (20–30 min) survives (11 F4).
- Also implied: visible on the boat (waterline sinks with load), free undo, hulls kept in the yard, items never lost.

**FB-6 — "Where do you customise the cosmetics of the ship?" (2026-11-26)**
- Done: Paint and Decor tabs inside the Shipyard (same 3D preview); curated palette; some bought, some earned by discovery.
- Reflection: cosmetics are the long-tail Shell sink after Region 2, the player's identity in the multiplayer
  harbour, and a reward for curiosity (P3). They must never change stats.

**FB-7 — Self-review after the owner pass (what the owner did not say but the same lens catches)**
- Missing screens in the first draft: **pause menu, settings, controls/rebind** — now specified in doc 10.
- Missing state: **crew without a berth** — answered: they wait at the Inn and are never lost.
- Missing feedback: **what a purchase changes**. Answered with the delta line ("Hold 32 → 26 · Crew 2 → 3").
- Missing input path: **drag-and-drop needs a click/gamepad alternative**. Both are now full paths.
- Over-design to avoid next time: a redline layer on every mock makes the page look busy. Put measurements in one
  spec table per screen and keep the mock clean.
- Open to watch: is the action bar itself too much once learned? There is a setting (Full/Context/Off), and H1
  observers should note whether players read it.

**FB-8 — "Make the HUD dynamically dominant: no dark blocks; show things when they matter" (2026-11-26)**
- Understood as a general philosophy, not a per-element fix: **attention follows relevance**. Every element is Hidden,
  Ambient (no plate; outlined text on the world) or Focused (plate, a little bigger) depending on the player's
  current context, with a named trigger and exit. A peek key means hiding never withholds information.
- Compiled into the reusable skill `.claude/skills/clean-ui/` (SKILL.md + principles + relevance-matrix template).
  Run `/clean-ui` before any UI design or review.
- Supersedes P-10's "Ink Glass over the world" for resting HUD: plates are now a *focus signal*, not a legibility
  crutch. Doc 10 and the mocks still use the plates until the `/clean-ui` pass on Little Ocean lands.

**FB-9 — "Cosmetics need more than colour: placeable objects on per-frame slots, without bloat" (2026-11-26)**
- Done: Shipyard tabs are Fit · Paint · Decor. Decor points are per hull (Skiff 5, Cutter 7: masthead, roof, rail,
  bow/figurehead, stern). There are 13 objects + 4 hull patterns. Some are bought; the best ones are earned by discovery.
- Reflection: decor points mirror gear slots (same "boat as interface" interaction), but are kept separate so
  dressing the boat never competes with fitting her (no weight, no slots, no stats).
- Guardrail against bloat: one object per point, a small catalogue, curated styles (no free placement), and decor
  is only visible in its own tab.

## 3. "Looks AI-made" — anti-patterns to avoid

1. Every element in its own rounded card with an icon, a title and a subtitle.
2. Equal visual weight for everything (no hierarchy; the important number is the same size as a label).
3. Oversized type and padding everywhere (mobile scale on desktop).
4. Thick outlines + offset drop shadows on every panel ("sticker" look).
5. Emoji-like icons next to every word; decorative badges, pills and chips that do nothing.
6. Invented jargon in player-facing text ("bean", "pom"). Internal names stay in the spec.
7. Symmetric, centred, everything-at-once layouts. Real HUDs anchor to corners and leave the centre to the world.
8. Explaining the UI inside the UI (labels like "Activity log" on a log that is obviously a log).
9. Colour used for decoration instead of meaning; more than one accent fighting for attention.

## 4. Checklists

**HUD element gate** (all must be yes): answers a decision now (P-1) · fits the 3% budget (P-3) · has a fade/hide rule ·
has a non-colour cue (P-11) · has a gamepad path · has a text size ≥ floor at 1080p.

**Screen gate**: one verb (P-6) · ≤2 clicks to the main action · close = Esc/B, no ✕ hunt · action bar shows its
prompts · ≤6 numbers visible (P-8) · undo or confirm for anything ≥100 Shells · works at UIScale 0.8 and 1.5.

**Mockup gate**: rendered at 1920×1080 and viewed at 100% on a desktop monitor (not only scaled down) · compared side
by side with a shipped PC reference · greyscale pass · white-sky and dusk contrast pass · no redlines in the hero view.

## 5. Reference shelf (what to study, and for what)

- Xbox Accessibility Guideline 101 (text size by platform): https://learn.microsoft.com/gaming/accessibility/xbox-accessibility-guidelines/101
- Contextual prompts: https://medium.com/the-acagamic-tip-tuesday/the-acagamic-tip-tuesday-17-contextual-prompts-9d9fe0d13b13 ·
  https://gamedeveloper.com/design/implementing-context-sensitive-commands-in-ui-design
- MMO chat transparency/fade (FFXIV UI guide; player requests): https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_transparency.html ·
  https://us.forums.blizzard.com/en/wow/t/way-to-make-chat-window-less-transparent/1921105
- Minimal/diegetic HUDs in calm games: https://fictionhorizon.com/25-games-with-minimal-ui-that-still-guide-you/ ·
  https://80.lv/articles/how-dorfromantik-expands-its-cozy-world-through-minimalist-design
- Games to study by screenshot (not to copy): Sable (ship as interface), A Short Hike (near-zero HUD), Dorfromantik
  (one small corner counter), Sea of Thieves (diegetic ship upgrades/cosmetics at a shipwright), Stardew Valley
  (one place per shop verb), Spiritfarer (boat building as layout), Animal Crossing (item-as-object storage).

## 6. Change log
| Date | Change | By |
|---|---|---|
| 2026-11-26 | Created from owner UX pass FB-1…FB-6 + self-review FB-7 | ux-designer |
| 2026-11-26 | FB-8 (attention follows relevance → `/clean-ui` skill), FB-9 (decor points) | ux-designer |
