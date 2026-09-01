import { LeaderboardCategory, LeaderboardProfile, LeaderboardSnapshot } from '../types/leaderboard';
import { getOrCreatePlayerIdentity } from './multiplayerAuctionClient';
import { safeFetchJson } from '../utils/safeFetch';

export const LeaderboardClient = {
  async getLeaderboard(category: LeaderboardCategory): Promise<{ success: boolean; snapshot?: LeaderboardSnapshot; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ snapshot?: LeaderboardSnapshot; error?: string }>(
      `/api/leaderboard/${category}?playerId=${encodeURIComponent(playerId)}`,
      { cache: 'no-store' }
    );
    if (!res.ok || !res.data?.snapshot) {
      return { success: false, error: res.data?.error || res.error || 'Leaderboard is loading or offline' };
    }
    return { success: true, snapshot: res.data.snapshot };
  },

  async upsertProfile(displayName: string): Promise<{ success: boolean; profile?: LeaderboardProfile; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ profile?: LeaderboardProfile; error?: string }>('/api/leaderboard/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, displayName })
    });
    if (!res.ok || !res.data?.profile) {
      return { success: false, error: res.data?.error || res.error || 'Failed to save profile' };
    }
    return { success: true, profile: res.data.profile };
  }
};

