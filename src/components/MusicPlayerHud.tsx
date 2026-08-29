import React, { useEffect, useState } from 'react';
import { audioManager, AudioSettings, AudioMode } from '../audio/audioManager';
import { MusicTrackMetadata } from '../audio/audioManifest';
import { AudioSettingsModal } from './AudioSettingsModal';
import { 
  Volume2, VolumeX, Play, Pause, Music, Sliders, 
  Disc, Sparkles, Radio, SkipForward, SkipBack, Mic, Flame
} from 'lucide-react';

export const MusicPlayerHud: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>(() => audioManager.getSettings());
  const [currentMode, setCurrentMode] = useState<AudioMode>(() => audioManager.getCurrentMode());
  const [isPlaying, setIsPlaying] = useState<boolean>(() => audioManager.getIsMusicPlaying());
  const [currentTrack, setCurrentTrack] = useState<MusicTrackMetadata>(() => audioManager.getCurrentTrackMetadata());
  const [liveLyric, setLiveLyric] = useState<string>(() => audioManager.getCurrentLiveLyric());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const unsub = audioManager.subscribe(() => {
      setSettings(audioManager.getSettings());
      setCurrentMode(audioManager.getCurrentMode());
      setIsPlaying(audioManager.getIsMusicPlaying());
      setCurrentTrack(audioManager.getCurrentTrackMetadata());
      setLiveLyric(audioManager.getCurrentLiveLyric());
    });
    return unsub;
  }, []);

  return (
    <>
      <div className="fixed bottom-16 md:bottom-4 right-3 md:right-4 z-40 max-w-[calc(100vw-24px)]">
        <div className="bg-[#090e1a]/95 backdrop-blur-xl border border-[#1e293b] rounded-2xl p-2 md:p-2.5 shadow-2xl flex items-center gap-2.5 transition-all duration-300">
          
          {/* Pulsing Audio Disc Indicator with Vocal Mic icon */}
          <button
            id="btn-hud-audio-disc"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl border flex items-center justify-center transition cursor-pointer relative shrink-0 ${
              isPlaying && settings.isMusicEnabled
                ? 'bg-gradient-to-tr from-amber-500/20 to-[#D4AF37]/30 border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-[#05070a] border-[#1e293b] text-[#64748b]'
            }`}
            title="Toggle Live Music & Vocal Details"
          >
            <Disc className={`w-5 h-5 ${isPlaying && settings.isMusicEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '3.5s' }} />
            {isPlaying && settings.isMusicEnabled && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#090e1a] animate-pulse" />
            )}
          </button>

          {/* Current Dynamic Vocal Soundtrack Info & Live Lyric Ticker */}
          <div 
            className="text-left max-w-[140px] sm:max-w-[210px] md:max-w-[240px] cursor-pointer select-none overflow-hidden" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center gap-1 whitespace-nowrap">
                <Mic className="w-2.5 h-2.5 text-amber-400" />
                {currentTrack.vocalStyle || 'Vocal'} • {currentMode}
              </span>
              <span className="text-[8px] text-[#64748b] font-mono hidden sm:inline">{currentTrack.bpm} BPM</span>
            </div>

            <p className="text-[11px] md:text-xs font-black text-white truncate mt-0.5 flex items-center gap-1">
              {currentTrack.title}
              {currentTrack.isSignature && (
                <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">HYPE</span>
              )}
            </p>
            
            <p className="text-[9px] text-[#D4AF37] truncate font-medium">
              {currentTrack.artist}
            </p>

            {/* Live Lyric Ticker on Expanded or Desktop */}
            {isExpanded && (
              <div className="mt-1 pt-1 border-t border-[#1e293b]/70 flex items-center gap-1 text-[8.5px] text-amber-200/90 italic font-mono truncate animate-fadeIn">
                <Flame className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span className="truncate">{liveLyric}</span>
              </div>
            )}
          </div>

          {/* Quick HUD Audio Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Prev Track */}
            {isExpanded && (
              <button
                id="btn-hud-prev-track"
                onClick={() => audioManager.prevTrack()}
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Play / Pause Toggle */}
            <button
              id="btn-hud-toggle-play"
              onClick={() => audioManager.toggleMusic()}
              className={`p-1.5 md:p-2 rounded-full transition cursor-pointer shadow-md ${
                settings.isMusicEnabled && isPlaying
                  ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black hover:scale-105 active:scale-95'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
              }`}
              title={settings.isMusicEnabled && isPlaying ? 'Mute Vocal Soundtrack' : 'Play Vocal Soundtrack'}
            >
              {settings.isMusicEnabled && isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-black" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            {/* Next Track Button (Randomizes within playlist without repeating) */}
            <button
              id="btn-hud-next-track"
              onClick={() => audioManager.nextTrack()}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#1e293b] transition cursor-pointer"
              title="Next Vocal Song"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Quick Mute All */}
            <button
              id="btn-hud-quick-mute"
              onClick={() => audioManager.toggleMute()}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                settings.masterVolume === 0
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
              }`}
              title={settings.masterVolume === 0 ? 'Unmute All' : 'Mute All'}
            >
              {settings.masterVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Open Full Audio & Broadcast Suite Modal */}
            <button
              id="btn-hud-audio-settings"
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#D4AF37] hover:bg-[#1e293b] transition cursor-pointer"
              title="Open Audio & Broadcast Suite"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expanded Inline Music Volume Slider */}
          {isExpanded && (
            <div className="pl-2 border-l border-[#1e293b] flex items-center gap-2 animate-fadeIn">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={e => audioManager.setMusicVolume(parseFloat(e.target.value))}
                className="w-14 sm:w-20 accent-[#D4AF37] h-1.5 bg-[#05070a] rounded-lg cursor-pointer"
                title="Vocal Soundtrack Volume"
              />
            </div>
          )}
        </div>
      </div>

      {/* Full Audio Suite Modal */}
      <AudioSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
};
