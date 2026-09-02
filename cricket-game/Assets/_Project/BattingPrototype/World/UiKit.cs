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

        public static Font DefaultFont
        {
            get
            {
                Font f = null;
                try { f = Resources.GetBuiltinResource<Font>("Arial.ttf"); }
                catch (System.Exception) { f = null; }
                if (f == null)
                {
                    try { f = Resources.GetBuiltinResource<Font>("LegacySans.ttf"); }
                    catch (System.Exception) { f = null; }
                }
                return f;
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
