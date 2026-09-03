using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Phase 4 (spec sections 1-2): batsman animation state machine.
    /// IDLE -> READY -> FOOTWORK -> SHOT -> FOLLOW_THROUGH -> RECOVERY with
    /// smooth blending at every transition. Pure coordination layer: shot
    /// selection lives in ShotAnimationResolver, playback in
    /// ContactAnimationController, movement in FootworkAnimationController -
    /// so real animation assets can replace the procedural layer later
    /// without touching gameplay logic.
    /// </summary>
    public enum BatsmanAnimState { Idle, Ready, Footwork, Shot, FollowThrough, Recovery }

    public class BattingAnimationController : MonoBehaviour
    {
        public BatsmanRig Rig;
        public BatSwingController Swing;   // legacy arc player (kept for compat)

        private FootworkAnimationController footworkAnim;
        private ContactAnimationController contactAnim;

        public BatsmanAnimState State { get; private set; }
        private float stateClock;
        private float recoveryHold;
        private bool ballInFlight;

        private void Awake()
        {
            if (Rig != null) BuildLayers();
        }

        private void BuildLayers()
        {
            footworkAnim = new FootworkAnimationController(Rig);
            contactAnim = new ContactAnimationController(Rig);
        }

        public void NotifyDeliveryStarted()
        {
            ballInFlight = true;
            if (State == BatsmanAnimState.Idle) Transition(BatsmanAnimState.Ready);
        }

        /// <summary>Legacy entry (runner compatibility): generic swing played.</summary>
        public void NotifySwingPlayed()
        {
            Transition(BatsmanAnimState.Shot);
            recoveryHold = 0.55f;
        }

        /// <summary>Phase 4 entry: play a contextually-resolved shot gesture.</summary>
        public void NotifySwingPlayed(ShotAnimationSpec spec)
        {
            if (contactAnim == null) BuildLayers();
            contactAnim.Play(spec);
            Transition(BatsmanAnimState.Shot);
            recoveryHold = Mathf.Max(0.35f, spec.Duration * 0.8f);
        }

        /// <summary>Unstruck outcomes: leave / beaten / bowled / wicket.</summary>
        public void NotifyReaction(ShotAnimationSpec spec)
        {
            if (contactAnim == null) BuildLayers();
            contactAnim.Play(spec, asReaction: true);
            Transition(spec.Kind == BatAnimationKind.BowledReaction
                       || spec.Kind == BatAnimationKind.WicketReaction
                       ? BatsmanAnimState.Recovery : BatsmanAnimState.FollowThrough);
            recoveryHold = spec.Duration;
        }

        public void NotifyDeliveryEnded()
        {
            ballInFlight = false;
        }

        /// <summary>Applies the engine's footwork state to the rig each frame.</summary>
        public void ApplyEngineFootwork(FootworkState foot)
        {
            if (footworkAnim == null) BuildLayers();
            if (contactAnim != null && contactAnim.Playing
                && !IsReactionKind(contactAnim.CurrentKind))
            {
                // During a shot the contact gesture owns the upper body.
                footworkAnim.Apply(foot, Time.deltaTime);
                return;
            }
            footworkAnim.Apply(foot, Time.deltaTime);
            if (State != BatsmanAnimState.Shot && State != BatsmanAnimState.Recovery)
            {
                bool moving = Mathf.Abs(foot.X) > 0.05f || Mathf.Abs(foot.Z) > 0.05f;
                if (moving && State != BatsmanAnimState.Footwork)
                    Transition(BatsmanAnimState.Footwork);
            }
        }

        private static bool IsReactionKind(BatAnimationKind k)
        {
            return k == BatAnimationKind.Leave || k == BatAnimationKind.BeatenShrugg
                || k == BatAnimationKind.BowledReaction || k == BatAnimationKind.WicketReaction;
        }

        private void Transition(BatsmanAnimState next)
        {
            State = next;
            stateClock = 0f;
        }

        private void Update()
        {
            stateClock += Time.deltaTime;

            if (contactAnim != null && contactAnim.Playing)
            {
                contactAnim.Tick(Time.deltaTime);
            }

            switch (State)
            {
                case BatsmanAnimState.Idle:
                case BatsmanAnimState.Ready:
                    footworkAnim?.ApplyIdle(Time.time, Time.deltaTime);
                    break;

                case BatsmanAnimState.Shot:
                    if (contactAnim == null || !contactAnim.Playing)
                        Transition(BatsmanAnimState.FollowThrough);
                    break;

                case BatsmanAnimState.FollowThrough:
                    if (stateClock > recoveryHold)
                        Transition(BatsmanAnimState.Recovery);
                    break;

                case BatsmanAnimState.Recovery:
                    // Blend the stance back in, then return to ready/idle.
                    if (Rig != null)
                    {
                        float k = 1f - Mathf.Exp(-8f * Time.deltaTime);
                        Rig.ShoulderPivot.localRotation = Quaternion.Slerp(
                            Rig.ShoulderPivot.localRotation,
                            Quaternion.Euler(-38f, 12f, -24f), k);
                    }
                    if (stateClock > 0.35f)
                        Transition(ballInFlight ? BatsmanAnimState.Ready : BatsmanAnimState.Idle);
                    break;
            }
        }

        /// <summary>Hard reset between deliveries/matches.</summary>
        public void ResetToStance()
        {
            contactAnim?.Cancel();
            footworkAnim?.Reset();
            if (Rig != null) Rig.ResetPose();
            Transition(BatsmanAnimState.Idle);
            ballInFlight = false;
        }
    }
}
