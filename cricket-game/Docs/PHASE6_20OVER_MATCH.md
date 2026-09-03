# PHASE 6 — Full 20-Over Cricket Match Engine

Design record. Phase 6 extends Phases 1–5 without rebuilding or removing
anything: the Super Over engine, presentation, stadium and UI all remain in
service. The limited-overs engine reuses the same immutable `DeliveryOutcome`
model and the same chase-authoritative philosophy.

Mirror rule: every rule-relevant behavior exists in BOTH the C# core
(`Assets/_Project/Core/Rules/LimitedOvers/`) and the Python reference
(`harness/limitedovers_reference.py`). The Python battery is executable proof;
the NUnit suite (`Core.Tests/Phase6Tests.cs`) mirrors it for Unity.

---

## Pass 1 — rules engine (COMPLETE)

### New types (`CricketGame.Core.Rules.LimitedOvers`)

| Type | Responsibility |
|---|---|
| `MatchSettings` | Data-driven ruleset: overs (1/2/5/10/20), wickets (2/10), balls per over, max overs per bowler (auto = overs/5, so 4 for 20-over), powerplay window, mode, difficulty. Presets: `TwentyOver()`, `Quick(overs)`, `SuperOver()`. Nothing hardcodes 20. |
| `LimitedOversTeam` | Side name + batting order + bowling squad. |
| `InningsState` | PreInnings / Playing / BallInProgress / BallComplete / OverComplete / DrinksBreak / InningsBreak / InningsComplete / MatchComplete. |
| `BatterCard` | Runs, balls, 4s, 6s, strike rate, dismissal (+ bowler/fielder credit). No-ball runs score but consume no ball; boundaries only count on legal balls. |
| `BowlerCard` | Legal balls, runs conceded (incl. wides/no-balls), wickets (never run outs), maidens (broken by any extra), economy, `Figures` "O-M-R-W". |
| `OverRecord` | One over: bowler, runs, wickets, ball marks ("1","wd","W"…), maiden flag. |
| `LimitedOversInnings` | Full squad, striker/non-striker, incoming-batter queue, extras breakdown, over log, cricket-notation overs ("12.3"), CRR, RRR, powerplay flag, top scorer / best bowler helpers. |
| `BowlerRotation` | `CanBowl` (cap + no consecutive overs) and deterministic `SuggestNextBowler` (fewest overs, then fewest runs). |
| `LimitedOversMatch` | State machine: `Start(firstBattingTeam)` (toss is presentation's job), `AssignBowler`, `BeginDelivery`, `RecordDelivery`, `StartSecondInnings`, drinks-break hooks. Events: InningsStarted / BallCompleted / OverCompleted / WicketFallen / InningsCompleted / MatchCompleted. |
| `LimitedOversScorecard` | Data-driven scorecard snapshot for UI + franchise export: batters, bowlers, per-over records, extras, boundaries, top scorer, best figures, deterministic POTM (runs + 28×wickets; ties prefer the winning innings). |

Additive changes to shared types (no behavior change for existing callers):
- `BallRecord.OverJustCompleted`
- `MatchResult.Scorecard` (null for Super Overs)
- `InningsSummary.From2(LimitedOversInnings)`

### Rules implemented

1. **Legal deliveries** — wides/no-balls never consume a legal ball; 6 legal
   balls complete an over regardless of how many deliveries it took.
2. **Strike rotation** — odd runs swap, even runs and boundaries stay; wicket
   = incoming batter takes guard (completed odd runs rotate first); ends swap
   at every over end.
3. **Bowler rules** — max 4 overs in a 20-over innings (derived cap), never
   two consecutive overs; enforcement throws on violation.
4. **Chase** — target = first innings + 1; reaching it wins immediately on
   whichever delivery; exact level = tie. No highest-score-wins logic.
5. **Dynamic endings** — innings ends on overs completed OR all out; the
   engine reports the exact completion reason.
6. **Rates** — CRR = runs ÷ (legal balls/6); RRR = runs needed ÷ (balls
   remaining/6), updated after every delivery. Overs use cricket notation
   (12.3 = 12 overs + 3 balls), never decimal.
7. **Extras** — wides/no-balls tracked separately and totalled; architecture
   ready for byes/leg byes (extra kind on `DeliveryOutcome` later).
8. **Super Over compatibility** — `MatchSettings.SuperOver()` runs the same
   engine with 1 over / 2 wickets; parity-tested against the original engine.

### Verification (executable)

`python3 harness/test_limitedovers.py` — 18 tests incl. a randomized soak of
full matches asserting result consistency, immediate chase termination and
counter bounds. Covers spec §31 tests 1,2,4,5,6,7,8,9,10,11,12(flag),13,14,15.
All Phases 1–5 harness suites still green. Unity mirror: `Phase6Tests.cs`.

### Known limits (by design, for later passes)

- Gameplay integration (deliveries feeding the engine, mode selection UI,
  innings-break presentation, next-bowler selection UI) — pass 2.
- Scorecard screens, extended result screen, RRR in HUD — pass 3.
- AI batting personalities / AI bowling strategy for long innings — pass 4.
- Powerplay FIELD enforcement, presentation speed, save/resume serialization,
  web-preview mirror — pass 5.
- Run-out "which runner" semantics default to the striker (documented
  extension point on `DeliveryOutcome`).

---

## Pass 2 — gameplay integration (COMPLETE)

The Unity gameplay layer now runs on the limited-overs engine for ALL modes
(single code path; Super Over parity was proven in pass 1).

- **MatchController** rebuilt on `LimitedOversMatch`: `Configure(MatchSettings)`
  swaps formats; squads come from TeamKit (named players + fictional reserves);
  bowler assignment is automatic via `BowlerRotation.SuggestNextBowler` (names
  are presentation — AI physically bowls innings 1, the player innings 2);
  innings-break flow shows first-innings summary (score / top scorer / best
  figures) before the chase line; `EngineReplaced` event lets observers re-bind.
- **PreMatchScreen**: format selector — SUPER OVER / QUICK 5 / T20 · 20 OVER,
  themed buttons + dynamic match chip. START rebuilds the engine for the
  selection.
- **HUD**: batter line now reads names from the engine's player cards (full
  squad); over chips reset every over; result screen shows real POTM + format
  details from MatchSettings; innings-break overlay extended.
- **Stadium scoreboard**: cricket-notation overs ("45/2 (7.3)").
- **Bowling panel**: spell stats reset per over.
- **Debug parity**: `LimitedOversInnings.DebugOverride` +
  `LimitedOversMatch.DebugReevaluateAfterOverride` keep the debug panel working.

Verified: brace-lint balanced on every touched file; all Python rule suites
green (unchanged); web preview smokes green. Unity compile check still pending
(no toolchain in sandbox) — API-grepped for every consumer of the changed
types; no stale `SuperOverMatch` references remain.

Known limits: presentation-speed options, scorecard screens, RRR HUD line and
the web-preview mirror of the 20-over flow arrive in passes 3-5.
