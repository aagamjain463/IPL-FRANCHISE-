namespace CricketGame.Core.Simulation
{
    /// <summary>Batting shot styles selectable by the human player.</summary>
    public enum ShotStyle
    {
        Defensive,
        Balanced,
        Aggressive
    }

    /// <summary>
    /// What the batter attempts on this delivery.
    /// Aggression drives boundary probability and wicket risk.
    /// Execution is how well the attempt is made (timing, technique).
    /// Both are in [0, 1].
    /// </summary>
    public readonly struct ShotIntent
    {
        public float Aggression { get; }
        public float Execution { get; }

        public ShotIntent(float aggression, float execution)
        {
            Aggression = Clamp01(aggression);
            Execution = Clamp01(execution);
        }

        /// <summary>
        /// Maps the human player's shot style + timing-meter quality to an intent.
        /// Perfect timing on an aggressive shot is the highest-risk, highest-reward play.
        /// </summary>
        public static ShotIntent FromHumanInput(ShotStyle style, float timingQuality)
        {
            float q = Clamp01(timingQuality);
            switch (style)
            {
                case ShotStyle.Defensive:
                    return new ShotIntent(0.12f + 0.10f * q, 0.35f + 0.65f * q);
                case ShotStyle.Aggressive:
                    return new ShotIntent(0.60f + 0.38f * q, 0.15f + 0.85f * q);
                default: // Balanced
                    return new ShotIntent(0.32f + 0.25f * q, 0.25f + 0.75f * q);
            }
        }

        internal static float Clamp01(float v)
        {
            return v < 0f ? 0f : v > 1f ? 1f : v;
        }
    }

    /// <summary>
    /// What the bowler delivers. Threat in [0, 1] raises wicket probability
    /// and suppresses the batter's scoring.
    /// </summary>
    public readonly struct BowlingPlan
    {
        public float Threat { get; }

        public BowlingPlan(float threat)
        {
            Threat = ShotIntent.Clamp01(threat);
        }

        /// <summary>Maps the human bowler's timing-meter quality to threat.</summary>
        public static BowlingPlan FromHumanInput(float timingQuality)
        {
            float q = ShotIntent.Clamp01(timingQuality);
            return new BowlingPlan(0.25f + 0.60f * q);
        }
    }
}
