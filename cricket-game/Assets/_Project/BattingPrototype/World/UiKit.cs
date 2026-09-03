using UnityEngine;
using UnityEngine.UI;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>Small helpers for building UI entirely in code (no prefab assets).</summary>
    public static class UiKit
    {
        private static Sprite whiteSprite;

        public static Sprite WhiteSprite
        {
            get
            {
                if (whiteSprite == null)
                    whiteSprite = Sprite.Create(Texture2D.whiteTexture, new Rect(0, 0, 16, 16), new Vector2(0.5f, 0.5f));
                return whiteSprite;
            }
        }

        private static Font defaultFont;

        public static Font DefaultFont
        {
            get
            {
                if (defaultFont != null) return defaultFont;
                try { defaultFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"); }
                catch (System.Exception) { defaultFont = null; }
                if (defaultFont == null)
                {
                    try { defaultFont = Resources.GetBuiltinResource<Font>("Arial.ttf"); }
                    catch (System.Exception) { defaultFont = null; }
                }
                if (defaultFont == null)
                {
                    try { defaultFont = Resources.GetBuiltinResource<Font>("LegacySans.ttf"); }
                    catch (System.Exception) { defaultFont = null; }
                }
                if (defaultFont == null)
                {
                    var fonts = Resources.FindObjectsOfTypeAll<Font>();
                    if (fonts != null && fonts.Length > 0) defaultFont = fonts[0];
                }
                if (defaultFont == null)
                {
                    defaultFont = Font.CreateDynamicFontFromOSFont(new[] { "Arial", "Helvetica", "Segoe UI", "Sans-Serif" }, 16);
                }
                return defaultFont;
            }
        }

        public static GameObject NewUi(string name, Transform parent)
        {
            // RectTransforms cannot be AddComponent-ed; they must exist at creation.
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        public static RectTransform Rect(GameObject go)
        {
            return (RectTransform)go.transform;
        }

        public static Image AddImage(Transform parent, string name, Color color)
        {
            var go = NewUi(name, parent);
            var rect = Rect(go);
            var img = go.AddComponent<Image>();
            img.sprite = WhiteSprite;
            img.color = color;
            img.raycastTarget = false;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.localScale = Vector3.one;
            return img;
        }

        public static Text AddText(Transform parent, string name, string content, int size,
                                   TextAnchor anchor, Color color)
        {
            var go = NewUi(name, parent);
            var rect = Rect(go);
            var text = go.AddComponent<Text>();
            text.text = content;
            text.font = DefaultFont;
            text.fontSize = size;
            text.alignment = anchor;
            text.color = color;
            text.horizontalOverflow = HorizontalWrapMode.Overflow;
            text.verticalOverflow = VerticalWrapMode.Overflow;
            text.raycastTarget = false;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.localScale = Vector3.one;
            return text;
        }

        /// <summary>Anchors the rect to fill a corner/edge region described in normalized anchors.</summary>
        public static void Anchor(RectTransform rect, Vector2 min, Vector2 max, Vector2 offsetMin, Vector2 offsetMax)
        {
            rect.anchorMin = min;
            rect.anchorMax = max;
            rect.offsetMin = offsetMin;
            rect.offsetMax = offsetMax;
        }
    }
}
