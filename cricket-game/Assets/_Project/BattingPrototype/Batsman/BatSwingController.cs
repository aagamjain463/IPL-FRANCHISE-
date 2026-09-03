using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Procedural bat swing. The swing is launched when the player commits
    /// (SwingCommitted) and is paced so the bat crosses the contact plane at
    /// the delivery's contact time - i.e. the animation honours the timing model.
    /// </summary>
    public class BatSwingController : MonoBehaviour
    {
        public BatsmanRig Rig;

        private bool swinging;
        private float swingClock;
        private float swingDuration;
        private float contactFraction;   // where in the swing the bat meets the ball
        private float targetYawDeg;      // follow-through direction (0 = straight)
        private float liftDeg;             // vertical arc of the follow-through
        private float quality;           // affects snap/speed of the swing

        private static readonly Quaternion Backlift = Quaternion.Euler(-52f, 26f, -38f);
        private static readonly Quaternion WindupTop = Quaternion.Euler(-70f, 44f, -52f);

        public bool Swinging { get { return swinging; } }

        /// <summary>
        /// Starts the swing. <paramref name="timeUntilContact"/> is the engine's
        /// (contact time - now); the downswing lands the bat there.
        /// </summary>
        public void PlaySwing(float timeUntilContact, float shotAngleRad, bool lofted,
                              bool awkward, float timingQuality)
        {
            swinging = true;
            swingClock = 0f;
            quality = Mathf.Clamp01(timingQuality);

            float windup = Mathf.Max(0.08f, timeUntilContact);
            float follow = 0.30f;
            swingDuration = windup + follow;
            contactFraction = windup / swingDuration;

            targetYawDeg = shotAngleRad * Mathf.Rad2Deg;
            liftDeg = lofted ? 55f : 22f;
            if (awkward) liftDeg *= 0.4f;
        }

        /// <summary>Cancels the swing and returns to the stance (ball passed unplayed).</summary>
        public void Cancel()
        {
            swinging = false;
            swingClock = 0f;
            Rig.ResetPose();
        }

        private void Update()
        {
            if (!swinging) return;

            swingClock += Time.deltaTime;
            float t = swingClock / swingDuration;
            if (t >= 1f)
            {
                swinging = false;
                Rig.ResetPose();
                return;
            }

            Quaternion pose;
            if (t < contactFraction)
            {
                // Wind-up: lift toward the top of the backswing as the ball approaches.
                float p = Mathf.Clamp01(t / Mathf.Max(0.001f, contactFraction));
                pose = Quaternion.Slerp(Backlift, WindupTop, p);
            }
            else
            {
                // Downswing + follow-through, rotating toward the chosen direction.
                float p = (t - contactFraction) / (1f - contactFraction);
                float snap = Mathf.Pow(p, 0.6f + 0.4f * quality); // better timing = crisper snap
                float yaw = Mathf.Lerp(30f, targetYawDeg, snap);
                float pitch = Mathf.Lerp(-46f, liftDeg, snap);
                float roll = Mathf.Lerp(-30f, 18f, snap);
                pose = Quaternion.Euler(pitch, yaw, roll);
            }

            Rig.ShoulderPivot.localRotation = pose;
        }
    }
}
