namespace CricketGame.Core.Batting
{
    // Minimal math types so the engine stays free of UnityEngine.
    // The Unity layer converts to/from these at the boundary.

    public struct Vec2
    {
        public float X;
        public float Y;

        public Vec2(float x, float y) { X = x; Y = y; }

        public float Magnitude
        {
            get { return (float)System.Math.Sqrt(X * X + Y * Y); }
        }

        public static Vec2 Zero { get { return new Vec2(0, 0); } }

        public static Vec2 Normalize(Vec2 v)
        {
            float m = v.Magnitude;
            if (m < 1e-5f) return new Vec2(0, 1);
            return new Vec2(v.X / m, v.Y / m);
        }

        public override string ToString()
        {
            return "(" + X.ToString("0.00") + ", " + Y.ToString("0.00") + ")";
        }
    }

    public struct Vec3
    {
        public float X;
        public float Y;
        public float Z;

        public Vec3(float x, float y, float z) { X = x; Y = y; Z = z; }

        public override string ToString()
        {
            return "(" + X.ToString("0.00") + ", " + Y.ToString("0.00") + ", " + Z.ToString("0.00") + ")";
        }
    }

    /// <summary>Shot intent chosen by the player. Modifies the shot; never selects it.</summary>
    public enum ShotIntent
    {
        Defensive,
        Normal,
        Aggressive,
        Lofted
    }

    /// <summary>Timing classification relative to the ideal bat-ball contact moment.</summary>
    public enum TimingWindow
    {
        VeryEarly,
        Early,
        Good,
        Perfect,
        Late,
        VeryLate,
        Missed
    }

    /// <summary>The result quality of the bat meeting (or not meeting) the ball.</summary>
    public enum ContactOutcome
    {
        Miss,
        Edge,
        Weak,
        Mistimed,
        Clean,
        LoftedClean,
        DefensiveSolid
    }

    /// <summary>Contextual shot chosen from delivery + inputs. Never directly button-mapped.</summary>
    public enum ShotKind
    {
        StraightDrive,
        CoverDrive,
        SquareDrive,
        Cut,
        Pull,
        Flick,
        LegGlance,
        FrontFootDefense,
        BackFootDefense,
        LoftedStraight,
        LoftedDrive,
        LoftedLegSide,
        AwkwardPoke
    }

    /// <summary>
    /// One frame of input to the batting engine. Completely source-agnostic:
    /// touch today, keyboard/gamepad adapters later.
    /// Footwork X: leg(-1)..off(+1); Footwork Y: back(-1)..forward(+1).
    /// ShotDirection is the normalized field-plane swipe (X off/leg, Y straight(+)/fine(-)).
    /// SwingTriggered is true only on the frame the shot is released.
    /// </summary>
    public struct BattingInputFrame
    {
        public Vec2 Footwork;
        public bool SwingTriggered;
        public Vec2 ShotDirection;
        public float SwipeStrength;
        public ShotIntent Intent;

        public static BattingInputFrame Idle
        {
            get
            {
                return new BattingInputFrame
                {
                    Footwork = Vec2.Zero,
                    SwingTriggered = false,
                    ShotDirection = new Vec2(0, 1),
                    SwipeStrength = 0f,
                    Intent = ShotIntent.Normal
                };
            }
        }
    }

    /// <summary>
    /// Everything describing one delivery. The trajectory built from this
    /// is fully deterministic, so timing is never random.
    /// Line: -1 (leg stump) .. +1 (off stump). Length: 0 (full) .. 1 (short).
    /// Swing: -1 (into the batter) .. +1 (away) lateral air movement.
    /// Phase 2 adds Type/Seam/Bounce/ReleaseHeight; all default to Phase 1
    /// behaviour so existing deliveries are unchanged.
    /// </summary>
    public struct DeliveryData
    {
        public float SpeedKph;
        public float Line;
        public float Length;
        public float Swing;

        /// <summary>Which stock delivery this is (drives selection, debug, HUD).</summary>
        public DeliveryType Type;

        /// <summary>Post-bounce lateral cut: -1 (into batter) .. +1 (away). 0 = none.</summary>
        public float Seam;

        /// <summary>Vertical bounce energy multiplier. &lt;=0 means 1.0 (Phase 1).</summary>
        public float Bounce;

        /// <summary>Custom release height (m). &lt;=0 means 2.05 (default).</summary>
        public float ReleaseHeight;

        public static DeliveryData Full(float speedKph = 118f, float line = 0f, float swing = 0f)
        {
            return new DeliveryData { SpeedKph = speedKph, Line = line, Length = 0.12f, Swing = swing };
        }

        public static DeliveryData GoodLength(float speedKph = 126f, float line = 0.15f, float swing = 0f)
        {
            return new DeliveryData { SpeedKph = speedKph, Line = line, Length = 0.52f, Swing = swing };
        }

        public static DeliveryData Short(float speedKph = 134f, float line = -0.1f, float swing = 0f)
        {
            return new DeliveryData { SpeedKph = speedKph, Line = line, Length = 0.88f, Swing = swing };
        }
    }

    /// <summary>The stock delivery types (Phase 2 base + Phase 4 variations).</summary>
    public enum DeliveryType
    {
        FastStraight,
        FastInswinger,
        FastOutswinger,
        Yorker,
        FullBall,
        GoodLength,
        ShortBall,
        Bouncer,
        // Phase 4 variations: pace-off and seam-position deliveries.
        OffCutter,
        LegCutter,
        SlowerBall
    }

    /// <summary>
    /// Pitch surface parameters. Only Normal is tuned today; the fields exist
    /// so slower / batting-friendly / spinning pitches can be added later
    /// without any API churn (spec section 3).
    /// </summary>
    public struct PitchProfile
    {
        /// <summary>Multiplier on vertical bounce energy (1 = normal).</summary>
        public float BounceEnergy;

        /// <summary>Multiplier on pace kept after the bounce (1 = normal).</summary>
        public float PaceFactor;

        /// <summary>Constant lateral drift after the bounce (m/s); 0 = no turn.</summary>
        public float Turn;

        public string Name;

        public static PitchProfile Normal
        {
            get
            {
                return new PitchProfile { BounceEnergy = 1f, PaceFactor = 1f, Turn = 0f, Name = "normal" };
            }
        }
    }
}
