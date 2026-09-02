# Web preview — full Super Over engine

A standalone, mobile-friendly browser preview of the cricket gameplay engine.
**Not** part of the React app and **not** a Unity WebGL build — it is a 1:1
JavaScript port of the deterministic engines (`../batting_reference.py` +
`../bowling_reference.py` + Phase 3's `../fielding_reference.py` /
`../ai_reference.py` / `../matchflow_reference.py`, mirrored from
`Assets/_Project/Core/`).

Phase 3 included: a complete playable Super Over — you bat innings 1, then
the AI chases while you bowl (LINE/LENGTH pad + FAST/SWING/YORKER/SHORT).
The 11-person field chases/catches/stops from the same simulation as Unity;
innings break + result overlays with margins and PLAY AGAIN; difficulty and
force-fielding debug toggles.

Phase 2 remains: eight delivery types from a weighted bowler plan, seam /
bounce / swing physics, pitch dust, bowled + simplified LBW, edges
(top/inside/outside), ballistic carry + roll, broadcast camera states
(delivery / boundary chase / wicket reaction) and the full debug toggle set.

## Run

```bash
cd cricket-game/harness/webpreview
python3 -m http.server 4000 --bind 0.0.0.0
# open http://<host>:4000/ (best in landscape on a phone)
```

## Verify the port matches the reference

```bash
node smoke.cjs      # trajectory/parity + factory + outcome-resolver invariants
node dom_smoke.cjs  # headless full-match run (fielding + chase + PLAY AGAIN) against a fake DOM
```

## Controls

| Input | Action |
| --- | --- |
| Left thumb (touch/drag) | Dynamic joystick → analog footwork |
| Right thumb (swipe, release = shot) | Continuous shot direction; tap = straight |
| DEF / NOR / POW / LOFT | Intent (modifies the resulting shot) |
| DEBUG panel sliders | Manual delivery pace / line / length / swing |
| FULL / GOOD / SHORT | Manual delivery presets |
| TYPE: AUTO | Cycle forced delivery type (AUTO = bowler's weighted plan) |
| OUTCOME: NONE | Cycle forced outcome (dot/1/2/4/6/edge/bowled/lbw…) |
| PERFECT / SLOW-MO / RE-BOWL | Debug toggles |
| RESET POS | Re-centre the batsman |

## Files

- `engine.js` — pure engine port (batting + bowling + outcomes). No DOM.
- `preview.js` — canvas renderer + pointer input + HUD + camera states.
- `index.html` — mobile shell (`touch-action:none`, safe-area padding).
- `smoke.cjs` — Node parity tests vs the Python mirrors.
- `dom_smoke.cjs` — headless runtime test of the whole game loop.
