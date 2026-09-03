using UnityEngine;

namespace CricketGame.BattingPrototype.Camera
{
    /// <summary>
    /// Broadcast-style camera state machine:
    ///   Setup     - wide side view showing batsman and bowler before delivery
    ///   Gameplay  - behind-the-batter view; the move completes DURING the
    ///               bowler's run-up so the view is settled before release and
    ///               never disturbs timing perception
    ///   Follow    - after contact, pans with the ball into the field
    ///   Return    - smooth return to the gameplay view
    /// </summary>
    public class CameraController : MonoBehaviour
    {
        private enum State { Setup, BlendToGameplay, Gameplay, Follow, FollowLong, Wicket, CatchEmphasis, FieldingFollow, Return, PreMatchOrbit, ResultHold }
        private float orbitAngle;

        private static readonly Vector3 SetupPos = new Vector3(11.5f, 4.6f, 10f);
        private static readonly Vector3 SetupLook = new Vector3(0f, 1.0f, 10f);
        private static readonly Vector3 GameplayPos = new Vector3(0.42f, 2.75f, -5.4f);
        private static readonly Vector3 GameplayLook = new Vector3(0f, 1.05f, 9f);
        private static readonly Vector3 WicketPos = new Vector3(1.9f, 1.5f, -3.4f);
        private static readonly Vector3 WicketLook = new Vector3(0f, 0.5f, -1f);

        private State state = State.Setup;
        private float stateTime;
        private float blendDuration = 0.6f;
        private Vector3 followLook;
        private Vector3 lastLook;
        private Vector3 blendFromPos;
        private Vector3 blendFromLook;

        private UnityEngine.Camera cam;

        public void Init(UnityEngine.Camera cameraComponent)
        {
            cam = cameraComponent;
            transform.position = SetupPos;
            lastLook = SetupLook;
            transform.rotation = Quaternion.LookRotation(SetupLook - SetupPos);
        }

        /// <summary>Wide pre-delivery view (batsman + bowler).</summary>
        public void ShowSetup()
        {
            state = State.Setup;
            stateTime = 0f;
        }

        /// <summary>Phase 5: slow stadium sweep behind the pre-match screen.
        /// Runs on unscaled time so it moves while timeScale = 0.</summary>
        public void PreMatchOrbit()
        {
            state = State.PreMatchOrbit;
            stateTime = 0f;
        }

        /// <summary>Phase 5: wide celebratory frame for the result screen.</summary>
        public void ShowResultHold()
        {
            state = State.ResultHold;
            stateTime = 0f;
        }

        /// <summary>Called when the bowler starts the run-up; blends to the gameplay view.</summary>
        public void BeginRunUp()
        {
            blendFromPos = transform.position;
            blendFromLook = lastLook;
            state = State.BlendToGameplay;
            stateTime = 0f;
        }

        /// <summary>Ball released: gameplay view, look tracks the ball.</summary>
        public void OnRelease()
        {
            state = State.Gameplay;
            stateTime = 0f;
        }

        /// <summary>
        /// Phase 4 (spec section 3): timing-quality camera response. A subtle
        /// FOV breath - never a shake - so perfect contact FEELS bigger
        /// without ever disorienting the player.
        /// </summary>
        public void OnShotQuality(float intensity)
        {
            if (intensity <= 0.01f) return;
            qualityPunch = Mathf.Clamp01(intensity);
        }

        private float qualityPunch;

        /// <summary>
        /// Shot played: follow the ball into the field. Boundary shots stay
        /// followed until the ball settles (untilReturn = true).
        /// </summary>
        public void FollowShot(Vector3 ballPosition, bool untilReturn)
        {
            state = untilReturn ? State.FollowLong : State.Follow;
            stateTime = 0f;
            followLook = ballPosition;
        }

        /// <summary>Wicket fallen: brief cinematic push-in on the stumps.</summary>
        public void OnWicket()
        {
            state = State.Wicket;
            stateTime = 0f;
        }

        /// <summary>Catch taken: hold on the fielder for a beat (spec 18).</summary>
        public void OnCatchEmphasis(Vector3 catchPosition)
        {
            state = State.CatchEmphasis;
            stateTime = 0f;
            followLook = catchPosition;
        }

        /// <summary>Ball fielded in the deep/ground: watch the play develop.</summary>
        public void OnFieldingPlay(Vector3 ballPosition)
        {
            state = State.FieldingFollow;
            stateTime = 0f;
            followLook = ballPosition;
        }

        /// <summary>Ball settled/passed: ease back to the gameplay view.</summary>
        public void ReturnToGameplay()
        {
            state = State.Return;
            stateTime = 0f;
        }

        /// <summary>While the ball is moving the camera keeps an eye on it.</summary>
        public void TrackBall(Vector3 ballPosition)
        {
            if (state == State.Gameplay || state == State.Follow || state == State.FollowLong
                || state == State.FieldingFollow)
                followLook = ballPosition;
        }

        private void LateUpdate()
        {
            if (cam == null) return;
            stateTime += Time.deltaTime;

            Vector3 pos = transform.position;
            Vector3 look = lastLook;

            switch (state)
            {
                case State.Setup:
                    pos = SetupPos;
                    look = SetupLook;
                    break;

                case State.BlendToGameplay:
                {
                    float t = Mathf.Clamp01(stateTime / blendDuration);
                    t = t * t * (3f - 2f * t);
                    pos = Vector3.Lerp(blendFromPos, GameplayPos, t);
                    look = Vector3.Lerp(blendFromLook, GameplayLook, t);
                    if (t >= 1f) state = State.Gameplay;
                    break;
                }

                case State.Gameplay:
                    pos = GameplayPos;
                    // subtle look-at-ball without moving the camera body (stable timing view)
                    look = Vector3.Lerp(GameplayLook, followLook, 0.35f);
                    break;

                case State.Follow:
                    pos = GameplayPos + new Vector3(Mathf.Clamp(followLook.x * 0.06f, -1.2f, 1.2f), 0.3f, 0f);
                    look = Vector3.Lerp(lastLook, followLook, 0.25f);
                    if (stateTime > 1.6f) state = State.Return;
                    break;

                case State.FollowLong:
                {
                    // Boundary chase: drift back and up as the ball travels, so
                    // the flight stays framed all the way to the rope.
                    float depth = Mathf.Clamp(followLook.z * 0.10f, 0f, 5.5f);
                    pos = GameplayPos + new Vector3(
                        Mathf.Clamp(followLook.x * 0.10f, -3.5f, 3.5f),
                        0.4f + depth * 0.55f,
                        -depth * 0.35f);
                    look = Vector3.Lerp(lastLook, followLook, 0.30f);
                    break;
                }

                case State.Wicket:
                    // Slow push-in on the broken stumps, then auto-return.
                    pos = Vector3.Lerp(WicketPos + new Vector3(0.6f, 0.35f, -0.8f), WicketPos,
                                       Mathf.Clamp01(stateTime / 0.9f));
                    look = WicketLook;
                    if (stateTime > 1.5f) state = State.Return;
                    break;

                case State.CatchEmphasis:
                {
                    // Drift toward the catcher, framed low and close.
                    Vector3 target = followLook + new Vector3(-2.6f, 1.6f, -4.2f);
                    pos = Vector3.Lerp(GameplayPos, target, Mathf.Clamp01(stateTime / 0.5f));
                    look = followLook + new Vector3(0f, 1.2f, 0f);
                    if (stateTime > 1.7f) state = State.Return;
                    break;
                }

                case State.FieldingFollow:
                {
                    float depth = Mathf.Clamp(followLook.z * 0.08f, 0f, 4.5f);
                    pos = GameplayPos + new Vector3(
                        Mathf.Clamp(followLook.x * 0.08f, -2.5f, 2.5f),
                        0.35f + depth * 0.4f, -depth * 0.25f);
                    look = Vector3.Lerp(lastLook, followLook, 0.3f);
                    if (stateTime > 1.4f) state = State.Return;
                    break;
                }

                case State.Return:
                {
                    float t = Mathf.Clamp01(stateTime / 0.7f);
                    t = t * t * (3f - 2f * t);
                    pos = Vector3.Lerp(transform.position, GameplayPos, t);
                    look = Vector3.Lerp(lastLook, GameplayLook, t);
                    if (t >= 1f) state = State.Gameplay;
                    break;
                }

                case State.PreMatchOrbit:
                {
                    orbitAngle += Time.unscaledDeltaTime * 0.05f;
                    pos = new Vector3(Mathf.Sin(orbitAngle) * 30f, 11f, 10f + Mathf.Cos(orbitAngle) * 30f);
                    look = new Vector3(0f, 1.5f, 10f);
                    break;
                }

                case State.ResultHold:
                {
                    pos = Vector3.Lerp(transform.position, new Vector3(16f, 7.5f, 2f),
                                       Mathf.Clamp01(stateTime / 1.2f));
                    look = new Vector3(0f, 1f, 10f);
                    break;
                }
            }

            transform.position = pos;
            if ((look - pos).sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.Slerp(transform.rotation,
                    Quaternion.LookRotation(look - pos), 0.55f);
            lastLook = look;

            // Phase 4 timing-quality FOV breath (subtle, never a shake).
            if (qualityPunch > 0.001f)
            {
                cam.fieldOfView = 55f - qualityPunch * 4f;
                qualityPunch = Mathf.MoveTowards(qualityPunch, 0f, Time.deltaTime * 3f);
            }
            else if (Mathf.Abs(cam.fieldOfView - 55f) > 0.01f)
            {
                cam.fieldOfView = Mathf.MoveTowards(cam.fieldOfView, 55f, Time.deltaTime * 12f);
            }
        }
    }
}
