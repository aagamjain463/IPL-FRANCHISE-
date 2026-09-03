"""Scenario battery + randomized soak for the Super Over rules.

Mirrors the NUnit suite in Assets/_Project/Core.Tests/SuperOverRulesTests.cs.
Run with:  python3 harness/test_superover.py   (from cricket-game/)
"""

import random
import unittest

from superover_reference import (
    DeliveryOutcome, SuperOverMatch, MatchResult,
    PHASE_NOT_STARTED, PHASE_FIRST_INNINGS, PHASE_BREAK, PHASE_SECOND_INNINGS,
    PHASE_COMPLETED, OUTCOME_FIRST_WIN, OUTCOME_SECOND_WIN, OUTCOME_TIE,
)

L = DeliveryOutcome.legal
W = DeliveryOutcome.wicket
WD = DeliveryOutcome.wide
NB = DeliveryOutcome.no_ball


def start_chase_after(*first_innings):
    m = SuperOverMatch()
    m.start()
    for o in first_innings:
        m.record_delivery(o)
    assert m.phase == PHASE_BREAK
    m.start_second_innings()
    assert m.phase == PHASE_SECOND_INNINGS
    return m


class TestLifecycle(unittest.TestCase):
    def test_new_match(self):
        m = SuperOverMatch()
        self.assertEqual(m.phase, PHASE_NOT_STARTED)
        self.assertIsNone(m.target)
        self.assertIsNone(m.runs_required)

    def test_start(self):
        m = SuperOverMatch()
        m.start()
        self.assertEqual(m.phase, PHASE_FIRST_INNINGS)
        self.assertEqual(m.current_innings.balls_remaining, 6)
        self.assertEqual(m.current_innings.wickets_remaining, 2)

    def test_double_start_throws(self):
        m = SuperOverMatch()
        m.start()
        with self.assertRaises(RuntimeError):
            m.start()

    def test_record_before_start_throws(self):
        m = SuperOverMatch()
        with self.assertRaises(RuntimeError):
            m.record_delivery(L(1))

    def test_record_during_break_throws(self):
        m = SuperOverMatch()
        m.start()
        for o in (L(1),) * 6:
            m.record_delivery(o)
        with self.assertRaises(RuntimeError):
            m.record_delivery(L(1))

    def test_start_second_innings_early_throws(self):
        m = SuperOverMatch()
        with self.assertRaises(RuntimeError):
            m.start_second_innings()
        m.start()
        with self.assertRaises(RuntimeError):
            m.start_second_innings()

    def test_record_after_complete_throws(self):
        m = start_chase_after(L(1), L(1), L(1), L(1), L(1), L(1))  # target 7
        m.record_delivery(L(6))
        m.record_delivery(L(1))
        self.assertEqual(m.phase, PHASE_COMPLETED)
        with self.assertRaises(RuntimeError):
            m.record_delivery(L(1))


class TestFirstInnings(unittest.TestCase):
    def test_six_singles_end_innings_and_set_target(self):
        m = SuperOverMatch()
        m.start()
        for _ in range(5):
            m.record_delivery(L(1))
        self.assertEqual(m.phase, PHASE_FIRST_INNINGS)
        m.record_delivery(L(1))
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.runs, 6)
        self.assertEqual(m.target, 7)
        self.assertEqual(m.runs_required, 7)

    def test_two_wickets_end_innings_early(self):
        m = SuperOverMatch()
        m.start()
        m.record_delivery(L(4))
        m.record_delivery(W("caught"))
        self.assertEqual(m.phase, PHASE_FIRST_INNINGS)
        m.record_delivery(W("bowled"))
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.runs, 4)
        self.assertEqual(m.first.wickets, 2)
        self.assertEqual(m.first.legal_balls, 3)
        self.assertEqual(m.target, 5)

    def test_cannot_lose_more_than_two_wickets(self):
        m = SuperOverMatch()
        m.start()
        m.record_delivery(W("bowled"))
        m.record_delivery(W("lbw"))
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.wickets, 2)
        with self.assertRaises(RuntimeError):
            m.record_delivery(W("run_out"))

    def test_wide_does_not_consume_legal_ball(self):
        m = SuperOverMatch()
        m.start()
        for _ in range(5):
            m.record_delivery(L(0))
        m.record_delivery(WD())
        self.assertEqual(m.phase, PHASE_FIRST_INNINGS, "wide must not end the innings")
        self.assertEqual(m.first.runs, 1)
        self.assertEqual(m.first.legal_balls, 5)
        m.record_delivery(L(2))
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.runs, 3)
        self.assertEqual(m.first.legal_balls, 6)
        self.assertEqual(m.target, 4)

    def test_no_ball_runs_count_ball_does_not(self):
        m = SuperOverMatch()
        m.start()
        m.record_delivery(NB(4))
        self.assertEqual(m.first.runs, 5)
        self.assertEqual(m.first.legal_balls, 0)
        for _ in range(6):
            m.record_delivery(L(0))
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.runs, 5)
        self.assertEqual(m.first.legal_balls, 6)
        self.assertEqual(m.first.total_deliveries, 7)


class TestChaseWins(unittest.TestCase):
    def test_wins_immediately_mid_over(self):
        m = start_chase_after(L(2), L(2), L(2), L(1), L(1), L(1))  # 9 -> target 10
        self.assertEqual(m.target, 10)
        self.assertEqual(m.runs_required, 10)
        m.record_delivery(L(6))
        self.assertEqual(m.phase, PHASE_SECOND_INNINGS)
        self.assertEqual(m.runs_required, 4)
        m.record_delivery(L(4))  # reaches 10 after only 2 balls
        self.assertEqual(m.phase, PHASE_COMPLETED)
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.second.legal_balls, 2, "chase must stop immediately")
        self.assertEqual(m.result.margin_wickets, 2)

    def test_overshoot_wins_on_that_delivery(self):
        m = start_chase_after(L(3), L(3), L(3), L(0), L(0), L(0))  # target 10
        m.record_delivery(L(4))
        m.record_delivery(L(4))
        m.record_delivery(L(1))  # 9 after 3
        self.assertEqual(m.runs_required, 1)
        m.record_delivery(L(6))  # 15
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.second.runs, 15)
        self.assertEqual(m.second.legal_balls, 4)

    def test_win_on_final_ball(self):
        m = start_chase_after(L(3), L(3), L(3), L(0), L(0), L(0))  # target 10
        for r in (2, 2, 2, 2, 1):
            m.record_delivery(L(r))  # 9 after 5
        self.assertEqual(m.runs_required, 1)
        self.assertEqual(m.current_innings.balls_remaining, 1)
        m.record_delivery(L(1))  # exactly 10 on ball 6
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.result.margin_wickets, 2)  # won with both wickets in hand

    def test_win_with_one_wicket_down(self):
        m = start_chase_after(*(L(1),) * 6)  # target 7
        m.record_delivery(L(4))
        m.record_delivery(W("caught"))
        m.record_delivery(L(3))  # 7 reached
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.result.margin_wickets, 1)


class TestChaseLosses(unittest.TestCase):
    def test_balls_run_out_below_target(self):
        m = start_chase_after(L(3), L(3), L(3), L(0), L(0), L(0))  # 9 -> target 10
        for r in (2, 2, 2, 1, 1, 0):
            m.record_delivery(L(r))  # ends on 8
        self.assertEqual(m.result.outcome, OUTCOME_FIRST_WIN)
        self.assertEqual(m.second.runs, 8)
        self.assertEqual(m.result.margin_runs, 1)

    def test_two_wickets_before_target(self):
        m = start_chase_after(L(3), L(3), L(3), L(0), L(0), L(0))  # target 10
        m.record_delivery(L(4))
        m.record_delivery(W("bowled"))
        self.assertEqual(m.phase, PHASE_SECOND_INNINGS)
        m.record_delivery(W("caught"))
        self.assertEqual(m.result.outcome, OUTCOME_FIRST_WIN)
        self.assertEqual(m.second.runs, 4)
        self.assertEqual(m.result.margin_runs, 5)

    def test_pair_of_ducks(self):
        m = start_chase_after(*(L(1),) * 6)  # target 7
        m.record_delivery(W("bowled"))
        m.record_delivery(W("lbw"))
        self.assertEqual(m.result.outcome, OUTCOME_FIRST_WIN)
        self.assertEqual(m.second.runs, 0)
        self.assertEqual(m.result.margin_runs, 6)


class TestTies(unittest.TestCase):
    def test_finishing_level_is_a_tie(self):
        m = start_chase_after(L(4), L(4), L(2), L(0), L(0), L(0))  # 10 -> target 11
        for r in (2, 2, 2, 2, 1, 1):
            m.record_delivery(L(r))  # ends on exactly 10
        self.assertEqual(m.result.outcome, OUTCOME_TIE)
        self.assertEqual(m.result.winner_innings_index, -1)

    def test_wicket_on_final_ball_leaving_scores_level(self):
        m = start_chase_after(L(2), L(2), L(1), L(0), L(0), L(0))  # 5 -> target 6
        for _ in range(5):
            m.record_delivery(L(1))  # 5 after 5 balls
        m.record_delivery(W("run_out"))
        self.assertEqual(m.result.outcome, OUTCOME_TIE)


class TestDisplayState(unittest.TestCase):
    def test_target_required_balls_wickets(self):
        m = start_chase_after(L(4), L(4), L(4), L(1), L(0), L(0))  # 13 -> target 14
        self.assertEqual(m.target, 14)
        self.assertEqual(m.runs_required, 14)
        self.assertEqual(m.current_innings.balls_remaining, 6)
        self.assertEqual(m.current_innings.wickets_remaining, 2)
        m.record_delivery(L(4))
        self.assertEqual(m.runs_required, 10)
        self.assertEqual(m.current_innings.balls_remaining, 5)
        m.record_delivery(WD())
        self.assertEqual(m.runs_required, 9)
        self.assertEqual(m.current_innings.balls_remaining, 5, "wide consumes no ball")
        m.record_delivery(W("caught"))
        self.assertEqual(m.current_innings.wickets_remaining, 1)

    def test_ball_log_carries_chase_context(self):
        m = start_chase_after(*(L(1),) * 6)  # target 7
        m.record_delivery(WD())
        m.record_delivery(L(6))
        self.assertEqual(len(m.second.deliveries), 2)
        wide_rec = m.second.deliveries[0]
        self.assertEqual(wide_rec.legal_balls_after, 0)
        self.assertEqual(wide_rec.target_at_delivery, 7)
        self.assertEqual(wide_rec.runs_needed_after, 6)
        six_rec = m.second.deliveries[1]
        self.assertEqual(six_rec.runs_after, 7)
        self.assertEqual(six_rec.runs_needed_after, 0)


def random_outcome(rng: random.Random) -> DeliveryOutcome:
    roll = rng.random()
    if roll < 0.07:
        return WD()
    if roll < 0.09:
        return NB(rng.randrange(2))
    if roll < 0.17:
        return W(rng.choice(["bowled", "caught", "lbw"]))
    weights = [32, 30, 12, 2, 16, 2, 6]
    return L(rng.choices(range(7), weights=weights)[0])


class TestSoak(unittest.TestCase):
    def test_random_matches_never_violate_invariants(self):
        rng = random.Random(20260902)
        for _ in range(20000):
            m = SuperOverMatch()
            m.start()
            guard = 0
            while m.phase != PHASE_COMPLETED:
                guard += 1
                self.assertLess(guard, 500, "match must terminate")
                if m.phase == PHASE_BREAK:
                    m.start_second_innings()
                    continue
                m.record_delivery(random_outcome(rng))

            r = m.result
            self.assertIsNotNone(r)
            self.assertLessEqual(m.first.legal_balls, 6)
            self.assertLessEqual(m.second.legal_balls, 6)
            self.assertLessEqual(m.first.wickets, 2)
            self.assertLessEqual(m.second.wickets, 2)
            self.assertEqual(r.target, m.first.runs + 1)

            if r.outcome == OUTCOME_SECOND_WIN:
                # Chase win: reached the target, stopped immediately, sensible margin.
                self.assertGreaterEqual(m.second.runs, m.first.runs + 1)
                self.assertLessEqual(m.second.runs, m.first.runs + 1 + 6)
                self.assertEqual(r.margin_wickets, 2 - m.second.wickets)
                last = m.second.deliveries[-1]
                self.assertGreaterEqual(last.runs_after, m.first.runs + 1)
                # Immediate stop: no recorded delivery exists after the winning one.
                self.assertEqual(len(m.second.deliveries),
                                 m.second.total_deliveries)
            elif r.outcome == OUTCOME_FIRST_WIN:
                self.assertLess(m.second.runs, m.first.runs)
                self.assertEqual(r.margin_runs, m.first.runs - m.second.runs)
                self.assertTrue(m.second.is_complete)
            elif r.outcome == OUTCOME_TIE:
                self.assertEqual(m.second.runs, m.first.runs)
                self.assertTrue(m.second.is_complete)
            else:
                self.fail("unknown outcome " + r.outcome)


if __name__ == "__main__":
    unittest.main(verbosity=2)
