import { Player, MatchState, MatchPlayingXI, TacticalInstructions, PitchType } from './cricket';
import { Team } from './team';
import { AuctionState } from './auction';
import { StandingsRow, TournamentFixture, SeasonAwards } from './tournament';
import { ScoutingDepartmentData } from './scout';
import { FranchiseProgressionState } from './franchise';

export type GameMode = 'Authentic IPL' | 'Mega Auction Mode' | 'Full Season' | 'Dynasty Career' | 'Quick Match' | 'What-If Simulator' | 'Scenario Challenge';

// === PRIMARY NAVIGATION SECTIONS ===
// Consolidated to 5 main sections for premium sports game navigation
export type AppTab = 
  | 'Home'        // Franchise hub, dashboard, overview
  | 'Play'        // Matchday, moments, schedule, quick match, challenges
  | 'Squad'       // Playing XI, squad management, player development
  | 'Auction'     // Auction arena, scouting, market
  | 'Club';       // Franchise, trophy room, stadium, rivalries, legacy

// === LEGACY TAB SUPPORT ===
// These are mapped to primary sections for backward compatibility
export type LegacyAppTab = 
  | 'Dashboard'
  | 'PlayingXI'
  | 'Squad'
  | 'AuctionLive'
  | 'Scout'
  | 'YouthAcademy'
  | 'TradeCenter'
  | 'Market'
  | 'Standings'
  | 'League'
  | 'Schedule'
  | 'Profile'
  | 'Rewards'
  | 'Challenges'
  | 'WhatIfSimulator'
  | 'MatchLive';

// === TAB MAPPING FOR BACKWARD COMPATIBILITY ===
export function mapLegacyTabToPrimary(legacyTab: LegacyAppTab): AppTab {
  const mapping: Record<LegacyAppTab, AppTab> = {
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
  return mapping[legacyTab] || 'Home';
}

export type ScreenView = 'MainMenu' | 'Dashboard' | 'Auction' | 'MatchLive' | 'PressConference' | 'PostMatchPresentation';
export type GameScreen = ScreenView;

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  fullBody?: string;
  timestampFormatted: string;
  relatedTeamId?: string;
  impactRating?: string;
  teamId?: string;
}

export interface PressOption {
  text: string;
  ownerTrustChange: number;
  playerMoraleChange: number;
  tacticalStyle?: string;
}

export interface PressQuestion {
  id: string;
  journalistName: string;
  mediaOutlet: string;
  questionText: string;
  options: PressOption[];
}

export interface PressConferenceState {
  questions: PressQuestion[];
  currentQuestionIndex: number;
  matchId: string;
}

export interface WhatIfComparisonResult {
  iterations: number;
  planA: {
    name: string;
    winPercentage: number;
    avgScore: number;
    avgWicketsLost: number;
  };
  planB: {
    name: string;
    winPercentage: number;
    avgScore: number;
    avgWicketsLost: number;
  };
  analysisRecommendation: string;
}

export interface TradeOffer {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  offeredPlayerIds: string[];
  requestedPlayerIds: string[];
  cashCr: number;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Countered';
  aiReasoning?: string;
}

export interface SeasonHistoryRecord {
  seasonYear: number;
  championTeamId: string;
  runnerUpTeamId: string;
  userTeamFinish: string;
  orangeCap: string;
  purpleCap: string;
  mvp: string;
  userRecord: string;
}

export interface GameSave {
  id?: string;
  saveId?: string;
  saveName: string;
  timestamp?: number;
  updatedAt?: number;
  currentSeason: number;
  seasonStage?: string;
  managerName: string;
  userTeamId: string;
  userRole?: string;
  teams: Record<string, Team>;
  allPlayers: Record<string, Player>;
  standings: StandingsRow[];
  leagueSchedule: TournamentFixture[];
  currentFixtureIndex: number;
  newsFeed: NewsArticle[];
  youthAcademyPool?: Player[];
  scoutingDepartment?: ScoutingDepartmentData;
  tradeOffers?: TradeOffer[];
  franchiseAchievements?: string[];
  progression?: FranchiseProgressionState;
  retiredPlayers?: Player[];
  seasonHistory?: SeasonHistoryRecord[];
  auctionState?: AuctionState | null;
  currentMatchState?: MatchState | null;
  pressConferenceState?: PressConferenceState | null;
  currentScreen?: ScreenView;
}
