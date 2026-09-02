using System.Text;
using CricketGame.Core.Batting;
using CricketGame.Core.Bowling;
using CricketGame.BattingPrototype.Bowling;
using CricketGame.BattingPrototype.Game;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Hud
{
    /// <summary>
    /// Development/tuning panel (spec section 13): delivery, batsman, swipe,
    /// intent, timing, contact, OUTCOME and exit-velocity readouts, sliders,
    /// presets plus Phase 2 toggles: force perfect timing, force delivery type,
    /// force outcome, slow motion, redeliver. Built in code; hideable at boot.
    /// </summary>
    public class BattingDebugUI : MonoBehaviour
    {
        public bool StartVisible = true;

        private Text readout;
        private GameObject panel;
        private BowlingController bowling;
        private BattingPrototypeRunner runner;
        private Input.MobileBattingInput input;
        private float refreshTimer;
        private readonly StringBuilder sb = new StringBuilder(768);

        // Toggle state mirrors shown on the buttons.
        private int forcedTypeIndex = -1;             // -1 = AUTO
        private int forcedOutcomeIndex = 0;           // 0 = NONE
        private Text perfectBtnLabel;
        private Text typeBtnLabel;
        private Text outcomeBtnLabel;
        private Text slowBtnLabel;

        private static readonly ForcedOutcome[] OutcomeCycle =
        {
            ForcedOutcome.None, ForcedOutcome.Dot, ForcedOutcome.Defensive, ForcedOutcome.One,
            ForcedOutcome.Two, ForcedOutcome.Four, ForcedOutcome.Six, ForcedOutcome.Edge,
            ForcedOutcome.Bowled, ForcedOutcome.Lbw
        };

        public void Build(Canvas canvas, BowlingController bowlingRef, BattingPrototypeRunner runnerRef,
                          Input.MobileBattingInput inputRef)
        {
            bowling = bowlingRef;
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
            rt.offsetMin = new Vector2(12, 252);
            rt.offsetMax = new Vector2(-12, -12);

            BuildSlider(rect, "Speed", 80f, 150f, () => CurrentSpeed(), v => SetSpeed(v), 112);
            BuildSlider(rect, "Line", -1f, 1f, () => CurrentLine(), v => SetLine(v), 78);
            BuildSlider(rect, "Length", 0f, 1f, () => CurrentLength(), v => SetLength(v), 44);
            BuildSlider(rect, "Swing", -1f, 1f, () => CurrentSwing(), v => SetSwing(v), 10);

            BuildButton(rect, "FULL", () => ApplyPreset("full"), -322, 142, 80, 26);
            BuildButton(rect, "GOOD", () => ApplyPreset("good"), -234, 142, 80, 26);
            BuildButton(rect, "SHORT", () => ApplyPreset("short"), -146, 142, 88, 26);
            BuildButton(rect, "RESET POS", () => runner.ResetBatsmanPosition(), -322, 176, 130, 26);
            BuildButton(rect, "RE-BOWL", () => runner.RedeliverSameBall(), -184, 176, 126, 26);

            perfectBtnLabel = BuildButton(rect, "PERFECT: OFF", TogglePerfect, -322, 210, 154, 26);
            slowBtnLabel = BuildButton(rect, "SLOW-MO: OFF", ToggleSlow, -160, 210, 102, 26);
            typeBtnLabel = BuildButton(rect, "TYPE: AUTO", CycleForcedType, -322, 244, 222, 26);
            outcomeBtnLabel = BuildButton(rect, "OUTCOME: NONE", CycleForcedOutcome, -92, 244, 130, 26);

            SetVisible(StartVisible);
        }

        // ------------------------------------------------------------- slider glue

        // Sliders tune a *manual override* that the bowler respects until the
        // next delivery type is forced back to AUTO planning.
        private DeliveryData manual = new DeliveryData
        {
            SpeedKph = 126f, Line = 0.15f, Length = 0.52f, Swing = 0f,
            Seam = 0f, Bounce = 1f, Type = DeliveryType.GoodLength
        };
        private bool manualActive;

        private float CurrentSpeed() { return manual.SpeedKph; }
        private float CurrentLine() { return manual.Line; }
        private float CurrentLength() { return manual.Length; }
        private float CurrentSwing() { return manual.Swing; }
        private void SetSpeed(float v) { manual.SpeedKph = v; manualActive = true; PushManual(); }
        private void SetLine(float v) { manual.Line = v; manualActive = true; PushManual(); }
        private void SetLength(float v) { manual.Length = v; manualActive = true; PushManual(); }
        private void SetSwing(float v) { manual.Swing = v; manualActive = true; PushManual(); }

        private void PushManual()
        {
            bowling.ManualDelivery = manualActive ? manual : (DeliveryData?)null;
        }

        private void ApplyPreset(string p)
        {
            switch (p)
            {
                case "full":
                    manual.SpeedKph = 118f; manual.Line = 0f; manual.Length = 0.12f; manual.Swing = 0f;
                    manual.Type = DeliveryType.FullBall; break;
                case "good":
                    manual.SpeedKph = 126f; manual.Line = 0.15f; manual.Length = 0.52f; manual.Swing = 0f;
                    manual.Type = DeliveryType.GoodLength; break;
                case "short":
                    manual.SpeedKph = 134f; manual.Line = -0.1f; manual.Length = 0.88f; manual.Swing = 0f;
                    manual.Type = DeliveryType.ShortBall; break;
            }
            manualActive = true;
            PushManual();
            SyncSliders();
        }

        // ------------------------------------------------------------- toggles

        private void TogglePerfect()
        {
            runner.ForcePerfectTiming = !runner.ForcePerfectTiming;
            perfectBtnLabel.text = "PERFECT: " + (runner.ForcePerfectTiming ? "ON" : "OFF");
        }

        private void ToggleSlow()
        {
            runner.SlowMotion = !runner.SlowMotion;
            slowBtnLabel.text = "SLOW-MO: " + (runner.SlowMotion ? "ON" : "OFF");
        }

        private void CycleForcedType()
        {
            forcedTypeIndex++;
            if (forcedTypeIndex >= DeliveryFactory.AllTypes.Length) forcedTypeIndex = -1;
            if (forcedTypeIndex < 0)
            {
                bowling.ForcedType = null;
                typeBtnLabel.text = "TYPE: AUTO";
            }
            else
            {
                bowling.ForcedType = DeliveryFactory.AllTypes[forcedTypeIndex];
                typeBtnLabel.text = "TYPE: " + DeliveryLabels.Name(DeliveryFactory.AllTypes[forcedTypeIndex]);
            }
        }

        private void CycleForcedOutcome()
        {
            forcedOutcomeIndex = (forcedOutcomeIndex + 1) % OutcomeCycle.Length;
            runner.ForcedOutcome = OutcomeCycle[forcedOutcomeIndex];
            outcomeBtnLabel.text = "OUTCOME: " + OutcomeCycle[forcedOutcomeIndex].ToString().ToUpper();
        }

        // ------------------------------------------------------------- builders

        private void BuildSlider(RectTransform parent, string label, float min, float max,
                                 System.Func<float> get, System.Action<float> set, float yFromBottom)
        {
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

        private Text BuildButton(RectTransform parent, string label, System.Action onClick,
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
            return t;
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
                sliders[0].SetValueWithoutNotify(manual.SpeedKph);
                sliders[1].SetValueWithoutNotify(manual.Line);
                sliders[2].SetValueWithoutNotify(manual.Length);
                sliders[3].SetValueWithoutNotify(manual.Swing);
            }
        }

        // ------------------------------------------------------------- readout

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
                sb.Append("BALL   ").Append(DeliveryLabels.Name(dv.Type)).Append("  ")
                  .Append(dv.SpeedKph.ToString("0")).Append(" kph\n");
                sb.Append("  line ").Append(dv.Line.ToString("+0.00;-0.00")).Append("  len ")
                  .Append(dv.Length.ToString("0.00")).Append("  swing ").Append(dv.Swing.ToString("+0.00;-0.00"))
                  .Append("  seam ").Append(dv.Seam.ToString("+0.00;-0.00"))
                  .Append("  bounce ").Append(dv.Bounce.ToString("0.00")).Append('\n');
            }
            FootworkState f = runner.EngineFoot;
            sb.Append("BATTER x ").Append(f.X.ToString("+0.00;-0.00")).Append("  z ")
              .Append(f.Z.ToString("+0.00;-0.00")).Append("  (")
              .Append(FootworkController.Pose(f).ToString().ToLower()).Append(")\n");
            if (input != null)
            {
                Vector2 joy = input.JoystickVector;
                sb.Append("FOOTWORK ").Append(joy.x.ToString("+0.00;-0.00")).Append(',')
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
                  .Append("  intent ").Append(r.Intent.ToString().ToLower()).Append('\n');
                sb.Append("TIMING ").Append(r.Window.ToString().ToUpper())
                  .Append("  (").Append((r.TimingOffset * 1000f).ToString("+0;-0")).Append(" ms)   reach ")
                  .Append(r.Direction.ReachQuality.ToString("0.00")).Append('\n');
                sb.Append("SHOT   ").Append(r.Selection.Name)
                  .Append(r.Selection.Awkward ? "  [AWKWARD]" : "").Append('\n');
                if (r.WillContact)
                {
                    sb.Append("CONTACT ").Append(r.Contact.Outcome.ToString().ToUpper())
                      .Append("  q=").Append(r.Contact.Quality.ToString("0.00"))
                      .Append("  exit ").Append(r.Contact.ExitSpeedKph.ToString("0")).Append(" kph")
                      .Append("  elev ").Append(r.Contact.ElevationDeg.ToString("0")).Append("°\n");
                }
                else
                {
                    sb.Append("CONTACT MISS\n");
                }
            }
            ShotOutcomeResult? o = runner.LastOutcome;
            if (o.HasValue)
            {
                sb.Append("OUTCOME ").Append(o.Value.Label)
                  .Append(o.Value.Runs > 0 ? "  +" + o.Value.Runs : "")
                  .Append(o.Value.IsWicket ? "  [WICKET]" : "")
                  .Append(o.Value.Forced ? "  [FORCED]" : "").Append('\n');
            }
            readout.text = sb.ToString();
        }
    }
}
