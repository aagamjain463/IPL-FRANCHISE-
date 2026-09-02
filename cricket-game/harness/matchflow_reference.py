"""Headless full-match runner used by the Phase 3 tests.

Wires the deterministic engines together exactly the way the Unity layer
does: bowling factory -> batting engine -> Phase 2 resolver (unstruck) ->
fielding simulation (struck) -> Super Over rules engine.
"""

import math
import random

import batting_reference as br
import bowling_reference as bw
import fielding_reference as fw
import ai_reference as ai
from superover_reference import SuperOverMatch, DeliveryOutcome, PHASE_BREAK, PHASE_COMPLETED


DISMISSAL_MAP = {"bowled": "bowled", "lbw": "lbw", "caught": "caught"}


def deliver_once(rng, delivery, batting_plan, engine_seed, fielders,
                 force=None):
    """Plays one delivery headlessly.

    Returns dict(runs, wicket, dismissal, kind, fielding) where kind is one
    of the cricket labels (leave/beaten/bowled/lbw/caught/four/six/runs/dot).
    `force` mirrors the debug force-outcome hook (dot/one/two/four/six/
    edge/bowled/lbw).
    """
    if force is not None:
        forced = bw.resolve_outcome(rng, None, None, 0.0, 0.0, force=force)
        return {"runs": forced["runs"], "wicket": forced["wicket"],
                "dismissal": DISMISSAL_MAP.get(forced["kind"]),
                "outcome_kind": forced["kind"], "fielding": None}

    return ai.play_delivery_headless(rng, br, delivery, batting_plan,
                                     engine_seed, fielders)


def outcome_to_rules(res):
    """Maps a headless delivery result onto the rules engine's delivery types."""
    if res["wicket"]:
        return DeliveryOutcome.wicket(DISMISSAL_MAP.get(res["dismissal"], "bowled"))
    return DeliveryOutcome.legal(res["runs"])


def play_match(seed, difficulty="medium",
               force_innings1=None, force_innings2=None):
    """Simulates a complete Super Over: innings 1 (bot A) vs chase (bot B).

    Both sides are driven by the AI batting planner with different seeds, so
    results vary realistically. Returns (match, log) where log is a list of
    per-ball dicts with innings index + result.
    """
    rng_main = random.Random(seed)
    match = SuperOverMatch()
    match.start()
    log = []

    tune = ai.DIFFICULTY_TUNING[difficulty]

    def field_scale_for(innings_idx):
        # Fielders try to stop whoever is batting.
        if innings_idx == 0:
            return tune["field_vs_player"]
        return tune["field_for_player"]

    def ctx_for(match_obj, innings_idx):
        if innings_idx == 0:
            return {"target": None, "score": match_obj.first.runs,
                    "balls_remaining": match_obj.first.balls_remaining,
                    "wickets_remaining": match_obj.first.wickets_remaining}
        return {"target": match_obj.first.runs + 1,
                "score": match_obj.second.runs,
                "balls_remaining": match_obj.second.balls_remaining,
                "wickets_remaining": match_obj.second.wickets_remaining}

    forces = [force_innings1, force_innings2]

    while match.phase != PHASE_COMPLETED:
        if match.phase == PHASE_BREAK:
            match.start_second_innings()
            continue

        innings_idx = match.current_innings_index
        fielders = fw.default_field(scale=field_scale_for(innings_idx))

        # Bowler picks a delivery from the plan.
        dtype = bw.next_delivery_type(rng_main)
        delivery = bw.build_delivery(dtype, rng_main,
                                     accuracy=tune["ai_bowling_acc"])
        traj = br.Trajectory(delivery)

        ctx = ctx_for(match, innings_idx)
        plan = ai.ai_batting_plan(rng_main, delivery, ctx, difficulty,
                                  hits_stumps_hint=traj.hits_stumps())

        force = forces[innings_idx]
        res = deliver_once(rng_main, delivery, plan,
                           engine_seed=rng_main.randrange(1 << 30),
                           fielders=fielders, force=force)

        match.record_delivery(outcome_to_rules(res))
        log.append({"innings": innings_idx, "type": dtype, "result": res,
                    "phase_after": match.phase})

    return match, log
