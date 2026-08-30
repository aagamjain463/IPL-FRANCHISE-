import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Crown, Star, Award, Sparkles, ArrowRight, BarChart3, Home } from 'lucide-react';

export const SeasonRecapView: React.FC = () => {
  const { gameState, beginOffSeason, setActiveTab } = useGame();

  if (!gameState) return null;

  const summary = gameState.seasonSummary;
  const userTeam = gameState.teams[gameState.userTeamId];
  const champion = summary ? gameState.teams[summary.championTeamId] : null;
  const runnerUp = summary ? gameState.teams[summary.runnerUpTeamId] : null;
  const userStanding = gameState.standings.find(r => r.teamId === gameState.userTeamId);
  const rank = gameState.standings.findIndex(r => r.teamId === gameState.userTeamId) + 1;

  return (
    <div className="space-y-6 pb-16 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#D4AF37]/15 via-[#0f172a] to-[#0f172a] p-6 rounded-3xl border border-[#D4AF37]/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center">
            <Trophy className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">Season {summary?.seasonYear || gameState.currentSeason} Recap</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">Season awards, your finish, and the road to the next auction.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('Standings')}
            className="px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Final Table
          </button>
          <button
            onClick={beginOffSeason}
            className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5" /> Enter Off-season <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!summary ? (
        <div className="bg-[#0f172a] p-10 rounded-3xl border border-[#1e293b] text-center space-y-3">
          <Trophy className="w-12 h-12 text-[#D4AF37] mx-auto" />
          <h3 className="text-lg font-bold text-white">Season still running</h3>
          <p className="text-xs text-[#94a3b8]">Finish the IPL Final to unlock the full recap.</p>
        </div>
      ) : (
        <>
          {/* Champion banner */}
          <div className="bg-gradient-to-tr from-[#0f172a] via-[#131c31] to-[#0f172a] p-8 rounded-3xl border border-[#1e293b] text-center space-y-4 shadow-2xl">
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#D4AF37]">IPL Champions {summary.seasonYear}</span>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center opacity-60">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border border-white/20 mx-auto mb-2" style={{ backgroundColor: runnerUp?.primaryColor || '#334155', color: runnerUp?.secondaryColor || '#fff' }}>
                  {runnerUp?.shortName}
                </div>
                <p className="text-xs font-bold text-[#94a3b8]">{runnerUp?.name} (Runners-up)</p>
              </div>
              <div className="text-5xl font-black italic text-[#D4AF37]">🏆</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-[#D4AF37] shadow-xl mx-auto mb-2" style={{ backgroundColor: champion?.primaryColor || '#854d0e', color: champion?.secondaryColor || '#fff' }}>
                  {champion?.shortName}
                </div>
                <p className="text-sm font-black text-white">{champion?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
              <div className="bg-[#05070a] rounded-xl border border-[#1e293b] p-3">
                <p className="text-[9px] uppercase font-bold text-[#64748b]">Your Finish</p>
                <p className="text-sm font-black text-white mt-1">{summary.userTeamFinish}</p>
              </div>
              <div className="bg-[#05070a] rounded-xl border border-[#1e293b] p-3">
                <p className="text-[9px] uppercase font-bold text-[#64748b]">Your Record</p>
                <p className="text-sm font-black text-[#D4AF37] mt-1">{summary.userRecord}</p>
              </div>
              <div className="bg-[#05070a] rounded-xl border border-[#1e293b] p-3">
                <p className="text-[9px] uppercase font-bold text-[#64748b]">League Rank</p>
                <p className="text-sm font-black text-white mt-1">{userStanding ? `${rank}${['th','st','nd','rd'][(rank % 100 - 20) % 10] || 'th'}` : '—'}</p>
              </div>
              <div className="bg-[#05070a] rounded-xl border border-[#1e293b] p-3">
                <p className="text-[9px] uppercase font-bold text-[#64748b]">Franchise</p>
                <p className="text-sm font-black text-cyan-400 mt-1 truncate">{userTeam?.name}</p>
              </div>
            </div>
          </div>

          {/* Awards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Crown, title: 'Orange Cap', color: 'text-amber-400', data: summary.orangeCap, sub: `${summary.orangeCap.runs} runs` },
              { icon: Star, title: 'Purple Cap', color: 'text-purple-400', data: summary.purpleCap, sub: `${summary.purpleCap.wickets} wickets` },
              { icon: Award, title: 'Season MVP', color: 'text-[#D4AF37]', data: summary.mvp, sub: `${summary.mvp.pts} pts` },
              { icon: Sparkles, title: 'Emerging Player', color: 'text-[#00FF87]', data: summary.emergingPlayer, sub: summary.emergingPlayer.reason }
            ].map(award => (
              <div key={award.title} className="glass-panel p-5 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#05070a] border border-[#1e293b] flex items-center justify-center shrink-0">
                  <award.icon className={`w-6 h-6 ${award.color}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] uppercase font-black tracking-widest ${award.color}`}>{award.title}</p>
                  <p className="text-sm font-bold text-white truncate">{award.data.playerName} <span className="text-[10px] text-[#64748b] font-mono">({award.data.teamShortName})</span></p>
                  <p className="text-[10px] text-[#94a3b8] truncate">{award.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Playoff results */}
          {summary.playoffResults.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl space-y-3">
              <h3 className="text-xs uppercase tracking-widest font-black text-[#D4AF37]">Knockout Road</h3>
              <div className="space-y-2">
                {summary.playoffResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#05070a] rounded-xl border border-[#1e293b] px-4 py-3 text-xs">
                    <span className="font-black uppercase text-[#94a3b8]">{r.stage}</span>
                    <span className="font-bold text-white text-right">{r.resultText}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={beginOffSeason}
              className="px-10 py-4 rounded-full bg-[#D4AF37] hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest shadow-xl transition hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" /> Continue to Off-season
            </button>
          </div>
        </>
      )}
    </div>
  );
};
