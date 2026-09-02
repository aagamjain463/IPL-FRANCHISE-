using System;
using CricketGame.Core.Batting;
using UnityEngine;

namespace CricketGame.BattingPrototype.Game
{
    /// <summary>
    /// The gameplay event bus (spec section 15). Future systems - fielding,
    /// commentary, match rules, replays - subscribe here without touching the
    /// loop. The runner owns the instance and fires everything.
    /// </summary>
    public sealed class GameplayEvents
    {
        public event Action<DeliveryData> BallReleased;
        public event Action<Vector3> BallBounced;
        public event Action<SwingReport> ShotPlayed;
        public event Action<ContactResult> BallContact;
        public event Action<ShotOutcomeResult> Wicket;
        public event Action<int, bool> Boundary;   // runs, isSix
        public event Action<ShotOutcomeResult> DeliveryComplete;

        internal void FireBallReleased(DeliveryData d) { if (BallReleased != null) BallReleased(d); }
        internal void FireBallBounced(Vector3 p) { if (BallBounced != null) BallBounced(p); }
        internal void FireShotPlayed(SwingReport r) { if (ShotPlayed != null) ShotPlayed(r); }
        internal void FireBallContact(ContactResult c) { if (BallContact != null) BallContact(c); }
        internal void FireWicket(ShotOutcomeResult r) { if (Wicket != null) Wicket(r); }
        internal void FireBoundary(int runs, bool six) { if (Boundary != null) Boundary(runs, six); }
        internal void FireDeliveryComplete(ShotOutcomeResult r) { if (DeliveryComplete != null) DeliveryComplete(r); }
    }
}
