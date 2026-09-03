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
