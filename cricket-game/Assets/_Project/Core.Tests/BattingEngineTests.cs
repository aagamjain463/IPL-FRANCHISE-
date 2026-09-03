using NUnit.Framework;
using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;
// These tests exercise the batting engine's ShotIntent enum (the
// Core.Simulation namespace also declares an unrelated ShotIntent struct).
using ShotIntent = CricketGame.Core.Batting.ShotIntent;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Tests for the Phase 1 batting engine: trajectory, footwork, timing,
    /// direction resolution, contextual shot selection, contact and the
    /// end-to-end engine flow. Mirrored by harness/test_batting.py.
    /// </summary>
    [TestFixture]
    public class BattingEngineTests
    {
        // ------------------------------------------------------------------ trajectory

        [Test]
        public void Trajectory_ContactHeight_FollowsLength()
        {
            var full = new DeliveryTrajectory(DeliveryData.Full());
            var good = new DeliveryTrajectory(DeliveryData.GoodLength());
            var shortBall = new DeliveryTrajectory(DeliveryData.Short());

            Assert.Greater(good.HeightAtContact, full.HeightAtContact);
            Assert.Greater(shortBall.HeightAtContact, good.HeightAtContact);
            Assert.Greater(shortBall.BouncePoint.Z, good.BouncePoint.Z);
            Assert.Greater(good.BouncePoint.Z, full.BouncePoint.Z);
        }

        [Test]
        public void Trajectory_PositionAtContact_IsOnContactPlane()
        {
            var traj = new DeliveryTrajectory(DeliveryData.GoodLength());
            Vec3 p = traj.Position(traj.TimeToContact);
            Assert.AreEqual(DeliveryTrajectory.ContactZ, p.Z, 0.01f);
            Assert.AreEqual(traj.HeightAtContact, p.Y, 0.02f);
            Assert.Greater(traj.TimeToContact, 0.2f);
            Assert.Less(traj.TimeToContact, 1.4f);
        }

        [Test]
        public void Trajectory_MiddleStumpDelivery_HitsStumps_WideDoesNot()
        {
            var straight = new DeliveryTrajectory(
                new DeliveryData { SpeedKph = 125f, Line = 0f, Length = 0.15f, Swing = 0f });
            Assert.True(straight.HitsStumps());

            var wide = new DeliveryTrajectory(
                new DeliveryData { SpeedKph = 125f, Line = 0.9f, Length = 0.15f, Swing = 0f });
            Assert.False(wide.HitsStumps());
        }

        [Test]
        public void Trajectory_GoodLengthBall_SkidsOverStumps_IfLeftAlone()
        {
            // True to life: a genuine good-length ball rises past the stumps;
            // only the fuller deliveries bowl an unguarded batter.
            var good = new DeliveryTrajectory(
                new DeliveryData { SpeedKph = 126f, Line = 0f, Length = 0.52f, Swing = 0f });
            Assert.False(good.HitsStumps());
        }

        [Test]
        public void Trajectory_IsDeterministic()
        {
            var d = DeliveryData.GoodLength(131f, -0.3f, 0.4f);
            var a = new DeliveryTrajectory(d);
            var b = new DeliveryTrajectory(d);
            Assert.AreEqual(a.TimeToContact, b.TimeToContact);
            Assert.AreEqual(a.Position(0.3f).X, b.Position(0.3f).X);
        }

        // ------------------------------------------------------------------ footwork

        [Test]
        public void Footwork_MovesSmoothly_AndClampsToBounds()
        {
            var state = new FootworkState();
            var input = new Vec2(1f, 1f); // full off-side + forward

            float lastX = state.X;
            for (int i = 0; i < 300; i++)
            {
                FootworkController.Advance(ref state, input, 1f / 60f);
                Assert.GreaterOrEqual(state.X, lastX - 1e-4f, "movement must be smooth, never teleport");
                lastX = state.X;
            }
            Assert.AreEqual(FootworkController.XMax, state.X, 0.001f);
            Assert.AreEqual(FootworkController.ZMax, state.Z, 0.001f);
            Assert.AreEqual(FootPose.FrontFoot, FootworkController.Pose(state));
        }

        [Test]
        public void Footwork_PoseClassification()
        {
            var back = new FootworkState { Z = -0.5f };
            var front = new FootworkState { Z = 0.6f };
            var neutral = new FootworkState();
            Assert.AreEqual(FootPose.BackFoot, FootworkController.Pose(back));
            Assert.AreEqual(FootPose.FrontFoot, FootworkController.Pose(front));
            Assert.AreEqual(FootPose.Neutral, FootworkController.Pose(neutral));
        }

        // ------------------------------------------------------------------ timing

        [TestCase(0.00f, ExpectedResult = TimingWindow.Perfect)]
        [TestCase(0.03f, ExpectedResult = TimingWindow.Perfect)]
        [TestCase(-0.05f, ExpectedResult = TimingWindow.Good)]
        [TestCase(0.12f, ExpectedResult = TimingWindow.Late)]
        [TestCase(-0.12f, ExpectedResult = TimingWindow.Early)]
        [TestCase(0.20f, ExpectedResult = TimingWindow.VeryLate)]
        [TestCase(-0.22f, ExpectedResult = TimingWindow.VeryEarly)]
        [TestCase(0.30f, ExpectedResult = TimingWindow.Missed)]
        [TestCase(-0.30f, ExpectedResult = TimingWindow.Missed)]
        public TimingWindow Timing_Classification(float offset)
        {
            return TimingSystem.Classify(offset);
        }

        [Test]
        public void Timing_PowerAndControl_PeakAtZero_AreSymmetric()
        {
            Assert.AreEqual(1f, TimingSystem.PowerCurve(0f), 0.001f);
            Assert.AreEqual(1f, TimingSystem.ControlCurve(0f), 0.001f);
            Assert.AreEqual(TimingSystem.PowerCurve(0.1f), TimingSystem.PowerCurve(-0.1f), 0.001f);
            Assert.Greater(TimingSystem.PowerCurve(0f), TimingSystem.PowerCurve(0.12f));
            Assert.Greater(TimingSystem.PowerCurve(0.12f), TimingSystem.PowerCurve(0.24f));
            Assert.Greater(TimingSystem.ControlCurve(0f), TimingSystem.ControlCurve(0.15f));
        }

        [Test]
        public void Timing_Windup_LongerForBiggerSwings()
        {
            Assert.Less(TimingSystem.WindupTime(ShotIntent.Defensive), TimingSystem.WindupTime(ShotIntent.Normal));
            Assert.Less(TimingSystem.WindupTime(ShotIntent.Normal), TimingSystem.WindupTime(ShotIntent.Aggressive));
            Assert.Less(TimingSystem.WindupTime(ShotIntent.Aggressive), TimingSystem.WindupTime(ShotIntent.Lofted));
        }

        // ------------------------------------------------------------------ direction resolver

        [Test]
        public void Resolver_TapDefaultsToStraight_SwipeGivesRequestedSector()
        {
            var delivery = DeliveryData.GoodLength();
            var foot = new FootworkState();

            var tap = ShotDirectionResolver.Resolve(new Vec2(0.05f, 0.02f), 0.1f, 0f, delivery, foot, 0f);
            Assert.False(tap.HasDirection);
            Assert.AreEqual(0f, tap.AngleFromStraight, 0.001f);

            var cover = ShotDirectionResolver.Resolve(new Vec2(1f, 0.6f), 1f, 0f, delivery, foot, 0f);
            Assert.True(cover.HasDirection);
            Assert.Greater(cover.AngleFromStraight, 0.5f); // toward off side
        }

        [Test]
        public void Resolver_EarlyTiming_PullsLegSide_LateDragsOffSide()
        {
            var delivery = DeliveryData.GoodLength();
            var foot = new FootworkState();
            var straight = new Vec2(0f, 1f);

            var early = ShotDirectionResolver.Resolve(straight, 1f, 0f, delivery, foot, -0.12f);
            var late = ShotDirectionResolver.Resolve(straight, 1f, 0f, delivery, foot, 0.12f);

            Assert.Less(early.AngleFromStraight, 0f, "early contact should pull toward leg side");
            Assert.Greater(late.AngleFromStraight, 0f, "late contact should drag toward off side");
        }

        [Test]
        public void Resolver_Footwork_ImprovesReach_ForWideBall()
        {
            var wideOff = new DeliveryData { SpeedKph = 126f, Line = 0.85f, Length = 0.5f, Swing = 0f };
            var traj = new DeliveryTrajectory(wideOff);

            var rooted = ShotDirectionResolver.Resolve(new Vec2(1f, 0.5f), 1f, traj.XAtContact, wideOff,
                                                       new FootworkState(), 0f);
            var moved = ShotDirectionResolver.Resolve(new Vec2(1f, 0.5f), 1f, traj.XAtContact, wideOff,
                                                      new FootworkState { X = 0.30f }, 0f);

            Assert.Greater(moved.ReachQuality, rooted.ReachQuality,
                "moving toward a wide ball must improve reach");
        }

        // ------------------------------------------------------------------ shot selector

        [Test]
        public void Selector_NormalFrontFootFullBall_CoverDirection_IsCoverDrive()
        {
            var delivery = DeliveryData.Full();
            var dir = DirResult(0.6f, 0.9f); // cover sector, good reach
            var sel = ShotSelector.Select(ShotIntent.Normal, FootPose.FrontFoot, delivery, dir);
            Assert.AreEqual(ShotKind.CoverDrive, sel.Kind);
            Assert.False(sel.Awkward);
        }

        [Test]
        public void Selector_NormalBackFootShortBall_SquareLeg_IsPull()
        {
            var delivery = DeliveryData.Short();
            var dir = DirResult(-1.2f, 0.8f); // square-leg sector
            var sel = ShotSelector.Select(ShotIntent.Normal, FootPose.BackFoot, delivery, dir);
            Assert.AreEqual(ShotKind.Pull, sel.Kind);
            Assert.False(sel.Awkward);
        }

        [Test]
        public void Selector_Defensive_GivesDefence()
        {
            var full = ShotSelector.Select(ShotIntent.Defensive, FootPose.FrontFoot, DeliveryData.Full(), DirResult(0f, 0.9f));
            var shortBall = ShotSelector.Select(ShotIntent.Defensive, FootPose.BackFoot, DeliveryData.Short(), DirResult(0f, 0.9f));
            Assert.AreEqual(ShotKind.FrontFootDefense, full.Kind);
            Assert.AreEqual(ShotKind.BackFootDefense, shortBall.Kind);
        }

        [Test]
        public void Selector_Lofted_MapsByDirection()
        {
            var straight = ShotSelector.Select(ShotIntent.Lofted, FootPose.FrontFoot, DeliveryData.Full(), DirResult(0f, 0.9f));
            var leg = ShotSelector.Select(ShotIntent.Lofted, FootPose.FrontFoot, DeliveryData.Full(), DirResult(-0.9f, 0.8f));
            var off = ShotSelector.Select(ShotIntent.Lofted, FootPose.FrontFoot, DeliveryData.Full(), DirResult(0.9f, 0.8f));
            Assert.AreEqual(ShotKind.LoftedStraight, straight.Kind);
            Assert.AreEqual(ShotKind.LoftedLegSide, leg.Kind);
            Assert.AreEqual(ShotKind.LoftedDrive, off.Kind);
        }

        [Test]
        public void Selector_UnrealisticCombinations_AreAwkward()
        {
            // Cutting a full ball is not on.
            var cutFull = ShotSelector.Select(ShotIntent.Normal, FootPose.FrontFoot, DeliveryData.Full(), DirResult(1.4f, 0.9f));
            Assert.True(cutFull.Awkward);
            Assert.AreEqual(ShotKind.AwkwardPoke, cutFull.Kind);

            // Short ball while rooted on the front foot.
            var shortOnFront = ShotSelector.Select(ShotIntent.Normal, FootPose.FrontFoot, DeliveryData.Short(), DirResult(-1.0f, 0.9f));
            Assert.True(shortOnFront.Awkward);
            Assert.AreEqual(ShotKind.Pull, shortOnFront.Kind);

            // Full ball played off the back foot.
            var fullOnBack = ShotSelector.Select(ShotIntent.Normal, FootPose.BackFoot, DeliveryData.Full(), DirResult(0.5f, 0.9f));
            Assert.True(fullOnBack.Awkward);
        }

        [Test]
        public void Selector_GoodLength_OffSector_VariesWithSquareness()
        {
            var drive = ShotSelector.Select(ShotIntent.Normal, FootPose.Neutral, DeliveryData.GoodLength(), DirResult(0.6f, 0.9f));
            var square = ShotSelector.Select(ShotIntent.Normal, FootPose.Neutral, DeliveryData.GoodLength(), DirResult(1.4f, 0.9f));
            Assert.AreEqual(ShotKind.CoverDrive, drive.Kind);
            Assert.AreEqual(ShotKind.SquareDrive, square.Kind);
        }

        private static DirectionResolveResult DirResult(float angle, float reach)
        {
            return new DirectionResolveResult
            {
                Direction = new Vec2((float)System.Math.Sin(angle), (float)System.Math.Cos(angle)),
                AngleFromStraight = angle,
                ReachQuality = reach,
                HasDirection = true
            };
        }

        // ------------------------------------------------------------------ contact

        [Test]
        public void Contact_PerfectTiming_Outperforms_Mistimed()
        {
            // Seed 3's first draw (0.84) clears the edge roll at both offsets,
            // so this compares struck contacts only.
            var perfect = BatBallContact.Resolve(new SeededRng(3), MakeSetup(0f, TimingWindow.Perfect));
            var mistimed = BatBallContact.Resolve(new SeededRng(3), MakeSetup(0.15f, TimingWindow.Early));

            Assert.AreEqual(ContactOutcome.Clean, perfect.Outcome);
            Assert.Greater(perfect.ExitSpeedKph, mistimed.ExitSpeedKph);
            Assert.Greater(perfect.Quality, mistimed.Quality);
        }

        [Test]
        public void Contact_ExitSpeed_DegradesMonotonically_WithWorseTiming()
        {
            // Same seed per call, and its first draw (0.84) is above the edge
            // probability at every offset tested, so all three are struck.
            float[] offsets = { 0f, 0.06f, 0.12f };
            float previous = float.MaxValue;
            foreach (float offset in offsets)
            {
                var window = TimingSystem.Classify(offset);
                var r = BatBallContact.Resolve(new SeededRng(3), MakeSetup(offset, window));
                Assert.AreNotEqual(ContactOutcome.Edge, r.Outcome, "seed guarantees a struck ball");
                Assert.Less(r.ExitSpeedKph, previous, "speed must degrade with worse timing");
                previous = r.ExitSpeedKph;
            }
        }

        [Test]
        public void Contact_OutOfReach_IsAMiss()
        {
            var setup = MakeSetup(0f, TimingWindow.Perfect);
            setup.Direction.ReachQuality = 0.10f;
            var r = BatBallContact.Resolve(new SeededRng(9), setup);
            Assert.AreEqual(ContactOutcome.Miss, r.Outcome);
        }

        [Test]
        public void Contact_Defensive_IsSlowAndGrounded()
        {
            var setup = MakeSetup(0f, TimingWindow.Perfect);
            setup.Shot.Kind = ShotKind.FrontFootDefense;
            setup.Shot.BasePower = 0.3f;
            var r = BatBallContact.Resolve(new SeededRng(3), setup);
            Assert.AreEqual(ContactOutcome.DefensiveSolid, r.Outcome);
            Assert.Less(r.ExitSpeedKph, 45f);
            Assert.Less(r.ElevationDeg, 10f);
        }

        [Test]
        public void Contact_LoftedIntent_ProducesAerialExit()
        {
            var setup = MakeSetup(0f, TimingWindow.Perfect);
            setup.Shot.Lofted = true;
            setup.Shot.Kind = ShotKind.LoftedStraight;
            setup.Shot.BasePower = 0.9f;
            var r = BatBallContact.Resolve(new SeededRng(11), setup);
            Assert.AreEqual(ContactOutcome.LoftedClean, r.Outcome);
            Assert.Greater(r.ElevationDeg, 18f);
            Assert.Greater(r.Direction.Y, 0.3f);
        }

        [Test]
        public void Contact_ExitDirection_TravelsIntoTheField()
        {
            var r = BatBallContact.Resolve(new SeededRng(4), MakeSetup(0f, TimingWindow.Perfect));
            Assert.Greater(r.Direction.Z, 0.5f, "struck balls travel into the field (+Z)");
            float mag = (float)System.Math.Sqrt(
                r.Direction.X * r.Direction.X + r.Direction.Y * r.Direction.Y + r.Direction.Z * r.Direction.Z);
            Assert.AreEqual(1f, mag, 0.01f);
        }

        private static ContactSetup MakeSetup(float offset, TimingWindow window)
        {
            return new ContactSetup
            {
                Delivery = DeliveryData.GoodLength(),
                Shot = new ShotSelection
                {
                    Kind = ShotKind.CoverDrive,
                    Name = "Cover Drive",
                    BasePower = 0.68f,
                    BaseLoftDeg = 6f
                },
                Direction = new DirectionResolveResult
                {
                    Direction = new Vec2(0.5f, 0.86f),
                    AngleFromStraight = 0.52f,
                    ReachQuality = 0.9f,
                    HasDirection = true
                },
                TimingOffset = offset,
                Window = window,
                SwipeStrength = 1f
            };
        }

        // ------------------------------------------------------------------ end-to-end engine

        [Test]
        public void Engine_WellTimedSwing_ProducesContact()
        {
            var engine = new BattingEngine(new SeededRng(21));
            engine.BeginDelivery(DeliveryData.Full(118f, 0f, 0f));

            SwingReport? got = null;
            engine.SwingCommitted += r => got = r;

            float windup = TimingSystem.WindupTime(ShotIntent.Normal);
            float swingAt = engine.ActiveDelivery.TimeToContact - windup; // perfect release moment

            var input = BattingInputFrame.Idle;
            input.ShotDirection = new Vec2(0.4f, 0.9f);
            input.SwipeStrength = 1f;

            float t = 0f;
            while (t < swingAt - 1f / 120f)
            {
                engine.Update(1f / 60f, input);
                t += 1f / 60f;
            }

            var swingFrame = input;
            swingFrame.SwingTriggered = true;
            engine.Update(1f / 60f, swingFrame);

            Assert.NotNull(got);
            Assert.True(got.Value.WillContact, "a well-timed reachable shot must make contact");
            Assert.True(got.Value.Window == TimingWindow.Perfect || got.Value.Window == TimingWindow.Good,
                "window was " + got.Value.Window);
            Assert.Greater(got.Value.Contact.ExitSpeedKph, 30f);
        }

        [Test]
        public void Engine_NoSwing_StraightBall_IsBowled()
        {
            var engine = new BattingEngine(new SeededRng(22));
            engine.BeginDelivery(new DeliveryData { SpeedKph = 125f, Line = 0f, Length = 0.15f, Swing = 0f });

            BallPassedReport? passed = null;
            engine.BallPassed += r => passed = r;

            var input = BattingInputFrame.Idle;
            for (int i = 0; i < 200 && !passed.HasValue; i++)
                engine.Update(1f / 60f, input);

            Assert.NotNull(passed);
            Assert.False(passed.Value.Swung);
            Assert.True(passed.Value.HitStumps, "a middle-stump delivery left alone must be bowled");
        }

        [Test]
        public void Engine_NoSwing_WideBall_IsLeftAlone()
        {
            var engine = new BattingEngine(new SeededRng(23));
            engine.BeginDelivery(new DeliveryData { SpeedKph = 125f, Line = 0.9f, Length = 0.15f, Swing = 0f });

            BallPassedReport? passed = null;
            engine.BallPassed += r => passed = r;

            var input = BattingInputFrame.Idle;
            for (int i = 0; i < 200 && !passed.HasValue; i++)
                engine.Update(1f / 60f, input);

            Assert.NotNull(passed);
            Assert.False(passed.Value.HitStumps);
        }

        [Test]
        public void Engine_VeryLateSwing_IsIgnored_AndBallPasses()
        {
            var engine = new BattingEngine(new SeededRng(24));
            engine.BeginDelivery(DeliveryData.GoodLength());

            SwingReport? got = null;
            BallPassedReport? passed = null;
            engine.SwingCommitted += r => got = r;
            engine.BallPassed += r => passed = r;

            var idle = BattingInputFrame.Idle;
            float ttc = engine.ActiveDelivery.TimeToContact;

            float t = 0f;
            while (t < ttc + 0.05f)
            {
                engine.Update(1f / 60f, idle);
                t += 1f / 60f;
            }

            var late = idle;
            late.SwingTriggered = true;
            late.SwipeStrength = 1f;
            engine.Update(1f / 60f, late);

            Assert.IsNull(got, "a swing after the ball has gone must not register");
            for (int i = 0; i < 120 && !passed.HasValue; i++)
                engine.Update(1f / 60f, idle);
            Assert.NotNull(passed);
        }

        [Test]
        public void Engine_Footwork_AppliesDuringDelivery()
        {
            var engine = new BattingEngine(new SeededRng(25));
            engine.BeginDelivery(DeliveryData.GoodLength());
            var input = BattingInputFrame.Idle;
            input.Footwork = new Vec2(0f, 1f); // stride forward
            for (int i = 0; i < 20; i++) engine.Update(1f / 60f, input);
            Assert.Greater(engine.Foot.Z, 0.3f);
            Assert.AreEqual(FootPose.FrontFoot, FootworkController.Pose(engine.Foot));
        }
    }
}
