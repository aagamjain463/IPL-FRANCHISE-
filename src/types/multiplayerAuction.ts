import { Player } from './cricket';

export type MultiplayerAuctionFormat = 'Mega Auction' | 'Mini Auction' | 'Accelerated' | 'Custom';
export type MultiplayerPlayerPoolType = 'Full Draft Pool' | 'Top 30 Marquee & Stars' | 'Top 15 Accelerated';

export interface MultiplayerAuctionConfig {
  format: MultiplayerAuctionFormat;
  startingPurseCr: number;
  minPlayers: number;
  maxPlayers: number;
  poolType: MultiplayerPlayerPoolType;
  minSquadSize: number;
  maxSquadSize: number;
  overseasLimit: number;
  timerSeconds: number; // 10, 15, 20, 30
}

export interface MultiplayerParticipant {
  id: string;
  name: string;
  isHost: boolean;
  franchiseId: string | null;
  isReady: boolean;
  purseCr: number;
  squadPlayerIds: string[];
  squadPlayers: Player[];
  isConnected: boolean;
  disconnectedAt?: number | null;
  isAI?: boolean;
  lastBidCr: number | null;
}

export interface MultiplayerBidRecord {
  id: string;
  participantId: string;
  participantName: string;
  franchiseId: string;
  franchiseShort: string;
  franchisePrimaryColor: string;
  franchiseSecondaryColor: string;
  bidAmountCr: number;
  timestamp: number;
}

export interface MultiplayerSoldRecord {
  player: Player;
  winningParticipantId: string;
  winningParticipantName: string;
  winningFranchiseId: string;
  winningFranchiseShort: string;
  sellingPriceCr: number;
  timestamp: number;
}

export interface MultiplayerAward {
  title: string;
  recipientName: string;
  franchiseName: string;
  franchiseShort: string;
  description: string;
  badge: string;
}

export interface MultiplayerRanking {
  rank: number;
  participantId: string;
  participantName: string;
  franchiseId: string;
  franchiseName: string;
  franchiseShort: string;
  primaryColor: string;
  secondaryColor: string;
  squadOvr: number;
  squadCount: number;
  overseasCount: number;
  spentPurseCr: number;
  remainingPurseCr: number;
  auctionScore: number;
  bestPurchaseName?: string;
  biggestOverpayName?: string;
}

export type HammerCallState = 'Opening Bid' | 'Active Bidding' | 'Going Once' | 'Going Twice' | 'Sold!' | 'Unsold';

export interface MultiplayerRoomState {
  roomCode: string;
  roomName: string;
  hostId: string;
  status: 'lobby' | 'in_progress' | 'lot_break' | 'completed';
  config: MultiplayerAuctionConfig;
  participants: MultiplayerParticipant[];
  playerPool: Player[];
  currentLotIndex: number;
  totalLots: number;
  currentLotPlayer: Player | null;
  currentHighBidCr: number;
  currentHighBidderId: string | null;
  currentHighBidderFranchiseId: string | null;
  hammerSecondsRemaining: number;
  hammerCall: HammerCallState;
  isPaused: boolean;
  pausedByHostId: string | null;
  bidHistory: MultiplayerBidRecord[];
  soldRecords: MultiplayerSoldRecord[];
  unsoldPlayerIds: string[];
  rankings: MultiplayerRanking[];
  awards: MultiplayerAward[];
  deadlineEpochMs: number | null;
  serverSequence: number;
  leaderboardApplied?: boolean;
  version: number;
}

export type MultiplayerClientEvent =
  | { type: 'STATE_UPDATE'; state: MultiplayerRoomState }
  | { type: 'TICK'; hammerSecondsRemaining: number; hammerCall: HammerCallState }
  | { type: 'BID_PLACED'; bid: MultiplayerBidRecord; currentHighBidCr: number; hammerSecondsRemaining: number }
  | { type: 'BID_REJECTED'; playerId: string; message: string }
  | { type: 'TIMER_EXTENDED'; hammerSecondsRemaining: number; extensionSeconds: number }
  | { type: 'LOT_SOLD'; record: MultiplayerSoldRecord; nextLotInSeconds: number }
  | { type: 'LOT_UNSOLD'; player: Player; nextLotInSeconds: number }
  | { type: 'LOT_STARTED'; player: Player; lotIndex: number; totalLots: number }
  | { type: 'AUCTION_PAUSED'; pausedByHostName: string }
  | { type: 'AUCTION_RESUMED' }
  | { type: 'AUCTION_COMPLETED'; rankings: MultiplayerRanking[]; awards: MultiplayerAward[] }
  | { type: 'ERROR'; message: string };
