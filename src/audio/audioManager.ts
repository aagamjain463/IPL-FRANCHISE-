// Master Global Audio Engine for IPL Franchise Dynasty Simulator — Vocal & Lyrical Edition
// Features: Real-file loading with crossfading, Vocal Formant & 808 Synth fallbacks,
// Dynamic Multi-Track Playlists, Dynamic Auction Intensity & 150ms Dead-Stop Sold Sequence,
// Stadium Crowd Busses, Audio Ducking on Major Events, and Persistent Audio Settings.

import { 
  SOUNDTRACK_MANIFEST, 
  SFX_MANIFEST, 
  VOCAL_HOOKS_MANIFEST,
  HOME_PLAYLIST, 
  AUCTION_PLAYLIST, 
  MATCH_PLAYLIST, 
  MOMENTS_PLAYLIST, 
  FINAL_PLAYLIST, 
  MusicTrackMetadata, 
  VocalHookDefinition 
} from './audioManifest';

export type AudioStateMode = 
  | 'HOME'            // "Watch Out" — Captain Qubz
  | 'PLAY'            // "DREEEAAAMS" — Yarin Primak, MADNICE
  | 'AUCTION'         // "Go Hard" — Wes Harris, Skrxlla
  | 'AUCTION_TENSION' // High Stakes Bidding War
  | 'FINAL'           // "FINAL_ANTHEM_REQUIRED (Champions of India)"
  | 'MOMENTS'         // "Lucky All Day" — Mazbou Q
  | 'MATCH'           // Live Match Broadcast / Gameplay
  | 'MATCH_MOMENT'    // Clutch Over Chase
  | 'BIG_MATCH'       // Playoffs / Finals Match
  | 'REWARD'          // Trophy & Rewards Center
  | 'RESULT'          // Post Match Wrap
  | 'MENU';           // Main Menu

export type AudioMode = AudioStateMode;

export interface AudioSettings {
  masterVolume: number;       // 0.0 - 1.0
  musicVolume: number;        // 0.0 - 1.0
  sfxVolume: number;          // 0.0 - 1.0
  crowdVolume: number;        // 0.0 - 1.0
  commentaryVolume: number;   // 0.0 - 1.0
  isMusicEnabled: boolean;
  isSfxEnabled: boolean;
  isCrowdEnabled: boolean;
  isCommentaryEnabled: boolean;
}

const STORAGE_KEY = 'ipl_dynasty_vocal_audio_settings_v4';

class GlobalAudioManager {
  private ctx: AudioContext | null = null;
  private currentMode: AudioStateMode = 'HOME';
  private previousMode: AudioStateMode = 'HOME';

  // Gain Busses for professional sports broadcast mixing hierarchy
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private commentaryGain: GainNode | null = null;

  // Real Audio Elements cache & active HTML5 audio stream
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentTrackMetadata: MusicTrackMetadata = HOME_PLAYLIST[0];
  
  // Playlist tracking (prevent playing the same song consecutively)
  private currentTrackIndices: Record<string, number> = {
    HOME: 0,
    AUCTION: 0,
    MATCH: 0,
    MOMENTS: 0,
    FINAL: 0
  };

  // Dynamic Procedural Vocal/Synth sequencer state (Instant zero-silence fallback)
  private isMusicPlaying: boolean = false;
  private musicStep: number = 0;
  private musicIntervalId: any = null;
  private auctionTensionState: 1 | 2 | 3 | 4 = 1; // 1 = Normal, 2 = Active Bidding, 3 = High Stakes, 4 = Final Countdown
  private matchMomentsRunsNeeded: number = 20;
  private matchMomentsBallsLeft: number = 12;

  // Stadium Crowd Ambience State
  private crowdLoopNode: AudioNode | null = null;
  private crowdGainNode: GainNode | null = null;

  // Ducking Management
  private duckTimeoutId: any = null;
  private isDucked: boolean = false;

  // Live Lyrics / Vocal Hook Broadcast Subscriptions
  private currentLiveLyric: string = HOME_PLAYLIST[0].lyricsHook;

  private settings: AudioSettings = {
    masterVolume: 0.85,
    musicVolume: 0.55,
    sfxVolume: 0.85,
    crowdVolume: 0.65,
    commentaryVolume: 0.75,
    isMusicEnabled: true,
    isSfxEnabled: true,
    isCrowdEnabled: true,
    isCommentaryEnabled: true,
  };

  private listeners: Array<() => void> = [];
  private hasInteracted: boolean = false;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        this.hasInteracted = true;
        if (this.settings.isMusicEnabled && !this.isMusicPlaying) {
          this.playMusic();
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        this.notify();
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  // --- INITIALIZATION & BUS SETUP ---
  private init(): boolean {
    if (this.ctx) return true;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return false;
      this.ctx = new AudioContextClass();

      // 1. Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 2. Music Gain Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.settings.isMusicEnabled ? this.settings.musicVolume : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // 3. SFX Gain Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.settings.isSfxEnabled ? this.settings.sfxVolume : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // 4. Crowd Gain Bus
      this.crowdGain = this.ctx.createGain();
      this.crowdGain.gain.setValueAtTime(this.settings.isCrowdEnabled ? this.settings.crowdVolume : 0, this.ctx.currentTime);
      this.crowdGain.connect(this.masterGain);

      // 5. Commentary Gain Bus
      this.commentaryGain = this.ctx.createGain();
      this.commentaryGain.gain.setValueAtTime(this.settings.isCommentaryEnabled ? this.settings.commentaryVolume : 0, this.ctx.currentTime);
      this.commentaryGain.connect(this.masterGain);

      this.startStadiumCrowdAmbience();
      return true;
    } catch {
      return false;
    }
  }

  // --- SETTINGS STORAGE & PERSISTENCE ---
  private loadSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }

  private saveSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch {}
    });
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public getCurrentMode(): AudioStateMode {
    return this.currentMode;
  }

  public getIsMusicPlaying(): boolean {
    return this.isMusicPlaying && this.settings.isMusicEnabled;
  }

  public isMuted(): boolean {
    return this.settings.masterVolume === 0;
  }

  public getCurrentTrackMetadata(): MusicTrackMetadata {
    return this.currentTrackMetadata;
  }

  public getCurrentLiveLyric(): string {
    return this.currentLiveLyric || this.currentTrackMetadata.lyricsHook;
  }

  public getPlaylistForMode(mode: AudioStateMode): MusicTrackMetadata[] {
    switch (mode) {
      case 'HOME':
      case 'MENU':
      case 'REWARD':
        return HOME_PLAYLIST;
      case 'AUCTION':
      case 'AUCTION_TENSION':
        return AUCTION_PLAYLIST;
      case 'PLAY':
      case 'MATCH':
      case 'RESULT':
        return MATCH_PLAYLIST;
      case 'MOMENTS':
      case 'MATCH_MOMENT':
        return MOMENTS_PLAYLIST;
      case 'FINAL':
      case 'BIG_MATCH':
        return FINAL_PLAYLIST;
      default:
        return HOME_PLAYLIST;
    }
  }

  // --- VOLUME & TOGGLE CONTROLS ---
  public setMasterVolume(v: number) {
    const val = Math.max(0, Math.min(1, v));
    this.settings.masterVolume = val;
    this.saveSettings();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.settings.isMusicEnabled ? this.settings.musicVolume * val : 0;
    }
    this.notify();
  }

  public setMusicVolume(v: number) {
    const val = Math.max(0, Math.min(1, v));
    this.settings.musicVolume = val;
    this.saveSettings();
    if (this.musicGain && this.ctx && !this.isDucked) {
      const target = this.settings.isMusicEnabled ? val : 0;
      this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.volume = this.settings.isMusicEnabled ? val * this.settings.masterVolume : 0;
    }
    this.notify();
  }

  public setSfxVolume(v: number) {
    const val = Math.max(0, Math.min(1, v));
    this.settings.sfxVolume = val;
    this.saveSettings();
    if (this.sfxGain && this.ctx) {
      const target = this.settings.isSfxEnabled ? val : 0;
      this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public setCrowdVolume(v: number) {
    const val = Math.max(0, Math.min(1, v));
    this.settings.crowdVolume = val;
    this.saveSettings();
    if (this.crowdGain && this.ctx) {
      const target = this.settings.isCrowdEnabled ? val : 0;
      this.crowdGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public setCommentaryVolume(v: number) {
    const val = Math.max(0, Math.min(1, v));
    this.settings.commentaryVolume = val;
    this.saveSettings();
    if (this.commentaryGain && this.ctx) {
      const target = this.settings.isCommentaryEnabled ? val : 0;
      this.commentaryGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public toggleMusic(): boolean {
    this.settings.isMusicEnabled = !this.settings.isMusicEnabled;
    this.saveSettings();
    if (this.settings.isMusicEnabled) {
      this.playMusic();
    } else {
      this.stopMusic();
    }
    this.notify();
    return this.settings.isMusicEnabled;
  }

  public toggleSfx(): boolean {
    this.settings.isSfxEnabled = !this.settings.isSfxEnabled;
    this.saveSettings();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.settings.isSfxEnabled ? this.settings.sfxVolume : 0, this.ctx.currentTime, 0.05);
    }
    this.notify();
    return this.settings.isSfxEnabled;
  }

  public toggleCrowd(): boolean {
    this.settings.isCrowdEnabled = !this.settings.isCrowdEnabled;
    this.saveSettings();
    if (this.crowdGain && this.ctx) {
      this.crowdGain.gain.setTargetAtTime(this.settings.isCrowdEnabled ? this.settings.crowdVolume : 0, this.ctx.currentTime, 0.05);
    }
    this.notify();
    return this.settings.isCrowdEnabled;
  }

  public toggleCommentary(): boolean {
    this.settings.isCommentaryEnabled = !this.settings.isCommentaryEnabled;
    this.saveSettings();
    if (this.commentaryGain && this.ctx) {
      this.commentaryGain.gain.setTargetAtTime(this.settings.isCommentaryEnabled ? this.settings.commentaryVolume : 0, this.ctx.currentTime, 0.05);
    }
    this.notify();
    return this.settings.isCommentaryEnabled;
  }

  public toggleMute(): boolean {
    if (this.settings.masterVolume > 0) {
      this.setMasterVolume(0);
      return true;
    } else {
      this.setMasterVolume(0.85);
      return false;
    }
  }

  // --- AUDIO DUCKING ON HIGH PRIORITY BROADCAST EVENTS ---
  public duckMusic(duckPercent: number = 0.6, durationMs: number = 1000) {
    if (!this.ctx || !this.musicGain || !this.settings.isMusicEnabled) return;
    
    if (this.duckTimeoutId) {
      clearTimeout(this.duckTimeoutId);
    }

    this.isDucked = true;
    const normalVol = this.settings.musicVolume;
    const duckedVol = normalVol * (1 - duckPercent);

    this.musicGain.gain.setTargetAtTime(duckedVol, this.ctx.currentTime, 0.03);

    if (this.currentAudioElement) {
      this.currentAudioElement.volume = duckedVol * this.settings.masterVolume;
    }

    this.duckTimeoutId = setTimeout(() => {
      if (this.ctx && this.musicGain && this.settings.isMusicEnabled) {
        this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, this.ctx.currentTime, 0.25);
      }
      if (this.currentAudioElement && this.settings.isMusicEnabled) {
        this.currentAudioElement.volume = this.settings.musicVolume * this.settings.masterVolume;
      }
      this.isDucked = false;
      this.duckTimeoutId = null;
    }, durationMs);
  }

  // --- PLAYLIST SELECTION & NON-REPETITIVE SHUFFLING ---
  private pickNextTrackForMode(mode: AudioStateMode, advance: boolean = false): MusicTrackMetadata {
    const playlist = this.getPlaylistForMode(mode);
    const key = mode.startsWith('AUCTION') ? 'AUCTION' : mode.startsWith('MATCH') || mode === 'PLAY' ? 'MATCH' : mode.startsWith('MOMENT') ? 'MOMENTS' : mode.startsWith('FINAL') ? 'FINAL' : 'HOME';
    
    let currentIndex = this.currentTrackIndices[key] || 0;
    if (advance) {
      currentIndex = (currentIndex + 1) % playlist.length;
      this.currentTrackIndices[key] = currentIndex;
    }

    const track = playlist[currentIndex] || playlist[0];
    return track;
  }

  public nextTrack() {
    const track = this.pickNextTrackForMode(this.currentMode, true);
    this.currentTrackMetadata = track;
    this.currentLiveLyric = track.lyricsHook;
    this.playTrackOrSynthesizer(track);
    this.notify();
  }

  public prevTrack() {
    const playlist = this.getPlaylistForMode(this.currentMode);
    const key = this.currentMode.startsWith('AUCTION') ? 'AUCTION' : this.currentMode.startsWith('MATCH') || this.currentMode === 'PLAY' ? 'MATCH' : this.currentMode.startsWith('MOMENT') ? 'MOMENTS' : this.currentMode.startsWith('FINAL') ? 'FINAL' : 'HOME';
    let currentIndex = (this.currentTrackIndices[key] || 0) - 1;
    if (currentIndex < 0) currentIndex = playlist.length - 1;
    this.currentTrackIndices[key] = currentIndex;
    
    const track = playlist[currentIndex] || playlist[0];
    this.currentTrackMetadata = track;
    this.currentLiveLyric = track.lyricsHook;
    this.playTrackOrSynthesizer(track);
    this.notify();
  }

  // --- MODE SWITCHING & SMOOTH CROSSFADES ---
  public setAudioMode(mode: AudioStateMode) {
    if (this.currentMode === mode) return;
    this.previousMode = this.currentMode;
    this.currentMode = mode;

    // Reset auction tension state if leaving auction
    if (mode !== 'AUCTION' && mode !== 'AUCTION_TENSION') {
      this.auctionTensionState = 1;
    }

    const nextTrack = this.pickNextTrackForMode(mode, false);
    this.currentTrackMetadata = nextTrack;
    this.currentLiveLyric = nextTrack.lyricsHook;

    if (this.settings.isMusicEnabled) {
      this.playTrackOrSynthesizer(nextTrack);
    }
    this.notify();
  }

  private playTrackOrSynthesizer(track: MusicTrackMetadata) {
    this.init();
    if (!this.settings.isMusicEnabled) return;

    // Attempt to load and stream real audio file if present
    this.tryPlayAudioFile(track.filePath, () => {
      // Fallback: Start high-definition procedural vocal/808 synthesizer loop
      this.startSynthesizedMusicLoop();
    });
  }

  private tryPlayAudioFile(url: string, onFallback: () => void) {
    if (typeof window === 'undefined') return;

    let audio = this.audioElements.get(url);
    if (!audio) {
      audio = new Audio(url);
      audio.loop = true;
      this.audioElements.set(url, audio);
    }

    if (this.currentAudioElement && this.currentAudioElement !== audio) {
      this.currentAudioElement.pause();
    }

    this.currentAudioElement = audio;
    audio.volume = this.settings.isMusicEnabled ? this.settings.musicVolume * this.settings.masterVolume : 0;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Successfully playing audio file!
          this.isMusicPlaying = true;
          // Stop synth generator to avoid overlay
          if (this.musicIntervalId) {
            clearInterval(this.musicIntervalId);
            this.musicIntervalId = null;
          }
        })
        .catch(() => {
          // File not present or autoplay blocked -> seamlessly run our sports vocal/808 synth!
          onFallback();
        });
    }
  }

  public playMusic() {
    if (!this.settings.isMusicEnabled) return;
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.currentTrackMetadata = this.pickNextTrackForMode(this.currentMode, false);
    this.currentLiveLyric = this.currentTrackMetadata.lyricsHook;
    this.playTrackOrSynthesizer(this.currentTrackMetadata);
    this.isMusicPlaying = true;
    this.notify();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
    }
    this.notify();
  }

  // --- DYNAMIC AUCTION INTENSITY STATES ---
  // State 1: Normal Vocal Song ("Go Hard" / "Big Money")
  // State 2: Active Bidding (Subtle bid SFX + UI impact)
  // State 3: High Stakes (>10 Cr or Marquee) (Heavy percussion, tension risers, vocal drop)
  // State 4: Final Countdown (Heartbeat pulse, riser, silence fraction of second -> SOLD)
  public setAuctionIntensity(state: 1 | 2 | 3 | 4) {
    if (this.auctionTensionState === state) return;
    this.auctionTensionState = state;
    
    if (state === 3) {
      this.playHighBidSting();
      this.currentLiveLyric = '“RAISE THE PADDLE! CLEAR THE FLOOR! BIG MONEY DYNASTY!”';
    } else if (state === 4) {
      this.playCountdownTick(true);
      this.currentLiveLyric = '“GOING ONCE... GOING TWICE... FINAL BID!”';
    }
    this.notify();
  }

  // --- MATCH MOMENTS PROGRESSION (NEED 20 FROM 12 -> NEED 6 FROM 3 -> LAST BALL) ---
  public setMatchMomentsState(runsNeeded: number, ballsLeft: number) {
    this.matchMomentsRunsNeeded = runsNeeded;
    this.matchMomentsBallsLeft = ballsLeft;

    if (ballsLeft <= 1 || (ballsLeft <= 6 && runsNeeded <= 6)) {
      // Last ball clutch tension -> duck music + heartbeat
      this.duckMusic(0.9, 1600);
      this.currentLiveLyric = '“LAST BALL ON THE LINE! ICE IN MY BLOOD!”';
    } else if (ballsLeft <= 6) {
      // High tension final over
      this.currentLiveLyric = `“NEED ${runsNeeded} OFF ${ballsLeft} BALLS! PRESSURE IN MY VEINS!”`;
    } else {
      this.currentLiveLyric = '“LUCKY ALL DAY, WE OWN THE GAME!”';
    }
    this.notify();
  }

  // =========================================================================
  // --- HIGH-ENERGY PROCEDURAL VOCAL FORMANT & 808 SYNTHESIZER ---
  // Generates 100% original, copyright-safe, aggressive sports beats with:
  // - Resonant Dual-Formant Vocal Chants ("AYY!", "GO!", "DROP!", "SOLD!")
  // - Saturated 808 Sub-Bass glides
  // - Pitch-bending Sidechained Kicks
  // - Rolling Trap Hi-Hats & Snare Rolls
  // =========================================================================
  private startSynthesizedMusicLoop() {
    if (this.musicIntervalId) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }

    if (!this.init() || !this.ctx || !this.musicGain) return;

    // Fade in music bus smoothly
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, this.ctx.currentTime, 0.2);

    const track = this.currentTrackMetadata;
    const bpm = track.bpm || 128;
    const stepDurationMs = (60 / bpm / 4) * 1000; // 16th notes

    this.musicStep = 0;
    this.isMusicPlaying = true;

    this.musicIntervalId = setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.settings.isMusicEnabled || this.ctx.state !== 'running') return;
      
      const step16 = this.musicStep % 16;
      const step32 = this.musicStep % 32;
      const bar = Math.floor(this.musicStep / 16) % 4;

      const now = this.ctx.currentTime;
      const mode = this.currentMode;

      // 1. Kick Drum (Punchy sidechained kick)
      if (mode.startsWith('AUCTION')) {
        const isTrapKick = step16 === 0 || step16 === 6 || step16 === 10 || (this.auctionTensionState >= 3 && step16 === 14);
        if (isTrapKick) this.synthPunchKick(now, 1.1, 70);
      } else if (mode.startsWith('MOMENT')) {
        if (step16 % 4 === 0 || step16 === 14) this.synthPunchKick(now, 1.2, 75);
      } else if (mode === 'FINAL' || mode === 'BIG_MATCH') {
        if (step16 === 0 || step16 === 4 || step16 === 8 || step16 === 12) this.synthStadiumTimpani(now, 1.3);
      } else {
        // Home / Play mode
        if (step16 === 0 || step16 === 8 || step16 === 10) this.synthPunchKick(now, 0.95, 60);
      }

      // 2. Snare & Trap Claps on beats 2 and 4 (steps 4 and 12)
      if (step16 === 4 || step16 === 12) {
        if (mode.startsWith('AUCTION')) {
          this.synthTrapClap(now, 0.75);
        } else if (mode.startsWith('MOMENT')) {
          this.synthSnare(now, 0.95);
        } else {
          this.synthSnare(now, 0.7);
        }
      }

      // 3. Crisp Hi-Hats with rolling trap 32nds
      if (mode.startsWith('AUCTION')) {
        const isRoll = (this.auctionTensionState >= 2 && bar === 3 && step16 >= 8) || (step16 === 14);
        if (isRoll || step16 % 2 === 0) {
          this.synthHiHat(now, step16 % 4 === 0 ? 0.38 : 0.22, true);
        }
      } else if (mode.startsWith('MOMENT')) {
        this.synthHiHat(now, step16 % 4 === 0 ? 0.45 : 0.3, false);
      } else {
        if (step16 % 2 === 0) this.synthHiHat(now, 0.28, false);
      }

      // 4. Vocal Formant Chants ("AYY!", "GO!", "YEAH!", "DROP!")
      // Gives the soundtrack an authentic vocal/lyric feel even in WebAudio mode!
      if (mode.startsWith('AUCTION')) {
        if (step16 === 0 && bar === 0) this.synthVocalChant(now, 'GO', 0.45);
        if (step16 === 8 && bar === 2) this.synthVocalChant(now, 'DROP', 0.4);
      } else if (mode.startsWith('MOMENT')) {
        if (step16 === 0 && (bar === 1 || bar === 3)) this.synthVocalChant(now, 'AYY', 0.5);
      } else if (mode === 'HOME') {
        if (step16 === 4 && bar === 2) this.synthVocalChant(now, 'YEAH', 0.35);
      } else if (mode === 'FINAL') {
        if (step16 === 0 && bar === 0) this.synthVocalChant(now, 'CHAMP', 0.55);
      }

      // 5. Saturated 808 Sub-Bass & Saw Basslines
      if (step16 % 4 === 0) {
        const rootNotes = mode.startsWith('AUCTION') ? [48, 48, 44, 46] : [45, 48, 50, 43]; // MIDI C2 / A1
        const midi = rootNotes[bar] || 48;
        const freq = 440 * Math.pow(2, (midi - 69) / 12);

        if (mode.startsWith('AUCTION')) {
          this.synth808SubBass(now, freq, 0.45);
        } else if (mode.startsWith('MOMENT')) {
          this.synthSawBass(now, freq * 1.5, 0.35);
        } else {
          this.synthLoungeBass(now, freq, 0.35);
        }
      }

      // 6. Melodic Stabs & Tension Risers
      if (mode === 'AUCTION_TENSION' || (mode === 'AUCTION' && this.auctionTensionState >= 3)) {
        if (step16 === 0 || step16 === 6 || step16 === 12) {
          this.synthTensionStab(now, 420, 0.35);
        }
      } else if (mode === 'FINAL' || mode === 'BIG_MATCH') {
        if (step16 === 0 || step16 === 8) {
          this.synthBrassStab(now, 293.66, 0.45); // D4
        }
      } else if (mode === 'HOME' || mode === 'PLAY') {
        if (step16 === 2 || step16 === 8 || step16 === 14) {
          const melodies = [587.33, 659.25, 880, 783.99]; // D5, E5, A5, G5
          const noteFreq = melodies[(bar + step16) % melodies.length];
          this.synthPluckChime(now, noteFreq, 0.2);
        }
      }

      this.musicStep++;
    }, stepDurationMs);
  }

  // --- SYNTHESIZER VOICES & FORMANT ENGINES ---
  
  // Dual-Formant Resonant Vocal Filter (Simulates real human vocal chants)
  private synthVocalChant(time: number, vowelType: 'GO' | 'AYY' | 'YEAH' | 'DROP' | 'CHAMP', gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    // Base pitch
    const pitch = vowelType === 'GO' ? 140 : vowelType === 'AYY' ? 220 : vowelType === 'DROP' ? 110 : 180;
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.8, time + 0.18);

    // Formant filter 1 (Vowel throat resonance)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = vowelType === 'AYY' ? 800 : vowelType === 'GO' ? 500 : 600;
    f1.Q.value = 4.5;

    // Formant filter 2 (Vowel mouth resonance)
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = vowelType === 'AYY' ? 1900 : vowelType === 'GO' ? 900 : 1600;
    f2.Q.value = 5.0;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.25);
  }

  private synthPunchKick(time: number, gainMul: number = 1, startFreq: number = 65) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 2.8, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.14);

    g.gain.setValueAtTime(0.85 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.17);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  private synthStadiumTimpani(time: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.38);

    g.gain.setValueAtTime(0.95 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.42);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.45);
  }

  private synthSnare(time: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    whiteNoise.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.13);
  }

  private synthTrapClap(time: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.09;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1900;
    filter.Q.value = 2.5;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    source.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);

    source.start(time);
    source.stop(time + 0.11);
  }

  private synthHiHat(time: number, gainMul: number = 1, isPitchHigh: boolean = false) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isPitchHigh ? 9200 : 7000, time);

    g.gain.setValueAtTime(0.3 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  private synth808SubBass(time: number, freq: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.6, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.09);

    g.gain.setValueAtTime(0.65 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.55);
  }

  private synthSawBass(time: number, freq: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(220, time + 0.28);

    g.gain.setValueAtTime(0.45 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  private synthLoungeBass(time: number, freq: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    g.gain.setValueAtTime(0.5 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.36);
  }

  private synthTensionStab(time: number, freq: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.linearRampToValueAtTime(freq * 1.25, time + 0.16);

    g.gain.setValueAtTime(0.35 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  private synthBrassStab(time: number, freq: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    g.gain.setValueAtTime(0.5 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.48);
  }

  private synthPluckChime(time: number, freq: number, gainMul: number = 1) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    g.gain.setValueAtTime(0.25 * gainMul, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(g);
    g.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.32);
  }

  // --- STADIUM CROWD & MULTI-SAMPLE AMBIENCE SYSTEM ---
  private startStadiumCrowdAmbience() {
    if (!this.ctx || !this.crowdGain) return;

    // Organic pink noise stadium background generator
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.14;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;

    this.crowdGainNode = this.ctx.createGain();
    this.crowdGainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.crowdGainNode);
    this.crowdGainNode.connect(this.crowdGain);

    noise.start();
    this.crowdLoopNode = noise;
  }

  public triggerCrowdRoar(intensity: number = 0.7, durationMs: number = 1800) {
    if (!this.settings.isCrowdEnabled || !this.init() || !this.ctx || !this.crowdGainNode) return;
    const now = this.ctx.currentTime;
    this.crowdGainNode.gain.cancelScheduledValues(now);
    this.crowdGainNode.gain.setValueAtTime(0.25, now);
    this.crowdGainNode.gain.linearRampToValueAtTime(0.25 + intensity * 0.7, now + 0.18);
    this.crowdGainNode.gain.exponentialRampToValueAtTime(0.25, now + durationMs / 1000);
  }

  // =========================================================================
  // --- REAL BROADCAST SOUND EFFECTS & VOCAL CELEBRATION HOOKS ---
  // =========================================================================

  // UI
  public playButtonClick() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.05);

    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playTabSelect() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.linearRampToValueAtTime(980, now + 0.06);

    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // 1. DYNAMIC AUCTION AUDIO SUITE
  
  // Big Player Reveal: Duck Music -> Cinematic Sub-Bass Impact -> Player Card Reveal -> Vocal/Beat Drop!
  public playBigPlayerReveal() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.75, 1400);

    const now = this.ctx.currentTime;
    
    // Sub-bass gong
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(100, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.9);
    g1.gain.setValueAtTime(1.0, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 1.0);

    // High shimmer
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33, now); // D5
    osc2.frequency.linearRampToValueAtTime(1174.66, now + 0.4); // D6
    g2.gain.setValueAtTime(0.5, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.85);

    // Vocal drop: "MAKE SOME NOISE!"
    this.synthVocalChant(now + 0.35, 'CHAMP', 0.7);
    this.currentLiveLyric = '“💥 ON THE STAGE! MAKE SOME NOISE FOR THE SUPERSTAR!”';
    this.notify();
  }

  public playAuctionBid(isUser: boolean = false) {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = isUser ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(isUser ? 980 : 720, now);
    osc.frequency.exponentialRampToValueAtTime(isUser ? 1450 : 1080, now + 0.08);

    g.gain.setValueAtTime(isUser ? 0.65 : 0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playOutbidAlert() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.45, 500);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(340, now + 0.1);

    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.32);

    this.currentLiveLyric = '“⚠️ YOU HAVE BEEN OUTBID! COUNTER NOW!”';
    this.notify();
  }

  public playHighBidSting() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.55, 800);

    const now = this.ctx.currentTime;
    const chord = [349.23, 440, 523.25, 698.46]; // F Major tension
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.02);
      g.gain.setValueAtTime(0.28, now + idx * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.02);
      osc.stop(now + 0.65);
    });
  }

  public playCountdownTick(isFinal: boolean = false) {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1900 : 1250, now);

    g.gain.setValueAtTime(isFinal ? 0.65 : 0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.14 : 0.07));

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Exact Sequence: FINAL BID -> FRACTION OF SECOND SILENCE (150ms) -> SOLD! -> MASSIVE GAVEL IMPACT -> CROWD -> CELEBRATORY VOCAL HOOK!
  public playAuctionHammer(isAcquiredByUser: boolean = false) {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    
    // 150ms dead silence freeze!
    this.duckMusic(0.98, 2200);

    setTimeout(() => {
      if (!this.ctx || !this.sfxGain) return;
      const now = this.ctx.currentTime;

      // Resonant wooden gavel strike
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(280, now);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      g1.gain.setValueAtTime(1.0, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(g1);
      g1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.38);

      // Second hammer bounce
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(340, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.32);
      g2.gain.setValueAtTime(0.75, now + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(g2);
      g2.connect(this.sfxGain);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);

      // Crowd reaction
      this.triggerCrowdRoar(isAcquiredByUser ? 1.0 : 0.7, 2400);

      if (isAcquiredByUser) {
        this.playPlayerAcquisitionSting();
        this.currentLiveLyric = '“👑 SOLD! HE’S YOURS! WELCOME TO THE SQUAD!”';
      } else {
        this.currentLiveLyric = '“🔨 SOLD TO OPPONENT FRANCHISE!”';
      }
      this.notify();
    }, 150);
  }

  public playUnsoldSound() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.45, 600);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);

    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.42);

    this.currentLiveLyric = '“UNSOLD! PLAYER PASSES TO ACCELERATED ROUND.”';
    this.notify();
  }

  public playPlayerAcquisitionSting() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 triumphant arpeggio
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      g.gain.setValueAtTime(0.55, now + idx * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.48);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.52);
    });

    this.synthVocalChant(now + 0.25, 'CHAMP', 0.65);
  }

  // 2. MATCH BROADCAST AUDIO EVENTS
  public playMatchStartCinematic() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.75, 1600);

    const now = this.ctx.currentTime;

    // Brass swell
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.7);
    g.gain.setValueAtTime(0.1, now);
    g.gain.linearRampToValueAtTime(0.75, now + 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.4);

    this.triggerCrowdRoar(0.85, 1800);
    this.currentLiveLyric = '“🏟️ MATCHDAY LIVE! FEEL THE STADIUM ROAR!”';
    this.notify();
  }

  public playBatHit(isBoundary: boolean = false, isSix: boolean = false) {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;

    if (isSix) {
      this.duckMusic(0.8, 2000);
    } else if (isBoundary) {
      this.duckMusic(0.55, 1200);
    }

    const now = this.ctx.currentTime;

    // Willow wood crack
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = isSix ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isSix ? 500 : 360, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + (isSix ? 0.22 : 0.09));

    g.gain.setValueAtTime(isSix ? 1.0 : isBoundary ? 0.8 : 0.48, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (isSix ? 0.28 : 0.12));

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + (isSix ? 0.3 : 0.15));

    if (isSix) {
      this.triggerCrowdRoar(1.0, 2400);
      this.synthVocalChant(now + 0.1, 'AYY', 0.7);
      this.currentLiveLyric = '“🔥 SIX! OUTTA THE PARK! MAXIMUM CARNIVAL!”';
      this.notify();
    } else if (isBoundary) {
      this.triggerCrowdRoar(0.65, 1400);
      this.currentLiveLyric = '“⚡ FOUR! CRACKING BOUNDARY THROUGH THE COVERS!”';
      this.notify();
    }
  }

  public playWicketSound() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.85, 2200);

    const now = this.ctx.currentTime;

    // Timber clatter & stump shatter
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(780, now);
    osc1.frequency.exponentialRampToValueAtTime(65, now + 0.32);
    g1.gain.setValueAtTime(0.95, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc1.connect(g1);
    g1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Shock hit
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(170, now);
    osc2.frequency.exponentialRampToValueAtTime(32, now + 0.55);
    g2.gain.setValueAtTime(0.9, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.65);

    this.triggerCrowdRoar(0.9, 2200);
    this.currentLiveLyric = '“⚡ WICKET! TIMBER SHATTERED! GAME CHANGER!”';
    this.notify();
  }

  public playAppealSound() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.35, 650);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.linearRampToValueAtTime(720, now + 0.38);

    g.gain.setValueAtTime(0.65, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(g);
    g.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.52);

    this.currentLiveLyric = '“HOWZAT! MASSIVE APPEAL TO THE UMPIRE!”';
    this.notify();
  }

  // 3. VICTORY, DEFEAT & IPL CHAMPIONSHIP
  public playVictorySting() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.85, 3000);

    const now = this.ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      g.gain.setValueAtTime(0.65, now + idx * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.85);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.9);
    });

    this.synthVocalChant(now + 0.3, 'CHAMP', 0.8);
    this.triggerCrowdRoar(1.0, 3500);
    this.currentLiveLyric = '“🏆 VICTORY! MATCH SEALED! CELEBRATE THE WIN!”';
    this.notify();
  }

  public playDefeatSting() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.65, 1600);

    const now = this.ctx.currentTime;
    const notes = [440, 415, 392, 349]; // Descending minor
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);
      g.gain.setValueAtTime(0.45, now + idx * 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.5);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.55);
    });

    this.currentLiveLyric = '“😤 DUST IT OFF! WE COME BACK STRONGER IN THE NEXT MATCH!”';
    this.notify();
  }

  public playChampionshipCelebration() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.95, 5500);

    const now = this.ctx.currentTime;
    const fanfareNotes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    fanfareNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      g.gain.setValueAtTime(0.75, now + idx * 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 1.0);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 1.05);
    });

    this.synthVocalChant(now + 0.4, 'CHAMP', 0.9);
    this.triggerCrowdRoar(1.0, 6000);
    this.currentLiveLyric = '“👑 WE ARE THE CHAMPIONS OF INDIA! IPL TROPHY LIFT!”';
    this.notify();
  }

  // 4. REWARDS & PROGRESSION AUDIO
  public playRewardClaim() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const chord = [880, 1108.73, 1318.51, 1760]; // A Major chime
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      g.gain.setValueAtTime(0.45, now + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  public playLevelUp() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.6, 1400);

    const now = this.ctx.currentTime;
    const scale = [440, 554.37, 659.25, 880, 1108.73];
    scale.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      g.gain.setValueAtTime(0.6, now + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });

    this.synthVocalChant(now + 0.2, 'YEAH', 0.6);
  }

  public playAchievementUnlock() {
    if (!this.settings.isSfxEnabled || !this.init() || !this.ctx || !this.sfxGain) return;
    this.duckMusic(0.7, 2000);

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880, 1174.66]; // D Major fanfare
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      g.gain.setValueAtTime(0.65, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.65);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.7);
    });

    this.synthVocalChant(now + 0.35, 'CHAMP', 0.75);
  }
}

export const audioManager = new GlobalAudioManager();
