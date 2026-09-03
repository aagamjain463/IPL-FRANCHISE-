using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Phase 4 (spec sections 1-2): plays a resolved ShotAnimationSpec as a
    /// procedural bat arc + body lean. Responsiveness first: gestures are
    /// short, the bat crosses the contact plane on time, and the follow-through
    /// blends back into the stance rather than snapping. The same spec struct
    /// can later drive real animation clips without touching this playback.
    /// </summary>
    public class ContactAnimationController
    {
        private static readonly Quaternion Backlift = Quaternion.Euler(-52f, 26f, -38f);
        private static readonly Quaternion WindupTop = Quaternion.Euler(-70f, 44f, -52f);
        private static readonly Quaternion Guard = Quaternion.Euler(-38f, 12f, -24f);

        private readonly BatsmanRig rig;

        private bool playing;
        private float clock;
        private ShotAnimationSpec spec;
        private bool isReaction;        // reactions have no bat-ball contact point

        public bool Playing { get { return playing; } }
        public BatAnimationKind CurrentKind { get { return spec.Kind; } }

        public ContactAnimationController(BatsmanRig rig)
        {
            this.rig = rig;
        }

        public void Play(ShotAnimationSpec s, bool asReaction = false)
        {
            spec = s;
            isReaction = asReaction;
            playing = true;
            clock = 0f;
        }

        public void Cancel()
        {
            playing = false;
            clock = 0f;
        }

        /// <summary>Advances the gesture; returns false once finished.</summary>
        public bool Tick(float dt)
        {
            if (!playing) return false;
            clock += dt;
            float t = clock / Mathf.Max(0.05f, spec.Duration);

            if (t >= 1f)
            {
                playing = false;
                return false;
            }

            if (isReaction)
            {
                TickReaction(t);
            }
            else
            {
                TickShot(t);
            }
            return true;
        }

        private void TickShot(float t)
        {
            float cf = Mathf.Clamp(spec.ContactFraction, 0.1f, 0.9f);
            Quaternion pose;
            if (t < cf)
            {
                float p = Mathf.Clamp01(t / cf);
                pose = Quaternion.Slerp(Backlift, WindupTop, p);
            }
            else
            {
                float p = (t - cf) / (1f - cf);
                // Crisper snap with better timing; awkward shots stay loose.
                float crisp = spec.Awkward ? 0.5f : 0.6f + 0.4f * QualityOf(spec.Window);
                float snap = Mathf.Pow(p, crisp);
                float yaw = Mathf.Lerp(30f, spec.YawDeg, snap);
                float pitch = Mathf.Lerp(-46f, spec.LiftDeg, snap);
                float roll = Mathf.Lerp(-30f, 18f, snap);
                pose = Quaternion.Euler(pitch, yaw, roll);
            }
            rig.ShoulderPivot.localRotation = pose;

            float lean = Mathf.Sin(Mathf.Clamp01(t) * Mathf.PI) * spec.TorsoLeanDeg;
            rig.Torso.localRotation = Quaternion.Slerp(rig.Torso.localRotation,
                Quaternion.Euler(new Vector3(lean, 0f, 0f)), 0.4f);
        }

        private void TickReaction(float t)
        {
            switch (spec.Kind)
            {
                case BatAnimationKind.BowledReaction:
                case BatAnimationKind.WicketReaction:
                    // Bat drops, shoulders slump - a short, stunned recoil.
                    rig.ShoulderPivot.localRotation = Quaternion.Slerp(
                        rig.ShoulderPivot.localRotation,
                        Quaternion.Euler(-10f, 30f, -70f), 0.5f);
                    rig.Torso.localRotation = Quaternion.Slerp(
                        rig.Torso.localRotation, Quaternion.Euler(14f, 0f, 0f), 0.35f);
                    break;
                case BatAnimationKind.BeatenShrugg:
                    // Completed swing, no contact - hold the follow-through.
                    rig.ShoulderPivot.localRotation = Quaternion.Slerp(
                        rig.ShoulderPivot.localRotation, WindupTop, 0.2f);
                    break;
                default: // Leave
                    // Shoulders stay still, bat held in guard.
                    rig.ShoulderPivot.localRotation = Quaternion.Slerp(
                        rig.ShoulderPivot.localRotation, Guard, 0.4f);
                    break;
            }
        }

        private static float QualityOf(CricketGame.Core.Batting.TimingWindow w)
        {
            switch (w)
            {
                case CricketGame.Core.Batting.TimingWindow.Perfect: return 1f;
                case CricketGame.Core.Batting.TimingWindow.Good: return 0.8f;
                case CricketGame.Core.Batting.TimingWindow.Early:
                case CricketGame.Core.Batting.TimingWindow.Late: return 0.55f;
                default: return 0.3f;
            }
        }
    }
}
