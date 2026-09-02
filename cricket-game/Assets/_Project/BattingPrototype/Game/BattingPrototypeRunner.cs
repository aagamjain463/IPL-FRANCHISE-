using System.Collections;
using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;
using CricketGame.BattingPrototype.Ball;
using CricketGame.BattingPrototype.Batsman;
using CricketGame.BattingPrototype.Bowler;
using CricketGame.BattingPrototype.Camera;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.Input;
using CricketGame.BattingPrototype.World;
using UnityEngine;

namespace CricketGame.BattingPrototype.Game
{
    /// <summary>
    /// Orchestrates the prototype loop: bowler run-up -> delivery -> footwork +
    /// swing input -> contact or pass -> result -> next ball. The engine does the
    /// rules; this class only sequences presentation around it.
    /// </summary>
    public class BattingPrototypeRunner : MonoBehaviour
    {
        private BattingWorld world;
        private BattingHud hud;
        private MobileBattingInput input;
        private TestBowler bowler;
        private CameraController cam;
        private BatSwingController swingCtrl;
        private BattingAnimationController animCtrl;

        private BattingEngine engine;

        private int runs;
        private int wickets;
        private int balls;

        private bool struckApplied;
        private bool ballResolved;
        private bool keeperCollected;
        private DeliveryData? lastDelivery;

        // ------------------------------------------------------------------ debug API

        public BattingEngine Engine { get { return engine; } }
        public DeliveryData? LastDelivery { get { return lastDelivery; } }
        public FootworkState EngineFoot { get { return engine.Foot; } }
        public SwingReport? LastSwing { get { return engine.LastSwing; } }

        public void ResetBatsmanPosition()
        {
            engine.SetFootworkPosition(0f, 0f);
        }

        // ------------------------------------------------------------------ wiring

        public void Init(BattingWorld w, BattingHud hudRef, MobileBattingInput inputRef,
                         TestBowler bowlerRef, CameraController camRef)
        {
            world = w;
            hud = hudRef;
            input = inputRef;
            bowler = bowlerRef;
            cam = camRef;

            swingCtrl = world.BatsmanRoot.GetComponentInChildren<BatSwingController>();
            animCtrl = world.BatsmanRoot.GetComponentInChildren<BattingAnimationController>();
            swingCtrl.Rig = world.Batsman;
            animCtrl.Rig = world.Batsman;
            animCtrl.Swing = swingCtrl;

            engine = new BattingEngine(new SystemRng());
            engine.SwingCommitted += OnSwingCommitted;
            engine.BallPassed += OnBallPassed;
            world.Ball.BallSettled += OnBallSettled;

            bowler.AttachRig(world.BowlerRoot, world.BowlerArm);
            hud.SetScoreboard(runs, wickets, balls);

            StartCoroutine(DeliveryLoop());
        }

        // ------------------------------------------------------------------ engine events

        private void OnSwingCommitted(SwingReport report)
        {
            float timeUntilContact = engine.ActiveDelivery.TimeToContact - engine.DeliveryTime;
            swingCtrl.PlaySwing(
                Mathf.Max(0.05f, timeUntilContact),
                report.Direction.AngleFromStraight,
                report.Selection.Lofted,
                report.Selection.Awkward,
                TimingSystem.PowerCurve(report.TimingOffset));
            animCtrl.NotifySwingPlayed();

            if (!report.WillContact && report.Window == TimingWindow.Missed)
                hud.ShowPopup("TOO LATE!", new Color(1f, 0.4f, 0.3f), 0.7f);
        }

        private void OnBallPassed(BallPassedReport report)
        {
            if (report.HitStumps)
            {
                wickets++;
                hud.ShowPopup("BOWLED!", new Color(1f, 0.25f, 0.2f), 1.4f);
                StartCoroutine(KnockStumps());
            }
            else if (report.Swung)
            {
                hud.ShowPopup("BEATEN!", new Color(1f, 0.75f, 0.3f), 0.9f);
            }
            else
            {
                hud.ShowPopup("LEFT ALONE", new Color(0.8f, 0.9f, 1f), 0.8f);
            }
            cam.ReturnToGameplay();
        }

        private void OnBallSettled(BallEndResult result)
        {
            runs += result.Runs;
            if (result.Six) hud.ShowPopup("SIX!", new Color(1f, 0.85f, 0.2f), 1.3f);
            else if (result.CrossedBoundary) hud.ShowPopup("FOUR!", new Color(0.4f, 0.9f, 1f), 1.3f);
            else if (result.Runs > 0) hud.ShowPopup("+" + result.Runs, Color.white, 0.9f);
            else hud.ShowPopup("DOT", new Color(0.75f, 0.75f, 0.75f), 0.7f);

            cam.ReturnToGameplay();
            ballResolved = true;
        }

        // ------------------------------------------------------------------ main loop

        private IEnumerator DeliveryLoop()
        {
            while (true)
            {
                // --- pre-delivery: wide view, bowler walks back
                bowler.ResetPosition();
                ResetStumps();
                cam.ShowSetup();
                hud.SetScoreboard(runs, wickets, balls);
                yield return new WaitForSeconds(0.9f);

                // --- run-up (camera blends to the gameplay view meanwhile)
                cam.BeginRunUp();
                bowler.StartRunUp();
                yield return new WaitForSeconds(bowler.RunUpDuration);

                Deliver();

                // --- wait for the ball to resolve
                while (!ballResolved && !keeperCollected)
                    yield return null;

                balls++;
                hud.SetScoreboard(runs, wickets, balls);
                yield return new WaitForSeconds(1.15f);
            }
        }

        private void Deliver()
        {
            var data = bowler.NextDelivery();
            lastDelivery = data;

            engine.BeginDelivery(data);
            world.Ball.Launch(engine.ActiveDelivery);

            struckApplied = false;
            ballResolved = false;
            keeperCollected = false;

            cam.OnRelease();
        }

        // ------------------------------------------------------------------ per-frame

        private void Update()
        {
            float dt = Time.deltaTime;

            BattingInputFrame frame = input.Sample();
            engine.Update(dt, frame);

            world.Ball.AdvanceFlight(dt);
            animCtrl.ApplyEngineFootwork(engine.Foot);
            UpdateBallShadow();

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
                        cam.FollowShot(world.Ball.transform.position);
                        hud.ShowPopup(
                            swing.Value.Selection.Name.ToUpper() + "  -  " + swing.Value.Window.ToString().ToUpper(),
                            WindowColor(swing.Value.Window), 0.95f);
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
