using UnityEngine;

namespace CricketGame.BattingPrototype.Batsman
{
    /// <summary>
    /// Placeholder batsman built from primitives with a shoulder pivot that
    /// carries the bat. All animation is procedural (no art assets yet).
    /// </summary>
    public class BatsmanRig : MonoBehaviour
    {
        public Transform Hips;
        public Transform Torso;
        public Transform ShoulderPivot;
        public Transform Bat;

        private Vector3 hipsHome;
        private Vector3 torsoHomeLocal;
        private Quaternion shoulderHome;

        public static BatsmanRig Build(Transform root)
        {
            var rigGo = new GameObject("Rig");
            rigGo.transform.SetParent(root, false);
            var rig = rigGo.AddComponent<BatsmanRig>();

            Color pad = new Color(0.92f, 0.92f, 0.94f);
            Color shirt = new Color(0.15f, 0.35f, 0.75f);
            Color skin = new Color(0.85f, 0.68f, 0.55f);
            Color wood = new Color(0.86f, 0.72f, 0.5f);

            var hips = CreatePart("Hips", PrimitiveType.Cube, rigGo.transform, shirt,
                new Vector3(0, 0.92f, 0), new Vector3(0.42f, 0.28f, 0.26f));
            CreatePart("LegL", PrimitiveType.Capsule, rigGo.transform, pad,
                new Vector3(-0.12f, 0.45f, 0), new Vector3(0.16f, 0.45f, 0.16f));
            CreatePart("LegR", PrimitiveType.Capsule, rigGo.transform, pad,
                new Vector3(0.12f, 0.45f, 0), new Vector3(0.16f, 0.45f, 0.16f));
            var torso = CreatePart("Torso", PrimitiveType.Capsule, rigGo.transform, shirt,
                new Vector3(0, 1.28f, 0), new Vector3(0.4f, 0.42f, 0.4f));
            CreatePart("Head", PrimitiveType.Sphere, rigGo.transform, skin,
                new Vector3(0, 1.72f, 0), new Vector3(0.3f, 0.3f, 0.3f));
            CreatePart("Helmet", PrimitiveType.Sphere, rigGo.transform, new Color(0.2f, 0.3f, 0.6f),
                new Vector3(0, 1.78f, 0.02f), new Vector3(0.32f, 0.22f, 0.32f));

            // Shoulder pivot on the off side; the bat hangs from it.
            var pivotGo = new GameObject("ShoulderPivot");
            pivotGo.transform.SetParent(rigGo.transform, false);
            pivotGo.transform.localPosition = new Vector3(0.24f, 1.45f, 0.05f);
            CreatePart("Arm", PrimitiveType.Capsule, pivotGo.transform, shirt,
                new Vector3(0.1f, -0.1f, 0.05f), new Vector3(0.12f, 0.28f, 0.12f),
                new Vector3(0, 0, -35f));

            var bat = CreatePart("Bat", PrimitiveType.Cube, pivotGo.transform, wood,
                new Vector3(0.22f, -0.52f, 0.12f), new Vector3(0.11f, 0.75f, 0.05f));

            rig.Hips = hips;
            rig.Torso = torso;
            rig.ShoulderPivot = pivotGo.transform;
            rig.Bat = bat;

            rig.hipsHome = hips.localPosition;
            rig.torsoHomeLocal = torso.localPosition;
            rig.shoulderHome = pivotGo.transform.localRotation;
            rig.SetStancePose();

            var swing = rigGo.AddComponent<BatSwingController>();
            swing.Rig = rig;
            var anim = rigGo.AddComponent<BattingAnimationController>();
            anim.Rig = rig;
            anim.Swing = swing;
            return rig;
        }

        private static Transform CreatePart(string name, PrimitiveType type, Transform parent,
                                            Color color, Vector3 pos, Vector3 scale, Vector3? rot = null)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            if (rot.HasValue) go.transform.localEulerAngles = rot.Value;
            go.GetComponent<Renderer>().sharedMaterial = new Material(Shader.Find("Standard")) { color = color };
            go.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            Object.Destroy(go.GetComponent<Collider>());
            return go.transform;
        }

        private void SetStancePose()
        {
            // Side-on stance, bat lifted in a relaxed backlift.
            ShoulderPivot.localRotation = Quaternion.Euler(new Vector3(-38f, 12f, -24f));
        }

        /// <summary>
        /// Applies footwork: shifts the whole rig with the feet and leans into the stride.
        /// The engine's footwork offsets are in metres, already clamped to the crease box.
        /// </summary>
        public void ApplyFootwork(float x, float z, FootPoseKind pose)
        {
            Vector3 target = new Vector3(x, 0f, z);
            transform.localPosition = Vector3.Lerp(transform.localPosition, target, 0.55f);

            float leanZ = pose == FootPoseKind.Front ? 9f : pose == FootPoseKind.Back ? -8f : 0f;
            float leanX = Mathf.Clamp(x * 4f, -7f, 7f);
            Torso.localRotation = Quaternion.Slerp(Torso.localRotation,
                Quaternion.Euler(new Vector3(leanZ, 0, leanX)), 0.35f);
        }

        /// <summary>Idle breathing sway so the stance never looks frozen.</summary>
        public void ApplyIdleSway(float time)
        {
            Vector3 p = hipsHome;
            p.y += Mathf.Sin(time * 2.1f) * 0.012f;
            Hips.localPosition = p;
        }

        public void ResetPose()
        {
            ShoulderPivot.localRotation = shoulderHome;
            Torso.localRotation = Quaternion.identity;
            SetStancePose();
        }
    }

    public enum FootPoseKind { Neutral, Front, Back }
}
