using System.Text;
using CricketGame.Core.Batting;
using CricketGame.BattingPrototype.Bowler;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Hud
{
    /// <summary>
    /// Development/tuning panel (spec section 13): live delivery, batsman,
    /// swipe, intent, timing, contact and shot readouts plus sliders for
    /// pace/line/length/swing and length presets. Built in code; can be
    /// hidden later with one flag.
    /// </summary>
    public class BattingDebugUI : MonoBehaviour
    {
        public bool StartVisible = true;

        private Text readout;
        private GameObject panel;
        private TestBowler bowler;
        private BattingPrototypeRunner runner;
        private Input.MobileBattingInput input;
        private float refreshTimer;
        private readonly StringBuilder sb = new StringBuilder(512);

        public void Build(Canvas canvas, TestBowler bowlerRef, BattingPrototypeRunner runnerRef,
                          Input.MobileBattingInput inputRef)
        {
            bowler = bowlerRef;
            runner = runnerRef;
            input = inputRef;

            var bgGo = World.UiKit.NewUi("DebugPanel", canvas.transform);
            var bg = bgGo.AddComponent<Image>();
            bg.sprite = World.UiKit.WhiteSprite;
            bg.color = new Color(0.03f, 0.05f, 0.1f, 0.78f);
            var rect = World.UiKit.Rect(bgGo);
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(0f, 1f);
            rect.offsetMin = new Vector2(10, 96);
            rect.offsetMax = new Vector2(470, -110);
            panel = bgGo;

            readout = World.UiKit.AddText(rect, "Readout", "", 20, TextAnchor.UpperLeft,
                new Color(0.75f, 0.95f, 0.8f));
            var rt = readout.rectTransform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(12, 214);
            rt.offsetMax = new Vector2(-12, -12);

            BuildSlider(rect, "Speed", 80f, 150f, () => bowler.Config.SpeedKph,
                        v => bowler.Config.SpeedKph = v, 112);
            BuildSlider(rect, "Line", -1f, 1f, () => bowler.Config.Line,
                        v => bowler.Config.Line = v, 78);
            BuildSlider(rect, "Length", 0f, 1f, () => bowler.Config.Length,
                        v => bowler.Config.Length = v, 44);
            BuildSlider(rect, "Swing", -1f, 1f, () => bowler.Config.Swing,
                        v => bowler.Config.Swing = v, 10);

            BuildButton(rect, "FULL", () => ApplyPreset("full"), -322, 142, 80, 26);
            BuildButton(rect, "GOOD", () => ApplyPreset("good"), -234, 142, 80, 26);
            BuildButton(rect, "SHORT", () => ApplyPreset("short"), -146, 142, 88, 26);
            BuildButton(rect, "RESET POS", () => runner.ResetBatsmanPosition(), -322, 176, 264, 26);

            SetVisible(StartVisible);
        }

        private void ApplyPreset(string p)
        {
            bowler.ApplyPreset(p);
            SyncSliders();
        }

        private void BuildSlider(RectTransform parent, string label, float min, float max,
                                 System.Func<float> get, System.Action<float> set, float yFromBottom)
        {
            // Row is anchored to the panel's right edge; label left of the slider.
            var lbl = World.UiKit.AddText(parent, "Lbl_" + label, label, 16, TextAnchor.MiddleRight, Color.white);
            var lr = lbl.rectTransform;
            lr.anchorMin = new Vector2(1f, 0f);
            lr.anchorMax = new Vector2(1f, 0f);
            lr.pivot = new Vector2(1f, 0.5f);
            lr.anchoredPosition = new Vector2(-352, yFromBottom + 13);
            lr.sizeDelta = new Vector2(90, 26);

            var go = World.UiKit.NewUi("Slider_" + label, parent);
            var r = World.UiKit.Rect(go);
            r.anchorMin = new Vector2(1f, 0f);
            r.anchorMax = new Vector2(1f, 0f);
            r.pivot = new Vector2(0f, 0.5f);
            r.anchoredPosition = new Vector2(-344, yFromBottom + 13);
            r.sizeDelta = new Vector2(330, 26);

            var bgImg = go.AddComponent<Image>();
            bgImg.sprite = World.UiKit.WhiteSprite;
            bgImg.color = new Color(1, 1, 1, 0.25f);

            var slider = go.AddComponent<Slider>();
            slider.minValue = min;
            slider.maxValue = max;
            slider.value = get();

            var fillArea = World.UiKit.NewUi("FillArea", r);
            var far = World.UiKit.Rect(fillArea);
            far.anchorMin = Vector2.zero; far.anchorMax = Vector2.one;
            far.offsetMin = new Vector2(0, 8); far.offsetMax = new Vector2(0, -8);
            var fill = World.UiKit.NewUi("Fill", far);
            var fr = World.UiKit.Rect(fill);
            fr.anchorMin = Vector2.zero; fr.anchorMax = Vector2.one;
            fr.offsetMin = Vector2.zero; fr.offsetMax = Vector2.zero;
            var fillImg = fill.AddComponent<Image>();
            fillImg.sprite = World.UiKit.WhiteSprite;
            fillImg.color = new Color(0.4f, 0.8f, 1f, 0.9f);
            slider.fillRect = fr;
            slider.targetGraphic = bgImg;

            slider.onValueChanged.AddListener(v => set(v));
        }

        private void BuildButton(RectTransform parent, string label, System.Action onClick,
                                 float xFromRight, float yFromBottom, float width, float height)
        {
            var go = World.UiKit.NewUi("Btn_" + label, parent);
            var r = World.UiKit.Rect(go);
            r.anchorMin = new Vector2(1f, 0f);
            r.anchorMax = new Vector2(1f, 0f);
            r.pivot = new Vector2(0f, 0f);
            r.anchoredPosition = new Vector2(xFromRight, yFromBottom);
            r.sizeDelta = new Vector2(width, height);

            var img = go.AddComponent<Image>();
            img.sprite = World.UiKit.WhiteSprite;
            img.color = new Color(0.25f, 0.3f, 0.5f, 0.9f);
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.onClick.AddListener(() => onClick());

            var t = World.UiKit.AddText(r, "Label", label, 18, TextAnchor.MiddleCenter, Color.white);
            t.rectTransform.anchorMin = Vector2.zero;
            t.rectTransform.anchorMax = Vector2.one;
            t.rectTransform.offsetMin = Vector2.zero;
            t.rectTransform.offsetMax = Vector2.zero;
        }

        public void Toggle()
        {
            SetVisible(!panel.activeSelf);
        }

        public void SetVisible(bool visible)
        {
            panel.SetActive(visible);
        }

        /// <summary>Keeps slider positions in sync after a preset is applied.</summary>
        public void SyncSliders()
        {
            var sliders = panel.GetComponentsInChildren<Slider>(true);
            if (sliders.Length >= 4)
            {
                sliders[0].SetValueWithoutNotify(bowler.Config.SpeedKph);
                sliders[1].SetValueWithoutNotify(bowler.Config.Line);
                sliders[2].SetValueWithoutNotify(bowler.Config.Length);
                sliders[3].SetValueWithoutNotify(bowler.Config.Swing);
            }
        }

        private void LateUpdate()
        {
            if (!panel.activeSelf) return;
            refreshTimer += Time.deltaTime;
            if (refreshTimer < 0.08f) return; // ~12 Hz, cheap
            refreshTimer = 0f;

            sb.Length = 0;
            DeliveryData? d = runner.LastDelivery;
            if (d.HasValue)
            {
                var dv = d.Value;
                sb.Append("BALL   ").Append(dv.SpeedKph.ToString("0")).Append(" kph   line ")
                  .Append(dv.Line.ToString("+0.00;-0.00")).Append(" (")
                  .Append(dv.Line < -0.25f ? "leg" : dv.Line > 0.25f ? "off" : "mid").Append(")   len ")
                  .Append(dv.Length.ToString("0.00")).Append(" (")
                  .Append(dv.Length < 0.35f ? "full" : dv.Length < 0.72f ? "good" : "short")
                  .Append(")   swing ").Append(dv.Swing.ToString("+0.00;-0.00")).Append('\n');
            }
            FootworkState f = runner.EngineFoot;
            sb.Append("BATTER x ").Append(f.X.ToString("+0.00;-0.00")).Append("  z ")
              .Append(f.Z.ToString("+0.00;-0.00")).Append("  (")
              .Append(FootworkController.Pose(f).ToString().ToLower()).Append(")\n");
            if (input != null)
            {
                Vector2 joy = input.JoystickVector;
                sb.Append("FOOTWORK INPUT ").Append(joy.x.ToString("+0.00;-0.00")).Append(',')
                  .Append(joy.y.ToString("+0.00;-0.00"))
                  .Append(input.JoystickActive ? "  (stick held)" : "").Append('\n');
            }
            SwingReport? s = runner.LastSwing;
            if (s.HasValue)
            {
                var r = s.Value;
                sb.Append("SWIPE  dir ").Append(r.Direction.Direction.X.ToString("+0.00;-0.00")).Append(',')
                  .Append(r.Direction.Direction.Y.ToString("+0.00;-0.00")).Append("  sector ")
                  .Append(ShotSelector.SectorName(ShotSelector.SectorOf(r.Direction.AngleFromStraight)))
                  .Append('\n');
                sb.Append("INTENT ").Append(r.Intent.ToString().ToLower())
                  .Append("   FOOT ").Append(FootworkController.Pose(runner.EngineFoot).ToString().ToLower())
                  .Append('\n');
                sb.Append("TIMING ").Append(r.Window.ToString().ToUpper())
                  .Append("  (").Append((r.TimingOffset * 1000f).ToString("+0;-0")).Append(" ms)   reach ")
                  .Append(r.Direction.ReachQuality.ToString("0.00")).Append('\n');
                sb.Append("SHOT   ").Append(r.Selection.Name)
                  .Append(r.Selection.Awkward ? "  [AWKWARD]" : "").Append('\n');
                if (r.WillContact)
                {
                    sb.Append("CONTACT ").Append(r.Contact.Outcome.ToString().ToUpper())
                      .Append("   q=").Append(r.Contact.Quality.ToString("0.00"))
                      .Append("   exit ").Append(r.Contact.ExitSpeedKph.ToString("0")).Append(" kph");
                }
                else
                {
                    sb.Append("CONTACT MISS");
                }
            }
            readout.text = sb.ToString();
        }
    }
}
