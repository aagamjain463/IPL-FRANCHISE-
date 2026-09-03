using NUnit.Framework;
using CricketGame.Core.Rules;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Tests for the ball simulation layer: deterministic replay, outcome
    /// model sanity, AI policy behavior, and full headless matches.
    /// </summary>
    [TestFixture]
    public class SimulationTests
    {
        private static readonly SuperOverConfig Cfg = SuperOverConfig.Standard;

        // ------------------------------------------------------------------ determinism

        [Test]
        public void SameSeed_ProducesIdenticalMatches()
        {
            var simulator = new SuperOverSimulator();
            var a = simulator.Simulate(Cfg,
                new AiBattingPolicy(0.6f), new AiBowlingPolicy(0.5f),
                new AiBattingPolicy(0.6f), new AiBowlingPolicy(0.5f),
                new SeededRng(42), 42);
            var b = simulator.Simulate(Cfg,
                new AiBattingPolicy(0.6f), new AiBowlingPolicy(0.5f),
                new AiBattingPolicy(0.6f), new AiBowlingPolicy(0.5f),
                new SeededRng(42), 42);

            Assert.AreEqual(a.Result.Outcome, b.Result.Outcome);
            Assert.AreEqual(a.FirstInningsDeliveries.Count, b.FirstInningsDeliveries.Count);
            Assert.AreEqual(a.SecondInningsDeliveries.Count, b.SecondInningsDeliveries.Count);
            for (int i = 0; i < a.SecondInningsDeliveries.Count; i++)
                Assert.AreEqual(a.SecondInningsDeliveries[i].Outcome, b.SecondInningsDeliveries[i].Outcome);
        }

        // ------------------------------------------------------------------ replay consistency

        [Test]
        public void SimulatedLog_ReplayedIntoFreshEngine_ReproducesResult()
        {
            var simulator = new SuperOverSimulator();
            for (int seed = 1; seed <= 50; seed++)
            {
                var sim = simulator.Simulate(Cfg,
                    new AiBattingPolicy(0.55f), new AiBowlingPolicy(0.45f),
                    new AiBattingPolicy(0.65f), new AiBowlingPolicy(0.55f),
                    new SeededRng(seed), seed);

                var replay = new SuperOverMatch(Cfg);
                replay.Start();
                foreach (var r in sim.FirstInningsDeliveries) replay.RecordDelivery(r.Outcome);
                replay.StartSecondInnings();
                foreach (var r in sim.SecondInningsDeliveries) replay.RecordDelivery(r.Outcome);

                Assert.AreEqual(MatchPhase.Completed, replay.Phase, "seed " + seed);
                Assert.AreEqual(sim.Result.Outcome, replay.Result.Outcome, "seed " + seed);
                Assert.AreEqual(sim.Result.FirstInnings.Runs, replay.Result.FirstInnings.Runs);
                Assert.AreEqual(sim.Result.SecondInnings.Runs, replay.Result.SecondInnings.Runs);
            }
        }

        // ------------------------------------------------------------------ chase immediacy

        [Test]
        public void EverySimulatedChaseWin_StopsOnTheWinningDelivery()
        {
            var simulator = new SuperOverSimulator();
            int chaseWins = 0;
            for (int seed = 1; seed <= 400; seed++)
            {
                var sim = simulator.Simulate(Cfg,
                    new AiBattingPolicy(0.5f), new AiBowlingPolicy(0.5f),
                    new AiBattingPolicy(0.55f), new AiBowlingPolicy(0.5f),
                    new SeededRng(seed), seed);

                var second = sim.SecondInningsDeliveries;
                var last = second[second.Count - 1];

                switch (sim.Result.Outcome)
                {
                    case MatchOutcome.SecondInningsWin:
                        chaseWins++;
                        Assert.GreaterOrEqual(last.TotalRunsAfter, sim.Result.Target,
                            "The final delivery must be the one that reached the target.");
                        if (second.Count > 1)
                            Assert.Less(second[second.Count - 2].TotalRunsAfter, sim.Result.Target,
                                "The target was already reached one delivery earlier - chase should have stopped.");
                        break;
                    case MatchOutcome.FirstInningsWin:
                        Assert.Less(last.TotalRunsAfter, sim.Result.Target);
                        break;
                    case MatchOutcome.Tie:
                        Assert.AreEqual(sim.Result.Target - 1, last.TotalRunsAfter);
                        break;
                }
            }
            Assert.Greater(chaseWins, 0, "The soak should contain at least one chase win.");
        }

        // ------------------------------------------------------------------ outcome model sanity

        [Test]
        public void Resolver_NeverProducesIllegalDeliveries_And_RespectsAllowExtras()
        {
            var rng = new SeededRng(7);
            var noExtras = new SuperOverConfig(6, 2, allowExtras: false);
            var shot = new ShotIntent(0.8f, 0.5f);
            var bowl = new BowlingPlan(0.5f);

            int extras = 0, wickets = 0, boundaries = 0;
            for (int i = 0; i < 20000; i++)
            {
                var o = OutcomeResolver.Resolve(rng, shot, bowl, noExtras);
                Assert.AreEqual(DeliveryKind.Legal, o.Kind, "allowExtras=false must never produce extras");
                if (o.IsWicket) { wickets++; Assert.AreEqual(0, o.BatRuns); }
                else if (o.BatRuns >= 4) boundaries++;
            }
            Assert.Greater(wickets, 0);
            Assert.Greater(boundaries, 0);
        }

        [Test]
        public void Resolver_HigherThreat_ProducesMoreWickets_And_FewerRuns()
        {
            var shot = new ShotIntent(0.5f, 0.5f);
            const int trials = 30000;

            var weak = Sample(trials, shot, new BowlingPlan(0.1f), 11);
            var strong = Sample(trials, shot, new BowlingPlan(0.9f), 22);

            Assert.Greater(strong.Wickets, weak.Wickets,
                "Stronger bowling must take more wickets (weak=" + weak.Wickets + " strong=" + strong.Wickets + ")");
            Assert.Less(strong.RunsPerBall, weak.RunsPerBall,
                "Stronger bowling must concede fewer runs.");
        }

        [Test]
        public void Resolver_AggressiveGoodExecution_ScoresFaster_WithMoreRisk()
        {
            var bowl = new BowlingPlan(0.5f);
            const int trials = 30000;

            var safe = Sample(trials, ShotIntent.FromHumanInput(ShotStyle.Defensive, 1f), bowl, 31);
            var attack = Sample(trials, ShotIntent.FromHumanInput(ShotStyle.Aggressive, 1f), bowl, 32);

            Assert.Greater(attack.RunsPerBall, safe.RunsPerBall);
            Assert.Greater(attack.Wickets, safe.Wickets);
        }

        private struct SampleStats { public int Wickets; public float RunsPerBall; }

        private static SampleStats Sample(int trials, ShotIntent shot, BowlingPlan bowl, int seed)
        {
            var rng = new SeededRng(seed);
            int wickets = 0, runs = 0;
            for (int i = 0; i < trials; i++)
            {
                var o = OutcomeResolver.Resolve(rng, shot, bowl, Cfg);
                if (o.IsWicket) wickets++;
                runs += o.TotalRuns;
            }
            return new SampleStats { Wickets = wickets, RunsPerBall = runs / (float)trials };
        }

        // ------------------------------------------------------------------ policy sanity

        [Test]
        public void AiBatter_ChasesHarder_WhenRequiredRateIsHigh()
        {
            var policy = new AiBattingPolicy(0.6f);
            var rng = new SeededRng(3);

            // Easy chase: need 2 off 6.
            float easy = 0f, hard = 0f;
            for (int i = 0; i < 200; i++)
            {
                var easyCtx = new BallContext(1, true, 9, 2, 7, 6, 2);
                var hardCtx = new BallContext(1, true, 15, 14, 1, 6, 2);
                easy += policy.Decide(rng, easyCtx).Aggression;
                hard += policy.Decide(rng, hardCtx).Aggression;
            }
            Assert.Greater(hard / 200f, easy / 200f,
                "The AI must attack when the required rate is high.");
        }

        [Test]
        public void AiBatter_SteadyWhenTinyTarget_WithinReach()
        {
            var policy = new AiBattingPolicy(0.9f);
            var rng = new SeededRng(4);
            for (int i = 0; i < 50; i++)
            {
                var ctx = new BallContext(1, true, 8, 1, 7, 3, 2); // need 1 off 3
                Assert.LessOrEqual(policy.Decide(rng, ctx).Aggression, 0.35f);
            }
        }

        [Test]
        public void HumanInput_BetterTiming_MeansBetterExecution()
        {
            var poor = ShotIntent.FromHumanInput(ShotStyle.Balanced, 0.1f);
            var perfect = ShotIntent.FromHumanInput(ShotStyle.Balanced, 1f);
            Assert.Greater(perfect.Execution, poor.Execution);
            Assert.Greater(perfect.Aggression, poor.Aggression * 0.5f); // still a real shot
        }

        [Test]
        public void HumanBowling_BetterTiming_MeansMoreThreat()
        {
            Assert.Less(BowlingPlan.FromHumanInput(0.1f).Threat, BowlingPlan.FromHumanInput(0.9f).Threat);
        }

        // ------------------------------------------------------------------ full-match soak

        [Test]
        public void Simulator_Soak_AlwaysCompletes_WithConsistentResults()
        {
            var simulator = new SuperOverSimulator();
            int firstWins = 0, secondWins = 0, ties = 0;

            for (int seed = 1000; seed < 1600; seed++)
            {
                float batSkill = 0.3f + (seed % 5) * 0.1f;
                var sim = simulator.Simulate(Cfg,
                    new AiBattingPolicy(batSkill), new AiBowlingPolicy(0.5f),
                    new AiBattingPolicy(batSkill + 0.05f), new AiBowlingPolicy(0.5f),
                    new SeededRng(seed), seed);

                Assert.NotNull(sim.Result);
                Assert.AreEqual(sim.Result.Target, sim.Result.FirstInnings.Runs + 1);
                Assert.LessOrEqual(sim.FirstInningsDeliveries.Count, 20);
                Assert.LessOrEqual(sim.SecondInningsDeliveries.Count, 20);

                switch (sim.Result.Outcome)
                {
                    case MatchOutcome.FirstInningsWin: firstWins++; break;
                    case MatchOutcome.SecondInningsWin: secondWins++; break;
                    default: ties++; break;
                }
            }

            Assert.Greater(firstWins, 0);
            Assert.Greater(secondWins, 0);
        }
    }
}
