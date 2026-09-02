using System.Collections.Generic;

namespace CricketGame.Core.Rules
{
    /// <summary>
    /// The state of a single innings: runs, wickets, legal balls and the delivery log.
    /// All mutation goes through <see cref="ApplyOutcome"/>; the owning
    /// <see cref="SuperOverMatch"/> enforces when an innings may receive deliveries.
    /// </summary>
    public sealed class Innings
    {
        private readonly SuperOverConfig config;
        private readonly List<BallRecord> deliveries = new List<BallRecord>();

        public int Runs { get; private set; }
        public int Wickets { get; private set; }

        /// <summary>Batter slots (0 and 1). The striker faces the next ball.
        /// Swap rules: odd runs swap the strike, 2 returns to the original
        /// end, boundaries are not run so 4/6 never swap.</summary>
        public int Striker { get; private set; }
        public int NonStriker { get; private set; }

        /// <summary>Number of legal balls bowled (extras do not count).</summary>
        public int LegalBalls { get; private set; }

        /// <summary>Total delivery attempts including wides and no-balls.</summary>
        public int TotalDeliveries { get; private set; }

        public Innings(SuperOverConfig config)
        {
            this.config = config;
            Striker = 0;
            NonStriker = 1;
        }

        public SuperOverConfig Config
        {
            get { return config; }
        }

        public IReadOnlyList<BallRecord> Deliveries
        {
            get { return deliveries; }
        }

        /// <summary>An innings ends when the legal balls or the wicket limit is exhausted.</summary>
        public bool IsComplete
        {
            get { return LegalBalls >= config.BallsPerInnings || Wickets >= config.MaxWicketsPerInnings; }
        }

        public int BallsRemaining
        {
            get { return System.Math.Max(0, config.BallsPerInnings - LegalBalls); }
        }

        public int WicketsRemaining
        {
            get { return System.Math.Max(0, config.MaxWicketsPerInnings - Wickets); }
        }

        /// <summary>Standard compact score, e.g. "13/1".</summary>
        public string ScoreDisplay
        {
            get { return Runs + "/" + Wickets; }
        }

        /// <summary>Runs per over so far (0 before a legal ball).</summary>
        public float CurrentRunRate
        {
            get { return LegalBalls <= 0 ? 0f : Runs / (LegalBalls / 6f); }
        }

        /// <summary>Who is bowling this innings ("AI" when the player bats,
        /// "YOU" during the chase). Set by the match controller.</summary>
        public string BowlerLabel { get; set; }

        /// <summary>
        /// Applies one delivery to this innings and returns the resulting record.
        /// Wickets are clamped at the configured maximum; the match controller is
        /// responsible for stopping the innings once <see cref="IsComplete"/>.
        /// </summary>
        internal BallRecord ApplyOutcome(DeliveryOutcome outcome, int inningsIndex, int? target)
        {
            Runs += outcome.TotalRuns;

            if (outcome.CountsAsLegalBall)
                LegalBalls++;

            if (outcome.IsWicket)
            {
                Wickets = System.Math.Min(config.MaxWicketsPerInnings, Wickets + 1);
                // Bowled/LBW/caught: no runs are taken, so the replacement
                // batter simply takes guard at the striker's end (no swap).
                // A run-out style dismissal with completed runs would swap
                // first - future extension point.
            }
            else if (outcome.BatRuns % 2 == 1)
            {
                int tmp = Striker;
                Striker = NonStriker;
                NonStriker = tmp;
            }

            TotalDeliveries++;

            var record = new BallRecord
            {
                InningsIndex = inningsIndex,
                DeliveryNumberInInnings = TotalDeliveries,
                Outcome = outcome,
                TotalRunsAfter = Runs,
                WicketsAfter = Wickets,
                LegalBallsAfter = LegalBalls,
                TargetAtDelivery = target,
                RunsNeededAfter = target.HasValue ? System.Math.Max(0, target.Value - Runs) : (int?)null
            };
            deliveries.Add(record);
            return record;
        }

        /// <summary>
        /// DEBUG ONLY: forces the innings counters (spec section 25 debug panel).
        /// Never called by the real match flow; values are clamped to the rules.
        /// </summary>
        public void DebugOverride(int runs, int wickets, int legalBalls)
        {
            Runs = System.Math.Max(0, runs);
            Wickets = System.Math.Clamp(System.Math.Max(0, wickets), 0, config.MaxWicketsPerInnings);
            LegalBalls = System.Math.Clamp(System.Math.Max(0, legalBalls), 0, config.BallsPerInnings);
            TotalDeliveries = System.Math.Max(TotalDeliveries, LegalBalls);
        }

        public override string ToString()
        {
            return ScoreDisplay + " (" + LegalBalls + " legal balls)";
        }
    }
}
