import { LeaderboardCategory, LeaderboardProfile, LeaderboardSnapshot } from '../types/leaderboard';
import { getOrCreatePlayerIdentity } from './multiplayerAuctionClient';

export const LeaderboardClient = {
  async getLeaderboard(category: LeaderboardCategory): Promise<{ success: boolean; snapshot?: LeaderboardSnapshot; error?: string }> {
    try {
      const { playerId } = getOrCreatePlayerIdentity();
      const res = await fetch(`/api/leaderboard/${category}?playerId=${encodeURIComponent(playerId)}`, { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { success: false, error: 'Leaderboard API is not available on this server. Restart npm run dev / deploy the Express server, not Vite preview only.' };
      }
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to load leaderboard' };
      return { success: true, snapshot: data.snapshot };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  },

  async upsertProfile(displayName: string): Promise<{ success: boolean; profile?: LeaderboardProfile; error?: string }> {
    try {
      const { playerId } = getOrCreatePlayerIdentity();
      const res = await fetch('/api/leaderboard/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, displayName })
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { success: false, error: 'Leaderboard API is not available on this server.' };
      }
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to save profile' };
      return { success: true, profile: data.profile };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }
};
