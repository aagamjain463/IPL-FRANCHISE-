# PHASE 2 — Bowling, Ball Physics & Shot Outcomes

Status: **implemented**. Phase 1 batting architecture was *extended*, not
rebuilt. Everything deterministic still lives in `Core/` (pure C#), mirrored
1:1 by `harness/bowling_reference.py` and the browser preview
(`harness/webpreview/engine.js`).

---

## What Phase 2 adds on top of Phase 1

| Spec area | Where it lives |
| --- | --- |
| 8 stock delivery types | `Core/Bowling/DeliveryFactory.cs` (`DeliverySpec`, `BowlerPlan`) |
| Realistic trajectory (swing, seam, bounce, pitch) | `Core/Batting/DeliveryTrajectory.cs` (extended) |
| Pitch interaction | `PitchProfile` (`Core/Batting/BattingTypes.cs`) — Normal only |
| Bat-ball contact | unchanged `Core/Batting/BatBallContact.cs` |
| Shot outcome system | `Core/Batting/ShotOutcomeResolver.cs` |
| Wicket detection (bowled + simplified LBW) | `ShotOutcomeResolver` + trajectory stump plane |
| Broadcast camera states | `BattingPrototype/Camera/CameraController.cs` |
| Delivery loop + events | `BattingPrototype/Game/BattingPrototypeRunner.cs`, `GameplayEvents.cs` |
| Bowling orchestration | `Bowling/BowlingController.cs` + `BowlerProfile.cs` (ScriptableObject) |
| Debug tuning panel | `Hud/BattingDebugUI.cs` (extended) |

## Delivery types (spec section 1)

Eight stock types, each a *range* of speed/line/length/swing/seam/bounce that
the factory samples, blurred by the bowler's `Accuracy`:

`FastStraight, FastInswinger, FastOutswinger, Yorker, FullBall, GoodLength,
ShortBall, Bouncer`

Conventions (unchanged from Phase 1):
- `Line` −1 (leg) … +1 (off), `Length` 0 (full) … 1 (short)
- `Swing` −1 into the batter … +1 away (air, pre-bounce)
- `Seam` −1 into the batter … +1 away (**post-bounce** cut, new)
- `Bounce` vertical bounce-energy multiplier (≤0 ⇒ 1.0, new)

The `BowlerPlan` weights them into an over mix (default: good length heaviest,
then straight/full/short, then swing types, yorker & bouncer as change-ups).

## Trajectory model (spec section 2 + 3)

Still closed-form and deterministic. Two parabolic segments
(release→bounce, bounce→batter), with Phase 2 extensions:

- `postBounceSpeed = speed · 0.92 · pitch.PaceFactor`
- `vyAfter = −vImpact · restitution · delivery.Bounce · pitch.BounceEnergy`
- `vxAfter = swing·0.05 + seam·SeamRate(0.9 m/s) + pitch.Turn`
- optional custom `ReleaseHeight`
- `BounceTime` exposed (drives the OnBallBounced event + dust puff)

`PitchProfile { BounceEnergy, PaceFactor, Turn, Name }` ships **Normal** only;
slower / batting / spinning pitches are future data, no code change needed.

## Shot outcome resolver (spec section 5)

`ShotOutcomeResolver.Resolve(rng, trajectory, swingReport?, footX, footZ,
lbwEnabled, forcedOutcome)` → `ShotOutcomeResult { Kind, Label, Runs,
IsWicket, Forced }`.

**Unstruck ball** (no swing, or swing-and-miss):
- trajectory hits stumps → body-on-line + low impact + batter in front ⇒
  **LBW** (simplified & configurable: half-width 0.22 m, max height 0.85 m,
  foot z > −0.60), otherwise **BOWLED**
- misses stumps ⇒ **BEATEN** (swung) or **LEFT ALONE**

**Struck ball** — physics, not a lookup table:
- edge contact → classified by elevation/side into **TOP EDGE / INSIDE EDGE /
  OUTSIDE EDGE** (a hard outside edge can sneak a streaky single)
- defense → **BLOCKED** (occasionally a pushed single)
- clean/mistimed/lofted → ballistic carry
  `carry = vx·(vy + √(vy² + 2g·h₀))/g`, then
  - carry beyond rope & airborne at rope ⇒ **SIX**
  - else carry + ground roll ≥ rope ⇒ **FOUR**
  - else rest distance 45/25/9 m ⇒ three / two / single, else **DOT / MISTIMED**

Randomness is *bounded* (edge luck, streaky runs, pushed singles); distance
and outcomes are physics + timing + footwork + intent. Perfect timing is
rewarding but never guarantees a boundary.

### Feedback loops the spec asks for

- **Late timing** → big offset → low power, high edge odds, bent direction
  (existing Phase 1 math) → weak/edge outcomes.
- **Very early** → leading-edge / mistimed leg-side (direction deviation).
- **Poor footwork vs yorker** → new `IsYorker` rule in `ShotSelector`
  (length < 0.12): anything but a front-foot defence is flagged **awkward**
  (×0.6 quality, ×1.6 edge odds), and lofting a yorker is always awkward.
- **Poor positioning vs short ball** → existing awkward-pull logic →
  top-edge probability rises through the edge model.

## Wicket detection (spec section 9)

- **Bowled** — ball crosses stump plane inside stumps with no legal contact.
- **LBW (simplified)** — as above; deliberately configurable, not the full
  Laws. Expansion point: `ShotOutcomeResolver` + `Trajectory.AtStumps`.
- **Edge / catch prep** — edges emit a real physical exit velocity behind
  square, ready for a future fielding system via `GameplayEvents`.

## Events (spec section 15)

`GameplayEvents` (owned by the runner, fired throughout the loop):
`OnBallReleased, OnBallBounced, OnShotPlayed, OnBallContact, OnWicket,
OnBoundary, OnDeliveryComplete`. Future fielding/commentary/match systems
subscribe without touching the loop.

## Camera (spec section 10)

State machine: `Setup → BlendToGameplay → Gameplay → Follow / FollowLong /
Wicket → Return`.
- Pre-delivery wide broadcast view; the blend to gameplay completes during the
  run-up (never moves while you time the ball).
- Boundary shots use `FollowLong` (drifts back and up, frames the flight to
  the rope). Wickets use a short push-in on the stumps, then auto-return.
- No camera shake; all motion is damped lerps.

## Visual feedback (spec section 11)

Subtle, broadcast-inspired, no arcade clutter:
- delivery toast (type + pace), timing-coloured shot popup, PERFECT screen
  pulse, centre band for FOUR/SIX/WICKET, pitch dust puff, stump knock.

## Performance (spec section 14)

- Delivery flight stays **kinematic + analytic** (deterministic timing); only
  struck balls become dynamic Rigidbody.
- Single pooled ball, single pooled dust quad, no per-frame allocations in
  the hot path (StringBuilder reused in the debug panel, 12 Hz refresh).
- All primitives: `shadowCastingMode = Off`, one directional light, no shadows.
- Debug systems are one `SetActive(false)` away.

## Verification

- `Core.Tests/BowlingSystemTests.cs` (NUnit, runs in Unity).
- `harness/test_bowling.py` + existing suites — **95 tests** incl. a 2,500-ball
  soak asserting cricket-like strike/wicket/boundary distributions.
- `harness/webpreview/smoke.cjs` (engine parity) + `dom_smoke.cjs`
  (headless 14 s gameplay run).
