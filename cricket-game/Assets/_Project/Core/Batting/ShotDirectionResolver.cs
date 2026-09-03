namespace CricketGame.Core.Batting
{
    public struct DirectionResolveResult
    {
        /// <summary>Final normalized field-plane direction (X off/leg, Y straight/fine).</summary>
        public Vec2 Direction;

        /// <summary>Angle in radians from straight-down-the-ground, + toward off side.</summary>
        public float AngleFromStraight;

        /// <summary>How well the ball is within reach after footwork, 0..1.</summary>
        public float ReachQuality;

        /// <summary>Gap in metres between the ball's arrival x and the comfort zone (+ = wide of reach).</summary>
        public float ReachGap;

        /// <summary>True when the swipe carried a real direction (not a bare tap).</summary>
        public bool HasDirection;
    }

    /// <summary>
    /// Turns the raw swipe into the actual attempted direction by combining it
    /// with timing (early pulls leg-side, late drags off-side) and measures how
    /// well the batsman's footwork has brought the ball into reach.
    /// </summary>
    public static class ShotDirectionResolver
    {
        /// <summary>Swipes shorter than this are treated as taps (straight).</summary>
        public const float MinDirectionStrength = 0.25f;

        /// <summary>Comfort-zone half-width (metres): reach quality hits zero beyond this gap.</summary>
        public const float ReachFalloff = 0.85f;

        /// <summary>
        /// Lateral x (metres) where the batter most comfortably meets the ball.
        /// The hands naturally work just off-side of the stance centre, so footwork
        /// must bring (stance + 0.10) onto the ball's line for full reach.
        /// </summary>
        public static float PreferredReachX(float footX, float line)
        {
            return footX + 0.10f;
        }

        /// <summary>
        /// Combines swipe + timing + delivery geometry + footwork into the
        /// attempted direction and a reach-quality score.
        /// </summary>
        public static DirectionResolveResult Resolve(Vec2 requested, float swipeStrength,
                                                     float ballXAtContact, DeliveryData delivery,
                                                     FootworkState foot, float timingOffset)
        {
            var result = new DirectionResolveResult();

            bool hasDirection = requested.Magnitude >= MinDirectionStrength && swipeStrength > 0.05f;
            Vec2 dir = hasDirection ? Vec2.Normalize(requested) : new Vec2(0f, 1f);
            result.HasDirection = hasDirection;

            // Angle from straight, positive toward off side.
            float angle = (float)System.Math.Atan2(dir.X, dir.Y);

            // Timing bends the effective direction.
            angle += TimingSystem.DirectionDeviation(timingOffset);

            result.AngleFromStraight = angle;
            result.Direction = new Vec2((float)System.Math.Sin(angle), (float)System.Math.Cos(angle));

            // Reach quality: gap between where the ball arrives and the comfort zone.
            float gap = ballXAtContact - PreferredReachX(foot.X, delivery.Line);
            float absGap = gap < 0f ? -gap : gap;
            float reach = 1f - absGap / ReachFalloff;
            result.ReachGap = gap;
            result.ReachQuality = reach < 0f ? 0f : reach > 1f ? 1f : reach;

            return result;
        }
    }
}
