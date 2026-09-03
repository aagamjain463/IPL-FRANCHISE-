using System;
using System.Globalization;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>
    /// Career-within-the-match statistics for one bowler (Phase 6 §6).
    /// Wides and no-balls count against the bowler's conceded runs (real
    /// cricket scoring); only legal balls count toward overs bowled, and only
    /// bowled/caught/lbw/stumped dismissals credit the bowler (run outs do not).
    /// </summary>
    [Serializable]
    public sealed class BowlerCard
    {
        public readonly string Name;

        public int LegalBallsBowled { get; private set; }
        public int RunsConceded { get; private set; }
        public int Wickets { get; private set; }
        public int Maidens { get; private set; }

        /// <summary>Runs conceded in the over currently being bowled (0 resets each over).
        /// Wides/no-balls break a maiden, matching real scoring.</summary>
        public int CurrentOverRuns { get; internal set; }

        /// <summary>Legal balls delivered in the over currently being bowled.</summary>
        public int CurrentOverLegalBalls { get; internal set; }

        public BowlerCard(string name)
        {
            Name = name ?? "";
        }

        public int OversCompleted
        {
            get { return LegalBallsBowled / 6; }
        }

        /// <summary>Overs as cricket notation, e.g. 3.2 = 3 overs + 2 balls.</summary>
        public string OversDisplay
        {
            get { return OversCompleted + "." + (LegalBallsBowled % 6); }
        }

        /// <summary>Economy rate (runs per over); 0 before bowling a legal ball.</summary>
        public float Economy
        {
            get { return LegalBallsBowled <= 0 ? 0f : RunsConceded / (LegalBallsBowled / 6f); }
        }

        /// <summary>One delivery's effect on this bowler's figures.</summary>
        public void ApplyDelivery(DeliveryOutcome outcome, bool isCreditableWicket)
        {
            RunsConceded += outcome.TotalRuns;
            CurrentOverRuns += outcome.TotalRuns;

            if (outcome.CountsAsLegalBall)
            {
                LegalBallsBowled++;
                CurrentOverLegalBalls++;
                if (isCreditableWicket) Wickets++;
            }
        }

        /// <summary>Called when the bowler's current over ends; finalises maiden tracking.</summary>
        public void CompleteOver(int ballsPerOver)
        {
            if (CurrentOverLegalBalls >= ballsPerOver && CurrentOverRuns == 0)
                Maidens++;
            CurrentOverRuns = 0;
            CurrentOverLegalBalls = 0;
        }

        /// <summary>Classic bowling figures, e.g. "4-0-31-2" (O-M-R-W).</summary>
        public string Figures
        {
            get { return OversDisplay + "-" + Maidens + "-" + RunsConceded + "-" + Wickets; }
        }

        public override string ToString()
        {
            return Name + " " + Figures;
        }
    }
}
