using System;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>
    /// Bowler selection rules (Phase 6 §6, §22). Pure and deterministic so it
    /// can be unit tested and mirrored in the reference implementation.
    /// </summary>
    public static class BowlerRotation
    {
        /// <summary>A bowler may not start another over once the cap is reached.</summary>
        public static bool CanBowl(LimitedOversInnings innings, int bowlerIndex)
        {
            if (innings == null) throw new ArgumentNullException(nameof(innings));
            MatchSettings s = innings.Settings;
            if (bowlerIndex < 0 || bowlerIndex >= innings.Bowlers.Count) return false;

            BowlerCard b = innings.Bowlers[bowlerIndex];
            int oversDone = b.LegalBallsBowled / s.BallsPerOver;
            if (oversDone >= s.MaxOversPerBowler) return false;

            // The same bowler may not bowl two consecutive overs.
            if (bowlerIndex == innings.LastOverBowlerIndex) return false;
            return true;
        }

        /// <summary>
        /// Suggests the next bowler: fewest overs bowled first, then fewest runs
        /// conceded, then lowest squad index. Returns -1 if nobody is eligible
        /// (only possible with a mis-sized squad).
        /// </summary>
        public static int SuggestNextBowler(LimitedOversInnings innings)
        {
            if (innings == null) throw new ArgumentNullException(nameof(innings));
            MatchSettings s = innings.Settings;

            int best = -1;
            int bestOvers = int.MaxValue;
            int bestRuns = int.MaxValue;
            for (int i = 0; i < innings.Bowlers.Count; i++)
            {
                if (!CanBowl(innings, i)) continue;
                BowlerCard b = innings.Bowlers[i];
                int overs = b.LegalBallsBowled / s.BallsPerOver;
                if (overs < bestOvers || (overs == bestOvers && b.RunsConceded < bestRuns))
                {
                    best = i;
                    bestOvers = overs;
                    bestRuns = b.RunsConceded;
                }
            }
            return best;
        }
    }
}
