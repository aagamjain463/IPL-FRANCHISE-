# Cricket Game (Unity, standalone)

A standalone, modular cricket game built in Unity — **completely separate**
from the IPL Franchise web application. No web integration exists yet; see
[Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md).

All code and visuals are original; the project draws only on the *depth* of
modern simulation batting, never on proprietary assets or implementations.

---

## Current focus: PHASE 1 — Mobile Batting Control System

A responsive, mobile-first **batting foundation** (Android/iOS, touch is the
primary input). The engine is input-agnostic: controller/keyboard adapters can
be added later without rewriting anything.

### Definition of done (all met)

1. ✅ Move the batsman with the **left virtual joystick** (analog footwork:
   forward/back stride + leg/off movement, smooth, no teleporting).
2. ✅ Receive deliveries from the **test bowler** (full / good length / short,
   configurable pace, line, length, swing).
3. ✅ Read the ball's line and length (camera + ball shadow + debug readout).
4. ✅ Move into position — **footwork changes reach quality**.
5. ✅ **Swipe on the right side** to indicate shot direction (continuous,
   not 4 buttons); release plays the shot.
6. ✅ Choose **Defensive / Normal / Power / Lofted** intent (4 compact buttons).
7. ✅ **Manually time** the shot — PERFECT/GOOD/EARLY/LATE/VERY… windows.
8. ✅ Hit clean, mistime, edge, and miss — all possible outcomes exist.
9. ✅ The final shot **emerges** from footwork + direction + intent + line +
   length + timing (contextual selection: cover drive, pull, cut, flick,
   leg glance, defenses, lofted shots…). Unrealistic combinations become
   awkward/mistimed instead of forced.
10. ✅ The ball **physically flies/rolls** into the field (real exit velocity
    on a Rigidbody; boundaries, runs, and BOWLED detection).
11. ✅ Repeatable delivery loop, score/wickets/balls HUD, debug/tuning panel.

## Quickstart

1. Open `cricket-game/` in **Unity Hub** — built for **Unity 2022.3 LTS**
   (see `ProjectSettings/ProjectVersion.txt`). First open resolves the
   Input System package automatically.
2. Open scene `Assets/_Project/Scenes/BattingPrototype.unity` and press Play.
3. **Editor/desktop testing:** drag with the left mouse button = joystick,
   drag with the right side = swipe. On device: left thumb / right thumb.
4. Landscape orientation is configured; `activeInputHandler` is set to
   **Both** (new Input System drives touch).

### Controls

| Input | Action |
| --- | --- |
| Left thumb (joystick) | Analog footwork — forward/back stride, leg/off movement |
| Right thumb (swipe) | Shot direction; **release = play the shot** (timed) |
| Tiny tap (right) | Plays straight |
| DEF / NOR / POW / LOFT buttons | Shot intent |
| Debug panel sliders | Pace, line, length, swing of the next deliveries |
| FULL / GOOD / SHORT buttons | Delivery presets |
| RESET POS | Re-centre the batsman |

## Running the tests

- **In Unity:** Window → General → Test Runner → Edit Mode → Run All.
  Covers the Super Over rules, the simulation layer, and the batting engine
  (trajectory, footwork, timing windows, direction resolver, contextual shot
  selection, contact outcomes, end-to-end engine flow).
- **Without Unity:** from `cricket-game/`:
  `python3 -m unittest discover -s harness -p 'test_*.py'`
  runs a 1:1 Python reference of every deterministic engine through the same
  scenario battery (70 tests incl. 24,000-match and 4,000-delivery soaks).

## Project layout

```
cricket-game/
├── Assets/_Project/
│   ├── Core/                  pure C# engine (no UnityEngine)
│   │   ├── Rules/             Super Over match state machine (future match mode)
│   │   ├── Simulation/        RNG, outcome model (used by contacts & future AI)
│   │   └── Batting/           Phase 1 batting engine (input-agnostic)
│   ├── Core.Tests/            NUnit tests (Edit Mode)
│   ├── BattingPrototype/      Unity layer: touch input, world, rigs, ball,
│   │                          camera, HUD, debug UI, runner, bootstrap
│   └── Scenes/                BattingPrototype.unity
├── Docs/                      architecture & phase design docs
├── Packages/                  manifest (ugui, Input System, test framework)
├── ProjectSettings/           2022.3 LTS, landscape, new input handler
└── harness/                   headless reference implementations + tests
```

## Module map (Phase 1)

| Spec module | Implementation |
| --- | --- |
| MobileBattingInput | `Input/MobileBattingInput.cs` (touch → generic input) |
| BattingInput | `Core/Batting/BattingTypes.cs` (`BattingInputFrame`) |
| FootworkController | `Core/Batting/FootworkController.cs` |
| ShotDirectionResolver | `Core/Batting/ShotDirectionResolver.cs` |
| ShotIntentController | intent buttons in `Hud/BattingHud.cs` + `ShotIntent` enum |
| ShotSelector | `Core/Batting/ShotSelector.cs` |
| TimingSystem | `Core/Batting/TimingSystem.cs` |
| BatSwingController | `Batsman/BatSwingController.cs` |
| BatBallContact | `Core/Batting/BatBallContact.cs` |
| BatsmanController | `Batsman/BatsmanRig.cs` + `BattingAnimationController.cs` |
| BallController | `Ball/BallController.cs` |
| DeliveryData / ShotData | `Core/Batting/BattingTypes.cs`, `ShotSelector.cs` |
| BattingDebugUI | `Hud/BattingDebugUI.cs` |
| (test bowler) | `Bowler/TestBowler.cs` |
| (camera) | `Camera/CameraController.cs` |
| (orchestrator) | `Game/BattingPrototypeRunner.cs` |

## Not built (deliberately, per the phase plan)

AI batting, multiplayer/networking, full fielding, career/franchise modes,
IPL/web integration, player databases, commentary, tournaments, advanced
graphics, monetization, backend/cloud. Batting foundation first.

## Known limitations (Phase 1)

- Placeholder primitive characters and procedural animation (by design).
- Test bowler only: no run-up variations, no extras, no real bowling AI.
- Boundary/run mapping after a grounded shot is a distance heuristic.
- No sound yet. Camera follow is simple (position-locked, look-tracked).
- Desktop testing uses mouse-drag; real multi-touch needs a device build.

## Recommended Phase 2 (proposal, not started)

1. Real bowling foundation: run-up + release animation, bowling variations
   (seam/swing/spin archetypes), difficulty-tuned dispersion.
2. Shot direction refinement: placement targeting (drag length = power),
   fielder-aware risk/reward.
3. Fielding stubs: ring fielders that intercept/collect, proper run calling.
4. Scoring mode hookup: connect the batting prototype to the existing Super
   Over rules engine (a human innings vs AI bowling).
5. Animation upgrade pass: rigged placeholder humanoid + blended procedural
   shot animations per shot family.
6. Feel pass: haptics, impact audio, slow-mo on perfect timing.
