import { GameScreen, AppTab, mapLegacyTabToPrimary, LegacyAppTab } from '../types/game';

export interface AppRoute {
  path: string;
  screen: GameScreen;
  tab: AppTab;
  isStandaloneMode: boolean;
}

// === PRIMARY NAVIGATION ROUTES ===
// Updated for 5-section navigation structure
export const ROUTES: Record<string, AppRoute> = {
  '/': { path: '/', screen: 'Dashboard', tab: 'Home', isStandaloneMode: false },
  '/home': { path: '/home', screen: 'Dashboard', tab: 'Home', isStandaloneMode: false },
  '/auction': { path: '/auction', screen: 'Auction', tab: 'Auction', isStandaloneMode: true },
  '/play': { path: '/play', screen: 'Dashboard', tab: 'Play', isStandaloneMode: false },
  '/match': { path: '/match', screen: 'MatchLive', tab: 'Play', isStandaloneMode: true },
  '/play/live': { path: '/play/live', screen: 'MatchLive', tab: 'Play', isStandaloneMode: true },
  '/squad': { path: '/squad', screen: 'Dashboard', tab: 'Squad', isStandaloneMode: false },
  '/tactics': { path: '/tactics', screen: 'Dashboard', tab: 'Squad', isStandaloneMode: false },
  '/scout': { path: '/scout', screen: 'Dashboard', tab: 'Auction', isStandaloneMode: false },
  '/market': { path: '/market', screen: 'Dashboard', tab: 'Auction', isStandaloneMode: false },
  '/club': { path: '/club', screen: 'Dashboard', tab: 'Club', isStandaloneMode: false },
  '/league': { path: '/league', screen: 'Dashboard', tab: 'Club', isStandaloneMode: false },
  '/profile': { path: '/profile', screen: 'Dashboard', tab: 'Club', isStandaloneMode: false },
  '/rewards': { path: '/rewards', screen: 'Dashboard', tab: 'Club', isStandaloneMode: false },
  '/challenges': { path: '/challenges', screen: 'Dashboard', tab: 'Play', isStandaloneMode: false },
  '/whatif': { path: '/whatif', screen: 'Dashboard', tab: 'Play', isStandaloneMode: false }
};

// === LEGACY ROUTE SUPPORT ===
// Support for old URLs that may still be in use
export const LEGACY_ROUTE_MAPPING: Record<string, AppTab> = {
  'Dashboard': 'Home',
  'PlayingXI': 'Squad',
  'Squad': 'Squad',
  'AuctionLive': 'Auction',
  'Scout': 'Auction',
  'YouthAcademy': 'Squad',
  'TradeCenter': 'Auction',
  'Market': 'Auction',
  'Standings': 'Club',
  'League': 'Club',
  'Schedule': 'Play',
  'Profile': 'Club',
  'Rewards': 'Club',
  'Challenges': 'Play',
  'WhatIfSimulator': 'Play',
  'MatchLive': 'Play'
};

export const getRouteForState = (screen: GameScreen, tab: AppTab | LegacyAppTab): string => {
  // Handle legacy tabs by mapping to primary sections
  const primaryTab = LEGACY_ROUTE_MAPPING[tab as LegacyAppTab] || tab as AppTab;
  
  if (screen === 'Auction' || primaryTab === 'Auction') return '/auction';
  if (screen === 'MatchLive' || primaryTab === 'Play') return '/play/live';
  if (screen === 'PressConference') return '/press';
  if (screen === 'PostMatchPresentation') return '/presentation';

  switch (primaryTab) {
    case 'Play': return '/play';
    case 'Squad': return '/squad';
    case 'Auction': return '/auction';
    case 'Club': return '/club';
    case 'Home':
    default:
      return '/';
  }
};

export const parseCurrentPath = (pathname: string): { screen: GameScreen; tab: AppTab; isStandalone: boolean } => {
  const clean = pathname.replace(/\/$/, '') || '/';
  const match = ROUTES[clean];
  if (match) {
    return { screen: match.screen, tab: match.tab, isStandalone: match.isStandaloneMode };
  }
  return { screen: 'Dashboard', tab: 'Home', isStandalone: false };
};
