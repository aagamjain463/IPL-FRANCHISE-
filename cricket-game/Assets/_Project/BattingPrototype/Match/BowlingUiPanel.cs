using CricketGame.BattingPrototype.UI;
using CricketGame.BattingPrototype.World;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Match
{
    /// <summary>
    /// Phase 5 restyle of the player's bowling controls, Figma broadcast
    /// layout: themed delivery column on the left, line/length pad, bottom
    /// RELEASE TIMING bar with sweet spot, and a live SPELL ANALYSIS panel on
    /// the right fed by the rules engine (single source of truth).
    /// Behaviour API is unchanged from Phase 4.
    /// </summary>
    public sealed class BowlingUiPanel : MonoBehaviour
    {
        private RectTransform root;
        private Text lineLabel;
        private Text lengthLabel;

        private static readonly DeliveryType[] TypeOrder =
        {
            DeliveryType.FastStraight, DeliveryType.FastInswinger,
            DeliveryType.FastOutswinger, DeliveryType.Yorker,
            DeliveryType.FullBall, DeliveryType.GoodLength,
            DeliveryType.ShortBall, DeliveryType.Bouncer,
            DeliveryType.OffCutter, DeliveryType.LegCutter,
            DeliveryType.SlowerBall,
        };
        private static readonly string[] TypeNames =
        {
            "PACE", "INSWING", "OUTSWING", "YORKER",
            "FULL", "GOOD", "SHORT", "BOUNCER",
            "OFF-CUT", "LEG-CUT", "SLOWER",
        };

        private readonly Image[] typeButtons = new Image[TypeOrder.Length];
        private int selectedType;

        // Release-timing bar.
        private RectTransform releaseRoot;
        private RectTransform releaseMarker;
        private bool releaseActive;
        private float releaseClock;
        private const float ReleaseWindow = 0.9f;
        public bool ReleaseCaptured { get; private set; }
        public float ReleaseOffset { get; private set; }

        public DeliveryType SelectedType { get { return TypeOrder[selectedType]; } }
        public float Line { get; private set; }
        public float Length { get; private set; }

        // spell analysis
        private Text spellDots;
        private Text spellBounds;
        private Text spellSpeed;
        private int dots;
        private int boundaries;
        private float speedSum;
        private int speedCount;

        public void Build(Canvas canvas)
        {
            Line = 0f;
            Length = 0.5f;
            selectedType = 5; // good length

            var go = UiKit.NewUi("BowlingPanel", canvas.transform);
            root = UiKit.Rect(go);
            UiKit.Anchor(root, new Vector2(0, 0), new Vector2(1, 1), Vector2.zero, Vector2.zero);

            BuildTypeColumn();
            BuildPad();
            BuildReleaseBar();
            BuildSpellAnalysis();

            Refresh();
            SetVisible(false);
        }

        /// <summary>Phase 5: observe the rules engine for the spell panel.</summary>
        public void BindMatch(MatchController matchCtl)
        {
            if (matchCtl == null || matchCtl.Match == null) return;
            matchCtl.Match.BallCompleted += args =>
            {
                if (args.Record == null || args.Record.InningsIndex != 1) return;
                var o = args.Record.Outcome;
                if (!o.CountsAsLegalBall) return;
                if (o.TotalRuns == 0 && !o.IsWicket) dots++;
                if (o.TotalRuns >= 4) boundaries++;
                if (HudStats.LastDeliverySpeedKph > 1f)
                {
                    speedSum += HudStats.LastDeliverySpeedKph;
                    speedCount++;
                }
                RefreshSpell();
            };
            matchCtl.Match.InningsStarted += args =>
            {
                dots = 0; boundaries = 0; speedSum = 0f; speedCount = 0;
                RefreshSpell();
            };
        }

        private void RefreshSpell()
        {
            if (spellDots != null) spellDots.text = dots.ToString();
            if (spellBounds != null) spellBounds.text = boundaries.ToString();
            if (spellSpeed != null)
                spellSpeed.text = speedCount > 0 ? Mathf.RoundToInt(speedSum / speedCount) + " KPH" : "-";
        }

        private void BuildTypeColumn()
        {
            for (int i = 0; i < TypeOrder.Length; i++)
            {
                float yTop = 330f - i * 52f;
                typeButtons[i] = UiKit.AddImage(root, "TypeBtn_" + TypeNames[i], UITheme.DimFill);
                typeButtons[i].sprite = UITheme.RoundedSprite((int)UITheme.RadiusButton);
                typeButtons[i].raycastTarget = true;
                RectTransform r = UiKit.Rect(typeButtons[i].gameObject);
                UiKit.Anchor(r, new Vector2(0, 0.5f), new Vector2(0, 0.5f),
                             new Vector2(16f, yTop - 46f), new Vector2(128f, yTop));
                Text label = UiComponents.Label(r, "Label", TypeNames[i], 17,
                                                TextAnchor.MiddleCenter, UITheme.TextWhite);
                UiKit.Anchor(UiKit.Rect(label.gameObject), Vector2.zero, Vector2.one,
                             Vector2.zero, Vector2.zero);

                int index = i;
                var button = typeButtons[i].gameObject.AddComponent<Button>();
                button.onClick.AddListener(() => SelectType(index));
            }
        }

        private void BuildPad()
        {
            BuildPadButton("LEFT", "◀", new Vector2(150f, 66f), () => NudgeLine(-1));
            BuildPadButton("RIGHT", "▶", new Vector2(306f, 66f), () => NudgeLine(1));
            BuildPadButton("UP", "▲", new Vector2(228f, 140f), () => NudgeLength(-1));
            BuildPadButton("DOWN", "▼", new Vector2(228f, -8f), () => NudgeLength(1));

            lineLabel = UiComponents.Label(root, "LineReadout", LineText(), UITheme.FontSub,
                                           TextAnchor.MiddleLeft, UITheme.CyanSoft);
            UiKit.Anchor(UiKit.Rect(lineLabel.gameObject), new Vector2(0, 0), new Vector2(0, 0),
                         new Vector2(150f, 232f), new Vector2(390f, 262f));
            lengthLabel = UiComponents.Label(root, "LengthReadout", LengthText(), UITheme.FontSub,
                                             TextAnchor.MiddleLeft, UITheme.CyanSoft);
            UiKit.Anchor(UiKit.Rect(lengthLabel.gameObject), new Vector2(0, 0), new Vector2(0, 0),
                         new Vector2(150f, 200f), new Vector2(390f, 230f));
        }

        private void BuildReleaseBar()
        {
            var label = UiComponents.Label(root, "ReleaseLabel", "RELEASE TIMING", UITheme.FontSub,
                                           TextAnchor.MiddleCenter, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(label.gameObject), new Vector2(0.5f, 0), new Vector2(0.5f, 0),
                         new Vector2(-130f, 96f), new Vector2(130f, 122f));

            var bg = UiKit.AddImage(root, "ReleaseBar", UITheme.Panel);
            bg.sprite = UITheme.RoundedSprite(8);
            releaseRoot = UiKit.Rect(bg.gameObject);
            UiKit.Anchor(releaseRoot, new Vector2(0.5f, 0), new Vector2(0.5f, 0),
                         new Vector2(-180f, 58f), new Vector2(180f, 92f));

            Image sweet = UiKit.AddImage(releaseRoot, "SweetSpot", new Color(0.13f, 0.77f, 0.37f, 0.45f));
            sweet.sprite = UITheme.RoundedSprite(6);
            UiKit.Anchor(UiKit.Rect(sweet.gameObject), new Vector2(0.5f, 0), new Vector2(0.5f, 1),
                         new Vector2(-24f, 3f), new Vector2(24f, -3f));

            releaseMarker = UiKit.Rect(UiKit.AddImage(releaseRoot, "ReleaseMarker",
                                                      UITheme.Amber).gameObject);
            UiKit.Anchor(releaseMarker, new Vector2(0, 0), new Vector2(0, 1),
                         new Vector2(-3f, 2f), new Vector2(3f, -2f));

            var releaseBtn = UiComponents.ThemedButton(root, "ReleaseBtn", "RELEASE",
                                                       new Vector2(200f, 56f), ButtonStyle.Filled, 24);
            UiKit.Anchor(UiKit.Rect(releaseBtn.gameObject), new Vector2(0.5f, 0), new Vector2(0.5f, 0),
                         new Vector2(-100f, 128f), new Vector2(100f, 184f));
            releaseBtn.onClick.AddListener(CaptureRelease);

            releaseRoot.gameObject.SetActive(false);
        }

        private void BuildSpellAnalysis()
        {
            var card = UiComponents.Panel(root, "SpellCard", Vector2.zero, UITheme.RadiusCard);
            UiKit.Anchor(card, new Vector2(1, 0.5f), new Vector2(1, 0.5f),
                         new Vector2(-266f, -120f), new Vector2(-16f, 120f));

            var header = UiComponents.Label(card, "Header", "SPELL ANALYSIS", UITheme.FontLabel,
                                            TextAnchor.MiddleLeft, UITheme.Amber);
            UiKit.Anchor(UiKit.Rect(header.gameObject), new Vector2(0, 0.8f), new Vector2(1, 1),
                         new Vector2(16f, 0f), new Vector2(-12f, -6f));

            SpellRow(card, "Dot Balls", out spellDots, 0.55f);
            SpellRow(card, "Boundaries", out spellBounds, 0.30f);
            SpellRow(card, "Avg Speed", out spellSpeed, 0.05f);
        }

        private void SpellRow(RectTransform parent, string label, out Text value, float y0)
        {
            var l = UiKit.AddText(parent, "L_" + label, label, UITheme.FontSub,
                                  TextAnchor.MiddleLeft, UITheme.TextDim);
            UiKit.Anchor(UiKit.Rect(l.gameObject), new Vector2(0, y0), new Vector2(0.6f, y0 + 0.25f),
                         new Vector2(16f, 0f), new Vector2(0f, 0f));
            value = UiComponents.Label(parent, "V_" + label, "0", UITheme.FontSub,
                                       TextAnchor.MiddleRight, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(value.gameObject), new Vector2(0.6f, y0), new Vector2(1, y0 + 0.25f),
                         new Vector2(0f, 0f), new Vector2(-16f, 0f));
        }

        public void BeginRelease()
        {
            if (releaseRoot != null) releaseRoot.gameObject.SetActive(true);
            releaseActive = true;
            releaseClock = 0f;
            ReleaseCaptured = false;
            ReleaseOffset = ReleaseControl.MaxError * 1.4f;
        }

        public void CancelRelease()
        {
            releaseActive = false;
            ReleaseCaptured = false;
            if (releaseRoot != null) releaseRoot.gameObject.SetActive(false);
        }

        private void CaptureRelease()
        {
            if (!releaseActive || ReleaseCaptured) return;
            ReleaseCaptured = true;
            releaseActive = false;
            float phase = Mathf.Clamp01(releaseClock / ReleaseWindow) * 2f - 1f;
            ReleaseOffset = phase * ReleaseControl.MaxError;
        }

        private void Update()
        {
            if (!releaseActive || releaseMarker == null) return;
            releaseClock += Time.deltaTime;
            if (releaseClock >= ReleaseWindow)
            {
                ReleaseCaptured = true;
                releaseActive = false;
                ReleaseOffset = ReleaseControl.MaxError * 1.1f;
                return;
            }
            float phase = Mathf.Clamp01(releaseClock / ReleaseWindow) * 2f - 1f;
            releaseMarker.anchorMin = new Vector2(0.5f + phase * 0.48f, 0f);
            releaseMarker.anchorMax = new Vector2(0.5f + phase * 0.48f, 1f);
        }

        private void BuildPadButton(string name, string glyph, Vector2 bottomLeft,
                                    UnityEngine.Events.UnityAction action)
        {
            Image img = UiKit.AddImage(root, "Pad_" + name, UITheme.DimFill);
            img.sprite = UITheme.RoundedSprite((int)UITheme.RadiusButton);
            img.raycastTarget = true;
            RectTransform r = UiKit.Rect(img.gameObject);
            UiKit.Anchor(r, new Vector2(0, 0), new Vector2(0, 0),
                         bottomLeft, bottomLeft + new Vector2(70f, 62f));
            Text label = UiKit.AddText(r, "Glyph", glyph, 28, TextAnchor.MiddleCenter, UITheme.TextWhite);
            UiKit.Anchor(UiKit.Rect(label.gameObject), Vector2.zero, Vector2.one,
                         Vector2.zero, Vector2.zero);
            var button = img.gameObject.AddComponent<Button>();
            button.onClick.AddListener(action);
        }

        private void SelectType(int index)
        {
            selectedType = index;
            Refresh();
        }

        private void NudgeLine(int dir)
        {
            Line = Mathf.Clamp(Line + dir * 0.15f, -0.9f, 0.9f);
            if (lineLabel != null) lineLabel.text = LineText();
        }

        private void NudgeLength(int dir)
        {
            Length = Mathf.Clamp01(Length + dir * 0.12f);
            if (lengthLabel != null) lengthLabel.text = LengthText();
        }

        private string LineText()
        {
            return Line < -0.35f ? "LINE: LEG" : Line > 0.35f ? "LINE: OFF" : "LINE: STUMPS";
        }

        private string LengthText()
        {
            return Length < 0.15f ? "LENGTH: YORKER" : Length < 0.35f ? "LENGTH: FULL"
                 : Length < 0.70f ? "LENGTH: GOOD" : Length < 0.88f ? "LENGTH: SHORT"
                 : "LENGTH: BOUNCER";
        }

        private void Refresh()
        {
            for (int i = 0; i < typeButtons.Length; i++)
            {
                if (typeButtons[i] == null) continue;
                typeButtons[i].color = i == selectedType ? UITheme.Cyan : UITheme.DimFill;
            }
        }

        public void SetVisible(bool visible)
        {
            if (root != null) root.gameObject.SetActive(visible);
            if (!visible) CancelRelease();
        }
    }
}
