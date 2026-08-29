import React, { useState, useEffect } from 'react';
import { audioManager, AudioSettings } from '../audio/audioManager';
import { 
  HOME_PLAYLIST, 
  AUCTION_PLAYLIST, 
  MATCH_PLAYLIST, 
  MOMENTS_PLAYLIST, 
  FINAL_PLAYLIST, 
  VOCAL_HOOKS_MANIFEST,
  MusicTrackMetadata 
} from '../audio/audioManifest';
import { 
  Volume2, VolumeX, Music, Sliders, X, 
  Sparkles, Check, Flame, Award, Zap, Radio,
  Folder, Info, Play, Disc, Mic, ShieldCheck,
  Headphones, AlertTriangle, SkipForward
} from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => audioManager.getSettings());
  const [activeTab, setActiveTab] = useState<'mixer' | 'soundtrack' | 'assets'>('mixer');
  const [selectedPlaylist, setSelectedPlaylist] = useState<'HOME' | 'AUCTION' | 'MATCH' | 'MOMENTS' | 'FINAL'>('HOME');
  const [currentTrack, setCurrentTrack] = useState<MusicTrackMetadata>(() => audioManager.getCurrentTrackMetadata());

  useEffect(() => {
    const unsub = audioManager.subscribe(() => {
      setSettings(audioManager.getSettings());
      setCurrentTrack(audioManager.getCurrentTrackMetadata());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const currentPlaylistTracks = 
    selectedPlaylist === 'HOME' ? HOME_PLAYLIST :
    selectedPlaylist === 'AUCTION' ? AUCTION_PLAYLIST :
    selectedPlaylist === 'MATCH' ? MATCH_PLAYLIST :
    selectedPlaylist === 'MOMENTS' ? MOMENTS_PLAYLIST : FINAL_PLAYLIST;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
      <div 
        className="w-full max-w-2xl bg-[#090e1a] border border-[#1e293b] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-[#D4AF37]/30 border border-[#D4AF37]/40 text-[#D4AF37]">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                Broadcast & Vocal Audio Suite
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 not-italic font-bold">
                  PRO LEVEL
                </span>
              </h3>
              <p className="text-xs text-[#94a3b8]">Hype Vocal Soundtracks, Stadium Crowd Engine & Live Match SFX</p>
            </div>
          </div>
          <button 
            id="btn-close-audio-settings"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition border border-[#1e293b] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="flex items-center gap-2 bg-[#05070a] p-1 rounded-2xl border border-[#1e293b]">
          <button
            onClick={() => setActiveTab('mixer')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'mixer' 
                ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black shadow-md' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Mixer & Levels
          </button>
          <button
            onClick={() => setActiveTab('soundtrack')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'soundtrack' 
                ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black shadow-md' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            Vocal Playlists
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'assets' 
                ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black shadow-md' 
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Licenses & Assets
          </button>
        </div>

        {/* TAB 1: MIXER & LEVELS */}
        {activeTab === 'mixer' && (
          <div className="space-y-4">
            {/* Quick Toggle Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Music Toggle */}
              <button
                onClick={() => audioManager.toggleMusic()}
                className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  settings.isMusicEnabled
                    ? 'bg-amber-500/10 border-amber-500/40 text-white'
                    : 'bg-[#05070a] border-[#1e293b] text-[#64748b]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mic className={`w-4 h-4 ${settings.isMusicEnabled ? 'text-[#D4AF37]' : 'text-[#64748b]'}`} />
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block">Vocals</span>
                    <span className="text-[8px] text-[#94a3b8]">{settings.isMusicEnabled ? 'ON' : 'MUTED'}</span>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${settings.isMusicEnabled ? 'bg-[#D4AF37] shadow-sm shadow-[#D4AF37]' : 'bg-[#1e293b]'}`} />
              </button>

              {/* SFX Toggle */}
              <button
                onClick={() => audioManager.toggleSfx()}
                className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  settings.isSfxEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-[#05070a] border-[#1e293b] text-[#64748b]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Volume2 className={`w-4 h-4 ${settings.isSfxEnabled ? 'text-emerald-400' : 'text-[#64748b]'}`} />
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block">Sound FX</span>
                    <span className="text-[8px] text-[#94a3b8]">{settings.isSfxEnabled ? 'ON' : 'MUTED'}</span>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${settings.isSfxEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-[#1e293b]'}`} />
              </button>

              {/* Crowd Toggle */}
              <button
                onClick={() => audioManager.toggleCrowd()}
                className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  settings.isCrowdEnabled
                    ? 'bg-blue-500/10 border-blue-500/40 text-white'
                    : 'bg-[#05070a] border-[#1e293b] text-[#64748b]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio className={`w-4 h-4 ${settings.isCrowdEnabled ? 'text-blue-400' : 'text-[#64748b]'}`} />
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block">Crowd</span>
                    <span className="text-[8px] text-[#94a3b8]">{settings.isCrowdEnabled ? 'ON' : 'MUTED'}</span>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${settings.isCrowdEnabled ? 'bg-blue-400 shadow-sm shadow-blue-400' : 'bg-[#1e293b]'}`} />
              </button>

              {/* Commentary Toggle */}
              <button
                onClick={() => audioManager.toggleCommentary()}
                className={`p-2.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  settings.isCommentaryEnabled
                    ? 'bg-purple-500/10 border-purple-500/40 text-white'
                    : 'bg-[#05070a] border-[#1e293b] text-[#64748b]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Headphones className={`w-4 h-4 ${settings.isCommentaryEnabled ? 'text-purple-400' : 'text-[#64748b]'}`} />
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider block">Broadcast</span>
                    <span className="text-[8px] text-[#94a3b8]">{settings.isCommentaryEnabled ? 'ON' : 'MUTED'}</span>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${settings.isCommentaryEnabled ? 'bg-purple-400 shadow-sm shadow-purple-400' : 'bg-[#1e293b]'}`} />
              </button>
            </div>

            {/* 5-Channel Volume Sliders */}
            <div className="bg-[#05070a] p-4 rounded-2xl border border-[#1e293b] space-y-3.5">
              {/* Channel 1: Master */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                    Master Volume
                  </span>
                  <span className="text-white font-mono">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.masterVolume}
                  onChange={e => audioManager.setMasterVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#D4AF37] h-2 bg-[#1e293b] rounded-lg cursor-pointer"
                />
              </div>

              {/* Channel 2: Vocal Soundtrack */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    Vocal Soundtrack (Music Bus)
                  </span>
                  <span className="text-[#D4AF37] font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.musicVolume}
                  onChange={e => audioManager.setMusicVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#D4AF37] h-2 bg-[#1e293b] rounded-lg cursor-pointer"
                />
              </div>

              {/* Channel 3: Sound Effects */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Match & Auction Sound FX
                  </span>
                  <span className="text-emerald-400 font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.sfxVolume}
                  onChange={e => audioManager.setSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 h-2 bg-[#1e293b] rounded-lg cursor-pointer"
                />
              </div>

              {/* Channel 4: Stadium Crowd */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                    Stadium Crowd Ambience & Roars
                  </span>
                  <span className="text-blue-400 font-mono">{Math.round(settings.crowdVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.crowdVolume}
                  onChange={e => audioManager.setCrowdVolume(parseFloat(e.target.value))}
                  className="w-full accent-blue-400 h-2 bg-[#1e293b] rounded-lg cursor-pointer"
                />
              </div>

              {/* Channel 5: Commentary */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-purple-400" />
                    Commentary & Broadcast Voiceover
                  </span>
                  <span className="text-purple-400 font-mono">{Math.round(settings.commentaryVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.commentaryVolume}
                  onChange={e => audioManager.setCommentaryVolume(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 h-2 bg-[#1e293b] rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Interactive Broadcast Audio Test Bench */}
            <div className="bg-[#05070a] p-3.5 rounded-2xl border border-[#1e293b] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Live Broadcast Trigger Test Bench
                </span>
                <span className="text-[9px] text-[#94a3b8]">Tests dynamic ducking & vocal hooks</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  onClick={() => audioManager.playBigPlayerReveal()}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-white border border-[#1e293b] transition cursor-pointer hover:border-amber-400/50 text-center"
                >
                  🌟 Marquee Reveal
                </button>
                <button
                  onClick={() => audioManager.playAuctionHammer(true)}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-amber-300 border border-[#1e293b] transition cursor-pointer hover:border-amber-400/50 text-center"
                >
                  🔨 Sold! Sequence
                </button>
                <button
                  onClick={() => audioManager.playBatHit(false, true)}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-emerald-300 border border-[#1e293b] transition cursor-pointer hover:border-emerald-400/50 text-center"
                >
                  🔥 Maximum 6 Roar
                </button>
                <button
                  onClick={() => audioManager.playWicketSound()}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-red-300 border border-[#1e293b] transition cursor-pointer hover:border-red-400/50 text-center"
                >
                  ⚡ Timber Wicket
                </button>
                <button
                  onClick={() => audioManager.playOutbidAlert()}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-amber-400 border border-[#1e293b] transition cursor-pointer text-center"
                >
                  ⚠️ Outbid Alarm
                </button>
                <button
                  onClick={() => audioManager.playVictorySting()}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-blue-300 border border-[#1e293b] transition cursor-pointer text-center"
                >
                  🏆 Match Victory
                </button>
                <button
                  onClick={() => audioManager.playDefeatSting()}
                  className="p-2 rounded-xl bg-[#1e293b]/60 hover:bg-[#1e293b] text-[10px] font-bold text-gray-300 border border-[#1e293b] transition cursor-pointer text-center"
                >
                  😤 Defeat Bounce-Back
                </button>
                <button
                  onClick={() => audioManager.playChampionshipCelebration()}
                  className="p-2 rounded-xl bg-gradient-to-r from-amber-500/30 to-[#D4AF37]/40 text-[10px] font-black text-amber-200 border border-[#D4AF37]/50 transition cursor-pointer text-center"
                >
                  👑 IPL Trophy Lift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VOCAL PLAYLISTS */}
        {activeTab === 'soundtrack' && (
          <div className="space-y-4">
            {/* Playlist Mode Selector */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'HOME', label: 'Home / Hub', count: HOME_PLAYLIST.length },
                { id: 'AUCTION', label: 'Mega Auction', count: AUCTION_PLAYLIST.length },
                { id: 'MATCH', label: 'Matchday', count: MATCH_PLAYLIST.length },
                { id: 'MOMENTS', label: 'Moments', count: MOMENTS_PLAYLIST.length },
                { id: 'FINAL', label: 'IPL Final', count: FINAL_PLAYLIST.length }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlaylist(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase whitespace-nowrap transition cursor-pointer border ${
                    selectedPlaylist === p.id
                      ? 'bg-amber-500/20 text-[#D4AF37] border-[#D4AF37]/50'
                      : 'bg-[#05070a] text-[#94a3b8] border-[#1e293b] hover:text-white'
                  }`}
                >
                  {p.label} ({p.count})
                </button>
              ))}
            </div>

            {/* Tracks List */}
            <div className="space-y-2.5">
              {currentPlaylistTracks.map((track, idx) => {
                const isCurrentlyActive = currentTrack.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCurrentlyActive
                        ? 'bg-amber-500/10 border-[#D4AF37]/60 shadow-lg'
                        : 'bg-[#05070a] border-[#1e293b] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            {track.title}
                          </span>
                          {track.isSignature && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
                              SIGNATURE THEME
                            </span>
                          )}
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#1e293b] text-[#94a3b8] font-mono">
                            {track.bpm} BPM
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border ${
                            track.licenseStatus === 'Verified Licensed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : track.licenseStatus === 'Placeholder Required'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}>
                            {track.licenseStatus}
                          </span>
                        </div>

                        <p className="text-xs text-[#D4AF37] font-semibold">{track.artist} • <span className="text-[#94a3b8] font-normal">{track.genre}</span></p>

                        {/* Vocal Hook Line */}
                        <div className="p-2 rounded-xl bg-[#090e1a] border border-[#1e293b] text-[10px] text-amber-200/90 font-mono italic">
                          <Flame className="w-3 h-3 text-amber-400 inline mr-1 -mt-0.5" />
                          {track.lyricsHook}
                        </div>

                        <p className="text-[10px] text-[#64748b]">{track.description}</p>
                      </div>

                      {/* Mode Action Button */}
                      <button
                        onClick={() => {
                          audioManager.setAudioMode(track.mode as any);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                          isCurrentlyActive
                            ? 'bg-[#D4AF37] text-black font-black'
                            : 'bg-[#1e293b] hover:bg-[#334155] text-white'
                        }`}
                      >
                        {isCurrentlyActive ? 'NOW PLAYING' : 'PLAY NOW'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ASSET & LICENSING GUIDE */}
        {activeTab === 'assets' && (
          <div className="space-y-4 text-xs text-[#94a3b8]">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <h4 className="text-sm font-black text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                100% License Compliant & Commercial Ready
              </h4>
              <p className="leading-relaxed">
                The IPL Franchise Simulator audio engine is architected to guarantee full copyright compliance across web, mobile, and commercial distribution channels.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#05070a] border border-[#1e293b] space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-[#D4AF37]" />
                Audio Asset File Paths & Directory Structure
              </h4>
              <p>Place your properly licensed MP3 files inside the public audio folder:</p>
              
              <div className="space-y-1.5 font-mono text-[10px] bg-[#090e1a] p-3 rounded-xl border border-[#1e293b]">
                <div className="text-amber-300">/public/audio/music/watch_out.mp3 <span className="text-[#64748b]">→ "Watch Out" by Captain Qubz</span></div>
                <div className="text-amber-300">/public/audio/music/go_hard.mp3 <span className="text-[#64748b]">→ "Go Hard" by Wes Harris, Skrxlla</span></div>
                <div className="text-amber-300">/public/audio/music/dreeeaaams.mp3 <span className="text-[#64748b]">→ "DREEEAAAMS" by Yarin Primak</span></div>
                <div className="text-amber-300">/public/audio/music/lucky_all_day.mp3 <span className="text-[#64748b]">→ "Lucky All Day" by Mazbou Q</span></div>
                <div className="text-red-400">/public/audio/music/final_anthem.mp3 <span className="text-[#64748b]">→ [FINAL_ANTHEM_REQUIRED] Licensed Stadium Anthem</span></div>
                <div className="text-emerald-400">/public/audio/vocal_hooks/sold_acquired.mp3 <span className="text-[#64748b]">→ Celebratory vocal sting</span></div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-[11px] text-amber-200/90">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Zero-Silence Fallback:</strong> If audio files have not yet been placed in the folder, the engine automatically synthesizes high-energy, 100% copyright-safe vocal-formant chants, punchy 808s, and dynamic crowd roars.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
