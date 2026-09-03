using CricketGame.BattingPrototype.Bowler;
using CricketGame.BattingPrototype.Bowling;
using CricketGame.BattingPrototype.Camera;
using CricketGame.BattingPrototype.Game;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.Input;
using CricketGame.BattingPrototype.Match;
using CricketGame.BattingPrototype.World;
using UnityEngine;

namespace CricketGame.BattingPrototype.Bootstrap
{
    /// <summary>
    /// The only object placed in the scene by hand. On Awake it builds the
    /// entire prototype: world, rigs, camera, HUD, input, bowling and the
    /// runner. This keeps the scene file trivial and everything reproducible
    /// in code.
    /// </summary>
    public class BattingBootstrap : MonoBehaviour
    {
        [Tooltip("Show the tuning/debug panel on start (testers only).")]
        [SerializeField] private bool debugPanelVisible = false;

        [Tooltip("Optional designer-tuned bowler profile asset. Empty = code default.")]
        [SerializeField] private BowlerProfile bowlerProfile;

        private void Awake()
        {
            // Mobile-first runtime settings.
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            QualitySettings.vSyncCount = 0;

            var root = new GameObject("BattingPrototype");
            root.transform.SetParent(transform, false);

            // World (field, stadium dressing, rigs, ball, lights, camera).
            BattingWorld world = BattingWorldBuilder.Build(root.transform);

            // Phase 5: dusk lighting, floodlight glow, crowd bands, quality presets.
            World.StadiumAtmosphere.Attach(world.Root, world.Camera);
            Game.Haptics.Enabled = UI.HudStats.HapticsEnabled;

            // Camera controller drives the built camera.
            var camGo = new GameObject("CameraRig");
            camGo.transform.SetParent(root.transform, false);
            var camCtrl = camGo.AddComponent<CameraController>();
            camCtrl.Init(world.Camera);
            // Parent the actual camera so the rig transform moves it.
            world.Camera.transform.SetParent(camGo.transform, true);

            // Input.
            var inputGo = new GameObject("Input");
            inputGo.transform.SetParent(root.transform, false);
            var input = inputGo.AddComponent<MobileBattingInput>();

            // Bowling: plan orchestrator + visual bowler.
            var bowlingGo = new GameObject("Bowling");
            bowlingGo.transform.SetParent(root.transform, false);
            var bowling = bowlingGo.AddComponent<BowlingController>();
            bowling.Init(bowlerProfile); // null-safe: falls back to the code default

            var bowlerGo = new GameObject("Bowler");
            bowlerGo.transform.SetParent(root.transform, false);
            var bowler = bowlerGo.AddComponent<BowlerController>();

            // HUD.
            var hudGo = new GameObject("HudRoot");
            hudGo.transform.SetParent(root.transform, false);
            var hud = hudGo.AddComponent<BattingHud>();
            hud.Build(input);
            input.IntentButtonsRectScreen = hud.IntentButtonsScreenRect();

            // Fielders (9 + bowler + keeper, spec section 6).
            var fieldersGo = new GameObject("Fielders");
            fieldersGo.transform.SetParent(root.transform, false);
            var fielders = fieldersGo.AddComponent<FielderManager>();
            fielders.Build(root.transform);

            // Match controller (owns all match rules and flow).
            var matchGo = new GameObject("MatchController");
            matchGo.transform.SetParent(root.transform, false);
            var matchCtl = matchGo.AddComponent<MatchController>();
            matchCtl.Init(hud);

            // Bowling controls for the chase innings.
            var panelGo = new GameObject("BowlingPanel");
            panelGo.transform.SetParent(root.transform, false);
            var bowlingPanel = panelGo.AddComponent<BowlingUiPanel>();
            bowlingPanel.Build(hud.Canvas);

            // Phase 5: HUDs observe the rules engine directly (over chips,
            // partnership strip, spell analysis) - no duplicated scoring state.
            hud.BindMatch(matchCtl);
            bowlingPanel.BindMatch(matchCtl);

            // Phase 5 presentation screens.
            var preGo = new GameObject("PreMatchScreen");
            preGo.transform.SetParent(root.transform, false);
            var preMatch = preGo.AddComponent<UI.PreMatchScreen>();
            preMatch.Build(hud.Canvas);

            var pauseGo = new GameObject("PauseMenuScreen");
            pauseGo.transform.SetParent(root.transform, false);
            var pause = pauseGo.AddComponent<UI.PauseMenuScreen>();
            pause.Build(hud.Canvas);

            hud.PausePressed += pause.Open;
            pause.QuitPressed += () =>
            {
                matchCtl.ResetMatch();
                camCtrl.PreMatchOrbit();
                preMatch.Show();
            };
            preMatch.Started += camCtrl.ShowSetup;
            matchCtl.FlowChanged += state =>
            {
                if (state == Match.MatchFlowState.MatchResult) camCtrl.ShowResultHold();
            };
            camCtrl.PreMatchOrbit();
            preMatch.Show();

            // Debug panel.
            var debugGo = new GameObject("DebugUI");
            debugGo.transform.SetParent(root.transform, false);
            var debug = debugGo.AddComponent<BattingDebugUI>();

            // Runner (owns the game loop).
            var runnerGo = new GameObject("Runner");
            runnerGo.transform.SetParent(root.transform, false);
            var runner = runnerGo.AddComponent<BattingPrototypeRunner>();

            debug.StartVisible = debugPanelVisible;
            debug.Build(hud.Canvas, bowling, runner, input, matchCtl);
            runner.Init(world, hud, input, bowling, bowler, camCtrl, matchCtl, fielders, bowlingPanel);
        }
    }
}
