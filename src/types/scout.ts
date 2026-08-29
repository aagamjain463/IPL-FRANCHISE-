import { Player, PlayerRole } from './cricket';

export type ScoutRoleCategory = 
  | 'ALL'
  | 'Opener'
  | 'Top-order Batter'
  | 'Middle-order Batter'
  | 'Finisher'
  | 'Wicketkeeper'
  | 'All-rounder'
  | 'Fast Bowler'
  | 'Death Bowler'
  | 'Powerplay Bowler'
  | 'Spinner'
  | 'Leg-spinner'
  | 'Left-arm Spinner'
  | 'Utility Player';

export type NationalityFilter = 'ALL' | 'Indian' | 'Overseas';
export type AgeFilter = 'ALL' | 'U21' | '21-24' | '25-28' | '29-32' | '33+';
export type ValueFilter = 'ALL' | 'Under 2 Cr' | '2-5 Cr' | '5-10 Cr' | '10-15 Cr' | '15 Cr+';
export type FormFilter = 'ALL' | 'Poor' | 'Average' | 'Good' | 'Excellent';
export type PotentialFilter = 'ALL' | 'Low' | 'Medium' | 'High' | 'Elite';
export type StatusFilter = 'ALL' | 'Available' | 'Auction Target' | 'Current IPL Player' | 'Other Franchise' | 'My Squad' | 'Watchlist';

export interface ScoutFilterState {
  role: ScoutRoleCategory;
  nationality: NationalityFilter;
  age: AgeFilter;
  value: ValueFilter;
  form: FormFilter;
  potential: PotentialFilter;
  status: StatusFilter;
  searchQuery: string;
}

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface WatchlistItem {
  playerId: string;
  priority: PriorityLevel;
  notes: string;
  addedSeason: number;
  addedDateFormatted: string;
}

export interface ScoutAlert {
  id: string;
  playerId: string;
  type: 'FORM_SPIKE' | 'VALUE_CHANGE' | 'AVAILABILITY' | 'HIGH_PRIORITY' | 'TRADE_INTEREST' | 'SCOUT_NOTE';
  message: string;
  timestampFormatted: string;
  isRead: boolean;
}

export interface ScoutMission {
  id: string;
  title: string;
  subtitle: string;
  criteriaDescription: string;
  targetCount: number;
  iconName: string;
  filterPreset: Partial<ScoutFilterState>;
  completed: boolean;
}

export interface SquadNeedItem {
  id: string;
  priority: 'CRITICAL NEED' | 'HIGH PRIORITY' | 'MEDIUM PRIORITY' | 'LOW PRIORITY';
  title: string;
  reason: string;
  targetRole: string;
  recommendedAttributes: string[];
}

export interface ScoutedPlayerAnalysis {
  player: Player;
  fitScore: number; // 0 - 100
  roleFit: number; // 0 - 100
  squadNeedScore: number; // 0 - 100
  valueScore: number; // 0 - 100
  ageFitScore: number; // 0 - 100
  tacticalFitScore: number; // 0 - 100
  estimatedValueRange: { minCr: number; maxCr: number };
  recommendedMaxBidCr: number;
  scoutConfidencePercent: number; // e.g. 88%
  potentialRange: { min: number; max: number };
  whyThisPlayer: string;
  strengths: string[];
  weaknesses: string[];
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH';
  t20TacticalProfile: string;
  isPriorityAuctionTarget: boolean;
  isWatchlisted: boolean;
}

export interface OppositionScoutingReport {
  teamId: string;
  teamName: string;
  teamShortName: string;
  primaryColor: string;
  strengths: string[];
  weaknesses: string[];
  keyPlayers: { player: Player; roleSummary: string; threatLevel: 'Extreme' | 'High' | 'Moderate' }[];
  dangerousMatchups: { player: Player; tacticalReason: string }[];
  battersToTarget: { player: Player; weaknessReason: string; recommendedBowlerType: string }[];
  bowlersToTarget: { player: Player; vulnerabilityReason: string; recommendedBatterApproach: string }[];
  powerplayThreat: string;
  deathOverThreat: string;
  bestMatchupAgainstYourTeam: string;
}

export interface PreMatchOppositionIntel {
  opponentTeamId: string;
  opponentTeamName: string;
  keyThreatPlayer: { player: Player; tacticalReason: string; recommendedResponse: string };
  keyWeaknessPlayer: { player: Player; tacticalReason: string; recommendedResponse: string };
  pitchContextAdvice: string;
}

export interface ScoutingDepartmentData {
  level: number; // 1 to 5
  scoutingBudgetSpentCr: number;
  watchlist: WatchlistItem[];
  auctionTargetIds: string[];
  unlockedReportIds: string[];
  completedMissionIds: string[];
  alerts: ScoutAlert[];
}
