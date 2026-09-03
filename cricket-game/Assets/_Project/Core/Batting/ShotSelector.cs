namespace CricketGame.Core.Batting
{
    public enum LengthZone { Full, Good, Short }
    public enum LineZone { Leg, Middle, Off }
    public enum DirectionSector { FineLeg, SquareLeg, MidWicket, Straight, Cover, Point, ThirdMan }

    public struct ShotSelection
    {
        public ShotKind Kind;
        public string Name;
        public bool Lofted;
        public bool Awkward;
        public float BasePower;    // 0..1 before timing/reach are applied
        public float BaseLoftDeg;  // base launch elevation for this intent/shot
    }

    /// <summary>
    /// Contextual shot selection. There is no "swipe right = cover drive".
    /// The shot emerges from intent x foot pose x length x line x requested
    /// direction. Unrealistic combinations come back flagged Awkward and turn
    /// into weak/mistimed contact instead of a forced perfect shot.
    /// </summary>
    public static class ShotSelector
    {
        public static LengthZone Zone(float length)
        {
            if (length < 0.35f) return LengthZone.Full;
            if (length < 0.72f) return LengthZone.Good;
            return LengthZone.Short;
        }

        /// <summary>Extreme fullness: at the toes. Wants front-foot work to dig out.</summary>
        public static bool IsYorker(float length)
        {
            return length < 0.12f;
        }

        public static LineZone LineOf(float line)
        {
            if (line < -0.25f) return LineZone.Leg;
            if (line > 0.25f) return LineZone.Off;
            return LineZone.Middle;
        }

        /// <summary>Classifies the requested direction angle (radians from straight, + off).</summary>
        public static DirectionSector SectorOf(float angleFromStraight)
        {
            float deg = angleFromStraight * 57.29578f;
            float abs = deg < 0f ? -deg : deg;

            if (abs <= 20f) return DirectionSector.Straight;
            if (abs <= 55f) return deg > 0f ? DirectionSector.Cover : DirectionSector.MidWicket;
            if (abs <= 100f) return deg > 0f ? DirectionSector.Point : DirectionSector.SquareLeg;
            return deg > 0f ? DirectionSector.ThirdMan : DirectionSector.FineLeg;
        }

        public static ShotSelection Select(ShotIntent intent, FootPose pose, DeliveryData delivery,
                                           DirectionResolveResult direction)
        {
            LengthZone length = Zone(delivery.Length);
            DirectionSector sector = SectorOf(direction.AngleFromStraight);
            bool askedSquareOrBehind =
                sector == DirectionSector.Point || sector == DirectionSector.SquareLeg ||
                sector == DirectionSector.ThirdMan || sector == DirectionSector.FineLeg;

            var s = new ShotSelection();

            // ------------------------------------------------ defensive
            if (intent == ShotIntent.Defensive)
            {
                s.Kind = length == LengthZone.Short ? ShotKind.BackFootDefense : ShotKind.FrontFootDefense;
                s.Name = length == LengthZone.Short ? "Back-Foot Defence" : "Front-Foot Defence";
                s.BasePower = 0.30f;
                s.BaseLoftDeg = 2f;
                // Defending a ball you are nowhere near is awkward.
                s.Awkward = direction.ReachQuality < 0.2f;
                return s;
            }

            // ------------------------------------------------ lofted
            if (intent == ShotIntent.Lofted)
            {
                s.Lofted = true;
                s.BasePower = 0.90f;
                s.BaseLoftDeg = 30f;

                if (length == LengthZone.Short)
                {
                    s.Kind = ShotKind.Pull;
                    s.Name = "Lofted Pull";
                    s.Awkward = pose == FootPose.FrontFoot; // should be on the back foot
                    return s;
                }

                if (sector == DirectionSector.MidWicket || sector == DirectionSector.SquareLeg ||
                    sector == DirectionSector.FineLeg)
                {
                    s.Kind = ShotKind.LoftedLegSide;
                    s.Name = "Lofted Leg-Side Shot";
                }
                else if (sector == DirectionSector.Straight)
                {
                    s.Kind = ShotKind.LoftedStraight;
                    s.Name = "Lofted Straight";
                }
                else
                {
                    s.Kind = ShotKind.LoftedDrive;
                    s.Name = "Lofted Drive";
                }
                // Full balls want a stride; lofting a ball at the toes is a heave.
                s.Awkward = (pose == FootPose.BackFoot && length == LengthZone.Full)
                            || IsYorker(delivery.Length);
                return s;
            }

            // ------------------------------------------------ normal / aggressive
            s.BasePower = intent == ShotIntent.Aggressive ? 1.0f : 0.68f;
            s.BaseLoftDeg = intent == ShotIntent.Aggressive ? 12f : 6f;

            switch (length)
            {
                case LengthZone.Full:
                    if (pose == FootPose.BackFoot) s.Awkward = true; // full balls want a front stride
                    // A ball at the toes wants the front foot dug in.
                    if (IsYorker(delivery.Length) && pose != FootPose.FrontFoot) s.Awkward = true;
                    if (askedSquareOrBehind)
                    {
                        // Cutting a full ball is not on: an awkward stab instead.
                        s.Kind = ShotKind.AwkwardPoke;
                        s.Name = "Awkward Stab";
                        s.Awkward = true;
                        s.BasePower *= 0.5f;
                        return s;
                    }
                    switch (sector)
                    {
                        case DirectionSector.Cover:
                            s.Kind = ShotKind.CoverDrive; s.Name = "Cover Drive"; break;
                        case DirectionSector.MidWicket:
                        case DirectionSector.SquareLeg:
                        case DirectionSector.FineLeg:
                            s.Kind = ShotKind.Flick; s.Name = "Flick"; break;
                        default:
                            s.Kind = ShotKind.StraightDrive; s.Name = "Straight Drive"; break;
                    }
                    return s;

                case LengthZone.Short:
                    if (pose == FootPose.FrontFoot) s.Awkward = true; // short balls want the back foot
                    switch (sector)
                    {
                        case DirectionSector.Cover:
                        case DirectionSector.Point:
                        case DirectionSector.ThirdMan:
                            s.Kind = ShotKind.Cut; s.Name = intent == ShotIntent.Aggressive ? "Hard Cut" : "Cut"; break;
                        case DirectionSector.Straight:
                            if (intent == ShotIntent.Aggressive)
                            {
                                s.Kind = ShotKind.Pull; s.Name = "Pull (straight)";
                            }
                            else
                            {
                                s.Kind = ShotKind.AwkwardPoke; s.Name = "Awkward Poke"; s.Awkward = true;
                            }
                            break;
                        default:
                            s.Kind = ShotKind.Pull; s.Name = intent == ShotIntent.Aggressive ? "Pull" : "Pull Shot"; break;
                    }
                    return s;

                default: // good length
                    switch (sector)
                    {
                        case DirectionSector.Cover:
                            s.Kind = ShotKind.CoverDrive; s.Name = "Cover Drive"; break;
                        case DirectionSector.Point:
                            s.Kind = ShotKind.SquareDrive; s.Name = "Square Drive"; break;
                        case DirectionSector.ThirdMan:
                            s.Kind = ShotKind.Cut; s.Name = "Late Cut"; s.Awkward = pose == FootPose.FrontFoot; break;
                        case DirectionSector.MidWicket:
                            s.Kind = ShotKind.Flick; s.Name = "Flick"; break;
                        case DirectionSector.SquareLeg:
                        case DirectionSector.FineLeg:
                            s.Kind = ShotKind.LegGlance; s.Name = "Leg Glance"; break;
                        default:
                            s.Kind = ShotKind.StraightDrive; s.Name = "Straight Drive"; break;
                    }
                    return s;
            }
        }

        public static string SectorName(DirectionSector sector)
        {
            switch (sector)
            {
                case DirectionSector.FineLeg: return "FINE LEG";
                case DirectionSector.SquareLeg: return "SQUARE LEG";
                case DirectionSector.MidWicket: return "MID-WICKET";
                case DirectionSector.Straight: return "STRAIGHT";
                case DirectionSector.Cover: return "COVER";
                case DirectionSector.Point: return "POINT";
                default: return "THIRD MAN";
            }
        }
    }
}
