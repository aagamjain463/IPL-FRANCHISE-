using System.Collections;
using CricketGame.BattingPrototype.Bowler;
using CricketGame.BattingPrototype.Bowling;
using CricketGame.BattingPrototype.Cameras;
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

        private IEnumerator FadeLoading(UnityEngine.CanvasGroup group, GameObject go)
        {
            // Real-time waits: the pre-match screen holds scaled time at zero.
            yield return new UnityEngine.WaitForSecondsRealtime(0.5f);
            UI.UITweenHost.Fade(group, 0f, 0.4f);
            yield return new UnityEngine.WaitForSecondsRealtime(0.55f);
            UnityEngine.Object.Destroy(go);
        }

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
            var atmo = World.StadiumAtmosphere.Attach(world.Root, world.Camera);
            World.ArtApplier.Apply(world.Root);   // original generated textures
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

            // HUD and Input System EventSystem.
            if (UnityEngine.EventSystems.EventSystem.current == null)
            {
                var esGo = new GameObject("EventSystem");
                esGo.transform.SetParent(root.transform, false);
                esGo.AddComponent<UnityEngine.EventSystems.EventSystem>();
                esGo.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
            }

            var hudGo = new GameObject("HudRoot");
            hudGo.transform.SetParent(root.transform, false);
            var hud = hudGo.AddComponent<BattingHud>();
            hud.Build(input);
            input.IntentButtonsRectScreen = hud.IntentButtonsScreenRect();

            // Phase 5 (spec 2 architecture): premium boot loading screen that
            // fades away once everything is built.
            var loadGo = UiKit.NewUi("LoadingScreen", hud.Canvas.transform);
            var loadRect = UiKit.Rect(loadGo);
            UiKit.Anchor(loadRect, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var loadBg = UiKit.AddImage(loadRect, "Bg", UI.UITheme.BgDark);
            UiKit.Anchor(UiKit.Rect(loadBg.gameObject), Vector2.zero, Vector2.one,
                            Vector2.zero, Vector2.zero);
            var loadTitle = UI.UiComponents.Label(loadRect, "Title", "SUPER OVER CRICKET",
                UI.UITheme.FontCardTitle + 8, TextAnchor.MiddleCenter, UI.UITheme.Cyan);
            UiKit.Anchor(UiKit.Rect(loadTitle.gameObject),
                            new Vector2(0.5f, 0.55f), new Vector2(0.5f, 0.55f),
                            new Vector2(-320f, -44f), new Vector2(320f, 44f));
            var loadSub = UiKit.AddText(loadRect, "Sub", "HARBOUR ARENA  ·  LOADING",
                UI.UITheme.FontSub, TextAnchor.MiddleCenter, UI.UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(loadSub.gameObject),
                            new Vector2(0.5f, 0.44f), new Vector2(0.5f, 0.44f),
                            new Vector2(-320f, -20f), new Vector2(320f, 20f));
            hud.StartCoroutine(FadeLoading(UI.UiComponents.FadeGroup(loadGo), loadGo));

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
            // Phase 6: the pre-match screen picks the format, then the match
            // controller rebuilds the rules engine for it.
            preMatch.Started += settings =>
            {
                matchCtl.Configure(settings);
                camCtrl.ShowSetup();
            };
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

            // Phase 5: presentation layers OBSERVE the existing systems -
            // kits/scoreboard/VFX, zero gameplay code changes.
            var presentation = World.PlayerPresentation.Attach(root.transform, world);
            presentation.SetSides(true);
            matchCtl.FlowChanged += state =>
                presentation.SetSides(state != Match.MatchFlowState.Innings2);

            var board = World.StadiumScoreboard.Attach(world.Root);
            board.BindMatch(matchCtl.Match, true);

            // Phase 6: whenever the rules engine is rebuilt (mode switch or
            // PLAY AGAIN), all engine observers re-bind to the new instance.
            matchCtl.EngineReplaced += () =>
            {
                hud.BindMatch(matchCtl);
                bowlingPanel.BindMatch(matchCtl);
                board.BindMatch(matchCtl.Match, true);
            };

            var vfxGo = new GameObject("Vfx");
            vfxGo.transform.SetParent(root.transform, false);
            var vfx = vfxGo.AddComponent<Game.Vfx>();
            vfx.Bind(runner.Events, world);

            var cuesGo = new GameObject("PresentationCues");
            cuesGo.transform.SetParent(root.transform, false);
            var cues = cuesGo.AddComponent<Game.PresentationCues>();
            cues.Bind(runner.Events);

            presentation.Bind(runner.Events);   // bowler celebration
            atmo.Bind(runner.Events);           // crowd reaction surge
        }
    }
}
