"""Scenario battery + randomized soak for the Phase 6 limited-overs engine.

Covers the spec section 31 scenarios that are verifiable headlessly:
  TEST 1  0/10 after exactly 20 overs
  TEST 2  all out before 20 overs
  TEST 4  chase won with overs to spare
  TEST 5  chase failed after 20 overs
  TEST 6  multiple wides in one over
  TEST 7  multiple no-balls in one over
  TEST 8  bowler cap (4 overs) + consecutive-over rule
  TEST 9  strike rotation after every run type
  TEST 10 over transition swaps ends
  TEST 11 required run rate updates
  TEST 12 powerplay window flag
  TEST 13 Super Over parity with the original engine
  TEST 14 result margins
  TEST 15 result contains complete player statistics

Mirrors Assets/_Project/Core.Tests/Phase6Tests.cs (NUnit).
Run with:  python3 harness/test_limitedovers.py   (from cricket-game/)
"""

import random
import unittest

from superover_reference import SuperOverMatch as SuperOverEngine
from superover_reference import (
    DeliveryOutcome, PHASE_FIRST_INNINGS, PHASE_SECOND_INNINGS, PHASE_BREAK,
    PHASE_COMPLETED, OUTCOME_FIRST_WIN, OUTCOME_SECOND_WIN, OUTCOME_TIE,
)
from limitedovers_reference import (
    MatchSettings, LimitedOversMatch, can_bowl, suggest_next_bowler,
    choose_player_of_match, STATE_OVER_COMPLETE, STATE_MATCH_COMPLETE,
)

L = DeliveryOutcome.legal
W = DeliveryOutcome.wicket
WD = DeliveryOutcome.wide
NB = DeliveryOutcome.no_ball


def names(n, prefix):
    return ["%s%d" % (prefix, i) for i in range(n)]


def make_match(settings=None, batters=11, bowlers=5):
    s = settings or MatchSettings.twenty_over()
    return LimitedOversMatch(
        s,
        "YOU", names(batters, "Y"), names(bowlers, "YB"),
        "AI", names(batters, "A"), names(bowlers, "AB"),
    )


def over_of(match, bowler, outcomes):
    """Assigns `bowler` and plays the given deliveries, stopping if the match ends."""
    match.assign_bowler(bowler)
    for o in outcomes:
        if match.phase not in (PHASE_FIRST_INNINGS, PHASE_SECOND_INNINGS):
            break
        match.record_delivery(o)


def auto_over(match, over_index, outcomes):
    """Plays an over with the canonical 5-bowler rotation (0,1,2,3,4,...)."""
    over_of(match, over_index % 5, outcomes)


class LimitedOversTests(unittest.TestCase):

    # TEST 1 ------------------------------------------------------------------
    def test_0_10_after_exactly_20_overs(self):
        m = make_match()
        m.start(0)
        seq = [L(0)] * 110 + [W("bowled")] * 10
        i = 0
        for over in range(20):
            chunk = seq[i:i + 6]
            i += 6
            over_of(m, over % 5, chunk)
            if m.phase == PHASE_BREAK:
                break
        inn = m.innings[0]
        self.assertEqual((inn.runs, inn.wickets, inn.legal_balls), (0, 10, 120))
        self.assertEqual(inn.score_display, "0/10")
        self.assertEqual(inn.overs_display, "20.0")
        self.assertEqual(m.phase, PHASE_BREAK)

    # TEST 2 ------------------------------------------------------------------
    def test_all_out_before_20_overs(self):
        m = make_match()
        m.start(0)
        # a wicket on the last ball of each of the first 10 overs -> all out at 60 balls
        for over in range(10):
            over_of(m, over % 5, [L(0)] * 5 + [W("caught")])
            if m.phase == PHASE_BREAK:
                break
        inn = m.innings[0]
        self.assertEqual((inn.runs, inn.wickets, inn.legal_balls), (0, 10, 60))
        self.assertEqual(inn.completion_reason, "all out")
        self.assertTrue(inn.balls_remaining > 0)
        self.assertEqual(m.phase, PHASE_BREAK)

    # TEST 4 ------------------------------------------------------------------
    def test_chase_won_with_overs_to_spare(self):
        # 5-over quick match: 108 set (3 overs of sixes + 2 maidens), chased in 4 overs
        m = make_match(settings=MatchSettings(5, 10))
        m.start(0)
        for over in range(3):
            over_of(m, over, [L(6)] * 6)           # 108
        for over in range(3, 5):
            over_of(m, over, [L(0)] * 6)
        self.assertEqual(m.phase, PHASE_BREAK)
        target = m.innings[0].runs + 1
        self.assertEqual(target, 109)

        m.start_second_innings()
        for over in range(3):
            over_of(m, over, [L(6)] * 6)           # 108 after 18 balls
        m.assign_bowler(3)
        m.record_delivery(L(1))                    # 109 reached on ball 19 of 30
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.innings[1].runs, target)
        self.assertEqual(m.result.margin_wickets, 10)
        self.assertEqual(m.result.margin_balls, 30 - 19)  # almost 2 overs to spare

    # TEST 5 ------------------------------------------------------------------
    def test_chase_failed_after_20_overs(self):
        m = make_match()
        m.start(0)
        for over in range(20):                     # 20 x 6 twos = 240
            over_of(m, over % 5, [L(2)] * 6)
        self.assertEqual(m.innings[0].runs, 240)

        m.start_second_innings()
        for over in range(20):                     # 20 x 6 singles = 120
            over_of(m, over % 5, [L(1)] * 6)
            if m.phase == PHASE_COMPLETED:
                break
        self.assertEqual(m.result.outcome, OUTCOME_FIRST_WIN)
        self.assertEqual(m.result.margin_runs, 120)
        self.assertEqual(m.innings[1].legal_balls, 120)

    # TEST 6 ------------------------------------------------------------------
    def test_wides_do_not_consume_legal_balls(self):
        m = make_match()
        m.start(0)
        over_of(m, 0, [L(0), WD(), WD(), L(1), WD(), L(0), L(4), L(6), L(2)])
        inn = m.innings[0]
        self.assertEqual(inn.legal_balls, 6)          # 9 deliveries, only 6 legal
        self.assertEqual(inn.total_deliveries, 9)
        self.assertEqual(inn.extras_wides, 3)
        self.assertEqual(inn.runs, 0 + 3 + 1 + 4 + 6 + 2)
        self.assertEqual(len(inn.overs), 1)
        self.assertEqual(inn.overs[0].runs, 16)
        # wides count against the bowler's economy
        self.assertEqual(inn.bowlers[0].runs_conceded, 16)

    # TEST 7 ------------------------------------------------------------------
    def test_no_balls_do_not_consume_legal_balls(self):
        m = make_match()
        m.start(0)
        over_of(m, 0, [NB(2), NB(0), NB(4), L(0), L(0), L(0), L(0), L(0), L(0)])
        inn = m.innings[0]
        self.assertEqual(inn.legal_balls, 6)
        self.assertEqual(inn.extras_no_balls, 3)
        # no-ball bat runs credit the batter but consume no ball
        self.assertEqual(inn.batters[0].runs, 6)
        self.assertEqual(inn.batters[0].balls_faced, 6)
        # a six hit on a no-ball is not a boundary for the scorecard
        self.assertEqual(inn.batters[0].fours, 0)
        self.assertEqual(inn.batters[0].sixes, 0)
        self.assertEqual(inn.runs, 6 + 3)

    # TEST 8 ------------------------------------------------------------------
    def test_bowler_cannot_exceed_max_overs_or_bowl_consecutively(self):
        m = make_match()
        m.start(0)
        # bowler 0 bowls overs 1, 3, 5, 7 (the 4-over cap)
        rotation = [0, 1, 0, 2, 0, 3, 0]
        for over, b in enumerate(rotation):
            over_of(m, b, [L(0)] * 6)
        inn = m.innings[0]
        self.assertEqual(inn.bowlers[0].overs_completed, 4)
        self.assertFalse(can_bowl(inn, 0), "bowler 0 has reached the 4-over cap")
        with self.assertRaises(AssertionError):
            m.assign_bowler(0)
        # consecutive overs also forbidden (last over was bowled by bowler 3? no: by 0)
        over_of(m, 4, [L(0)] * 6)
        with self.assertRaises(AssertionError):
            m.assign_bowler(4)   # bowler 4 bowled the last over
        # rotation suggestion always returns an eligible bowler
        s = suggest_next_bowler(inn)
        self.assertTrue(can_bowl(inn, s))

    # TEST 9 ------------------------------------------------------------------
    def test_strike_rotation_per_run_type(self):
        m = make_match()
        m.start(0)
        inn = m.innings[0]
        m.assign_bowler(0)

        start = inn.striker
        m.record_delivery(L(1))
        self.assertNotEqual(inn.striker, start, "1 run must swap strike")

        start = inn.striker
        m.record_delivery(L(2))
        self.assertEqual(inn.striker, start, "2 runs keep strike")

        start = inn.striker
        m.record_delivery(L(3))
        self.assertNotEqual(inn.striker, start, "3 runs must swap strike")

        start = inn.striker
        m.record_delivery(L(4))
        self.assertEqual(inn.striker, start, "boundary keeps strike")
        m.record_delivery(L(6))
        self.assertEqual(inn.striker, start, "six keeps strike")

        # wicket: incoming batter takes guard at the striker's end
        m.record_delivery(W("bowled"))
        self.assertEqual(inn.wickets, 1)
        # that was the 6th legal ball: new batter came in, THEN ends swapped
        self.assertEqual(inn.non_striker, 2, "incoming batter #2 is at the new striker's end")
        self.assertEqual(inn.striker, 1, "ends swap at the end of the over")

    # TEST 10 -----------------------------------------------------------------
    def test_over_transition_swaps_ends(self):
        m = make_match()
        m.start(0)
        inn = m.innings[0]
        m.assign_bowler(0)
        striker_before = inn.striker
        for _ in range(6):
            m.record_delivery(L(0))
        self.assertEqual(len(inn.overs), 1)
        self.assertNotEqual(inn.striker, striker_before, "ends must swap at over end")
        self.assertTrue(inn.awaiting_bowler)
        # odd-run final ball + over-end swap combine correctly
        m.assign_bowler(1)
        s = inn.striker
        for _ in range(5):
            m.record_delivery(L(0))
        m.record_delivery(L(1))          # single swaps...
        self.assertEqual(len(inn.overs), 2)
        self.assertEqual(inn.striker, s, "...then over-end swap restores the original striker")

    # TEST 11 -----------------------------------------------------------------
    def test_required_run_rate_updates_each_ball(self):
        m = make_match(settings=MatchSettings(10, 10))   # 60-ball innings
        m.start(0)
        for over in range(10):                     # 60 off 60 balls
            over_of(m, over % 5, [L(1)] * 6)
        self.assertEqual(m.phase, PHASE_BREAK)
        m.start_second_innings()
        inn = m.innings[1]
        target = 61
        m.assign_bowler(0)
        for i in range(1, 13):                     # 12 singles across two overs
            if inn.awaiting_bowler:
                m.assign_bowler(1)
            m.record_delivery(L(1))
            need = target - inn.runs
            balls_left = 60 - inn.legal_balls
            expected = need / (balls_left / 6.0)
            self.assertAlmostEqual(inn.required_run_rate(target), expected, places=6)
            self.assertEqual(inn.runs_required(target), need)
        self.assertEqual(inn.overs_display, "2.0")
        self.assertAlmostEqual(inn.current_run_rate, 12 / 2.0, places=6)

    # TEST 12 -----------------------------------------------------------------
    def test_powerplay_window(self):
        m = make_match()
        m.start(0)
        inn = m.innings[0]
        for over in range(7):
            self.assertEqual(inn.in_powerplay, over < 6,
                             "powerplay covers exactly overs 1-6")
            over_of(m, over % 5, [L(0)] * 6)

    # TEST 13 -----------------------------------------------------------------
    def test_super_over_parity_with_original_engine(self):
        seq_first = [L(2), L(0), WD(), L(6), W("caught"), L(1), L(0)]
        seq_second = [L(1), L(4), NB(1), L(2), W("bowled"), L(4)]

        # original engine
        old = SuperOverEngine()
        old.start()
        for o in seq_first:
            if old.phase == PHASE_FIRST_INNINGS:
                old.record_delivery(o)
        old.start_second_innings()
        for o in seq_second:
            if old.phase == PHASE_SECOND_INNINGS:
                old.record_delivery(o)

        # new engine in Super Over configuration (3 batters, 1 bowler)
        settings = MatchSettings.super_over()
        m = LimitedOversMatch(settings, "YOU", names(3, "Y"), names(1, "YB"),
                              "AI", names(3, "A"), names(1, "AB"))
        m.start(0)
        m.assign_bowler(0)
        for o in seq_first:
            if m.phase == PHASE_FIRST_INNINGS:
                m.record_delivery(o)
        self.assertEqual(m.phase, PHASE_BREAK)
        m.start_second_innings()
        m.assign_bowler(0)
        for o in seq_second:
            if m.phase == PHASE_SECOND_INNINGS:
                m.record_delivery(o)

        self.assertEqual(m.phase, PHASE_COMPLETED)
        self.assertEqual(old.phase, PHASE_COMPLETED)
        self.assertEqual(m.result.outcome, old.result.outcome)
        self.assertEqual(m.innings[0].runs, old.first.runs)
        self.assertEqual(m.innings[0].wickets, old.first.wickets)
        self.assertEqual(m.innings[1].runs, old.second.runs)
        self.assertEqual(m.innings[1].wickets, old.second.wickets)
        self.assertEqual(m.result.margin_wickets, old.result.margin_wickets)
        self.assertEqual(m.result.margin_balls, old.result.margin_balls)
        self.assertEqual(m.result.margin_runs, old.result.margin_runs)

    # TEST 14 -----------------------------------------------------------------
    def test_result_margins(self):
        # chased down: margin in wickets + balls (2-over quick match)
        m = make_match(settings=MatchSettings(2, 10))
        m.start(0)
        over_of(m, 0, [L(4)] * 6)                  # 24
        over_of(m, 1, [L(0)] * 6)                  # 24 total, target 25
        m.start_second_innings()
        m.assign_bowler(0)
        for _ in range(6):
            m.record_delivery(L(4))                # 24 -> need 1 more
        m.assign_bowler(1)
        m.record_delivery(L(1))                    # target reached on ball 7
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.result.margin_wickets, 10)
        self.assertEqual(m.result.margin_balls, 12 - 7)
        # defended: margin in runs
        m2 = make_match()
        m2.start(0)
        for over in range(20):
            over_of(m2, over % 5, [L(1)] * 6)      # 120
        m2.start_second_innings()
        for over in range(20):
            over_of(m2, over % 5, [L(0)] * 6)
        self.assertEqual(m2.result.outcome, OUTCOME_FIRST_WIN)
        self.assertEqual(m2.result.margin_runs, 120)
        # tie: chase finishes exactly level with the first innings score
        m3 = make_match(settings=MatchSettings(4, 10))
        m3.start(0)
        for over in range(4):
            over_of(m3, over, [L(1)] * 6)          # 24
        m3.start_second_innings()
        over_of(m3, 0, [L(6)] * 4 + [L(0)] * 2)    # 24 = level, below target 25
        for over in range(1, 4):
            over_of(m3, over, [L(0)] * 6)
        self.assertEqual(m3.result.outcome, OUTCOME_TIE)

    # TEST 15 -----------------------------------------------------------------
    def test_result_contains_complete_player_statistics(self):
        m = make_match()
        m.start(0)
        m.assign_bowler(0)
        m.record_delivery(L(4))
        m.record_delivery(L(6))
        m.record_delivery(L(2))
        over_of_next = [L(0)] * 3
        for o in over_of_next:
            m.record_delivery(o)
        for over in range(1, 20):
            over_of(m, over % 5, [L(0)] * 6)
        m.start_second_innings()
        for over in range(20):
            over_of(m, over % 5, [L(0)] * 6)

        inn = m.innings[0]
        opener = inn.batters[0]
        self.assertEqual((opener.runs, opener.balls_faced), (12, 60))
        self.assertEqual((opener.fours, opener.sixes), (1, 1))
        self.assertAlmostEqual(opener.strike_rate, 20.0, places=4)
        self.assertEqual(inn.extras_total, 0)
        self.assertEqual(inn.bowlers[0].figures.split("-")[2], str(inn.bowlers[0].runs_conceded))
        # POTM is the opener (12 runs beats any bowling contribution here)
        potm = choose_player_of_match(m.innings[0], m.innings[1])
        self.assertEqual(potm, opener.name)
        # result carries the scorecard data (margin + target sanity)
        self.assertEqual(m.result.target, inn.runs + 1)
        self.assertEqual(m.result.first[0], inn.runs)

    # extras / misc -------------------------------------------------------------
    def test_extras_break_a_maiden(self):
        m = make_match()
        m.start(0)
        over_of(m, 0, [L(0)] * 6)                  # maiden
        over_of(m, 1, [L(0), L(0), WD(), L(0), L(0), L(0), L(0)])
        over_of(m, 2, [L(0)] * 6)                  # maiden again
        inn = m.innings[0]
        self.assertEqual(inn.bowlers[0].maidens, 1)
        self.assertEqual(inn.bowlers[1].maidens, 0)   # wide broke it
        self.assertEqual(inn.bowlers[2].maidens, 1)

    def test_over_marks_and_summary(self):
        m = make_match()
        m.start(0)
        over_of(m, 0, [L(1), L(0), L(4), W("lbw"), L(2), WD(), L(1)])
        over0 = m.innings[0].overs[0]
        self.assertEqual(over0.runs, 1 + 0 + 4 + 2 + 1 + 1)
        self.assertEqual(over0.wickets, 1)
        self.assertEqual(len(over0.marks), 7)

    def test_drinks_break_state(self):
        m = make_match()
        m.start(0)
        m.assign_bowler(0)
        m.begin_drinks_break()
        from limitedovers_reference import STATE_DRINKS_BREAK, STATE_PLAYING
        self.assertEqual(m.state, STATE_DRINKS_BREAK)
        m.end_drinks_break()
        self.assertEqual(m.state, STATE_PLAYING)


# --- randomized soak -------------------------------------------------------------

class LimitedOversSoak(unittest.TestCase):
    def test_random_full_matches_never_break_invariants(self):
        rng = random.Random(6006)
        for trial in range(40):
            m = make_match()
            m.start(rng.randrange(2))
            guard = 0
            while not m.is_complete and guard < 4000:
                guard += 1
                if m.phase == PHASE_BREAK:
                    m.start_second_innings()
                    continue
                inn = m.current_innings
                if inn.awaiting_bowler:
                    b = suggest_next_bowler(inn)
                    self.assertGreaterEqual(b, 0, "squad must always cover the overs")
                    m.assign_bowler(b)
                    continue
                r = rng.random()
                if r < 0.04 and m.settings.allow_extras:
                    o = WD()
                elif r < 0.07 and m.settings.allow_extras:
                    o = NB(rng.choice([0, 1, 2]))
                elif r < 0.12:
                    o = W(rng.choice(["bowled", "caught", "lbw", "stumped"]))
                else:
                    o = L(rng.choice([0, 0, 0, 1, 1, 2, 3, 4, 6]))
                m.record_delivery(o)
                # invariants after every delivery
                if m.phase == PHASE_BREAK:
                    continue
                i = m.current_innings if not m.is_complete else m.innings[1]
                self.assertGreaterEqual(i.runs, 0)
                self.assertLessEqual(i.legal_balls, 120)
                self.assertLessEqual(i.wickets, 10)

            self.assertTrue(m.is_complete, "soak match %d did not finish" % trial)
            res = m.result
            a, b = m.innings[0], m.innings[1]
            if res.outcome == OUTCOME_SECOND_WIN:
                self.assertGreaterEqual(b.runs, a.runs + 1)
                self.assertEqual(res.margin_wickets, 10 - b.wickets)
                self.assertEqual(res.margin_balls, 120 - b.legal_balls)
            elif res.outcome == OUTCOME_FIRST_WIN:
                self.assertGreater(a.runs, b.runs)
                self.assertEqual(res.margin_runs, a.runs - b.runs)
            else:
                self.assertEqual(a.runs, b.runs)
            # chase must have ended on the exact delivery that reached the target
            if res.outcome == OUTCOME_SECOND_WIN:
                last = b.deliveries[-1].outcome
                self.assertLess(b.runs - last.total_runs, a.runs + 1,
                                "chase must end immediately upon reaching the target")


if __name__ == "__main__":
    unittest.main(verbosity=2)
