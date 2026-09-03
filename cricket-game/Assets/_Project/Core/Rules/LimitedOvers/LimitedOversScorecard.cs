using System;
using System.Collections.Generic;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>
    /// Data-driven scorecard snapshot of a completed limited-overs match
    /// (Phase 6 §8, §24, §25, §28). Built from the engine's state — the UI
    /// never derives statistics itself, it only renders this.
    /// </summary>
    [Serializable]
    public sealed class LimitedOversScorecard
    {
        public string FirstBattingSide;
        public string SecondBattingSide;

        public int FirstInningsRuns;
        public int FirstInningsWickets;
        public string FirstInningsOvers;     // cricket notation "20.0"

        public int SecondInningsRuns;
        public int SecondInningsWickets;
        public string SecondInningsOvers;

        public int Target;

        public int FirstExtrasWides;
        public int FirstExtrasNoBalls;
        public int SecondExtrasWides;
        public int SecondExtrasNoBalls;

        /// <summary>Batter lines for both innings, batting order in / out order.</summary>
        public readonly List<BatterCard> FirstInningsBatters = new List<BatterCard>();
        public readonly List<BatterCard> SecondInningsBatters = new List<BatterCard>();

        /// <summary>Bowler lines for both innings (the side defending in each innings).</summary>
        public readonly List<BowlerCard> FirstInningsBowlers = new List<BowlerCard>();
        public readonly List<BowlerCard> SecondInningsBowlers = new List<BowlerCard>();

        /// <summary>Per-over summaries for each innings (bowler, runs, wickets,
        /// marks). Named ...OverRecords to stay distinct from the cricket
        /// overs-notation strings FirstInningsOvers / SecondInningsOvers above.</summary>
        public readonly List<OverRecord> FirstInningsOverRecords = new List<OverRecord>();
        public readonly List<OverRecord> SecondInningsOverRecords = new List<OverRecord>();

        /// <summary>Deterministic player-of-the-match heuristic (§24).</summary>
        public string PlayerOfMatch;

        /// <summary>Top scorer across both innings (first innings wins ties).</summary>
        public string TopScorer;
        public int TopScorerRuns;

        /// <summary>Best bowling figures across both innings.</summary>
        public string BestBowler;
        public string BestBowlingFigures;

        /// <summary>Boundary totals for the result screen.</summary>
        public int FirstInningsFours, FirstInningsSixes;
        public int SecondInningsFours, SecondInningsSixes;

        public static LimitedOversScorecard Build(LimitedOversMatch match)
        {
            if (match == null) throw new ArgumentNullException(nameof(match));
            LimitedOversInnings a = match.FirstInnings;
            LimitedOversInnings b = match.SecondInnings;

            var card = new LimitedOversScorecard
            {
                FirstBattingSide = a.BattingSideName,
                SecondBattingSide = b != null ? b.BattingSideName : match.Team(match.BattingTeamOf(1)).Name,
                FirstInningsRuns = a.Runs,
                FirstInningsWickets = a.Wickets,
                FirstInningsOvers = a.OversDisplay,
                SecondInningsRuns = b != null ? b.Runs : 0,
                SecondInningsWickets = b != null ? b.Wickets : 0,
                SecondInningsOvers = b != null ? b.OversDisplay : "0.0",
                Target = a.Runs + 1,
                FirstExtrasWides = a.ExtrasWides,
                FirstExtrasNoBalls = a.ExtrasNoBalls,
                SecondExtrasWides = b != null ? b.ExtrasWides : 0,
                SecondExtrasNoBalls = b != null ? b.ExtrasNoBalls : 0
            };

            foreach (BatterCard bc in a.Batters) card.FirstInningsBatters.Add(bc);
            foreach (BowlerCard bw in a.Bowlers) card.FirstInningsBowlers.Add(bw);
            foreach (OverRecord or in a.Overs) card.FirstInningsOverRecords.Add(or);
            CountBoundaries(a, out card.FirstInningsFours, out card.FirstInningsSixes);

            if (b != null)
            {
                foreach (BatterCard bc in b.Batters) card.SecondInningsBatters.Add(bc);
                foreach (BowlerCard bw in b.Bowlers) card.SecondInningsBowlers.Add(bw);
                foreach (OverRecord or in b.Overs) card.SecondInningsOverRecords.Add(or);
                CountBoundaries(b, out card.SecondInningsFours, out card.SecondInningsSixes);
            }

            // Top scorer + best bowler across both innings.
            BatterCard top = a.TopScorer;
            BatterCard top2 = b != null ? b.TopScorer : null;
            if (top2 != null && top != null && top2.Runs > top.Runs) top = top2;
            if (top != null) { card.TopScorer = top.Name; card.TopScorerRuns = top.Runs; }

            BowlerCard bb = a.BestBowler;
            BowlerCard bb2 = b != null ? b.BestBowler : null;
            if (bb2 != null && bb != null
                && (bb2.Wickets > bb.Wickets || (bb2.Wickets == bb.Wickets && bb2.RunsConceded < bb.RunsConceded)))
                bb = bb2;
            if (bb != null) { card.BestBowler = bb.Name; card.BestBowlingFigures = bb.Figures; }

            card.PlayerOfMatch = ChoosePlayerOfMatch(a, b);
            return card;
        }

        private static void CountBoundaries(LimitedOversInnings inn, out int fours, out int sixes)
        {
            fours = 0; sixes = 0;
            foreach (BatterCard bc in inn.Batters) { fours += bc.Fours; sixes += bc.Sixes; }
        }

        /// <summary>
        /// Deterministic POTM heuristic: contribution score = runs + 28*wickets,
        /// highest wins; ties break toward the winning innings, then first innings.
        /// Deliberately simple and testable; presentation may override with a
        /// fancier model later.
        /// </summary>
        private struct PotmCandidate
        {
            public string Name;
            public int Score;
            public int Side;        // 0 = first innings, 1 = second
        }

        private static string ChoosePlayerOfMatch(LimitedOversInnings a, LimitedOversInnings b)
        {
            int winningSide = -1;
            if (b != null)
            {
                if (b.Runs > a.Runs) winningSide = 1;
                else if (a.Runs > b.Runs) winningSide = 0;
            }

            var candidates = new List<PotmCandidate>();
            for (int side = 0; side < 2; side++)
            {
                LimitedOversInnings inn = side == 0 ? a : b;
                if (inn == null) continue;
                foreach (BatterCard bc in inn.Batters)
                    candidates.Add(new PotmCandidate { Name = bc.Name, Score = bc.Runs, Side = side });
                foreach (BowlerCard bw in inn.Bowlers)
                    candidates.Add(new PotmCandidate { Name = bw.Name, Score = bw.Wickets * 28, Side = side });
            }

            // Winner: highest score; ties prefer the winning innings, then the earlier innings.
            string bestName = null;
            int bestScore = -1;
            int bestSide = int.MaxValue;
            foreach (PotmCandidate c in candidates)
            {
                bool better = c.Score > bestScore
                    || (c.Score == bestScore && c.Score > 0 && BetterSide(c.Side, bestSide, winningSide));
                if (better)
                {
                    bestScore = c.Score;
                    bestName = c.Name;
                    bestSide = c.Side;
                }
            }
            return bestName;
        }

        private static bool BetterSide(int candidateSide, int currentSide, int winningSide)
        {
            if (winningSide >= 0)
            {
                if (candidateSide == winningSide && currentSide != winningSide) return true;
                if (candidateSide != winningSide && currentSide == winningSide) return false;
            }
            return candidateSide < currentSide;
        }
    }
}
