using System.Collections;
using CricketGame.Core.AI;
using CricketGame.Core.Fielding;
using CricketGame.Core.Rules;
using CricketGame.BattingPrototype.Audio;
using CricketGame.BattingPrototype.Hud;
using UnityEngine;

namespace CricketGame.BattingPrototype.Match
{
    /// <summary>Top-level match flow (spec section 1).</summary>
    public enum MatchFlowState
    {
        PreMatch,
        Innings1,
        Innings1Result,
        InningsBreak,
        Innings2,
        MatchResult,
    }

    /// <summary>
    /// The single owner of match rules and flow. The delivery loop (runner),
    /// HUD, fielders and AI all ask THIS object what to do next - no match
    /// rules live anywhere else. Wraps the deterministic Core.Rules engine.
    ///
    /// Super Over shape used by the prototype:
    ///   Innings 1 - the PLAYER bats, the AI bowls.
    ///   Innings 2 - the AI bats (chases), the PLAYER bowls.
    /// </summary>
    public sealed class MatchController : MonoBehaviour
    {
        private SuperOverMatch match;
        private BattingHud hud;
        private AiDifficulty difficulty = AiDifficulty.Medium;
        private MatchFlowState flow = MatchFlowState.PreMatch;
        private bool waitingForPlayAgain;

        public event System.Action<MatchFlowState> FlowChanged;
        public event System.Action TargetReached;
        public event System.Action<SuperOverMatch> MatchFinished;

        public SuperOverMatch Match { get { return match; } }
        public MatchFlowState Flow { get { return flow; } }
        public bool PlayerBatsFirst { get { return true; } }

        public AiDifficulty Difficulty
        {
            get { return difficulty; }
            set { difficulty = value; }
        }

        /// <summary>True while the result screen waits for PLAY AGAIN.</summary>
        public bool WaitingForPlayAgain { get { return waitingForPlayAgain; } }

        public void Init(BattingHud hudRef)
        {
            hud = hudRef;
            ResetMatch();
        }

        /// <summary>(Re)starts a fresh match - also how PLAY AGAIN works.</summary>
        public void ResetMatch()
        {
            match = new SuperOverMatch(SuperOverConfig.Standard);
            match.InningsStarted += OnInningsStarted;
            match.BallCompleted += OnBallCompleted;
            match.InningsCompleted += OnInningsCompleted;
            match.MatchCompleted += OnMatchCompleted;
            match.Start();
            waitingForPlayAgain = false;
            SetFlow(MatchFlowState.Innings1);
            AudioManager.Play(GameSound.InningsStart);
        }

        // ------------------------------------------------------------------ queries

        /// <summary>Who faces the current delivery.</summary>
        public bool PlayerIsBatting
        {
            get { return flow == MatchFlowState.Innings1; }
        }

        /// <summary>Who bowls the current delivery (player bowls the chase).</summary>
        public bool PlayerIsBowling
        {
            get { return flow == MatchFlowState.Innings2; }
        }

        public bool InningsInProgress
        {
            get
            {
                return match != null && !match.IsComplete
                       && (match.Phase == MatchPhase.FirstInnings
                           || match.Phase == MatchPhase.SecondInnings);
            }
        }

        /// <summary>Chase context for the AI batter (spec section 14).</summary>
        public AiChaseContext BuildChaseContext()
        {
            Innings current = match.CurrentInnings;
            return new AiChaseContext
            {
                Target = match.Phase == MatchPhase.SecondInnings ? match.Target : (int?)null,
                Score = current != null ? current.Runs : 0,
                BallsRemaining = current != null ? current.BallsRemaining : 0,
                WicketsRemaining = current != null ? current.WicketsRemaining : 0,
            };
        }

        /// <summary>Field quality against the current batter (difficulty-aware).</summary>
        public Fielder[] CurrentField()
        {
            AiDifficultyTuning tune = AiDifficultyTuning.For(difficulty);
            float scale = PlayerIsBatting ? tune.FieldVsPlayer : tune.FieldForPlayer;
            return Fielder.DefaultField(scale);
        }

        /// <summary>AI bowling accuracy when the machine bowls to the player.</summary>
        public float AiBowlingAccuracy
        {
            get { return AiDifficultyTuning.For(difficulty).AiBowlingAccuracy; }
        }

        // ------------------------------------------------------------------ recording

        /// <summary>Records one resolved delivery into the rules engine.</summary>
        public BallRecord RecordDelivery(DeliveryOutcome outcome)
        {
            BallRecord record = match.RecordDelivery(outcome);
            RefreshHud();

            if (match.Phase == MatchPhase.SecondInnings && match.RunsRequired.HasValue
                && match.RunsRequired.Value == 0)
            {
                if (TargetReached != null) TargetReached();
            }
            return record;
        }

        /// <summary>Scoreboard + chase line for the HUD.</summary>
        public void RefreshHud()
        {
            if (hud == null || match == null) return;
            Innings current = match.CurrentInnings;
            if (current == null) current = match.SecondInnings;

            hud.SetScoreboard(current.Runs, current.Wickets, current.LegalBalls);
            if (match.Phase == MatchPhase.SecondInnings || match.Phase == MatchPhase.Completed)
            {
                hud.SetChaseInfo(match.Target ?? 0, match.RunsRequired ?? 0,
                                 current.BallsRemaining, current.WicketsRemaining);
            }
            else
            {
                hud.SetChaseInfo(0, 0, current.BallsRemaining, current.WicketsRemaining);
            }
        }

        // ------------------------------------------------------------------ flow gate

        /// <summary>
        /// The runner yields on this between deliveries. It plays the innings
        /// result / break / match result sequences (spec sections 20 and 22)
        /// and hands control back exactly when the next ball may be bowled.
        /// </summary>
        public IEnumerator BetweenDeliveries()
        {
            // --- end of the first innings: result -> break -> start the chase
            if (match.Phase == MatchPhase.InningsBreak)
            {
                SetFlow(MatchFlowState.Innings1Result);
                AudioManager.Play(GameSound.CrowdCheer);
                hud.ShowInningsComplete(match.FirstInnings.Runs, match.FirstInnings.Wickets,
                                        match.FirstInnings.LegalBalls, match.Target ?? 0);
                yield return new WaitForSeconds(2.2f);

                SetFlow(MatchFlowState.InningsBreak);
                hud.ShowInningsBreak(match.Target ?? 0);
                AudioManager.Play(GameSound.InningsStart);
                yield return new WaitForSeconds(2.0f);
                hud.HideOverlays();

                match.StartSecondInnings();
                SetFlow(MatchFlowState.Innings2);
                RefreshHud();
            }

            // --- match finished: show the result until PLAY AGAIN
            if (match.IsComplete)
            {
                SetFlow(MatchFlowState.MatchResult);
                waitingForPlayAgain = true;
                hud.ShowMatchResult(match.Result, PlayerWon(match.Result));
                AudioManager.Play(PlayerWon(match.Result)
                    ? GameSound.MatchResultWin : GameSound.MatchResultLose);
                if (MatchFinished != null) MatchFinished(match);

                while (waitingForPlayAgain)
                    yield return null;

                // PLAY AGAIN pressed: clean restart without reloading anything.
                hud.HideOverlays();
                ResetMatch();
                RefreshHud();
            }
        }

        /// <summary>Called by the HUD PLAY AGAIN button (and debug reset).</summary>
        public void PlayAgain()
        {
            waitingForPlayAgain = false;
        }

        /// <summary>Player perspective of the result (player batted first).</summary>
        public static bool PlayerWon(MatchResult result)
        {
            return result.Outcome == MatchOutcome.FirstInningsWin;
        }

        // ------------------------------------------------------------------ internals

        private void SetFlow(MatchFlowState next)
        {
            flow = next;
            if (FlowChanged != null) FlowChanged(next);
        }

        private void OnInningsStarted(InningsStartedArgs args)
        {
            RefreshHud();
        }

        private void OnBallCompleted(BallCompletedArgs args)
        {
            // Nothing extra yet - banners are fired by the runner where the
            // visual context (caught/bowled/boundary) is known.
        }

        private void OnInningsCompleted(InningsCompletedArgs args)
        {
            AudioManager.Play(GameSound.CrowdCheer);
        }

        private void OnMatchCompleted(MatchCompletedArgs args)
        {
            AudioManager.Play(GameSound.CrowdCheer);
        }
    }
}
