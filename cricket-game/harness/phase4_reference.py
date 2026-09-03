"""Phase 4 reference systems: batting feel, shot context, fielding polish,
AI bowling strategy.

Pure deterministic helpers that sit ON TOP of the Phase 1-3 engines (nothing
here changes Phase 3 rule behaviour). Mirrored by CricketGame.Core (C#) and
the browser preview. If the C# changes, this must change with it.
"""

import math

from batting_reference import clamp, timing_classify, length_zone, sector_of

# =============================================================================
# 1. TIMING QUALITY FEEDBACK (spec section 3)
# =============================================================================
# Six distinguishable tiers. The multiplier feeds contact power/quality, so a
# PERFECT aggressive shot carries substantially more attacking potential while
# a PERFECT defensive shot is still just a solid block (defense is capped in
# resolve_contact itself - see defensive exit-speed ceiling).

TIMING_TIERS = {
    "perfect":    dict(power=1.12, control=1.00, label="PERFECT",
                       haptic=0.35, bat_shake=0.30, camera=0.25),
    "good":       dict(power=0.95, control=0.90, label="GOOD",
                       haptic=0.18, bat_shake=0.15, camera=0.10),
    "early":      dict(power=0.72, control=0.62, label="EARLY",
                       haptic=0.08, bat_shake=0.08, camera=0.04),
    "late":       dict(power=0.72, control=0.62, label="LATE",
                       haptic=0.08, bat_shake=0.08, camera=0.04),
    "very_early": dict(power=0.45, control=0.30, label="VERY EARLY",
                       haptic=0.03, bat_shake=0.04, camera=0.02),
    "very_late":  dict(power=0.45, control=0.30, label="VERY LATE",
                       haptic=0.03, bat_shake=0.04, camera=0.02),
    "missed":     dict(power=0.00, control=0.00, label="MISSED",
                       haptic=0.0, bat_shake=0.0, camera=0.0),
}


def timing_feedback(timing_window, intent="normal"):
    """Feedback + power shaping for one swing.

    Returns dict(power_mult, control_mult, label, haptic, bat_shake, camera,
                 attack_boost). The attack_boost only applies to attacking
    intents - a perfectly timed block is still a block (spec section 3).
    """
    tier = TIMING_TIERS.get(timing_window, TIMING_TIERS["missed"])
    attacking = intent in ("aggressive", "lofted")
    boost = tier["power"] if attacking else min(tier["power"], 1.0)
    return {
        "power_mult": tier["power"],
        "control_mult": tier["control"],
        "label": tier["label"],
        "haptic": tier["haptic"],
        "bat_shake": tier["bat_shake"],
        "camera": tier["camera"],
        "attack_boost": boost,
        "window": timing_window,
    }


# =============================================================================
# 2. SHOT CONTEXT VALIDATION (spec section 4)
# =============================================================================
# Which sectors are believable for each length zone. If the player asks for an
# unrealistic shot we snap the request to the nearest valid sector instead of
# producing a broken animation (the engine's own awkward flags still apply).

ALLOWED_SECTORS = {
    # yorker: drives, digs and defence only - nothing square or behind.
    "yorker": ("straight", "cover", "mid_wicket"),
    "full":   ("straight", "cover", "mid_wicket", "square_leg", "fine_leg"),
    "good":   ("straight", "cover", "point", "mid_wicket", "square_leg"),
    "short":  ("straight", "point", "square_leg", "mid_wicket", "cover",
               "third_man", "fine_leg"),
}

# Representative angle (radians) for each sector, used when snapping.
SECTOR_ANGLES = {
    "straight": 0.0,
    "cover": math.radians(38.0),
    "point": math.radians(80.0),
    "third_man": math.radians(128.0),
    "mid_wicket": math.radians(-38.0),
    "square_leg": math.radians(-80.0),
    "fine_leg": math.radians(-128.0),
}

# Shot families per sector, for animation selection and UI labelling.
SECTOR_SHOT_FAMILY = {
    "straight": "drive", "cover": "drive", "point": "cut",
    "third_man": "cut", "mid_wicket": "flick", "square_leg": "flick",
    "fine_leg": "glance",
}


def length_bucket(length):
    """yorker | full | good | short (finer than the engine's 3-zone split)."""
    if length < 0.12:
        return "yorker"
    return length_zone(length)


def validate_shot_request(angle_rad, length):
    """Clamps a requested shot direction onto the believable sectors for the
    ball's length. Returns dict(sector, angle, snapped, family)."""
    bucket = length_bucket(length)
    allowed = ALLOWED_SECTORS[bucket]
    sector = sector_of(angle_rad)
    if sector in allowed:
        return {"sector": sector, "angle": angle_rad, "snapped": False,
                "family": SECTOR_SHOT_FAMILY[sector], "bucket": bucket}
    # Snap to the nearest allowed sector by angular distance.
    best, best_d = allowed[0], float("inf")
    for s in allowed:
        d = abs(_angle_diff(angle_rad, SECTOR_ANGLES[s]))
        if d < best_d:
            best, best_d = s, d
    snapped_angle = clamp_angle_near(angle_rad, SECTOR_ANGLES[best])
    return {"sector": best, "angle": snapped_angle, "snapped": True,
            "family": SECTOR_SHOT_FAMILY[best], "bucket": bucket}


def _angle_diff(a, b):
    d = (a - b + math.pi) % (2 * math.pi) - math.pi
    return d


def clamp_angle_near(requested, target):
    """Moves `requested` toward `target` but never past it (shortest arc)."""
    d = _angle_diff(requested, target)
    return requested - d


# =============================================================================
# 3. CATCH GRADING (spec section 13)
# =============================================================================
# Grade drives both success probability shaping (on top of fielder ability)
# and the animation/presentation layer: easy = settled catch, edge = sharp
# reflex, difficult = spectacular attempt with low success.

def catch_grade(ball_speed_kph, height, distance_to_fielder, is_edge=False):
    if is_edge:
        return "edge"
    reaction_pressure = ball_speed_kph / 130.0 + max(0.0, 1.6 - height) * 0.25
    if distance_to_fielder < 3.0 and ball_speed_kph > 95.0:
        return "difficult"
    if reaction_pressure > 1.05 or height > 6.0:
        return "difficult"
    if reaction_pressure > 0.72 or height > 3.2:
        return "medium"
    return "easy"


GRADE_SUCCESS_BIAS = {     # multiplies the fielder-based catch probability
    "easy": 1.15, "medium": 1.00, "difficult": 0.72, "edge": 0.55,
}


# =============================================================================
# 4. DIVING FIELDING (spec section 12)
# =============================================================================
# Dives are committed decisions, not cosmetics. A fielder dives only when the
# ball would otherwise escape and the dive is plausibly within reach.

DIVE_REACH = 2.6           # extra metres a dive extends the fielder's reach
DIVE_BASE_SUCCESS = 0.55


def dive_decision(fielder, dist_to_ball, ball_speed_h, heading_for_rope,
                  lofted):
    """Returns 'none' | 'ground' | 'catch' | 'boundary_save'."""
    if dist_to_ball <= 1.1:
        return "none"                       # already in reach: normal play
    if dist_to_ball > DIVE_REACH + 0.9:
        return "none"                       # too far: a dive would be cosplay
    if heading_for_rope and ball_speed_h > 16.0:
        return "boundary_save"
    if lofted:
        return "catch"
    return "ground"


def dive_success_probability(fielder, dive_kind, ball_speed_h):
    base = DIVE_BASE_SUCCESS
    if dive_kind == "boundary_save":
        base *= max(0.35, 1.15 - ball_speed_h / 40.0)
    elif dive_kind == "catch":
        base *= 0.8
    ability = (fielder.ground * 0.6 + fielder.catching * 0.4) \
        if dive_kind != "catch" else fielder.catching
    return clamp(base * (0.55 + 0.75 * ability * fielder.scale), 0.05, 0.92)


# =============================================================================
# 5. THROW SYSTEM (spec section 15)
# =============================================================================
# Formalised return throw: arm strength sets travel time, accuracy sets the
# scatter. Strong throws come in flatter and faster, cutting running time.

def throw_return(fielder, distance):
    """dict(travel_time, flat, errant). errant = the throw misses the keeper
    slightly and costs extra time."""
    arm = max(12.0, fielder.throw_speed)
    flat = arm >= 23.0
    travel = distance / arm * (1.12 if flat else 1.30)   # flat = one bounce
    errant = fielder.throw_acc < 0.72
    if errant:
        travel *= 1.25
    return {"travel_time": travel, "flat": flat, "errant": errant}


# =============================================================================
# 6. AI BOWLING STRATEGY (spec section 10)
# =============================================================================
# Reads the batter's recent behaviour and adjusts. Understandable + tunable:
# the returned dict carries a `reason` string so tests/UI can show the logic.

AI_BOWLING_TYPES = [
    "good_length", "fast_straight", "full_ball", "short_ball", "yorker",
    "fast_inswinger", "fast_outswinger", "bouncer",
    "off_cutter", "leg_cutter", "slower_ball",
]


def ai_bowling_plan(rng, history, ctx, difficulty="medium"):
    """Chooses the AI's next delivery.

    history: list of recent dicts(sector, runs, intent) for the batter,
             oldest first (the match layer keeps the last ~6).
    ctx: dict(score, wickets_remaining, balls_remaining) for the innings.
    Returns dict(type, line_hint, length_hint, reason).
    """
    plan = {"type": "good_length", "line_hint": 0.10, "length_hint": 0.52,
            "reason": "stock_good_length"}

    recent = history[-3:] if history else []
    recent_sectors = [h.get("sector") for h in recent if h.get("sector")]
    recent_runs = sum(h.get("runs", 0) for h in recent)

    # Repeated scoring through one region -> dry it up.
    if len(recent_sectors) >= 2 and len(set(recent_sectors)) == 1:
        s = recent_sectors[0]
        if s in ("cover", "point", "third_man"):
            plan.update(type="leg_cutter", line_hint=-0.25, length_hint=0.55,
                        reason="attack_stumps_away_from_%s" % s)
            return plan
        if s in ("mid_wicket", "square_leg", "fine_leg"):
            plan.update(type="off_cutter", line_hint=0.30, length_hint=0.50,
                        reason="take_leg_side_out_%s" % s)
            return plan
        if s == "straight":
            plan.update(type="slower_ball", line_hint=0.05, length_hint=0.28,
                        reason="deception_down_the_ground")
            return plan

    # Batter is hitting hard: take pace off or squeeze the base.
    if recent_runs >= 8:
        if rng.random() < 0.55:
            plan.update(type="slower_ball", line_hint=0.10, length_hint=0.30,
                        reason="pace_off_vs_aggression")
        else:
            plan.update(type="yorker", line_hint=0.05, length_hint=0.03,
                        reason="yorker_vs_aggression")
        return plan

    # Death of the innings with wickets in hand: attack the base.
    if ctx.get("balls_remaining", 6) <= 2 and ctx.get("wickets_remaining", 2) >= 1:
        plan.update(type="yorker", line_hint=0.02, length_hint=0.03,
                    reason="yorker_at_the_death")
        return plan

    # A batter coming after the short ball earlier: change length entirely.
    short_ball_recently = any(h.get("intent") == "lofted" for h in recent)
    if short_ball_recently and rng.random() < 0.5:
        plan.update(type="full_ball", line_hint=0.15, length_hint=0.16,
                    reason="full_after_short_contest")
        return plan

    # Hard difficulty scatters the batter more with movement.
    if difficulty == "hard" and rng.random() < 0.35:
        pick = rng.random()
        if pick < 0.5:
            plan.update(type="fast_inswinger", line_hint=0.30, length_hint=0.45,
                        reason="hard_mode_inswing")
        else:
            plan.update(type="fast_outswinger", line_hint=0.05, length_hint=0.45,
                        reason="hard_mode_outswing")
        return plan

    return plan
