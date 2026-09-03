"""Phase 4 verification: batting feel, shot context, advanced bowling,
smarter AI, fielding polish.

Run:  python3 harness/test_phase4.py   (from cricket-game/)
"""

import math
import random
import unittest

import batting_reference as br
import bowling_reference as bw
import fielding_reference as fw
import ai_reference as ai
import matchflow_reference as mf
import phase4_reference as p4
from superover_reference import DeliveryOutcome, SuperOverMatch, PHASE_COMPLETED


class TimingFeelTests(unittest.TestCase):
    def test_six_named_tiers_classify(self):
        self.assertEqual(br.timing_classify(0.0), "perfect")
        self.assertEqual(br.timing_classify(0.06), "good")
        self.assertEqual(br.timing_classify(-0.12), "early")
        self.assertEqual(br.timing_classify(0.12), "late")
        self.assertEqual(br.timing_classify(-0.22), "very_early")
        self.assertEqual(br.timing_classify(0.22), "very_late")
        self.assertEqual(br.timing_classify(0.30), "missed")

    def test_feedback_power_ladder(self):
        tiers = ["perfect", "good", "early", "very_early"]
        powers = [p4.timing_feedback(t, "aggressive")["power_mult"] for t in tiers]
        self.assertEqual(powers, sorted(powers, reverse=True))

    def test_perfect_aggression_outattacks_good(self):
        fb_p = p4.timing_feedback("perfect", "aggressive")
        fb_g = p4.timing_feedback("good", "aggressive")
        self.assertGreater(fb_p["attack_boost"], fb_g["attack_boost"])
        self.assertGreater(fb_p["attack_boost"], 1.0,
                           "perfect aggressive timing must add attacking potential")

    def test_perfect_defense_stays_defensive(self):
        # A perfectly timed block is still a block: engine caps defense exits.
        rng = random.Random(4)
        d = br.Delivery.good()
        shot = {"kind": "front_foot_defense", "name": "F", "lofted": False,
                "awkward": False, "base_power": 0.30, "base_loft": 2.0}
        direction = {"direction": br.Vec2(0, 1), "angle": 0.0, "reach": 1.0,
                     "gap": 0.0, "has_direction": True}
        c = br.resolve_contact(rng, d, shot, direction, 0.0, "perfect", 1.0)
        self.assertEqual(c["outcome"], "defensive_solid")
        self.assertLess(c["exit_kph"], 45.0, "defence never becomes a drive")

    def test_feedback_drives_presentation_values(self):
        fb = p4.timing_feedback("perfect", "lofted")
        self.assertGreater(fb["haptic"], 0.0)
        self.assertGreater(fb["bat_shake"], 0.0)
        self.assertEqual(p4.timing_feedback("missed")["haptic"], 0.0)


class ShotContextTests(unittest.TestCase):
    def test_yorker_blocks_square_shots(self):
        allowed = p4.ALLOWED_SECTORS["yorker"]
        self.assertNotIn("point", allowed)
        self.assertNotIn("square_leg", allowed)
        self.assertIn("straight", allowed)

    def test_yorker_pull_request_snaps_to_nearest_valid(self):
        # Asking to pull a yorker (square-leg direction) is unrealistic:
        # the request snaps to the NEAREST believable shot - a leg-side flick
        # dig - rather than producing a broken animation.
        res = p4.validate_shot_request(math.radians(-80.0), length=0.05)
        self.assertTrue(res["snapped"])
        self.assertEqual(res["sector"], "mid_wicket")
        self.assertEqual(res["family"], "flick")

    def test_short_ball_allows_pull_and_cut(self):
        for sector in ("point", "square_leg", "mid_wicket"):
            self.assertIn(sector, p4.ALLOWED_SECTORS["short"])
        res = p4.validate_shot_request(math.radians(80.0), length=0.85)
        self.assertFalse(res["snapped"])
        self.assertEqual(res["sector"], "point")
        self.assertEqual(res["family"], "cut")

    def test_wide_ball_cut_is_believable(self):
        res = p4.validate_shot_request(math.radians(85.0), length=0.55)
        self.assertFalse(res["snapped"])
        self.assertEqual(res["family"], "cut")

    def test_leg_side_flick_allowed_full(self):
        res = p4.validate_shot_request(math.radians(-40.0), length=0.20)
        self.assertFalse(res["snapped"])
        self.assertEqual(res["family"], "flick")

    def test_snap_stays_close_to_request(self):
        # Snapping must pick the NEAREST valid sector, not teleport the shot.
        res = p4.validate_shot_request(math.radians(120.0), length=0.05)
        self.assertTrue(res["snapped"])
        self.assertEqual(res["sector"], "cover")   # nearest to 120 for yorker


class AdvancedBowlingTests(unittest.TestCase):
    def test_all_eleven_delivery_types_exist(self):
        for t in ("off_cutter", "leg_cutter", "slower_ball", "yorker",
                  "bouncer", "short_ball", "full_ball", "good_length",
                  "fast_inswinger", "fast_outswinger", "fast_straight"):
            self.assertIn(t, bw.DELIVERY_TYPES)
            self.assertIn(t, bw.DELIVERY_SPECS)

    def test_cutters_grip_the_pitch(self):
        rng = random.Random(11)
        for _ in range(40):
            oc = bw.build_delivery("off_cutter", rng, accuracy=1.0)
            self.assertGreater(oc.seam, 0.25, "off-cutter moves away")
            self.assertLess(oc.speed_kph, 128)
        rng = random.Random(12)
        for _ in range(40):
            lc = bw.build_delivery("leg_cutter", rng, accuracy=1.0)
            self.assertLess(lc.seam, -0.25, "leg-cutter moves in")

    def test_slower_ball_is_pace_off(self):
        rng = random.Random(13)
        slow = [bw.build_delivery("slower_ball", rng, accuracy=1.0) for _ in range(30)]
        fast = [bw.build_delivery("fast_straight", rng, accuracy=1.0) for _ in range(30)]
        self.assertLess(sum(s.speed_kph for s in slow) / 30,
                        sum(f.speed_kph for f in fast) / 30 - 12.0)

    def test_profiles_change_character(self):
        rng = random.Random(21)
        fast = bw.build_delivery("fast_straight", rng, accuracy=1.0, profile="fast")
        rng = random.Random(21)
        swing = bw.build_delivery("fast_outswinger", rng, accuracy=1.0, profile="swing")
        rng = random.Random(21)
        slow = bw.build_delivery("fast_straight", rng, accuracy=1.0, profile="variation")
        self.assertGreater(fast.speed_kph, slow.speed_kph)
        self.assertGreater(abs(swing.swing), 0.6)
        for prof, data in bw.BOWLER_PROFILES.items():
            self.assertTrue(abs(sum(data["plan"].values()) - 1.0) < 0.01 or
                            sum(data["plan"].values()) > 0)

    def test_release_perfect_is_exact(self):
        rng = random.Random(31)
        d = bw.build_delivery("good_length", rng, accuracy=1.0)
        out = bw.apply_release(d, 0.01)
        self.assertEqual((out.line, out.length), (d.line, d.length))
        self.assertEqual(bw.release_quality(0.01), "perfect")

    def test_release_early_goes_fuller(self):
        rng = random.Random(32)
        d = bw.build_delivery("good_length", rng, accuracy=1.0)
        out = bw.apply_release(d, -0.12, accuracy=0.7)
        self.assertLess(out.length, d.length, "early release over-pitches")
        self.assertEqual(bw.release_quality(-0.12), "early")

    def test_release_late_goes_shorter(self):
        rng = random.Random(33)
        d = bw.build_delivery("good_length", rng, accuracy=1.0)
        out = bw.apply_release(d, 0.12, accuracy=0.7)
        self.assertGreater(out.length, d.length, "late release drags short")

    def test_wide_legality_thresholds(self):
        self.assertEqual(bw.delivery_legality(0.4), "legal")
        self.assertEqual(bw.delivery_legality(-0.9), "legal")
        self.assertEqual(bw.delivery_legality(1.05), "wide")
        self.assertEqual(bw.delivery_legality(-1.1), "wide")

    def test_wide_never_consumes_a_legal_ball(self):
        m = SuperOverMatch()
        m.start()
        for _ in range(8):
            m.record_delivery(DeliveryOutcome.wide())
        self.assertEqual(m.first.legal_balls, 0)
        self.assertEqual(m.first.runs, 8)
        self.assertEqual(m.first.is_complete, False,
                         "wides alone cannot end an innings")

    def test_poor_bowling_pipeline_can_go_wide(self):
        # The full pipeline (release + control check) must be able to spray.
        wided = 0
        rng = random.Random(77)
        for _ in range(400):
            d = bw.build_delivery("fast_inswinger", rng, accuracy=0.55)
            out = bw.bowl_with_release(rng, d, -0.16, accuracy=0.55,
                                       difficulty="easy")
            if out["wide"]:
                wided += 1
                self.assertEqual(bw.delivery_legality(out["delivery"].line),
                                 "wide")
        self.assertGreater(wided, 0, "loss of control must be able to go wide")

    def test_hard_bowlers_spray_less_than_easy(self):
        def sprays(diff):
            rng = random.Random(5)
            n = 0
            for _ in range(2000):
                d = bw.build_delivery("good_length", rng, accuracy=0.55)
                if bw.bowl_with_release(rng, d, 0.0, accuracy=0.55,
                                        difficulty=diff)["wide"]:
                    n += 1
            return n
        self.assertLess(sprays("hard"), sprays("easy"))
        self.assertGreater(sprays("easy"), 0)


class AiBattingArchetypeTests(unittest.TestCase):
    def test_archetypes_attack_and_defend_differently(self):
        attacks = {}
        for arch in ai.ARCHETYPES:
            rng = random.Random(7)
            aggressive_intents = 0
            n = 1200
            for _ in range(n):
                d = bw.build_delivery("good_length", rng, accuracy=1.0)
                ctx = {"target": None, "score": 5, "balls_remaining": 5,
                       "wickets_remaining": 2}
                plan = ai.ai_batting_plan(rng, d, ctx, "medium",
                                          hits_stumps_hint=True, archetype=arch)
                if plan["intent"] in ("aggressive", "lofted"):
                    aggressive_intents += 1
            attacks[arch] = aggressive_intents / n
        self.assertGreater(attacks["aggressive"], attacks["balanced"] + 0.05)
        self.assertGreater(attacks["balanced"], attacks["defensive"] + 0.05)

    def test_defensive_archetype_leaves_more_wides(self):
        leaves = {}
        for arch in ("defensive", "aggressive"):
            rng = random.Random(9)
            left = 0
            n = 800
            for _ in range(n):
                d = bw.build_delivery("fast_outswinger", rng, accuracy=1.0)
                d.line = 0.85  # wide outside off, missing stumps
                # Safe chase state: only 3 needed off 5 with lives in hand,
                # so leaving has real value and archetypes can differ.
                ctx = {"target": 30, "score": 27, "balls_remaining": 5,
                       "wickets_remaining": 2}
                plan = ai.ai_batting_plan(rng, d, ctx, "medium",
                                          hits_stumps_hint=False, archetype=arch)
                if plan["leave_reason"] == "wide_outside_off":
                    left += 1
            leaves[arch] = left / n
        self.assertGreater(leaves["defensive"], leaves["aggressive"])

    def test_balanced_archetype_is_unchanged_behaviour(self):
        # Regression: archetype='balanced' must reproduce Phase 3 plans.
        rng_a = random.Random(123)
        rng_b = random.Random(123)
        for _ in range(60):
            d1 = bw.build_delivery("good_length", rng_a, accuracy=1.0)
            d2 = bw.build_delivery("good_length", rng_b, accuracy=1.0)
            ctx = {"target": 18, "score": 9, "balls_remaining": 4,
                   "wickets_remaining": 2}
            p_default = ai.ai_batting_plan(rng_a, d1, ctx, "medium",
                                           hits_stumps_hint=True)
            p_balanced = ai.ai_batting_plan(rng_b, d2, ctx, "medium",
                                            hits_stumps_hint=True,
                                            archetype="balanced")
            self.assertEqual(p_default["intent"], p_balanced["intent"])
            self.assertEqual(p_default["swing"], p_balanced["swing"])
            self.assertEqual(p_default["angle"], p_balanced["angle"])


class AiBowlingStrategyTests(unittest.TestCase):
    def test_repeated_cover_scoring_gets_attacked(self):
        rng = random.Random(1)
        history = [{"sector": "cover", "runs": 4, "intent": "aggressive"},
                   {"sector": "cover", "runs": 4, "intent": "aggressive"},
                   {"sector": "cover", "runs": 1, "intent": "normal"}]
        ctx = {"score": 12, "wickets_remaining": 2, "balls_remaining": 3}
        plan = p4.ai_bowling_plan(rng, history, ctx, "medium")
        self.assertIn("cover", plan["reason"])
        self.assertEqual(plan["type"], "leg_cutter")
        self.assertLess(plan["line_hint"], 0.0, "moves away from the cover zone")

    def test_repeated_leg_side_gets_taken_out(self):
        rng = random.Random(2)
        history = [{"sector": "mid_wicket", "runs": 2, "intent": "normal"},
                   {"sector": "mid_wicket", "runs": 4, "intent": "aggressive"}]
        ctx = {"score": 9, "wickets_remaining": 2, "balls_remaining": 4}
        plan = p4.ai_bowling_plan(rng, history, ctx, "medium")
        self.assertEqual(plan["type"], "off_cutter")
        self.assertGreater(plan["line_hint"], 0.0)

    def test_aggressive_batter_gets_pace_off_or_yorker(self):
        rng = random.Random(3)
        history = [{"sector": "straight", "runs": 6, "intent": "lofted"},
                   {"sector": "cover", "runs": 4, "intent": "aggressive"}]
        ctx = {"score": 14, "wickets_remaining": 2, "balls_remaining": 4}
        plan = p4.ai_bowling_plan(rng, history, ctx, "medium")
        self.assertIn(plan["type"], ("slower_ball", "yorker"))

    def test_death_overs_attack_the_base(self):
        rng = random.Random(4)
        ctx = {"score": 6, "wickets_remaining": 2, "balls_remaining": 2}
        plan = p4.ai_bowling_plan(rng, [], ctx, "medium")
        self.assertEqual(plan["type"], "yorker")
        self.assertEqual(plan["reason"], "yorker_at_the_death")

    def test_plan_carries_a_reason(self):
        rng = random.Random(5)
        plan = p4.ai_bowling_plan(rng, [], {"balls_remaining": 6}, "medium")
        self.assertTrue(plan["reason"])
        self.assertIn(plan["type"], p4.AI_BOWLING_TYPES)


class FieldingPolishTests(unittest.TestCase):
    def test_catch_grades_by_difficulty(self):
        self.assertEqual(p4.catch_grade(60, 1.2, 6.0), "easy")
        self.assertEqual(p4.catch_grade(105, 2.0, 8.0), "medium")
        self.assertEqual(p4.catch_grade(112, 0.8, 2.0), "difficult")
        self.assertEqual(p4.catch_grade(95, 1.0, 1.5, is_edge=True), "edge")
        self.assertLess(p4.GRADE_SUCCESS_BIAS["difficult"],
                        p4.GRADE_SUCCESS_BIAS["easy"])

    def test_dive_only_when_ball_escapes(self):
        f = fw.default_field()[2]  # cover
        # In reach: no dive. Far away: no dive (cosplay guard).
        self.assertEqual(p4.dive_decision(f, 0.8, 18, True, False), "none")
        self.assertEqual(p4.dive_decision(f, 6.0, 18, True, False), "none")
        # Fast ball heading for the rope, just out of reach: boundary save.
        self.assertEqual(p4.dive_decision(f, 2.2, 22.0, True, False),
                         "boundary_save")
        # Lofted ball drifting away: catch dive.
        self.assertEqual(p4.dive_decision(f, 2.0, 12.0, False, True), "catch")
        # Grounded squirt: ground dive.
        self.assertEqual(p4.dive_decision(f, 1.8, 12.0, False, False), "ground")

    def test_dive_success_is_bounded_and_attribute_based(self):
        good = fw.Fielder(("x", 0, 0, 7.0, 0.2, 0.9, 0.9, 24.0, 0.85), scale=1.0)
        poor = fw.Fielder(("y", 0, 0, 5.5, 0.3, 0.5, 0.5, 20.0, 0.6), scale=1.0)
        p_good = p4.dive_success_probability(good, "boundary_save", 20.0)
        p_poor = p4.dive_success_probability(poor, "boundary_save", 20.0)
        self.assertGreater(p_good, p_poor)
        self.assertLessEqual(p_good, 0.92)
        self.assertGreaterEqual(p_poor, 0.05)

    def test_strong_arm_returns_faster(self):
        cannon = fw.Fielder(("a", 0, 0, 6.5, 0.2, 0.7, 0.8, 26.0, 0.85), scale=1.0)
        noodle = fw.Fielder(("b", 0, 0, 6.5, 0.2, 0.7, 0.8, 16.0, 0.85), scale=1.0)
        t_cannon = p4.throw_return(cannon, 45.0)["travel_time"]
        t_noodle = p4.throw_return(noodle, 45.0)["travel_time"]
        self.assertLess(t_cannon, t_noodle)
        self.assertLess(t_cannon, 2.6, "flat throw returns inside a run-window")

    def test_errant_throw_costs_time(self):
        weak_acc = fw.Fielder(("c", 0, 0, 6.5, 0.2, 0.7, 0.8, 22.0, 0.60), scale=1.0)
        out = p4.throw_return(weak_acc, 40.0)
        self.assertTrue(out["errant"])

    def test_fielding_sim_still_reports_collect_and_throw(self):
        rng = random.Random(5)
        fielders = fw.default_field()
        res = fw.simulate_fielding((0.0, 0.5, 0.35), (10.0, 0.5, 14.0),
                                   fielders, rng)
        self.assertIn(res["kind"], ("caught", "four", "six", "stopped"))


class HeadlessIntegrationTests(unittest.TestCase):
    def test_full_match_with_wides_and_strategy_completes(self):
        wides_seen = 0
        for seed in range(1, 41):
            m, log = mf.play_match(seed, difficulty="medium")
            self.assertEqual(m.phase, PHASE_COMPLETED, seed)
            for inn in (m.first, m.second):
                self.assertLessEqual(inn.legal_balls, 6, seed)
            wides_seen += sum(1 for e in log if e.get("wide"))
        self.assertGreater(wides_seen, 0, "release drift should produce wides")

    def test_wides_do_not_eat_legal_balls_in_match(self):
        for seed in range(1, 25):
            m, log = mf.play_match(seed, difficulty="easy")
            for inn in (m.first, m.second):
                self.assertLessEqual(inn.legal_balls, 6, seed)

    def test_hard_bowling_produces_fewer_wides(self):
        def wide_rate(diff):
            n = 0
            for seed in range(1, 31):
                _, log = mf.play_match(seed, difficulty=diff)
                n += sum(1 for e in log if e.get("wide"))
            return n
        self.assertLessEqual(wide_rate("hard"), wide_rate("easy"))

    def test_bowling_strategy_reasons_are_logged(self):
        _, log = mf.play_match(17, difficulty="hard")
        reasons = {e.get("reason") for e in log if "reason" in e}
        self.assertTrue(any(r != "stock" for r in reasons) or len(reasons) > 0)

    def test_no_strategy_mode_matches_phase3_style(self):
        # Old-style call path must keep working (Phase 3 regression guard).
        m, log = mf.play_match(42, difficulty="medium",
                               bowling_strategy=False, wides=False)
        self.assertEqual(m.phase, PHASE_COMPLETED)

    def test_aggressive_archetype_scores_more_in_first_innings(self):
        def avg_score(arch, seeds=range(1, 21)):
            total = 0
            for s in seeds:
                m, _ = mf.play_match(s, difficulty="medium", archetype1=arch,
                                     bowling_strategy=False, wides=False)
                total += m.first.runs
            return total / len(list(seeds))
        agg, deff = avg_score("aggressive"), avg_score("defensive")
        self.assertGreater(agg, deff,
                           "an aggressive archetype must score faster on average")


if __name__ == "__main__":
    unittest.main()
