"""Headless Python reference implementation of the Super Over rules engine.

This mirrors CricketGame.Core.Rules (C#) line-for-line on all rule-relevant
behavior. It exists so the rules can be executed and fuzz-tested in environments
without a Unity/dotnet toolchain. If you change the rules, change BOTH.

Rules implemented:
  * 6 legal balls per innings (wides/no-balls add runs but consume no ball).
  * Maximum 2 wickets per innings.
  * First innings establishes the target = first innings runs + 1.
  * Second innings WINS immediately upon reaching the target.
  * Second innings LOSES if balls run out below target, or 2 wickets fall.
  * Exact scores level at the end => Tie. NO "highest score wins" logic.
"""

from dataclasses import dataclass, field
from typing import List, Optional

# --- constants ---------------------------------------------------------------

KIND_LEGAL = "legal"
KIND_WIDE = "wide"
KIND_NO_BALL = "no_ball"

PHASE_NOT_STARTED = "not_started"
PHASE_FIRST_INNINGS = "first_innings"
PHASE_BREAK = "innings_break"
PHASE_SECOND_INNINGS = "second_innings"
PHASE_COMPLETED = "completed"

OUTCOME_FIRST_WIN = "first_innings_win"
OUTCOME_SECOND_WIN = "second_innings_win"
OUTCOME_TIE = "tie"


# --- outcomes ----------------------------------------------------------------

@dataclass(frozen=True)
class DeliveryOutcome:
    kind: str = KIND_LEGAL
    bat_runs: int = 0
    extra_runs: int = 0
    is_wicket: bool = False
    dismissal: str = "none"

    @staticmethod
    def legal(bat_runs: int) -> "DeliveryOutcome":
        assert 0 <= bat_runs <= 6, "legal delivery runs must be in [0, 6]"
        return DeliveryOutcome(KIND_LEGAL, bat_runs, 0, False)

    @staticmethod
    def wicket(dismissal: str = "bowled") -> "DeliveryOutcome":
        assert dismissal != "none", "wicket requires a dismissal kind"
        return DeliveryOutcome(KIND_LEGAL, 0, 0, True, dismissal)

    @staticmethod
    def wide() -> "DeliveryOutcome":
        return DeliveryOutcome(KIND_WIDE, 0, 1, False)

    @staticmethod
    def no_ball(bat_runs: int = 0) -> "DeliveryOutcome":
        assert 0 <= bat_runs <= 6
        return DeliveryOutcome(KIND_NO_BALL, bat_runs, 1, False)

    @property
    def counts_as_legal_ball(self) -> bool:
        return self.kind == KIND_LEGAL

    @property
    def total_runs(self) -> int:
        return self.bat_runs + self.extra_runs

    def __str__(self) -> str:
        if self.is_wicket:
            return "W"
        if self.kind == KIND_WIDE:
            return "wd"
        if self.kind == KIND_NO_BALL:
            return "nb+%d" % self.bat_runs if self.bat_runs else "nb"
        return str(self.bat_runs)


@dataclass
class BallRecord:
    innings_index: int
    delivery_number: int
    outcome: DeliveryOutcome
    runs_after: int
    wickets_after: int
    legal_balls_after: int
    target_at_delivery: Optional[int]
    runs_needed_after: Optional[int]


# --- innings -----------------------------------------------------------------

class Innings:
    def __init__(self, balls_per_innings: int, max_wickets: int):
        self.balls_per_innings = balls_per_innings
        self.max_wickets = max_wickets
        self.runs = 0
        self.wickets = 0
        self.legal_balls = 0
        self.total_deliveries = 0
        self.deliveries: List[BallRecord] = []
        # Batters numbered 0 and 1; the striker faces the next ball.
        self.striker = 0
        self.non_striker = 1

    @property
    def is_complete(self) -> bool:
        return self.legal_balls >= self.balls_per_innings or self.wickets >= self.max_wickets

    @property
    def balls_remaining(self) -> int:
        return max(0, self.balls_per_innings - self.legal_balls)

    @property
    def wickets_remaining(self) -> int:
        return max(0, self.max_wickets - self.wickets)

    def apply_outcome(self, outcome: DeliveryOutcome, innings_index: int,
                      target: Optional[int]) -> BallRecord:
        self.runs += outcome.total_runs
        if outcome.counts_as_legal_ball:
            self.legal_balls += 1
        if outcome.is_wicket:
            self.wickets = min(self.max_wickets, self.wickets + 1)
            # Bowled/LBW/caught: no runs are taken, so the replacement batter
            # simply takes guard at the striker's end (no swap). A run-out
            # style dismissal with completed runs would swap first - that is
            # a future extension point.
        elif outcome.bat_runs % 2 == 1:
            # Odd runs swap the strike; 2 returns to the original end;
            # boundaries (4/6) are not run, so no swap.
            self.striker, self.non_striker = self.non_striker, self.striker
        self.total_deliveries += 1
        rec = BallRecord(
            innings_index=innings_index,
            delivery_number=self.total_deliveries,
            outcome=outcome,
            runs_after=self.runs,
            wickets_after=self.wickets,
            legal_balls_after=self.legal_balls,
            target_at_delivery=target,
            runs_needed_after=(max(0, target - self.runs) if target is not None else None),
        )
        self.deliveries.append(rec)
        return rec


# --- match -------------------------------------------------------------------

@dataclass
class MatchResult:
    outcome: str
    winner_innings_index: int
    target: int
    margin_runs: int
    margin_wickets: int
    margin_balls: int
    first: dict
    second: dict


class SuperOverMatch:
    """Chase-based Super Over state machine. Mirrors SuperOverMatch.cs."""

    def __init__(self, balls_per_innings: int = 6, max_wickets: int = 2):
        self.balls_per_innings = balls_per_innings
        self.max_wickets = max_wickets
        self.first = Innings(balls_per_innings, max_wickets)
        self.second = Innings(balls_per_innings, max_wickets)
        self.phase = PHASE_NOT_STARTED
        self.result: Optional[MatchResult] = None

    # -- accessors --
    @property
    def current_innings(self) -> Optional[Innings]:
        if self.phase == PHASE_FIRST_INNINGS:
            return self.first
        if self.phase == PHASE_SECOND_INNINGS:
            return self.second
        return None

    @property
    def current_innings_index(self) -> int:
        return 1 if self.phase == PHASE_SECOND_INNINGS else 0

    @property
    def target(self) -> Optional[int]:
        if self.phase in (PHASE_NOT_STARTED, PHASE_FIRST_INNINGS):
            return None
        return self.first.runs + 1

    @property
    def runs_required(self) -> Optional[int]:
        t = self.target
        if t is None:
            return None
        return max(0, t - self.second.runs)

    # -- flow --
    def start(self) -> None:
        if self.phase != PHASE_NOT_STARTED:
            raise RuntimeError("Match has already started.")
        self.phase = PHASE_FIRST_INNINGS

    def start_second_innings(self) -> None:
        if self.phase != PHASE_BREAK:
            raise RuntimeError("The second innings can only start during the innings break.")
        self.phase = PHASE_SECOND_INNINGS

    def record_delivery(self, outcome: DeliveryOutcome) -> None:
        if self.phase not in (PHASE_FIRST_INNINGS, PHASE_SECOND_INNINGS):
            raise RuntimeError("No innings is in progress (phase=%s)." % self.phase)
        innings = self.current_innings
        if innings.is_complete:
            raise RuntimeError("The current innings is already complete.")

        target_for_record = (self.first.runs + 1) if self.phase == PHASE_SECOND_INNINGS else None
        innings.apply_outcome(outcome, self.current_innings_index, target_for_record)

        # Chase rule: win the INSTANT the target is reached (checked first).
        if self.phase == PHASE_SECOND_INNINGS:
            target = self.first.runs + 1
            if self.second.runs >= target:
                self._complete(OUTCOME_SECOND_WIN)
                return

        if innings.is_complete:
            if self.phase == PHASE_FIRST_INNINGS:
                self.phase = PHASE_BREAK
            else:
                if self.second.runs == self.first.runs:
                    self._complete(OUTCOME_TIE)
                else:
                    self._complete(OUTCOME_FIRST_WIN)

    def _complete(self, outcome: str) -> None:
        target = self.first.runs + 1
        self.result = MatchResult(
            outcome=outcome,
            winner_innings_index=0 if outcome == OUTCOME_FIRST_WIN
            else 1 if outcome == OUTCOME_SECOND_WIN else -1,
            target=target,
            margin_runs=(self.first.runs - self.second.runs) if outcome == OUTCOME_FIRST_WIN else 0,
            margin_wickets=(self.max_wickets - self.second.wickets) if outcome == OUTCOME_SECOND_WIN else 0,
            margin_balls=(self.balls_per_innings - self.second.legal_balls) if outcome == OUTCOME_SECOND_WIN else 0,
            first={"runs": self.first.runs, "wickets": self.first.wickets,
                   "legal_balls": self.first.legal_balls},
            second={"runs": self.second.runs, "wickets": self.second.wickets,
                    "legal_balls": self.second.legal_balls},
        )
        self.phase = PHASE_COMPLETED
