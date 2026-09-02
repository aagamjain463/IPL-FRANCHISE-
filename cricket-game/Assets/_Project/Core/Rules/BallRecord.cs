namespace CricketGame.Core.Rules
{
    /// <summary>
    /// A delivery as recorded in the innings log, with the match situation
    /// immediately after the delivery was applied.
    /// </summary>
    public sealed class BallRecord
    {
        /// <summary>0 for the first innings, 1 for the second (chase) innings.</summary>
        public int InningsIndex;

        /// <summary>1-based delivery counter within the innings, including extras.</summary>
        public int DeliveryNumberInInnings;

        public DeliveryOutcome Outcome;

        public int TotalRunsAfter;
        public int WicketsAfter;
        public int LegalBallsAfter;

        /// <summary>Chase target during the second innings; null during the first.</summary>
        public int? TargetAtDelivery;

        /// <summary>Runs still required after this delivery (second innings only).</summary>
        public int? RunsNeededAfter;

        public override string ToString()
        {
            string s = (InningsIndex + 1) + "." + DeliveryNumberInInnings + " " + Outcome
                       + " -> " + TotalRunsAfter + "/" + WicketsAfter;
            if (RunsNeededAfter.HasValue) s += " (need " + RunsNeededAfter.Value + ")";
            return s;
        }
    }
}
