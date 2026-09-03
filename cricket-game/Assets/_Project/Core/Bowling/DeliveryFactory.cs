using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.Bowling
{
    /// <summary>
    /// Tuning ranges for one stock delivery type (spec section 1). Pure data;
    /// the Unity layer can wrap these in ScriptableObjects for designer tuning.
    /// </summary>
    public struct DeliverySpec
    {
        public DeliveryType Type;
        public float SpeedMin, SpeedMax;
        public float LineMin, LineMax;
        public float LengthMin, LengthMax;
        public float SwingMin, SwingMax;
        public float SeamMin, SeamMax;
        public float BounceMin, BounceMax;

        public static DeliverySpec For(DeliveryType type)
        {
            switch (type)
            {
                case DeliveryType.FastStraight:
                    return Spec(type, 132f, 142f, -0.18f, 0.18f, 0.45f, 0.65f, -0.15f, 0.15f, -0.25f, 0.25f, 0.95f, 1.05f);
                case DeliveryType.FastInswinger:
                    return Spec(type, 127f, 137f, 0.15f, 0.50f, 0.30f, 0.55f, -0.95f, -0.55f, -0.55f, -0.10f, 0.95f, 1.05f);
                case DeliveryType.FastOutswinger:
                    return Spec(type, 127f, 137f, -0.10f, 0.30f, 0.30f, 0.55f, 0.55f, 0.95f, 0.05f, 0.40f, 0.95f, 1.05f);
                case DeliveryType.Yorker:
                    return Spec(type, 135f, 146f, -0.15f, 0.20f, 0.00f, 0.07f, -0.30f, 0.30f, -0.15f, 0.15f, 0.85f, 0.95f);
                case DeliveryType.FullBall:
                    return Spec(type, 114f, 126f, -0.25f, 0.35f, 0.08f, 0.24f, -0.40f, 0.40f, -0.30f, 0.30f, 0.90f, 1.00f);
                case DeliveryType.GoodLength:
                    return Spec(type, 121f, 133f, -0.20f, 0.40f, 0.45f, 0.62f, -0.35f, 0.35f, -0.40f, 0.40f, 0.95f, 1.05f);
                case DeliveryType.ShortBall:
                    return Spec(type, 129f, 140f, -0.50f, 0.10f, 0.72f, 0.86f, -0.20f, 0.20f, -0.25f, 0.25f, 1.00f, 1.15f);
                case DeliveryType.Bouncer:
                    return Spec(type, 133f, 145f, -0.55f, 0.05f, 0.88f, 0.97f, -0.15f, 0.15f, -0.15f, 0.15f, 1.10f, 1.30f);
                // --- Phase 4 variations: cutters grip, slower balls deceive.
                case DeliveryType.OffCutter:
                    return Spec(type, 112f, 122f, -0.10f, 0.35f, 0.40f, 0.60f, -0.20f, 0.20f, 0.30f, 0.75f, 0.90f, 1.00f);
                case DeliveryType.LegCutter:
                    return Spec(type, 112f, 122f, -0.35f, 0.10f, 0.40f, 0.60f, -0.20f, 0.20f, -0.75f, -0.30f, 0.90f, 1.00f);
                default: // SlowerBall
                    return Spec(type, 102f, 114f, -0.20f, 0.30f, 0.15f, 0.45f, -0.25f, 0.25f, -0.20f, 0.20f, 0.88f, 0.98f);
            }
        }

        private static DeliverySpec Spec(DeliveryType t,
            float sMin, float sMax, float liMin, float liMax, float leMin, float leMax,
            float swMin, float swMax, float seMin, float seMax, float boMin, float boMax)
        {
            return new DeliverySpec
            {
                Type = t,
                SpeedMin = sMin, SpeedMax = sMax,
                LineMin = liMin, LineMax = liMax,
                LengthMin = leMin, LengthMax = leMax,
                SwingMin = swMin, SwingMax = swMax,
                SeamMin = seMin, SeamMax = seMax,
                BounceMin = boMin, BounceMax = boMax
            };
        }
    }

    /// <summary>
    /// A bowler's over plan: weight per delivery type plus execution accuracy.
    /// Weights are relative; they do not need to sum to 1.
    /// </summary>
    public struct BowlerPlan
    {
        public float WFastStraight;
        public float WFastInswinger;
        public float WFastOutswinger;
        public float WYorker;
        public float WFullBall;
        public float WGoodLength;
        public float WShortBall;
        public float WBouncer;
        // Phase 4 variations.
        public float WOffCutter;
        public float WLegCutter;
        public float WSlowerBall;

        /// <summary>0..1 execution accuracy: 1 = hits the planned spot exactly.</summary>
        public float Accuracy;

        public static BowlerPlan Default
        {
            get
            {
                return new BowlerPlan
                {
                    WFastStraight = 0.15f,
                    WFastInswinger = 0.12f,
                    WFastOutswinger = 0.10f,
                    WYorker = 0.10f,
                    WFullBall = 0.12f,
                    WGoodLength = 0.20f,
                    WShortBall = 0.13f,
                    WBouncer = 0.08f,
                    WOffCutter = 0.05f,
                    WLegCutter = 0.05f,
                    WSlowerBall = 0.05f,
                    Accuracy = 0.75f
                };
            }
        }

        public float WeightOf(DeliveryType t)
        {
            switch (t)
            {
                case DeliveryType.FastStraight: return WFastStraight;
                case DeliveryType.FastInswinger: return WFastInswinger;
                case DeliveryType.FastOutswinger: return WFastOutswinger;
                case DeliveryType.Yorker: return WYorker;
                case DeliveryType.FullBall: return WFullBall;
                case DeliveryType.GoodLength: return WGoodLength;
                case DeliveryType.ShortBall: return WShortBall;
                case DeliveryType.Bouncer: return WBouncer;
                case DeliveryType.OffCutter: return WOffCutter;
                case DeliveryType.LegCutter: return WLegCutter;
                default: return WSlowerBall;
            }
        }
    }

    /// <summary>
    /// Builds deliveries. Deterministic given the RNG stream, so replays and
    /// tests are repeatable. Seeded from BowlerPlan weights; accuracy blurs
    /// the intended line/length like a real bowler's execution.
    /// </summary>
    public static class DeliveryFactory
    {
        public static readonly DeliveryType[] AllTypes =
        {
            DeliveryType.FastStraight, DeliveryType.FastInswinger, DeliveryType.FastOutswinger,
            DeliveryType.Yorker, DeliveryType.FullBall, DeliveryType.GoodLength,
            DeliveryType.ShortBall, DeliveryType.Bouncer,
            DeliveryType.OffCutter, DeliveryType.LegCutter, DeliveryType.SlowerBall
        };

        /// <summary>Weighted pick of the next delivery type from the plan.</summary>
        public static DeliveryType NextType(BowlerPlan plan, IRng rng)
        {
            float total = 0f;
            for (int i = 0; i < AllTypes.Length; i++) total += plan.WeightOf(AllTypes[i]);
            if (total <= 0f) return DeliveryType.GoodLength;

            float roll = rng.NextFloat() * total;
            float acc = 0f;
            for (int i = 0; i < AllTypes.Length; i++)
            {
                acc += plan.WeightOf(AllTypes[i]);
                if (roll < acc) return AllTypes[i];
            }
            return DeliveryType.GoodLength;
        }

        /// <summary>Samples one delivery of the given type (accuracy applied).</summary>
        public static DeliveryData Build(DeliveryType type, IRng rng, float accuracy)
        {
            return Build(type, rng, accuracy, float.NaN, float.NaN);
        }

        /// <summary>
        /// Samples one delivery. Phase 4: optional line/length hints (from the
        /// AI bowling strategy) bias the intended spot - 60% hint, 40% sampled
        /// - without changing the dispersion model. NaN = no hint.
        /// </summary>
        public static DeliveryData Build(DeliveryType type, IRng rng, float accuracy,
                                         float lineHint, float lengthHint)
        {
            DeliverySpec spec = DeliverySpec.For(type);
            float line = Range(rng, spec.LineMin, spec.LineMax);
            float length = Range(rng, spec.LengthMin, spec.LengthMax);
            if (!float.IsNaN(lineHint))
                line = Clamp(line * 0.4f + lineHint * 0.6f, -1.2f, 1.2f);
            if (!float.IsNaN(lengthHint))
                length = Clamp01(length * 0.4f + lengthHint * 0.6f);

            float acc = accuracy < 0f ? 0f : accuracy > 1f ? 1f : accuracy;
            float disp = 1f - acc;
            line = Clamp(line + (rng.NextFloat() * 2f - 1f) * 0.45f * disp, -1.2f, 1.2f);
            length = Clamp01(length + (rng.NextFloat() * 2f - 1f) * 0.30f * disp);

            return new DeliveryData
            {
                SpeedKph = Round1(Range(rng, spec.SpeedMin, spec.SpeedMax)),
                Line = line,
                Length = length,
                Swing = Range(rng, spec.SwingMin, spec.SwingMax),
                Seam = Range(rng, spec.SeamMin, spec.SeamMax),
                Bounce = Range(rng, spec.BounceMin, spec.BounceMax),
                Type = type
            };
        }

        private static float Round1(float v)
        {
            return (float)System.Math.Round(v, 1);
        }

        private static float Range(IRng rng, float min, float max)
        {
            return min + (max - min) * rng.NextFloat();
        }

        private static float Clamp(float v, float min, float max)
        {
            return v < min ? min : v > max ? max : v;
        }

        private static float Clamp01(float v)
        {
            return v < 0f ? 0f : v > 1f ? 1f : v;
        }
    }

    /// <summary>Display helpers for delivery types (HUD/debug, no allocation in hot paths).</summary>
    public static class DeliveryLabels
    {
        public static string Name(DeliveryType t)
        {
            switch (t)
            {
                case DeliveryType.FastStraight: return "FAST STRAIGHT";
                case DeliveryType.FastInswinger: return "INSWINGER";
                case DeliveryType.FastOutswinger: return "OUTSWINGER";
                case DeliveryType.Yorker: return "YORKER";
                case DeliveryType.FullBall: return "FULL";
                case DeliveryType.GoodLength: return "GOOD LENGTH";
                case DeliveryType.ShortBall: return "SHORT";
                case DeliveryType.Bouncer: return "BOUNCER";
                case DeliveryType.OffCutter: return "OFF-CUTTER";
                case DeliveryType.LegCutter: return "LEG-CUTTER";
                default: return "SLOWER BALL";
            }
        }
    }
}
