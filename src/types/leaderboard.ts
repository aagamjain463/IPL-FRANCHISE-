export type LeaderboardCategory = 'global' | 'friends' | 'weekly' | 'season' | 'highest_ovr' | 'auction_master';

export interface LeaderboardProfile {
  playerId: string;
  displayName: string;
  avatarKey: string;
  totalAuctionsCompleted: number;
  auctionsWon: number;
  totalMoneySpentCr: number;
  squadOvr: number;
  wins: number;
  losses: number;
  winRate: number;
  rankingPoints: number;
  currentRank: number;
  highestRank: number;
  streak: number;
  trophies: number;
  xp: number;
  auctionScore: number;
  weeklyPoints: number;
  seasonPoints: number;
  updatedAt: number;
}

export interface LeaderboardSnapshot {
  category: LeaderboardCategory;
  generatedAt: number;
  rows: LeaderboardProfile[];
  currentPlayer?: LeaderboardProfile | null;
}

export interface RatingDelta {
  oldRating: number;
  newRating: number;
  oldRank: number;
  newRank: number;
}

export interface LeaderboardResultUpdate {
  profile: LeaderboardProfile;
  delta: RatingDelta;
}

export interface LeaderboardConfig {
  baseRating: number;
  winRatingDelta: number;
  lossRatingDelta: number;
  auctionWinnerBonus: number;
  auctionCompletionXp: number;
  weeklyResetDay: number;
}

export const LEADERBOARD_CONFIG: LeaderboardConfig = {
  baseRating: 1000,
  winRatingDelta: 25,
  lossRatingDelta: -15,
  auctionWinnerBonus: 20,
  auctionCompletionXp: 150,
  weeklyResetDay: 1
};
