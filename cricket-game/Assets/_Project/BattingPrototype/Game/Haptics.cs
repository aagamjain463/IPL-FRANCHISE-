using UnityEngine;

namespace CricketGame.BattingPrototype.Game
{
    /// <summary>
    /// Phase 4 (spec section 22): lightweight mobile haptics. Fire-and-forget
    /// pulses scaled by intensity; fully disableable and never required for
    /// gameplay. On devices without haptic hardware this is a no-op.
    /// </summary>
    public static class Haptics
    {
        public static bool Enabled = true;

        private static float lastPulseTime = -10f;
        private const float MinInterval = 0.08f;

        /// <summary>Plays a pulse. intensity 0..1 maps to weak..strong.</summary>
        public static void Play(float intensity)
        {
            if (!Enabled || intensity <= 0.01f) return;

            float now = Time.unscaledTime;
            if (now - lastPulseTime < MinInterval) return;   // never spam
            lastPulseTime = now;

#if !UNITY_EDITOR
            // Handheld.Vibrate is the portable one-shot on Android/iOS.
            Handheld.Vibrate();
#else
            Debug.LogFormat("[Haptics] pulse {0:0.00}", intensity);
#endif
        }
    }
}
