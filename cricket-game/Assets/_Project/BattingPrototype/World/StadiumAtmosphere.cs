using System.Collections.Generic;
using CricketGame.BattingPrototype.UI;
using UnityEngine;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>
    /// Phase 5 stadium atmosphere: dusk lighting, floodlight glow, two-tone
    /// advertising boards, tiered crowd colour bands with a cheap sine "wave",
    /// and an extra stand tier on HIGH. Everything is primitive-based and
    /// quality-gated (spec 17/23) - no simulated characters, no new assets.
    /// </summary>
    public sealed class StadiumAtmosphere : MonoBehaviour
    {
        private static StadiumAtmosphere instance;

        private readonly List<Renderer> crowdBands = new List<Renderer>();
        private readonly List<Renderer> glows = new List<Renderer>();
        private readonly List<GameObject> tier2 = new List<GameObject>();
        private readonly List<Transform> flags = new List<Transform>();
        private Color[] bandBase;
        private float waveClock;

        /// <summary>Attach to a built world; tunes lighting + adds dressing.</summary>
        public static StadiumAtmosphere Attach(Transform worldRoot, Camera cam)
        {
            var go = new GameObject("StadiumAtmosphere");
            go.transform.SetParent(worldRoot, false);
            var atmo = go.AddComponent<StadiumAtmosphere>();
            atmo.Build(worldRoot, cam);
            return atmo;
        }

        public static void ApplyQuality(QualityPreset preset)
        {
            HudStats.Quality = preset;
            if (instance != null) instance.Apply();
        }

        private void Build(Transform worldRoot, Camera cam)
        {
            instance = this;

            // ---- dusk broadcast lighting
            if (cam != null) cam.backgroundColor = new Color(0.055f, 0.075f, 0.16f, 1f);
            var sun = worldRoot.Find("Sun");
            if (sun != null)
            {
                var light = sun.GetComponent<Light>();
                if (light != null)
                {
                    light.intensity = 0.85f;
                    light.color = new Color(1f, 0.78f, 0.55f);
                    sun.localEulerAngles = new Vector3(24f, 35f, 0);
                }
            }
            RenderSettings.ambientLight = new Color(0.42f, 0.46f, 0.60f);

            var stadium = worldRoot.Find("Stadium");
            if (stadium == null) return;

            // ---- varied team-neutral ad boards
            Color[] boardPalette =
            {
                new Color(0.05f, 0.32f, 0.55f), new Color(0.55f, 0.35f, 0.05f),
                new Color(0.10f, 0.40f, 0.38f), new Color(0.35f, 0.10f, 0.30f),
            };
            for (int i = 0; i < 30; i++)
            {
                var board = stadium.Find("Board" + i);
                if (board == null) continue;
                var r = board.GetComponent<Renderer>();
                if (r != null)
                {
                    var m = new Material(r.sharedMaterial.shader);
                    m.color = boardPalette[i % boardPalette.Length];
                    r.sharedMaterial = m;
                }
            }

            // ---- crowd colour bands on every stand
            var crowdPalette = new[]
            {
                new Color(0.45f, 0.20f, 0.22f), new Color(0.20f, 0.28f, 0.45f),
                new Color(0.30f, 0.30f, 0.34f), new Color(0.18f, 0.38f, 0.38f),
                new Color(0.42f, 0.34f, 0.16f), new Color(0.30f, 0.20f, 0.42f),
            };
            for (int i = 0; i < 24; i++)
            {
                var stand = stadium.Find("Stand" + i);
                if (stand == null) continue;
                for (int b = 0; b < 3; b++)
                {
                    var band = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    band.name = "Crowd" + i + "_" + b;
                    band.transform.SetParent(stand, false);
                    band.transform.localPosition = new Vector3(0, -2.6f + b * 2.6f, -3.15f);
                    band.transform.localScale = new Vector3(18.4f, 2.1f, 0.25f);
                    var r = band.GetComponent<Renderer>();
                    var m = new Material(Shader.Find("Standard"));
                    m.color = crowdPalette[(i * 3 + b) % crowdPalette.Length];
                    r.sharedMaterial = m;
                    r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                    r.receiveShadows = false;
                    Object.Destroy(band.GetComponent<Collider>());
                    crowdBands.Add(r);
                }
            }
            bandBase = new Color[crowdBands.Count];
            for (int i = 0; i < crowdBands.Count; i++) bandBase[i] = crowdBands[i].sharedMaterial.color;

            // ---- floodlight glow quads
            for (int i = 0; i < 4; i++)
            {
                var head = stadium.Find("FloodHead" + i);
                if (head == null) continue;
                var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
                quad.name = "Glow" + i;
                quad.transform.SetParent(head, false);
                quad.transform.localPosition = new Vector3(0, 0, -0.6f);
                quad.transform.localScale = new Vector3(7.5f, 4.5f, 1f);
                var r = quad.GetComponent<Renderer>();
                var m = new Material(Shader.Find("Unlit/Transparent"));
                m.color = new Color(1f, 0.95f, 0.8f, 0.35f);
                r.sharedMaterial = m;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                Object.Destroy(quad.GetComponent<Collider>());
                glows.Add(r);
            }

            // ---- team-neutral flags on the stand roofs
            Color[] flagPalette =
            {
                new Color(0f, 0.75f, 0.9f), new Color(1f, 0.7f, 0.1f),
                new Color(0.9f, 0.9f, 0.95f), new Color(0.2f, 0.8f, 0.5f),
            };
            for (int i = 0; i < 24; i += 3)
            {
                var stand = stadium.Find("Stand" + i);
                if (stand == null) continue;
                var pole = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pole.name = "FlagPole" + i;
                pole.transform.SetParent(stand, false);
                pole.transform.localPosition = new Vector3(0, 6.2f, -3.2f);
                pole.transform.localScale = new Vector3(0.12f, 1.6f, 0.12f);
                var pr = pole.GetComponent<Renderer>();
                pr.sharedMaterial = new Material(Shader.Find("Standard"));
                pr.sharedMaterial.color = new Color(0.7f, 0.72f, 0.75f);
                pr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                Object.Destroy(pole.GetComponent<Collider>());

                var flag = GameObject.CreatePrimitive(PrimitiveType.Quad);
                flag.name = "Flag" + i;
                flag.transform.SetParent(pole.transform, false);
                flag.transform.localPosition = new Vector3(0.9f, 1.3f, 0);
                flag.transform.localScale = new Vector3(1.7f, 1.0f, 1f);
                var fr = flag.GetComponent<Renderer>();
                var fm = new Material(Shader.Find("Unlit/Color"));
                fm.color = flagPalette[(i / 3) % flagPalette.Length];
                fr.sharedMaterial = fm;
                fr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                Object.Destroy(flag.GetComponent<Collider>());
                flags.Add(flag.transform);
            }

            // ---- extra stand tier (HIGH only)
            for (int i = 0; i < 12; i++)
            {
                float a = (i * 30f + 15f) * Mathf.Deg2Rad;
                var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
                block.name = "Tier2_" + i;
                block.transform.SetParent(stadium, false);
                block.transform.localPosition = new Vector3(Mathf.Sin(a) * 92f, 10f, Mathf.Cos(a) * 92f);
                block.transform.localScale = new Vector3(24f, 8f, 6f);
                block.transform.localEulerAngles = new Vector3(0, -a * Mathf.Rad2Deg, 0);
                var r = block.GetComponent<Renderer>();
                var m = new Material(Shader.Find("Standard"));
                m.color = new Color(0.12f, 0.15f, 0.24f);
                r.sharedMaterial = m;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                Object.Destroy(block.GetComponent<Collider>());
                tier2.Add(block);
            }

            Apply();
        }

        private void Apply()
        {
            bool glow = HudStats.Quality != QualityPreset.Low;
            bool bands = HudStats.Quality != QualityPreset.Low;
            bool high = HudStats.Quality == QualityPreset.High;

            for (int i = 0; i < glows.Count; i++) glows[i].gameObject.SetActive(glow);
            for (int i = 0; i < crowdBands.Count; i++)
            {
                // LOW keeps every second band only (cheap), MEDIUM/HIGH all.
                bool show = bands || (i % 2 == 0);
                crowdBands[i].gameObject.SetActive(show);
            }
            for (int i = 0; i < tier2.Count; i++) tier2[i].SetActive(high);

            QualitySettings.shadowDistance = high ? 60f : 0f;
        }

        private void Update()
        {
            if (HudStats.Quality == QualityPreset.Low || crowdBands.Count == 0) return;
            waveClock += Time.deltaTime;
            // cheap crowd shimmer: brightness ripple around the ring
            for (int i = 0; i < crowdBands.Count; i++)
            {
                float w = 0.88f + 0.12f * Mathf.Sin(waveClock * 1.7f + i * 0.35f);
                crowdBands[i].sharedMaterial.color = bandBase[i] * w;
            }
            for (int i = 0; i < flags.Count; i++)
            {
                flags[i].localEulerAngles = new Vector3(0, Mathf.Sin(waveClock * 2.3f + i) * 22f, 0);
            }
        }
    }
}
