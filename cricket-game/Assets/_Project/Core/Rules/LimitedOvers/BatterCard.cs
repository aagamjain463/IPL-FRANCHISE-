using System;
using System.Globalization;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>
    /// Career-within-the-match statistics for one batter (Phase 6 §7).
    /// Pure data + accumulation rules; no UI logic. All dismissal metadata is
    /// stored here so the scorecard layer never derives stats itself.
    /// </summary>
    [Serializable]
    public sealed class BatterCard
    {
        public readonly string Name;

        public int Runs { get; private set; }
        public int BallsFaced { get; private set; }
        public int Fours { get; private set; }
        public int Sixes { get; private set; }

        public bool IsOut { get; private set; }
        public DismissalKind Dismissal { get; private set; }

        /// <summary>Index of the bowler credited with the dismissal; -1 for run outs.</summary>
        public int DismissedByBowler { get; private set; } = -1;

        /// <summary>Index of the fielder involved (catch/run out); -1 when not applicable.</summary>
        public int DismissedByFielder { get; private set; } = -1;

        public BatterCard(string name)
        {
            Name = name ?? "";
        }

        /// <summary>Strike rate; 0 before facing a ball. Standard cricket formula.</summary>
        public float StrikeRate
        {
            get { return BallsFaced <= 0 ? 0f : Runs * 100f / BallsFaced; }
        }

        /// <summary>
        /// Credits one delivery to this batter. Only bat runs count against the
        /// batter; wides never face a batter, no-ball runs score but consume no ball.
        /// </summary>
        public void ApplyDelivery(DeliveryOutcome outcome)
        {
            if (outcome.BatRuns > 0)
            {
                Runs += outcome.BatRuns;
                if (outcome.CountsAsLegalBall)
                {
                    if (outcome.BatRuns == 4) Fours++;
                    else if (outcome.BatRuns == 6) Sixes++;
                }
            }

            if (outcome.CountsAsLegalBall)
                BallsFaced++;
        }

        /// <summary>Records the dismissal. A batter can only be dismissed once and never returns.</summary>
        public void RecordDismissal(DismissalKind dismissal, int bowlerIndex, int fielderIndex)
        {
            if (IsOut)
                throw new InvalidOperationException("Batter '" + Name + "' is already out.");
            if (dismissal == DismissalKind.None)
                throw new ArgumentException("RecordDismissal requires a dismissal kind.", nameof(dismissal));

            IsOut = true;
            Dismissal = dismissal;
            DismissedByBowler = dismissal == DismissalKind.RunOut ? -1 : bowlerIndex;
            DismissedByFielder = fielderIndex;
        }

        /// <summary>Scorecard line, e.g. "61 (38)" plus boundary counts.</summary>
        public string StatLine
        {
            get
            {
                return Runs + " (" + BallsFaced + ")  4s: " + Fours + "  6s: " + Sixes
                       + "  SR: " + StrikeRate.ToString("0.00", CultureInfo.InvariantCulture);
            }
        }

        /// <summary>Dismissal text for the scorecard; empty string while not out.</summary>
        public string DismissalText
        {
            get
            {
                if (!IsOut) return "not out";
                switch (Dismissal)
                {
                    case DismissalKind.Bowled: return "bowled";
                    case DismissalKind.Caught: return "caught";
                    case DismissalKind.Lbw: return "lbw";
                    case DismissalKind.RunOut: return "run out";
                    case DismissalKind.Stumped: return "stumped";
                    default: return "out";
                }
            }
        }

        public override string ToString()
        {
            return Name + " " + StatLine + (IsOut ? " — " + DismissalText : " — not out");
        }
    }
}
