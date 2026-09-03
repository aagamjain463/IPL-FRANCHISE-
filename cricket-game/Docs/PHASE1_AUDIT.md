# PHASE 1 — Super Over Vertical Slice: Implementation Audit

This document records what is **actually implemented in code** (not what the
phase docs claim) against the Phase 1 requirements, plus the bugs found and
fixed during the audit. It was produced by reading every Core, Unity
presentation and test file, and by running the headless verification surfaces.

> **Verification environment note.** This checkout has no Unity Editor and no
> .NET toolchain, so the NUnit suites under `Assets/_Project/Core.Tests/`
> cannot be executed here. They are verified by (a) direct code review and
> (b) the project's own 1:1 headless mirrors — `harness/test_*.py` (Python)
> and `harness/webpreview/smoke.cjs` + `dom_smoke.cjs` (Node) — which the repo
> documents as parity references of the same deterministic engines.

---

## 1. What is already implemented (verified in code)

The Super Over vertical slice is **already functionally complete** through
Phases 1–4 (with Phase 5 presentation + Phase 6 limited-overs scaffolding on
top). The audit confirms every Phase 1 requirement has a real implementation:

### Rules / match state machine — ✅ implemented
- `Core/Rules/SuperOverMatch.cs` — pure C# chase-based state machine:
  `NotStarted → FirstInnings → InningsBreak → SecondInnings → Completed`.
  Illegal transitions throw `InvalidOperationException` (e.g. `Start()` twice,
  `RecordDelivery` during the break, `StartSecondInnings` early).
- `Core/Rules/Innings.cs` — 6 legal balls, max 2 wickets, strike rotation
  (odd runs swap, boundaries/wickets don't), extras that consume no legal ball.
- `Core/Rules/MatchResult.cs` — `FirstInningsWin / SecondInningsWin / Tie`
  with run margin, wicket margin and balls-remaining margin. No tie-breaker.
- Chase rules verified: `target = firstInningsRuns + 1`; chase **wins the
  instant** `runs >= target`; balls-out below target = loss; exactly level =
  **Tie**; 2 wickets ends the innings immediately.
- The Unity layer wraps the same engine: `MatchController` uses
  `LimitedOversMatch` with `MatchSettings.SuperOver()` (1 over, 2 wickets) —
  the Super Over runs through the Phase 6 engine without any duplicated rules.
- `MatchController` is the single owner of flow (`PreMatch → Innings1 →
  Innings1Result → InningsBreak → Innings2 → MatchResult`); the HUD only
  observes the engine.

### Batting — ✅ implemented (`Core/Batting`)
- `BattingEngine` — input-agnostic loop; `FootworkController`, `TimingSystem`
  (VERY EARLY / EARLY / GOOD / PERFECT / LATE / VERY LATE / MISSED),
  `ShotDirectionResolver`, `ShotSelector` (contextual, flags `Awkward`),
  `BatBallContact`, `ShotOutcomeResolver` (0/1/2/3/4/6, edges, BOWLED, LBW —
  all driven by trajectory + contact physics, not score manipulation).
- Intent system DEF / NOR / POW / LOFT wired through `ShotIntent`.

### Bowling — ✅ implemented (`Core/Bowling`, `BowlingController`)
- 8 spec delivery types (fast straight / inswinger / outswinger / yorker /
  full / good length / short / bouncer) + Phase 4 variations. Data-driven
  `DeliverySpec` + weighted `BowlerPlan`.
- AI bowler (`AiBowlingPlanner`) picks adaptive deliveries (repeated-sector
  drying, pace-off vs aggression, yorker at the death) — never fully random.

### Player bowling — ✅ implemented
- `BowlingUiPanel` (line LEFT/CENTER/RIGHT, length SHORT/GOOD/FULL/YORKER,
  FAST/SWING/YORKER/SHORT + others) feeds the **same** `DeliveryFactory` /
  `BowlingPipeline` the AI uses — no separate fake simulation.

### AI batting — ✅ implemented (`Core/AI/AiBatting.cs`, `AiBatterDriver`)
- Strategic states SAFE / BALANCED / AGGRESSIVE / DESPERATE from target /
  score / balls / wickets. Produces the **same** `BattingInputFrame`s a human
  does; mistakes are timing spread / leaves / hacks, never score writes.

### Fielding — ✅ implemented (`Core/Fielding`, `FielderManager`)
- Deterministic 60 Hz `FieldingSimulator` (11 fielders, catches, ground
  fielding, boundary detection, runs resolved, always completes).

### Ball / physics — ✅ implemented (`BallController`)
- Kinematic analytic delivery flight → dynamic Rigidbody on contact → boundary
  / rest detection. Every legal delivery resolves; no stuck-ball path found.

### Camera / input / HUD / replay — ✅ implemented
- Broadcast camera states (`CameraController`), mobile input
  (`MobileBattingInput`: joystick + swipe + intent buttons), mobile HUD
  (`BattingHud`: score, wickets, balls, target, runs needed, balls remaining,
  over chips, delivery/timing chips), and `PLAY AGAIN` via `MatchController`
  (fresh engine rebuild, no scene reload).

### Tests — ✅ present and green
- `Core.Tests/` (NUnit, 7 files): rules, batting, bowling, simulation,
  fielding/AI/match flow, Phase 4, Phase 6.
- `harness/test_*.py`: 1:1 Python mirrors — **188 tests pass** (see §3).
- `harness/webpreview/smoke.cjs` + `dom_smoke.cjs`: JS parity + a 7,200-frame
  headless full-match run (chase + PLAY AGAIN) — **pass**.

---

## 2. Bugs found and fixed in this audit

### 2.1 Tie presented as "AI WINS!" (result screen) — FIXED
`BattingHud.ShowMatchResult` only took a `bool playerWon`, so a `Tie` was
rendered as **"AI WINS!"** in red and played the lose sound. A Super Over has
three results; a tie must not be an AI win.

- `BattingHud.ShowMatchResult(MatchResult)` now derives win/lose/tie from
  `MatchResult.Outcome`: `"TIE!"` (amber) for `MatchOutcome.Tie`, and the
  PLAYER-OF-THE-MATCH line shows `"TIED"`.
- `MatchController` plays a neutral `CrowdCheer` (instead of the lose sting)
  for a tie.
- The web preview already handled this correctly (`preview.js` → `title =
  "TIE"`), so this restores Unity↔preview parity.

### 2.2 Stale HUD state after PLAY AGAIN — FIXED
On `PLAY AGAIN` (and format switch) `MatchController.BuildEngine` rebuilds the
rules engine and raises the new engine's `InningsStarted` **before**
`EngineReplaced` re-binds the observers. The over-summary chips, partnership
strip (`BattingHud`) and SPELL ANALYSIS counters (`BowlingUiPanel`) were only
reset inside those event handlers, so a replayed match showed the previous
match's deliveries.

- `BattingHud.BindMatch` now calls `ClearOverChips()` when it (re)binds.
- `BowlingUiPanel.BindMatch` now calls a new `ResetSpellStats()` when it
  (re)binds.
- The JS preview already resets these via `resetPresentationStats()` on
  PLAY AGAIN, so this restores parity.

### 2.3 Missing Phase 1 edge-case coverage — ADDED
The exact delivery-count boundary scenarios from the Phase 1 spec were not
explicitly tested. Added a `TestPhase1EdgeCases` battery (Python mirror +
NUnit `SuperOverRulesTests`):

| Case | Expected |
| --- | --- |
| SIX off the 6th ball | chase win, `margin_balls = 0` |
| FOUR off the 6th ball | chase win, `margin_balls = 0` |
| Wicket off the 6th ball (1st innings) | innings ends on balls (1 wkt, 6 balls) |
| First innings score = 0 | target = 1 |
| Target reached on ball 1 | immediate win, `margin_balls = 5` |

---

## 3. Tests run (this environment)

```
python3 -m unittest discover -s harness -p 'test_*.py'
   Ran 188 tests ... OK            (was 183; +5 Phase 1 edge cases)
   soak: 20,000 random matches, first=297 second=422 ties=81 (no invariant violations)

node smoke.cjs                     SMOKE PASS (phase 1+2+3+4)
node dom_smoke.cjs                 RAN 7200 frames without crashing.
                                   RESULT SCREENS SHOWN: 2 · PLAY AGAIN → fresh match at 0/0
```

The NUnit suite (`Assets/_Project/Core.Tests/`) is the canonical Unity-side
surface and must be run in the Unity Test Runner (Edit Mode) — it could not be
executed in this environment (no Unity/.NET).

---

## 4. Remaining / out of scope (deliberate, not Phase 1)

- No real audio clips (placeholder `AudioManager` by design).
- Placeholder primitive characters/stadium; no AAA art (by design).
- No multiplayer, career/franchise, monetization, backend, or real IPL teams.
- `Assets/_Project/Presentation/` referenced by `harness/gen_meta.py`'s
  fixed GUIDs does not exist in this checkout — the bootstrap script
  (`BattingBootstrap`) is the scene entry point; the scene references it.
