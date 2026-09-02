using System;
using CricketGame.Core.Batting;
using UnityEngine;
using UnityEngine.InputSystem;

namespace CricketGame.BattingPrototype.Input
{
    /// <summary>
    /// Touch-first batting input. Left half of the screen: dynamic analog
    /// joystick for footwork. Right half: swipe for shot direction, the
    /// RELEASE of the swipe plays the shot (that moment is timed).
    ///
    /// Also supports mouse-drag in the editor so the prototype can be played
    /// on desktop without touch simulation. Emits only the generic
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
        private readonly bool[] touchDown = new bool[MaxTouches];
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
            joystickRadius = Mathf.Max(60f, Screen.height * 0.11f);
        }

        private void Update()
        {
            joystickRadius = Mathf.Max(60f, Screen.height * 0.11f);
            ReadTouches();
            if (Touchscreen.current == null) ReadMouseFallback();
        }

        // ------------------------------------------------------------- touch

        private void ReadTouches()
        {
            var ts = Touchscreen.current;
            if (ts == null) return;

            int count = Mathf.Min(ts.touches.Count, MaxTouches);
            for (int i = 0; i < count; i++)
            {
                var touch = ts.touches[i];
                bool down = touch.press.isPressed;
                Vector2 pos = touch.position.ReadValue();

                if (down && !touchDown[i])
                {
                    OnPointerDown(i, pos);
                }
                else if (down && touchDown[i])
                {
                    OnPointerMove(i, pos);
                }
                else if (!down && touchDown[i])
                {
                    OnPointerUp(i, pos);
                }
                touchDown[i] = down;
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
                    SwipeActive = true;
                }
            }
            else if (down && mouseIsDown)
            {
                if (mouseIsJoy) UpdateJoystick(pos);
                else if (mouseIsSwipe)
                {
                    swipeCurrent = pos;
                    SwipeAnchorScreen = swipeAnchor;
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
                dir = new Vector2(0f, 1f); // bare tap: straight
            else
                dir = delta.normalized;

            swingQueued = true;
            queuedDirection = dir;
            queuedStrength = Mathf.Max(strength, mag < 18f ? 0.35f : strength);
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
