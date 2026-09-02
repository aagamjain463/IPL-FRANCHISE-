using NUnit.Framework;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Phase 2 tests: delivery factory & plans, trajectory extensions
    /// (seam/bounce/pitch), yorker shot-selection rules, the shot outcome
    /// resolver (bowled / LBW / edges / runs) and end-to-end engine bounce
    /// events. Mirrored by harness/test_bowling.py.
    /// </summary>
    [TestFixture]
    public class BowlingSystemTests
    {
        private const float Dt = 1f / 240f;

        /// <summary>Runs the engine until the bat arrives `offset` after the ball.</summary>
        private static BattingEngine SwingAtOffset(DeliveryData d, float offset,
            ShotIntent intent, Vec2 dir, float strength, int seed = 11)
        {
            var engine = new BattingEngine(new SeededRng(seed));
            engine.BeginDelivery(d);
            float windup = TimingSystem.WindupTime(intent);
            float target = engine.ActiveDelivery.TimeToContact + offset - windup;
            bool fired = false;
            for (float t = 0f; t < 4f; t += Dt)
            {
                bool fire = !fired && t >= target;
                engine.Update(Dt, new BattingInputFrame
                {
                    Footwork = Vec2.Zero,
                    SwingTriggered = fire,
                    ShotDirection = dir,
                    SwipeStrength = strength,
                    Intent = intent
                });
                if (fire) fired = true;
                if (engine.ContactWillHappen) break;
            }
            return engine;
        }

        // ------------------------------------------------------------- factory

        [Test]
        public void Factory_AllTypes_ProduceValidTrajectories()
        {
            foreach (DeliveryType type in DeliveryFactory.AllTypes)
            {
                var rng = new SeededRng(42);
                DeliverySpec spec = DeliverySpec.For(type);
                for (int i = 0; i < 40; i++)
                {
                    DeliveryData d = DeliveryFactory.Build(type, rng, 0.75f);
                    Assert.AreEqual(type, d.Type);
                    Assert.LessOrEqual(d.SpeedKph, spec.SpeedMax + 6f);
                    Assert.GreaterOrEqual(d.SpeedKph, spec.SpeedMin - 6f);
                    Assert.IsTrue(d.Line >= -1.25f && d.Line <= 1.25f);
                    Assert.IsTrue(d.Length >= 0f && d.Length <= 1f);

                    var traj = new DeliveryTrajectory(d);
                    Assert.Greater(traj.HeightAtContact, 0f);
                    Assert.Less(traj.TimeToContact, 1.6f);
                    Assert.Greater(traj.TimeToContact, 0.3f);
                }
            }
        }

        [Test]
        public void Factory_IsDeterministic_PerSeed()
        {
            var a = DeliveryFactory.Build(DeliveryType.GoodLength, new SeededRng(7), 0.75f);
            var b = DeliveryFactory.Build(DeliveryType.GoodLength, new SeededRng(7), 0.75f);
            Assert.AreEqual(a.SpeedKph, b.SpeedKph);
            Assert.AreEqual(a.Line, b.Line);
            Assert.AreEqual(a.Length, b.Length);
            Assert.AreEqual(a.Seam, b.Seam);
        }

        [Test]
        public void Plan_TypeDistribution_FollowsWeights()
        {
            BowlerPlan plan = BowlerPlan.Default;
            var rng = new SeededRng(99);
            var counts = new int[DeliveryFactory.AllTypes.Length];
            const int n = 20000;
            for (int i = 0; i < n; i++)
            {
                DeliveryType t = DeliveryFactory.NextType(plan, rng);
                counts[System.Array.IndexOf(DeliveryFactory.AllTypes, t)]++;
            }
            float goodFrac = counts[System.Array.IndexOf(DeliveryFactory.AllTypes, DeliveryType.GoodLength)] / (float)n;
            Assert.AreEqual(plan.WGoodLength, goodFrac, 0.02f);
        }

        [Test]
        public void Yorker_IsVeryFullAndLow_BouncerRearsUp()
        {
            var rng = new SeededRng(3);
            for (int i = 0; i < 20; i++)
            {
                DeliveryData yorker = DeliveryFactory.Build(DeliveryType.Yorker, rng, 1f);
                var yTraj = new DeliveryTrajectory(yorker);
                Assert.Less(yorker.Length, 0.09f);
                Assert.Less(yTraj.HeightAtContact, 0.45f);

                DeliveryData bouncer = DeliveryFactory.Build(DeliveryType.Bouncer, rng, 1f);
                var bTraj = new DeliveryTrajectory(bouncer);
                Assert.Greater(bTraj.HeightAtContact, 1.05f);
            }
        }

        // ------------------------------------------------------------- trajectory extensions

        [Test]
        public void Phase1Parity_DefaultDeliveriesUnchanged()
        {
            // Values pinned by the Phase 1 mirror and the JS smoke test.
            var full = new DeliveryTrajectory(DeliveryData.Full());
            Assert.AreEqual(0.6535551952837141f, full.TimeToStumps, 1e-6f);
            Assert.AreEqual(0.6087873249815771f, full.TimeToContact, 1e-6f);
            Assert.IsTrue(full.HitsStumps());

            var good = new DeliveryTrajectory(DeliveryData.GoodLength());
            Assert.AreEqual(0.6212024844720497f, good.TimeToStumps, 1e-6f);
            Assert.IsFalse(good.HitsStumps());
        }

        [Test]
        public void Seam_DeflectsPostBounceLine()
        {
            var flat = new DeliveryTrajectory(new DeliveryData { SpeedKph = 126f, Length = 0.52f });
            var seamed = new DeliveryTrajectory(new DeliveryData { SpeedKph = 126f, Length = 0.52f, Seam = 0.6f });
            var seamedIn = new DeliveryTrajectory(new DeliveryData { SpeedKph = 126f, Length = 0.52f, Seam = -0.6f });

            Assert.AreEqual(0f, flat.XAtContact, 1e-5f);
            Assert.Greater(seamed.XAtContact - flat.XAtContact, 0.05f);
            Assert.Less(seamed.XAtContact - flat.XAtContact, 0.30f);
            Assert.Less(seamedIn.XAtContact, 0f);
        }

        [Test]
        public void BounceMultiplier_ChangesHeight_NotTiming()
        {
            var low = new DeliveryTrajectory(new DeliveryData { SpeedKph = 130f, Length = 0.8f, Bounce = 0.85f });
            var high = new DeliveryTrajectory(new DeliveryData { SpeedKph = 130f, Length = 0.8f, Bounce = 1.25f });
            Assert.Less(low.HeightAtContact, high.HeightAtContact);
            Assert.AreEqual(low.TimeToContact, high.TimeToContact, 1e-3f);
        }

        [Test]
        public void Pitch_SlowsAndLifts_WhenConfigured()
        {
            var normal = new DeliveryTrajectory(DeliveryData.GoodLength());
            var slow = new DeliveryTrajectory(DeliveryData.GoodLength(),
                new PitchProfile { BounceEnergy = 1f, PaceFactor = 0.88f, Name = "slow" });
            var batting = new DeliveryTrajectory(DeliveryData.GoodLength(),
                new PitchProfile { BounceEnergy = 1.15f, PaceFactor = 1f, Name = "batting" });

            Assert.Greater(slow.TimeToContact, normal.TimeToContact);
            Assert.Greater(batting.HeightAtContact, normal.HeightAtContact);
        }

        [Test]
        public void Engine_FiresBounce_Once()
        {
            var engine = new BattingEngine(new SeededRng(1));
            int bounces = 0;
            engine.BounceReached += () => bounces++;
            engine.BeginDelivery(DeliveryData.GoodLength());
            for (float t = 0f; t < 2f; t += Dt)
                engine.Update(Dt, BattingInputFrame.Idle);
            Assert.AreEqual(1, bounces);
        }

        // ------------------------------------------------------------- yorker selection

        [Test]
        public void Yorker_ShotSelection_IsAwkwardWithoutFrontFoot()
        {
            var yorker = new DeliveryData { SpeedKph = 140f, Line = 0.05f, Length = 0.03f, Type = DeliveryType.Yorker };
            var direction = new DirectionResolveResult
            {
                Direction = new Vec2(0f, 1f),
                AngleFromStraight = 0f,
                ReachQuality = 0.9f,
                HasDirection = true
            };

            var flatFoot = ShotSelector.Select(ShotIntent.Normal, FootPose.Neutral, yorker, direction);
            Assert.IsTrue(flatFoot.Awkward);

            var striding = ShotSelector.Select(ShotIntent.Normal, FootPose.FrontFoot, yorker, direction);
            Assert.IsFalse(striding.Awkward);

            var heave = ShotSelector.Select(ShotIntent.Lofted, FootPose.FrontFoot, yorker, direction);
            Assert.IsTrue(heave.Awkward); // lofting a yorker is always a heave
        }

        // ------------------------------------------------------------- outcome resolver

        [Test]
        public void UnstruckBall_AtStumps_WithBodyOnLine_IsLbw()
        {
            var traj = new DeliveryTrajectory(new DeliveryData { SpeedKph = 120f, Line = 0f, Length = 0.10f });
            Assert.IsTrue(traj.HitsStumps());
            var outcome = ShotOutcomeResolver.Resolve(new SeededRng(1), traj, null, 0f, 0f, true, ForcedOutcome.None);
            Assert.AreEqual(ShotOutcomeKind.Lbw, outcome.Kind);
            Assert.IsTrue(outcome.IsWicket);
        }

        [Test]
        public void UnstruckBall_AtStumps_OffLine_IsBowled()
        {
            var traj = new DeliveryTrajectory(new DeliveryData { SpeedKph = 120f, Line = 0f, Length = 0.10f });
            var outcome = ShotOutcomeResolver.Resolve(new SeededRng(1), traj, null, 0.8f, 0f, true, ForcedOutcome.None);
            Assert.AreEqual(ShotOutcomeKind.Bowled, outcome.Kind);

            var noLbw = ShotOutcomeResolver.Resolve(new SeededRng(1), traj, null, 0f, 0f, false, ForcedOutcome.None);
            Assert.AreEqual(ShotOutcomeKind.Bowled, noLbw.Kind);
        }

        [Test]
        public void LeaveAndBeaten_AreDots()
        {
            var wide = new DeliveryTrajectory(new DeliveryData { SpeedKph = 126f, Line = 0.9f, Length = 0.52f });
            var leave = ShotOutcomeResolver.Resolve(new SeededRng(1), wide, null, 0f, 0f, true, ForcedOutcome.None);
            Assert.AreEqual(ShotOutcomeKind.Leave, leave.Kind);

            var whiff = new SwingReport { WillContact = false };
            var beaten = ShotOutcomeResolver.Resolve(new SeededRng(1), wide, whiff, 0f, 0f, true, ForcedOutcome.None);
            Assert.AreEqual(ShotOutcomeKind.Beaten, beaten.Kind);
        }

        [Test]
        public void PerfectNormalDrive_Scores_ButNotAlwaysBoundary()
        {
            var d = new DeliveryData { SpeedKph = 124f, Line = 0.05f, Length = 0.30f };
            int boundaries = 0, runs = 0, contacts = 0;
            const int n = 120;
            for (int seed = 0; seed < n; seed++)
            {
                var engine = SwingAtOffset(d, 0f, ShotIntent.Normal, new Vec2(0f, 1f), 1f, seed);
                if (!engine.ContactWillHappen || engine.LastSwing == null) continue;
                contacts++;
                var outcome = ShotOutcomeResolver.Resolve(new SeededRng(seed), engine.ActiveDelivery,
                    engine.LastSwing, engine.Foot.X, engine.Foot.Z, true, ForcedOutcome.None);
                runs += outcome.Runs;
                if (outcome.Kind == ShotOutcomeKind.Four || outcome.Kind == ShotOutcomeKind.Six) boundaries++;
            }
            Assert.Greater(contacts, n / 2);
            Assert.Greater(runs, contacts);              // every perfect drive scores
            Assert.Less(boundaries, contacts);           // never guaranteed
        }

        [Test]
        public void PerfectLoftedShot_ClearsTheRope_Sometimes()
        {
            var d = new DeliveryData { SpeedKph = 124f, Line = 0.05f, Length = 0.30f };
            int sixes = 0;
            for (int seed = 0; seed < 60; seed++)
            {
                var engine = SwingAtOffset(d, 0f, ShotIntent.Lofted, new Vec2(0f, 1f), 1f, seed);
                if (!engine.ContactWillHappen || engine.LastSwing == null) continue;
                var outcome = ShotOutcomeResolver.Resolve(new SeededRng(seed), engine.ActiveDelivery,
                    engine.LastSwing, engine.Foot.X, engine.Foot.Z, true, ForcedOutcome.None);
                if (outcome.Kind == ShotOutcomeKind.Six) sixes++;
            }
            Assert.Greater(sixes, 10);
        }

        [Test]
        public void EdgeKinds_ClassifyByElevationAndSide()
        {
            var traj = new DeliveryTrajectory(DeliveryData.GoodLength());
            var top = ContactEdge(34f, 0.9f);
            var inside = ContactEdge(10f, -0.9f);
            var outside = ContactEdge(10f, 0.9f);

            Assert.AreEqual(ShotOutcomeKind.TopEdge, ResolveEdge(traj, top));
            Assert.AreEqual(ShotOutcomeKind.InsideEdge, ResolveEdge(traj, inside));
            Assert.AreEqual(ShotOutcomeKind.OutsideEdge, ResolveEdge(traj, outside));
        }

        private static ShotOutcomeKind ResolveEdge(DeliveryTrajectory traj, ContactResult contact)
        {
            var swing = new SwingReport { WillContact = true, Contact = contact };
            return ShotOutcomeResolver.Resolve(new SeededRng(1), traj, swing, 0f, 0f, true, ForcedOutcome.None).Kind;
        }

        private static ContactResult ContactEdge(float elevation, float dirX)
        {
            float norm = 1f / (float)System.Math.Sqrt(dirX * dirX + 0.3f * 0.3f + 0.2f);
            return new ContactResult
            {
                Outcome = ContactOutcome.Edge,
                ExitSpeedKph = 55f,
                ElevationDeg = elevation,
                Quality = 0.2f,
                Direction = new Vec3(dirX * norm, 0.3f * norm, 0.2f * norm)
            };
        }

        [Test]
        public void ForcedOutcome_Wins()
        {
            var traj = new DeliveryTrajectory(DeliveryData.GoodLength());
            var six = ShotOutcomeResolver.Resolve(new SeededRng(1), traj, null, 0f, 0f, true, ForcedOutcome.Six);
            Assert.AreEqual(ShotOutcomeKind.Six, six.Kind);
            Assert.AreEqual(6, six.Runs);
            Assert.IsTrue(six.Forced);

            var bowled = ShotOutcomeResolver.Resolve(new SeededRng(1), traj, null, 0f, 0f, true, ForcedOutcome.Bowled);
            Assert.IsTrue(bowled.IsWicket);
        }

        [Test]
        public void CarryPhysics_Sanity()
        {
            Assert.Greater(ShotOutcomeResolver.PredictCarry(100f, 38f, 0.9f), 60f);
            Assert.Less(ShotOutcomeResolver.PredictCarry(40f, 8f, 0.9f), 13f);
        }
    }
}
