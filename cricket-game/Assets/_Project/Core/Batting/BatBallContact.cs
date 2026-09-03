using CricketGame.Core.Simulation;

namespace CricketGame.Core.Batting
{
    public struct ContactSetup
    {
        public DeliveryData Delivery;
        public ShotSelection Shot;
        public DirectionResolveResult Direction;
        public float TimingOffset;
        public TimingWindow Window;
        public float SwipeStrength;
    }

    public struct ContactResult
    {
        public ContactOutcome Outcome;
        public float ExitSpeedKph;
        /// <summary>Unit velocity direction including elevation (world space).</summary>
        public Vec3 Direction;
        public float ElevationDeg;
        public float Quality;
        public bool IsLofted;
    }

    /// <summary>
    /// Resolves what happens when the bat crosses the contact plane. Combines
    /// timing quality, reach quality, swipe strength and intent into a concrete
    /// outcome plus a physically plausible exit velocity for the ball.
    /// </summary>
    public static class BatBallContact
    {
        public static ContactResult Resolve(IRng rng, ContactSetup setup)
        {
            var r = new ContactResult();
            float absOffset = setup.TimingOffset < 0f ? -setup.TimingOffset : setup.TimingOffset;

            // ---------------------------------------------------------------- miss
            if (setup.Window == TimingWindow.Missed || setup.Direction.ReachQuality < 0.15f)
            {
                r.Outcome = ContactOutcome.Miss;
                r.ExitSpeedKph = 0f;
                return r;
            }

            // ---------------------------------------------------------------- defense
            if (setup.Shot.Kind == ShotKind.FrontFootDefense || setup.Shot.Kind == ShotKind.BackFootDefense)
            {
                float power = TimingSystem.PowerCurve(setup.TimingOffset);
                r.Outcome = ContactOutcome.DefensiveSolid;
                r.Quality = power * (0.45f + 0.55f * setup.Direction.ReachQuality);
                r.ExitSpeedKph = 14f + 24f * power * setup.Shot.BasePower;
                r.ElevationDeg = 2f + 4f * rng.NextFloat();
                r.IsLofted = false;
                // Blocked balls drop near the batter, slightly toward the leg side of the line.
                float angle = -setup.Delivery.Line * 0.15f;
                r.Direction = DirectionFromAngle(angle, r.ElevationDeg);
                return r;
            }

            // ---------------------------------------------------------------- edge
            // Movement-aware edges: swing/seam + timing decide both how often the
            // bat edges and which side it flies, plus how thick the contact is.
            float pEdge = TimingSystem.EdgeProbability(absOffset, setup.Direction.ReachQuality,
                                                       setup.Delivery.SpeedKph)
                        + TimingSystem.MovementEdgeBias(setup.TimingOffset,
                                                        setup.Delivery.Swing, setup.Delivery.Seam);
            if (setup.Shot.Awkward) pEdge = System.Math.Min(0.7f, pEdge * 1.6f);
            if (pEdge < 0.01f) pEdge = 0.01f;
            else if (pEdge > 0.55f) pEdge = 0.55f;

            if (rng.NextFloat() < pEdge)
            {
                r.Outcome = ContactOutcome.Edge;
                r.Quality = 0.2f;

                // Thin vs thick: poor reach and a bat caught on the wrong side of
                // the movement produce a THICK edge that skims away fast and
                // square; fine contact produces a THIN, looping edge that carries
                // behind square toward keeper/slip.
                float move = TimingSystem.LateralMovement(setup.Delivery.Swing, setup.Delivery.Seam);
                float product = setup.TimingOffset * move;
                float thick = 0.25f + (1f - setup.Direction.ReachQuality) * 0.55f
                            + (product > 0f ? 0.20f : 0f);
                if (thick < 0f) thick = 0f;
                if (thick > 1f) thick = 1f;

                r.ExitSpeedKph = setup.Delivery.SpeedKph * (0.34f + 0.38f * thick + 0.16f * rng.NextFloat());
                r.ElevationDeg = thick < 0.5f
                    ? 20f + 22f * rng.NextFloat()   // thin: loops toward keeper/slip
                    : 4f + 14f * rng.NextFloat();    // thick: skims square
                r.IsLofted = r.ElevationDeg > 22f;

                float sideRand = rng.NextFloat() < 0.5f ? -1f : 1f;
                int side = TimingSystem.EdgeSide(setup.Delivery.Swing, setup.Delivery.Seam);
                float sideSign = side != 0 ? side : sideRand;
                float angle = thick < 0.5f
                    ? sideSign * (1.85f + 0.45f * rng.NextFloat())  // fine behind square
                    : sideSign * (1.20f + 0.70f * rng.NextFloat());  // squarer
                r.Direction = DirectionFromAngle(angle, r.ElevationDeg);
                return r;
            }

            // ---------------------------------------------------------------- struck
            float timingPower = TimingSystem.PowerCurve(setup.TimingOffset);
            float quality = timingPower
                            * (0.45f + 0.55f * setup.Direction.ReachQuality)
                            * (0.78f + 0.22f * setup.SwipeStrength)
                            * (setup.Shot.Awkward ? 0.60f : 1f);
            quality = quality < 0f ? 0f : quality > 1f ? 1f : quality;
            r.Quality = quality;

            if (setup.Shot.Lofted && quality >= 0.70f) r.Outcome = ContactOutcome.LoftedClean;
            else if (quality >= 0.80f) r.Outcome = ContactOutcome.Clean;
            else if (quality >= 0.55f) r.Outcome = ContactOutcome.Mistimed;
            else r.Outcome = ContactOutcome.Weak;

            float baseExit = 26f + 62f * setup.Shot.BasePower;
            r.ExitSpeedKph = 8f + quality * baseExit + 0.08f * setup.Delivery.SpeedKph;
            r.IsLofted = setup.Shot.Lofted;

            // Elevation.
            if (setup.Shot.Lofted)
            {
                r.ElevationDeg = 16f + 22f * quality + (rng.NextFloat() - 0.5f) * 8f;
            }
            else if (r.Outcome == ContactOutcome.Weak || r.Outcome == ContactOutcome.Mistimed)
            {
                r.ElevationDeg = 3f + 12f * rng.NextFloat(); // mishits pop up a little
            }
            else
            {
                float groundBase = setup.Shot.BaseLoftDeg * 0.4f;
                r.ElevationDeg = groundBase + 6f * quality + rng.NextFloat() * 3f;
            }

            // Direction: resolved direction + noise proportional to lost control.
            float control = TimingSystem.ControlCurve(setup.TimingOffset);
            float noise = (1f - control) * 0.35f * (rng.NextFloat() * 2f - 1f);
            if (setup.Shot.Awkward) noise += (rng.NextFloat() * 2f - 1f) * 0.20f;
            float angleFinal = setup.Direction.AngleFromStraight + noise;

            r.Direction = DirectionFromAngle(angleFinal, r.ElevationDeg);
            return r;
        }

        /// <summary>
        /// Angle from straight-down-the-ground (+ off side) with an elevation,
        /// into a world-space unit vector (ball travels toward +Z, i.e. into the field).
        /// </summary>
        public static Vec3 DirectionFromAngle(float angleFromStraight, float elevationDeg)
        {
            float elev = elevationDeg * 0.017453292f;
            float cosE = (float)System.Math.Cos(elev);
            return new Vec3(
                (float)System.Math.Sin(angleFromStraight) * cosE,
                (float)System.Math.Sin(elev),
                (float)System.Math.Cos(angleFromStraight) * cosE);
        }
    }
}
