using CricketGame.Core.AI;
using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;
using UnityEngine;

namespace CricketGame.BattingPrototype.Match
{
    /// <summary>
    /// Drives the SAME BattingEngine a human uses (spec section 14). Each
    /// delivery the AI picks a plan (state, intent, direction, timing, feet)
    /// and then produces input frames until the ball passes or contact is
    /// scheduled. Mirrors the headless driver in Phase3MatchSimulator so the
    /// chase behaves exactly like the tests say it does.
    /// </summary>
    public sealed class AiBatterDriver
    {
        private readonly IRng rng = new SystemRng();

        private AiBattingPlan plan;
        private bool fired;
        private float swingFrameTime = -1f;
        private bool active;

        public AiAggressionState CurrentState
        {
            get { return plan != null ? plan.State : AiAggressionState.Balanced; }
        }

        public bool HasPlan { get { return active && plan != null; } }

        /// <summary>Plans one delivery against the live chase context.</summary>
        public void BeginDelivery(DeliveryData delivery, AiChaseContext ctx,
                                  AiDifficulty difficulty, bool hitsStumpsHint)
        {
            plan = AiBattingPlanner.Plan(rng, delivery, ctx, difficulty, hitsStumpsHint);
            fired = false;
            active = true;
            swingFrameTime = -1f;
        }

        public void EndDelivery()
        {
            active = false;
        }

        /// <summary>Builds this frame's engine input from the plan.</summary>
        public BattingInputFrame SampleFrame(BattingEngine engine, float dt)
        {
            if (!active || plan == null) return BattingInputFrame.Idle;

            DeliveryTrajectory traj = engine.ActiveDelivery;
            if (traj == null) return BattingInputFrame.Idle;

            // Resolve the swing frame lazily once the trajectory exists.
            if (swingFrameTime < 0f && plan.Swing)
                swingFrameTime = AiBattingPlanner.SwingFrameTime(traj.TimeToContact,
                                                                 plan.Intent, plan.Offset);

            float ix = Mathf.Clamp(plan.FootTarget.X - engine.Foot.X, -1f, 1f) * 2f;
            float iy = Mathf.Clamp(plan.FootTarget.Y - engine.Foot.Z, -1f, 1f) * 2f;

            bool fire = plan.Swing && !fired && swingFrameTime >= 0f
                        && engine.DeliveryTime >= swingFrameTime;
            if (fire) fired = true;

            return new BattingInputFrame
            {
                Footwork = new Vec2(ix, iy),
                SwingTriggered = fire,
                ShotDirection = new Vec2(Mathf.Sin(plan.Angle), Mathf.Cos(plan.Angle)),
                SwipeStrength = plan.Strength,
                Intent = plan.Intent,
            };
        }
    }
}
