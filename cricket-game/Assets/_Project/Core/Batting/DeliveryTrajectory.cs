namespace CricketGame.Core.Batting
{
    /// <summary>
    /// Analytic, deterministic ball flight for a delivery.
    ///
    /// Geometry (world coordinates):
    ///   - Batsman stance centre at origin; batting-end stumps at z = -1.0.
    ///   - Bowler releases at z = 20.1, height 2.05 m; ball travels toward -Z.
    ///   - +X is the off side, -X the leg side (right-handed batter).
    ///
    /// The flight is two parabolic segments: release -> bounce, bounce -> batter.
    /// Everything is closed-form, so tests and timing are perfectly repeatable.
    /// </summary>
    public sealed class DeliveryTrajectory
    {
        public const float Gravity = 9.81f;
        public const float ReleaseHeight = 2.05f;
        public const float ReleaseZ = 20.1f;
        public const float ContactZ = 0.35f;      // ideal bat-ball contact plane
        public const float StumpsZ = -1.0f;
        public const float StumpHalfWidth = 0.18f;
        public const float StumpTopHeight = 0.72f;

        /// <summary>Post-bounce lateral drift (m/s) per unit of seam.</summary>
        public const float SeamRate = 0.9f;

        public DeliveryData Delivery { get; private set; }

        /// <summary>Time from release until the ball reaches the contact plane.</summary>
        public float TimeToContact { get; private set; }

        /// <summary>Time from release until the ball reaches the stump plane.</summary>
        public float TimeToStumps { get; private set; }

        /// <summary>Time from release until the ball pitches (bounce event).</summary>
        public float BounceTime { get { return t1; } }

        public Vec3 ContactPoint { get; private set; }
        public Vec3 BouncePoint { get; private set; }

        /// <summary>Ball height (m) when it reaches the contact plane.</summary>
        public float HeightAtContact { get; private set; }

        /// <summary>Lateral position (m) when it reaches the contact plane.</summary>
        public float XAtContact { get; private set; }

        private float releaseHeight;    // effective release height
        private float speed;            // m/s before bounce
        private float postBounceSpeed;  // m/s after bounce
        private float t1;               // release -> bounce
        private float v0y;              // initial vertical velocity
        private float releaseX;
        private float bounceX;
        private float swingAmp;
        private float vyAfter;          // vertical velocity just after bounce
        private float vxAfter;          // seam/carry/turn drift after bounce

        public DeliveryTrajectory(DeliveryData d) : this(d, PitchProfile.Normal)
        {
        }

        public DeliveryTrajectory(DeliveryData d, PitchProfile pitch)
        {
            Delivery = d;

            float length = Clamp01(d.Length);
            float line = Clamp(d.Line, -1.25f, 1.25f);
            float swing = Clamp(d.Swing, -1.5f, 1.5f);
            float seam = Clamp(d.Seam, -1.5f, 1.5f);
            float bounceScale = d.Bounce > 0f ? d.Bounce : 1f;
            releaseHeight = d.ReleaseHeight > 0f ? d.ReleaseHeight : ReleaseHeight;

            speed = System.Math.Max(8f, d.SpeedKph / 3.6f);
            postBounceSpeed = speed * 0.92f * pitch.PaceFactor;

            float bounceZ = 1.6f + 9.2f * length;
            bounceX = line * 0.45f;
            releaseX = bounceX - swing * 0.35f;
            swingAmp = swing * 0.65f;

            BouncePoint = new Vec3(bounceX, 0f, bounceZ);

            t1 = (ReleaseZ - bounceZ) / speed;
            v0y = (0.5f * Gravity * t1 * t1 - releaseHeight) / t1;

            // Restitution bounce: fuller balls skid on lower, shorter balls rear up.
            float vImpact = v0y - Gravity * t1; // downward (negative) at pitch
            float restitution = 0.78f - 0.20f * length;
            vyAfter = -vImpact * restitution * bounceScale * pitch.BounceEnergy;

            float t2 = (bounceZ - ContactZ) / postBounceSpeed;
            HeightAtContact = vyAfter * t2 - 0.5f * Gravity * t2 * t2;
            if (HeightAtContact < 0.05f) HeightAtContact = 0.05f;
            // Post-bounce lateral movement: swing carry-through, seam cut, pitch turn.
            vxAfter = swing * 0.05f + seam * SeamRate + pitch.Turn;

            TimeToContact = t1 + t2;
            TimeToStumps = t1 + (bounceZ - StumpsZ) / postBounceSpeed;

            XAtContact = bounceX + vxAfter * t2;
            ContactPoint = new Vec3(XAtContact, HeightAtContact, ContactZ);
        }

        /// <summary>Ball position at time t (seconds since release). Continues past the batter.</summary>
        public Vec3 Position(float t)
        {
            if (t < 0f) t = 0f;

            if (t <= t1)
            {
                float p = t / t1;
                float x = Lerp(releaseX, bounceX, p) + swingAmp * (float)System.Math.Sin(System.Math.PI * p);
                float z = ReleaseZ - speed * t;
                float y = releaseHeight + v0y * t - 0.5f * Gravity * t * t;
                return new Vec3(x, y > 0f ? y : 0f, z);
            }

            float dt = t - t1;
            float xa = bounceX + vxAfter * dt;
            float za = BouncePoint.Z - postBounceSpeed * dt;
            float ya = vyAfter * dt - 0.5f * Gravity * dt * dt;
            return new Vec3(xa, ya > 0f ? ya : 0f, za);
        }

        /// <summary>Lateral position and height where the ball crosses the stump plane.</summary>
        public void AtStumps(out float x, out float y)
        {
            float dt = (BouncePoint.Z - StumpsZ) / postBounceSpeed;
            x = bounceX + vxAfter * dt;
            y = vyAfter * dt - 0.5f * Gravity * dt * dt;
        }

        /// <summary>True if, unobstructed, the ball would hit the stumps.</summary>
        public bool HitsStumps()
        {
            float x, y;
            AtStumps(out x, out y);
            return System.Math.Abs(x) <= StumpHalfWidth && y >= 0f && y <= StumpTopHeight;
        }

        private static float Lerp(float a, float b, float t) { return a + (b - a) * t; }
        private static float Clamp01(float v) { return v < 0f ? 0f : v > 1f ? 1f : v; }
        private static float Clamp(float v, float min, float max) { return v < min ? min : v > max ? max : v; }
    }
}
