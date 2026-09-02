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
        private enum State { Setup, BlendToGameplay, Gameplay, Follow, Return }

        private static readonly Vector3 SetupPos = new Vector3(11.5f, 4.6f, 10f);
        private static readonly Vector3 SetupLook = new Vector3(0f, 1.0f, 10f);
        private static readonly Vector3 GameplayPos = new Vector3(0.42f, 2.75f, -5.4f);
        private static readonly Vector3 GameplayLook = new Vector3(0f, 1.05f, 9f);

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

        /// <summary>Shot played: follow the ball into the field for a while.</summary>
        public void FollowShot(Vector3 ballPosition)
        {
            state = State.Follow;
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
            if (state == State.Gameplay || state == State.Follow) followLook = ballPosition;
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

                case State.Return:
                {
                    float t = Mathf.Clamp01(stateTime / 0.7f);
                    t = t * t * (3f - 2f * t);
                    pos = Vector3.Lerp(transform.position, GameplayPos, t);
                    look = Vector3.Lerp(lastLook, GameplayLook, t);
                    if (t >= 1f) state = State.Gameplay;
                    break;
                }
            }

            transform.position = pos;
            if ((look - pos).sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.Slerp(transform.rotation,
                    Quaternion.LookRotation(look - pos), 0.55f);
            lastLook = look;
        }
    }
}
