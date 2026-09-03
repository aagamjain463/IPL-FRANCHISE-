using CricketGame.Core.Bowling;
using UnityEngine;

namespace CricketGame.BattingPrototype.Bowling
{
    /// <summary>
    /// Data-driven bowler tuning (spec section 1). Designers can author an
    /// asset in the editor; the game also ships a code default so the scene
    /// never depends on an asset being assigned.
    /// </summary>
    [CreateAssetMenu(menuName = "Cricket/Bowler Profile", fileName = "BowlerProfile")]
    public class BowlerProfile : ScriptableObject
    {
        [Range(0f, 1f)]
        [Tooltip("Execution accuracy: 1 = hits the planned line/length exactly.")]
        public float Accuracy = 0.75f;

        [Header("Plan weights (relative)")]
        public float FastStraight = 0.15f;
        public float FastInswinger = 0.12f;
        public float FastOutswinger = 0.10f;
        public float Yorker = 0.10f;
        public float FullBall = 0.12f;
        public float GoodLength = 0.20f;
        public float ShortBall = 0.13f;
        public float Bouncer = 0.08f;

        /// <summary>Converts to the engine-side plan struct.</summary>
        public BowlerPlan ToPlan()
        {
            return new BowlerPlan
            {
                Accuracy = Accuracy,
                WFastStraight = FastStraight,
                WFastInswinger = FastInswinger,
                WFastOutswinger = FastOutswinger,
                WYorker = Yorker,
                WFullBall = FullBall,
                WGoodLength = GoodLength,
                WShortBall = ShortBall,
                WBouncer = Bouncer
            };
        }

        /// <summary>Runtime default when no asset is assigned.</summary>
        public static BowlerProfile CreateDefault()
        {
            var p = CreateInstance<BowlerProfile>();
            p.name = "DefaultBowlerProfile";
            return p;
        }
    }
}
