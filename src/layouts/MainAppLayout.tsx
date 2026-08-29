import React from 'react';
import { useGame } from '../context/GameContext';
import { Navbar } from '../components/Navbar';
import { MusicPlayerHud } from '../components/MusicPlayerHud';
import { PlayerCardModal } from '../components/PlayerCardModal';

interface MainAppLayoutProps {
  children: React.ReactNode;
}

export const MainAppLayout: React.FC<MainAppLayoutProps> = ({ children }) => {
  const { gameState, selectedPlayerForModal, setSelectedPlayerForModal } = useGame();

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col selection:bg-gold selection:text-black relative">
      {/* Global Navigation Hub (Top Bar + Desktop Tabs + Mobile Bottom Nav) */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-6 pb-20 md:pb-12">
        {children}
      </main>

      {/* Floating Audio Soundtrack Controller */}
      <MusicPlayerHud />

      {/* Sophisticated Dark Global Footer */}
      <footer className="hidden md:flex px-6 md:px-8 py-3 bg-canvas border-t border-line justify-between items-center gap-2 mt-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-faint">
              FRANCHISE XI ENGINE: {gameState.currentSeason} Season Synchronized
            </span>
          </div>
        </div>
        <div className="text-[10px] text-ink-faint/70 uppercase tracking-wider font-mono">
          Build. Bid. Dominate. • Ball-by-Ball Tactical Core
        </div>
      </footer>

      {/* Global Player Card Modal */}
      <PlayerCardModal
        player={selectedPlayerForModal}
        onClose={() => setSelectedPlayerForModal(null)}
      />
    </div>
  );
};
