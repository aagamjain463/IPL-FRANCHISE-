using UnityEngine;

namespace CricketGame.BattingPrototype.World
{
    /// <summary>
    /// Phase 5: original fictional team identity data. Colours + roster names
    /// for both sides, so player presentation and HUD names come from one
    /// place. Real player/team data can be connected later by swapping these.
    /// </summary>
    public static class TeamKit
    {
        public struct Kit
        {
            public Color Shirt;
            public Color Helmet;
            public Color Trim;
            public string[] Batters;   // batting order (Super Over: max 3)
            public string Bowler;
            public string SideName;
        }

        public static readonly Kit You = new Kit
        {
            Shirt = new Color(0.10f, 0.45f, 0.90f),
            Helmet = new Color(0.07f, 0.26f, 0.60f),
            Trim = new Color(0f, 0.85f, 1f),
            Batters = new[] { "A. Vale", "J. Mercer", "K. Brand" },
            Bowler = "A. Vale",
            SideName = "YOU",
        };

        public static readonly Kit Ai = new Kit
        {
            Shirt = new Color(0.95f, 0.65f, 0.05f),
            Helmet = new Color(0.62f, 0.40f, 0.03f),
            Trim = new Color(1f, 0.698f, 0f),
            Batters = new[] { "S. Nair", "T. Okafor", "M. Ito" },
            Bowler = "S. Nair",
            SideName = "AI",
        };
    }
}
