using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Phase 4 (spec section 1): contextual shot animation selection. The
    /// animation depends on ball line, ball length, batsman position,
    /// footwork, shot direction, intent and timing - never one generic swing.
    /// Pure resolver (no MonoBehaviour): the result can later drive real
    /// animation clips without touching gameplay logic.
    /// </summary>
    public enum BatAnimationKind
    {
        // Shots
        FrontFootDefense, BackFootDefense,
        StraightDrive, CoverDrive, SquareDrive,
        Cut, Pull, Hook, Flick, LegGlance,
        LoftedDrive, LoftedLegSide,
        // Reactions / non-contact
        Leave, Miss, Edge, BowledReaction, WicketReaction, BeatenShrugg
    }

    /// <summary>Everything the animation layer needs to play one shot/reaction.</summary>
    public struct ShotAnimationSpec
    {
        public BatAnimationKind Kind;
        public float YawDeg;        // follow-through direction (0 = straight)
        public float LiftDeg;       // vertical arc height
        public float TorsoLeanDeg;  // +forward / -back
        public float Duration;      // full gesture length (responsiveness first)
        public float ContactFraction;   // where in the gesture the bat meets ball
        public bool Awkward;        // mistimed/stretched flavour
        public TimingWindow Window; // timing quality flavours the snap
    }

    public static class ShotAnimationResolver
    {
        /// <summary>Resolves the animation for a committed swing.</summary>
        public static ShotAnimationSpec Resolve(SwingReport report, FootPoseKind pose)
        {
            var spec = new ShotAnimationSpec
            {
                Window = report.Window,
                Awkward = report.Selection.Awkward,
                YawDeg = report.Direction.AngleFromStraight * Mathf.Rad2Deg,
                Duration = 0.52f,
                ContactFraction = 0.45f,
                TorsoLeanDeg = 0f
            };

            // Timing flavours the follow-through, never the shot identity.
            if (report.Window == TimingWindow.Perfect) spec.Duration = 0.48f;
            if (report.Window == TimingWindow.VeryEarly || report.Window == TimingWindow.VeryLate)
                spec.Awkward = true;

            switch (report.Selection.Kind)
            {
                case ShotKind.FrontFootDefense:
                    spec.Kind = BatAnimationKind.FrontFootDefense;
                    spec.LiftDeg = 4f; spec.TorsoLeanDeg = 10f;
                    spec.Duration = 0.38f; spec.ContactFraction = 0.5f;
                    break;
                case ShotKind.BackFootDefense:
                    spec.Kind = BatAnimationKind.BackFootDefense;
                    spec.LiftDeg = 6f; spec.TorsoLeanDeg = -8f;
                    spec.Duration = 0.38f; spec.ContactFraction = 0.5f;
                    break;
                case ShotKind.StraightDrive:
                    spec.Kind = BatAnimationKind.StraightDrive;
                    spec.LiftDeg = 16f; spec.TorsoLeanDeg = 8f;
                    break;
                case ShotKind.CoverDrive:
                    spec.Kind = BatAnimationKind.CoverDrive;
                    spec.LiftDeg = 14f; spec.TorsoLeanDeg = 7f;
                    break;
                case ShotKind.SquareDrive:
                    spec.Kind = BatAnimationKind.SquareDrive;
                    spec.LiftDeg = 12f; spec.TorsoLeanDeg = 4f;
                    break;
                case ShotKind.Cut:
                    spec.Kind = BatAnimationKind.Cut;
                    spec.LiftDeg = 18f; spec.TorsoLeanDeg = -4f;
                    spec.Duration = 0.46f;
                    break;
                case ShotKind.Pull:
                    // Very short + behind-square pulls play as a hook gesture.
                    bool hooking = report.Delivery.Length > 0.85f
                        && report.Direction.AngleFromStraight < -0.7f;
                    spec.Kind = hooking ? BatAnimationKind.Hook : BatAnimationKind.Pull;
                    spec.LiftDeg = report.Selection.Lofted ? 52f : (hooking ? 44f : 30f);
                    spec.TorsoLeanDeg = hooking ? -10f : -6f;
                    if (hooking) spec.Duration = 0.44f;
                    break;
                case ShotKind.Flick:
                    spec.Kind = BatAnimationKind.Flick;
                    spec.LiftDeg = 15f; spec.TorsoLeanDeg = 5f;
                    break;
                case ShotKind.LegGlance:
                    spec.Kind = BatAnimationKind.LegGlance;
                    spec.LiftDeg = 10f; spec.TorsoLeanDeg = 3f;
                    spec.Duration = 0.44f;
                    break;
                case ShotKind.LoftedDrive:
                case ShotKind.LoftedStraight:
                    spec.Kind = BatAnimationKind.LoftedDrive;
                    spec.LiftDeg = 58f; spec.TorsoLeanDeg = 9f;
                    spec.Duration = 0.58f;
                    break;
                case ShotKind.LoftedLegSide:
                    spec.Kind = BatAnimationKind.LoftedLegSide;
                    spec.LiftDeg = 54f; spec.TorsoLeanDeg = -5f;
                    spec.Duration = 0.58f;
                    break;
                default:
                    // Awkward stabs/pokes: compact, off-balance gesture.
                    spec.Kind = ClosestComfortableShot(report, pose);
                    spec.LiftDeg = 8f;
                    spec.Awkward = true;
                    spec.Duration = 0.42f;
                    break;
            }
            return spec;
        }

        /// <summary>Unstruck outcomes: leave, miss, beaten, bowled.</summary>
        public static ShotAnimationSpec ResolveReaction(bool swung, bool wicket,
                                                        bool lbw)
        {
            var spec = new ShotAnimationSpec
            {
                Duration = 0.6f,
                ContactFraction = 1f,
                Window = TimingWindow.Missed
            };
            if (wicket)
            {
                spec.Kind = lbw ? BatAnimationKind.WicketReaction : BatAnimationKind.BowledReaction;
                spec.Duration = 0.85f;
            }
            else if (swung)
            {
                spec.Kind = BatAnimationKind.BeatenShrugg;
                spec.Duration = 0.5f;
            }
            else
            {
                spec.Kind = BatAnimationKind.Leave;
                spec.Duration = 0.45f;
            }
            return spec;
        }

        /// <summary>Edges reuse the committed shot shape but deflect the arc.</summary>
        public static ShotAnimationSpec ResolveEdge(SwingReport report)
        {
            var spec = Resolve(report, FootPoseKind.Neutral);
            spec.Kind = BatAnimationKind.Edge;
            spec.YawDeg += 95f;          // bat face opens, ball squirts behind
            spec.LiftDeg = 26f;
            spec.Awkward = true;
            return spec;
        }

        /// <summary>When the engine flags a shot awkward, snap to the nearest
        /// believable gesture so the animation never looks broken.</summary>
        private static BatAnimationKind ClosestComfortableShot(SwingReport report,
                                                               FootPoseKind pose)
        {
            float length = report.Delivery.Length;
            if (length < 0.35f) return pose == FootPoseKind.Back
                ? BatAnimationKind.FrontFootDefense : BatAnimationKind.StraightDrive;
            if (length < 0.72f) return BatAnimationKind.CoverDrive;
            return BatAnimationKind.Pull;
        }
    }
}
