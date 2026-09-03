using System.Collections.Generic;
using NUnit.Framework;
using CricketGame.Core.AI;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.Core.Fielding;
using CricketGame.Core.Rules;
using CricketGame.Core.Simulation;
// IntentMix counts the Batting ShotIntent enum returned by the AI planner,
// not the Core.Simulation planning struct of the same name.
using ShotIntent = CricketGame.Core.Batting.ShotIntent;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Phase 3 tests: fielding simulation, AI batting and the full headless
    /// Super Over pipeline. Mirrors harness/test_matchflow.py (behavioural
    /// parity; RNG streams differ between C# and Python by design).
    /// </summary>
    [TestFixture]
    public class FieldingSimulatorTests
    {
        private static FieldingResult Shoot(float exitKph, float elevDeg, float angleDeg,
                                            long seed, float scale = 1f)
        {
            float e = elevDeg * 0.0174532924f;
            float a = angleDeg * 0.0174532924f;
            float v = exitKph / 3.6f;
            var vel = new Vec3(
                (float)System.Math.Sin(a) * (float)System.Math.Cos(e) * v,
                (float)System.Math.Sin(e) * v,
                (float)System.Math.Cos(a) * (float)System.Math.Cos(e) * v);
            return FieldingSimulator.Simulate(new Vec3(0.1f, 0.9f, 0.35f), vel,
                                              Fielder.DefaultField(scale),
                                              new SeededRng(seed));
        }

        [Test]
        public void PowerfulShotThroughGapIsBoundary()   // TEST 10
        {
            int fours = 0;
            for (int seed = 0; seed < 60; seed++)
            {
                var res = Shoot(104f, 7f, 30f, seed);
                if (res.Kind == FieldingKind.Four || res.Kind == FieldingKind.Six) fours++;
            }
            Assert.Greater(fours, 40);
        }

        [Test]
        public void PowerfulShotAtAFielderIsContained()
        {
            int stopped = 0;
            for (int seed = 0; seed < 60; seed++)
            {
                var res = Shoot(104f, 7f, 43f, seed);
                if (res.Kind == FieldingKind.Stopped) stopped++;
            }
            Assert.Greater(stopped, 30);
        }

        [Test]
        public void SoftShotIsInterceptedForFewRuns()    // TEST 9
        {
            int stopped = 0;
            for (int seed = 0; seed < 60; seed++)
            {
                var res = Shoot(62f, 8f, 29f, seed);
                Assert.IsTrue(res.Kind == FieldingKind.Stopped || res.Kind == FieldingKind.Four);
                if (res.Kind == FieldingKind.Stopped)
                {
                    Assert.LessOrEqual(res.Runs, 2);
                    stopped++;
                }
            }
            Assert.Greater(stopped, 30);
        }

        [Test]
        public void LoftedShotCanBeCaughtAndCanSurvive() // TEST 11
        {
            int catches = 0, escapes = 0;
            for (int seed = 0; seed < 200; seed++)
            {
                var res = Shoot(70f, 42f, -30f, seed);
                if (res.Kind == FieldingKind.Caught) catches++;
                else escapes++;
            }
            Assert.Greater(catches, 25);
            Assert.Greater(escapes, 50);
        }

        [Test]
        public void EdgeBehindSquareCanBeTaken()
        {
            int catches = 0;
            for (int seed = 0; seed < 150; seed++)
            {
                var res = Shoot(52f, 12f, 157f, seed);
                if (res.Kind == FieldingKind.Caught) catches++;
            }
            Assert.Greater(catches, 20);
        }

        [Test]
        public void WorseFieldingConcedesMore()
        {
            float weakAvg, goodAvg;
            int weakCatches, goodCatches;
            Profile(0.75f, out weakCatches, out weakAvg);
            Profile(1.20f, out goodCatches, out goodAvg);
            Assert.Greater(weakAvg, goodAvg);
            Assert.GreaterOrEqual(goodCatches, weakCatches);
        }

        private static void Profile(float scale, out int catches, out float avgRuns)
        {
            catches = 0;
            var runs = new List<int>();
            for (int seed = 0; seed < 250; seed++)
            {
                var res = Shoot(70f, 42f, -30f, seed, scale);
                if (res.Kind == FieldingKind.Caught) catches++;
                else if (res.Kind == FieldingKind.Stopped) runs.Add(res.Runs);
            }
            int sum = 0;
            foreach (int r in runs) sum += r;
            avgRuns = runs.Count > 0 ? sum / (float)runs.Count : 0f;
        }

        [Test]
        public void RunsAreBoundedAndDeterministic()
        {
            var a = Shoot(88f, 12f, 17f, 7);
            var b = Shoot(88f, 12f, 17f, 7);
            Assert.AreEqual(a.Kind, b.Kind);
            Assert.AreEqual(a.Runs, b.Runs);
            for (int seed = 0; seed < 100; seed++)
            {
                var res = Shoot(95f, 14f, 23f, seed);
                Assert.IsTrue(res.Runs >= 0 && res.Runs <= 6);
            }
        }
    }

    [TestFixture]
    public class AiBattingTests
    {
        [Test]
        public void AggressionStateMonotonicWithRequiredRate()  // TEST 12a
        {
            Assert.AreEqual(AiAggressionState.Safe, AiBattingPlanner.AggressionState(2, 5, 2));
            Assert.AreEqual(AiAggressionState.Balanced, AiBattingPlanner.AggressionState(8, 5, 2));
            Assert.AreEqual(AiAggressionState.Aggressive, AiBattingPlanner.AggressionState(16, 5, 2));
            Assert.AreEqual(AiAggressionState.Desperate, AiBattingPlanner.AggressionState(26, 4, 2));
            Assert.AreEqual(AiAggressionState.Desperate, AiBattingPlanner.AggressionState(6, 1, 2));
        }

        private static DeliveryData GoodBall()
        {
            return DeliveryFactory.Build(DeliveryType.GoodLength, new SeededRng(11), 0.8f);
        }

        private static Dictionary<ShotIntent, int> IntentMix(int target, int score,
                                                             int balls, int n = 600)
        {
            var counts = new Dictionary<ShotIntent, int>();
            var ctx = new AiChaseContext
            {
                Target = target, Score = score, BallsRemaining = balls, WicketsRemaining = 2,
            };
            var delivery = GoodBall();
            for (int i = 0; i < n; i++)
            {
                var plan = AiBattingPlanner.Plan(new SeededRng(i * 31 + 5), delivery, ctx,
                                                 AiDifficulty.Medium, null);
                if (plan.Swing)
                {
                    if (!counts.ContainsKey(plan.Intent)) counts[plan.Intent] = 0;
                    counts[plan.Intent]++;
                }
            }
            return counts;
        }

        [Test]
        public void AiGetsMoreAggressiveUnderPressure()         // TEST 12
        {
            var calm = IntentMix(10, 4, 5);
            var panic = IntentMix(40, 5, 2);
            int calmLoft = Get(calm, ShotIntent.Lofted) + Get(calm, ShotIntent.Aggressive);
            int panicLoft = Get(panic, ShotIntent.Lofted) + Get(panic, ShotIntent.Aggressive);
            Assert.Greater(panicLoft, calmLoft * 2);
        }

        private static int Get(Dictionary<ShotIntent, int> d, ShotIntent k)
        {
            return d.ContainsKey(k) ? d[k] : 0;
        }

        [Test]
        public void AiMakesMistakes()
        {
            int leaves = 0, badTiming = 0;
            var delivery = GoodBall();
            var ctx = new AiChaseContext
            {
                Target = 20, Score = 5, BallsRemaining = 4, WicketsRemaining = 2,
            };
            for (int i = 0; i < 500; i++)
            {
                var plan = AiBattingPlanner.Plan(new SeededRng(i * 13 + 3), delivery, ctx,
                                                 AiDifficulty.Medium, null);
                if (!plan.Swing) leaves++;
                else if (plan.Offset > 0.10f || plan.Offset < -0.10f) badTiming++;
            }
            Assert.Greater(leaves, 10);
            Assert.Greater(badTiming, 15);
        }

        [Test]
        public void DifficultyChangesSkill()
        {
            float easy = MeanAbsOffset(AiDifficulty.Easy);
            float hard = MeanAbsOffset(AiDifficulty.Hard);
            Assert.Greater(easy, hard * 1.3f);
        }

        private static float MeanAbsOffset(AiDifficulty diff, int n = 400)
        {
            var delivery = GoodBall();
            var ctx = new AiChaseContext
            {
                Target = 18, Score = 4, BallsRemaining = 4, WicketsRemaining = 2,
            };
            float total = 0f;
            int swings = 0;
            for (int i = 0; i < n; i++)
            {
                var plan = AiBattingPlanner.Plan(new SeededRng(i * 17 + 1), delivery, ctx, diff, null);
                if (plan.Swing)
                {
                    total += plan.Offset < 0 ? -plan.Offset : plan.Offset;
                    swings++;
                }
            }
            return swings > 0 ? total / swings : 0f;
        }

        [Test]
        public void AiDeterministicWithSameSeed()
        {
            var delivery = GoodBall();
            var ctx = new AiChaseContext
            {
                Target = 20, Score = 10, BallsRemaining = 4, WicketsRemaining = 2,
            };
            var rng1 = new SeededRng(42);
            var plan1 = AiBattingPlanner.Plan(rng1, delivery, ctx, AiDifficulty.Medium, true);
            var rng2 = new SeededRng(42);
            var plan2 = AiBattingPlanner.Plan(rng2, delivery, ctx, AiDifficulty.Medium, true);
            Assert.AreEqual(plan1.Swing, plan2.Swing);
            Assert.AreEqual(plan1.Intent, plan2.Intent);
            Assert.AreEqual(plan1.Angle, plan2.Angle, 1e-6f);
            Assert.AreEqual(plan1.Strength, plan2.Strength, 1e-6f);
            Assert.AreEqual(plan1.Offset, plan2.Offset, 1e-6f);
        }

        [Test]
        public void AiNeverProducesImpossibleActions()
        {
            var delivery = GoodBall();
            var ctx = new AiChaseContext
            {
                Target = 20, Score = 10, BallsRemaining = 4, WicketsRemaining = 2,
            };
            for (int i = 0; i < 1000; i++)
            {
                var plan = AiBattingPlanner.Plan(new SeededRng(i), delivery, ctx, AiDifficulty.Medium, null);
                if (plan.Swing)
                {
                    Assert.True(plan.Angle >= -1.35f && plan.Angle <= 1.35f,
                        "Shot angle must be within valid range");
                    Assert.True(plan.Strength >= 0.55f && plan.Strength <= 1.0f,
                        "Strength must be within valid range");
                    Assert.True(plan.FootTarget.X >= -1.15f && plan.FootTarget.X <= 1.15f,
                        "Foot target X must be within valid range");
                    Assert.True(plan.FootTarget.Y >= -0.55f && plan.FootTarget.Y <= 0.75f,
                        "Foot target Y must be within valid range");
                }
            }
        }

        [Test]
        public void AiMoreDefensiveWithFewWickets()
        {
            float DefensiveRate(int wickets)
            {
                var delivery = GoodBall();
                var ctx = new AiChaseContext
                {
                    Target = 15, Score = 10, BallsRemaining = 4, WicketsRemaining = wickets,
                };
                int defensive = 0, n = 800;
                for (int i = 0; i < n; i++)
                {
                    var plan = AiBattingPlanner.Plan(new SeededRng(i * 7 + 3), delivery, ctx,
                                                     AiDifficulty.Medium, null);
                    if (plan.Swing && plan.Intent == ShotIntent.Defensive) defensive++;
                }
                return defensive / (float)n;
            }
            float oneWicket = DefensiveRate(1);
            float twoWickets = DefensiveRate(2);
            Assert.Greater(twoWickets, oneWicket + 0.05f,
                "AI should be more defensive with only 1 wicket remaining");
        }
    }

    [TestFixture]
    public class MatchScriptTests
    {
        private static SuperOverMatch Script(DeliveryOutcome[] innings1,
                                             DeliveryOutcome[] innings2 = null)
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            foreach (var o in innings1) m.RecordDelivery(o);
            if (innings2 != null && innings2.Length > 0 && m.Phase == MatchPhase.InningsBreak)
            {
                m.StartSecondInnings();
                foreach (var o in innings2)
                {
                    m.RecordDelivery(o);
                    if (m.Phase == MatchPhase.Completed) break;
                }
            }
            return m;
        }

        private static DeliveryOutcome L(int runs) { return DeliveryOutcome.Legal(runs); }
        private static DeliveryOutcome W(DismissalKind k) { return DeliveryOutcome.Wicket(k); }

        [Test]
        public void SixDotsEndTheInnings()                     // TEST 1
        {
            var m = Script(new[] { L(0), L(0), L(0), L(0), L(0), L(0) });
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
            Assert.AreEqual(0, m.FirstInnings.Runs);
            Assert.AreEqual(6, m.FirstInnings.LegalBalls);
        }

        [Test]
        public void FourBoundariesEndTheChaseEarly()           // TEST 2
        {
            var m = Script(new[] { L(1), L(1), L(1), L(1), L(0), L(0) },
                           new[] { L(4), L(4) });
            Assert.AreEqual(MatchOutcome.SecondInningsWin, m.Result.Outcome);
            Assert.AreEqual(2, m.SecondInnings.LegalBalls);
        }

        [Test]
        public void TwoWicketsEndTheInnings()                  // TEST 3
        {
            var m = Script(new[] { W(DismissalKind.Bowled), W(DismissalKind.Caught) });
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
            Assert.AreEqual(2, m.FirstInnings.Wickets);
            Assert.AreEqual(2, m.FirstInnings.LegalBalls);
        }

        [Test]
        public void TargetReachedOnSixthBall()                 // TEST 4
        {
            var m = Script(new[] { L(2), L(2), L(0), L(0), L(0), L(0) },
                           new[] { L(1), L(1), L(1), L(1), L(0), L(1) });
            Assert.AreEqual(MatchOutcome.SecondInningsWin, m.Result.Outcome);
            Assert.AreEqual(6, m.SecondInnings.LegalBalls);
            Assert.AreEqual(5, m.SecondInnings.Runs);
            Assert.AreEqual(0, m.Result.MarginBalls);
        }

        [Test]
        public void TargetNotReachedAfterSix()                 // TEST 5
        {
            var m = Script(new[] { L(4), L(4), L(0), L(0), L(0), L(0) },
                           new[] { L(1), L(1), L(1), L(1), L(1), L(1) });
            Assert.AreEqual(MatchOutcome.FirstInningsWin, m.Result.Outcome);
            Assert.AreEqual(2, m.Result.MarginRuns);
        }

        [Test]
        public void ChaseEndsImmediately()                     // TEST 6
        {
            var m = Script(new[] { L(6), L(0), L(0), L(0), L(0), L(0) },
                           new[] { L(6), L(1) });
            Assert.AreEqual(MatchOutcome.SecondInningsWin, m.Result.Outcome);
            Assert.AreEqual(2, m.SecondInnings.LegalBalls);
            Assert.AreEqual(4, m.Result.MarginBalls);
        }

        [Test]
        public void CatchIsAWicket()                           // TEST 7
        {
            var m = Script(new[] { W(DismissalKind.Caught) });
            Assert.AreEqual(1, m.FirstInnings.Wickets);
        }

        [Test]
        public void BowledIsAWicket()                          // TEST 8
        {
            var m = Script(new[] { W(DismissalKind.Bowled) });
            Assert.AreEqual(1, m.FirstInnings.Wickets);
        }

        [Test]
        public void TieIsTieNotHighestScore()
        {
            var m = Script(new[] { L(4), L(0), L(0), L(0), L(0), L(0) },
                           new[] { L(4), L(0), L(0), L(0), L(0), L(0) });
            Assert.AreEqual(MatchOutcome.Tie, m.Result.Outcome);
        }

        [Test]
        public void StrikerSwapsOnOddRunsOnly()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            var inn = m.FirstInnings;
            Assert.AreEqual(0, inn.Striker);
            m.RecordDelivery(L(1));
            Assert.AreEqual(1, inn.Striker);
            m.RecordDelivery(L(2));
            Assert.AreEqual(1, inn.Striker);
            m.RecordDelivery(L(4));
            Assert.AreEqual(1, inn.Striker);
            m.RecordDelivery(L(3));
            Assert.AreEqual(0, inn.Striker);
            m.RecordDelivery(W(DismissalKind.Bowled));
            Assert.AreEqual(0, inn.Striker);   // replacement guards the same end
        }

        [Test]
        public void BoundariesDoNotRotateStrike()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            var inn = m.FirstInnings;
            Assert.AreEqual(0, inn.Striker);
            m.RecordDelivery(L(4));
            Assert.AreEqual(0, inn.Striker, "Four must not rotate strike");
            m.RecordDelivery(L(4));
            Assert.AreEqual(0, inn.Striker, "Another four must not rotate strike");
            m.RecordDelivery(L(6));
            Assert.AreEqual(0, inn.Striker, "Six must not rotate strike");
            m.RecordDelivery(L(1));
            Assert.AreEqual(1, inn.Striker, "Single rotates strike");
            m.RecordDelivery(L(4));
            Assert.AreEqual(1, inn.Striker, "Four after single must not rotate strike");
        }

        [Test]
        public void WidesDoNotConsumeLegalBalls()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            m.RecordDelivery(DeliveryOutcome.Wide());
            m.RecordDelivery(L(0));
            Assert.AreEqual(1, m.FirstInnings.LegalBalls);
            Assert.AreEqual(1, m.FirstInnings.Runs);
        }

        [Test]
        public void RunRateAndBowlerTracking()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            m.FirstInnings.BowlerLabel = "AI";
            Assert.AreEqual(0f, m.FirstInnings.CurrentRunRate);
            m.RecordDelivery(L(4));
            m.RecordDelivery(L(2));
            Assert.AreEqual(18f, m.FirstInnings.CurrentRunRate, 1e-4f); // 6 off 2
            Assert.AreEqual("AI", m.FirstInnings.BowlerLabel);
        }

        [Test]
        public void DebugOverrideAndReevaluateJumpToTheBreak()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            m.FirstInnings.DebugOverride(12, 0, 6);
            m.DebugReevaluateAfterOverride();
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
            Assert.AreEqual(13, m.Target);
        }

        [Test]
        public void DebugReevaluateCompletesAChase()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            foreach (var o in new[] { L(4), L(0), L(0), L(0), L(0), L(0) })
                m.RecordDelivery(o);
            m.StartSecondInnings();
            m.SecondInnings.DebugOverride(5, 0, 4);   // target 5 reached in 4 balls
            m.DebugReevaluateAfterOverride();
            Assert.AreEqual(MatchPhase.Completed, m.Phase);
            Assert.AreEqual(MatchOutcome.SecondInningsWin, m.Result.Outcome);
            Assert.AreEqual(2, m.Result.MarginBalls);
        }
    }

    [TestFixture]
    public class FullMatchSoakTests
    {
        [Test]
        public void HeadlessMatchesCompleteCorrectly()
        {
            int firstWins = 0, secondWins = 0;
            for (int seed = 0; seed < 40; seed++)
            {
                List<HeadlessBallLog> log;
                var m = Phase3MatchSimulator.PlayMatch(seed, AiDifficulty.Medium, out log);
                Assert.AreEqual(MatchPhase.Completed, m.Phase);

                if (m.Result.Outcome == MatchOutcome.SecondInningsWin)
                {
                    secondWins++;
                    Assert.GreaterOrEqual(m.SecondInnings.Runs, m.FirstInnings.Runs + 1);
                }
                else if (m.Result.Outcome == MatchOutcome.FirstInningsWin)
                {
                    firstWins++;
                    Assert.Less(m.SecondInnings.Runs, m.FirstInnings.Runs + 1);
                }

                Assert.LessOrEqual(m.FirstInnings.LegalBalls, 6);
                Assert.LessOrEqual(m.SecondInnings.LegalBalls, 6);
                Assert.LessOrEqual(m.FirstInnings.Wickets, 2);
                Assert.LessOrEqual(m.SecondInnings.Wickets, 2);

                // A chase that ends early must have reached the target.
                if (m.Result.Outcome == MatchOutcome.SecondInningsWin
                    && m.SecondInnings.LegalBalls < 6)
                    Assert.GreaterOrEqual(m.SecondInnings.Runs, m.FirstInnings.Runs + 1);
            }
            Assert.Greater(firstWins, 0);    // TEST 13: the chase can fail
            Assert.Greater(secondWins, 0);   // TEST 14: the chase can succeed
        }

        [Test]
        public void CatchesAndBoundariesOccurInFullMatches()
        {
            var kinds = new HashSet<string>();
            for (int seed = 0; seed < 60; seed++)
            {
                List<HeadlessBallLog> log;
                Phase3MatchSimulator.PlayMatch(seed, AiDifficulty.Medium, out log);
                foreach (var entry in log) kinds.Add(entry.Result.OutcomeKind);
            }
            Assert.IsTrue(kinds.Contains("caught"));
            Assert.IsTrue(kinds.Contains("four"));
            Assert.IsTrue(kinds.Contains("bowled") || kinds.Contains("lbw"));
            Assert.IsTrue(kinds.Contains("runs") || kinds.Contains("dot")
                          || kinds.Contains("beaten") || kinds.Contains("leave"));
        }

        [Test]
        public void MatchesCanBeReplayedEndToEnd()             // TEST 15
        {
            for (int i = 0; i < 8; i++)
            {
                List<HeadlessBallLog> log;
                var m = Phase3MatchSimulator.PlayMatch(1000 + i, AiDifficulty.Medium, out log);
                Assert.AreEqual(MatchPhase.Completed, m.Phase);
                Assert.IsNotNull(m.Result);
            }
        }

        [Test]
        public void ForcedDebugOutcomesFlowThroughTheMatch()
        {
            List<HeadlessBallLog> log;
            var m = Phase3MatchSimulator.PlayMatch(5, AiDifficulty.Medium, out log,
                                                   ForcedOutcome.Six);
            foreach (var entry in log)
                if (entry.InningsIndex == 0)
                    Assert.AreEqual(6, entry.Result.Runs);
            Assert.AreEqual(36, m.FirstInnings.Runs);
        }
    }
}
