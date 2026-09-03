namespace CricketGame.Core.Fielding
{
    /// <summary>
    /// Phase 4 fielding polish (spec sections 12-15): catch grading, diving
    /// decisions and a formalised return throw. Pure helpers the presentation
    /// layer (Unity + preview) consumes; the deterministic fielding sim in
    /// FieldingCore is unchanged so all Phase 3 parity stays intact.
    /// Mirrors harness/phase4_reference.py (fielding block).
    /// </summary>

    /// <summary>Catch difficulty grade drives success shaping + animation.</summary>
    public enum CatchGrade { Easy, Medium, Difficult, Edge }

    /// <summary>What kind of dive a fielder commits to (None = normal play).</summary>
    public enum DiveKind { None, Ground, Catch, BoundarySave }

    public static class CatchGrader
    {
        /// <summary>Success-probability bias per grade (multiplies fielder skill).</summary>
        public static float BiasFor(CatchGrade g)
        {
            switch (g)
            {
                case CatchGrade.Easy: return 1.15f;
                case CatchGrade.Medium: return 1.00f;
                case CatchGrade.Difficult: return 0.72f;
                default: return 0.55f; // Edge
            }
        }

        public static CatchGrade Grade(float ballSpeedKph, float height,
                                       float distanceToFielder, bool isEdge)
        {
            if (isEdge) return CatchGrade.Edge;
            float reactionPressure = ballSpeedKph / 130f
                + (height < 1.6f ? (1.6f - height) * 0.25f : 0f);
            if (distanceToFielder < 3f && ballSpeedKph > 95f) return CatchGrade.Difficult;
            if (reactionPressure > 1.05f || height > 6f) return CatchGrade.Difficult;
            if (reactionPressure > 0.72f || height > 3.2f) return CatchGrade.Medium;
            return CatchGrade.Easy;
        }
    }

    public static class DiveDecider
    {
        public const float DiveReach = 2.6f;
        private const float BaseSuccess = 0.55f;

        /// <summary>Only dive when the ball would otherwise escape and it is
        /// plausibly within reach. Never a cosmetic dive.</summary>
        public static DiveKind Decide(Fielder f, float distToBall,
                                      float ballSpeedH, bool headingForRope,
                                      bool lofted)
        {
            if (distToBall <= 1.1f) return DiveKind.None;       // already in reach
            if (distToBall > DiveReach + 0.9f) return DiveKind.None; // too far
            if (headingForRope && ballSpeedH > 16f) return DiveKind.BoundarySave;
            if (lofted) return DiveKind.Catch;
            return DiveKind.Ground;
        }

        public static float SuccessProbability(Fielder f, DiveKind kind, float ballSpeedH)
        {
            float baseP = BaseSuccess;
            if (kind == DiveKind.BoundarySave)
            {
                float m = 1.15f - ballSpeedH / 40f;
                if (m < 0.35f) m = 0.35f;
                baseP *= m;
            }
            else if (kind == DiveKind.Catch)
            {
                baseP *= 0.8f;
            }

            float ability = kind == DiveKind.Catch
                ? f.Spec.Catching
                : f.Spec.Ground * 0.6f + f.Spec.Catching * 0.4f;
            float p = baseP * (0.55f + 0.75f * ability * f.Scale);
            if (p < 0.05f) p = 0.05f;
            if (p > 0.92f) p = 0.92f;
            return p;
        }
    }

    public struct ThrowResult
    {
        public float TravelTime;
        public bool Flat;      // strong arm: one-bounce return
        public bool Errant;    // missed the keeper, costs extra time
    }

    public static class ThrowSystem
    {
        /// <summary>Return throw to the keeper: arm strength sets speed,
        /// accuracy sets whether it misses.</summary>
        public static ThrowResult Return(Fielder f, float distance)
        {
            float arm = f.Spec.ThrowSpeed > 12f ? f.Spec.ThrowSpeed : 12f;
            bool flat = arm >= 23f;
            float travel = distance / arm * (flat ? 1.12f : 1.30f);
            bool errant = f.Spec.ThrowAcc < 0.72f;
            if (errant) travel *= 1.25f;
            return new ThrowResult { TravelTime = travel, Flat = flat, Errant = errant };
        }
    }
}
