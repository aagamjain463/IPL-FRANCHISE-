# Phase 5 — Visual Design & UI/UX Implementation Record

Status: **complete**. Implements the approved Figma visual direction in the standalone
Unity game (and mirrors it in the browser preview). No gameplay system was rebuilt;
every Phase 1–4 system still runs untouched underneath. All team/venue copy is
**original and fictional** ("YOU" vs "AI", "Harbour Arena") — the Figma screens were
used only for layout, colour relationships, hierarchy and interaction patterns.

---

## 1. Design system (`UI/UITheme.cs`)

Central tokens — no magic colours in gameplay/UI scripts:

| Token | Value | Use |
|---|---|---|
| BgDark | #0A0F1A | screen clear / overlay dim |
| Panel | rgba(10,15,26,0.78) | cards, bars, chips |
| PanelBorder | white 14% | hairline borders |
| Cyan | #00D9FF | primary accent, active controls, chase info |
| Amber | #FFB300 | gold accent, striker, spell analysis, sixes |
| Danger | #FF2D55 | wickets, quit, danger panels |
| Green | #22C55E | success, perfect timing, run rates |
| TextWhite / TextDim | #F5F7FA / #8A93A6 | typography |

Type scale: 64 (result title) / 34 (card titles) / 26 (score) / 20 (labels) / 16 (sub).
Corner radii 10–14 px, animation timings 0.12–0.35 s (fade/scale/slide only).

`UiComponents.cs` builds reusable rounded panels, filled/outline/danger buttons and
outcome chips from runtime-generated rounded sprites (no art assets). `UITween`
runs fade/scale/slide tweens on **unscaled** time so menus animate while paused.

## 2. Screens (`UI/`)

- **PreMatchScreen** — dusk stadium, two crest discs (YOU cyan / AI amber), match
  chip, venue line, toss pill, gold START MATCH. Holds `Time.timeScale = 0` until
  started; camera runs a `PreMatchOrbit` on unscaled time.
- **PauseMenuScreen** — PAUSED card: RESUME (filled), CONTROLS (outline, shows the
  control guide), SETTINGS (outline panel: graphics LOW/MED/HIGH, haptics, audio),
  QUIT (danger → back to pre-match). Pause = `timeScale = 0`; tweens unscaled.
- **Match result** — Figma three-panel layout: MATCH INNINGS / PLAYER OF THE MATCH
  (computed from ball records: top run scorer or best bowler) / MATCH DETAILS,
  winner banner, PLAY AGAIN (outline) + CONTINUE TO FRANCHISE (filled, placeholder
  hook for the future web bridge).

## 3. HUDs

- **Batting** — top-centre score bar (team score + overs + striker/non-striker lines)
  fused with the cyan NEED panel; right intent column DEF/NOR/POW/LOFT (filled when
  active); left joystick ring; right swipe zone; bottom-centre delivery chip
  ("FULL · 134 KPH") + timing chip ("PERFECT TIMING", colour per tier); over-summary
  chips (0/1/2/3/4/6/W, colour-coded) bottom-right; partnership strip; pause button
  top-right. Public API unchanged — MatchController/runner untouched by the restyle.
- **Bowling** — left column of themed delivery-type buttons, line/length pad,
  bottom-centre RELEASE TIMING bar with sweet spot, right SPELL ANALYSIS panel
  (dot balls / boundaries / avg speed) fed from `HudStats`.

## 4. World & atmosphere (`World/StadiumAtmosphere.cs`)

Dusk sky gradient, two-tier stand ring with colour-noise crowd bands and a cheap
per-band sine "wave", varied advertising boards, floodlight glow quads (unlit
additive), sight screens. `QualityPresets.Apply(Low|Med|High)` toggles glow, crowd
band count, shadows and stand tier — mid-range phones stay at 60 fps. All geometry
remains primitive-based; zero new art assets, zero new draw-call-heavy systems.

## 5. Camera & audio

`CameraController` adds `PreMatchOrbit` (slow stadium sweep) and `ResultHold`
(wide celebratory frame) states with the same damped blending as gameplay states.
`GameSound` gains UiClick, UiTransition, Appeal, UmpireSignal, MatchIntro — the
placeholder manager logs them; real clips stay drop-in.

## 6. Web preview mirror

The browser preview implements the identical visual language on canvas: themed top
bar + NEED panel, intent column, chips, over-summary, boundary/wicket cards,
partnership strip, spell analysis, pre-match / pause / result screens — so the
design is verifiable live without a Unity install.

## 7. Verification

Brace-lint on every new/rewritten C# file; `node --check` + `smoke.cjs` +
`dom_smoke.cjs` green; full 166-test Python pack green (gameplay untouched).
Debug panel now starts **hidden** (toggle in pause/settings for testers).

---

## 8. Completion pass (spec audit)

Second pass closing the remaining §26 checklist items:

- **Player presentation (§6)** — `World/TeamKit.cs` (original fictional kits +
  rosters: YOU = A. Vale / J. Mercer / K. Brand in blue-cyan; AI = S. Nair /
  T. Okafor / M. Ito in amber) and `World/PlayerPresentation.cs`: helmet peak,
  pads and batting gloves on the batsman; caps on bowler + all 11 fielders;
  keeper gloves; two umpires (bowler's end + square leg). Kits swap per innings
  via `MatchController.FlowChanged`.
- **Stadium scoreboard (§4/9)** — `World/StadiumScoreboard.cs`: 3D board above
  the sightscreen, TextMesh driven directly by `SuperOverMatch` events.
- **Flags (§17)** — team-neutral waving flags on stand roofs in
  `StadiumAtmosphere`.
- **VFX (§19)** — `Game/Vfx.cs`: pooled expanding rings (gold = PERFECT, green =
  GOOD, amber = early/late, red = very poor; boundary rings at the rope) plus a
  tumbling bail-pop on wickets. Subscribed to `GameplayEvents` only.
- **HUD names (§7/9)** — striker*/non-striker + bowler names straight from
  `Innings.Striker/NonStriker`; score-update scale pop (§15); safe-area insets
  push the top bar / pause button below notches (§3).
- **Preview mirror** — same kits/caps/helmet/umpires, contact + boundary rings,
  flying bail, and batter/bowler names on the score bar.

Verification: brace-lint balanced on all touched C#; `node --check`, `smoke.cjs`,
`dom_smoke.cjs` green; 166-test Python pack green.

---

## 9. Third pass: cameras, audio cues, atmosphere depth

- **Bowling camera (§16)** — `CameraController.BowlingView`: over-the-shoulder
  bowler view for the first half-second of the run-up, blending to the gameplay
  view before release (readability preserved). Preview mirrors it with a damped
  `bowl` cam mode during the run-up.
- **Audio cues fire at real moments (§18)** — new `Game/PresentationCues.cs`
  observes `GameplayEvents`: release, bounce, bat contact vs **edge**, boundary
  four/six, wicket (+`BallOnStumps` when bowled), appeal → 0.55 s → umpire
  signal. `UiTransition` fires on pre-match / pause / result reveals. Enum grows
  `BatEdge`, `BallBounce`, `BallOnStumps`.
- **Atmospheric depth + resolution scaling (§4/§23)** — linear dusk fog fades
  the far stands; LOW preset renders at 85% resolution via `Screen.SetResolution`.

---

## 10. Fourth pass: living stadium & reactions

- **Crowd reactions (§17)** — `StadiumAtmosphere.Bind(GameplayEvents)`: boundaries
  and wickets set a decaying `crowdSurge`; crowd bands flare +45% brightness and
  flags wave ~2x faster while it lasts. Preview mirrors it: a stand ring +
  floodlight glows now render behind the field and flare on the same triggers.
- **Bowler celebration (§12)** — `PlayerPresentation.Bind`: eased raised-arm
  pump for 0.9 s after any wicket; preview bowler mirrors it.
- **Player entrance tunnel (§4)** — dark tunnel + arch under the stand behind
  the bowler.
- **Shoes (§6)** — white shoes on batsman and bowler rigs.
- **Loading screen (spec 2 Screens/)** — themed "SUPER OVER CRICKET / HARBOUR
  ARENA" boot screen that fades on real-time once the world is built
  (`WaitForSecondsRealtime`, since pre-match holds scaled time at zero).
- **Crowd ambience loop cue (§18)** fired from first bind.

---

## 11. Art pass: original generated textures (spec 2)

Five ORIGINAL AI-generated textures in `Assets/_Project/Art/Resources/Textures`
(mowed-stripe outfield grass, dry pitch clay, dusk crowd, abstract team-neutral
ad boards, 2:1 dusk sky). `World/ArtApplier.cs` loads them at runtime via
`Resources.Load` and applies: grass to the ground (12x tiling), pitch texture to
the strip, crowd texture to both stand tiers, ad texture to the perimeter
boards, and an inside-out sky dome. **Fallback-safe**: missing textures leave
the flat prototype materials untouched. The browser preview loads downscaled
copies (2 MB set) from `harness/webpreview/art/` for sky background, ground and
crowd-stand patterns, with the flat-colour fallback when images are absent
(headless smoke included).

---

## 12. Perf pass: preview anti-hang (spec 3)

Measured JS cost is ~0.1 ms/frame, so tab freezes on low-end devices come from
canvas pixel load, not logic. Mitigations in `preview.js`: DPR capped at 1.25
when `hardwareConcurrency <= 4` or `deviceMemory <= 4`; wall-clock EMA of draw
cost — sustained >34 ms steps `renderScale` down to 0.7x and sets `lowFx`,
which drops the per-frame floodlight radial gradients. Unity side keeps the
LOW/MED/HIGH presets from §7 as its own quality ladder.
