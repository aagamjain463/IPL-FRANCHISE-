"""Python reference of CricketGame.Core.Batting (Phase 1 batting engine).

1:1 port of the deterministic math: trajectory, footwork, timing, direction
resolution, contextual shot selection, contact, and the engine loop.
If the C# changes, this must change with it.
"""

import math
import random

GRAVITY = 9.81
RELEASE_HEIGHT = 2.05
RELEASE_Z = 20.1
CONTACT_Z = 0.35
STUMPS_Z = -1.0
STUMP_HALF_WIDTH = 0.18
STUMP_TOP_HEIGHT = 0.72


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


class Vec2:
    def __init__(self, x=0.0, y=0.0):
        self.x, self.y = x, y

    @property
    def magnitude(self):
        return math.hypot(self.x, self.y)

    @staticmethod
    def normalize(v):
        m = v.magnitude
        if m < 1e-5:
            return Vec2(0, 1)
        return Vec2(v.x / m, v.y / m)


# --- delivery ----------------------------------------------------------------

class Delivery:
    """One delivery. Phase 1 fields stay authoritative; Phase 2 adds type,
    seam (post-bounce lateral cut), bounce (vertical energy multiplier) and an
    optional release height. All Phase 2 fields default to Phase 1 behaviour."""

    def __init__(self, speed_kph=125.0, line=0.0, length=0.5, swing=0.0,
                 dtype="fast_straight", seam=0.0, bounce=0.0, release_height=0.0):
        self.speed_kph = speed_kph
        self.line = line
        self.length = length
        self.swing = swing
        self.dtype = dtype
        self.seam = seam          # -1 (into batter) .. +1 (away); 0 = none
        self.bounce = bounce      # <=0 means "use 1.0" (Phase 1 behaviour)
        self.release_height = release_height  # <=0 means "use 2.05"

    @staticmethod
    def full(speed=118.0, line=0.0, swing=0.0):
        return Delivery(speed, line, 0.12, swing)

    @staticmethod
    def good(speed=126.0, line=0.15, swing=0.0):
        return Delivery(speed, line, 0.52, swing)

    @staticmethod
    def short(speed=134.0, line=-0.10, swing=0.0):
        return Delivery(speed, line, 0.88, swing)


class Pitch:
    """Pitch surface parameters. Only 'normal' is tuned for now; the fields
    exist so slower/batting/spinning pitches can be added without API churn."""

    def __init__(self, bounce_energy=1.0, pace_factor=1.0, turn=0.0, name="normal"):
        self.bounce_energy = bounce_energy
        self.pace_factor = pace_factor
        self.turn = turn
        self.name = name


NORMAL_PITCH = Pitch()

SEAM_RATE = 0.9  # m/s of post-bounce lateral drift per unit of seam


class Trajectory:
    def __init__(self, d: Delivery, pitch: Pitch = None):
        if pitch is None:
            pitch = NORMAL_PITCH
        self.delivery = d
        self.pitch = pitch
        length = clamp(d.length, 0, 1)
        line = clamp(d.line, -1.25, 1.25)
        swing = clamp(d.swing, -1.5, 1.5)
        seam = clamp(d.seam, -1.5, 1.5)
        bounce_scale = d.bounce if d.bounce > 0 else 1.0
        release_height = d.release_height if d.release_height > 0 else RELEASE_HEIGHT

        self.release_height = release_height
        self.speed = max(8.0, d.speed_kph / 3.6)
        self.post_speed = self.speed * 0.92 * pitch.pace_factor
        bounce_z = 1.6 + 9.2 * length
        self.bounce_x = line * 0.45
        self.release_x = self.bounce_x - swing * 0.35
        self.swing_amp = swing * 0.65
        self.bounce_z = bounce_z

        self.t1 = (RELEASE_Z - bounce_z) / self.speed
        self.v0y = (0.5 * GRAVITY * self.t1 ** 2 - release_height) / self.t1

        # Restitution bounce: fuller balls skid on lower, shorter balls rear up.
        v_impact = self.v0y - GRAVITY * self.t1  # downward (negative) at pitch
        restitution = 0.78 - 0.20 * length
        self.vy_after = -v_impact * restitution * bounce_scale * pitch.bounce_energy

        t2 = (bounce_z - CONTACT_Z) / self.post_speed
        self.height_at_contact = max(0.05, self.vy_after * t2 - 0.5 * GRAVITY * t2 ** 2)
        # Post-bounce lateral movement: carry-through of swing, seam cut, pitch turn.
        self.vx_after = swing * 0.05 + seam * SEAM_RATE + pitch.turn

        self.time_to_contact = self.t1 + t2
        self.time_to_stumps = self.t1 + (bounce_z - STUMPS_Z) / self.post_speed
        self.x_at_contact = self.bounce_x + self.vx_after * t2
        self.contact_point = (self.x_at_contact, self.height_at_contact, CONTACT_Z)
        self.bounce_time = self.t1

    def position(self, t):
        t = max(0.0, t)
        if t <= self.t1:
            p = t / self.t1
            x = self.release_x + (self.bounce_x - self.release_x) * p \
                + self.swing_amp * math.sin(math.pi * p)
            z = RELEASE_Z - self.speed * t
            y = self.release_height + self.v0y * t - 0.5 * GRAVITY * t * t
            return (x, max(0.0, y), z)
        dt = t - self.t1
        return (self.bounce_x + self.vx_after * dt,
                max(0.0, self.vy_after * dt - 0.5 * GRAVITY * dt * dt),
                self.bounce_z - self.post_speed * dt)

    def at_stumps(self):
        """(x, y) of the ball when it crosses the stump plane."""
        dt = (self.bounce_z - STUMPS_Z) / self.post_speed
        x = self.bounce_x + self.vx_after * dt
        y = self.vy_after * dt - 0.5 * GRAVITY * dt * dt
        return x, y

    def hits_stumps(self):
        x, y = self.at_stumps()
        return abs(x) <= STUMP_HALF_WIDTH and 0 <= y <= STUMP_TOP_HEIGHT


# --- footwork ------------------------------------------------------------------

FOOT_ACCEL, FOOT_DAMP, FOOT_MAX_SPEED = 26.0, 18.0, 3.6
X_MIN, X_MAX, Z_MIN, Z_MAX = -1.15, 1.15, -0.85, 1.35


class Footwork:
    def __init__(self, x=0.0, z=0.0):
        self.x, self.z = x, z
        self.vx, self.vz = 0.0, 0.0


def footwork_advance(f: Footwork, inp: Vec2, dt):
    m = inp.magnitude
    ix, iy = (inp.x / m, inp.y / m) if m > 1 else (inp.x, inp.y)

    def approach(cur, target, max_delta):
        if cur < target:
            return min(cur + max_delta, target)
        return max(cur - max_delta, target)

    f.vx = approach(f.vx, ix * FOOT_MAX_SPEED,
                    (FOOT_ACCEL if abs(ix) > 0.02 else FOOT_DAMP) * dt)
    f.vz = approach(f.vz, iy * FOOT_MAX_SPEED,
                    (FOOT_ACCEL if abs(iy) > 0.02 else FOOT_DAMP) * dt)
    f.x += f.vx * dt
    f.z += f.vz * dt
    if f.x < X_MIN: f.x, f.vx = X_MIN, max(0.0, f.vx)
    if f.x > X_MAX: f.x, f.vx = X_MAX, min(0.0, f.vx)
    if f.z < Z_MIN: f.z, f.vz = Z_MIN, max(0.0, f.vz)
    if f.z > Z_MAX: f.z, f.vz = Z_MAX, min(0.0, f.vz)


def foot_pose(f: Footwork):
    if f.z >= 0.22:
        return "front"
    if f.z <= -0.20:
        return "back"
    return "neutral"


# --- timing --------------------------------------------------------------------

PERFECT_W, GOOD_W, OK_W, MAX_W = 0.035, 0.085, 0.160, 0.260


def windup_time(intent):
    return {"defensive": 0.10, "normal": 0.14, "aggressive": 0.17, "lofted": 0.19}[intent]


def timing_classify(offset):
    a = abs(offset)
    if a > MAX_W:
        return "missed"
    if a <= PERFECT_W:
        return "perfect"
    if a <= GOOD_W:
        return "good"
    if offset < 0:
        return "early" if a <= OK_W else "very_early"
    return "late" if a <= OK_W else "very_late"


def _smooth(x):
    x = clamp(x, 0, 1)
    return x * x * (3 - 2 * x)


def power_curve(offset):
    return 1.0 - 0.85 * _smooth(abs(offset) / MAX_W) if abs(offset) < MAX_W else 0.10


def control_curve(offset):
    return 1.0 - _smooth(abs(offset) / MAX_W) if abs(offset) < MAX_W else 0.0


def edge_probability(abs_offset, reach_quality, ball_speed_kph):
    p = 0.02
    if abs_offset > 0.045:
        p += (abs_offset - 0.045) * 2.4
    p += (1 - reach_quality) * 0.18
    p += clamp((ball_speed_kph - 90) / 150, 0, 1) * 0.06
    return clamp(p, 0.01, 0.55)


def direction_deviation(offset):
    return offset * 1.6


# --- direction resolver ----------------------------------------------------------

MIN_DIR_STRENGTH = 0.25
REACH_FALLOFF = 0.85


def preferred_reach_x(foot_x, line):
    return foot_x + 0.10


def resolve_direction(requested: Vec2, swipe_strength, ball_x_at_contact,
                      delivery: Delivery, foot: Footwork, timing_offset):
    has_direction = requested.magnitude >= MIN_DIR_STRENGTH and swipe_strength > 0.05
    d = Vec2.normalize(requested) if has_direction else Vec2(0, 1)
    angle = math.atan2(d.x, d.y) + direction_deviation(timing_offset)
    gap = ball_x_at_contact - preferred_reach_x(foot.x, delivery.line)
    reach = clamp(1 - abs(gap) / REACH_FALLOFF, 0, 1)
    return {
        "direction": Vec2(math.sin(angle), math.cos(angle)),
        "angle": angle,
        "reach": reach,
        "gap": gap,
        "has_direction": has_direction,
    }


# --- shot selector -----------------------------------------------------------------

def length_zone(length):
    if length < 0.35:
        return "full"
    if length < 0.72:
        return "good"
    return "short"


def is_yorker(length):
    """Extreme fullness: at the toes. Needs front-foot work to dig out."""
    return length < 0.12


def sector_of(angle_rad):
    deg = math.degrees(angle_rad)
    a = abs(deg)
    if a <= 20:
        return "straight"
    if a <= 55:
        return "cover" if deg > 0 else "mid_wicket"
    if a <= 100:
        return "point" if deg > 0 else "square_leg"
    return "third_man" if deg > 0 else "fine_leg"


def select_shot(intent, pose, delivery: Delivery, direction):
    length = length_zone(delivery.length)
    sector = sector_of(direction["angle"])
    square_or_behind = sector in ("point", "square_leg", "third_man", "fine_leg")
    sel = {"kind": None, "name": None, "lofted": False, "awkward": False,
           "base_power": 0.0, "base_loft": 0.0}

    if intent == "defensive":
        if length == "short":
            sel["kind"], sel["name"] = "back_foot_defense", "Back-Foot Defence"
        else:
            sel["kind"], sel["name"] = "front_foot_defense", "Front-Foot Defence"
        sel["base_power"], sel["base_loft"] = 0.30, 2.0
        sel["awkward"] = direction["reach"] < 0.2
        return sel

    if intent == "lofted":
        sel["lofted"], sel["base_power"], sel["base_loft"] = True, 0.90, 30.0
        if length == "short":
            sel["kind"], sel["name"] = "pull", "Lofted Pull"
            sel["awkward"] = pose == "front"
            return sel
        if sector in ("mid_wicket", "square_leg", "fine_leg"):
            sel["kind"], sel["name"] = "lofted_leg_side", "Lofted Leg-Side Shot"
        elif sector == "straight":
            sel["kind"], sel["name"] = "lofted_straight", "Lofted Straight"
        else:
            sel["kind"], sel["name"] = "lofted_drive", "Lofted Drive"
        # Lofting a ball at the toes is a heave, not a real shot.
        sel["awkward"] = (pose == "back" and length == "full") or is_yorker(delivery.length)
        return sel

    sel["base_power"] = 1.0 if intent == "aggressive" else 0.68
    sel["base_loft"] = 12.0 if intent == "aggressive" else 6.0

    if length == "full":
        if pose == "back":
            sel["awkward"] = True
        # A ball at the toes wants the front foot dug in.
        if is_yorker(delivery.length) and pose != "front":
            sel["awkward"] = True
        if square_or_behind:
            sel.update(kind="awkward_poke", name="Awkward Stab", awkward=True)
            sel["base_power"] *= 0.5
            return sel
        if sector == "cover":
            sel["kind"], sel["name"] = "cover_drive", "Cover Drive"
        elif sector in ("mid_wicket", "square_leg", "fine_leg"):
            sel["kind"], sel["name"] = "flick", "Flick"
        else:
            sel["kind"], sel["name"] = "straight_drive", "Straight Drive"
        return sel

    if length == "short":
        if pose == "front":
            sel["awkward"] = True
        if sector in ("cover", "point", "third_man"):
            sel["kind"] = "cut"
            sel["name"] = "Hard Cut" if intent == "aggressive" else "Cut"
        elif sector == "straight":
            if intent == "aggressive":
                sel["kind"], sel["name"] = "pull", "Pull (straight)"
            else:
                sel.update(kind="awkward_poke", name="Awkward Poke", awkward=True)
        else:
            sel["kind"] = "pull"
            sel["name"] = "Pull" if intent == "aggressive" else "Pull Shot"
        return sel

    # good length
    if sector == "cover":
        sel["kind"], sel["name"] = "cover_drive", "Cover Drive"
    elif sector == "point":
        sel["kind"], sel["name"] = "square_drive", "Square Drive"
    elif sector == "third_man":
        sel["kind"], sel["name"] = "cut", "Late Cut"
        sel["awkward"] = pose == "front"
    elif sector == "mid_wicket":
        sel["kind"], sel["name"] = "flick", "Flick"
    elif sector in ("square_leg", "fine_leg"):
        sel["kind"], sel["name"] = "leg_glance", "Leg Glance"
    else:
        sel["kind"], sel["name"] = "straight_drive", "Straight Drive"
    return sel


# --- contact ------------------------------------------------------------------------

def direction_from_angle(angle, elevation_deg):
    e = math.radians(elevation_deg)
    return (math.sin(angle) * math.cos(e), math.sin(e), math.cos(angle) * math.cos(e))


def resolve_contact(rng: random.Random, delivery: Delivery, shot, direction,
                    timing_offset, window, swipe_strength):
    r = {"outcome": None, "exit_kph": 0.0, "direction": (0, 0, 1),
         "elevation": 0.0, "quality": 0.0, "lofted": False}
    abs_off = abs(timing_offset)

    if window == "missed" or direction["reach"] < 0.15:
        r["outcome"] = "miss"
        return r

    if shot["kind"] in ("front_foot_defense", "back_foot_defense"):
        power = power_curve(timing_offset)
        r["outcome"] = "defensive_solid"
        r["quality"] = power * (0.45 + 0.55 * direction["reach"])
        r["exit_kph"] = 14 + 24 * power * shot["base_power"]
        r["elevation"] = 2 + 4 * rng.random()
        r["direction"] = direction_from_angle(-delivery.line * 0.15, r["elevation"])
        return r

    p_edge = edge_probability(abs_off, direction["reach"], delivery.speed_kph)
    if shot["awkward"]:
        p_edge = min(0.7, p_edge * 1.6)
    if rng.random() < p_edge:
        r["outcome"] = "edge"
        r["quality"] = 0.2
        r["exit_kph"] = delivery.speed_kph * (0.42 + 0.25 * rng.random())
        r["elevation"] = 6 + 34 * rng.random()
        r["lofted"] = r["elevation"] > 22
        side = -1 if rng.random() < 0.5 else 1
        angle = side * (1.66 + 0.9 * rng.random())
        r["direction"] = direction_from_angle(angle, r["elevation"])
        return r

    quality = power_curve(timing_offset) \
        * (0.45 + 0.55 * direction["reach"]) \
        * (0.78 + 0.22 * swipe_strength) \
        * (0.60 if shot["awkward"] else 1.0)
    quality = clamp(quality, 0, 1)
    r["quality"] = quality

    if shot["lofted"] and quality >= 0.70:
        r["outcome"] = "lofted_clean"
    elif quality >= 0.80:
        r["outcome"] = "clean"
    elif quality >= 0.55:
        r["outcome"] = "mistimed"
    else:
        r["outcome"] = "weak"

    base_exit = 26 + 62 * shot["base_power"]
    r["exit_kph"] = 8 + quality * base_exit + 0.08 * delivery.speed_kph
    r["lofted"] = shot["lofted"]

    if shot["lofted"]:
        r["elevation"] = 16 + 22 * quality + (rng.random() - 0.5) * 8
    elif r["outcome"] in ("weak", "mistimed"):
        r["elevation"] = 3 + 12 * rng.random()
    else:
        r["elevation"] = shot["base_loft"] * 0.4 + 6 * quality + rng.random() * 3

    control = control_curve(timing_offset)
    noise = (1 - control) * 0.35 * (rng.random() * 2 - 1)
    if shot["awkward"]:
        noise += (rng.random() * 2 - 1) * 0.20
    r["direction"] = direction_from_angle(direction["angle"] + noise, r["elevation"])
    return r


# --- engine ---------------------------------------------------------------------------

class Engine:
    def __init__(self, seed, pitch=None):
        self.rng = random.Random(seed)
        self.pitch = pitch if pitch is not None else NORMAL_PITCH
        self.foot = Footwork()
        self.traj = None
        self.t = 0.0
        self.swing_taken = False
        self.contact_will_happen = False
        self.passed_reported = False
        self.bounce_reported = False
        self.last_swing = None
        self.swing_reports = []
        self.passed_reports = []
        self.on_bounce = None

    def begin_delivery(self, d: Delivery):
        self.traj = Trajectory(d, self.pitch)
        self.t = 0.0
        self.swing_taken = False
        self.contact_will_happen = False
        self.passed_reported = False
        self.bounce_reported = False
        self.last_swing = None

    def update(self, dt, footwork_input=Vec2(), swing=False, shot_dir=Vec2(0, 1),
               swipe_strength=0.0, intent="normal"):
        footwork_advance(self.foot, footwork_input, dt)
        if self.traj is None:
            return
        self.t += dt

        if not self.bounce_reported and self.t >= self.traj.bounce_time:
            self.bounce_reported = True
            if self.on_bounce:
                self.on_bounce(self.traj.position(self.traj.bounce_time))

        if not self.swing_taken and not self.passed_reported and swing:
            windup = windup_time(intent)
            offset = (self.t + windup) - self.traj.time_to_contact
            if offset <= MAX_W:
                self.swing_taken = True
                direction = resolve_direction(shot_dir, swipe_strength,
                                              self.traj.x_at_contact,
                                              self.traj.delivery, self.foot, offset)
                window = timing_classify(offset)
                shot = select_shot(intent, foot_pose(self.foot), self.traj.delivery, direction)
                report = {"intent": intent, "selection": shot, "direction": direction,
                          "window": window, "offset": offset,
                          "delivery": self.traj.delivery,
                          "will_contact": False, "contact": None}
                if window != "missed" and direction["reach"] >= 0.15:
                    contact = resolve_contact(self.rng, self.traj.delivery, shot,
                                              direction, offset, window, swipe_strength)
                    if contact["outcome"] != "miss":
                        report["will_contact"] = True
                        report["contact"] = contact
                        self.contact_will_happen = True
                self.last_swing = report
                self.swing_reports.append(report)

        if not self.contact_will_happen and not self.passed_reported \
                and self.t >= self.traj.time_to_stumps:
            self.passed_reported = True
            self.passed_reports.append({"swung": self.swing_taken,
                                        "hit_stumps": self.traj.hits_stumps()})
