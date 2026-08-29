import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, TrendingUp, Award, Shield, Calendar } from 'lucide-react';

export const StandingsView: React.FC = () => {
  const { gameState, prepareMatch } = useGame();

  if (!gameState) return null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Top Header */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">IPL Official Points Table</h2>
            <p className="text-xs text-[#94a3b8]">Season {gameState.currentSeason} • Top 4 Qualify for IPL Playoffs</p>
          </div>
        </div>
      </div>

      {/* Full Points Table */}
      <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#05070a] text-[#64748b] font-bold border-b border-[#1e293b] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Pos</th>
                <th className="py-3 px-4">Franchise</th>
                <th className="py-3 px-3 text-center font-mono">P</th>
                <th className="py-3 px-3 text-center font-mono">W</th>
                <th className="py-3 px-3 text-center font-mono">L</th>
                <th className="py-3 px-3 text-center font-mono">T</th>
                <th className="py-3 px-3 text-center font-mono">PTS</th>
                <th className="py-3 px-3 text-center font-mono">NRR</th>
                <th className="py-3 px-3 text-center">Recent Form</th>
                <th className="py-3 px-4 text-right">Playoff Odds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {(gameState.standings || []).map((row, idx) => {
                const isUser = row.teamId === gameState.userTeamId;
                const team = gameState.teams[row.teamId];
                const isPlayoffSpot = idx < 4;

                return (
                  <tr 
                    key={row.teamId}
                    className={`transition ${
                      isUser ? 'bg-[#1e293b] font-bold text-white' : 'hover:bg-[#131d35] text-[#e2e8f0]'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <span className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs ${
                        isPlayoffSpot ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-[#05070a] text-[#64748b] border border-[#1e293b]'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shadow"
                          style={{ backgroundColor: team?.primaryColor || '#1e293b', color: team?.secondaryColor || '#fff' }}
                        >
                          {team?.shortName.slice(0, 3) || 'IPL'}
                        </div>
                        <span className="font-bold text-white text-xs">{team?.name || row.teamName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">{row.played}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">{row.won}</td>
                    <td className="py-3 px-3 text-center font-mono text-red-400">{row.lost}</td>
                    <td className="py-3 px-3 text-center font-mono text-[#64748b]">{row.tied}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-[#D4AF37] text-sm">{row.points}</td>
                    
                    <td className={`py-3 px-3 text-center font-mono font-bold ${
                      row.nrr >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!row.recentForm || row.recentForm.length === 0 ? (
                          <span className="text-[#64748b] text-[10px]">-</span>
                        ) : (
                          (row.recentForm || []).map((res, i) => (
                            <span 
                              key={i}
                              className={`w-4 h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center ${
                                res === 'W' ? 'bg-emerald-500 text-black' : (res === 'L' ? 'bg-red-500 text-white' : 'bg-[#1e293b] text-white')
                              }`}
                            >
                              {res}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-emerald-400">{row.qualificationProbability}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playoff Format Overview */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-4 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#D4AF37]" /> IPL Championship Playoff Pathway
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
            <span className="text-emerald-400 font-bold block mb-1">Qualifier 1</span>
            <p className="text-[#e2e8f0]">Rank #1 vs Rank #2</p>
            <span className="text-[10px] text-[#64748b]">Winner goes straight to Final.</span>
          </div>

          <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
            <span className="text-red-400 font-bold block mb-1">Eliminator</span>
            <p className="text-[#e2e8f0]">Rank #3 vs Rank #4</p>
            <span className="text-[10px] text-[#64748b]">Loser is eliminated from season.</span>
          </div>

          <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
            <span className="text-blue-400 font-bold block mb-1">Qualifier 2</span>
            <p className="text-[#e2e8f0]">Loser Q1 vs Winner Elim</p>
            <span className="text-[10px] text-[#64748b]">Winner advances to Final.</span>
          </div>

          <div className="bg-[#05070a] p-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/5">
            <span className="text-[#D4AF37] font-bold block mb-1">🏆 IPL Grand Final</span>
            <p className="text-white font-bold">Winner Q1 vs Winner Q2</p>
            <span className="text-[10px] text-[#D4AF37]">Champion of India crowned!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
