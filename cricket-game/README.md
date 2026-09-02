# Cricket Game (Unity, standalone)

A standalone, modular cricket game built in Unity — **completely separate**
from the IPL Franchise web application. No web integration exists yet; see
[Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md).

All code and visuals are original; the project draws only on the *depth* of
modern cricket games, never on proprietary assets or implementations.

---

## Current focus: PHASE 2 — Bowling, Ball Physics & Shot Outcomes

Phase 1's mobile batting controls now run against a real **bowling system**:
eight delivery types, seam/bounce/swing physics, contextual shot outcomes,
bowled + simplified LBW detection, broadcast cameras and a complete
delivery-after-delivery loop. See
[Docs/PHASE2_BOWLING_DESIGN.md](Docs/PHASE2_BOWLING_DESIGN.md).

### Definition of done (all met)

1. ✅ Bowler runs up and delivers continuously, ball after ball, no restart.
2. ✅ Eight delivery types: fast straight / inswinger / outswinger / yorker /
   full / good length / short / bouncer — data-driven (`DeliverySpec`,
   `BowlerProfile` ScriptableObject), weighted by a bowler plan + accuracy.
3. ✅ Realistic trajectory: gravity, pre-bounce swing, pitch bounce, post-bounce
   seam cut, configurable bounce energy and release height; `PitchProfile`
   ready for slower/batting/spinning surfaces (Normal implemented).
4. ✅ Phase 1 mobile controls unchanged: joystick footwork, swipe direction,
   DEF/NOR/POW/LOFT intent, manual timing.
5. ✅ Contact quality emerges from timing + footwork + reach + intent +
   line/length — clean, mistimed, weak, edge, defense all feel different.
6. ✅ Struck balls physically fly/roll into a 62 m field; boundaries, runs,
   bowled, LBW, edges (top/inside/outside) all resolve via the deterministic
   `ShotOutcomeResolver` (bounded randomness, ballistic carry + roll).
7. ✅ Yorkshire realism: poor footwork vs a yorker ⇒ awkward dig-out or
   bowled risk; poor positioning vs the short ball ⇒ top-edge risk.
8. ✅ Broadcast-style cameras: pre-delivery wide, delivery, shot follow,
   boundary chase, wicket reaction — all damped, no shake.
9. ✅ Subtle feedback: delivery toast, timing popups, PERFECT pulse,
   FOUR/SIX/WICKET banner, pitch dust, stump knock.
10. ✅ Debug panel: full readout (type/speed/line/length/swing/seam/bounce,
    batsman, timing, contact, outcome, exit velocity, launch angle) +
    force-perfect-timing, force delivery type, force outcome, slow-mo,
    re-bowl.

## Quickstart

1. Open `cricket-game/` in **Unity Hub** — built for **Unity 2022.3 LTS**
   (see `ProjectSettings/ProjectVersion.txt`). First open resolves the
   Input System package automatically.
2. Open scene `Assets/_Project/Scenes/BattingPrototype.unity` and press Play.
3. **Editor/desktop testing:** drag with the left mouse button = joystick,
   drag on the right side = swipe. On device: left thumb / right thumb.
4. Landscape orientation is configured; `activeInputHandler` is set to
   **Both** (new Input System drives touch).

### Controls

| Input | Action |
| --- | --- |
| Left thumb (joystick) | Analog footwork — forward/back stride, leg/off movement |
| Right thumb (swipe) | Shot direction; **release = play the shot** (timed) |
| Tiny tap (right) | Plays straight |
| DEF / NOR / POW / LOFT buttons | Shot intent |
| Debug sliders | Pace, line, length, swing of a MANUAL delivery |
| FULL / GOOD / SHORT buttons | Manual delivery presets |
| TYPE: AUTO button | Cycles forced delivery type (AUTO = bowler's plan) |
| OUTCOME: NONE button | Cycles forced shot outcome (debug) |
| PERFECT / SLOW-MO / RE-BOWL | Debug toggles |
| RESET POS | Re-centre the batsman |

## Running the tests

- **In Unity:** Window → General → Test Runner → Edit Mode → Run All.
  Covers Super Over rules, the simulation layer, the Phase 1 batting engine
  and the Phase 2 bowling/outcome systems.
- **Without Unity:** from `cricket-game/`:
  `python3 -m unittest discover -s harness -p 'test_*.py'`
  runs 1:1 Python references of every deterministic engine — **95 tests**,
  including a 2,500-ball soak asserting cricket-like outcome distributions.
- **Browser play-preview:** `harness/webpreview/` — serve the folder
  (`python3 -m http.server 4000 --bind 0.0.0.0`) and open it on a phone or
  desktop. Same engine math, touch controls, full debug toggles. Parity is
  checked with `node smoke.cjs`; the loop itself with `node dom_smoke.cjs`.

## Project layout

```
cricket-game/
├── Assets/_Project/
│   ├── Core/                  pure C# engine (no UnityEngine)
│   │   ├── Rules/             Super Over match state machine (future match mode)
│   │   ├── Simulation/        RNG, outcome model (used by contacts & future AI)
│   │   ├── Batting/           batting engine + shot outcome resolver
│   │   └── Bowling/           delivery specs, plans, factory
│   ├── Core.Tests/            NUnit tests (Edit Mode)
│   ├── BattingPrototype/      Unity layer: input, world+stadium, rigs, ball,
│   │   │                      bowling, camera, HUD, debug UI, runner, bootstrap
│   │   └── Bowling/           BowlingController + BowlerProfile (+ default asset)
│   └── Scenes/                BattingPrototype.unity
├── Docs/                      architecture & phase design docs
├── Packages/                  manifest (ugui, Input System, test framework)
├── ProjectSettings/           2022.3 LTS, landscape, new input handler
└── harness/                   headless reference implementations + tests
    └── webpreview/            browser play-preview (JS port of the engine)
```

## Module map (Phase 1 + 2)

| Spec module | Implementation |
| --- | --- |
| BowlingController | `Bowling/BowlingController.cs` |
| BowlerController (visual) | `Bowling/BowlerController.cs` |
| DeliveryController (flight) | `Ball/BallController.cs` (kinematic flight + bounce event) |
| DeliveryData | `Core/Batting/BattingTypes.cs` |
| BowlingType / specs / plan | `Core/Bowling/DeliveryFactory.cs`, `Bowling/BowlerProfile.cs` |
| BallReleasePoint | `DeliveryData.ReleaseHeight` + bowler release transform |
| BallTrajectoryCalculator | `Core/Batting/DeliveryTrajectory.cs` |
| BallPhysics (pitch) | `PitchProfile` + trajectory restitution/bounce model |
| BattingController | `Game/BattingPrototypeRunner.cs` (loop + input → engine) |
| BatBallContact | `Core/Batting/BatBallContact.cs` |
| ShotDirectionResolver | `Core/Batting/ShotDirectionResolver.cs` |
| ShotIntentController | intent buttons in `Hud/BattingHud.cs` + `ShotIntent` enum |
| TimingSystem | `Core/Batting/TimingSystem.cs` |
| ShotSelector | `Core/Batting/ShotSelector.cs` (+ yorker rules) |
| ShotOutcomeResolver | `Core/Batting/ShotOutcomeResolver.cs` |
| WicketResolver | inside `ShotOutcomeResolver` (bowled + simplified LBW) |
| CameraController | `Camera/CameraController.cs` |
| GameplayLoopController | `Game/BattingPrototypeRunner.cs` + `Game/GameplayEvents.cs` |

## Not built (deliberately, per the phase plan)

AI batting, multiplayer/networking, fielding (edges currently fly through
where slips would be), career/franchise modes, IPL/web integration, player
databases, commentary, tournaments, advanced graphics, monetization,
backend/cloud.

## Known limitations (Phase 2)

- Placeholder primitive characters/stadium and procedural animation (by design).
- Runs come from the deterministic resolver at contact time; the visual ball
  flight is presentation (fielders will reconcile this in a later phase).
- LBW is simplified and configurable — not the full Laws of Cricket.
- No fielding/catching yet; edged balls land freely behind square.
- No sound yet. One bowler archetype (right-arm pace), one pitch surface.

## Recommended Phase 3 (proposal, not started)

1. Fielding foundation: ring fielders that intercept/collect, catch chances
   for edges and mistimed lofts, real run calling vs resolver runs.
2. Bowling depth: bowler archetypes (seam/swing/spin), run-up + release
   animation, difficulty-tuned plans that adapt to the batter.
3. Match hookup: connect the batting+bowling loop to the Super Over rules
   engine (human innings vs AI bowling, proper chase HUD).
4. Animation upgrade: rigged placeholder humanoid + blended procedural shot
   animations per shot family.
5. Feel pass: haptics, impact audio, slow-mo on perfect timing, replays.
