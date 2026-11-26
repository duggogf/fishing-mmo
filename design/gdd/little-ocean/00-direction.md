# Little Ocean — 00 Creative Direction (Prototype GDD)

> **Status**: In Design · **Author**: creative-director (agent) for owner · **Last Updated**: 2026-11-26
> **Source of truth**: `cozy_ocean_game_concept_brief_for_claude.md` ("the brief"). Brief §12 = hard constraints.
> **Scope**: PROTOTYPE. Proves 4 hypotheses (H1–H4). Full-game content is noted only as post-prototype, behind interfaces.
> **Platform/Engine**: PC/Steam premium · Unreal Engine 5 · solo/small team. CONFIRMED (owner).

---

## 1. Vision

**Vision statement.** Little Ocean is a holiday you keep in your pocket: a little boat, a crew that fishes for you,
a painted sea that is always worth looking at, and other sailors drifting by to say hello.

**Player fantasy.** "I own a little boat. My crew takes care of the fishing, so I get to look at the horizon,
wander toward whatever looks interesting, and wave at whoever is nearby." The player is a *captain on holiday*,
not a fisherman and not a tycoon.

**Hook.** "A cozy social hangout like a harbour chat room, AND ALSO a boat that keeps quietly working in a
desktop corner while you do something else."

**MDA priority**: Submission (relaxation) > Discovery > Fellowship > Sensation > Expression. Challenge is
deliberately last. Emotional arc per session: settle in → drift and look → small surprise → return to harbour
with a full hold (quiet satisfaction) → linger socially or tuck into companion mode.

### Pillars

| # | Pillar | This means | This does NOT mean |
|---|---|---|---|
| P1 | **The ocean is the attraction** | Every system exists to make time on the water nicer; regions differ in look, sound, mood and fish, not just numbers. | Menus, spreadsheets or optimisation screens as the main activity. |
| P2 | **Hands off the line** | Fishing is always automated by crew (brief §2, §12). The player's verbs are *sail, look, choose, sell, upgrade, chat*. | Any timing/reeling/QTE minigame, "assist" button that boosts catch, or active-play bonus that punishes idling. |
| P3 | **Curiosity is the currency of progress** | Upgrades open *places* (new region, new conditions), not only bigger numbers. Exploration is rewarded more than efficient routing. | Grind walls, optimal-route meta, daily chores, timers that punish absence. |
| P4 | **Together, never required** | Other boats make the sea feel alive; sharing a sighting is the main exchange. Solo progress is complete and offline-capable. | Parties, co-op gates, trading, PvP, leaderboards, competitive drops. |
| P5 | **Ink what acts, paint what stays** | One coherent painted-cel image: anything with agency is a flat inked cel; everything static is a soft unlined painting. | Realistic water, PBR gloss, bloom-heavy "cinematic" grading, outlines on scenery. |

**Pillar tie-break order**: P2 and brief §12 are absolute; then P1 > P3 > P4 > P5 for scope arbitration.

### Painted-cel look applied to the ocean (vision level; detail owned by doc 09)

- **Acts (inked cel, two-tone, #33273B inverted-hull line)**: player boat, remote boats, crew, NPC vendors,
  fish shown in cargo/catch pop-ups, harbour interactables (sell counter, shipwright), encounter creatures
  (whales/dolphins), buoys/markers that respond to the player.
- **Stays (soft painting, unlined, Kuwahara post, violet shadows, haze)**: open water surface, islands, cliffs,
  harbour buildings, sky dome, clouds, distant shoreline.
- **The water rule**: the sea surface is *painted*, never inked. Its "acting" parts — bow wake, foam crest at the
  hull, splash when fish are landed, encounter ping ripple — are hard-edged drawn VFX on twos. The ground plane
  is calm painting; the motion on it is ink.
- Raw sRGB, no tone mapping; region identity comes from palette + sky + haze colour, not from lighting realism.

---

## 2. Prototype goals (hypotheses + pass/fail)

Playtest panel: ≥8 external players in the cozy/idle target audience, 45-min session each, plus a silent
observer form and a 5-point post-survey. All criteria PROPOSED; thresholds can be tuned once, before the test.

| ID | Hypothesis | PASS if | FAIL if |
|---|---|---|---|
| H1 | **Core solo loop is satisfying**: sail → crew auto-fishes → cargo fills → sell at harbour → buy upgrade → 2nd region opens. | ≥75% of players complete first full loop (first sale) in ≤8 min AND unlock Region 2 in 20–35 min unaided; ≥70% rate "relaxing" ≥4/5; ≤1 player reports "nothing to do while the crew fishes" as top complaint. | Median R2 unlock >45 min or <12 min; or ≥3 players ask for manual fishing / say it feels like a spreadsheet. |
| H2 | **Painted-cel look reads and is liked.** | Shown 3 stills blind, ≥70% describe it with anime/painted/illustration words; ≥70% rate look ≥4/5; ink/paint split correctly identified as "the boats/people are drawn" by ≥60%. | ≥40% say "plastic", "mobile game" or "unfinished"; or game drops below 60 fps at 1080p on GTX 1660-class with the post stack on. |
| H3 | **Harbour hangout feels alive.** 2–8 players in a room: interpolated nearby boats, text chat, one shared encounter ping. | Remote boats show no visible teleport/jitter in ≥90% of observer samples at 150 ms RTT / 2% loss; ≥60% of players send ≥1 chat; ≥50% of players sail toward a shared ping within 60 s of it firing. | Players report "I didn't notice other people" (≥40%) or jitter complaints ≥3; any loss of local control due to network. |
| H4 | **Desktop companion mode is something people would leave running.** | ≥50% voluntarily use compact mode ≥5 min; GPU ≤10% and CPU ≤5% on reference PC in compact mode; RAM ≤1.5 GB; ≥60% rate ambient audio ≥4/5. | Compact mode costs >25% of full-mode GPU; or players call it "pointless" (≥40%). |

Instrumentation needed (prototype telemetry, local CSV only): time-to-first-sale, time-to-R2, chat count,
ping-response latency, compact-mode minutes, fps/GPU/CPU samples.

---

## 3. Prototype scope

**IN**
- 1 harbour (social hub + NPC fishmonger + shipwright), Region 1 (Tier 1, calm coastal) and Region 2 (Tier 2,
  one distinct condition: fog or swell), seamless with a soft transition band.
- Arcade sailing (throttle/steer/anchor), local-only simulation, camera orbit.
- 1 boat hull, 2 CrewSlots, ~10–12 fish species (6 R1, 5–6 R2), cargo + sale.
- 3–4 upgrades total, one of which is the R2 gate (the Keel, per D1).
- One soft currency (Shells), one NPC price table, no market simulation.
- Local save (single slot) with autosave; fully playable offline.
- Harbour hangout room: 2–8 players, position snapshots + interpolation, text chat with basic filter, one
  scripted shared encounter (e.g. whale pod passing) broadcast as a ping.
- Compact companion window: one fixed layout, ambient audio bed, reduced rendering.
- Painted-cel render stack on all of the above; 1 weather visual (fog or light rain) for R2.

**OUT (post-prototype; keep the interface, do not build)**
- Steam Inventory drops, redemption, server eligibility → keep `IRareDropService` stub returning "ineligible".
- Kraken, legendary fish, mythical encounters → keep `EncounterDef` data shape extensible.
- Regions 3+, biome blending beyond 2, icebergs, storms as navigation hazard.
- Cosmetics shop & ship customisation beyond 2 paint colours (needed to tell boats apart in H3).
- Cloud save, account services, matchmaking across many rooms, moderation tools beyond a word filter.
- Crew levelling/traits beyond one efficiency stat; photo mode; journal beyond a simple "seen" list.

**DO NOT BUILD (ever, or not in prototype by explicit decision)**
- Any manual or skill-based fishing input (brief §12). · Offline/background fishing or catch-up on load (§12).
- Player-to-player trading, gifting of currency/fish, shared market (§12). · PvP, leaderboards, competitive timers.
- Survival meters (hunger, fuel, hull damage that sinks you). · Dynamic pricing/supply-demand simulation.
- Dedicated MMO servers, server-authoritative movement, per-frame sync. · Daily login rewards / chores.
- A second companion-mode layout or resizable companion window (§9 "one fixed layout").

---

## 4. GDD document map

All files in `design/gdd/little-ocean/`, each following `.claude/docs/templates/game-design-document.md`
(all 15 sections; "N/A for prototype — reason" is allowed, blank is not).

| File | System | Brief sections | Layer / Priority |
|---|---|---|---|
| `01-core-loop-and-session.md` | Core loop, session flow, FTUE, pacing targets for H1 | §1, §2, §12, §13.10 | Core / MVP |
| `02-sailing-and-boat-handling.md` | Movement model, camera, anchor, harbour docking | §3, §10 (client sim) | Foundation / MVP |
| `03-world-regions-and-discovery.md` | Map dims, harbour, R1/R2 layout, transition band, gate, discoveries, R2 weather | §3, §4, §13.3, §13.4 | Core / MVP |
| `04-crew-and-automated-fishing.md` | Crew slots, catch rate, species tables, cargo fill | §2, §5, §13.2 | Core / MVP |
| `05-economy-and-upgrades.md` | Shells, sell prices, upgrade costs, R2 gate, progression curve | §4, §5, §11, §13.1 | Core / MVP |
| `06-harbour-hangout-multiplayer.md` | Room model, presence, interpolation, chat, shared encounter ping, bandwidth/cost | §6, §7, §10, §13.6 | Feature / MVP |
| `07-persistence-offline-and-services.md` | Local save, offline behaviour, service stubs (rare drop, cloud) | §8, §10, §13.7, §13.8 | Foundation / MVP |
| `08-companion-mode-and-ambient-audio.md` | Compact window, reduced rendering, audio beds per region | §9, §13.9 | Feature / MVP |
| `09-art-direction-painted-cel.md` | Ocean mapping of the painted-cel look, palettes, water, VFX, perf budget | §1, §3 (mood) | Presentation / MVP |
| `10-ui-ux-and-hud.md` | HUD, harbour menus, chat UI, ping UI, accessibility baseline | §6, §9 UI, cross-cutting | Presentation / MVP |

---

## 5. Team plan (5 drafting agents)

### A1 — systems-designer → `01`, `04`, `05` (role: `.claude/agents/systems-designer.md`, absorbs economy-designer)
- Define the loop as a state machine: `Docked → Sailing → (CargoFull) → Returning → Docked/Selling → Shipwright`.
- Catch formula at prototype fidelity: `CatchRatePerMin = Σ CrewSlot.Efficiency × RegionTier.BaseRate × BoatSpeedFactor`; show worked examples for 1 and 2 crew in R1/R2.
- Species table: weight, rarity weight, value in Shells, region; weighted pick formula; no rarity above "Uncommon+" in prototype.
- `CargoCapacity` per hull/upgrade; target ~4–6 min to fill on starting setup in R1; full hold never stops sailing, only stops catching.
- Prices and upgrade costs that hit H1: first sale ≤8 min, R2 gate affordable at 20–35 min; give a minute-by-minute income table.
- Crew is "hired" with Shells, one efficiency stat, no wages/upkeep (no chores, §12).
- Must state explicitly: crew fishes only while app is running and boat is in a fishing zone (not in harbour); no catch-up on load.
- Interfaces: agree `RegionTier`, `ZoneId`, `BoatSpeedFactor` with A2; `PlayerProgress` save fields with A4; HUD values with A5.
- Must NOT: add manual fishing input, active-play bonuses, dynamic prices, upkeep timers, more than 4 upgrades.

### A2 — level-designer (world/navigation) → `02`, `03` (role: `.claude/agents/level-designer.md`; consult `world-builder.md` for flavour only)
- Arcade boat model: max speed (knots), accel/decel seconds, turn rate (°/s), anchor; no fuel, no hull damage.
- Map size in metres; harbour footprint; R1 and R2 area; sail time harbour→R2 edge at base speed (target 60–120 s).
- Transition band width and what changes across it (palette, fog density, audio bed, species table) — continuous, not a load.
- R2 gate: what physically happens without the upgrade (soft turn-back current or fog that disorients — never death/damage).
- 3–5 hand-placed discoveries (wreck, odd rock, lighthouse) giving a "seen" journal entry; one requires R2 condition.
- Harbour layout supports 8 docked boats + gathering space; spawn points for the hangout.
- Interfaces: `ZoneId`/`RegionTier` volumes for A1; encounter spawn lanes and room bounds for A4; camera framing for compact mode with A5; palette per region with A3.
- Must NOT: design Regions 3+, survival hazards, procedural ocean, lore bibles longer than one paragraph per region.

### A3 — art-director → `09` (role: `.claude/agents/art-director.md`; may consult `technical-artist.md`)
- Translate "ink what acts, paint what stays" into an explicit classification list for every prototype asset.
- Water: painted surface approach in UE5 (gradient + painted normals, no realistic reflections); how waves read under Kuwahara.
- Two region palettes (R1 coastal warm, R2 fog/cool) and harbour; sky dome + haze colours; violet shadow values.
- VFX list (wake, splash, catch pop, ping ripple, fog wisps) drawn on twos, hard-edged.
- Render budget: target 60 fps at 1080p on GTX 1660 / Ryzen 5 3600 with post on; compact-mode render settings co-owned with A5.
- Remote-boat readability at 50–300 m (silhouette, ink weight), 2 paint colours.
- Interfaces: reference the painted-cel SKILL.md spec, do not restate it; agree region palettes with A2, UI colour tokens with A5.
- Must NOT: introduce PBR/realism, tone mapping, bloom-driven looks, outlines on static scenery, asset counts beyond prototype.

### A4 — network-programmer (with technical-director remit) → `06`, `07` (role: `.claude/agents/network-programmer.md`; consult `technical-director.md`, `ue-replication-specialist.md`)
- Room model: 2–8 players per harbour room, managed hosting (e.g. one lightweight relay/listen process); rationale vs UE dedicated servers.
- Snapshot rate (target 4–10 Hz), interpolation buffer (ms), extrapolation cap, snapshot packet size; bandwidth per client and per room with worked math.
- Local movement never waits on network; what happens on disconnect (boat stays, others fade out), reconnect.
- Chat: rate limit, max length, word filter, mute/block; no persistence beyond session.
- Shared encounter ping: who triggers (server timer), payload (`EncounterId`, position, expiry), dedupe, latecomers.
- Hosting cost estimate per 100 CCU at prototype scale.
- Save: single local slot, schema version, autosave cadence, corruption fallback; offline = full solo loop.
- Stubs: `IRareDropService`, `ICloudSaveService` with signatures and failure states, unimplemented.
- Must NOT: server-authoritative movement, MMO shards, Steam Inventory implementation, sync of economy or catch to server.

### A5 — ux-designer → `08`, `10` (role: `.claude/agents/ux-designer.md`; consult `audio-director.md`, `ue-umg-specialist.md`)
- Companion mode: fixed window size (propose e.g. 480×270), always-on-top toggle, contents (ocean, boat, crew, cargo bar, 3 controls: return-to-harbour autopilot?, mute, expand).
- Reduced rendering: frame cap (e.g. 15–20 fps), render scale, post stack subset, audio continues; numeric GPU/CPU targets matching H4.
- What the boat does in companion mode (holds course / circles / anchors in zone) — must not auto-sell or chore.
- Ambient audio: layers (waves, wind, gulls, rain) per region/weather, crossfade on transition band.
- HUD: cargo bar, Shells, region name, ping indicator; harbour sell/shipwright screens ≤2 clicks deep.
- Chat UI and ping UI (compass marker, distance in metres, expiry); controls for KB+M and gamepad.
- Accessibility baseline: text scale, subtitles for ping callouts, colourblind-safe cargo/ping colours, remap.
- Must NOT: add a second companion layout, notifications that nag, monetisation UI, cosmetics shop screens.

**Reviewer**: creative-director scores every doc with the §7 rubric; owner decides on open questions.

---

## 6. Shared conventions

**Units**: distance metres (m); time seconds (s), minutes for pacing tables; speed knots (kn) in player-facing
text, m/s in formulas (1 kn = 0.5144 m/s); angles degrees; currency Shells (integer); rates per minute.
Network sizes in bytes, rates in Hz, bandwidth in kbit/s.

**Shared names (PascalCase, use exactly)**

| Name | Meaning | Owner |
|---|---|---|
| `RegionId` / `RegionTier` | `Harbour`, `R1_Shallows`, `R2_Swells`; tier 0/1/2 | A2 |
| `ZoneId` | fishing-allowed volume inside a region | A2 |
| `TransitionBand` | blend volume between regions (width in m) | A2 |
| `GateRequirement` | upgrade id required to enter a region without the soft turn-back | A1/A2 |
| `BoatSpeed`, `BoatSpeedFactor` | m/s; catch modifier from speed | A2 / A1 |
| `CrewSlot`, `CrewMember.Efficiency` | slot on hull; float multiplier (1.0 baseline) | A1 |
| `CatchRatePerMin`, `CatchRoll` | fish per minute; weighted species pick | A1 |
| `SpeciesId`, `Rarity`, `BaseValue` | fish data row | A1 |
| `CargoCapacity`, `CargoLoad` | units (1 fish = 1 unit in prototype) | A1 |
| `Shells` | the only currency | A1 |
| `UpgradeId` | e.g. `Hold_2`, `Crew_2`, `Keel` | A1 |
| `PlayerProgress` | save struct: Shells, upgrades, journal, position | A4 |
| `RoomId`, `PresenceSnapshot`, `SnapshotHz`, `InterpDelayMs` | multiplayer | A4 |
| `EncounterId`, `EncounterPing` | shared encounter + broadcast | A4 (content A2) |
| `PhaseKey` | `Docked`, `Sailing`, `Returning`, `Selling` (loop state; shipwright is a sub-screen of `Selling`). `Compact` is NOT a PhaseKey (loop-1 ruling) | A1 (UI A5) |
| `HoldFull` | fishing-paused state when `CargoLoad == CargoCapacity` (D2) | A1 |
| `Keel` | `UpgradeId` that is the `GateRequirement` for `R2_Swells` (D1); lets the boat push through swell | A1 (price) / A2 (push model) |
| `CrewId` | `Mabel`, `Pip` (starter), `Tomo` (3rd, via `Crew_2`) (D5, D7) | A1 (rules) / A3 (look) |
| `ViewMode` | `Full` / `Compact` (overlay; the loop `PhaseKey` underneath is kept) | A5 |
| `ActsLayer` / `StaysLayer` | painted-cel render classification | A3 |
| `LightPhase` | `Day` / `Dusk` lighting data asset (art; never a loop state) | A3 |
| `RegionLook` | per-region palette + haze + weather look, blended across `TransitionBand` | A3 (region data A2) |

New shared names: add to this table via the reviewer; do not coin synonyms (no "Gold", "Coins", "Hold", "Biome Level").

**Labels (inline, bold, at the start of a rule or number)**
- `CONFIRMED (brief §n)` or `CONFIRMED (owner)` — traceable decision; cite the section.
- `PROPOSED` — the agent's design choice; must have a one-line rationale.
- `ASSUMPTION – validate by X` — a number or belief without data; X = specific playtest metric, profiling capture or prototype test (e.g. "validate by H1 time-to-R2 median").
- `POST-PROTOTYPE` — noted only; must name the interface that keeps the door open.

Each doc ends Acceptance Criteria with testable statements tied to H1–H4 where relevant.

---

## 7. Review rubric (critique loops)

Score each criterion 1–5 (1 = absent/violating, 3 = adequate with gaps, 5 = buildable as written).

| # | Criterion | 5 looks like |
|---|---|---|
| R1 | **Pillar fidelity** | Every rule traces to P1–P5; nothing pulls toward grind, optimisation or required co-op. |
| R2 | **Brief §12 compliance** | Zero violations; any tension raised as an optional alternative, never silently designed in. **Any violation = automatic 1.** |
| R3 | **Prototype buildability (solo UE5 dev)** | Scope fits the IN list; uses stock UE5 features or small, named custom pieces; effort estimate in dev-days. |
| R4 | **Cross-doc consistency** | Uses §6 names/units exactly; interfaces match the partner doc's numbers. |
| R5 | **Concrete formulas & numbers** | Formulas with variables defined, sample values, at least one worked example, tuning knobs with safe ranges. |
| R6 | **Art-direction fit** | Visual/Audio section respects ink-what-acts / paint-what-stays and the ocean mapping in §1. |
| R7 | **Hypothesis linkage & testability** | Acceptance criteria measurable and mapped to H1–H4. |
| R8 | **Honesty of labelling** | CONFIRMED/PROPOSED/ASSUMPTION used correctly; no false certainty; edge cases covered. |

**Go/no-go per doc**: GO if total ≥ 30/40 AND no criterion < 3 AND R2 = 5. Otherwise revise (max 2 loops,
then escalate to owner). **Set-level GO**: all 10 docs GO and an R4 cross-check of the §6 table passes.
If a doc could not be scored on a criterion (missing input), mark it `NOT ASSESSED` — that blocks GO, it is
not a pass.

---

## 8. Open questions for the owner

1. ~~R2 gate mechanic~~ RESOLVED by D1 (Swell + Keel).
2. **Companion-mode boat behaviour**: anchor in place and fish (PROPOSED, simplest) vs slow autopilot loop — and may compact mode auto-return to harbour when the hold is full, or should that always be a player action?
3. **Multiplayer backend for the prototype**: UE5 listen-server/relay via Steam networking (cheapest, PROPOSED) vs a small managed room service (e.g. third-party rooms) — any preference or existing account?
4. **Crew presence**: should crew be named, visible characters on deck (stronger fantasy, more art cost) or anonymous figures in the prototype?
5. **Playtest panel**: can you recruit ≥8 external testers, or should criteria be rescaled for a smaller friends-and-family test?
6. **Reference hardware**: is GTX 1660 / Ryzen 5 3600 / 16 GB the right minimum-spec target for the perf criteria in H2/H4?

---

## 9. Owner decisions (2026-11-26) — SUPERSEDE anything above that conflicts

| # | Decision | Effect on docs |
|---|---|---|
| D1 | **R2 gate = Swell + Keel.** Region 2 has heavy swell that pushes small boats back (never damages them); buying the Keel upgrade lets the boat push through. | 02 owns swell push-back handling model; 03 owns swell band placement/telegraphing; 05 owns Keel price. |
| D2 | **Companion mode: boat drifts in place, crew keeps fishing while the game runs, fishing pauses when cargo is full.** No auto-sailing, no auto-return/auto-sell. | 08 owns; 04 must define the "cargo full → fishing pauses" state. |
| D3 | **Harbour hangout multiplayer = PAPER PROTOTYPE only.** No networking is implemented in the prototype. Doc 06 specifies the design (room model, presence, interpolation, chat, encounter ping, capacity, bandwidth/cost estimates) and a paper/tabletop/thought-experiment test protocol to validate hypothesis (c) in theory. Hypothesis (c) pass/fail becomes paper-test criteria. Code must still keep a clean seam (interfaces) so networking can be added later. | 06 rewritten as paper spec + test protocol; 07 drops any live-service work beyond interface stubs; 10 designs chat/ping UI as mock-ups only. |
| D4 | **Crew are visible, named inked cel characters** (2–3 on the starter boat) with idle and fishing animations. | 04 (crew rules, names/traits at prototype fidelity), 09 (crew cel spec), 10 (crew UI). |
| D5 | **Crew count clarification:** the starter boat has 2 CrewSlots filled by 2 named crew; the `Crew_2` upgrade adds a 3rd slot/crew (so 2–3 crew per D4). | 04, 05, 09, 10 |
| D6 | **Drifting/anchored boats still fish.** `BoatSpeedFactor` at speed 0 must be > 0 (companion mode depends on it). | 04 owns the value; 08 depends on it. |
| D7 | **Crew look = faceless blocky dummies** (owner, after loop-1 start). Chunky low-poly figures (block head, torso, limbs), **no face decals**, rendered in the normal cel pipeline (2-tone + ink line + contact blob). Each crew member is identified by a solid body/skin colour plus a simple shirt colour and pants colour (3 flat colour blocks). Names (Mabel, Pip, Tomo) are kept in the UI alongside a colour swatch; on the boat, colour is the identifier. Not a true pixelated render pass. | 09 (replace crew cel spec: shapes, per-crew colour triplets, colour-blind separation incl. a shape/pattern backup cue), 10 (portraits become colour-swatch dummy icons), 04 (crew names unchanged). |
| D8 | **Consistency pass (2026-11-26).** Owning doc's value wins. (1) Catch tick clamp: one name and value, `MaxTickDt` = 0.25 s (04 owns; 07 uses it; 08's ≥10 Hz minimised sim stays under it). (2) R2 weather = `Drizzle` (03 owns; Bell Buoy needs it); 09 drizzle overlay, 08 Rain layer in scope. (3) Purchase confirm: 05 owns it; one confirm for purchases ≥ 100 Shells (`Keel`, `Hold_3`), one click below. (4) Chat max = 140 chars (06 owns). (5) Camera: 02 owns, 28 m arm, FOV 60°; 09 and 06 F4 recomputed (crew ≈ 5.5% / 59 px at 1080p; risk at far zoom). (6) Boat length = 8 m (02 owns). (7) FTUE timing: 01 owns, first sale ≈ 6.9 min (~6:56); 10 onboarding aligned. | 04, 07, 08 (1); 08, 09 (2); 10 (3, 4, 7); 06, 09 (5); 09 (6) |
