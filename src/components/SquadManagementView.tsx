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
import { computeTeamChemistry } from '../engine/chemistryEngine';
import { Dumbbell, HeartPulse, Activity, BatteryCharging } from 'lucide-react';

export const SquadManagementView: React.FC = () => {
  const { gameState, setSelectedPlayerForModal, updateUserPlayingXI, runTrainingSession, showToast } = useGame();
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
  const xiPlayers = playingXIIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const chemistry = computeTeamChemistry(xiPlayers);
  const injuredCount = players.filter(p => p.injuryStatus && p.injuryStatus !== 'Fit').length;
  const fatiguedCount = players.filter(p => (p.fatigue || 0) > 70).length;
  const avgEnergy = players.length ? Math.round(players.reduce((s, p) => s + (p.energy ?? 100 - (p.fatigue || 0)), 0) / players.length) : 100;
  const trainingCost = 1.2;
  const trainedToday = !!userTeam.trainedThisMatchday;
  const clubBudget = gameState.progression?.clubBudgetCr ?? 8.5;

  const handleTraining = (focus: 'batting' | 'bowling' | 'recovery') => {
    const res = runTrainingSession(focus);
    showToast(res.message, res.applied > 0 ? 'success' : 'warn');
  };

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

      {/* 1b. FITNESS, CHEMISTRY & TRAINING DECK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Fitness pulse */}
        <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00FF87]" /> SQUAD FITNESS PULSE
            </span>
            <span className="text-xs font-mono font-black text-white">{avgEnergy}%</span>
          </div>
          <div className="h-2 rounded-full bg-[#04060c] overflow-hidden border border-[#182238]">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-[#00FF87]"
              style={{ width: `${avgEnergy}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className={`p-2 rounded-xl border ${injuredCount > 0 ? 'border-red-500/40 bg-red-950/20' : 'border-[#182238] bg-[#04060c]'}`}>
              <p className="text-[8px] uppercase font-black text-slate-500">Injured</p>
              <p className={`text-sm font-black font-mono ${injuredCount > 0 ? 'text-red-400' : 'text-[#00FF87]'}`}>{injuredCount}</p>
            </div>
            <div className={`p-2 rounded-xl border ${fatiguedCount > 0 ? 'border-amber-500/40 bg-amber-950/20' : 'border-[#182238] bg-[#04060c]'}`}>
              <p className="text-[8px] uppercase font-black text-slate-500">High Fatigue</p>
              <p className={`text-sm font-black font-mono ${fatiguedCount > 0 ? 'text-amber-400' : 'text-[#00FF87]'}`}>{fatiguedCount}</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 leading-relaxed">
            Matchday refreshes fatigue &amp; injury timers. Medical Lab speeds recovery; Training Center sharpens sessions.
          </p>
        </div>

        {/* Chemistry */}
        <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-cyan-400" /> XI CHEMISTRY
            </span>
            <span className="text-xs font-mono font-black text-cyan-400">{chemistry.score}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[#04060c] overflow-hidden border border-[#182238]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#00FF87] transition-all duration-500"
              style={{ width: `${chemistry.score}%` }}
            />
          </div>
          <div className="space-y-1.5">
            {chemistry.breakdown.map(item => (
              <div key={item.label} className="flex items-center justify-between text-[9px]">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-mono text-slate-400">{item.value}/{item.max}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-500">Match-day skill multiplier: <strong className="text-[#00FF87]">x{chemistry.multiplier.toFixed(3)}</strong></p>
        </div>

        {/* Training center */}
        <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#D4AF37]" /> TRAINING CENTER
            </span>
            <span className="text-[9px] font-mono text-amber-400">LV {gameState.progression?.facilities?.training?.level || 1}</span>
          </div>
          <p className="text-[10px] text-slate-400">One session per matchday. Costs ₹{trainingCost.toFixed(2)} Cr club budget.</p>
          {trainedToday ? (
            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-[10px] font-bold text-center">
              <BatteryCharging className="w-4 h-4 inline mr-1" /> Squad already trained today
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleTraining('batting')}
                className="p-2.5 rounded-xl bg-[#04060c] hover:bg-[#12202c] border border-[#182238] text-center transition cursor-pointer disabled:opacity-40"
                disabled={clubBudget < trainingCost}
              >
                <p className="text-[9px] font-black uppercase text-sky-300">Batting</p>
                <p className="text-[8px] text-slate-500 mt-0.5">+Form</p>
              </button>
              <button
                onClick={() => handleTraining('bowling')}
                className="p-2.5 rounded-xl bg-[#04060c] hover:bg-[#12202c] border border-[#182238] text-center transition cursor-pointer disabled:opacity-40"
                disabled={clubBudget < trainingCost}
              >
                <p className="text-[9px] font-black uppercase text-violet-300">Bowling</p>
                <p className="text-[8px] text-slate-500 mt-0.5">+Form</p>
              </button>
              <button
                onClick={() => handleTraining('recovery')}
                className="p-2.5 rounded-xl bg-[#04060c] hover:bg-[#12202c] border border-[#182238] text-center transition cursor-pointer disabled:opacity-40"
                disabled={clubBudget < trainingCost}
              >
                <p className="text-[9px] font-black uppercase text-emerald-300">Recovery</p>
                <p className="text-[8px] text-slate-500 mt-0.5">-Fatigue</p>
              </button>
            </div>
          )}
          <p className="text-[9px] text-slate-500">Budget available: <strong className="font-mono text-white">₹{clubBudget.toFixed(1)} Cr</strong></p>
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
                      <td className="p-3 space-y-1">
                        {isStarter ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-[#00FF87]/20 text-[#00FF87] font-black text-[9px]">
                            PLAYING XI
                          </span>
                        ) : (
                          <span className="inline-block text-slate-500 text-[10px]">Bench</span>
                        )}
                        {player.injuryStatus && player.injuryStatus !== 'Fit' ? (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-black text-[9px]">
                            {player.injuryStatus}
                          </span>
                        ) : (player.fatigue || 0) > 70 ? (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[9px]">
                            FATIGUED
                          </span>
                        ) : null}
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
