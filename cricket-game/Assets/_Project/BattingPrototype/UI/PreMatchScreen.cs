using System;
using System.Collections.Generic;
using CricketGame.Core.Rules.LimitedOvers;
using CricketGame.BattingPrototype.Audio;
using CricketGame.BattingPrototype.World;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.UI
{
    /// <summary>
    /// Phase 5 pre-match presentation (Figma "pre-match cinematic"): dusk
    /// stadium sweep, team crests, toss line and a gold START MATCH. Holds
    /// timeScale at 0 so the match cannot begin before the presentation.
    /// </summary>
    public sealed class PreMatchScreen : MonoBehaviour
    {
        /// <summary>Phase 6: fires with the selected match format.</summary>
        public event Action<MatchSettings> Started;

        private RectTransform root;
        private CanvasGroup group;

        // Phase 6 format selection (spec section 2).
        private readonly List<Button> modeButtons = new List<Button>();
        private readonly List<Image> modeButtonBodies = new List<Image>();
        private Text modeChipText;
        private int selectedMode;   // 0 = SUPER OVER, 1 = QUICK 5, 2 = T20

        private MatchSettings SelectedSettings
        {
            get
            {
                switch (selectedMode)
                {
                    case 1: return new MatchSettings(5, 10, MatchMode.QuickMatch);
                    case 2: return MatchSettings.TwentyOver();
                    default: return MatchSettings.SuperOver();
                }
            }
        }

        public void Build(Canvas canvas)
        {
            var go = UiKit.NewUi("PreMatch", canvas.transform);
            root = UiKit.Rect(go);
            UiKit.Anchor(root, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            group = UiComponents.FadeGroup(go);

            // top strip
            var left = UiComponents.Label(root, "Comp", "SUPER OVER CHAMPIONSHIP",
                                          UITheme.FontSub, TextAnchor.MiddleLeft, UITheme.Amber);
            UiKit.Anchor(UiKit.Rect(left.gameObject), new Vector2(0, 1), new Vector2(0, 1),
                         new Vector2(24f, -44f), new Vector2(420f, -16f));
            var right = UiComponents.Label(root, "Live", "LIVE BROADCAST", UITheme.FontSub,
                                           TextAnchor.MiddleRight, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(right.gameObject), new Vector2(1, 1), new Vector2(1, 1),
                         new Vector2(-320f, -44f), new Vector2(-24f, -16f));

            // crests
            BuildCrest("YOU", new Color(0.1f, 0.45f, 0.9f), "BAT FIRST", -0.24f);
            BuildCrest("AI", UITheme.Amber, "BOWL FIRST", 0.24f);

            // centre ring (toss coin)
            var ring = UiKit.AddImage(root, "TossRing", UITheme.Gold);
            ring.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(ring.gameObject), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.55f),
                         new Vector2(-46f, -46f), new Vector2(46f, 46f));
            var ringHole = UiKit.AddImage(UiKit.Rect(ring.gameObject), "Hole", UITheme.BgDark);
            ringHole.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(ringHole.gameObject), Vector2.zero, Vector2.one,
                         Vector2.one * 5f, -Vector2.one * 5f);

            // match chip + venue
            var chip = UiComponents.Panel(root, "MatchChip", new Vector2(360f, 44f), UITheme.RadiusButton);
            UiKit.Anchor(chip, new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                         new Vector2(-180f, -120f), new Vector2(180f, -76f));
            modeChipText = UiComponents.Label(chip, "Text", "SUPER OVER  ·  HARBOUR ARENA",
                                              UITheme.FontSub, TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(modeChipText.gameObject), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            var venue = UiKit.AddText(root, "Venue", "Original fictional venue - floodlit evening match",
                                      UITheme.FontSub, TextAnchor.MiddleCenter, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(venue.gameObject), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                         new Vector2(-300f, -168f), new Vector2(300f, -140f));

            // toss pill
            var pill = UiComponents.Panel(root, "TossPill", new Vector2(430f, 44f), UITheme.RadiusChip,
                                          new Color(0f, 0.85f, 1f, 0.12f), UITheme.Cyan);
            UiKit.Anchor(pill, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                         new Vector2(-215f, 24f), new Vector2(215f, 68f));
            var toss = UiComponents.Label(pill, "Text", "YOU WON THE TOSS AND ELECTED TO BAT",
                                          UITheme.FontSub, TextAnchor.MiddleCenter, UITheme.Cyan);
            UiKit.Anchor(UiKit.Rect(toss.gameObject), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            // Phase 6: format selector (spec section 2)
            string[] modeLabels = { "SUPER OVER", "QUICK 5", "T20 · 20 OVER" };
            for (int i = 0; i < modeLabels.Length; i++)
            {
                var b = UiComponents.ThemedButton(root, "Mode_" + i, modeLabels[i],
                                                  new Vector2(172f, 44f), ButtonStyle.Outline, UITheme.FontSub);
                UiKit.Anchor(UiKit.Rect(b.gameObject), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                             new Vector2(-270f + i * 184f, 78f), new Vector2(-98f + i * 184f, 122f));
                int mode = i;
                b.onClick.AddListener(() => SelectMode(mode));
                modeButtons.Add(b);
                var body = b.transform.Find("Body");
                modeButtonBodies.Add(body != null ? body.GetComponent<Image>() : null);
            }
            selectedMode = 0;
            UpdateModeSelection();

            // start button
            var start = UiComponents.ThemedButton(root, "StartMatch", "START MATCH",
                                                  new Vector2(240f, 64f), ButtonStyle.Filled, 26);
            var startOuter = start.GetComponent<Image>();
            startOuter.color = UITheme.Gold;
            var startBody = start.transform.Find("Body");
            if (startBody != null) startBody.GetComponent<Image>().color = UITheme.Gold;
            var startLabel = start.transform.Find("Label");
            if (startLabel != null) startLabel.GetComponent<UnityEngine.UI.Text>().color = UITheme.BgDark;
            UiKit.Anchor(UiKit.Rect(start.gameObject), new Vector2(0, 0), new Vector2(0, 0),
                         new Vector2(24f, 24f), new Vector2(264f, 88f));
            var tap = UiKit.AddText(root, "Tap", "TAP TO BEGIN PLAY", UITheme.FontSub,
                                    TextAnchor.MiddleLeft, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(tap.gameObject), new Vector2(0, 0), new Vector2(0, 0),
                         new Vector2(28f, 4f), new Vector2(260f, 24f));
            start.onClick.AddListener(StartMatch);
        }

        private void BuildCrest(string code, Color color, string sub, float xNorm)
        {
            var disc = UiKit.AddImage(root, "Crest_" + code, color);
            disc.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(disc.gameObject), new Vector2(0.5f + xNorm, 0.58f),
                         new Vector2(0.5f + xNorm, 0.58f), new Vector2(-64f, -64f), new Vector2(64f, 64f));
            var codeText = UiComponents.Label(UiKit.Rect(disc.gameObject), "Code", code, 40,
                                              TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(codeText.gameObject), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            string teamTitle = code == "YOU" ? "PLAYER XI" : "AI SQUAD";
            var name = UiComponents.Label(root, "Name_" + code, teamTitle, UITheme.FontCardTitle - 4,
                                          TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(name.gameObject), new Vector2(0.5f + xNorm, 0.42f),
                         new Vector2(0.5f + xNorm, 0.42f), new Vector2(-150f, -40f), new Vector2(150f, 0f));
            var subText = UiComponents.Label(root, "Sub_" + code, sub, UITheme.FontSub,
                                             TextAnchor.MiddleCenter, color);
            UiKit.Anchor(UiKit.Rect(subText.gameObject), new Vector2(0.5f + xNorm, 0.42f),
                         new Vector2(0.5f + xNorm, 0.42f), new Vector2(-150f, -70f), new Vector2(150f, -44f));
        }

        public void Show()
        {
            root.gameObject.SetActive(true);
            group.alpha = 1f;
            Time.timeScale = 0f;
            AudioManager.Play(GameSound.UiTransition);
        }

        private void SelectMode(int mode)
        {
            selectedMode = mode;
            AudioManager.Play(GameSound.UiClick);
            UpdateModeSelection();
        }

        private void UpdateModeSelection()
        {
            for (int i = 0; i < modeButtons.Count; i++)
            {
                bool on = i == selectedMode;
                if (modeButtonBodies[i] != null)
                    modeButtonBodies[i].color = on ? UITheme.Cyan : new Color(0f, 0.85f, 1f, 0.08f);
                var label = modeButtons[i].transform.Find("Label");
                if (label != null)
                    label.GetComponent<Text>().color = on ? UITheme.BgDark : UITheme.TextWhite;
            }
            if (modeChipText != null)
            {
                string format = selectedMode == 1 ? "QUICK 5 OVERS"
                              : selectedMode == 2 ? "T20 · 20 OVERS" : "SUPER OVER";
                modeChipText.text = format + "  ·  HARBOUR ARENA";
            }
        }

        private void StartMatch()
        {
            AudioManager.Play(GameSound.MatchIntro);
            AudioManager.Play(GameSound.UiClick);
            Time.timeScale = 1f;
            UITweenHost.Fade(group, 0f, UITheme.TweenSlow);
            root.gameObject.SetActive(false);
            if (Started != null) Started(SelectedSettings);
        }
    }
}
