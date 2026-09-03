using CricketGame.Core.Rules;

namespace CricketGame.Core.Simulation
{
    /// <summary>
    /// Everything a batting or bowling policy needs to decide what to do for
    /// the next delivery. Snapshot of the live match, no mutation.
    /// </summary>
    public readonly struct BallContext
    {
        public int InningsIndex { get; }
        public bool IsChasing { get; }

        /// <summary>Chase target during the second innings; null during the first.</summary>
        public int? Target { get; }

        /// <summary>Runs still needed (second innings only).</summary>
        public int? RunsRequired { get; }

        public int Score { get; }
        public int BallsRemaining { get; }
        public int WicketsRemaining { get; }

        public BallContext(int inningsIndex, bool isChasing, int? target, int? runsRequired,
                           int score, int ballsRemaining, int wicketsRemaining)
        {
            InningsIndex = inningsIndex;
            IsChasing = isChasing;
            Target = target;
            RunsRequired = runsRequired;
            Score = score;
            BallsRemaining = ballsRemaining;
            WicketsRemaining = wicketsRemaining;
        }

        /// <summary>Builds the context for the delivery about to be bowled.</summary>
        public static BallContext FromMatch(SuperOverMatch match)
        {
            Innings current = match.CurrentInnings;
            bool chasing = match.Phase == MatchPhase.SecondInnings;
            return new BallContext(
                match.CurrentInningsIndex,
                chasing,
                chasing ? match.Target : null,
                chasing ? match.RunsRequired : null,
                current.Runs,
                current.BallsRemaining,
                current.WicketsRemaining);
        }

        /// <summary>Required runs per remaining ball; 0 when not chasing or nothing needed.</summary>
        public float RequiredRatePerBall
        {
            get
            {
                if (!IsChasing || !RunsRequired.HasValue || BallsRemaining <= 0) return 0f;
                return RunsRequired.Value / (float)BallsRemaining;
            }
        }
    }
}
