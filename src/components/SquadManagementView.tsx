import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, PlayerRole } from '../types/cricket';
import { Users, Filter, ArrowUpDown, Shield, Heart, Zap, Sparkles, Trash2 } from 'lucide-react';

export const SquadManagementView: React.FC = () => {
  const { gameState, setSelectedPlayerForModal } = useGame();
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'overall' | 'form' | 'potential' | 'salaryCr' | 'age'>('overall');

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const rosterIds = userTeam.rosterPlayerIds || [];
  const players = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);

  const filtered = players.filter(p => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'OVERSEAS') return p.isOverseas;
    if (roleFilter === 'BAT') return p.role.includes('Batter');
    if (roleFilter === 'BOWL') return p.role.includes('Bowler');
    if (roleFilter === 'AR') return p.role.includes('All-rounder');
    if (roleFilter === 'WK') return p.role.includes('Wicketkeeper');
    return true;
  }).sort((a, b) => {
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">{userTeam.name} Squad Depth</h2>
            <p className="text-xs text-[#94a3b8]">{players.length} Players on Active Roster • Total Wage Bill: ₹{players.reduce((acc, p) => acc + p.salaryCr, 0).toFixed(2)} Cr/yr</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex bg-[#05070a] p-1 rounded-lg border border-[#1e293b]">
            {(['ALL', 'BAT', 'AR', 'BOWL', 'WK', 'OVERSEAS'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={`px-3 py-1 rounded font-bold transition text-xs ${
                  roleFilter === f ? 'bg-[#D4AF37] text-black font-black' : 'text-[#64748b] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#05070a] border border-[#1e293b] text-[#e2e8f0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#D4AF37] font-medium"
          >
            <option value="overall">Sort by Rating</option>
            <option value="form">Sort by Form</option>
            <option value="potential">Sort by Potential</option>
            <option value="salaryCr">Sort by Salary</option>
            <option value="age">Sort by Age</option>
          </select>
        </div>
      </div>

      {/* Squad Roster Table */}
      <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#05070a] text-[#64748b] font-bold border-b border-[#1e293b] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3 text-center">OVR</th>
                <th className="py-3 px-3 text-center">BAT / BOWL</th>
                <th className="py-3 px-3 text-center">Form</th>
                <th className="py-3 px-3 text-center">Fitness</th>
                <th className="py-3 px-3 text-right">Salary</th>
                <th className="py-3 px-3 text-center">Contract</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {filtered.map(player => (
                <tr 
                  key={player.id}
                  onClick={() => setSelectedPlayerForModal(player)}
                  className="hover:bg-[#131d35] cursor-pointer transition text-[#e2e8f0]"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#05070a] text-[#D4AF37] font-mono font-bold text-xs flex items-center justify-center border border-[#1e293b]">
                        {player.overall}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-xs">{player.name}</span>
                          {player.isOverseas ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                              ✈️ {player.nationality}
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                              🇮🇳
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#64748b]">{player.age} yrs • {player.battingStyle}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-[#94a3b8] font-medium">{player.role}</td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-[#D4AF37] text-sm">
                    {player.overall}
                  </td>

                  <td className="py-3 px-3 text-center font-mono text-[#e2e8f0]">
                    {player.battingRating} / {player.bowlingRating}
                  </td>

                  <td className="py-3 px-3 text-center font-bold text-blue-400">
                    {player.form} ★
                  </td>

                  <td className="py-3 px-3 text-center font-mono text-emerald-400">
                    {player.fitness}%
                  </td>

                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    ₹{player.salaryCr} Cr
                  </td>

                  <td className="py-3 px-3 text-center font-mono text-[#D4AF37]">
                    {player.contractYearsRemaining} yrs
                  </td>

                  <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedPlayerForModal(player)}
                      className="px-2.5 py-1 rounded bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] text-[10px] font-bold uppercase transition border border-[#1e293b]"
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
