"""Python reference of the Phase 2 bowling + shot-outcome systems.

1:1 mirror of CricketGame.Core.Bowling (DeliveryFactory, specs, plans) and
CricketGame.Core.Batting.ShotOutcomeResolver. If the C# changes, this must
change with it.
"""

import math

from batting_reference import (
    Delivery, Trajectory, Pitch, NORMAL_PITCH, STUMPS_Z, clamp,
)

BOUNDARY_RADIUS = 62.0
GRAVITY = 9.81

# --- delivery types ------------------------------------------------------------

DELIVERY_TYPES = [
    "fast_straight", "fast_inswinger", "fast_outswinger", "yorker",
    "full_ball", "good_length", "short_ball", "bouncer",
]

# name -> dict(speed=(lo,hi), line=(lo,hi), length=(lo,hi), swing=(lo,hi),
#              seam=(lo,hi), bounce=(lo,hi))
DELIVERY_SPECS = {
    "fast_straight":   dict(speed=(132, 142), line=(-0.18, 0.18), length=(0.45, 0.65),
                            swing=(-0.15, 0.15), seam=(-0.25, 0.25), bounce=(0.95, 1.05)),
    "fast_inswinger":  dict(speed=(127, 137), line=(0.15, 0.50), length=(0.30, 0.55),
                            swing=(-0.95, -0.55), seam=(-0.55, -0.10), bounce=(0.95, 1.05)),
    "fast_outswinger": dict(speed=(127, 137), line=(-0.10, 0.30), length=(0.30, 0.55),
                            swing=(0.55, 0.95), seam=(0.05, 0.40), bounce=(0.95, 1.05)),
    "yorker":          dict(speed=(135, 146), line=(-0.15, 0.20), length=(0.00, 0.07),
                            swing=(-0.30, 0.30), seam=(-0.15, 0.15), bounce=(0.85, 0.95)),
    "full_ball":       dict(speed=(114, 126), line=(-0.25, 0.35), length=(0.08, 0.24),
                            swing=(-0.40, 0.40), seam=(-0.30, 0.30), bounce=(0.90, 1.00)),
    "good_length":     dict(speed=(121, 133), line=(-0.20, 0.40), length=(0.45, 0.62),
                            swing=(-0.35, 0.35), seam=(-0.40, 0.40), bounce=(0.95, 1.05)),
    "short_ball":      dict(speed=(129, 140), line=(-0.50, 0.10), length=(0.72, 0.86),
                            swing=(-0.20, 0.20), seam=(-0.25, 0.25), bounce=(1.00, 1.15)),
    "bouncer":         dict(speed=(133, 145), line=(-0.55, 0.05), length=(0.88, 0.97),
                            swing=(-0.15, 0.15), seam=(-0.15, 0.15), bounce=(1.10, 1.30)),
}

# Default over plan: weight per type (need not sum to 1).
DEFAULT_PLAN = {
    "good_length": 0.20, "fast_straight": 0.15, "full_ball": 0.12,
    "short_ball": 0.13, "fast_inswinger": 0.12, "fast_outswinger": 0.10,
    "yorker": 0.10, "bouncer": 0.08,
}


def _range(rng, lo_hi):
    lo, hi = lo_hi
    return lo + (hi - lo) * rng.random()


def build_delivery(dtype, rng, accuracy=0.75, plan=None):
    """Samples one DeliveryData for a type. Accuracy (0..1) scales the
    line/length dispersion around the sampled target."""
    spec = DELIVERY_SPECS[dtype]
    line = _range(rng, spec["line"])
    length = _range(rng, spec["length"])
    # Dispersion: imperfect execution blurs the intended target.
    disp = (1.0 - clamp(accuracy, 0.0, 1.0))
    line = clamp(line + (rng.random() * 2 - 1) * 0.45 * disp, -1.2, 1.2)
    length = clamp(length + (rng.random() * 2 - 1) * 0.30 * disp, 0.0, 1.0)
    return Delivery(
        speed_kph=round(_range(rng, spec["speed"]), 1),
        line=line,
        length=length,
        swing=_range(rng, spec["swing"]),
        dtype=dtype,
        seam=_range(rng, spec["seam"]),
        bounce=_range(rng, spec["bounce"]),
    )


def next_delivery_type(rng, plan=None):
    """Weighted pick of the next delivery type from the bowler's plan."""
    plan = plan or DEFAULT_PLAN
    total = sum(plan.values())
    roll = rng.random() * total
    acc = 0.0
    for dtype in DELIVERY_TYPES:
        w = plan.get(dtype, 0.0)
        acc += w
        if roll < acc:
            return dtype
    return "good_length"


# --- shot outcome resolution ----------------------------------------------------

LBW_HALF_WIDTH = 0.22   # body corridor around the batter's x
LBW_MAX_HEIGHT = 0.85   # impact must be below this to be plausibly out
LBW_MIN_FOOT_Z = -0.60  # batter must be in front of (nearer bowler than) stumps

OUTCOME_LABELS = {
    "leave": "LEFT ALONE", "beaten": "BEATEN", "bowled": "BOWLED", "lbw": "LBW",
    "defensive": "BLOCKED", "dot": "DOT BALL", "single": "SINGLE", "two": "TWO RUNS",
    "three": "THREE RUNS", "four": "FOUR", "six": "SIX",
    "top_edge": "TOP EDGE", "inside_edge": "INSIDE EDGE", "outside_edge": "OUTSIDE EDGE",
}

WICKETS = {"bowled", "lbw"}
EDGES = {"top_edge", "inside_edge", "outside_edge"}


def predict_carry(exit_kph, elevation_deg, start_height=0.9):
    """Dragless ballistic carry to first landing, plus distance to boundary
    crossing. Returns dict(carry, lands_before_rope, y_at_rope, rest_dist,
    vx, vy). Deterministic physics only - no randomness."""
    v = exit_kph / 3.6
    e = math.radians(clamp(elevation_deg, 0.0, 70.0))
    vx, vy = v * math.cos(e), v * math.sin(e)
    carry = vx * ((vy + math.sqrt(max(0.0, vy * vy + 2 * GRAVITY * start_height))) / GRAVITY)
    dist_to_rope = max(1.0, BOUNDARY_RADIUS - 0.4)
    t_rope = dist_to_rope / max(vx, 0.5)
    y_at_rope = start_height + vy * t_rope - 0.5 * GRAVITY * t_rope * t_rope
    return {
        "carry": carry,
        "lands_before_rope": carry < dist_to_rope,
        "y_at_rope": y_at_rope,
        "vx": vx, "vy": vy,
    }


def rest_distance(carry_info, elevation_deg, exit_kph):
    """Estimated final rest distance: carry plus ground roll. Lofted balls
    stop quickly; hard low drives keep rolling across a flat outfield."""
    e = math.radians(clamp(elevation_deg, 0.0, 70.0))
    roll_time = 2.00 * (1.0 - 0.80 * clamp(e / math.radians(35.0), 0.0, 1.0))
    roll = carry_info["vx"] * roll_time * 0.75
    return carry_info["carry"] + roll


def runs_for_rest_distance(dist):
    if dist >= 45.0:
        return 3
    if dist >= 25.0:
        return 2
    if dist >= 9.0:
        return 1
    return 0


def resolve_outcome(rng, traj, swing, foot_x, foot_z,
                    lbw_enabled=True, force=None):
    """Turns the engine's reports into a cricket outcome.

    rng      - seeded Random (same stream discipline as the engine)
    traj     - Trajectory of the delivery
    swing    - engine swing report dict, or None when no swing happened
    foot_x/z - batter position at the moment the ball passes
    force    - optional debug override: one of
               'dot','defensive','one','two','four','six','edge','bowled','lbw'
    """
    r = {"kind": None, "label": None, "runs": 0, "wicket": False, "forced": force is not None}

    if force is not None:
        return _forced(r, force)

    struck = swing is not None and swing.get("will_contact")

    # ---------------------------------------------------------------- not struck
    if not struck:
        if traj.hits_stumps():
            x_s, y_s = traj.at_stumps()
            body_on_line = abs(x_s - foot_x) <= LBW_HALF_WIDTH
            low_enough = 0.0 <= y_s <= LBW_MAX_HEIGHT
            in_front = foot_z > LBW_MIN_FOOT_Z
            if lbw_enabled and body_on_line and low_enough and in_front:
                r.update(kind="lbw", label=OUTCOME_LABELS["lbw"], wicket=True)
            else:
                r.update(kind="bowled", label=OUTCOME_LABELS["bowled"], wicket=True)
            return r
        swung = swing is not None
        r.update(kind="beaten" if swung else "leave",
                 label=OUTCOME_LABELS["beaten" if swung else "leave"])
        return r

    # ---------------------------------------------------------------- struck
    c = swing["contact"]
    outcome = c["outcome"]
    angle = math.atan2(c["direction"][0], c["direction"][2])

    if outcome == "edge":
        if c["elevation"] > 26.0:
            kind = "top_edge"
        elif angle < 0.0:
            kind = "inside_edge"
        else:
            kind = "outside_edge"
        runs = 0
        # Streaky runs: a hard outside edge can squirt past the keeper.
        if kind == "outside_edge" and c["exit_kph"] > 70.0 and rng.random() < 0.35:
            runs = 1
        r.update(kind=kind, label=OUTCOME_LABELS[kind], runs=runs)
        return r

    if outcome == "defensive_solid":
        forward = abs(angle) < 1.2
        runs = 1 if (forward and c["exit_kph"] > 26.0 and rng.random() < 0.35) else 0
        r.update(kind="defensive", label=OUTCOME_LABELS["defensive"], runs=runs)
        return r

    # Clean / mistimed / weak / lofted: physics decides the distance.
    carry = predict_carry(c["exit_kph"], c["elevation"],
                          start_height=max(0.35, traj.height_at_contact))
    if not carry["lands_before_rope"] and carry["y_at_rope"] > 0.05:
        r.update(kind="six", label=OUTCOME_LABELS["six"], runs=6)
        return r
    rest = rest_distance(carry, c["elevation"], c["exit_kph"])
    if rest >= BOUNDARY_RADIUS - 0.4:
        r.update(kind="four", label=OUTCOME_LABELS["four"], runs=4)
        return r
    runs = runs_for_rest_distance(rest)
    kinds = {0: "dot", 1: "single", 2: "two", 3: "three"}
    kind = kinds[runs]
    if runs == 0 and outcome in ("weak", "mistimed"):
        r.update(kind="dot", label="MISTIMED", runs=0)
    else:
        r.update(kind=kind, label=OUTCOME_LABELS[kind], runs=runs)
    return r


def _forced(r, force):
    table = {
        "dot": ("dot", 0), "defensive": ("defensive", 0), "one": ("single", 1),
        "two": ("two", 2), "four": ("four", 4), "six": ("six", 6),
        "edge": ("outside_edge", 0), "bowled": ("bowled", 0), "lbw": ("lbw", 0),
    }
    kind, runs = table.get(force, ("dot", 0))
    r.update(kind=kind, label=OUTCOME_LABELS.get(kind, "DOT BALL"), runs=runs,
             wicket=kind in WICKETS)
    return r
