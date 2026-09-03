# Cricket Game — Architecture

> Standalone Unity cricket game. **Not integrated** with the IPL Franchise web
> app yet. This document describes the current standalone design and the
> *planned* future integration surface (design only — no integration code).

## Goals

1. A modular, chase-correct cricket gameplay engine.
2. All game logic lives in pure C# (no `UnityEngine` references) so it can be
   unit-tested headlessly and reused anywhere — including a future bridge to
   the web app.
3. Presentation (Unity scenes, HUD, animation, input) is a thin layer on top
   of the engine, wired only through events and value snapshots.

## Assembly layout

```
Assets/_Project/
├── Core/               CricketGame.Core        (noEngineReferences: true)
│   ├── Rules/          Super Over state machine (future match mode)
│   ├── Simulation/     RNG, outcome model, AI policies, headless simulator
│   ├── Batting/        batting engine + shot outcome resolver (input-agnostic)
│   └── Bowling/        delivery specs, bowler plans, delivery factory
├── Core.Tests/         CricketGame.Core.Tests  (NUnit, Edit Mode Test Runner)
├── BattingPrototype/   CricketGame.BattingPrototype (touch input, world + stadium,
│                       rigs, ball, bowling, camera, HUD, debug UI, runner, bootstrap)
└── Scenes/             BattingPrototype.unity
```

Dependency rule: `BattingPrototype -> Core`, `Core -> nothing`.

## Batting engine (Core/Batting) — Phase 1

```
Touch (MobileBattingInput)          [later: gamepad/keyboard adapters]
        │  produces
        ▼
BattingInputFrame ──▶ BattingEngine
                        ├─ FootworkController    analog movement model
                        ├─ DeliveryTrajectory    analytic deterministic flight
                        ├─ TimingSystem          swing offset → windows/curves
                        ├─ ShotDirectionResolver swipe+timing+line → direction
                        ├─ ShotSelector          contextual shot table
                        └─ BatBallContact        outcome + exit velocity
```

The engine never knows the input source. Swing timing is judged at the
release of the swipe against the analytic ball-arrival time; contact produces
a real velocity vector applied to the ball's Rigidbody. See
`Docs/PHASE1_BATTING_DESIGN.md` for the full design.

## Bowling + outcomes (Phase 2)

```
BowlerProfile (SO) ─▶ BowlingController ─▶ DeliveryData (typed, seeded)
                             │                     │
                             ▼                     ▼
                      BowlerController      BattingEngine.BeginDelivery
                      (run-up visual)              │
                                                   ▼
                              trajectory (swing → bounce → seam cut)
                                                   │
                  swing committed ─▶ BatBallContact ─▶ ContactResult
                                                   │
                                   ShotOutcomeResolver (deterministic +
                                   bounded luck: bowled / LBW / edges /
                                   carry+roll → dot..6)
                                                   │
                                   GameplayEvents (OnBallReleased, OnBallBounced,
                                   OnShotPlayed, OnBallContact, OnWicket,
                                   OnBoundary, OnDeliveryComplete)
```

`ShotOutcomeResolver` extends Phase 1 instead of replacing it: contact still
comes from `BatBallContact`; the resolver turns the contact (or its absence)
into cricket: runs, boundaries, wickets. Full design in
`Docs/PHASE2_BOWLING_DESIGN.md`.

## Fielding (Core/Fielding) — Phase 3

`FieldingSimulator` resolves a struck ball against the field in fixed 60 Hz
steps — no physics engine, no per-frame AI in Unity, fully deterministic
with a seeded `IRng`:

* `FieldSetup.Default`: slip, point, cover, mid-off, mid-on, mid-wicket,
  square leg, fine leg, third man + bowler + keeper, each with speed /
  reaction / catching / ground / throw attributes, scaled by difficulty.
* Fielders read the flight (closed-form landing estimate), chase, take one
  catch roll and one stop attempt per pass (cooldown), fumble fast balls,
  and return the ball to the keeper; `RunsFromTime` derives 0–3 automatic
  runs from how long that takes.
* The result carries `ChaseHint`s so presentation (Unity `FielderManager`,
  camera) replays exactly what the sim decided.

## AI batting (Core/AI) — Phase 3

`AiBattingPlanner` turns the chase context (target/score/balls/wickets)
into strategic states — SAFE / BALANCED / AGGRESSIVE / DESPERATE — and from
there into the SAME inputs a human produces (intent, direction, strength,
timing offset, footwork). Mistakes are gaussian timing spread + outright
hacks + leave decisions, never score manipulation. `AiBatterDriver` (Unity)
and `Phase3MatchSimulator` (headless) feed those frames into the real
`BattingEngine`. Difficulty (`AiDifficultyTuning`) tunes timing, mistakes,
field quality both ways and AI bowling accuracy.

## Match flow (BattingPrototype/Match) — Phase 3

`MatchController` is the single owner of match rules/flow (PreMatch →
Innings1 → Innings1Result → InningsBreak → Innings2 → MatchResult);
innings 1 = player bats / AI bowls, innings 2 = AI chases / **player
bowl**s via `BowlingUiPanel` (line/length + FAST/SWING/YORKER/SHORT into
the Phase 2 `BowlingController`). No match rules exist outside the
controller + `Core.Rules`.

## Rules engine (Core/Rules)

`SuperOverMatch` is the single source of truth for SUPER OVER — HUMAN VS AI:

- **6 legal balls** per innings. Wides/no-balls add runs but consume no ball.
- **Maximum 2 wickets** per innings; the 2nd wicket ends the innings.
- First innings **sets the target** = first-innings runs + 1.
- Second innings **wins immediately** the moment it reaches the target.
- Second innings **loses** if balls run out below the target or 2 wickets fall.
- Finishing exactly level = **Tie**.
- There is **no "highest score wins" logic anywhere**. The chase is decided
  exclusively by `runs >= target` during the second innings.

The engine raises events (`InningsStarted`, `BallCompleted`,
`InningsCompleted`, `MatchCompleted`) so any number of listeners (HUD, audio,
analytics, future web bridge) can observe without coupling.

## Presentation layer (BattingPrototype/UI + World) — Phase 5

`UITheme` is the single visual source of truth (palette, radii, type scale,
tween timings) distilled from the approved Figma direction; `UiComponents`
builds rounded panels/buttons/chips from runtime sprites; `UITweenHost` runs
fade/scale/slide tweens on UNSCALED time so menus animate while paused.

Screens (`PreMatchScreen`, `PauseMenuScreen`) hold `Time.timeScale = 0` and
release it explicitly; Quit returns to pre-match via `MatchController.ResetMatch`.
`BattingHud` (restyled, API-identical) and `BowlingUiPanel` OBSERVE the rules
engine through `SuperOverMatch.BallCompleted/InningsStarted` for over chips,
partnership strip and SPELL ANALYSIS — no second scoring system. The result
screen renders the Figma three-column layout from `MatchResult` summaries and
exposes `ContinueToFranchise` as the future web-bridge hook.

`StadiumAtmosphere` adds dusk lighting, floodlight glow, crowd colour bands with
a sine shimmer and a HIGH-only second stand tier; `QualityPreset` (LOW/MED/HIGH)
gates all of it. `CameraController` gains `PreMatchOrbit` (unscaled-time sweep)
and `ResultHold` states. Debug panel now starts hidden.

## Verification

| Layer | Where | How |
| --- | --- | --- |
| Rules | `Core.Tests/` (Unity Edit Mode) | NUnit scenarios + randomized soak |
| Rules | `harness/test_superover.py` | Python reference mirror of the same scenarios, runnable without Unity |
| Simulation | `Core.Tests/SimulationTests.cs` | deterministic seeded matches, replay-consistency, policy sanity |
| Batting | `Core.Tests/BattingEngineTests.cs` | trajectory, footwork, timing, selection, contact, engine flow |
| Bowling/Outcomes | `Core.Tests/BowlingSystemTests.cs` | factory, plans, seam/bounce/pitch, yorker rules, resolver, LBW |
| Fielding/AI/Match | `Core.Tests/MatchFlowTests.cs` | fielding sim, AI states, scripted scenarios, headless AI-vs-AI soak |
| All engines | `harness/test_*.py` (122 tests) | Python mirrors, incl. a 2,500-ball soak + full-match soak (no Unity needed) |
| Browser preview | `harness/webpreview/smoke.cjs`, `dom_smoke.cjs` | JS-port parity + headless full-match run (chase + PLAY AGAIN) |

The Python harness is a 1:1 reference port used for environments without a
.NET toolchain. **If rules change, both implementations must change.**

## Planned future integration (NOT implemented)

```
IPL Franchise web app (React/Vite)
        │ user selects PLAY MATCH
        ▼
loads/embeds Unity WebGL build of this game
        ▼
Unity runs the match (this engine drives gameplay)
        ▼
Unity emits MatchResultPayload (JSON)  ──▶  web app processes the result
```

The future seam is `CricketGame.Core.Contracts`:

- `MatchResultPayload` — a stable, serializable DTO: mode, config, outcome,
  winner, margins, per-innings summaries, per-ball log, seed.
- `IMatchResultSink` — an interface the presentation layer calls when a match
  completes. Today the only sink logs to the console. A future `WebResultSink`
  (WebGL `SendMessage` / JS bridge) will implement the same interface without
  touching gameplay code.

No WebGL, JS interop, or embedding work exists yet, by design.
