"""Verification battery for the batting engine (mirrors Core.Tests/BattingEngineTests.cs).

Run:  python3 harness/test_batting.py   (from cricket-game/)
"""

import math
import unittest

from batting_reference import (
    Vec2, Delivery, Trajectory, Footwork, Engine,
    footwork_advance, foot_pose, timing_classify, power_curve, control_curve,
    windup_time, resolve_direction, select_shot, resolve_contact,
    X_MAX, Z_MAX, MAX_W, CONTACT_Z,
)
import batting_reference as br


class TestTrajectory(unittest.TestCase):
    def test_contact_height_follows_length(self):
        f = Trajectory(Delivery.full())
        g = Trajectory(Delivery.good())
        s = Trajectory(Delivery.short())
        self.assertGreater(g.height_at_contact, f.height_at_contact)
        self.assertGreater(s.height_at_contact, g.height_at_contact)
        self.assertGreater(s.bounce_z, g.bounce_z)
        self.assertGreater(g.bounce_z, f.bounce_z)

    def test_position_at_contact(self):
        t = Trajectory(Delivery.good())
        p = t.position(t.time_to_contact)
        self.assertAlmostEqual(p[2], CONTACT_Z, delta=0.01)
        self.assertAlmostEqual(p[1], t.height_at_contact, delta=0.02)
        self.assertGreater(t.time_to_contact, 0.2)
        self.assertLess(t.time_to_contact, 1.4)

    def test_hits_stumps(self):
        straight = Trajectory(Delivery(125, 0.0, 0.15, 0.0))
        wide = Trajectory(Delivery(125, 0.9, 0.15, 0.0))
        self.assertTrue(straight.hits_stumps())
        self.assertFalse(wide.hits_stumps())

    def test_good_length_rises_past_stumps(self):
        good = Trajectory(Delivery(126, 0.0, 0.52, 0.0))
        self.assertFalse(good.hits_stumps())

    def test_bounce_height_ordering(self):
        for length in (0.0, 0.5, 1.0):
            t = Trajectory(Delivery(125, 0, length, 0))
            # ball must actually land before the batter and rise to contact height
            mid = t.position(t.t1)
            self.assertAlmostEqual(mid[1], 0.0, delta=1e-6)

    def test_swing_moves_the_flight_path(self):
        flat = Trajectory(Delivery(125, 0.0, 0.5, 0.0))
        swing = Trajectory(Delivery(125, 0.0, 0.5, 0.8))
        # mid-air x should differ thanks to swing, but bounce lands on the line
        pa = flat.position(flat.t1 * 0.5)
        pb = swing.position(swing.t1 * 0.5)
        self.assertGreater(abs(pa[0] - pb[0]), 0.15)


class TestFootwork(unittest.TestCase):
    def test_smooth_clamped_movement(self):
        f = Footwork()
        last_x = f.x
        for _ in range(300):
            footwork_advance(f, Vec2(1, 1), 1 / 60)
            self.assertGreaterEqual(f.x, last_x - 1e-4)
            last_x = f.x
        self.assertAlmostEqual(f.x, X_MAX, places=3)
        self.assertAlmostEqual(f.z, Z_MAX, places=3)
        self.assertEqual(foot_pose(f), "front")

    def test_poses(self):
        self.assertEqual(foot_pose(Footwork(0, -0.5)), "back")
        self.assertEqual(foot_pose(Footwork(0, 0.6)), "front")
        self.assertEqual(foot_pose(Footwork()), "neutral")


class TestTiming(unittest.TestCase):
    CASES = [
        (0.00, "perfect"), (0.03, "perfect"), (-0.05, "good"),
        (0.12, "late"), (-0.12, "early"), (0.20, "very_late"),
        (-0.22, "very_early"), (0.30, "missed"), (-0.30, "missed"),
    ]

    def test_classification(self):
        for off, expected in self.CASES:
            self.assertEqual(timing_classify(off), expected, off)

    def test_curves_peak_at_zero_and_symmetric(self):
        self.assertAlmostEqual(power_curve(0), 1.0, places=3)
        self.assertAlmostEqual(control_curve(0), 1.0, places=3)
        self.assertAlmostEqual(power_curve(0.1), power_curve(-0.1), places=3)
        self.assertGreater(power_curve(0), power_curve(0.12))
        self.assertGreater(power_curve(0.12), power_curve(0.24))
        self.assertGreater(control_curve(0), control_curve(0.15))

    def test_windup_order(self):
        self.assertLess(windup_time("defensive"), windup_time("normal"))
        self.assertLess(windup_time("normal"), windup_time("aggressive"))
        self.assertLess(windup_time("aggressive"), windup_time("lofted"))


class TestResolver(unittest.TestCase):
    def test_tap_defaults_to_straight(self):
        d = Delivery.good()
        r = resolve_direction(Vec2(0.05, 0.02), 0.1, 0.0, d, Footwork(), 0.0)
        self.assertFalse(r["has_direction"])
        self.assertAlmostEqual(r["angle"], 0.0, places=3)

    def test_swipe_direction_respected(self):
        d = Delivery.good()
        r = resolve_direction(Vec2(1, 0.6), 1.0, 0.0, d, Footwork(), 0.0)
        self.assertTrue(r["has_direction"])
        self.assertGreater(r["angle"], 0.5)

    def test_timing_bends_direction(self):
        d = Delivery.good()
        early = resolve_direction(Vec2(0, 1), 1.0, 0.0, d, Footwork(), -0.12)
        late = resolve_direction(Vec2(0, 1), 1.0, 0.0, d, Footwork(), 0.12)
        self.assertLess(early["angle"], 0)
        self.assertGreater(late["angle"], 0)

    def test_footwork_improves_reach(self):
        wide = Delivery(126, 0.85, 0.5, 0.0)
        t = Trajectory(wide)
        rooted = resolve_direction(Vec2(1, 0.5), 1.0, t.x_at_contact, wide, Footwork(), 0.0)
        moved = resolve_direction(Vec2(1, 0.5), 1.0, t.x_at_contact, wide, Footwork(0.30), 0.0)
        self.assertGreater(moved["reach"], rooted["reach"])


def dir_result(angle, reach):
    return {"direction": Vec2(math.sin(angle), math.cos(angle)),
            "angle": angle, "reach": reach, "gap": 0.0, "has_direction": True}


class TestSelector(unittest.TestCase):
    def test_cover_drive(self):
        sel = select_shot("normal", "front", Delivery.full(), dir_result(0.6, 0.9))
        self.assertEqual(sel["kind"], "cover_drive")
        self.assertFalse(sel["awkward"])

    def test_pull(self):
        sel = select_shot("normal", "back", Delivery.short(), dir_result(-1.2, 0.8))
        self.assertEqual(sel["kind"], "pull")
        self.assertFalse(sel["awkward"])

    def test_defense(self):
        full = select_shot("defensive", "front", Delivery.full(), dir_result(0, 0.9))
        short = select_shot("defensive", "back", Delivery.short(), dir_result(0, 0.9))
        self.assertEqual(full["kind"], "front_foot_defense")
        self.assertEqual(short["kind"], "back_foot_defense")

    def test_lofted_mapping(self):
        st = select_shot("lofted", "front", Delivery.full(), dir_result(0, 0.9))
        leg = select_shot("lofted", "front", Delivery.full(), dir_result(-0.9, 0.8))
        off = select_shot("lofted", "front", Delivery.full(), dir_result(0.9, 0.8))
        self.assertEqual(st["kind"], "lofted_straight")
        self.assertEqual(leg["kind"], "lofted_leg_side")
        self.assertEqual(off["kind"], "lofted_drive")

    def test_awkward_combinations(self):
        cut_full = select_shot("normal", "front", Delivery.full(), dir_result(1.4, 0.9))
        self.assertTrue(cut_full["awkward"])
        self.assertEqual(cut_full["kind"], "awkward_poke")

        short_on_front = select_shot("normal", "front", Delivery.short(), dir_result(-1.0, 0.9))
        self.assertTrue(short_on_front["awkward"])
        self.assertEqual(short_on_front["kind"], "pull")

        full_on_back = select_shot("normal", "back", Delivery.full(), dir_result(0.5, 0.9))
        self.assertTrue(full_on_back["awkward"])

    def test_good_length_squareness(self):
        drive = select_shot("normal", "neutral", Delivery.good(), dir_result(0.6, 0.9))
        square = select_shot("normal", "neutral", Delivery.good(), dir_result(1.4, 0.9))
        self.assertEqual(drive["kind"], "cover_drive")
        self.assertEqual(square["kind"], "square_drive")

    def test_all_shot_kinds_are_named(self):
        # sweep a grid of inputs; every selection must have a name and kind
        for intent in ("normal", "aggressive", "defensive", "lofted"):
            for length in (0.05, 0.5, 0.9):
                for angle in (-2.6, -1.2, -0.6, 0.0, 0.6, 1.2, 2.6):
                    for pose in ("front", "neutral", "back"):
                        sel = select_shot(intent, pose, Delivery(125, 0, length, 0),
                                          dir_result(angle, 0.8))
                        self.assertIsNotNone(sel["kind"])
                        self.assertTrue(sel["name"], "missing display name")


class TestContact(unittest.TestCase):
    def make(self, offset, window):
        return dict(
            delivery=Delivery.good(),
            shot={"kind": "cover_drive", "name": "Cover Drive", "lofted": False,
                  "awkward": False, "base_power": 0.68, "base_loft": 6.0},
            direction=dir_result(0.52, 0.9),
            offset=offset, window=window, strength=1.0)

    def hit(self, seed, **kw):
        import random
        m = self.make(kw.pop("offset", 0.0), kw.pop("window", "perfect"))
        for k, v in kw.items():
            if k == "shot":
                m["shot"].update(v)
            elif k == "direction":
                m["direction"].update(v)
            else:
                m[k] = v
        return resolve_contact(random.Random(seed), m["delivery"], m["shot"],
                               m["direction"], m["offset"], m["window"], m["strength"])

    def test_perfect_beats_mistimed(self):
        perfect = self.hit(5, offset=0.0, window="perfect")
        mistimed = self.hit(5, offset=0.15, window="early")
        self.assertEqual(perfect["outcome"], "clean")
        self.assertGreater(perfect["exit_kph"], mistimed["exit_kph"])
        self.assertGreater(perfect["quality"], mistimed["quality"])

    def test_out_ofreach_misses(self):
        r = self.hit(9, offset=0.0, window="perfect", direction={"reach": 0.10})
        self.assertEqual(r["outcome"], "miss")

    def test_defensive_slow_grounded(self):
        r = self.hit(3, offset=0.0, window="perfect",
                     shot={"kind": "front_foot_defense", "base_power": 0.3})
        self.assertEqual(r["outcome"], "defensive_solid")
        self.assertLess(r["exit_kph"], 45)
        self.assertLess(r["elevation"], 10)

    def test_lofted_aerial(self):
        r = self.hit(11, offset=0.0, window="perfect",
                     shot={"lofted": True, "kind": "lofted_straight", "base_power": 0.9})
        self.assertEqual(r["outcome"], "lofted_clean")
        self.assertGreater(r["elevation"], 18)
        self.assertGreater(r["direction"][1], 0.3)

    def test_exit_into_field_and_unit(self):
        r = self.hit(4, offset=0.0, window="perfect")
        self.assertGreater(r["direction"][2], 0.5)
        mag = math.sqrt(sum(c * c for c in r["direction"]))
        self.assertAlmostEqual(mag, 1.0, places=2)

    def test_worse_timing_always_less_power(self):
        # Edge rolls are pure-random; disable them to isolate the timing curve.
        original = br.edge_probability
        br.edge_probability = lambda *a: 0.0
        try:
            import random
            speeds = []
            for off in (0.0, 0.06, 0.12, 0.20):
                r = resolve_contact(random.Random(99), Delivery.good(),
                                    self.make(0, "good")["shot"], dir_result(0.52, 0.9),
                                    off, timing_classify(off), 1.0)
                speeds.append(r["exit_kph"])
            self.assertEqual(speeds, sorted(speeds, reverse=True),
                             "exit speed must degrade monotonically with mistiming")
        finally:
            br.edge_probability = original


class TestEngine(unittest.TestCase):
    def run_until_swing(self, engine, intent="normal", shot_dir=None, strength=1.0):
        shot_dir = shot_dir or Vec2(0.4, 0.9)
        windup = windup_time(intent)
        swing_at = engine.traj.time_to_contact - windup
        dt = 1 / 60
        while engine.t < swing_at - dt / 2:
            engine.update(dt, intent=intent, shot_dir=shot_dir, swipe_strength=strength)
        engine.update(dt, swing=True, intent=intent, shot_dir=shot_dir, swipe_strength=strength)
        return engine.last_swing

    def test_well_timed_swing_contacts(self):
        e = Engine(21)
        e.begin_delivery(Delivery.full())
        rep = self.run_until_swing(e)
        self.assertIsNotNone(rep)
        self.assertTrue(rep["will_contact"])
        self.assertIn(rep["window"], ("perfect", "good"))
        self.assertGreater(rep["contact"]["exit_kph"], 30)

    def test_no_swing_straight_ball_bowled(self):
        e = Engine(22)
        e.begin_delivery(Delivery(125, 0.0, 0.15, 0.0))
        for _ in range(200):
            e.update(1 / 60)
            if e.passed_reports:
                break
        self.assertTrue(e.passed_reports)
        self.assertFalse(e.passed_reports[0]["swung"])
        self.assertTrue(e.passed_reports[0]["hit_stumps"])

    def test_no_swing_wide_left_alone(self):
        e = Engine(23)
        e.begin_delivery(Delivery(125, 0.9, 0.15, 0.0))
        for _ in range(200):
            e.update(1 / 60)
            if e.passed_reports:
                break
        self.assertTrue(e.passed_reports)
        self.assertFalse(e.passed_reports[0]["hit_stumps"])

    def test_very_late_swing_ignored(self):
        e = Engine(24)
        e.begin_delivery(Delivery.good())
        ttc = e.traj.time_to_contact
        t = 0.0
        while t < ttc + 0.05:
            e.update(1 / 60)
            t += 1 / 60
        e.update(1 / 60, swing=True, shot_dir=Vec2(0, 1), swipe_strength=1.0)
        self.assertFalse(e.swing_taken)
        for _ in range(120):
            e.update(1 / 60)
            if e.passed_reports:
                break
        self.assertTrue(e.passed_reports)

    def test_footwork_during_delivery(self):
        e = Engine(25)
        e.begin_delivery(Delivery.good())
        for _ in range(20):
            e.update(1 / 60, footwork_input=Vec2(0, 1))
        self.assertGreater(e.foot.z, 0.3)
        self.assertEqual(foot_pose(e.foot), "front")

    def test_footwork_changes_shot_context(self):
        # A wide off-stump ball: rooted batter is out of reach, moved batter connects.
        wide = Delivery(126, 0.85, 0.5, 0.0)

        e1 = Engine(31)
        e1.begin_delivery(wide)
        rep1 = self.run_until_swing(e1)

        e2 = Engine(31)
        e2.begin_delivery(wide)
        # Place the batter directly onto the ball's line (represents having
        # moved into position). Ball arrives at x=0.38; comfort zone is x+0.10.
        e2.foot.x = 0.28
        e2.foot.vx = 0.0
        rep2 = self.run_until_swing(e2)

        self.assertGreater(rep2["direction"]["reach"], rep1["direction"]["reach"])
        if rep1["will_contact"] and rep2["will_contact"]:
            self.assertGreaterEqual(rep2["contact"]["quality"], rep1["contact"]["quality"])


class TestDistributionSoak(unittest.TestCase):
    def test_random_deliveries_and_inputs_stay_sane(self):
        import random
        rng = random.Random(7)
        contacts = misses = edges = wickets = 0
        exits = []
        for i in range(4000):
            d = Delivery(speed_kph=rng.uniform(95, 145),
                         line=rng.uniform(-0.8, 0.8),
                         length=rng.random(),
                         swing=rng.uniform(-0.6, 0.6))
            e = Engine(i)
            e.begin_delivery(d)
            swing_at = e.traj.time_to_contact - windup_time("normal") \
                + rng.uniform(-0.42, 0.42)
            t = 0.0
            swung = False
            intent = rng.choice(["normal", "aggressive", "defensive", "lofted"])
            while t < e.traj.time_to_stumps + 0.2:
                if not swung and t >= swing_at > 0:
                    e.update(1 / 60, swing=True,
                             footwork_input=Vec2(rng.uniform(-1, 1), rng.uniform(-0.8, 1)),
                             shot_dir=Vec2(rng.uniform(-1, 1), rng.uniform(-1, 1)),
                             swipe_strength=rng.uniform(0.3, 1), intent=intent)
                    swung = True
                else:
                    e.update(1 / 60,
                             footwork_input=Vec2(rng.uniform(-1, 1), rng.uniform(-0.8, 1)),
                             intent=intent)
                t += 1 / 60
                if e.swing_reports and e.swing_reports[-1].get("contact"):
                    break
            if e.swing_reports:
                rep = e.swing_reports[-1]
                if rep["will_contact"]:
                    c = rep["contact"]
                    contacts += 1
                    exits.append(c["exit_kph"])
                    self.assertGreater(c["exit_kph"], 5)
                    self.assertLess(c["exit_kph"], 190)
                    self.assertAlmostEqual(math.sqrt(sum(x * x for x in c["direction"])), 1.0, places=2)
                    if c["outcome"] == "edge":
                        edges += 1
                else:
                    misses += 1
            if e.passed_reports and e.passed_reports[0]["hit_stumps"]:
                wickets += 1
        self.assertGreater(contacts, 1200, "most swings should make some contact")
        self.assertGreater(misses, 100, "bad timing/reach must produce misses")
        self.assertGreater(edges, 50, "edges must happen sometimes")
        avg = sum(exits) / len(exits)
        self.assertGreater(avg, 40)
        self.assertLess(avg, 130)


if __name__ == "__main__":
    unittest.main(verbosity=2)
