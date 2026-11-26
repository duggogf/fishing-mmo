# Little Ocean — Critique Loop 2

> Reviewer: creative-director · 2026-11-26 · Scope: re-check of the loop-1 must-fix items and the 4 new points only. The checks were
> targeted searches plus reads of the edited lines. Material that passed in loop 1 was not re-reviewed. The owner's full review follows.

## Verification of loop-1 must-fixes

- **01 / 04 / 05 (systems-designer)**: Marlo and June are gone; Mabel, Pip and Tomo are used everywhere (Tomo via `Crew_2`). The travel
  times now match 03: 45 s each way to R1, and 143 s / 137 s with the Keel. First sale is 6.94 min. R2 unlock: path A 29.5, B 19.8–19.9,
  and the minute table agrees. Done.
- **06 (network-programmer)**: the 6.17 m/s and map values from 02/03 are in. The 8192 m and 1.5/min placeholders are gone. F2/F3 are
  recomputed (3.2 m lag, 0.058–0.13 m turn error). The offline `FOfflineEncounterBroadcast` local timer is specified. Done.
- **08 (ux-designer)**: owns the 512×320 window. The ruling-3 Compact hold is adopted word for word, with `PushVec` set to 0 at once. Done.
- **09 (art-director)**: crew are D7 block dummies with no face decals, ≤ 800 tris each, and a body/shirt/pants triplet. There are 3
  backup cues (station, block shape, fishing action). The companion profile is 512×320. The colour-blind ΔE criterion is an Acceptance
  Criterion (AC5). Done.
- **10 (ux-designer)**: the crew HUD now shows a dummy icon with the colour triplet, a slot glyph and a name, so identity never depends on
  colour alone. Done. One stale phrase remains at line 27 ("portraits stay chestnuts"); deleting it is a non-blocking edit.

## Rulings on the new points

1. **01 first fish ≤ 2 min: ACCEPT.** The 102 s is the confirmed calm sail out (P1). A cozy game does not need to rush the first
   catch. The ≤ 8 min first sale is unchanged and remains the real H1 gate.
2. **05 R2 premium +18%: ACCEPT.** The premium is worth having, but it is not the main reason to go. P3 says regions are opened by
   *place*: swell, the Thunder Arch, the Bell Buoy and new species. Floor: do not tune it below +10%, or R2 would read as a punishment.
   Prototype validation task: in the H1 survey, ask "why did you go to R2?". It passes if most answers are not "money".
3. **06 encounter timing: ACCEPT.** The ping window is the full 700 s pod pass, which removes the reachability concern. Online fires
   every 900–1500 s (≈ 2 pods per 45 min), and solo first fires at 10–15 min, then every 20–30 min. That frequency is a rare treat, not
   a chore. The solo cadence is an ASSUMPTION to validate by the H1 "relaxing" score.
4. **09 unmeasured ΔE and 319 lines: ACCEPT.** The ΔE values are marked RISK and have a measurement plan; they can only be measured on
   captured build pixels. **Prototype validation task**: simulate captured pixels for protanopia, deuteranopia and tritanopia, and test
   with 1 colour-blind viewer (09 AC5). The length is over the cap because of D7 content and is accepted for this prototype.

## Updated scores (R1 pillars · R2 §12 · R3 buildable · R4 cross-doc · R5 numbers · R6 art fit · R7 hypothesis · R8 labelling)

| Doc | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | Total | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 4 | 36 | PASS |
| 02 | 5 | 5 | 4 | 4 | 5 | 5 | 5 | 4 | 37 | PASS (unchanged) |
| 03 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 36 | PASS (unchanged) |
| 04 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 4 | 36 | PASS |
| 05 | 5 | 5 | 4 | 4 | 5 | 4 | 5 | 4 | 36 | PASS |
| 06 | 5 | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 35 | PASS |
| 07 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 5 | 35 | PASS (placeholder fixed by orchestrator) |
| 08 | 5 | 5 | 4 | 4 | 4 | 4 | 5 | 4 | 35 | PASS |
| 09 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 34 | PASS |
| 10 | 5 | 5 | 4 | 4 | 4 | 4 | 4 | 4 | 34 | PASS |

## Verdict

**SET PASS (GO).** All 10 docs score at least 30/40, no criterion is below 3, and Section 12 compliance (R2) is 5 on every doc. I found no
shared-name or unit conflicts in the re-checked items. Open prototype validation tasks: the 09 colour-blind ΔE measurement, the
"why R2?" survey item, and the solo encounter cadence. Non-blocking cleanup: the stale "chestnuts" phrase on line 27 of 10. The set now
goes to the owner's full independent review.
