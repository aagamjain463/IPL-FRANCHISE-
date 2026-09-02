# Cricket Game (Unity, standalone)

A standalone, modular cricket game built in Unity — **completely separate**
from the IPL Franchise web application. No web integration exists yet; see
[Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md) for the planned future seam.

First game mode: **SUPER OVER — HUMAN VS AI**

- 6 legal balls per innings (wides/no-balls add runs but don't consume a ball)
- Maximum **2 wickets** per innings
- The first innings **sets the target** (runs + 1)
- The second innings is a **chase**: it wins the *instant* it reaches the
  target, loses if the balls run out below the target, and loses if 2 wickets
  fall before the target. Finishing exactly level is a Tie.
- Target / runs required / balls remaining / wickets are always on the HUD.
- There is **no "highest score wins" logic** — this is a proper chase.

## Quickstart (playing the game)

1. Open this folder (`cricket-game/`) in **Unity Hub** — built for
   **Unity 2022.3 LTS** (see `ProjectSettings/ProjectVersion.txt`).
2. Open the scene `Assets/_Project/Scenes/SuperOver.unity`.
3. Press **Play**.

### Controls

| Key | Action |
| --- | --- |
| `Space` | Lock the timing meter (bat or bowl), advance banners |
| `1` / `2` / `3` | Shot style while batting: Defensive / Balanced / Aggressive |
| `R` | Replay the Super Over (also available via the result-screen button) |

Batting: press `Space` to start the bowler's run-up, then `Space` again when
the meter's marker is in the middle — timing quality decides the shot.
Bowling: press `Space` and release the ball with good timing to raise the
bowling threat against the AI batter.

## Running the tests

- **In Unity:** Window → General → Test Runner → Edit Mode → Run All.
  Covers the full rules engine and the simulation layer.
- **Without Unity:** `python3 harness/test_superover.py` runs a 1:1 Python
  reference of the rules engine through the same scenario battery plus a
  20,000-match randomized soak.
- **Play a text Super Over in the terminal:** `python3 harness/play.py`
  (same rules; handy for sanity-checking the chase feel without Unity).

## Project layout

```
cricket-game/
├── Assets/_Project/
│   ├── Core/            pure C# engine (no UnityEngine) — rules, simulation, contracts
│   ├── Core.Tests/      NUnit tests (Edit Mode)
│   ├── Presentation/    Unity layer: bootstrap, world, HUD, input, match flow
│   ├── Editor/          scene tooling (menu: Cricket → Super Over)
│   └── Scenes/          SuperOver.unity
├── Docs/                architecture & integration notes
├── Packages/            Unity package manifest
├── ProjectSettings/     Unity project settings
└── harness/             headless reference implementation + tests (Python)
```

## Build phases

| # | Phase | Status |
| --- | --- | --- |
| 1 | Project skeleton + chase-based rules engine + tests | ✅ complete |
| 2 | Ball simulation layer (outcomes, AI bat/bowl policies, headless simulator) | ✅ complete |
| 3 | Unity presentation (stadium, HUD, timing input, match flow) | ✅ complete |
| 4 | Match result payload (future web-bridge contract) + docs | ✅ complete |

## Roadmap (after prototype sign-off)

- Shot direction selection (left/right placement) and fielding placement.
- WebGL build + `WebResultSink` implementing `IMatchResultSink` — the only
  code needed to hand the result back to the IPL Franchise web app.
- More modes (full over, death overs, tournaments) reuse the same engine via
  different configs/policies.
