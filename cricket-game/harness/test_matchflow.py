"""Phase 3 tests: fielding simulation, AI batting, difficulty and the full
Super Over match flow (spec section 28 scenarios)."""

import math
import random
import unittest

import batting_reference as br
import bowling_reference as bw
import fielding_reference as fw
import ai_reference as ai
import matchflow_reference as mf
from superover_reference import (SuperOverMatch, DeliveryOutcome,
                                 OUTCOME_FIRST_WIN, OUTCOME_SECOND_WIN,
                                 OUTCOME_TIE, PHASE_BREAK, PHASE_COMPLETED)


# ---------------------------------------------------------------------------
# Fielding simulation

class FieldingSimTests(unittest.TestCase):
    def _shoot(self, exit_kph, elev_deg, angle_rad, seed, scale=1.0):
        e = math.radians(elev_deg)
        v = exit_kph / 3.6
        vel = (math.sin(angle_rad) * math.cos(e) * v,
               math.sin(e) * v,
               math.cos(angle_rad) * math.cos(e) * v)
        return fw.simulate_fielding((0.1, 0.9, 0.35), vel,
                                    fw.default_field(scale),
                                    random.Random(seed))

    def test_powerful_shot_through_gap_is_boundary(self):   # TEST 10
        fours = 0
        for seed in range(60):
            # hard, low drive through the mid-off/cover gap, skidding past
            # the ring before it can descend into catchable height
            res = self._shoot(104, 7, math.radians(30), seed)
            if res["kind"] in ("four", "six"):
                fours += 1
        self.assertGreater(fours, 40)

    def test_powerful_shot_at_a_fielder_is_contained(self):
        stopped = 0
        for seed in range(60):
            # same power but straight to cover: the field matters
            res = self._shoot(104, 7, math.radians(43), seed)
            if res["kind"] == "stopped":
                stopped += 1
        self.assertGreater(stopped, 30)

    def test_soft_shot_is_intercepted_for_few_runs(self):   # TEST 9
        dots_and_singles = 0
        for seed in range(60):
            res = self._shoot(62, 8, 0.5, seed)     # gentle push to cover
            self.assertIn(res["kind"], ("stopped", "four"))
            if res["kind"] == "stopped":
                self.assertLessEqual(res["runs"], 2)
                dots_and_singles += 1
        self.assertGreater(dots_and_singles, 30)

    def test_lofted_shot_can_be_caught_and_can_survive(self):  # TEST 11
        catches = 0
        escapes = 0
        for seed in range(200):
            # lofted chip landing in the ring: sometimes caught, sometimes not
            res = self._shoot(70, 42, math.radians(-30), seed)
            if res["kind"] == "caught":
                catches += 1
            else:
                escapes += 1
        self.assertGreater(catches, 25)
        self.assertGreater(escapes, 50)

    def test_edge_behind_square_keeper_can_take_it(self):
        catches = 0
        for seed in range(150):
            # thin edge flying low into the keeper/slip corridor
            res = self._shoot(52, 12, math.radians(157), seed)
            if res["kind"] == "caught":
                catches += 1
        self.assertGreater(catches, 20)

    def test_worse_fielding_concedes_more(self):
        """Slower, worse fielders take longer to collect (more runs) and
        drop more catches."""
        def profile(scale, n=250):
            catches = 0
            runs = []
            for seed in range(n):
                res = self._shoot(70, 42, math.radians(-30), seed, scale=scale)
                if res["kind"] == "caught":
                    catches += 1
                elif res["kind"] == "stopped":
                    runs.append(res["runs"])
            return catches, sum(runs) / max(1, len(runs))
        weak_c, weak_avg = profile(0.75)
        good_c, good_avg = profile(1.20)
        self.assertGreater(weak_avg, good_avg)   # slower collection = more runs
        self.assertGreaterEqual(good_c, weak_c)  # better hands = more catches

    def test_runs_capped_and_deterministic_per_seed(self):
        a = self._shoot(88, 12, 0.3, 7)
        b = self._shoot(88, 12, 0.3, 7)
        self.assertEqual(a["kind"], b["kind"])
        self.assertEqual(a["runs"], b["runs"])
        for seed in range(100):
            res = self._shoot(95, 14, 0.4, seed)
            self.assertTrue(0 <= res["runs"] <= 6)


# ---------------------------------------------------------------------------
# AI batting decisions

class AiBattingTests(unittest.TestCase):
    def test_aggression_state_monotonic_with_required_rate(self):  # TEST 12a
        self.assertEqual(ai.aggression_state(2, 5, 2), "safe")
        self.assertEqual(ai.aggression_state(8, 5, 2), "balanced")
        self.assertEqual(ai.aggression_state(16, 5, 2), "aggressive")
        self.assertEqual(ai.aggression_state(26, 4, 2), "desperate")
        self.assertEqual(ai.aggression_state(6, 1, 2), "desperate")

    def test_ai_gets_more_aggressive_under_pressure(self):        # TEST 12
        rng = random.Random(3)
        delivery = bw.build_delivery("good_length", random.Random(1), 0.8)

        def intent_mix(ctx, n=600):
            counts = {}
            for i in range(n):
                plan = ai.ai_batting_plan(random.Random(rng.random()), delivery,
                                          ctx, "medium")
                if plan["swing"]:
                    counts[plan["intent"]] = counts.get(plan["intent"], 0) + 1
            return counts

        calm = intent_mix({"target": 10, "score": 4, "balls_remaining": 5,
                           "wickets_remaining": 2})
        panic = intent_mix({"target": 40, "score": 5, "balls_remaining": 2,
                            "wickets_remaining": 2})
        calm_loft = calm.get("lofted", 0) + calm.get("aggressive", 0)
        panic_loft = panic.get("lofted", 0) + panic.get("aggressive", 0)
        self.assertGreater(panic_loft, calm_loft * 2)

    def test_ai_makes_mistakes(self):
        """Across many decisions the AI sometimes leaves, hacks and mistimes."""
        leaves = 0
        bad_timing = 0
        delivery = bw.build_delivery("good_length", random.Random(9), 0.8)
        ctx = {"target": 20, "score": 5, "balls_remaining": 4, "wickets_remaining": 2}
        for i in range(500):
            plan = ai.ai_batting_plan(random.Random(i), delivery, ctx, "medium")
            if not plan["swing"]:
                leaves += 1
            elif abs(plan["offset"]) > 0.10:
                bad_timing += 1
        self.assertGreater(leaves, 10)
        self.assertGreater(bad_timing, 15)

    def test_difficulty_changes_skill(self):
        delivery = bw.build_delivery("good_length", random.Random(4), 0.8)
        ctx = {"target": 18, "score": 4, "balls_remaining": 4, "wickets_remaining": 2}

        def mean_abs_offset(diff, n=400):
            tot = 0.0
            for i in range(n):
                plan = ai.ai_batting_plan(random.Random(i * 13 + 1), delivery,
                                          ctx, diff)
                if plan["swing"]:
                    tot += abs(plan["offset"])
            return tot / n

        self.assertGreater(mean_abs_offset("easy"), mean_abs_offset("hard") * 1.3)


# ---------------------------------------------------------------------------
# Match state machine - scripted scenarios (spec section 28)

class MatchScriptTests(unittest.TestCase):
    def _script(self, innings1, innings2=None):
        m = SuperOverMatch()
        m.start()
        for o in innings1:
            m.record_delivery(o)
        if innings2 and m.phase == PHASE_BREAK:
            m.start_second_innings()
            for o in innings2:
                m.record_delivery(o)
                if m.phase == PHASE_COMPLETED:
                    break
        return m

    def test_1_six_dots_end_innings(self):
        m = self._script([DeliveryOutcome.legal(0)] * 6, [])
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.runs, 0)
        self.assertEqual(m.first.legal_balls, 6)

    def test_2_four_boundaries_chase_early(self):
        m = self._script([DeliveryOutcome.legal(1)] * 4 + [DeliveryOutcome.legal(0)] * 2,
                         [DeliveryOutcome.legal(4), DeliveryOutcome.legal(4)])
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.second.legal_balls, 2)                   # not 6

    def test_3_two_wickets_end_innings(self):
        m = self._script([DeliveryOutcome.wicket("bowled"),
                          DeliveryOutcome.wicket("caught")], [])
        self.assertEqual(m.phase, PHASE_BREAK)
        self.assertEqual(m.first.wickets, 2)
        self.assertEqual(m.first.legal_balls, 2)

    def test_4_target_reached_on_sixth_ball(self):
        m = self._script([DeliveryOutcome.legal(2)] * 2 + [DeliveryOutcome.legal(0)] * 4,
                         [DeliveryOutcome.legal(1), DeliveryOutcome.legal(1),
                          DeliveryOutcome.legal(1), DeliveryOutcome.legal(1),
                          DeliveryOutcome.legal(0), DeliveryOutcome.legal(1)])
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.second.legal_balls, 6)
        self.assertEqual(m.second.runs, 5)

    def test_5_target_not_reached_after_six(self):
        m = self._script([DeliveryOutcome.legal(4), DeliveryOutcome.legal(4)]
                         + [DeliveryOutcome.legal(0)] * 4,
                         [DeliveryOutcome.legal(1)] * 6)
        self.assertEqual(m.result.outcome, OUTCOME_FIRST_WIN)
        self.assertEqual(m.result.margin_runs, 8 - 6)

    def test_6_chase_ends_immediately(self):
        m = self._script([DeliveryOutcome.legal(6)] + [DeliveryOutcome.legal(0)] * 5,
                         [DeliveryOutcome.legal(6), DeliveryOutcome.legal(1)])
        self.assertEqual(m.result.outcome, OUTCOME_SECOND_WIN)
        self.assertEqual(m.second.legal_balls, 2)

    def test_7_catch_is_a_wicket(self):
        m = self._script([DeliveryOutcome.wicket("caught")], [])
        self.assertEqual(m.first.wickets, 1)

    def test_8_bowled_is_a_wicket(self):
        m = self._script([DeliveryOutcome.wicket("bowled")], [])
        self.assertEqual(m.first.wickets, 1)

    def test_tie_is_tie_not_highest_score(self):
        m = self._script([DeliveryOutcome.legal(4)] + [DeliveryOutcome.legal(0)] * 5,
                         [DeliveryOutcome.legal(4)] + [DeliveryOutcome.legal(0)] * 5)
        self.assertEqual(m.result.outcome, OUTCOME_TIE)

    def test_striker_swaps_on_odd_runs_only(self):
        m = SuperOverMatch()
        m.start()
        inn = m.first
        self.assertEqual(inn.striker, 0)
        m.record_delivery(DeliveryOutcome.legal(1))
        self.assertEqual(inn.striker, 1)
        m.record_delivery(DeliveryOutcome.legal(2))
        self.assertEqual(inn.striker, 1)
        m.record_delivery(DeliveryOutcome.legal(4))
        self.assertEqual(inn.striker, 1)
        m.record_delivery(DeliveryOutcome.legal(3))
        self.assertEqual(inn.striker, 0)
        m.record_delivery(DeliveryOutcome.wicket("bowled"))
        self.assertEqual(inn.striker, 0)   # replacement takes guard at same end

    def test_wides_do_not_consume_legal_balls(self):
        m = SuperOverMatch()
        m.start()
        m.record_delivery(DeliveryOutcome.wide())
        m.record_delivery(DeliveryOutcome.legal(0))
        self.assertEqual(m.first.legal_balls, 1)
        self.assertEqual(m.first.runs, 1)

    def test_run_rate_and_bowler_tracking(self):
        m = SuperOverMatch()
        m.start()
        m.first.bowler = "AI"
        self.assertEqual(m.first.current_run_rate, 0.0)
        m.record_delivery(DeliveryOutcome.legal(4))
        m.record_delivery(DeliveryOutcome.legal(2))
        # 6 runs off 2 balls = 18 runs per over
        self.assertAlmostEqual(m.first.current_run_rate, 18.0)
        self.assertEqual(m.first.bowler, "AI")


# ---------------------------------------------------------------------------
# Full headless matches: AI vs AI through the whole pipeline

class FullMatchSoakTests(unittest.TestCase):
    def test_headless_matches_complete_correctly(self):
        second_wins = first_wins = 0
        for seed in range(60):
            m, log = mf.play_match(seed, difficulty="medium")
            self.assertEqual(m.phase, PHASE_COMPLETED)
            # Chase correctness.
            if m.result.outcome == OUTCOME_SECOND_WIN:
                second_wins += 1
                self.assertGreaterEqual(m.second.runs, m.first.runs + 1)
            elif m.result.outcome == OUTCOME_FIRST_WIN:
                first_wins += 1
                self.assertLess(m.second.runs, m.first.runs + 1)
            # Innings never exceed 6 legal balls / 2 wickets.
            for inn in (m.first, m.second):
                self.assertLessEqual(inn.legal_balls, 6)
                self.assertLessEqual(inn.wickets, 2)
            # Chase that ends early must have reached the target.
            if m.result.outcome == OUTCOME_SECOND_WIN and m.second.legal_balls < 6:
                self.assertGreaterEqual(m.second.runs, m.first.runs + 1)
        self.assertGreater(first_wins, 0)     # TEST 13: the chase can fail
        self.assertGreater(second_wins, 0)    # TEST 14: the chase can succeed

    def test_catches_and_boundaries_occur_in_full_matches(self):
        kinds = set()
        for seed in range(80):
            _, log = mf.play_match(seed)
            for entry in log:
                kinds.add(entry["result"]["outcome_kind"])
        self.assertIn("caught", kinds)    # TEST 7 live
        self.assertIn("four", kinds)      # TEST 10 live
        # Clean bowled or LBW must occur: the AI misses balls at the stumps.
        self.assertTrue({"bowled", "lbw"} & kinds)   # TEST 8 live
        self.assertTrue({"runs", "dot", "stopped", "beaten", "leave"} & kinds)

    def test_matches_can_be_replayed_end_to_end(self):           # TEST 15
        for i in range(10):
            m, _ = mf.play_match(1000 + i)
            self.assertEqual(m.phase, PHASE_COMPLETED)
            self.assertIsNotNone(m.result)

    def test_difficulty_shifts_outcomes(self):
        def chase_success_rate(diff, n=50):
            wins = 0
            for seed in range(n):
                m, _ = mf.play_match(seed, difficulty=diff)
                if m.result.outcome == OUTCOME_SECOND_WIN:
                    wins += 1
            return wins / n
        easy = chase_success_rate("easy")
        hard = chase_success_rate("hard")
        # Second-innings bot bats better on easy than on hard - either way the
        # difference must exist (skill, not score fudging).
        self.assertNotAlmostEqual(easy, hard, delta=0.001)

    def test_forced_debug_outcomes_flow_through_the_match(self):
        m, log = mf.play_match(5, force_innings1="six")
        # Every first-innings ball resolves as a six.
        for entry in log:
            if entry["innings"] == 0:
                self.assertEqual(entry["result"]["runs"], 6)
        self.assertEqual(m.first.runs, 36)


if __name__ == "__main__":
    unittest.main()
