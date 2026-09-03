using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.World;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Match
{
    /// <summary>
    /// The player's bowling controls. Phase 3 base (line/length pad + type
    /// buttons) expanded for Phase 4 (spec sections 5-7):
    ///   * 11 delivery types in a 3x4 grid (all types from the spec list)
    ///   * LEFT/RIGHT line, UP/DOWN length
    ///   * a release-timing bar: tap RELEASE near the centre for the intended
    ///     ball; early/late releases drift the length, bad ones can spray wide
    /// Easy to learn, difficult to master; large thumb-friendly targets.
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
            "FAST", "INSWING", "OUTSWING", "YORKER",
            "FULL", "GOOD", "SHORT", "BOUNCER",
            "OFF-CUT", "LEG-CUT", "SLOWER",
        };

        private Image[] typeButtons = new Image[TypeOrder.Length];
        private int selectedType;

        // Release-timing bar.
        private RectTransform releaseRoot;
        private RectTransform releaseMarker;
        private Image releaseBarBg;
        private bool releaseActive;
        private float releaseClock;
        private const float ReleaseWindow = 0.9f;   // seconds for one sweep
        public bool ReleaseCaptured { get; private set; }
        public float ReleaseOffset { get; private set; }

        public DeliveryType SelectedType { get { return TypeOrder[selectedType]; } }
        public float Line { get; private set; }
        public float Length { get; private set; }

        private static readonly Color Dim = new Color(1f, 1f, 1f, 0.14f);
        private static readonly Color Active = new Color(0.3f, 0.85f, 1f, 0.5f);

        public void Build(Canvas canvas)
        {
            Line = 0f;
            Length = 0.5f;
            selectedType = 5; // good length

            var go = UiKit.NewUi("BowlingPanel", canvas.transform);
            root = UiKit.Rect(go);
            UiKit.Anchor(root, new Vector2(0, 0), new Vector2(1, 1), Vector2.zero, Vector2.zero);

            BuildTypeGrid();
            BuildReleaseBar();

            // ---- line / length pad, bottom left
            BuildPadButton("LEFT", "\u25C0", new Vector2(26f, 130f), () => NudgeLine(-1));
            BuildPadButton("RIGHT", "\u25B6", new Vector2(186f, 130f), () => NudgeLine(1));
            BuildPadButton("UP", "\u25B2", new Vector2(106f, 205f), () => NudgeLength(-1));
            BuildPadButton("DOWN", "\u25BC", new Vector2(106f, 55f), () => NudgeLength(1));

            // ---- readouts above the pad
            lineLabel = UiKit.AddText(root, "LineReadout", LineText(), 24,
                TextAnchor.MiddleLeft, new Color(0.85f, 0.95f, 1f));
            UiKit.Anchor(UiKit.Rect(lineLabel.gameObject), new Vector2(0, 0), new Vector2(0, 0),
                new Vector2(26f, 268f), new Vector2(320f, 302f));
            lengthLabel = UiKit.AddText(root, "LengthReadout", LengthText(), 24,
                TextAnchor.MiddleLeft, new Color(0.85f, 0.95f, 1f));
            UiKit.Anchor(UiKit.Rect(lengthLabel.gameObject), new Vector2(0, 0), new Vector2(0, 0),
                new Vector2(26f, 236f), new Vector2(320f, 268f));

            Refresh();
            SetVisible(false);
        }

        private void BuildTypeGrid()
        {
            // 3 rows x 4 columns, bottom right, thumb-sized.
            for (int i = 0; i < TypeOrder.Length; i++)
            {
                int col = i % 4, row = i / 4;
                float x = -270f + col * 132f;
                float y = 20f + (2 - row) * 62f;

                typeButtons[i] = UiKit.AddImage(root, "TypeBtn_" + TypeNames[i], Dim);
                RectTransform r = UiKit.Rect(typeButtons[i].gameObject);
                typeButtons[i].raycastTarget = true;
                UiKit.Anchor(r, new Vector2(1, 0), new Vector2(1, 0),
                    new Vector2(x, y), new Vector2(x + 124f, y + 56f));
                Text label = UiKit.AddText(r, "Label", TypeNames[i], 22,
                    TextAnchor.MiddleCenter, Color.white);
                UiKit.Anchor(UiKit.Rect(label.gameObject), Vector2.zero, Vector2.one,
                    Vector2.zero, Vector2.zero);

                int index = i;
                var button = typeButtons[i].gameObject.AddComponent<Button>();
                button.onClick.AddListener(() => SelectType(index));
            }
        }

        private void BuildReleaseBar()
        {
            releaseBarBg = UiKit.AddImage(root, "ReleaseBar", new Color(0f, 0f, 0f, 0.45f));
            releaseRoot = UiKit.Rect(releaseBarBg.gameObject);
            UiKit.Anchor(releaseRoot, new Vector2(0.5f, 0), new Vector2(0.5f, 0),
                new Vector2(-260f, 210f), new Vector2(260f, 252f));

            // centre sweet spot
            Image sweet = UiKit.AddImage(releaseRoot, "SweetSpot",
                new Color(0.4f, 1f, 0.5f, 0.35f));
            UiKit.Anchor(UiKit.Rect(sweet.gameObject), new Vector2(0.5f, 0), new Vector2(0.5f, 1),
                new Vector2(-26f, 0f), new Vector2(26f, 0f));

            releaseMarker = UiKit.Rect(UiKit.AddImage(releaseRoot, "ReleaseMarker",
                new Color(1f, 0.9f, 0.3f, 0.95f)).gameObject);
            UiKit.Anchor(releaseMarker, new Vector2(0, 0), new Vector2(0, 1),
                new Vector2(-4f, 0f), new Vector2(4f, 0f));

            Image releaseBtn = UiKit.AddImage(root, "ReleaseBtn", new Color(1f, 0.5f, 0.2f, 0.5f));
            RectTransform rb = UiKit.Rect(releaseBtn.gameObject);
            releaseBtn.raycastTarget = true;
            UiKit.Anchor(rb, new Vector2(0.5f, 0), new Vector2(0.5f, 0),
                new Vector2(-110f, 118f), new Vector2(110f, 196f));
            Text bl = UiKit.AddText(rb, "Label", "RELEASE", 30,
                TextAnchor.MiddleCenter, Color.white);
            UiKit.Anchor(UiKit.Rect(bl.gameObject), Vector2.zero, Vector2.one,
                Vector2.zero, Vector2.zero);
            var button = releaseBtn.gameObject.AddComponent<Button>();
            button.onClick.AddListener(CaptureRelease);

            releaseRoot.gameObject.SetActive(false);
        }

        /// <summary>Runner: start the release window once the run-up ends.</summary>
        public void BeginRelease()
        {
            if (releaseRoot != null) releaseRoot.gameObject.SetActive(true);
            releaseActive = true;
            releaseClock = 0f;
            ReleaseCaptured = false;
            ReleaseOffset = ReleaseControl.MaxError * 1.4f; // worst if never tapped
        }

        /// <summary>Runner: cancel the window (redeliver / state change).</summary>
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
            // Marker sweeps -1 -> +1 over the window; centre = perfect.
            float phase = Mathf.Clamp01(releaseClock / ReleaseWindow) * 2f - 1f;
            ReleaseOffset = phase * ReleaseControl.MaxError;
        }

        private void Update()
        {
            if (!releaseActive || releaseMarker == null) return;
            releaseClock += Time.deltaTime;
            if (releaseClock >= ReleaseWindow)
            {
                // Auto-release at the end of the sweep (always late).
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
            Image img = UiKit.AddImage(root, "Pad_" + name, Dim);
            RectTransform r = UiKit.Rect(img.gameObject);
            img.raycastTarget = true;
            UiKit.Anchor(r, new Vector2(0, 0), new Vector2(0, 0),
                bottomLeft, bottomLeft + new Vector2(72f, 66f));
            Text label = UiKit.AddText(r, "Glyph", glyph, 34,
                TextAnchor.MiddleCenter, Color.white);
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
                typeButtons[i].color = i == selectedType ? Active : Dim;
            }
        }

        public void SetVisible(bool visible)
        {
            if (root != null) root.gameObject.SetActive(visible);
            if (!visible) CancelRelease();
        }
    }
}
