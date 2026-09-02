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
        public DeliveryType? ForcedType;

        /// <summary>Debug hook: fully manual delivery from the panel sliders (wins over everything).</summary>
        public DeliveryData? ManualDelivery;

        /// <summary>Raised when a delivery leaves the hand.</summary>
        public event System.Action<DeliveryData> BallReleased;

        public DeliveryData LastDelivery { get; private set; }

        public void Init(BowlerProfile profile)
        {
            plan = (profile != null ? profile : BowlerProfile.CreateDefault()).ToPlan();
        }

        /// <summary>Produces the next delivery. Priority: manual > forced type > plan.</summary>
        public DeliveryData NextDelivery()
        {
            DeliveryData data;
            if (ManualDelivery.HasValue)
            {
                data = ManualDelivery.Value;
            }
            else
            {
                DeliveryType type = ForcedType.HasValue
                    ? ForcedType.Value
                    : DeliveryFactory.NextType(plan, rng);
                data = DeliveryFactory.Build(type, rng, plan.Accuracy);
            }

            LastDelivery = data;
            if (BallReleased != null) BallReleased(data);
            return data;
        }

        /// <summary>Rebuilds the current delivery exactly (debug redeliver).</summary>
        public DeliveryData Redeliver()
        {
            if (BallReleased != null) BallReleased(LastDelivery);
            return LastDelivery;
        }
    }
}
