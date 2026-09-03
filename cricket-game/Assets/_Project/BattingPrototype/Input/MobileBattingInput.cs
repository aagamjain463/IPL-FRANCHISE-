using System;
using CricketGame.Core.Batting;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace CricketGame.BattingPrototype.Input
{
    /// <summary>
    /// Touch-first batting input. Left half of the screen: dynamic analog
    /// joystick for footwork. Right half: swipe for shot direction, the
    /// RELEASE of the swipe plays the shot (that moment is timed).
    ///
    /// Uses the Input System's EnhancedTouch API (documented, stable touch
    /// phases + finger tracking). A mouse-drag fallback lets the prototype be
    /// played in the editor on desktop. Emits only the generic
    /// <see cref="BattingInputFrame"/> - the engine never sees touches.
    /// </summary>
    public class MobileBattingInput : MonoBehaviour, IBattingInputSource
    {
        /// <summary>Current shot intent (set by the HUD intent buttons).</summary>
        public ShotIntent SelectedIntent = ShotIntent.Normal;

        /// <summary>Screen-pixel rect occupied by the intent buttons; touches starting here are UI, not swipes.</summary>
        public Rect IntentButtonsRectScreen;

        // --- live gesture state (read by HUD visuals) ---
        public bool JoystickActive { get; private set; }
        public Vector2 JoystickAnchorScreen { get; private set; }
        public Vector2 JoystickVector { get; private set; }
        public bool SwipeActive { get; private set; }
        public Vector2 SwipeAnchorScreen { get; private set; }
        public Vector2 SwipeCurrentScreen { get; private set; }

        public event Action JoystickStarted;
        public event Action JoystickEnded;

        private const int MaxTouches = 10;
        private readonly bool[] slotDown = new bool[MaxTouches];
        private int joySlot = -1;
        private int swipeSlot = -1;
        private Vector2 swipeAnchor;
        private Vector2 swipeCurrent;

        // mouse fallback state
        private bool mouseIsDown;
        private bool mouseIsJoy;
        private bool mouseIsSwipe;

        private bool swingQueued;
        private Vector2 queuedDirection;
        private float queuedStrength;

        private float joystickRadius;

        private void Awake()
        {
            if (!EnhancedTouchSupport.enabled)
                EnhancedTouchSupport.Enable();
            joystickRadius = Mathf.Max(60f, Screen.height * 0.11f);
        }

        private void Update()
        {
            joystickRadius = Mathf.Max(60f, Screen.height * 0.11f);

            bool anyTouch = EnhancedTouch.Touch.activeTouches.Count > 0;
            if (anyTouch) ReadTouches();
            else ReadMouseFallback();
        }

        // ------------------------------------------------------------- touch (EnhancedTouch)

        private void ReadTouches()
        {
            foreach (var touch in EnhancedTouch.Touch.activeTouches)
            {
                int slot = Mathf.Clamp(touch.finger.index, 0, MaxTouches - 1);
                Vector2 pos = touch.screenPosition;

                switch (touch.phase)
                {
                    case TouchPhase.Began:
                        slotDown[slot] = true;
                        OnPointerDown(slot, pos);
                        break;

                    case TouchPhase.Moved:
                    case TouchPhase.Stationary:
                        if (slotDown[slot]) OnPointerMove(slot, pos);
                        else { slotDown[slot] = true; OnPointerDown(slot, pos); }
                        break;

                    case TouchPhase.Ended:
                    case TouchPhase.Canceled:
                        if (slotDown[slot])
                        {
                            slotDown[slot] = false;
                            OnPointerUp(slot, pos);
                        }
                        break;
                }
            }
        }

        // ------------------------------------------------------------- mouse fallback

        private void ReadMouseFallback()
        {
            var mouse = Mouse.current;
            if (mouse == null) return;

            Vector2 pos = mouse.position.ReadValue();
            bool down = mouse.leftButton.isPressed;

            if (down && !mouseIsDown)
            {
                mouseIsDown = true;
                mouseIsJoy = pos.x < Screen.width * 0.5f;
                mouseIsSwipe = !mouseIsJoy && !IntentButtonsRectScreen.Contains(pos);
                if (mouseIsJoy)
                {
                    JoystickAnchorScreen = pos;
                    JoystickVector = Vector2.zero;
                    JoystickActive = true;
                    if (JoystickStarted != null) JoystickStarted();
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
            else if (down && mouseIsDown)
            {
                if (mouseIsJoy) UpdateJoystick(pos);
                else if (mouseIsSwipe)
                {
                    swipeCurrent = pos;
                    SwipeCurrentScreen = pos;
                }
            }
            else if (!down && mouseIsDown)
            {
                if (mouseIsJoy)
                {
                    JoystickActive = false;
                    JoystickVector = Vector2.zero;
                    if (JoystickEnded != null) JoystickEnded();
                }
                else if (mouseIsSwipe)
                {
                    ReleaseSwipe(swipeCurrent - swipeAnchor);
                    SwipeActive = false;
                }
                mouseIsDown = false;
                mouseIsJoy = false;
                mouseIsSwipe = false;
            }
        }

        // ------------------------------------------------------------- shared gesture logic

        private void OnPointerDown(int slot, Vector2 pos)
        {
            bool leftHalf = pos.x < Screen.width * 0.5f;

            if (leftHalf && joySlot == -1)
            {
                joySlot = slot;
                JoystickAnchorScreen = pos;
                JoystickVector = Vector2.zero;
                JoystickActive = true;
                if (JoystickStarted != null) JoystickStarted();
                return;
            }

            if (!leftHalf && swipeSlot == -1 && !IntentButtonsRectScreen.Contains(pos))
            {
                swipeSlot = slot;
                swipeAnchor = pos;
                swipeCurrent = pos;
                SwipeAnchorScreen = pos;
                SwipeCurrentScreen = pos;
                SwipeActive = true;
            }
        }

        private void OnPointerMove(int slot, Vector2 pos)
        {
            if (slot == joySlot) UpdateJoystick(pos);
            else if (slot == swipeSlot)
            {
                swipeCurrent = pos;
                SwipeCurrentScreen = pos;
            }
        }

        private void OnPointerUp(int slot, Vector2 pos)
        {
            if (slot == joySlot)
            {
                joySlot = -1;
                JoystickActive = false;
                JoystickVector = Vector2.zero;
                if (JoystickEnded != null) JoystickEnded();
            }
            else if (slot == swipeSlot)
            {
                swipeSlot = -1;
                SwipeActive = false;
                ReleaseSwipe(pos - swipeAnchor);
            }
        }

        private void UpdateJoystick(Vector2 pos)
        {
            Vector2 raw = pos - JoystickAnchorScreen;
            float mag = raw.magnitude;
            if (mag > joystickRadius) raw = raw * (joystickRadius / mag);
            JoystickVector = raw / joystickRadius; // analog, magnitude <= 1
        }

        private void ReleaseSwipe(Vector2 delta)
        {
            float mag = delta.magnitude;
            float maxSwipe = Screen.height * 0.35f;
            float strength = Mathf.Clamp01(mag / maxSwipe);

            Vector2 dir;
            if (mag < 18f)
            {
                dir = new Vector2(0f, 1f); // bare tap: straight
                strength = Mathf.Max(strength, 0.35f);
            }
            else
            {
                dir = delta.normalized;
            }

            swingQueued = true;
            queuedDirection = dir;
            queuedStrength = strength;
        }

        // ------------------------------------------------------------- generic output

        public BattingInputFrame Sample()
        {
            var frame = BattingInputFrame.Idle;
            frame.Intent = SelectedIntent;

            // Screen up = forward stride (+Z), screen right = off side (+X).
            frame.Footwork = new Vec2(JoystickVector.x, JoystickVector.y);

            if (swingQueued)
            {
                swingQueued = false;
                frame.SwingTriggered = true;
                frame.ShotDirection = new Vec2(queuedDirection.x, queuedDirection.y);
                frame.SwipeStrength = queuedStrength;
            }
            return frame;
        }
    }
}
