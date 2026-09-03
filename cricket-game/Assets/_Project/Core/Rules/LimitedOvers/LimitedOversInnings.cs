using System;
using System.Collections.Generic;
using System.Globalization;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>One completed over's record for the scorecard and over-summary UI.</summary>
    [Serializable]
    public sealed class OverRecord
    {
        public int OverNumber;          // 1-based
        public int BowlerIndex;
        public int Runs;                // all runs in the over incl. extras
        public int Wickets;
        public List<string> BallMarks = new List<string>();  // "1","wd","W",...
        public bool IsMaiden;
    }

    /// <summary>
    /// The state of one limited-overs innings (Phase 6 §3-§5, §7, §12, §17).
    ///
    /// Extends the Super Over concepts without touching them:
    ///   - full batting squad with per-batter cards and an incoming-batter queue;
    ///   - per-over bowler assignment with full bowling figures;
    ///   - wides/no-balls tracked as extras that never consume a legal ball;
    ///   - strike rotation: odd runs swap, even stay, boundaries stay,
    ///     ends swap at the end of every over;
    ///   - proper cricket over notation (12.3 == 12 overs + 3 balls).
    ///
    /// All mutation goes through <see cref="AssignBowler"/> and
    /// <see cref="ApplyOutcome"/>. The owning <see cref="LimitedOversMatch"/>
    /// decides WHEN deliveries may happen; this class enforces HOW they score.
    /// </summary>
    public sealed class LimitedOversInnings
    {
        private readonly MatchSettings settings;
        private readonly BatterCard[] batters;
        private readonly BowlerCard[] bowlers;
        private readonly List<OverRecord> overs = new List<OverRecord>();
        private readonly List<BallRecord> deliveries = new List<BallRecord>();

        // current-over scratch state
        private int currentOverBowler = -1;
        private int currentOverRuns;
        private int currentOverWickets;
        private int currentOverLegalBalls;
        private readonly List<string> currentOverMarks = new List<string>();

        public LimitedOversInnings(
            MatchSettings settings,
            string battingSideName,
            IList<string> batterNames,
            string bowlingSideName,
            IList<string> bowlerNames)
        {
            if (settings == null) throw new ArgumentNullException(nameof(settings));
            if (batterNames == null || batterNames.Count < settings.MinimumBatters)
                throw new ArgumentException(
                    "Batting squad needs at least " + settings.MinimumBatters + " players.", nameof(batterNames));
            if (bowlerNames == null || bowlerNames.Count < settings.MinimumBowlers)
                throw new ArgumentException(
                    "Bowling side needs at least " + settings.MinimumBowlers + " bowlers to cover "
                    + settings.OversPerInnings + " overs at " + settings.MaxOversPerBowler + " each.",
                    nameof(bowlerNames));

            this.settings = settings;
            BattingSideName = battingSideName ?? "";
            BowlingSideName = bowlingSideName ?? "";

            batters = new BatterCard[batterNames.Count];
            for (int i = 0; i < batterNames.Count; i++) batters[i] = new BatterCard(batterNames[i]);
            bowlers = new BowlerCard[bowlerNames.Count];
            for (int i = 0; i < bowlerNames.Count; i++) bowlers[i] = new BowlerCard(bowlerNames[i]);

            Striker = 0;
            NonStriker = 1;
            nextBatterIndex = 2;
        }

        // ------------------------------------------------------------------ identity

        public MatchSettings Settings { get { return settings; } }
        public string BattingSideName { get; }
        public string BowlingSideName { get; }
        public IReadOnlyList<BatterCard> Batters { get { return batters; } }
        public IReadOnlyList<BowlerCard> Bowlers { get { return bowlers; } }
        public IReadOnlyList<OverRecord> Overs { get { return overs; } }
        public IReadOnlyList<BallRecord> Deliveries { get { return deliveries; } }

        // ------------------------------------------------------------------ counters

        public int Runs { get; private set; }
        public int Wickets { get; private set; }
        public int LegalBalls { get; private set; }
        public int TotalDeliveries { get; private set; }
        public int ExtrasWides { get; private set; }
        public int ExtrasNoBalls { get; private set; }

        public int ExtrasTotal { get { return ExtrasWides + ExtrasNoBalls; } }

        /// <summary>Current batter slots; the striker faces the next delivery.</summary>
        public int Striker { get; private set; }
        public int NonStriker { get; private set; }
        private int nextBatterIndex;

        /// <summary>Completed overs (legal balls / balls per over).</summary>
        public int CompletedOvers { get { return LegalBalls / settings.BallsPerOver; } }

        /// <summary>Legal balls bowled in the over currently in progress.</summary>
        public int BallsInCurrentOver { get { return currentOverLegalBalls; } }

        /// <summary>True between overs while the next bowler has not been assigned.</summary>
        public bool AwaitingBowler { get { return currentOverBowler < 0 && !IsComplete; } }

        public int CurrentBowlerIndex { get { return currentOverBowler; } }

        /// <summary>The bowler delivering the current over (null between overs).</summary>
        public BowlerCard CurrentBowler
        {
            get { return currentOverBowler < 0 ? null : bowlers[currentOverBowler]; }
        }

        public bool IsComplete
        {
            get { return LegalBalls >= settings.BallsPerInnings || Wickets >= settings.WicketsPerInnings; }
        }

        /// <summary>Why the innings ended; meaningful once IsComplete.</summary>
        public string CompletionReason
        {
            get
            {
                if (!IsComplete) return "";
                if (Wickets >= settings.WicketsPerInnings) return "all out";
                return "overs completed";
            }
        }

        public int BallsRemaining
        {
            get { return Math.Max(0, settings.BallsPerInnings - LegalBalls); }
        }

        public int WicketsRemaining
        {
            get { return Math.Max(0, settings.WicketsPerInnings - Wickets); }
        }

        /// <summary>Cricket notation "172/6"; all-out sides still show wickets lost.</summary>
        public string ScoreDisplay
        {
            get { return Runs + "/" + Wickets; }
        }

        /// <summary>Overs consumed as cricket notation, e.g. "12.3" = 12 overs + 3 legal balls.</summary>
        public string OversDisplay
        {
            get
            {
                int complete = LegalBalls / settings.BallsPerOver;
                return complete + "." + (LegalBalls % settings.BallsPerOver);
            }
        }

        /// <summary>Runs per over so far (Phase 6 §16); 0 before any legal ball.</summary>
        public float CurrentRunRate
        {
            get { return LegalBalls <= 0 ? 0f : Runs / (LegalBalls / 6f); }
        }

        /// <summary>True while the innings is inside its powerplay window (Phase 6 §19).</summary>
        public bool InPowerplay
        {
            get { return settings.IsPowerplayOver(CompletedOvers); }
        }

        /// <summary>Total legal balls in this innings (convenience).</summary>
        public int BallsPerInnings
        {
            get { return settings.BallsPerInnings; }
        }

        // ------------------------------------------------------------------ chase math

        /// <summary>Runs still needed to beat the target (never negative).</summary>
        public int RunsRequired(int target)
        {
            return Math.Max(0, target - Runs);
        }

        /// <summary>
        /// Required run rate (Phase 6 §15): runs needed over balls remaining,
        /// expressed per 6-ball over. 0 when nothing is required or no balls remain.
        /// </summary>
        public float RequiredRunRate(int target)
        {
            int need = RunsRequired(target);
            if (need <= 0 || BallsRemaining <= 0) return 0f;
            return need / (BallsRemaining / 6f);
        }

        /// <summary>Compact chase line, e.g. "NEED 86 OFF 45 (RRR 11.47)".</summary>
        public string ChaseDisplay(int target)
        {
            int need = RunsRequired(target);
            if (need <= 0) return "TARGET REACHED";
            return "NEED " + need + " OFF " + BallsRemaining
                   + " (RRR " + RequiredRunRate(target).ToString("0.00", CultureInfo.InvariantCulture) + ")";
        }

        // ------------------------------------------------------------------ bowler assignment

        /// <summary>
        /// Assigns the bowler for the over about to start. Only valid at the start
        /// of an over; the match layer enforces the rotation rules (max overs,
        /// no consecutive overs) before calling this.
        /// </summary>
        public void AssignBowler(int bowlerIndex)
        {
            if (IsComplete)
                throw new InvalidOperationException("The innings is already complete.");
            if (currentOverBowler >= 0 && currentOverLegalBalls < settings.BallsPerOver)
                throw new InvalidOperationException("A bowler is already assigned for this over.");
            if (bowlerIndex < 0 || bowlerIndex >= bowlers.Length)
                throw new ArgumentOutOfRangeException(nameof(bowlerIndex));

            // Rolling over an over boundary: finalise the finished over first.
            if (currentOverBowler >= 0)
                FinaliseOver();

            currentOverBowler = bowlerIndex;
            currentOverRuns = 0;
            currentOverWickets = 0;
            currentOverLegalBalls = 0;
            currentOverMarks.Clear();
        }

        public int LastOverBowlerIndex { get; private set; } = -1;

        // ------------------------------------------------------------------ deliveries

        /// <summary>
        /// Applies one delivery attempt to this innings and returns its record.
        /// Handles extras, batter/bowler credits, strike rotation, wickets,
        /// incoming batters and over completion.
        /// </summary>
        public BallRecord ApplyOutcome(DeliveryOutcome outcome, int inningsIndex, int? target)
        {
            if (IsComplete)
                throw new InvalidOperationException("The innings is already complete.");
            if (currentOverBowler < 0)
                throw new InvalidOperationException("Assign a bowler before recording deliveries.");

            BatterCard striker = batters[Striker];
            BowlerCard bowler = bowlers[currentOverBowler];

            // --- runs & extras
            Runs += outcome.TotalRuns;
            currentOverRuns += outcome.TotalRuns;
            if (outcome.Kind == DeliveryKind.Wide) ExtrasWides += outcome.ExtraRuns;
            else if (outcome.Kind == DeliveryKind.NoBall) ExtrasNoBalls += outcome.ExtraRuns;

            // --- batter credit (bat runs score on legal balls and no-balls)
            striker.ApplyDelivery(outcome);

            // --- bowler credit (all runs conceded count against figures)
            bool creditableWicket = outcome.IsWicket && outcome.Dismissal != DismissalKind.RunOut;
            bowler.ApplyDelivery(outcome, creditableWicket);

            // --- wicket / strike rotation
            if (outcome.IsWicket)
            {
                striker.RecordDismissal(outcome.Dismissal, currentOverBowler, -1);
                Wickets = Math.Min(settings.WicketsPerInnings, Wickets + 1);
                currentOverWickets++;

                // Completed runs happen before the dismissal, so odd-run rotation
                // is applied first; the incoming batter then takes the striker's end.
                if (outcome.BatRuns % 2 == 1) SwapStrike();

                if (Wickets < settings.WicketsPerInnings)
                {
                    Striker = nextBatterIndex;
                    nextBatterIndex++;
                }
            }
            else if (outcome.BatRuns % 2 == 1)
            {
                SwapStrike();
            }

            // --- ball counters
            TotalDeliveries++;
            currentOverMarks.Add(outcome.ToString());
            bool overJustCompleted = false;
            if (outcome.CountsAsLegalBall)
            {
                LegalBalls++;
                currentOverLegalBalls++;
                if (currentOverLegalBalls >= settings.BallsPerOver)
                {
                    FinaliseOver();
                    overJustCompleted = true;
                    if (!IsComplete) SwapStrike();   // ends change at the end of the over
                }
            }

            var record = new BallRecord
            {
                InningsIndex = inningsIndex,
                DeliveryNumberInInnings = TotalDeliveries,
                Outcome = outcome,
                TotalRunsAfter = Runs,
                WicketsAfter = Wickets,
                LegalBallsAfter = LegalBalls,
                TargetAtDelivery = target,
                RunsNeededAfter = target.HasValue ? Math.Max(0, target.Value - Runs) : (int?)null,
                OverJustCompleted = overJustCompleted
            };
            deliveries.Add(record);
            return record;
        }

        private void FinaliseOver()
        {
            BowlerCard bowler = bowlers[currentOverBowler];
            bool maiden = currentOverLegalBalls >= settings.BallsPerOver && currentOverRuns == 0;
            bowler.CompleteOver(settings.BallsPerOver);

            overs.Add(new OverRecord
            {
                OverNumber = overs.Count + 1,
                BowlerIndex = currentOverBowler,
                Runs = currentOverRuns,
                Wickets = currentOverWickets,
                IsMaiden = maiden,
                BallMarks = new List<string>(currentOverMarks)
            });

            LastOverBowlerIndex = currentOverBowler;
            currentOverBowler = -1;
            currentOverRuns = 0;
            currentOverWickets = 0;
            currentOverLegalBalls = 0;
            currentOverMarks.Clear();
        }

        public void SwapStrike()
        {
            int tmp = Striker;
            Striker = NonStriker;
            NonStriker = tmp;
        }

        // ------------------------------------------------------------------ presentation helpers

        /// <summary>Highest-scoring batter (first batter wins ties). Null for empty innings.</summary>
        public BatterCard TopScorer
        {
            get
            {
                BatterCard best = null;
                foreach (BatterCard b in batters)
                    if (best == null || b.Runs > best.Runs) best = b;
                return best;
            }
        }

        /// <summary>Best bowling figures by wickets then economy (first bowler wins ties).</summary>
        public BowlerCard BestBowler
        {
            get
            {
                BowlerCard best = null;
                foreach (BowlerCard b in bowlers)
                {
                    if (b.LegalBallsBowled <= 0) continue;
                    if (best == null || b.Wickets > best.Wickets
                        || (b.Wickets == best.Wickets && b.RunsConceded < best.RunsConceded))
                        best = b;
                }
                return best;
            }
        }

        public override string ToString()
        {
            return BattingSideName + " " + ScoreDisplay + " (" + OversDisplay + " ov)";
        }

        /// <summary>
        /// DEBUG ONLY: forces the innings counters (parity with the Super Over
        /// debug panel). Never called by the real match flow; values are
        /// clamped to the rules. Player cards are NOT rewritten - this only
        /// exists to jump the flow to break / chase / result.
        /// </summary>
        public void DebugOverride(int runs, int wickets, int legalBalls)
        {
            Runs = Math.Max(0, runs);
            Wickets = Math.Min(Math.Max(0, wickets), settings.WicketsPerInnings);
            LegalBalls = Math.Min(Math.Max(0, legalBalls), settings.BallsPerInnings);
            TotalDeliveries = Math.Max(TotalDeliveries, LegalBalls);
        }
    }
}
