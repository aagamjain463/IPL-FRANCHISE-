using System.Collections.Generic;
using CricketGame.Core.Rules;

namespace CricketGame.Core.Simulation
{
    /// <summary>The full simulated history of one Super Over.</summary>
    public sealed class MatchSimulation
    {
        public MatchResult Result;
        public int? Seed;
        public readonly List<BallRecord> FirstInningsDeliveries = new List<BallRecord>();
        public readonly List<BallRecord> SecondInningsDeliveries = new List<BallRecord>();
    }

    /// <summary>
    /// Runs a complete Super Over headlessly — no Unity, no rendering.
    /// The presentation layer uses the exact same engine directly (so the human
    /// can act); this simulator exists for tests, balancing, and future features
    /// like AI-vs-AI previews. It also proves the engine + policies produce
    /// complete, well-formed matches end-to-end.
    /// </summary>
    public sealed class SuperOverSimulator
    {
        /// <summary>
        /// Simulates a full match. In the first innings <paramref name="firstBat"/>
        /// faces <paramref name="firstBowl"/>; in the chase the second pair is used.
        /// </summary>
        public MatchSimulation Simulate(
            SuperOverConfig config,
            IBattingPolicy firstBat, IBowlingPolicy firstBowl,
            IBattingPolicy secondBat, IBowlingPolicy secondBowl,
            IRng rng, int? seed = null)
        {
            var sim = new MatchSimulation { Seed = seed };
            var match = new SuperOverMatch(config);
            match.BallCompleted += a =>
            {
                (a.Record.InningsIndex == 0
                    ? sim.FirstInningsDeliveries
                    : sim.SecondInningsDeliveries).Add(a.Record);
            };

            match.Start();
            PlayInnings(match, firstBat, firstBowl, rng);

            match.StartSecondInnings();
            PlayInnings(match, secondBat, secondBowl, rng);

            sim.Result = match.Result;
            return sim;
        }

        private static void PlayInnings(SuperOverMatch match, IBattingPolicy bat,
                                        IBowlingPolicy bowl, IRng rng)
        {
            int guard = 0;
            while (match.Phase != MatchPhase.Completed
                   && match.CurrentInnings != null
                   && !match.CurrentInnings.IsComplete)
            {
                if (++guard > 500)
                    throw new System.InvalidOperationException("Innings did not terminate.");

                BallContext ctx = BallContext.FromMatch(match);
                DeliveryOutcome outcome = OutcomeResolver.Resolve(rng, bat.Decide(rng, ctx), bowl.Decide(rng, ctx), match.Config);
                match.RecordDelivery(outcome);
            }
        }
    }
}
