using System.Collections.Generic;
using CricketGame.BattingPrototype.World;
using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.UI
{
    public enum ButtonStyle { Filled, Outline, Danger, Ghost }

    /// <summary>
    /// Reusable themed components built on UiKit (Phase 5). Rounded panels,
    /// Figma-style buttons, outcome chips - all runtime-generated, no assets.
    /// </summary>
    public static class UiComponents
    {
        /// <summary>Rounded panel with a hairline border. Returns the content rect
        /// (children should anchor inside it).</summary>
        public static RectTransform Panel(Transform parent, string name, Vector2 size,
                                          float radius, Color? bg = null, Color? border = null)
        {
            var outer = UiKit.AddImage(parent, name, border ?? UITheme.Border);
            outer.sprite = UITheme.RoundedSprite((int)radius);
            var or = UiKit.Rect(outer.gameObject);
            or.sizeDelta = size;

            var inner = UiKit.AddImage(or, "Body", bg ?? UITheme.Panel);
            inner.sprite = UITheme.RoundedSprite(Mathf.Max(2, (int)radius - 2));
            var ir = UiKit.Rect(inner.gameObject);
            UiKit.Anchor(ir, Vector2.zero, Vector2.one,
                         Vector2.one * UITheme.BorderWidth, -Vector2.one * UITheme.BorderWidth);
            return ir;
        }

        /// <summary>Figma button: filled cyan / white outline / danger outline / ghost.</summary>
        public static Button ThemedButton(Transform parent, string name, string label,
                                          Vector2 size, ButtonStyle style, int fontSize = UITheme.FontLabel)
        {
            Color bg, border, text;
            switch (style)
            {
                case ButtonStyle.Filled:
                    bg = UITheme.Cyan; border = UITheme.Cyan; text = UITheme.BgDark; break;
                case ButtonStyle.Danger:
                    bg = new Color(0, 0, 0, 0); border = UITheme.Danger; text = UITheme.Danger; break;
                case ButtonStyle.Ghost:
                    bg = UITheme.DimFill; border = new Color(1, 1, 1, 0f); text = UITheme.TextWhite; break;
                default:
                    bg = new Color(0, 0, 0, 0); border = UITheme.Border; text = UITheme.TextWhite; break;
            }

            var outer = UiKit.AddImage(parent, name, border);
            outer.sprite = UITheme.RoundedSprite((int)UITheme.RadiusButton);
            outer.raycastTarget = true;
            var or = UiKit.Rect(outer.gameObject);
            or.sizeDelta = size;

            var inner = UiKit.AddImage(or, "Body", bg);
            inner.sprite = UITheme.RoundedSprite((int)UITheme.RadiusButton - 2);
            UiKit.Anchor(UiKit.Rect(inner.gameObject), Vector2.zero, Vector2.one,
                         Vector2.one * (style == ButtonStyle.Ghost ? 0f : UITheme.BorderWidth),
                         -Vector2.one * (style == ButtonStyle.Ghost ? 0f : UITheme.BorderWidth));

            var txt = UiKit.AddText(or, "Label", label, fontSize, TextAnchor.MiddleCenter, text);
            txt.fontStyle = FontStyle.Bold;
            UiKit.Anchor(UiKit.Rect(txt.gameObject), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);

            var btn = outer.gameObject.AddComponent<Button>();
            btn.targetGraphic = outer;
            var colors = btn.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(0.85f, 0.95f, 1f, 1f);
            colors.pressedColor = new Color(0.7f, 0.85f, 0.95f, 1f);
            btn.colors = colors;
            return btn;
        }

        /// <summary>Round over-summary chip (0/1/2/3/4/6/W).</summary>
        public static Text Chip(Transform parent, string name, float diameter, string token, Color border)
        {
            var img = UiKit.AddImage(parent, name, border);
            img.sprite = UITheme.RoundedSprite(32);
            var r = UiKit.Rect(img.gameObject);
            r.sizeDelta = new Vector2(diameter, diameter);
            var txt = UiKit.AddText(r, "Token", token, UITheme.FontChip, TextAnchor.MiddleCenter,
                                    UITheme.TextWhite);
            txt.fontStyle = FontStyle.Bold;
            UiKit.Anchor(UiKit.Rect(txt.gameObject), Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            return txt;
        }

        /// <summary>Bold themed label.</summary>
        public static Text Label(Transform parent, string name, string content, int size,
                                 TextAnchor anchor, Color color)
        {
            var t = UiKit.AddText(parent, name, content, size, anchor, color);
            t.fontStyle = FontStyle.Bold;
            return t;
        }

        public static CanvasGroup FadeGroup(GameObject go)
        {
            var cg = go.GetComponent<CanvasGroup>();
            if (cg == null) cg = go.AddComponent<CanvasGroup>();
            return cg;
        }
    }

    /// <summary>
    /// Minimal tween engine on UNSCALED time so menus animate while the match
    /// is paused (timeScale = 0). Fade / scale / slide only - premium, subtle.
    /// </summary>
    public sealed class UITweenHost : MonoBehaviour
    {
        private struct Tween
        {
            public CanvasGroup Group;
            public RectTransform Rect;
            public float From, To, Time, Duration;
            public int Kind;   // 0 fade, 1 scale, 2 slide-y
        }

        private static UITweenHost instance;
        private readonly List<Tween> tweens = new List<Tween>();

        private static UITweenHost Host
        {
            get
            {
                if (instance == null)
                {
                    var go = new GameObject("UITweenHost");
                    instance = go.AddComponent<UITweenHost>();
                }
                return instance;
            }
        }

        public static void Fade(CanvasGroup group, float to, float duration)
        {
            if (group == null) return;
            Host.tweens.Add(new Tween
            {
                Group = group, Kind = 0, From = group.alpha, To = to,
                Time = 0f, Duration = Mathf.Max(0.01f, duration)
            });
        }

        public static void Scale(RectTransform rect, float from, float to, float duration)
        {
            if (rect == null) return;
            rect.localScale = Vector3.one * from;
            Host.tweens.Add(new Tween
            {
                Rect = rect, Kind = 1, From = from, To = to,
                Time = 0f, Duration = Mathf.Max(0.01f, duration)
            });
        }

        public static void SlideY(RectTransform rect, float from, float to, float duration)
        {
            if (rect == null) return;
            var p = rect.anchoredPosition; p.y = from; rect.anchoredPosition = p;
            Host.tweens.Add(new Tween
            {
                Rect = rect, Kind = 2, From = from, To = to,
                Time = 0f, Duration = Mathf.Max(0.01f, duration)
            });
        }

        private void Update()
        {
            if (tweens.Count == 0) return;
            float dt = Time.unscaledDeltaTime;
            for (int i = tweens.Count - 1; i >= 0; i--)
            {
                var tw = tweens[i];
                tw.Time += dt;
                float t = Mathf.Clamp01(tw.Time / tw.Duration);
                float e = t * t * (3f - 2f * t);   // smoothstep
                float v = Mathf.Lerp(tw.From, tw.To, e);
                switch (tw.Kind)
                {
                    case 0:
                        if (tw.Group != null) tw.Group.alpha = v;
                        break;
                    case 1:
                        if (tw.Rect != null) tw.Rect.localScale = Vector3.one * Mathf.Max(0.001f, v);
                        break;
                    default:
                        if (tw.Rect != null)
                        {
                            var p = tw.Rect.anchoredPosition; p.y = v; tw.Rect.anchoredPosition = p;
                        }
                        break;
                }
                if (t >= 1f) tweens.RemoveAt(i);
                else tweens[i] = tw;
            }
        }
    }
}
