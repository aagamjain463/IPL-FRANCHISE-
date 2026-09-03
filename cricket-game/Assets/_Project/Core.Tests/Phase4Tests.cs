using NUnit.Framework;
using CricketGame.Core.AI;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.Core.Fielding;
using CricketGame.Core.Rules;
using CricketGame.Core.Simulation;
// AI plans and batter-history entries carry the Batting ShotIntent enum, not
// the Core.Simulation planning struct of the same name.
using ShotIntent = CricketGame.Core.Batting.ShotIntent;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Phase 4 tests: advanced bowling, release control, wides, batter
    /// archetypes, AI bowling strategy, shot context and fielding polish.
    /// Mirrors harness/test_phase4.py (behavioural parity; RNG streams differ
    /// between C# and Python by design).
    /// </summary>
    [TestFixture]
    public class AdvancedBowlingTests
    {
        [Test]
        public void ElevenDeliveryTypesExist()
        {
            Assert.AreEqual(11, DeliveryFactory.AllTypes.Length);
            foreach (var t in DeliveryFactory.AllTypes)
            {
                var spec = DeliverySpec.For(t);
                Assert.Greater(spec.SpeedMax, spec.SpeedMin, t.ToString());
            }
        }

        [Test]
        public void CuttersGripThePitch()
        {
            var rng = new SeededRng(11);
            for (int i = 0; i < 40; i++)
            {
                var oc = DeliveryFactory.Build(DeliveryType.OffCutter, rng, 1f);
                Assert.Greater(oc.Seam, 0.25f, "off-cutter moves away");
                Assert.Less(oc.SpeedKph, 128f);
            }
            rng = new SeededRng(12);
            for (int i = 0; i < 40; i++)
            {
                var lc = DeliveryFactory.Build(DeliveryType.LegCutter, rng, 1f);
                Assert.Less(lc.Seam, -0.25f, "leg-cutter moves in");
            }
        }

        [Test]
        public void SlowerBallIsPaceOff()
        {
            var rng = new SeededRng(13);
            float slowSum = 0f, fastSum = 0f;
            for (int i = 0; i < 30; i++)
                slowSum += DeliveryFactory.Build(DeliveryType.SlowerBall, rng, 1f).SpeedKph;
            for (int i = 0; i < 30; i++)
                fastSum += DeliveryFactory.Build(DeliveryType.FastStraight, rng, 1f).SpeedKph;
            Assert.Less(slowSum / 30f, fastSum / 30f - 12f);
        }

        [Test]
        public void ProfilesChangeCharacter()
        {
            var rng = new SeededRng(21);
            var fast = BowlingPipeline.ApplyProfile(
                DeliveryFactory.Build(DeliveryType.FastStraight, rng, 1f),
                BowlerProfile.For(BowlerProfileKind.Fast));
            rng = new SeededRng(21);
            var slow = BowlingPipeline.ApplyProfile(
                DeliveryFactory.Build(DeliveryType.FastStraight, rng, 1f),
                BowlerProfile.For(BowlerProfileKind.Variation));
            Assert.Greater(fast.SpeedKph, slow.SpeedKph);

            var swingProf = BowlerProfile.For(BowlerProfileKind.Swing);
            Assert.Greater(swingProf.SwingMult, 1.2f);
        }

        [Test]
        public void ReleasePerfectIsExact()
        {
            var rng = new SeededRng(31);
            var d = DeliveryFactory.Build(DeliveryType.GoodLength, rng, 1f);
            var o = ReleaseControl.Apply(d, 0.01f, 0.75f);
            Assert.AreEqual(d.Line, o.Line);
            Assert.AreEqual(d.Length, o.Length);
            Assert.AreEqual(ReleaseQuality.Perfect, ReleaseControl.Classify(0.01f));
        }

        [Test]
        public void ReleaseEarlyGoesFuller()
        {
            var rng = new SeededRng(32);
            var d = DeliveryFactory.Build(DeliveryType.GoodLength, rng, 1f);
            var o = ReleaseControl.Apply(d, -0.12f, 0.7f);
            Assert.Less(o.Length, d.Length, "early release over-pitches");
            Assert.AreEqual(ReleaseQuality.Early, ReleaseControl.Classify(-0.12f));
        }

        [Test]
        public void ReleaseLateGoesShorter()
        {
            var rng = new SeededRng(33);
            var d = DeliveryFactory.Build(DeliveryType.GoodLength, rng, 1f);
            var o = ReleaseControl.Apply(d, 0.12f, 0.7f);
            Assert.Greater(o.Length, d.Length, "late release drags short");
        }

        [Test]
        public void WideLegalityThresholds()
        {
            Assert.False(DeliveryLegality.IsWide(0.4f));
            Assert.False(DeliveryLegality.IsWide(-0.9f));
            Assert.True(DeliveryLegality.IsWide(1.05f));
            Assert.True(DeliveryLegality.IsWide(-1.1f));
        }

        [Test]
        public void WideNeverConsumesALegalBall()
        {
            var m = new SuperOverMatch(SuperOverConfig.Standard);
            m.Start();
            for (int i = 0; i < 8; i++) m.RecordDelivery(DeliveryOutcome.Wide());
            Assert.AreEqual(0, m.FirstInnings.LegalBalls);
            Assert.AreEqual(8, m.FirstInnings.Runs);
            Assert.False(m.FirstInnings.IsComplete, "wides alone cannot end an innings");
        }

        [Test]
        public void PoorBowlingPipelineCanGoWide()
        {
            var rng = new SeededRng(77);
            int wided = 0;
            for (int i = 0; i < 400; i++)
            {
                var d = DeliveryFactory.Build(DeliveryType.FastInswinger, rng, 0.55f);
                var res = BowlingPipeline.Bowl(rng, d, -0.16f, 0.55f, AiDifficulty.Easy);
                if (res.Wide)
                {
                    wided++;
                    Assert.True(DeliveryLegality.IsWide(res.Delivery.Line));
                }
            }
            Assert.Greater(wided, 0, "loss of control must be able to go wide");
        }

        [Test]
        public void HardBowlersSprayLessThanEasy()
        {
            int Sprays(AiDifficulty diff)
            {
                var rng = new SeededRng(5);
                int n = 0;
                for (int i = 0; i < 2000; i++)
                {
                    var d = DeliveryFactory.Build(DeliveryType.GoodLength, rng, 0.55f);
                    if (BowlingPipeline.Bowl(rng, d, 0f, 0.55f, diff).Wide) n++;
                }
                return n;
            }
            Assert.Less(Sprays(AiDifficulty.Hard), Sprays(AiDifficulty.Easy));
            Assert.Greater(Sprays(AiDifficulty.Easy), 0);
        }
    }

    [TestFixture]
    public class BatterArchetypeTests
    {
        [Test]
        public void ArchetypesAttackDifferently()
        {
            float AttackRate(AiBatterArchetype arch)
            {
                var rng = new SeededRng(7);
                int aggressive = 0, n = 1200;
                for (int i = 0; i < n; i++)
                {
                    var d = DeliveryFactory.Build(DeliveryType.GoodLength, rng, 1f);
                    var ctx = new AiChaseContext
                    {
                        Target = null, Score = 5, BallsRemaining = 5, WicketsRemaining = 2
                    };
                    var plan = AiBattingPlanner.Plan(rng, d, ctx, AiDifficulty.Medium, true, arch);
                    if (plan.Intent == ShotIntent.Aggressive || plan.Intent == ShotIntent.Lofted)
                        aggressive++;
                }
                return aggressive / (float)n;
            }
            float agg = AttackRate(AiBatterArchetype.Aggressive);
            float bal = AttackRate(AiBatterArchetype.Balanced);
            float def = AttackRate(AiBatterArchetype.Defensive);
            Assert.Greater(agg, bal + 0.05f);
            Assert.Greater(bal, def + 0.05f);
        }

        [Test]
        public void BalancedArchetypeMatchesDefault()
        {
            // Default (no archetype) and explicit Balanced must agree.
            var rngA = new SeededRng(123);
            var rngB = new SeededRng(123);
            for (int i = 0; i < 60; i++)
            {
                var d1 = DeliveryFactory.Build(DeliveryType.GoodLength, rngA, 1f);
                var d2 = DeliveryFactory.Build(DeliveryType.GoodLength, rngB, 1f);
                var ctx = new AiChaseContext
                {
                    Target = 18, Score = 9, BallsRemaining = 4, WicketsRemaining = 2
                };
                var pDefault = AiBattingPlanner.Plan(rngA, d1, ctx, AiDifficulty.Medium, true);
                var pBalanced = AiBattingPlanner.Plan(rngB, d2, ctx, AiDifficulty.Medium, true,
                                                      AiBatterArchetype.Balanced);
                Assert.AreEqual(pDefault.Intent, pBalanced.Intent);
                Assert.AreEqual(pDefault.Swing, pBalanced.Swing);
                Assert.AreEqual(pDefault.Angle, pBalanced.Angle);
            }
        }
    }

    [TestFixture]
    public class AiBowlingStrategyTests
    {
        [Test]
        public void RepeatedCoverScoringIsAttacked()
        {
            var rng = new SeededRng(1);
            var history = new[]
            {
                new BatterHistoryEntry { HasSector = true, Sector = DirectionSector.Cover, Runs = 4, Intent = ShotIntent.Aggressive },
                new BatterHistoryEntry { HasSector = true, Sector = DirectionSector.Cover, Runs = 4, Intent = ShotIntent.Aggressive },
                new BatterHistoryEntry { HasSector = true, Sector = DirectionSector.Cover, Runs = 1, Intent = ShotIntent.Normal },
            };
            var ctx = new AiBowlingContext { Score = 12, WicketsRemaining = 2, BallsRemaining = 3 };
            var plan = AiBowlingPlanner.Plan(rng, history, ctx, AiDifficulty.Medium);
            Assert.AreEqual(DeliveryType.LegCutter, plan.Type);
            Assert.Less(plan.LineHint, 0f, "moves away from the cover zone");
        }

        [Test]
        public void AggressiveBatterGetsPaceOffOrYorker()
        {
            var rng = new SeededRng(3);
            var history = new[]
            {
                new BatterHistoryEntry { HasSector = true, Sector = DirectionSector.Straight, Runs = 6, Intent = ShotIntent.Lofted },
                new BatterHistoryEntry { HasSector = true, Sector = DirectionSector.Cover, Runs = 4, Intent = ShotIntent.Aggressive },
            };
            var ctx = new AiBowlingContext { Score = 14, WicketsRemaining = 2, BallsRemaining = 4 };
            var plan = AiBowlingPlanner.Plan(rng, history, ctx, AiDifficulty.Medium);
            Assert.True(plan.Type == DeliveryType.SlowerBall || plan.Type == DeliveryType.Yorker);
        }

        [Test]
        public void DeathOversAttackTheBase()
        {
            var rng = new SeededRng(4);
            var ctx = new AiBowlingContext { Score = 6, WicketsRemaining = 2, BallsRemaining = 2 };
            var plan = AiBowlingPlanner.Plan(rng, new BatterHistoryEntry[0], ctx, AiDifficulty.Medium);
            Assert.AreEqual(DeliveryType.Yorker, plan.Type);
            Assert.AreEqual("yorker_at_the_death", plan.Reason);
        }

        [Test]
        public void AiBowlingVarietyAvoidsExcessiveRepetition()
        {
            var rng = new SeededRng(99);
            var ctx = new AiBowlingContext { Score = 10, WicketsRemaining = 2, BallsRemaining = 6 };
            var types = new System.Collections.Generic.List<DeliveryType>();
            for (int i = 0; i < 30; i++)
            {
                var history = new BatterHistoryEntry[0];
                var plan = AiBowlingPlanner.Plan(rng, history, ctx, AiDifficulty.Medium);
                types.Add(plan.Type);
            }
            int goodLength = 0;
            foreach (var t in types) if (t == DeliveryType.GoodLength) goodLength++;
            Assert.Less(goodLength, 25, "Good length should not dominate more than 80% of deliveries");
            var uniqueTypes = new System.Collections.Generic.HashSet<DeliveryType>(types);
            Assert.Greater(uniqueTypes.Count, 2, "AI should use at least 3 different delivery types");
        }
    }

    [TestFixture]
    public class ShotContextTests
    {
        private const float Deg = 0.0174532924f;

        [Test]
        public void YorkerBlocksSquareShots()
        {
            Assert.False(ShotContext.IsAllowed(LengthBucket.Yorker, DirectionSector.Point));
            Assert.False(ShotContext.IsAllowed(LengthBucket.Yorker, DirectionSector.SquareLeg));
            Assert.True(ShotContext.IsAllowed(LengthBucket.Yorker, DirectionSector.Straight));
        }

        [Test]
        public void YorkerPullRequestSnapsToNearestValid()
        {
            var res = ShotContext.Validate(-80f * Deg, 0.05f);
            Assert.True(res.Snapped);
            Assert.AreEqual(DirectionSector.MidWicket, res.Sector);
            Assert.AreEqual(ShotFamily.Flick, res.Family);
        }

        [Test]
        public void ShortBallAllowsCut()
        {
            var res = ShotContext.Validate(80f * Deg, 0.85f);
            Assert.False(res.Snapped);
            Assert.AreEqual(DirectionSector.Point, res.Sector);
            Assert.AreEqual(ShotFamily.Cut, res.Family);
        }

        [Test]
        public void LegSideFlickAllowedWhenFull()
        {
            var res = ShotContext.Validate(-40f * Deg, 0.20f);
            Assert.False(res.Snapped);
            Assert.AreEqual(ShotFamily.Flick, res.Family);
        }
    }

    [TestFixture]
    public class FieldingPolishTests
    {
        [Test]
        public void CatchGradesByDifficulty()
        {
            Assert.AreEqual(CatchGrade.Easy, CatchGrader.Grade(60f, 1.2f, 6f, false));
            Assert.AreEqual(CatchGrade.Medium, CatchGrader.Grade(105f, 2f, 8f, false));
            Assert.AreEqual(CatchGrade.Difficult, CatchGrader.Grade(112f, 0.8f, 2f, false));
            Assert.AreEqual(CatchGrade.Edge, CatchGrader.Grade(95f, 1f, 1.5f, true));
            Assert.Less(CatchGrader.BiasFor(CatchGrade.Difficult),
                        CatchGrader.BiasFor(CatchGrade.Easy));
        }

        [Test]
        public void DiveOnlyWhenBallEscapes()
        {
            var fielders = Fielder.DefaultField(1f);
            var cover = fielders[2];
            Assert.AreEqual(DiveKind.None, DiveDecider.Decide(cover, 0.8f, 18f, true, false));
            Assert.AreEqual(DiveKind.None, DiveDecider.Decide(cover, 6f, 18f, true, false));
            Assert.AreEqual(DiveKind.BoundarySave, DiveDecider.Decide(cover, 2.2f, 22f, true, false));
            Assert.AreEqual(DiveKind.Catch, DiveDecider.Decide(cover, 2f, 12f, false, true));
            Assert.AreEqual(DiveKind.Ground, DiveDecider.Decide(cover, 1.8f, 12f, false, false));
        }

        [Test]
        public void StrongArmReturnsFaster()
        {
            var cannon = new Fielder(new FielderSpec
            {
                Name = "a", Speed = 6.5f, Reaction = 0.2f, Catching = 0.7f,
                Ground = 0.8f, ThrowSpeed = 26f, ThrowAcc = 0.85f
            }, 1f);
            var noodle = new Fielder(new FielderSpec
            {
                Name = "b", Speed = 6.5f, Reaction = 0.2f, Catching = 0.7f,
                Ground = 0.8f, ThrowSpeed = 16f, ThrowAcc = 0.85f
            }, 1f);
            float tCannon = ThrowSystem.Return(cannon, 45f).TravelTime;
            float tNoodle = ThrowSystem.Return(noodle, 45f).TravelTime;
            Assert.Less(tCannon, tNoodle);
            Assert.Less(tCannon, 2.6f);
        }
    }

    [TestFixture]
    public class TimingFeedbackTests
    {
        [Test]
        public void FeedbackPowerLadder()
        {
            float perfect = TimingFeedback.Resolve(TimingWindow.Perfect, ShotIntent.Aggressive).PowerMult;
            float good = TimingFeedback.Resolve(TimingWindow.Good, ShotIntent.Aggressive).PowerMult;
            float early = TimingFeedback.Resolve(TimingWindow.Early, ShotIntent.Aggressive).PowerMult;
            float veryEarly = TimingFeedback.Resolve(TimingWindow.VeryEarly, ShotIntent.Aggressive).PowerMult;
            Assert.Greater(perfect, good);
            Assert.Greater(good, early);
            Assert.Greater(early, veryEarly);
        }

        [Test]
        public void PerfectAggressionOutattacksGood()
        {
            var fbP = TimingFeedback.Resolve(TimingWindow.Perfect, ShotIntent.Aggressive);
            var fbG = TimingFeedback.Resolve(TimingWindow.Good, ShotIntent.Aggressive);
            Assert.Greater(fbP.AttackBoost, fbG.AttackBoost);
            Assert.Greater(fbP.AttackBoost, 1f);
        }

        [Test]
        public void PerfectDefenseIsCapped()
        {
            var fb = TimingFeedback.Resolve(TimingWindow.Perfect, ShotIntent.Defensive);
            Assert.LessOrEqual(fb.AttackBoost, 1f, "a perfect block is still a block");
        }
    }

    [TestFixture]
    public class Phase4HeadlessTests
    {
        [Test]
        public void FullMatchWithWidesAndStrategyCompletes()
        {
            int widesSeen = 0;
            for (long seed = 1; seed <= 40; seed++)
            {
                var match = Phase3MatchSimulator.PlayMatch(seed, AiDifficulty.Medium, out var log);
                Assert.AreEqual(MatchPhase.Completed, match.Phase, seed.ToString());
                Assert.LessOrEqual(match.FirstInnings.LegalBalls, 6, seed.ToString());
                Assert.LessOrEqual(match.SecondInnings.LegalBalls, 6, seed.ToString());
                foreach (var e in log) if (e.Wide) widesSeen++;
            }
            Assert.Greater(widesSeen, 0, "release drift should produce wides");
        }

        [Test]
        public void HardBowlingProducesFewerWides()
        {
            int WideRate(AiDifficulty diff)
            {
                int n = 0;
                for (long seed = 1; seed <= 30; seed++)
                {
                    Phase3MatchSimulator.PlayMatch(seed, diff, out var log);
                    foreach (var e in log) if (e.Wide) n++;
                }
                return n;
            }
            Assert.LessOrEqual(WideRate(AiDifficulty.Hard), WideRate(AiDifficulty.Easy));
        }

        [Test]
        public void LegacyNoStrategyModeStillCompletes()
        {
            var match = Phase3MatchSimulator.PlayMatch(42, AiDifficulty.Medium, out var log,
                                                       bowlingStrategy: false, wides: false);
            Assert.AreEqual(MatchPhase.Completed, match.Phase);
        }
    }
}
