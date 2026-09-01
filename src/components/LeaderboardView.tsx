import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Crown, Medal, RefreshCw, Shield, TrendingUp, Trophy, Users } from 'lucide-react';
import { cardMotion, listContainerMotion } from '../motion';
import { LeaderboardCategory, LeaderboardSnapshot } from '../types/leaderboard';
import { LeaderboardClient } from '../services/leaderboardClient';

const CATEGORIES: Array<{ id: LeaderboardCategory; label: string }> = [
  { id: 'global', label: 'Global' },
  { id: 'friends', label: 'Friends' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'season', label: 'Season' },
  { id: 'highest_ovr', label: 'Highest OVR' },
  { id: 'auction_master', label: 'Auction Master' }
];

export const LeaderboardView: React.FC = () => {
  const reduce = useReducedMotion();
  const [category, setCategory] = useState<LeaderboardCategory>('global');
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextCategory = category) => {
    setLoading(true);
    setError(null);
    const result = await LeaderboardClient.getLeaderboard(nextCategory);
    setLoading(false);
    if (result.success && result.snapshot) setSnapshot(result.snapshot);
    else setError(result.error || 'Leaderboard unavailable');
  };

  useEffect(() => { load(category); }, [category]);

  const rows = snapshot?.rows || [];
  const podium = rows.slice(0, 3);
  const me = snapshot?.currentPlayer || null;

  return (
    <motion.div className="leaderboard-screen" variants={reduce ? undefined : listContainerMotion} initial={reduce ? false : 'initial'} animate="enter">
      <section className="leaderboard-hero">
        <div><small><Trophy className="w-4 h-4" /> WORLD RANKINGS</small><h1>Global Leaderboard</h1><p>Server-backed competitive rankings. Only confirmed multiplayer auction results update these rows.</p></div>
        <button onClick={() => load()} disabled={loading}><RefreshCw className="w-4 h-4" /> {loading ? 'SYNCING' : 'REFRESH'}</button>
      </section>

      <nav className="leaderboard-tabs">{CATEGORIES.map(item => <button key={item.id} onClick={() => setCategory(item.id)} className={category === item.id ? 'is-active' : ''}>{item.label}</button>)}</nav>

      {error && <div className="leaderboard-empty">{error}</div>}

      <section className="leaderboard-podium">
        {podium.map((row, index) => (
          <motion.article key={row.playerId} variants={reduce ? undefined : cardMotion} className={`podium-card podium-card--${index + 1}`}>
            <i>{index === 0 ? <Crown className="w-8 h-8" /> : <Medal className="w-8 h-8" />}</i>
            <span>#{row.currentRank || index + 1}</span>
            <h2>{row.displayName}</h2>
            <p>OVR {row.squadOvr || '—'} · Rating {row.rankingPoints.toLocaleString()}</p>
            <b>{row.auctionScore} SCORE</b>
          </motion.article>
        ))}
        {!podium.length && !loading && <div className="leaderboard-empty">No real ranked results yet. Complete a live multiplayer auction to seed the board.</div>}
      </section>

      {me && (
        <section className="your-rank-card">
          <div><small><Shield className="w-4 h-4" /> YOUR RANK</small><h2>#{me.currentRank || 'Unranked'}</h2></div>
          <span><b>{me.rankingPoints.toLocaleString()}</b><small>Rating</small></span>
          <span><b>{me.squadOvr || '—'}</b><small>OVR</small></span>
          <span><b>{me.winRate}%</b><small>Win Rate</small></span>
          <span><b>{me.trophies}</b><small>Trophies</small></span>
        </section>
      )}

      <section className="leaderboard-table">
        <div className="leaderboard-table__head"><span>Rank</span><span>Player</span><span>OVR</span><span>Rating</span><span>Auction</span><span>W/L</span></div>
        {rows.map(row => (
          <article key={row.playerId} className={me?.playerId === row.playerId ? 'is-you' : ''}>
            <b>#{row.currentRank}</b>
            <div><strong>{row.displayName}</strong><small>{row.avatarKey}</small></div>
            <span>{row.squadOvr || '—'}</span>
            <span><TrendingUp className="w-4 h-4" /> {row.rankingPoints.toLocaleString()}</span>
            <span>{row.auctionScore}</span>
            <span>{row.wins}/{row.losses}</span>
          </article>
        ))}
      </section>

      <footer className="leaderboard-note"><Users className="w-4 h-4" /> Friends rankings are ready for a future social graph; until then they only show real server profiles available to this backend.</footer>
    </motion.div>
  );
};
