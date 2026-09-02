using System.Collections.Generic;
using CricketGame.Core.AI;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.Core.Fielding;
using CricketGame.Core.Rules;

namespace CricketGame.Core.Simulation
{
    /// <summary>Result of one headless delivery through the full pipeline.</summary>
    public sealed class HeadlessDeliveryResult
    {
        public int Runs;
        public bool IsWicket;
        public DismissalKind Dismissal = DismissalKind.None;
        public string OutcomeKind;          // leave/beaten/bowled/lbw/caught/four/six/runs/...
        public FieldingResult Fielding;     // null when the ball was not struck
    }

    public sealed class HeadlessBallLog
    {
        public int InningsIndex;
        public DeliveryType DeliveryType;
        public HeadlessDeliveryResult Result;
    }

    /// <summary>
    /// Headless full-match runner: bowling factory -> batting engine ->
    /// Phase 2 resolver (unstruck) -> fielding sim (struck) -> rules engine.
    /// Used by tests today and by any future AI-vs-AI spectate mode. The
    /// Unity layer runs the same pieces with presentation between them.
    /// </summary>
    public static class Phase3MatchSimulator
    {
        private const float SimDt = 1f / 120f;

        /// <summary>Plays one delivery headlessly with the given AI plan.</summary>
        public static HeadlessDeliveryResult PlayDelivery(
            IRng rng, DeliveryData delivery, AiBattingPlan plan,
            IRng engineRng, Fielder[] fielders, ForcedOutcome force)
        {
            if (force != ForcedOutcome.None)
            {
                var forced = ShotOutcomeResolver.Resolve(rng, null, null, 0f, 0f, true, force);
                return new HeadlessDeliveryResult
                {
                    Runs = forced.Runs,
                    IsWicket = forced.IsWicket,
                    Dismissal = forced.Kind == ShotOutcomeKind.Bowled ? DismissalKind.Bowled
                              : forced.Kind == ShotOutcomeKind.Lbw ? DismissalKind.Lbw
                              : DismissalKind.None,
                    OutcomeKind = forced.Kind.ToString().ToLowerInvariant(),
                };
            }

            var engine = new BattingEngine(engineRng);
            engine.BeginDelivery(delivery);

            bool fired = false;
            float? swingT = null;
            if (plan.Swing)
                swingT = AiBattingPlanner.SwingFrameTime(engine.ActiveDelivery.TimeToContact,
                                                         plan.Intent, plan.Offset);

            var shotDir = new Vec2(MathHelperSinCos.Sin(plan.Angle),
                                   MathHelperSinCos.Cos(plan.Angle));

            float t = 0f;
            while (t < 4f)
            {
                float ix = Clamp(plan.FootTarget.X - engine.Foot.X, -1f, 1f) * 2f;
                float iy = Clamp(plan.FootTarget.Y - engine.Foot.Z, -1f, 1f) * 2f;
                bool fire = plan.Swing && !fired && swingT.HasValue && t >= swingT.Value;

                var input = new BattingInputFrame
                {
                    Footwork = new Vec2(ix, iy),
                    SwingTriggered = fire,
                    ShotDirection = shotDir,
                    SwipeStrength = plan.Strength,
                    Intent = plan.Intent,
                };
                engine.Update(SimDt, input);
                if (fire) fired = true;
                t += SimDt;

                if (engine.PassedBatter || engine.ContactWillHappen) break;
            }

            // Unstruck: Phase 2 resolver decides bowled / lbw / dot.
            if (!engine.ContactWillHappen)
            {
                var unstruck = ShotOutcomeResolver.Resolve(
                    rng, engine.ActiveDelivery, engine.LastSwing,
                    engine.Foot.X, engine.Foot.Z, true, ForcedOutcome.None);
                return new HeadlessDeliveryResult
                {
                    Runs = unstruck.Runs,
                    IsWicket = unstruck.IsWicket,
                    Dismissal = unstruck.Kind == ShotOutcomeKind.Bowled ? DismissalKind.Bowled
                              : unstruck.Kind == ShotOutcomeKind.Lbw ? DismissalKind.Lbw
                              : DismissalKind.None,
                    OutcomeKind = unstruck.Kind.ToString().ToLowerInvariant(),
                };
            }

            // Struck: the field decides everything.
            var contact = engine.LastSwing.Value.Contact;
            var traj = engine.ActiveDelivery;
            float startHeight = traj.HeightAtContact;
            if (startHeight < 0.35f) startHeight = 0.35f;
            var contactPos = new Vec3(traj.XAtContact, startHeight, 0.35f);
            float speed = contact.ExitSpeedKph / 3.6f;
            var velocity = new Vec3(contact.Direction.X * speed,
                                    contact.Direction.Y * speed,
                                    contact.Direction.Z * speed);
            var field = FieldingSimulator.Simulate(contactPos, velocity, fielders, rng);

            var res = new HeadlessDeliveryResult { Fielding = field };
            switch (field.Kind)
            {
                case FieldingKind.Caught:
                    res.IsWicket = true;
                    res.Dismissal = DismissalKind.Caught;
                    res.OutcomeKind = "caught";
                    break;
                case FieldingKind.Four:
                    res.Runs = 4;
                    res.OutcomeKind = "four";
                    break;
                case FieldingKind.Six:
                    res.Runs = 6;
                    res.OutcomeKind = "six";
                    break;
                default:
                    res.Runs = field.Runs;
                    res.OutcomeKind = field.Runs > 0 ? "runs" : "dot";
                    break;
            }
            return res;
        }

        /// <summary>Maps a headless delivery onto the rules engine.</summary>
        public static DeliveryOutcome ToRulesOutcome(HeadlessDeliveryResult r)
        {
            if (r.IsWicket)
            {
                var kind = r.Dismissal == DismissalKind.None ? DismissalKind.Bowled : r.Dismissal;
                return DeliveryOutcome.Wicket(kind);
            }
            return DeliveryOutcome.Legal(r.Runs);
        }

        /// <summary>Simulates a complete Super Over between two AI sides.</summary>
        public static SuperOverMatch PlayMatch(long seed, AiDifficulty difficulty,
                                               out List<HeadlessBallLog> log,
                                               ForcedOutcome forceInnings1 = ForcedOutcome.None,
                                               ForcedOutcome forceInnings2 = ForcedOutcome.None)
        {
            var rng = new SeededRng(seed);
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            log = new List<HeadlessBallLog>();

            var tune = AiDifficultyTuning.For(difficulty);
            var plan1 = BowlerPlan.Default;

            while (!match.IsComplete)
            {
                if (match.Phase == MatchPhase.InningsBreak)
                {
                    match.StartSecondInnings();
                    continue;
                }

                int inningsIndex = match.Phase == MatchPhase.SecondInnings ? 1 : 0;
                float fieldScale = inningsIndex == 0
                    ? tune.FieldVsPlayer : tune.FieldForPlayer;
                var fielders = Fielder.DefaultField(fieldScale);

                var dtype = DeliveryFactory.NextType(plan1, rng);
                var delivery = DeliveryFactory.Build(dtype, rng, tune.AiBowlingAccuracy);
                var traj = new DeliveryTrajectory(delivery);

                var ctx = new AiChaseContext
                {
                    Target = inningsIndex == 1 ? (int?)match.FirstInnings.Runs + 1 : null,
                    Score = inningsIndex == 0 ? match.FirstInnings.Runs : match.SecondInnings.Runs,
                    BallsRemaining = match.CurrentInnings.BallsRemaining,
                    WicketsRemaining = match.CurrentInnings.WicketsRemaining,
                };

                var plan = AiBattingPlanner.Plan(rng, delivery, ctx, difficulty,
                                                 traj.HitsStumps());

                var engineRng = new SeededRng(rng.Next(int.MaxValue));
                var force = inningsIndex == 0 ? forceInnings1 : forceInnings2;
                var res = PlayDelivery(rng, delivery, plan, engineRng, fielders, force);

                match.RecordDelivery(ToRulesOutcome(res));
                log.Add(new HeadlessBallLog
                {
                    InningsIndex = inningsIndex,
                    DeliveryType = dtype,
                    Result = res,
                });
            }
            return match;
        }

        private static float Clamp(float v, float lo, float hi)
        {
            return v < lo ? lo : (v > hi ? hi : v);
        }
    }

    internal static class MathHelperSinCos
    {
        public static float Sin(float a) { return (float)System.Math.Sin(a); }
        public static float Cos(float a) { return (float)System.Math.Cos(a); }
    }
}
