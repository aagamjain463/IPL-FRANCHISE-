import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Users } from 'lucide-react';
import { LeaderboardCategory, LeaderboardSnapshot } from '../types/leaderboard';
import { LeaderboardClient } from '../services/leaderboardClient';

interface LeaderboardMiniPanelProps {
  category?: LeaderboardCategory;
  title?: string;
  compact?: boolean;
}

export const LeaderboardMiniPanel: React.FC<LeaderboardMiniPanelProps> = ({
  category = 'auction_master',
  title = 'Live Auction Leaderboard',
  compact = false
}) => {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolvedCategory = category as LeaderboardCategory;
    LeaderboardClient.getLeaderboard(resolvedCategory).then(result => {
      if (cancelled) return;
      if (result.success && result.snapshot) {
        setSnapshot(result.snapshot);
        setError(null);
      } else {
        setSnapshot(null);
        setError(result.error || 'Leaderboard unavailable');
      }
    });
    return () => { cancelled = true; };
  }, [category]);

  const rows = snapshot?.rows.slice(0, compact ? 3 : 5) || [];
  const me = snapshot?.currentPlayer || null;

  return (
    <aside className={`leaderboard-mini ${compact ? 'leaderboard-mini--compact' : ''}`}>
      <div className="leaderboard-mini__head">
        <span><Trophy className="w-4 h-4" /> {title}</span>
        <small>Server backed</small>
      </div>
      {error ? (
        <p className="leaderboard-mini__empty">{error}</p>
      ) : rows.length ? (
        <div className="leaderboard-mini__rows">
          {rows.map((row, index) => (
            <div key={row.playerId} className={me?.playerId === row.playerId ? 'is-you' : ''}>
              <b>#{row.currentRank || index + 1}</b>
              <span>{row.displayName}</span>
              <em>{category === 'auction_master' ? `${row.auctionScore} SCORE` : `${row.rankingPoints} RP`}</em>
            </div>
          ))}
        </div>
      ) : (
        <p className="leaderboard-mini__empty"><Users className="w-4 h-4" /> No real ranked auction results yet. Complete a live auction to seed rankings.</p>
      )}
      {me && (
        <div className="leaderboard-mini__you">
          <TrendingUp className="w-4 h-4" /> Your rank #{me.currentRank || '—'} · {me.rankingPoints} RP · OVR {me.squadOvr || '—'}
        </div>
      )}
    </aside>
  );
};
