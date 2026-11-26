---
name: clean-ui
description: "Designs or reviews game UI so attention follows relevance: every element is hidden, ambient or focused depending on what the player is doing right now, and only becomes prominent when it matters. Use when designing, mocking up, reviewing or cleaning up any HUD, menu, shop, chat, notification or screen, when UI feels busy, cluttered, mobile-sized, 'too AI', distracting or not immersive, or when asked for minimal, cozy, clean or immersive UI. Engine- and genre-agnostic."
argument-hint: "[screen, HUD or doc to design/review] [--review | --design]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, WebSearch
---

# Clean UI — attention follows relevance

## The philosophy (read this first; everything else follows from it)

**The game world is the content. UI is a servant that should be noticed only when it is needed.**

Every piece of UI competes for the player's attention, including their peripheral vision. Attention is a
budget, and the default spend is near zero. An element does not get to be prominent because it exists or
because it is important *in general*. It gets prominence only while it is **relevant to what the player is
doing right now**, and it gives that prominence back as soon as the moment passes.

So UI is not static layout. It is **dynamic dominance**. The same element (a currency counter, a chat box, a
cargo meter) has different weights at different moments:

- At sea, the currency doesn't change any decision, so it isn't shown. In a shop it is the most important
  number on screen, so it appears with a backing plate, a little bigger.
- Chat is a few fading lines of text until the player presses Enter. Only then is it a box with an input field.
- A cargo meter is a quiet glanceable line while fishing. It speaks up once when the hold is full (a decision
  moment), then goes quiet again.

The player should be able to **look and understand** when they choose to, and should **not be pulled** when
they don't. "Glanceable, not attention-seeking."

## The attention states

Every UI element, in every context, is in exactly one state. Design the states and the transitions, not
just one picture.

| State | Purpose | Visual treatment |
|---|---|---|
| **Hidden** | Not relevant now | Not drawn. Must be reachable another way (peek key, its screen, hover). |
| **Ambient** | Background info the player may glance at | No panel or plate. Text and icons are printed into the scene: plain light glyphs, slightly translucent (≈85–95%), no saturated accent colour, no motion while static. Prefer no outline or shadow, so the UI belongs to the world instead of popping out of it. Add a thin outline only where screenshots show it fails (bright foam, snow, sky), or as a player option. |
| **Focused** | Relevant to the current context or action | Gains its backing plate. ≈15–25% larger, full opacity. Eases in over 120–200 ms, with no bounce. |
| **Interruptive** | Must be seen now (rare: data loss, a timed choice, safety) | Centre or modal, with sound. Budget: almost never in a cozy game. If you reach for it, first ask whether it could be Focused instead. |

Rules:
1. **The default is Ambient or Hidden.** Every Focused or Interruptive state needs a named trigger
   ("player enters a shop", "presses Enter", "hold reaches 100%") and an exit ("leaves", "Esc", "8 s").
2. **Promote on relevance, demote on completion.** An element promoted by an event (e.g. +84 on a sale) falls back
   to its resting state by itself. The player never has to dismiss ambient information.
3. **One focus at a time** per screen region. If two things want focus, the one tied to the player's current
   action wins; the other queues or stays Ambient.
4. **Nothing is lost by hiding it.** Provide a **peek** (hold Tab or a controller button: everything Focused
   while held), plus the element's own screen. Hiding is about attention, not withholding.
5. **Change is the signal.** Ambient elements stay still. A value change may briefly lift the element (a short
   brighten or a "+N" that rises and fades). It never loops, pulses or blinks while nothing is happening.
6. **Controls stay solid.** Input glyphs (keycaps, button prompts) are always drawn solid, even in an Ambient strip. They are affordances the eye looks for, so they don't go see-through.
7. **Input reveals its UI.** Text input, lists, inventories and maps appear because the player asked (key,
   click, button), not pre-emptively. Chat box on Enter; log history on hover/hotkey; tooltips on hover/focus.

## Procedure — designing or reviewing any UI

1. **List contexts.** Write down the player's activities: e.g. exploring, travelling, combat, at a vendor, in a
   menu, idle/AFK, first 10 minutes, multiplayer social. Keep it to the 4–8 that matter.
2. **Inventory elements.** Everything that can appear: HUD values, prompts, logs, chat, notifications,
   markers, panels.
3. **Fill the relevance matrix**: element × context → Hidden / Ambient / Focused / Interruptive, each with
   the decision it serves in that context. If you cannot name a decision, the answer is Hidden. Template:
   `references/relevance-matrix.md`.
4. **Define triggers and exits** for every non-default cell (what promotes it, what demotes it, how long).
5. **Check the budget.** Per context: ≤1 Focused element per screen region; persistent Ambient footprint ≤3% of the
   frame for exploration-type play (measure plate/text bounds). Zero Interruptive in normal play.
6. **Style by state**, not by element. All Ambient elements share one treatment, and so do all Focused
   elements. Two surface families at most: ambient-on-world (no plate) and panel (screens, dialogs, focused HUD).
7. **Scale for the device.** Size text for the target platform and viewing distance (e.g. PC at 1080p:
   body ≈20 px, floor 18 px; console/TV ≈26–28 px; see `references/principles.md`), with a user scale slider.
   Don't put mobile or TV sizes on a desk game.
8. **Mock every state that the matrix uses**, not just the busiest one: ambient baseline, each focused
   moment, the peek. Judge mocks at 100% on the target resolution, over the brightest and darkest scenes.
9. **Review with the checklist** below. Record the decisions and the owner's feedback in the project's UI
   knowledge file, if it has one.

## Review checklist (each must be yes)

- [ ] Every visible element in each context answers "what decision does this serve right now?"
- [ ] The resting state of the main play context has no backing plates over the world.
- [ ] Each Focused/Interruptive state has a trigger *and* an exit; nothing needs manual dismissal unless it is a choice.
- [ ] A peek or other route exists for every Hidden value.
- [ ] Ambient text stays legible on the brightest and darkest backgrounds in real screenshots (plain first; adaptive tint or outline only where it fails), and a greyscale shot still reads.
- [ ] Nothing animates while nothing changes. No idle pulses, glows or bobbing badges.
- [ ] Text input, history and lists appear only on player request.
- [ ] Sizes fit the platform; a UI scale setting exists; a "hide HUD" and a minimal-HUD option exist.
- [ ] One job per screen or place. Screens don't mix verbs (selling ≠ fitting ≠ hiring).
- [ ] No "AI look" anti-patterns (below).

## Anti-patterns ("looks AI-made" / "looks like a dashboard")

1. Every element on its own dark or rounded card, all the same weight, all the time.
2. Mobile- or TV-scaled type and padding on a desktop game.
3. Thick outlines and offset "sticker" shadows on everything; pills and badges that do nothing.
4. Information shown because it exists (crew list, totals, timers) rather than because it is needed now.
5. Permanently open chat or log boxes; low-alpha boxes that hurt legibility *and* still block the view.
6. Idle animation on static values; notifications that ask for attention with nothing to act on.
7. Labels explaining obvious UI ("Activity log", "Currency:").
8. Mixed verbs in one screen (shop that also hires, upgrade list that is also a crew list).
9. Upgrades as a stat list instead of objects with constraints and a visible result.

## Output

When designing: the relevance matrix, triggers/exits, the state styles, sizes, and mocks for each state.
When reviewing: findings ranked by how much attention they waste, each with the context, the current state,
the proposed state, and the trigger and exit. Don't rewrite unrelated UI.

Review verdict, worst first: **FAIL** (a checklist item fails on an element the player sees in the main
play context) > **CONCERNS** (items fail only in secondary contexts, or are fixable in place) >
**NOT ASSESSED** > **PASS**.
Use NOT ASSESSED, and name the items and the reason, when a checklist item could not be checked. For example:
no mock or screenshot of a context exists (legibility and footprint cannot be judged from text), the target
platform is unknown (scale), or only one state was mocked (triggers and exits are unverified). PASS requires
every item checked against evidence. A spec that only describes the busiest frame is not evidence for the
resting state. If some items fail and others could not be checked, the verdict is the failing one, and the
unchecked items are still listed.

**Writing files.** Show the matrix, findings or spec changes first. Then ask "May I write this to [filepath]?"
before any Write or Edit, and list every file in a multi-file change. A skipped or dismissed question is not an
approval: re-ask in plain text.

## Next steps

- After designing: mock every state in the matrix (ambient baseline, each focused moment, the peek). Then run
  this skill again with `--review` against the mocks.
- After a FAIL or CONCERNS review: fix the main play context first, then `/ux-review` for the full UX spec.
- Before implementation: `/team-ui` to carry the states and triggers into the UI build.
- Record decisions and owner feedback in the project's UI knowledge file (if it has one) so the next pass
  starts from them.

## References

- `references/principles.md` — the reasoning behind each rule, platform sizes, legibility without plates, sources.
- `references/relevance-matrix.md` — the blank template and a worked example (a calm sailing/fishing game).
