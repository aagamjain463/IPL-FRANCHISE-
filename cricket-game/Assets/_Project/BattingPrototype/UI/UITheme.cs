using System.Collections.Generic;
using UnityEngine;

namespace CricketGame.BattingPrototype.UI
{
    /// <summary>
    /// Phase 5: the single visual source of truth. Every colour, radius, font
    /// size and animation timing used by the UI lives here - no magic values
    /// scattered through screens. Palette distilled from the approved Figma
    /// direction (dark broadcast navy + cyan / amber / danger accents).
    /// </summary>
    public static class UITheme
    {
        // ------------------------------------------------------------- colour
        public static readonly Color BgDark     = new Color(0.039f, 0.059f, 0.102f, 1f);   // #0A0F1A
        public static readonly Color Panel      = new Color(0.039f, 0.059f, 0.102f, 0.78f);
        public static readonly Color PanelSolid = new Color(0.055f, 0.078f, 0.129f, 1f);
        public static readonly Color Border     = new Color(1f, 1f, 1f, 0.14f);
        public static readonly Color Cyan       = new Color(0f, 0.851f, 1f, 1f);           // #00D9FF
        public static readonly Color CyanSoft   = new Color(0.30f, 0.85f, 1f, 1f);
        public static readonly Color Amber      = new Color(1f, 0.698f, 0f, 1f);           // #FFB300
        public static readonly Color Gold       = new Color(0.96f, 0.65f, 0.14f, 1f);
        public static readonly Color Danger     = new Color(1f, 0.176f, 0.333f, 1f);       // #FF2D55
        public static readonly Color Green      = new Color(0.133f, 0.773f, 0.369f, 1f);   // #22C55E
        public static readonly Color TextWhite  = new Color(0.96f, 0.97f, 0.98f, 1f);
        public static readonly Color TextDim    = new Color(0.54f, 0.58f, 0.65f, 1f);
        public static readonly Color DimFill    = new Color(1f, 1f, 1f, 0.10f);

        // ------------------------------------------------------------- type
        public const int FontResultTitle = 58;
        public const int FontCardTitle   = 32;
        public const int FontScore       = 26;
        public const int FontLabel       = 20;
        public const int FontSub         = 16;
        public const int FontChip        = 18;

        // ------------------------------------------------------------- shape
        public const float RadiusCard   = 14f;
        public const float RadiusButton = 10f;
        public const float RadiusChip   = 999f;   // pill
        public const float BorderWidth  = 2f;

        // ------------------------------------------------------------- motion
        public const float TweenFast = 0.14f;
        public const float TweenMed  = 0.24f;
        public const float TweenSlow = 0.35f;

        // ------------------------------------------------ rounded sprites
        private static readonly Dictionary<int, Sprite> roundedCache = new Dictionary<int, Sprite>();

        /// <summary>A white rounded-rect sprite generated at runtime (cached).
        /// radiusPx &lt;= 0 returns the plain white sprite.</summary>
        public static Sprite RoundedSprite(int radiusPx)
        {
            if (radiusPx <= 0) return World.UiKit.WhiteSprite;
            Sprite hit;
            if (roundedCache.TryGetValue(radiusPx, out hit)) return hit;

            const int size = 64;
            int r = Mathf.Clamp(radiusPx * size / 128, 2, size / 2);
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            var px = new Color32[size * size];
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    // distance from the nearest corner centre
                    float dx = Mathf.Max(0f, r - Mathf.Min(x, size - 1 - x));
                    float dy = Mathf.Max(0f, r - Mathf.Min(y, size - 1 - y));
                    float d = Mathf.Sqrt(dx * dx + dy * dy);
                    float a = Mathf.Clamp01(r - d + 0.5f);
                    px[y * size + x] = new Color32(255, 255, 255, (byte)(a * 255));
                }
            }
            tex.SetPixels32(px);
            tex.Apply();
            var sprite = Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 64f);
            roundedCache[radiusPx] = sprite;
            return sprite;
        }
    }

    /// <summary>Graphics quality presets (spec 23). One call re-tunes the whole
    /// presentation; gameplay is untouched.</summary>
    public enum QualityPreset { Low, Medium, High }

    public static class HudStats
    {
        /// <summary>Speed of the most recent delivery (for SPELL ANALYSIS).</summary>
        public static float LastDeliverySpeedKph;
        public static QualityPreset Quality = QualityPreset.Medium;
        public static bool HapticsEnabled = true;
        public static bool AudioEnabled = true;

        public static void ResetMatchStats()
        {
            LastDeliverySpeedKph = 0f;
        }
    }
}
