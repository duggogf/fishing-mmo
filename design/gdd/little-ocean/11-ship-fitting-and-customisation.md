# Little Ocean — 11 Ship Fitting and Customisation

> **Status**: In Design · **Author**: systems-designer + ux-designer for owner · **Created**: 2026-11-26 · **Last Updated**: 2026-11-26
> **Implements Pillar**: P3 Curiosity is the currency of progress (primary), P1, P4 · Supports **H1** (time-to-R2)
> Sources: **owner UX pass 2026-11-26** (00 §9 D9): fitting gets its own screen with real size/weight limits; hiring
> and buying are separate places; cosmetics need a home. Replaces 05's flat upgrade list (`Hold_2`, `Crew_2`, `Hold_3`).

## Summary
The boat is a small fitting puzzle. A **hull** gives deck **slots** (S/M/L), maybe a **keel mount**, and a **load limit**
in kg. **Items** (crates, holds, a bunk, the Swell Keel) each take one slot and add weight. The starter Skiff cannot
carry everything you want. You choose what to leave ashore until you buy the bigger Cutter, which is also the only hull
that can take the Keel that opens Region 2. The same Shipyard screen has **Paint** and **Decor** tabs for cosmetics (colours, patterns and placeable objects on decor points), which
never change stats.
> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: 05 Economy (prices), 04 Crew (berths, `CargoCapacity`),
> 02 Sailing (`Keel` effect), 03 World (gate), 07 Persistence (fit state), 09 Art (visible items, paints), 10 UI (screens)

## Overview
Upgrades used to be four buttons that raised numbers. Now they are objects you put on a boat. The pleasure is the
captain's version of packing a suitcase: "the hold *or* the bunk, not both, until I get the bigger boat". The puzzle is
kept deliberately tiny: 2 hulls, 5 items, one weight number, one real squeeze. It must create a choice without
becoming a spreadsheet (P3, 05 Overview). Every choice is reversible for free in the yard. Everything fitted is
visible on the boat in the world.

## Player Fantasy
"My little Skiff sits low in the water with the new hold on. I had to leave the old crate on the quay to make room.
Next trip I'll have enough for the Cutter, and then she can take the keel *and* a bunk for Tomo." Painting the boat
is dressing her for the harbour. Other captains recognise you by her colours.

## Detailed Design

### Core Rules
1. **Hull** (`HullId`): defines deck slots, keel mount, `LoadLimit`, base hold and base berths (table below). One
   active hull. A bought hull stays moored in the yard and can be switched back to for free while docked.
2. **Items** (`ItemId`): each has a `Size` (S/M/L or `KeelMount`), `Weight` (kg) and one effect. Prototype items
   are unique: each is bought once and owned forever (00 §3: no upkeep, no wear, no repair).
3. **Fit rule**: an item fits a slot if `Size(item) ≤ Size(slot)` (S < M < L). The Keel needs a `KeelMount`.
   Fitting is allowed only if `Σ Weight(fitted) ≤ LoadLimit(hull)`. Otherwise the action is disabled with the reason
   in words: "20 kg too heavy for the Skiff" / "Needs a keel mount (Cutter)" / "No free M slot".
4. **Shed**: owned items that are not fitted wait in the harbour shed. Unlimited, free, no decay.
5. **Effects** (derived, recomputed on Done):
   `CargoCapacity = BaseHold(hull) + Σ HoldBonus(fitted)`; `CrewBerths = BaseBerths(hull) + #Bunk fitted`;
   `HasKeel = Keel fitted` (02/03 gate, D1).
6. **Edits are free and reversible**: in the Shipyard, fitting changes preview live and commit on **Done**; **Cancel**
   reverts. No cost to unfit, swap or re-fit. Allowed only while `Docked`.
7. **Guards**: an edit that lowers `CargoCapacity` below the current `CargoLoad` is blocked ("Sell your catch first").
   An edit that lowers `CrewBerths` below hired crew is allowed. The crew member without a berth waits at the Inn,
   is never lost, and re-boards when a berth returns. The UI says so before Done.
8. **Buying in the yard**: the Shipyard catalogue lists items and hulls for sale beside the owned ones. Buying puts
   the item in the shed and, when it fits, auto-proposes a slot (one click to accept). Purchases ≥ 100 Shells keep
   doc 05's single confirm (D8). There is no other shop for gear.
9. **Crew hiring is not here**: hiring happens at the Inn crew board (doc 04 §Hiring, doc 10). The yard only provides
   berths (the Bunk).
10. **Visible on the boat (diegetic)**: every fitted item has a model on deck or below the hull (09). The waterline
    sinks with load: hull offset = −0.12 m × LoadFraction (F3), visual only, no handling change.
11. **Cosmetics** (Paint and Decor tabs, same screen, same 3D preview): parts, decor points and unlocks in the tables below. Cosmetics
    never change stats, cannot be bought with real money (brief §11) and are applied free once owned.

### Hulls — `DT_Hulls` (PROPOSED; ASSUMPTION – validate by H1 time-to-R2)
| HullId | Price | Deck slots | Keel mount | `LoadLimit` | Base hold | Base berths | Handling |
|---|---|---|---|---|---|---|---|
| `Skiff` | start | S, S, M | no | 200 kg | 14 | 2 | doc 02 values |
| `Cutter` | 180 | S, S, M, M, L | yes | 650 kg | 14 | 2 | identical to Skiff in prototype (02 unchanged); model 1 m longer, taller deckhouse (09) |

### Items — `DT_Items` (PROPOSED)
| ItemId | Display | Size | Weight | Price | Effect | Notes |
|---|---|---|---|---|---|---|
| `FishCrate` | Fish crate | S | 40 kg | starter (fitted) | +6 hold | Start `CargoCapacity` 14 + 6 = **20** (05) |
| `FishHold` | Fish hold | M | 120 kg | 60 | +12 hold | Affordable at first sale (84) |
| `Bunk` | Bunk | S | 60 kg | 40 | +1 berth | Needed to hire Tomo (04) |
| `Keel` | Swell keel | KeelMount | 220 kg | 70 | `HasKeel`: R2 push −85% (D1, 02) | Needs the Cutter |
| `DeepHold` | Deep hold | L | 200 kg | 300 | +12 hold | Post-gate goal (was `Hold_3`); Cutter only |

**The one squeeze (by design)**: on the Skiff, Crate 40 + Hold 120 + Bunk 60 = **220 kg > 200**. The player keeps two
of the three until the Cutter:

| Skiff loadout | Weight | `CargoCapacity` | Crew | Trip feel |
|---|---|---|---|---|
| Crate + Hold | 160 | 32 | 2 | long calm trips |
| Hold + Bunk | 180 | 26 | 3 | shorter, livelier trips, Tomo aboard |
| Crate + Bunk | 100 | 20 | 3 | short trips, crew first |

On the Cutter everything fits: 40 + 120 + 60 + 220 + 200 = **640 kg ≤ 650**, with 10 kg spare that is read as "she's full".

### Cosmetics — Paint and Decor (PROPOSED; prices ASSUMPTION; owner pass 2026-11-26)
The Shipyard has two cosmetic tabs beside **Fit**. Both use the same 3D boat preview. Cosmetics never change a
stat, have no weight, never use gear slots, and can never be bought with real money (brief §11).

**Paint tab** (`DT_Paints`): swatches for Hull, Trim, Sail cloth, plus a hull **Pattern** that the paint fills.

| Part | Starter (free) | Buy with Shells | Earned (discovery, P3) |
|---|---|---|---|
| Hull paint | 4 (Coral Hull default, Sea Foam, Harbour Blue, Biscuit) | 4 × 40 | 1 (Marigold wreck seen → "Wreck-wood") |
| Trim paint | 2 | 2 × 25 | — |
| Sail cloth | 2 (Cream, Stripe) | 1 × 60 | 1 (whale pod seen → "Whale-song sail") |
| Hull pattern | Plain, Waterline stripe | Waves, Scales (2 × 50) | — |

**Decor tab** (`DT_Decor`): placeable objects on **decor points**. Each hull frame has its own points, and each
point takes one object of its type. Decor points are separate from gear slots (rule 3), so dressing the boat
never competes with fitting her.

| Decor point | Skiff | Cutter | Objects that fit (starter **bold**, price, or earned) |
|---|---|---|---|
| Masthead | 1 | 1 | **Pennant**; Gull flag 20; Shallows flag (all R1 places seen) |
| Cabin roof | 1 | 1 | Potted fern 30; Weathervane 45; Gull statue (lighthouse seen) |
| Rail | 2 | 3 | **Brass lamp**; Life ring 20; Flower box 30 |
| Bow | 1 (small: Bell 35) | 1 figurehead | Cutter only: Seal figurehead 120; Marigold figurehead (Marigold wreck seen) |
| Stern | — | 1 | Name board (shows the boat name); Lantern pole 40 |

Total catalogue: 13 objects + 4 patterns. That is enough for every boat in the harbour to look different without
becoming a store. Boat name: free text, ≤16 chars, shown on the name board/stern, filtered (07 POST-PROTOTYPE for MP).

Rules:
- One object per point. Points show only in the Decor tab, as small rings on the boat. Click or press A on a
  ring to see the objects that fit that point type. Hover or highlight to preview, click to place, R to remove.
- The same object may be owned once and placed once (prototype). Rail objects can repeat across rail points only
  if owned more than once (POST-PROTOTYPE).
- Lamps and lanterns light at dusk (09 `LightPhase`), as a visual effect only.
- Switching hulls keeps decor: matching points are re-filled automatically, and the rest goes to the **decor chest**
  (part of the shed) with a one-line notice. A Skiff has no stern or figurehead point, so those wait in the chest.
- The palette and object styles are curated by 09 so any combination reads against the sea and in the cel style.
  Players pick swatches and objects, never a free colour wheel or free placement.
- Earned objects unlock with a log line and a journal stamp. They are a reason to explore, not a checklist (no %).
- Multiplayer (06, paper): other captains see your paint, pattern, decor and name. This is your identity in the harbour.

### States and Transitions
The Shipyard is a sub-screen of `Selling` (01). Inside it: `Fit` · `Paint` · `Decor` tabs. `Pending` edits (preview)
→ **Done** (commit + save, 07) or **Cancel** (revert). Hull switch = pending edit like any other.

### Interactions with Other Systems
| System | Direction | Data |
|---|---|---|
| 05 Economy | in | prices for hulls, items, cosmetics; Shells debit |
| 04 Crew | out | `CargoCapacity`, `CrewBerths`; in: hired crew list |
| 02/03 Sailing & World | out | `HasKeel` (gate); hull visual id |
| 07 Persistence | out | `ActiveHull`, `OwnedHulls`, `OwnedItems`, `Fitting` (slot → `ItemId`), `Cosmetics` |
| 09 Art | out | which item models and paints to show; waterline offset |
| 10 UI | out | Shipyard screen data (slots, weights, reasons) |
| 06 Hangout (paper) | out | cosmetic set for other players' view |

## Formulas
- **F1 Load**: `Load = Σ Weight(fitted)`; fits iff `Load ≤ LoadLimit`. Example Skiff Crate + Hold = 160 ≤ 200 ✓;
  + Bunk = 220 > 200 ✗ ("20 kg too heavy").
- **F2 Capacity / berths**: `CargoCapacity = BaseHold + Σ HoldBonus`; `CrewBerths = BaseBerths + Bunks`;
  `ActiveCrew = min(Hired, CrewBerths)`. Example Skiff Hold + Bunk → 14 + 12 = 26 hold, 2 + 1 = 3 berths.
- **F3 Waterline**: `LoadFraction = Load / LoadLimit` (0–1); hull visual offset = −0.12 m × LoadFraction.
  Example 180/200 → 0.9 → −0.108 m.
- **F4 Time to R2** (re-run of 05 F4 with this catalogue; same model, factor 0.9, R1 travel 0.75 + 0.75, dock 0.5):
  Gate cost = Cutter 180 + Keel 70 = **250** (= old Keel price). Crew cost = Bunk 40 + hire 50 = **90** (= old `Crew_2`).
  Intended path A' (Hold → Bunk + hire (crate ashore) → Cutter + Keel): sales at 6.94 (+84, Hold −60 → 24),
  16.05 (+134 → 158; Bunk −40, hire −50 → 68; cap 26), 21.90 (+109 → 177), 27.75 (+109 → 286; Cutter + Keel −250 → 36).
  **R2 unlock 27.8 min** (was 29.5). Other paths are unchanged in spend and fall at B 19.8 / C 28.3 / D 25.2 min (05).
  The whole band stays 19.8–28.3 min, inside H1's 20–35 min target.

## Edge Cases
- Buy the Keel before the Cutter: allowed. It goes to the shed with the tag "Needs a keel mount (Cutter)". The
  catalogue shows that tag before purchase too.
- Switch back to the Skiff with the Keel fitted: the Keel returns to the shed and `HasKeel` = false. If the boat is
  later in R2 it is pushed back as normal. This is only possible while docked, so it never strands anyone.
- Unfit a hold with fish aboard: blocked if the new capacity < `CargoLoad` ("Sell your catch first").
- Unfit the Bunk with Tomo aboard: allowed after a one-line notice ("Tomo will wait at the Inn"). No refund needed (free).
- Over the limit after a hull switch (Cutter → Skiff with 5 items): the yard auto-moves items to the shed by the order
  Keel, DeepHold, then lightest-first until `Load ≤ LoadLimit`, and lists what moved.
- Item bought that fits nowhere right now (no free slot): it goes to the shed, with the reason shown.
- Cosmetic earned while at sea: log line + journal stamp; usable next time in the yard.
- Save edited to fit illegal loadout: on load, 07 sanitises by the same auto-move order.

## Dependencies
Hard: 05 (prices), 04 (berths, capacity consumers), 02/03 (`HasKeel`), 07 (save fields), 09 (item models, hull 2,
paints), 10 (Shipyard screen). Paper: 06 (cosmetic identity). Each must list 11.

## Tuning Knobs
| Knob | Default | Safe range | Affects |
|---|---|---|---|
| Skiff `LoadLimit` | 200 kg | 160–219 (must stay < 220 for the squeeze, ≥ 160 for Crate + Hold) | whether the squeeze exists |
| Cutter `LoadLimit` | 650 kg | 640–800 | "full boat" feel |
| `Cutter` price | 180 | 140–240 | time-to-R2 (with Keel price) |
| `Keel` price | 70 | 50–120 | time-to-R2; keep Cutter + Keel ≈ 250 |
| `FishHold` / `Bunk` price | 60 / 40 | 40–84 / 25–60 | first purchase moment / crew timing |
| `DeepHold` price | 300 | 200–400 | post-gate goal |
| Cosmetic prices | 20–120 | ×0.5–2 | post-gate Shell sink |
| Decor points per hull | Skiff 5 / Cutter 7 | ±1 | room for expression vs clutter on a small boat |
| Waterline max offset | 0.12 m | 0.05–0.2 m | how visible load is |

## Visual/Audio Requirements
Item models are ActsLayer (inked) props: crate on the stern, hold hatch amidships, bunk = little cabin roof bump, keel
fin visible below the waterline in the yard view, deep hold = second hatch. Fitting: item drops in with a 3-drawing
settle and a wooden thunk; boat dips then settles to the new waterline. Over the limit: boat dips too far and bobs back,
with no error sound, only the words. Paint: brush-swipe wipe across the hull on swatch hover. The new hull looks bigger
from the deck camera.

## Game Feel
The yard should feel like rearranging a beloved room. It should never feel like doing taxes: the main number on screen
is one weight bar, not a stat sheet. Show only the deltas that changed ("Hold 32 → 26 · Crew 2 → 3").

## UI Requirements
Owned by doc 10 §Shipyard: 3D boat preview (left 60%), slot list on the boat, catalogue/shed list (right), weight bar,
delta line, Done/Cancel, tabs Fit · Paint · Decor (decor points as rings on the boat). Mouse drag-and-drop **and** click-select-then-click-slot (keyboard
and gamepad) are both full paths.

## Cross-References
00 §9 D1, D5, D9 · 02 (Keel effect) · 03 (gate, harbour layout: Shipyard, Inn) · 04 (berths, hiring) · 05 (prices, F4) ·
06 (cosmetic identity, paper) · 07 (save fields) · 09 (models, paints, Cutter) · 10 (screens).
Effort (PROPOSED): data + fit logic 2 d, shed + sanitise 1 d, Shipyard UI 4 d, item models 3 d, Cutter hull 3 d,
paint + pattern system (material params) 2 d, decor points + placement 2 d, cosmetic assets (13 objects, 4 patterns) 4 d = **~21 dev-days** (art included).

## Acceptance Criteria
1. On the Skiff, fitting Crate + Hold + Bunk is impossible and the reason reads "20 kg too heavy for the Skiff".
2. The Keel cannot be fitted to the Skiff, and the UI says "Needs a keel mount (Cutter)" before and after purchase.
3. `CargoCapacity` and `CrewBerths` match F2 for every loadout in the squeeze table (unit test).
4. Cancel restores the exact pre-edit loadout; Done saves it (07); no Shells change on fit/unfit.
5. Every fitted item is visible on the boat in a Sailing screenshot, and the waterline offset matches F3 ±1 cm.
6. Playtest H1: median time-to-R2 20–35 min (≥8 players); ≥60% of players make a fit/unfit choice on the Skiff
   before buying the Cutter (telemetry `fit_change`).
7. ≤2 players describe the yard as "spreadsheet" or "inventory management" in the survey (P3).
8. Paint, pattern and decor changes are visible in the world, and no cosmetic changes any stat or weight (code review + data check).
9. Each hull shows exactly its decor points (Skiff 5, Cutter 7); an object can only be placed on a point of its type; switching hulls moves non-matching decor to the decor chest and names it.

## Open Questions
1. Owner: keep the 3-way Skiff squeeze (recommended) or make the Skiff fit all three and only gate the Keel?
2. Owner: should a separate Chandlery shop exist post-prototype (consumables, decor)? The prototype has nothing
   consumable, so there is no general shop.
3. Should the Cutter handle differently (slower turn, steadier in swell)? PROPOSED: not in prototype (02 frozen).
4. Boat name visible to others (06): needs a text filter. Fine in solo; POST-PROTOTYPE for MP.

## Interface values
| Name | Value | Consumer |
|---|---|---|
| `HullId` | `Skiff` (start), `Cutter` (180) | 05, 07, 09, 10 |
| Slots | Skiff S,S,M · Cutter S,S,M,M,L + KeelMount | 10 |
| `LoadLimit` | Skiff 200 kg · Cutter 650 kg | 10 |
| `ItemId` | `FishCrate` (S 40 kg +6), `FishHold` (M 120 +12, 60), `Bunk` (S 60 +1 berth, 40), `Keel` (KeelMount 220, 70), `DeepHold` (L 200 +12, 300) | 04, 05, 02/03, 07, 09, 10 |
| `CargoCapacity` | 20 start; 32 / 26 / 20 Skiff loadouts; 32 Cutter (no Deep hold); 44 Cutter full | 04, 05 |
| `CrewBerths` | 2 base, +1 per Bunk | 04 |
| Gate | `HasKeel` = Keel fitted (Cutter only) | 02, 03 |
| Modelled R2 unlock | A' 27.8 / B 19.8 / C 28.3 / D 25.2 min | 05, 01 |
| Save fields | `ActiveHull`, `OwnedHulls`, `OwnedItems`, `Fitting`, `Cosmetics` (paints, pattern, `Decor` point → `DecorId`, owned decor, boat name) | 07 |
| Decor points | Skiff: masthead, roof, rail ×2, bow (small) = 5 · Cutter: masthead, roof, rail ×3, figurehead, stern = 7 | 09, 10 |
| `DecorId` | Pennant, GullFlag, ShallowsFlag, PottedFern, Weathervane, GullStatue, BrassLamp, LifeRing, FlowerBox, Bell, SealFigurehead, MarigoldFigurehead, NameBoard, LanternPole (13 + name board) | 09, 05, 07 |
