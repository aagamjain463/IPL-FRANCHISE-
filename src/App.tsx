import React, { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { MainMenu } from './components/MainMenu';
import { SEOLandingPage } from './components/SEOLandingPage';
import { IPLAuctionSimulatorPage } from './components/IPLAuctionSimulatorPage';
import { GlobalToast } from './components/GlobalToast';
import { parseCurrentPath } from './utils/router';
import { ScreenTransition } from './components/game/ScreenTransition';
import { GameRoutes } from './components/game/GameRoutes';

const GameContent: React.FC = () => {
  const { gameState, currentScreen, activeTab, syncRouteFromPath } = useGame();

  // Browser Back/Forward + direct route sync. GameProvider remains mounted so auction,
  // squad, match, scouting and season state survive screen changes.
  useEffect(() => {
    const syncRoute = () => {
      const { screen, tab } = parseCurrentPath(window.location.pathname);
      syncRouteFromPath(screen, tab);
    };

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('ipl-franchise-location-change', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('ipl-franchise-location-change', syncRoute);
    };
  }, [syncRouteFromPath]);

  useEffect(() => {
    if (!gameState || currentScreen === 'MainMenu') return;
    const { screen, tab } = parseCurrentPath(window.location.pathname);
    syncRouteFromPath(screen, tab);
  }, [gameState]);

  if (!gameState || currentScreen === 'MainMenu') {
    return <MainMenu />;
  }

  return (
    <ScreenTransition screen={currentScreen} tab={activeTab}>
      <GameRoutes />
    </ScreenTransition>
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
      <GlobalToast />
    </GameProvider>
  );
}
