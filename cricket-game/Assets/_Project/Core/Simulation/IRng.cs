namespace CricketGame.Core.Simulation
{
    /// <summary>
    /// Random source abstraction so simulations can be fully deterministic
    /// (seeded) in tests and replays, while live gameplay uses the system RNG.
    /// </summary>
    public interface IRng
    {
        /// <summary>Uniform float in [0, 1).</summary>
        float NextFloat();

        /// <summary>Uniform int in [0, maxExclusive).</summary>
        int Next(int maxExclusive);
    }

    /// <summary>System.Random-backed RNG for live gameplay.</summary>
    public sealed class SystemRng : IRng
    {
        private readonly System.Random random;

        public SystemRng() { random = new System.Random(); }
        public SystemRng(int seed) { random = new System.Random(seed); }

        public float NextFloat() { return (float)random.NextDouble(); }
        public int Next(int maxExclusive) { return random.Next(maxExclusive); }
    }

    /// <summary>
    /// Deterministic xorshift64* RNG. Same seed -> same match, always.
    /// Used by tests and by any future replay/verification feature.
    /// </summary>
    public sealed class SeededRng : IRng
    {
        private ulong state;

        public SeededRng(long seed)
        {
            state = (ulong)seed;
            if (state == 0) state = 0x9E3779B97F4A7C15UL;
        }

        public float NextFloat()
        {
            ulong x = state;
            x ^= x >> 12;
            x ^= x << 25;
            x ^= x >> 27;
            state = x;
            return ((x * 0x2545F4914F6CDD1DUL) >> 40) / 16777216f; // 24-bit mantissa
        }

        public int Next(int maxExclusive)
        {
            if (maxExclusive <= 0) throw new System.ArgumentOutOfRangeException(nameof(maxExclusive));
            return (int)(NextFloat() * maxExclusive);
        }
    }
}
