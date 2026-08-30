import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/cricket';
import { 
  Users, Filter, ArrowUpDown, Shield, Heart, Zap, Sparkles, 
  Grid, List, AlertTriangle, Crown, Shirt, Trophy, Check
} from 'lucide-react';
import { PlayerCard } from './common/PlayerCard';
import { TOKENS, getPlayerRarity } from '../utils/themeTokens';

export const SquadManagementView: React.FC = () => {
  const { gameState, setSelectedPlayerForModal, updateUserPlayingXI } = useGame();
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'overall' | 'form' | 'potential' | 'salaryCr' | 'age'>('overall');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const rosterIds = userTeam.rosterPlayerIds || [];
  const players = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);

  const playingXIIds = userTeam.playingXI?.playingXIIds || [];

  const filtered = players.filter(p => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'OVERSEAS') return p.isOverseas;
    if (roleFilter === 'BAT') return p.role.includes('Batter') || p.role.includes('Batsman');
    if (roleFilter === 'BOWL') return p.role.includes('Bowler');
    if (roleFilter === 'AR') return p.role.includes('All-rounder') || p.role.includes('Allrounder');
    if (roleFilter === 'WK') return p.role.includes('Wicketkeeper') || p.role.includes('WK');
    return true;
  }).sort((a, b) => {
    return ((b as any)[sortBy] || 0) - ((a as any)[sortBy] || 0);
  });

  const totalWage = players.reduce((acc, p) => acc + (p.salaryCr || p.basePriceCr || 0), 0);
  const avgOvr = players.length > 0 ? Math.round(players.reduce((acc, p) => acc + p.overall, 0) / players.length) : 0;
  const overseasCount = players.filter(p => p.isOverseas).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      
      {/* 1. SQUAD PULSE & TOP STATS BAR */}
      <div className="bg-gradient-to-r from-[#0e1628] via-[#090e1a] to-[#030712] p-5 sm:p-6 rounded-3xl border border-[#1e293b] shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2"
            style={{ backgroundColor: userTeam.primaryColor, color: userTeam.secondaryColor, borderColor: '#D4AF37' }}
          >
            {userTeam.shortName}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight italic">
                {userTeam.name} Roster
              </h2>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                {players.length} / 25 SQUAD LIMIT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Wage Bill: <strong className="text-white font-mono">₹{totalWage.toFixed(2)} Cr/yr</strong> • Squad Avg: <strong className="text-[#D4AF37] font-mono">{avgOvr} OVR</strong>
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="bg-[#05070a] px-3.5 py-2 rounded-xl border border-[#1e293b] text-center flex-1 sm:flex-none">
            <span className="text-[9px] uppercase font-black text-slate-400 block">OVERSEAS</span>
            <span className={`text-sm font-mono font-black ${overseasCount > 8 ? 'text-red-400' : 'text-blue-400'}`}>
              {overseasCount} / 8 Max
            </span>
          </div>

          <div className="bg-[#05070a] px-3.5 py-2 rounded-xl border border-[#1e293b] text-center flex-1 sm:flex-none">
            <span className="text-[9px] uppercase font-black text-slate-400 block">PLAYING XI</span>
            <span className="text-sm font-mono font-black text-emerald-400">
              {playingXIIds.length} / 11 Set
            </span>
          </div>

          {/* Card / Table Toggle */}
          <div className="flex bg-[#05070a] p-1 rounded-xl border border-[#1e293b]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#D4AF37] text-black font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-[#D4AF37] text-black font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. FILTER & SORTING BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#090e1a] p-3 rounded-2xl border border-[#1e293b]">
        
        {/* Role Filters */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'BAT', 'AR', 'BOWL', 'WK', 'OVERSEAS'] as const).map(f => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                roleFilter === f 
                  ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black shadow-md' 
                  : 'bg-[#05070a] text-slate-400 hover:text-white border border-[#1e293b]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold uppercase hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#05070a] border border-[#1e293b] text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
          >
            <option value="overall">Highest Rating (OVR)</option>
            <option value="form">Current Form (★)</option>
            <option value="potential">Growth Potential</option>
            <option value="salaryCr">Highest Salary</option>
            <option value="age">Age (Youngest)</option>
          </select>
        </div>

      </div>

      {/* 3. ROSTER DISPLAY: CARDS OR TABLE */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(player => {
            const inXI = playingXIIds.includes(player.id);
            const isCap = userTeam.playingXI?.captainId === player.id;
            const isWK = userTeam.playingXI?.wicketkeeperId === player.id;

            return (
              <div key={player.id} className="relative group">
                <PlayerCard
                  player={player}
                  variant="standard"
                  isSelected={inXI}
                  isCaptain={isCap}
                  isWicketkeeper={isWK}
                  onClick={() => setSelectedPlayerForModal(player)}
                  customActionText={inXI ? "✓ IN PLAYING XI" : "+ SUB INTO LINEUP"}
                  onCustomAction={() => {
                    setSelectedPlayerForModal(player);
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#090e1a] rounded-2xl border border-[#1e293b] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#05070a] text-slate-400 font-black border-b border-[#1e293b] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-3">Role</th>
                  <th className="py-3.5 px-3 text-center">OVR</th>
                  <th className="py-3.5 px-3 text-center">BAT / BOWL</th>
                  <th className="py-3.5 px-3 text-center">Form</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-right">Wage</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {filtered.map(player => {
                  const inXI = playingXIIds.includes(player.id);
                  const isCap = userTeam.playingXI?.captainId === player.id;

                  return (
                    <tr 
                      key={player.id}
                      onClick={() => setSelectedPlayerForModal(player)}
                      className="hover:bg-[#0f172a] cursor-pointer transition text-slate-200"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#05070a] text-[#D4AF37] font-mono font-black text-xs flex items-center justify-center border border-[#1e293b]">
                            {player.overall}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-white text-xs">{player.name}</span>
                              {isCap && <span className="text-[9px] font-black text-amber-400">(C)</span>}
                              {player.isOverseas ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 font-bold border border-blue-500/30">
                                  ✈️ {player.nationality}
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/30">
                                  🇮🇳 IND
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{player.age} yrs • {player.battingStyle}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-300 font-bold">{player.role}</td>

                      <td className="py-3 px-3 text-center font-mono font-black text-[#D4AF37] text-sm">
                        {player.overall}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-300">
                        {player.attributes.battingPower} / {player.attributes.bowlingSkill}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-400 font-mono">
                        ★ {player.form?.toFixed(1) || '4.0'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {inXI ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase">
                            STARTER
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-bold uppercase">
                            BENCH
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-amber-300">
                        ₹{player.salaryCr || player.basePriceCr} Cr
                      </td>

                      <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedPlayerForModal(player)}
                          className="px-3 py-1 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-slate-200 text-[10px] font-black uppercase tracking-wider transition border border-[#1e293b] cursor-pointer"
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
