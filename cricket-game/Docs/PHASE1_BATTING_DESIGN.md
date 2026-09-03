# PHASE 1 — Mobile Batting Control System (Design)

> Standalone Unity prototype. Mobile-first (Android/iOS), touch is the primary
> input. 100% original code and placeholder visuals — inspired only by the
> *depth* of modern simulation batting, no proprietary content.

## Goals

A responsive, input-agnostic batting foundation:

```
PLAYER FOOTWORK + SHOT DIRECTION + SHOT INTENT
        + BALL LINE + BALL LENGTH + TIMING
        =============================
                  FINAL SHOT
```

No one-button auto-hitting. The shot *emerges* from the combination of inputs
and the delivery.

## Architecture

```
Touch / (later: pad / keyboard)
        │  MobileBattingInput (Unity)
        ▼
  BattingInputFrame  ◄── generic struct, source-agnostic
        │
        ▼
  BattingEngine (pure C#, no UnityEngine)
   ├─ FootworkController   analog movement model, clamped crease box
   ├─ DeliveryTrajectory   deterministic ball flight from DeliveryData
   ├─ TimingSystem         swing offset → window/quality curves
   ├─ ShotDirectionResolver swipe + delivery + footwork + timing → direction
   ├─ ShotSelector          contextual shot table (no hard-coded swipes)
   └─ BatBallContact        outcome + physically plausible exit velocity
        │
        ▼
  Presentation (Unity): BallController, BatsmanRig, BatSwingController,
  BattingAnimationController, CameraController, BattingHud, BattingDebugUI
```

The engine never knows the input source. A future `KeyboardBattingInput` or
`GamepadBattingInput` just produces the same `BattingInputFrame`.

Assemblies: engine code lives in `CricketGame.Core` (`Assets/_Project/Core/Batting`,
`noEngineReferences: true`, unit-testable headlessly); Unity layer in
`CricketGame.BattingPrototype`.

## Coordinate convention

- Batsman stance center at origin, stumps at `z = -1.0`, bowler end `z ≈ +20.1`.
- Ball travels toward **-Z**. **+X = off side**, **-X = leg side** (right-hander).
- Shot direction is a normalized 2D vector on the field plane: `+Z` straight,
  `+X` cover side, `-X` leg side, `-Z` fine leg.

## Scene structure

One scene, `Assets/_Project/Scenes/BattingPrototype.unity`, containing only a
bootstrap component. At startup it builds (all procedural, zero assets):

```
BattingPrototype
├── World        ground, pitch strip, creases, stumps both ends, boundary ring
├── Batsman      rig: legs/torso/head + shoulder pivot with bat
├── Bowler       capsule rig with run-up + delivery animation
├── Ball         sphere + Rigidbody (kinematic during flight, dynamic after contact)
├── CameraRig    broadcast-style state machine camera
├── Lights       one directional light (mobile budget)
└── HUD (Canvas) scoreboard, debug panel, joystick, swipe zone, intent buttons
```

## Mobile control layout (landscape)

```
┌────────────────────────────────────────────────────────────────────────┐
│ SCORE 12/1  BALLS 4   TARGET —  REQ —              [DEF][NOR][POW][LOFT]│
│                                                                        │
│   (debug panel toggle)                                                 │
│                                                                        │
│        ◯ joystick (dynamic,        ➤ swipe zone                        │
│          spawns where the left       swipe = shot direction            │
│          thumb lands)                release = play the shot           │
└────────────────────────────────────────────────────────────────────────┘
```

- **Left thumb** — dynamic virtual joystick (analog): forward/back stride and
  leg/off movement; smooth acceleration, no teleporting.
- **Right thumb** — swipe anywhere on the right half: direction + magnitude
  are tracked continuously; **releasing** the swipe plays the shot (that
  moment is what timing is judged against). Tiny flicks/taps default to
  straight.
- **Intent** — 4 compact buttons (Defensive / Normal / Power / Lofted),
  top-right; the selected intent *modifies* the shot, it does not select it.

## Delivery (test bowler)

`DeliveryData { speedKph, line (-1..1), length (0 full .. 1 short), swing }`.
The trajectory is analytic (two parabolic segments: release → bounce →
batsman), fully deterministic, so timing is never random. The test bowler has
Full / Good / Short presets and a debug panel with sliders for pace, line,
length and swing.

## Shot selection (contextual, not hard-coded)

`ShotSelector` maps **intent × foot pose × length category × line × requested
direction sector** → shot, e.g.:

| Intent | Footwork | Ball | Direction | Result |
| --- | --- | --- | --- | --- |
| Normal | front stride | full | cover | Cover Drive |
| Normal | back foot | short | square leg | Pull |
| Normal | front | full | leg | Flick |
| Aggressive | back | short | off | Cut (hard) |
| Defensive | front | full/good | any | Front-Foot Defense |
| Lofted | front | full | straight | Lofted Straight |
| Normal | front stride | short | leg | **awkward** (forced = mistimed) |

Unrealistic combinations are flagged **awkward** and resolve as weak/mistimed
contact instead of being forced into a perfect shot.

## Timing

- Swing offset `d = (release time of swipe) − (ideal swing moment)`, where
  ideal moment = ball-arrival time minus the shot's wind-up time (defensive
  shots have shorter wind-ups than lofted ones).
- Windows: PERFECT ±35 ms · GOOD ±85 ms · EARLY/LATE ±160 ms ·
  VERY EARLY/VERY LATE ±260 ms · beyond = MISS.
- Timing deterministically scales: contact power, direction accuracy
  (early pulls toward leg, late toward off), edge probability, and below the
  window the bat misses entirely.

## Bat-ball contact

`BatBallContact` combines timing quality × reach quality (is the ball within
the batter's adjusted reach after footwork?) × swipe strength × intent:

- Outcomes: Clean / Lofted-Clean / Mistimed / Weak / Edge / Defensive-Solid /
  Miss.
- Produces an **exit velocity vector** (speed + elevation + direction noise
  scaled by lost control). The ball becomes a dynamic Rigidbody and really
  flies/rolls into the field — no teleporting to canned positions.

## Performance notes

- Analytic flight (no per-frame physics until contact), one directional light,
  primitive geometry, no per-frame allocations in the hot path (struct events,
  cached strings, throttled debug text), 60 FPS target via
  `Application.targetFrameRate`.

## Definition of Done (Phase 1)

Joystick footwork ✔ read full/good/short deliveries ✔ swipe direction ✔
intent selection ✔ manual timing (perfect/early/late/miss) ✔ contextual shots
✔ physical ball flight ✔ repeatable delivery loop ✔ debug readouts.
