import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ArrowLeft, Radio, Trophy, AlertTriangle, Shield, Volume2, VolumeX } from 'lucide-react';
import { PlayerCardModal } from '../components/PlayerCardModal';
import { MusicPlayerHud } from '../components/MusicPlayerHud';

interface MatchLayoutProps {
  children: React.ReactNode;
}

export const MatchLayout: React.FC<MatchLayoutProps> = ({ children }) => {
  const { 
    gameState, 
    setCurrentScreen, 
    setActiveTab, 
    isMuted, 
    toggleMute,
    selectedPlayerForModal,
    setSelectedPlayerForModal
  } = useGame();

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  if (!gameState || !gameState.currentMatchState) return null;

  const match = gameState.currentMatchState;
  const teamA = gameState.teams[match.teamAId];
  const teamB = gameState.teams[match.teamBId];

  const handleExitMatch = () => {
    setCurrentScreen('Dashboard');
    setActiveTab('Play');
    window.history.pushState({}, '', '/play');
  };

  return (
    <div className="fc-scanlines min-h-screen w-full bg-[#030712] text-[#e2e8f0] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black relative">
      {/* Stadium atmosphere */}
      <div className="fc-atmosphere"><div className="fc-atmosphere-grid" /></div>
      {/* MATCH TOP BAR */}
      <header className="fc-header sticky top-0 z-40 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-[#1e293b] hover:border-red-500/40 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            title="Exit Match Arena"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Match</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-bold border border-red-500/30 animate-pulse flex items-center gap-1">
              <Radio className="w-3 h-3" />
              LIVE
            </span>
            <span className="text-xs font-black text-white uppercase tracking-tight">
              {teamA?.shortName} <span className="text-[#D4AF37]">vs</span> {teamB?.shortName}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-[#94a3b8] hidden md:inline font-medium">
            {match.venue}
          </span>
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] transition cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-green-400" />}
          </button>
        </div>
      </header>

      {/* FULL MATCH ARENA CONTENT */}
      <main className="relative z-10 flex-1 w-full p-3 sm:p-5 md:p-6 max-w-[1800px] mx-auto">
        {children}
      </main>

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Leave Live Match?</h3>
                <p className="text-xs text-[#94a3b8]">Match state will remain active</p>
              </div>
            </div>

            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Are you sure you want to leave the live match arena? You can resume play from the Play Center at any time.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Resume Match
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleExitMatch();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Exit to Play Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Player Card Modal */}
      <PlayerCardModal
        player={selectedPlayerForModal}
        onClose={() => setSelectedPlayerForModal(null)}
      />

      {/* Floating Audio Soundtrack & Live Broadcast HUD */}
      <MusicPlayerHud />
    </div>
  );
};
