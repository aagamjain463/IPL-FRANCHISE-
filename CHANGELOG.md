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

## v2.2 — Control & Visibility Fixes

### 🏟️ Squad Pitch (Playing XI)
- The actual playing pitch strip is now a **normal-length pitch** (46px × 44% of the turf, with painted creases) — only the pitch is shortened; the ground canvas and layout stay the same.

### 🔨 Auction Completion — All Options Always Visible
- The "AUCTION FINISHED" panel now also renders whenever the auction `isCompleted` (previously it depended on the active lot being `null`, so completed/stale states could miss it).
- The panel is **portaled to `<body>`** as a fixed full-viewport overlay (`auction-complete-overlay`) with its own scroll — no parent transform, overflow or stacking context can clip it, so **"Continue With A Different Team" is visible immediately after completion AND when re-entering the auction**.

### 🎮 Matchday — Own Team Only, Per Phase
- The FC IQ Tactics tab is now **phase-gated**: while your team bats you see only "Batting Command — [Your Team]"; while it bowls you see only "Bowling Command — [Your Team]". Opponent-phase controls never render (previously both batting and bowling controls were shown for the whole match).
- Quick controller bar, DRS, Bowl Ball, Impact Sub remain user-match / own-phase only; neutral matches stay spectator (watch/sim only).

### 🏥 Injuries in Playing XI
- Injured players are now flagged on the pitch and bench cards with a red **🚑 injury badge**, plus a top alert banner listing every injured player and their status.
- **Auto-Build excludes injured players** — both the in-screen auto-build and the matchday `buildValidXI` auto-fill skip any non-fit player, so injured players never get picked into an XI.

### 🛠️ Verified
- `tsc --noEmit` clean, production build succeeds; all flows verified in headless Chromium (completion panel both paths, per-phase tactics, injury badges + auto-build exclusion).

## v2.3 — Post-Match Flow Fixes

### 🖥️ Post-Match "Media & Ceremony" — no more black screen
- `completeCurrentMatch` now pushes the real URL (`/post-match`) so the route-sync effect can't re-parse the stale `/match` path and blank the screen.
- `PostMatchPresentation` has its own route (`/post-match`); the URL, screen and the route loader all agree.

### 🎤 Press Q&A — every option answerable, no skipped questions
- Fixed the double-advance bug: `answerPressQuestion` no longer auto-advances the question index. It only records the answered option, and the view calls the new `advancePressQuestion()` when the user presses **Next Question**.
- Result: after answering Q1, Q2 loads with **all options enabled** (previously they were locked and Q2 was skipped), and the final question is answerable before concluding.

### 🏠 "Conclude & Return to Hub" — actually returns home
- `setActiveTab` now treats post-match / press conference as standalone screens and demotes them to the Dashboard hub (previously the demotion list missed them, so Conclude re-pushed `/post-match` — the loop you saw).
- Browser route sync uses an atomic `syncRouteFromPath` (screen + tab set together) so no stale state read can downgrade the destination.

### 🛠️ Verified
- `tsc --noEmit` clean, production build succeeds; full flow verified in headless Chromium: complete match → Post-Match presentation (instant, correct screen) → Press Q1 answer → Next → Q2 options enabled → answer → Conclude → Franchise Hub home.

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
