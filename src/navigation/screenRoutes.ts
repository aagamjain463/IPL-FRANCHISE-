import { AppTab, GameScreen } from '../types/game';

export type ScreenVariant = 'hub' | 'auction' | 'franchise' | 'squad' | 'scouting' | 'academy' | 'tournament' | 'match' | 'press' | 'settings';

export interface ScreenRouteMeta {
  path: string;
  screen: GameScreen;
  tab: AppTab;
  title: string;
  eyebrow: string;
  subtitle: string;
  variant: ScreenVariant;
  isStandaloneMode: boolean;
  loadingMessages: string[];
}

export const SCREEN_ROUTES: ScreenRouteMeta[] = [
  {
    path: '/',
    screen: 'Dashboard',
    tab: 'Dashboard',
    title: 'Franchise Hub',
    eyebrow: 'Home Command',
    subtitle: 'Season command centre, objectives, next match and world gateways.',
    variant: 'hub',
    isStandaloneMode: false,
    loadingMessages: ['Opening Franchise Hub', 'Syncing Season State', 'Updating Club Briefing']
  },
  {
    path: '/home',
    screen: 'Dashboard',
    tab: 'Dashboard',
    title: 'Franchise Hub',
    eyebrow: 'Home Command',
    subtitle: 'Season command centre, objectives, next match and world gateways.',
    variant: 'hub',
    isStandaloneMode: false,
    loadingMessages: ['Opening Franchise Hub', 'Syncing Season State', 'Updating Club Briefing']
  },
  {
    path: '/franchise',
    screen: 'Dashboard',
    tab: 'Club',
    title: 'Franchise HQ',
    eyebrow: 'Club Operations',
    subtitle: 'Facilities, staff, finances, reputation and long-term club identity.',
    variant: 'franchise',
    isStandaloneMode: false,
    loadingMessages: ['Opening Franchise HQ', 'Loading Club Operations', 'Preparing Management Dashboard']
  },
  {
    path: '/auction',
    screen: 'Auction',
    tab: 'AuctionLive',
    title: 'Auction Room',
    eyebrow: 'Live Mega Auction',
    subtitle: 'Player walkouts, rival paddles, purse pressure and hammer moments.',
    variant: 'auction',
    isStandaloneMode: true,
    loadingMessages: ['Preparing Auction Room', 'Loading Player Pool', 'Synchronizing Franchises']
  },
  {
    path: '/multiplayer-auction',
    screen: 'MultiplayerAuction',
    tab: 'MultiplayerAuction',
    title: 'Live Multiplayer Auction',
    eyebrow: 'Online War Room',
    subtitle: 'Host or join real public auction rooms with live participants only.',
    variant: 'auction',
    isStandaloneMode: false,
    loadingMessages: ['Opening Multiplayer Auction', 'Fetching Live Rooms', 'Syncing Real-Time Lobby']
  },
  {
    path: '/squad',
    screen: 'Dashboard',
    tab: 'Squad',
    title: 'Squad Gallery',
    eyebrow: 'Player Cards',
    subtitle: 'Roster cards, form pulses, profiles and evolution-ready player identity.',
    variant: 'squad',
    isStandaloneMode: false,
    loadingMessages: ['Loading Squad', 'Analyzing Player Form', 'Preparing Team Sheet']
  },
  {
    path: '/playing-xi',
    screen: 'Dashboard',
    tab: 'PlayingXI',
    title: 'Playing XI Lab',
    eyebrow: 'Tactical Selection',
    subtitle: 'XI balance, roles, captaincy, overseas caps and matchday chemistry.',
    variant: 'squad',
    isStandaloneMode: false,
    loadingMessages: ['Loading Squad', 'Analyzing Player Form', 'Preparing Team Sheet']
  },
  {
    path: '/scouting',
    screen: 'Dashboard',
    tab: 'Scout',
    title: 'Scouting Network',
    eyebrow: 'Talent Intelligence',
    subtitle: 'Find undervalued players, track watchlists and inspect scout alerts.',
    variant: 'scouting',
    isStandaloneMode: false,
    loadingMessages: ['Scanning Talent Network', 'Analyzing Player Data', 'Updating Scout Reports']
  },
  {
    path: '/youth-academy',
    screen: 'Dashboard',
    tab: 'YouthAcademy',
    title: 'Youth Academy',
    eyebrow: 'Prospect Pipeline',
    subtitle: 'Develop prospects, sign academy talent and build the dynasty future.',
    variant: 'academy',
    isStandaloneMode: false,
    loadingMessages: ['Opening Academy', 'Developing Prospects', 'Analyzing Potential']
  },
  {
    path: '/tournament',
    screen: 'Dashboard',
    tab: 'League',
    title: 'Tournament Centre',
    eyebrow: 'Competition Control',
    subtitle: 'Fixtures, standings, playoff path, qualification and league records.',
    variant: 'tournament',
    isStandaloneMode: false,
    loadingMessages: ['Preparing Tournament', 'Generating Fixtures', 'Loading Competition Data']
  },
  {
    path: '/match',
    screen: 'MatchLive',
    tab: 'MatchLive',
    title: 'Matchday',
    eyebrow: 'Live Cricket Arena',
    subtitle: 'Score, overs, win probability, tactics, events and commentary control.',
    variant: 'match',
    isStandaloneMode: true,
    loadingMessages: ['Preparing Matchday', 'Setting Stadium', 'Finalizing Lineups']
  },
  {
    path: '/standings',
    screen: 'Dashboard',
    tab: 'Standings',
    title: 'Standings',
    eyebrow: 'League Table',
    subtitle: 'Points table, NRR, qualification pulse and championship pressure.',
    variant: 'tournament',
    isStandaloneMode: false,
    loadingMessages: ['Preparing Tournament', 'Loading Points Table', 'Calculating Qualification Status']
  },
  {
    path: '/challenges',
    screen: 'Dashboard',
    tab: 'Challenges',
    title: 'Challenges',
    eyebrow: 'Scenario Arena',
    subtitle: 'High-pressure moments, special objectives and reward-driven trials.',
    variant: 'match',
    isStandaloneMode: false,
    loadingMessages: ['Loading Challenge Arena', 'Preparing Scenario Cards', 'Syncing Rewards']
  },
  {
    path: '/trade-center',
    screen: 'Dashboard',
    tab: 'TradeCenter',
    title: 'Trade Center',
    eyebrow: 'Market Room',
    subtitle: 'Negotiate squad upgrades, exchange players and reshape your roster.',
    variant: 'franchise',
    isStandaloneMode: false,
    loadingMessages: ['Opening Trade Center', 'Contacting Rival Front Offices', 'Evaluating Market Values']
  },
  {
    path: '/press-conference',
    screen: 'PressConference',
    tab: 'News',
    title: 'Press Conference',
    eyebrow: 'Media Room',
    subtitle: 'Answer the press, manage morale and shape the franchise narrative.',
    variant: 'press',
    isStandaloneMode: false,
    loadingMessages: ['Opening Media Room', 'Loading Journalist Questions', 'Preparing Broadcast Feed']
  },
  {
    path: '/news',
    screen: 'Dashboard',
    tab: 'News',
    title: 'Newsroom',
    eyebrow: 'Broadcast Wire',
    subtitle: 'Club headlines, media reaction and league-wide storylines.',
    variant: 'press',
    isStandaloneMode: false,
    loadingMessages: ['Opening Newsroom', 'Loading Headlines', 'Preparing Broadcast Wire']
  },
  {
    path: '/settings',
    screen: 'Dashboard',
    tab: 'Profile',
    title: 'Settings & Legacy',
    eyebrow: 'Manager Profile',
    subtitle: 'Legacy, records, cloud profile, themes and campaign controls.',
    variant: 'settings',
    isStandaloneMode: false,
    loadingMessages: ['Opening Settings', 'Loading Manager Profile', 'Syncing Legacy Records']
  },
  // Backwards-compatible legacy routes retained so old saves/bookmarks keep working.
  { path: '/play', screen: 'Dashboard', tab: 'Play', title: 'Match Center', eyebrow: 'Play Hub', subtitle: 'Fixtures, quick actions and match preparation.', variant: 'match', isStandaloneMode: false, loadingMessages: ['Preparing Matchday', 'Loading Fixtures', 'Finalizing Team Sheet'] },
  { path: '/play/live', screen: 'MatchLive', tab: 'MatchLive', title: 'Matchday', eyebrow: 'Live Cricket Arena', subtitle: 'Score, overs and strategy control.', variant: 'match', isStandaloneMode: true, loadingMessages: ['Preparing Matchday', 'Setting Stadium', 'Finalizing Lineups'] },
  { path: '/tactics', screen: 'Dashboard', tab: 'PlayingXI', title: 'Playing XI Lab', eyebrow: 'Tactical Selection', subtitle: 'Select your matchday XI.', variant: 'squad', isStandaloneMode: false, loadingMessages: ['Loading Squad', 'Analyzing Player Form', 'Preparing Team Sheet'] },
  { path: '/academy', screen: 'Dashboard', tab: 'YouthAcademy', title: 'Youth Academy', eyebrow: 'Prospect Pipeline', subtitle: 'Develop the next generation.', variant: 'academy', isStandaloneMode: false, loadingMessages: ['Opening Academy', 'Developing Prospects', 'Analyzing Potential'] },
  { path: '/club', screen: 'Dashboard', tab: 'Club', title: 'Franchise HQ', eyebrow: 'Club Operations', subtitle: 'Manage facilities and finances.', variant: 'franchise', isStandaloneMode: false, loadingMessages: ['Opening Franchise HQ', 'Loading Club Operations', 'Preparing Management Dashboard'] },
  { path: '/league', screen: 'Dashboard', tab: 'League', title: 'Tournament Centre', eyebrow: 'Competition Control', subtitle: 'Fixtures and table.', variant: 'tournament', isStandaloneMode: false, loadingMessages: ['Preparing Tournament', 'Generating Fixtures', 'Loading Competition Data'] },
  { path: '/market', screen: 'Dashboard', tab: 'TradeCenter', title: 'Trade Center', eyebrow: 'Market Room', subtitle: 'Negotiate squad upgrades.', variant: 'franchise', isStandaloneMode: false, loadingMessages: ['Opening Trade Center', 'Contacting Rival Front Offices', 'Evaluating Market Values'] },
  { path: '/profile', screen: 'Dashboard', tab: 'Profile', title: 'Settings & Legacy', eyebrow: 'Manager Profile', subtitle: 'Profile and records.', variant: 'settings', isStandaloneMode: false, loadingMessages: ['Opening Settings', 'Loading Manager Profile', 'Syncing Legacy Records'] },
  { path: '/rewards', screen: 'Dashboard', tab: 'Rewards', title: 'Objectives Vault', eyebrow: 'Rewards', subtitle: 'Claim objectives and progression rewards.', variant: 'hub', isStandaloneMode: false, loadingMessages: ['Opening Rewards Vault', 'Checking Objectives', 'Syncing Prize Ledger'] },
  { path: '/leaderboard', screen: 'Dashboard', tab: 'Leaderboard', title: 'World Rankings', eyebrow: 'Global Leaderboard', subtitle: 'Competitive auction rankings backed by server-confirmed results.', variant: 'hub', isStandaloneMode: false, loadingMessages: ['Loading World Rankings', 'Validating Server Results', 'Preparing Rank Table'] },
  { path: '/whatif', screen: 'Dashboard', tab: 'WhatIfSimulator', title: 'What-If Lab', eyebrow: 'Simulation', subtitle: 'Run alternative cricket futures.', variant: 'scouting', isStandaloneMode: false, loadingMessages: ['Opening Simulation Lab', 'Loading Tactical Models', 'Preparing What-If Engine'] },
  { path: '/offseason', screen: 'Dashboard', tab: 'OffSeason', title: 'Off-Season', eyebrow: 'Dynasty Reset', subtitle: 'Retentions, pitch planning and next auction preparation.', variant: 'franchise', isStandaloneMode: false, loadingMessages: ['Opening Off-Season Room', 'Loading Retention Board', 'Preparing Next Season'] },
  { path: '/recap', screen: 'Dashboard', tab: 'SeasonRecap', title: 'Season Recap', eyebrow: 'Awards Night', subtitle: 'Awards, champions and campaign history.', variant: 'tournament', isStandaloneMode: false, loadingMessages: ['Opening Awards Stage', 'Loading Season History', 'Preparing Trophy Presentation'] }
];

export const ROUTE_BY_PATH = SCREEN_ROUTES.reduce<Record<string, ScreenRouteMeta>>((acc, route) => {
  acc[route.path] = route;
  return acc;
}, {});

const PREFERRED_TAB_ROUTES: Partial<Record<AppTab, string>> = {
  Dashboard: '/home',
  AuctionLive: '/auction',
  Squad: '/squad',
  PlayingXI: '/playing-xi',
  Scout: '/scouting',
  YouthAcademy: '/youth-academy',
  League: '/tournament',
  Standings: '/standings',
  Challenges: '/challenges',
  TradeCenter: '/trade-center',
  Market: '/trade-center',
  Club: '/franchise',
  MatchLive: '/match',
  Play: '/play',
  Profile: '/settings',
  News: '/news',
  Rewards: '/rewards',
  Leaderboard: '/leaderboard',
  WhatIfSimulator: '/whatif',
  OffSeason: '/offseason',
  SeasonRecap: '/recap',
  MultiplayerAuction: '/multiplayer-auction'
};

export const getRouteMetaByPath = (pathname: string): ScreenRouteMeta => {
  const clean = pathname.replace(/\/$/, '') || '/';
  return ROUTE_BY_PATH[clean] || ROUTE_BY_PATH['/home'] || SCREEN_ROUTES[0];
};

export const getRouteMetaForState = (screen: GameScreen, tab: AppTab): ScreenRouteMeta => {
  if (screen === 'MultiplayerAuction' || tab === 'MultiplayerAuction') return ROUTE_BY_PATH['/multiplayer-auction'];
  if (screen === 'Auction' || tab === 'AuctionLive') return ROUTE_BY_PATH['/auction'];
  if (screen === 'MatchLive' || tab === 'MatchLive') return ROUTE_BY_PATH['/match'];
  if (screen === 'PressConference' || screen === 'PostMatchPresentation') return ROUTE_BY_PATH['/press-conference'];
  const path = PREFERRED_TAB_ROUTES[tab] || '/home';
  return ROUTE_BY_PATH[path] || ROUTE_BY_PATH['/home'];
};

export const getRouteForTab = (tab: AppTab): string => PREFERRED_TAB_ROUTES[tab] || '/home';
