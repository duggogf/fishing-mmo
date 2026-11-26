# Clean UI — principles, reasoning and numbers

Why each rule in SKILL.md exists, so it can be applied to cases the examples don't cover.

## 1. Attention is the real budget, not pixels
Screen area is a proxy. What a HUD actually spends is the player's attention, including peripheral
vision: anything with contrast, a saturated colour, motion or a solid block shape gets noticed whether or not
the player wanted it. A dark plate behind a number is a solid block shape. It draws the eye even when the
number is irrelevant. So the question for every element is not "is there room?" but "is it worth a glance
*right now*?"

## 2. Relevance is contextual, not intrinsic
"Is currency important?" has no answer. Currency matters in a shop and not at sea. "Is chat
important?" It matters while you are typing or someone just spoke, not otherwise. Designing per element
("where does currency go?") leads to every element being permanently visible. Designing per context ("what does
the player need *while selling*?") leads to elements that come and go. That is why the procedure starts with
contexts, not elements.

## 3. Dynamic dominance: the same element has several weights
Hidden → Ambient → Focused → (rarely) Interruptive. The transition is the design: what promotes an element,
what demotes it, and how it looks while it moves. Typical triggers:

| Trigger type | Examples | Typical result |
|---|---|---|
| Player enters a place or mode | shop, crafting bench, map | that place's values become Focused (currency in a shop) |
| Player asks | Enter (chat), Tab (peek), hover, hotkey | the requested UI appears and owns focus until closed |
| A value crosses a decision threshold | hold full, low health, inventory full | one-time promotion, then back to Ambient |
| A value changes | +84 Shells, +1 fish | a brief lift (brighten, "+N" rises and fades), no state change |
| An event from outside | another player's message, a world event | one line or marker, Ambient, fades |
| Time passes with nothing new | 8–12 s idle | demote: fade lines, dim Ambient, hide transient |

## 4. Legibility without plates
Plates are the lazy way to guarantee contrast. Minimal-HUD games instead use, on the glyphs themselves:
- a **thin dark outline** (1–2 px at 1080p, ink colour, about 60–80% opacity), and
- a **soft drop shadow** (0–1 px offset, 3–6 px blur, about 40–60% opacity),
- with light text (cream/white) at 85–100%. Icons get the same outline.

This holds on bright sky, white foam and dark dusk. Always verify on the brightest and the darkest frame of
the real game, plus a greyscale pass. WCAG contrast ratios assume a flat background, so for text over a
moving 3D world the practical test is the screenshot check, not the formula. When a Focused element gains its
plate, the plate is a *signal* ("this matters now"), not a legibility crutch.

## 5. Platform scale
Size type for the device and viewing distance, then let players scale it.
- Xbox Accessibility Guideline 101: minimum body text height at 1080p is **18 px on PC/VR** and **26 px on
  console** (measured from the lowest descender to the highest ascender), with a player scale option.
  https://learn.microsoft.com/gaming/accessibility/xbox-accessibility-guidelines/101
- 10-foot (TV) UI guidance commonly cites ≈28 px minimum at 1080p.
- A desk PC game at 1080p: body ≈20 px, floor 18 px, titles 26–28 px. Panels are sized to their content, not to a
  phone thumb. Large UI is the player's choice (a scale slider), not the default.

## 6. Input reveals its UI
Text entry, history, inventories and maps are tools, not decoration. A permanently open chat box spends
attention on an empty input field. MMOs and Roblox show recent lines lightly and open the box on Enter. FFXIV
and WoW players repeatedly ask for chat that fades or auto-hides, and complain that semi-transparent boxes both
hurt legibility and still block the view:
https://na.finalfantasyxiv.com/uiguide/communication/communication-chat/chat_transparency.html ·
https://us.forums.blizzard.com/en/wow/t/way-to-make-chat-window-less-transparent/1921105

## 7. Prompts: show the verb when it is available
Contextual prompts ("E Talk") appear where and when the action is possible. Always-on control lists are fine
only as an Ambient strip, and players should be able to switch them off or to context-only once learned.
https://medium.com/the-acagamic-tip-tuesday/the-acagamic-tip-tuesday-17-contextual-prompts-9d9fe0d13b13 ·
https://gamedeveloper.com/design/implementing-context-sensitive-commands-in-ui-design

## 8. Places and screens have one verb
A screen that sells, buys, upgrades and hires at once is a dashboard. One verb per place (selling,
fitting, hiring) lets the world's layout act as the menu, and keeps each screen's Focused set small.

## 9. Diegetic first, when it reads
If the world can show it (crew visibly resting when the hold is full; the boat sitting lower when loaded),
prefer that over a HUD element, and keep the HUD element Ambient or Hidden. Diegetic cues must still be
readable at the default camera distance. If they aren't, the HUD keeps the job.

## 10. Peek: hiding without withholding
Holding one input shows every Hidden or Ambient value as Focused for as long as it is held. This lets the default
be aggressive (hide currency at sea) without ever costing the player information.

## Reference games to study by screenshot (study, don't copy)
A Short Hike and Sable (near-zero HUD, world as interface) · Dorfromantik (one small counter) · Sea of
Thieves (diegetic ship info; currency shown at vendors) · Breath of the Wild / Tears of the Kingdom with the
minimal HUD option (contextual elements fade in) · Roblox and most MMOs (chat lines fade, box opens on Enter) ·
Stardew Valley (one verb per shop) · Spiritfarer (boat building as spatial layout).
https://fictionhorizon.com/25-games-with-minimal-ui-that-still-guide-you/ ·
https://80.lv/articles/how-dorfromantik-expands-its-cozy-world-through-minimalist-design
