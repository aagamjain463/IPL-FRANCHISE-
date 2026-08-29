import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Trophy, Award, Crown, Star, TrendingUp, 
  Calendar, Users, Shield, ArrowUpRight, BarChart3
} from 'lucide-react';
import { StandingsView } from './StandingsView';
import { Player } from '../types/cricket';

export const LeagueCenterView: React.FC = () => {
  const { gameState } = useGame();
  const [activeTab, setActiveTab] = useState<'Standings' | 'OrangeCap' | 'PurpleCap' | 'MVP' | 'Playoffs'>('Standings');

  if (!gameState) return null;

  const standings = gameState.standings || [];
  const players = Object.values(gameState.allPlayers) as Player[];

  // Top Batters (Orange Cap)
  const topBatters = [...players]
    .filter(p => p.stats.runs > 0)
    .sort((a, b) => b.stats.runs - a.stats.runs || (b.stats.ballsFaced > 0 ? (b.stats.runs / b.stats.ballsFaced) - (a.stats.runs / a.stats.ballsFaced) : 0))
    .slice(0, 10);

  // Top Bowlers (Purple Cap)
  const topBowlers = [...players]
    .filter(p => p.stats.wickets > 0)
    .sort((a, b) => b.stats.wickets - a.stats.wickets || (a.stats.oversBowled > 0 ? (a.stats.runsConceded / a.stats.oversBowled) - (b.stats.runsConceded / b.stats.oversBowled) : 0))
    .slice(0, 10);

  // MVPs
  const topMvps = [...players]
    .sort((a, b) => (b.stats.runs * 1.0 + b.stats.wickets * 25 + b.stats.sixes * 2) - (a.stats.runs * 1.0 + a.stats.wickets * 25 + a.stats.sixes * 2))
    .slice(0, 10);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* League Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0c12] p-4 rounded-xl border border-[#1e293b]">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
            <span>IPL League Center & Standings</span>
          </h2>
          <p className="text-xs text-[#94a3b8]">Live standings, individual awards race (Orange & Purple Caps), MVP rankings, and playoff qualification.</p>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'Standings', label: 'Points Table', icon: Trophy },
          { id: 'OrangeCap', label: 'Orange Cap (Runs)', icon: Crown },
          { id: 'PurpleCap', label: 'Purple Cap (Wickets)', icon: Star },
          { id: 'MVP', label: 'MVP Leaderboard', icon: Award },
          { id: 'Playoffs', label: 'Playoff Bracket', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                isActive 
                  ? 'bg-[#D4AF37] text-black font-black shadow-lg shadow-[#D4AF37]/15' 
                  : 'bg-[#0f172a] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border border-[#1e293b]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: POINTS TABLE */}
      {activeTab === 'Standings' && (
        <StandingsView />
      )}

      {/* TAB 2: ORANGE CAP */}
      {activeTab === 'OrangeCap' && (
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <span>Orange Cap Race (Most Runs)</span>
            </h3>
            <span className="text-xs text-[#64748b] font-mono">Season {gameState.currentSeason}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1e293b] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">#</th>
                  <th className="pb-3 px-3">Player</th>
                  <th className="pb-3 px-3">Franchise</th>
                  <th className="pb-3 px-3 text-right">Runs</th>
                  <th className="pb-3 px-3 text-right">Balls</th>
                  <th className="pb-3 px-3 text-right">Strike Rate</th>
                  <th className="pb-3 px-3 text-right">Highest</th>
                  <th className="pb-3 px-3 text-right">4s / 6s</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50">
                {topBatters.map((p, idx) => {
                  const team = p.currentTeamId ? gameState.teams[p.currentTeamId] : null;
                  const sr = p.stats.ballsFaced > 0 ? ((p.stats.runs / p.stats.ballsFaced) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={p.id} className="hover:bg-[#131d33] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#D4AF37]">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        {idx === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        <span>{p.name}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#94a3b8]">{team?.shortName || 'Unassigned'}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-amber-400 text-sm">{p.stats.runs}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#94a3b8]">{p.stats.ballsFaced}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{sr}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#94a3b8]">{p.stats.highestScore}*</td>
                      <td className="py-3 px-3 text-right font-mono text-[#64748b]">{p.stats.fours} / {p.stats.sixes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PURPLE CAP */}
      {activeTab === 'PurpleCap' && (
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" />
              <span>Purple Cap Race (Most Wickets)</span>
            </h3>
            <span className="text-xs text-[#64748b] font-mono">Season {gameState.currentSeason}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1e293b] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">#</th>
                  <th className="pb-3 px-3">Player</th>
                  <th className="pb-3 px-3">Franchise</th>
                  <th className="pb-3 px-3 text-right">Wickets</th>
                  <th className="pb-3 px-3 text-right">Overs</th>
                  <th className="pb-3 px-3 text-right">Economy</th>
                  <th className="pb-3 px-3 text-right">Runs Conceded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/50">
                {topBowlers.map((p, idx) => {
                  const team = p.currentTeamId ? gameState.teams[p.currentTeamId] : null;
                  const overs = p.stats.oversBowled.toFixed(1);
                  const econ = p.stats.oversBowled > 0 ? (p.stats.runsConceded / p.stats.oversBowled).toFixed(2) : '0.00';
                  return (
                    <tr key={p.id} className="hover:bg-[#131d33] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-purple-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        {idx === 0 && <Star className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />}
                        <span>{p.name}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-[#94a3b8]">{team?.shortName || 'Unassigned'}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-purple-400 text-sm">{p.stats.wickets}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#94a3b8]">{overs}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">{econ}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#64748b]">{p.stats.runsConceded}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MVP LEADERBOARD */}
      {activeTab === 'MVP' && (
        <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-[#D4AF37] tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              <span>Most Valuable Player (MVP) Points</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topMvps.map((p, idx) => {
              const team = p.currentTeamId ? gameState.teams[p.currentTeamId] : null;
              const points = Math.round(p.stats.runs * 1.0 + p.stats.wickets * 25 + p.stats.sixes * 2);
              return (
                <div key={p.id} className="p-4 bg-[#05070a] rounded-xl border border-[#1e293b] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-base text-[#D4AF37]">#{idx + 1}</span>
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-[10px] text-[#64748b] uppercase font-bold">{team?.name} • {p.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-white text-base">{points} <span className="text-xs text-[#D4AF37] font-normal">PTS</span></p>
                    <p className="text-[10px] font-mono text-[#64748b]">{p.stats.runs} R • {p.stats.wickets} W</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: PLAYOFF BRACKET */}
      {activeTab === 'Playoffs' && (
        <div className="max-w-4xl mx-auto bg-[#0f172a] rounded-2xl p-6 sm:p-8 border border-[#1e293b] shadow-2xl space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black uppercase text-white tracking-tight">IPL Playoff Tree</h3>
            <p className="text-xs text-[#94a3b8] mt-1">Top 4 teams qualify from the league stage for the championship knockout phase.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Qualifier 1 & Eliminator */}
            <div className="space-y-4">
              <div className="bg-[#05070a] p-4 rounded-xl border border-[#1e293b]">
                <p className="text-[10px] uppercase font-bold text-[#D4AF37] mb-1">Qualifier 1</p>
                <div className="space-y-1 text-xs font-bold text-white">
                  <p>1st: {standings[0]?.teamShortName || 'TBD'}</p>
                  <p>2nd: {standings[1]?.teamShortName || 'TBD'}</p>
                </div>
                <span className="text-[9px] text-[#64748b]">Winner to Final</span>
              </div>

              <div className="bg-[#05070a] p-4 rounded-xl border border-[#1e293b]">
                <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Eliminator</p>
                <div className="space-y-1 text-xs font-bold text-white">
                  <p>3rd: {standings[2]?.teamShortName || 'TBD'}</p>
                  <p>4th: {standings[3]?.teamShortName || 'TBD'}</p>
                </div>
                <span className="text-[9px] text-[#64748b]">Winner to Qualifier 2</span>
              </div>
            </div>

            {/* Qualifier 2 */}
            <div className="space-y-4">
              <div className="bg-[#05070a] p-4 rounded-xl border border-[#1e293b]">
                <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Qualifier 2</p>
                <div className="space-y-1 text-xs font-bold text-white">
                  <p>Loser Q1</p>
                  <p>Winner Eliminator</p>
                </div>
                <span className="text-[9px] text-[#64748b]">Winner to Final</span>
              </div>
            </div>

            {/* GRAND FINAL */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500/20 to-[#05070a] p-5 rounded-2xl border-2 border-[#D4AF37] text-center shadow-xl">
                <Trophy className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                <p className="text-xs uppercase font-black text-[#D4AF37] tracking-widest">IPL Grand Final</p>
                <div className="my-2 text-sm font-black text-white">
                  <p>Winner Q1 vs Winner Q2</p>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#D4AF37] text-black">
                  Championship
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
