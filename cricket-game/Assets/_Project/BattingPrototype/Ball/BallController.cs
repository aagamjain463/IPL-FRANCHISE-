using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Ball
{
    public struct BallEndResult
    {
        public bool CrossedBoundary;
        public bool Six;
        public int Runs;
        public float Distance;
    }

    /// <summary>
    /// The ball. During the delivery it is kinematic and follows the engine's
    /// analytic trajectory exactly (so timing is readable and deterministic).
    /// On contact it becomes a dynamic Rigidbody and receives the exit velocity
    /// computed by the contact system - from there it genuinely flies, bounces
    /// and rolls into the field until it settles or crosses the boundary.
    /// </summary>
    public class BallController : MonoBehaviour
    {
        public const float BoundaryRadius = 62f;

        private new Rigidbody rigidbody;
        private DeliveryTrajectory trajectory;
        private float flightTime;
        private bool inFlight;
        private bool struck;
        private bool groundedSinceStrike;
        private bool bounceFired;
        private float restTimer;

        // Pooled pitch-dust puff (one quad, reused for every delivery).
        private Transform dust;
        private Material dustMat;
        private float dustClock = -1f;
        private const float DustLife = 0.32f;

        public bool InFlight { get { return inFlight; } }
        public bool Struck { get { return struck; } }
        public float FlightTime { get { return flightTime; } }

        /// <summary>Raised when a struck ball finishes (boundary or rest).</summary>
        public event System.Action<BallEndResult> BallSettled;

        /// <summary>Raised once per delivery when the ball pitches (OnBallBounced).</summary>
        public event System.Action<Vector3> BallBounced;

        public static BallController Attach(GameObject ballGo)
        {
            var ball = ballGo.AddComponent<BallController>();
            ball.rigidbody = ballGo.AddComponent<Rigidbody>();
            ball.rigidbody.mass = 0.16f;
            ball.rigidbody.drag = 0.06f;
            ball.rigidbody.angularDrag = 0.4f;
            ball.rigidbody.isKinematic = true;
            ball.rigidbody.useGravity = true;
            ball.rigidbody.interpolation = RigidbodyInterpolation.Interpolate;
            ball.BuildDustPuff();
            return ball;
        }

        private void BuildDustPuff()
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = "PitchDust";
            go.transform.SetParent(transform.parent, false);
            go.transform.localEulerAngles = new Vector3(90f, 0, 0);
            go.transform.localScale = Vector3.zero;
            Object.Destroy(go.GetComponent<Collider>());
            var r = go.GetComponent<Renderer>();
            dustMat = new Material(Shader.Find("Unlit/Transparent"));
            dustMat.color = new Color(0.78f, 0.70f, 0.52f, 0f);
            r.sharedMaterial = dustMat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            dust = go.transform;
        }

        private void PlayDust(Vector3 position)
        {
            if (dust == null) return;
            dust.position = new Vector3(position.x, 0.03f, position.z);
            dustClock = 0f;
        }

        /// <summary>Begins following a new delivery trajectory from release.</summary>
        public void Launch(DeliveryTrajectory traj)
        {
            trajectory = traj;
            flightTime = 0f;
            inFlight = true;
            struck = false;
            groundedSinceStrike = false;
            bounceFired = false;
            restTimer = 0f;
            rigidbody.isKinematic = true;
            rigidbody.velocity = Vector3.zero;
            rigidbody.angularVelocity = Vector3.zero;
            transform.position = ToUnity(traj.Position(0f));
        }

        /// <summary>Advances the deterministic flight. Called by the runner each frame.</summary>
        public void AdvanceFlight(float dt)
        {
            if (!inFlight) return;
            flightTime += dt;
            transform.position = ToUnity(trajectory.Position(flightTime));

            if (!bounceFired && flightTime >= trajectory.BounceTime)
            {
                bounceFired = true;
                PlayDust(ToUnity(trajectory.BouncePoint));
                if (BallBounced != null) BallBounced(ToUnity(trajectory.BouncePoint));
            }
        }

        /// <summary>Applies the contact result: dynamic ball with a real exit velocity.</summary>
        public void Strike(Vec3 direction, float exitSpeedKph)
        {
            inFlight = false;
            struck = true;
            rigidbody.isKinematic = false;
            rigidbody.velocity = ToUnity(direction) * (exitSpeedKph / 3.6f);
            rigidbody.angularVelocity = new Vector3(Random.Range(-18f, 18f), Random.Range(-18f, 18f), 0f);
        }

        /// <summary>Parks the ball at the keeper after an unstruck delivery.</summary>
        public void CollectAtKeeper(Vector3 keeperPos)
        {
            inFlight = false;
            struck = false;
            rigidbody.isKinematic = true;
            transform.position = keeperPos;
        }

        private void Update()
        {
            // --- dust puff fade (cheap, pooled)
            if (dustClock >= 0f)
            {
                dustClock += Time.deltaTime;
                float t = dustClock / DustLife;
                if (t >= 1f)
                {
                    dustClock = -1f;
                    dust.localScale = Vector3.zero;
                }
                else
                {
                    float s = 0.25f + 0.85f * t;
                    dust.localScale = new Vector3(s, s, 1f);
                    var c = dustMat.color;
                    c.a = 0.5f * (1f - t);
                    dustMat.color = c;
                }
            }

            if (inFlight && trajectory != null)
            {
                // Runner drives AdvanceFlight; nothing else to do here.
                return;
            }

            if (!struck) return;

            if (transform.position.y <= 0.09f) groundedSinceStrike = true;

            float dist = Mathf.Sqrt(transform.position.x * transform.position.x +
                                    transform.position.z * transform.position.z);

            if (dist >= BoundaryRadius)
            {
                bool six = !groundedSinceStrike && transform.position.y > 0.4f;
                Settle(new BallEndResult
                {
                    CrossedBoundary = true,
                    Six = six,
                    Runs = six ? 6 : 4,
                    Distance = dist
                });
                return;
            }

            // Rest detection: slow ball on the ground.
            if (groundedSinceStrike && rigidbody.velocity.sqrMagnitude < 0.35f && transform.position.y < 0.12f)
            {
                restTimer += Time.deltaTime;
                if (restTimer > 0.25f)
                {
                    Settle(new BallEndResult
                    {
                        CrossedBoundary = false,
                        Six = false,
                        Runs = RunsForDistance(dist),
                        Distance = dist
                    });
                }
            }
            else
            {
                restTimer = 0f;
            }
        }

        private static int RunsForDistance(float dist)
        {
            if (dist >= 45f) return 3;
            if (dist >= 25f) return 2;
            if (dist >= 9f) return 1;
            return 0;
        }

        private void Settle(BallEndResult result)
        {
            struck = false;
            rigidbody.isKinematic = true;
            if (BallSettled != null) BallSettled(result);
        }

        private static Vector3 ToUnity(Vec3 v)
        {
            return new Vector3(v.X, v.Y, v.Z);
        }
    }
}
