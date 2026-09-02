"""Python reference of the Phase 3 AI systems (batting decisions + difficulty).

The AI batsman drives the SAME batting engine a human uses: it picks an
intent, a swipe direction and a timing offset, and moves its feet. Skill is
bounded and configurable - the AI makes mistakes by design. Mirrored by
Core/AI (C#) and the browser preview.
"""

import math
import random

from batting_reference import windup_time, clamp

DIFFICULTIES = ("easy", "medium", "hard")

# difficulty -> (timing_sd multiplier, extra mistake chance, fielding scale
#                against the player, fielding scale for the player's side,
#                AI bowling accuracy)
DIFFICULTY_TUNING = {
    "easy":   dict(timing_sd=1.45, mistake=0.10, field_vs_player=0.80,
                   field_for_player=1.10, ai_bowling_acc=0.60),
    "medium": dict(timing_sd=1.00, mistake=0.05, field_vs_player=1.00,
                   field_for_player=1.00, ai_bowling_acc=0.75),
    "hard":   dict(timing_sd=0.78, mistake=0.02, field_vs_player=1.15,
                   field_for_player=0.90, ai_bowling_acc=0.85),
}


def aggression_state(required_runs, balls_remaining, wickets_remaining):
    """Strategic state for the chasing side (spec section 15)."""
    if balls_remaining <= 0:
        return "desperate"
    if required_runs <= 0:
        return "safe"
    rrr = required_runs / balls_remaining
    # Comfortable: a run a ball is enough and we still have lives.
    if required_runs <= balls_remaining and wickets_remaining >= 2:
        return "safe"
    if rrr <= 2.2:
        return "balanced"
    if rrr <= 4.2:
        return "aggressive"
    return "desperate"


# state -> intent weights {defensive, normal, aggressive, lofted}
STATE_INTENTS = {
    "safe":       {"defensive": 0.35, "normal": 0.65, "aggressive": 0.00, "lofted": 0.00},
    "balanced":   {"defensive": 0.05, "normal": 0.65, "aggressive": 0.25, "lofted": 0.05},
    "aggressive": {"defensive": 0.00, "normal": 0.30, "aggressive": 0.45, "lofted": 0.25},
    "desperate":  {"defensive": 0.00, "normal": 0.10, "aggressive": 0.35, "lofted": 0.55},
}

# state -> (base swing chance, timing sd seconds, leave-wide chance)
STATE_SKILL = {
    # swing chance, timing sd, leave-wide chance
    "safe":       (0.84, 0.050, 0.25),
    "balanced":   (0.92, 0.045, 0.12),
    "aggressive": (0.97, 0.055, 0.05),
    "desperate":  (1.00, 0.075, 0.00),
}


def _weighted_pick(rng, weights):
    roll = rng.random()
    acc = 0.0
    for k, v in weights.items():
        acc += v
        if roll < acc:
            return k
    return list(weights.keys())[-1]


def _timing_offset(rng, sd, mistake):
    """Near-gaussian offset plus occasional outright errors."""
    if rng.random() < mistake:
        # A proper hack: very early or very late.
        side = -1.0 if rng.random() < 0.45 else 1.0
        return side * (0.12 + rng.random() * 0.20)
    g = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5  # ~N(0, 0.33)
    return g * sd * 2.0


def ai_batting_plan(rng, delivery, ctx, difficulty="medium",
                    hits_stumps_hint=None):
    """Decides how the AI plays one delivery.

    ctx: dict(target, score, balls_remaining including this ball,
              wickets_remaining) - for the first innings the chase fields may
              be None and the AI bats 'balanced with intent to score'.
    Returns dict(state, swing, intent, angle, strength, offset, foot_target,
                 leave_reason).
    """
    tune = DIFFICULTY_TUNING[difficulty]

    if ctx.get("target") is None:
        # First innings: score, but without chase pressure.
        state = "balanced"
        required = None
    else:
        required = ctx["target"] - ctx["score"]
        state = aggression_state(required, ctx["balls_remaining"],
                                 ctx["wickets_remaining"])
        # Winning distance: with 1-2 needed and balls in hand, real batters
        # swing to WIN rather than block toward a tie.
        if required <= 2 and ctx["balls_remaining"] >= 1 and state == "safe":
            state = "balanced"

    swing_chance, sd, leave_wide = STATE_SKILL[state]
    sd *= tune["timing_sd"]
    mistake = tune["mistake"] + (0.14 if state == "desperate" else 0.0)

    plan = {"state": state, "swing": False, "intent": "normal",
            "angle": 0.0, "strength": 0.8, "offset": 0.0,
            "foot_target": (0.0, 0.0), "leave_reason": None}

    # Footwork: get the comfort zone onto the ball's line; stride to length.
    line_x = clamp(delivery.line * 0.45 - 0.10, -1.15, 1.15)
    if delivery.length < 0.30:
        foot_z = 0.75
    elif delivery.length < 0.72:
        foot_z = 0.10
    else:
        foot_z = -0.55
    plan["foot_target"] = (line_x, foot_z)

    # Leave good-width balls when playing safe (unless they hit the stumps).
    wide_ball = abs(delivery.line) > 0.55
    if hits_stumps_hint is None:
        hits_stumps_hint = abs(delivery.line * 0.45) <= 0.18
    if state == "safe" and wide_ball and not hits_stumps_hint \
            and rng.random() < leave_wide:
        plan["leave_reason"] = "wide_outside_off"
        return plan

    if rng.random() > swing_chance:
        plan["leave_reason"] = "held_back"
        return plan

    plan["swing"] = True
    plan["intent"] = _weighted_pick(rng, STATE_INTENTS[state])
    # Aim with the ball's line: off-stump balls driven through cover,
    # leg-side balls flicked square-ish. Desperate swings go straight/lofted.
    if state == "desperate":
        plan["angle"] = (rng.random() * 2 - 1) * 0.35
    else:
        # Wider placement scatter hunts the gaps between ring fielders.
        plan["angle"] = clamp(delivery.line * 1.05 + (rng.random() * 2 - 1) * 0.48,
                              -1.35, 1.35)
    plan["strength"] = 0.55 + 0.45 * rng.random()
    plan["offset"] = _timing_offset(rng, sd, mistake)
    return plan


def ai_swing_frame_time(traj_time_to_contact, intent, offset):
    """When (engine time) the AI must release its swipe for the given offset."""
    return traj_time_to_contact + offset - windup_time(intent)


# ---------------------------------------------------------------------------
# AI vs AI / headless match helper used by the soak tests.

def play_delivery_headless(rng, engine_module, delivery, plan, engine_seed,
                           fielders, max_seconds=12.0):
    """Runs one delivery through the batting + fielding engines headlessly.

    Returns dict(runs, wicket, dismissal, outcome_kind, fielding).
    """
    import batting_reference as br
    import bowling_reference as bw
    import fielding_reference as fw

    eng = br.Engine(seed=engine_seed)
    eng.begin_delivery(delivery)

    # Footwork: drive toward the plan's target from release.
    dt = 1.0 / 120.0
    t = 0.0
    fired = False
    swing_t = None
    if plan["swing"]:
        swing_t = ai_swing_frame_time(eng.traj.time_to_contact, plan["intent"],
                                      plan["offset"])
    result_holder = {}

    while t < 4.0:
        fx, fz = plan["foot_target"]
        ix = clamp(fx - eng.foot.x, -1, 1) * 2.0
        iy = clamp(fz - eng.foot.z, -1, 1) * 2.0
        fire = plan["swing"] and not fired and swing_t is not None and t >= swing_t
        eng.update(dt, footwork_input=br.Vec2(ix, iy), swing=fire,
                   shot_dir=br.Vec2(math.sin(plan["angle"]), math.cos(plan["angle"])),
                   swipe_strength=plan["strength"], intent=plan["intent"])
        if fire:
            fired = True
        t += dt
        if eng.passed_reported or eng.contact_will_happen:
            break

    # Unstruck ball: bowled / lbw / dot from the Phase 2 resolver.
    if not eng.contact_will_happen:
        out = bw.resolve_outcome(rng, eng.traj, eng.last_swing,
                                 eng.foot.x, eng.foot.z)
        return {"runs": out["runs"], "wicket": out["wicket"],
                "dismissal": ("bowled" if out["kind"] == "bowled"
                              else "lbw" if out["kind"] == "lbw" else None),
                "outcome_kind": out["kind"], "fielding": None}

    # Struck: fielding decides everything (catches, stops, boundaries).
    c = eng.last_swing["contact"]
    contact_pos = (eng.traj.x_at_contact, max(eng.traj.height_at_contact, 0.35), 0.35)
    speed = c["exit_kph"] / 3.6
    vel = (c["direction"][0] * speed, c["direction"][1] * speed,
           c["direction"][2] * speed)
    field = fw.simulate_fielding(contact_pos, vel, fielders, rng, max_seconds)

    if field["kind"] == "caught":
        return {"runs": 0, "wicket": True, "dismissal": "caught",
                "outcome_kind": "caught", "fielding": field}
    if field["kind"] in ("four", "six"):
        return {"runs": field["runs"], "wicket": False, "dismissal": None,
                "outcome_kind": field["kind"], "fielding": field}
    return {"runs": field["runs"], "wicket": False, "dismissal": None,
            "outcome_kind": "runs", "fielding": field}
