"""Phase 2 verification: delivery variety, swing/seam movement, believable
edges (thin/thick + movement), footwork punishability, outcome reliability,
catch grading in the fielding sim, running resolution, and AI difficulty.

Run:  python3 harness/test_phase2.py   (from cricket-game/)

These tests are ADDITIVE: they verify the Phase 2 feel systems on top of the
Phase 1 parity pins already covered by test_batting / test_bowling. Nothing
here weakens an existing test.
"""

import math
import random
import unittest

import batting_reference as br
import bowling_reference as bw
import fielding_reference as fw
import ai_reference as ai


def swing_at_offset(eng, offset, intent="normal", shot_dir=br.Vec2(0, 1),
                    strength=1.0, dt=1.0 / 240.0):
    """Runs the engine until the bat arrives `offset` seconds after the ball."""
    windup = br.windup_time(intent)
    target = eng.traj.time_to_contact + offset - windup
    t = 0.0
    fired = False
    while t < 4.0:
        fire = (not fired) and t >= target
        eng.update(dt, swing=fire, shot_dir=shot_dir, swipe_strength=strength,
                   intent=intent)
        if fire:
            fired = True
        t += dt
        if eng.passed_reported or eng.contact_will_happen:
            break
    return eng


# =============================================================================
# 1. Delivery system: distinct, physical, labelled correctly (spec sections 1-2)
# =============================================================================

class DeliverySystemTests(unittest.TestCase):
    def test_every_type_carries_the_required_parameters(self):
        for dtype in bw.DELIVERY_TYPES:
            spec = bw.DELIVERY_SPECS[dtype]
            for key in ("speed", "line", "length", "swing", "seam", "bounce"):
                self.assertIn(key, spec, (dtype, key))

    def test_length_types_are_physically_ordered(self):
        # Build each stock length type accurately and check the pitch point and
        # contact height really differ - a yorker must NOT behave like a
        # bouncer and a short ball must NOT behave like a full ball.
        rng = random.Random(21)
        order = ("yorker", "full_ball", "good_length", "short_ball", "bouncer")
        for _ in range(25):
            prev_len = -1.0
            prev_bounce_z = -1.0
            prev_height = -1.0
            for dtype in order:
                d = bw.build_delivery(dtype, rng, accuracy=1.0)
                traj = br.Trajectory(d)
                self.assertGreater(d.length, prev_len, (dtype, d.length))
                self.assertGreater(traj.bounce_z, prev_bounce_z, dtype)
                self.assertGreater(traj.height_at_contact, prev_height, dtype)
                prev_len, prev_bounce_z = d.length, traj.bounce_z
                prev_height = traj.height_at_contact

    def test_yorker_is_very_low_bouncer_rears_up(self):
        rng = random.Random(3)
        for _ in range(20):
            yorker = bw.build_delivery("yorker", rng, accuracy=1.0)
            self.assertLess(br.Trajectory(yorker).height_at_contact, 0.45)
            bouncer = bw.build_delivery("bouncer", rng, accuracy=1.0)
            self.assertGreater(br.Trajectory(bouncer).height_at_contact, 1.05)

    def test_swing_types_move_in_opposite_directions(self):
        rng = random.Random(5)
        for _ in range(20):
            ins = bw.build_delivery("fast_inswinger", rng, accuracy=1.0)
            out = bw.build_delivery("fast_outswinger", rng, accuracy=1.0)
            self.assertLess(ins.swing, -0.4, "inswinger must move in (leg)")
            self.assertGreater(out.swing, 0.4, "outswinger must move away (off)")

    def test_cutters_and_slower_ball_change_character(self):
        rng = random.Random(6)
        off = bw.build_delivery("off_cutter", rng, accuracy=1.0)
        leg = bw.build_delivery("leg_cutter", rng, accuracy=1.0)
        slow = bw.build_delivery("slower_ball", rng, accuracy=1.0)
        fast = bw.build_delivery("fast_straight", rng, accuracy=1.0)
        self.assertGreater(off.seam, 0.25, "off-cutter seams away")
        self.assertLess(leg.seam, -0.25, "leg-cutter seams in")
        self.assertLess(slow.speed_kph, fast.speed_kph - 12.0, "slower ball is pace off")

    def test_bounce_location_matches_length(self):
        # The pitch point is an analytic function of length, so a delivery's
        # length always lands where the batter expects it.
        for length in (0.0, 0.25, 0.5, 0.75, 1.0):
            d = br.Delivery(126, 0.0, length, 0.0)
            traj = br.Trajectory(d)
            self.assertAlmostEqual(traj.bounce_z, 1.6 + 9.2 * length, places=6)


# =============================================================================
# 2. Swing & seam: trajectory, contact, edges (spec sections 3-4)
# =============================================================================

class SwingSeamTests(unittest.TestCase):
    def test_swing_arcs_flight_but_lands_on_the_line(self):
        flat = br.Trajectory(br.Delivery(125, 0.0, 0.5, 0.0))
        swing = br.Trajectory(br.Delivery(125, 0.0, 0.5, 0.8))
        # In the air the path bends...
        pa = flat.position(flat.t1 * 0.5)
        pb = swing.position(swing.t1 * 0.5)
        self.assertGreater(abs(pa[0] - pb[0]), 0.15)
        # ...but it still pitches on the delivery's line (no teleporting).
        bounce_flat = flat.position(flat.t1)
        bounce_swing = swing.position(swing.t1)
        self.assertAlmostEqual(bounce_flat[0], 0.0, places=6)
        self.assertAlmostEqual(bounce_swing[0], 0.0, places=6)
        self.assertAlmostEqual(bounce_swing[2], swing.bounce_z, places=4)

    def test_seam_moves_the_contact_point(self):
        base = br.Trajectory(br.Delivery(126, 0.0, 0.52, 0.0, seam=0.0))
        away = br.Trajectory(br.Delivery(126, 0.0, 0.52, 0.0, seam=0.6))
        into = br.Trajectory(br.Delivery(126, 0.0, 0.52, 0.0, seam=-0.6))
        self.assertGreater(away.x_at_contact, base.x_at_contact + 0.05)
        self.assertLess(into.x_at_contact, base.x_at_contact - 0.05)

    def test_swing_and_seam_stay_believable(self):
        # Movement must never teleport the ball a ridiculous distance.
        rng = random.Random(9)
        for _ in range(200):
            d = bw.build_delivery("fast_outswinger", rng, accuracy=0.75)
            traj = br.Trajectory(d)
            self.assertLess(abs(traj.x_at_contact), 1.0,
                            "post-bounce lateral movement must stay believable")


# =============================================================================
# 3. Timing: six tiers + probability (not guarantee) (spec section 5)
# =============================================================================

class TimingTests(unittest.TestCase):
    def test_six_timing_tiers_classify_exactly(self):
        cases = [
            (0.00, "perfect"), (0.03, "perfect"), (0.06, "good"),
            (-0.12, "early"), (0.12, "late"),
            (-0.22, "very_early"), (0.22, "very_late"),
            (0.30, "missed"), (-0.30, "missed"),
        ]
        for off, expected in cases:
            self.assertEqual(br.timing_classify(off), expected, off)

    def test_perfect_improves_probability_never_guarantees(self):
        d = br.Delivery(124, 0.05, 0.30, 0.0)

        def runs_and_boundaries(offset, intent, n=200):
            total = 0
            boundaries = 0
            for seed in range(n):
                eng = br.Engine(seed=seed)
                eng.begin_delivery(d)
                swing_at_offset(eng, offset, intent=intent, strength=1.0)
                if not eng.contact_will_happen:
                    continue
                out = bw.resolve_outcome(random.Random(seed), eng.traj,
                                         eng.last_swing, eng.foot.x, eng.foot.z)
                total += out["runs"]
                if out["kind"] in ("four", "six"):
                    boundaries += 1
            return total, boundaries

        # Perfect timing rewards skill over late timing (probability, not luck).
        perfect_runs, _ = runs_and_boundaries(0.0, "aggressive")
        late_runs, _ = runs_and_boundaries(0.12, "aggressive")
        self.assertGreater(perfect_runs, late_runs * 1.2)
        self.assertGreater(perfect_runs, 0)

        # On a balanced intent, perfect timing scores regularly but NEVER
        # guarantees a boundary.
        normal_runs, normal_boundaries = runs_and_boundaries(0.0, "normal")
        self.assertGreater(normal_runs, 0.5 * 200)
        self.assertLess(normal_boundaries, 0.3 * 200)


# =============================================================================
# 4. Believable edges: movement steering + thin/thick (spec section 11)
# =============================================================================

class MovementEdgeTests(unittest.TestCase):
    def test_outswinger_edges_off_inswinger_edges_leg(self):
        def off_fraction(swing, n=1500):
            off = total = 0
            for seed in range(n):
                d = br.Delivery(132, 0.2, 0.5, swing)
                eng = br.Engine(seed=seed)
                eng.begin_delivery(d)
                swing_at_offset(eng, 0.12, intent="normal")
                c = eng.last_swing["contact"] if (eng.last_swing
                                                  and eng.last_swing["contact"]) else None
                if c and c["outcome"] == "edge":
                    total += 1
                    if c["direction"][0] > 0:
                        off += 1
            return off / total if total else 0.0

        self.assertGreater(off_fraction(0.8), 0.9,
                           "an outswinger's edges fly to the off side")
        self.assertLess(off_fraction(-0.8), 0.1,
                        "an inswinger's edges fly to the leg side")

    def test_movement_edge_bias_is_directional(self):
        # Bat caught by the movement (late on away, early on in) -> more edges.
        self.assertGreater(br.movement_edge_bias(0.12, 0.8, 0.0), 0.0)
        self.assertGreater(br.movement_edge_bias(-0.12, -0.8, 0.0), 0.0)
        # Bat meeting the movement -> fewer edges.
        self.assertLess(br.movement_edge_bias(-0.12, 0.8, 0.0), 0.0)
        self.assertLess(br.movement_edge_bias(0.12, -0.8, 0.0), 0.0)
        # Perfect timing or no movement -> no adjustment.
        self.assertEqual(br.movement_edge_bias(0.0, 0.8, 0.0), 0.0)
        self.assertEqual(br.movement_edge_bias(0.12, 0.0, 0.0), 0.0)

    def test_movement_increases_edge_rate_when_bat_is_caught(self):
        def edge_rate(swing, n=3000):
            edges = 0
            for seed in range(n):
                d = br.Delivery(132, 0.2, 0.5, swing)
                eng = br.Engine(seed=seed)
                eng.begin_delivery(d)
                swing_at_offset(eng, 0.12, intent="normal")
                c = eng.last_swing["contact"] if (eng.last_swing
                                                  and eng.last_swing["contact"]) else None
                if c and c["outcome"] == "edge":
                    edges += 1
            return edges / n
        with_move = edge_rate(0.8)
        straight = edge_rate(0.0)
        self.assertGreater(with_move, straight * 1.05,
                           "a moving ball should edge the late bat more often")


class ThinThickEdgeTests(unittest.TestCase):
    def _edges(self, delivery, reach, offset, n=3000):
        exits, elevs = [], []
        for seed in range(n):
            d = delivery
            shot = {"kind": "cover_drive", "name": "Cover Drive", "lofted": False,
                    "awkward": False, "base_power": 0.68, "base_loft": 6.0}
            direction = {"direction": br.Vec2(0, 1), "angle": 0.0,
                         "reach": reach, "gap": 0.0, "has_direction": True}
            c = br.resolve_contact(random.Random(seed), d, shot, direction,
                                   offset, "early" if offset < 0 else "late", 1.0)
            if c["outcome"] == "edge":
                exits.append(c["exit_kph"])
                elevs.append(c["elevation"])
        return exits, elevs

    def test_thin_edges_loop_slow_thick_edges_skim_fast(self):
        thin = self._edges(br.Delivery(132, 0.2, 0.5, 0.0), reach=1.0, offset=0.06)
        thick = self._edges(br.Delivery(132, 0.2, 0.5, 0.8), reach=0.3, offset=0.12)
        self.assertGreater(len(thin[0]), 50, "thin edges must occur")
        self.assertGreater(len(thick[0]), 50, "thick edges must occur")
        self.assertGreater(sum(thick[0]) / len(thick[0]),
                           sum(thin[0]) / len(thin[0]) + 10.0,
                           "thick edges fly faster than thin edges")
        self.assertGreater(sum(thin[1]) / len(thin[1]),
                           sum(thick[1]) / len(thick[1]) + 5.0,
                           "thin edges loop higher than thick edges")


# =============================================================================
# 5. Footwork punishability (spec section 6)
# =============================================================================

class FootworkTests(unittest.TestCase):
    def test_wrong_foot_raises_edge_rate(self):
        def edge_rate(foot_z, delivery, intent, n=2000):
            edges = 0
            for seed in range(n):
                eng = br.Engine(seed=seed)
                eng.foot.z = foot_z
                eng.begin_delivery(delivery)
                swing_at_offset(eng, 0.0, intent=intent)
                c = eng.last_swing["contact"] if (eng.last_swing
                                                  and eng.last_swing["contact"]) else None
                if c and c["outcome"] == "edge":
                    edges += 1
            return edges / n

        short = br.Delivery(136, -0.3, 0.9, 0.0)
        back = edge_rate(-0.5, short, "aggressive")
        front = edge_rate(0.5, short, "aggressive")
        self.assertGreater(front, back * 1.3,
                           "playing short balls on the front foot must edge more")

        full = br.Delivery(120, 0.05, 0.20, 0.0)
        front_full = edge_rate(0.5, full, "normal")
        back_full = edge_rate(-0.5, full, "normal")
        self.assertGreater(back_full, front_full * 1.3,
                           "playing full balls on the back foot must edge more")

    def test_poor_reach_causes_misses(self):
        wide = br.Delivery(126, 0.85, 0.5, 0.0)
        rooted = br.Engine(seed=31)
        rooted.begin_delivery(wide)
        swing_at_offset(rooted, 0.0, intent="normal")
        moved = br.Engine(seed=31)
        moved.foot.x = 0.28
        moved.begin_delivery(wide)
        swing_at_offset(moved, 0.0, intent="normal")
        # Moving onto the ball's line meaningfully improves reach.
        self.assertGreater(moved.last_swing["direction"]["reach"],
                           rooted.last_swing["direction"]["reach"] + 0.25)


# =============================================================================
# 6. Outcome reliability: boundaries, running, no double scoring (spec 10-15)
# =============================================================================

class OutcomeReliabilityTests(unittest.TestCase):
    def _shoot(self, exit_kph, elev_deg, angle_deg, seed=0, scale=1.0):
        e = math.radians(elev_deg)
        a = math.radians(angle_deg)
        v = exit_kph / 3.6
        vel = (math.sin(a) * math.cos(e) * v, math.sin(e) * v,
               math.cos(a) * math.cos(e) * v)
        return fw.simulate_fielding((0.1, 0.9, 0.35), vel,
                                    fw.default_field(scale), random.Random(seed))

    def test_four_reaches_the_rope_after_bouncing(self):
        r = self._shoot(104, 7, 30)
        self.assertEqual(r["kind"], "four")
        self.assertEqual(r["runs"], 4)

    def test_six_clears_the_rope_without_bouncing(self):
        r = self._shoot(108, 40, 0)
        self.assertEqual(r["kind"], "six")
        self.assertEqual(r["runs"], 6)

    def test_no_duplicate_or_out_of_range_scoring(self):
        rng = random.Random(2026)
        kinds = set()
        for _ in range(4000):
            sp = rng.uniform(10, 55)
            el = rng.uniform(-5, 55)
            ang = rng.uniform(-1.4, 1.4)
            e, a = math.radians(el), ang
            v = sp
            vel = (math.sin(a) * math.cos(e) * v, math.sin(e) * v,
                   math.cos(a) * math.cos(e) * v)
            r = fw.simulate_fielding((rng.uniform(-1, 1), 0.9, 0.35), vel,
                                     fw.default_field(rng.uniform(0.75, 1.2)), rng)
            kinds.add(r["kind"])
            self.assertIn(r["runs"], (0, 1, 2, 3, 4, 6),
                          "runs must be exactly a legal cricket score")
            if r["kind"] == "caught":
                self.assertEqual(r["runs"], 0, "a catch is a wicket, never runs")
        self.assertGreaterEqual(len(kinds), 3, "a variety of outcomes must occur")

    def test_running_produces_zero_through_three(self):
        # Ground balls with different weights must be capable of 0, 1, 2 and 3.
        runs_seen = set()
        rng = random.Random(7)
        for _ in range(1500):
            sp = rng.uniform(14, 30)
            ang = rng.uniform(-1.3, 1.3)
            vel = (math.sin(ang) * sp, 0.0, math.cos(ang) * sp)
            r = fw.simulate_fielding((rng.uniform(-1, 1), 0.9, 0.35), vel,
                                     fw.default_field(rng.uniform(0.75, 1.2)), rng)
            if r["kind"] == "stopped":
                runs_seen.add(r["runs"])
        self.assertIn(0, runs_seen)
        self.assertIn(1, runs_seen)
        self.assertIn(2, runs_seen)
        self.assertIn(3, runs_seen)


# =============================================================================
# 7. Catch grading inside the fielding sim (spec sections 13, 20)
# =============================================================================

class CatchGradingTests(unittest.TestCase):
    def test_soft_loft_is_caught_far_more_than_hard_flat(self):
        def caught_fraction(vel, n=400):
            caught = 0
            for seed in range(n):
                r = fw.simulate_fielding((0.1, 0.9, 0.35), vel,
                                         fw.default_field(1.0), random.Random(seed))
                if r["kind"] == "caught":
                    caught += 1
            return caught / n

        soft = caught_fraction((8.45, 9.9, 8.8))     # gentle chip to cover
        hard = caught_fraction((14.0, 4.0, 15.0))    # flat hard drive
        self.assertGreater(soft, 0.4, "a gentle loft should be caught regularly")
        self.assertLess(hard, 0.15, "a hard flat drive should rarely be caught")
        self.assertGreater(soft, hard + 0.2)

    def test_grade_bias_penalises_difficult_chances(self):
        self.assertGreater(fw.GRADE_SUCCESS_BIAS["easy"],
                           fw.GRADE_SUCCESS_BIAS["medium"])
        self.assertGreater(fw.GRADE_SUCCESS_BIAS["medium"],
                           fw.GRADE_SUCCESS_BIAS["difficult"])
        self.assertEqual(fw._catch_grade(112.0, 0.8, 2.0), "difficult")
        self.assertEqual(fw._catch_grade(60.0, 1.2, 6.0), "easy")


# =============================================================================
# 8. AI difficulty: better decisions, not direct score (spec sections 16-17)
# =============================================================================

class AiDifficultyTests(unittest.TestCase):
    def test_ai_bowling_accuracy_improves_with_difficulty(self):
        easy = ai.DIFFICULTY_TUNING["easy"]["ai_bowling_acc"]
        medium = ai.DIFFICULTY_TUNING["medium"]["ai_bowling_acc"]
        hard = ai.DIFFICULTY_TUNING["hard"]["ai_bowling_acc"]
        self.assertLess(easy, medium)
        self.assertLess(medium, hard)

    def test_ai_batting_timing_spread_shrinks_with_difficulty(self):
        def mean_abs_offset(diff, n=2500):
            rng = random.Random(1)
            total = 0.0
            for _ in range(n):
                d = bw.build_delivery("good_length", rng, accuracy=1.0)
                ctx = {"target": None, "score": 5, "balls_remaining": 5,
                       "wickets_remaining": 2}
                plan = ai.ai_batting_plan(rng, d, ctx, diff,
                                          hits_stumps_hint=True)
                total += abs(plan["offset"])
            return total / n

        easy = mean_abs_offset("easy")
        medium = mean_abs_offset("medium")
        hard = mean_abs_offset("hard")
        self.assertGreater(easy, medium + 0.005,
                           "easy AI must time worse than medium")
        self.assertGreater(medium, hard + 0.005,
                           "medium AI must time worse than hard")

    def test_ai_batting_reads_match_context(self):
        # A desperate chase must produce far more attacking intent than a safe one.
        def attack_rate(ctx, n=600):
            rng = random.Random(2)
            attacks = 0
            for _ in range(n):
                d = bw.build_delivery("good_length", rng, accuracy=1.0)
                plan = ai.ai_batting_plan(rng, d, ctx, "medium",
                                          hits_stumps_hint=True)
                if plan["swing"] and plan["intent"] in ("aggressive", "lofted"):
                    attacks += 1
            return attacks / n

        safe = attack_rate({"target": 30, "score": 28, "balls_remaining": 5,
                            "wickets_remaining": 2})
        desperate = attack_rate({"target": 30, "score": 5, "balls_remaining": 2,
                                 "wickets_remaining": 2})
        self.assertGreater(desperate, safe * 2.0,
                           "a desperate chase must attack far more than a safe one")


if __name__ == "__main__":
    unittest.main(verbosity=2)
