using System;
using CricketGame.Core.Batting;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace CricketGame.BattingPrototype.Input
{
    /// <summary>
    /// Touch-first batting input.
    ///
    /// Left half of screen:
    ///     Dynamic analog joystick for footwork.
    ///
    /// Right half of screen:
    ///     Swipe for shot direction.
    ///     Releasing the swipe triggers the shot.
    ///
    /// Mouse fallback allows the prototype to be played in the Unity Editor.
    /// The batting engine only receives the generic BattingInputFrame.
    /// </summary>
    public class MobileBattingInput : MonoBehaviour, IBattingInputSource
    {
        /// <summary>
        /// Current shot intent selected by the HUD.
        /// </summary>
        public ShotIntent SelectedIntent = ShotIntent.Normal;

        /// <summary>
        /// Screen-space rectangle occupied by intent buttons.
        /// Touches beginning here are treated as UI rather than swipes.
        /// </summary>
        public Rect IntentButtonsRectScreen;

        // -------------------------------------------------------------
        // Live gesture state
        // -------------------------------------------------------------

        public bool JoystickActive { get; private set; }

        public Vector2 JoystickAnchorScreen { get; private set; }

        public Vector2 JoystickVector { get; private set; }

        public bool SwipeActive { get; private set; }

        public Vector2 SwipeAnchorScreen { get; private set; }

        public Vector2 SwipeCurrentScreen { get; private set; }

        public event Action JoystickStarted;

        public event Action JoystickEnded;

        // -------------------------------------------------------------
        // Touch state
        // -------------------------------------------------------------

        private const int MaxTouches = 10;

        private readonly bool[] slotDown = new bool[MaxTouches];

        private int joySlot = -1;

        private int swipeSlot = -1;

        private Vector2 swipeAnchor;

        private Vector2 swipeCurrent;

        // -------------------------------------------------------------
        // Mouse fallback state
        // -------------------------------------------------------------

        private bool mouseIsDown;

        private bool mouseIsJoy;

        private bool mouseIsSwipe;

        // -------------------------------------------------------------
        // Swing state
        // -------------------------------------------------------------

        private bool swingQueued;

        private Vector2 queuedDirection;

        private float queuedStrength;

        // -------------------------------------------------------------
        // Joystick
        // -------------------------------------------------------------

        private float joystickRadius;

        // -------------------------------------------------------------
        // Lifecycle
        // -------------------------------------------------------------

        private void Awake()
        {
            EnsureEnhancedTouchEnabled();

            joystickRadius =
                Mathf.Max(
                    60f,
                    Screen.height * 0.11f
                );
        }

        private void OnEnable()
        {
            EnsureEnhancedTouchEnabled();
        }

        private void OnDisable()
        {
            // Reset this component's gesture state.
            //
            // IMPORTANT:
            // Do NOT call EnhancedTouchSupport.Disable() here.
            // Enhanced Touch is a global Input System service.
            ResetInputState();
        }

        private void EnsureEnhancedTouchEnabled()
        {
            if (!EnhancedTouchSupport.enabled)
            {
                EnhancedTouchSupport.Enable();
            }
        }

        private void ResetInputState()
        {
            JoystickActive = false;
            JoystickVector = Vector2.zero;

            SwipeActive = false;

            joySlot = -1;
            swipeSlot = -1;

            mouseIsDown = false;
            mouseIsJoy = false;
            mouseIsSwipe = false;

            swingQueued = false;

            for (int i = 0; i < slotDown.Length; i++)
            {
                slotDown[i] = false;
            }
        }

        // -------------------------------------------------------------
        // Update
        // -------------------------------------------------------------

        private void Update()
        {
            joystickRadius =
                Mathf.Max(
                    60f,
                    Screen.height * 0.11f
                );

            // Make absolutely sure Enhanced Touch is enabled BEFORE
            // touching Touch.activeTouches.
            EnsureEnhancedTouchEnabled();

            var activeTouches =
                UnityEngine.InputSystem.EnhancedTouch.Touch.activeTouches;

            if (activeTouches.Count > 0)
            {
                ReadTouches();
            }
            else
            {
                ReadMouseFallback();
            }
        }

        // -------------------------------------------------------------
        // Enhanced Touch
        // -------------------------------------------------------------

        private void ReadTouches()
        {
            var activeTouches =
                UnityEngine.InputSystem.EnhancedTouch.Touch.activeTouches;

            foreach (var touch in activeTouches)
            {
                int slot =
                    Mathf.Clamp(
                        touch.finger.index,
                        0,
                        MaxTouches - 1
                    );

                Vector2 pos =
                    touch.screenPosition;

                switch (touch.phase)
                {
                    case TouchPhase.Began:

                        slotDown[slot] = true;

                        OnPointerDown(
                            slot,
                            pos
                        );

                        break;

                    case TouchPhase.Moved:
                    case TouchPhase.Stationary:

                        if (slotDown[slot])
                        {
                            OnPointerMove(
                                slot,
                                pos
                            );
                        }
                        else
                        {
                            slotDown[slot] = true;

                            OnPointerDown(
                                slot,
                                pos
                            );
                        }

                        break;

                    case TouchPhase.Ended:
                    case TouchPhase.Canceled:

                        if (slotDown[slot])
                        {
                            slotDown[slot] = false;

                            OnPointerUp(
                                slot,
                                pos
                            );
                        }

                        break;
                }
            }
        }

        // -------------------------------------------------------------
        // Mouse fallback
        // -------------------------------------------------------------

        private void ReadMouseFallback()
        {
            var mouse = Mouse.current;

            if (mouse == null)
            {
                return;
            }

            Vector2 pos =
                mouse.position.ReadValue();

            bool down =
                mouse.leftButton.isPressed;

            // Mouse pressed
            if (down && !mouseIsDown)
            {
                mouseIsDown = true;

                mouseIsJoy =
                    pos.x <
                    Screen.width * 0.5f;

                mouseIsSwipe =
                    !mouseIsJoy &&
                    !IntentButtonsRectScreen.Contains(pos);

                if (mouseIsJoy)
                {
                    JoystickAnchorScreen = pos;

                    JoystickVector =
                        Vector2.zero;

                    JoystickActive = true;

                    JoystickStarted?.Invoke();
                }
                else if (mouseIsSwipe)
                {
                    swipeAnchor = pos;

                    swipeCurrent = pos;

                    SwipeAnchorScreen = pos;

                    SwipeCurrentScreen = pos;

                    SwipeActive = true;
                }
            }

            // Mouse held
            else if (down && mouseIsDown)
            {
                if (mouseIsJoy)
                {
                    UpdateJoystick(pos);
                }
                else if (mouseIsSwipe)
                {
                    swipeCurrent = pos;

                    SwipeCurrentScreen = pos;
                }
            }

            // Mouse released
            else if (!down && mouseIsDown)
            {
                if (mouseIsJoy)
                {
                    JoystickActive = false;

                    JoystickVector =
                        Vector2.zero;

                    JoystickEnded?.Invoke();
                }
                else if (mouseIsSwipe)
                {
                    ReleaseSwipe(
                        swipeCurrent - swipeAnchor
                    );

                    SwipeActive = false;
                }

                mouseIsDown = false;

                mouseIsJoy = false;

                mouseIsSwipe = false;
            }
        }

        // -------------------------------------------------------------
        // Pointer down
        // -------------------------------------------------------------

        private void OnPointerDown(
            int slot,
            Vector2 pos)
        {
            bool leftHalf =
                pos.x <
                Screen.width * 0.5f;

            // Left side = joystick
            if (leftHalf && joySlot == -1)
            {
                joySlot = slot;

                JoystickAnchorScreen = pos;

                JoystickVector =
                    Vector2.zero;

                JoystickActive = true;

                JoystickStarted?.Invoke();

                return;
            }

            // Right side = swipe
            if (!leftHalf &&
                swipeSlot == -1 &&
                !IntentButtonsRectScreen.Contains(pos))
            {
                swipeSlot = slot;

                swipeAnchor = pos;

                swipeCurrent = pos;

                SwipeAnchorScreen = pos;

                SwipeCurrentScreen = pos;

                SwipeActive = true;
            }
        }

        // -------------------------------------------------------------
        // Pointer move
        // -------------------------------------------------------------

        private void OnPointerMove(
            int slot,
            Vector2 pos)
        {
            if (slot == joySlot)
            {
                UpdateJoystick(pos);
            }
            else if (slot == swipeSlot)
            {
                swipeCurrent = pos;

                SwipeCurrentScreen = pos;
            }
        }

        // -------------------------------------------------------------
        // Pointer up
        // -------------------------------------------------------------

        private void OnPointerUp(
            int slot,
            Vector2 pos)
        {
            if (slot == joySlot)
            {
                joySlot = -1;

                JoystickActive = false;

                JoystickVector =
                    Vector2.zero;

                JoystickEnded?.Invoke();
            }
            else if (slot == swipeSlot)
            {
                swipeSlot = -1;

                SwipeActive = false;

                ReleaseSwipe(
                    pos - swipeAnchor
                );
            }
        }

        // -------------------------------------------------------------
        // Joystick
        // -------------------------------------------------------------

        private void UpdateJoystick(Vector2 pos)
        {
            Vector2 raw =
                pos - JoystickAnchorScreen;

            float mag =
                raw.magnitude;

            if (mag > joystickRadius)
            {
                raw *=
                    joystickRadius / mag;
            }

            JoystickVector =
                raw / joystickRadius;
        }

        // -------------------------------------------------------------
        // Swipe release
        // -------------------------------------------------------------

        private void ReleaseSwipe(Vector2 delta)
        {
            float mag =
                delta.magnitude;

            float maxSwipe =
                Screen.height * 0.35f;

            float strength =
                Mathf.Clamp01(
                    mag / maxSwipe
                );

            Vector2 dir;

            // Small movement = straight shot
            if (mag < 18f)
            {
                dir =
                    new Vector2(
                        0f,
                        1f
                    );

                strength =
                    Mathf.Max(
                        strength,
                        0.35f
                    );
            }
            else
            {
                dir =
                    delta.normalized;
            }

            swingQueued = true;

            queuedDirection = dir;

            queuedStrength = strength;
        }

        // -------------------------------------------------------------
        // Generic batting output
        // -------------------------------------------------------------

        public BattingInputFrame Sample()
        {
            var frame =
                BattingInputFrame.Idle;

            frame.Intent =
                SelectedIntent;

            // Screen up = forward stride (+Z)
            // Screen right = off side (+X)
            frame.Footwork =
                new Vec2(
                    JoystickVector.x,
                    JoystickVector.y
                );

            if (swingQueued)
            {
                swingQueued = false;

                frame.SwingTriggered = true;

                frame.ShotDirection =
                    new Vec2(
                        queuedDirection.x,
                        queuedDirection.y
                    );

                frame.SwipeStrength =
                    queuedStrength;
            }

            return frame;
        }
    }
}
