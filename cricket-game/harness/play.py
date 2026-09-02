#!/usr/bin/env python3
"""Play a text-mode SUPER OVER (human vs AI) in the terminal.

Same rules engine reference as the Unity game:
  6 legal balls, max 2 wickets, chase wins immediately on reaching target.

Run:  python3 harness/play.py

You bat one innings and bowl the other (toss decides which). Batting: pick a
shot style, then try to press Enter at the right moment of the countdown for
timing quality. Bowling: same timing mechanic sets your bowling threat.
"""

import sys
import threading
import time

from superover_reference import (
    SuperOverMatch, DeliveryOutcome, PHASE_BREAK, PHASE_COMPLETED,
    OUTCOME_FIRST_WIN, OUTCOME_SECOND_WIN, OUTCOME_TIE,
)
from simulation_reference import (
    SeededRng, ShotIntent, BowlingPlan, BallContext, resolve,
    AiBattingPolicy, AiBowlingPolicy,
)

PLAYER = "YOU"
AI = "AI "


def banner(text):
    print("\n" + "=" * 46)
    print(text.center(46))
    print("=" * 46)


def timing_challenge(prompt="Press ENTER at the flash!"):
    """Tiny timing minigame: wait a random interval, flash, measure reaction.
    Returns quality in [0, 1]; 0.3s reaction or better -> perfect-ish."""
    import random
    delay = random.uniform(0.8, 2.2)
    sys.stdout.write(prompt + " ...")
    sys.stdout.flush()
    time.sleep(delay)
    sys.stdout.write(" NOW!\n")
    sys.stdout.flush()
    start = time.perf_counter()
    try:
        input()
    except EOFError:
        return 0.5
    reaction = time.perf_counter() - start
    quality = max(0.0, min(1.0, 1.0 - max(0.0, reaction - 0.12) / 0.55))
    label = "PERFECT!" if quality > 0.85 else "good" if quality > 0.55 else "okay" if quality > 0.3 else "poor"
    print("  timing: %.2f (%s)" % (quality, label))
    return quality


def choose_style():
    while True:
        choice = input("  shot [1] Defensive  [2] Balanced  [3] Aggressive (default 2): ").strip() or "2"
        if choice in ("1", "2", "3"):
            return {
                "1": ("defensive", ShotStyle_names[0]),
                "2": ("balanced", ShotStyle_names[1]),
                "3": ("aggressive", ShotStyle_names[2]),
            }[choice]
        print("  enter 1, 2 or 3")


ShotStyle_names = ("defensive", "balanced", "aggressive")


def hud(m: SuperOverMatch, you_batting_now: bool):
    cur = m.current_innings
    if cur is None:
        return
    line = "%s %d/%d  |  ball %d/6" % (
        PLAYER if you_batting_now else AI, cur.runs, cur.wickets,
        6 - cur.balls_remaining + 1)
    if m.runs_required is not None and m.phase != PHASE_BREAK:
        line += "  |  target %d  need %d  balls left %d  wkts left %d" % (
            m.target, m.runs_required, cur.balls_remaining, cur.wickets_remaining)
    print("  " + line)


def human_bat_ball(rng, m, bowl_policy):
    style_key, style = choose_style()
    quality = timing_challenge("  Watch the bowler run in")
    shot = ShotIntent.from_human_input(style, quality)
    ctx = BallContext.from_match(m)
    bowl = bowl_policy.decide(rng, ctx)
    return resolve(rng, shot, bowl)


def human_bowl_ball(rng, m, bat_policy):
    quality = timing_challenge("  Run in to bowl")
    bowl = BowlingPlan.from_human_input(quality)
    ctx = BallContext.from_match(m)
    shot = bat_policy.decide(rng, ctx)
    return resolve(rng, shot, bowl)


def describe(outcome):
    if outcome.is_wicket:
        return "WICKET! (%s)" % outcome.dismissal
    if outcome.kind == "wide":
        return "wide ball (+1)"
    if outcome.kind == "no_ball":
        return "NO BALL" + (" +%d runs" % outcome.bat_runs if outcome.bat_runs else "")
    if outcome.bat_runs == 6:
        return "SIX!"
    if outcome.bat_runs == 4:
        return "FOUR!"
    if outcome.bat_runs == 0:
        return "dot ball"
    return "%d run%s" % (outcome.bat_runs, "s" if outcome.bat_runs > 1 else "")


def play_innings(m, rng, human_batting, you_batting_now):
    ai_bat = AiBattingPolicy(0.62)
    ai_bowl = AiBowlingPolicy(0.55)
    while m.phase != PHASE_COMPLETED and m.current_innings is not None and not m.current_innings.is_complete:
        hud(m, you_batting_now)
        if human_batting:
            outcome = human_bat_ball(rng, m, ai_bowl)
        else:
            outcome = human_bowl_ball(rng, m, ai_bat)
        m.record_delivery(outcome)
        actor = PLAYER if human_batting else AI
        print("    %s -> %s" % (actor, describe(outcome)))
    hud(m, you_batting_now)


def main():
    import random
    seed = int(time.time()) % 100000
    rng = SeededRng(seed)
    banner("SUPER OVER - %s vs %s" % (PLAYER, AI))
    print("(rules: 6 legal balls, max 2 wickets, chase wins instantly)")

    m = SuperOverMatch()
    human_bats_first = random.random() < 0.5
    print("\nToss: %s bat%s first." % (
        PLAYER if human_bats_first else AI, "" if human_bats_first else "s"))

    m.start()
    banner("1ST INNINGS - %s" % ("YOU BAT" if human_bats_first else "AI BATS (you bowl)"))
    play_innings(m, rng, human_bats_first, human_bats_first)

    print("\n  %s finished on %d/%d." % (PLAYER if human_bats_first else AI,
                                          m.first.runs, m.first.wickets))
    print("  TARGET for the chase: %d" % (m.first.runs + 1))
    input("\nPress ENTER to start the chase...")

    m.start_second_innings()
    banner("2ND INNINGS - %s" % ("YOU CHASE" if not human_bats_first else "AI CHASES (you bowl)"))
    play_innings(m, rng, not human_bats_first, not human_bats_first)

    banner("RESULT")
    r = m.result
    print("  %s: %d/%d (%d legal balls)" % (PLAYER if human_bats_first else AI,
                                             r.first["runs"], r.first["wickets"], r.first["legal_balls"]))
    print("  %s: %d/%d (%d legal balls)  [target %d]" % (
        AI if human_bats_first else PLAYER,
        r.second["runs"], r.second["wickets"], r.second["legal_balls"], r.target))
    if r.outcome == OUTCOME_SECOND_WIN:
        winner = PLAYER if not human_bats_first else AI
        print("\n  %s WIN%s by %d wicket%s (reached the target)!" % (
            winner, "S" if winner == AI else "", r.margin_wickets,
            "s" if r.margin_wickets != 1 else ""))
    elif r.outcome == OUTCOME_FIRST_WIN:
        winner = PLAYER if human_bats_first else AI
        print("\n  %s WIN%s by %d run%s (target not reached)!" % (
            winner, "S" if winner == AI else "", r.margin_runs,
            "s" if r.margin_runs != 1 else ""))
    else:
        print("\n  MATCH TIED (scores level).")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nMatch abandoned. Bye!")
