import { Player } from './cricket';

export type AuctionSetCode = 
  | 'M1' 
  | 'M2' 
  | 'BA1' 
  | 'AL1' 
  | 'WK1' 
  | 'FA1' 
  | 'SP1' 
  | 'UBA1' 
  | 'UAL1' 
  | 'UWK1' 
  | 'UFA1' 
  | 'USP1' 
  | 'ACC1';

export interface AuctionSetInfo {
  code: AuctionSetCode;
  name: string;
  category: 'Marquee' | 'Capped' | 'Uncapped' | 'Accelerated';
  description: string;
  isCapped: boolean;
}

export type AuctionSetCategory = 
  | 'Marquee Set 1 (M1)' 
  | 'Marquee Set 2 (M2)' 
  | 'Capped Batters (BA1)' 
  | 'Capped All-Rounders (AL1)' 
  | 'Capped Wicketkeepers (WK1)' 
  | 'Capped Fast Bowlers (FA1)' 
  | 'Capped Spinners (SP1)' 
  | 'Uncapped Batters (UBA1)' 
  | 'Uncapped All-Rounders (UAL1)' 
  | 'Uncapped Wicketkeepers (UWK1)' 
  | 'Uncapped Fast Bowlers (UFA1)' 
  | 'Uncapped Spinners (USP1)' 
  | 'Accelerated Round (ACC1)';

export type AuctionPlayerStatus = 'Upcoming' | 'On Auction' | 'Sold' | 'Unsold' | 'Passed';

export type AuctionPhase = 'EARLY' | 'MIDDLE' | 'LATE' | 'FINAL' | 'ACCELERATED';

export type AIDecisionType = 
  | 'BID' 
  | 'WAIT' 
  | 'DROP_OUT' 
  | 'AGGRESSIVE_BID' 
  | 'VALUE_BID' 
  | 'PRESSURE_BID' 
  | 'SAVE_BUDGET' 
  | 'TARGET_LATER'
  | 'AUTO_BID';

export interface AuctionBid {
  id?: string;
  teamId: string;
  teamShortName?: string;
  bidAmountCr: number;
  timestamp: number;
  bidNumber?: number;
  decisionType?: AIDecisionType;
  isPressureBid?: boolean;
  biddingWarCount?: number;
}

export interface SquadNeedDetail {
  current: number;
  target: number;
  urgency: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  weight: number; // multiplier e.g. 0.7 to 1.35
}

export interface TeamSquadNeeds {
  teamId: string;
  totalPlayers: number;
  overseasCount: number;
  indianCount: number;
  needs: {
    topOrder: SquadNeedDetail;
    middleOrder: SquadNeedDetail;
    finisher: SquadNeedDetail;
    wicketkeeper: SquadNeedDetail;
    allRounder: SquadNeedDetail;
    paceBowler: SquadNeedDetail;
    spinBowler: SquadNeedDetail;
    powerplayBowler: SquadNeedDetail;
    deathBowler: SquadNeedDetail;
  };
  overallNeedScore: number; // 0 - 100
  criticalNeedsCount: number;
}

export interface PlayerScarcityAnalysis {
  playerId: string;
  role: string;
  comparableRemainingCount: number; // players in same tier remaining
  roleRemainingCount: number; // players in same role remaining
  eliteRemainingCount: number; // OVR >= 88 or potential >= 90
  teamsNeedingRoleCount: number; // other teams with high/critical need
  scarcityIndex: number; // 0 to 1.0 (1.0 = highly scarce)
  isFinalEliteOption: boolean;
  scarcityMultiplier: number; // e.g. 0.90 to 1.45
}

export interface AIDecisionContext {
  teamId: string;
  teamShortName: string;
  playerId: string;
  playerName: string;
  decision: AIDecisionType;
  reasoning: string;
  baseValuationCr: number;
  squadNeedMultiplier: number;
  scarcityMultiplier: number;
  personalityMultiplier: number;
  budgetMultiplier: number;
  phaseMultiplier: number;
  rivalPressureAdjustmentCr: number;
  momentumBonusCr: number;
  effectiveCeilingCr: number;
  currentBidCr: number;
  nextBidAmountCr: number;
  willingnessScore: number;
  confidencePercent: number;
  isBluffOrPressure: boolean;
}

export interface SoldPlayerRecord {
  player: Player;
  sellingPriceCr: number;
  buyingTeamId: string;
  biddingHistory?: AuctionBid[];
}

export interface AuctionState {
  currentSetIndex: number;
  currentPlayerIndex: number;
  allPlayerPool: Player[];
  soldPlayerRecords: SoldPlayerRecord[];
  unsoldPlayerIds: string[];
  passedPlayerIds: string[];

  // Active lot
  activePlayer: Player | null;
  currentBidCr: number;
  currentLeadingTeamId: string | null;
  bidHistory: AuctionBid[];
  auctionTimerSeconds: number;
  hammerState: 'Bidding' | 'Going Once' | 'Going Twice' | 'SOLD' | 'UNSOLD';
  isPaused: boolean;
  isCompleted: boolean;
  isAcceleratedMode: boolean;
  autoBidUser: boolean;
  isAutoBidEnabled?: boolean;
  userAutoBidCeilingCr?: number;
  autoBidStrategy?: 'AI_VALUATION' | 'CUSTOM_CEILING' | 'AGGRESSIVE';
}

export interface AIAssistantAdvice {
  verdict: string;
  recommendedMaxBidCr: number;
  squadNeedAnalysis: string;
  rivalInterestAssessment: string;
  valuePremiumPercent: number;
  isHighValueTarget: boolean;
  scarcityAnalysis?: PlayerScarcityAnalysis;
  squadNeeds?: TeamSquadNeeds;
  biddingWarActive?: boolean;
  alternativeTargetsRemaining?: number;
}

