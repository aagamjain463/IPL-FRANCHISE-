import { MatchPlayingXI } from './cricket';

export interface Team {
  id: string;
  name: string;
  shortName: string; // e.g. 'CSK', 'MI', 'RCB'
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  homeVenue: string;
  city: string;
  purseCr: number; // in Crores INR e.g. 120.0 initially, or remaining purse
  initialPurseCr: number;
  rosterPlayerIds: string[];
  captainId: string;
  viceCaptainId?: string;
  wicketkeeperId: string;
  coachName: string;
  strengths: string[];
  weaknesses: string[];
  playingXI?: MatchPlayingXI;

  // AI Personality for Auction & Trades
  aiPersonality: {
    aggression: number; // 0 - 100
    budgetDiscipline: number; // 0 - 100
    starPreference: number; // 0 - 100
    youthPreference: number; // 0 - 100
    bowlingPriority: number; // 0 - 100
    battingPriority: number; // 0 - 100
    analyticsPreference: number; // 0 - 100
    riskTolerance: number; // 0 - 100
    loyaltyToCurrentSquad: number; // 0 - 100
  };

  // Franchise Metrics
  fanSentiment: number; // 0 - 100
  boardConfidence: number; // 0 - 100
  mediaReputation: number; // 0 - 100
  dressingRoomMorale: number; // 0 - 100
  popularity: number; // 0 - 100

  // Historical
  titlesWon: number;
  finalsReached: number;
  playoffAppearances: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
}
