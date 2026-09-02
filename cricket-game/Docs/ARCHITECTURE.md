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

## Verification

| Layer | Where | How |
| --- | --- | --- |
| Rules | `Core.Tests/` (Unity Edit Mode) | NUnit scenarios + randomized soak |
| Rules | `harness/test_superover.py` | Python reference mirror of the same scenarios, runnable without Unity |
| Simulation | `Core.Tests/SimulationTests.cs` | deterministic seeded matches, replay-consistency, policy sanity |
| Batting | `Core.Tests/BattingEngineTests.cs` | trajectory, footwork, timing, selection, contact, engine flow |
| Bowling/Outcomes | `Core.Tests/BowlingSystemTests.cs` | factory, plans, seam/bounce/pitch, yorker rules, resolver, LBW |
| All engines | `harness/test_*.py` (95 tests) | Python mirrors, incl. a 2,500-ball soak (no Unity needed) |
| Browser preview | `harness/webpreview/smoke.cjs`, `dom_smoke.cjs` | JS-port parity + headless 14 s gameplay run |

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
