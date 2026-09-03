using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Phase 4 (spec section 2): smooth footwork blending. Moves the rig with
    /// critically-damped following so there is never visible snapping between
    /// READY -> FOOTWORK -> SHOT, and leans the torso into front/back strides.
    /// </summary>
    public class FootworkAnimationController
    {
        private readonly BatsmanRig rig;
        private Vector3 velocity;

        public FootworkAnimationController(BatsmanRig rig)
        {
            this.rig = rig;
        }

        /// <summary>dt-scaled smoothing keeps blends frame-rate independent.</summary>
        public void Apply(FootworkState foot, float dt)
        {
            FootPose pose = FootworkController.Pose(foot);
            FootPoseKind kind = pose == FootPose.FrontFoot ? FootPoseKind.Front
                : pose == FootPose.BackFoot ? FootPoseKind.Back : FootPoseKind.Neutral;

            Vector3 target = new Vector3(foot.X, 0f, foot.Z);
            // SmoothDamp: fast enough to feel responsive, soft enough to blend.
            Vector3 pos = rig.transform.localPosition;
            pos = Vector3.SmoothDamp(pos, target, ref velocity, 0.10f, 6.5f, dt);
            rig.transform.localPosition = pos;

            float leanZ = kind == FootPoseKind.Front ? 9f
                        : kind == FootPoseKind.Back ? -8f : 0f;
            float leanX = Mathf.Clamp(foot.X * 4f, -7f, 7f);
            Quaternion targetLean = Quaternion.Euler(new Vector3(leanZ, 0f, leanX));
            float k = 1f - Mathf.Exp(-14f * dt);
            rig.Torso.localRotation = Quaternion.Slerp(rig.Torso.localRotation, targetLean, k);
        }

        /// <summary>Idle breathing sway so the stance never looks frozen.</summary>
        public void ApplyIdle(float time, float dt)
        {
            rig.ApplyIdleSway(time);
            // Ease the torso back to neutral while waiting.
            float k = 1f - Mathf.Exp(-6f * dt);
            rig.Torso.localRotation = Quaternion.Slerp(rig.Torso.localRotation,
                                                       Quaternion.identity, k * 0.5f);
        }

        public void Reset()
        {
            velocity = Vector3.zero;
        }
    }
}
