using System;
using CricketGame.BattingPrototype.Audio;
using CricketGame.BattingPrototype.World;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.UI
{
    /// <summary>
    /// Phase 5 pause menu (Figma): PAUSED card with RESUME / CONTROLS /
    /// SETTINGS / QUIT plus a live settings panel (graphics preset, haptics,
    /// audio). Pause freezes scaled time; the menu animates on unscaled time.
    /// </summary>
    public sealed class PauseMenuScreen : MonoBehaviour
    {
        public event Action QuitPressed;
        public event Action DebugToggled;

        private RectTransform root;
        private CanvasGroup group;
        private RectTransform settingsPanel;
        private RectTransform controlsPanel;
        private Text qualityLabel;
        private Text hapticsLabel;
        private Text audioLabel;
        private Text debugLabel;
        private bool debugOn;
        private bool open;

        public bool IsOpen { get { return open; } }

        public void Build(Canvas canvas)
        {
            var go = UiKit.NewUi("PauseMenu", canvas.transform);
            root = UiKit.Rect(go);
            UiKit.Anchor(root, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            group = UiComponents.FadeGroup(go);
            group.alpha = 0f;

            var dim = UiKit.AddImage(root, "Dim", new Color(0.02f, 0.03f, 0.06f, 0.66f));
            UiKit.Anchor(UiKit.Rect(dim.gameObject), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            var card = UiComponents.Panel(root, "Card", new Vector2(430f, 470f), UITheme.RadiusCard);
            var title = UiComponents.Label(card, "Title", "PAUSED", UITheme.FontCardTitle + 8,
                                           TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(title.gameObject), new Vector2(0, 0.84f), new Vector2(1, 1),
                         Vector2.zero, Vector2.zero);

            BuildRow(card, "Resume", "RESUME MATCH", ButtonStyle.Filled, 0.62f, () => Close());
            BuildRow(card, "Controls", "CONTROLS GUIDE", ButtonStyle.Outline, 0.47f, ToggleControls);
            BuildRow(card, "Settings", "SETTINGS", ButtonStyle.Outline, 0.32f, ToggleSettings);
            BuildRow(card, "Quit", "QUIT MATCH", ButtonStyle.Danger, 0.17f, () =>
            {
                AudioManager.Play(GameSound.UiClick);
                Close();
                if (QuitPressed != null) QuitPressed();
            });

            BuildSettings(card);
            BuildControls(card);

            root.gameObject.SetActive(false);
        }

        private void BuildRow(RectTransform parent, string name, string label, ButtonStyle style,
                              float yNorm, UnityEngine.Events.UnityAction onClick)
        {
            var btn = UiComponents.ThemedButton(parent, name, label, new Vector2(330f, 56f), style);
            UiKit.Anchor(UiKit.Rect(btn.gameObject), new Vector2(0.5f, yNorm), new Vector2(0.5f, yNorm),
                         new Vector2(-165f, -28f), new Vector2(165f, 28f));
            btn.onClick.AddListener(() => { AudioManager.Play(GameSound.UiClick); onClick(); });
        }

        private void BuildSettings(RectTransform card)
        {
            settingsPanel = UiComponents.Panel(card, "Settings", new Vector2(360f, 230f),
                                               UITheme.RadiusButton, UITheme.PanelSolid, UITheme.Border);
            UiKit.Anchor(settingsPanel, new Vector2(1f, 0.5f), new Vector2(1f, 0.5f),
                         new Vector2(20f, -115f), new Vector2(380f, 115f));

            var header = UiComponents.Label(settingsPanel, "H", "SETTINGS", UITheme.FontSub,
                                            TextAnchor.MiddleLeft, UITheme.Cyan);
            UiKit.Anchor(UiKit.Rect(header.gameObject), new Vector2(0, 0.82f), new Vector2(1, 1),
                         new Vector2(14f, 0f), new Vector2(-10f, -4f));

            var q = UiComponents.ThemedButton(settingsPanel, "Quality", "GRAPHICS: MEDIUM",
                                              new Vector2(320f, 36f), ButtonStyle.Ghost, 15);
            qualityLabel = q.transform.Find("Label").GetComponent<Text>();
            UiKit.Anchor(UiKit.Rect(q.gameObject), new Vector2(0.5f, 0.64f), new Vector2(0.5f, 0.64f),
                         new Vector2(-160f, -18f), new Vector2(160f, 18f));
            q.onClick.AddListener(CycleQuality);

            var h = UiComponents.ThemedButton(settingsPanel, "Haptics", "HAPTICS: ON",
                                              new Vector2(320f, 36f), ButtonStyle.Ghost, 15);
            hapticsLabel = h.transform.Find("Label").GetComponent<Text>();
            UiKit.Anchor(UiKit.Rect(h.gameObject), new Vector2(0.5f, 0.44f), new Vector2(0.5f, 0.44f),
                         new Vector2(-160f, -18f), new Vector2(160f, 18f));
            h.onClick.AddListener(() =>
            {
                HudStats.HapticsEnabled = !HudStats.HapticsEnabled;
                Game.Haptics.Enabled = HudStats.HapticsEnabled;
                hapticsLabel.text = "HAPTICS: " + (HudStats.HapticsEnabled ? "ON" : "OFF");
            });

            var a = UiComponents.ThemedButton(settingsPanel, "Audio", "AUDIO: ON",
                                              new Vector2(320f, 36f), ButtonStyle.Ghost, 15);
            audioLabel = a.transform.Find("Label").GetComponent<Text>();
            UiKit.Anchor(UiKit.Rect(a.gameObject), new Vector2(0.5f, 0.24f), new Vector2(0.5f, 0.24f),
                         new Vector2(-160f, -18f), new Vector2(160f, 18f));
            a.onClick.AddListener(() =>
            {
                HudStats.AudioEnabled = !HudStats.AudioEnabled;
                audioLabel.text = "AUDIO: " + (HudStats.AudioEnabled ? "ON" : "OFF");
            });

            var d = UiComponents.ThemedButton(settingsPanel, "DebugToggle", "TUNING OVERLAY: OFF",
                                              new Vector2(320f, 36f), ButtonStyle.Ghost, 15);
            debugLabel = d.transform.Find("Label").GetComponent<Text>();
            UiKit.Anchor(UiKit.Rect(d.gameObject), new Vector2(0.5f, 0.04f), new Vector2(0.5f, 0.04f),
                         new Vector2(-160f, -18f), new Vector2(160f, 18f));
            d.onClick.AddListener(() =>
            {
                debugOn = !debugOn;
                debugLabel.text = "TUNING OVERLAY: " + (debugOn ? "ON" : "OFF");
                if (DebugToggled != null) DebugToggled();
            });
            settingsPanel.gameObject.SetActive(false);
        }

        private void BuildControls(RectTransform card)
        {
            controlsPanel = UiComponents.Panel(card, "Controls", new Vector2(360f, 230f),
                                               UITheme.RadiusButton, UITheme.PanelSolid, UITheme.Border);
            UiKit.Anchor(controlsPanel, new Vector2(1f, 0.5f), new Vector2(1f, 0.5f),
                         new Vector2(20f, -115f), new Vector2(380f, 115f));
            var body = UiKit.AddText(controlsPanel, "Body",
                "LEFT  -  joystick moves your footwork\n" +
                "RIGHT  -  swipe aims the shot direction\n" +
                "INTENT  -  DEF / NOR / POW / LOFT buttons\n" +
                "TIMING  -  tap as the ball arrives; PERFECT\n" +
                "            pays on attacks, never on blocks\n" +
                "BOWLING  -  pick type, line and length, then\n" +
                "            tap RELEASE on the green zone",
                UITheme.FontSub, TextAnchor.UpperLeft, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(body.gameObject), Vector2.zero, Vector2.one,
                         new Vector2(16f, 10f), new Vector2(-16f, -10f));
            controlsPanel.gameObject.SetActive(false);
        }

        private void CycleQuality()
        {
            HudStats.Quality = HudStats.Quality == QualityPreset.High
                ? QualityPreset.Low
                : HudStats.Quality + 1;
            World.StadiumAtmosphere.ApplyQuality(HudStats.Quality);
            qualityLabel.text = "GRAPHICS: " + HudStats.Quality.ToString().ToUpperInvariant();
        }

        public void Open()
        {
            if (open) return;
            open = true;
            Time.timeScale = 0f;
            root.gameObject.SetActive(true);
            group.alpha = 0f;
            UITweenHost.Fade(group, 1f, UITheme.TweenMed);
            AudioManager.Play(GameSound.UiTransition);
        }

        public void Close()
        {
            if (!open) return;
            open = false;
            Time.timeScale = 1f;
            UITweenHost.Fade(group, 0f, UITheme.TweenFast);
            root.gameObject.SetActive(false);
        }

        private void ToggleSettings()
        {
            settingsPanel.gameObject.SetActive(!settingsPanel.gameObject.activeSelf);
            controlsPanel.gameObject.SetActive(false);
        }

        private void ToggleControls()
        {
            controlsPanel.gameObject.SetActive(!controlsPanel.gameObject.activeSelf);
            settingsPanel.gameObject.SetActive(false);
        }
    }
}
