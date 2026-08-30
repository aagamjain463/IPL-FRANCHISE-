import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getFranchiseLevelInfo, INITIAL_OBJECTIVES } from '../../engine/progressionEngine';
import { MapPin, Trophy, Radio, Wallet, Sparkles, Zap } from 'lucide-react';
import { Team } from '../../types/team';

/**
 * FC 26 Command Center — right-hand "multi-screen" live hub.
 * Shows the next fixture, a rotating news ticker, mini standings and
 * club economy metrics. Purely data-driven; no fake content.
 */
export const FCLiveHub: React.FC = () => {
  const { gameState, setActiveTab } = useGame();
  const [tickIdx, setTickIdx] = useState(0);

  if (!gameState) return null;
  const userTeam = gameState.teams[gameState.userTeamId];
  const schedule = gameState.leagueSchedule || [];
  const nextFixture = schedule[gameState.currentFixtureIndex];
  const teamA = nextFixture ? gameState.teams[nextFixture.teamAId] : null;
  const teamB = nextFixture ? gameState.teams[nextFixture.teamBId] : null;
  const news = gameState.newsFeed || [];
  const standings = [...(gameState.standings || [])].sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  const progression = gameState.progression;
  const levelInfo = getFranchiseLevelInfo(progression?.xp || 450);
  const objectives = progression?.objectives || INITIAL_OBJECTIVES;
  const doneObjs = objectives.filter(o => o.isCompleted).length;

  useEffect(() => {
    if (news.length <= 1) return;
    const t = setInterval(() => setTickIdx(i => (i + 1) % news.length), 4000);
    return () => clearInterval(t);
  }, [news.length]);

  const item = news[tickIdx] || news[0];

  return (
    <aside className="hidden 2xl:flex flex-col gap-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-0.5 w-full">
      {/* NEXT MATCHDAY */}
      <div className="glass-panel rounded-3xl p-5 fc-lift">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-[#D4AF37] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> NEXT MATCHDAY
          </span>
          <span className="text-[9px] font-mono text-slate-500">#{nextFixture?.matchNumber || '—'}</span>
        </div>
        {nextFixture && teamA && teamB ? (
          <>
            <div className="flex items-center justify-between gap-3">
              {[teamA, teamB].map((t: Team, i: number) => (
                <div key={t.id} className="flex-1 flex flex-col items-center text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-base shadow-xl border"
                    style={{ backgroundColor: t.primaryColor, color: t.secondaryColor, borderColor: t.id === gameState.userTeamId ? '#00FF87' : 'rgba(255,255,255,.12)' }}
                  >
                    {t.shortName}
                  </div>
                  <p className="text-[10px] font-bold text-white mt-1.5 truncate w-full">{t.name}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 my-3">
              <span className="fc-display text-2xl text-white">{teamA.shortName}</span>
              <span className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30">VS</span>
              <span className="fc-display text-2xl text-white">{teamB.shortName}</span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-mono">
              <MapPin className="w-3 h-3 text-[#00FF87]" /> {nextFixture.venue} • {nextFixture.stage}
            </p>
            <button
              onClick={() => setActiveTab('Play')}
              className="btn-volt w-full mt-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest cursor-pointer"
            >
              Go To Matchday
            </button>
          </>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">Fixture grid is being built…</p>
        )}
      </div>

      {/* NEWS TICKER */}
      <div className="glass-panel rounded-3xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-[#00E5FF] flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> WIRE SERVICE
          </span>
          <span className="text-[9px] font-mono text-slate-500">{news.length} stories</span>
        </div>
        {item ? (
          <div key={item.id} className="fc-pop">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#64748b]">{item.category}</p>
            <p className="text-xs font-bold text-white leading-snug mt-1">{item.title}</p>
            <p className="text-[10px] text-slate-400 leading-relaxed mt-1 line-clamp-3">{item.summary}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No headlines yet.</p>
        )}
      </div>

      {/* MINI LEAGUE TABLE */}
      <div className="glass-panel rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[0.25em] font-black text-[#00FF87] flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> TOP OF THE TABLE
          </span>
        </div>
        <div className="space-y-1.5">
          {standings.slice(0, 4).map((row, i) => {
            const t = gameState.teams[row.teamId];
            const isUser = row.teamId === gameState.userTeamId;
            return (
              <div key={row.teamId} className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] ${isUser ? 'bg-[#00FF87]/10 border border-[#00FF87]/30' : 'bg-black/20 border border-white/5'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`fc-display w-5 text-center ${i === 0 ? 'text-[#D4AF37]' : 'text-slate-500'}`}>{i + 1}</span>
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: t?.primaryColor, color: t?.secondaryColor }}>
                    {t?.shortName}
                  </span>
                  <span className="truncate font-bold text-white">{t?.shortName}{isUser && <span className="text-[#00FF87]"> •</span>}</span>
                </div>
                <span className="font-mono font-black text-white">{row.points}<span className="text-slate-600 text-[9px]"> pts</span></span>
              </div>
            );
          })}
        </div>
        <button onClick={() => setActiveTab('Standings')} className="w-full mt-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-300 cursor-pointer transition">
          Full Table →
        </button>
      </div>

      {/* CLUB ECONOMY */}
      <div className="glass-panel rounded-3xl p-5 space-y-3">
        <span className="text-[10px] uppercase tracking-[0.25em] font-black text-white flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-[#D4AF37]" /> CLUB ECONOMY
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-black/25 border border-white/5 p-2.5">
            <p className="text-[8px] uppercase font-black text-slate-500">Purse</p>
            <p className="text-sm font-black font-mono text-[#D4AF37]">₹{userTeam?.purseCr.toFixed(1)}</p>
          </div>
          <div className="rounded-xl bg-black/25 border border-white/5 p-2.5">
            <p className="text-[8px] uppercase font-black text-slate-500">Budget</p>
            <p className="text-sm font-black font-mono text-[#00FF87]">₹{(progression?.clubBudgetCr || 8.5).toFixed(1)}</p>
          </div>
          <div className="rounded-xl bg-black/25 border border-white/5 p-2.5">
            <p className="text-[8px] uppercase font-black text-slate-500">Manager LV</p>
            <p className="text-sm font-black font-mono text-[#00E5FF]">{levelInfo.level}</p>
          </div>
          <div className="rounded-xl bg-black/25 border border-white/5 p-2.5">
            <p className="text-[8px] uppercase font-black text-slate-500">Objectives</p>
            <p className="text-sm font-black font-mono text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> {doneObjs}/{objectives.length}
            </p>
          </div>
        </div>
        <div className="fc-bar h-1.5 rounded-full">
          <div className="h-full rounded-full bg-gradient-to-r from-[#00FF87] to-[#00E5FF]" style={{ width: `${levelInfo.progressPercent}%` }} />
        </div>
        <p className="text-[9px] text-slate-500 font-mono">XP {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} → {levelInfo.title}</p>
      </div>
    </aside>
  );
};
