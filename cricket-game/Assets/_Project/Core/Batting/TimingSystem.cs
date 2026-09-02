namespace CricketGame.Core.Batting
{
    /// <summary>
    /// Manual timing. The player releases the swipe at time S; the bat then
    /// meets the ball at S + Windup(intent). The offset
    ///     d = (S + windup) - TimeToContact
    /// is classified into windows and drives power, control and edge odds.
    /// Nothing here is random - timing is pure skill.
    /// </summary>
    public static class TimingSystem
    {
        public const float PerfectWindow = 0.035f;  // +-35 ms
        public const float GoodWindow = 0.085f;     // +-85 ms
        public const float OkWindow = 0.160f;       // early/late up to 160 ms
        public const float MaxWindow = 0.260f;      // beyond this the bat misses

        /// <summary>Time between the player's release and the bat reaching the ball.</summary>
        public static float WindupTime(ShotIntent intent)
        {
            switch (intent)
            {
                case ShotIntent.Defensive: return 0.10f;
                case ShotIntent.Aggressive: return 0.17f;
                case ShotIntent.Lofted: return 0.19f;
                default: return 0.14f; // Normal
            }
        }

        /// <summary>offset &gt; 0 means late (bat arrives after the ball).</summary>
        public static TimingWindow Classify(float offset)
        {
            float a = offset < 0f ? -offset : offset;
            if (a > MaxWindow) return TimingWindow.Missed;
            if (a <= PerfectWindow) return TimingWindow.Perfect;
            if (a <= GoodWindow) return TimingWindow.Good;

            if (offset < 0f)
                return a <= OkWindow ? TimingWindow.Early : TimingWindow.VeryEarly;
            return a <= OkWindow ? TimingWindow.Late : TimingWindow.VeryLate;
        }

        /// <summary>1 at perfect contact, falling toward ~0.15 at the edge of the window.</summary>
        public static float PowerCurve(float offset)
        {
            float x = offset < 0f ? -offset : offset;
            x = x / MaxWindow;
            if (x >= 1f) return 0.10f;
            float s = x * x * (3f - 2f * x); // smoothstep
            return 1f - 0.85f * s;
        }

        /// <summary>Directional accuracy: 1 at perfect, 0 at the edge of the window.</summary>
        public static float ControlCurve(float offset)
        {
            float x = offset < 0f ? -offset : offset;
            x = x / MaxWindow;
            if (x >= 1f) return 0f;
            float s = x * x * (3f - 2f * x);
            return 1f - s;
        }

        /// <summary>
        /// Edge probability grows with mistiming, poor reach and raw pace.
        /// Called only when the bat does meet the ball.
        /// </summary>
        public static float EdgeProbability(float absOffset, float reachQuality, float ballSpeedKph)
        {
            float p = 0.02f;
            if (absOffset > 0.045f) p += (absOffset - 0.045f) * 2.4f;
            p += (1f - reachQuality) * 0.18f;
            p += Clamp01((ballSpeedKph - 90f) / 150f) * 0.06f;
            return p < 0.01f ? 0.01f : p > 0.55f ? 0.55f : p;
        }

        /// <summary>
        /// Early swings close the bat face (ball deflects toward leg); late swings
        /// leave it open (toward off). Returns the deviation in radians.
        /// </summary>
        public static float DirectionDeviation(float offset)
        {
            return offset * 1.6f;
        }

        private static float Clamp01(float v) { return v < 0f ? 0f : v > 1f ? 1f : v; }
    }
}
