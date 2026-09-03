using System;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>Playable match formats (Phase 6).</summary>
    public enum MatchMode
    {
        QuickMatch,
        SuperOver,
        TwentyOver
    }

    /// <summary>Difficulty tiers; gameplay layers interpret them, the rules engine ignores them.</summary>
    public enum MatchDifficulty
    {
        Easy,
        Medium,
        Hard,
        Expert
    }

    /// <summary>
    /// Data-driven ruleset for a limited-overs match (Phase 6 §2).
    /// Nothing in the match engine hardcodes "20": every limit lives here, so
    /// future formats are added by constructing a new settings object.
    /// Immutable once created.
    /// </summary>
    [Serializable]
    public sealed class MatchSettings
    {
        public int OversPerInnings { get; }
        public int WicketsPerInnings { get; }
        public int BallsPerOver { get; }

        /// <summary>Maximum overs one bowler may bowl in an innings (4 for a T20-style 20-over game).</summary>
        public int MaxOversPerBowler { get; }

        /// <summary>Length of the powerplay in overs from the start of each innings (0 disables it).</summary>
        public int PowerplayOvers { get; }

        /// <summary>Maximum fielders allowed outside the inner circle during the powerplay.</summary>
        public int MaxFieldersOutsideCircleInPowerplay { get; }

        public MatchMode Mode { get; }
        public MatchDifficulty Difficulty { get; }

        /// <summary>When true, delivery generators may produce wides/no-balls.</summary>
        public bool AllowExtras { get; }

        public MatchSettings(
            int oversPerInnings,
            int wicketsPerInnings,
            MatchMode mode = MatchMode.TwentyOver,
            MatchDifficulty difficulty = MatchDifficulty.Medium,
            int ballsPerOver = 6,
            int maxOversPerBowler = 0,
            int powerplayOvers = 0,
            int maxFieldersOutsideCircleInPowerplay = 2,
            bool allowExtras = true)
        {
            if (oversPerInnings < 1)
                throw new ArgumentOutOfRangeException(nameof(oversPerInnings), "oversPerInnings must be >= 1.");
            if (wicketsPerInnings < 1)
                throw new ArgumentOutOfRangeException(nameof(wicketsPerInnings), "wicketsPerInnings must be >= 1.");
            if (ballsPerOver < 1)
                throw new ArgumentOutOfRangeException(nameof(ballsPerOver), "ballsPerOver must be >= 1.");

            // Default bowler cap: T20 rule of thumb (20 overs -> 4 each). One-over
            // formats always allow a single bowler to bowl the whole innings.
            if (maxOversPerBowler <= 0)
                maxOversPerBowler = oversPerInnings == 1 ? 1 : Math.Max(1, oversPerInnings / 5);
            if (maxOversPerBowler > oversPerInnings)
                maxOversPerBowler = oversPerInnings;

            if (powerplayOvers < 0 || powerplayOvers > oversPerInnings)
                throw new ArgumentOutOfRangeException(nameof(powerplayOvers), "powerplayOvers out of range.");

            OversPerInnings = oversPerInnings;
            WicketsPerInnings = wicketsPerInnings;
            BallsPerOver = ballsPerOver;
            MaxOversPerBowler = maxOversPerBowler;
            PowerplayOvers = powerplayOvers;
            MaxFieldersOutsideCircleInPowerplay = maxFieldersOutsideCircleInPowerplay;
            Mode = mode;
            Difficulty = difficulty;
            AllowExtras = allowExtras;
        }

        /// <summary>Total legal balls in one innings.</summary>
        public int BallsPerInnings
        {
            get { return OversPerInnings * BallsPerOver; }
        }

        /// <summary>Minimum squad size for the batting side (every wicket needs a replacement).</summary>
        public int MinimumBatters
        {
            get { return WicketsPerInnings + 1; }
        }

        /// <summary>Minimum bowling squad so the overs can be covered under the per-bowler cap.</summary>
        public int MinimumBowlers
        {
            get { return (OversPerInnings + MaxOversPerBowler - 1) / MaxOversPerBowler; }
        }

        /// <summary>True while the current over is inside the powerplay window.</summary>
        public bool IsPowerplayOver(int completedOvers)
        {
            return PowerplayOvers > 0 && completedOvers < PowerplayOvers;
        }

        /// <summary>Standard 20-over match: 10 wickets, 4-over bowler cap, 6-over powerplay (max 2 outside).</summary>
        public static MatchSettings TwentyOver(MatchDifficulty difficulty = MatchDifficulty.Medium)
        {
            return new MatchSettings(20, 10, MatchMode.TwentyOver, difficulty,
                powerplayOvers: 6, maxFieldersOutsideCircleInPowerplay: 2);
        }

        /// <summary>Short formats (1/2/5/10 overs) for quick matches.</summary>
        public static MatchSettings Quick(int overs, MatchDifficulty difficulty = MatchDifficulty.Medium)
        {
            return new MatchSettings(overs, 10, MatchMode.QuickMatch, difficulty, powerplayOvers: 0);
        }

        /// <summary>Super Over rules expressed through the same engine (Phase 6 §29 compatibility).</summary>
        public static MatchSettings SuperOver(MatchDifficulty difficulty = MatchDifficulty.Medium)
        {
            return new MatchSettings(1, 2, MatchMode.SuperOver, difficulty, powerplayOvers: 0);
        }
    }
}
