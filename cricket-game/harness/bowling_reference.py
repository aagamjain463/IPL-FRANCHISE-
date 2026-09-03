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
    # Phase 4 variations: pace-off and seam-position deliveries.
    "off_cutter", "leg_cutter", "slower_ball",
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
    # --- Phase 4 variations -------------------------------------------------
    # Cutters grip the pitch: less pace, pronounced seam movement.
    "off_cutter":      dict(speed=(112, 122), line=(-0.10, 0.35), length=(0.40, 0.60),
                            swing=(-0.20, 0.20), seam=(0.30, 0.75), bounce=(0.90, 1.00)),
    "leg_cutter":      dict(speed=(112, 122), line=(-0.35, 0.10), length=(0.40, 0.60),
                            swing=(-0.20, 0.20), seam=(-0.75, -0.30), bounce=(0.90, 1.00)),
    # Slower ball: big pace-off, fullish, minimal movement - deception only.
    "slower_ball":     dict(speed=(102, 114), line=(-0.20, 0.30), length=(0.15, 0.45),
                            swing=(-0.25, 0.25), seam=(-0.20, 0.20), bounce=(0.88, 0.98)),
}

# Default over plan: weight per type (need not sum to 1).
DEFAULT_PLAN = {
    "good_length": 0.20, "fast_straight": 0.15, "full_ball": 0.12,
    "short_ball": 0.13, "fast_inswinger": 0.12, "fast_outswinger": 0.10,
    "yorker": 0.10, "bouncer": 0.08,
    "off_cutter": 0.05, "leg_cutter": 0.05, "slower_ball": 0.05,
}

# --- Phase 4 bowler profiles ---------------------------------------------------
# Each profile tunes pace, movement and the deliveries it leans on. Accuracy is
# a base value; the release mechanic and difficulty move the actual execution.

BOWLER_PROFILES = {
    "fast": dict(
        name="FAST BOWLER", speed_mult=1.06, swing_mult=0.7, seam_mult=0.8,
        accuracy=0.78,
        plan={"fast_straight": 0.24, "good_length": 0.18, "short_ball": 0.16,
              "bouncer": 0.14, "yorker": 0.10, "fast_inswinger": 0.08,
              "fast_outswinger": 0.06, "full_ball": 0.04},
    ),
    "swing": dict(
        name="SWING BOWLER", speed_mult=0.96, swing_mult=1.35, seam_mult=0.7,
        accuracy=0.74,
        plan={"fast_inswinger": 0.24, "fast_outswinger": 0.22, "good_length": 0.16,
              "full_ball": 0.12, "fast_straight": 0.10, "yorker": 0.08,
              "short_ball": 0.05, "slower_ball": 0.03},
    ),
    "variation": dict(
        name="PACE VARIATION BOWLER", speed_mult=0.92, swing_mult=0.8, seam_mult=1.25,
        accuracy=0.80,
        plan={"off_cutter": 0.20, "leg_cutter": 0.18, "slower_ball": 0.16,
              "good_length": 0.16, "yorker": 0.12, "full_ball": 0.08,
              "fast_straight": 0.06, "short_ball": 0.04},
    ),
}

# Legality: how far off-line a delivery can be before it is called wide.
WIDE_LINE_THRESHOLD = 0.95


def delivery_legality(line):
    """'legal' or 'wide'. Wides add a run and consume NO legal ball."""
    return "wide" if abs(line) > WIDE_LINE_THRESHOLD else "legal"


# Loss-of-control spray: a bowler occasionally lets the ball go completely.
# Probability = (1 - accuracy) * rate(difficulty) - hard bowlers spray less.
SPRAY_RATE = {"easy": 0.100, "medium": 0.080, "hard": 0.060}


def spray_probability(accuracy, difficulty="medium"):
    return min(0.12, (1.0 - clamp(accuracy, 0.0, 1.0))
               * SPRAY_RATE.get(difficulty, SPRAY_RATE["medium"]))


def bowl_with_release(rng, delivery, release_offset, accuracy=0.75,
                      difficulty="medium"):
    """Full bowling pipeline: release timing -> drift, then a control check.

    Returns dict(delivery, quality, wide). `wide` deliveries are illegal:
    they add one extra run and consume NO legal ball (rules engine already
    supports DeliveryOutcome.wide()).
    """
    d = apply_release(delivery, release_offset, accuracy=accuracy)
    quality = release_quality(release_offset)
    if rng.random() < spray_probability(accuracy, difficulty):
        sign = 1 if d.line >= 0 else -1
        d = Delivery(
            speed_kph=d.speed_kph,
            line=clamp(sign * (0.98 + rng.random() * 0.22), -1.2, 1.2),
            length=d.length, swing=d.swing, dtype=d.dtype, seam=d.seam,
            bounce=d.bounce, release_height=d.release_height,
        )
    return {"delivery": d, "quality": quality,
            "wide": delivery_legality(d.line) == "wide"}


def _range(rng, lo_hi):
    lo, hi = lo_hi
    return lo + (hi - lo) * rng.random()


def build_delivery(dtype, rng, accuracy=0.75, plan=None, profile=None,
                   line_hint=None, length_hint=None):
    """Samples one DeliveryData for a type. Accuracy (0..1) scales the
    line/length dispersion around the sampled target.

    Phase 4: `profile` (a BOWLER_PROFILES entry) scales speed/swing/seam and
    can override accuracy; `line_hint`/`length_hint` bias the intended spot
    (used by the AI bowling strategy) without changing the dispersion model.
    """
    spec = DELIVERY_SPECS[dtype]
    prof = BOWLER_PROFILES.get(profile) if profile else None
    if prof is not None and accuracy is None:
        accuracy = prof["accuracy"]

    line = _range(rng, spec["line"])
    length = _range(rng, spec["length"])
    if line_hint is not None:
        line = clamp(line * 0.4 + line_hint * 0.6, -1.2, 1.2)
    if length_hint is not None:
        length = clamp(length * 0.4 + length_hint * 0.6, 0.0, 1.0)
    # Dispersion: imperfect execution blurs the intended target.
    disp = (1.0 - clamp(accuracy if accuracy is not None else 0.75, 0.0, 1.0))
    line = clamp(line + (rng.random() * 2 - 1) * 0.45 * disp, -1.2, 1.2)
    length = clamp(length + (rng.random() * 2 - 1) * 0.30 * disp, 0.0, 1.0)

    speed = _range(rng, spec["speed"])
    swing = _range(rng, spec["swing"])
    seam = _range(rng, spec["seam"])
    if prof is not None:
        speed *= prof["speed_mult"]
        swing = clamp(swing * prof["swing_mult"], -1.5, 1.5)
        seam = clamp(seam * prof["seam_mult"], -1.5, 1.5)
    return Delivery(
        speed_kph=round(speed, 1),
        line=line,
        length=length,
        swing=swing,
        dtype=dtype,
        seam=seam,
        bounce=_range(rng, spec["bounce"]),
    )


# --- Phase 4 release control ---------------------------------------------------
# The player's release window. PERFECT (|offset| <= 0.03 s) delivers the
# intended ball; early/late releases drift the length and line in opposite
# directions. Easy to learn, difficult to master - a late release shortens
# the ball rather than ruining it.

RELEASE_PERFECT_WINDOW = 0.03
RELEASE_MAX_ERROR = 0.14


def release_quality(offset):
    a = abs(offset)
    if a <= RELEASE_PERFECT_WINDOW:
        return "perfect"
    if a <= 0.07:
        return "good"
    if a <= RELEASE_MAX_ERROR:
        return "early" if offset < 0 else "late"
    return "very_early" if offset < 0 else "very_late"


def apply_release(delivery, release_offset, accuracy=0.75):
    """Applies the bowler's release timing to a sampled delivery (returns a
    NEW Delivery). Perfect release = as intended. Early release over-pitches
    (fuller, drifting wider); late release comes out short with the line
    pulled in. Accuracy reduces the drift magnitude. Wides come from the
    separate control check in bowl_with_release, not from this drift.
    """
    q = release_quality(release_offset)
    if q == "perfect":
        return delivery
    err = clamp(abs(release_offset) / RELEASE_MAX_ERROR, 0.0, 1.6)
    blur = 1.25 - clamp(accuracy, 0.0, 1.0)          # poor bowlers drift more
    sign = 1 if delivery.line >= 0 else -1
    if release_offset < 0:                            # early: fuller + wider
        length = clamp(delivery.length - 0.34 * err * blur, 0.0, 1.0)
        line_drift = 0.40 * err * blur
        line = clamp(delivery.line + line_drift * sign, -1.2, 1.2)
    else:                                             # late: shorter + inward
        length = clamp(delivery.length + 0.30 * err * blur, 0.0, 1.0)
        line_drift = 0.30 * err * blur
        line = clamp(delivery.line - line_drift * sign, -1.2, 1.2)
    return Delivery(
        speed_kph=delivery.speed_kph, line=line, length=length,
        swing=delivery.swing, dtype=delivery.dtype, seam=delivery.seam,
        bounce=delivery.bounce, release_height=delivery.release_height,
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
