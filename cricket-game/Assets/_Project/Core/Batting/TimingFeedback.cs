namespace CricketGame.Core.Batting
{
    /// <summary>
    /// Phase 4 timing FEEL (spec section 3). Six distinguishable tiers drive
    /// both gameplay shaping (power/control) and presentation (haptic, bat
    /// shake, camera response). A PERFECT aggressive shot carries more
    /// attacking potential; a PERFECT defensive shot is still just a block
    /// (the defensive contact path is separately capped).
    /// Mirrors harness/phase4_reference.py TIMING_TIERS.
    /// </summary>
    public struct TimingTier
    {
        public float Power;
        public float Control;
        public string Label;
        public float Haptic;
        public float BatShake;
        public float Camera;

        public static TimingTier For(TimingWindow w)
        {
            switch (w)
            {
                case TimingWindow.Perfect:
                    return new TimingTier { Power = 1.12f, Control = 1.00f, Label = "PERFECT", Haptic = 0.35f, BatShake = 0.30f, Camera = 0.25f };
                case TimingWindow.Good:
                    return new TimingTier { Power = 0.95f, Control = 0.90f, Label = "GOOD", Haptic = 0.18f, BatShake = 0.15f, Camera = 0.10f };
                case TimingWindow.Early:
                    return new TimingTier { Power = 0.72f, Control = 0.62f, Label = "EARLY", Haptic = 0.08f, BatShake = 0.08f, Camera = 0.04f };
                case TimingWindow.Late:
                    return new TimingTier { Power = 0.72f, Control = 0.62f, Label = "LATE", Haptic = 0.08f, BatShake = 0.08f, Camera = 0.04f };
                case TimingWindow.VeryEarly:
                    return new TimingTier { Power = 0.45f, Control = 0.30f, Label = "VERY EARLY", Haptic = 0.03f, BatShake = 0.04f, Camera = 0.02f };
                case TimingWindow.VeryLate:
                    return new TimingTier { Power = 0.45f, Control = 0.30f, Label = "VERY LATE", Haptic = 0.03f, BatShake = 0.04f, Camera = 0.02f };
                default: // Missed
                    return new TimingTier { Power = 0.00f, Control = 0.00f, Label = "MISSED", Haptic = 0.00f, BatShake = 0.00f, Camera = 0.00f };
            }
        }
    }

    public struct TimingFeedbackResult
    {
        public TimingWindow Window;
        public float PowerMult;
        public float ControlMult;
        public string Label;
        public float Haptic;
        public float BatShake;
        public float Camera;
        /// <summary>Applied attack potential. Only attacking intents exceed 1.</summary>
        public float AttackBoost;
    }

    public static class TimingFeedback
    {
        public static TimingFeedbackResult Resolve(TimingWindow window, ShotIntent intent)
        {
            TimingTier tier = TimingTier.For(window);
            bool attacking = intent == ShotIntent.Aggressive || intent == ShotIntent.Lofted;
            float boost = attacking ? tier.Power : (tier.Power < 1f ? tier.Power : 1f);
            return new TimingFeedbackResult
            {
                Window = window,
                PowerMult = tier.Power,
                ControlMult = tier.Control,
                Label = tier.Label,
                Haptic = tier.Haptic,
                BatShake = tier.BatShake,
                Camera = tier.Camera,
                AttackBoost = boost
            };
        }
    }
}
