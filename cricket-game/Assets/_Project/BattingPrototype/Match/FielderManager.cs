using System.Collections.Generic;
using CricketGame.Core.Fielding;
using UnityEngine;

namespace CricketGame.BattingPrototype.Match
{
    /// <summary>
    /// Visual fielders (spec sections 6-11). Positions and behaviour come
    /// straight from the deterministic Core.Fielding simulation - this manager
    /// only presents the result: sprint to the chase target, arrive when the
    /// sim says the play happens, catch/stop pose, then walk home.
    /// </summary>
    public sealed class FielderManager : MonoBehaviour
    {
        private sealed class FielderView
        {
            public Transform Root;
            public Transform Body;
            public Renderer BodyRenderer;
            public Vector3 Home;
            public Color HomeColor;
            public bool Chasing;
            public Vector3 ChaseTarget;
        }

        private readonly List<FielderView> views = new List<FielderView>();
        private FieldingResult pending;
        private float struckClock;
        private bool playActive;

        private static readonly Color RingColor = new Color(0.95f, 0.95f, 0.98f);
        private static readonly Color BackColor = new Color(0.85f, 0.85f, 0.95f);
        private static readonly Color KeeperColor = new Color(1f, 0.82f, 0.45f);
        private static readonly Color FlashColor = new Color(0.35f, 0.95f, 0.55f);

        public int FielderCount { get { return views.Count; } }

        /// <summary>Builds the 9 fielders + bowler + keeper at their spec
        /// positions. Called once by the bootstrap.</summary>
        public void Build(Transform parent)
        {
            for (int i = 0; i < FieldSetup.Default.Length; i++)
            {
                FielderSpec spec = FieldSetup.Default[i];
                var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                go.name = "Fielder_" + spec.Name;
                go.transform.SetParent(parent, false);
                go.transform.position = new Vector3(spec.X, 1.0f, spec.Z);
                go.transform.localScale = new Vector3(0.85f, 1.0f, 0.85f);
                Object.Destroy(go.GetComponent<Collider>());

                Color c = spec.Name == "keeper" ? KeeperColor
                        : spec.Name == "bowler" ? BackColor : RingColor;
                var renderer = go.GetComponent<Renderer>();
                renderer.sharedMaterial = new Material(Shader.Find("Standard"));
                renderer.sharedMaterial.color = c;

                views.Add(new FielderView
                {
                    Root = go.transform,
                    Body = go.transform,
                    BodyRenderer = renderer,
                    Home = new Vector3(spec.X, 1.0f, spec.Z),
                    HomeColor = c,
                });
            }
        }

        /// <summary>Called before every delivery: everyone walks home.</summary>
        public void BeginDelivery()
        {
            pending = null;
            playActive = false;
            struckClock = 0f;
            for (int i = 0; i < views.Count; i++)
            {
                views[i].Chasing = false;
                views[i].BodyRenderer.sharedMaterial.color = views[i].HomeColor;
                views[i].Root.localRotation = Quaternion.identity;
            }
        }

        /// <summary>The ball was struck: schedule the field's reaction.</summary>
        public void OnBallStruck(FieldingResult result)
        {
            pending = result;
            playActive = true;
            struckClock = 0f;

            for (int i = 0; i < views.Count; i++) views[i].Chasing = false;
            if (result == null) return;

            for (int c = 0; c < result.Chased.Count; c++)
            {
                ChaseHint hint = result.Chased[c];
                if (hint.FielderIndex < 0 || hint.FielderIndex >= views.Count) continue;
                FielderView v = views[hint.FielderIndex];
                v.Chasing = true;
                // The resolving fielder runs to the play itself; everyone else
                // cuts toward where the ball was when they reacted.
                v.ChaseTarget = hint.FielderIndex == result.FielderIndex
                    ? new Vector3(result.Pos.X, 1.0f, result.Pos.Z)
                    : new Vector3(hint.Target.X, 1.0f, hint.Target.Y);
            }
        }

        /// <summary>Advances the struck-ball presentation clock.</summary>
        public void AdvanceStruckClock(float dt)
        {
            if (!playActive) return;
            struckClock += dt;

            for (int i = 0; i < views.Count; i++)
            {
                FielderView v = views[i];
                if (!v.Chasing) continue;

                Vector3 pos = v.Root.position;
                Vector3 target = v.ChaseTarget;

                if (pending != null && i == pending.FielderIndex && pending.Time > 0.01f)
                {
                    // Arrive exactly when the sim says the play happens.
                    float remaining = pending.Time - struckClock;
                    if (remaining <= 0f)
                    {
                        v.Root.position = target;
                        PlayResolutionPose(v);
                        continue;
                    }
                    float dist = Vector3.Distance(pos, target);
                    float speed = Mathf.Min(dist / remaining, 9.5f);
                    v.Root.position = Vector3.MoveTowards(pos, target, speed * dt);
                    FaceDirection(v, target - pos);
                }
                else
                {
                    // Support chasers: close most of the distance, then hold.
                    if (Vector3.Distance(pos, target) > 1.2f)
                        v.Root.position = Vector3.MoveTowards(pos, target, 5.5f * dt);
                }
            }
        }

        private void PlayResolutionPose(FielderView v)
        {
            v.Chasing = false;
            v.BodyRenderer.sharedMaterial.color = FlashColor;
            if (pending != null && pending.Kind == FieldingKind.Caught)
            {
                // Hands up: lean back and stretch.
                v.Root.localRotation = Quaternion.Euler(-14f, v.Root.localRotation.eulerAngles.y, 0f);
                v.Root.localScale = new Vector3(0.85f, 1.12f, 0.85f);
            }
            else
            {
                // Collecting low: crouch.
                v.Root.localScale = new Vector3(0.9f, 0.72f, 0.9f);
            }
        }

        private static void FaceDirection(FielderView v, Vector3 dir)
        {
            dir.y = 0f;
            if (dir.sqrMagnitude > 1e-4f)
                v.Root.rotation = Quaternion.LookRotation(dir);
        }

        private void Update()
        {
            // Idle walk-home between deliveries (cheap: a few fielders only).
            if (playActive) return;
            for (int i = 0; i < views.Count; i++)
            {
                FielderView v = views[i];
                Vector3 pos = v.Root.position;
                if (Vector3.Distance(pos, v.Home) > 0.05f)
                {
                    v.Root.position = Vector3.MoveTowards(pos, v.Home, 4.5f * Time.deltaTime);
                    FaceDirection(v, v.Home - pos);
                }
                // Ease any pose scaling back.
                Vector3 s = v.Root.localScale;
                if (Mathf.Abs(s.y - 1.0f) > 0.01f)
                    v.Root.localScale = Vector3.Lerp(s, new Vector3(0.85f, 1.0f, 0.85f), 4f * Time.deltaTime);
                v.Root.localRotation = Quaternion.Lerp(v.Root.localRotation, Quaternion.identity, 4f * Time.deltaTime);
            }
        }
    }
}
