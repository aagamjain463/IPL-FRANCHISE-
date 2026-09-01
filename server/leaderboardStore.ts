import fs from 'fs';
import path from 'path';
import { LeaderboardCategory, LeaderboardProfile, LeaderboardResultUpdate, LeaderboardSnapshot, LEADERBOARD_CONFIG } from '../src/types/leaderboard.js';

interface StoreShape {
  profiles: Record<string, LeaderboardProfile>;
}

const DATA_PATH = process.env.LEADERBOARD_DATA_PATH || path.join(process.cwd(), '.data', 'leaderboard.json');

function defaultProfile(playerId: string, displayName = 'Manager'): LeaderboardProfile {
  return {
    playerId,
    displayName: displayName.trim().slice(0, 32) || 'Manager',
    avatarKey: 'crest-gold',
    totalAuctionsCompleted: 0,
    auctionsWon: 0,
    totalMoneySpentCr: 0,
    squadOvr: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    rankingPoints: LEADERBOARD_CONFIG.baseRating,
    currentRank: 0,
    highestRank: 0,
    streak: 0,
    trophies: 0,
    xp: 0,
    auctionScore: 0,
    weeklyPoints: 0,
    seasonPoints: 0,
    updatedAt: Date.now()
  };
}

class FileLeaderboardStore {
  private data: StoreShape = { profiles: {} };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_PATH)) {
        this.data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as StoreShape;
      }
    } catch {
      this.data = { profiles: {} };
    }
  }

  private save() {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
      await fs.promises.writeFile(DATA_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    }).catch(() => undefined);
  }

  private ranked(): LeaderboardProfile[] {
    const sorted = Object.values(this.data.profiles).sort((a, b) => {
      if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
      if (b.auctionScore !== a.auctionScore) return b.auctionScore - a.auctionScore;
      return b.squadOvr - a.squadOvr;
    });
    sorted.forEach((profile, index) => {
      profile.currentRank = index + 1;
      profile.highestRank = profile.highestRank ? Math.min(profile.highestRank, profile.currentRank) : profile.currentRank;
    });
    return sorted;
  }

  upsertProfile(playerId: string, displayName?: string): LeaderboardProfile {
    const existing = this.data.profiles[playerId] || defaultProfile(playerId, displayName);
    if (displayName) existing.displayName = displayName.trim().slice(0, 32) || existing.displayName;
    existing.winRate = existing.wins + existing.losses > 0 ? Math.round((existing.wins / (existing.wins + existing.losses)) * 1000) / 10 : 0;
    existing.updatedAt = Date.now();
    this.data.profiles[playerId] = existing;
    this.ranked();
    this.save();
    return existing;
  }

  snapshot(category: LeaderboardCategory, playerId?: string): LeaderboardSnapshot {
    const rows = this.rowsFor(category).slice(0, 100);
    const currentPlayer = playerId ? this.data.profiles[playerId] || null : null;
    this.ranked();
    return { category, generatedAt: Date.now(), rows, currentPlayer };
  }

  private rowsFor(category: LeaderboardCategory): LeaderboardProfile[] {
    const profiles = Object.values(this.data.profiles);
    const byRating = () => this.ranked();
    switch (category) {
      case 'weekly': return profiles.sort((a, b) => b.weeklyPoints - a.weeklyPoints || b.rankingPoints - a.rankingPoints);
      case 'season': return profiles.sort((a, b) => b.seasonPoints - a.seasonPoints || b.rankingPoints - a.rankingPoints);
      case 'highest_ovr': return profiles.sort((a, b) => b.squadOvr - a.squadOvr || b.rankingPoints - a.rankingPoints);
      case 'auction_master': return profiles.sort((a, b) => b.auctionScore - a.auctionScore || b.rankingPoints - a.rankingPoints);
      case 'friends':
      case 'global':
      default: return byRating();
    }
  }

  recordAuctionResults(results: Array<{ playerId: string; displayName: string; rank: number; totalParticipants: number; spentPurseCr: number; squadOvr: number; auctionScore: number; trophies?: number }>): LeaderboardResultUpdate[] {
    const beforeRanks = new Map(this.ranked().map(p => [p.playerId, { rating: p.rankingPoints, rank: p.currentRank || 0 }]));

    results.forEach(result => {
      const profile = this.upsertProfile(result.playerId, result.displayName);
      const won = result.rank === 1;
      const topHalf = result.rank <= Math.ceil(result.totalParticipants / 2);
      const ratingDelta = won ? LEADERBOARD_CONFIG.winRatingDelta + LEADERBOARD_CONFIG.auctionWinnerBonus : (topHalf ? 8 : LEADERBOARD_CONFIG.lossRatingDelta);
      profile.totalAuctionsCompleted += 1;
      profile.auctionsWon += won ? 1 : 0;
      profile.wins += topHalf ? 1 : 0;
      profile.losses += topHalf ? 0 : 1;
      profile.streak = won ? Math.max(1, profile.streak + 1) : topHalf ? profile.streak : Math.min(-1, profile.streak - 1);
      profile.rankingPoints = Math.max(100, profile.rankingPoints + ratingDelta);
      profile.totalMoneySpentCr = Number((profile.totalMoneySpentCr + result.spentPurseCr).toFixed(2));
      profile.squadOvr = Math.max(profile.squadOvr, result.squadOvr);
      profile.auctionScore = Math.max(profile.auctionScore, result.auctionScore);
      profile.weeklyPoints += Math.max(0, ratingDelta) + result.auctionScore;
      profile.seasonPoints += Math.max(0, ratingDelta) + result.auctionScore;
      profile.trophies += result.trophies || (won ? 1 : 0);
      profile.xp += LEADERBOARD_CONFIG.auctionCompletionXp + Math.max(0, result.auctionScore);
      profile.winRate = profile.wins + profile.losses > 0 ? Math.round((profile.wins / (profile.wins + profile.losses)) * 1000) / 10 : 0;
      profile.updatedAt = Date.now();
    });

    const after = this.ranked();
    this.save();

    return results.map(result => {
      const profile = this.data.profiles[result.playerId];
      const before = beforeRanks.get(result.playerId) || { rating: LEADERBOARD_CONFIG.baseRating, rank: 0 };
      return {
        profile,
        delta: {
          oldRating: before.rating,
          newRating: profile.rankingPoints,
          oldRank: before.rank || profile.currentRank,
          newRank: profile.currentRank
        }
      };
    });
  }

  resetWeekly() {
    Object.values(this.data.profiles).forEach(p => { p.weeklyPoints = 0; });
    this.save();
  }

  resetSeason() {
    Object.values(this.data.profiles).forEach(p => { p.seasonPoints = 0; });
    this.save();
  }
}

export const LeaderboardStore = new FileLeaderboardStore();
