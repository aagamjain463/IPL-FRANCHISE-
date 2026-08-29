import { IPLAuctionSimulatorPage } from './components/IPLAuctionSimulatorPage';
import { SEOLandingPage } from './components/SEOLandingPage';
import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { MainMenu } from './components/MainMenu';
import { DashboardView } from './components/DashboardView';
import { AuctionView } from './components/AuctionView';
import { PlayingXIView } from './components/PlayingXIView';
import { MatchLiveView } from './components/MatchLiveView';
import { StandingsView } from './components/StandingsView';
import { SquadManagementView } from './components/SquadManagementView';
import { TradeCenterView } from './components/TradeCenterView';
import { YouthAcademyView } from './components/YouthAcademyView';
import { ChallengesView } from './components/ChallengesView';
import { WhatIfView } from './components/WhatIfView';
import { PressConferenceView } from './components/PressConferenceView';
import { PlayerCardModal } from './components/PlayerCardModal';

const GameContent: React.FC = () => {
  const { 
    gameState, 
    currentScreen, 
    activeTab, 
    selectedPlayerForModal, 
    setSelectedPlayerForModal 
  } = useGame();

  if (!gameState || currentScreen === 'MainMenu') {
    return <MainMenu />;
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e2e8f0] font-sans flex flex-col selection:bg-[#D4AF37] selection:text-black">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-6">
        {/* Render based on Screen or Tab */}
        {currentScreen === 'MatchLive' && <MatchLiveView />}
        {currentScreen === 'Auction' && <AuctionView />}
        {currentScreen === 'PressConference' && <PressConferenceView />}

        {currentScreen === 'Dashboard' && (
          <>
            {activeTab === 'Dashboard' && <DashboardView />}
            {activeTab === 'PlayingXI' && <PlayingXIView />}
            {activeTab === 'Squad' && <SquadManagementView />}
            {activeTab === 'AuctionLive' && <AuctionView />}
            {activeTab === 'Standings' && <StandingsView />}
            {activeTab === 'Schedule' && <StandingsView />}
            {activeTab === 'TradeCenter' && <TradeCenterView />}
            {activeTab === 'YouthAcademy' && <YouthAcademyView />}
            {activeTab === 'Challenges' && <ChallengesView />}
            {activeTab === 'WhatIfSimulator' && <WhatIfView />}
            {activeTab === 'MatchLive' && <MatchLiveView />}
          </>
        )}
      </main>

      {/* Sophisticated Dark Global Footer */}
      <footer className="px-6 md:px-8 py-3 bg-[#05070a] border-t border-[#1e293b] flex flex-col sm:flex-row justify-between items-center gap-2 mt-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#64748b]">
              Simulation Engine Live: {gameState.currentSeason} Season Synchronized
            </span>
          </div>
        </div>
        <div className="text-[10px] text-[#475569] uppercase tracking-wider font-mono">
          Franchise Engine v4.2.1 • Ball-by-Ball Tactical Core
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

export default function App() {
  const pathname = window.location.pathname;

  if (pathname === '/ipl-auction-game') {
    return <SEOLandingPage />;
  }

  if (pathname === '/ipl-auction-simulator') {
    return <IPLAuctionSimulatorPage />;
  }

  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

