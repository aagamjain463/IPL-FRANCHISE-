import React, { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { MainMenu } from './components/MainMenu';
import { MainAppLayout } from './layouts/MainAppLayout';
import { AuctionLayout } from './layouts/AuctionLayout';
import { MatchLayout } from './layouts/MatchLayout';
import { DashboardView } from './components/DashboardView';
import { AuctionView } from './components/AuctionView';
import { PlayCenterView } from './components/PlayCenterView';
import { PlayingXIView } from './components/PlayingXIView';
import { SquadManagementView } from './components/SquadManagementView';
import { ClubFranchiseView } from './components/ClubFranchiseView';
import { YouthAcademyView } from './components/YouthAcademyView';
import { ScoutDepartmentView } from './components/ScoutDepartmentView';
import { TradeCenterView } from './components/TradeCenterView';
import { StandingsView } from './components/StandingsView';
import { FixturesScheduleView } from './components/FixturesScheduleView';
import { RewardsCenterView } from './components/RewardsCenterView';
import { ChallengesView } from './components/ChallengesView';
import { WhatIfView } from './components/WhatIfView';
import { ProfileLegacyView } from './components/ProfileLegacyView';
import { MatchLiveView } from './components/MatchLiveView';
import { PressConferenceView } from './components/PressConferenceView';
import { PostMatchPresentationView } from './components/PostMatchPresentationView';
import { SEOLandingPage } from './components/SEOLandingPage';
import { IPLAuctionSimulatorPage } from './components/IPLAuctionSimulatorPage';
import { parseCurrentPath } from './utils/router';

const GameContent: React.FC = () => {
  const { 
    gameState, 
    currentScreen, 
    activeTab, 
    setCurrentScreen, 
    setActiveTab 
  } = useGame();

  // Browser Back/Forward navigation listener
  useEffect(() => {
    const handlePopState = () => {
      const { screen, tab } = parseCurrentPath(window.location.pathname);
      setCurrentScreen(screen);
      setActiveTab(tab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentScreen, setActiveTab]);

  // Sync initial route on load if URL has /auction or other direct path
  useEffect(() => {
    if (gameState && currentScreen !== 'MainMenu') {
      const { screen, tab } = parseCurrentPath(window.location.pathname);
      if (screen === 'Auction' && currentScreen !== 'Auction') {
        setCurrentScreen('Auction');
        setActiveTab('AuctionLive');
      } else if (screen === 'MatchLive' && currentScreen !== 'MatchLive') {
        setCurrentScreen('MatchLive');
        setActiveTab('MatchLive');
      }
    }
  }, [gameState]);

  if (!gameState || currentScreen === 'MainMenu') {
    return <MainMenu />;
  }

  // 1. DEDICATED FULL-SCREEN SEPARATE AUCTION GAME MODE
  if (currentScreen === 'Auction' || activeTab === 'AuctionLive') {
    return (
      <AuctionLayout>
        <AuctionView />
      </AuctionLayout>
    );
  }

  // 2. DEDICATED LIVE MATCH ARENA
  if (currentScreen === 'MatchLive' || activeTab === 'MatchLive') {
    return (
      <MatchLayout>
        <MatchLiveView />
      </MatchLayout>
    );
  }

  // 3. PRESS CONFERENCE & POST-MATCH PRESENTATION MODES
  if (currentScreen === 'PressConference') {
    return <PressConferenceView />;
  }

  if (currentScreen === 'PostMatchPresentation') {
    return <PostMatchPresentationView />;
  }

  // 4. STANDARD FRANCHISE HOME SHELL (MainAppLayout with Navbar & Global Tabs)
  return (
    <MainAppLayout>
      {activeTab === 'Dashboard' && <DashboardView />}
      {activeTab === 'Play' && <PlayCenterView />}
      {activeTab === 'PlayingXI' && <PlayingXIView />}
      {activeTab === 'Squad' && <SquadManagementView />}
      {activeTab === 'Club' && <ClubFranchiseView />}
      {activeTab === 'YouthAcademy' && <YouthAcademyView />}
      {activeTab === 'Scout' && <ScoutDepartmentView />}
      {activeTab === 'TradeCenter' && <TradeCenterView />}
      {activeTab === 'Market' && <TradeCenterView />}
      {activeTab === 'Standings' && <StandingsView />}
      {activeTab === 'Schedule' && <FixturesScheduleView />}
      {activeTab === 'Rewards' && <RewardsCenterView />}
      {activeTab === 'Challenges' && <ChallengesView />}
      {activeTab === 'WhatIfSimulator' && <WhatIfView />}
      {activeTab === 'Profile' && <ProfileLegacyView />}
    </MainAppLayout>
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

