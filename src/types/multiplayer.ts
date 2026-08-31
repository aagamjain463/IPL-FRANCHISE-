export type RankedDivision = 
  | 'Bronze III' | 'Bronze II' | 'Bronze I'
  | 'Silver III' | 'Silver II' | 'Silver I'
  | 'Gold III' | 'Gold II' | 'Gold I'
  | 'Platinum III' | 'Platinum II' | 'Platinum I'
  | 'Diamond' | 'Legend';

export interface H2HRankedProfile {
  division: RankedDivision;
  ratingPoints: number; // e.g. 1420 RP
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  highestDivision: RankedDivision;
  seasonName: string;
  seasonEndsInDays: number;
}

export type MatchmakingStatus = 'idle' | 'searching' | 'opponent_found' | 'syncing' | 'connected' | 'abandoned';

export interface H2HOpponent {
  id: string;
  managerName: string;
  franchiseId: string;
  franchiseName: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  squadOvr: number;
  division: RankedDivision;
  ratingPoints: number;
  captainName: string;
  recentForm: ('W' | 'L')[];
}

export interface H2HBallOutcome {
  ballNumber: number;
  runs: number;
  isWicket: boolean;
  isBoundary: boolean;
  isSix: boolean;
  commentary: string;
  shotType?: string;
  deliveryType?: string;
}

export interface H2HMatchRoomState {
  roomId: string;
  status: 'lobby' | 'innings1' | 'break' | 'innings2' | 'completed';
  userIsBattingFirst: boolean;
  targetRuns: number;
  currentInnings: 1 | 2;
  ballsCompleted: number; // 0 to 6
  runsScored: number;
  wicketsLost: number; // max 2 wickets in Super Over
  currentBatterName: string;
  currentBowlerName: string;
  ballHistory: H2HBallOutcome[];
  rpChange?: number;
  winner?: 'user' | 'opponent' | 'tie';
}

export interface LiveAuctionParticipant {
  id: string;
  name: string;
  isHuman: boolean;
  teamId: string;
  teamName: string;
  shortName: string;
  primaryColor: string;
  purseCr: number;
  squadCount: number;
  isReady: boolean;
  lastBidCr?: number;
}

export interface LiveAuctionRoomState {
  roomCode: string;
  roomName: string;
  hostId: string;
  participants: LiveAuctionParticipant[];
  status: 'lobby' | 'in_progress' | 'lot_break' | 'completed';
  currentLotIndex: number;
  totalLots: number;
  currentLotPlayerId: string | null;
  currentHighBidCr: number;
  currentHighBidderId: string | null;
  hammerSecondsRemaining: number;
  bidHistory: {
    participantId: string;
    participantName: string;
    teamShort: string;
    bidCr: number;
    timestamp: number;
  }[];
  customRules: {
    startingPurseCr: number;
    overseasLimit: number;
    squadSizeCap: number;
    timerSeconds: number;
  };
}
