// FRANCHISE XI: Dynamic Procedural Sports Soundtrack Engine (FC Mobile inspired)

export interface SoundtrackTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  durationSec: number;
  energy: 'High' | 'Hype' | 'Chill' | 'Stadium';
}

export const PLAYLIST: SoundtrackTrack[] = [
  {
    id: 'track_1',
    title: 'Stadium Lights (Dynasty Mix)',
    artist: 'FRANCHISE SOUNDS',
    genre: 'Electronic / Stadium House',
    bpm: 126,
    durationSec: 120,
    energy: 'Hype'
  },
  {
    id: 'track_2',
    title: 'Golden Over (Auction Pressure)',
    artist: 'ELECTRO XI',
    genre: 'Synthwave / Bassline',
    bpm: 120,
    durationSec: 135,
    energy: 'High'
  },
  {
    id: 'track_3',
    title: 'VIP Pavilion Lounge',
    artist: 'NEO ARENA',
    genre: 'Deep Chill & Groove',
    bpm: 112,
    durationSec: 140,
    energy: 'Chill'
  },
  {
    id: 'track_4',
    title: 'Final Over Thriller',
    artist: 'BEAT MASTER XI',
    genre: 'Drum & Bassline Rush',
    bpm: 130,
    durationSec: 125,
    energy: 'Hype'
  }
];

class MusicEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.35;
  private currentTrackIndex: number = 0;
  private intervalId: any = null;
  private currentStep: number = 0;
  private masterGain: GainNode | null = null;
  private listeners: Array<() => void> = [];
  private trackStartTime: number = 0;
  private trackTimerId: any = null;

  public init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  public getCurrentTrack(): SoundtrackTrack {
    return PLAYLIST[this.currentTrackIndex] || PLAYLIST[0];
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    this.notify();
    return this.isMuted;
  }

  public play() {
    this.init();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.trackStartTime = Date.now();
    this.startLoop();
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.trackTimerId) {
      clearTimeout(this.trackTimerId);
      this.trackTimerId = null;
    }
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setTrackForScreen(screenOrTab: string) {
    let targetIndex = 0;
    const s = screenOrTab.toLowerCase();
    if (s.includes('auction')) {
      targetIndex = 1; // Golden Over (Auction Pressure)
    } else if (s.includes('match') || s.includes('play')) {
      targetIndex = 0; // Stadium Lights (Dynasty Mix)
    } else if (s.includes('reward') || s.includes('evol') || s.includes('pack')) {
      targetIndex = 3; // Final Over Thriller
    } else {
      targetIndex = 2; // VIP Pavilion Lounge
    }

    if (this.currentTrackIndex !== targetIndex) {
      this.currentTrackIndex = targetIndex;
      if (this.isPlaying) {
        this.pause();
        this.play();
      } else {
        this.notify();
      }
    }
  }

  public selectTrackByIndex(index: number) {
    if (index >= 0 && index < PLAYLIST.length) {
      this.currentTrackIndex = index;
      if (this.isPlaying) {
        this.pause();
        this.play();
      } else {
        this.notify();
      }
    }
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % PLAYLIST.length;
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.notify();
    }
  }

  public prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.notify();
    }
  }

  private startLoop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.trackTimerId) clearTimeout(this.trackTimerId);

    const track = this.getCurrentTrack();
    const beatIntervalMs = (60 / track.bpm) * 1000 / 4; // 16th notes

    // Automatically transition track when duration finishes
    this.trackTimerId = setTimeout(() => {
      this.nextTrack();
    }, track.durationSec * 1000);

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;
      this.tickStep();
      this.currentStep = (this.currentStep + 1) % 64;
    }, beatIntervalMs);
  }

  private tickStep() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const track = this.getCurrentTrack();
    const step = this.currentStep;

    // Bass notes progression
    const bassChords = [110, 110, 130.81, 130.81, 98, 98, 123.47, 123.47]; // A, C, G, B
    const currentChordFreq = bassChords[Math.floor(step / 8) % bassChords.length];

    // Kick on 0, 4, 8, 12... (4 on the floor)
    if (step % 4 === 0) {
      this.playKick(now);
    }

    // Snare / Clap on 4, 12 (backbeat)
    if (step % 8 === 4) {
      this.playSnare(now);
    }

    // Hi-hat on every odd 16th
    if (step % 2 === 1) {
      this.playHiHat(now, step % 4 === 2 ? 0.08 : 0.04);
    }

    // Bass synth pulse
    if (step % 4 === 0 || step % 4 === 2) {
      this.playBass(now, currentChordFreq / 2);
    }

    // Melodic Arp / Leads
    if (step % 2 === 0) {
      const melodyNotes = [
        currentChordFreq * 2,
        currentChordFreq * 2.5,
        currentChordFreq * 3,
        currentChordFreq * 2.25
      ];
      const note = melodyNotes[(step / 2) % melodyNotes.length];
      this.playSynthNote(now, note);
    }
  }

  private playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.13);
    } catch {
      // ignore
    }
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Tone + noise
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.1);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.11);
    } catch {
      // ignore
    }
  }

  private playHiHat(time: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, time);

      gain.gain.setValueAtTime(vol * 0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.05);
    } catch {
      // ignore
    }
  }

  private playBass(time: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, time);

      gain.gain.setValueAtTime(0.22, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.16);
    } catch {
      // ignore
    }
  }

  private playSynthNote(time: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.13);
    } catch {
      // ignore
    }
  }
}

export const musicEngine = new MusicEngine();
