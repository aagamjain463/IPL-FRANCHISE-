// Master Audio Catalog & Sound Engine Manifest — Vocal & Lyrical Edition
// Contains metadata for licensed vocal tracks, dynamic playlists, vocal hooks, and SFX ducking rules.

export interface MusicTrackMetadata {
  id: string;
  title: string;
  artist: string;
  mode: string;
  filePath: string;
  bpm: number;
  genre: string;
  mood: string;
  vocalStyle: 'Singing' | 'Rap' | 'Anthemic Vocal' | 'Hybrid Vocal' | 'Choir';
  lyricsHook: string;
  description: string;
  license: string;
  licenseStatus: 'Verified Licensed' | 'Royalty-Free' | 'Placeholder Required';
  isSignature?: boolean;
}

export interface VocalHookDefinition {
  id: string;
  title: string;
  text: string;
  category: 'auction' | 'match' | 'victory' | 'defeat' | 'rewards';
  filePath: string;
  formantVowels: string[];
}

export interface SoundEffectDefinition {
  id: string;
  category: 'ui' | 'auction' | 'match' | 'rewards' | 'ambience';
  filePath: string;
  priority: number; // 1 (lowest) to 5 (highest, causes music ducking)
  duckMusicPercent: number; // 0 = no duck, 0.7 = reduce music to 30%
  duckDurationMs: number;
  description: string;
}

// =========================================================================
// VOCAL SOUNDTRACK PLAYLISTS (3-5 VOCAL SONGS PER CATEGORY)
// =========================================================================

export const HOME_PLAYLIST: MusicTrackMetadata[] = [
  {
    id: 'home_watch_out',
    title: 'Watch Out',
    artist: 'Captain Qubz',
    mode: 'HOME',
    filePath: '/audio/music/watch_out.mp3',
    bpm: 126,
    genre: 'Energetic Vocal Electronic / Sports Pop',
    mood: 'Hype, confident, franchise swagger, modern arena pulse',
    vocalStyle: 'Singing',
    lyricsHook: '“Watch out, we taking the crown, turn up the stadium now!”',
    description: 'Signature Franchise Hub anthem with punchy bass, soaring vocal hooks, and infectious electronic energy.',
    license: 'Properly Licensed Game Track / Commercial Ready',
    licenseStatus: 'Verified Licensed',
    isSignature: true
  },
  {
    id: 'home_never_back_down',
    title: 'Never Back Down',
    artist: 'Apex Kings ft. J-Vocal',
    mode: 'HOME',
    filePath: '/audio/music/never_back_down.mp3',
    bpm: 124,
    genre: 'Modern Sports Vocal Rap / Trap Hybrid',
    mood: 'Focused, driven, championship mindset',
    vocalStyle: 'Rap',
    lyricsHook: '“We put the work in every night, we never back down from the fight!”',
    description: 'Hard-hitting vocal rap track with crisp 808s and anthemic brass stabs.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  },
  {
    id: 'home_rise_to_glory',
    title: 'Rise To Glory',
    artist: 'Neon Empire',
    mode: 'HOME',
    filePath: '/audio/music/rise_to_glory.mp3',
    bpm: 128,
    genre: 'High-Energy Electronic Vocal',
    mood: 'Euphoric, building, electric franchise atmosphere',
    vocalStyle: 'Singing',
    lyricsHook: '“Light up the sky, we were born to rise to glory!”',
    description: 'Soaring melodic synths backed by driving dance beats and anthemic vocals.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  }
];

export const AUCTION_PLAYLIST: MusicTrackMetadata[] = [
  {
    id: 'auction_go_hard',
    title: 'Go Hard',
    artist: 'Wes Harris, Skrxlla',
    mode: 'AUCTION',
    filePath: '/audio/music/go_hard.mp3',
    bpm: 130,
    genre: 'Aggressive Sports Hip-Hop / Rap',
    mood: 'Aggressive, competitive, fast, confident, high-stakes war room',
    vocalStyle: 'Rap',
    lyricsHook: '“Go hard or go home, big money on the throne, we ain’t backing down!”',
    description: 'The Signature Mega Auction track! Aggressive trap beats, razor-sharp rap bars, and maximum bidding adrenaline.',
    license: 'Properly Licensed Game Track / Commercial Ready',
    licenseStatus: 'Verified Licensed',
    isSignature: true
  },
  {
    id: 'auction_big_money',
    title: 'Big Money Dynasty',
    artist: 'Titan Squad ft. K-Flow',
    mode: 'AUCTION',
    filePath: '/audio/music/big_money.mp3',
    bpm: 132,
    genre: 'Trap Heavy Hip-Hop with Vocals',
    mood: 'Intense, dominant, purse power, bidding war',
    vocalStyle: 'Rap',
    lyricsHook: '“Raise the paddle, clear the floor, franchise ready for war!”',
    description: 'Heavy 808 sub-bass and aggressive vocals built for multi-crore bidding battles.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  },
  {
    id: 'auction_all_in',
    title: 'All In War Room',
    artist: 'Blaze ft. Skrxlla',
    mode: 'AUCTION',
    filePath: '/audio/music/all_in.mp3',
    bpm: 134,
    genre: 'High-Octane Rap Rock / Electronic',
    mood: 'High pressure, relentless, marquee player showdown',
    vocalStyle: 'Hybrid Vocal',
    lyricsHook: '“We going all in, no hesitation, building a champion nation!”',
    description: 'Fast-paced rhythmic rap with distorted basslines and rising tension builds.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  }
];

export const MATCH_PLAYLIST: MusicTrackMetadata[] = [
  {
    id: 'match_dreeeaaams',
    title: 'DREEEAAAMS',
    artist: 'Yarin Primak, MADNICE',
    mode: 'MATCH',
    filePath: '/audio/music/dreeeaaams.mp3',
    bpm: 126,
    genre: 'Energetic Electronic / Vocal Anthem',
    mood: 'Matchday adrenaline, stadium grandeur, peak performance',
    vocalStyle: 'Singing',
    lyricsHook: '“Chasing all my dreams, living in the spotlight, hear the stadium scream!”',
    description: 'Signature Matchday Soundtrack! Driving electronic rhythm and soaring vocal chorus that makes every ball feel massive.',
    license: 'Properly Licensed Game Track / Commercial Ready',
    licenseStatus: 'Verified Licensed',
    isSignature: true
  },
  {
    id: 'match_thunder_pitch',
    title: 'Thunder On The Pitch',
    artist: 'HyperDrive ft. Sarah Cole',
    mode: 'MATCH',
    filePath: '/audio/music/thunder_pitch.mp3',
    bpm: 128,
    genre: 'Punchy Electronic Rock Vocal',
    mood: 'Fast, electric, boundary barrage',
    vocalStyle: 'Singing',
    lyricsHook: '“Feel the thunder on the pitch, lights flashing in the night!”',
    description: 'Heavy guitar riffs with punchy 4-on-the-floor kicks and dynamic vocal chants.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  },
  {
    id: 'match_electric_roar',
    title: 'Electric Roar',
    artist: 'Pulse Fire',
    mode: 'MATCH',
    filePath: '/audio/music/electric_roar.mp3',
    bpm: 125,
    genre: 'Stadium Dance / Pop Vocal',
    mood: 'Celebratory, thrilling, IPL carnival atmosphere',
    vocalStyle: 'Singing',
    lyricsHook: '“Stand up, make some noise, this is our moment!”',
    description: 'Infectious stadium pop with singalong choruses and crisp brass drops.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  }
];

export const MOMENTS_PLAYLIST: MusicTrackMetadata[] = [
  {
    id: 'moments_lucky_all_day',
    title: 'Lucky All Day',
    artist: 'Mazbou Q',
    mode: 'MOMENTS',
    filePath: '/audio/music/lucky_all_day.mp3',
    bpm: 136,
    genre: 'Energetic Vocal Hip-Hop / Grime',
    mood: 'Clutch pressure, fast-paced chase, ultimate self-belief',
    vocalStyle: 'Rap',
    lyricsHook: '“Lucky all day, pressure in my veins, step up to the plate, we own the game!”',
    description: 'Signature Match Moments Track! Rapid lyrical delivery and heart-pumping beats for death-over run chases.',
    license: 'Properly Licensed Game Track / Commercial Ready',
    licenseStatus: 'Verified Licensed',
    isSignature: true
  },
  {
    id: 'moments_clutch_over',
    title: 'Clutch Over Time',
    artist: 'Iron Strike ft. Mazbou Q',
    mode: 'MOMENTS',
    filePath: '/audio/music/clutch_over.mp3',
    bpm: 140,
    genre: 'Intense Rap Rock / Drum & Bass Hybrid',
    mood: 'Final over emergency, need 12 from 6, relentless pulse',
    vocalStyle: 'Hybrid Vocal',
    lyricsHook: '“Last over on the line, ice in my blood, this is our time!”',
    description: 'Breakneck 140 BPM tempo designed to escalate in pitch and intensity on the final deliveries.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  }
];

export const FINAL_PLAYLIST: MusicTrackMetadata[] = [
  {
    id: 'final_anthem_required',
    title: 'FINAL_ANTHEM_REQUIRED (Champions of India)',
    artist: 'Empire Stadium Choir & Orchestra',
    mode: 'FINAL',
    filePath: '/audio/music/final_anthem.mp3',
    bpm: 130,
    genre: 'Massive Stadium Vocal Anthem / Cinematic 808',
    mood: 'Grand, epic, monumental, championship decider, history in the making',
    vocalStyle: 'Anthemic Vocal',
    lyricsHook: '“We stand as one, until the battle’s won, crowned in the golden light!”',
    description: 'The ultimate IPL Final anthem! Huge vocal choruses, cinematic timpani, earth-shaking 808 drops, and 100,000 fan chants.',
    license: 'Audio Placeholder — Place Licensed Stadium Anthem in /public/audio/music/final_anthem.mp3',
    licenseStatus: 'Placeholder Required',
    isSignature: true
  },
  {
    id: 'final_glory_forever',
    title: 'Glory Forever',
    artist: 'Apex Anthem Crew',
    mode: 'FINAL',
    filePath: '/audio/music/glory_forever.mp3',
    bpm: 128,
    genre: 'Arena Rock & Vocal Choir',
    mood: 'Immortal, legendary, trophy presentation atmosphere',
    vocalStyle: 'Choir',
    lyricsHook: '“History remembers the brave, we hold the cup high!”',
    description: 'Sweeping choral harmonies and massive snare impacts built for playoffs and trophy lifts.',
    license: 'Royalty-Free Commercial License',
    licenseStatus: 'Royalty-Free'
  }
];

// Single lookup map for all tracks
export const SOUNDTRACK_MANIFEST: Record<string, MusicTrackMetadata> = {
  ...Object.fromEntries(HOME_PLAYLIST.map(t => [t.id, t])),
  ...Object.fromEntries(AUCTION_PLAYLIST.map(t => [t.id, t])),
  ...Object.fromEntries(MATCH_PLAYLIST.map(t => [t.id, t])),
  ...Object.fromEntries(MOMENTS_PLAYLIST.map(t => [t.id, t])),
  ...Object.fromEntries(FINAL_PLAYLIST.map(t => [t.id, t])),
  // Legacy aliases
  home: HOME_PLAYLIST[0],
  play: MATCH_PLAYLIST[0],
  auction: AUCTION_PLAYLIST[0],
  auction_tension: AUCTION_PLAYLIST[1],
  final: FINAL_PLAYLIST[0],
  moments: MOMENTS_PLAYLIST[0]
};

// =========================================================================
// VOCAL CELEBRATION HOOKS (SHORT IMPACTFUL VOCAL STINGERS)
// =========================================================================

export const VOCAL_HOOKS_MANIFEST: Record<string, VocalHookDefinition> = {
  sold_acquired: {
    id: 'sold_acquired',
    title: 'Sold! He’s Yours!',
    text: '“SOLD! HE’S YOURS! WELCOME TO THE SQUAD!”',
    category: 'auction',
    filePath: '/audio/vocal_hooks/sold_acquired.mp3',
    formantVowels: ['O', 'A', 'E', 'U']
  },
  player_reveal_marquee: {
    id: 'player_reveal_marquee',
    title: 'Marquee Superstar Reveal',
    text: '“ON THE STAGE! MAKE SOME NOISE!”',
    category: 'auction',
    filePath: '/audio/vocal_hooks/player_reveal.mp3',
    formantVowels: ['A', 'O', 'I']
  },
  six_maximum: {
    id: 'six_maximum',
    title: 'That’s Outta Here!',
    text: '“OUTTA THE PARK! WHAT A MASSIVE SIX!”',
    category: 'match',
    filePath: '/audio/vocal_hooks/six_maximum.mp3',
    formantVowels: ['A', 'U', 'I']
  },
  wicket_boom: {
    id: 'wicket_boom',
    title: 'Clean Bowled!',
    text: '“CLEAN BOWLED! TIMBER SHATTERED!”',
    category: 'match',
    filePath: '/audio/vocal_hooks/wicket_boom.mp3',
    formantVowels: ['E', 'O', 'A']
  },
  victory_champions: {
    id: 'victory_champions',
    title: 'We Are Champions!',
    text: '“VICTORY! WE ARE THE CHAMPIONS OF INDIA!”',
    category: 'victory',
    filePath: '/audio/vocal_hooks/champions_anthem.mp3',
    formantVowels: ['I', 'O', 'A', 'E']
  },
  defeat_motivation: {
    id: 'defeat_motivation',
    title: 'We Rise Again',
    text: '“DUST IT OFF! WE COME BACK STRONGER!”',
    category: 'defeat',
    filePath: '/audio/vocal_hooks/defeat_motivation.mp3',
    formantVowels: ['U', 'A', 'O']
  }
};

// =========================================================================
// SFX MANIFEST WITH DUCKING PRIORITIES
// =========================================================================

export const SFX_MANIFEST: Record<string, SoundEffectDefinition> = {
  // UI
  buttonClick: {
    id: 'buttonClick',
    category: 'ui',
    filePath: '/audio/sfx/ui/button_click.mp3',
    priority: 1,
    duckMusicPercent: 0,
    duckDurationMs: 0,
    description: 'Crisp tactile UI click'
  },
  tabSelect: {
    id: 'tabSelect',
    category: 'ui',
    filePath: '/audio/sfx/ui/tab_select.mp3',
    priority: 1,
    duckMusicPercent: 0,
    duckDurationMs: 0,
    description: 'Subtle tab switch swoosh'
  },

  // Auction
  playerReveal: {
    id: 'playerReveal',
    category: 'auction',
    filePath: '/audio/sfx/auction/player_reveal.mp3',
    priority: 4,
    duckMusicPercent: 0.7,
    duckDurationMs: 1200,
    description: 'Cinematic sub-bass impact and player card reveal with vocal drop'
  },
  bid: {
    id: 'bid',
    category: 'auction',
    filePath: '/audio/sfx/auction/bid.mp3',
    priority: 2,
    duckMusicPercent: 0.15,
    duckDurationMs: 300,
    description: 'Crisp paddle bid confirmation'
  },
  outbid: {
    id: 'outbid',
    category: 'auction',
    filePath: '/audio/sfx/auction/outbid.mp3',
    priority: 3,
    duckMusicPercent: 0.45,
    duckDurationMs: 500,
    description: 'Sharp alarm and descending tension tone when outbid'
  },
  highBid: {
    id: 'highBid',
    category: 'auction',
    filePath: '/audio/sfx/auction/high_bid.mp3',
    priority: 4,
    duckMusicPercent: 0.6,
    duckDurationMs: 800,
    description: 'High-stakes escalation chord and riser for 10+ Cr bids'
  },
  countdownTick: {
    id: 'countdownTick',
    category: 'auction',
    filePath: '/audio/sfx/auction/countdown_tick.mp3',
    priority: 3,
    duckMusicPercent: 0.35,
    duckDurationMs: 350,
    description: 'High-precision heartbeat timer tick for 3.. 2.. 1..'
  },
  sold: {
    id: 'sold',
    category: 'auction',
    filePath: '/audio/sfx/auction/sold.mp3',
    priority: 5,
    duckMusicPercent: 0.95, // Dead silence before gavel!
    duckDurationMs: 2000,
    description: 'Fraction of second silence -> Authoritative gavel hammer -> Stadium cheer -> Vocal hook'
  },
  unsold: {
    id: 'unsold',
    category: 'auction',
    filePath: '/audio/sfx/auction/unsold.mp3',
    priority: 3,
    duckMusicPercent: 0.4,
    duckDurationMs: 600,
    description: 'Soft double gavel knock for unsold player'
  },
  playerAcquired: {
    id: 'playerAcquired',
    category: 'auction',
    filePath: '/audio/sfx/auction/player_acquired.mp3',
    priority: 5,
    duckMusicPercent: 0.85,
    duckDurationMs: 2400,
    description: 'Triumphant vocal stinger and gold confetti celebration'
  },

  // Match
  matchStart: {
    id: 'matchStart',
    category: 'match',
    filePath: '/audio/sfx/match/match_start.mp3',
    priority: 4,
    duckMusicPercent: 0.7,
    duckDurationMs: 1400,
    description: 'Cinematic broadcast intro flare, stadium horn, and crowd roar'
  },
  batHit: {
    id: 'batHit',
    category: 'match',
    filePath: '/audio/sfx/match/bat_hit.mp3',
    priority: 2,
    duckMusicPercent: 0.1,
    duckDurationMs: 200,
    description: 'English willow ball impact'
  },
  boundaryFour: {
    id: 'boundaryFour',
    category: 'match',
    filePath: '/audio/sfx/match/bat_boundary.mp3',
    priority: 4,
    duckMusicPercent: 0.6,
    duckDurationMs: 1200,
    description: 'Solid crack + medium crowd cheer + boundary sting'
  },
  boundarySix: {
    id: 'boundarySix',
    category: 'match',
    filePath: '/audio/sfx/match/bat_six.mp3',
    priority: 5,
    duckMusicPercent: 0.8,
    duckDurationMs: 2000,
    description: 'Massive maximum sweet-spot impact + huge crowd roar + vocal hype'
  },
  wicket: {
    id: 'wicket',
    category: 'match',
    filePath: '/audio/sfx/match/wicket.mp3',
    priority: 5,
    duckMusicPercent: 0.85,
    duckDurationMs: 2200,
    description: 'Timber shattered stump sound + crowd shock/roar'
  },
  appeal: {
    id: 'appeal',
    category: 'match',
    filePath: '/audio/sfx/match/appeal.mp3',
    priority: 3,
    duckMusicPercent: 0.35,
    duckDurationMs: 700,
    description: 'Loud HOWZAT appeal from bowler & cordon'
  },
  matchWin: {
    id: 'matchWin',
    category: 'match',
    filePath: '/audio/sfx/match/match_win.mp3',
    priority: 5,
    duckMusicPercent: 0.9,
    duckDurationMs: 3200,
    description: 'Victory explosion + vocal hook + triumphant celebration stinger'
  },
  matchLoss: {
    id: 'matchLoss',
    category: 'match',
    filePath: '/audio/sfx/match/match_loss.mp3',
    priority: 4,
    duckMusicPercent: 0.65,
    duckDurationMs: 1800,
    description: 'Short emotional vocal sting with immediate motivational bounce-back'
  },
  championshipWin: {
    id: 'championshipWin',
    category: 'match',
    filePath: '/audio/sfx/match/championship.mp3',
    priority: 5,
    duckMusicPercent: 0.95,
    duckDurationMs: 5000,
    description: 'Grand IPL Trophy celebration fanfare + stadium fireworks and vocal anthem'
  },

  // Rewards
  rewardClaim: {
    id: 'rewardClaim',
    category: 'rewards',
    filePath: '/audio/sfx/rewards/reward_claim.mp3',
    priority: 3,
    duckMusicPercent: 0.35,
    duckDurationMs: 600,
    description: 'Satisfying gold coin / crystal chime'
  },
  levelUp: {
    id: 'levelUp',
    category: 'rewards',
    filePath: '/audio/sfx/rewards/level_up.mp3',
    priority: 4,
    duckMusicPercent: 0.6,
    duckDurationMs: 1400,
    description: 'Level up triumphant chime, vocal drop, and bass swell'
  },
  achievementUnlock: {
    id: 'achievementUnlock',
    category: 'rewards',
    filePath: '/audio/sfx/rewards/achievement.mp3',
    priority: 5,
    duckMusicPercent: 0.7,
    duckDurationMs: 1800,
    description: 'Cinematic achievement fanfare & anthem stinger'
  }
};
