import { GameScreen, AppTab } from '../types/game';

export interface AppRoute {
  path: string;
  screen: GameScreen;
  tab: AppTab;
  isStandaloneMode: boolean;
}

export const ROUTES: Record<string, AppRoute> = {
  '/': { path: '/', screen: 'Dashboard', tab: 'Dashboard', isStandaloneMode: false },
  '/home': { path: '/home', screen: 'Dashboard', tab: 'Dashboard', isStandaloneMode: false },
  '/auction': { path: '/auction', screen: 'Auction', tab: 'AuctionLive', isStandaloneMode: true },
  '/play': { path: '/play', screen: 'Dashboard', tab: 'Play', isStandaloneMode: false },
  '/match': { path: '/match', screen: 'MatchLive', tab: 'MatchLive', isStandaloneMode: true },
  '/play/live': { path: '/play/live', screen: 'MatchLive', tab: 'MatchLive', isStandaloneMode: true },
  '/squad': { path: '/squad', screen: 'Dashboard', tab: 'Squad', isStandaloneMode: false },
  '/tactics': { path: '/tactics', screen: 'Dashboard', tab: 'PlayingXI', isStandaloneMode: false },
  '/scout': { path: '/scout', screen: 'Dashboard', tab: 'YouthAcademy', isStandaloneMode: false },
  '/market': { path: '/market', screen: 'Dashboard', tab: 'TradeCenter', isStandaloneMode: false },
  '/club': { path: '/club', screen: 'Dashboard', tab: 'Club', isStandaloneMode: false },
  '/league': { path: '/league', screen: 'Dashboard', tab: 'Standings', isStandaloneMode: false },
  '/profile': { path: '/profile', screen: 'Dashboard', tab: 'Profile', isStandaloneMode: false },
  '/rewards': { path: '/rewards', screen: 'Dashboard', tab: 'Rewards', isStandaloneMode: false },
  '/challenges': { path: '/challenges', screen: 'Dashboard', tab: 'Challenges', isStandaloneMode: false },
  '/whatif': { path: '/whatif', screen: 'Dashboard', tab: 'WhatIfSimulator', isStandaloneMode: false }
};

export const getRouteForState = (screen: GameScreen, tab: AppTab): string => {
  if (screen === 'Auction' || tab === 'AuctionLive') return '/auction';
  if (screen === 'MatchLive' || tab === 'MatchLive') return '/play/live';
  if (screen === 'PressConference') return '/press';
  if (screen === 'PostMatchPresentation') return '/presentation';

  switch (tab) {
    case 'Play': return '/play';
    case 'Squad': return '/squad';
    case 'PlayingXI': return '/tactics';
    case 'YouthAcademy':
    case 'Scout': return '/scout';
    case 'TradeCenter':
    case 'Market': return '/market';
    case 'Club': return '/club';
    case 'Standings':
    case 'League': return '/league';
    case 'Schedule': return '/league';
    case 'Profile': return '/profile';
    case 'Rewards': return '/rewards';
    case 'Challenges': return '/challenges';
    case 'WhatIfSimulator': return '/whatif';
    case 'Dashboard':
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
  return { screen: 'Dashboard', tab: 'Dashboard', isStandalone: false };
};
