using CricketGame.Core.Simulation;

namespace CricketGame.Core.Batting
{
    /// <summary>Cricket-level result of a delivery (spec section 5).</summary>
    public enum ShotOutcomeKind
    {
        Leave,
        Beaten,
        Bowled,
        Lbw,
        Defensive,
        Dot,
        Single,
        Two,
        Three,
        Four,
        Six,
        TopEdge,
        InsideEdge,
        OutsideEdge
    }

    public struct ShotOutcomeResult
    {
        public ShotOutcomeKind Kind;
        public string Label;
        public int Runs;
        public bool IsWicket;
        public bool Forced;
    }

    /// <summary>Debug override: force a specific outcome regardless of physics.</summary>
    public enum ForcedOutcome
    {
        None, Dot, Defensive, One, Two, Four, Six, Edge, Bowled, Lbw
    }

    /// <summary>
    /// Turns the engine's swing/pass reports into a cricket outcome.
    /// Probability (edge luck, streaky runs) is seeded and bounded; the
    /// distances themselves come from real ballistic math, so better timing,
    /// footwork and intent measurably produce more runs - never the same
    /// result every time, never pure randomness.
    /// </summary>
    public static class ShotOutcomeResolver
    {
        public const float BoundaryRadius = 62f;
        public const float LbwHalfWidth = 0.22f;   // body corridor around the batter
        public const float LbwMaxHeight = 0.85f;   // impact must be below this
        public const float LbwMinFootZ = -0.60f;   // batter must be in front of stumps
        private const float Gravity = 9.81f;

        /// <summary>Full resolution of one delivery.</summary>
        public static ShotOutcomeResult Resolve(IRng rng, DeliveryTrajectory traj,
                                                SwingReport? swing, float footX, float footZ,
                                                bool lbwEnabled, ForcedOutcome force)
        {
            if (force != ForcedOutcome.None) return Forced(force);

            var r = new ShotOutcomeResult { Runs = 0 };

            bool struck = swing.HasValue && swing.Value.WillContact;

            // ------------------------------------------------- not struck
            if (!struck)
            {
                if (traj.HitsStumps())
                {
                    float xS, yS;
                    traj.AtStumps(out xS, out yS);
                    float dx = xS - footX; if (dx < 0f) dx = -dx;
                    bool bodyOnLine = dx <= LbwHalfWidth;
                    bool lowEnough = yS >= 0f && yS <= LbwMaxHeight;
                    bool inFront = footZ > LbwMinFootZ;
                    if (lbwEnabled && bodyOnLine && lowEnough && inFront)
                    {
                        r.Kind = ShotOutcomeKind.Lbw; r.Label = "LBW"; r.IsWicket = true;
                    }
                    else
                    {
                        r.Kind = ShotOutcomeKind.Bowled; r.Label = "BOWLED"; r.IsWicket = true;
                    }
                    return r;
                }

                if (swing.HasValue)
                {
                    r.Kind = ShotOutcomeKind.Beaten; r.Label = "BEATEN";
                }
                else
                {
                    r.Kind = ShotOutcomeKind.Leave; r.Label = "LEFT ALONE";
                }
                return r;
            }

            // ------------------------------------------------- struck
            ContactResult c = swing.Value.Contact;
            float angle = (float)System.Math.Atan2(c.Direction.X, c.Direction.Z);

            if (c.Outcome == ContactOutcome.Edge)
            {
                ShotOutcomeKind kind;
                if (c.ElevationDeg > 26f) kind = ShotOutcomeKind.TopEdge;
                else if (angle < 0f) kind = ShotOutcomeKind.InsideEdge;
                else kind = ShotOutcomeKind.OutsideEdge;

                int runs = 0;
                // A hard outside edge can squirt past the keeper for a streaky single.
                if (kind == ShotOutcomeKind.OutsideEdge && c.ExitSpeedKph > 70f && rng.NextFloat() < 0.35f)
                    runs = 1;

                r.Kind = kind; r.Label = EdgeLabel(kind); r.Runs = runs;
                return r;
            }

            if (c.Outcome == ContactOutcome.DefensiveSolid)
            {
                float absAngle = angle < 0f ? -angle : angle;
                bool forward = absAngle < 1.2f;
                int runs = (forward && c.ExitSpeedKph > 26f && rng.NextFloat() < 0.35f) ? 1 : 0;
                r.Kind = ShotOutcomeKind.Defensive; r.Label = "BLOCKED"; r.Runs = runs;
                return r;
            }

            // Clean / mistimed / weak / lofted: physics decides the distance.
            float startHeight = traj.HeightAtContact;
            if (startHeight < 0.35f) startHeight = 0.35f;

            float elev = c.ElevationDeg;
            if (elev < 0f) elev = 0f; if (elev > 70f) elev = 70f;
            float e = elev * 0.017453292f;
            float v = c.ExitSpeedKph / 3.6f;
            float vx = v * (float)System.Math.Cos(e);
            float vy = v * (float)System.Math.Sin(e);

            float distToRope = BoundaryRadius - 0.4f;
            float carry = vx * ((vy + SqrtSafe(vy * vy + 2f * Gravity * startHeight)) / Gravity);

            if (carry >= distToRope)
            {
                // Ball lands beyond the rope; six if still airborne when crossing it.
                float tRope = distToRope / (vx > 0.5f ? vx : 0.5f);
                float yAtRope = startHeight + vy * tRope - 0.5f * Gravity * tRope * tRope;
                if (yAtRope > 0.05f)
                {
                    r.Kind = ShotOutcomeKind.Six; r.Label = "SIX"; r.Runs = 6;
                    return r;
                }
            }

            // Ground roll: low hard shots keep rolling, lofted shots stop.
            float rollTime = 2.0f * (1f - 0.8f * Clamp01(elev / 35f));
            float rest = carry + vx * rollTime * 0.75f;

            if (rest >= distToRope)
            {
                r.Kind = ShotOutcomeKind.Four; r.Label = "FOUR"; r.Runs = 4;
                return r;
            }

            if (rest >= 45f) { r.Kind = ShotOutcomeKind.Three; r.Label = "THREE RUNS"; r.Runs = 3; return r; }
            if (rest >= 25f) { r.Kind = ShotOutcomeKind.Two; r.Label = "TWO RUNS"; r.Runs = 2; return r; }
            if (rest >= 9f) { r.Kind = ShotOutcomeKind.Single; r.Label = "SINGLE"; r.Runs = 1; return r; }

            if (c.Outcome == ContactOutcome.Weak || c.Outcome == ContactOutcome.Mistimed)
            {
                r.Kind = ShotOutcomeKind.Dot; r.Label = "MISTIMED";
            }
            else
            {
                r.Kind = ShotOutcomeKind.Dot; r.Label = "DOT BALL";
            }
            return r;
        }

        /// <summary>Ballistic carry to first landing (shared with tests/debug).</summary>
        public static float PredictCarry(float exitKph, float elevationDeg, float startHeight)
        {
            float elev = elevationDeg;
            if (elev < 0f) elev = 0f; if (elev > 70f) elev = 70f;
            float e = elev * 0.017453292f;
            float v = exitKph / 3.6f;
            float vx = v * (float)System.Math.Cos(e);
            float vy = v * (float)System.Math.Sin(e);
            return vx * ((vy + SqrtSafe(vy * vy + 2f * Gravity * startHeight)) / Gravity);
        }

        private static ShotOutcomeResult Forced(ForcedOutcome force)
        {
            var r = new ShotOutcomeResult { Forced = true };
            switch (force)
            {
                case ForcedOutcome.Defensive:
                    r.Kind = ShotOutcomeKind.Defensive; r.Label = "BLOCKED"; break;
                case ForcedOutcome.One:
                    r.Kind = ShotOutcomeKind.Single; r.Label = "SINGLE"; r.Runs = 1; break;
                case ForcedOutcome.Two:
                    r.Kind = ShotOutcomeKind.Two; r.Label = "TWO RUNS"; r.Runs = 2; break;
                case ForcedOutcome.Four:
                    r.Kind = ShotOutcomeKind.Four; r.Label = "FOUR"; r.Runs = 4; break;
                case ForcedOutcome.Six:
                    r.Kind = ShotOutcomeKind.Six; r.Label = "SIX"; r.Runs = 6; break;
                case ForcedOutcome.Edge:
                    r.Kind = ShotOutcomeKind.OutsideEdge; r.Label = "OUTSIDE EDGE"; break;
                case ForcedOutcome.Bowled:
                    r.Kind = ShotOutcomeKind.Bowled; r.Label = "BOWLED"; r.IsWicket = true; break;
                case ForcedOutcome.Lbw:
                    r.Kind = ShotOutcomeKind.Lbw; r.Label = "LBW"; r.IsWicket = true; break;
                default:
                    r.Kind = ShotOutcomeKind.Dot; r.Label = "DOT BALL"; break;
            }
            return r;
        }

        private static string EdgeLabel(ShotOutcomeKind kind)
        {
            switch (kind)
            {
                case ShotOutcomeKind.TopEdge: return "TOP EDGE";
                case ShotOutcomeKind.InsideEdge: return "INSIDE EDGE";
                default: return "OUTSIDE EDGE";
            }
        }

        private static float SqrtSafe(float v)
        {
            return (float)System.Math.Sqrt(v < 0f ? 0f : v);
        }

        private static float Clamp01(float v)
        {
            return v < 0f ? 0f : v > 1f ? 1f : v;
        }
    }
}
