# Phase 2 — Cricket Feel & Core Gameplay Depth: Implementation Plan (internal)

Status: STEP 1 AUDIT complete. This is the plan recorded before any code edits.

## Audit conclusion

Most Phase 2 scaffolding already exists and is coherent (delivery specs with
speed/line/length/swing/seam/bounce/type; six-tier timing; analog footwork;
contextual shot selection; ballistic contact; deterministic fielding sim with
automatic running and reliable boundaries; tactical AI bowling/batting; debug
panel). The struck-ball path in both runtime and headless already resolves
through `FieldingSimulator`; `ShotOutcomeResolver` handles unstruck balls
(bowled/LBW/beaten/leave).

Three concrete weaknesses to fix (kept surgical, parity across C#/Python/JS):

1. **Edges are not coupled to movement.** Edge probability uses only
   |timingOffset|, reach and raw pace; the edge *side* is a coin flip. Swing/seam
   therefore affect edges only indirectly (via contact X / reach). Real cricket:
   late on an outswinger → outside edge; early on an inswinger → leading edge.
   There is also no thin/thick edge distinction.

2. **Catch grading is not wired into the fielding sim.** `CatchGrader` (easy/
   medium/difficult/edge bias) is tested in isolation and used by the JS preview,
   but `FieldingSimulator.Simulate` ignores it — skied balls are not punished and
   hard flat chances are not harder than easy ones in the actual runtime model.

3. **Footwork learnability.** Wrong-foot mistakes are punished mechanically
   (awkward flag → quality ×0.6, edge ×1.6, reach → miss, LBW geometry) but the
   game HUD never tells the player their foot pose/reach, and edges show the
   intended shot name rather than "EDGE".

## Changes (ordered)

### A. Believable edge model (Core TimingSystem + BatBallContact; Python batting_reference; JS engine)
- `TimingSystem.LateralMovement(swing, seam)` → clamped (swing+seam) in ±1.5.
- `TimingSystem.EdgeSide(offset, swing, seam)` → +off / −leg from the classic
  late+away / early+in mismatch; 0 when bat meets the movement or none exists.
- `TimingSystem.MovementEdgeBias(offset, swing, seam)` → small additive edge-
  probability adjustment (bat caught by movement +, bat with movement −), bounded.
- `BatBallContact` edge branch: p-edge = base + bias (clamped); edge side from
  `EdgeSide` (fallback coin flip); thin vs thick edge from reach + movement
  mismatch → thickness drives exit speed, elevation (thin loops to keeper/slip,
  thick skims square) and angle (thin fine behind square, thick squarer).
- RNG draw order/count in the edge branch stays 5 so downstream streams are stable.

### B. Catch grading in the fielding sim (Core FieldingCore; Python fielding_reference; JS engine)
- At each catch attempt, `p = CatchProbability(...) * CatchGrader.BiasFor(Grade(speed, height, distance, false))`,
  re-clamped to [0.05, 0.97]. No signature change.

### C. HUD learnability (Unity BattingPrototypeRunner only)
- `ShowContactFeedback` appends foot pose + reach, and shows "EDGE!" when the
  contact outcome is an edge. One small, obviously-correct method body change.

### D. Tests (never weaken existing)
- New `harness/test_phase2.py`: movement→edge-side coupling, movement→edge-rate,
  thin-vs-thick edge trajectory stats, footwork punishability (wrong foot →
  lower quality / more edges; LBW vs bowled geometry), boundary reliability
  (six only airborne, four after bounce, runs ∈ {0..6}, caught ⇒ 0), and
  catch-grade effect in `simulate_fielding`.
- Extend `smoke.cjs` with a short Phase 2 block (edge side + sim catch grade).
- Extend `Core.Tests/BowlingSystemTests.cs` with deterministic NUnit mirrors
  (documented; NUnit cannot run in this sandbox).

### E. Report
- `Docs/PHASE2_REPORT.md` (IMPLEMENTED / GAMEPLAY IMPROVEMENTS / TESTS /
  FILES CHANGED / REMAINING ISSUES / RECOMMENDED PHASE 3), plus `README.md` touch-up.

## Out of scope (per constraints)
No new modes, no multiplayer/career/monetization, no engine rebuild, no fake
outcomes, no score manipulation, no weakening Phase 1 tests, no AAA graphics.

## Verification gate
- `python3 -m unittest discover -s harness -p 'test_*.py'`
- `node smoke.cjs` and `node dom_smoke.cjs` (from `harness/webpreview`)
