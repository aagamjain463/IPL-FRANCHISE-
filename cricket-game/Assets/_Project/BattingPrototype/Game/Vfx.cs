using System.Collections.Generic;
using CricketGame.BattingPrototype.World;
using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Game
{
    /// <summary>
    /// Phase 5 subtle VFX (spec 19): pooled expanding contact rings (colour by
    /// timing tier), boundary rings at the rope, and a bail-pop on wickets.
    /// Everything is a handful of unlit quads - gameplay readability first.
    /// </summary>
    public sealed class Vfx : MonoBehaviour
    {
        private sealed class Ring
        {
            public Renderer Renderer;
            public Transform Transform;
            public float T = -1f;
            public float Life = 0.5f;
            public float StartScale = 0.6f;
            public float Grow = 7f;
        }

        private readonly List<Ring> rings = new List<Ring>();
        private BattingWorld world;

        private Transform bail;
        private Vector3 bailHome;
        private float bailT = -1f;

        public void Bind(GameplayEvents events, BattingWorld worldRef)
        {
            world = worldRef;
            if (world != null && world.StumpsGroup != null)
            {
                bail = world.StumpsGroup.Find("Bail");
                if (bail != null) bailHome = bail.localPosition;
            }

            for (int i = 0; i < 10; i++)
            {
                var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
                quad.name = "VfxRing" + i;
                quad.transform.SetParent(transform, false);
                quad.transform.localEulerAngles = new Vector3(90f, 0, 0);
                var r = quad.GetComponent<Renderer>();
                r.sharedMaterial = new Material(Shader.Find("Unlit/Transparent"));
                r.sharedMaterial.color = new Color(1, 1, 1, 0);
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                Object.Destroy(quad.GetComponent<Collider>());
                rings.Add(new Ring { Renderer = r, Transform = quad.transform });
            }

            events.ShotPlayed += OnShot;
            events.Boundary += OnBoundary;
            events.Wicket += OnWicket;
        }

        private void OnShot(SwingReport report)
        {
            if (world == null) return;
            Color c;
            float grow = 5f;
            switch (report.Window)
            {
                case TimingWindow.Perfect: c = new Color(1f, 0.83f, 0.25f); grow = 8f; break;
                case TimingWindow.Good: c = new Color(0.35f, 1f, 0.55f); break;
                case TimingWindow.Early:
                case TimingWindow.Late: c = new Color(1f, 0.7f, 0.3f); break;
                default: c = new Color(1f, 0.4f, 0.35f); break;
            }
            var p = world.BatsmanRoot.position + new Vector3(0, 1.1f, 0);
            Spawn(p, c, 0.5f, 0.45f, grow);
        }

        private void OnBoundary(int runs, bool six)
        {
            if (world == null || world.Ball == null) return;
            var c = six ? new Color(1f, 0.83f, 0.25f) : new Color(0.3f, 0.85f, 1f);
            Spawn(world.Ball.transform.position + new Vector3(0, 0.15f, 0), c, 0.55f, 1.4f, 10f);
        }

        private void OnWicket(ShotOutcomeResult result)
        {
            bailT = 0f;   // bail pop handled in Update
        }

        private void Spawn(Vector3 pos, Color color, float life, float startScale, float grow)
        {
            Ring free = null;
            foreach (var r in rings) { if (r.T < 0) { free = r; break; } }
            if (free == null) free = rings[0];
            free.T = 0f;
            free.Life = life;
            free.StartScale = startScale;
            free.Grow = grow;
            free.Transform.position = pos;
            free.Renderer.sharedMaterial.color = color;
        }

        private void Update()
        {
            foreach (var r in rings)
            {
                if (r.T < 0) continue;
                r.T += Time.deltaTime;
                float k = r.T / r.Life;
                if (k >= 1f)
                {
                    r.T = -1f;
                    var done = r.Renderer.sharedMaterial.color; done.a = 0f;
                    r.Renderer.sharedMaterial.color = done;
                    continue;
                }
                float s = r.StartScale + r.Grow * k;
                r.Transform.localScale = new Vector3(s, s, 1f);
                var c = r.Renderer.sharedMaterial.color;
                c.a = 0.75f * (1f - k);
                r.Renderer.sharedMaterial.color = c;
            }

            if (bailT >= 0f && bail != null)
            {
                bailT += Time.deltaTime;
                float k = bailT / 0.9f;
                if (k >= 1f)
                {
                    bailT = -1f;
                    bail.localPosition = bailHome;
                    bail.localEulerAngles = Vector3.zero;
                }
                else
                {
                    var p = bailHome;
                    p.y += Mathf.Sin(Mathf.Min(1f, k) * Mathf.PI) * 0.9f;
                    p.z -= k * 0.8f;
                    bail.localPosition = p;
                    bail.localEulerAngles = new Vector3(0, 0, k * 540f);
                }
            }
        }
    }
}
