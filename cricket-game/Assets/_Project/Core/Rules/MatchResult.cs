namespace CricketGame.Core.Rules
{
    /// <summary>Overall outcome of the Super Over. Chase-based, never "highest score wins".</summary>
    public enum MatchOutcome
    {
        /// <summary>The side batting second failed to reach the target (by balls or wickets).</summary>
        FirstInningsWin,

        /// <summary>The side batting second reached the target.</summary>
        SecondInningsWin,

        /// <summary>The side batting second finished exactly level with the first innings score.</summary>
        Tie
    }

    /// <summary>Compact summary of one innings for result reporting.</summary>
    public sealed class InningsSummary
    {
        public int Runs;
        public int Wickets;
        public int LegalBalls;
        public int TotalDeliveries;

        public static InningsSummary From(Innings innings)
        {
            return new InningsSummary
            {
                Runs = innings.Runs,
                Wickets = innings.Wickets,
                LegalBalls = innings.LegalBalls,
                TotalDeliveries = innings.TotalDeliveries
            };
        }

        public override string ToString()
        {
            return Runs + "/" + Wickets + " (" + LegalBalls + " balls)";
        }
    }

    /// <summary>
    /// Final result of a completed Super Over. Pure data; presentation layers
    /// format it for humans, the future web bridge serializes it for the web app.
    /// </summary>
    public sealed class MatchResult
    {
        public MatchOutcome Outcome;

        /// <summary>Index of the winning innings (0 or 1); -1 for a tie.</summary>
        public int WinnerInningsIndex = -1;

        public int Target;

        /// <summary>Run margin when the first-batting side wins.</summary>
        public int MarginRuns;

        /// <summary>Wickets in hand when the chasing side wins.</summary>
        public int MarginWickets;

        /// <summary>Balls still available when the chasing side wins.</summary>
        public int MarginBalls;

        public InningsSummary FirstInnings;
        public InningsSummary SecondInnings;

        /// <summary>
        /// Human-readable summary. Side names are injected by the caller so the
        /// core engine stays completely UI/web-app agnostic.
        /// </summary>
        public string Describe(string firstBattingSideName, string secondBattingSideName)
        {
            switch (Outcome)
            {
                case MatchOutcome.SecondInningsWin:
                    string win = secondBattingSideName + " won by " + MarginWickets
                           + (MarginWickets == 1 ? " wicket" : " wickets");
                    if (MarginBalls > 0)
                        win += " with " + MarginBalls
                               + (MarginBalls == 1 ? " ball" : " balls") + " to spare";
                    return win;

                case MatchOutcome.FirstInningsWin:
                    return firstBattingSideName + " won by " + MarginRuns
                           + (MarginRuns == 1 ? " run" : " runs");

                default:
                    return "Match tied (" + firstBattingSideName + " " + FirstInnings
                           + ", " + secondBattingSideName + " " + SecondInnings + ")";
            }
        }

        public override string ToString()
        {
            return Describe("First innings side", "Second innings side");
        }
    }
}
