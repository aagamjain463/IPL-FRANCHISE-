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

        /// <summary>
        /// Combined lateral movement of the ball from swing + seam (+ moving away
        /// toward off, - moving in toward leg), clamped to the swing/seam bound.
        /// </summary>
        public static float LateralMovement(float swing, float seam)
        {
            float m = swing + seam;
            if (m < -1.5f) m = -1.5f;
            if (m > 1.5f) m = 1.5f;
            return m;
        }

        /// <summary>
        /// Which side a mistimed edge naturally flies: WITH the ball's movement.
        /// An outswinger (away, +) edges off to keeper/slip (outside edge); an
        /// inswinger (in, -) edges leg (leading/inside edge). 0 when the lateral
        /// movement is negligible (the contact code then flips a coin).
        /// </summary>
        public static int EdgeSide(float swing, float seam)
        {
            float move = LateralMovement(swing, seam);
            if (move >= 0.15f) return 1;
            if (move <= -0.15f) return -1;
            return 0;
        }

        /// <summary>
        /// Edge-probability adjustment from swing/seam movement vs timing: when
        /// the bat is caught on the wrong side of the moving ball (late against
        /// away movement, early against in movement) edge odds rise; when the bat
        /// meets the movement they fall. Small, clamped and believable.
        /// </summary>
        public static float MovementEdgeBias(float timingOffset, float swing, float seam)
        {
            float move = LateralMovement(swing, seam);
            float mag = move < 0f ? -move : move;
            float frac = mag / 1.5f;             // 0..1
            if (frac <= 0f) return 0f;

            float mistime = (timingOffset < 0f ? -timingOffset : timingOffset) - 0.045f;
            if (mistime < 0f) mistime = 0f;
            float s = mistime / 0.12f;
            if (s > 1f) s = 1f;

            float product = timingOffset * move;
            if (product > 0f) return 0.10f * frac * s;   // bat caught by the movement
            return -0.04f * frac * s;                     // bat with the movement
        }

        private static float Clamp01(float v) { return v < 0f ? 0f : v > 1f ? 1f : v; }
    }
}
