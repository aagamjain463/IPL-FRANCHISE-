using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;
// BatterHistoryEntry.Intent records the batter's shot intent - the Core.Batting
// enum, NOT the Core.Simulation planning struct of the same name.
using ShotIntent = CricketGame.Core.Batting.ShotIntent;

namespace CricketGame.Core.AI
{
    /// <summary>
    /// Phase 4 AI bowling strategy (spec section 10). The bowler reads the
    /// batter's recent behaviour and adjusts: repeated scoring through one
    /// region gets dried up, an attacking batter gets pace-off or a yorker,
    /// the death of the innings attacks the base. Understandable + tunable;
    /// every plan carries a reason string. Mirrors
    /// harness/phase4_reference.py ai_bowling_plan.
    /// </summary>

    /// <summary>One recent batter behaviour, for the bowling brain to read.</summary>
    public struct BatterHistoryEntry
    {
        public bool HasSector;
        public DirectionSector Sector;
        public int Runs;
        public ShotIntent Intent;
    }

    public struct AiBowlingContext
    {
        public int Score;
        public int WicketsRemaining;
        public int BallsRemaining;
    }

    public struct AiBowlingPlan
    {
        public DeliveryType Type;
        public float LineHint;
        public float LengthHint;
        public string Reason;
    }

    public static class AiBowlingPlanner
    {
        public static AiBowlingPlan Plan(IRng rng, BatterHistoryEntry[] history,
                                         AiBowlingContext ctx, AiDifficulty difficulty)
        {
            var plan = new AiBowlingPlan
            {
                Type = DeliveryType.GoodLength,
                LineHint = 0.10f,
                LengthHint = 0.52f,
                Reason = "stock_good_length"
            };

            int n = history == null ? 0 : history.Length;
            int from = n >= 3 ? n - 3 : 0;

            // ---- repeated scoring through one region -> dry it up.
            if (n - from >= 2 && AllSameSector(history, from, n))
            {
                DirectionSector s = history[n - 1].Sector;
                if (s == DirectionSector.Cover || s == DirectionSector.Point
                    || s == DirectionSector.ThirdMan)
                {
                    plan.Type = DeliveryType.LegCutter;
                    plan.LineHint = -0.25f; plan.LengthHint = 0.55f;
                    plan.Reason = "attack_stumps_away_from_off";
                    return plan;
                }
                if (s == DirectionSector.MidWicket || s == DirectionSector.SquareLeg
                    || s == DirectionSector.FineLeg)
                {
                    plan.Type = DeliveryType.OffCutter;
                    plan.LineHint = 0.30f; plan.LengthHint = 0.50f;
                    plan.Reason = "take_leg_side_out";
                    return plan;
                }
                if (s == DirectionSector.Straight)
                {
                    plan.Type = DeliveryType.SlowerBall;
                    plan.LineHint = 0.05f; plan.LengthHint = 0.28f;
                    plan.Reason = "deception_down_the_ground";
                    return plan;
                }
            }

            // ---- batter hitting hard: take pace off or squeeze the base.
            int recentRuns = 0;
            for (int i = from; i < n; i++) recentRuns += history[i].Runs;
            if (recentRuns >= 8)
            {
                if (rng.NextFloat() < 0.55f)
                {
                    plan.Type = DeliveryType.SlowerBall;
                    plan.LineHint = 0.10f; plan.LengthHint = 0.30f;
                    plan.Reason = "pace_off_vs_aggression";
                }
                else
                {
                    plan.Type = DeliveryType.Yorker;
                    plan.LineHint = 0.05f; plan.LengthHint = 0.03f;
                    plan.Reason = "yorker_vs_aggression";
                }
                return plan;
            }

            // ---- death of the innings with wickets in hand: attack the base.
            if (ctx.BallsRemaining <= 2 && ctx.WicketsRemaining >= 1)
            {
                plan.Type = DeliveryType.Yorker;
                plan.LineHint = 0.02f; plan.LengthHint = 0.03f;
                plan.Reason = "yorker_at_the_death";
                return plan;
            }

            // ---- batter came after the short ball: change length entirely.
            bool shortContest = false;
            for (int i = from; i < n; i++)
                if (history[i].Intent == ShotIntent.Lofted) { shortContest = true; break; }
            if (shortContest && rng.NextFloat() < 0.5f)
            {
                plan.Type = DeliveryType.FullBall;
                plan.LineHint = 0.15f; plan.LengthHint = 0.16f;
                plan.Reason = "full_after_short_contest";
                return plan;
            }

            // ---- hard difficulty scatters the batter with movement.
            if (difficulty == AiDifficulty.Hard && rng.NextFloat() < 0.35f)
            {
                if (rng.NextFloat() < 0.5f)
                {
                    plan.Type = DeliveryType.FastInswinger;
                    plan.LineHint = 0.30f; plan.LengthHint = 0.45f;
                    plan.Reason = "hard_mode_inswing";
                }
                else
                {
                    plan.Type = DeliveryType.FastOutswinger;
                    plan.LineHint = 0.05f; plan.LengthHint = 0.45f;
                    plan.Reason = "hard_mode_outswing";
                }
                return plan;
            }

            return plan;
        }

        private static bool AllSameSector(BatterHistoryEntry[] h, int from, int n)
        {
            DirectionSector first = h[from].Sector;
            for (int i = from; i < n; i++)
            {
                if (!h[i].HasSector) return false;
                if (h[i].Sector != first) return false;
            }
            return true;
        }
    }
}
