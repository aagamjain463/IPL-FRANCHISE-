using UnityEngine;

namespace CricketGame.BattingPrototype.Bowler
{
    /// <summary>
    /// The visual bowler: run-up, delivery stride and arm wheel. Receives its
    /// choreography from BowlingController; holds no gameplay rules.
    /// (Phase 1's TestBowler, promoted for Phase 2.)
    /// </summary>
    public class BowlerController : MonoBehaviour
    {
        private bool running;
        private float runClock;
        private readonly Vector3 startPos = new Vector3(0.2f, 0f, 26f);
        private readonly Vector3 releasePos = new Vector3(0.15f, 0f, 20.2f);
        private Transform rig;
        private Transform arm;

        public float RunUpDuration { get { return 0.9f; } }
        public bool Running { get { return running; } }

        public void AttachRig(Transform bowlerRoot, Transform bowlerArm)
        {
            rig = bowlerRoot;
            arm = bowlerArm;
            rig.localPosition = startPos;
        }

        public void StartRunUp()
        {
            running = true;
            runClock = 0f;
        }

        private void Update()
        {
            if (!running || rig == null) return;

            runClock += Time.deltaTime;
            float t = Mathf.Clamp01(runClock / RunUpDuration);
            rig.localPosition = Vector3.Lerp(startPos, releasePos, t);

            if (arm != null)
            {
                // simple arm windmill in the last 40% of the approach
                float armT = Mathf.InverseLerp(0.6f, 1f, t);
                arm.localEulerAngles = new Vector3(-360f * armT, 0, 0);
            }

            if (t >= 1f) running = false;
        }

        public void ResetPosition()
        {
            running = false;
            if (rig != null) rig.localPosition = startPos;
            if (arm != null) arm.localEulerAngles = Vector3.zero;
        }
    }
}
