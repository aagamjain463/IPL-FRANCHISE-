import { Player, MatchState, MatchPlayingXI, TacticalInstructions, PitchType } from './cricket';
import { Team } from './team';
import { AuctionState } from './auction';
import { StandingsRow, TournamentFixture, SeasonAwards } from './tournament';
import { ScoutingDepartmentData } from './scout';
import { FranchiseProgressionState } from './franchise';

export const SAVE_VERSION = 2;

export interface SeasonSummary {
  seasonYear: number;
  championTeamId: string;
  runnerUpTeamId: string;
  userTeamFinish: string; // 'Champions' | 'Runners-Up' | 'Qualifier 1' | 'Eliminator' | 'League Stage'
  userRecord: string;
  orangeCap: { playerId: string; playerName: string; teamShortName: string; runs: number };
  purpleCap: { playerId: string; playerName: string; teamShortName: string; wickets: number };
  mvp: { playerId: string; playerName: string; teamShortName: string; pts: number };
  emergingPlayer: { playerId: string; playerName: string; teamShortName: string; reason: string };
  playoffResults: Array<{ stage: string; resultText: string }>;
  awardWinners: Array<{ playerId: string; playerName: string; teamShortName: string; award: string }>;
}

export type GameMode = 'Authentic IPL' | 'Mega Auction Mode' | 'Full Season' | 'Dynasty Career' | 'Quick Match' | 'What-If Simulator' | 'Scenario Challenge';

export type AppTab = 
  | 'Dashboard' // Home
  | 'Play' // Dedicated Play center (Matchday, Quick Match, Moments, Schedule)
  | 'PlayingXI'
  | 'Squad' // Dedicated Squad & Development
  | 'FCEvolutions' // FC 26 Wonderkid Evolutions Academy
  | 'TacticsRadar' // FC IQ 3D Tactical Field & Pitch Radar
  | 'AuctionLive' // Dedicated Auction
  | 'MultiplayerAuction' // Real-time live multiplayer auction war rooms
  | 'Scout' // Dedicated Scout department
  | 'YouthAcademy'
  | 'TradeCenter' // Market & Transfers
  | 'Market'
  | 'Club' // Facilities & Staff & Finances
  | 'Standings' // League & Table
  | 'League'
  | 'Schedule' // Fixtures
  | 'Profile' // Legacy & Trophies & Records
  | 'Rewards' // Objectives & Reward Center
  | 'Challenges'
  | 'WhatIfSimulator'
  | 'MatchLive'
  | 'News' // Newsroom & ticker
  | 'SeasonRecap' // End-of-season awards & recap
  | 'OffSeason'; // Retain / release / pre-season prep

export type ScreenView = 'MainMenu' | 'Dashboard' | 'Auction' | 'MultiplayerAuction' | 'MatchLive' | 'PressConference' | 'PostMatchPresentation';
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

export type FCThemeMode = 
  | 'fc_neon_dark' 
  | 'royal_gold' 
  | 'emerald_stadium' 
  | 'cyberpunk_crimson' 
  | 'champions_cyan' 
  | 'stealth_carbon';

export interface GoogleAccountProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  isLoggedIn: boolean;
  lastCloudSyncedAt: number;
}

export interface GameSave {
  saveVersion?: number;
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
  themeMode?: FCThemeMode;
  googleProfile?: GoogleAccountProfile | null;
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
  seasonSummary?: SeasonSummary | null;
  rivalTeamIds?: string[];
  auctionState?: AuctionState | null;
  currentMatchState?: MatchState | null;
  pressConferenceState?: PressConferenceState | null;
  currentScreen?: ScreenView;
}
