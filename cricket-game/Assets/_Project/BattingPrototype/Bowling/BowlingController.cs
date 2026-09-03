using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.Core.Simulation;
using UnityEngine;

namespace CricketGame.BattingPrototype.Bowling
{
    /// <summary>
    /// The bowling orchestrator (spec section 1 + 12). Owns the bowler's plan
    /// and produces the next delivery; the visual bowler and the engine both
    /// consume what it generates. Raises OnBallReleased for future systems.
    /// </summary>
    public class BowlingController : MonoBehaviour
    {
        private BowlerPlan plan;
        private readonly IRng rng = new SystemRng();

        /// <summary>Debug hook: force deliveries to a type (null = use the plan).</summary>
        [System.NonSerialized]
        public DeliveryType? ForcedType;

        /// <summary>Phase 3: overrides the plan's accuracy while >= 0 (AI difficulty).</summary>
        public float AccuracyOverride = -1f;

        /// <summary>Debug hook: fully manual delivery from the panel sliders (wins over everything).</summary>
        [System.NonSerialized]
        public DeliveryData? ManualDelivery;

        /// <summary>Phase 4: AI bowling strategy override (type + spot hints).</summary>
        [System.NonSerialized]
        public CricketGame.Core.AI.AiBowlingPlan? StrategyOverride;

        /// <summary>Phase 4: run AI deliveries through release scatter + spray
        /// (can produce wides). Off while the player bowls.</summary>
        public bool Phase4AiBowling = true;

        /// <summary>Phase 4: difficulty used for the AI control check.</summary>
        public CricketGame.Core.AI.AiDifficulty Phase4Difficulty
            = CricketGame.Core.AI.AiDifficulty.Medium;

        /// <summary>Raised when a delivery leaves the hand.</summary>
        public event System.Action<DeliveryData> BallReleased;

        /// <summary>Phase 4: result of the last pipeline pass (wide flag).</summary>
        public bool LastDeliveryWasWide { get; private set; }

        public DeliveryData LastDelivery { get; private set; }

        public void Init(BowlerProfile profile)
        {
            plan = (profile != null ? profile : BowlerProfile.CreateDefault()).ToPlan();
        }

        /// <summary>Produces the next delivery. Priority: manual > strategy > forced type > plan.</summary>
        public DeliveryData NextDelivery()
        {
            DeliveryData data;
            LastDeliveryWasWide = false;
            if (ManualDelivery.HasValue)
            {
                data = ManualDelivery.Value;
            }
            else
            {
                float accuracy = AccuracyOverride >= 0f ? AccuracyOverride : plan.Accuracy;
                DeliveryType type;
                float lineHint = float.NaN, lengthHint = float.NaN;
                if (StrategyOverride.HasValue)
                {
                    type = StrategyOverride.Value.Type;
                    lineHint = StrategyOverride.Value.LineHint;
                    lengthHint = StrategyOverride.Value.LengthHint;
                }
                else if (ForcedType.HasValue)
                {
                    type = ForcedType.Value;
                }
                else
                {
                    type = DeliveryFactory.NextType(plan, rng);
                }
                data = DeliveryFactory.Build(type, rng, accuracy, lineHint, lengthHint);

                // Phase 4: AI release scatter + loss-of-control spray -> wides.
                // (Debug forced balls stay exact so the debug panel is exact.)
                if (Phase4AiBowling && !ForcedType.HasValue)
                {
                    float releaseOffset = (rng.NextFloat() + rng.NextFloat() - 1f)
                        * ReleaseSdFor(Phase4Difficulty) * 3f;
                    var bowled = BowlingPipeline.Bowl(rng, data, releaseOffset,
                                                      accuracy, Phase4Difficulty);
                    data = bowled.Delivery;
                    LastDeliveryWasWide = bowled.Wide;
                }
            }

            LastDelivery = data;
            if (BallReleased != null) BallReleased(data);
            return data;
        }

        private static float ReleaseSdFor(CricketGame.Core.AI.AiDifficulty d)
        {
            switch (d)
            {
                case CricketGame.Core.AI.AiDifficulty.Easy: return 0.062f;
                case CricketGame.Core.AI.AiDifficulty.Hard: return 0.051f;
                default: return 0.055f;
            }
        }

        /// <summary>Rebuilds the current delivery exactly (debug redeliver).</summary>
        public DeliveryData Redeliver()
        {
            if (BallReleased != null) BallReleased(LastDelivery);
            return LastDelivery;
        }

        /// <summary>
        /// Player-bowled delivery (Phase 3 chase innings). The player picks
        /// type, line and length; the factory supplies speed/swing/seam from
        /// the type's spec and adds accuracy-based scatter so nothing is a
        /// robot-perfect dart.
        /// </summary>
        public DeliveryData PlayerDelivery(DeliveryType type, float line, float length,
                                           float accuracy)
        {
            DeliveryData data = DeliveryFactory.Build(type, rng, accuracy);
            data.Line = line + (rng.NextFloat() * 2f - 1f) * 0.06f * (1.2f - accuracy);
            data.Length = Mathf.Clamp01(length + (rng.NextFloat() * 2f - 1f) * 0.05f * (1.2f - accuracy));
            LastDelivery = data;
            if (BallReleased != null) BallReleased(data);
            return data;
        }

        /// <summary>
        /// Phase 4 (spec section 7): player delivery with a release-timing
        /// skill check. releaseOffset is seconds from the ideal release point
        /// (0 = perfect). The sampled ball is drifted by the release, then a
        /// control check can spray it WIDE (extra run, no legal ball).
        /// Returns the pipeline result; inspect .Wide for legality.
        /// </summary>
        public BowledDelivery PlayerDeliveryWithRelease(DeliveryType type, float line,
                                                        float length, float releaseOffset,
                                                        float accuracy)
        {
            DeliveryData data = DeliveryFactory.Build(type, rng, accuracy);
            data.Line = line;      // intended spot; the release check drifts it
            data.Length = length;
            var bowled = BowlingPipeline.Bowl(rng, data, releaseOffset, accuracy,
                                              CricketGame.Core.AI.AiDifficulty.Medium);
            LastDelivery = bowled.Delivery;
            LastDeliveryWasWide = bowled.Wide;
            if (BallReleased != null) BallReleased(bowled.Delivery);
            return bowled;
        }
    }
}
