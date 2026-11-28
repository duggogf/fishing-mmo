# Little Ocean — 09 Art Direction: Painted-Cel Ocean

> **Status**: In Design · **Author**: art-director (agent A3) for owner · **Last Updated**: 2026-11-26 · **Last Verified**: 2026-11-26
> **Implements Pillar**: P5 Ink what acts, paint what stays (primary); P1 The ocean is the attraction
> **Technique source**: painted-cel-look skill (`SKILL.md`, `references/palette-and-values.md`, `unreal-port.md`,
> `vfx-and-ui.md`, `characters.md`), cited below as **[SKILL]**, **[PAL]**, **[UE]**, **[VFX]**, **[CHR]**. Technique only:
> no characters, places or identity colours from the source project are reused.
> **Feel override (D10, 2026-11-28)**: `12-prototype-feel-spec.md` owns crew outline, VFX look, beam and gauge (§7–§9). Where this doc's feel or presentation values differ, follow 12.

## Summary

Defines how Little Ocean applies the painted-cel look to a sea: what is inked vs painted, how the painted water
surface works under the paint post, the palette (structural + new identity colours), Day/Dusk light phases plus one
R2 weather look, the crew cel spec, prototype VFX, the UE5 render mapping, the perf budget and the look-dev gate.

> **Quick reference** — Layer: `Presentation` · Priority: `MVP` · Key deps: 02 Sailing (camera, buoyancy), 03 World (regions, swell band), 04 Crew, 08 Companion mode, 10 UI

## Overview

Every frame is one coherent image: a calm, unlined painted sea and sky, with a small inked boat and its inked crew
riding on it. The sea is the "ground" of this game, so it obeys the ground rules of the look (value band, low local
contrast) and leaves the value extremes and all line work to the things that act. Motion *on* the water (wake,
splash, spray, ripples) is drawn VFX on twos. The look must hold from every orbit angle and survive a 512×320
companion window. Labels per 00 §6: **CONFIRMED**, **PROPOSED**, **ASSUMPTION – validate by X**, **POST-PROTOTYPE**.

## Player Fantasy

"I'm looking at a painting of a holiday sea, and my little boat and crew are the drawn characters in it." The player
should want to leave the camera on the horizon (P1), and should be able to tell, without being taught, that the boat,
the crew and the bobbing buoys are the things that *do* something (affordance through ink, [SKILL] one rule).

## Detailed Design

### Core Rules

**1. Classification (`ActsLayer` / `StaysLayer`)** — **CONFIRMED (00 §1)** for the split; per-asset list **PROPOSED**.

| ActsLayer (inked two-tone cel, `#33273B` hull line, contact blob, after paint post) | StaysLayer (soft painting, unlined, Kuwahara, violet shadow, haze) |
|---|---|
| Player boat (hull, cabin, mast, pennant; 2 hulls `Skiff`/`Cutter` and fitted item props per doc 11) · crew (2–3) · NPC fishmonger + shipwright + innkeeper · sell counter, shipyard slipway and Inn crew board (interactable) · zone buoys and R2 swell-gate buoy (bob + react to boat proximity) · fish in catch pop · gulls (ambient, they move) · remote boats (spec only, D3) · `E_WhalePod` whales (solo local encounter, loop-1 ruling 5: 2–3 blocky-bean whale cels, ≤ 1.5k tris each, 1 px line beyond 4% screen height, surface/blow loop on twos); other encounter creatures POST-PROTOTYPE (`EncounterDef`) | Sea surface (all regions) · islands, cliffs, rocks · harbour quay, buildings, piers, ropes, crates · moored decorative boats (sway via WPO like foliage, no line) · discoveries (wreck, odd rock, lighthouse; proximity-triggered, not interactable) · sky dome, clouds, backdrop rings, sun-glint path, R2 rain curtain card |

Tie-break **PROPOSED**: if the player can click it, it pushes the boat, or it is a crew member, NPC or creature → Acts. Otherwise Stays.
Discoveries stay painted so the inked set remains small and meaningful; their journal ping is UI, not ink.

**2. Water is painted** — **CONFIRMED (00 §1 water rule)**; method **PROPOSED**.
- Opaque **unlit** material on a camera-following tiled plane (4 rings of LOD). No SSR, Lumen reflections, refraction,
  translucency, Fresnel, specular or caustics. Colour = 3-band painted ramp (trough / body / crest) driven by
  `waveN` (below) mixed with a distance gradient to the region far-tint, then haze.
- Motion: 3 summed sine swells in WPO (same function sampled on CPU for boat bob — interface with 02), plus two
  slow-scrolling **painted daub textures** (not normal maps for lighting; they modulate the band choice).
  Surface motion is smooth, on ones (it is the background and the camera's world, [SKILL] stepped rule).
- **Kuwahara awareness**: r=2 erases features under ~5 px. Daub features must be **≥ 10 px on screen at gameplay
  distance** (texel size set from Formula F3); smaller daubs boil into mush. The wobble noise is world-anchored on
  the water (UV from world XZ) so the paint does not "crawl" across a still sea when the camera orbits.
- **Value band**: water L* 40–78 everywhere, local contrast ≤ 15 L* (trough→crest in any 64 px window) [PAL tone
  rules]. Value extremes belong to hulls, crew whites, foam VFX and ink.
- **Sun-glint path**: a painted band of cream daubs (`#FFF6E3` at ≤ 35%) toward the sun azimuth, view-dependent but
  stepped into 2 bands, never a specular highlight. Counts toward the 78 L* ceiling.
- **No cast shadows on water** (perf, legibility). The only dark-on-water is each cel's **contact blob**: Shadow
  Wisteria `#6E6AA8` at 45%, feathered ellipse decal under hull, scaled to waterline.
- Swell (R2) crests are painted: a darker trough band + a painted foam-lip daub row; only spray where swell meets the
  hull is inked VFX.

**3. Palette** — structural colours **CONFIRMED [PAL]**; identity and environment swatches **PROPOSED** (L* approx., verify in capture).

| Structural (kept) | Hex | Little Ocean identity (new, one owner each) | Hex | Owner |
|---|---|---|---|---|
| Aubergine Ink | `#33273B` | **Coral Hull** — the hero colour | `#E8553F` | Player boat paint A (default) |
| Paper Cream | `#FFF6E3` | **Lantern Yellow** | `#F7CF4A` | Boat paint B (second paint, needed to tell boats apart) |
| Cocoa | `#6B4A35` | **Crew triplets** (body / shirt / pants, D7) | see rule 5 | Mabel, Pip, Tomo |
| Shadow Wisteria | `#6E6AA8` | — | — | — |
| Day sky `#3F9BE6` / `#A9DBF5` | — | — | — | — |
| Dusk sky `#8E6FB0` / `#F7A45A` | — | **Beacon Amber** | `#FF9B21` | Encounter ping / player marks (UI + VFX) |

Rules **CONFIRMED [PAL]**: identity colours ≥ ΔE2000 15 from every environment swatch and each other, incl.
protan/deutan/tritan sim; on a clash, move the environment swatch. Identity colours never appear in StaysLayer.
Sea is blue-green, so hull and ping identity hues are warm (complementary contrast); crew identity is carried
mainly by **lightness steps** between blocks, which survive colour-deficiency simulation (rule 5). Fish species use any two-tone hue ≤ 90% sat that is ≥ ΔE 15 from identity colours.

| Region water / land swatch | Trough | Body | Crest daub | Far tint | Land/accent |
|---|---|---|---|---|---|
| Harbour (calm jade) | `#4E9690` (≈57) | `#63ADA0` (≈66) | `#7BBDAD` (≈72) | `#9FCFC6` | Quay stone `#D9C9A8`, warm wood `#B98656`, roof `#6F8296` |
| R1_Shallows (warm turquoise) | `#449BAE` (≈60) | `#4FB3BF` (≈68) | `#6FC2C6` (≈74) | `#A6DCE8` | Sand `#EBD9AE`, island green `#6FA35A`, rock `#9C8F86` |
| R2_Swells swell zone (deep, cool) | `#35688F` (≈42) | `#3E7FA6` (≈51) | `#5891B3` (≈58) | `#9DB6CC` | Cliff `#7F8496`, kelp-dark `#4C6B5A`, foam lip `#C9DCE6` |

Saturation ceilings [PAL]: water/land ≤ 70% HSV, sky ≤ 75%, cels/VFX ≤ 90%. (`R2_Swells` per 00 §6.)

**4. Light phases and weather** — phase values **CONFIRMED [PAL] Day/Dusk tables**, used unchanged for sky, key,
shadow tint, bounce, cloud, sun glow and character key. Ocean additions **PROPOSED**:

| Field (new) | Day | Dusk | R2 Drizzle overlay (weather, 03) |
|---|---|---|---|
| Water key multiply | `#FFFFFF` | `#FFD2A8` (warms sea, keeps L* ≥ 40) | `#E6EEF2` (cool, water saturation −10%) |
| Glint path colour / max | `#FFF6E3` / 0.35 | `#FFD98A` / 0.50 | off |
| Haze colour / near / far (m) | `#D6ECF6` / 60 / 900 | `#F4B98C` / 50 / 800 | `#C8D6E0` / 40 / 500, max 0.60 |
| Sky zenith / horizon | Day key | Dusk key | lerp 40% toward `#9DB6CC` / `#D9E3EA` |
| Cel haze (beyond 120 m, stepped 2 levels) | 0 / 0.20 | 0 / 0.25 | 0.10 / 0.30 |

The data asset name is **`LightPhase`** (Day, Dusk) to avoid colliding with §6 `PhaseKey` (loop state); per-region
look is **`RegionLook`** (palette + haze + weather). Both are in 00 §6 (loop-1 ruling 6). Cycle **PROPOSED**: Day 20 min →
Dusk 8 min → 20 s blend back to Day (no night in prototype); blend = sRGB lerp of every field over 20 s [PAL].
**Weather = `Drizzle` in R2 (CONFIRMED, 03 owns; D8)**, which the Bell Buoy discovery needs. Overlay = the palette tweak in
the table above (cooler water key, −10% water saturation, overcast sky lerp, lighter haze than a fog so streaks read)
+ **drawn rain streaks** on twos (VFX table) + a painted grey rain-curtain card on StaysLayer, seen from R1 over the north
(03 telegraph). Fades with 03 intensity; streak density ∝ intensity, full at ≥ 0.5. No effect on catch or boat visibility.

**5. Crew cel spec** — **CONFIRMED (D4, D5, D7)**: visible, named (`CrewId` Mabel, Pip starter; Tomo hired at the Inn crew board, needs a Bunk — D9, docs 04/11),
faceless chunky low-poly **block dummies** (block head, torso, upper/lower limbs), **no face decals**, in the normal
cel pipeline (two tones, `#33273B` inverted-hull ink, contact blob). Identity = 3 flat colour blocks (body, shirt,
pants). Not a pixelated render pass. Proportions, colours and cues below **PROPOSED**.
- Build: ~1.0 m tall (boat 8 m, 02 owns hull size; crew ≈ 1/8 of hull length); head cube ≈ 0.28 m, torso 0.40 m, legs 0.32 m.
  Every block is a separate shell with a 1-segment chamfer (softens the box so the hull line stays even), rigidly
  skinned to one bone (dummy joints show a small gap: on-style, and gives free interior overlap lines [SKILL]).
- Ink hull normals: direction from each block's centre (y × 1.4), the [SKILL] inked-prop method, so box corners do not split.
- Shading: boxes shade per face, so with the overhead key a face turned away goes fully into shade. Crew use their own
  terminator `t_crew = −0.30` (Tuning) so only faces turned well away shade; target shade share 15–30% Day — ASSUMPTION –
  validate by look-dev orbit capture. Shade = the standard lavender multiply; whites → `#D8D2EA`; no shadow maps on crew.
- Budget: **≤ 800 tris per crew** (≈ 10 chamfered blocks + accessory), 1 shared 12-bone skeleton, 1 material with a
  3-entry colour table (body/shirt/pants) per `CrewId` → 1 draw + 1 hull draw per crew.

| `CrewId` | Body | Shirt | Pants | Backup cue 1: fixed station | Backup cue 2: one block-shape difference | Backup cue 3: fishing action (on twos) |
|---|---|---|---|---|---|---|
| **Mabel** | Umber `#8E5A40` (L*≈43) | Rosehip `#D63F7C` (≈51) | Slate `#5A6B8C` (≈45) | Stern-left | Torso block 1.3× wide, legs 0.8× long (stocky) | Hauls a hand-net over the rail, 6 drawings |
| **Pip** | Peach `#F6D2AE` (≈87) | Sprout `#86C445` (≈73) | Denim `#4F79B0` (≈50) | Bow-right | Tall block beanie (0.18 m cube on head) — tallest point on deck | Long rod, bob-and-wait, 4 drawings + 2-pose hold |
| **Tomo** | Tan `#C0906A` (≈64) | Breton stripe `#2F4C8A` (≈33) / `#FAF4E6` (≈96), 3 stripes | Sand `#D8C49A` (≈80) | Mid-left | Flat wide cap brim slab (0.36 × 0.04 m) | Hand-line over the side, 5 drawings |

**Colour-deficiency separation** — ASSUMPTION – validate by (a) UE5 buffer visualisation colour-deficiency view
(verify in UE5.x) on look-dev captures, (b) an offline ΔE2000 check of sampled pixels after Machado-2009 protan /
deutan / tritan simulation, (c) 1 colour-blind tester naming crew from 10 stills (≥ 9/10). Hand estimates below use the
carrying block's **lightness difference only** (lightness largely survives CVD simulation; hue gains are not counted),
so they are lower bounds. Protan darkens reds (Coral, Rosehip) by up to ~10 L*; pairs below avoid relying on red blocks.

| Pair | Carrying block (≥ 15 target) | ΔL* | Est. ΔE00 normal / protan / deutan / tritan |
|---|---|---|---|
| Mabel–Pip | Body 43 vs 87 | 44 | ≥ 35 / ≥ 35 / ≥ 35 / ≥ 35 |
| Mabel–Tomo | Body 43 vs 64 (+ stripe pattern) | 21 | ≥ 20 / ≥ 20 / ≥ 20 / ≥ 20 |
| Pip–Tomo | Pants 50 vs 80 (body 87 vs 64 also ≈ 16) | 30 | ≥ 24 / ≥ 24 / ≥ 24 / ≥ 24 |
| Mabel–Coral hull (56) | Pants Slate (blue) vs Coral (red-orange) | 11 | ≥ 10 from L* alone; hue-opposed in all 3 sims, expected ≥ 20 — **RISK, must measure** |
| Pip–Coral hull | Pants Denim (blue) vs Coral | 6 | as above, expected ≥ 20 — **RISK, must measure** |
| Tomo–Coral hull | Cream stripe 96 vs 56 | 40 | ≥ 30 all sims |
| Mabel–Lantern hull (85) | Body 43 vs 85 | 42 | ≥ 33 all sims |
| Pip–Lantern hull | Pants 50 vs 85 | 35 | ≥ 27 all sims |
| Tomo–Lantern hull | Navy stripe 33 vs 85 | 52 | ≥ 40 all sims |

**RISKS (explicit)**: Rosehip vs Sprout (deutan) is carried by shirt ΔL ≈ 22 (≥ 18) plus body and pants, so it is not
the only cue; Rosehip vs Coral hull collapses under tritan (both pink-red, ΔL ≈ 5): Mabel's shirt must never be the
only thing separating her from the hull. Her pants and the ink line do that. Sprout vs Coral is ≈ 14 under deutan, so it is
not used as a carrying block. If any measured pair is < 15 on every block, move the **pants** colour first (lowest
narrative cost), never the hull. Crew colours count as identity colours (one owner each, ≥ ΔE 15 from StaysLayer).
- Identity order from the gameplay camera (behind-above, [CHR §5]): **station → block shape → colour triplet → fishing action**.
  Names appear only in UI (10: dummy icon in the 3 colours + name label + station glyph).
- Stations are staggered diagonally so no two silhouettes overlap from the default camera yaw ±45°; head-top heights
  differ by ≥ 0.15 m (Pip's beanie highest, Tomo's brim widest). Catch reaction: 3-drawing "cheer" (arms-up blocks)
  synced to catch pop. Idle: 2 breathing poses on twos + head-block turn toward the horizon. Expression is pose-only (no face).
- **Backup-cue sizes at 1080p (D8, 28 m default)**: Pip's beanie 0.18 m ≈ 11 px, head-top step 0.15 m ≈ 9 px, Tomo's brim 0.36 × 0.04 m ≈ 21 × 2 px (reads as width from behind-above), Mabel's 1.3× torso ≈ +7 px wider: all readable. At the 60 m far zoom these halve (beanie ≈ 5 px, brim ≈ 1 px tall) and the block-shape cue is lost; station, colour bands and fishing action remain (see RISK in Edge Cases).
- `HoldFull` (D2): crew switch to a sit-on-deck rest idle (2 poses on twos) until cargo is sold.

**6. Prototype VFX** — all drawings: cream core, one colour, ink edge (1.25 px), 2–3 flat tones, on twos, end by
breaking, no alpha fades/additive/particles [VFX]. **PROPOSED**:

| VFX | Form | Drawings | Colour | Trigger |
|---|---|---|---|---|
| Bow wake + foam crest | Ribbon mesh following hull path on ones; its texture swaps between 3 drawings on twos (never scrolls); tail breaks into dots by stepped threshold | 3 loop | Cream + body-tint of region | `BoatSpeed > 0.5 m/s`; length ∝ speed (F5) |
| Hull splash (idle bob) | Small crescent pair at waterline | 4 | Cream + crest tint | Bob amplitude peak, max 1 per 1.5 s |
| Catch pop | Fish cel arcs up from crew station, cream starburst ring (round, not spiky) breaks into 3 dots, fish drops toward hold | 6 | Cream + Beacon Amber ring | `CatchRoll` success (04) |
| Swell spray (R2) | Tall bean-shaped spray sheet at bow, breaks into 4 drops | 6 | Cream + `#C9DCE6` | Swell crest contacts bow; max 1 per 2 s |
| Encounter-ping ripple | 3 concentric wavy rings expanding, flat on water, + amber pom marker | 8, then hold ring 3 | Cream + Beacon Amber | `EncounterPing`: solo `E_WhalePod` local timer (ruling 5); MP use is paper only (D3) |
| Rain streaks (R2 drizzle) | Short hard-edged diagonal streak cards in a camera-attached volume, plus tiny ring-splash daubs on the water near the boat; no soft particles | 3 loop | `#E6EEF2` + wisteria | Inside R2 while `Drizzle` intensity > 0 (03) |

At most one screen-wide effect at a time; nothing covers the crew; flash safety ≤ 3 luminance flashes/s [VFX].

**7. UE5 render pipeline mapping** — candidates from [UE]; every API item **verify in UE5.x** (record in an ADR).

| Piece | Little Ocean method (verify in UE5.x) | Fallback |
|---|---|---|
| Renderer | **Forward shading + MSAA 4×** (crisp hull lines, no temporal ghosting on stepped poses) | Deferred + TSR at 100%, zero motion vectors on held poses [UE] |
| Cels | Unlit material, two-tone band from key dir in a Material Parameter Collection (`MPC_LightPhase`); Custom Depth/Stencil = 1 | Post cel pass on stencil [UE] |
| Ink | Inverted-hull second material, front-face cull, WPO along baked smoothed normals, clip-space width | Stencil-limited post outline |
| Painted env + water | Unlit materials sampling painted albedo + MPC sun dir/shadow tint/haze; no Lumen, no VSM, no Nanite on WPO meshes | Lit custom model + post shadow tint |
| Island shadows | Baked into painted albedo/light textures (static sun dir per phase lerped) | Light function on a single directional light |
| Sky | Unlit sky sphere + 2 backdrop rings (far islands, horizon sea); no SkyAtmosphere | — |
| Paint post | Post Process Material (wobble → Kuwahara 4×(2×2) → grain) at the pre-tonemap slot, skipping and not sampling stencil-1 pixels | Scene capture of StaysLayer only |
| Colour | Tonemapper neutralised, manual exposure, bloom 0, motion blur 0, film grain 0, vignette 0; swatches ΔE ≤ 3 | Inverse-tonemap in materials |
| Stepped anim | Anim update rate / stepped pose on twos for actions + VFX flipbooks | — |
| Substrate | Confirm unlit materials unchanged if Substrate is on (5.7+ default) [UE] | Disable Substrate for project |

### States and Transitions

| State | Render behaviour |
|---|---|
| `LightPhase` Day ↔ Dusk | sRGB lerp of all fields over 20 s; never mid-blend during a capture |
| `RegionLook` across `TransitionBand` | Lerp water bands, far tint, haze, sky by normalised band position `b` (F4); weather overlay fades in over the last 50% of the band |
| `ViewMode` Full → Compact | Switch to the Companion render profile (Tuning) within 1 frame; VFX in flight finish their drawings at the new frame rate |
| Cel near camera | Bayer 4×4 dither down to 30% coverage, never hide [SKILL] |

### Interactions with Other Systems

02 supplies camera distance/FOV/pitch limits and samples the same swell function for buoyancy · 03 supplies
`RegionId`, `TransitionBand` width, swell band placement, discovery positions · 04 supplies crew names/count,
`CatchRoll` event, station count · 08 consumes the Companion profile · 10 consumes UI tokens and Beacon Amber.

## Formulas

- **F1 Ink width (px)**: `w = clamp(2.25 × rtH/1080, 1.0, 2.5)`; interior `wi = 1.25 × rtH/1080`, dropped when `h < 0.04`. Ex: 1080p → 2.25; companion 320 DIP × `CompactRenderScale` 0.75 = 240 px → 0.5 → clamps to 1.0, no interiors.
- **F2 Screen-height fraction**: `h = H / (2·d·tan(FOVv/2))`. Camera per 02 (D8): arm d = 28 m, FOV 60° taken as horizontal (UE default axis) → FOVv = 2·atan(tan30° × 9/16) = 36.0° at 16:9, so 2·tan(FOVv/2) = 0.650 and 1080p gives 59.4 px/m at 28 m. Ex: crew H = 1.0 m at d = 28 m → 1/18.2 = **5.5%** (≈ 59 px: head ≈ 17, torso ≈ 24, legs ≈ 19 px, so all 3 colour blocks still read; was 69 px under the old 15 m / 55° assumption); interiors drop (h < 4%) beyond d = 38.5 m; at 02's 60 m far zoom → 2.6% (≈ 28 px, head ≈ 8 px). Boat 8 m at 28 m ≈ 475 px broadside (25% of 1920 px). Remote boat (mast top 4 m) at 300 m → 2.1% → 1 px line, no interiors; silhouette ≈ 22 px tall, pennant in paint colour carries identity.
- **F3 Daub texel size**: on-screen daub size `s_px = D_m × 1080 / (2·d·tan(FOVv/2))`; require `s_px ≥ 10` at `d` = 28 m (59.4 px/m) ⇒ `D_m ≥ 0.17 m`, and at the 60 m far zoom (27.7 px/m) ⇒ `D_m ≥ 0.36 m`; use `D_m` = 0.4 m near ring (≈ 24 px at 28 m, ≈ 11 px at 60 m), ×2 per LOD ring.
- **F4 Region blend**: `b = saturate((x − bandStart)/bandWidth)`, `c = lerp(lookA, lookB, smoothstep(0,1,b))` per field in sRGB; weather `wx = saturate(2b − 1)`.
- **F5 Wake length**: `Lw = clamp(1.5 × BoatSpeed, 0, 12) m` (BoatSpeed m/s). Ex: 6 kn = 3.09 m/s → 4.6 m.
- **F6 Water band**: `waveN = 0.6·sin-sum height (normalised) + 0.4·daub`; trough if `waveN < t1`, crest if `> t2` (t1 0.35, t2 0.72), 0.05 soft edge.
- **F7 Companion GPU share**: `GPU% ≈ fps × (Cfix + Cpix × P/Pfull) / 10`, ms per frame. Ex (ASSUMPTION): Cfix 0.8 ms, Cpix 9.0 ms at 1080p, P/Pfull = (384×240)/(1920×1080) = 0.044 (512×320 DIP at scale 0.75, from 08), 20 fps → 20 × (0.8 + 0.40)/10 = **2.4%** (08 estimates 2–4%) (target ≤ 10%, H4). Full mode: 60 × 11.2/10 = 67%.

## Edge Cases

- **Camera dips below swell crest (R2)**: 02 clamps camera ≥ 1.5 m above local water; if clipped, water near plane dithers [SKILL], never pops.
- **Boat hidden behind a swell from low pitch**: ink is drawn after the paint post but still depth-tested; accepted, 02 raises min pitch in R2.
- **Drizzle haze hides cels**: cels take at most 30% stepped haze; ink line hazes with the fill so it never floats crisp at 300 m; rain streaks never cover the crew (drawn behind stencil-1).
- **Coral hull on R1 body (ΔL* ≈ 12)**: separation is the ink line + contact blob + foam crest by rule; if capture shows < 3:1 line read, raise line to 2.5 px, never change sea value.
- **Kuwahara halo round cels**: kernel ignores stencil-1 samples; if halo persists, dilate stencil 1 px.
- **720p / 85% screen percentage**: F1 scaling holds; check line ±0.5 px in capture [UE].
- **Phase blend while crossing band**: fields lerp independently; both blends compose (band first, then phase multiply).
- **Third crew not hired**: Tomo's station is empty deck; no placeholder figure.
- **Companion switch mid-catch-pop**: effect completes on held drawings; no flash added.
- **Colourblind**: crew separate by lightness steps + station + block shape + action (rule 5); ping is ring shape + amber.
- **Crew below 4% screen height** (zoom beyond 38.5 m, incl. 02's 60 m far zoom at 2.6% ≈ 28 px): 1 px line, no interiors; blocks still read as 3 bands (≈ 8–11 px each); station cue unchanged; block-shape cues fall to ≤ 5 px and are lost.
- **RISK (D8 camera)**: at the 28 m default the crew pass (5.5%, ≈ 59 px) but with less margin than before (69 px). They fall below the readability threshold at the 60 m far zoom, and if 02's 60° FOV is vertical rather than horizontal the default 28 m view itself drops to 3.1% (≈ 33 px), below the 4% rule. **Mitigation (PROPOSED, 02 to own)**: make one of 02's 3 zoom presets a close "Deck" view at 16 m (crew ≈ 9.6%, ≈ 104 px); 02 states the FOV axis explicitly; the HUD crew strip (10) carries names when zoomed out.

## Dependencies

02 (camera FOV/distance, swell function, hull size), 03 (regions, band width, swell placement), 04 (crew names,
count, catch event), 08 (companion profile adoption), 10 (UI tokens), 11 (hull and item props, cosmetic swatches, waterline). Bidirectional: each of those docs must cite 09
for `ActsLayer`/`StaysLayer`, palette and render profiles.

## Tuning Knobs

| Knob | Default | Safe range | Affects |
|---|---|---|---|
| Ink silhouette px @1080p | 2.25 | 2.0–2.5 | Cel read vs heaviness |
| Cel terminator `t` (Day/Dusk) | −0.06 / −0.02 | −0.12–0.04 | Shade share 15–25% / 20–35% |
| Crew terminator `t_crew` (block faces) | −0.30 | −0.45 to −0.15 | Crew shade share 15–30% |
| Water t1 / t2 | 0.35 / 0.72 | 0.25–0.45 / 0.62–0.82 | Crest/trough coverage |
| Swell amplitude Harbour / R1 / R2 (m) | 0.15 / 0.4 / 1.5 | 0.1–0.3 / 0.2–0.6 / 1.0–2.0 | Calm vs drama (02 handling) |
| Kuwahara radius | 2 | 1–2 | Paint strength vs cost |
| Paint wobble px / grain | 1.8 / 10% | 1.0–2.5 / 5–14% | Painterliness |
| Haze far (m) Day / Drizzle | 900 / 500 | 600–1200 / 300–700 | Horizon depth, R2 mood |
| Cel haze start (m) | 120 | 80–200 | Far boat integration |
| Day / Dusk duration (min) | 20 / 8 | 10–40 / 4–12 | Mood rhythm |
| Wake length factor | 1.5 | 1.0–2.5 | Speed feel |

## Visual/Audio Requirements

Visual covered above. Audio (owned by 08): ambient bed should match the painted calm — no visual event here demands
an audio stinger except catch pop and ping ripple, whose drawing frame 1 is the sync point.

## Game Feel

Calm surface on ones, lively drawings on twos: the sea breathes smoothly, the crew and splashes "tick" like hand
animation. Catch pop is the small reward beat (≈ 0.5 s); nothing shakes the screen in the prototype.

## UI Requirements

UI tokens for 10 (**D9**, doc 10 owns): two surfaces only. **Ink Glass** (HUD over the world) = Ink `#33273B` at 70%, radius 10 px,
no frame, cream text. **Paper** (screens) = opaque Cream, 2 px Cocoa frame, radius 14 px, one soft shadow; text Ink; primary
button Cocoa; ping/marks Beacon Amber. Crew dummy icons appear only in the crew panel and Inn crew board (no crew HUD), in the
crew's 3 colours + name label + slot number (never colour alone, D7); undiscovered journal entries as flat silhouettes [VFX UI]. Identity colours are not used for generic UI states.

## Cross-References

00 §1, §5 A3, §6, §9 D1–D7 · reviews/loop-1 rulings 5–7 · [SKILL] one rule, pipeline, inked props, self-check ·
[PAL] palette, phase tables · [UE] full table · [VFX] rules 1–5, flash safety · [CHR] §3, §5 · 08 compact window.

**Perf budget (60 fps, 1080p, GTX 1660 / Ryzen 5 3600)** — ASSUMPTION – validate by look-dev GPU profile capture:
sky+backdrops 0.4 ms · water 1.5 · islands/harbour 2.0 · cels incl. hulls 1.5 · VFX 0.5 · paint post 2.0 · AA/MSAA
resolve 0.8 · UI 0.5 · other 2.0 = **11.2 ms GPU** (5.4 ms headroom). Caps: ≤ 1,500 draw calls, ≤ 1.5 M tris on
screen, boat 8k tris, crew ≤ 800 each, whale ≤ 1.5k, VRAM ≤ 1.5 GB, game thread ≤ 8 ms.
**Companion profile (window owned by 08)**: 512×320 DIP fixed, `CompactFpsCap` 20, `CompactRenderScale` 0.75, Kuwahara
r=1, wobble + grain off, ink 1 px no interiors, gulls/backrings static, rain streaks 50% density, VFX = wake + splash + catch pop
only, sky static per phase, MSAA 2×, dynamic shadows off.

**Look-dev scene `LD_HarbourMouth` (PROPOSED)**: quay corner + 1 building + pier (harbour water) running out to R1
water and a 200 m R2 swell strip with Drizzle toggle; 1 island + backdrop rings + sky; player boat (Coral) with Mabel
and Pip (Tomo toggle); 1 zone buoy, 1 gull, fishmonger on quay; a static Lantern Yellow boat at 60/150/300 m; VFX
trigger keys; `LightPhase` Day/Dusk toggle.
**Orbit capture**: 8 yaws × pitch −10°, +15°, +55° at gameplay distance 28 m and the 60 m far zoom (FOV 60° per 02); a crew orbit at 4 m; one
level shot showing horizon; repeat Day, Dusk, R2 Drizzle; plus a 512×320 companion set and a CVD-simulated set.
**Effort**: ≈ 35 dev-days (materials+MPC 7, water 4, post 3, sky 2, colour/ΔE/CVD 1.5, boat 2, block crew 5, whale 1.5,
VFX 5, perf 2, companion 1, capture 1).

## Acceptance Criteria

1. Every capture: no ink on StaysLayer; every ActsLayer asset inked; line 2.25 ± 0.5 px at 1080p measured on boat at 28 m (H2).
2. All palette swatches sample within ΔE2000 ≤ 3 in captures; identity colours pairwise ≥ 15 incl. CVD sim (H2).
3. Water pixels L* 40–78, ≤ 15 L* in any 64 px window; zero specular/reflection pixels (hue/value check).
4. Shade share Day 15–25%, Dusk 20–35% across 8 yaws; no grey/black shadow pixels anywhere.
5. Crew identifiable by naive viewer from back-above at 28 m (02 default arm) in ≥ 80% of trials (5 viewers), and by 1 colour-blind tester in ≥ 9/10 stills; every crew pair and crew–hull pair has ≥ 1 block at ΔE00 ≥ 15 under protan, deutan and tritan simulation of captured pixels; no face decals present.
6. All VFX on twos, hard-edged, end by breaking; ≤ 3 flashes/s on screener.
7. 1080p GTX 1660: p95 frame ≤ 16.7 ms over a 3-min sail Harbour→R2 with Drizzle, post on (H2 fail if < 60 fps).
8. Companion profile: GPU ≤ 10%, CPU ≤ 5% on reference PC, RAM ≤ 1.5 GB (H4).
9. Blind still test: ≥ 70% anime/painted words; ≥ 60% say "the boats/people are drawn" (H2).
10. Skill quick self-check reported pass/fail/NOT ASSESSED for every capture set; NOT ASSESSED blocks sign-off.

## Open Questions

1. ~~R2 weather: Sea Mist vs light rain~~ CLOSED by D8: `Drizzle` (03 owns); 08 Rain layer ships for R2.
2. Day/Dusk auto-cycle vs fixed Day in prototype (saves ~1 dev-day of blend QA).
3. Forward+MSAA vs Deferred+TSR — decide after a 1-day spike on the 1660 (ADR).
4. Crew body colours are a mannequin range (Umber/Peach/Tan), chosen for lightness steps, not as skin tones — owner OK?
Closed: crew count (D5, amended D9: Tomo hired via Inn + Bunk), crew look (D7), `R2_Swells` / `LightPhase` / `RegionLook` names (00 §6).

## Interface values

| Value | Number | Consumer |
|---|---|---|
| Gameplay camera arm / FOV | 28 m / 60° horizontal (FOVv 36.0° at 16:9); zoom 14–60 m | 02 |
| Boat hull length | 8 m | 02 |
| Camera min height over water | 1.5 m | 02 |
| Swell amplitude Harbour / R1 / R2 | 0.15 / 0.4 / 1.5 m | 02, 03 |
| Weather overlay starts at band position | b = 0.5 | 03 |
| Crew height / stations | ≈ 1.0 m block dummy, ≤ 800 tris; Mabel stern-L, Pip bow-R, Tomo mid-L | 04, 10 |
| Catch pop length | 6 drawings on twos = 0.5 s | 04, 10 |
| Companion render | 512×320 DIP (08), 20 fps, scale 0.75, Kuwahara r=1, ink 1 px | 08 |
| GPU budget full / companion | 11.2 ms @60 / ≤ 10% | 08, H2/H4 |
| UI tokens | Ink `#33273B`, Cream `#FFF6E3`, Cocoa `#6B4A35`, Wisteria `#6E6AA8`, Amber `#FF9B21` | 10 |
| Boat paints | Coral `#E8553F` (default hull), Lantern Yellow `#F7CF4A`; cosmetic swatch set below | 05, 10, 11 |
| Cosmetic swatches (11, PROPOSED) | Hull: Coral `#E8553F`, Sea Foam `#7FC8C4`, Harbour Blue `#4F79B0`, Biscuit `#E9CFA0` (starter); Deep Water `#2F5F86`, Lantern `#F7CF4A`, Dusk `#8E6FB0`, Sail White `#F2F0E6` (40 Shells); Wreck-wood `#8A6A52` (earned). Rule: hull swatch must differ from mid-sea `#4FB3BF` by ≥ 25 L* or by hue ≥ 60° so the boat reads against the water; Sea Foam passes on hue+value with the 2 px ink line, verify in R1 capture | 10, 11 |
| Fitted item props (11) | crate (stern), hold hatch (amidships), bunk (cabin-roof bump), keel fin (below hull, visible in yard view), deep-hold hatch; ActsLayer, ≤ 400 tris each; waterline offset −0.12 m × LoadFraction | 11 |
| Hulls (11) | `Skiff` = current preview boat; `Cutter` ≈ 1 m longer, taller deckhouse, keel mount; same ink/palette rules | 11 |
| Crew triplets body/shirt/pants | Mabel `#8E5A40`/`#D63F7C`/`#5A6B8C` · Pip `#F6D2AE`/`#86C445`/`#4F79B0` · Tomo `#C0906A`/stripes `#2F4C8A`+`#FAF4E6`/`#D8C49A` | 04, 10 |
| Crew backup cues | Station; Mabel wide torso, Pip tall block beanie, Tomo flat brim slab; net / rod / hand-line | 04, 10 |
