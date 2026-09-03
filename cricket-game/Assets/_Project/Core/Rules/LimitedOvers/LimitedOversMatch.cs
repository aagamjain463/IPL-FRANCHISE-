using System;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>
    /// A complete limited-overs match state machine (Phase 6 §1, §3-§5, §13, §14).
    ///
    /// Reuses the Super Over engine's chase philosophy — the target is
    /// authoritative, reaching it wins immediately, and there is NO
    /// "highest score wins" logic anywhere. It extends that core with:
    ///   - configurable overs/wickets/bowler caps (MatchSettings);
    ///   - full batting squads with incoming batters;
    ///   - per-over bowler assignment with rotation rules (max overs, no
    ///     consecutive overs);
    ///   - wides/no-balls as extras that never consume a legal ball;
    ///   - strike rotation incl. end-of-over swaps;
    ///   - required run rate and proper cricket over notation.
    ///
    /// Pure C# (no UnityEngine): unit-testable headlessly and mirrored by
    /// harness/limitedovers_reference.py. Presentation layers (Unity, web
    /// preview) drive it via Start/AssignBowler/RecordDelivery and observe it
    /// through events — they never re-implement rules.
    /// </summary>
    public sealed class LimitedOversMatch
    {
        private readonly MatchSettings settings;
        private readonly LimitedOversTeam[] teams = new LimitedOversTeam[2];
        private readonly LimitedOversInnings[] innings = new LimitedOversInnings[2];

        private int firstBattingTeam;                 // toss decision
        private MatchPhase phase = MatchPhase.NotStarted;
        private InningsState state = InningsState.PreInnings;
        private MatchResult result;

        public LimitedOversMatch(MatchSettings settings, LimitedOversTeam teamA, LimitedOversTeam teamB)
        {
            if (settings == null) throw new ArgumentNullException(nameof(settings));
            if (teamA == null) throw new ArgumentNullException(nameof(teamA));
            if (teamB == null) throw new ArgumentNullException(nameof(teamB));

            this.settings = settings;
            teams[0] = teamA;
            teams[1] = teamB;
        }

        // ------------------------------------------------------------------ state

        public MatchSettings Settings { get { return settings; } }
        public MatchPhase Phase { get { return phase; } }
        public InningsState State { get { return state; } }
        public bool IsComplete { get { return phase == MatchPhase.Completed; } }
        public MatchResult Result { get { return result; } }

        public LimitedOversTeam Team(int index) { return teams[index]; }

        /// <summary>Which team is batting in the given innings slot (0 or 1).</summary>
        public int BattingTeamOf(int inningsIndex)
        {
            return inningsIndex == 0 ? firstBattingTeam : 1 - firstBattingTeam;
        }

        public LimitedOversInnings FirstInnings { get { return innings[0]; } }
        public LimitedOversInnings SecondInnings { get { return innings[1]; } }

        /// <summary>The innings currently receiving deliveries; null outside live innings.</summary>
        public LimitedOversInnings CurrentInnings
        {
            get
            {
                if (phase == MatchPhase.FirstInnings) return innings[0];
                if (phase == MatchPhase.SecondInnings) return innings[1];
                return null;
            }
        }

        public int CurrentInningsIndex
        {
            get { return phase == MatchPhase.SecondInnings ? 1 : 0; }
        }

        /// <summary>Chase target (first innings runs + 1); null until the first innings ends.</summary>
        public int? Target
        {
            get
            {
                if (phase == MatchPhase.FirstInnings || phase == MatchPhase.NotStarted) return null;
                return innings[0].Runs + 1;
            }
        }

        /// <summary>Runs still needed by the chasing side; null before the break.</summary>
        public int? RunsRequired
        {
            get
            {
                int? target = Target;
                if (!target.HasValue || innings[1] == null) return null;
                return Math.Max(0, target.Value - innings[1].Runs);
            }
        }

        // ------------------------------------------------------------------ events

        public event Action<InningsStartedArgs> InningsStarted;
        public event Action<BallCompletedArgs> BallCompleted;
        public event Action<OverCompletedArgs> OverCompleted;
        public event Action<WicketArgs> WicketFallen;
        public event Action<InningsCompletedArgs> InningsCompleted;
        public event Action<MatchCompletedArgs> MatchCompleted;

        // ------------------------------------------------------------------ flow

        /// <summary>
        /// Starts the match. The toss is decided by the presentation layer
        /// (coin-flip UX); the engine only needs to know who bats first.
        /// </summary>
        public void Start(int firstBattingTeamIndex)
        {
            if (phase != MatchPhase.NotStarted)
                throw new InvalidOperationException("Match has already started.");
            if (firstBattingTeamIndex != 0 && firstBattingTeamIndex != 1)
                throw new ArgumentOutOfRangeException(nameof(firstBattingTeamIndex));

            firstBattingTeam = firstBattingTeamIndex;
            innings[0] = BuildInnings(0);
            phase = MatchPhase.FirstInnings;
            state = InningsState.PreInnings;
            RaiseInningsStarted(0, null);
        }

        /// <summary>Assigns the bowler for the next over, enforcing rotation rules.</summary>
        public void AssignBowler(int bowlerIndex)
        {
            LimitedOversInnings inn = CurrentInnings;
            if (inn == null)
                throw new InvalidOperationException("No innings is in progress (phase is " + phase + ").");
            if (inn.IsComplete)
                throw new InvalidOperationException("The current innings is already complete.");
            if (!inn.AwaitingBowler)
                throw new InvalidOperationException("A bowler is already assigned for this over.");
            if (!BowlerRotation.CanBowl(inn, bowlerIndex))
                throw new InvalidOperationException(
                    "Bowler #" + bowlerIndex + " is not allowed to bowl this over "
                    + "(max " + settings.MaxOversPerBowler + " overs, no consecutive overs).");

            inn.AssignBowler(bowlerIndex);
            if (state == InningsState.PreInnings || state == InningsState.OverComplete
                || state == InningsState.DrinksBreak)
                state = InningsState.Playing;
        }

        /// <summary>Presentation hook: the bowler has begun the delivery action.</summary>
        public void BeginDelivery()
        {
            RequireLiveInnings("BeginDelivery");
            if (CurrentInnings.CurrentBowlerIndex < 0)
                throw new InvalidOperationException("Assign a bowler before beginning a delivery.");
            state = InningsState.BallInProgress;
        }

        /// <summary>
        /// Records one delivery (legal, wide or no-ball) against the current innings.
        /// Handles target checking, innings completion and match completion.
        /// </summary>
        public BallRecord RecordDelivery(DeliveryOutcome outcome)
        {
            LimitedOversInnings inn = CurrentInnings;
            RequireLiveInnings("RecordDelivery");
            if (inn.IsComplete)
                throw new InvalidOperationException("The current innings is already complete.");

            int? targetForRecord = (phase == MatchPhase.SecondInnings) ? (int?)(innings[0].Runs + 1) : null;
            bool wicket = outcome.IsWicket;
            int strikerBefore = inn.Striker;
            BallRecord record = inn.ApplyOutcome(outcome, CurrentInningsIndex, targetForRecord);

            if (wicket)
            {
                WicketFallen?.Invoke(new WicketArgs
                {
                    InningsIndex = CurrentInningsIndex,
                    BatterIndex = strikerBefore,
                    BatterName = inn.Batters[strikerBefore].Name,
                    Dismissal = outcome.Dismissal
                });
            }

            state = InningsState.BallComplete;
            if (record.OverJustCompleted)
            {
                state = InningsState.OverComplete;
                OverCompleted?.Invoke(new OverCompletedArgs
                {
                    InningsIndex = CurrentInningsIndex,
                    Over = inn.Overs[inn.Overs.Count - 1]
                });
            }

            BallCompleted?.Invoke(new BallCompletedArgs { Record = record });

            // --- Chase rule: the second innings WINS the instant it reaches the target.
            if (phase == MatchPhase.SecondInnings)
            {
                int target = innings[0].Runs + 1;
                if (innings[1].Runs >= target)
                {
                    CompleteMatch(MatchOutcome.SecondInningsWin);
                    return record;
                }
            }

            if (inn.IsComplete)
            {
                if (phase == MatchPhase.FirstInnings)
                {
                    phase = MatchPhase.InningsBreak;
                    state = InningsState.InningsBreak;
                    RaiseInningsCompleted(0, innings[0], innings[0].Runs + 1);
                }
                else
                {
                    MatchOutcome outcomeKind = innings[1].Runs == innings[0].Runs
                        ? MatchOutcome.Tie
                        : MatchOutcome.FirstInningsWin;
                    CompleteMatch(outcomeKind);
                }
            }
            return record;
        }

        /// <summary>Begins the chase after the innings break.</summary>
        public void StartSecondInnings()
        {
            if (phase != MatchPhase.InningsBreak)
                throw new InvalidOperationException(
                    "The second innings can only start during the innings break (phase is " + phase + ").");

            innings[1] = BuildInnings(1);
            phase = MatchPhase.SecondInnings;
            state = InningsState.PreInnings;
            RaiseInningsStarted(1, innings[0].Runs + 1);
        }

        /// <summary>Optional presentation pause (Phase 6 §3 DrinksBreak state).</summary>
        public void BeginDrinksBreak()
        {
            RequireLiveInnings("BeginDrinksBreak");
            state = InningsState.DrinksBreak;
        }

        public void EndDrinksBreak()
        {
            RequireLiveInnings("EndDrinksBreak");
            if (state != InningsState.DrinksBreak)
                throw new InvalidOperationException("No drinks break is in progress.");
            state = CurrentInnings.AwaitingBowler ? InningsState.OverComplete : InningsState.Playing;
        }

        // ------------------------------------------------------------------ internals

        private LimitedOversInnings BuildInnings(int inningsIndex)
        {
            int battingTeam = BattingTeamOf(inningsIndex);
            int bowlingTeam = 1 - battingTeam;
            return new LimitedOversInnings(
                settings,
                teams[battingTeam].Name, teams[battingTeam].Batters,
                teams[bowlingTeam].Name, teams[bowlingTeam].Bowlers);
        }

        private void RequireLiveInnings(string action)
        {
            if (phase != MatchPhase.FirstInnings && phase != MatchPhase.SecondInnings)
                throw new InvalidOperationException(
                    action + ": no innings is in progress (phase is " + phase + "). "
                    + (phase == MatchPhase.NotStarted ? "Call Start() first."
                    : phase == MatchPhase.InningsBreak ? "Call StartSecondInnings() first."
                    : "The match is already completed."));
        }

        private void CompleteMatch(MatchOutcome outcome)
        {
            LimitedOversInnings current = CurrentInnings;
            RaiseInningsCompleted(CurrentInningsIndex, current,
                phase == MatchPhase.FirstInnings ? (int?)(innings[0].Runs + 1) : null);

            int target = innings[0].Runs + 1;
            result = new MatchResult
            {
                Outcome = outcome,
                WinnerInningsIndex = outcome == MatchOutcome.FirstInningsWin ? 0
                    : outcome == MatchOutcome.SecondInningsWin ? 1 : -1,
                Target = target,
                MarginRuns = outcome == MatchOutcome.FirstInningsWin
                    ? innings[0].Runs - innings[1].Runs : 0,
                MarginWickets = outcome == MatchOutcome.SecondInningsWin
                    ? settings.WicketsPerInnings - innings[1].Wickets : 0,
                MarginBalls = outcome == MatchOutcome.SecondInningsWin
                    ? settings.BallsPerInnings - innings[1].LegalBalls : 0,
                FirstInnings = InningsSummary.From2(innings[0]),
                SecondInnings = InningsSummary.From2(innings[1]),
                Scorecard = LimitedOversScorecard.Build(this)
            };

            phase = MatchPhase.Completed;
            state = InningsState.MatchComplete;
            MatchCompleted?.Invoke(new MatchCompletedArgs { Result = result });
        }

        private void RaiseInningsStarted(int index, int? target)
        {
            InningsStarted?.Invoke(new InningsStartedArgs { InningsIndex = index, Target = target });
        }

        private void RaiseInningsCompleted(int index, LimitedOversInnings inn, int? targetSet)
        {
            state = InningsState.InningsComplete;
            InningsCompleted?.Invoke(new InningsCompletedArgs
            {
                InningsIndex = index,
                Runs = inn.Runs,
                Wickets = inn.Wickets,
                LegalBalls = inn.LegalBalls,
                TargetSet = targetSet
            });
        }
    }
}
