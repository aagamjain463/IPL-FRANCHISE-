using System.Collections;
using CricketGame.BattingPrototype.Audio;
using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Game
{
    /// <summary>
    /// Phase 5 (spec 18): fires every audio hook at the right gameplay moment.
    /// Observes GameplayEvents only - the placeholder manager logs them today
    /// and real clips drop in later without touching gameplay code. Includes
    /// the appeal -> umpire-signal beat after a wicket.
    /// </summary>
    public sealed class PresentationCues : MonoBehaviour
    {
        public void Bind(GameplayEvents events)
        {
            events.BallReleased += d => AudioManager.Play(GameSound.DeliveryRelease);
            events.BallBounced += p => AudioManager.Play(GameSound.BallBounce);
            events.BallContact += c =>
            {
                AudioManager.Play(c.Outcome == ContactOutcome.Edge
                    ? GameSound.BatEdge : GameSound.BatContact);
            };
            events.Boundary += (runs, six) =>
                AudioManager.Play(six ? GameSound.BoundarySix : GameSound.BoundaryFour);
            events.Wicket += r => StartCoroutine(WicketCues(r));
        }

        private IEnumerator WicketCues(ShotOutcomeResult result)
        {
            AudioManager.Play(GameSound.Wicket);
            if (result != null && result.Kind == ShotOutcomeKind.Bowled)
                AudioManager.Play(GameSound.BallOnStumps);
            AudioManager.Play(GameSound.Appeal);
            yield return new WaitForSeconds(0.55f);
            AudioManager.Play(GameSound.UmpireSignal);
        }
    }
}
