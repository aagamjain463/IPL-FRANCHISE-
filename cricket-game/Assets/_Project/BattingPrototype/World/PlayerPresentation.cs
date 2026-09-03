using UnityEngine;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>
    /// Phase 5 player presentation (spec section 6): team kits, batting
    /// equipment (helmet peak, pads, gloves), fielding caps, keeper gloves and
    /// two umpires - all primitive-based and swapped per innings. Gameplay
    /// rigs and animation controllers are untouched; this only dresses them.
    /// </summary>
    public sealed class PlayerPresentation : MonoBehaviour
    {
        private Transform root;
        private BattingWorld world;

        // batsman equipment refs (recoloured on side swap)
        private Renderer batShirtTorso, batShirtHips, batShirtArm, batHelmet;
        private readonly System.Collections.Generic.List<Renderer> fielderBodies
            = new System.Collections.Generic.List<Renderer>();
        private readonly System.Collections.Generic.List<Renderer> fielderCaps
            = new System.Collections.Generic.List<Renderer>();
        private Renderer keeperGloveL, keeperGloveR;
        private Renderer bowlerBody, bowlerArm;

        public static PlayerPresentation Attach(Transform root, BattingWorld world)
        {
            var go = new GameObject("PlayerPresentation");
            go.transform.SetParent(root, false);
            var p = go.AddComponent<PlayerPresentation>();
            p.root = root;
            p.world = world;
            p.DressBatsman();
            p.DressBowler();
            p.DressFielders();
            p.BuildUmpires();
            return p;
        }

        /// <summary>Apply team kits for the current innings.</summary>
        public void SetSides(bool playerBatting)
        {
            TeamKit.Kit batting = playerBatting ? TeamKit.You : TeamKit.Ai;
            TeamKit.Kit fielding = playerBatting ? TeamKit.Ai : TeamKit.You;

            if (batShirtTorso != null) batShirtTorso.sharedMaterial.color = batting.Shirt;
            if (batShirtHips != null) batShirtHips.sharedMaterial.color = batting.Shirt;
            if (batShirtArm != null) batShirtArm.sharedMaterial.color = batting.Shirt;
            if (batHelmet != null) batHelmet.sharedMaterial.color = batting.Helmet;

            if (bowlerBody != null) bowlerBody.sharedMaterial.color = fielding.Shirt;
            if (bowlerArm != null) bowlerArm.sharedMaterial.color = fielding.Shirt;

            for (int i = 0; i < fielderBodies.Count; i++)
            {
                fielderBodies[i].sharedMaterial.color = fielding.Shirt;
                fielderCaps[i].sharedMaterial.color = fielding.Helmet;
            }
        }

        // ------------------------------------------------------------------ batsman

        private void DressBatsman()
        {
            var rig = world.BatsmanRoot.Find("Rig");
            if (rig == null) return;

            batShirtTorso = Mat(rig.Find("Torso"));
            batShirtHips = Mat(rig.Find("Hips"));
            var pivot = rig.Find("ShoulderPivot");
            if (pivot != null) batShirtArm = Mat(pivot.Find("Arm"));
            batHelmet = Mat(rig.Find("Helmet"));

            // helmet peak (faces the bowler, +z)
            AddPart(rig, "HelmetPeak", PrimitiveType.Cube, new Color(0.1f, 0.1f, 0.12f),
                    new Vector3(0, 1.74f, 0.30f), new Vector3(0.22f, 0.03f, 0.14f));
            // pads on both legs
            AddPart(rig, "PadL", PrimitiveType.Cube, new Color(0.93f, 0.93f, 0.95f),
                    new Vector3(-0.12f, 0.42f, -0.14f), new Vector3(0.15f, 0.42f, 0.07f));
            AddPart(rig, "PadR", PrimitiveType.Cube, new Color(0.93f, 0.93f, 0.95f),
                    new Vector3(0.12f, 0.42f, -0.14f), new Vector3(0.15f, 0.42f, 0.07f));
            // batting gloves at the grip
            if (pivot != null)
            {
                AddPart(pivot, "GloveL", PrimitiveType.Sphere, new Color(0.95f, 0.95f, 0.97f),
                        new Vector3(0.16f, -0.38f, 0.10f), new Vector3(0.09f, 0.09f, 0.09f));
                AddPart(pivot, "GloveR", PrimitiveType.Sphere, new Color(0.95f, 0.95f, 0.97f),
                        new Vector3(0.24f, -0.50f, 0.14f), new Vector3(0.09f, 0.09f, 0.09f));
            }
        }

        // ------------------------------------------------------------------ bowler

        private void DressBowler()
        {
            bowlerBody = Mat(world.BowlerRoot.Find("BowlerBody"));
            bowlerArm = Mat(world.BowlerRoot.Find("BowlerArm"));
            AddPart(world.BowlerRoot, "Cap", PrimitiveType.Sphere, new Color(0.2f, 0.2f, 0.25f),
                    new Vector3(0, 2.12f, 0), new Vector3(0.30f, 0.14f, 0.30f));
        }

        // ------------------------------------------------------------------ fielders

        private void DressFielders()
        {
            foreach (var name in new[]
            {
                "keeper", "bowler", "slip", "point", "cover", "mid_off", "mid_on",
                "mid_wicket", "square_leg", "fine_leg", "third_man"
            })
            {
                var f = root.Find("Fielder_" + name);
                if (f == null) continue;
                var body = f.GetComponent<Renderer>();
                if (body == null) continue;
                fielderBodies.Add(body);

                var cap = AddPart(f, "Cap", PrimitiveType.Sphere, new Color(0.2f, 0.2f, 0.25f),
                                  new Vector3(0, 1.02f, 0), new Vector3(0.42f, 0.18f, 0.42f));
                fielderCaps.Add(cap);

                if (name == "keeper")
                {
                    keeperGloveL = AddPart(f, "KGloveL", PrimitiveType.Sphere,
                                           new Color(0.95f, 0.9f, 0.7f),
                                           new Vector3(-0.45f, 0.1f, -0.2f),
                                           new Vector3(0.22f, 0.22f, 0.12f));
                    keeperGloveR = AddPart(f, "KGloveR", PrimitiveType.Sphere,
                                           new Color(0.95f, 0.9f, 0.7f),
                                           new Vector3(0.45f, 0.1f, -0.2f),
                                           new Vector3(0.22f, 0.22f, 0.12f));
                }
            }
        }

        // ------------------------------------------------------------------ umpires

        private void BuildUmpires()
        {
            MakeUmpire(new Vector3(0.4f, 0f, 22.8f), 180f);   // bowler's end
            MakeUmpire(new Vector3(-16f, 0f, 4f), 90f);      // square leg
        }

        private void MakeUmpire(Vector3 pos, float rotY)
        {
            var go = new GameObject("Umpire");
            go.transform.SetParent(root, false);
            go.transform.localPosition = pos;
            go.transform.localEulerAngles = new Vector3(0, rotY, 0);

            AddPart(go.transform, "Legs", PrimitiveType.Cube, new Color(0.1f, 0.1f, 0.12f),
                    new Vector3(0, 0.45f, 0), new Vector3(0.34f, 0.45f, 0.22f));
            AddPart(go.transform, "Coat", PrimitiveType.Capsule, new Color(0.92f, 0.93f, 0.95f),
                    new Vector3(0, 1.15f, 0), new Vector3(0.42f, 0.5f, 0.3f));
            AddPart(go.transform, "Head", PrimitiveType.Sphere, new Color(0.8f, 0.65f, 0.5f),
                    new Vector3(0, 1.78f, 0), new Vector3(0.26f, 0.26f, 0.26f));
            AddPart(go.transform, "Hat", PrimitiveType.Sphere, new Color(0.12f, 0.12f, 0.15f),
                    new Vector3(0, 1.92f, 0), new Vector3(0.30f, 0.12f, 0.30f));
        }

        // ------------------------------------------------------------------ helpers

        private static Renderer Mat(Transform t)
        {
            return t != null ? t.GetComponent<Renderer>() : null;
        }

        private static Renderer AddPart(Transform parent, string name, PrimitiveType type,
                                        Color color, Vector3 pos, Vector3 scale)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = new Material(Shader.Find("Standard"));
            r.sharedMaterial.color = color;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            Object.Destroy(go.GetComponent<Collider>());
            return r;
        }
    }
}
