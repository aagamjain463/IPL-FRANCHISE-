using System;
using System.Collections.Generic;
using NUnit.Framework;
using CricketGame.Core.Rules;
using CricketGame.Core.Rules.LimitedOvers;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Phase 6 pass 1: rule tests for the limited-overs engine.
    /// Mirrors harness/test_limitedovers.py (the headless reference battery)
    /// and covers spec section 31 scenarios 1,2,4-15 that are verifiable
    /// without the gameplay layer.
    /// </summary>
    [TestFixture]
    public class Phase6Tests
    {
        // ------------------------------------------------------------------ helpers

        private static List<string> Names(int n, string prefix)
        {
            var list = new List<string>();
            for (int i = 0; i < n; i++) list.Add(prefix + i);
            return list;
        }

        private static LimitedOversMatch MakeMatch(MatchSettings settings = null, int batters = 11, int bowlers = 5)
        {
            var s = settings ?? MatchSettings.TwentyOver();
            return new LimitedOversMatch(
                s,
                new LimitedOversTeam("YOU", Names(batters, "Y"), Names(bowlers, "YB")),
                new LimitedOversTeam("AI", Names(batters, "A"), Names(bowlers, "AB")));
        }

        /// <summary>Assigns the bowler and plays the deliveries, stopping if the match ends.</summary>
        private static void OverOf(LimitedOversMatch match, int bowler, params DeliveryOutcome[] outcomes)
        {
            match.AssignBowler(bowler);
            foreach (var o in outcomes)
            {
                if (match.Phase != MatchPhase.FirstInnings && match.Phase != MatchPhase.SecondInnings) break;
                match.RecordDelivery(o);
            }
        }

        private static DeliveryOutcome[] Dots(int n)
        {
            var arr = new DeliveryOutcome[n];
            for (int i = 0; i < n; i++) arr[i] = DeliveryOutcome.Legal(0);
            return arr;
        }

        private static DeliveryOutcome[] Same(DeliveryOutcome o, int n)
        {
            var arr = new DeliveryOutcome[n];
            for (int i = 0; i < n; i++) arr[i] = o;
            return arr;
        }

        // TEST 1 ----------------------------------------------------------------
        [Test]
        public void ZeroTenAfterExactlyTwentyOvers()
        {
            var m = MakeMatch();
            m.Start(0);
            var seq = new List<DeliveryOutcome>();
            for (int i = 0; i < 110; i++) seq.Add(DeliveryOutcome.Legal(0));
            for (int i = 0; i < 10; i++) seq.Add(DeliveryOutcome.Wicket(DismissalKind.Bowled));

            int idx = 0;
            for (int over = 0; over < 20 && m.Phase == MatchPhase.FirstInnings; over++)
            {
                var chunk = new List<DeliveryOutcome>();
                for (int b = 0; b < 6 && idx < seq.Count; b++, idx++) chunk.Add(seq[idx]);
                OverOf(m, over % 5, chunk.ToArray());
            }

            var inn = m.FirstInnings;
            Assert.AreEqual(0, inn.Runs);
            Assert.AreEqual(10, inn.Wickets);
            Assert.AreEqual(120, inn.LegalBalls);
            Assert.AreEqual("0/10", inn.ScoreDisplay);
            Assert.AreEqual("20.0", inn.OversDisplay);
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
        }

        // TEST 2 ----------------------------------------------------------------
        [Test]
        public void AllOutBeforeTwentyOvers()
        {
            var m = MakeMatch();
            m.Start(0);
            for (int over = 0; over < 10 && m.Phase == MatchPhase.FirstInnings; over++)
            {
                OverOf(m, over % 5,
                    DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0),
                    DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0),
                    DeliveryOutcome.Wicket(DismissalKind.Caught));
            }
            var inn = m.FirstInnings;
            Assert.AreEqual(60, inn.LegalBalls);
            Assert.AreEqual("all out", inn.CompletionReason);
            Assert.IsTrue(inn.BallsRemaining > 0);
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
        }

        // TEST 4 ----------------------------------------------------------------
        [Test]
        public void ChaseWonWithOversToSpare()
        {
            var m = MakeMatch(new MatchSettings(5, 10));
            m.Start(0);
            for (int over = 0; over < 3; over++) OverOf(m, over, Same(DeliveryOutcome.Legal(6), 6));
            for (int over = 3; over < 5; over++) OverOf(m, over, Dots(6));
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
            Assert.AreEqual(109, m.Target.Value);

            m.StartSecondInnings();
            for (int over = 0; over < 3; over++) OverOf(m, over, Same(DeliveryOutcome.Legal(6), 6));
            m.AssignBowler(3);
            m.RecordDelivery(DeliveryOutcome.Legal(1));      // 109 reached on ball 19 of 30

            Assert.AreEqual(MatchPhase.Completed, m.Phase);
            Assert.AreEqual(MatchOutcome.SecondInningsWin, m.Result.Outcome);
            Assert.AreEqual(10, m.Result.MarginWickets);
            Assert.AreEqual(30 - 19, m.Result.MarginBalls);
        }

        // TEST 5 ----------------------------------------------------------------
        [Test]
        public void ChaseFailedAfterTwentyOvers()
        {
            var m = MakeMatch();
            m.Start(0);
            for (int over = 0; over < 20; over++) OverOf(m, over % 5, Same(DeliveryOutcome.Legal(2), 6));
            Assert.AreEqual(240, m.FirstInnings.Runs);

            m.StartSecondInnings();
            for (int over = 0; over < 20 && !m.IsComplete; over++) OverOf(m, over % 5, Same(DeliveryOutcome.Legal(1), 6));

            Assert.AreEqual(MatchOutcome.FirstInningsWin, m.Result.Outcome);
            Assert.AreEqual(120, m.Result.MarginRuns);
            Assert.AreEqual(120, m.SecondInnings.LegalBalls);
        }

        // TEST 6 ----------------------------------------------------------------
        [Test]
        public void WidesDoNotConsumeLegalBalls()
        {
            var m = MakeMatch();
            m.Start(0);
            OverOf(m, 0,
                DeliveryOutcome.Legal(0), DeliveryOutcome.Wide(), DeliveryOutcome.Wide(),
                DeliveryOutcome.Legal(1), DeliveryOutcome.Wide(), DeliveryOutcome.Legal(0),
                DeliveryOutcome.Legal(4), DeliveryOutcome.Legal(6), DeliveryOutcome.Legal(2));
            var inn = m.FirstInnings;
            Assert.AreEqual(6, inn.LegalBalls);
            Assert.AreEqual(9, inn.TotalDeliveries);
            Assert.AreEqual(3, inn.ExtrasWides);
            Assert.AreEqual(16, inn.Runs);
            Assert.AreEqual(1, inn.Overs.Count);
            Assert.AreEqual(16, inn.Overs[0].Runs);
            Assert.AreEqual(16, inn.Bowlers[0].RunsConceded, "wides count against the bowler");
        }

        // TEST 7 ----------------------------------------------------------------
        [Test]
        public void NoBallsDoNotConsumeLegalBalls()
        {
            var m = MakeMatch();
            m.Start(0);
            OverOf(m, 0,
                DeliveryOutcome.NoBall(2), DeliveryOutcome.NoBall(0), DeliveryOutcome.NoBall(4),
                DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0),
                DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0));
            var inn = m.FirstInnings;
            Assert.AreEqual(6, inn.LegalBalls);
            Assert.AreEqual(3, inn.ExtrasNoBalls);
            Assert.AreEqual(6, inn.Batters[0].Runs);
            Assert.AreEqual(6, inn.Batters[0].BallsFaced);
            Assert.AreEqual(0, inn.Batters[0].Fours);
            Assert.AreEqual(0, inn.Batters[0].Sixes, "a six hit on a no-ball is not a scorecard boundary");
            Assert.AreEqual(9, inn.Runs);
        }

        // TEST 8 ----------------------------------------------------------------
        [Test]
        public void BowlerCannotExceedMaxOversOrBowlConsecutively()
        {
            var m = MakeMatch();
            m.Start(0);
            int[] rotation = { 0, 1, 0, 2, 0, 3, 0 };
            foreach (int b in rotation) OverOf(m, b, Dots(6));

            var inn = m.FirstInnings;
            Assert.AreEqual(4, inn.Bowlers[0].OversCompleted);
            Assert.IsFalse(BowlerRotation.CanBowl(inn, 0), "4-over cap reached");
            Assert.Throws<InvalidOperationException>(() => m.AssignBowler(0));

            OverOf(m, 4, Dots(6));
            Assert.Throws<InvalidOperationException>(() => m.AssignBowler(4), "consecutive overs forbidden");

            int suggested = BowlerRotation.SuggestNextBowler(inn);
            Assert.IsTrue(BowlerRotation.CanBowl(inn, suggested));
        }

        // TEST 9 ----------------------------------------------------------------
        [Test]
        public void StrikeRotationPerRunType()
        {
            var m = MakeMatch();
            m.Start(0);
            var inn = m.FirstInnings;
            m.AssignBowler(0);

            int start = inn.Striker;
            m.RecordDelivery(DeliveryOutcome.Legal(1));
            Assert.AreNotEqual(start, inn.Striker, "1 run swaps strike");

            start = inn.Striker;
            m.RecordDelivery(DeliveryOutcome.Legal(2));
            Assert.AreEqual(start, inn.Striker, "2 runs keep strike");

            start = inn.Striker;
            m.RecordDelivery(DeliveryOutcome.Legal(3));
            Assert.AreNotEqual(start, inn.Striker, "3 runs swap strike");

            start = inn.Striker;
            m.RecordDelivery(DeliveryOutcome.Legal(4));
            m.RecordDelivery(DeliveryOutcome.Legal(6));
            Assert.AreEqual(start, inn.Striker, "boundaries keep strike");

            // wicket on the 6th legal ball: new batter in, then ends swap
            m.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Bowled));
            Assert.AreEqual(1, inn.Wickets);
            Assert.AreEqual(2, inn.NonStriker, "incoming batter #2 is at the new striker's end");
            Assert.AreEqual(1, inn.Striker, "ends swap at the end of the over");
        }

        // TEST 10 ---------------------------------------------------------------
        [Test]
        public void OverTransitionSwapsEnds()
        {
            var m = MakeMatch();
            m.Start(0);
            var inn = m.FirstInnings;
            m.AssignBowler(0);
            int strikerBefore = inn.Striker;
            foreach (var o in Dots(6)) m.RecordDelivery(o);
            Assert.AreEqual(1, inn.Overs.Count);
            Assert.AreNotEqual(strikerBefore, inn.Striker, "ends must swap at over end");
            Assert.IsTrue(inn.AwaitingBowler);

            // odd-run final ball + over-end swap cancel out
            m.AssignBowler(1);
            int s = inn.Striker;
            for (int i = 0; i < 5; i++) m.RecordDelivery(DeliveryOutcome.Legal(0));
            m.RecordDelivery(DeliveryOutcome.Legal(1));
            Assert.AreEqual(2, inn.Overs.Count);
            Assert.AreEqual(s, inn.Striker, "single swaps, over-end swap restores");
        }

        // TEST 11 ---------------------------------------------------------------
        [Test]
        public void RequiredRunRateUpdatesEachBall()
        {
            var m = MakeMatch(new MatchSettings(10, 10));
            m.Start(0);
            for (int over = 0; over < 10; over++) OverOf(m, over % 5, Same(DeliveryOutcome.Legal(1), 6));
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);

            m.StartSecondInnings();
            var inn = m.SecondInnings;
            const int target = 61;
            m.AssignBowler(0);
            for (int i = 1; i <= 12; i++)
            {
                if (inn.AwaitingBowler) m.AssignBowler(1);
                m.RecordDelivery(DeliveryOutcome.Legal(1));
                int need = target - inn.Runs;
                int ballsLeft = 60 - inn.LegalBalls;
                float expected = need / (ballsLeft / 6f);
                Assert.AreEqual(expected, inn.RequiredRunRate(target), 0.0001f);
                Assert.AreEqual(need, inn.RunsRequired(target));
            }
            Assert.AreEqual("2.0", inn.OversDisplay);
            Assert.AreEqual(12f / 2f, inn.CurrentRunRate, 0.0001f);
        }

        // TEST 12 ---------------------------------------------------------------
        [Test]
        public void PowerplayWindowCoversFirstSixOvers()
        {
            var m = MakeMatch();
            m.Start(0);
            var inn = m.FirstInnings;
            for (int over = 0; over < 7; over++)
            {
                Assert.AreEqual(over < 6, inn.InPowerplay, "powerplay covers overs 1-6");
                OverOf(m, over % 5, Dots(6));
            }
        }

        // TEST 13 ---------------------------------------------------------------
        [Test]
        public void SuperOverParityWithOriginalEngine()
        {
            var seqFirst = new[]
            {
                DeliveryOutcome.Legal(2), DeliveryOutcome.Legal(0), DeliveryOutcome.Wide(),
                DeliveryOutcome.Legal(6), DeliveryOutcome.Wicket(DismissalKind.Caught),
                DeliveryOutcome.Legal(1), DeliveryOutcome.Legal(0)
            };
            var seqSecond = new[]
            {
                DeliveryOutcome.Legal(1), DeliveryOutcome.Legal(4), DeliveryOutcome.NoBall(1),
                DeliveryOutcome.Legal(2), DeliveryOutcome.Wicket(DismissalKind.Bowled),
                DeliveryOutcome.Legal(4)
            };

            var old = new SuperOverMatch(SuperOverConfig.Standard);
            old.Start();
            foreach (var o in seqFirst)
                if (old.Phase == MatchPhase.FirstInnings) old.RecordDelivery(o);
            old.StartSecondInnings();
            foreach (var o in seqSecond)
                if (old.Phase == MatchPhase.SecondInnings) old.RecordDelivery(o);

            var m = new LimitedOversMatch(
                MatchSettings.SuperOver(),
                new LimitedOversTeam("YOU", Names(3, "Y"), Names(1, "YB")),
                new LimitedOversTeam("AI", Names(3, "A"), Names(1, "AB")));
            m.Start(0);
            m.AssignBowler(0);
            foreach (var o in seqFirst)
                if (m.Phase == MatchPhase.FirstInnings) m.RecordDelivery(o);
            Assert.AreEqual(MatchPhase.InningsBreak, m.Phase);
            m.StartSecondInnings();
            m.AssignBowler(0);
            foreach (var o in seqSecond)
                if (m.Phase == MatchPhase.SecondInnings) m.RecordDelivery(o);

            Assert.AreEqual(MatchPhase.Completed, m.Phase);
            Assert.AreEqual(old.Result.Outcome, m.Result.Outcome);
            Assert.AreEqual(old.FirstInnings.Runs, m.FirstInnings.Runs);
            Assert.AreEqual(old.FirstInnings.Wickets, m.FirstInnings.Wickets);
            Assert.AreEqual(old.SecondInnings.Runs, m.SecondInnings.Runs);
            Assert.AreEqual(old.SecondInnings.Wickets, m.SecondInnings.Wickets);
            Assert.AreEqual(old.Result.MarginWickets, m.Result.MarginWickets);
            Assert.AreEqual(old.Result.MarginBalls, m.Result.MarginBalls);
            Assert.AreEqual(old.Result.MarginRuns, m.Result.MarginRuns);
        }

        // TEST 14 ---------------------------------------------------------------
        [Test]
        public void ResultMargins()
        {
            // chased down (2-over quick match)
            var m = MakeMatch(new MatchSettings(2, 10));
            m.Start(0);
            OverOf(m, 0, Same(DeliveryOutcome.Legal(4), 6));
            OverOf(m, 1, Dots(6));
            m.StartSecondInnings();
            m.AssignBowler(0);
            for (int i = 0; i < 6; i++) m.RecordDelivery(DeliveryOutcome.Legal(4));
            m.AssignBowler(1);
            m.RecordDelivery(DeliveryOutcome.Legal(1));
            Assert.AreEqual(MatchOutcome.SecondInningsWin, m.Result.Outcome);
            Assert.AreEqual(10, m.Result.MarginWickets);
            Assert.AreEqual(12 - 7, m.Result.MarginBalls);

            // defended
            var m2 = MakeMatch();
            m2.Start(0);
            for (int over = 0; over < 20; over++) OverOf(m2, over % 5, Same(DeliveryOutcome.Legal(1), 6));
            m2.StartSecondInnings();
            for (int over = 0; over < 20 && !m2.IsComplete; over++) OverOf(m2, over % 5, Dots(6));
            Assert.AreEqual(MatchOutcome.FirstInningsWin, m2.Result.Outcome);
            Assert.AreEqual(120, m2.Result.MarginRuns);

            // tie (4-over quick match)
            var m3 = MakeMatch(new MatchSettings(4, 10));
            m3.Start(0);
            for (int over = 0; over < 4; over++) OverOf(m3, over, Same(DeliveryOutcome.Legal(1), 6));
            m3.StartSecondInnings();
            OverOf(m3, 0,
                DeliveryOutcome.Legal(6), DeliveryOutcome.Legal(6), DeliveryOutcome.Legal(6),
                DeliveryOutcome.Legal(6), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0));
            for (int over = 1; over < 4 && !m3.IsComplete; over++) OverOf(m3, over, Dots(6));
            Assert.AreEqual(MatchOutcome.Tie, m3.Result.Outcome);
        }

        // TEST 15 ---------------------------------------------------------------
        [Test]
        public void ResultContainsCompletePlayerStatistics()
        {
            var m = MakeMatch();
            m.Start(0);
            m.AssignBowler(0);
            m.RecordDelivery(DeliveryOutcome.Legal(4));
            m.RecordDelivery(DeliveryOutcome.Legal(6));
            m.RecordDelivery(DeliveryOutcome.Legal(2));
            m.RecordDelivery(DeliveryOutcome.Legal(0));
            m.RecordDelivery(DeliveryOutcome.Legal(0));
            m.RecordDelivery(DeliveryOutcome.Legal(0));
            for (int over = 1; over < 20; over++) OverOf(m, over % 5, Dots(6));
            m.StartSecondInnings();
            for (int over = 0; over < 20 && !m.IsComplete; over++) OverOf(m, over % 5, Dots(6));

            var inn = m.FirstInnings;
            var opener = inn.Batters[0];
            Assert.AreEqual(12, opener.Runs);
            Assert.AreEqual(60, opener.BallsFaced);
            Assert.AreEqual(1, opener.Fours);
            Assert.AreEqual(1, opener.Sixes);
            Assert.AreEqual(20f, opener.StrikeRate, 0.001f);
            Assert.AreEqual(0, inn.ExtrasTotal);
            Assert.IsNotNull(m.Result);
            Assert.IsNotNull(m.Result.Scorecard, "MatchResult must carry the full scorecard");
            Assert.AreEqual(inn.Runs + 1, m.Result.Target);
            Assert.AreEqual(opener.Name, m.Result.Scorecard.PlayerOfMatch,
                "12 runs beats every bowling contribution in this match");
            Assert.AreEqual(1, m.Result.Scorecard.FirstInningsFours);
            Assert.AreEqual(1, m.Result.Scorecard.FirstInningsSixes);
            Assert.AreEqual(20, m.Result.Scorecard.FirstInningsOverRecords.Count);
        }

        // extras / misc -----------------------------------------------------------
        [Test]
        public void ExtrasBreakAMaiden()
        {
            var m = MakeMatch();
            m.Start(0);
            OverOf(m, 0, Dots(6));
            OverOf(m, 1, DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0), DeliveryOutcome.Wide(),
                DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0),
                DeliveryOutcome.Legal(0));
            OverOf(m, 2, Dots(6));
            var inn = m.FirstInnings;
            Assert.AreEqual(1, inn.Bowlers[0].Maidens);
            Assert.AreEqual(0, inn.Bowlers[1].Maidens, "the wide broke the maiden");
            Assert.AreEqual(1, inn.Bowlers[2].Maidens);
            Assert.AreEqual("1.0-1-0-0", inn.Bowlers[0].Figures);
        }

        [Test]
        public void OverMarksAndSummary()
        {
            var m = MakeMatch();
            m.Start(0);
            OverOf(m, 0,
                DeliveryOutcome.Legal(1), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(4),
                DeliveryOutcome.Wicket(DismissalKind.Lbw), DeliveryOutcome.Legal(2),
                DeliveryOutcome.Wide(), DeliveryOutcome.Legal(1));
            var over0 = m.FirstInnings.Overs[0];
            Assert.AreEqual(9, over0.Runs);
            Assert.AreEqual(1, over0.Wickets);
            Assert.AreEqual(7, over0.BallMarks.Count);
        }

        [Test]
        public void DrinksBreakState()
        {
            var m = MakeMatch();
            m.Start(0);
            m.AssignBowler(0);
            m.BeginDrinksBreak();
            Assert.AreEqual(InningsState.DrinksBreak, m.State);
            m.EndDrinksBreak();
            Assert.AreEqual(InningsState.Playing, m.State);
        }

        [Test]
        public void EventsFireForWicketsAndOvers()
        {
            var m = MakeMatch();
            int wicketsSeen = 0, oversSeen = 0;
            m.WicketFallen += args => wicketsSeen++;
            m.OverCompleted += args => oversSeen++;
            m.Start(0);
            OverOf(m, 0, DeliveryOutcome.Legal(1), DeliveryOutcome.Wicket(DismissalKind.Bowled),
                DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0), DeliveryOutcome.Legal(0),
                DeliveryOutcome.Legal(0));
            Assert.AreEqual(1, wicketsSeen);
            Assert.AreEqual(1, oversSeen);
        }

        // randomized soak -----------------------------------------------------------
        [Test]
        public void RandomFullMatchesNeverBreakInvariants()
        {
            var rng = new System.Random(6006);
            for (int trial = 0; trial < 20; trial++)
            {
                var m = MakeMatch();
                m.Start(rng.Next(2));
                int guard = 0;
                while (!m.IsComplete && guard < 4000)
                {
                    guard++;
                    if (m.Phase == MatchPhase.InningsBreak)
                    {
                        m.StartSecondInnings();
                        continue;
                    }
                    var inn = m.CurrentInnings;
                    if (inn.AwaitingBowler)
                    {
                        int b = BowlerRotation.SuggestNextBowler(inn);
                        Assert.IsTrue(b >= 0, "squad must always cover the overs");
                        m.AssignBowler(b);
                        continue;
                    }
                    double r = rng.NextDouble();
                    DeliveryOutcome o;
                    if (r < 0.04) o = DeliveryOutcome.Wide();
                    else if (r < 0.07) o = DeliveryOutcome.NoBall(rng.Next(3));
                    else if (r < 0.12) o = DeliveryOutcome.Wicket(PickDismissal(rng));
                    else
                    {
                        int[] runs = { 0, 0, 0, 1, 1, 2, 3, 4, 6 };
                        o = DeliveryOutcome.Legal(runs[rng.Next(runs.Length)]);
                    }
                    m.RecordDelivery(o);
                }

                Assert.IsTrue(m.IsComplete, "soak match " + trial + " did not finish");
                var res = m.Result;
                var a = m.FirstInnings;
                var b = m.SecondInnings;
                Assert.IsNotNull(res.Scorecard);
                if (res.Outcome == MatchOutcome.SecondInningsWin)
                {
                    Assert.IsTrue(b.Runs >= a.Runs + 1);
                    Assert.AreEqual(10 - b.Wickets, res.MarginWickets);
                    Assert.AreEqual(120 - b.LegalBalls, res.MarginBalls);
                    // chase must have ended on the exact delivery that reached the target
                    var last = b.Deliveries[b.Deliveries.Count - 1].Outcome;
                    Assert.IsTrue(b.Runs - last.TotalRuns < a.Runs + 1,
                        "chase must end immediately upon reaching the target");
                }
                else if (res.Outcome == MatchOutcome.FirstInningsWin)
                {
                    Assert.IsTrue(a.Runs > b.Runs);
                    Assert.AreEqual(a.Runs - b.Runs, res.MarginRuns);
                }
                else
                {
                    Assert.AreEqual(a.Runs, b.Runs);
                }
            }
        }

        private static DismissalKind PickDismissal(System.Random rng)
        {
            switch (rng.Next(4))
            {
                case 0: return DismissalKind.Bowled;
                case 1: return DismissalKind.Caught;
                case 2: return DismissalKind.Lbw;
                default: return DismissalKind.Stumped;
            }
        }
    }
}
