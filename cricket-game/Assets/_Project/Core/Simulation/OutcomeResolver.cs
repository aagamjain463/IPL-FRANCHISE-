using CricketGame.Core.Rules;

namespace CricketGame.Core.Simulation
{
    /// <summary>
    /// Resolves one delivery attempt into a concrete <see cref="DeliveryOutcome"/>
    /// from the batter's intent and the bowler's threat. Pure function of
    /// (rng, shot, bowl, config) — this is the single source of truth for
    /// outcome probabilities, shared by human and AI participants.
    ///
    /// Model (all probabilities clamped to sane ranges):
    ///   wide chance   = 0.030 + 0.040*aggression + 0.020*(1 - threat)
    ///   wicket chance = 0.025 + 0.160*aggression^1.4 + 0.140*(1 - execution)
    ///                   + 0.080*threat - 0.060*execution*threat
    ///   otherwise runs sampled from weights:
    ///     dot: 0.55 - 0.30*aggression + 0.25*(1 - execution)
    ///       1: 0.34 - 0.06*aggression
    ///       2: 0.08 + 0.06*execution
    ///       3: 0.012
    ///       4: 0.035 + 0.30*aggression*execution
    ///       6: 0.008 + 0.24*aggression^2*execution
    /// </summary>
    public static class OutcomeResolver
    {
        public static DeliveryOutcome Resolve(IRng rng, ShotIntent shot, BowlingPlan bowl,
                                              SuperOverConfig config)
        {
            float aggression = shot.Aggression;
            float execution = shot.Execution;
            float threat = bowl.Threat;

            // --- extras (only when the ruleset allows them)
            if (config.AllowExtras)
            {
                float wideChance = Clamp(0.030f + 0.040f * aggression + 0.020f * (1f - threat),
                                         0.01f, 0.12f);
                if (rng.NextFloat() < wideChance)
                    return DeliveryOutcome.Wide();
            }

            // --- wicket
            float wicketChance = Clamp(
                0.025f
                + 0.160f * (float)System.Math.Pow(aggression, 1.4)
                + 0.140f * (1f - execution)
                + 0.080f * threat
                - 0.060f * execution * threat,
                0.02f, 0.45f);

            if (rng.NextFloat() < wicketChance)
            {
                float pick = rng.NextFloat();
                DismissalKind kind;
                if (pick < 0.40f) kind = DismissalKind.Bowled;
                else if (pick < 0.75f) kind = DismissalKind.Caught;
                else if (pick < 0.90f) kind = DismissalKind.Lbw;
                else kind = DismissalKind.Stumped;
                return DeliveryOutcome.Wicket(kind);
            }

            // --- runs off the bat
            float[] weights = new float[7];
            weights[0] = 0.55f - 0.30f * aggression + 0.25f * (1f - execution);
            weights[1] = 0.34f - 0.06f * aggression;
            weights[2] = 0.08f + 0.06f * execution;
            weights[3] = 0.012f;
            weights[4] = 0.035f + 0.30f * aggression * execution;
            weights[6] = 0.008f + 0.24f * aggression * aggression * execution;
            weights[5] = 0.004f + 0.020f * aggression * execution; // rare five

            float total = 0f;
            for (int i = 0; i < 7; i++)
            {
                if (weights[i] < 0f) weights[i] = 0f;
                total += weights[i];
            }

            float roll = rng.NextFloat() * total;
            for (int i = 0; i < 7; i++)
            {
                roll -= weights[i];
                if (roll < 0f) return DeliveryOutcome.Legal(i);
            }
            return DeliveryOutcome.Legal(0);
        }

        private static float Clamp(float v, float min, float max)
        {
            return v < min ? min : v > max ? max : v;
        }
    }
}
