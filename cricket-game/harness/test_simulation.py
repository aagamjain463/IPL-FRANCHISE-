"""Verification for the simulation layer (mirror of Core.Tests/SimulationTests.cs).

Run:  python3 harness/test_simulation.py   (from cricket-game/)
"""

import unittest

from superover_reference import (
    DeliveryOutcome, SuperOverMatch, KIND_LEGAL,
    OUTCOME_FIRST_WIN, OUTCOME_SECOND_WIN, OUTCOME_TIE, PHASE_COMPLETED,
)
from simulation_reference import (
    SeededRng, ShotIntent, BowlingPlan, BallContext,
    resolve, AiBattingPolicy, AiBowlingPolicy, simulate,
)


def sample(trials, shot, bowl, seed):
    rng = SeededRng(seed)
    wickets, runs = 0, 0
    for _ in range(trials):
        o = resolve(rng, shot, bowl)
        if o.is_wicket:
            wickets += 1
        runs += o.total_runs
    return wickets, runs / trials


class TestDeterminism(unittest.TestCase):
    def test_same_seed_same_match(self):
        def run(seed):
            return simulate(seed, AiBattingPolicy(0.6), AiBowlingPolicy(0.5),
                            AiBattingPolicy(0.6), AiBowlingPolicy(0.5))

        m1, log1 = run(42)
        m2, log2 = run(42)
        self.assertEqual(log1[0], log2[0])
        self.assertEqual(log1[1], log2[1])
        self.assertEqual(m1.result.outcome, m2.result.outcome)


class TestReplayConsistency(unittest.TestCase):
    def test_log_replayed_into_fresh_engine_reproduces_result(self):
        for seed in range(1, 60):
            m, log = simulate(seed, AiBattingPolicy(0.55), AiBowlingPolicy(0.45),
                              AiBattingPolicy(0.65), AiBowlingPolicy(0.55))
            replay = SuperOverMatch()
            replay.start()
            for o in log[0]:
                replay.record_delivery(o)
            replay.start_second_innings()
            for o in log[1]:
                replay.record_delivery(o)
            self.assertEqual(replay.phase, PHASE_COMPLETED, seed)
            self.assertEqual(replay.result.outcome, m.result.outcome, seed)
            self.assertEqual(replay.first.runs, m.first.runs, seed)
            self.assertEqual(replay.second.runs, m.second.runs, seed)


class TestChaseImmediacy(unittest.TestCase):
    def test_chase_wins_stop_on_the_winning_delivery(self):
        chase_wins = 0
        for seed in range(1, 500):
            m, log = simulate(seed, AiBattingPolicy(0.5), AiBowlingPolicy(0.5),
                              AiBattingPolicy(0.55), AiBowlingPolicy(0.5))
            second = log[1]
            runs = 0
            crossed_at = None
            for i, o in enumerate(second):
                runs += o.total_runs
                if runs >= m.result.target and crossed_at is None:
                    crossed_at = i
            if m.result.outcome == OUTCOME_SECOND_WIN:
                chase_wins += 1
                self.assertEqual(crossed_at, len(second) - 1,
                                 "chase must end on the exact delivery the target is reached")
            elif m.result.outcome == OUTCOME_FIRST_WIN:
                self.assertIsNone(crossed_at)
            else:
                self.assertEqual(m.result.outcome, OUTCOME_TIE)
        self.assertGreater(chase_wins, 0)


class TestOutcomeModel(unittest.TestCase):
    def test_no_extras_mode(self):
        rng = SeededRng(7)
        shot, bowl = ShotIntent(0.8, 0.5), BowlingPlan(0.5)
        wickets = boundaries = 0
        for _ in range(20000):
            o = resolve(rng, shot, bowl, allow_extras=False)
            self.assertEqual(o.kind, KIND_LEGAL)
            if o.is_wicket:
                wickets += 1
                self.assertEqual(o.bat_runs, 0)
            elif o.bat_runs >= 4:
                boundaries += 1
        self.assertGreater(wickets, 0)
        self.assertGreater(boundaries, 0)

    def test_higher_threat_more_wickets_fewer_runs(self):
        shot = ShotIntent(0.5, 0.5)
        weak_w, weak_r = sample(30000, shot, BowlingPlan(0.1), 11)
        strong_w, strong_r = sample(30000, shot, BowlingPlan(0.9), 22)
        self.assertGreater(strong_w, weak_w)
        self.assertLess(strong_r, weak_r)

    def test_aggressive_good_timing_faster_but_riskier(self):
        bowl = BowlingPlan(0.5)
        safe_w, safe_r = sample(30000, ShotIntent.from_human_input("defensive", 1.0), bowl, 31)
        atk_w, atk_r = sample(30000, ShotIntent.from_human_input("aggressive", 1.0), bowl, 32)
        self.assertGreater(atk_r, safe_r)
        self.assertGreater(atk_w, safe_w)

    def test_score_rates_are_cricket_sane(self):
        # Balanced intent vs mid bowling should be in a T20-ish range.
        _, r = sample(50000, ShotIntent.from_human_input("balanced", 0.7), BowlingPlan(0.5), 5)
        self.assertGreater(r, 1.0)
        self.assertLess(r, 2.4)


class TestPolicies(unittest.TestCase):
    def test_chases_harder_when_rate_high(self):
        pol = AiBattingPolicy(0.6)
        rng = SeededRng(3)
        easy = sum(pol.decide(rng, BallContext(1, True, 9, 2, 7, 6, 2)).aggression for _ in range(200))
        rng = SeededRng(3)
        hard = sum(pol.decide(rng, BallContext(1, True, 15, 14, 1, 6, 2)).aggression for _ in range(200))
        self.assertGreater(hard, easy)

    def test_steady_when_tiny_target_in_reach(self):
        pol = AiBattingPolicy(0.9)
        rng = SeededRng(4)
        for _ in range(50):
            ctx = BallContext(1, True, 8, 1, 7, 3, 2)
            self.assertLessEqual(pol.decide(rng, ctx).aggression, 0.35)

    def test_human_mappings_monotonic(self):
        self.assertGreater(ShotIntent.from_human_input("balanced", 1.0).execution,
                           ShotIntent.from_human_input("balanced", 0.1).execution)
        self.assertGreater(BowlingPlan.from_human_input(0.9).threat,
                           BowlingPlan.from_human_input(0.1).threat)


class TestSoak(unittest.TestCase):
    def test_full_matches_always_complete(self):
        first_wins = second_wins = ties = 0
        for seed in range(1000, 1800):
            skill = 0.3 + (seed % 5) * 0.1
            m, _ = simulate(seed, AiBattingPolicy(skill), AiBowlingPolicy(0.5),
                            AiBattingPolicy(min(1.0, skill + 0.05)), AiBowlingPolicy(0.5))
            self.assertEqual(m.result.target, m.first.runs + 1)
            if m.result.outcome == OUTCOME_FIRST_WIN:
                first_wins += 1
            elif m.result.outcome == OUTCOME_SECOND_WIN:
                second_wins += 1
            else:
                ties += 1
        self.assertGreater(first_wins, 0)
        self.assertGreater(second_wins, 0)
        print("\nsoak outcomes: first=%d second=%d ties=%d" % (first_wins, second_wins, ties))


if __name__ == "__main__":
    unittest.main(verbosity=2)
