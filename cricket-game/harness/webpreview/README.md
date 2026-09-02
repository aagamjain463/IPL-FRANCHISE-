# Web preview — Phase 1 batting engine

A standalone, mobile-friendly browser preview of the Phase 1 batting control
system. **Not** part of the React app and **not** a Unity WebGL build — it is
a 1:1 JavaScript port of the deterministic engine
(`../batting_reference.py`, mirrored from `Assets/_Project/Core/Batting/`).

## Run

```bash
cd cricket-game/harness/webpreview
python3 -m http.server 4000 --bind 0.0.0.0
# open http://<host>:4000/ (best in landscape on a phone)
```

## Verify the port matches the reference

```bash
node smoke.cjs     # trajectory parity + timing/contact/bowled/dot invariants
```

## Controls

| Input | Action |
| --- | --- |
| Left thumb (touch/drag) | Dynamic joystick → analog footwork |
| Right thumb (swipe, release = shot) | Continuous shot direction; tap = straight |
| DEF / NOR / POW / LOFT | Intent (modifies the resulting shot) |
| DEBUG panel sliders | Next-ball pace / line / length / swing |
| FULL / GOOD / SHORT / RESET POS | Delivery presets / re-centre batsman |

## Files

- `engine.js` — pure engine port (trajectory, footwork, timing, direction,
  selection, contact, delivery loop). No DOM.
- `preview.js` — canvas renderer + pointer input + HUD wiring.
- `index.html` — mobile shell (`touch-action:none`, safe-area padding).
- `smoke.cjs` — Node parity tests vs the Python mirror.
