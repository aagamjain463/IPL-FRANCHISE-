using System;
using System.Collections.Generic;

namespace CricketGame.Core.Rules.LimitedOvers
{
    /// <summary>One side's personnel for a limited-overs match.</summary>
    [Serializable]
    public sealed class LimitedOversTeam
    {
        public readonly string Name;
        public readonly List<string> Batters;   // batting order
        public readonly List<string> Bowlers;   // bowling squad

        public LimitedOversTeam(string name, IList<string> batters, IList<string> bowlers)
        {
            Name = name ?? "";
            Batters = new List<string>(batters);
            Bowlers = new List<string>(bowlers);
        }
    }

    /// <summary>Fine-grained innings states for presentation layers (Phase 6 §3).</summary>
    public enum InningsState
    {
        PreInnings,
        Playing,
        BallInProgress,
        BallComplete,
        OverComplete,
        DrinksBreak,
        InningsBreak,
        InningsComplete,
        MatchComplete
    }

    /// <summary>Event payload: an over has just finished.</summary>
    public struct OverCompletedArgs
    {
        public int InningsIndex;
        public OverRecord Over;
    }

    /// <summary>Event payload: a wicket has fallen.</summary>
    public struct WicketArgs
    {
        public int InningsIndex;
        public int BatterIndex;
        public string BatterName;
        public DismissalKind Dismissal;
    }
}
