# IPL Franchise Dynasty Simulator — Audio Asset Structure

This directory houses the licensed, royalty-free audio files for the game.
The audio engine automatically detects and plays these files when present in `/public/audio/` (served at `/audio/`).
If any file is missing, the game smoothly uses its built-in zero-latency WebAudio sports synthesizer, ensuring 100% continuous dynamic audio at all times.

---

## 🎵 1. Music Tracks (`/audio/music/`)

| File Name | Intended Track | Artist | Game Mode & Purpose |
|---|---|---|---|
| `home.mp3` | **"Sports Highlights"** | Ahjay Stelino | Franchise Management Hub, Dashboard, Team Lounge |
| `play.mp3` | **"Games Music"** | Grigoriy Nuzhny | Matchday Menu, Pre-Match Setup, Schedule, Quick Play |
| `auction.mp3` | **"Trap Electro Vibes"** | Alejandro Magaña | Mega Auction Arena — Signature Bidding Theme |
| `auction_tension.mp3` | **"Epical Drums 01"** | Grigoriy Nuzhny | High-Stakes Auction Bidding (>10 Cr / Marquee Players) |
| `final.mp3` | **"Epical Drums 05"** | Grigoriy Nuzhny | IPL Final, Qualifier 1, Eliminator, Grand Stage |
| `moments.mp3` | **"Hit the Gas!"** | Michael Ramir C. | Match Moments, Clutch Over Run-Chases |
| `victory.mp3` | **Victory Theme Sting** | Royalty-Free Sports SFX | Match Win Triumphant Stinger (5–8 sec) |
| `defeat.mp3` | **Defeat Theme Sting** | Royalty-Free Sports SFX | Match Loss Stinger (3–5 sec) |
| `championship.mp3`| **IPL Dynasty Fanfare** | Royalty-Free Orchestral | IPL Championship Trophy Celebration (10–15 sec) |

---

## 🔊 2. Sound Effects (`/audio/sfx/`)

### UI Effects (`/audio/sfx/ui/`)
- `button_click.mp3` — Clean metallic/tactile button click
- `tab_select.mp3` — Smooth swish tab navigation
- `screen_transition.mp3` — High-tech whoosh transition
- `notification.mp3` — Subtle message ping

### Auction Effects (`/audio/sfx/auction/`)
- `player_reveal.mp3` — Cinematic sub-bass gong & sting for player card entry
- `bid.mp3` — Punchy electronic gavel ping for user & AI bids
- `outbid.mp3` — Alert tone when another franchise outbids you
- `high_bid.mp3` — Heavy tension chord for bids crossing 10+ Crores
- `countdown_tick.mp3` — High-frequency ticking for 5s / 4s / 3s
- `final_countdown.mp3` — Urgent heartbeat pulse for 2s / 1s ("Going Twice")
- `sold.mp3` — Resonant wooden gavel strike & broadcast stamp
- `unsold.mp3` — Soft gavel double-tap with descending tone
- `player_acquired.mp3` — Rewarding victory sound for winning a player bid

### Match Events (`/audio/sfx/match/`)
- `match_start.mp3` — Broadcast horn & stadium flare
- `bat_hit.mp3` — Crisp English willow ball impact (1–3 runs, dot balls)
- `bat_boundary.mp3` — Hard sweet-spot crack for FOUR
- `bat_six.mp3` — Thunderous maximum crack with air trail for SIX
- `wicket.mp3` — Splintering timber / stumps shattered impact
- `appeal.mp3` — Bowler & slips unison appeal roar
- `crowd_roar.mp3` — 80,000 capacity stadium eruption
- `crowd_groan.mp3` — Shocked stadium gasp on dropped catch / close wicket
- `match_win.mp3` — Fireworks and stadium horn fanfare
- `match_loss.mp3` — Stadium disappointment murmur and final whistle

### Rewards & Progression (`/audio/sfx/rewards/`)
- `reward_claim.mp3` — Crisp gold coin / crystal chime
- `level_up.mp3` — Rising synth fanfare for franchise level up
- `achievement.mp3` — Brass achievement unlock stinger
- `scout_complete.mp3` — Scouting report unlocked confirmation

---

## 🏟️ 3. Stadium Ambience (`/audio/ambience/`)
- `stadium_loop.mp3` — Low-frequency 3D stadium murmur and crowd anticipation loop
- `stadium_tension.mp3` — High-pressure murmur for death overs (16–20 ov)

---

## 💡 Notes for Adding Audio Files
1. Simply place your `.mp3` or `.ogg` audio files with the exact names listed above inside the appropriate subdirectories under `/public/audio/`.
2. The game's `AudioManager` automatically loads, mixes, crossfades, and ducks all audio with zero manual code changes required!
