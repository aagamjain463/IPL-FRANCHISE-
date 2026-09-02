# Changelog

## v2.1 — Matchday & Auction Control Overhaul

### 🎮 Walkout Reveal (Home → Full Screen)
- Home "Franchise Star" Walkout button now launches the real walkout reveal on its own dedicated full-viewport screen (`fixed inset-0`, `h-dvh`), fitting the device width with zero page scrolling.
- Walkout card is auto-scaled inside a viewport-fit frame (`fc-walkout-card-frame`) so the teaser stages, card and confirm actions always fit.

### 🏟️ Squad Formation Pitch
- Matchday formation pitch moved to the top of the Playing XI screen, sitting left of the squad bench, with the team OVR header beneath.
- Pitch canvas enlarged (640–780px tall, stadium-lit turf, centre circle, painted pitch strip) and player tokens upgraded to a new bigger `pitch` card size.

### 🔨 Auction Completion Options
- After the final lot, the user stays in the Auction Room and sees three large options: **restart auction with the same team**, **restart auction with a different team** (team picker), and **play live multiplayer** — plus a "keep this squad & enter season" link.
- Sim-auction flows no longer auto-jump to the dashboard, so these options are always visible when the auction ends.

### ⚠️ Franchise Switch = Fresh Start
- Switching team from the top-left franchise switcher now shows a destructive confirmation popup: current progress is deleted and the new franchise starts from 0 at the first auction lot (₹120 Cr purse). Confirming runs a full fresh-campaign restart.
- Auction-restart confirmations include the same warning before wiping progress.

### 📺 Matchday Cleanup & Control Rules
- Removed the duplicate score tile (`premium-scorebug`) that appeared above the live match scoreboard for normal, rivalry and challenge matches.
- Managers can now only ever control **their own franchise**: opposition tactics cannot be changed (engine guard), and substitutions are limited to the user's team.
- Neutral matches where the user's team isn't playing run in **Spectator Mode** — no Bowl Ball, no substitutes, no tactics; only watch/sim controls (Sim Over / Sim Innings / Sim Match / Auto Watch) are available.

### 🛠️ Verified
- `tsc --noEmit` clean, production build succeeds.

## v2.0 — "FC 26 of Cricket" Overhaul

### 🎨 Design — FC 26 Ultra
- New global design system (`index.css`): neon volt/gold/cyan accents, glassmorphism broadcast panels, animated stadium aurora background, drifting pitch-grid, scanline overlay, shine-sweep interactions, dock navigation, and FC-style scoreboard display font (Bebas Neue + Chakra Petch + Rajdhani).
- Rebranded to **FRANCHISE XI 26** — "The FC 26 of Cricket" (title/meta/hero).
- Navbar rebuilt as an FC dock: glowing active states, shine hover, volt Matchday CTA, season indicator in the brand cluster.
- Main menu overhauled: FC hero, franchise cards now show each rival's **GM personality**, dossier + tagline, "Own → Auction → Build → Win" journey strip, glass panels everywhere (all `btn-resume`, `btn-launch-*`, `team-card-*`, `scenario-preview-*` IDs preserved).
- Secondary screens (League, Fixtures, Standings, Play Center, Club, Awards, Multiplayer rooms, Post-Match, Press, Auction) re-skinned onto the glass-panel system via shared class migration.

### 🖥️ Multi-Screen Command Center
- `MainAppLayout` now runs a true multi-screen grid: main content + **dockable Live Hub** rail (2xl screens), with a Focus/Live toggle persisted to localStorage.
- New `FCLiveHub` rail: next matchday card, auto-rotating news wire, mini league table, club economy (purse/budget/manager level/objectives) and XP progress bar.
- Season progress strip under the header: live match counter + gradient season progress bar for every screen.
- Live Match now supports **TV / SPLIT multi-screen broadcast modes** (persisted toggle): TV = scoreboard-focus layout, SPLIT = scoreboard + commentary + stats side-by-side on desktop.

### ⚙️ Gameplay & Engine (real, not cosmetic)
- **9 distinct AI bidder personalities** (`classifyAIPersonality` + `AI_PERSONALITY_PROFILES`): Galactico, Moneyball Analyst, Aggressor, Patient Builder, Bowling Barracks, Batting Barrage, Rival Hunter, Scarcity Hawk, Frugal Punter. Each archetype adjusts the valuation ceiling, war persistence, and wait/drop logic — and is shown live in the auction purse tracker.
- **Rival-spoiler bidding**: high-rivalry franchises deliberately inflate prices against the user's priority targets (up to +12% plus explicit `PRESSURE_BID` decisions).
- **FC IQ presets now actually drive the match**: applying a preset in the in-match tactical radar maps mentality/aggression/boundary plan onto live `TacticalInstructions` (batter approach, bowling plan, field setting, wicket protection).
- **Training & recovery**: one Training Center session per matchday (batting / bowling / recovery) costing club budget, scaled by facility level; new `runTrainingSession` action with toast feedback.
- **Facility-driven recovery**: Training Center boosts fitness/form, Medical Lab speeds injury recovery and cuts injury risk (per-team `medicalLabLevel`), Data Lab steadies form drift; wired through `refreshPlayersForMatchday` and `applyMatchResults`.
- Chemistry now shows the real engine score + multiplier + breakdown on Dashboard, XI builder (Chemistry Room + Matchday Readiness), and Squad (fitness pulse, chemistry, training deck).
- Season loop UI completed: Season Recap view (awards/champion/knockout road), Off-Season view (retain/release, home surface pick, projected purse, auction start), News Room (search/tags/impact ranking) — routed into the tab system and hub.

### 🛠️ Fixes
- `MatchLiveView` commentary now renders `ballInOver` correctly.
- Preview host support: Vite `allowedHosts` for `.e2b.app` so the live preview loads.
- `GlobalToast` rendered at app root; `showToast` wired across auction outbids, match completion, training and FC IQ applies.
- Verified: `tsc --noEmit` clean, production build succeeds.
