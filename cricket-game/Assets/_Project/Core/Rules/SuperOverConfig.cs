using System;

namespace CricketGame.Core.Rules
{
    /// <summary>
    /// Immutable ruleset for a Super Over. Defaults follow the mode spec:
    /// 6 legal balls per innings, maximum 2 wickets per innings.
    /// </summary>
    [Serializable]
    public sealed class SuperOverConfig
    {
        public int BallsPerInnings { get; }
        public int MaxWicketsPerInnings { get; }

        /// <summary>
        /// When true, ball generators may produce wides/no-balls. These add runs
        /// without consuming a legal ball. The rules engine always handles them
        /// correctly; this flag only constrains the generators.
        /// </summary>
        public bool AllowExtras { get; }

        public SuperOverConfig(int ballsPerInnings = 6, int maxWicketsPerInnings = 2, bool allowExtras = true)
        {
            if (ballsPerInnings < 1)
                throw new ArgumentOutOfRangeException(nameof(ballsPerInnings), "ballsPerInnings must be >= 1.");
            if (maxWicketsPerInnings < 1)
                throw new ArgumentOutOfRangeException(nameof(maxWicketsPerInnings), "maxWicketsPerInnings must be >= 1.");

            BallsPerInnings = ballsPerInnings;
            MaxWicketsPerInnings = maxWicketsPerInnings;
            AllowExtras = allowExtras;
        }

        /// <summary>The standard SUPER OVER ruleset: 6 legal balls, max 2 wickets.</summary>
        public static SuperOverConfig Standard
        {
            get { return new SuperOverConfig(6, 2, true); }
        }
    }
}
