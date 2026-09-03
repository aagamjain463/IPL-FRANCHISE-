# PHASE 2 — Cricket Feel & Core Gameplay Depth: Report

Audit plan: [PHASE2_PLAN.md](PHASE2_PLAN.md) · Phase 1 audit: [PHASE1_AUDIT.md](PHASE1_AUDIT.md)

## TL;DR

Phase 2's requested gameplay depth was already substantially present (delivery
specs, six-tier timing, analog footwork, contextual shot selection, ballistic
contact, deterministic fielding sim with automatic running and reliable
boundaries, tactical AI). The Phase 2 pass closed the three concrete gaps the
audit found — **movement-coupled edges (thin/thick)**, **catch grading actually
driving the fielding sim**, and **HUD learnability of footwork/reach** — and
locked everything down with a new 26-test battery. All 214 Python tests and the
JS smoke/runtime harnesses pass.

## IMPLEMENTED

1. **Movement-aware edge model** (`Core/Batting/TimingSystem.cs`,
   `Core/Batting/BatBallContact.cs`, `harness/batting_reference.py`,
   `harness/webpreview/engine.js`).
   - `LateralMovement(swing, seam)` — combined clamped movement.
   - `EdgeSide(swing, seam)` — edges fly **with** the ball's movement
     (outswinger → outside edge to off; inswinger → leading edge to leg).
   - `MovementEdgeBias(offset, swing, seam)` — a bat **caught** by the movement
     (late vs away, early vs in) edges more; a bat meeting the movement edges
     less. Small, bounded (±0.10) so it stays believable.
   - **Thin vs thick edges**: reach + a bat caught on the wrong side of the
     movement produce a *thick* edge (fast, flat, square — skims past the
     ring / races the boundary); fine contact produces a *thin*, looping edge
     (higher, slower, fine behind square toward keeper/slip). Both feed the
     existing fielding/boundary logic.
   - RNG draw count in the edge branch is preserved (5 draws), so downstream
     deterministic streams are stable.

2. **Catch grading wired into the fielding sim**
   (`Core/Fielding/FieldingCore.cs`, `harness/fielding_reference.py`,
   `harness/webpreview/engine.js`). The existing `CatchGrader` (easy/medium/
   difficult) now multiplies the fielder catch probability at each catch
   attempt (re-clamped to [0.05, 0.97]): gentle lofts are caught ~regularly,
   hard flat drives and sharp low chances are now genuinely harder. No
   signature change — Phase 3 parity is preserved.

3. **HUD learnability** (`Game/BattingPrototypeRunner.cs`). The contact popup
   now shows foot pose and reach, and shows `EDGE!` instead of the intended
   shot name when the bat edges — so wrong-foot / reach mistakes are readable
   and learnable, not just mechanically punished.

## GAMEPLAY IMPROVEMENTS (verified against the spec)

- **Deliveries differ physically** — yorker (length < 0.09, contact height
  < 0.45 m) vs bouncer (height > 1.05 m), ordered pitch points
  (`bounce_z = 1.6 + 9.2·length`), distinct speed/swing/seam/bounce per type.
- **Swing/seam affect gameplay** — swing arcs the pre-bounce flight but lands
  on the line; seam deflects the contact point; both now steer edges and
  modulate edge probability via timing.
- **Timing is skill** — six tiers, probability not guarantee: perfect
  aggressive drive scores clearly more than a late one; perfect *normal*
  drive scores regularly but never guarantees a boundary.
- **Footwork matters** — wrong foot (front to short / back to full) raises the
  edge rate ~1.5×; poor reach causes misses; LBW vs bowled geometry unchanged.
- **Intent differs** — DEF capped low, NOR balanced, POW high exit + mistime
  risk, LOFT aerial + catch risk (defense and lofted caps unchanged).
- **Boundaries/running reliable** — SIX only airborne past the rope, FOUR after
  bouncing, runs ∈ {0,1,2,3,4,6}, caught ⇒ 0; no duplicate/out-of-range scoring
  in a 4,000-shot soak; ground balls produce 0–3 via fielder distance/time.
- **AI difficulty is decision quality, not score** — bowling accuracy
  0.60/0.75/0.85; batting mean |timing offset| shrinks easy→hard; desperate
  chases attack far more than safe ones.

## TESTS

- **New** `harness/test_phase2.py` — **26 tests**: delivery parameters and
  physical ordering, swing/seam trajectory + believability, six timing tiers +
  probability-not-guarantee, movement-steered edges (side + rate + bias),
  thin/thick edge trajectories, footwork punishability, outcome/boundary/running
  reliability, catch grading in the sim, AI difficulty gradient.
- **Extended** `harness/webpreview/smoke.cjs` — new "Phase 2 feel" block
  (edge side/bias, edge-side distribution, catch-grade shaping).
- **Extended** `Assets/_Project/Core.Tests/BowlingSystemTests.cs` — 5 NUnit
  mirrors (`EdgeSide`, `MovementEdgeBias`, edge-side distribution, thin/thick,
  catch grading). *Documented; NUnit cannot execute in this sandbox (no
  .NET/mono toolchain) — verified via the 1:1 Python/JS mirrors.*

### Verification results (this environment)

```
python3 -m unittest discover -s harness -p 'test_*.py'   → 214 tests OK
node smoke.cjs                                           → SMOKE PASS (phase 1+2+3+4) + (phase 2 feel)
node dom_smoke.cjs                                       → 7,200 frames, no crash, 2 result screens, replay OK
```

## FILES CHANGED

Core (C#):
- `Assets/_Project/Core/Batting/TimingSystem.cs` — `LateralMovement`, `EdgeSide`, `MovementEdgeBias`.
- `Assets/_Project/Core/Batting/BatBallContact.cs` — movement-aware, thin/thick edge branch.
- `Assets/_Project/Core/Fielding/FieldingCore.cs` — catch grading applied in `Simulate`.
- `Assets/_Project/Core.Tests/BowlingSystemTests.cs` — Phase 2 feel NUnit mirrors.

Unity presentation:
- `Assets/_Project/BattingPrototype/Game/BattingPrototypeRunner.cs` — contact popup with foot pose/reach + `EDGE!`.

Harness:
- `harness/batting_reference.py` — movement helpers + thin/thick edge parity.
- `harness/fielding_reference.py` — catch grading in the sim.
- `harness/test_phase2.py` — new 26-test battery.
- `harness/webpreview/engine.js` — JS parity for all of the above.
- `harness/webpreview/smoke.cjs` — Phase 2 feel block.

Docs:
- `Docs/PHASE2_PLAN.md` — internal plan (new).
- `Docs/PHASE2_REPORT.md` — this report (new).
- `README.md` — corrected test count and stale "not built" notes.

## REMAINING ISSUES

- **NUnit not executed here** — no .NET/mono toolchain in this sandbox; the
  C# suites run in Unity's Test Runner (verified by parity mirrors + code
  review only). Run `Window → General → Test Runner → Run All` in the editor.
- **No Unity Editor playthrough** — "feel" (camera, haptics, popups) is
  verified headlessly and via the JS preview, not on-device.
- LBW remains the deliberate simplified geometry (line/impact/trajectory/feet),
  not the full Laws of Cricket.
- Fielding is deterministic simulation with visual replay — no manual fielding
  or running controls (explicitly out of scope for Phase 2).
- Cutters/slower ball exist in the factory and AI plans but aren't separately
  surfaced on the player bowling panel (player panel uses FAST/SWING/YORKER/
  SHORT presets).

## RECOMMENDED PHASE 3

1. **Spin bowling** — off/leg-spin delivery types with `PitchProfile.Turn`,
   grip change, flight/dip, and corresponding shot-context rules.
2. **On-device feel pass** — verify haptics/camera/popups on hardware; tune
   timing-window difficulty curve from real playtesting data.
3. **Bowler archetypes for AI** — per-bowler pace/swing/seam/variation profiles
   feeding `AiBowlingPlanner` (surfaces already exist via `BowlerProfile`).
4. **Richer fielding presentation** — dive/stop/catch animation replay from the
   existing `DiveDecider`/`ThrowSystem` helpers (currently logic-only).
5. **Commentary-lite / delivery anticipation cues** — a readable "release"
   telegraph for swing/seam so reading the ball is a learnable skill, not a
   memory test.
