"""Python reference of CricketGame.Core.Simulation (outcome model + policies).

Formulas must match OutcomeResolver.cs / Policies.cs exactly. Used to verify
simulation behavior without a .NET toolchain.
"""

import math
import random

from superover_reference import DeliveryOutcome, SuperOverMatch, PHASE_COMPLETED, PHASE_BREAK


# --- RNG ---------------------------------------------------------------------

class SeededRng:
    """Deterministic stand-in; Python's random.Random is stable per seed."""

    def __init__(self, seed):
        self.r = random.Random(seed)

    def next_float(self):
        return self.r.random()

    def next(self, max_exclusive):
        return self.r.randrange(max_exclusive)


# --- intents -----------------------------------------------------------------

def clamp01(v):
    return max(0.0, min(1.0, v))


class ShotIntent:
    def __init__(self, aggression, execution):
        self.aggression = clamp01(aggression)
        self.execution = clamp01(execution)

    @staticmethod
    def from_human_input(style, timing_quality):
        q = clamp01(timing_quality)
        if style == "defensive":
            return ShotIntent(0.12 + 0.10 * q, 0.35 + 0.65 * q)
        if style == "aggressive":
            return ShotIntent(0.60 + 0.38 * q, 0.15 + 0.85 * q)
        return ShotIntent(0.32 + 0.25 * q, 0.25 + 0.75 * q)


class BowlingPlan:
    def __init__(self, threat):
        self.threat = clamp01(threat)

    @staticmethod
    def from_human_input(timing_quality):
        q = clamp01(timing_quality)
        return BowlingPlan(0.25 + 0.60 * q)


class BallContext:
    def __init__(self, innings_index, is_chasing, target, runs_required,
                 score, balls_remaining, wickets_remaining):
        self.innings_index = innings_index
        self.is_chasing = is_chasing
        self.target = target
        self.runs_required = runs_required
        self.score = score
        self.balls_remaining = balls_remaining
        self.wickets_remaining = wickets_remaining

    @staticmethod
    def from_match(m: SuperOverMatch):
        cur = m.current_innings
        chasing = m.phase == "second_innings"
        return BallContext(
            m.current_innings_index, chasing,
            m.target if chasing else None,
            m.runs_required if chasing else None,
            cur.runs, cur.balls_remaining, cur.wickets_remaining)

    @property
    def required_rate_per_ball(self):
        if not self.is_chasing or self.runs_required is None or self.balls_remaining <= 0:
            return 0.0
        return self.runs_required / float(self.balls_remaining)


# --- resolver ----------------------------------------------------------------

def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def resolve(rng, shot: ShotIntent, bowl: BowlingPlan, allow_extras=True) -> DeliveryOutcome:
    a, e, t = shot.aggression, shot.execution, bowl.threat

    if allow_extras:
        wide_chance = clamp(0.030 + 0.040 * a + 0.020 * (1 - t), 0.01, 0.12)
        if rng.next_float() < wide_chance:
            return DeliveryOutcome.wide()

    wicket_chance = clamp(0.025 + 0.160 * (a ** 1.4) + 0.140 * (1 - e)
                          + 0.080 * t - 0.060 * e * t, 0.02, 0.45)
    if rng.next_float() < wicket_chance:
        pick = rng.next_float()
        if pick < 0.40:
            kind = "bowled"
        elif pick < 0.75:
            kind = "caught"
        elif pick < 0.90:
            kind = "lbw"
        else:
            kind = "stumped"
        return DeliveryOutcome.wicket(kind)

    weights = [
        0.55 - 0.30 * a + 0.25 * (1 - e),
        0.34 - 0.06 * a,
        0.08 + 0.06 * e,
        0.012,
        0.035 + 0.30 * a * e,
        0.004 + 0.020 * a * e,
        0.008 + 0.24 * a * a * e,
    ]
    weights = [max(0.0, w) for w in weights]
    return DeliveryOutcome.legal(rng.r.choices(range(7), weights=weights)[0])


# --- policies ----------------------------------------------------------------

class AiBattingPolicy:
    def __init__(self, skill, base_aggression=0.42):
        self.skill = clamp01(skill)
        self.base_aggression = clamp01(base_aggression)

    def decide(self, rng, ctx: BallContext) -> ShotIntent:
        aggr = self.base_aggression
        if ctx.is_chasing:
            rate = ctx.required_rate_per_ball
            aggr = 0.25 + 0.55 * (rate - 0.9)
            if ctx.balls_remaining <= 2 and ctx.wickets_remaining > 0 and rate >= 2:
                aggr = max(aggr, 0.95)
            elif ctx.balls_remaining <= 2 and ctx.wickets_remaining > 0:
                aggr = max(aggr, 0.65)
            if ctx.runs_required is not None and ctx.runs_required <= 2:
                aggr = min(aggr, 0.30)
        else:
            if ctx.balls_remaining <= 2 and ctx.wickets_remaining >= 2:
                aggr += 0.25
        execution = 0.30 + 0.60 * self.skill + (rng.next_float() - 0.5) * 0.16
        return ShotIntent(aggr, execution)


class AiBowlingPolicy:
    def __init__(self, difficulty):
        self.difficulty = clamp01(difficulty)

    def decide(self, rng, ctx: BallContext) -> BowlingPlan:
        threat = 0.30 + 0.45 * self.difficulty
        if ctx.is_chasing and ctx.required_rate_per_ball >= 2:
            threat += 0.08
        threat += (rng.next_float() - 0.5) * 0.20
        return BowlingPlan(threat)


# --- simulator ---------------------------------------------------------------

def simulate(seed, first_bat, first_bowl, second_bat, second_bowl, allow_extras=True):
    rng = SeededRng(seed)
    m = SuperOverMatch()
    log = {0: [], 1: []}
    m.start()

    def play_innings(bat, bowl):
        guard = 0
        while m.phase != PHASE_COMPLETED and m.current_innings is not None \
                and not m.current_innings.is_complete:
            guard += 1
            assert guard < 500, "innings did not terminate"
            ctx = BallContext.from_match(m)
            outcome = resolve(rng, bat.decide(rng, ctx), bowl.decide(rng, ctx), allow_extras)
            log[m.current_innings_index].append(outcome)
            m.record_delivery(outcome)

    play_innings(first_bat, first_bowl)
    if m.phase == PHASE_BREAK:
        m.start_second_innings()
        play_innings(second_bat, second_bowl)
    assert m.phase == PHASE_COMPLETED
    return m, log
