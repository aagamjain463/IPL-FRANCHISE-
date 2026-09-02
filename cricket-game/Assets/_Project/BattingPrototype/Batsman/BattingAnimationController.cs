using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Chooses which procedural animation layer drives the batsman each frame:
    /// idle sway in stance, footwork-driven movement, or recovery after a swing.
    /// Placeholder-quality by design; a future phase can replace this with
    /// real animation clips without touching the engine.
    /// </summary>
    public class BattingAnimationController : MonoBehaviour
    {
        public BatsmanRig Rig;
        public BatSwingController Swing;

        private float recoveryTimer;

        public void NotifySwingPlayed()
        {
            recoveryTimer = 0.9f; // hold the follow-through a moment after the swing
        }

        private void Update()
        {
            if (recoveryTimer > 0f)
            {
                recoveryTimer -= Time.deltaTime;
            }

            if (!Swing.Swinging)
            {
                Rig.ApplyIdleSway(Time.time);
            }
        }

        /// <summary>Applies the engine's footwork state to the rig (called by the runner).</summary>
        public void ApplyEngineFootwork(FootworkState foot)
        {
            FootPose pose = FootworkController.Pose(foot);
            FootPoseKind kind = pose == FootPose.FrontFoot ? FootPoseKind.Front
                : pose == FootPose.BackFoot ? FootPoseKind.Back : FootPoseKind.Neutral;
            Rig.ApplyFootwork(foot.X, foot.Z, kind);
        }
    }
}
