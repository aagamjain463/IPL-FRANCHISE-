import React, { useState, useEffect } from 'react';
import { Player } from '../../types/cricket';
import { FCPlayerCard } from './FCPlayerCard';
import { getFCCardTier, getPlayerPlayStylePlus } from '../../engine/fc26Engine';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Flame, ChevronRight, RotateCcw, Volume2, X } from 'lucide-react';

interface FCPackOpeningModalProps {
  player: Player;
  onClose: () => void;
  onContinue?: () => void;
}

export const FCPackOpeningModal: React.FC<FCPackOpeningModalProps> = ({
  player,
  onClose,
  onContinue
}) => {
  // Reveal animation stages: 0: Sparks, 1: Flag, 2: Position, 3: OVR, 4: FULL WALKOUT
  const [stage, setStage] = useState<number>(0);
  const tier = getFCCardTier(player);
  const playStylePlus = getPlayerPlayStylePlus(player);

  useEffect(() => {
    // Stage 1: Flag reveal after 700ms
    const t1 = setTimeout(() => setStage(1), 700);
    // Stage 2: Role reveal after 1500ms
    const t2 = setTimeout(() => setStage(2), 1500);
    // Stage 3: OVR reveal after 2300ms
    const t3 = setTimeout(() => setStage(3), 2300);
    // Stage 4: Walkout explosion after 3200ms
    const t4 = setTimeout(() => {
      setStage(4);
      triggerConfetti();
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#ffffff', '#3b82f6', '#10b981', '#f59e0b']
      });
    } catch {
      // safe fallback
    }
  };

  const skipToWalkout = () => {
    setStage(4);
    triggerConfetti();
  };

  const countryFlags: Record<string, string> = {
    'India': '🇮🇳',
    'Australia': '🇦🇺',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'South Africa': '🇿🇦',
    'New Zealand': '🇳🇿',
    'West Indies': '🌴',
    'Afghanistan': '🇦🇫',
    'Sri Lanka': '🇱🇰',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩'
  };

  const flag = countryFlags[player.nationality] || '🏏';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden animate-fade-in select-none">
      {/* Stadium Spotlight Beams */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-full bg-gradient-to-b from-blue-500/20 via-indigo-500/5 to-transparent transform -rotate-12 blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-full bg-gradient-to-b from-amber-500/20 via-yellow-500/5 to-transparent transform rotate-12 blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-radial from-amber-500/10 via-transparent to-transparent" />
      </div>

      {/* Skip Button */}
      {stage < 4 && (
        <button
          onClick={skipToWalkout}
          className="absolute top-6 right-6 z-50 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-widest transition flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
        >
          <span>Skip Animation</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 left-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer backdrop-blur-md"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center justify-center p-6 text-center">
        
        {/* STAGES 0 - 3: TEASER REVEAL TUNNEL */}
        {stage < 4 && (
          <div className="flex flex-col items-center justify-center space-y-8 animate-pulse">
            
            {/* Header Stage Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 font-black text-xs uppercase tracking-widest shadow-lg">
              <Sparkles className="w-4 h-4 fill-amber-400" />
              <span>ULTIMATE WALKOUT INCOMING</span>
            </div>

            {/* Teaser Reveal Elements */}
            <div className="flex items-center justify-center gap-6">
              
              {/* 1. Country Flag Reveal */}
              <div className={`flex flex-col items-center justify-center w-24 h-28 rounded-2xl border transition-all duration-500 ${stage >= 1 ? 'bg-[#0f172a] border-amber-400/80 shadow-[0_0_30px_rgba(212,175,55,0.3)] scale-110' : 'bg-white/5 border-white/10 opacity-30'}`}>
                <span className="text-3xl">{stage >= 1 ? flag : '❓'}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                  {stage >= 1 ? player.nationality : 'NATION'}
                </span>
              </div>

              {/* 2. Position Role Reveal */}
              <div className={`flex flex-col items-center justify-center w-24 h-28 rounded-2xl border transition-all duration-500 ${stage >= 2 ? 'bg-[#0f172a] border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.3)] scale-110' : 'bg-white/5 border-white/10 opacity-30'}`}>
                <span className="text-sm font-black text-cyan-300 uppercase">
                  {stage >= 2 ? player.role.split(' ')[0] : '❓'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                  {stage >= 2 ? 'POSITION' : 'ROLE'}
                </span>
              </div>

              {/* 3. Rating Tier Reveal */}
              <div className={`flex flex-col items-center justify-center w-24 h-28 rounded-2xl border transition-all duration-500 ${stage >= 3 ? 'bg-[#0f172a] border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-110' : 'bg-white/5 border-white/10 opacity-30'}`}>
                <span className="text-2xl font-black text-emerald-400 font-mono-sport">
                  {stage >= 3 ? `${player.overall} OVR` : '❓'}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                  {stage >= 3 ? tier : 'TIER'}
                </span>
              </div>

            </div>

            <div className="text-xs text-slate-400 font-mono tracking-widest">
              COMMENCING BIO-METRIC FRANCHISE VERIFICATION...
            </div>
          </div>
        )}

        {/* STAGE 4: FULL WALKOUT EXPLOSION */}
        {stage >= 4 && (
          <div className="flex flex-col items-center justify-center animate-scale-up">
            
            {/* Walkout Trophy Banner */}
            <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30 border border-amber-400 text-amber-300 font-black text-sm uppercase tracking-widest shadow-2xl mb-4">
              <Trophy className="w-4 h-4 fill-amber-400" />
              <span>MARQUEE SIGNING WALKOUT</span>
              <Trophy className="w-4 h-4 fill-amber-400" />
            </div>

            {/* 3D FC Player Card Hero */}
            <div className="my-2 transform hover:scale-105 transition-transform duration-300">
              <FCPlayerCard player={player} size="hero" isWalkout={true} />
            </div>

            {/* PlayStyles+ Callout Banner if available */}
            {playStylePlus && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-[#0c1220] border border-amber-500/50 flex items-center gap-3 text-left max-w-md shadow-xl">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Sparkles className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    SIGNATURE PLAYSTYLE+: {playStylePlus.name}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    {playStylePlus.inGameEffect}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-6">
              <button
                id="btn-confirm-walkout"
                onClick={onContinue || onClose}
                className="px-8 py-3.5 rounded-full bg-[#D4AF37] hover:bg-[#e5c158] text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-xl shadow-[#D4AF37]/30 flex items-center gap-2 cursor-pointer"
              >
                <span>Add to Squad Roster</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
