using UnityEngine;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>Everything built on the field. All transforms the game needs.</summary>
    public class BattingWorld
    {
        public Transform Root;
        public Transform BatsmanRoot;
        public BatsmanRig Batsman;
        public Transform BowlerRoot;
        public Transform BowlerArm;
        public BallController Ball;
        public Transform BallShadow;
        public Transform KeeperMark;
        public Transform StumpsGroup;
        public Transform MiddleStump;
        public Camera Camera;
    }

    /// <summary>
    /// Builds the whole prototype world procedurally: field, pitch, stumps,
    /// batsman/bowler placeholder rigs, lights, camera. Zero art assets.
    /// </summary>
    public static class BattingWorldBuilder
    {
        private static Material mat;

        private static Material Mat(Color c)
        {
            // One shared material swapped per color via materialPropertyBlock would be
            // fancier; for a handful of primitives a tiny cache is fine.
            var m = new Material(Shader.Find("Standard"));
            m.color = c;
            return m;
        }

        private static GameObject Primitive(string name, PrimitiveType type, Transform parent,
                                            Color color, Vector3 pos, Vector3 scale, Vector3? rot = null)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localScale = scale;
            if (rot.HasValue) go.transform.localEulerAngles = rot.Value;
            var r = go.GetComponent<Renderer>();
            r.sharedMaterial = Mat(color);
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            return go;
        }

        public static BattingWorld Build(Transform parent)
        {
            var world = new BattingWorld();
            var root = new GameObject("World");
            root.transform.SetParent(parent, false);
            world.Root = root.transform;

            // ------------------------------------------------ ground & pitch
            var ground = Primitive("Ground", PrimitiveType.Cylinder, root.transform,
                new Color(0.13f, 0.42f, 0.16f), new Vector3(0, -0.05f, 8f), new Vector3(16f, 0.05f, 16f));
            var gc = ground.GetComponent<Collider>();
            if (gc != null)
            {
                var phys = new PhysicMaterial("PitchGround")
                {
                    dynamicFriction = 0.55f,
                    staticFriction = 0.65f,
                    restitution = 0.35f,
                    bounceCombine = PhysicMaterialCombine.Average
                };
                gc.material = phys;
            }

            Primitive("PitchStrip", PrimitiveType.Cube, root.transform,
                new Color(0.72f, 0.62f, 0.42f), new Vector3(0, 0.005f, 10f), new Vector3(3f, 0.01f, 22.5f));
            Primitive("CreaseBat", PrimitiveType.Cube, root.transform,
                Color.white, new Vector3(0, 0.012f, 1.22f), new Vector3(2.6f, 0.006f, 0.06f));
            Primitive("CreaseBowl", PrimitiveType.Cube, root.transform,
                Color.white, new Vector3(0, 0.012f, 18.9f), new Vector3(2.6f, 0.006f, 0.06f));

            // Boundary ring markers (centred on the batsman, matching the 62 m detection radius).
            for (int i = 0; i < 36; i++)
            {
                float a = i * Mathf.Deg2Rad * 10f;
                Primitive("Rope" + i, PrimitiveType.Cube, root.transform,
                    Color.white,
                    new Vector3(Mathf.Sin(a) * 62f, 0.12f, Mathf.Cos(a) * 62f),
                    new Vector3(0.9f, 0.24f, 0.35f),
                    new Vector3(0, -a * Mathf.Rad2Deg, 0));
            }

            // ------------------------------------------------ stumps (batting end)
            var stumps = new GameObject("Stumps");
            stumps.transform.SetParent(root.transform, false);
            stumps.transform.localPosition = new Vector3(0, 0, -1f);
            world.StumpsGroup = stumps.transform;
            Color stumpColor = new Color(0.93f, 0.87f, 0.72f);
            Primitive("StumpL", PrimitiveType.Cylinder, stumps.transform, stumpColor,
                new Vector3(-0.11f, 0.36f, 0), new Vector3(0.05f, 0.36f, 0.05f));
            var mid = Primitive("StumpM", PrimitiveType.Cylinder, stumps.transform, stumpColor,
                new Vector3(0, 0.36f, 0), new Vector3(0.05f, 0.36f, 0.05f));
            world.MiddleStump = mid.transform;
            Primitive("StumpR", PrimitiveType.Cylinder, stumps.transform, stumpColor,
                new Vector3(0.11f, 0.36f, 0), new Vector3(0.05f, 0.36f, 0.05f));
            Primitive("Bail", PrimitiveType.Cube, stumps.transform, stumpColor,
                new Vector3(0, 0.735f, 0), new Vector3(0.30f, 0.02f, 0.02f));

            // Bowler-end stumps (visual only).
            Primitive("BowlStumps", PrimitiveType.Cylinder, root.transform, stumpColor,
                new Vector3(0, 0.36f, 20.9f), new Vector3(0.28f, 0.36f, 0.05f));

            // Keeper marker behind the stumps.
            var keeper = Primitive("Keeper", PrimitiveType.Capsule, root.transform,
                new Color(0.25f, 0.25f, 0.35f), new Vector3(0, 0.85f, -2.6f), new Vector3(0.55f, 0.85f, 0.55f));
            world.KeeperMark = keeper.transform;

            // ------------------------------------------------ batsman rig
            var batsmanGo = new GameObject("Batsman");
            batsmanGo.transform.SetParent(root.transform, false);
            batsmanGo.transform.localPosition = new Vector3(-0.35f, 0, -0.2f);
            world.BatsmanRoot = batsmanGo.transform;
            world.Batsman = BatsmanRig.Build(batsmanGo.transform);

            // ------------------------------------------------ bowler rig
            var bowlerGo = new GameObject("Bowler");
            bowlerGo.transform.SetParent(root.transform, false);
            bowlerGo.transform.localPosition = new Vector3(0.2f, 0, 26f);
            world.BowlerRoot = bowlerGo.transform;
            var body = Primitive("BowlerBody", PrimitiveType.Capsule, bowlerGo.transform,
                new Color(0.75f, 0.22f, 0.2f), new Vector3(0, 0.9f, 0), new Vector3(0.6f, 0.9f, 0.6f));
            Primitive("BowlerHead", PrimitiveType.Sphere, bowlerGo.transform,
                new Color(0.85f, 0.68f, 0.55f), new Vector3(0, 1.95f, 0), new Vector3(0.34f, 0.34f, 0.34f));
            var arm = Primitive("BowlerArm", PrimitiveType.Cube, bowlerGo.transform,
                new Color(0.75f, 0.22f, 0.2f), new Vector3(0.25f, 1.6f, 0), new Vector3(0.12f, 0.7f, 0.12f));
            arm.transform.localPosition = new Vector3(0.3f, 1.55f, 0);
            world.BowlerArm = arm.transform;

            // ------------------------------------------------ ball
            var ballGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            ballGo.name = "Ball";
            ballGo.transform.SetParent(root.transform, false);
            ballGo.transform.localScale = Vector3.one * 0.11f;
            ballGo.GetComponent<Renderer>().sharedMaterial = Mat(new Color(0.85f, 0.1f, 0.1f));
            ballGo.GetComponent<Renderer>().shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            world.Ball = BallController.Attach(ballGo);

            // Blob shadow under the ball (cheap depth cue for mobile).
            var shadowGo = GameObject.CreatePrimitive(PrimitiveType.Quad);
            shadowGo.name = "BallShadow";
            shadowGo.transform.SetParent(root.transform, false);
            shadowGo.transform.localScale = new Vector3(0.28f, 0.28f, 1f);
            shadowGo.transform.localEulerAngles = new Vector3(90f, 0, 0);
            var sr = shadowGo.GetComponent<Renderer>();
            sr.sharedMaterial = new Material(Shader.Find("Unlit/Transparent"));
            sr.sharedMaterial.color = new Color(0, 0, 0, 0.35f);
            sr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            Object.Destroy(shadowGo.GetComponent<Collider>());
            world.BallShadow = shadowGo.transform;

            // ------------------------------------------------ stadium dressing
            BuildStadiumDressing(root.transform);

            // ------------------------------------------------ lights & camera
            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(root.transform, false);
            sunGo.transform.localEulerAngles = new Vector3(48f, 35f, 0);
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 1.15f;
            sun.color = new Color(1f, 0.96f, 0.9f);
            sun.shadows = LightShadows.None; // mobile budget first

            var camGo = new GameObject("Camera");
            camGo.transform.SetParent(parent, false);
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.09f, 0.16f, 0.30f);
            cam.fieldOfView = 55f;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 240f;
            world.Camera = cam;

            return world;
        }

        /// <summary>
        /// Broadcast-style surroundings from cheap primitives: a stand ring
        /// beyond the rope, a sightscreen behind the bowler and four floodlight
        /// towers. No colliders, shadows off - pure backdrop (spec section 2/11).
        /// </summary>
        private static void BuildStadiumDressing(Transform root)
        {
            var stadium = new GameObject("Stadium");
            stadium.transform.SetParent(root, false);

            // Stand ring: segmented blocks just outside the boundary.
            Color standDark = new Color(0.16f, 0.20f, 0.30f);
            Color standLite = new Color(0.24f, 0.29f, 0.42f);
            for (int i = 0; i < 24; i++)
            {
                float a = i * Mathf.Deg2Rad * 15f;
                // Leave a gap behind the keeper for the broadcast sightline.
                if (i == 12) continue;
                float r = 74f;
                Primitive("Stand" + i, PrimitiveType.Cube, stadium.transform,
                    (i & 1) == 0 ? standDark : standLite,
                    new Vector3(Mathf.Sin(a) * r, 3.2f, Mathf.Cos(a) * r),
                    new Vector3(19f, 9f, 6f),
                    new Vector3(0, -a * Mathf.Rad2Deg, 0));
            }

            // Advertising boards inside the rope (solid muted colour, no text).
            Color board = new Color(0.10f, 0.30f, 0.55f);
            for (int i = 0; i < 30; i++)
            {
                float a = i * Mathf.Deg2Rad * 12f;
                Primitive("Board" + i, PrimitiveType.Cube, stadium.transform, board,
                    new Vector3(Mathf.Sin(a) * 65f, 0.45f, Mathf.Cos(a) * 65f),
                    new Vector3(13f, 0.9f, 0.25f),
                    new Vector3(0, -a * Mathf.Rad2Deg, 0));
            }

            // Sightscreen behind the bowler.
            Primitive("Sightscreen", PrimitiveType.Cube, stadium.transform,
                new Color(0.85f, 0.87f, 0.9f), new Vector3(0, 4f, 34f), new Vector3(11f, 8f, 0.4f));

            // Floodlight towers at four diagonal corners.
            Color pole = new Color(0.55f, 0.58f, 0.62f);
            for (int i = 0; i < 4; i++)
            {
                float a = (45f + 90f * i) * Mathf.Deg2Rad;
                Vector3 basePos = new Vector3(Mathf.Sin(a) * 84f, 0, Mathf.Cos(a) * 84f);
                Primitive("FloodPole" + i, PrimitiveType.Cylinder, stadium.transform, pole,
                    basePos + new Vector3(0, 14f, 0), new Vector3(0.9f, 14f, 0.9f));
                Primitive("FloodHead" + i, PrimitiveType.Cube, stadium.transform,
                    new Color(0.92f, 0.92f, 0.85f),
                    basePos + new Vector3(0, 28.5f, 0), new Vector3(4.5f, 2.6f, 0.8f),
                    new Vector3(0, -a * Mathf.Rad2Deg, 0));
            }
        }
    }
}
