using System;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.Batting
{
    /// <summary>Raised the frame a swing is committed (before the ball arrives).</summary>
    public struct SwingReport
    {
        public bool WillContact;
        public ShotIntent Intent;
        public ShotSelection Selection;
        public DirectionResolveResult Direction;
        public TimingWindow Window;
        /// <summary>Seconds between the bat arriving and the ball arriving (+ late, - early).</summary>
        public float TimingOffset;
        public ContactResult Contact;
        public DeliveryData Delivery;
    }

    /// <summary>Raised when the ball passes the stumps without being struck.</summary>
    public struct BallPassedReport
    {
        public bool Swung;      // swung and missed (false = left alone)
        public bool HitStumps;  // would be bowled
    }

    /// <summary>
    /// The batting engine. Advances footwork, tracks the delivery clock,
    /// captures the swing, and resolves it through the resolver/selector/contact
    /// pipeline. Knows nothing about touch, rendering or Unity - any input
    /// source that produces <see cref="BattingInputFrame"/> can drive it.
    /// </summary>
    public sealed class BattingEngine
    {
        private readonly IRng rng;

        private FootworkState foot;
        private DeliveryTrajectory trajectory;
        private float deliveryTime;

        private bool swingTaken;
        private bool contactWillHappen;
        private bool passedReported;

        /// <summary>Fired when the player commits a swing.</summary>
        public event Action<SwingReport> SwingCommitted;

        /// <summary>Fired when the ball passes the stumps unstruck.</summary>
        public event Action<BallPassedReport> BallPassed;

        /// <summary>Last swing report, for debug display.</summary>
        public SwingReport? LastSwing;

        public BattingEngine(IRng rng)
        {
            this.rng = rng;
        }

        public FootworkState Foot { get { return foot; } }
        public DeliveryTrajectory ActiveDelivery { get { return trajectory; } }
        public float DeliveryTime { get { return deliveryTime; } }
        public bool SwingTaken { get { return swingTaken; } }
        public bool ContactWillHappen { get { return contactWillHappen; } }

        public void SetFootworkPosition(float x, float z)
        {
            foot.X = x;
            foot.Z = z;
            foot.VelX = 0f;
            foot.VelZ = 0f;
        }

        /// <summary>Starts a new delivery. Call once per ball from the test bowler.</summary>
        public void BeginDelivery(DeliveryData delivery)
        {
            trajectory = new DeliveryTrajectory(delivery);
            deliveryTime = 0f;
            swingTaken = false;
            contactWillHappen = false;
            passedReported = false;
            LastSwing = null;
        }

        /// <summary>Advances footwork and the delivery clock; processes input.</summary>
        public void Update(float dt, BattingInputFrame input)
        {
            FootworkController.Advance(ref foot, input.Footwork, dt);

            if (trajectory == null) return;
            deliveryTime += dt;

            // --- capture the swing on the frame it is released
            if (!swingTaken && !passedReported && input.SwingTriggered)
            {
                float windup = TimingSystem.WindupTime(input.Intent);
                float offset = (deliveryTime + windup) - trajectory.TimeToContact;

                if (offset <= TimingSystem.MaxWindow)
                {
                    swingTaken = true;

                    var direction = ShotDirectionResolver.Resolve(
                        input.ShotDirection, input.SwipeStrength,
                        trajectory.XAtContact, trajectory.Delivery, foot, offset);

                    var window = TimingSystem.Classify(offset);
                    var selection = ShotSelector.Select(
                        input.Intent, FootworkController.Pose(foot), trajectory.Delivery, direction);

                    var report = new SwingReport
                    {
                        Intent = input.Intent,
                        Selection = selection,
                        Direction = direction,
                        Window = window,
                        TimingOffset = offset,
                        Delivery = trajectory.Delivery
                    };

                    if (window != TimingWindow.Missed && direction.ReachQuality >= 0.15f)
                    {
                        var contact = BatBallContact.Resolve(rng, new ContactSetup
                        {
                            Delivery = trajectory.Delivery,
                            Shot = selection,
                            Direction = direction,
                            TimingOffset = offset,
                            Window = window,
                            SwipeStrength = input.SwipeStrength
                        });

                        if (contact.Outcome == ContactOutcome.Miss)
                        {
                            report.WillContact = false;
                        }
                        else
                        {
                            report.WillContact = true;
                            report.Contact = contact;
                            contactWillHappen = true;
                        }
                    }

                    LastSwing = report;
                    if (SwingCommitted != null) SwingCommitted(report);
                }
            }

            // --- the ball reaches the stumps without contact
            if (!contactWillHappen && !passedReported && deliveryTime >= trajectory.TimeToStumps)
            {
                passedReported = true;
                if (BallPassed != null)
                    BallPassed(new BallPassedReport { Swung = swingTaken, HitStumps = trajectory.HitsStumps() });
            }
        }
    }
}
