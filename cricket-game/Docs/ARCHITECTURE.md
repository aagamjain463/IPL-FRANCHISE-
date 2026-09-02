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
│   └── Batting/        Phase 1 batting engine (input-agnostic)
├── Core.Tests/         CricketGame.Core.Tests  (NUnit, Edit Mode Test Runner)
├── BattingPrototype/   CricketGame.BattingPrototype (touch input, world, rigs,
│                       ball, camera, HUD, debug UI, runner, bootstrap)
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
