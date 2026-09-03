# Phase 4 — Polish, Depth & Game Feel: Design & Implementation Record

Status: **complete**. Builds on Phases 1–3 (batting, bowling, Super Over loop) without
rebuilding them. Verified by 42 new unit tests (Python reference mirror + NUnit suite),
the full 166-test regression pack, and the browser web preview with an extended smoke
battery. Nothing in this phase touches the IPL Franchise web app.

---

## 1. Bowling depth — new delivery types & tuned behaviour

`DeliveryType` gains `OffCutter`, `LegCutter`, `SlowerBall` (11 specs total now).

| Type | Speed | Length | Signature |
|---|---|---|---|
| FAST | 136–145 | 0.35–0.60 | pace + bounce |
| IN_SWING / OUT_SWING | 128–138 | 0.15–0.50 | swing, less pace |
| YORKER | 131–140 | 0.03–0.08 | block the base |
| SHORT / BOUNCER | 132–143 | 0.72–0.95 | pull/hook pressure |
| FULL_TOSS | 124–132 | 0.00–0.15 | free scoring (punishable) |
| OFF_CUTTER / LEG_CUTTER | 112–122 | 0.40–0.60 | off-spin / leg-spin seam, opposite lateral breaks |
| SLOWER_BALL | 102–114 | 0.15–0.45 | pace-off; strong vs lofted intent |

The seam-movement table and shot-context tables (`ALLOWED_SECTORS`) were retuned so each
type plays distinctly: cutters reduce clean-strike odds, the slower ball heavily punishes
early lofted swings, short balls invite the pull/hook sectors, wide balls invite cuts.

## 2. Accuracy model & wides (spec 5–7)

`BowlingPhase4.cs` (mirrored in `phase4_reference.py` and `engine.js`):

- **Release control.** A live timing bar sweeps −1 → +1. Tapping inside the perfect window
  (`±0.03`) delivers the intended ball exactly; each unit of offset applies a scaled spray
  (half-line, sixth-length, quarter-seam) plus random scatter — early/late = trajectory
  error, easy to learn, hard to master. The AI gets its own release scatter (SD 0.062 /
  0.055 / 0.051 by difficulty).
- **Spray check.** Every delivery rolls a spray probability
  `SPRAY_RATE[difficulty] × (1 − accuracy)` (10% / 8% / 6%, capped 12%). A failed spray
  pushes the line out to 0.98–1.20 — a genuine loss of control, not a cosmetic drift.
- **Wides.** `|line| > 0.95` after release → wide: +1 run, **no legal ball**, never a
  wicket off it. Wide rate scales with difficulty and accuracy and is seeded in the soak
  tests.
- **Bowling roles** (`BowlerProfile`): FAST / SWING / VARIATION, each with pace/accuracy/
  release-consistency/scatter/allowed-types. The AI planner picks a profile by context.

## 3. Batting feel — six timing tiers (spec 3)

`TimingFeedback.cs`: `PERFECT / GOOD / EARLY / LATE / VERY_EARLY / VERY_LATE` with colour,
pitch-shake strength, vibrate pattern and UI label per tier. Timing is fully manual and
deterministic. Perfect timing boosts power (×1.12) and clean-strike odds **only on
attacking/lofted intents** — a perfect defensive block is still a defensive block; a perfect
lofted strike is genuinely dangerous. Camera FOV breathes on perfect contact.

## 4. Shot context & validation (spec 2, 4)

`ShotContext.cs` maps line × length to the realistic shot set (yorker → drives/digs/block;
full → drives/flicks/lofts; good → drives/block/controlled attack; short → pull/hook/cut;
wide → cut/square drive). An unrealistic request snaps to the nearest valid shot with an
awkward modifier — never a broken animation. `ShotAnimationResolver.cs` (pure static)
selects one of **17 animation contexts** (front/back defence, straight/cover/square drive,
cut, pull, hook, flick, leg glance, lofted drive/leg-side, leave, miss, edge, bowled) from
delivery + shot + timing; `BattingAnimationController` blends IDLE → READY → FOOTWORK →
SHOT → FOLLOW-THROUGH → RECOVERY with fast recoveries, all asset-swappable later.

## 5. AI batting archetypes (spec 8–9)

`AiBatterArchetype` = AGGRESSIVE / BALANCED / DEFENSIVE with per-archetype loft odds,
slog thresholds, caution rules and chase aggression. The planner evaluates the real chase
math (runs needed vs balls left, wickets in hand) — no artificial win-probability nudges.

## 6. AI bowling that reads the batter (spec 10)

`AiBowlingPlanner.Plan(rng, history[], context, difficulty)`:

- picks a profile (pace-heavy vs defensive chase, variation when under pressure),
- reads the batter's last six shots: repeats of a sector shift line/length away from the
  scoring zone; lofted intent draws slower balls and yorkers,
- avoids repeating a type 3+ times in a row unless it took a wicket,
- is fully deterministic per seed and tunable via difficulty.

## 7. Fielding polish (spec 11–16)

`FieldingPhase4.cs`: **catch grades** EASY / MEDIUM / DIFFICULT / EDGE from the fielder's
distance vs reach, height and closing speed; **dive decisions** (ground dive, diving catch,
boundary save) only inside dive reach (~2.6) and only when the play is on; **throw returns**
that read arm strength vs distance → flat or looping throw, errant throws past the keeper
for overthrows. Fielder attributes drive all of it; the fictional test squad ships in
`FieldSetup.Default`.

## 8. Camera & replay (spec 17–18)

`CameraController.cs` states: Setup, BlendToGameplay, Gameplay, Follow, FollowLong,
**Wicket, CatchEmphasis, FieldingFollow**, Return — smooth DampedTrack transitions, no
shake, gameplay visibility first. After a boundary, six, wicket or catch the preview runs a
**lightweight replay**: the exact stored flight info (contact point + velocity, or the
delivery path for bowled/LBW) is re-integrated on a gold ghost ball with a REPLAY tag.
Replays are short (~1.5 s) and skippable with any tap; they never store video, only the
gameplay data needed to re-fly the ball.

## 9. Presentation, audio & haptics (spec 19–22)

Score / target / required overlays, FOUR / SIX / WICKET / INNINGS COMPLETE / MATCH RESULT
banners (restrained broadcast style, original styling only), crowd band that swells with
big moments, stump knock on wickets. `AudioHooks.cs` keeps the Phase 3 shape — a `GameSound`
enum + `AudioManager` façade with one call per moment, config-replaceable audio later, no
audio files required to build. `Haptics.cs` maps tiers to subtle→strong phone vibration,
throttled, never gameplay-critical, disable-able.

## 10. Preview & UI (spec 23–24)

Bowl panel wraps cleanly at narrow/landscape sizes with large touch targets; the release
bar is tap-to-release; a debug button cycles the AI batter archetype. Aspect-safe layout
already covered in Phase 3 and preserved.

## 11. Testing

- `test_phase4.py` — 42 tests: delivery tables, release control, spray/wide gradient,
  timing tiers, shot-context validation, archetypes, bowling adaptation, catch grades,
  dives, throws, and full-match soak with wides/strategy on 120 seeds.
- `Phase4Tests.cs` — NUnit mirror asserting the same behavioural invariants.
- Web preview smoke (`smoke.cjs`) extended with a Phase 4 battery (all 11 delivery types
  produce valid deliveries; release control perfect ≠ sloppy; wide handling; legality
  never consumes balls; timing tiers ordered; shot validation; catch/dive/throw APIs;
  AI plan adapts to history).
- Regression: all 166 tests across six suites green; soak stats stable
  (first innings 297, second 422, ties 81 across 500 seeds).

## 12. Known limitations / deferred

- Replay is preview-only and ball-flight only (no multi-angle cuts).
- Graphics presets, settings menu and Training Mode are scoped but deferred — the loop
  they would tune is now fully in place.
- Audio uses hook-quality placeholders by design (spec 23–24 Phase 3 constraint carried
  forward); the enum makes real clips drop-in.
