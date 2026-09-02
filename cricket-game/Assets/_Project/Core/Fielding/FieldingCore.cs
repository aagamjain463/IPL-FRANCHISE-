using System.Collections.Generic;
using CricketGame.Core.Batting;
using CricketGame.Core.Simulation;

namespace CricketGame.Core.Fielding
{
    /// <summary>
    /// Deterministic fielding simulation. Mirrors harness/fielding_reference.py
    /// constant-for-constant; if you tune one, tune both.
    ///
    /// Design notes:
    ///  * No physics engine, no per-frame AI cost in the Unity layer - the whole
    ///    flight of the struck ball is resolved here in a few hundred cheap
    ///    fixed steps, then the presentation layer replays the result.
    ///  * Fielders read the flight (closed-form landing estimate), sprint to the
    ///    landing spot for lofted balls, chase grounded balls, attempt ONE stop
    ///    per pass (cooldown) and ONE catch roll per opportunity.
    ///  * Difficulty enters through <see cref="Fielder.Scale"/> only.
    /// </summary>
    public static class FieldingConstants
    {
        public const float BoundaryRadius = 62f;
        public const float Rope = BoundaryRadius - 0.4f;
        public const float Gravity = 9.81f;
        public const float SimDt = 1f / 60f;
        public const float RunDelay = 0.25f;      // batters react after contact
        public const float TimePerRun = 2.4f;     // seconds per completed run
        public const float CatchRadius = 0.95f;   // metres (2D) to get hands on it
        public const float CatchMaxHeight = 2.4f;
        public const float StopRadius = 0.80f;
        public static readonly Vec2 KeeperPos = new Vec2(0f, -2.6f);
    }

    public enum FieldingKind { Stopped, Four, Six, Caught }

    /// <summary>Static row of the default 9 + bowler + keeper field setup.</summary>
    public struct FielderSpec
    {
        public string Name;
        public float X, Z;
        public float Speed, Reaction, Catching, Ground;
        public float ThrowSpeed, ThrowAcc;

        public FielderSpec(string name, float x, float z, float speed,
                           float reaction, float catching, float ground,
                           float throwSpeed, float throwAcc)
        {
            Name = name; X = x; Z = z; Speed = speed; Reaction = reaction;
            Catching = catching; Ground = ground; ThrowSpeed = throwSpeed;
            ThrowAcc = throwAcc;
        }
    }

    public static class FieldSetup
    {
        // (x, z) metres, batter at origin, bowler end is +z.
        public static readonly FielderSpec[] Default =
        {
            new FielderSpec("slip",        1.0f,  -2.2f, 5.6f, 0.16f, 0.80f, 0.55f, 20.0f, 0.70f),
            new FielderSpec("point",      24.0f,   6.0f, 6.6f, 0.24f, 0.68f, 0.80f, 23.0f, 0.80f),
            new FielderSpec("cover",      17.0f,  18.0f, 6.8f, 0.22f, 0.70f, 0.85f, 24.0f, 0.85f),
            new FielderSpec("mid_off",     8.0f,  26.0f, 6.5f, 0.24f, 0.62f, 0.80f, 23.0f, 0.80f),
            new FielderSpec("mid_on",     -8.0f,  26.0f, 6.5f, 0.24f, 0.62f, 0.80f, 23.0f, 0.80f),
            new FielderSpec("mid_wicket",-17.0f,  18.0f, 6.8f, 0.22f, 0.66f, 0.84f, 23.5f, 0.82f),
            new FielderSpec("square_leg",-24.0f,   6.0f, 6.6f, 0.24f, 0.66f, 0.80f, 23.0f, 0.80f),
            new FielderSpec("fine_leg",  -20.0f, -20.0f, 6.9f, 0.28f, 0.60f, 0.78f, 24.0f, 0.78f),
            new FielderSpec("third_man",  20.0f, -20.0f, 6.9f, 0.28f, 0.60f, 0.78f, 24.0f, 0.78f),
            new FielderSpec("bowler",      0.6f,  16.0f, 6.2f, 0.20f, 0.55f, 0.75f, 22.0f, 0.75f),
            new FielderSpec("keeper",      0.0f,  -2.6f, 5.4f, 0.12f, 0.90f, 0.60f, 20.0f, 0.75f),
        };
    }

    /// <summary>One fielder with difficulty-scaled effective attributes.</summary>
    public sealed class Fielder
    {
        public readonly FielderSpec Spec;
        public readonly float Scale;   // 0.75 easy .. 1.2 hard (vs the batter)

        public Fielder(FielderSpec spec, float scale)
        {
            Spec = spec;
            Scale = scale;
        }

        public string Name { get { return Spec.Name; } }
        public float HomeX { get { return Spec.X; } }
        public float HomeZ { get { return Spec.Z; } }
        public float EffSpeed { get { return Spec.Speed * (0.75f + 0.25f * Scale); } }
        public float EffReaction { get { return Spec.Reaction * (1.35f - 0.35f * Scale); } }
        public float EffCatching
        {
            get { return System.Math.Min(0.97f, Spec.Catching * (0.8f + 0.2f * Scale)); }
        }

        public static Fielder[] DefaultField(float scale)
        {
            var field = new Fielder[FieldSetup.Default.Length];
            for (int i = 0; i < field.Length; i++)
                field[i] = new Fielder(FieldSetup.Default[i], scale);
            return field;
        }
    }

    /// <summary>Result of resolving one struck ball against the field.</summary>
    public sealed class FieldingResult
    {
        public FieldingKind Kind;
        public int Runs;
        public int FielderIndex = -1;   // -1 when nobody fielded it
        public string FielderName;
        public Vec3 Pos;
        public float Time;
        public float CollectTime = -1f;
        public float ThrowTime = -1f;
        public float CatchProbability;
        public readonly List<ChaseHint> Chased = new List<ChaseHint>();
    }

    /// <summary>Presentation hint: who chased and when (for visuals/camera).</summary>
    public struct ChaseHint
    {
        public int FielderIndex;
        public float StartTime;
        public Vec2 Target;
    }

    public static class FieldingSimulator
    {
        /// <summary>Integrates the struck ball one fixed step (shared with the
        /// presentation layer so visuals and rules agree).</summary>
        public static void StepBall(ref Vec3 pos, ref Vec3 vel, ref bool grounded, float dt)
        {
            vel.Y -= FieldingConstants.Gravity * dt;
            pos.X += vel.X * dt;
            pos.Y += vel.Y * dt;
            pos.Z += vel.Z * dt;

            if (pos.Y <= 0.055f)
            {
                pos.Y = 0.055f;
                if (vel.Y < -0.6f)              // a real bounce
                {
                    // Hard struck balls skid through: horizontal retention 0.86.
                    vel.Y = -vel.Y * 0.48f;
                    vel.X *= 0.86f;
                    vel.Z *= 0.86f;
                    if (vel.Y < 1.1f) vel.Y = 0f;
                }
                else
                {
                    vel.Y = 0f;                 // rolling: no micro-bounce loop
                }
                grounded = true;
            }

            if (grounded)
            {
                // Gentle rolling drag; bounces take the big energy losses.
                float f = 1f - 0.35f * dt;
                if (f < 0f) f = 0f;
                vel.X *= f;
                vel.Z *= f;
                float speedH = MathHelper.Hypot(vel.X, vel.Z);
                if (speedH < 0.6f) { vel.X = 0f; vel.Z = 0f; }
            }
        }

        /// <summary>Deterministic part of the catch model.</summary>
        public static float CatchProbability(Fielder f, float ballSpeedKph, float height)
        {
            float p = f.EffCatching;
            float speedFactor = 1.18f - ballSpeedKph / 130f;
            if (speedFactor < 0.25f) speedFactor = 0.25f;
            p *= speedFactor;
            float heightFactor = 1.12f - height / 9f;
            if (heightFactor < 0.4f) heightFactor = 0.4f;
            p *= heightFactor;
            if (p < 0.05f) p = 0.05f;
            if (p > 0.97f) p = 0.97f;
            return p;
        }

        /// <summary>
        /// Resolves the full flight of a struck ball against the field:
        /// catches, ground stops, boundaries and automatic running.
        /// </summary>
        public static FieldingResult Simulate(Vec3 contactPos, Vec3 velocity,
                                              Fielder[] fielders, IRng rng,
                                              float maxSeconds = 12f)
        {
            var pos = new Vec3(contactPos.X, contactPos.Y < 0.1f ? 0.1f : contactPos.Y, contactPos.Z);
            var vel = velocity;
            bool grounded = false;
            bool everBounced = false;

            int n = fielders.Length;
            var fx = new float[n];
            var fz = new float[n];
            var reactAt = new float[n];
            var stopReadyAt = new float[n];
            var chasing = new bool[n];
            var toLanding = new bool[n];
            for (int i = 0; i < n; i++)
            {
                fx[i] = fielders[i].HomeX;
                fz[i] = fielders[i].HomeZ;
                reactAt[i] = fielders[i].EffReaction + rng.NextFloat() * 0.12f;
            }

            var result = new FieldingResult();

            // Closed-form first-landing estimate (drag ignored) so fielders can
            // read the flight immediately.
            float vy0 = vel.Y;
            float disc = vy0 * vy0 + 2f * FieldingConstants.Gravity * pos.Y;
            float tLand = (vy0 + MathHelper.Sqrt(disc < 0f ? 0f : disc)) / FieldingConstants.Gravity;
            float landX = pos.X + vel.X * tLand;
            float landZ = pos.Z + vel.Z * tLand;
            float landR = MathHelper.Hypot(landX, landZ);
            bool landingRelevant = landR < FieldingConstants.Rope + 4f;

            float t = 0f;
            while (t < maxSeconds)
            {
                t += FieldingConstants.SimDt;
                StepBall(ref pos, ref vel, ref grounded, FieldingConstants.SimDt);
                if (grounded) everBounced = true;

                float distRope = MathHelper.Hypot(pos.X, pos.Z);
                if (distRope >= FieldingConstants.Rope)
                {
                    bool six = !everBounced && pos.Y > 0.05f;
                    result.Kind = six ? FieldingKind.Six : FieldingKind.Four;
                    result.Runs = six ? 6 : 4;
                    result.Pos = pos;
                    result.Time = t;
                    return result;
                }

                float speedH = MathHelper.Hypot(vel.X, vel.Z);

                for (int i = 0; i < n; i++)
                {
                    Fielder f = fielders[i];
                    if (t < reactAt[i]) continue;

                    float dx = pos.X - fx[i];
                    float dz = pos.Z - fz[i];
                    float d = MathHelper.Hypot(dx, dz);

                    // decision: chase anything reachable-ish in front, or balls
                    // in the keeper/slip corridor behind square.
                    if (!chasing[i])
                    {
                        bool worth = d < 34f ||
                            ((f.Name == "keeper" || f.Name == "slip") && pos.Z < 2f && d < 12f);
                        if (worth)
                        {
                            chasing[i] = true;
                            result.Chased.Add(new ChaseHint
                            {
                                FielderIndex = i,
                                StartTime = t,
                                Target = new Vec2(pos.X, pos.Z),
                            });
                        }
                    }
                    if (!chasing[i]) continue;

                    // choose the run target: lofted -> predicted landing spot;
                    // grounded -> lead the ball slightly.
                    if (toLanding[i] && everBounced) toLanding[i] = false;
                    if (!everBounced && landingRelevant && !toLanding[i])
                    {
                        float arrive = t + MathHelper.Hypot(landX - fx[i], landZ - fz[i]) / f.EffSpeed;
                        if (arrive <= tLand + 0.10f && MathHelper.Hypot(landX, landZ) < 46f)
                            toLanding[i] = true;
                    }
                    float tx, tz;
                    if (toLanding[i]) { tx = landX; tz = landZ; }
                    else if (grounded) { tx = pos.X + vel.X * 0.12f; tz = pos.Z + vel.Z * 0.12f; }
                    else { tx = pos.X; tz = pos.Z; }

                    float mdx = tx - fx[i];
                    float mdz = tz - fz[i];
                    float md = MathHelper.Hypot(mdx, mdz);
                    if (md > 1e-4f)
                    {
                        float step = f.EffSpeed * FieldingConstants.SimDt;
                        if (step > md) step = md;
                        fx[i] += mdx / md * step;
                        fz[i] += mdz / md * step;
                    }

                    dx = pos.X - fx[i];
                    dz = pos.Z - fz[i];
                    d = MathHelper.Hypot(dx, dz);

                    // catch attempt on a reachable high ball. A hard RISING
                    // drive cannot be caught (only blocked once it drops), but
                    // slow low edges can be snaffled on the rise.
                    if (!grounded && pos.Y >= 0.25f && pos.Y <= FieldingConstants.CatchMaxHeight
                        && d < FieldingConstants.CatchRadius)
                    {
                        float ballSpeedKph =
                            MathHelper.Sqrt(vel.X * vel.X + vel.Y * vel.Y + vel.Z * vel.Z) * 3.6f;
                        bool rising = vel.Y > 0f;
                        if (rising && !(pos.Y <= 1.6f && ballSpeedKph < 90f)) continue;

                        float p = CatchProbability(f, ballSpeedKph, pos.Y);
                        if (rng.NextFloat() < p)
                        {
                            result.Kind = FieldingKind.Caught;
                            result.Runs = 0;
                            result.FielderIndex = i;
                            result.FielderName = f.Name;
                            result.Pos = pos;
                            result.Time = t;
                            result.CatchProbability = p;
                            return result;
                        }
                        // dropped: squirts away, fielder needs to recover.
                        float deflect = (rng.NextFloat() * 2f - 1f) * 0.9f;
                        float sp = MathHelper.Hypot(vel.X, vel.Z) * 0.35f + 1.5f;
                        float ang = MathHelper.Atan2(vel.Z, vel.X) + deflect;
                        vel = new Vec3(MathHelper.Cos(ang) * sp, 0f, MathHelper.Sin(ang) * sp);
                        grounded = true;
                        reactAt[i] = t + 0.7f;
                    }
                    // ground stop: one attempt per pass (cooldown), chance
                    // scales with ground ability vs ball speed.
                    else if (grounded && d < FieldingConstants.StopRadius && speedH < 34f
                             && t >= stopReadyAt[i])
                    {
                        stopReadyAt[i] = t + 0.5f;
                        float pStop = f.Spec.Ground *
                            MathHelper.Clamp(1.25f - speedH / 34f, 0.05f, 0.97f);
                        if (rng.NextFloat() > pStop)
                        {
                            float deflect2 = (rng.NextFloat() * 2f - 1f) * 0.35f;
                            float ang2 = MathHelper.Atan2(vel.Z, vel.X) + deflect2;
                            float sp2 = speedH * 0.55f;
                            vel = new Vec3(MathHelper.Cos(ang2) * sp2, 0f, MathHelper.Sin(ang2) * sp2);
                            reactAt[i] = t + 0.45f;
                            continue;
                        }

                        float collectT = t;
                        float distHome = MathHelper.Hypot(pos.X - FieldingConstants.KeeperPos.X,
                                                          pos.Z - FieldingConstants.KeeperPos.Y);
                        float throwSpeed = f.Spec.ThrowSpeed;
                        if (throwSpeed < 12f) throwSpeed = 12f;
                        float throwTime = distHome / throwSpeed
                            * (1f + (1f - f.Spec.ThrowAcc) * rng.NextFloat() * 0.6f);
                        int runs = RunsFromTime(collectT + throwTime, rng);
                        result.Kind = FieldingKind.Stopped;
                        result.Runs = runs;
                        result.FielderIndex = i;
                        result.FielderName = f.Name;
                        result.Pos = pos;
                        result.Time = collectT;
                        result.CollectTime = collectT;
                        result.ThrowTime = throwTime;
                        return result;
                    }
                }

                // ball dies in the open field: keeper/bowler retrieve
                if (grounded && speedH < 0.4f)
                {
                    float distHome2 = MathHelper.Hypot(pos.X - FieldingConstants.KeeperPos.X,
                                                       pos.Z - FieldingConstants.KeeperPos.Y);
                    float retrieve = 1.4f + distHome2 / 6.5f;
                    int runs2 = RunsFromTime(t + retrieve, rng);
                    result.Kind = FieldingKind.Stopped;
                    result.Runs = runs2;
                    result.Pos = pos;
                    result.Time = t;
                    result.CollectTime = t;
                    result.ThrowTime = retrieve;
                    return result;
                }
            }

            // Safety net: dead ball deep in the field.
            result.Kind = FieldingKind.Stopped;
            result.Runs = 3;
            result.Pos = pos;
            result.Time = maxSeconds;
            result.CollectTime = maxSeconds;
            result.ThrowTime = 1f;
            return result;
        }

        /// <summary>Automatic running: how many runs are completed before the
        /// ball returns. Abstracted so manual running can replace it later.</summary>
        public static int RunsFromTime(float available, IRng rng)
        {
            float raw = (available - FieldingConstants.RunDelay) / FieldingConstants.TimePerRun;
            int runs = (int)raw;
            if (runs < 0) runs = 0;
            if (runs > 3) runs = 3;
            // occasionally the batters misjudge and lose one (never below 0)
            if (runs > 0 && rng.NextFloat() < 0.07f * runs) runs -= 1;
            return runs;
        }
    }

    /// <summary>Tiny math helpers so Core stays UnityEngine-free.</summary>
    public static class MathHelper
    {
        public static float Hypot(float x, float z)
        {
            return (float)System.Math.Sqrt(x * (double)x + z * (double)z);
        }
        public static float Sqrt(float v) { return (float)System.Math.Sqrt(v); }
        public static float Atan2(float y, float x) { return (float)System.Math.Atan2(y, x); }
        public static float Cos(float a) { return (float)System.Math.Cos(a); }
        public static float Sin(float a) { return (float)System.Math.Sin(a); }
        public static float Clamp(float v, float lo, float hi)
        {
            return v < lo ? lo : (v > hi ? hi : v);
        }
    }
}
