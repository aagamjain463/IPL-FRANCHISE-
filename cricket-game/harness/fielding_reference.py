"""Python reference of the Phase 3 fielding system.

Deterministic gameplay fielding: fielders react after an attribute-based
delay, chase the struck ball, attempt catches on lofted shots, stop ground
shots and return the ball. Mirrored by Core/Fielding (C#) and the browser
preview. Priority: believable + reliable, not ML.
"""

import math

from bowling_reference import BOUNDARY_RADIUS

ROPE = BOUNDARY_RADIUS - 0.4          # where boundaries are judged
GRAVITY = 9.81
SIM_DT = 1.0 / 60.0
RUN_DELAY = 0.25                       # batsmen react this long after contact
TIME_PER_RUN = 2.4                     # seconds per completed run (20 m each way)
KEEPER_POS = (0.0, -2.6)

# 9 fielders + bowler + keeper. (x, z) in world metres, batter at origin.
FIELD_SETUP = [
    # name, x, z, speed, reaction, catching, ground, throw_speed, throw_acc
    ("slip",        1.0,  -2.2, 5.6, 0.16, 0.80, 0.55, 20.0, 0.70),
    ("point",      24.0,   6.0, 6.6, 0.24, 0.68, 0.80, 23.0, 0.80),
    ("cover",      17.0,  18.0, 6.8, 0.22, 0.70, 0.85, 24.0, 0.85),
    ("mid_off",     8.0,  26.0, 6.5, 0.24, 0.62, 0.80, 23.0, 0.80),
    ("mid_on",     -8.0,  26.0, 6.5, 0.24, 0.62, 0.80, 23.0, 0.80),
    ("mid_wicket", -17.0,  18.0, 6.8, 0.22, 0.66, 0.84, 23.5, 0.82),
    ("square_leg", -24.0,  6.0, 6.6, 0.24, 0.66, 0.80, 23.0, 0.80),
    ("fine_leg",   -20.0, -20.0, 6.9, 0.28, 0.60, 0.78, 24.0, 0.78),
    ("third_man",  20.0, -20.0, 6.9, 0.28, 0.60, 0.78, 24.0, 0.78),
    ("bowler",      0.6,  16.0, 6.2, 0.20, 0.55, 0.75, 22.0, 0.75),
    ("keeper",      0.0,  -2.6, 5.4, 0.12, 0.90, 0.60, 20.0, 0.75),
]

CATCH_RADIUS = 0.95      # metres (2D) to get hands on a high ball
CATCH_MAX_HEIGHT = 2.4
STOP_RADIUS = 0.80       # metres to stop a grounded ball

# Catch grading (mirrors phase4_reference.catch_grade): difficulty shapes the
# fielder-based catch probability so skied balls are punished and sharp
# chances are harder than easy ones in the simulation itself.
GRADE_SUCCESS_BIAS = {"easy": 1.15, "medium": 1.00, "difficult": 0.72, "edge": 0.55}


def _catch_grade(ball_speed_kph, height, distance_to_fielder):
    """easy | medium | difficult. Mirrors phase4_reference.catch_grade with
    is_edge=False (the sim does not know contact type)."""
    reaction_pressure = ball_speed_kph / 130.0 + max(0.0, 1.6 - height) * 0.25
    if distance_to_fielder < 3.0 and ball_speed_kph > 95.0:
        return "difficult"
    if reaction_pressure > 1.05 or height > 6.0:
        return "difficult"
    if reaction_pressure > 0.72 or height > 3.2:
        return "medium"
    return "easy"


class Fielder:
    __slots__ = ("name", "home", "speed", "reaction", "catching",
                 "ground", "throw_speed", "throw_acc", "scale")

    def __init__(self, row, scale=1.0):
        (name, x, z, speed, reaction, catching, ground,
         throw_speed, throw_acc) = row
        self.name = name
        self.home = (x, z)
        self.speed = speed
        self.reaction = reaction
        self.catching = catching
        self.ground = ground
        self.throw_speed = throw_speed
        self.throw_acc = throw_acc
        self.scale = scale   # difficulty scaling (0.75 easy .. 1.2 hard)

    @property
    def eff_speed(self):
        return self.speed * (0.75 + 0.25 * self.scale)

    @property
    def eff_reaction(self):
        return self.reaction * (1.35 - 0.35 * self.scale)

    @property
    def eff_catching(self):
        return min(0.97, self.catching * (0.8 + 0.2 * self.scale))


def default_field(scale=1.0):
    return [Fielder(row, scale) for row in FIELD_SETUP]


def _step_ball(pos, vel, grounded, dt):
    """Same integration the presentation layer uses (preview/Unity)."""
    vx, vy, vz = vel
    vy -= GRAVITY * dt
    x, y, z = pos
    x += vx * dt; y += vy * dt; z += vz * dt
    if y <= 0.055:
        y = 0.055
        if vy < -0.6:                 # a real bounce
            # Hard struck balls skid through: horizontal retention 0.86.
            vy = -vy * 0.48
            vx *= 0.86; vz *= 0.86
            if vy < 1.1:
                vy = 0.0
        else:                          # already rolling: no micro-bounce loop
            vy = 0.0
        grounded = True
    if grounded:
        # Rolling/sliding friction. The big energy losses happen at each
        # bounce (x0.78 horizontal); this gentle drag just bleeds the rest so
        # a hard flat drive still reaches the rope while a soft push dies.
        f = max(0.0, 1.0 - 0.35 * dt)
        vx *= f; vz *= f
        speed_h = math.hypot(vx, vz)
        if speed_h < 0.6:
            vx = 0.0; vz = 0.0
    return (x, y, z), (vx, vy, vz), grounded


def catch_probability(fielder, ball_speed, height):
    """Deterministic part of the catch model; rng decides against it."""
    p = fielder.eff_catching
    p *= max(0.25, 1.18 - ball_speed / 130.0)          # quick ball = harder
    p *= max(0.4, 1.12 - height / 9.0)                 # very high = harder
    return max(0.05, min(0.97, p))


def simulate_fielding(contact_pos, velocity, fielders, rng, max_seconds=12.0):
    """Simulates the struck ball against the field.

    Returns dict:
      kind: 'caught' | 'four' | 'six' | 'stopped'
      runs: decided runs (0 for caught/boundary-less stops)
      fielder: index or None, name
      pos: where the play resolved
      t: sim time of resolution
      collect_time / throw_time: for run-calculation transparency
      chased: [(idx, start_t, target)] presentation hints
    """
    pos = (contact_pos[0], max(contact_pos[1], 0.1), contact_pos[2])
    vel = tuple(velocity)
    grounded = False
    ever_bounced = False

    n = len(fielders)
    fx = [f.home[0] for f in fielders]
    fz = [f.home[1] for f in fielders]
    react_at = [f.eff_reaction + rng.random() * 0.12 for f in fielders]
    stop_ready_at = [0.0] * n   # cooldown so one pass = one stop attempt
    chasing = [False] * n
    to_landing = [False] * n   # sprinting to the predicted first-landing spot
    chased = []

    # Closed-form first-landing estimate (drag ignored) so fielders can read
    # the flight immediately - spec: "estimate arrival, decide chase".
    vy0 = vel[1]
    t_land = (vy0 + math.sqrt(max(0.0, vy0 * vy0 + 2 * GRAVITY * pos[1]))) / GRAVITY
    land_x = pos[0] + vel[0] * t_land
    land_z = pos[2] + vel[2] * t_land
    land_r = math.hypot(land_x, land_z)
    landing_relevant = land_r < ROPE + 4.0

    t = 0.0
    while t < max_seconds:
        t += SIM_DT
        pos, vel, grounded = _step_ball(pos, vel, grounded, SIM_DT)
        if grounded:
            ever_bounced = True

        dist_rope = math.hypot(pos[0], pos[2])
        if dist_rope >= ROPE:
            six = not ever_bounced and pos[1] > 0.05
            return {"kind": "six" if six else "four", "runs": 6 if six else 4,
                    "fielder": None, "name": None, "pos": pos, "t": t,
                    "collect_time": None, "throw_time": None, "chased": chased}

        speed_h = math.hypot(vel[0], vel[2])
        for i in range(n):
            f = fielders[i]
            if t < react_at[i]:
                continue
            dx = pos[0] - fx[i]
            dz = pos[2] - fz[i]
            d = math.hypot(dx, dz)

            # ---- decision: chase anything reachable-ish in front, or balls
            #      coming to the keeper/slip corridor behind square.
            if not chasing[i]:
                worth = (d < 34.0) or (f.name in ("keeper", "slip") and pos[2] < 2.0 and d < 12.0)
                if worth:
                    chasing[i] = True
                    chased.append((i, t, (pos[0], pos[2])))

            if not chasing[i]:
                continue

            # ---- choose the run target: lofted balls -> predicted landing
            #      spot (sprint there early); grounded balls -> the ball.
            if to_landing[i] and ever_bounced:
                to_landing[i] = False
            if not ever_bounced and landing_relevant and not to_landing[i]:
                arrive = t + math.hypot(land_x - fx[i], land_z - fz[i]) / f.eff_speed
                if arrive <= t_land + 0.10 and math.hypot(land_x, land_z) < 46.0:
                    to_landing[i] = True
            tx = land_x if to_landing[i] else (pos[0] + vel[0] * 0.12 if grounded else pos[0])
            tz = land_z if to_landing[i] else (pos[2] + vel[2] * 0.12 if grounded else pos[2])
            mdx, mdz = tx - fx[i], tz - fz[i]
            md = math.hypot(mdx, mdz)
            if md > 1e-4:
                step = f.eff_speed * SIM_DT
                if step > md:
                    step = md
                fx[i] += mdx / md * step
                fz[i] += mdz / md * step

            dx = pos[0] - fx[i]
            dz = pos[2] - fz[i]
            d = math.hypot(dx, dz)

            # ---- catch attempt on a reachable high ball. A hard RISING drive
            #      cannot be caught (only blocked once it drops), but slow,
            #      low edges can be snaffled on the rise by keeper/slips.
            if not grounded and 0.25 <= pos[1] <= CATCH_MAX_HEIGHT and d < CATCH_RADIUS:
                ball_speed = math.sqrt(vel[0] ** 2 + vel[1] ** 2 + vel[2] ** 2) * 3.6
                rising = vel[1] > 0.0
                if rising and not (pos[1] <= 1.6 and ball_speed < 90.0):
                    continue
                p = catch_probability(f, ball_speed, pos[1]) \
                    * GRADE_SUCCESS_BIAS[_catch_grade(ball_speed, pos[1], d)]
                p = max(0.05, min(0.97, p))
                if rng.random() < p:
                    return {"kind": "caught", "runs": 0, "fielder": i,
                            "name": f.name, "pos": pos, "t": t,
                            "collect_time": None, "throw_time": None,
                            "catch_prob": p, "chased": chased}
                # dropped: the ball squirts away, fielder needs to recover.
                deflect = (rng.random() * 2 - 1) * 0.9
                sp = math.hypot(vel[0], vel[2]) * 0.35 + 1.5
                ang = math.atan2(vel[2], vel[0]) + deflect
                vel = (math.cos(ang) * sp, 0.0, math.sin(ang) * sp)
                grounded = True
                react_at[i] = t + 0.7

            # ---- ground stop. Fast balls can beat the fielder's hands:
            #      stop chance scales with ground ability vs ball speed.
            #      One attempt per pass (cooldown), not one per frame.
            elif grounded and d < STOP_RADIUS and speed_h < 34.0 \
                    and t >= stop_ready_at[i]:
                stop_ready_at[i] = t + 0.5
                p_stop = f.ground * max(0.05, min(0.97, 1.25 - speed_h / 34.0))
                if rng.random() > p_stop:
                    # Squirts off the hands: slower, slightly deflected.
                    deflect = (rng.random() * 2 - 1) * 0.35
                    ang = math.atan2(vel[2], vel[0]) + deflect
                    sp = speed_h * 0.55
                    vel = (math.cos(ang) * sp, 0.0, math.sin(ang) * sp)
                    react_at[i] = t + 0.45
                    continue
                collect_t = t
                dist_home = math.hypot(pos[0] - KEEPER_POS[0], pos[2] - KEEPER_POS[1])
                throw_time = dist_home / max(12.0, f.throw_speed) \
                    * (1.0 + (1.0 - f.throw_acc) * rng.random() * 0.6)
                runs = _runs_from_time(collect_t + throw_time, rng)
                return {"kind": "stopped", "runs": runs, "fielder": i,
                        "name": f.name, "pos": pos, "t": collect_t,
                        "collect_time": collect_t, "throw_time": throw_time,
                        "chased": chased}

        # ---- ball dies in the open field: keeper/bowler retrieve
        if grounded and speed_h < 0.4:
            dist_home = math.hypot(pos[0] - KEEPER_POS[0], pos[2] - KEEPER_POS[1])
            retrieve = 1.4 + dist_home / 6.5
            runs = _runs_from_time(t + retrieve, rng)
            return {"kind": "stopped", "runs": runs, "fielder": None,
                    "name": None, "pos": pos, "t": t,
                    "collect_time": t, "throw_time": retrieve, "chased": chased}

    # Safety net: treat as a dead ball deep in the field.
    return {"kind": "stopped", "runs": 3, "fielder": None, "name": None,
            "pos": pos, "t": max_seconds, "collect_time": max_seconds,
            "throw_time": 1.0, "chased": chased}


def _runs_from_time(available, rng):
    """Automatic running: how many runs are completed before the ball returns."""
    raw = (available - RUN_DELAY) / TIME_PER_RUN
    runs = int(max(0, min(3, math.floor(raw))))
    # Occasionally the batters misjudge and lose one (never below 0).
    if runs > 0 and rng.random() < 0.07 * runs:
        runs -= 1
    return runs
