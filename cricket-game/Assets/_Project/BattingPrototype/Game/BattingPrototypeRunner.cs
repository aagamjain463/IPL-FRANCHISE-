using System.Collections;
using CricketGame.Core.AI;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.Core.Fielding;
using CricketGame.Core.Rules;
using CricketGame.Core.Simulation;
using CricketGame.BattingPrototype.Audio;
using CricketGame.BattingPrototype.Ball;
using CricketGame.BattingPrototype.Batsman;
using CricketGame.BattingPrototype.Bowler;
using CricketGame.BattingPrototype.Bowling;
using CricketGame.BattingPrototype.Camera;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.Input;
using CricketGame.BattingPrototype.Match;
using CricketGame.BattingPrototype.World;
using UnityEngine;

namespace CricketGame.BattingPrototype.Game
{
    /// <summary>Debug-only fielding override (spec section 25).</summary>
    public enum ForcedFielding { None, Catch, Miss, StopOne, Boundary }

    /// <summary>
    /// The delivery loop (Phase 1/2 behaviour, now match-aware). All match
    /// rules live in <see cref="MatchController"/>; this class sequences
    /// presentation around whatever the match says happens next:
    ///
    ///   Innings 1 - PLAYER bats (touch input), AI bowls from its plan.
    ///   Innings 2 - AI bats (drives the same engine), PLAYER bowls via the
    ///               bowling panel.
    ///
    /// Struck balls are resolved by the deterministic FieldingSimulator; the
    /// rigidbody ball and fielders present that result.
    /// </summary>
    public class BattingPrototypeRunner : MonoBehaviour
    {
        private BattingWorld world;
        private BattingHud hud;
        private MobileBattingInput input;
        private BowlingController bowling;
        private BowlerController bowler;
        private CameraController cam;
        private BatSwingController swingCtrl;
        private BattingAnimationController animCtrl;

        private MatchController matchCtl;
        private FielderManager fielders;
        private BowlingUiPanel bowlingPanel;
        private readonly AiBatterDriver aiDriver = new AiBatterDriver();

        private BattingEngine engine;

        private bool struckApplied;
        private bool ballResolved;
        private bool keeperCollected;
        private bool deliveryRecorded;
        private bool redeliverNext;
        private DeliveryData? lastDelivery;
        private ShotOutcomeResult pendingOutcome;
        private bool hasPendingOutcome;

        // Phase 3 fielding resolution state.
        private FieldingResult pendingFielding;
        private bool fieldingActive;
        private float struckClock;
        private DeliveryData? currentDelivery;

        // ---------------------------------------------------------------- debug API

        /// <summary>Debug: engine timing is overridden so every swing is PERFECT.</summary>
        public bool ForcePerfectTiming;

        /// <summary>Debug: force a specific cricket outcome (None = physics).</summary>
        public ForcedOutcome ForcedOutcome = ForcedOutcome.None;

        /// <summary>Debug: force the FIELDING result (None = simulation).</summary>
        public ForcedFielding ForcedField = ForcedFielding.None;

        /// <summary>Debug: slow-motion for tuning.</summary>
        public bool SlowMotion
        {
            get { return slowMotion; }
            set
            {
                slowMotion = value;
                Time.timeScale = value ? 0.35f : 1f;
                Time.fixedDeltaTime = 0.02f * Time.timeScale;
            }
        }
        private bool slowMotion;

        public GameplayEvents Events { get; private set; }
        public MatchController MatchCtl { get { return matchCtl; } }
        public FielderManager Fielders { get { return fielders; } }
        public BowlingUiPanel BowlingPanel { get { return bowlingPanel; } }

        public BattingEngine Engine { get { return engine; } }
        public DeliveryData? LastDelivery { get { return lastDelivery; } }
        public FootworkState EngineFoot { get { return engine.Foot; } }
        public SwingReport? LastSwing { get { return engine.LastSwing; } }
        public ShotOutcomeResult? LastOutcome { get { return hasPendingOutcome ? pendingOutcome : (ShotOutcomeResult?)null; } }

        public void ResetBatsmanPosition()
        {
            engine.SetFootworkPosition(0f, 0f);
        }

        /// <summary>Debug: replay the current delivery immediately, same ball.
        /// Only allowed before the delivery has been recorded into the match.</summary>
        public void RedeliverSameBall()
        {
            if (lastDelivery == null || deliveryRecorded) return;
            redeliverNext = true;
            ballResolved = true;   // release the loop's wait
            keeperCollected = true;
        }

        /// <summary>Debug: skip the pre-delivery ceremony for the next ball.</summary>
        public void SimulateNextDelivery()
        {
            skipCeremony = true;
        }
        private bool skipCeremony;

        // ------------------------------------------------------------------ wiring

        public void Init(BattingWorld w, BattingHud hudRef, MobileBattingInput inputRef,
                         BowlingController bowlingRef, BowlerController bowlerRef,
                         CameraController camRef, MatchController matchRef,
                         FielderManager fieldersRef, BowlingUiPanel panelRef)
        {
            world = w;
            hud = hudRef;
            input = inputRef;
            bowling = bowlingRef;
            bowler = bowlerRef;
            cam = camRef;
            matchCtl = matchRef;
            fielders = fieldersRef;
            bowlingPanel = panelRef;
            Events = new GameplayEvents();

            swingCtrl = world.BatsmanRoot.GetComponentInChildren<BatSwingController>();
            animCtrl = world.BatsmanRoot.GetComponentInChildren<BattingAnimationController>();
            swingCtrl.Rig = world.Batsman;
            animCtrl.Rig = world.Batsman;
            animCtrl.Swing = swingCtrl;

            engine = new BattingEngine(new SystemRng());
            engine.SwingCommitted += OnSwingCommitted;
            engine.BallPassed += OnBallPassed;
            engine.BounceReached += OnBounceReached;
            world.Ball.BallSettled += OnBallSettled;

            bowler.AttachRig(world.BowlerRoot, world.BowlerArm);
            hud.PlayAgainPressed += () => matchCtl.PlayAgain();
            matchCtl.RefreshHud();

            StartCoroutine(DeliveryLoop());
        }

        private void OnDestroy()
        {
            // Never leave the sim in slow motion when the prototype stops.
            Time.timeScale = 1f;
        }

        // ------------------------------------------------------------------ engine events

        private void OnBounceReached()
        {
            Events.FireBallBounced(world.Ball.transform.position);
        }

        private void OnSwingCommitted(SwingReport report)
        {
            float timeUntilContact = engine.ActiveDelivery.TimeToContact - engine.DeliveryTime;

            // Phase 4: contextual animation. Edges deflect, awkward requests
            // snap to the nearest believable gesture (never a broken anim).
            FootPose pose = FootworkController.Pose(engine.Foot);
            FootPoseKind poseKind = pose == FootPose.FrontFoot ? FootPoseKind.Front
                : pose == FootPose.BackFoot ? FootPoseKind.Back : FootPoseKind.Neutral;
            ShotAnimationSpec spec = report.Contact != null && report.Contact.Outcome == ContactOutcome.Edge
                ? ShotAnimationResolver.ResolveEdge(report)
                : ShotAnimationResolver.Resolve(report, poseKind);
            // Honour the timing model: the bat must arrive at the contact time.
            spec.Duration = Mathf.Clamp(timeUntilContact / Mathf.Max(0.15f, spec.ContactFraction),
                                        0.30f, 0.85f);
            animCtrl.NotifySwingPlayed(spec);

            // Phase 4 timing FEEL: tier label + haptic + camera response.
            TimingFeedbackResult feel = TimingFeedback.Resolve(report.Window, report.Intent);
            hud.ShowTimingQuality(feel.Label, report.Window);
            Haptics.Play(feel.Haptic);
            cam.OnShotQuality(feel.Camera);
            Events.FireShotPlayed(report);

            if (!report.WillContact && report.Window == TimingWindow.Missed)
                hud.ShowPopup(matchCtl.PlayerIsBatting ? "TOO LATE!" : "SWING AND A MISS!",
                              new Color(1f, 0.4f, 0.3f), 0.7f);
        }

        private void OnBallPassed(BallPassedReport report)
        {
            // Unstruck ball: resolve cricket outcome (bowled / LBW / beaten / left).
            ShotOutcomeResult outcome = ShotOutcomeResolver.Resolve(
                engineRng, engine.ActiveDelivery, engine.LastSwing,
                engine.Foot.X, engine.Foot.Z, true, ForcedOutcome);

            pendingOutcome = outcome;
            hasPendingOutcome = true;

            DeliveryOutcome rulesOutcome;
            if (outcome.IsWicket)
            {
                rulesOutcome = DeliveryOutcome.Wicket(
                    outcome.Kind == ShotOutcomeKind.Lbw ? DismissalKind.Lbw : DismissalKind.Bowled);
                hud.ShowWicketBanner(outcome.Kind == ShotOutcomeKind.Lbw ? "LBW!" : "BOWLED!");
                cam.OnWicket();
                StartCoroutine(KnockStumps());
                Events.FireWicket(outcome);
                AudioManager.Play(GameSound.Wicket);
                Haptics.Play(0.7f);
                animCtrl.NotifyReaction(ShotAnimationResolver.ResolveReaction(
                    report.Swung, true, outcome.Kind == ShotOutcomeKind.Lbw));
            }
            else
            {
                rulesOutcome = DeliveryOutcome.Legal(outcome.Runs);
                if (report.Swung)
                    hud.ShowPopup("BEATEN!", new Color(1f, 0.75f, 0.3f), 0.9f);
                else
                    hud.ShowPopup("LEFT ALONE", new Color(0.8f, 0.9f, 1f), 0.8f);
                animCtrl.NotifyReaction(ShotAnimationResolver.ResolveReaction(
                    report.Swung, false, false));
            }

            Events.FireDeliveryComplete(outcome);
            RecordNow(rulesOutcome);
            if (!outcome.IsWicket) cam.ReturnToGameplay();
            ballResolved = true;
        }

        private void OnBallSettled(BallEndResult result)
        {
            // The rigidbody says the ball finished. For struck balls the RUNS
            // come from the fielding simulation; this event only tells us the
            // presentation caught up (boundary reached).
            if (deliveryRecorded) return;

            if (fieldingActive && pendingFielding != null)
            {
                FinalizeStruckDelivery();
                return;
            }

            // Legacy safety net (e.g. redeliver races): resolve as the pending
            // Phase 2 outcome if one exists.
            ShotOutcomeResult outcome = hasPendingOutcome
                ? pendingOutcome
                : new ShotOutcomeResult { Kind = ShotOutcomeKind.Dot, Label = "DOT BALL", Runs = 0 };
            AnnounceOutcome(outcome);
            Events.FireDeliveryComplete(outcome);
            cam.ReturnToGameplay();
            RecordNow(DeliveryOutcome.Legal(outcome.Runs));
            ballResolved = true;
        }

        private void AnnounceOutcome(ShotOutcomeResult outcome)
        {
            switch (outcome.Kind)
            {
                case ShotOutcomeKind.Six:
                    hud.ShowBoundaryBanner("SIX!", new Color(1f, 0.85f, 0.2f));
                    Events.FireBoundary(6, true);
                    AudioManager.Play(GameSound.BoundarySix);
                    break;
                case ShotOutcomeKind.Four:
                    hud.ShowBoundaryBanner("FOUR!", new Color(0.4f, 0.9f, 1f));
                    Events.FireBoundary(4, false);
                    AudioManager.Play(GameSound.BoundaryFour);
                    break;
                case ShotOutcomeKind.TopEdge:
                case ShotOutcomeKind.InsideEdge:
                case ShotOutcomeKind.OutsideEdge:
                    hud.ShowPopup(outcome.Label, new Color(1f, 0.65f, 0.4f), 1.0f);
                    break;
                case ShotOutcomeKind.Single:
                case ShotOutcomeKind.Two:
                case ShotOutcomeKind.Three:
                    hud.ShowPopup("+" + outcome.Runs, Color.white, 0.9f);
                    break;
                case ShotOutcomeKind.Defensive:
                    hud.ShowPopup(outcome.Runs > 0 ? "BLOCKED  +1" : "BLOCKED",
                        new Color(0.75f, 0.85f, 1f), 0.7f);
                    break;
                default:
                    hud.ShowPopup(outcome.Label, new Color(0.75f, 0.75f, 0.75f), 0.7f);
                    break;
            }
        }

        // ------------------------------------------------------------------ fielding

        /// <summary>Resolves a struck ball against the field (spec sections
        /// 4-12) and schedules its presentation.</summary>
        private void ResolveStruckBall(SwingReport swing)
        {
            ContactResult contact = swing.Contact;
            DeliveryTrajectory traj = engine.ActiveDelivery;
            float startHeight = Mathf.Max(0.35f, traj.HeightAtContact);
            var contactPos = new Vec3(traj.XAtContact, startHeight, DeliveryTrajectory.ContactZ);
            float speed = contact.ExitSpeedKph / 3.6f;
            var velocity = new Vec3(contact.Direction.X * speed,
                                    contact.Direction.Y * speed,
                                    contact.Direction.Z * speed);

            FieldingResult field = FieldingSimulator.Simulate(
                contactPos, velocity, matchCtl.CurrentField(), engineRng);
            field = ApplyFieldingForces(field, velocity);

            pendingFielding = field;
            fieldingActive = true;
            struckClock = 0f;
            fielders.OnBallStruck(field);

            switch (field.Kind)
            {
                case FieldingKind.Six:
                    hud.ShowBoundaryBanner("SIX!", new Color(1f, 0.85f, 0.2f));
                    Events.FireBoundary(6, true);
                    AudioManager.Play(GameSound.BoundarySix);
                    cam.FollowShot(world.Ball.transform.position, true);
                    break;
                case FieldingKind.Four:
                    hud.ShowBoundaryBanner("FOUR!", new Color(0.4f, 0.9f, 1f));
                    Events.FireBoundary(4, false);
                    AudioManager.Play(GameSound.BoundaryFour);
                    cam.FollowShot(world.Ball.transform.position, true);
                    break;
                case FieldingKind.Caught:
                    // Announced when the catch actually happens (struckClock).
                    break;
                default:
                    cam.OnFieldingPlay(world.Ball.transform.position);
                    break;
            }
        }

        /// <summary>Debug force-fielding hook (spec section 25).</summary>
        private FieldingResult ApplyFieldingForces(FieldingResult field, Vec3 velocity)
        {
            switch (ForcedField)
            {
                case ForcedFielding.Catch:
                    if (field.Kind != FieldingKind.Caught)
                    {
                        field.Kind = FieldingKind.Caught;
                        field.Runs = 0;
                        if (field.FielderIndex < 0) field.FielderIndex = 2; // cover
                        if (string.IsNullOrEmpty(field.FielderName)) field.FielderName = "cover";
                        if (field.Time < 0.5f) field.Time = 0.9f;
                    }
                    break;
                case ForcedFielding.Miss:
                    if (field.Kind == FieldingKind.Caught || field.Kind == FieldingKind.Stopped)
                    {
                        field.Kind = FieldingKind.Four;
                        field.Runs = 4;
                        field.FielderIndex = -1;
                        field.FielderName = null;
                    }
                    break;
                case ForcedFielding.StopOne:
                    field.Kind = FieldingKind.Stopped;
                    field.Runs = 1;
                    if (field.Time < 0.4f) field.Time = 0.6f;
                    break;
                case ForcedFielding.Boundary:
                    field.Kind = FieldingKind.Four;
                    field.Runs = 4;
                    field.FielderIndex = -1;
                    field.FielderName = null;
                    break;
                case ForcedFielding.None:
                    break;
            }
            return field;
        }

        private void UpdateStruckPresentation(float dt)
        {
            if (!fieldingActive || pendingFielding == null || deliveryRecorded) return;
            struckClock += dt;
            fielders.AdvanceStruckClock(dt);

            bool boundary = pendingFielding.Kind == FieldingKind.Four
                            || pendingFielding.Kind == FieldingKind.Six;

            if (!boundary)
            {
                if (struckClock >= pendingFielding.Time)
                {
                    Vector3 spot = new Vector3(pendingFielding.Pos.X,
                        Mathf.Max(0.12f, pendingFielding.Pos.Y), pendingFielding.Pos.Z);
                    world.Ball.FreezeAt(spot);
                    if (pendingFielding.Kind == FieldingKind.Caught)
                    {
                        hud.ShowWicketBanner("CAUGHT" +
                            (string.IsNullOrEmpty(pendingFielding.FielderName)
                                ? "!" : "  -  " + pendingFielding.FielderName.ToUpper() + "!"));
                        cam.OnCatchEmphasis(spot);
                        AudioManager.Play(GameSound.Wicket);
                        Events.FireWicket(new ShotOutcomeResult
                        {
                            Kind = ShotOutcomeKind.TopEdge,
                            Label = "CAUGHT",
                            IsWicket = true,
                        });
                    }
                    else
                    {
                        cam.OnFieldingPlay(spot);
                        if (pendingFielding.Runs > 0)
                            hud.ShowPopup("+" + pendingFielding.Runs +
                                          (pendingFielding.Runs == 1 ? " RUN" : " RUNS"),
                                          Color.white, 0.9f);
                        else
                            hud.ShowPopup("DOT BALL", new Color(0.75f, 0.75f, 0.75f), 0.7f);
                    }
                    FinalizeStruckDelivery();
                }
            }
            else if (struckClock > pendingFielding.Time + 1.5f)
            {
                // Physics fell behind the sim: force the boundary home.
                FinalizeStruckDelivery();
            }
        }

        private void FinalizeStruckDelivery()
        {
            if (deliveryRecorded) return;
            DeliveryOutcome rulesOutcome;
            if (pendingFielding.Kind == FieldingKind.Caught)
                rulesOutcome = DeliveryOutcome.Wicket(DismissalKind.Caught);
            else
                rulesOutcome = DeliveryOutcome.Legal(pendingFielding.Runs);

            // Phase 4: let the AI bowler read what the player just did.
            if (matchCtl.PlayerIsBatting && engine.LastSwing.HasValue)
            {
                SwingReport sr = engine.LastSwing.Value;
                matchCtl.NoteBatterShot(
                    ShotSelector.SectorOf(sr.Direction.AngleFromStraight),
                    rulesOutcome.IsWicket ? 0 : pendingFielding.Runs,
                    sr.Intent);
            }

            RecordNow(rulesOutcome);
            fieldingActive = false;
            ballResolved = true;
            if (pendingFielding.Kind != FieldingKind.Caught
                && pendingFielding.Kind != FieldingKind.Four
                && pendingFielding.Kind != FieldingKind.Six)
                cam.ReturnToGameplay();
        }

        private void RecordNow(DeliveryOutcome outcome)
        {
            if (deliveryRecorded) return;
            deliveryRecorded = true;
            matchCtl.RecordDelivery(outcome);
        }

        // ------------------------------------------------------------------ main loop

        private IEnumerator DeliveryLoop()
        {
            while (true)
            {
                // Match flow gate: innings result / break / match result screens.
                yield return StartCoroutine(matchCtl.BetweenDeliveries());

                bool playerBatting = matchCtl.PlayerIsBatting;
                hud.SetBattingControlsVisible(playerBatting);
                hud.SetBattingSideLabel(playerBatting ? "YOU" : "AI");
                bowlingPanel.SetVisible(matchCtl.PlayerIsBowling);
                bowling.AccuracyOverride = playerBatting ? matchCtl.AiBowlingAccuracy : -1f;

                DeliveryData data;

                if (redeliverNext)
                {
                    // Debug redeliver: same ball again, no run-up ceremony.
                    redeliverNext = false;
                    ResetStumps();
                    cam.ReturnToGameplay();
                    data = bowling.Redeliver();
                }
                else
                {
                    // --- pre-delivery: wide broadcast view, bowler walks back
                    bowler.ResetPosition();
                    ResetStumps();
                    ResetBatsmanPosition();
                    fielders.BeginDelivery();
                    cam.ShowSetup();
                    matchCtl.RefreshHud();
                    yield return new WaitForSeconds(skipCeremony ? 0.15f : 0.75f);
                    skipCeremony = false;

                    // --- run-up (camera blends to gameplay meanwhile)
                    cam.BeginRunUp();
                    bowler.StartRunUp();
                    yield return new WaitForSeconds(bowler.RunUpDuration);

                    if (matchCtl.PlayerIsBowling)
                    {
                        // Phase 4: release-timing skill check (spec section 7).
                        bowlingPanel.BeginRelease();
                        while (!bowlingPanel.ReleaseCaptured)
                            yield return null;
                        var bowled = bowling.PlayerDeliveryWithRelease(
                            bowlingPanel.SelectedType, bowlingPanel.Line, bowlingPanel.Length,
                            bowlingPanel.ReleaseOffset, 0.9f);
                        data = bowled.Delivery;
                        hud.ShowDeliveryToast("RELEASE: " + bowled.Quality.ToString().ToUpperInvariant());
                    }
                    else
                    {
                        // Phase 4: AI bowling reads the batter before choosing.
                        bowling.StrategyOverride = matchCtl.NextAiBowlingPlan();
                        bowling.Phase4Difficulty = matchCtl.Difficulty;
                        data = bowling.NextDelivery();
                    }
                }

                // Phase 4: a sprayed delivery is a WIDE - one extra run, no
                // legal ball. Announce it, record it, and bowl again.
                if (bowling.LastDeliveryWasWide)
                {
                    hud.ShowBoundaryBanner("WIDE!", new Color(1f, 0.6f, 0.3f));
                    Events.FireDeliveryComplete(new ShotOutcomeResult
                    {
                        Kind = ShotOutcomeKind.Dot, Label = "WIDE", Runs = 0
                    });
                    matchCtl.RecordDelivery(DeliveryOutcome.Wide());
                    cam.ReturnToGameplay();
                    yield return new WaitForSeconds(1.0f);
                    ballResolved = true;
                    continue;
                }

                Deliver(data);

                // AI batter plans this delivery once it exists.
                if (!matchCtl.PlayerIsBatting)
                {
                    var hintTraj = new DeliveryTrajectory(data);
                    aiDriver.BeginDelivery(data, matchCtl.BuildChaseContext(),
                                           matchCtl.Difficulty, hintTraj.HitsStumps(),
                                           matchCtl.AiArchetype);
                }

                // --- wait for the ball to resolve
                while (!ballResolved)
                    yield return null;

                aiDriver.EndDelivery();
                matchCtl.RefreshHud();
                yield return new WaitForSeconds(1.05f);
            }
        }

        private void Deliver(DeliveryData data)
        {
            lastDelivery = data;
            currentDelivery = data;

            engine.BeginDelivery(data);
            world.Ball.Launch(engine.ActiveDelivery);

            struckApplied = false;
            ballResolved = false;
            keeperCollected = false;
            hasPendingOutcome = false;
            deliveryRecorded = false;
            pendingFielding = null;
            fieldingActive = false;

            hud.ShowDeliveryToast(DeliveryLabels.Name(data.Type) + "  -  " +
                                  Mathf.RoundToInt(data.SpeedKph) + " KPH");
            UI.HudStats.LastDeliverySpeedKph = data.SpeedKph;   // Phase 5 spell analysis
            Events.FireBallReleased(data);
            matchCtl.NotifyDeliveryStarted();
            AudioManager.Play(GameSound.DeliveryRelease);
            cam.OnRelease();
        }

        // ------------------------------------------------------------------ per-frame

        private void Update()
        {
            float dt = Time.deltaTime;

            BattingInputFrame frame;
            if (matchCtl.PlayerIsBatting)
            {
                frame = input.Sample();
                InjectForcedSwing(ref frame);
            }
            else
            {
                frame = aiDriver.SampleFrame(engine, dt);
            }
            engine.Update(dt, frame);

            world.Ball.AdvanceFlight(dt);
            animCtrl.ApplyEngineFootwork(engine.Foot);
            UpdateBallShadow();
            UpdateStruckPresentation(dt);

            DeliveryTrajectory traj = engine.ActiveDelivery;
            if (traj == null) return;

            if (world.Ball.InFlight)
            {
                cam.TrackBall(world.Ball.transform.position);

                if (!struckApplied && engine.ContactWillHappen && engine.DeliveryTime >= traj.TimeToContact)
                {
                    struckApplied = true;
                    SwingReport? swing = engine.LastSwing;
                    if (swing.HasValue && swing.Value.WillContact)
                    {
                        ContactResult contact = swing.Value.Contact;
                        world.Ball.Strike(contact.Direction, contact.ExitSpeedKph);
                        Events.FireBallContact(contact);
                        AudioManager.Play(GameSound.BatContact);
                        ShowContactFeedback(swing.Value);
                        ResolveStruckBall(swing.Value);
                    }
                }

                if (!engine.ContactWillHappen && engine.DeliveryTime >= traj.TimeToStumps + 0.20f)
                {
                    // Ball passed the batter unstruck: hand it to the keeper.
                    world.Ball.CollectAtKeeper(world.KeeperMark.position + new Vector3(0.25f, 0.35f, 0f));
                    keeperCollected = true;
                }
            }
        }

        private void ShowContactFeedback(SwingReport swing)
        {
            string text = swing.Selection.Name.ToUpper() + "  -  " + swing.Window.ToString().ToUpper();
            Color color = WindowColor(swing.Window);
            hud.ShowPopup(text, color, 0.95f);
            if (swing.Window == TimingWindow.Perfect) hud.FlashTiming(color);
        }

        /// <summary>
        /// Debug: with ForcePerfectTiming the runner fires the player's swing at
        /// exactly the ideal frame (bat arrives with offset ~0).
        /// </summary>
        private void InjectForcedSwing(ref BattingInputFrame frame)
        {
            if (!ForcePerfectTiming || frame.SwingTriggered) return;
            DeliveryTrajectory traj = engine.ActiveDelivery;
            if (traj == null || engine.SwingTaken || engine.ContactWillHappen) return;
            if (!world.Ball.InFlight) return;

            float windup = TimingSystem.WindupTime(frame.Intent);
            float ideal = traj.TimeToContact - windup;
            if (engine.DeliveryTime + Time.deltaTime >= ideal && engine.DeliveryTime <= ideal + 0.02f)
            {
                frame.SwingTriggered = true;
                frame.ShotDirection = new Vec2(0f, 1f);
                frame.SwipeStrength = 1f;
            }
        }

        private void UpdateBallShadow()
        {
            Vector3 bp = world.Ball.transform.position;
            world.BallShadow.position = new Vector3(bp.x, 0.02f, bp.z);
            float s = Mathf.Clamp(1.2f - bp.y * 0.12f, 0.4f, 1.2f);
            world.BallShadow.localScale = new Vector3(0.28f * s, 0.28f * s, 1f);
        }

        private static Color WindowColor(TimingWindow w)
        {
            switch (w)
            {
                case TimingWindow.Perfect: return new Color(1f, 0.85f, 0.2f);
                case TimingWindow.Good: return new Color(0.4f, 1f, 0.5f);
                case TimingWindow.Early:
                case TimingWindow.Late: return new Color(1f, 0.7f, 0.3f);
                default: return new Color(1f, 0.4f, 0.35f);
            }
        }

        // The outcome resolver needs an RNG for its bounded luck (edge runs etc.).
        // It is only used for presentation-side rolls, never for timing.
        private readonly IRng engineRng = new SystemRng();

        // ------------------------------------------------------------------ stump reactions

        private IEnumerator KnockStumps()
        {
            Transform stump = world.MiddleStump;
            Quaternion start = stump.localRotation;
            Quaternion end = Quaternion.Euler(-85f, 0, 12f);
            float t = 0f;
            while (t < 0.3f)
            {
                t += Time.deltaTime;
                stump.localRotation = Quaternion.Slerp(start, end, t / 0.3f);
                yield return null;
            }
        }

        private void ResetStumps()
        {
            world.MiddleStump.localRotation = Quaternion.identity;
        }
    }
}
