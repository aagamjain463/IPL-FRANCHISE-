using System;

namespace CricketGame.Core.Rules
{
    /// <summary>Phases of a Super Over match.</summary>
    public enum MatchPhase
    {
        NotStarted,
        FirstInnings,
        InningsBreak,
        SecondInnings,
        Completed
    }

    /// <summary>Event payload: one delivery has been applied to the match.</summary>
    public struct BallCompletedArgs
    {
        public BallRecord Record;
    }

    /// <summary>Event payload: an innings has started.</summary>
    public struct InningsStartedArgs
    {
        public int InningsIndex;

        /// <summary>The chase target for the second innings; null for the first.</summary>
        public int? Target;
    }

    /// <summary>Event payload: an innings has ended.</summary>
    public struct InningsCompletedArgs
    {
        public int InningsIndex;
        public int Runs;
        public int Wickets;
        public int LegalBalls;

        /// <summary>Target set for the chase; null when the first innings ends.</summary>
        public int? TargetSet;
    }

    /// <summary>Event payload: the match is finished.</summary>
    public struct MatchCompletedArgs
    {
        public MatchResult Result;
    }

    /// <summary>
    /// A complete, chase-based SUPER OVER state machine.
    ///
    /// Rules implemented (see SuperOverConfig for parameters):
    ///   - 6 legal balls per innings; wides/no-balls add runs without consuming a ball.
    ///   - Maximum 2 wickets per innings; losing the 2nd wicket ends the innings.
    ///   - The first innings establishes the target: first-innings runs + 1.
    ///   - The second innings WINS immediately the moment it reaches the target,
    ///     on whichever delivery that happens.
    ///   - The second innings LOSES if the balls run out below the target, or if
    ///     2 wickets fall before the target is reached.
    ///   - If the second innings finishes exactly level with the first innings
    ///     score, the result is a Tie. There is deliberately NO "highest score
    ///     wins" logic anywhere in this engine.
    ///
    /// The engine is pure C# (no UnityEngine) so it can be unit tested headlessly
    /// and later driven from — or report results to — an external web application.
    /// </summary>
    public sealed class SuperOverMatch
    {
        private readonly SuperOverConfig config;
        private readonly Innings firstInnings;
        private readonly Innings secondInnings;

        private MatchPhase phase = MatchPhase.NotStarted;
        private MatchResult result;

        public SuperOverMatch(SuperOverConfig config)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            this.config = config;
            firstInnings = new Innings(config);
            secondInnings = new Innings(config);
        }

        // ------------------------------------------------------------------ state

        public SuperOverConfig Config { get { return config; } }
        public MatchPhase Phase { get { return phase; } }

        /// <summary>True once the match has reached a final result.</summary>
        public bool IsComplete { get { return phase == MatchPhase.Completed; } }
        public Innings FirstInnings { get { return firstInnings; } }
        public Innings SecondInnings { get { return secondInnings; } }

        /// <summary>The match result; null until the match completes.</summary>
        public MatchResult Result { get { return result; } }

        /// <summary>The innings currently receiving deliveries; null outside live innings.</summary>
        public Innings CurrentInnings
        {
            get
            {
                if (phase == MatchPhase.FirstInnings) return firstInnings;
                if (phase == MatchPhase.SecondInnings) return secondInnings;
                return null;
            }
        }

        /// <summary>0 during the first innings, 1 during the second.</summary>
        public int CurrentInningsIndex
        {
            get { return phase == MatchPhase.SecondInnings ? 1 : 0; }
        }

        /// <summary>
        /// Chase target (first innings runs + 1). Null until the first innings has ended.
        /// </summary>
        public int? Target
        {
            get
            {
                if (phase == MatchPhase.FirstInnings || phase == MatchPhase.NotStarted) return null;
                return firstInnings.Runs + 1;
            }
        }

        /// <summary>
        /// Runs the chasing side still needs. During the break this equals the full
        /// target; during the chase it is target minus current runs (never negative).
        /// Null before the first innings has finished.
        /// </summary>
        public int? RunsRequired
        {
            get
            {
                int? target = Target;
                if (!target.HasValue) return null;
                return Math.Max(0, target.Value - secondInnings.Runs);
            }
        }

        public bool IsChaseInProgress
        {
            get { return phase == MatchPhase.SecondInnings; }
        }

        // ------------------------------------------------------------------ events

        public event Action<InningsStartedArgs> InningsStarted;
        public event Action<BallCompletedArgs> BallCompleted;
        public event Action<InningsCompletedArgs> InningsCompleted;
        public event Action<MatchCompletedArgs> MatchCompleted;

        // ------------------------------------------------------------------ flow

        /// <summary>Starts the first innings (the side batting first sets the target).</summary>
        public void Start()
        {
            if (phase != MatchPhase.NotStarted)
                throw new InvalidOperationException("Match has already started.");

            phase = MatchPhase.FirstInnings;
            RaiseInningsStarted(0, null);
        }

        /// <summary>Begins the chase after the innings break.</summary>
        public void StartSecondInnings()
        {
            if (phase != MatchPhase.InningsBreak)
                throw new InvalidOperationException(
                    "The second innings can only start during the innings break (phase is " + phase + ").");

            phase = MatchPhase.SecondInnings;
            RaiseInningsStarted(1, firstInnings.Runs + 1);
        }

        /// <summary>
        /// Records one delivery (legal ball, wide or no-ball) against the current innings.
        /// Handles target checking, innings completion and match completion.
        /// </summary>
        public void RecordDelivery(DeliveryOutcome outcome)
        {
            if (phase != MatchPhase.FirstInnings && phase != MatchPhase.SecondInnings)
                throw new InvalidOperationException(
                    "No innings is in progress (phase is " + phase + "). " +
                    (phase == MatchPhase.NotStarted ? "Call Start() first." :
                     phase == MatchPhase.InningsBreak ? "Call StartSecondInnings() first." :
                     "The match is already completed."));

            Innings innings = CurrentInnings;
            if (innings.IsComplete)
                throw new InvalidOperationException("The current innings is already complete.");

            int? targetForRecord = (phase == MatchPhase.SecondInnings) ? (int?)(firstInnings.Runs + 1) : null;
            BallRecord record = innings.ApplyOutcome(outcome, CurrentInningsIndex, targetForRecord);
            RaiseBallCompleted(record);

            // --- Chase rule: the second innings WINS the instant it reaches the target.
            //     This is checked before ball/wicket exhaustion so a winning delivery
            //     always wins, even if it was the last ball or a wicket also fell
            //     (e.g. runs completed before a run-out on a no-ball).
            if (phase == MatchPhase.SecondInnings)
            {
                int target = firstInnings.Runs + 1;
                if (secondInnings.Runs >= target)
                {
                    CompleteMatch(MatchOutcome.SecondInningsWin);
                    return;
                }
            }

            if (innings.IsComplete)
            {
                if (phase == MatchPhase.FirstInnings)
                {
                    phase = MatchPhase.InningsBreak;
                    RaiseInningsCompleted(0, firstInnings, firstInnings.Runs + 1);
                }
                else
                {
                    // Chase ended below the target: a loss for the chasing side —
                    // unless scores are exactly level, which is a tie.
                    MatchOutcome outcomeKind = secondInnings.Runs == firstInnings.Runs
                        ? MatchOutcome.Tie
                        : MatchOutcome.FirstInningsWin;
                    CompleteMatch(outcomeKind);
                }
            }
        }

        /// <summary>
        /// DEBUG ONLY (spec section 25): re-runs the completion checks after an
        /// <see cref="Innings.DebugOverride"/>. Real match flow never calls this;
        /// it exists so the debug panel can jump straight to the innings break,
        /// the chase or the result screen.
        /// </summary>
        public void DebugReevaluateAfterOverride()
        {
            if (phase == MatchPhase.FirstInnings && firstInnings.IsComplete)
            {
                phase = MatchPhase.InningsBreak;
                RaiseInningsCompleted(0, firstInnings, firstInnings.Runs + 1);
            }
            else if (phase == MatchPhase.SecondInnings && secondInnings.IsComplete)
            {
                int target = firstInnings.Runs + 1;
                if (secondInnings.Runs >= target) CompleteMatch(MatchOutcome.SecondInningsWin);
                else if (secondInnings.Runs == firstInnings.Runs) CompleteMatch(MatchOutcome.Tie);
                else CompleteMatch(MatchOutcome.FirstInningsWin);
            }
        }

        // ------------------------------------------------------------------ internals

        private void CompleteMatch(MatchOutcome outcome)
        {
            Innings current = CurrentInnings;
            RaiseInningsCompleted(CurrentInningsIndex, current,
                phase == MatchPhase.FirstInnings ? (int?)(firstInnings.Runs + 1) : null);

            int target = firstInnings.Runs + 1;
            result = new MatchResult
            {
                Outcome = outcome,
                WinnerInningsIndex = outcome == MatchOutcome.FirstInningsWin ? 0
                    : outcome == MatchOutcome.SecondInningsWin ? 1 : -1,
                Target = target,
                MarginRuns = outcome == MatchOutcome.FirstInningsWin
                    ? firstInnings.Runs - secondInnings.Runs : 0,
                MarginWickets = outcome == MatchOutcome.SecondInningsWin
                    ? config.MaxWicketsPerInnings - secondInnings.Wickets : 0,
                MarginBalls = outcome == MatchOutcome.SecondInningsWin
                    ? config.BallsPerInnings - secondInnings.LegalBalls : 0,
                FirstInnings = InningsSummary.From(firstInnings),
                SecondInnings = InningsSummary.From(secondInnings)
            };

            phase = MatchPhase.Completed;
            if (MatchCompleted != null) MatchCompleted(new MatchCompletedArgs { Result = result });
        }

        private void RaiseInningsStarted(int index, int? target)
        {
            if (InningsStarted != null)
                InningsStarted(new InningsStartedArgs { InningsIndex = index, Target = target });
        }

        private void RaiseBallCompleted(BallRecord record)
        {
            if (BallCompleted != null) BallCompleted(new BallCompletedArgs { Record = record });
        }

        private void RaiseInningsCompleted(int index, Innings innings, int? targetSet)
        {
            if (InningsCompleted != null)
                InningsCompleted(new InningsCompletedArgs
                {
                    InningsIndex = index,
                    Runs = innings.Runs,
                    Wickets = innings.Wickets,
                    LegalBalls = innings.LegalBalls,
                    TargetSet = targetSet
                });
        }
    }
}
