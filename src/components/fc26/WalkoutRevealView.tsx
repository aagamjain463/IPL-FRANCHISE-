import React, { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { FCPlayerCard } from './FCPlayerCard';
import { getFCCardTier, getPlayerPlayStylePlus } from '../../engine/fc26Engine';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, ChevronRight, X, ArrowLeft, RotateCcw, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const WalkoutRevealView: React.FC = () => {
  const { gameState, currentWalkoutPlayer, exitWalkout, setActiveTab } = useGame();
  
  // Reveal animation stages: 0: Sparks/Tunnel, 1: Flag, 2: Position, 3: OVR, 4: FULL WALKOUT
  const [stage, setStage] = useState<number>(0);
  
  const userTeam = gameState?.teams[gameState?.userTeamId || ''];
  const captain = userTeam?.captainId ? gameState?.allPlayers[userTeam.captainId] : undefined;
  const fallbackPlayer = userTeam?.rosterPlayerIds?.[0] ? gameState?.allPlayers[userTeam.rosterPlayerIds[0]] : undefined;
  
  // Target player to walk out
  const player = currentWalkoutPlayer || captain || fallbackPlayer;

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
  }, [player?.id]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.52 },
        colors: ['#D4AF37', '#ffffff', '#00FF87', '#38BDF8', '#F59E0B']
      });
    } catch {
      // safe fallback
    }
  };

  const skipToWalkout = () => {
    setStage(4);
    triggerConfetti();
  };

  const replayWalkout = () => {
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 700);
    const t2 = setTimeout(() => setStage(2), 1500);
    const t3 = setTimeout(() => setStage(3), 2300);
    const t4 = setTimeout(() => {
      setStage(4);
      triggerConfetti();
    }, 3200);
  };

  if (!player) {
    return (
      <div className="w-full h-full min-h-[70vh] flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <Trophy className="w-16 h-16 text-amber-400 mb-4 opacity-40 animate-pulse" />
        <h2 className="text-xl font-black uppercase text-white font-heading tracking-tight">No Player Available For Walkout</h2>
        <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">Build your squad or select a player from your franchise binder to trigger their marquee stadium walkout.</p>
        <button
          onClick={exitWalkout}
          className="px-6 py-2.5 rounded-xl bg-[#00FF87] text-black font-black text-xs uppercase tracking-wider hover:bg-[#00e57a] transition cursor-pointer"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const tier = getFCCardTier(player);
  const playStylePlus = getPlayerPlayStylePlus(player);

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
    <div className="w-full flex-1 flex flex-col items-center justify-between p-3 sm:p-5 select-none overflow-hidden relative max-w-5xl mx-auto h-full min-h-[calc(100vh-5rem)]">
      {/* Stadium Spotlight Beams Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 sm:w-96 h-full bg-gradient-to-b from-blue-500/15 via-indigo-500/5 to-transparent transform -rotate-12 blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 sm:w-96 h-full bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent transform rotate-12 blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-radial from-amber-500/10 via-transparent to-transparent" />
      </div>

      {/* Top Header Controls Bar */}
      <div className="relative z-30 w-full flex items-center justify-between shrink-0 pt-1 pb-2">
        <button
          id="btn-return-from-walkout"
          onClick={exitWalkout}
          className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 text-xs font-bold uppercase tracking-wider"
          title="Return to Previous Screen"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
          <span>MARQUEE WALKOUT REVEAL</span>
        </div>

        <div className="flex items-center gap-2">
          {stage >= 4 && (
            <button
              onClick={replayWalkout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1 cursor-pointer backdrop-blur-md active:scale-95"
              title="Replay Walkout Sequence"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Replay</span>
            </button>
          )}

          {stage < 4 ? (
            <button
              onClick={skipToWalkout}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1 cursor-pointer backdrop-blur-md active:scale-95"
            >
              <span>Skip</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={exitWalkout}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer backdrop-blur-md flex items-center justify-center active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center Stage Container - Fully Fitted, Clean Scaling & Zero Page Overflow */}
      <div className="relative z-20 w-full max-w-xl flex-1 flex flex-col items-center justify-center my-auto min-h-0 text-center py-2">
        
        {/* STAGES 0 - 3: TEASER REVEAL TUNNEL */}
        {stage < 4 && (
          <div className="flex flex-col items-center justify-center space-y-6 animate-pulse w-full">
            
            {/* Teaser Reveal Badges */}
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              
              {/* 1. Country Flag Reveal */}
              <div className={`flex flex-col items-center justify-center w-20 h-24 sm:w-24 sm:h-28 rounded-2xl border transition-all duration-500 ${stage >= 1 ? 'bg-[#0f172a] border-amber-400/80 shadow-[0_0_30px_rgba(212,175,55,0.3)] scale-105' : 'bg-white/5 border-white/10 opacity-30'}`}>
                <span className="text-2xl sm:text-3xl">{stage >= 1 ? flag : '❓'}</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-1.5">
                  {stage >= 1 ? player.nationality : 'NATION'}
                </span>
              </div>

              {/* 2. Position Role Reveal */}
              <div className={`flex flex-col items-center justify-center w-20 h-24 sm:w-24 sm:h-28 rounded-2xl border transition-all duration-500 ${stage >= 2 ? 'bg-[#0f172a] border-cyan-400/80 shadow-[0_0_30px_rgba(6,182,212,0.3)] scale-105' : 'bg-white/5 border-white/10 opacity-30'}`}>
                <span className="text-xs sm:text-sm font-black text-cyan-300 uppercase px-1 truncate max-w-full">
                  {stage >= 2 ? player.role.split(' ')[0] : '❓'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-1.5">
                  {stage >= 2 ? 'POSITION' : 'ROLE'}
                </span>
              </div>

              {/* 3. Rating Tier Reveal */}
              <div className={`flex flex-col items-center justify-center w-20 h-24 sm:w-24 sm:h-28 rounded-2xl border transition-all duration-500 ${stage >= 3 ? 'bg-[#0f172a] border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-105' : 'bg-white/5 border-white/10 opacity-30'}`}>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-sport">
                  {stage >= 3 ? `${player.overall} OVR` : '❓'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase mt-1.5">
                  {stage >= 3 ? tier : 'TIER'}
                </span>
              </div>

            </div>

            <div className="text-[11px] sm:text-xs text-slate-400 font-mono tracking-widest">
              COMMENCING BIO-METRIC FRANCHISE VERIFICATION...
            </div>
          </div>
        )}

        {/* STAGE 4: FULL WALKOUT EXPLOSION - FIT SCREEN PERFECTLY */}
        {stage >= 4 && (
          <div className="flex flex-col items-center justify-center w-full min-h-0 animate-scale-up">
            
            {/* Walkout Trophy Banner */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-amber-500/25 border border-amber-400/80 text-amber-300 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg mb-1 sm:mb-2">
              <Trophy className="w-3.5 h-3.5 fill-amber-400" />
              <span>{player.name} WALKOUT</span>
              <Trophy className="w-3.5 h-3.5 fill-amber-400" />
            </div>

            {/* 3D FC Player Card Hero - Scaled gracefully to available height */}
            <div className="my-1 flex items-center justify-center transform transition-transform duration-300 max-h-[46vh] sm:max-h-[50vh] shrink-1">
              <div className="transform scale-[0.80] sm:scale-[0.90] md:scale-100 origin-center">
                <FCPlayerCard player={player} size="md" isWalkout={true} />
              </div>
            </div>

            {/* PlayStyles+ Callout Banner if available */}
            {playStylePlus && (
              <div className="mt-1.5 sm:mt-2 px-3 py-1.5 rounded-xl bg-[#0c1220]/90 border border-amber-500/40 flex items-center gap-2.5 text-left max-w-sm shadow-xl backdrop-blur-md">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Sparkles className="w-4 h-4 fill-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wide truncate">
                    SIGNATURE: {playStylePlus.name}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-300 leading-tight truncate">
                    {playStylePlus.inGameEffect}
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Bottom Footer Actions Bar */}
      <div className="relative z-30 w-full max-w-md flex items-center justify-center shrink-0 pb-1 pt-2">
        {stage >= 4 ? (
          <button
            id="btn-confirm-walkout"
            onClick={exitWalkout}
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FFE27D] hover:from-[#e5c158] hover:to-[#fff09e] text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#D4AF37]/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>CONFIRM & RETURN TO HUB</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="h-10" />
        )}
      </div>
    </div>
  );
};
