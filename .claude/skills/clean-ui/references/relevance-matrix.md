# Relevance matrix

One row per element, one column per player context. Each cell: **state** (H Hidden · A Ambient · F Focused ·
I Interruptive) and, for every non-default cell, the **decision** it serves plus the **trigger → exit**.

## Blank template

| Element | Context 1 | Context 2 | Context 3 | Context 4 | Peek (held) |
|---|---|---|---|---|---|
| … | H / A / F / I — decision · trigger → exit | | | | F |

Then list per context: Focused count per screen region (≤1), and the persistent Ambient footprint (% of frame).

## Worked example — calm sailing/fishing game (Little Ocean)

Contexts: **Sail** (sailing/fishing at sea), **Full** (hold just filled), **Dock** (at a counter, before opening),
**Shop** (Fishmonger, Shipyard or Inn screen open), **Chat** (player pressed Enter), **Menu** (pause/settings).

| Element | Sail | Full | Dock | Shop | Chat | Peek |
|---|---|---|---|---|---|---|
| Cargo (hold count + bar) | **A** — "go home yet?" glance | **F** once — decision moment · hold hits 100% → 6 s | A | **F** at the Fishmonger (what I'm selling) · open → close; H elsewhere | A | F |
| Currency (Shells) | **H** — no decision at sea | H | A | **F** + plate, ≈20% larger — "what can I afford" · open → close | H | F |
| Currency change | brief "+N" lift on sale, then back to state | | | lift | | |
| Compass | **A** — thin ticks + letters, no plate; harbour marker | A + harbour marker brightens · Full → docked | H | H | A | F |
| Ping marker (world event) | **F** marker only (amber), subtitle 6 s → A | | | queued | | |
| Region name | **H**; F for 6 s on entering a region | | | | | F |
| Speed / throttle | **H**; A while throttle changes (+3 s) | | | | | F |
| Action prompts | **A** text-only strip (can be set to context-only/off) | A | **F** "E Talk" chip only · enter trigger → leave | **F** screen prompts | F "Enter send · Esc close" | — |
| Activity log | **A** new lines as outlined text, fade 12 s; nothing when idle | A line "Hold full" | A | H (queued) | **F** box + history + input · Enter → Esc/send | F (last 3 lines) |
| Crew info | **H** (shown diegetically on deck; crew panel on C) | H (crew visibly rest) | H | F at the Inn crew board | H | H |
| Hints | **F** pill, once each · trigger → action or 8 s | | | | | — |

Budget check (Sail): Focused = 0 at rest. Persistent Ambient = cargo + compass + prompt strip, as outlined text
with no plates, ≈1–1.5% of the frame by glyph bounds.
