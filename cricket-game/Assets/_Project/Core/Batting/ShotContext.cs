using System;

namespace CricketGame.Core.Batting
{
    /// <summary>
    /// Phase 4 shot-context validation (spec section 4). The player cannot
    /// magically play every shot from every position. If a requested direction
    /// is unbelievable for the ball's length we snap it to the NEAREST valid
    /// sector instead of producing a broken animation. Mirrors
    /// harness/phase4_reference.py (ALLOWED_SECTORS / validate_shot_request).
    /// </summary>
    public enum LengthBucket { Yorker, Full, Good, Short }

    public enum ShotFamily { Drive, Cut, Flick, Glance, Defense }

    public struct ShotContextResult
    {
        public DirectionSector Sector;
        public float AngleRad;      // possibly snapped direction
        public bool Snapped;        // true when the request was unrealistic
        public ShotFamily Family;
        public LengthBucket Bucket;
    }

    public static class ShotContext
    {
        public const float YorkerThreshold = 0.12f;

        /// <summary>Finer than the engine's 3-zone split: isolates yorkers.</summary>
        public static LengthBucket Bucket(float length)
        {
            if (length < YorkerThreshold) return LengthBucket.Yorker;
            if (length < 0.35f) return LengthBucket.Full;
            if (length < 0.72f) return LengthBucket.Good;
            return LengthBucket.Short;
        }

        /// <summary>Believable sectors for each length bucket.</summary>
        public static bool IsAllowed(LengthBucket bucket, DirectionSector s)
        {
            switch (bucket)
            {
                case LengthBucket.Yorker:
                    return s == DirectionSector.Straight || s == DirectionSector.Cover
                        || s == DirectionSector.MidWicket;
                case LengthBucket.Full:
                    return s == DirectionSector.Straight || s == DirectionSector.Cover
                        || s == DirectionSector.MidWicket || s == DirectionSector.SquareLeg
                        || s == DirectionSector.FineLeg;
                case LengthBucket.Good:
                    return s == DirectionSector.Straight || s == DirectionSector.Cover
                        || s == DirectionSector.Point || s == DirectionSector.MidWicket
                        || s == DirectionSector.SquareLeg;
                default: // Short
                    return s == DirectionSector.Straight || s == DirectionSector.Point
                        || s == DirectionSector.SquareLeg || s == DirectionSector.MidWicket
                        || s == DirectionSector.Cover || s == DirectionSector.ThirdMan
                        || s == DirectionSector.FineLeg;
            }
        }

        /// <summary>Representative angle (rad from straight) for a sector.</summary>
        public static float SectorAngle(DirectionSector s)
        {
            switch (s)
            {
                case DirectionSector.Cover: return Deg(38f);
                case DirectionSector.Point: return Deg(80f);
                case DirectionSector.ThirdMan: return Deg(128f);
                case DirectionSector.MidWicket: return Deg(-38f);
                case DirectionSector.SquareLeg: return Deg(-80f);
                case DirectionSector.FineLeg: return Deg(-128f);
                default: return 0f; // Straight
            }
        }

        public static ShotFamily FamilyOf(DirectionSector s)
        {
            switch (s)
            {
                case DirectionSector.Straight:
                case DirectionSector.Cover:
                    return ShotFamily.Drive;
                case DirectionSector.Point:
                case DirectionSector.ThirdMan:
                    return ShotFamily.Cut;
                case DirectionSector.MidWicket:
                case DirectionSector.SquareLeg:
                    return ShotFamily.Flick;
                case DirectionSector.FineLeg:
                    return ShotFamily.Glance;
                default:
                    return ShotFamily.Defense;
            }
        }

        /// <summary>Clamps a requested shot direction onto believable sectors.</summary>
        public static ShotContextResult Validate(float angleRad, float length)
        {
            LengthBucket bucket = Bucket(length);
            DirectionSector sector = ShotSelector.SectorOf(angleRad);

            if (IsAllowed(bucket, sector))
            {
                return new ShotContextResult
                {
                    Sector = sector,
                    AngleRad = angleRad,
                    Snapped = false,
                    Family = FamilyOf(sector),
                    Bucket = bucket
                };
            }

            // Snap to the nearest allowed sector by angular distance.
            DirectionSector best = DirectionSector.Straight;
            float bestDist = float.MaxValue;
            foreach (DirectionSector cand in AllSectors)
            {
                if (!IsAllowed(bucket, cand)) continue;
                float d = Math.Abs(AngleDiff(angleRad, SectorAngle(cand)));
                if (d < bestDist) { bestDist = d; best = cand; }
            }

            return new ShotContextResult
            {
                Sector = best,
                AngleRad = SectorAngle(best),
                Snapped = true,
                Family = FamilyOf(best),
                Bucket = bucket
            };
        }

        private static readonly DirectionSector[] AllSectors =
        {
            DirectionSector.FineLeg, DirectionSector.SquareLeg, DirectionSector.MidWicket,
            DirectionSector.Straight, DirectionSector.Cover, DirectionSector.Point,
            DirectionSector.ThirdMan
        };

        private static float AngleDiff(float a, float b)
        {
            float twoPi = (float)(Math.PI * 2.0);
            float d = (a - b + (float)Math.PI) % twoPi;
            if (d < 0f) d += twoPi;
            return d - (float)Math.PI;
        }

        private static float Deg(float degrees)
        {
            return degrees * (float)Math.PI / 180f;
        }
    }
}
