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
import phase4_reference as p4
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


# Phase 4: bowler release-timing scatter. Even bots do not hit their release
# window perfectly; poorer accuracy means bigger drift, and a very bad
# release sprays the ball - occasionally past the wide line (extra run, no
# legal ball consumed). Offset = triangular(-1..1) * 3 * sd.
RELEASE_SD = {"easy": 0.062, "medium": 0.055, "hard": 0.051}


def play_match(seed, difficulty="medium",
               force_innings1=None, force_innings2=None,
               archetype1="balanced", archetype2="balanced",
               bowling_strategy=True, wides=True):
    """Simulates a complete Super Over: innings 1 (bot A) vs chase (bot B).

    Both sides are driven by the AI batting planner with different seeds, so
    results vary realistically. Returns (match, log) where log is a list of
    per-ball dicts with innings index + result.

    Phase 4 switches (all backward compatible):
      archetype1/2 - batter personalities per innings.
      bowling_strategy - bowlers adapt to the batter's recent scoring.
      wides - release drift can produce wides (never a legal ball).
    """
    rng_main = random.Random(seed)
    match = SuperOverMatch()
    match.start()
    log = []

    tune = ai.DIFFICULTY_TUNING[difficulty]
    archetypes = [archetype1, archetype2]
    bat_history = [[], []]     # per innings: recent dicts(sector, runs, intent)

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
    safety = 0

    while match.phase != PHASE_COMPLETED:
        safety += 1
        if safety > 200:
            raise RuntimeError("play_match did not converge")
        if match.phase == PHASE_BREAK:
            match.start_second_innings()
            continue

        innings_idx = match.current_innings_index
        fielders = fw.default_field(scale=field_scale_for(innings_idx))
        ctx = ctx_for(match, innings_idx)

        # ---- bowler side: strategy (reads the batter) then delivery type.
        line_hint = length_hint = None
        reason = "stock"
        if bowling_strategy:
            bplan = p4.ai_bowling_plan(rng_main, bat_history[innings_idx],
                                       ctx, difficulty)
            dtype = bplan["type"]
            line_hint, length_hint = bplan["line_hint"], bplan["length_hint"]
            reason = bplan["reason"]
        else:
            dtype = bw.next_delivery_type(rng_main)

        delivery = bw.build_delivery(dtype, rng_main,
                                     accuracy=tune["ai_bowling_acc"],
                                     line_hint=line_hint, length_hint=length_hint)

        # ---- release control + control check. A bad release drifts the
        #      length; a loss of control sprays the ball WIDE (extra run,
        #      no legal ball consumed).
        if wides:
            sd = RELEASE_SD.get(difficulty, RELEASE_SD["medium"])
            release_offset = (rng_main.random() + rng_main.random() - 1.0) * sd * 3.0
            bowled = bw.bowl_with_release(rng_main, delivery, release_offset,
                                          accuracy=tune["ai_bowling_acc"],
                                          difficulty=difficulty)
            delivery = bowled["delivery"]
            if bowled["wide"]:
                match.record_delivery(DeliveryOutcome.wide())
                log.append({"innings": innings_idx, "type": dtype, "wide": True,
                            "reason": reason, "phase_after": match.phase})
                continue

        traj = br.Trajectory(delivery)
        plan = ai.ai_batting_plan(rng_main, delivery, ctx, difficulty,
                                  hits_stumps_hint=traj.hits_stumps(),
                                  archetype=archetypes[innings_idx])

        force = forces[innings_idx]
        res = deliver_once(rng_main, delivery, plan,
                           engine_seed=rng_main.randrange(1 << 30),
                           fielders=fielders, force=force)

        # ---- remember what the batter did, so the bowler can adapt.
        bat_history[innings_idx].append({
            "sector": br.sector_of(plan["angle"]) if plan["swing"] else None,
            "runs": res["runs"], "intent": plan["intent"],
        })
        if len(bat_history[innings_idx]) > 6:
            bat_history[innings_idx].pop(0)

        match.record_delivery(outcome_to_rules(res))
        log.append({"innings": innings_idx, "type": dtype, "result": res,
                    "reason": reason, "phase_after": match.phase})

    return match, log
