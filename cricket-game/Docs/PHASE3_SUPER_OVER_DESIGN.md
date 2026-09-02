# Phase 3 — Full Playable Super Over

Phase 3 turns the batting/bowling prototype into a complete, replayable
Super Over on top of the Phase 1/2 systems. Nothing was rebuilt: the
batting engine, bowling factory, trajectory math and outcome resolver are
used unchanged; Phase 3 adds the match, the field, and the AI around them.

```
PLAYER bats (touch)          AI bats (drives the same engine)
        │                            ▲
        ▼                            │ AiBatterDriver (plan -> input frames)
┌─────────────────────────  BattingPrototypeRunner (delivery loop) ─┐
│ BowlingController (AI plan in inn 1, PLAYER picks in inn 2)       │
│ BattingEngine (unchanged) ──► unstruck: ShotOutcomeResolver       │
│                          └──► struck:   FieldingSimulator          │
│ FielderManager (presentation)   MatchController (rules + flow)    │
└───────────────────────────────────────────────────────────────────┘
```

## Rules (Core/Rules, extended)

* 6 **legal** deliveries per innings; wides/no-balls add runs but never
  consume a ball (generator flag already exists; not produced yet).
* Maximum **2 wickets** per innings.
* Innings 1 sets **target = runs + 1**.
* Innings 2 **chases**: wins the instant the target is reached
  (`SuperOverMatch.RecordDelivery` checks the chase before exhaustion).
  Loses when balls or wickets run out below target. Exact level = **Tie**.
  There is no "highest score wins" anywhere.
* Tie-break: **not implemented by design** — the `Tie` result is the clean
  extension point for a future bowl-out/shared-over.
* Striker tracking: odd runs swap the strike, 2 keeps it, 4/6 are not run,
  a dismissed striker is replaced at the same end.
* `MatchResult` carries `MarginRuns`, `MarginWickets` **and** `MarginBalls`
  ("chased with N balls remaining").

## Match flow (BattingPrototype/Match/MatchController.cs)

`MatchController` is the **single owner** of match state:

```
PreMatch → Innings1 (player bats / AI bowls)
        → Innings1Result overlay (score + target set)
        → InningsBreak overlay ("AI needs X from 6")
        → Innings2 (AI bats / PLAYER bowls via BowlingUiPanel)
        → MatchResult overlay (margins + both innings + PLAY AGAIN)
```

The runner's delivery loop yields on `MatchController.BetweenDeliveries()`
between balls; everything rule-related happens inside the controller or in
`Core.Rules`. PLAY AGAIN rebuilds a fresh `SuperOverMatch` — no reload.

Events surfaced: `FlowChanged`, `TargetReached`, `MatchFinished`, plus the
rules engine's `InningsStarted / BallCompleted / InningsCompleted /
MatchCompleted`.

## Fielding (Core/Fielding — deterministic, no ML)

`FieldingSimulator.Simulate(contactPos, velocity, fielders, rng)` resolves
the **entire flight** of a struck ball in fixed 60 Hz steps:

* 9 named fielders + bowler + keeper (`FieldSetup.Default`): slip, point,
  cover, mid-off, mid-on, mid-wicket, square leg, fine leg, third man.
* Attributes per fielder: speed, reaction, catching, ground, throw speed /
  accuracy, each scaled by difficulty through `Fielder.Scale`.
* Fielders **read the flight**: closed-form landing estimate, sprint to the
  landing spot for lofted balls, chase and lead grounded balls.
* **Catching**: one roll per opportunity; probability = catching ability ×
  speed factor × height factor. Hard *rising* drives can't be caught;
  slow low edges can be taken on the rise by keeper/slips. Drops deflect
  the ball and cost the fielder recovery time.
* **Ground fielding**: one stop attempt per pass (0.5 s cooldown) with
  chance = ground ability vs ball speed; fumbles squirt the ball on.
* **Boundaries**: reaches the rope having bounced → FOUR; over the rope on
  the full → SIX. Physics decides (bounce retention 0.86, rolling drag,
  restitution 0.48) — a hard flat drive through a gap skids away, the same
  shot at a fielder is cut off.
* **Running** (`RunsFromTime`): automatic 0–3 runs from the time between
  contact and the ball returning to the keeper. Abstracted so manual
  running can replace it later.
* Result carries `ChaseHint`s (who reacted, when, where) so the Unity
  `FielderManager` and the camera can present exactly what the sim decided.

## AI batting (Core/AI — strategic states, real mistakes)

`AiBattingPlanner.Plan(rng, delivery, chaseContext, difficulty, hitsStumps)`
returns intent, shot direction, swipe strength, a timing offset and a
footwork target — the **same inputs a human produces**.

* Strategic states from the chase math (`AggressionState`):
  * **Safe** — required ≤ balls with wickets in hand: rotate, leave wide
    balls that miss the stumps.
  * **Balanced** — RRR ≤ 2.2: score steadily.
  * **Aggressive** — RRR ≤ 4.2: attack, loft enters the mix.
  * **Desperate** — big ask or last ball: max swings, big lofts, more errors.
  * At winning distance (1–2 needed) the AI swings to win, not to tie.
* Mistakes are built in: gaussian timing spread plus an outright-hack
  chance; leaves, blocks, mistimed drives, edges and clean misses all
  happen naturally because the plan goes through the real engine.
* `AiBatterDriver` (Unity) and `Phase3MatchSimulator` (headless) drive the
  engine frame-by-frame from the plan, so tests and live play behave
  identically.

## Difficulty (EASY / MEDIUM / HARD)

`AiDifficultyTuning` changes **behaviour**, never raw score odds:

| knob                    | easy | medium | hard |
|-------------------------|------|--------|------|
| AI timing sd multiplier | 1.45 | 1.00   | 0.78 |
| outright-hack chance    | .10  | .05    | .02  |
| field vs the player     | 0.80 | 1.00   | 1.15 |
| field for the player    | 1.10 | 1.00   | 0.90 |
| AI bowling accuracy     | 0.60 | 0.75   | 0.85 |

Hard AI times the ball better, fields sharper and bowls tighter; the chase
success rate shifts measurably (verified in both harness and NUnit).

## Player bowling (innings 2)

`BowlingUiPanel`: LEFT/RIGHT = line, UP/DOWN = length, buttons
FAST / SWING / YORKER / SHORT. The pick feeds
`BowlingController.PlayerDelivery(type, line, length, accuracy)` which
reuses the Phase 2 `DeliveryFactory` (speed/swing/seam come from the type
spec; a small accuracy scatter keeps it human). The AI batter plans against
whatever is actually bowled.

## Presentation

* `FielderManager`: 11 pooled fielders; chase targets and arrival times
  come from the sim result — they meet the ball exactly when the play
  happens, catch/stop poses included.
* Camera: existing broadcast states plus **CatchEmphasis** and
  **FieldingFollow**; wickets keep the stump push-in. Never shaky.
* HUD: `YOU 12/1 (4 of 6 balls)` + chase line `TARGET 13 · NEED 1 · 2
  BALLS · 1 WICKET LEFT`; overlays for innings complete, break and result
  ("Won by 4 runs", "Target chased with 2 balls remaining", "All out…").
* Audio: `IAudioManager` + `GameSound` enum + placeholder implementation —
  every hook fires (release, contact, boundary, wicket, crowd, result),
  real clips drop in later without touching gameplay code.

## Debug panel additions

Difficulty cycle, force-fielding cycle (CATCH / MISS / STOP / BOUNDARY),
RUNS+2 / WKTS+1 / BALLS+1 (`Innings.DebugOverride` — debug only),
RESET MATCH, SIM BALL. Force-outcome from Phase 2 still works and now
flows through the match (`ForcedOutcome.Six` innings = 36, verified).

## Verification

* Python harness (`harness/`): `fielding_reference.py`, `ai_reference.py`,
  `matchflow_reference.py` + `test_matchflow.py` — 27 tests covering every
  spec-28 scenario, including a seeded AI-vs-AI soak proving the chase can
  be won **and** lost.
* C#: `Core.Tests/MatchFlowTests.cs` mirrors the same battery against the
  real `Core` classes through `Phase3MatchSimulator`.
* Browser preview (`harness/webpreview/`): full match loop playable on
  desktop/touch; `smoke.cjs` re-runs the fielding/AI/match battery in JS,
  `dom_smoke.cjs` plays whole matches headlessly (result screens + PLAY
  AGAIN verified).

## Not in this phase (by agreement)

Multiplayer, networking, franchise integration, real teams, manual running,
advanced fielding controls, tie-break implementation, real audio assets.
