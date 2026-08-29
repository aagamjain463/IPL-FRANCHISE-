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

export interface AuctionBid {
  teamId: string;
  teamShortName?: string;
  bidAmountCr: number;
  timestamp: number;
  bidNumber?: number;
}

export type AuctionPlayerStatus = 'Upcoming' | 'On Auction' | 'Sold' | 'Unsold' | 'Passed';

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
}

export interface AIAssistantAdvice {
  verdict: string;
  recommendedMaxBidCr: number;
  squadNeedAnalysis: string;
  rivalInterestAssessment: string;
  valuePremiumPercent: number;
  isHighValueTarget: boolean;
}

