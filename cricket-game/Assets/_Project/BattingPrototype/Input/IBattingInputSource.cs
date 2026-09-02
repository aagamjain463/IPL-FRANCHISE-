using CricketGame.Core.Batting;

namespace CricketGame.BattingPrototype.Input
{
    /// <summary>
    /// A source of generic batting input. Touch is the Phase 1 implementation;
    /// keyboard/gamepad adapters can be added later without touching the engine.
    /// </summary>
    public interface IBattingInputSource
    {
        /// <summary>Called once per frame by the runner.</summary>
        BattingInputFrame Sample();
    }
}
