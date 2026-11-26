# Little Ocean — Critique Loop 1

> Reviewer: creative-director · 2026-11-26 · Rubric: 00-direction §7 · Owner decisions D1–D7 (00 §9) apply.
> Method (owner asked for token economy): read in depth where cross-doc conflicts were flagged or likely (01, 04, 05, 06, 08, 09, 10:
> crew, pacing, compact, network numbers). Read the rest by targeted search (02, 03, 07: §12 terms, shared names, open questions, effort).
> Scores for the skimmed docs are deliberately conservative, and the owner's full review supersedes them.

## Scores (1–5; R1 pillars · R2 §12 · R3 buildable · R4 cross-doc · R5 numbers · R6 art fit · R7 hypothesis link · R8 labelling)

| Doc | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | Total | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 core loop | 5 | 5 | 4 | 3 | 4 | 5 | 5 | 4 | 35 | PASS (with mechanical fixes) |
| 02 sailing | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 4 | 37 | PASS |
| 03 world | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 36 | PASS |
| 04 crew & fishing | 5 | 5 | 4 | 2 | 5 | 4 | 5 | 4 | 34 | REVISE |
| 05 economy | 5 | 5 | 4 | 2 | 5 | 4 | 5 | 4 | 34 | REVISE |
| 06 hangout (paper) | 5 | 5 | 4 | 2 | 3 | 4 | 5 | 4 | 32 | REVISE |
| 07 persistence | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | 35 | PASS |
| 08 companion & audio | 5 | 5 | 4 | 2 | 4 | 4 | 5 | 4 | 33 | REVISE |
| 09 art direction | 5 | 5 | 4 | 2 | 4 | 2 | 4 | 4 | 30 | REVISE (D7) |
| 10 UI/UX & HUD | 5 | 5 | 4 | 2 | 4 | 3 | 4 | 4 | 31 | REVISE (D7) |

No §12 violations found in any doc (no manual fishing, offline catch-up, trading, PvP or chores). `MaxTickDt` in 04 is protection
against long frame hitches, not offline catch-up. The REVISE verdicts all come from R4 (cross-doc consistency) or R6 (D7), not from weak design.

**Set verdict: NO-GO for loop 1.** 6 docs are below the R4/R6 ≥ 3 floor. Every fix is small and concrete. Loop 2 will re-check only the
must-fix items below (by search plus a re-read of the edited sections), not whole docs. If those clear, the set is GO.

## Rulings on flagged cross-doc issues

1. **06 placeholders → real values (owner: 06).** Use `MaxBoatSpeed` = 12 kn = 6.17 m/s (02) and map bounds from 03:
   x −700..700 and y up to 1400 (edge band included). Quantise the u16 position over a 2048 m extent (step 0.031 m). Remote lag
   becomes 525 ms × 6.17 = 3.2 m. Recompute F3 and the 180 s ping window, using 03's `E_WhalePod` lane at y = 350 and 2 m/s.
   The catch rate is 2.5 fish/min per crew in R1 (5.0/min for the starter boat), owner 04. 06 only references it.
2. **Travel times (owner: 05 recomputes; 01 mirrors).** Use 03's values: berth→R1 ≈ 45 s each way (assumed 30 s out); with Keel,
   berth→R2 ≈ 143 s out and ≈ 137 s back. The no-Keel berth→R2-edge figure (116 s) is moot. First sale becomes ≈ 6.9 min (≤ 8, holds).
   Pre-Keel trips gain +0.25 min each, giving R2 unlock A 29.5, B 19.9, C 28.3, D 25.2 min modelled. **Holds.** H1's band is a
   player median, and path A with +20% slack (35.4) sits on the edge, not near FAIL (> 45). **Keel stays 250**: trips are discrete, so
   a small price cut changes nothing. Update the R2 cycle and income tables with 143/137 s.
   The 00 §1 target of 60–120 s to R2 is superseded: the 143 s with Keel is accepted, because the swell crossing is the content.
3. **Compact in the swell (owner: 02; 08 conforms).** 02's rule stands. On entering `CompactHold`, `PushVec` is set to 0 at once and
   the boat holds where it is. There is no "push-back completes first" step. This is safe because an un-Keeled boat stalls at
   y ≈ 607 < 650. Single shared spec: net hold-point displacement is 0, cosmetic circling is ≤ 3 m and yaw ≤ ±10°, acceptance test
   is "within 5 m for 30 min" (02 AC7). Push resumes on return to `Full`.
4. **R2 fish without Keel: No (owner: 03, with 02).** Species follow position (`ZoneId`), and the gate is physical only. 02 must keep
   the stall line ≥ 30 m south of y = 650 for every speed and heading; it is now ≈ 43 m. 04 does no Keel check, and no other doc
   adds a second gate.
5. **Whale pod solo: Yes (owner: 06 seam; content 03; UI 10).** The offline `IEncounterBroadcast` runs a local timer and the same
   `E_WhalePod` lane. First firing comes 10–15 min into the first session, then every 20–30 min (PROPOSED, ASSUMPTION – validate by H1
   "relaxing" score). The UI is identical except there is no chat line. The reward stays a journal entry only. Reasons: P1 and P4
   (solo completeness), and it is the only live test of the encounter art and ping UI while multiplayer is paper-only.
6. **§6 names (owner: 00, done).** `Compact` was removed from `PhaseKey` and is now only a `ViewMode` overlay. The shipwright is part
   of `Selling`. Added `HoldFull`, `Keel`, `CrewId`, `LightPhase` and `RegionLook`.
7. **Crew identity (owner: 09 look, 04 rules).** Canonical `CrewId`s are **Mabel, Pip (starter) and Tomo (3rd, via `Crew_2`)**, per D5 and D7.
   04's Pip/Marlo/June and 05's "June" are wrong. The colour-blind risk (Rosehip vs Sprout, Coral hull vs Rosehip) is **RISK, must
   verify**, and is superseded by D7's new colour triplets (09 must-fix 2–3).
8. **06 length (235 lines).** Accepted. The extra length is the paper-test protocol D3 requires.

## Must-fix lists (loop 2 re-checks only these)

**04 crew & fishing — systems-designer (A1)**
1. Rename crew to Mabel, Pip (starter) and Tomo (`Crew_2`) everywhere: rules, crew table, cross-reference table. Remove Marlo and June.
2. Crew traits/flavour must not rely on faces or expressions (D7). Use poses or idle actions only.
3. Close open Q1 (BoatSpeedFactor 0.85 floor) as PROPOSED, ASSUMPTION – validate by H1, and state that 08 depends on the factor being 1.0 at speed 0.

**05 economy — systems-designer (A1)**
1. Recompute F2, the cycle table, the minute-by-minute table and the path table with ruling-2 travel times (first sale ≈ 6.9, A 29.5 / B 19.9 / C 28.3 / D 25.2).
2. Replace the "Travel assumptions" summary row and the open question with CONFIRMED (03) values. Recompute R2 income with 143/137 s.
3. Rename June → Tomo.
4. Mechanical fix in **01** (same owner): F1 TravelOut 0.75 min, its range lines and the "6.7 min" figures → 6.9. Pacing table matches 05.

**06 hangout — network-programmer (A4)**
1. Replace the 6 m/s and 8192 m placeholders in F1–F3, the snapshot layout, the P-SIM row and the Cross-References with ruling-1 values. Delete open Q5.
2. Recompute the 180 s ping window: can a boat reach `JournalRadiusM` 300 m of the lane from the farthest R2 point at 6.17 m/s? If not, lengthen the window or widen the radius.
3. Specify the offline `IEncounterBroadcast` local timer (ruling 5): interval, first-fire window, no chat line, journal only. Delete open Q3.
4. Remove the 1.5 fish/min placeholder or point it to 04.

**08 companion & audio — ux-designer (A5)**
1. Delete "push-back completes first" (rule 5) and adopt ruling 3 word for word. Align "≤ 2 m / 10 min" with 02's ≤ 3 m cosmetic / 5 m AC.
2. Close open Q1 and the ASSUMPTION in Interactions: 04 gives `BoatSpeedFactor` = 1.0 at speed 0 (D6).
3. Window size: 08 owns it at 512×320. Name it as the source for 09's companion profile.

**09 art direction — art-director (A3)**
1. **D7:** replace the bean/chestnut/hat silhouette spec, the face decals, the "faces auto-off" rule and the face-based identity order
   with faceless, blocky, low-poly dummies (block head, torso, limbs) in the normal cel pipeline: two tones, ink line, contact blob,
   no face decals. Re-budget triangles (well under 4k). Drop the "or it has a face → Acts" tie-break wording.
2. Give each `CrewId` a colour triplet (body, shirt, pants) of flat blocks. Show ΔE between crew and against the Coral/Lantern hulls
   under deuteranopia, protanopia and tritanopia simulation. Target ≥ 15 on at least one block per pair. Make the Rosehip/Sprout/Coral
   confusions an explicit RISK with a validation step: UE colour-deficiency view plus 1 colour-blind tester.
3. **Backup cue, not colour alone:** a fixed deck station per crew, plus one blocky shape difference per crew (proportion or a single
   block accessory), plus a distinct fishing action (net, rod, hand-line). Tomo's stripes are allowed only as the pattern cue for the
   shirt block.
4. Align the companion profile to 08's 512×320. Remove 480×270.
5. Close open Q3 (crew count) with D5: Tomo = `Crew_2`.

**10 UI/UX & HUD — ux-designer (A5)**
1. **D7:** replace the "chestnut portrait" crew status with a blocky dummy icon in the crew's 3 colours, plus a name label, plus a
   station or slot number glyph. The rod/cup state glyph stays, and identity never depends on colour alone.
2. Close open Q1 (`Keel` is now in §6) and open Q3 (2 crew at start, 3 with `Crew_2`; the HUD supports 2–3).
3. Ping and chat stay as mock-ups (D3). The solo whale ping (ruling 5) uses the same marker with no chat line. Add that state.

**Minor, no re-score (owner A2):** 02 open Q1 is closed by ruling 3. 03 open Q3 is closed by ruling 5. 03 adds the ≥ 30 m stall-margin
note (ruling 4).
