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

        /// <summary>Number of legal balls bowled (extras do not count).</summary>
        public int LegalBalls { get; private set; }

        /// <summary>Total delivery attempts including wides and no-balls.</summary>
        public int TotalDeliveries { get; private set; }

        public Innings(SuperOverConfig config)
        {
            this.config = config;
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
                Wickets = System.Math.Min(config.MaxWicketsPerInnings, Wickets + 1);

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

        public override string ToString()
        {
            return ScoreDisplay + " (" + LegalBalls + " legal balls)";
        }
    }
}
