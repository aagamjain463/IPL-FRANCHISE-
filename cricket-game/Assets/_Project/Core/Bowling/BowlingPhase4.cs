using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.Bowling
{
    /// <summary>
    /// Phase 4 bowling depth: configurable bowler profiles, a release-timing
    /// skill mechanic, and the loss-of-control spray that produces WIDES.
    /// Mirrors harness/bowling_reference.py (Phase 4 block) and the
    /// matchflow wide handling. Pure + deterministic given the RNG stream.
    /// </summary>

    /// <summary>Bowler character presets (spec section 5 profiles).</summary>
    public enum BowlerProfileKind { Fast, Swing, Variation }

    public struct BowlerProfile
    {
        public string Name;
        public float SpeedMult;
        public float SwingMult;
        public float SeamMult;
        public float Accuracy;

        public static BowlerProfile For(BowlerProfileKind kind)
        {
            switch (kind)
            {
                case BowlerProfileKind.Fast:
                    return new BowlerProfile { Name = "FAST BOWLER", SpeedMult = 1.06f, SwingMult = 0.70f, SeamMult = 0.80f, Accuracy = 0.78f };
                case BowlerProfileKind.Variation:
                    return new BowlerProfile { Name = "PACE VARIATION BOWLER", SpeedMult = 0.92f, SwingMult = 0.80f, SeamMult = 1.25f, Accuracy = 0.80f };
                default: // Swing
                    return new BowlerProfile { Name = "SWING BOWLER", SpeedMult = 0.96f, SwingMult = 1.35f, SeamMult = 0.70f, Accuracy = 0.74f };
            }
        }
    }

    /// <summary>Quality of the bowler's release timing.</summary>
    public enum ReleaseQuality { Perfect, Good, Early, Late, VeryEarly, VeryLate }

    public static class ReleaseControl
    {
        public const float PerfectWindow = 0.03f;
        public const float GoodWindow = 0.07f;
        public const float MaxError = 0.14f;

        public static ReleaseQuality Classify(float offset)
        {
            float a = offset < 0 ? -offset : offset;
            if (a <= PerfectWindow) return ReleaseQuality.Perfect;
            if (a <= GoodWindow) return ReleaseQuality.Good;
            if (a <= MaxError) return offset < 0 ? ReleaseQuality.Early : ReleaseQuality.Late;
            return offset < 0 ? ReleaseQuality.VeryEarly : ReleaseQuality.VeryLate;
        }

        /// <summary>
        /// Applies release timing drift: perfect = as intended; early = fuller
        /// + wider; late = shorter + pulled in. Returns a NEW delivery.
        /// </summary>
        public static DeliveryData Apply(DeliveryData d, float offset, float accuracy)
        {
            if (Classify(offset) == ReleaseQuality.Perfect) return d;

            float abs = offset < 0 ? -offset : offset;
            float err = abs / MaxError; if (err > 1.6f) err = 1.6f;
            float acc = accuracy < 0f ? 0f : accuracy > 1f ? 1f : accuracy;
            float blur = 1.25f - acc;
            int sign = d.Line >= 0f ? 1 : -1;

            if (offset < 0)
            {
                d.Length = Clamp01(d.Length - 0.34f * err * blur);
                d.Line = Clamp(d.Line + 0.40f * err * blur * sign, -1.2f, 1.2f);
            }
            else
            {
                d.Length = Clamp01(d.Length + 0.30f * err * blur);
                d.Line = Clamp(d.Line - 0.30f * err * blur * sign, -1.2f, 1.2f);
            }
            return d;
        }

        private static float Clamp(float v, float lo, float hi)
        { return v < lo ? lo : v > hi ? hi : v; }
        private static float Clamp01(float v)
        { return v < 0f ? 0f : v > 1f ? 1f : v; }
    }

    /// <summary>
    /// Legality + spray. A wide adds one run and consumes NO legal ball -
    /// the rules engine already supports DeliveryOutcome.Wide().
    /// </summary>
    public static class DeliveryLegality
    {
        public const float WideLineThreshold = 0.95f;

        public static bool IsWide(float line)
        {
            float a = line < 0 ? -line : line;
            return a > WideLineThreshold;
        }
    }

    public static class SprayModel
    {
        /// <summary>Per-difficulty loss-of-control rate multiplier.</summary>
        public static float RateFor(AI.AiDifficulty d)
        {
            switch (d)
            {
                case AI.AiDifficulty.Easy: return 0.100f;
                case AI.AiDifficulty.Hard: return 0.060f;
                default: return 0.080f;
            }
        }

        public static float Probability(float accuracy, AI.AiDifficulty d)
        {
            float acc = accuracy < 0f ? 0f : accuracy > 1f ? 1f : accuracy;
            float p = (1f - acc) * RateFor(d);
            return p > 0.12f ? 0.12f : p;
        }
    }

    /// <summary>Result of the full bowling pipeline for one delivery.</summary>
    public struct BowledDelivery
    {
        public DeliveryData Delivery;
        public ReleaseQuality Quality;
        public bool Wide;
    }

    public static class BowlingPipeline
    {
        /// <summary>
        /// Release timing -> drift, then a control check that can spray the
        /// ball wide. Deterministic given the RNG stream.
        /// </summary>
        public static BowledDelivery Bowl(IRng rng, DeliveryData sampled,
                                          float releaseOffset, float accuracy,
                                          AI.AiDifficulty difficulty)
        {
            DeliveryData d = ReleaseControl.Apply(sampled, releaseOffset, accuracy);
            var result = new BowledDelivery
            {
                Delivery = d,
                Quality = ReleaseControl.Classify(releaseOffset),
                Wide = false
            };

            if (rng.NextFloat() < SprayModel.Probability(accuracy, difficulty))
            {
                int sign = d.Line >= 0f ? 1 : -1;
                d.Line = sign * (0.98f + rng.NextFloat() * 0.22f);
                if (d.Line > 1.2f) d.Line = 1.2f;
                if (d.Line < -1.2f) d.Line = -1.2f;
                result.Delivery = d;
                result.Wide = true;
            }
            else
            {
                result.Wide = DeliveryLegality.IsWide(d.Line);
            }
            return result;
        }

        /// <summary>Applies a bowler profile to a sampled delivery.</summary>
        public static DeliveryData ApplyProfile(DeliveryData d, BowlerProfile p)
        {
            d.SpeedKph *= p.SpeedMult;
            d.Swing = Clamp(d.Swing * p.SwingMult, -1.5f, 1.5f);
            d.Seam = Clamp(d.Seam * p.SeamMult, -1.5f, 1.5f);
            return d;
        }

        private static float Clamp(float v, float lo, float hi)
        { return v < lo ? lo : v > hi ? hi : v; }
    }
}
