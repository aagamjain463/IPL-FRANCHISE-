using System;
using System.Collections;
using CricketGame.Core.Batting;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.Hud
{
    /// <summary>
    /// Mobile gameplay HUD, built entirely in code (no prefab assets).
    /// Left: dynamic virtual joystick. Right: swipe zone + four compact
    /// intent buttons (Defensive / Normal / Power / Lofted).
    /// </summary>
    public class BattingHud : MonoBehaviour
    {
        public Canvas Canvas { get; private set; }
        public RectTransform CanvasRect { get; private set; }

        private Text scoreText;
        private Text popupText;
        private Text hintSwipe;
        private Text toastText;
        private Image toastBg;
        private Text bannerText;
        private Image bannerBg;
        private Image timingFlash;
        private Image joyBase;
        private Image joyKnob;
        private Image swipeIndicator;
        private Image[] intentButtons = new Image[4];
        private Text[] intentLabels = new Text[4];
        private RectTransform intentPanelRect;

        private Input.MobileBattingInput input;
        private Coroutine popupRoutine;
        private Coroutine toastRoutine;
        private Coroutine bannerRoutine;
        private Coroutine flashRoutine;
        private ShotIntent currentIntent = ShotIntent.Normal;

        private static readonly Color Dim = new Color(1f, 1f, 1f, 0.14f);
        private static readonly Color PanelDark = new Color(0.05f, 0.07f, 0.12f, 0.62f);

        public event Action<ShotIntent> IntentChanged;

        // ------------------------------------------------------------------ build

        public void Build(Input.MobileBattingInput inputSource)
        {
            input = inputSource;

            var canvasGo = new GameObject("HUD");
            canvasGo.transform.SetParent(transform, false);
            Canvas = canvasGo.AddComponent<Canvas>();
            Canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            Canvas.sortingOrder = 10;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;
            canvasGo.AddComponent<GraphicRaycaster>();

            var esGo = new GameObject("EventSystem");
            esGo.transform.SetParent(transform, false);
            esGo.AddComponent<EventSystem>();
            esGo.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();

            CanvasRect = (RectTransform)canvasGo.transform;

            BuildScoreboard();
            BuildIntentButtons();
            BuildJoystickVisuals();
            BuildSwipeZone();
            BuildPopup();
            BuildToast();
            BuildBanner();
            BuildTimingFlash();

            input.JoystickStarted += () => SetJoystickVisible(true);
            input.JoystickEnded += () => SetJoystickVisible(false);
        }

        private T AnchoredPanel<T>(string name, Vector2 anchorMin, Vector2 anchorMax,
                                   Vector2 offsetMin, Vector2 offsetMax) where T : Component
        {
            var go = World.UiKit.NewUi(name, CanvasRect);
            var rect = World.UiKit.Rect(go);
            rect.anchorMin = anchorMin;
            rect.anchorMax = anchorMax;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
            if (typeof(T) == typeof(RectTransform)) return go.transform as T;
            return go.AddComponent<T>();
        }

        private void BuildScoreboard()
        {
            var bg = AnchoredPanel<Image>("Scoreboard", new Vector2(0.5f, 1f), new Vector2(0.5f, 1f),
                new Vector2(-330, -86), new Vector2(330, -6));
            bg.sprite = World.UiKit.WhiteSprite;
            bg.color = PanelDark;
            bg.raycastTarget = false;

            scoreText = World.UiKit.AddText(bg.transform, "Score",
                "SCORE 0   WKTS 0   BALLS 0      TARGET —   REQ —", 30, TextAnchor.MiddleCenter, Color.white);
            World.UiKit.Anchor(scoreText.rectTransform, Vector2.zero, Vector2.one,
                new Vector2(8, 0), new Vector2(-8, 0));
        }

        private void BuildIntentButtons()
        {
            // Compact intent column at the top-right corner (landscape).
            intentPanelRect = AnchoredPanel<RectTransform>("IntentPanel",
                new Vector2(1f, 1f), new Vector2(1f, 1f),
                new Vector2(-150, -322), new Vector2(-14, -100));

            string[] labels = { "DEF", "NOR", "POW", "LOFT" };
            ShotIntent[] intents = { ShotIntent.Defensive, ShotIntent.Normal, ShotIntent.Aggressive, ShotIntent.Lofted };
            float h = 46f, gap = 8f;

            for (int i = 0; i < 4; i++)
            {
                var go = World.UiKit.NewUi("Intent_" + labels[i], intentPanelRect);
                var rect = World.UiKit.Rect(go);
                rect.anchorMin = new Vector2(0, 1);
                rect.anchorMax = new Vector2(1, 1);
                rect.pivot = new Vector2(0.5f, 1);
                rect.sizeDelta = new Vector2(0, h);
                rect.anchoredPosition = new Vector2(0, -i * (h + gap));

                var img = go.AddComponent<Image>();
                img.sprite = World.UiKit.WhiteSprite;
                img.color = new Color(0.1f, 0.12f, 0.2f, 0.75f);
                intentButtons[i] = img;

                var label = World.UiKit.AddText(rect, "Label", labels[i], 26, TextAnchor.MiddleCenter, Color.white);
                World.UiKit.Anchor(label.rectTransform, Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
                intentLabels[i] = label;

                var btn = go.AddComponent<Button>();
                btn.targetGraphic = img;
                int captured = i;
                btn.onClick.AddListener(() => SetIntent(intents[captured]));
            }

            SetIntent(ShotIntent.Normal);
        }

        private void BuildJoystickVisuals()
        {
            joyBase = World.UiKit.AddImage(CanvasRect, "JoyBase", Dim);
            joyBase.rectTransform.sizeDelta = new Vector2(220, 220);
            joyKnob = World.UiKit.AddImage(CanvasRect, "JoyKnob", new Color(1f, 1f, 1f, 0.4f));
            joyKnob.rectTransform.sizeDelta = new Vector2(86, 86);
            SetJoystickVisible(false);
        }

        private void BuildSwipeZone()
        {
            var zoneHint = World.UiKit.AddText(CanvasRect, "SwipeHint",
                "SWIPE TO PLAY\nrelease = shot", 24, TextAnchor.MiddleCenter, new Color(1, 1, 1, 0.35f));
            zoneHint.rectTransform.anchorMin = new Vector2(0.78f, 0.06f);
            zoneHint.rectTransform.anchorMax = new Vector2(0.78f, 0.06f);
            zoneHint.rectTransform.sizeDelta = new Vector2(320, 70);

            swipeIndicator = World.UiKit.AddImage(CanvasRect, "SwipeIndicator", new Color(1f, 0.9f, 0.35f, 0.85f));
            swipeIndicator.rectTransform.sizeDelta = new Vector2(10, 10);
            swipeIndicator.rectTransform.pivot = new Vector2(0.5f, 0f);
            swipeIndicator.gameObject.SetActive(false);
        }

        private void BuildPopup()
        {
            popupText = World.UiKit.AddText(CanvasRect, "Popup", "", 72, TextAnchor.MiddleCenter, Color.white);
            popupText.rectTransform.anchorMin = new Vector2(0.5f, 0.55f);
            popupText.rectTransform.anchorMax = new Vector2(0.5f, 0.55f);
            popupText.rectTransform.sizeDelta = new Vector2(1200, 120);
        }

        /// <summary>Broadcast lower-left toast: delivery type + pace.</summary>
        private void BuildToast()
        {
            toastBg = World.UiKit.AddImage(CanvasRect, "ToastBg", new Color(0.04f, 0.06f, 0.12f, 0f));
            toastBg.sprite = World.UiKit.WhiteSprite;
            toastBg.raycastTarget = false;
            var r = toastBg.rectTransform;
            r.anchorMin = new Vector2(0f, 0f);
            r.anchorMax = new Vector2(0f, 0f);
            r.pivot = new Vector2(0f, 0f);
            r.anchoredPosition = new Vector2(16, 34);
            r.sizeDelta = new Vector2(360, 44);

            toastText = World.UiKit.AddText(toastBg.transform, "ToastText", "", 24,
                TextAnchor.MiddleLeft, new Color(1f, 1f, 1f, 0f));
            World.UiKit.Anchor(toastText.rectTransform, Vector2.zero, Vector2.one,
                new Vector2(14, 0), new Vector2(-10, 0));
        }

        /// <summary>Full-width centre band for FOUR / SIX / WICKET moments.</summary>
        private void BuildBanner()
        {
            bannerBg = World.UiKit.AddImage(CanvasRect, "BannerBg", new Color(0.05f, 0.07f, 0.14f, 0f));
            bannerBg.sprite = World.UiKit.WhiteSprite;
            bannerBg.raycastTarget = false;
            var r = bannerBg.rectTransform;
            r.anchorMin = new Vector2(0f, 0.62f);
            r.anchorMax = new Vector2(1f, 0.62f);
            r.pivot = new Vector2(0.5f, 0.5f);
            r.anchoredPosition = Vector2.zero;
            r.sizeDelta = new Vector2(0, 96);

            bannerText = World.UiKit.AddText(bannerBg.transform, "BannerText", "", 64,
                TextAnchor.MiddleCenter, new Color(1f, 1f, 1f, 0f));
            World.UiKit.Anchor(bannerText.rectTransform, Vector2.zero, Vector2.one,
                Vector2.zero, Vector2.zero);
        }

        /// <summary>Subtle full-screen tint pulse for PERFECT timing.</summary>
        private void BuildTimingFlash()
        {
            timingFlash = World.UiKit.AddImage(CanvasRect, "TimingFlash", new Color(1f, 0.85f, 0.2f, 0f));
            timingFlash.sprite = World.UiKit.WhiteSprite;
            timingFlash.raycastTarget = false;
            World.UiKit.Anchor(timingFlash.rectTransform, Vector2.zero, Vector2.one,
                Vector2.zero, Vector2.zero);
        }

        // ------------------------------------------------------------------ runtime

        public void SetIntent(ShotIntent intent)
        {
            currentIntent = intent;
            input.SelectedIntent = intent;
            Color[] on = { new Color(0.2f, 0.55f, 0.95f, 0.95f), new Color(0.16f, 0.7f, 0.35f, 0.95f),
                           new Color(0.95f, 0.45f, 0.15f, 0.95f), new Color(0.75f, 0.2f, 0.65f, 0.95f) };
            for (int i = 0; i < 4; i++)
            {
                bool active = ((int)intent) == i;
                intentButtons[i].color = active ? on[i] : new Color(0.1f, 0.12f, 0.2f, 0.75f);
            }
            if (IntentChanged != null) IntentChanged(intent);
        }

        public void SetScoreboard(int runs, int wickets, int balls)
        {
            scoreText.text = "SCORE " + runs + "   WKTS " + wickets + "   BALLS " + balls +
                             "      TARGET —   REQ —";
        }

        public void ShowPopup(string message, Color color, float duration = 1.1f)
        {
            if (popupRoutine != null) StopCoroutine(popupRoutine);
            popupRoutine = StartCoroutine(PopupRoutine(message, color, duration));
        }

        private IEnumerator PopupRoutine(string message, Color color, float duration)
        {
            popupText.text = message;
            popupText.color = color;
            float t = 0f;
            while (t < duration)
            {
                t += Time.deltaTime;
                float alpha = t > duration - 0.3f ? Mathf.Clamp01((duration - t) / 0.3f) : 1f;
                var c = popupText.color; c.a = alpha; popupText.color = c;
                yield return null;
            }
            popupText.text = "";
        }

        /// <summary>Small broadcast-style delivery info toast (fades after ~1.6 s).</summary>
        public void ShowDeliveryToast(string message)
        {
            if (toastRoutine != null) StopCoroutine(toastRoutine);
            toastRoutine = StartCoroutine(ToastRoutine(message));
        }

        private IEnumerator ToastRoutine(string message)
        {
            toastText.text = message;
            float t = 0f;
            const float life = 1.6f;
            while (t < life)
            {
                t += Time.deltaTime;
                float inA = Mathf.Clamp01(t / 0.15f);
                float outA = t > life - 0.4f ? Mathf.Clamp01((life - t) / 0.4f) : 1f;
                float a = inA * outA;
                var tc = toastText.color; tc.a = a; toastText.color = tc;
                var bc = toastBg.color; bc.a = 0.62f * a; toastBg.color = bc;
                yield return null;
            }
            toastText.text = "";
        }

        /// <summary>Centre band for boundary/wicket moments.</summary>
        public void ShowBoundaryBanner(string message, Color color)
        {
            if (bannerRoutine != null) StopCoroutine(bannerRoutine);
            bannerRoutine = StartCoroutine(BannerRoutine(message, color, 1.25f));
        }

        public void ShowWicketBanner(string message)
        {
            if (bannerRoutine != null) StopCoroutine(bannerRoutine);
            bannerRoutine = StartCoroutine(BannerRoutine(message, new Color(1f, 0.22f, 0.18f), 1.5f));
        }

        private IEnumerator BannerRoutine(string message, Color color, float life)
        {
            bannerText.text = message;
            bannerText.color = color;
            float t = 0f;
            while (t < life)
            {
                t += Time.deltaTime;
                float inA = Mathf.Clamp01(t / 0.12f);
                float outA = t > life - 0.45f ? Mathf.Clamp01((life - t) / 0.45f) : 1f;
                float a = inA * outA;
                var tc = bannerText.color; tc.a = a; bannerText.color = tc;
                var bc = bannerBg.color; bc.a = 0.55f * a; bannerBg.color = bc;
                yield return null;
            }
            bannerText.text = "";
        }

        /// <summary>One soft pulse of colour when the timing is PERFECT.</summary>
        public void FlashTiming(Color color)
        {
            if (flashRoutine != null) StopCoroutine(flashRoutine);
            flashRoutine = StartCoroutine(FlashRoutine(color));
        }

        private IEnumerator FlashRoutine(Color color)
        {
            float t = 0f;
            const float life = 0.35f;
            while (t < life)
            {
                t += Time.deltaTime;
                float a = 0.16f * Mathf.Sin(Mathf.PI * Mathf.Clamp01(t / life));
                var c = color; c.a = a;
                timingFlash.color = c;
                yield return null;
            }
            var done = color; done.a = 0f;
            timingFlash.color = done;
        }

        private void SetJoystickVisible(bool visible)
        {
            joyBase.gameObject.SetActive(visible);
            joyKnob.gameObject.SetActive(visible);
        }

        /// <summary>Screen-pixel rect of the intent buttons (touch exclusion zone).</summary>
        public Rect IntentButtonsScreenRect()
        {
            Vector3[] corners = new Vector3[4];
            intentPanelRect.GetWorldCorners(corners);
            // Overlay canvas: world units convert to screen pixels via the canvas scale factor.
            float scale = Canvas.scaleFactor;
            float xMin = corners[0].x * scale;
            float yMin = corners[0].y * scale;
            float xMax = corners[2].x * scale;
            float yMax = corners[2].y * scale;
            return new Rect(xMin, yMin, xMax - xMin, yMax - yMin);
        }

        private void LateUpdate()
        {
            // --- joystick visuals (convert screen px -> canvas local units)
            if (input.JoystickActive)
            {
                Vector2 local;
                if (RectTransformUtility.ScreenPointToLocalPointInRectangle(
                        CanvasRect, input.JoystickAnchorScreen, null, out local))
                {
                    joyBase.rectTransform.anchoredPosition = local;
                    joyKnob.rectTransform.anchoredPosition = local + ScreenToCanvas(input.JoystickVector * Screen.height * 0.11f);
                }
            }

            // --- swipe live indicator
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
                else
                {
                    swipeIndicator.gameObject.SetActive(false);
                }
            }
            else
            {
                swipeIndicator.gameObject.SetActive(false);
            }
        }

        private Vector2 ScreenToCanvas(Vector2 screenDelta)
        {
            float sf = Canvas.scaleFactor;
            return sf > 0.0001f ? screenDelta / sf : screenDelta;
        }
    }
}
