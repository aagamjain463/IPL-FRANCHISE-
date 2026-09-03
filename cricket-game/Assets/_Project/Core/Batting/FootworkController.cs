namespace CricketGame.Core.Batting
{
    /// <summary>Batsman position offset relative to the stance centre (metres).</summary>
    public struct FootworkState
    {
        /// <summary>+ toward the off side, - toward the leg side.</summary>
        public float X;

        /// <summary>+ toward the bowler (front foot), - toward the stumps (back foot).</summary>
        public float Z;

        public float VelX;
        public float VelZ;
    }

    public enum FootPose
    {
        BackFoot,
        Neutral,
        FrontFoot
    }

    /// <summary>
    /// Analog footwork model: the joystick sets a target velocity, the batsman
    /// accelerates toward it and is clamped inside a small box around the crease.
    /// No teleporting; movement is smooth and framerate-independent.
    /// </summary>
    public static class FootworkController
    {
        public const float Acceleration = 26f;   // m/s^2 toward target velocity
        public const float Damping = 18f;        // m/s^2 when input released
        public const float MaxSpeed = 3.6f;      // m/s

        public const float XMin = -1.15f;
        public const float XMax = 1.15f;
        public const float ZMin = -0.85f;
        public const float ZMax = 1.35f;

        public const float FrontFootThreshold = 0.22f;
        public const float BackFootThreshold = -0.20f;

        public static void Advance(ref FootworkState s, Vec2 input, float dt)
        {
            // Clamp the input disc.
            float mag = input.Magnitude;
            if (mag > 1f)
            {
                input.X /= mag;
                input.Y /= mag;
            }

            s.VelX = Approach(s.VelX, input.X * MaxSpeed, (System.Math.Abs(input.X) > 0.02f ? Acceleration : Damping) * dt);
            s.VelZ = Approach(s.VelZ, input.Y * MaxSpeed, (System.Math.Abs(input.Y) > 0.02f ? Acceleration : Damping) * dt);

            s.X += s.VelX * dt;
            s.Z += s.VelZ * dt;

            if (s.X < XMin) { s.X = XMin; if (s.VelX < 0f) s.VelX = 0f; }
            if (s.X > XMax) { s.X = XMax; if (s.VelX > 0f) s.VelX = 0f; }
            if (s.Z < ZMin) { s.Z = ZMin; if (s.VelZ < 0f) s.VelZ = 0f; }
            if (s.Z > ZMax) { s.Z = ZMax; if (s.VelZ > 0f) s.VelZ = 0f; }
        }

        public static FootPose Pose(FootworkState s)
        {
            if (s.Z >= FrontFootThreshold) return FootPose.FrontFoot;
            if (s.Z <= BackFootThreshold) return FootPose.BackFoot;
            return FootPose.Neutral;
        }

        private static float Approach(float current, float target, float maxDelta)
        {
            if (current < target) return System.Math.Min(current + maxDelta, target);
            return System.Math.Max(current - maxDelta, target);
        }
    }
}
