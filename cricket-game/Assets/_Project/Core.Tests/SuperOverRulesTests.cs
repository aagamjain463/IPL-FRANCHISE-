using System;
using System.Collections.Generic;
using NUnit.Framework;
using CricketGame.Core.Rules;

namespace CricketGame.Core.Tests
{
    /// <summary>
    /// Exhaustive rule tests for the chase-based Super Over engine.
    /// These mirror the reference harness in cricket-game/harness/ so the same
    /// scenarios are verified both inside Unity and headlessly.
    /// </summary>
    [TestFixture]
    public class SuperOverRulesTests
    {
        // ------------------------------------------------------------------ setup helpers

        /// <summary>Plays the given outcomes in the first innings and starts the chase.</summary>
        private static SuperOverMatch StartChaseAfter(params DeliveryOutcome[] firstInningsOutcomes)
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            foreach (var o in firstInningsOutcomes) match.RecordDelivery(o);
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase,
                "First innings should be over and we should be at the innings break.");
            match.StartSecondInnings();
            Assert.AreEqual(MatchPhase.SecondInnings, match.Phase);
            return match;
        }

        private static DeliveryOutcome[] Legal(int runsPerBallA, params int[] rest)
        {
            var list = new List<DeliveryOutcome> { DeliveryOutcome.Legal(runsPerBallA) };
            foreach (int r in rest) list.Add(DeliveryOutcome.Legal(r));
            return list.ToArray();
        }

        private static void AssertCompleted(SuperOverMatch match, MatchOutcome expected)
        {
            Assert.AreEqual(MatchPhase.Completed, match.Phase);
            Assert.NotNull(match.Result);
            Assert.AreEqual(expected, match.Result.Outcome);
        }

        // ------------------------------------------------------------------ config

        [Test]
        public void StandardConfig_HasSixBallsAndTwoWickets()
        {
            var cfg = SuperOverConfig.Standard;
            Assert.AreEqual(6, cfg.BallsPerInnings);
            Assert.AreEqual(2, cfg.MaxWicketsPerInnings);
        }

        [Test]
        public void Config_RejectsInvalidValues()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new SuperOverConfig(0, 2));
            Assert.Throws<ArgumentOutOfRangeException>(() => new SuperOverConfig(6, 0));
        }

        // ------------------------------------------------------------------ lifecycle

        [Test]
        public void NewMatch_IsNotStarted_WithNoTarget()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            Assert.AreEqual(MatchPhase.NotStarted, match.Phase);
            Assert.IsNull(match.Target);
            Assert.IsNull(match.RunsRequired);
            Assert.IsNull(match.Result);
        }

        [Test]
        public void Start_BeginsFirstInnings_WithFullResources()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            Assert.AreEqual(MatchPhase.FirstInnings, match.Phase);
            Assert.AreEqual(6, match.CurrentInnings.BallsRemaining);
            Assert.AreEqual(2, match.CurrentInnings.WicketsRemaining);
            Assert.IsNull(match.Target); // target unknown until first innings ends
        }

        [Test]
        public void Start_Twice_Throws()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            Assert.Throws<InvalidOperationException>(() => match.Start());
        }

        [Test]
        public void RecordDelivery_BeforeStart_Throws()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            Assert.Throws<InvalidOperationException>(
                () => match.RecordDelivery(DeliveryOutcome.Legal(1)));
        }

        [Test]
        public void StartSecondInnings_BeforeBreak_Throws()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            Assert.Throws<InvalidOperationException>(() => match.StartSecondInnings());
            match.Start();
            Assert.Throws<InvalidOperationException>(() => match.StartSecondInnings());
        }

        [Test]
        public void RecordDelivery_DuringInningsBreak_Throws()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            foreach (var o in Legal(1, 1, 1, 1, 1, 1)) match.RecordDelivery(o);
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase);
            Assert.Throws<InvalidOperationException>(
                () => match.RecordDelivery(DeliveryOutcome.Legal(1)));
        }

        [Test]
        public void RecordDelivery_AfterMatchComplete_Throws()
        {
            var match = StartChaseAfter(Legal(1, 1, 1, 1, 1, 1)); // target 7
            match.RecordDelivery(DeliveryOutcome.Legal(6));
            match.RecordDelivery(DeliveryOutcome.Legal(1)); // reached 7 -> win
            AssertCompleted(match, MatchOutcome.SecondInningsWin);
            Assert.Throws<InvalidOperationException>(
                () => match.RecordDelivery(DeliveryOutcome.Legal(1)));
        }

        // ------------------------------------------------------------------ first innings

        [Test]
        public void FirstInnings_SixSingles_EndsAtSixLegalBalls_AndSetsTarget()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            foreach (var o in Legal(1, 1, 1, 1, 1)) match.RecordDelivery(o);
            Assert.AreEqual(MatchPhase.FirstInnings, match.Phase);
            Assert.AreEqual(1, match.CurrentInnings.BallsRemaining);

            match.RecordDelivery(DeliveryOutcome.Legal(1)); // 6th ball
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase);
            Assert.AreEqual(6, match.FirstInnings.Runs);
            Assert.AreEqual(6, match.FirstInnings.LegalBalls);
            Assert.AreEqual(7, match.Target.Value);
            Assert.AreEqual(7, match.RunsRequired.Value); // full target at the break
        }

        [Test]
        public void FirstInnings_TwoWickets_EndsInningsEarly()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            match.RecordDelivery(DeliveryOutcome.Legal(4));
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Caught));
            Assert.AreEqual(MatchPhase.FirstInnings, match.Phase);
            Assert.AreEqual(1, match.CurrentInnings.WicketsRemaining);

            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Bowled));
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase);
            Assert.AreEqual(4, match.FirstInnings.Runs);
            Assert.AreEqual(2, match.FirstInnings.Wickets);
            Assert.AreEqual(3, match.FirstInnings.LegalBalls, "Only 3 legal balls were bowled.");
            Assert.AreEqual(5, match.Target.Value);
        }

        [Test]
        public void FirstInnings_CannotLoseMoreThanTwoWickets()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Bowled));
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Lbw));
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase);
            Assert.AreEqual(2, match.FirstInnings.Wickets);
            // The innings already ended, so no third wicket is possible.
            Assert.Throws<InvalidOperationException>(
                () => match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.RunOut)));
        }

        [Test]
        public void Wide_AddsRun_ButDoesNotConsumeALegalBall()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            foreach (var o in Legal(0, 0, 0, 0, 0)) match.RecordDelivery(o); // 5 legal dots
            match.RecordDelivery(DeliveryOutcome.Wide()); // delivery 6, but only 5 legal balls
            Assert.AreEqual(MatchPhase.FirstInnings, match.Phase, "A wide must not end the innings.");
            Assert.AreEqual(1, match.FirstInnings.Runs);
            Assert.AreEqual(5, match.FirstInnings.LegalBalls);
            Assert.AreEqual(6, match.FirstInnings.TotalDeliveries);

            match.RecordDelivery(DeliveryOutcome.Legal(2)); // now the 6th legal ball
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase);
            Assert.AreEqual(3, match.FirstInnings.Runs);
            Assert.AreEqual(6, match.FirstInnings.LegalBalls);
            Assert.AreEqual(4, match.Target.Value);
        }

        [Test]
        public void NoBall_AddsExtraAndBatRuns_WithoutConsumingALegalBall()
        {
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.Start();
            match.RecordDelivery(DeliveryOutcome.NoBall(4));
            Assert.AreEqual(5, match.FirstInnings.Runs);
            Assert.AreEqual(0, match.FirstInnings.LegalBalls);

            foreach (var o in Legal(0, 0, 0, 0, 0, 0)) match.RecordDelivery(o);
            Assert.AreEqual(MatchPhase.InningsBreak, match.Phase);
            Assert.AreEqual(5, match.FirstInnings.Runs);
            Assert.AreEqual(6, match.FirstInnings.LegalBalls);
            Assert.AreEqual(7, match.FirstInnings.TotalDeliveries);
        }

        // ------------------------------------------------------------------ chase: wins

        [Test]
        public void Chase_WinsImmediately_WhenTargetReached_MidOver()
        {
            // First innings: 2+2+2+1+1+1 = 9 -> target 10
            var match = StartChaseAfter(Legal(2, 2, 2, 1, 1, 1));
            Assert.AreEqual(10, match.Target.Value);
            Assert.AreEqual(10, match.RunsRequired.Value);

            match.RecordDelivery(DeliveryOutcome.Legal(6));
            Assert.AreEqual(MatchPhase.SecondInnings, match.Phase);
            Assert.AreEqual(4, match.RunsRequired.Value);

            match.RecordDelivery(DeliveryOutcome.Legal(4)); // 10 reached after 2 balls
            AssertCompleted(match, MatchOutcome.SecondInningsWin);
            Assert.AreEqual(2, match.SecondInnings.LegalBalls, "Chase must stop immediately.");
            Assert.AreEqual(2, match.Result.MarginWickets, "Won without losing a wicket.");
            Assert.AreEqual(1, match.Result.WinnerInningsIndex);
        }

        [Test]
        public void Chase_OvershootsTarget_WinsOnThatSingleDelivery()
        {
            // First innings 9 -> target 10. Second innings: 4,4,1 = 9 after 3 balls.
            var match = StartChaseAfter(Legal(3, 3, 3, 0, 0, 0));
            Assert.AreEqual(10, match.Target.Value);
            match.RecordDelivery(DeliveryOutcome.Legal(4));
            match.RecordDelivery(DeliveryOutcome.Legal(4));
            match.RecordDelivery(DeliveryOutcome.Legal(1));
            Assert.AreEqual(1, match.RunsRequired.Value);

            match.RecordDelivery(DeliveryOutcome.Legal(6)); // 15 total, well past 10
            AssertCompleted(match, MatchOutcome.SecondInningsWin);
            Assert.AreEqual(15, match.SecondInnings.Runs);
            Assert.AreEqual(4, match.SecondInnings.LegalBalls);
        }

        [Test]
        public void Chase_WinOnTheFinalBall_IsAWin_NotALossOrTie()
        {
            // Target 10; chase reaches exactly 10 with the last (6th) legal ball.
            var match = StartChaseAfter(Legal(3, 3, 3, 0, 0, 0));
            match.RecordDelivery(DeliveryOutcome.Legal(2));
            match.RecordDelivery(DeliveryOutcome.Legal(2));
            match.RecordDelivery(DeliveryOutcome.Legal(2));
            match.RecordDelivery(DeliveryOutcome.Legal(2));
            match.RecordDelivery(DeliveryOutcome.Legal(1)); // 9 after 5 balls
            Assert.AreEqual(1, match.RunsRequired.Value);
            Assert.AreEqual(1, match.CurrentInnings.BallsRemaining);

            match.RecordDelivery(DeliveryOutcome.Legal(1)); // 10 on ball 6
            AssertCompleted(match, MatchOutcome.SecondInningsWin);
            Assert.AreEqual(2, match.Result.MarginWickets); // won with both wickets in hand
        }

        [Test]
        public void Chase_WinWithOneWicketDown_MarginIsOneWicket()
        {
            var match = StartChaseAfter(Legal(1, 1, 1, 1, 1, 1)); // target 7
            match.RecordDelivery(DeliveryOutcome.Legal(4));
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Caught));
            match.RecordDelivery(DeliveryOutcome.Legal(3)); // 7 reached, one down
            AssertCompleted(match, MatchOutcome.SecondInningsWin);
            Assert.AreEqual(1, match.Result.MarginWickets);
            Assert.AreEqual(1, match.SecondInnings.Wickets);
        }

        // ------------------------------------------------------------------ chase: losses

        [Test]
        public void Chase_BallsRunOut_BelowTarget_IsALoss_ByRunsMargin()
        {
            // First innings 9 -> target 10. Chase manages 8.
            var match = StartChaseAfter(Legal(3, 3, 3, 0, 0, 0));
            foreach (var o in Legal(2, 2, 2, 1, 1, 0)) match.RecordDelivery(o);
            AssertCompleted(match, MatchOutcome.FirstInningsWin);
            Assert.AreEqual(8, match.SecondInnings.Runs);
            Assert.AreEqual(1, match.Result.MarginRuns, "Won by 9 - 8 = 1 run.");
            Assert.AreEqual(0, match.Result.WinnerInningsIndex);
        }

        [Test]
        public void Chase_TwoWicketsDown_BeforeTarget_IsALoss()
        {
            // Target 10. Chase: 4, wicket, wicket -> all over at 4.
            var match = StartChaseAfter(Legal(3, 3, 3, 0, 0, 0));
            match.RecordDelivery(DeliveryOutcome.Legal(4));
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Bowled));
            Assert.AreEqual(MatchPhase.SecondInnings, match.Phase);
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Caught));
            AssertCompleted(match, MatchOutcome.FirstInningsWin);
            Assert.AreEqual(4, match.SecondInnings.Runs);
            Assert.AreEqual(2, match.SecondInnings.Wickets);
            Assert.AreEqual(5, match.Result.MarginRuns, "Won by 9 - 4 = 5 runs.");
        }

        [Test]
        public void Chase_WicketsOut_OnVeryFirstBall_IsALoss()
        {
            var match = StartChaseAfter(Legal(1, 1, 1, 1, 1, 1)); // target 7
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Bowled));
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Lbw));
            AssertCompleted(match, MatchOutcome.FirstInningsWin);
            Assert.AreEqual(0, match.SecondInnings.Runs);
            Assert.AreEqual(6, match.Result.MarginRuns);
        }

        // ------------------------------------------------------------------ chase: tie

        [Test]
        public void Chase_FinishingExactlyLevel_IsATie_NotAWin()
        {
            // First innings 10 -> target 11. Chase ends on exactly 10.
            var match = StartChaseAfter(Legal(4, 4, 2, 0, 0, 0));
            foreach (var o in Legal(2, 2, 2, 2, 1, 1)) match.RecordDelivery(o);
            AssertCompleted(match, MatchOutcome.Tie);
            Assert.AreEqual(-1, match.Result.WinnerInningsIndex);
            Assert.AreEqual(10, match.SecondInnings.Runs);
            Assert.AreEqual(10, match.FirstInnings.Runs);
        }

        [Test]
        public void Chase_FinishingLevel_ViaWicketOnFinalBall_IsATie()
        {
            // Target 6 (first innings 5). Chase: 1,1,1,1,1 (5 after 5), wicket -> ends level.
            var match = StartChaseAfter(Legal(2, 2, 1, 0, 0, 0));
            foreach (var o in Legal(1, 1, 1, 1, 1)) match.RecordDelivery(o);
            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.RunOut));
            AssertCompleted(match, MatchOutcome.Tie);
        }

        // ------------------------------------------------------------------ display state

        [Test]
        public void Chase_DisplayState_TracksTargetRequiredBallsAndWickets()
        {
            var match = StartChaseAfter(Legal(4, 4, 4, 1, 0, 0)); // 13 -> target 14
            Assert.AreEqual(14, match.Target.Value);
            Assert.AreEqual(14, match.RunsRequired.Value);
            Assert.AreEqual(6, match.CurrentInnings.BallsRemaining);
            Assert.AreEqual(2, match.CurrentInnings.WicketsRemaining);

            match.RecordDelivery(DeliveryOutcome.Legal(4));
            Assert.AreEqual(10, match.RunsRequired.Value);
            Assert.AreEqual(5, match.CurrentInnings.BallsRemaining);

            match.RecordDelivery(DeliveryOutcome.Wide());
            Assert.AreEqual(9, match.RunsRequired.Value);
            Assert.AreEqual(5, match.CurrentInnings.BallsRemaining, "Wide must not reduce balls remaining.");

            match.RecordDelivery(DeliveryOutcome.Wicket(DismissalKind.Caught));
            Assert.AreEqual(1, match.CurrentInnings.WicketsRemaining);
        }

        // ------------------------------------------------------------------ ball log

        [Test]
        public void BallLog_RecordsEveryDelivery_WithChaseContext()
        {
            var match = StartChaseAfter(Legal(1, 1, 1, 1, 1, 1)); // target 7
            match.RecordDelivery(DeliveryOutcome.Wide());
            match.RecordDelivery(DeliveryOutcome.Legal(6));

            Assert.AreEqual(2, match.SecondInnings.Deliveries.Count);

            BallRecord wide = match.SecondInnings.Deliveries[0];
            Assert.AreEqual(DeliveryKind.Wide, wide.Outcome.Kind);
            Assert.AreEqual(0, wide.LegalBallsAfter);
            Assert.AreEqual(7, wide.TargetAtDelivery.Value);
            Assert.AreEqual(6, wide.RunsNeededAfter.Value);

            BallRecord six = match.SecondInnings.Deliveries[1];
            Assert.AreEqual(6, six.Outcome.BatRuns);
            Assert.AreEqual(1, six.LegalBallsAfter);
            Assert.AreEqual(7, six.TotalRunsAfter);
            Assert.AreEqual(0, six.RunsNeededAfter.Value);
        }

        // ------------------------------------------------------------------ events

        [Test]
        public void Events_FireInOrder_AcrossTheWholeMatch()
        {
            var events = new List<string>();
            var match = new SuperOverMatch(SuperOverConfig.Standard);
            match.InningsStarted += a => events.Add("start" + a.InningsIndex + (a.Target.HasValue ? "t" + a.Target.Value : ""));
            match.BallCompleted += a => events.Add("ball");
            match.InningsCompleted += a => events.Add("end" + a.InningsIndex + (a.TargetSet.HasValue ? "t" + a.TargetSet.Value : ""));
            match.MatchCompleted += a => events.Add("match:" + a.Result.Outcome);

            match.Start();
            foreach (var o in Legal(1, 1, 1, 1, 1, 2)) match.RecordDelivery(o); // 7 -> target 8
            match.StartSecondInnings();
            match.RecordDelivery(DeliveryOutcome.Legal(6));
            match.RecordDelivery(DeliveryOutcome.Legal(2)); // chase complete

            var expected = new List<string>
            {
                "start0",
                "ball", "ball", "ball", "ball", "ball", "ball",
                "end0t8",
                "start1t8",
                "ball", "ball",
                "end1",
                "match:SecondInningsWin"
            };
            Assert.AreEqual(expected, events);
        }

        // ------------------------------------------------------------------ invariant soak

        [Test]
        public void Soak_RandomMatches_NeverViolateChaseInvariants()
        {
            var rng = new Random(20260902);

            for (int m = 0; m < 3000; m++)
            {
                var match = new SuperOverMatch(SuperOverConfig.Standard);
                match.Start();

                int guard = 0;
                while (match.Phase != MatchPhase.Completed && guard++ < 500)
                {
                    if (match.Phase == MatchPhase.InningsBreak)
                    {
                        match.StartSecondInnings();
                        continue;
                    }
                    match.RecordDelivery(RandomOutcome(rng));
                }

                Assert.AreNotEqual(500, guard, "Match must terminate.");
                Assert.AreEqual(MatchPhase.Completed, match.Phase);

                var result = match.Result;
                var first = match.FirstInnings;
                var second = match.SecondInnings;

                Assert.LessOrEqual(first.LegalBalls, 6);
                Assert.LessOrEqual(second.LegalBalls, 6);
                Assert.LessOrEqual(first.Wickets, 2);
                Assert.LessOrEqual(second.Wickets, 2);
                Assert.AreEqual(result.Target, first.Runs + 1);

                switch (result.Outcome)
                {
                    case MatchOutcome.SecondInningsWin:
                        // Chase win: target reached, and never overshot by more than one delivery allows.
                        Assert.GreaterOrEqual(second.Runs, first.Runs + 1);
                        Assert.LessOrEqual(second.Runs, first.Runs + 1 + 6);
                        Assert.AreEqual(2 - second.Wickets, result.MarginWickets);
                        // The win must have happened immediately: the final recorded delivery
                        // is the one that crossed the target.
                        var last = second.Deliveries[second.Deliveries.Count - 1];
                        Assert.GreaterOrEqual(last.TotalRunsAfter, first.Runs + 1);
                        break;

                    case MatchOutcome.FirstInningsWin:
                        Assert.Less(second.Runs, first.Runs);
                        Assert.AreEqual(first.Runs - second.Runs, result.MarginRuns);
                        Assert.True(second.IsComplete);
                        break;

                    case MatchOutcome.Tie:
                        Assert.AreEqual(first.Runs, second.Runs);
                        Assert.True(second.IsComplete);
                        break;
                }
            }
        }

        private static DeliveryOutcome RandomOutcome(Random rng)
        {
            float roll = (float)rng.NextDouble();
            if (roll < 0.07f) return DeliveryOutcome.Wide();
            if (roll < 0.09f) return DeliveryOutcome.NoBall(rng.Next(2));
            if (roll < 0.17f)
            {
                var kinds = new[] { DismissalKind.Bowled, DismissalKind.Caught, DismissalKind.Lbw };
                return DeliveryOutcome.Wicket(kinds[rng.Next(kinds.Length)]);
            }
            int[] weights = { 32, 30, 12, 2, 16, 2, 6 }; // 0,1,2,3,4,5,6
            int total = 0;
            foreach (int w in weights) total += w;
            int pick = rng.Next(total);
            for (int i = 0; i < weights.Length; i++)
            {
                pick -= weights[i];
                if (pick < 0) return DeliveryOutcome.Legal(i);
            }
            return DeliveryOutcome.Legal(0);
        }
    }
}
