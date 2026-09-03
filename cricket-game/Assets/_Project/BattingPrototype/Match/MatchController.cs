using System.Collections;
using System.Collections.Generic;
using CricketGame.Core.AI;
using CricketGame.Core.Batting;
using CricketGame.Core.Fielding;
using CricketGame.Core.Rules;
using CricketGame.Core.Rules.LimitedOvers;
using CricketGame.BattingPrototype.Audio;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.World;
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
    /// rules live anywhere else. Wraps the deterministic limited-overs engine
    /// (Phase 6), which also runs the Super Over via MatchSettings.SuperOver().
    ///
    /// Match shape used by the prototype:
    ///   Innings 1 - the PLAYER bats, the AI bowls.
    ///   Innings 2 - the AI bats (chases), the PLAYER bowls.
    /// The player always wins the toss and bats first (pre-match presentation).
    /// </summary>
    public sealed class MatchController : MonoBehaviour
    {
        private LimitedOversMatch match;
        private MatchSettings settings;
        private BattingHud hud;
        private AiDifficulty difficulty = AiDifficulty.Medium;
        private MatchFlowState flow = MatchFlowState.PreMatch;
        private bool waitingForPlayAgain;

        /// <summary>Phase 4 (spec section 8): the AI batter's personality.
        /// Adjustable live from the debug panel.</summary>
        public AiBatterArchetype AiArchetype = AiBatterArchetype.Balanced;

        public event System.Action<MatchFlowState> FlowChanged;
        public event System.Action TargetReached;
        public event System.Action<LimitedOversMatch> MatchFinished;

        /// <summary>Phase 6: raised whenever the rules engine is (re)built -
        /// observers re-bind to the new engine instance.</summary>
        public event System.Action EngineReplaced;

        /// <summary>Spec section 1 delivery-level events. The rules engine's
        /// own events remain available on <see cref="Match"/> too.</summary>
        public event System.Action<int> DeliveryStarted;             // innings index
        public event System.Action<BallRecord> LegalBall;
        public event System.Action<int, int> RunsScored;             // runs, innings index
        public event System.Action<BallRecord> WicketBall;
        public event System.Action<OverRecord> OverCompleted;        // 6 legal balls

        public LimitedOversMatch Match { get { return match; } }
        public MatchSettings Settings { get { return settings; } }
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
            settings = MatchSettings.SuperOver();
            ResetMatch();
        }

        /// <summary>Phase 6: switches format (Super Over / quick / 20 over)
        /// and restarts. Called from the pre-match screen.</summary>
        public void Configure(MatchSettings next)
        {
            if (next == null) return;
            settings = next;
            ResetMatch();
        }

        /// <summary>(Re)starts a fresh match - also how PLAY AGAIN works.</summary>
        public void ResetMatch()
        {
            BuildEngine();
            waitingForPlayAgain = false;
            ClearBatterHistory();          // Phase 4: fresh bowler memory
            SetFlow(MatchFlowState.Innings1);
            AudioManager.Play(GameSound.InningsStart);
        }

        private void BuildEngine()
        {
            // Player squad bats first; AI chases. Squads come from the team
            // kits (named players first, fictional reserves after).
            int batterCount = settings.MinimumBatters;
            int bowlerCount = Mathf.Max(5, settings.MinimumBowlers);
            var teamYou = new LimitedOversTeam(
                TeamKit.You.SideName,
                TeamKit.SquadNames(TeamKit.You, batterCount),
                TeamKit.BowlerNames(TeamKit.You, bowlerCount));
            var teamAi = new LimitedOversTeam(
                TeamKit.Ai.SideName,
                TeamKit.SquadNames(TeamKit.Ai, batterCount),
                TeamKit.BowlerNames(TeamKit.Ai, bowlerCount));

            match = new LimitedOversMatch(settings, teamYou, teamAi);
            match.Start(0);                                // player bats first
            if (EngineReplaced != null) EngineReplaced();
            RefreshHud();
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
            LimitedOversInnings current = match.CurrentInnings;
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

        // ------------------------------------------------------------------ Phase 4
        // AI bowling strategy (spec section 10): the bowler remembers the
        // player's recent scoring and adapts. Understandable + tunable.
        private readonly List<BatterHistoryEntry> batterHistory = new List<BatterHistoryEntry>();
        private readonly CricketGame.Core.Simulation.IRng bowlRng
            = new CricketGame.Core.Simulation.SystemRng();

        /// <summary>Runner records what the player did with each shot so the
        /// AI bowler can read it (sector / runs / intent).</summary>
        public void NoteBatterShot(DirectionSector sector, int runs, ShotIntent intent)
        {
            batterHistory.Add(new BatterHistoryEntry
            {
                HasSector = true,
                Sector = sector,
                Runs = runs,
                Intent = intent
            });
            while (batterHistory.Count > 6) batterHistory.RemoveAt(0);
        }

        /// <summary>Clears the bowler's memory (new innings / new match).</summary>
        public void ClearBatterHistory()
        {
            batterHistory.Clear();
        }

        /// <summary>The AI bowler's plan for the next ball (null when the
        /// player is batting and no adaptive bowling applies).</summary>
        public AiBowlingPlan? NextAiBowlingPlan()
        {
            if (!PlayerIsBatting || match == null || match.IsComplete) return null;
            LimitedOversInnings current = match.CurrentInnings;
            var ctx = new AiBowlingContext
            {
                Score = current != null ? current.Runs : 0,
                WicketsRemaining = current != null ? current.WicketsRemaining : 0,
                BallsRemaining = current != null ? current.BallsRemaining : 0,
            };
            return AiBowlingPlanner.Plan(bowlRng, batterHistory.ToArray(), ctx, difficulty);
        }

        // ------------------------------------------------------------------ recording

        /// <summary>Records one resolved delivery into the rules engine.</summary>
        public BallRecord RecordDelivery(DeliveryOutcome outcome)
        {
            EnsureBowlerAssigned();
            int inningsIndex = match.CurrentInningsIndex;
            BallRecord record = match.RecordDelivery(outcome);
            RefreshHud();

            if (outcome.CountsAsLegalBall && LegalBall != null) LegalBall(record);
            if (outcome.TotalRuns > 0 && RunsScored != null)
                RunsScored(outcome.TotalRuns, inningsIndex);
            if (outcome.IsWicket && WicketBall != null) WicketBall(record);
            if (record.OverJustCompleted && OverCompleted != null)
                OverCompleted(match.CurrentInnings != null
                    ? match.CurrentInnings.Overs[match.CurrentInnings.Overs.Count - 1]
                    : LastOverOfCompletedInnings(inningsIndex));

            if (match.Phase == MatchPhase.SecondInnings && match.RunsRequired.HasValue
                && match.RunsRequired.Value == 0)
            {
                if (TargetReached != null) TargetReached();
            }
            return record;
        }

        private OverRecord LastOverOfCompletedInnings(int inningsIndex)
        {
            var inn = inningsIndex == 0 ? match.FirstInnings : match.SecondInnings;
            return inn != null && inn.Overs.Count > 0 ? inn.Overs[inn.Overs.Count - 1] : null;
        }

        /// <summary>
        /// Bowler assignment happens automatically between overs: the engine's
        /// rotation policy picks a legal bowler (max-overs cap, no consecutive
        /// overs). Names are presentation - the AI always physically bowls
        /// innings 1 and the player always physically bowls innings 2.
        /// </summary>
        private void EnsureBowlerAssigned()
        {
            LimitedOversInnings inn = match.CurrentInnings;
            if (inn == null || inn.IsComplete) return;
            if (inn.AwaitingBowler)
            {
                int pick = BowlerRotation.SuggestNextBowler(inn);
                if (pick >= 0) match.AssignBowler(pick);
            }
        }

        /// <summary>The runner calls this as each delivery is released.</summary>
        public void NotifyDeliveryStarted()
        {
            if (DeliveryStarted != null) DeliveryStarted(match.CurrentInningsIndex);
        }

        /// <summary>Debug (spec section 25): force the current innings to its
        /// end so the break / chase / result flow can be jumped to.</summary>
        public void DebugForceInningsEnd()
        {
            LimitedOversInnings innings = match.CurrentInnings;
            if (innings == null || match.IsComplete) return;
            innings.DebugOverride(innings.Runs, innings.Wickets, innings.BallsPerInnings);
            match.DebugReevaluateAfterOverride();
            RefreshHud();
        }

        /// <summary>Scoreboard + chase line for the HUD.</summary>
        public void RefreshHud()
        {
            if (hud == null || match == null) return;
            LimitedOversInnings current = match.CurrentInnings;
            if (current == null) current = match.SecondInnings;
            if (current == null) return;

            hud.SetScoreboard(current.Runs, current.Wickets, current.LegalBalls);
            if (match.Phase == MatchPhase.SecondInnings || match.Phase == MatchPhase.Completed)
            {
                hud.SetChaseInfo(match.Target ?? 0, match.RunsRequired ?? 0,
                                 current.BallsRemaining, current.WicketsRemaining,
                                 current.CurrentRunRate);
            }
            else
            {
                hud.SetChaseInfo(0, 0, current.BallsRemaining, current.WicketsRemaining,
                                 current.CurrentRunRate);
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
                hud.ShowInningsBreak(match.Target ?? 0, BuildBreakSummary());
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

        /// <summary>Phase 6 §23: innings-break summary (top scorer, best
        /// bowler, overs) - presentation text only, stats come from the engine.</summary>
        private string BuildBreakSummary()
        {
            var inn = match.FirstInnings;
            var top = inn.TopScorer;
            var best = inn.BestBowler;
            string s = inn.BattingSideName + "  " + inn.ScoreDisplay
                       + "  (" + inn.OversDisplay + " ov)";
            if (top != null) s += "\nTOP SCORER   " + top.Name + "  " + top.Runs;
            if (best != null) s += "\nBEST BOWLING   " + best.Name + "  " + best.Figures;
            return s;
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
    }
}
