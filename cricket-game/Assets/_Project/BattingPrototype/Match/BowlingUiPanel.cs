using CricketGame.Core.Batting;
using CricketGame.BattingPrototype.Hud;
using CricketGame.BattingPrototype.World;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Match
{
    /// <summary>
    /// The player's bowling controls (spec section 17), shown only during the
    /// AI chase innings. Deliberately simple:
    ///   LEFT / RIGHT  - move the line  (leg stump <- -> off stump)
    ///   UP / DOWN     - move the length (full <-> short)
    ///   FAST / SWING / YORKER / SHORT - pick the delivery type
    /// The chosen type + line + length feed the Phase 2 BowlingController.
    /// </summary>
    public sealed class BowlingUiPanel : MonoBehaviour
    {
        private RectTransform root;
        private Text lineLabel;
        private Text lengthLabel;
        private Image[] typeButtons = new Image[4];
        private Text[] typeLabels = new Text[4];
        private int selectedType;

        public DeliveryType SelectedType
        {
            get
            {
                switch (selectedType)
                {
                    case 0: return DeliveryType.FastStraight;
                    case 1: return DeliveryType.FastInswinger;
                    case 2: return DeliveryType.Yorker;
                    default: return DeliveryType.ShortBall;
                }
            }
        }

        public float Line { get; private set; }
        public float Length { get; private set; }

        private static readonly string[] TypeNames = { "FAST", "SWING", "YORKER", "SHORT" };
        private static readonly Color Dim = new Color(1f, 1f, 1f, 0.14f);
        private static readonly Color Active = new Color(0.3f, 0.85f, 1f, 0.5f);

        public void Build(Canvas canvas)
        {
            Line = 0f;
            Length = 0.5f;
            selectedType = 0;

            var go = UiKit.NewUi("BowlingPanel", canvas.transform);
            root = UiKit.Rect(go);
            UiKit.Anchor(root, new Vector2(0, 0), new Vector2(1, 1), Vector2.zero, Vector2.zero);

            // ---- delivery type buttons, bottom right (thumb reach)
            for (int i = 0; i < 4; i++)
            {
                float x = -80f - 150f * (3 - i);
                typeButtons[i] = UiKit.AddImage(root, "TypeBtn_" + TypeNames[i], Dim);
                RectTransform r = UiKit.Rect(typeButtons[i].gameObject);
                typeButtons[i].raycastTarget = true;
                UiKit.Anchor(r, new Vector2(1, 0), new Vector2(1, 0),
                    new Vector2(x - 68f, 26f), new Vector2(x + 68f, 92f));
                typeLabels[i] = UiKit.AddText(r, "Label", TypeNames[i], 30,
                    TextAnchor.MiddleCenter, Color.white);
                UiKit.Anchor(UiKit.Rect(typeLabels[i].gameObject), Vector2.zero, Vector2.one,
                    Vector2.zero, Vector2.zero);

                int index = i;
                var button = typeButtons[i].gameObject.AddComponent<Button>();
                button.onClick.AddListener(() => SelectType(index));
            }

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
            Refresh();
        }

        private void NudgeLength(int dir)
        {
            // UP = fuller (smaller length value), DOWN = shorter.
            Length = Mathf.Clamp(Length - dir * 0.12f, 0.04f, 0.95f);
            Refresh();
        }

        private string LineText()
        {
            if (Line < -0.25f) return "LINE: LEG STUMP";
            if (Line > 0.25f) return "LINE: OFF STUMP";
            return "LINE: STUMPS";
        }

        private string LengthText()
        {
            if (Length < 0.22f) return "LENGTH: FULL";
            if (Length > 0.7f) return "LENGTH: SHORT";
            return "LENGTH: GOOD";
        }

        private void Refresh()
        {
            if (lineLabel != null) lineLabel.text = LineText();
            if (lengthLabel != null) lengthLabel.text = LengthText();
            for (int i = 0; i < 4; i++)
                if (typeButtons[i] != null)
                    typeButtons[i].color = i == selectedType ? Active : Dim;
        }

        public void SetVisible(bool visible)
        {
            if (root != null) root.gameObject.SetActive(visible);
        }
    }
}
