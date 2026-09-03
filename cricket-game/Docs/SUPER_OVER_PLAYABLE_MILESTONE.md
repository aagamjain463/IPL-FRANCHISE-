# Super Over Playable Milestone — verification record

Date: 2026-09-03 · Branch: `arena/01a06358-ipl-franchise` · Commit base: `ee6fd2a`

## Goal

Playable Human vs AI Super Over loop:

```
PRE-MATCH (format select) → INNINGS 1 (human bats, AI bowls)
→ 6 legal balls or 2 wickets → INNINGS BREAK (target set)
→ INNINGS 2 (AI chases, human bowls) → target reached / 6 balls / 2 wickets
→ RESULT (win / lose / tie) → PLAY AGAIN → fresh match
```

## Finding

**No code changes were required.** Every stage of this loop is already
implemented and wired in the existing project. This document records the
loop-to-system map and the verification level of each part so the status is
never again inferred from a single static pass.

## Loop → existing systems

| Loop stage | System (existing) |
|---|---|
| Match start / setup | `UI/PreMatchScreen.cs` — format buttons (SUPER OVER default, QUICK 5, T20), START MATCH |
| Rules engine | `Core/Rules/LimitedOvers/*` via `MatchSettings.SuperOver()` = 1 over, 2 wickets |
| Match flow | `Match/MatchController.cs` — flow states, `BetweenDeliveries()` break/result sequences, `PlayAgain()`/`ResetMatch()` |
| Delivery loop | `Game/BattingPrototypeRunner.cs` — one coroutine, `deliveryRecorded` guard = exactly-once recording |
| Human batting | `MobileBattingInput` (EnhancedTouch) + `BattingEngine` (timing/footwork physics) |
| Human bowling | `Match/BowlingUiPanel.cs` + release-timing skill check |
| AI batting (chase) | `Match/AiBatterDriver.cs` + `Core/AI/AiBatting.cs` (RRR-driven aggression) |
| AI bowling | `Core/AI/AiBowling.cs` adaptive planner + `BowlerRotation` |
| Wides / extras | runner wide path → `DeliveryOutcome.Wide()` (no legal ball consumed) |
| Target + instant chase end | engine: target = 1st innings + 1; innings completes on the exact delivery that reaches it |
| Result | `MatchResult` + HUD result screen (margin, POTM), PLAY AGAIN button → `PlayAgain()` |
| Scoreboard / chips | `Hud/BattingHud.cs` + `World/StadiumScoreboard.cs` (engine events, single source of truth) |
| Camera | `Camera/CameraController.cs` (pre-match orbit / setup / run-up / gameplay / result hold) |
| Debug panel | `Hud/BattingDebugUI.cs` (nudges + force-innings-end via engine debug parity) |

## Verification levels

- **A — verified by actual Unity execution:** *none*. This environment cannot
  run Unity 6000.5.10f1. Treat runtime behaviour as unverified until opened
  in the editor.
- **B — verified by tests / static analysis:**
  - Rules engine behaviour: `harness/test_superover.py` (24 tests) and
    `harness/test_limitedovers.py` (18, incl. 20-over soak) — OK.
  - Match-flow, batting, bowling, phase-4, simulation batteries — OK.
  - Web preview headless smokes (`smoke.cjs`, `dom_smoke.cjs`) — OK.
  - NUnit mirror `Core.Tests` present (compiles under `UNITY_INCLUDE_TESTS`).
  - Full-project static audit (name resolution across all assemblies, asmdef
    references, Unity 6 removed APIs, C# version features) — zero findings.
  - Unity 6 compile errors reported from the editor were fixed in commits
    `4941cdb` and `ee6fd2a` (ShotIntent ambiguity, scorecard duplicate
    members, missing System imports, Camera namespace shadowing, CS0136).
- **C — not verified:** anything requiring Play Mode: touch input feel,
  camera timing, audio, AI difficulty tuning, device performance.

## What remains before the first playable build (in the editor)

1. Open `cricket-game/` in Unity 6000.5.10f1; confirm zero console errors
   (upgrade prompts for manifest/ProjectVersion are expected once).
2. Enter Play Mode → pre-match screen → START MATCH (SUPER OVER selected by
   default) → play both innings → PLAY AGAIN.
3. On-device checks (touch): swipe responsiveness, release-window feel,
   camera transitions. These are tuning tasks, not blockers.
