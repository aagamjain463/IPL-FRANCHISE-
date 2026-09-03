using System;
using System.Collections;
using System.Collections.Generic;
using CricketGame.BattingPrototype.Audio;
using CricketGame.BattingPrototype.UI;
using CricketGame.BattingPrototype.World;
using CricketGame.Core.Batting;
using CricketGame.Core.Rules;
using CricketGame.Core.Rules.LimitedOvers;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Hud
{
    /// <summary>
    /// Phase 5 restyle: the Figma broadcast HUD - top-centre score bar with
    /// fused chase panel, right intent column, bottom delivery/timing chips,
    /// over-summary chips with partnership strip, corner moment cards and a
    /// themed result screen. Public API is unchanged from Phases 3-4 so the
    /// match controller and runner keep working untouched.
    /// </summary>
    public class BattingHud : MonoBehaviour
    {
        public Canvas Canvas { get; private set; }
        public RectTransform CanvasRect { get; private set; }

        private Input.MobileBattingInput input;

        // top bar
        private Text scoreText;
        private Text ballsText;
        private Text batterText;
        private Text chaseTitle;
        private Text chaseSub;
        private RectTransform topBarRect;

        // controls
        private Image joyBase;
        private Image joyKnob;
        private Image swipeIndicator;
        private RectTransform intentPanelRect;
        private readonly Image[] intentButtons = new Image[4];
        private readonly Text[] intentLabels = new Text[4];
        private ShotIntent currentIntent = ShotIntent.Normal;
        private string battingSideLabel = "YOU";
        private RectTransform battingControls;
        private bool battingControlsVisible = true;
        private bool joystickShown;

        // bottom chips
        private Text deliveryChipText;
        private Image deliveryChipBorder;
        private Text timingChipText;
        private Image timingChipBorder;
        private Text popupText;

        // moment cards (top corners) + over summary (bottom right)
        private RectTransform momentRect;
        private CanvasGroup momentGroup;
        private Text momentTitle;
        private Text momentDetail;
        private Text momentSub;
        private Color momentColor = UITheme.Amber;
        private readonly List<Text> overChips = new List<Text>();
        private RectTransform overCardRect;
        private Text overHeader;
        private Text partnershipText;
        private int partnershipRuns;
        private int partnershipBalls;

        // full-screen overlays
        private RectTransform overlayPanel;
        private CanvasGroup overlayGroup;
        private Text overlayTitle;
        private Text overlayDetail;
        private Text overlaySub;
        private RectTransform resultPanel;
        private Text resultTitle;
        private Text resultMargin;
        private Text resultInnings;
        private Text resultPotm;
        private Text resultPotmSub;
        private Text resultDetails;
        private Button playAgainButton;
        private Button continueButton;

        private Image timingFlash;

        private Coroutine popupRoutine;
        private Coroutine chipRoutine;
        private Coroutine momentRoutine;

        public event Action<ShotIntent> IntentChanged;
        public event Action PlayAgainPressed;
        public event Action ContinueToFranchise;

        // ------------------------------------------------------------------ build

        // Phase 5 (spec 3): notches/safe areas push the top bar and pause
        // button below the hardware inset on any aspect ratio.
        private float safeTop;

        public void Build(Input.MobileBattingInput inputSource)
        {
            input = inputSource;

            var sa = Screen.safeArea;
            safeTop = Screen.height > 1f
                ? Mathf.Clamp01((Screen.height - sa.y - sa.height) / Screen.height)
                : 0f;

            var canvasGo = new GameObject("HudCanvas", typeof(RectTransform));
            canvasGo.transform.SetParent(transform, false);
            Canvas = canvasGo.AddComponent<Canvas>();
            Canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            CanvasRect = (RectTransform)canvasGo.transform;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280, 720);
            scaler.matchWidthOrHeight = 0.5f;

            BuildTopBar();
            BuildPauseButton();
            BuildIntentButtons();
            BuildJoystickVisuals();
            BuildSwipeZone();
            BuildBottomChips();
            BuildPopup();
            BuildMomentCard();
            BuildOverCard();
            BuildTimingFlash();
            BuildOverlay();
            BuildResultScreen();

            SetBattingControlsVisible(true);
        }

        private RectTransform PanelAt(string name, Vector2 anchor, Vector2 from, Vector2 to,
                                      float radius = UITheme.RadiusCard)
        {
            var p = UiComponents.Panel(CanvasRect, name, Vector2.zero, radius);
            UiKit.Anchor(p, anchor, anchor, from, to);
            return p;
        }

        private void BuildTopBar()
        {
            var bar = UiComponents.Panel(CanvasRect, "TopBar", Vector2.zero, UITheme.RadiusCard);
            topBarRect = bar;
            UiKit.Anchor(bar, new Vector2(0.5f, 1f - safeTop), new Vector2(0.5f, 1f - safeTop),
                         new Vector2(-330f, -64f), new Vector2(330f, -12f));

            scoreText = UiComponents.Label(bar, "Score", "YOU  0/0", UITheme.FontScore,
                                           TextAnchor.MiddleLeft, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(scoreText.gameObject), new Vector2(0f, 0.42f), new Vector2(0.42f, 1f),
                         new Vector2(18f, 0f), new Vector2(0f, -2f));

            ballsText = UiComponents.Label(bar, "Balls", "(0 of 6 balls)", UITheme.FontSub,
                                           TextAnchor.MiddleLeft, UITheme.CyanSoft);
            UiKit.Anchor(UiKit.Rect(ballsText.gameObject), new Vector2(0.42f, 0.42f), new Vector2(0.72f, 1f),
                         new Vector2(0f, 0f), new Vector2(0f, -2f));

            batterText = UiKit.AddText(bar, "Batters", "", UITheme.FontSub,
                                       TextAnchor.MiddleLeft, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(batterText.gameObject), new Vector2(0f, 0f), new Vector2(0.72f, 0.42f),
                         new Vector2(18f, 2f), new Vector2(0f, 0f));

            // chase / target half (right)
            chaseTitle = UiComponents.Label(bar, "ChaseTitle", "SET A TARGET", UITheme.FontLabel,
                                            TextAnchor.MiddleRight, UITheme.Cyan);
            UiKit.Anchor(UiKit.Rect(chaseTitle.gameObject), new Vector2(0.72f, 0.42f), new Vector2(1f, 1f),
                         new Vector2(-16f, 0f), new Vector2(-16f, -2f));
            chaseSub = UiKit.AddText(bar, "ChaseSub", "", UITheme.FontSub,
                                     TextAnchor.MiddleRight, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(chaseSub.gameObject), new Vector2(0.72f, 0f), new Vector2(1f, 0.42f),
                         new Vector2(-16f, 2f), new Vector2(-16f, 0f));
        }

        private void BuildPauseButton()
        {
            var btn = UiComponents.ThemedButton(CanvasRect, "PauseBtn", "II", new Vector2(52f, 52f),
                                                ButtonStyle.Outline, 22);
            UiKit.Anchor(UiKit.Rect(btn.gameObject), new Vector2(1f, 1f - safeTop), new Vector2(1f, 1f - safeTop),
                         new Vector2(-70f, -64f), new Vector2(-18f, -12f));
            btn.onClick.AddListener(() =>
            {
                if (PausePressed != null) PausePressed();
            });
        }

        public event Action PausePressed;

        private void BuildIntentButtons()
        {
            var panel = UiKit.NewUi("IntentColumn", CanvasRect);
            intentPanelRect = UiKit.Rect(panel);
            UiKit.Anchor(intentPanelRect, new Vector2(1f, 0.5f), new Vector2(1f, 0.5f),
                         new Vector2(-118f, -150f), new Vector2(-16f, 150f));

            string[] labels = { "DEF", "NOR", "POW", "LOFT" };
            string[] subs = { "Defensive", "Normal", "Power", "Loft" };
            for (int i = 0; i < 4; i++)
            {
                float y0 = 300f - (i + 1) * 74f;
                intentButtons[i] = UiKit.AddImage(intentPanelRect, "Intent_" + labels[i], UITheme.DimFill);
                intentButtons[i].sprite = UITheme.RoundedSprite((int)UITheme.RadiusButton);
                intentButtons[i].raycastTarget = true;
                var r = UiKit.Rect(intentButtons[i].gameObject);
                UiKit.Anchor(r, new Vector2(0f, 0f), new Vector2(1f, 0f),
                             new Vector2(0f, y0 + 58f), new Vector2(0f, y0 + 72f));

                intentLabels[i] = UiComponents.Label(r, "Label", labels[i], 22,
                                                     TextAnchor.MiddleCenter, UITheme.TextWhite);
                UiKit.Anchor(UiKit.Rect(intentLabels[i].gameObject), Vector2.zero, Vector2.one,
                             Vector2.zero, new Vector2(0f, 8f));
                var sub = UiKit.AddText(r, "Sub", subs[i], 13, TextAnchor.MiddleCenter, UITheme.TextDim);
                UiKit.Anchor(UiKit.Rect(sub.gameObject), Vector2.zero, Vector2.one,
                             new Vector2(0f, -22f), Vector2.zero);

                int index = i;
                var button = intentButtons[i].gameObject.AddComponent<Button>();
                button.onClick.AddListener(() => SetIntent((ShotIntent)index));
            }
            RefreshIntent();
        }

        private void BuildJoystickVisuals()
        {
            battingControls = UiKit.NewUi("BattingControls", CanvasRect).transform as RectTransform;
            UiKit.Anchor(battingControls, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            joyBase = UiKit.AddImage(battingControls, "JoyBase", new Color(0f, 0.85f, 1f, 0.16f));
            joyBase.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(joyBase.gameObject), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                         new Vector2(-70f, -70f), new Vector2(70f, 70f));
            var ring = UiKit.AddImage(UiKit.Rect(joyBase.gameObject), "Ring", new Color(0f, 0.85f, 1f, 0.5f));
            ring.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(ring.gameObject), Vector2.zero, Vector2.one,
                         Vector2.zero, Vector2.zero);
            var hole = UiKit.AddImage(UiKit.Rect(ring.gameObject), "Hole", new Color(0f, 0.85f, 1f, 0.12f));
            hole.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(hole.gameObject), Vector2.zero, Vector2.one,
                         Vector2.one * 3f, -Vector2.one * 3f);

            joyKnob = UiKit.AddImage(battingControls, "JoyKnob", UITheme.Cyan);
            joyKnob.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(joyKnob.gameObject), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                         new Vector2(-34f, -34f), new Vector2(34f, 34f));
        }

        private void BuildSwipeZone()
        {
            swipeIndicator = UiKit.AddImage(CanvasRect, "SwipeLine", new Color(0f, 0.85f, 1f, 0.75f));
            swipeIndicator.sprite = UITheme.RoundedSprite(6);
            swipeIndicator.gameObject.SetActive(false);
        }

        private void BuildBottomChips()
        {
            deliveryChipBorder = UiKit.AddImage(CanvasRect, "DeliveryChip", UITheme.Border);
            deliveryChipBorder.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(deliveryChipBorder.gameObject), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                         new Vector2(-260f, 18f), new Vector2(-20f, 58f));
            var dBody = UiKit.AddImage(UiKit.Rect(deliveryChipBorder.gameObject), "Body", UITheme.Panel);
            dBody.sprite = UITheme.RoundedSprite(30);
            UiKit.Anchor(UiKit.Rect(dBody.gameObject), Vector2.zero, Vector2.one,
                         Vector2.one * 2f, -Vector2.one * 2f);
            deliveryChipText = UiComponents.Label(UiKit.Rect(dBody.gameObject), "Text", "WAITING",
                                                  UITheme.FontSub, TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(deliveryChipText.gameObject), Vector2.zero, Vector2.one,
                         new Vector2(10f, 0f), new Vector2(-10f, 0f));

            timingChipBorder = UiKit.AddImage(CanvasRect, "TimingChip", UITheme.Cyan);
            timingChipBorder.sprite = UITheme.RoundedSprite(32);
            UiKit.Anchor(UiKit.Rect(timingChipBorder.gameObject), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                         new Vector2(20f, 18f), new Vector2(260f, 58f));
            var tBody = UiKit.AddImage(UiKit.Rect(timingChipBorder.gameObject), "Body", UITheme.Panel);
            tBody.sprite = UITheme.RoundedSprite(30);
            UiKit.Anchor(UiKit.Rect(tBody.gameObject), Vector2.zero, Vector2.one,
                         Vector2.one * 2f, -Vector2.one * 2f);
            timingChipText = UiComponents.Label(UiKit.Rect(tBody.gameObject), "Text", "TIMING",
                                                UITheme.FontSub, TextAnchor.MiddleCenter, UITheme.Cyan);
            UiKit.Anchor(UiKit.Rect(timingChipText.gameObject), Vector2.zero, Vector2.one,
                         new Vector2(10f, 0f), new Vector2(-10f, 0f));
        }

        private void BuildPopup()
        {
            popupText = UiComponents.Label(CanvasRect, "Popup", "", 30,
                                           TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(popupText.gameObject), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                         new Vector2(0f, 120f), new Vector2(0f, 160f));
        }

        private void BuildMomentCard()
        {
            momentRect = PanelAt("MomentCard", new Vector2(0f, 1f),
                                 new Vector2(16f, -150f), new Vector2(470f, -20f));
            momentGroup = UiComponents.FadeGroup(momentRect.gameObject);
            momentGroup.alpha = 0f;

            var accent = UiKit.AddImage(momentRect, "Accent", UITheme.Amber);
            UiKit.Anchor(UiKit.Rect(accent.gameObject), new Vector2(0f, 0f), new Vector2(0f, 1f),
                         new Vector2(10f, 14f), new Vector2(15f, -14f));

            momentTitle = UiComponents.Label(momentRect, "Title", "", UITheme.FontCardTitle,
                                             TextAnchor.MiddleLeft, UITheme.Amber);
            UiKit.Anchor(UiKit.Rect(momentTitle.gameObject), new Vector2(0f, 0.55f), new Vector2(1f, 1f),
                         new Vector2(30f, 0f), new Vector2(-14f, -6f));
            momentDetail = UiKit.AddText(momentRect, "Detail", "", UITheme.FontSub,
                                         TextAnchor.MiddleLeft, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(momentDetail.gameObject), new Vector2(0f, 0.28f), new Vector2(1f, 0.58f),
                         new Vector2(30f, 0f), new Vector2(-14f, 0f));
            momentSub = UiKit.AddText(momentRect, "Sub", "", UITheme.FontSub,
                                      TextAnchor.MiddleLeft, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(momentSub.gameObject), new Vector2(0f, 0f), new Vector2(1f, 0.3f),
                         new Vector2(30f, 4f), new Vector2(-14f, 0f));
        }

        private void BuildOverCard()
        {
            overCardRect = PanelAt("OverCard", new Vector2(1f, 0f),
                                   new Vector2(-420f, 14f), new Vector2(-16f, 118f));
            overHeader = UiComponents.Label(overCardRect, "Header", "THIS OVER", UITheme.FontSub,
                                            TextAnchor.MiddleLeft, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(overHeader.gameObject), new Vector2(0f, 0.62f), new Vector2(0.55f, 1f),
                         new Vector2(16f, 0f), new Vector2(0f, -4f));
            partnershipText = UiComponents.Label(overCardRect, "Runs", "0 RUNS", UITheme.FontSub,
                                                 TextAnchor.MiddleRight, UITheme.Green);
            UiKit.Anchor(UiKit.Rect(partnershipText.gameObject), new Vector2(0.55f, 0.62f), new Vector2(1f, 1f),
                         new Vector2(0f, 0f), new Vector2(-16f, -4f));

            for (int i = 0; i < 6; i++)
            {
                var chip = UiComponents.Chip(overCardRect, "Chip" + i, 44f, "·", UITheme.Border);
                UiKit.Anchor(UiKit.Rect(chip.gameObject), new Vector2(0f, 0f), new Vector2(0f, 0f),
                             new Vector2(16f + i * 58f, 12f), new Vector2(60f + i * 58f, 56f));
                overChips.Add(chip);
            }
        }

        private void BuildTimingFlash()
        {
            timingFlash = UiKit.AddImage(CanvasRect, "TimingFlash", new Color(0, 0, 0, 0));
            UiKit.Anchor(UiKit.Rect(timingFlash.gameObject), Vector2.zero, Vector2.one,
                         Vector2.zero, Vector2.zero);
        }

        private void BuildOverlay()
        {
            var dim = UiKit.AddImage(CanvasRect, "OverlayDim", new Color(0.02f, 0.03f, 0.06f, 0.72f));
            overlayPanel = UiKit.Rect(dim.gameObject);
            UiKit.Anchor(overlayPanel, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            overlayGroup = UiComponents.FadeGroup(overlayPanel.gameObject);
            overlayGroup.alpha = 0f;
            overlayPanel.gameObject.SetActive(false);

            var card = UiComponents.Panel(overlayPanel, "Card", new Vector2(620f, 240f), UITheme.RadiusCard);
            overlayTitle = UiComponents.Label(UiKit.Rect(card.gameObject), "Title", "",
                                              UITheme.FontCardTitle + 6, TextAnchor.MiddleCenter, UITheme.Amber);
            UiKit.Anchor(UiKit.Rect(overlayTitle.gameObject), new Vector2(0f, 0.52f), new Vector2(1f, 1f),
                         new Vector2(20f, 0f), new Vector2(-20f, -8f));
            overlayDetail = UiComponents.Label(UiKit.Rect(card.gameObject), "Detail", "",
                                               UITheme.FontScore, TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(overlayDetail.gameObject), new Vector2(0f, 0.24f), new Vector2(1f, 0.56f),
                         new Vector2(20f, 0f), new Vector2(-20f, 0f));
            overlaySub = UiKit.AddText(UiKit.Rect(card.gameObject), "Sub", "", UITheme.FontSub,
                                       TextAnchor.MiddleCenter, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(overlaySub.gameObject), new Vector2(0f, 0f), new Vector2(1f, 0.28f),
                         new Vector2(20f, 6f), new Vector2(-20f, 0f));
        }

        private void BuildResultScreen()
        {
            resultPanel = PanelAt("ResultScreen", new Vector2(0.5f, 0.5f),
                                  new Vector2(-620f, -330f), new Vector2(620f, 330f), UITheme.RadiusCard);
            var rg = UiComponents.FadeGroup(resultPanel.gameObject);
            rg.alpha = 0f;
            resultPanel.gameObject.SetActive(false);

            resultTitle = UiComponents.Label(resultPanel, "Title", "", UITheme.FontResultTitle,
                                             TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(resultTitle.gameObject), new Vector2(0f, 0.78f), new Vector2(1f, 1f),
                         new Vector2(20f, 0f), new Vector2(-20f, -10f));
            resultMargin = UiComponents.Label(resultPanel, "Margin", "", UITheme.FontLabel,
                                              TextAnchor.MiddleCenter, UITheme.Amber);
            UiKit.Anchor(UiKit.Rect(resultMargin.gameObject), new Vector2(0f, 0.7f), new Vector2(1f, 0.8f),
                         new Vector2(20f, 0f), new Vector2(-20f, 0f));

            BuildResultColumn("ColInnings", 0.02f, 0.34f, "MATCH INNINGS", out resultInnings);
            BuildResultColumn("ColPotm", 0.35f, 0.67f, "PLAYER OF THE MATCH", out resultPotm);
            resultPotmSub = resultPotm; // second line lives inside the same text block
            BuildResultColumn("ColDetails", 0.68f, 0.99f, "MATCH DETAILS", out resultDetails);

            playAgainButton = UiComponents.ThemedButton(resultPanel, "PlayAgain", "PLAY AGAIN",
                                                        new Vector2(220f, 62f), ButtonStyle.Outline);
            UiKit.Anchor(UiKit.Rect(playAgainButton.gameObject), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                         new Vector2(-250f, 26f), new Vector2(-30f, 88f));
            playAgainButton.onClick.AddListener(() =>
            {
                if (PlayAgainPressed != null) PlayAgainPressed();
            });

            continueButton = UiComponents.ThemedButton(resultPanel, "Continue", "CONTINUE TO FRANCHISE",
                                                       new Vector2(330f, 62f), ButtonStyle.Filled);
            UiKit.Anchor(UiKit.Rect(continueButton.gameObject), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f),
                         new Vector2(30f, 26f), new Vector2(360f, 88f));
            continueButton.onClick.AddListener(() =>
            {
                if (ContinueToFranchise != null) ContinueToFranchise();
            });
        }

        private void BuildResultColumn(string name, float x0, float x1, string header, out Text body)
        {
            var col = UiComponents.Panel(resultPanel, name, Vector2.zero, UITheme.RadiusButton,
                                         new Color(1f, 1f, 1f, 0.05f), UITheme.Border);
            UiKit.Anchor(col, new Vector2(x0, 0.24f), new Vector2(x1, 0.68f),
                         new Vector2(6f, 0f), new Vector2(-6f, 0f));
            var h = UiComponents.Label(col, "Header", header, UITheme.FontSub,
                                       TextAnchor.MiddleLeft, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(h.gameObject), new Vector2(0f, 0.8f), new Vector2(1f, 1f),
                         new Vector2(14f, 0f), new Vector2(-10f, -6f));
            body = UiKit.AddText(col, "Body", "", UITheme.FontSub + 2,
                                 TextAnchor.UpperLeft, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(body.gameObject), new Vector2(0f, 0f), new Vector2(1f, 0.8f),
                         new Vector2(14f, 6f), new Vector2(-10f, 0f));
        }

        // ------------------------------------------------------------------ match data

        /// <summary>Phase 5: subscribe to the rules engine for over chips,
        /// partnership strip and result-screen stats. Single source of truth
        /// stays Core.Rules - the HUD only observes.</summary>
        private LimitedOversMatch matchRef;

        public void BindMatch(CricketGame.BattingPrototype.Match.MatchController matchCtl)
        {
            if (matchCtl == null || matchCtl.Match == null) return;
            matchRef = matchCtl.Match;
            matchRef.BallCompleted += args => OnBallCompleted(args.Record);
            matchRef.InningsStarted += args => { ClearOverChips(); UpdateBatterLine(); };
            // Phase 6: chips reset every over, not just every innings.
            matchRef.OverCompleted += args => ClearOverChips();
            matchRef.WicketFallen += args => UpdateBatterLine();
            UpdateBatterLine();
        }

        /// <summary>Phase 5 (spec 7/9): striker / non-striker / bowler names,
        /// straight from the rules engine's strike tracking.</summary>
        private void UpdateBatterLine()
        {
            if (batterText == null || matchRef == null) return;
            LimitedOversInnings inn = matchRef.CurrentInnings;
            if (inn == null) { batterText.text = ""; return; }
            int s = Mathf.Clamp(inn.Striker, 0, inn.Batters.Count - 1);
            int n = Mathf.Clamp(inn.NonStriker, 0, inn.Batters.Count - 1);
            string bowler = inn.CurrentBowler != null ? inn.CurrentBowler.Name : inn.BowlingSideName;
            batterText.text = inn.Batters[s].Name + "*  ·  " + inn.Batters[n].Name
                              + "   ·   b. " + bowler;
        }

        private void OnBallCompleted(BallRecord record)
        {
            var outcome = record.Outcome;
            string token;
            Color border;
            if (outcome.IsWicket) { token = "W"; border = UITheme.Danger; }
            else if (!outcome.CountsAsLegalBall) { token = "wd"; border = UITheme.Amber; }
            else if (outcome.TotalRuns >= 6) { token = "6"; border = UITheme.Amber; }
            else if (outcome.TotalRuns >= 4) { token = "4"; border = UITheme.Cyan; }
            else if (outcome.TotalRuns == 0) { token = "·"; border = UITheme.Border; }
            else { token = outcome.TotalRuns.ToString(); border = new Color(1f, 1f, 1f, 0.35f); }

            ShiftChips(token, border);

            if (outcome.IsWicket) { partnershipRuns = 0; partnershipBalls = 0; }
            else
            {
                partnershipRuns += outcome.TotalRuns;
                if (outcome.CountsAsLegalBall) partnershipBalls++;
            }
            if (partnershipText != null)
                partnershipText.text = partnershipRuns + " RUNS (" + partnershipBalls + "b)";
        }

        private readonly Queue<KeyValuePair<string, Color>> chipQueue =
            new Queue<KeyValuePair<string, Color>>();

        private void ShiftChips(string token, Color border)
        {
            chipQueue.Enqueue(new KeyValuePair<string, Color>(token, border));
            while (chipQueue.Count > overChips.Count) chipQueue.Dequeue();
            int i = 0;
            foreach (var kv in chipQueue)
            {
                overChips[i].text = kv.Key;
                overChips[i].color = kv.Key == "·" ? UITheme.TextDim : UITheme.TextWhite;
                overChips[i].gameObject.GetComponent<Image>().color = kv.Value;
                i++;
            }
        }

        private void ClearOverChips()
        {
            chipQueue.Clear();
            partnershipRuns = 0;
            partnershipBalls = 0;
            if (partnershipText != null) partnershipText.text = "0 RUNS (0b)";
            foreach (var chip in overChips)
            {
                chip.text = "·";
                chip.gameObject.GetComponent<Image>().color = UITheme.Border;
            }
        }

        private string lastScore = "";

        public void SetScoreboard(int runs, int wickets, int balls)
        {
            string s = battingSideLabel + "  " + runs + "/" + wickets;
            if (scoreText != null)
            {
                scoreText.text = s;
                // Phase 5 (spec 15): subtle score-update pop.
                if (s != lastScore && lastScore != "")
                    UITweenHost.Scale(UiKit.Rect(scoreText.gameObject), 1.18f, 1f, UITheme.TweenFast);
            }
            lastScore = s;
            if (ballsText != null)
                ballsText.text = "(" + balls + " of 6 balls)";
        }

        public void SetBattingSideLabel(string label)
        {
            battingSideLabel = string.IsNullOrEmpty(label) ? "SCORE" : label;
        }

        public void SetChaseInfo(int target, int required, int ballsRemaining,
                                 int wicketsRemaining, float runRate)
        {
            if (chaseTitle == null) return;
            if (target <= 0)
            {
                chaseTitle.text = "SET A TARGET";
                chaseTitle.color = UITheme.TextDim;
                chaseSub.text = ballsRemaining + " BALLS LEFT   ·   RR " + runRate.ToString("0.0");
            }
            else
            {
                chaseTitle.text = "NEED " + required;
                chaseTitle.color = UITheme.Cyan;
                chaseSub.text = "TARGET " + target + "  ·  " + ballsRemaining + " BALLS  ·  " +
                                wicketsRemaining + " WKTS  ·  RR " + runRate.ToString("0.0");
            }
            UpdateBatterLine();
        }

        // ------------------------------------------------------------------ feel feedback

        public void ShowPopup(string message, Color color, float duration = 1.1f)
        {
            if (popupRoutine != null) StopCoroutine(popupRoutine);
            popupRoutine = StartCoroutine(PopupRoutine(message, color, duration));
        }

        public void ShowTimingQuality(string label, TimingWindow window)
        {
            if (label == "MISSED") return;
            Color c;
            switch (window)
            {
                case TimingWindow.Perfect: c = UITheme.Green; break;
                case TimingWindow.Good: c = UITheme.CyanSoft; break;
                case TimingWindow.Early:
                case TimingWindow.Late: c = UITheme.Amber; break;
                default: c = UITheme.Danger; break;
            }
            if (timingChipText != null)
            {
                timingChipText.text = label + " TIMING";
                timingChipText.color = c;
                timingChipBorder.color = c;
            }
            ShowPopup(label, c, 0.55f);
        }

        public void ShowDeliveryToast(string message)
        {
            if (deliveryChipText == null) return;
            if (chipRoutine != null) StopCoroutine(chipRoutine);
            chipRoutine = StartCoroutine(ChipRoutine(message));
        }

        private IEnumerator ChipRoutine(string message)
        {
            deliveryChipText.text = message;
            float t = 0f;
            const float life = 2.2f;
            while (t < life)
            {
                t += Time.deltaTime;
                float a = Mathf.Clamp01(t / 0.12f) * (t > life - 0.4f ? Mathf.Clamp01((life - t) / 0.4f) : 1f);
                var c = deliveryChipText.color; c.a = a; deliveryChipText.color = c;
                var b = deliveryChipBorder.color; b.a = 0.14f + 0.6f * a; deliveryChipBorder.color = b;
                yield return null;
            }
        }

        public void ShowBoundaryBanner(string message, Color color)
        {
            ShowMoment(message, "", "", color);
        }

        public void ShowWicketBanner(string message)
        {
            ShowMoment(message, "", "", UITheme.Danger);
        }

        private void ShowMoment(string title, string detail, string sub, Color color)
        {
            if (momentRoutine != null) StopCoroutine(momentRoutine);
            momentTitle.text = title;
            momentDetail.text = detail;
            momentSub.text = sub;
            momentTitle.color = color;
            momentColor = color;
            momentRoutine = StartCoroutine(MomentRoutine(1.6f));
        }

        /// <summary>Phase 5 broadcast card with detail lines (boundary distance,
        /// dismissal text...).</summary>
        public void ShowMomentCard(string title, string detail, string sub, Color color, float life = 1.8f)
        {
            if (momentRoutine != null) StopCoroutine(momentRoutine);
            momentTitle.text = title;
            momentDetail.text = detail;
            momentSub.text = sub;
            momentTitle.color = color;
            momentColor = color;
            momentRoutine = StartCoroutine(MomentRoutine(life));
        }

        private IEnumerator MomentRoutine(float life)
        {
            momentRect.gameObject.GetComponent<Image>().color = momentColor; // border tint
            float t = 0f;
            while (t < life)
            {
                t += Time.deltaTime;
                float inA = Mathf.Clamp01(t / 0.14f);
                float outA = t > life - 0.4f ? Mathf.Clamp01((life - t) / 0.4f) : 1f;
                momentGroup.alpha = inA * outA;
                momentRect.localScale = Vector3.one * Mathf.Lerp(0.94f, 1f, Mathf.Clamp01(t / 0.18f));
                yield return null;
            }
            momentGroup.alpha = 0f;
        }

        public void FlashTiming(Color color)
        {
            StartCoroutine(FlashRoutine(color));
        }

        private IEnumerator FlashRoutine(Color color)
        {
            float t = 0f;
            const float life = 0.35f;
            while (t < life)
            {
                t += Time.deltaTime;
                var c = color;
                c.a = 0.16f * Mathf.Sin(Mathf.PI * Mathf.Clamp01(t / life));
                timingFlash.color = c;
                yield return null;
            }
            var done = color; done.a = 0f;
            timingFlash.color = done;
        }

        private IEnumerator PopupRoutine(string message, Color color, float duration)
        {
            popupText.text = message;
            popupText.color = color;
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                var c = popupText.color;
                c.a = t > duration - 0.3f ? Mathf.Clamp01((duration - t) / 0.3f) : 1f;
                popupText.color = c;
                yield return null;
            }
            popupText.text = "";
        }

        // ------------------------------------------------------------------ overlays

        public void ShowInningsComplete(int runs, int wickets, int balls, int target)
        {
            ShowOverlayCard("INNINGS COMPLETE", runs + "/" + wickets + "  from " + balls + " balls",
                            "TARGET  " + target, false);
        }

        public void ShowInningsBreak(int target)
        {
            ShowOverlayCard("THE CHASE", "AI need " + target + " to win",
                            "You bowl. Pick your deliveries wisely.", false);
        }

        /// <summary>Phase 6 §23: innings break with the first-innings summary
        /// (score, top scorer, best bowling) above the chase line.</summary>
        public void ShowInningsBreak(int target, string firstInningsSummary)
        {
            ShowOverlayCard("INNINGS BREAK", firstInningsSummary,
                            "AI need " + target + " to win. You bowl.", false);
        }

        public void HideOverlays()
        {
            overlayPanel.gameObject.SetActive(false);
            overlayGroup.alpha = 0f;
            resultPanel.gameObject.SetActive(false);
        }

        private void ShowOverlayCard(string title, string detail, string sub, bool showPlayAgain)
        {
            overlayTitle.text = title;
            overlayDetail.text = detail;
            overlaySub.text = sub;
            overlayPanel.gameObject.SetActive(true);
            overlayGroup.alpha = 0f;
            UITweenHost.Fade(overlayGroup, 1f, UITheme.TweenMed);
        }

        public void ShowMatchResult(MatchResult result, bool playerWon)
        {
            resultPanel.gameObject.SetActive(true);
            var rg = resultPanel.GetComponent<CanvasGroup>();
            rg.alpha = 0f;
            UITweenHost.Fade(rg, 1f, UITheme.TweenSlow);
            AudioManager.Play(GameSound.UiTransition);

            resultTitle.text = playerWon ? "YOU WIN!" : "AI WINS!";
            resultTitle.color = playerWon ? UITheme.Cyan : UITheme.Danger;
            resultMargin.text = result != null
                ? result.Describe("YOU", "AI").ToUpperInvariant()
                : "";

            if (resultInnings != null && result != null)
                resultInnings.text = "YOU   " + Line(result.FirstInnings) +
                                     "\nAI    " + Line(result.SecondInnings);
            if (resultPotm != null)
            {
                string potm = result != null && result.Scorecard != null
                              && !string.IsNullOrEmpty(result.Scorecard.PlayerOfMatch)
                    ? result.Scorecard.PlayerOfMatch
                    : (playerWon ? "YOU" : "AI");
                resultPotm.text = "PLAYER OF THE MATCH\n" + potm;
                resultPotm.color = UITheme.Amber;
            }
            if (resultDetails != null && matchRef != null)
            {
                var ms = matchRef.Settings;
                string format = ms.Mode == MatchMode.SuperOver ? "SUPER OVER"
                    : ms.Mode == MatchMode.TwentyOver ? "T20 MATCH" : "QUICK MATCH";
                resultDetails.text = "Format   " + format
                    + "\nOvers   " + ms.OversPerInnings + " per innings"
                    + "\nWickets   " + ms.WicketsPerInnings + " max";
            }
            else if (resultDetails != null)
            {
                resultDetails.text = "Format   SUPER OVER\nBalls   6 per innings\nWickets   2 max";
            }
        }

        private static string Line(InningsSummary s)
        {
            return s == null ? "-" : s.Runs + "/" + s.Wickets + " (" + s.LegalBalls + "b)";
        }

        // ------------------------------------------------------------------ controls

        public void SetIntent(ShotIntent intent)
        {
            currentIntent = intent;
            RefreshIntent();
            if (IntentChanged != null) IntentChanged(intent);
        }

        private void RefreshIntent()
        {
            for (int i = 0; i < 4; i++)
            {
                bool active = (int)currentIntent == i;
                intentButtons[i].color = active ? UITheme.Cyan : UITheme.DimFill;
                intentLabels[i].color = active ? UITheme.BgDark : UITheme.TextWhite;
            }
        }

        public void SetBattingControlsVisible(bool visible)
        {
            battingControlsVisible = visible;
            SetJoystickVisible(joystickShown);
            if (intentPanelRect != null) intentPanelRect.gameObject.SetActive(visible);
        }

        private void SetJoystickVisible(bool visible)
        {
            joystickShown = visible;
            bool show = visible && battingControlsVisible;
            joyBase.gameObject.SetActive(show);
            joyKnob.gameObject.SetActive(show);
        }

        public Rect IntentButtonsScreenRect()
        {
            Vector3[] corners = new Vector3[4];
            intentPanelRect.GetWorldCorners(corners);
            float scale = Canvas.scaleFactor;
            return new Rect(corners[0].x * scale, corners[0].y * scale,
                            (corners[2].x - corners[0].x) * scale,
                            (corners[2].y - corners[0].y) * scale);
        }

        private void LateUpdate()
        {
            if (input == null) return;

            if (input.JoystickActive)
            {
                SetJoystickVisible(true);
                Vector2 local;
                if (RectTransformUtility.ScreenPointToLocalPointInRectangle(
                        CanvasRect, input.JoystickAnchorScreen, null, out local))
                {
                    joyBase.rectTransform.anchoredPosition = local;
                    joyKnob.rectTransform.anchoredPosition =
                        local + ScreenToCanvas(input.JoystickVector * Screen.height * 0.11f);
                }
            }
            else if (joystickShown && battingControlsVisible)
            {
                // rest at the home position, bottom-left thumb zone
                joyBase.rectTransform.anchoredPosition = new Vector2(-Screen.width * 0.32f, -Screen.height * 0.28f);
                joyKnob.rectTransform.anchoredPosition = joyBase.rectTransform.anchoredPosition;
            }

            if (input.SwipeActive)
            {
                Vector2 delta = input.SwipeCurrentScreen - input.SwipeAnchorScreen;
                if (delta.magnitude > 12f)
                {
                    swipeIndicator.gameObject.SetActive(true);
                    Vector2 local;
                    RectTransformUtility.ScreenPointToLocalPointInRectangle(
                        CanvasRect, input.SwipeAnchorScreen, null, out local);
                    swipeIndicator.rectTransform.anchoredPosition = local;
                    float len = Mathf.Clamp(delta.magnitude * CanvasRect.rect.width / Screen.width, 30f, 260f);
                    swipeIndicator.rectTransform.sizeDelta = new Vector2(10, len);
                    float angle = Mathf.Atan2(delta.y, delta.x) * Mathf.Rad2Deg - 90f;
                    swipeIndicator.rectTransform.localRotation = Quaternion.Euler(0, 0, angle);
                }
                else swipeIndicator.gameObject.SetActive(false);
            }
            else swipeIndicator.gameObject.SetActive(false);
        }

        private Vector2 ScreenToCanvas(Vector2 screenDelta)
        {
            float sf = Canvas.scaleFactor;
            return sf > 0.0001f ? screenDelta / sf : screenDelta;
        }
    }
}
