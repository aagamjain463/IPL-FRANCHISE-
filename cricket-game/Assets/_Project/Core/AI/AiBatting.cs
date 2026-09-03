using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.AI
{
    /// <summary>
    /// AI batting brain. Mirrors harness/ai_reference.py exactly - the AI
    /// batsman drives the SAME batting engine a human uses (intent + swipe
    /// direction + timing offset + footwork), so difficulty changes behaviour,
    /// never raw score probability.
    /// </summary>
    public enum AiAggressionState { Safe, Balanced, Aggressive, Desperate }

    public enum AiDifficulty { Easy, Medium, Hard }

    /// <summary>Phase 4 batter personality (spec section 8).</summary>
    public enum AiBatterArchetype { Aggressive, Balanced, Defensive }

    /// <summary>
    /// Archetype tuning: multiplies the situation-based intent weights and
    /// nudges swing/leave discipline. Deterministic - no extra RNG
    /// consumption - so Balanced reproduces Phase 3 behaviour bit-for-bit.
    /// </summary>
    public struct AiArchetypeTuning
    {
        public float WDefensive, WNormal, WAggressive, WLofted;
        public float SwingChanceDelta;
        public float LeaveDelta;
        public float TimingSdMult;

        public static AiArchetypeTuning For(AiBatterArchetype a)
        {
            switch (a)
            {
                case AiBatterArchetype.Aggressive:
                    return new AiArchetypeTuning
                    {
                        WDefensive = 0.45f, WNormal = 0.90f, WAggressive = 1.35f, WLofted = 1.45f,
                        SwingChanceDelta = 0.03f, LeaveDelta = -0.10f, TimingSdMult = 1.06f
                    };
                case AiBatterArchetype.Defensive:
                    return new AiArchetypeTuning
                    {
                        WDefensive = 1.80f, WNormal = 1.10f, WAggressive = 0.55f, WLofted = 0.30f,
                        SwingChanceDelta = -0.05f, LeaveDelta = 0.12f, TimingSdMult = 0.92f
                    };
                default: // Balanced
                    return new AiArchetypeTuning
                    {
                        WDefensive = 1.00f, WNormal = 1.00f, WAggressive = 1.00f, WLofted = 1.00f,
                        SwingChanceDelta = 0.00f, LeaveDelta = 0.00f, TimingSdMult = 1.00f
                    };
            }
        }
    }

    public struct AiDifficultyTuning
    {
        public float TimingSd;          // multiplier on state timing spread
        public float Mistake;           // chance of an outright hack
        public float FieldVsPlayer;     // field quality when AI fields to the player
        public float FieldForPlayer;    // field quality when the player fields to AI
        public float AiBowlingAccuracy;

        public static AiDifficultyTuning For(AiDifficulty d)
        {
            switch (d)
            {
                case AiDifficulty.Easy:
                    return new AiDifficultyTuning
                    {
                        TimingSd = 1.45f, Mistake = 0.10f, FieldVsPlayer = 0.80f,
                        FieldForPlayer = 1.10f, AiBowlingAccuracy = 0.60f,
                    };
                case AiDifficulty.Hard:
                    return new AiDifficultyTuning
                    {
                        TimingSd = 0.78f, Mistake = 0.02f, FieldVsPlayer = 1.15f,
                        FieldForPlayer = 0.90f, AiBowlingAccuracy = 0.85f,
                    };
                default:
                    return new AiDifficultyTuning
                    {
                        TimingSd = 1.00f, Mistake = 0.05f, FieldVsPlayer = 1.00f,
                        FieldForPlayer = 1.00f, AiBowlingAccuracy = 0.75f,
                    };
            }
        }
    }

    /// <summary>Chase context handed to the planner. For the first innings
    /// Target is null and the AI bats "balanced with intent to score".</summary>
    public struct AiChaseContext
    {
        public int? Target;
        public int Score;
        public int BallsRemaining;      // including the ball about to be bowled
        public int WicketsRemaining;
    }

    /// <summary>Everything the AI decided for one delivery.</summary>
    public sealed class AiBattingPlan
    {
        public AiAggressionState State;
        public bool Swing;
        public ShotIntent Intent = ShotIntent.Normal;
        public float Angle;             // shot direction (rad from straight)
        public float Strength = 0.8f;   // swipe strength 0..1
        public float Offset;            // intended timing error (seconds)
        public Vec2 FootTarget = Vec2.Zero;
        public string LeaveReason;      // null when swinging
    }

    public static class AiBattingPlanner
    {
        /// <summary>Strategic state for the chasing side (spec section 15).</summary>
        public static AiAggressionState AggressionState(int requiredRuns,
                                                        int ballsRemaining,
                                                        int wicketsRemaining)
        {
            if (ballsRemaining <= 0) return AiAggressionState.Desperate;
            if (requiredRuns <= 0) return AiAggressionState.Safe;
            float rrr = requiredRuns / (float)ballsRemaining;
            if (requiredRuns <= ballsRemaining && wicketsRemaining >= 2)
                return AiAggressionState.Safe;
            if (rrr <= 2.2f) return AiAggressionState.Balanced;
            if (rrr <= 4.2f) return AiAggressionState.Aggressive;
            return AiAggressionState.Desperate;
        }

        private struct StateSkill
        {
            public float SwingChance;
            public float TimingSd;
            public float LeaveWide;
        }

        private static StateSkill SkillOf(AiAggressionState s)
        {
            switch (s)
            {
                case AiAggressionState.Safe:
                    return new StateSkill { SwingChance = 0.84f, TimingSd = 0.050f, LeaveWide = 0.25f };
                case AiAggressionState.Balanced:
                    return new StateSkill { SwingChance = 0.92f, TimingSd = 0.045f, LeaveWide = 0.12f };
                case AiAggressionState.Aggressive:
                    return new StateSkill { SwingChance = 0.97f, TimingSd = 0.055f, LeaveWide = 0.05f };
                default:
                    return new StateSkill { SwingChance = 1.00f, TimingSd = 0.075f, LeaveWide = 0.00f };
            }
        }

        // Base situation weights {defensive, normal, aggressive, lofted}.
        private static void BaseWeights(AiAggressionState s, float[] w)
        {
            switch (s)
            {
                case AiAggressionState.Safe:
                    w[0] = 0.35f; w[1] = 0.65f; w[2] = 0.00f; w[3] = 0.00f; break;
                case AiAggressionState.Balanced:
                    w[0] = 0.05f; w[1] = 0.65f; w[2] = 0.25f; w[3] = 0.05f; break;
                case AiAggressionState.Aggressive:
                    w[0] = 0.00f; w[1] = 0.30f; w[2] = 0.45f; w[3] = 0.25f; break;
                default: // Desperate
                    w[0] = 0.00f; w[1] = 0.10f; w[2] = 0.35f; w[3] = 0.55f; break;
            }
        }

        /// <summary>Situation sets the base weights; archetype rescales them.
        /// With the Balanced archetype this reproduces the Phase 3 thresholds
        /// exactly (weights sum to 1 and match the old roll cutoffs).</summary>
        private static ShotIntent PickIntent(IRng rng, AiAggressionState s,
                                             AiArchetypeTuning arch)
        {
            float[] w = new float[4];
            BaseWeights(s, w);
            w[0] *= arch.WDefensive;
            w[1] *= arch.WNormal;
            w[2] *= arch.WAggressive;
            w[3] *= arch.WLofted;

            float total = w[0] + w[1] + w[2] + w[3];
            float roll = rng.NextFloat() * (total > 0f ? total : 1f);
            float acc = 0f;
            for (int i = 0; i < 4; i++)
            {
                acc += w[i];
                if (roll < acc)
                {
                    switch (i)
                    {
                        case 0: return ShotIntent.Defensive;
                        case 1: return ShotIntent.Normal;
                        case 2: return ShotIntent.Aggressive;
                        default: return ShotIntent.Lofted;
                    }
                }
            }
            return ShotIntent.Lofted;
        }

        /// <summary>Near-gaussian offset plus occasional outright errors.</summary>
        private static float TimingOffset(IRng rng, float sd, float mistake)
        {
            if (rng.NextFloat() < mistake)
            {
                // a proper hack: very early or very late
                float side = rng.NextFloat() < 0.45f ? -1f : 1f;
                return side * (0.12f + rng.NextFloat() * 0.20f);
            }
            float g = (rng.NextFloat() + rng.NextFloat() + rng.NextFloat() - 1.5f) / 1.5f;
            return g * sd * 2f;
        }

        private static float Clamp(float v, float lo, float hi)
        {
            return v < lo ? lo : (v > hi ? hi : v);
        }

        /// <summary>Decides how the AI plays one delivery.</summary>
        public static AiBattingPlan Plan(IRng rng, DeliveryData delivery,
                                         AiChaseContext ctx, AiDifficulty difficulty,
                                         bool? hitsStumpsHint,
                                         AiBatterArchetype archetype = AiBatterArchetype.Balanced)
        {
            AiDifficultyTuning tune = AiDifficultyTuning.For(difficulty);
            AiArchetypeTuning arch = AiArchetypeTuning.For(archetype);

            AiAggressionState state;
            int? required = null;
            if (!ctx.Target.HasValue)
            {
                state = AiAggressionState.Balanced;   // first innings: just score
            }
            else
            {
                required = ctx.Target.Value - ctx.Score;
                state = AggressionState(required.Value, ctx.BallsRemaining,
                                        ctx.WicketsRemaining);
                // Winning distance: with 1-2 needed and balls in hand, real
                // batters swing to WIN rather than block toward a tie.
                if (required.Value <= 2 && ctx.BallsRemaining >= 1
                    && state == AiAggressionState.Safe)
                    state = AiAggressionState.Balanced;
            }

            StateSkill skill = SkillOf(state);
            // Phase 4 archetype: personality nudges swing/leave discipline.
            float swingChance = Clamp(skill.SwingChance + arch.SwingChanceDelta, 0f, 1f);
            float leaveWide = Clamp(skill.LeaveWide + arch.LeaveDelta, 0f, 0.9f);
            float sd = skill.TimingSd * tune.TimingSd * arch.TimingSdMult;
            float mistake = tune.Mistake + (state == AiAggressionState.Desperate ? 0.14f : 0f);

            var plan = new AiBattingPlan { State = state };

            // Footwork: comfort zone onto the ball's line; stride to length.
            float lineX = Clamp(delivery.Line * 0.45f - 0.10f, -1.15f, 1.15f);
            float footZ = delivery.Length < 0.30f ? 0.75f
                        : delivery.Length < 0.72f ? 0.10f : -0.55f;
            plan.FootTarget = new Vec2(lineX, footZ);

            // Leave good-width balls when playing safe (unless they hit stumps).
            bool wideBall = delivery.Line > 0.55f || delivery.Line < -0.55f;
            bool hitsStumps = hitsStumpsHint ?? (delivery.Line * 0.45f <= 0.18f
                                                 && delivery.Line * 0.45f >= -0.18f);
            if (state == AiAggressionState.Safe && wideBall && !hitsStumps
                && rng.NextFloat() < leaveWide)
            {
                plan.LeaveReason = "wide_outside_off";
                return plan;
            }

            if (rng.NextFloat() > swingChance)
            {
                plan.LeaveReason = "held_back";
                return plan;
            }

            plan.Swing = true;
            plan.Intent = PickIntent(rng, state, arch);

            // Aim with the ball's line: off-stump balls driven through cover,
            // leg-side balls flicked square-ish. Desperate swings go straight.
            if (state == AiAggressionState.Desperate)
            {
                plan.Angle = (rng.NextFloat() * 2f - 1f) * 0.35f;
            }
            else
            {
                // Wider placement scatter hunts the gaps between ring fielders.
                plan.Angle = Clamp(delivery.Line * 1.05f + (rng.NextFloat() * 2f - 1f) * 0.48f,
                                   -1.35f, 1.35f);
            }
            plan.Strength = 0.55f + 0.45f * rng.NextFloat();
            plan.Offset = TimingOffset(rng, sd, mistake);
            return plan;
        }

        /// <summary>Engine time at which the AI must release its swipe to hit
        /// the intended timing offset.</summary>
        public static float SwingFrameTime(float trajTimeToContact, ShotIntent intent,
                                           float offset)
        {
            return trajTimeToContact + offset - TimingSystem.WindupTime(intent);
        }
    }
}
