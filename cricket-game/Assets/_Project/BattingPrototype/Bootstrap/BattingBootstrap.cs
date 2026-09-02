using CricketGame.BattingPrototype.Bowler;
using CricketGame.BattingPrototype.Camera;
using CricketGame.BattingPrototype.Game;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.Input;
using CricketGame.BattingPrototype.World;
using UnityEngine;

namespace CricketGame.BattingPrototype.Bootstrap
{
    /// <summary>
    /// The only object placed in the scene by hand. On Awake it builds the
    /// entire prototype: world, rigs, camera, HUD, input and the runner.
    /// This keeps the scene file trivial and everything reproducible in code.
    /// </summary>
    public class BattingBootstrap : MonoBehaviour
    {
        [Tooltip("Show the tuning/debug panel on start.")]
        [SerializeField] private bool debugPanelVisible = true;

        private void Awake()
        {
            // Mobile-first runtime settings.
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            QualitySettings.vSyncCount = 0;

            var root = new GameObject("BattingPrototype");
            root.transform.SetParent(transform, false);

            // World (field, rigs, ball, lights, camera).
            BattingWorld world = BattingWorldBuilder.Build(root.transform);

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

            // Test bowler.
            var bowlerGo = new GameObject("TestBowler");
            bowlerGo.transform.SetParent(root.transform, false);
            var bowler = bowlerGo.AddComponent<TestBowler>();

            // HUD.
            var hudGo = new GameObject("HudRoot");
            hudGo.transform.SetParent(root.transform, false);
            var hud = hudGo.AddComponent<BattingHud>();
            hud.Build(input);
            input.IntentButtonsRectScreen = hud.IntentButtonsScreenRect();

            // Debug panel.
            var debugGo = new GameObject("DebugUI");
            debugGo.transform.SetParent(root.transform, false);
            var debug = debugGo.AddComponent<BattingDebugUI>();

            // Runner (owns the game loop).
            var runnerGo = new GameObject("Runner");
            runnerGo.transform.SetParent(root.transform, false);
            var runner = runnerGo.AddComponent<BattingPrototypeRunner>();

            debug.StartVisible = debugPanelVisible;
            debug.Build(hud.Canvas, bowler, runner);
            runner.Init(world, hud, input, bowler, camCtrl);
        }
    }
}
