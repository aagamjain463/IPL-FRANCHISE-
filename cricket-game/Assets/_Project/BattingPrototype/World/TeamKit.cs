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

        // Phase 6: fictional reserve rosters so limited-overs matches can field
        // a full batting order and a 5-bowler squad. Deterministic and original.
        private static readonly string[] ReserveInitials = { "R", "D", "N", "P", "E", "V", "L", "H" };
        private static readonly string[] ReserveSurnames =
            { "Ashby", "Coles", "Dray", "Ellison", "Farrow", "Gale", "Holt", "Ivers",
              "Judd", "Keene", "Lowen", "Marsden", "North", "Orrell", "Pryce", "Quade",
              "Ravenscroft", "Sedge", "Tarrant", "Ulric", "Vance", "Whitlock" };

        /// <summary>Full batting order: the kit's named players first, then
        /// generated fictional reserves. Never returns duplicates.</summary>
        public static System.Collections.Generic.List<string> SquadNames(Kit kit, int count)
        {
            var list = new System.Collections.Generic.List<string>();
            foreach (string n in kit.Batters) list.Add(n);
            int seed = kit.SideName == "YOU" ? 0 : 7;
            for (int i = list.Count; i < count; i++)
            {
                string name = ReserveInitials[(i + seed) % ReserveInitials.Length] + ". "
                            + ReserveSurnames[(i * 3 + seed) % ReserveSurnames.Length];
                while (list.Contains(name))
                    name = ReserveInitials[(i + seed + 1) % ReserveInitials.Length] + ". "
                         + ReserveSurnames[(i * 3 + seed + 5) % ReserveSurnames.Length];
                list.Add(name);
            }
            return list;
        }

        /// <summary>Bowling squad: the kit's lead bowler plus fictional reserves.</summary>
        public static System.Collections.Generic.List<string> BowlerNames(Kit kit, int count)
        {
            var list = new System.Collections.Generic.List<string> { kit.Bowler };
            int seed = kit.SideName == "YOU" ? 3 : 11;
            for (int i = 1; i < count; i++)
            {
                string name = ReserveInitials[(i + seed) % ReserveInitials.Length] + ". "
                            + ReserveSurnames[(i * 5 + seed) % ReserveSurnames.Length];
                while (list.Contains(name))
                    name = ReserveInitials[(i + seed + 2) % ReserveInitials.Length] + ". "
                         + ReserveSurnames[(i * 5 + seed + 9) % ReserveSurnames.Length];
                list.Add(name);
            }
            return list;
        }
    }
}
