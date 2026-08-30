import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/cricket';
import { FCCardTier } from '../types/fc26';
import { 
  Users, Filter, ArrowUpDown, Shield, Heart, Zap, Sparkles, 
  Grid, List, AlertTriangle, Crown, Shirt, Trophy, Check, Diamond
} from 'lucide-react';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { getFCCardTier } from '../engine/fc26Engine';

export const SquadManagementView: React.FC = () => {
  const { gameState, setSelectedPlayerForModal, updateUserPlayingXI } = useGame();
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'overall' | 'form' | 'potential' | 'salaryCr' | 'age'>('overall');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const rosterIds = userTeam.rosterPlayerIds || [];
  const players = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const playingXIIds = userTeam.playingXI?.playingXIIds || [];

  const filtered = players.filter(p => {
    // Role filter
    if (roleFilter === 'OVERSEAS' && !p.isOverseas) return false;
    if (roleFilter === 'BAT' && !(p.role.includes('Batter') || p.role.includes('Batsman'))) return false;
    if (roleFilter === 'BOWL' && !p.role.includes('Bowler')) return false;
    if (roleFilter === 'AR' && !(p.role.includes('All-rounder') || p.role.includes('Allrounder'))) return false;
    if (roleFilter === 'WK' && !(p.role.includes('Wicketkeeper') || p.role.includes('WK'))) return false;

    // Tier filter
    if (tierFilter !== 'ALL') {
      const pTier = getFCCardTier(p);
      if (pTier !== tierFilter) return false;
    }

    return true;
  }).sort((a, b) => {
    return ((b as any)[sortBy] || 0) - ((a as any)[sortBy] || 0);
  });

  const totalWage = players.reduce((acc, p) => acc + (p.salaryCr || p.basePriceCr || 0), 0);
  const avgOvr = players.length > 0 ? Math.round(players.reduce((acc, p) => acc + p.overall, 0) / players.length) : 0;
  const overseasCount = players.filter(p => p.isOverseas).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      
      {/* 1. FC MOBILE SQUAD PULSE & TOP STATS BAR */}
      <div className="bg-gradient-to-r from-[#070a14] via-[#0a0f1d] to-[#070a14] p-5 sm:p-6 rounded-3xl border border-[#182238] shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-[#00FF87]"
            style={{ backgroundColor: userTeam.primaryColor, color: userTeam.secondaryColor }}
          >
            {userTeam.shortName}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight italic font-heading">
                {userTeam.name} Card Binder
              </h2>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-[#00FF87]/15 text-[#00FF87] border border-[#00FF87]/30">
                {players.length} / 25 CARDS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active Wage Bill: <strong className="text-white font-mono">₹{totalWage.toFixed(2)} Cr/yr</strong> • Squad Avg: <strong className="text-[#00FF87] font-mono">{avgOvr} OVR</strong>
            </p>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="bg-[#04060c] px-3.5 py-2 rounded-xl border border-[#182238] text-center flex-1 sm:flex-none">
            <span className="text-[9px] uppercase font-black text-slate-400 block font-mono">OVERSEAS</span>
            <span className={`text-sm font-mono font-black ${overseasCount > 8 ? 'text-red-400' : 'text-blue-400'}`}>
              {overseasCount} / 8 Max
            </span>
          </div>

          <div className="bg-[#04060c] px-3.5 py-2 rounded-xl border border-[#182238] text-center flex-1 sm:flex-none">
            <span className="text-[9px] uppercase font-black text-slate-400 block font-mono">IN PLAYING XI</span>
            <span className="text-sm font-mono font-black text-[#00FF87]">
              {playingXIIds.length} / 11 Set
            </span>
          </div>

          {/* Card / Table Toggle */}
          <div className="flex bg-[#04060c] p-1 rounded-xl border border-[#182238]">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#00FF87] text-black font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Card Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-[#00FF87] text-black font-black shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Dense Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. FILTER & SORTING BAR */}
      <div className="space-y-3 bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238]">
        
        {/* Tier Badges Row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 mr-2 font-mono">TIER:</span>
          {(['ALL', 'Icon Legend', 'TOTW', 'Centurions', 'Wonderkid Evo', 'Gold Rare', 'Silver Rare'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                tierFilter === t
                  ? 'bg-[#00FF87] text-black shadow-md'
                  : 'bg-[#04060c] text-slate-400 hover:text-white border border-[#182238]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Role & Sorting Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#182238]">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'BAT', 'AR', 'BOWL', 'WK', 'OVERSEAS'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  roleFilter === f
                    ? 'bg-[#D4AF37] text-black shadow-md'
                    : 'bg-[#04060c] text-slate-400 hover:text-white border border-[#182238]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase font-mono">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#04060c] text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-[#182238] focus:outline-none focus:border-[#00FF87] cursor-pointer"
            >
              <option value="overall">Highest OVR</option>
              <option value="form">In-Form ★</option>
              <option value="potential">Growth Potential</option>
              <option value="salaryCr">Highest Wage (₹ Cr)</option>
              <option value="age">Age</option>
            </select>
          </div>
        </div>

      </div>

      {/* 3. CARD GRID VIEW */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
          {filtered.map(player => (
            <div 
              key={player.id} 
              className="flex justify-center w-full"
              onClick={() => setSelectedPlayerForModal(player)}
            >
              <FCPlayerCard
                player={player}
                size="md"
                isSelected={playingXIIds.includes(player.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        /* TABLE DENSE VIEW */
        <div className="bg-[#0a0f1d] rounded-2xl border border-[#182238] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#04060c] text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-[#182238]">
                <tr>
                  <th className="p-3">Card</th>
                  <th className="p-3">Player</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3 text-center">OVR</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Nation</th>
                  <th className="p-3">Wage</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182238]">
                {filtered.map(player => {
                  const tier = getFCCardTier(player);
                  const isStarter = playingXIIds.includes(player.id);
                  return (
                    <tr 
                      key={player.id}
                      onClick={() => setSelectedPlayerForModal(player)}
                      className="hover:bg-[#10192e] transition cursor-pointer"
                    >
                      <td className="p-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow"
                          style={{ backgroundColor: player.avatarColor || '#1e293b' }}
                        >
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-white uppercase">{player.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#04060c] text-[#00FF87] border border-[#00FF87]/30">
                          {tier}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono-sport font-black text-sm text-[#00FF87]">{player.overall}</td>
                      <td className="p-3 text-slate-400">{player.role}</td>
                      <td className="p-3 text-slate-400">{player.nationality}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">₹{player.salaryCr} Cr</td>
                      <td className="p-3">
                        {isStarter ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#00FF87]/20 text-[#00FF87] font-black text-[9px]">
                            PLAYING XI
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Bench</span>
                        )}
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
