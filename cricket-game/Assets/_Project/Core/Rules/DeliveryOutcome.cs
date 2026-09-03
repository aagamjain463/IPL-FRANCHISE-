using System;

namespace CricketGame.Core.Rules
{
    /// <summary>Whether a delivery counts as one of the legal balls of the over.</summary>
    public enum DeliveryKind
    {
        Legal,
        Wide,
        NoBall
    }

    /// <summary>How a batter was dismissed.</summary>
    public enum DismissalKind
    {
        None,
        Bowled,
        Caught,
        Lbw,
        RunOut,
        Stumped
    }

    /// <summary>
    /// Immutable result of a single delivery attempt.
    /// Use the factory methods; they enforce cricket-sane combinations.
    /// </summary>
    public readonly struct DeliveryOutcome : IEquatable<DeliveryOutcome>
    {
        public DeliveryKind Kind { get; }

        /// <summary>Runs scored with the bat (or while running on a no-ball). Never negative.</summary>
        public int BatRuns { get; }

        /// <summary>Penalty extras: 1 for a wide, 1 for a no-ball, 0 otherwise.</summary>
        public int ExtraRuns { get; }

        public bool IsWicket { get; }
        public DismissalKind Dismissal { get; }

        private DeliveryOutcome(DeliveryKind kind, int batRuns, int extraRuns, bool isWicket, DismissalKind dismissal)
        {
            Kind = kind;
            BatRuns = batRuns;
            ExtraRuns = extraRuns;
            IsWicket = isWicket;
            Dismissal = dismissal;
        }

        /// <summary>A legal delivery scoring 0..6 runs off the bat.</summary>
        public static DeliveryOutcome Legal(int batRuns)
        {
            if (batRuns < 0 || batRuns > 6)
                throw new ArgumentOutOfRangeException(nameof(batRuns), "Legal delivery runs must be in [0, 6].");
            return new DeliveryOutcome(DeliveryKind.Legal, batRuns, 0, false, DismissalKind.None);
        }

        /// <summary>A legal delivery on which a wicket falls (no bat runs).</summary>
        public static DeliveryOutcome Wicket(DismissalKind dismissal)
        {
            if (dismissal == DismissalKind.None)
                throw new ArgumentException("Wicket outcome requires a dismissal kind.", nameof(dismissal));
            return new DeliveryOutcome(DeliveryKind.Legal, 0, 0, true, dismissal);
        }

        /// <summary>A wide: 1 extra run, does not count as a legal ball.</summary>
        public static DeliveryOutcome Wide()
        {
            return new DeliveryOutcome(DeliveryKind.Wide, 0, 1, false, DismissalKind.None);
        }

        /// <summary>A no-ball: 1 extra plus any runs hit, does not count as a legal ball.</summary>
        public static DeliveryOutcome NoBall(int batRuns)
        {
            if (batRuns < 0 || batRuns > 6)
                throw new ArgumentOutOfRangeException(nameof(batRuns), "No-ball bat runs must be in [0, 6].");
            return new DeliveryOutcome(DeliveryKind.NoBall, batRuns, 1, false, DismissalKind.None);
        }

        /// <summary>True only for deliveries that consume one of the 6 legal balls.</summary>
        public bool CountsAsLegalBall
        {
            get { return Kind == DeliveryKind.Legal; }
        }

        /// <summary>All runs added to the innings total by this delivery.</summary>
        public int TotalRuns
        {
            get { return BatRuns + ExtraRuns; }
        }

        public bool Equals(DeliveryOutcome other)
        {
            return Kind == other.Kind
                && BatRuns == other.BatRuns
                && ExtraRuns == other.ExtraRuns
                && IsWicket == other.IsWicket
                && Dismissal == other.Dismissal;
        }

        public override bool Equals(object obj)
        {
            return obj is DeliveryOutcome other && Equals(other);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                int hash = (int)Kind;
                hash = (hash * 397) ^ BatRuns;
                hash = (hash * 397) ^ ExtraRuns;
                hash = (hash * 397) ^ (IsWicket ? 1 : 0);
                hash = (hash * 397) ^ (int)Dismissal;
                return hash;
            }
        }

        public override string ToString()
        {
            if (IsWicket) return "W (" + Dismissal + ")";
            switch (Kind)
            {
                case DeliveryKind.Wide: return "wd" + (BatRuns > 0 ? "+" + BatRuns : "");
                case DeliveryKind.NoBall: return "nb" + (BatRuns > 0 ? "+" + BatRuns : "");
                default: return BatRuns.ToString();
            }
        }
    }
}
