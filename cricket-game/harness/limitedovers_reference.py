"""Headless Python reference implementation of the LIMITED-OVERS match engine.

Mirrors CricketGame.Core.Rules.LimitedOvers (C#) line-for-line on all
rule-relevant behavior (Phase 6 pass 1). If you change the rules, change BOTH.

Reuses the Super Over reference's DeliveryOutcome (same immutable outcome
model: legal / wide / no-ball with dismissal kinds).

Rules implemented:
  * Configurable overs (1/2/5/10/20), wickets (2/10), 6 balls per over.
  * Wides/no-balls add runs + extras but consume NO legal ball.
  * 6 legal balls complete an over; ends swap at over end.
  * Strike rotation: odd bat runs swap, even/boundary stay, wicket = new
    batter takes guard (completed odd runs rotate first).
  * Bowler caps: max overs per bowler, never two consecutive overs.
  * Bowler figures: all runs conceded count; only bowled/caught/lbw/stumped
    credit the bowler; maidens need a full run-free legal-ball over.
  * Chase: target = first innings + 1, reaching it wins immediately;
    exact level = tie; otherwise the first-batting side wins. NO highest-
    score-wins logic anywhere.
  * Required run rate over balls remaining; overs in cricket notation (12.3).
"""

from dataclasses import dataclass, field
from typing import List, Optional

from superover_reference import (
    DeliveryOutcome, KIND_LEGAL, KIND_WIDE, KIND_NO_BALL,
    PHASE_NOT_STARTED, PHASE_FIRST_INNINGS, PHASE_BREAK, PHASE_SECOND_INNINGS,
    PHASE_COMPLETED, OUTCOME_FIRST_WIN, OUTCOME_SECOND_WIN, OUTCOME_TIE,
)

# --- innings states (presentation hooks) --------------------------------------

STATE_PRE_INNINGS = "pre_innings"
STATE_PLAYING = "playing"
STATE_BALL_IN_PROGRESS = "ball_in_progress"
STATE_BALL_COMPLETE = "ball_complete"
STATE_OVER_COMPLETE = "over_complete"
STATE_DRINKS_BREAK = "drinks_break"
STATE_INNINGS_BREAK = "innings_break"
STATE_INNINGS_COMPLETE = "innings_complete"
STATE_MATCH_COMPLETE = "match_complete"

DISMISSAL_RUN_OUT = "run_out"


# --- settings ------------------------------------------------------------------

@dataclass(frozen=True)
class MatchSettings:
    overs_per_innings: int = 20
    wickets_per_innings: int = 10
    balls_per_over: int = 6
    max_overs_per_bowler: int = 0        # 0 -> derived below
    mode: str = "twenty_over"            # quick | super_over | twenty_over
    difficulty: str = "medium"
    powerplay_overs: int = 0
    allow_extras: bool = True

    def __post_init__(self):
        assert self.overs_per_innings >= 1
        assert self.wickets_per_innings >= 1
        assert self.balls_per_over >= 1
        derived = self.max_overs_per_bowler
        if derived <= 0:
            derived = 1 if self.overs_per_innings == 1 else max(1, self.overs_per_innings // 5)
        derived = min(derived, self.overs_per_innings)
        object.__setattr__(self, "max_overs_per_bowler", derived)

    @property
    def balls_per_innings(self):
        return self.overs_per_innings * self.balls_per_over

    @property
    def minimum_batters(self):
        return self.wickets_per_innings + 1

    @property
    def minimum_bowlers(self):
        return -(-self.overs_per_innings // self.max_overs_per_bowler)  # ceil div

    @staticmethod
    def twenty_over(difficulty="medium"):
        return MatchSettings(20, 10, 6, 0, "twenty_over", difficulty, 6)

    @staticmethod
    def super_over(difficulty="medium"):
        return MatchSettings(1, 2, 6, 0, "super_over", difficulty, 0)


# --- player cards ----------------------------------------------------------------

class BatterCard:
    def __init__(self, name):
        self.name = name
        self.runs = 0
        self.balls_faced = 0
        self.fours = 0
        self.sixes = 0
        self.is_out = False
        self.dismissal = "none"
        self.dismissed_by_bowler = -1

    @property
    def strike_rate(self):
        return 0.0 if self.balls_faced <= 0 else self.runs * 100.0 / self.balls_faced

    def apply_delivery(self, outcome):
        if outcome.bat_runs > 0:
            self.runs += outcome.bat_runs
            if outcome.counts_as_legal_ball:
                if outcome.bat_runs == 4:
                    self.fours += 1
                elif outcome.bat_runs == 6:
                    self.sixes += 1
        if outcome.counts_as_legal_ball:
            self.balls_faced += 1

    def record_dismissal(self, dismissal, bowler_index):
        assert not self.is_out, "batter already out"
        assert dismissal != "none"
        self.is_out = True
        self.dismissal = dismissal
        self.dismissed_by_bowler = -1 if dismissal == DISMISSAL_RUN_OUT else bowler_index


class BowlerCard:
    def __init__(self, name):
        self.name = name
        self.legal_balls = 0
        self.runs_conceded = 0
        self.wickets = 0
        self.maidens = 0
        self._over_runs = 0
        self._over_legal = 0

    @property
    def overs_completed(self):
        return self.legal_balls // 6

    @property
    def overs_display(self):
        return "%d.%d" % (self.legal_balls // 6, self.legal_balls % 6)

    @property
    def economy(self):
        return 0.0 if self.legal_balls <= 0 else self.runs_conceded / (self.legal_balls / 6.0)

    @property
    def figures(self):
        return "%s-%d-%d-%d" % (self.overs_display, self.maidens, self.runs_conceded, self.wickets)

    def apply_delivery(self, outcome, creditable_wicket):
        self.runs_conceded += outcome.total_runs
        self._over_runs += outcome.total_runs
        if outcome.counts_as_legal_ball:
            self.legal_balls += 1
            self._over_legal += 1
            if creditable_wicket:
                self.wickets += 1

    def complete_over(self, balls_per_over):
        if self._over_legal >= balls_per_over and self._over_runs == 0:
            self.maidens += 1
        self._over_runs = 0
        self._over_legal = 0


# --- innings -------------------------------------------------------------------

@dataclass
class BallRecord:
    innings_index: int = 0
    delivery_number: int = 0
    outcome: object = None
    runs_after: int = 0
    wickets_after: int = 0
    legal_balls_after: int = 0
    runs_needed_after: Optional[int] = None
    over_just_completed: bool = False


@dataclass
class OverRecord:
    over_number: int = 0
    bowler_index: int = 0
    runs: int = 0
    wickets: int = 0
    marks: List[str] = field(default_factory=list)
    is_maiden: bool = False


class LimitedOversInnings:
    def __init__(self, settings, batting_side, batter_names, bowling_side, bowler_names):
        assert len(batter_names) >= settings.minimum_batters, "batting squad too small"
        assert len(bowler_names) >= settings.minimum_bowlers, "bowling squad too small"
        self.settings = settings
        self.batting_side = batting_side
        self.bowling_side = bowling_side
        self.batters = [BatterCard(n) for n in batter_names]
        self.bowlers = [BowlerCard(n) for n in bowler_names]

        self.runs = 0
        self.wickets = 0
        self.legal_balls = 0
        self.total_deliveries = 0
        self.extras_wides = 0
        self.extras_no_balls = 0
        self.striker = 0
        self.non_striker = 1
        self._next_batter = 2
        self.overs = []
        self.deliveries = []

        self._over_bowler = -1
        self._over_runs = 0
        self._over_wickets = 0
        self._over_legal = 0
        self._over_marks = []
        self.last_over_bowler = -1

    # --- counters ----------------------------------------------------------
    @property
    def extras_total(self):
        return self.extras_wides + self.extras_no_balls

    @property
    def completed_overs(self):
        return self.legal_balls // self.settings.balls_per_over

    @property
    def awaiting_bowler(self):
        return self._over_bowler < 0 and not self.is_complete

    @property
    def current_bowler(self):
        return None if self._over_bowler < 0 else self.bowlers[self._over_bowler]

    @property
    def is_complete(self):
        s = self.settings
        return self.legal_balls >= s.balls_per_innings or self.wickets >= s.wickets_per_innings

    @property
    def completion_reason(self):
        if not self.is_complete:
            return ""
        return "all out" if self.wickets >= self.settings.wickets_per_innings else "overs completed"

    @property
    def balls_remaining(self):
        return max(0, self.settings.balls_per_innings - self.legal_balls)

    @property
    def wickets_remaining(self):
        return max(0, self.settings.wickets_per_innings - self.wickets)

    @property
    def score_display(self):
        return "%d/%d" % (self.runs, self.wickets)

    @property
    def overs_display(self):
        b = self.settings.balls_per_over
        return "%d.%d" % (self.legal_balls // b, self.legal_balls % b)

    @property
    def current_run_rate(self):
        return 0.0 if self.legal_balls <= 0 else self.runs / (self.legal_balls / 6.0)

    @property
    def in_powerplay(self):
        s = self.settings
        return s.powerplay_overs > 0 and self.completed_overs < s.powerplay_overs

    # --- chase math ----------------------------------------------------------
    def runs_required(self, target):
        return max(0, target - self.runs)

    def required_run_rate(self, target):
        need = self.runs_required(target)
        if need <= 0 or self.balls_remaining <= 0:
            return 0.0
        return need / (self.balls_remaining / 6.0)

    # --- flow ---------------------------------------------------------------
    def assign_bowler(self, bowler_index):
        assert not self.is_complete
        assert 0 <= bowler_index < len(self.bowlers)
        if self._over_bowler >= 0 and self._over_legal < self.settings.balls_per_over:
            raise AssertionError("a bowler is already assigned for this over")
        if self._over_bowler >= 0:
            self._finalise_over()
        self._over_bowler = bowler_index
        self._over_runs = 0
        self._over_wickets = 0
        self._over_legal = 0
        self._over_marks = []

    def apply_outcome(self, outcome, innings_index, target=None):
        assert not self.is_complete
        assert self._over_bowler >= 0, "assign a bowler first"

        striker = self.batters[self.striker]
        bowler = self.bowlers[self._over_bowler]

        # runs & extras
        self.runs += outcome.total_runs
        self._over_runs += outcome.total_runs
        if outcome.kind == KIND_WIDE:
            self.extras_wides += outcome.extra_runs
        elif outcome.kind == KIND_NO_BALL:
            self.extras_no_balls += outcome.extra_runs

        # credits
        striker.apply_delivery(outcome)
        creditable_wicket = outcome.is_wicket and outcome.dismissal != DISMISSAL_RUN_OUT
        bowler.apply_delivery(outcome, creditable_wicket)

        # wicket / strike rotation
        if outcome.is_wicket:
            striker.record_dismissal(outcome.dismissal, self._over_bowler)
            self.wickets = min(self.settings.wickets_per_innings, self.wickets + 1)
            self._over_wickets += 1
            if outcome.bat_runs % 2 == 1:
                self.swap_strike()
            if self.wickets < self.settings.wickets_per_innings:
                self.striker = self._next_batter
                self._next_batter += 1
        elif outcome.bat_runs % 2 == 1:
            self.swap_strike()

        # ball counters
        self.total_deliveries += 1
        self._over_marks.append(str(outcome))
        over_just_completed = False
        if outcome.counts_as_legal_ball:
            self.legal_balls += 1
            self._over_legal += 1
            if self._over_legal >= self.settings.balls_per_over:
                self._finalise_over()
                over_just_completed = True
                if not self.is_complete:
                    self.swap_strike()

        record = BallRecord(
            innings_index=innings_index,
            delivery_number=self.total_deliveries,
            outcome=outcome,
            runs_after=self.runs,
            wickets_after=self.wickets,
            legal_balls_after=self.legal_balls,
            runs_needed_after=(max(0, target - self.runs) if target is not None else None),
            over_just_completed=over_just_completed,
        )
        self.deliveries.append(record)
        return record

    def _finalise_over(self):
        bowler = self.bowlers[self._over_bowler]
        maiden = self._over_legal >= self.settings.balls_per_over and self._over_runs == 0
        bowler.complete_over(self.settings.balls_per_over)
        self.overs.append(OverRecord(
            over_number=len(self.overs) + 1,
            bowler_index=self._over_bowler,
            runs=self._over_runs,
            wickets=self._over_wickets,
            marks=list(self._over_marks),
            is_maiden=maiden,
        ))
        self.last_over_bowler = self._over_bowler
        self._over_bowler = -1
        self._over_runs = 0
        self._over_wickets = 0
        self._over_legal = 0
        self._over_marks = []

    def swap_strike(self):
        self.striker, self.non_striker = self.non_striker, self.striker

    # --- presentation helpers ------------------------------------------------
    @property
    def top_scorer(self):
        best = None
        for b in self.batters:
            if best is None or b.runs > best.runs:
                best = b
        return best

    @property
    def best_bowler(self):
        best = None
        for b in self.bowlers:
            if b.legal_balls <= 0:
                continue
            if (best is None or b.wickets > best.wickets
                    or (b.wickets == best.wickets and b.runs_conceded < best.runs_conceded)):
                best = b
        return best


# --- bowler rotation -------------------------------------------------------------

def can_bowl(innings, bowler_index):
    s = innings.settings
    if bowler_index < 0 or bowler_index >= len(innings.bowlers):
        return False
    b = innings.bowlers[bowler_index]
    if b.legal_balls // s.balls_per_over >= s.max_overs_per_bowler:
        return False
    if bowler_index == innings.last_over_bowler:
        return False
    return True


def suggest_next_bowler(innings):
    s = innings.settings
    best, best_overs, best_runs = -1, 10 ** 9, 10 ** 9
    for i in range(len(innings.bowlers)):
        if not can_bowl(innings, i):
            continue
        b = innings.bowlers[i]
        overs = b.legal_balls // s.balls_per_over
        if overs < best_overs or (overs == best_overs and b.runs_conceded < best_runs):
            best, best_overs, best_runs = i, overs, b.runs_conceded
    return best


# --- match -----------------------------------------------------------------------

@dataclass
class MatchResultLite:
    outcome: str = ""
    winner_innings_index: int = -1
    target: int = 0
    margin_runs: int = 0
    margin_wickets: int = 0
    margin_balls: int = 0
    first: tuple = (0, 0, 0)    # runs, wickets, legal balls
    second: tuple = (0, 0, 0)
    player_of_match: str = ""


class LimitedOversMatch:
    def __init__(self, settings, team_a_name, team_a_batters, team_a_bowlers,
                 team_b_name, team_b_batters, team_b_bowlers):
        self.settings = settings
        self.teams = [
            (team_a_name, list(team_a_batters), list(team_a_bowlers)),
            (team_b_name, list(team_b_batters), list(team_b_bowlers)),
        ]
        self.first_batting_team = 0
        self.phase = PHASE_NOT_STARTED
        self.state = STATE_PRE_INNINGS
        self.innings = [None, None]
        self.result = None
        # observable event logs (mirror of C# events)
        self.events = []

    # --- state ------------------------------------------------------------
    @property
    def is_complete(self):
        return self.phase == PHASE_COMPLETED

    def batting_team_of(self, innings_index):
        return self.first_batting_team if innings_index == 0 else 1 - self.first_batting_team

    @property
    def current_innings(self):
        if self.phase == PHASE_FIRST_INNINGS:
            return self.innings[0]
        if self.phase == PHASE_SECOND_INNINGS:
            return self.innings[1]
        return None

    @property
    def current_innings_index(self):
        return 1 if self.phase == PHASE_SECOND_INNINGS else 0

    @property
    def target(self):
        if self.phase in (PHASE_FIRST_INNINGS, PHASE_NOT_STARTED):
            return None
        return self.innings[0].runs + 1

    @property
    def runs_required(self):
        t = self.target
        if t is None or self.innings[1] is None:
            return None
        return max(0, t - self.innings[1].runs)

    # --- flow ---------------------------------------------------------------
    def start(self, first_batting_team_index):
        assert self.phase == PHASE_NOT_STARTED
        assert first_batting_team_index in (0, 1)
        self.first_batting_team = first_batting_team_index
        self.innings[0] = self._build_innings(0)
        self.phase = PHASE_FIRST_INNINGS
        self.state = STATE_PRE_INNINGS
        self.events.append(("innings_started", 0, None))

    def assign_bowler(self, bowler_index):
        inn = self.current_innings
        assert inn is not None, "no live innings"
        assert not inn.is_complete
        assert inn.awaiting_bowler, "a bowler is already assigned"
        if not can_bowl(inn, bowler_index):
            raise AssertionError(
                "bowler %d not allowed (max %d overs, no consecutive)"
                % (bowler_index, self.settings.max_overs_per_bowler))
        inn.assign_bowler(bowler_index)
        if self.state in (STATE_PRE_INNINGS, STATE_OVER_COMPLETE, STATE_DRINKS_BREAK):
            self.state = STATE_PLAYING

    def begin_delivery(self):
        self._require_live("begin_delivery")
        assert self.current_innings._over_bowler >= 0
        self.state = STATE_BALL_IN_PROGRESS

    def record_delivery(self, outcome):
        inn = self.current_innings
        self._require_live("record_delivery")
        assert not inn.is_complete

        target = self.innings[0].runs + 1 if self.phase == PHASE_SECOND_INNINGS else None
        wicket = outcome.is_wicket
        striker_before = inn.striker
        record = inn.apply_outcome(outcome, self.current_innings_index, target)

        if wicket:
            self.events.append(("wicket", self.current_innings_index,
                                striker_before, inn.batters[striker_before].name, outcome.dismissal))

        self.state = STATE_BALL_COMPLETE
        if record.over_just_completed:
            self.state = STATE_OVER_COMPLETE
            self.events.append(("over_completed", self.current_innings_index, inn.overs[-1]))
        self.events.append(("ball_completed", record))

        # chase wins immediately
        if self.phase == PHASE_SECOND_INNINGS:
            t = self.innings[0].runs + 1
            if self.innings[1].runs >= t:
                self._complete_match(OUTCOME_SECOND_WIN)
                return record

        if inn.is_complete:
            if self.phase == PHASE_FIRST_INNINGS:
                self.phase = PHASE_BREAK
                self.state = STATE_INNINGS_BREAK
                self._raise_innings_completed(0, self.innings[0], self.innings[0].runs + 1)
            else:
                outcome_kind = OUTCOME_TIE if self.innings[1].runs == self.innings[0].runs else OUTCOME_FIRST_WIN
                self._complete_match(outcome_kind)
        return record

    def start_second_innings(self):
        assert self.phase == PHASE_BREAK, "second innings only starts at the break"
        self.innings[1] = self._build_innings(1)
        self.phase = PHASE_SECOND_INNINGS
        self.state = STATE_PRE_INNINGS
        self.events.append(("innings_started", 1, self.innings[0].runs + 1))

    def begin_drinks_break(self):
        self._require_live("begin_drinks_break")
        self.state = STATE_DRINKS_BREAK

    def end_drinks_break(self):
        self._require_live("end_drinks_break")
        assert self.state == STATE_DRINKS_BREAK
        inn = self.current_innings
        self.state = STATE_OVER_COMPLETE if inn.awaiting_bowler else STATE_PLAYING

    # --- internals ------------------------------------------------------------
    def _build_innings(self, innings_index):
        batting = self.batting_team_of(innings_index)
        bowling = 1 - batting
        bn, bb, bwl = self.teams[batting]
        _, _, owl = self.teams[bowling]
        return LimitedOversInnings(self.settings, bn, bb, self.teams[bowling][0], owl)

    def _require_live(self, action):
        if self.phase not in (PHASE_FIRST_INNINGS, PHASE_SECOND_INNINGS):
            raise AssertionError(action + ": no live innings (phase " + self.phase + ")")

    def _raise_innings_completed(self, index, inn, target_set):
        self.state = STATE_INNINGS_COMPLETE
        self.events.append(("innings_completed", index, inn.runs, inn.wickets, inn.legal_balls, target_set))

    def _complete_match(self, outcome):
        inn = self.current_innings
        self._raise_innings_completed(
            self.current_innings_index, inn,
            self.innings[0].runs + 1 if self.phase == PHASE_FIRST_INNINGS else None)

        s = self.settings
        t = self.innings[0].runs + 1
        a, b = self.innings[0], self.innings[1]
        self.result = MatchResultLite(
            outcome=outcome,
            winner_innings_index=0 if outcome == OUTCOME_FIRST_WIN else (1 if outcome == OUTCOME_SECOND_WIN else -1),
            target=t,
            margin_runs=(a.runs - b.runs) if outcome == OUTCOME_FIRST_WIN else 0,
            margin_wickets=(s.wickets_per_innings - b.wickets) if outcome == OUTCOME_SECOND_WIN else 0,
            margin_balls=(s.balls_per_innings - b.legal_balls) if outcome == OUTCOME_SECOND_WIN else 0,
            first=(a.runs, a.wickets, a.legal_balls),
            second=(b.runs, b.wickets, b.legal_balls),
            player_of_match=choose_player_of_match(a, b),
        )
        self.phase = PHASE_COMPLETED
        self.state = STATE_MATCH_COMPLETE
        self.events.append(("match_completed", self.result))


# --- player of the match ----------------------------------------------------------

def choose_player_of_match(a, b):
    """Deterministic heuristic: score = runs or 28*wickets; ties prefer the
    winning innings, then the earlier innings (mirrors the C# builder)."""
    winning_side = -1
    if b is not None:
        if b.runs > a.runs:
            winning_side = 1
        elif a.runs > b.runs:
            winning_side = 0

    candidates = []
    for side, inn in enumerate((a, b)):
        if inn is None:
            continue
        for bc in inn.batters:
            candidates.append((bc.name, bc.runs, side))
        for bw in inn.bowlers:
            candidates.append((bw.name, bw.wickets * 28, side))

    best_name, best_score, best_side = None, -1, 10 ** 9
    for name, score, side in candidates:
        better = score > best_score or (
            score == best_score and score > 0 and _better_side(side, best_side, winning_side))
        if better:
            best_name, best_score, best_side = name, score, side
    return best_name


def _better_side(candidate_side, current_side, winning_side):
    if winning_side >= 0:
        if candidate_side == winning_side and current_side != winning_side:
            return True
        if candidate_side != winning_side and current_side == winning_side:
            return False
    return candidate_side < current_side
