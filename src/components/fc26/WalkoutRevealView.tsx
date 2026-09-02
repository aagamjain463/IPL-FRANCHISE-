import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { FCPlayerCard } from './FCPlayerCard';
import { getFCCardTier, getPlayerPlayStylePlus } from '../../engine/fc26Engine';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, ChevronRight, X, ArrowLeft, RotateCcw } from 'lucide-react';

export const WalkoutRevealView: React.FC = () => {
  const { gameState, currentWalkoutPlayer, exitWalkout, setActiveTab } = useGame();
  const [stage, setStage] = useState(0);

  const player = currentWalkoutPlayer
    ? (typeof currentWalkoutPlayer === 'string'
        ? gameState?.allPlayers?.[currentWalkoutPlayer]
        : currentWalkoutPlayer)
    : null;

  useEffect(() => {
    if (!player) return;

    setStage(0);

    const timers = [
      window.setTimeout(() => setStage(1), 500),
      window.setTimeout(() => setStage(2), 1200),
      window.setTimeout(() => setStage(3), 1900),
      window.setTimeout(() => setStage(4), 2800),
    ];

    return () => timers.forEach(clearTimeout);
  }, [player]);

  useEffect(() => {
    if (stage >= 4 && player) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
      });
    }
  }, [stage, player]);

  const countryFlags: Record<string, string> = {
    India: '🇮🇳',
    Australia: '🇦🇺',
    England: '🏴',
    'South Africa': '🇿🇦',
    'New Zealand': '🇳🇿',
    Pakistan: '🇵🇰',
    'Sri Lanka': '🇱🇰',
    Bangladesh: '🇧🇩',
    Afghanistan: '🇦🇫',
    WestIndies: '🏝️',
    'West Indies': '🏝️',
  };

  const tier = useMemo(
    () => player ? getFCCardTier(player) : null,
    [player]
  );

  const playStylePlus = useMemo(
    () => player ? getPlayerPlayStylePlus(player) : null,
    [player]
  );

  if (!player) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#030712] text-white">
        <button
          onClick={exitWalkout}
          className="px-5 py-3 rounded-xl bg-white/10 border border-white/20"
        >
          Return
        </button>
      </div>
    );
  }

  const flag = countryFlags[player.nationality] || '🏏';

  const displayName =
    player.name ||
    `${player.firstName || ''} ${player.lastName || ''}`.trim() ||
    'Unknown Player';

  const rating =
    (player as any).overall ??
    (player as any).rating ??
    (player as any).overallRating ??
    85;

  const handleContinue = () => {
    exitWalkout();
    setActiveTab('PlayingXI');
  };

  return (
    <div className="absolute inset-0 w-full max-w-full flex flex-col items-center justify-between p-2 sm:p-4 select-none overflow-hidden">
      {/* Stadium Spotlight Beams Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-80 sm:w-96 h-full bg-gradient-to-b from-blue-500/15 via-indigo-500/5 to-transparent transform -rotate-12 blur-3xl" />
        <div className="absolute top-0 right-1/4 w-80 sm:w-96 h-full bg-gradient-to-b from-purple-500/15 via-blue-500/5 to-transparent transform rotate-12 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.18),transparent_55%)]" />
      </div>

      {/* Top Header Controls Bar */}
      <div className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-between shrink-0 pt-1 pb-2">
        <button
          id="btn-return-from-walkout"
          onClick={exitWalkout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">
            Back
          </span>
        </button>

        <div className="flex items-center gap-2 text-white/50">
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em]">
            Player Reveal
          </span>
        </div>

        <button
          onClick={exitWalkout}
          className="p-2 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Center Stage */}
      <div className="relative z-20 w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col items-center justify-center text-center py-1">

        {stage < 4 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative mb-4 sm:mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full border border-white/20 bg-white/5 flex items-center justify-center">
                <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-white/80 animate-pulse" />
              </div>
            </div>

            <p className="text-white/40 text-[10px] sm:text-xs font-black uppercase tracking-[0.35em]">
              {stage < 2 ? 'Scanning Player Database' : 'Elite Player Detected'}
            </p>

            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2, 3].map(i => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    i <= stage ? 'bg-white scale-125' : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="shrink-0 mb-1 sm:mb-2">
              <div className="flex items-center justify-center gap-2 text-amber-300">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em]">
                  {tier?.name || 'Elite Player'}
                </span>
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <h1 className="mt-1 text-xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                {displayName}
              </h1>

              <p className="text-white/50 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                {flag} {player.nationality || 'International'} · Rating {rating}
              </p>
            </div>

            {/* 3D FC Player Card Hero - Arena responsive scaling */}
            <div className="my-1 flex items-center justify-center w-full min-h-0 overflow-hidden">
              <div className="fc-walkout-card-frame grid place-items-center max-h-[46dvh] sm:max-h-[48dvh] md:max-h-[52dvh] lg:max-h-[54dvh]">
                <div className="transform scale-[0.72] sm:scale-[0.82] md:scale-[0.92] lg:scale-100 origin-center">
                  <FCPlayerCard player={player} size="md" isWalkout={true} />
                </div>
              </div>
            </div>

            {playStylePlus && (
              <div className="mt-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                ✦ {playStylePlus.name}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Footer Actions Bar */}
      <div className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-center shrink-0 pb-1 pt-2">
        {stage >= 4 ? (
          <button
            id="btn-confirm-walkout"
            onClick={handleContinue}
            className="group flex items-center gap-2 px-6 sm:px-8 py-3 rounded-xl bg-white text-black hover:bg-amber-300 transition-all font-black text-xs uppercase tracking-widest shadow-[0_0_40px_rgba(255,255,255,0.15)]"
          >
            Continue
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="flex items-center gap-2 text-white/30">
            <RotateCcw className="w-3 h-3 animate-spin" />
            <span className="text-[9px] uppercase tracking-widest font-black">
              Revealing...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
