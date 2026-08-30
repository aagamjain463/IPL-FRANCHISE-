# 🏏 FRANCHISE XI 26 — The FC 26 of Cricket

A browser-based IPL franchise management game: **Own → Auction → Squad & tactics → Ball-by-ball matches → Playoffs → Off-season → Next season**, with save/load, a live mega auction, and a full dynasty loop. Built on React 19 + TypeScript + Vite + Tailwind 4 + Express — no rewrites, no fake features, everything you see is real.

## ▶️ Play

From the repo root:

```bash
npm install
npm run dev       # Express + Vite dev server → http://localhost:3000
```

Production:

```bash
npm run build     # vite build + esbuild server bundle
npm run start     # node dist/server.cjs
```

## 🎮 The Loop

1. **Main menu** — pick one of 10 real franchises; each has a distinct GM personality on the auction floor (Galactico, Moneyball, Aggressor, Patient Builder, Bowling Barracks, Batting Barrage, Rival Hunter, Scarcity Hawk, Frugal Punter).
2. **Live Mega Auction** — bid against 9 AI rivals with squad-rule enforcement (25-man cap, 8 overseas, purse math, role scarcity, phase pricing, rival-spoiler pressure bids).
3. **Squad & tactics** — XI builder with real chemistry (bonds, Indian core, role synergy, captain leadership), matchday readiness, training center, fatigue/injury management, FC IQ presets wired to live match tactics.
4. **Matches** — ball-by-ball broadcast engine: powerplays, phases, pressure, momentum, chemistry, matchups, commentary, win-probability curve, Hawk-Eye DRS, impact player, maidens, fielder credits, injury-aware bowling.
5. **Tournament** — authentic double round-robin table with NRR, Qualifier 1 / Eliminator / Qualifier 2 / Final, season awards (Orange Cap, Purple Cap, MVP, Emerging Player).
6. **Off-season** — retain/release, home-pitch selection, projected purse; then players age/develop, youth prospects arrive, and the next Mega Auction opens.

## ✨ Signature FC 26 Feel

- **Multi-screen Command Center**: dockable Live Hub (next matchday, news wire, mini table, club economy) + Focus mode; TV/SPLIT broadcast modes in live matches (persisted toggles).
- **Broadcast design system**: animated stadium aurora, glass panels, scanlines, gold/volt neon, shine hovers, FC-style dock nav and scoreboard numerals.
- **Real progression**: XP/levels, objectives, facilities (Training, Medical, Analytics) that genuinely change recovery, injury risk and form drift.

## 🧩 Tech

- `src/engine/` — deterministic-ish stochastic match engine (`cricketEngine`), auction AI (`auctionEngine`), tournament/NRR/playoffs (`tournamentEngine`), ratings/fatigue/injuries (`matchResultsEngine`), chemistry (`chemistryEngine`), dynasty/progression, save migration, FC card/PlayStyle helpers.
- `src/context/GameContext.tsx` — single game store with auto-load + migration, debounced autosave, toasts, and the full lifecycle actions.
- `server.ts` — Express: health, real-time multiplayer auction REST + SSE, AI headline/press/scout endpoints (deterministic fallbacks when no API key).
- Save key: `ipl_franchise_sim_save_v1` (localStorage), `saveVersion` 2 with migration for older saves.

## 📋 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Express + Vite HMR) |
| `npm run lint` | `tsc --noEmit` |
| `npm run build` | Production build |
| `npm run start` | Run built server |
