namespace CricketGame.Core.Simulation
{
    /// <summary>Decides what the batter attempts on the next delivery.</summary>
    public interface IBattingPolicy
    {
        ShotIntent Decide(IRng rng, BallContext context);
    }

    /// <summary>Decides how the bowler bowls the next delivery.</summary>
    public interface IBowlingPolicy
    {
        BowlingPlan Decide(IRng rng, BallContext context);
    }

    /// <summary>
    /// Chase-aware AI batter.
    ///  - First innings: steady base aggression with an end-of-over acceleration
    ///    if wickets remain, and protection of the last wicket.
    ///  - Chase: aggression scales with the required rate per ball; calms down
    ///    when a tiny total is needed; max attack when the rate climbs late.
    /// Skill (0..1) lifts execution quality.
    /// </summary>
    public sealed class AiBattingPolicy : IBattingPolicy
    {
        private readonly float skill;
        private readonly float baseAggression;

        public AiBattingPolicy(float skill, float baseAggression = 0.42f)
        {
            this.skill = ShotIntent.Clamp01(skill);
            this.baseAggression = ShotIntent.Clamp01(baseAggression);
        }

        public float Skill { get { return skill; } }

        public ShotIntent Decide(IRng rng, BallContext ctx)
        {
            float aggression = baseAggression;

            if (ctx.IsChasing)
            {
                float rate = ctx.RequiredRatePerBall;

                // ~0.9 runs/ball is par; scale aggression around it.
                aggression = 0.25f + 0.55f * (rate - 0.9f);

                // Late squeeze: few balls left, wickets in hand -> force the pace.
                if (ctx.BallsRemaining <= 2 && ctx.WicketsRemaining > 0 && rate >= 2f)
                    aggression = System.Math.Max(aggression, 0.95f);
                else if (ctx.BallsRemaining <= 2 && ctx.WicketsRemaining > 0)
                    aggression = System.Math.Max(aggression, 0.65f);

                // Small target within reach -> steady hands, protect the wickets.
                if (ctx.RunsRequired.HasValue && ctx.RunsRequired.Value <= 2)
                    aggression = System.Math.Min(aggression, 0.30f);
            }
            else
            {
                // Setting a target: accelerate late if both wickets are intact.
                if (ctx.BallsRemaining <= 2 && ctx.WicketsRemaining >= 2)
                    aggression += 0.25f;
            }

            float execution = 0.30f + 0.60f * skill + (rng.NextFloat() - 0.5f) * 0.16f;
            return new ShotIntent(aggression, execution);
        }
    }

    /// <summary>
    /// AI bowler. Difficulty (0..1) sets base threat; each delivery varies a
    /// little. When the batter is desperate (high required rate, late balls)
    /// the bowler pushes harder — at a slightly higher wide risk handled by
    /// the resolver via the batter's aggression.
    /// </summary>
    public sealed class AiBowlingPolicy : IBowlingPolicy
    {
        private readonly float difficulty;

        public AiBowlingPolicy(float difficulty)
        {
            this.difficulty = ShotIntent.Clamp01(difficulty);
        }

        public float Difficulty { get { return difficulty; } }

        public BowlingPlan Decide(IRng rng, BallContext ctx)
        {
            float threat = 0.30f + 0.45f * difficulty;
            if (ctx.IsChasing && ctx.RequiredRatePerBall >= 2f)
                threat += 0.08f; // attack the desperate batter
            threat += (rng.NextFloat() - 0.5f) * 0.20f; // per-ball variation
            return new BowlingPlan(threat);
        }
    }
}
