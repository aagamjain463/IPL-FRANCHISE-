using System.Collections.Generic;
using UnityEngine;

namespace CricketGame.BattingPrototype.Audio
{
    /// <summary>Every sound the game plays (spec section 23). Adding a clip
    /// later means mapping one enum entry - no system changes.</summary>
    public enum GameSound
    {
        DeliveryRelease,
        BatContact,
        BoundaryFour,
        BoundarySix,
        Wicket,
        CrowdAmbience,
        CrowdCheer,
        InningsStart,
        MatchResultWin,
        MatchResultLose,
        // Phase 5 presentation hooks
        UiClick,
        UiTransition,
        Appeal,
        UmpireSignal,
        MatchIntro,
    }

    /// <summary>
    /// The audio contract. Real clips plug in behind this interface later;
    /// gameplay code only ever calls <see cref="AudioManager.Play"/>.
    /// </summary>
    public interface IAudioManager
    {
        void Play(GameSound sound);
        void StopLooping(GameSound sound);
    }

    /// <summary>
    /// Placeholder implementation: silent, but every call is logged in the
    /// debug build so designers can see exactly when each sound would fire.
    /// Swap in a clip-backed manager without touching any gameplay script.
    /// </summary>
    public sealed class PlaceholderAudioManager : IAudioManager
    {
        public bool Verbose;

        public void Play(GameSound sound)
        {
            if (Verbose) Debug.Log("[audio] " + sound);
        }

        public void StopLooping(GameSound sound)
        {
            if (Verbose) Debug.Log("[audio] stop " + sound);
        }
    }

    /// <summary>Process-wide audio service so any layer (runner, HUD, match
    /// controller, camera) can fire sounds without holding references.</summary>
    public static class AudioManager
    {
        private static IAudioManager implementation = new PlaceholderAudioManager();

        public static IAudioManager Implementation
        {
            get { return implementation; }
            set { implementation = value ?? new PlaceholderAudioManager(); }
        }

        public static void Play(GameSound sound) { implementation.Play(sound); }
        public static void StopLooping(GameSound sound) { implementation.StopLooping(sound); }
    }
}
