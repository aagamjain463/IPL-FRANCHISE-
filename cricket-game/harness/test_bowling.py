"""Tests for the Phase 2 bowling system and shot-outcome resolver."""

import math
import random
import unittest

import batting_reference as br
import bowling_reference as bw


def swing_at_offset(eng, offset, intent="normal", shot_dir=br.Vec2(0, 1),
                    strength=1.0, dt=1.0 / 240.0):
    """Runs the engine until the swing must be committed so that the bat
    arrives `offset` seconds after (+ late) / before (- early) the ball."""
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


class DeliveryFactoryTests(unittest.TestCase):
    def test_all_types_produce_valid_deliveries(self):
        rng = random.Random(42)
        for dtype in bw.DELIVERY_TYPES:
            spec = bw.DELIVERY_SPECS[dtype]
            for _ in range(50):
                d = bw.build_delivery(dtype, rng, accuracy=0.75)
                self.assertEqual(d.dtype, dtype)
                self.assertGreaterEqual(d.speed_kph, spec["speed"][0] - 6.0)
                self.assertLessEqual(d.speed_kph, spec["speed"][1] + 6.0)
                self.assertTrue(-1.25 <= d.line <= 1.25, (dtype, d.line))
                self.assertTrue(0.0 <= d.length <= 1.0, (dtype, d.length))
                traj = br.Trajectory(d)
                self.assertGreater(traj.height_at_contact, 0.0)
                self.assertLess(traj.time_to_contact, 1.6)
                self.assertGreater(traj.time_to_contact, 0.3)

    def test_factory_is_seeded_deterministic(self):
        a = [bw.build_delivery("good_length", random.Random(7 + i)) for i in range(5)]
        b = [bw.build_delivery("good_length", random.Random(7 + i)) for i in range(5)]
        for da, db in zip(a, b):
            self.assertEqual(da.speed_kph, db.speed_kph)
            self.assertEqual(da.line, db.line)
            self.assertEqual(da.length, db.length)
            self.assertEqual(da.seam, db.seam)

    def test_type_distribution_follows_plan(self):
        rng = random.Random(99)
        counts = {t: 0 for t in bw.DELIVERY_TYPES}
        n = 20000
        for _ in range(n):
            counts[bw.next_delivery_type(rng)] += 1
        total = sum(bw.DEFAULT_PLAN.values())
        for dtype, weight in bw.DEFAULT_PLAN.items():
            frac = counts[dtype] / n
            self.assertAlmostEqual(frac, weight / total, delta=0.02)

    def test_yorker_is_very_full_and_low(self):
        rng = random.Random(3)
        for _ in range(20):
            d = bw.build_delivery("yorker", rng, accuracy=1.0)
            traj = br.Trajectory(d)
            self.assertLess(d.length, 0.09)
            self.assertLess(traj.height_at_contact, 0.45)

    def test_bouncer_rears_up(self):
        rng = random.Random(3)
        for _ in range(20):
            d = bw.build_delivery("bouncer", rng)
            traj = br.Trajectory(d)
            self.assertGreater(traj.height_at_contact, 1.05)

    def test_inswinger_moves_in_outswinger_moves_away(self):
        rng = random.Random(5)
        for _ in range(20):
            din = bw.build_delivery("fast_inswinger", rng)
            self.assertLess(din.swing, -0.4)   # into the right-hander
            dout = bw.build_delivery("fast_outswinger", random.Random(rng.random() * 1e9))
            self.assertGreater(dout.swing, 0.4)


class TrajectoryExtensionTests(unittest.TestCase):
    def test_phase1_parity_is_preserved_with_defaults(self):
        # Values pinned in the Phase 1 mirror (and the JS smoke test).
        cases = [
            (br.Delivery.full(), 0.6535551952837141, 0.6087873249815771, True),
            (br.Delivery.good(), 0.6212024844720497, 0.5792770186335404, False),
            (br.Delivery.short(), 0.5918530824140169, 0.5524306294613888, False),
        ]
        for d, tts, ttc, hits in cases:
            traj = br.Trajectory(d)
            self.assertAlmostEqual(traj.time_to_stumps, tts, places=9)
            self.assertAlmostEqual(traj.time_to_contact, ttc, places=9)
            self.assertEqual(traj.hits_stumps(), hits)

    def test_seam_deflects_post_bounce_line(self):
        base = br.Trajectory(br.Delivery(126, 0.0, 0.52, 0.0, seam=0.0))
        seamed = br.Trajectory(br.Delivery(126, 0.0, 0.52, 0.0, seam=0.6))
        self.assertAlmostEqual(base.x_at_contact, 0.0, places=6)
        # 0.6 of seam over ~0.2 s of post-bounce flight drifts a hand's width.
        self.assertTrue(0.05 < seamed.x_at_contact - base.x_at_contact < 0.30)
        self.assertLess(br.Trajectory(br.Delivery(126, 0, 0.52, 0, seam=-0.6)).x_at_contact, 0)

    def test_bounce_multiplier_changes_height_not_timing_much(self):
        low = br.Trajectory(br.Delivery(130, 0, 0.8, 0, bounce=0.85))
        high = br.Trajectory(br.Delivery(130, 0, 0.8, 0, bounce=1.25))
        self.assertLess(low.height_at_contact, high.height_at_contact)
        self.assertAlmostEqual(low.time_to_contact, high.time_to_contact, delta=0.001)

    def test_pitch_pace_factor_slows_the_ball_after_bounce(self):
        normal = br.Trajectory(br.Delivery.good())
        slow = br.Trajectory(br.Delivery.good(), br.Pitch(pace_factor=0.88))
        self.assertGreater(slow.time_to_contact, normal.time_to_contact)
        batting = br.Trajectory(br.Delivery.good(), br.Pitch(bounce_energy=1.15))
        self.assertGreater(batting.height_at_contact, normal.height_at_contact)

    def test_engine_fires_bounce_event_once(self):
        eng = br.Engine(seed=1)
        bounces = []
        eng.on_bounce = lambda pos: bounces.append(pos)
        eng.begin_delivery(br.Delivery.good())
        t = 0.0
        while t < 2.0:
            eng.update(1.0 / 120.0)
            t += 1.0 / 120.0
        self.assertEqual(len(bounces), 1)
        self.assertAlmostEqual(bounces[0][2], eng.traj.bounce_z, places=4)


class OutcomeResolverTests(unittest.TestCase):
    def _engine_with_swing(self, delivery, offset, intent="normal",
                           shot_dir=br.Vec2(0, 1), strength=1.0, foot=(0.0, 0.0)):
        eng = br.Engine(seed=11)
        eng.foot.x, eng.foot.z = foot
        eng.begin_delivery(delivery)
        swing_at_offset(eng, offset, intent, shot_dir, strength)
        return eng

    def test_unstruck_ball_hitting_stumps_with_body_on_line_is_lbw(self):
        eng = br.Engine(seed=2)
        d = br.Delivery(120, 0.0, 0.10, 0.0)  # full, at the stumps
        eng.begin_delivery(d)
        t = 0.0
        while t < 2.0:
            eng.update(1 / 120)
            t += 1 / 120
        traj = eng.traj
        self.assertTrue(traj.hits_stumps())
        out = bw.resolve_outcome(random.Random(1), traj, None, 0.0, 0.0)
        self.assertEqual(out["kind"], "lbw")
        self.assertTrue(out["wicket"])
        self.assertEqual(out["runs"], 0)

    def test_unstruck_ball_hitting_stumps_off_line_is_bowled(self):
        traj = br.Trajectory(br.Delivery(120, 0.0, 0.10, 0.0))
        # Batter has shuffled well outside the line.
        out = bw.resolve_outcome(random.Random(1), traj, None, 0.8, 0.0)
        self.assertEqual(out["kind"], "bowled")
        self.assertTrue(out["wicket"])

    def test_lbw_can_be_disabled(self):
        traj = br.Trajectory(br.Delivery(120, 0.0, 0.10, 0.0))
        out = bw.resolve_outcome(random.Random(1), traj, None, 0.0, 0.0,
                                 lbw_enabled=False)
        self.assertEqual(out["kind"], "bowled")

    def test_left_alone_and_beaten_are_dots(self):
        wide = br.Trajectory(br.Delivery(126, 0.9, 0.52, 0.0))
        out = bw.resolve_outcome(random.Random(1), wide, None, 0.0, 0.0)
        self.assertEqual(out["kind"], "leave")
        self.assertEqual(out["runs"], 0)
        swung = {"will_contact": False, "contact": None}
        out2 = bw.resolve_outcome(random.Random(1), wide, swung, 0.0, 0.0)
        self.assertEqual(out2["kind"], "beaten")

    def test_perfect_normal_drive_scores_but_not_always_boundary(self):
        d = br.Delivery(124, 0.05, 0.30, 0.0)
        boundary = 0
        runs_total = 0
        n = 300
        for seed in range(n):
            eng = br.Engine(seed=seed)
            eng.begin_delivery(d)
            swing_at_offset(eng, 0.0, intent="normal", strength=1.0)
            self.assertTrue(eng.contact_will_happen, seed)
            out = bw.resolve_outcome(random.Random(seed), eng.traj,
                                     eng.last_swing, eng.foot.x, eng.foot.z)
            runs_total += out["runs"]
            if out["kind"] in ("four", "six"):
                boundary += 1
        self.assertGreater(runs_total, 1.3 * n)        # a perfect drive scores
        self.assertLess(boundary, 0.10 * n)            # controlled, not slogged

    def test_perfect_aggressive_drive_finds_the_rope_regularly(self):
        d = br.Delivery(124, 0.05, 0.30, 0.0)
        boundary = 0
        n = 200
        for seed in range(n):
            eng = br.Engine(seed=seed)
            eng.begin_delivery(d)
            swing_at_offset(eng, 0.0, intent="aggressive", strength=1.0)
            if not eng.contact_will_happen:
                continue
            out = bw.resolve_outcome(random.Random(seed), eng.traj,
                                     eng.last_swing, eng.foot.x, eng.foot.z)
            if out["kind"] in ("four", "six"):
                boundary += 1
        self.assertGreater(boundary, 0.15 * n)
        self.assertLess(boundary, n)                    # never guaranteed

    def test_perfect_lofted_aggressive_can_clear_the_rope(self):
        d = br.Delivery(124, 0.05, 0.30, 0.0)
        sixes = 0
        for seed in range(100):
            eng = br.Engine(seed=seed)
            eng.begin_delivery(d)
            swing_at_offset(eng, 0.0, intent="lofted", strength=1.0)
            if not eng.contact_will_happen:
                continue
            out = bw.resolve_outcome(random.Random(seed), eng.traj,
                                     eng.last_swing, eng.foot.x, eng.foot.z)
            if out["kind"] == "six":
                sixes += 1
        self.assertGreater(sixes, 30)

    def test_late_timing_raises_edge_chance(self):
        d = br.Delivery(132, 0.2, 0.5, 0.0)

        def edge_rate(offset, n=400):
            edges = 0
            for seed in range(n):
                eng = br.Engine(seed=seed)
                eng.begin_delivery(d)
                swing_at_offset(eng, offset, intent="normal")
                rep = eng.last_swing
                if rep and rep["contact"] and rep["contact"]["outcome"] == "edge":
                    edges += 1
            return edges / n

        late = edge_rate(0.12)
        perfect = edge_rate(0.0)
        self.assertGreater(late, perfect * 2.0)

    def test_yorker_with_bad_footwork_never_easy(self):
        # No footwork, lofted intent at a yorker: awkward poke territory only.
        outcomes = []
        for seed in range(100):
            eng = br.Engine(seed=seed)
            eng.begin_delivery(br.Delivery(140, 0.05, 0.03, 0.0))
            swing_at_offset(eng, 0.0, intent="lofted")
            rep = eng.last_swing
            if rep is None:
                continue
            outcomes.append(rep)
            if rep["will_contact"]:
                self.assertLess(rep["contact"]["quality"], 0.75)
        self.assertGreater(len(outcomes), 50)

    def test_short_ball_on_front_foot_is_awkward(self):
        eng = br.Engine(seed=4)
        eng.begin_delivery(br.Delivery(136, -0.3, 0.9, 0.0))
        eng.foot.z = 0.5  # committed forward
        swing_at_offset(eng, 0.0, intent="aggressive", shot_dir=br.Vec2(-0.7, 0.7))
        self.assertTrue(eng.last_swing["selection"]["awkward"])

    def test_edge_kind_classification(self):
        traj = br.Trajectory(br.Delivery(130, 0.2, 0.5, 0.0))
        top = {"will_contact": True,
               "contact": {"outcome": "edge", "exit_kph": 60.0, "elevation": 34.0,
                           "direction": (0.9, 0.5, -0.1), "quality": 0.2}}
        self.assertEqual(bw.resolve_outcome(random.Random(1), traj, top, 0, 0)["kind"],
                         "top_edge")
        inside = {"will_contact": True,
                  "contact": {"outcome": "edge", "exit_kph": 55.0, "elevation": 10.0,
                              "direction": (-0.9, 0.2, 0.3), "quality": 0.2}}
        self.assertEqual(bw.resolve_outcome(random.Random(1), traj, inside, 0, 0)["kind"],
                         "inside_edge")
        outside = {"will_contact": True,
                   "contact": {"outcome": "edge", "exit_kph": 55.0, "elevation": 10.0,
                               "direction": (0.9, 0.2, 0.3), "quality": 0.2}}
        self.assertEqual(bw.resolve_outcome(random.Random(1), traj, outside, 0, 0)["kind"],
                         "outside_edge")

    def test_force_outcome_override(self):
        traj = br.Trajectory(br.Delivery.good())
        out = bw.resolve_outcome(random.Random(1), traj, None, 0, 0, force="six")
        self.assertEqual(out["kind"], "six")
        self.assertEqual(out["runs"], 6)
        out2 = bw.resolve_outcome(random.Random(1), traj, None, 0, 0, force="bowled")
        self.assertTrue(out2["wicket"])

    def test_carry_physics_sanity(self):
        # 100 kph at 38 deg must fly over 60 m.
        carry = bw.predict_carry(100.0, 38.0, 0.9)
        self.assertGreater(carry["carry"], 60.0)
        # A dapper at 40 kph dies inside 12 m.
        dapper = bw.predict_carry(40.0, 8.0, 0.9)
        self.assertLess(dapper["carry"] + 12.0, 25.0)


class FullOverSoakTest(unittest.TestCase):
    def test_random_batter_soak_produces_cricket_like_distribution(self):
        rng = random.Random(2026)
        counts = {}
        runs = 0
        balls = 0
        wickets = 0
        for _ in range(2500):
            dtype = bw.next_delivery_type(rng)
            d = bw.build_delivery(dtype, rng, accuracy=0.75)
            eng = br.Engine(seed=rng.randrange(1 << 30))
            eng.begin_delivery(d)
            # Imperfect bot: random timing (sometimes hopeless), random intent,
            # footwork that is only sometimes in the right place.
            foot_x = rng.choice([0.0, 0.0, 0.0, 0.35, -0.35, 0.6, -0.6])
            eng.foot.x = foot_x
            if rng.random() < 0.08:
                eng.last_swing = None  # leaves the ball entirely
            else:
                r = rng.random()
                if r < 0.12:
                    offset = 0.24 + rng.random() * 0.12   # hopeless late hack
                else:
                    offset = (rng.random() * 2 - 1) * 0.16
                intent = rng.choice(["defensive", "normal", "normal",
                                     "aggressive", "lofted"])
                swing_at_offset(eng, offset, intent=intent,
                                shot_dir=br.Vec2(rng.random() * 2 - 1, 1.0),
                                strength=0.4 + 0.6 * rng.random())
            out = bw.resolve_outcome(rng, eng.traj, eng.last_swing,
                                     eng.foot.x, eng.foot.z)
            counts[out["kind"]] = counts.get(out["kind"], 0) + 1
            runs += out["runs"]
            balls += 1
            if out["wicket"]:
                wickets += 1

        self.assertGreaterEqual(len(counts), 8)              # variety of outcomes
        strike_rate = 100.0 * runs / balls
        self.assertTrue(50 < strike_rate < 200, strike_rate)  # cricket-like
        wicket_pct = 100.0 * wickets / balls
        self.assertTrue(2 < wicket_pct < 30, wicket_pct)
        boundary_pct = 100.0 * (counts.get("four", 0) + counts.get("six", 0)) / balls
        # A random-hack bot rarely lines up intent+timing; a skilled player
        # (tested above) clears the rope regularly.
        self.assertTrue(1.0 < boundary_pct < 45, boundary_pct)


if __name__ == "__main__":
    unittest.main()
