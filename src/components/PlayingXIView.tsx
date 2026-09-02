import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/cricket';
import { 
  ShieldCheck, Crown, Shirt, Zap, AlertTriangle, 
  ArrowUpDown, Sparkles, Check, Flame, ChevronUp, ChevronDown,
  Users, RefreshCw, Wand2, Shield, Eye
} from 'lucide-react';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { getFCCardTier, getFCPlayerRatings } from '../engine/fc26Engine';
import { computeTeamChemistry } from '../engine/chemistryEngine';

export const PlayingXIView: React.FC = () => {
  const { gameState, updateUserPlayingXI, buildValidXIForTeam, setSelectedPlayerForModal } = useGame();
  const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const rosterIds = userTeam.rosterPlayerIds || [];
  const allSquadPlayers = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const injuredSquad = allSquadPlayers.filter(p => p.injuryStatus && p.injuryStatus !== 'Fit');
  const fitSquad = allSquadPlayers.filter(p => !p.injuryStatus || p.injuryStatus === 'Fit');

  const playingXI = userTeam.playingXI || {
    teamId: userTeam.id,
    playingXIIds: fitSquad.slice(0, 11).map(p => p.id),
    battingOrder: fitSquad.slice(0, 11).map(p => p.id),
    captainPlayerId: fitSquad[0]?.id || '',
    wicketkeeperPlayerId: fitSquad.find(p => p.role.includes('Wicketkeeper'))?.id || fitSquad[0]?.id || '',
    powerplayBowlerIds: [],
    deathBowlerIds: []
  };

  const xiIds = playingXI.playingXIIds || [];
  const starters = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const bench = allSquadPlayers.filter(p => !xiIds.includes(p.id));

  const overseasCountInXI = starters.filter(p => p.isOverseas).length;
  const hasWK = starters.some(p => p.role.includes('Wicketkeeper'));
  const teamOvr = starters.length > 0 ? Math.round(starters.reduce((acc, p) => acc + p.overall, 0) / starters.length) : 0;
  const chemistryResult = computeTeamChemistry(starters);
  const teamChemistry = chemistryResult.score;
  const chemMultiplier = chemistryResult.multiplier;
  const injCount = starters.filter(p => (p.injuryStatus || 'Fit') !== 'Fit').length;
  const playersNeeded = Math.max(0, 11 - starters.length);

  const isPlayerInjured = (p?: Player | null) => Boolean(p && p.injuryStatus && p.injuryStatus !== 'Fit');

  const InjuryBadge = ({ player, compact = false }: { player: Player; compact?: boolean }) => {
    if (!isPlayerInjured(player)) return null;
    return (
      <div
        title={`${player.name} — ${player.injuryStatus}`}
        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-40 px-2 py-0.5 rounded-full bg-red-600 text-white border border-red-300 shadow-lg font-black uppercase whitespace-nowrap pointer-events-none ${
          compact ? 'text-[7px]' : 'text-[8px]'
        }`}
      >
        🚑 {player.injuryStatus}
      </div>
    );
  };

  // Swap starter with bench or change batting order
  const handlePlayerClick = (playerId: string) => {
    if (!selectedForSwap) {
      setSelectedForSwap(playerId);
      return;
    }

    if (selectedForSwap === playerId) {
      setSelectedForSwap(null);
      return;
    }

    // Perform Swap
    const isFirstStarter = playingXI.playingXIIds.includes(selectedForSwap);
    const isSecondStarter = playingXI.playingXIIds.includes(playerId);

    let newXIIds = [...playingXI.playingXIIds];
    let newBattingOrder = [...playingXI.battingOrder];

    if (isFirstStarter && isSecondStarter) {
      // Reorder within XI
      const idx1 = newBattingOrder.indexOf(selectedForSwap);
      const idx2 = newBattingOrder.indexOf(playerId);
      newBattingOrder[idx1] = playerId;
      newBattingOrder[idx2] = selectedForSwap;
      newXIIds = [...newBattingOrder];
    } else if (isFirstStarter && !isSecondStarter) {
      // Starter swapped with bench
      const idx = newXIIds.indexOf(selectedForSwap);
      newXIIds[idx] = playerId;
      const bIdx = newBattingOrder.indexOf(selectedForSwap);
      newBattingOrder[bIdx] = playerId;
    } else if (!isFirstStarter && isSecondStarter) {
      const idx = newXIIds.indexOf(playerId);
      newXIIds[idx] = selectedForSwap;
      const bIdx = newBattingOrder.indexOf(playerId);
      newBattingOrder[bIdx] = selectedForSwap;
    }

    updateUserPlayingXI({
      ...playingXI,
      playingXIIds: newXIIds,
      battingOrder: newBattingOrder
    });

    setSelectedForSwap(null);
  };

  const autoSelectBestXI = () => {
    const best = buildValidXIForTeam();
    if (best) {
      updateUserPlayingXI(best);
      return;
    }
    // Injured players are NEVER auto-selected — only fit squad members are eligible.
    const sorted = [...fitSquad].sort((a, b) => b.overall - a.overall);
    const selected: Player[] = [];
    let osCount = 0;

    for (const p of sorted) {
      if (selected.length >= 11) break;
      if (isPlayerInjured(p)) continue;
      if (p.isOverseas) {
        if (osCount < 4) {
          selected.push(p);
          osCount++;
        }
      } else {
        selected.push(p);
      }
    }

    const ids = selected.map(p => p.id);
    const pacers = selected.filter(p => p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium')).map(p => p.id);
    const death = selected.filter(p => p.attributes.deathBowling > 80).map(p => p.id);

    updateUserPlayingXI({
      ...playingXI,
      playingXIIds: ids,
      battingOrder: ids,
      captainPlayerId: selected[0]?.id || '',
      wicketkeeperPlayerId: selected.find(p => p.role.includes('Wicketkeeper'))?.id || selected[0]?.id || '',
      powerplayBowlerIds: pacers.slice(0, 2),
      deathBowlerIds: death.slice(0, 2)
    });
  };

  const setCaptain = (pId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateUserPlayingXI({ ...playingXI, captainPlayerId: pId });
  };

  const setWicketkeeper = (pId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateUserPlayingXI({ ...playingXI, wicketkeeperPlayerId: pId });
  };

  // Group starters into tactical pitch zones:
  // Top Order (1-3), Middle & Finishers (4-7), Pace & Spin Attack (8-11)
  const topOrder = starters.slice(0, 3);
  const middleOrder = starters.slice(3, 7);
  const bowlingAttack = starters.slice(7, 11);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">

      {selectedForSwap && (
        <div className="p-3 rounded-2xl bg-[#00FF87]/20 border border-[#00FF87] text-[#00FF87] flex items-center justify-between text-xs font-bold animate-pulse">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4" />
            <span>Click any starter or bench player card to swap position with <strong>{gameState.allPlayers[selectedForSwap]?.name}</strong></span>
          </div>
          <button 
            onClick={() => setSelectedForSwap(null)}
            className="px-2.5 py-1 rounded-lg bg-black text-white text-[10px] font-mono cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {injuredSquad.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/40 flex items-start gap-3 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wider text-red-400">
              {injuredSquad.length} Injured Player{injuredSquad.length > 1 ? 's' : ''} — Cannot Play
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Auto-build excludes them. Swap them out of the XI or let them recover before matchday.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {injuredSquad.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-[9px] font-bold text-red-200">
                  🚑 {p.name} · {p.injuryStatus}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN FC MOBILE STADIUM PITCH FORMATION — raised to the top-left, next to the bench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* PITCH 8 COLS: 11 CARDS STANDING ON TURF */}
        <div className="lg:col-span-8 bg-[#0a0f1d] p-4 sm:p-6 rounded-3xl border border-[#182238] shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#00FF87] flex items-center gap-1.5">
                <Users className="w-4 h-4" /> MATCHDAY FORMATION PITCH
              </span>
              <span className="hidden sm:inline text-[9px] font-mono uppercase tracking-widest text-slate-500 bg-black/40 px-2 py-0.5 rounded-full">
                BIG FIELD VIEW
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Click card to swap • Double-click for bio
            </span>
          </div>

          {/* Authentic FC Turf Grass Canvas — taller, longer, stadium-lit */}
          <div className="fc-pitch-turf rounded-2xl p-5 sm:p-7 relative flex flex-col justify-around min-h-[640px] sm:min-h-[720px] xl:min-h-[780px] gap-8">
            {/* Center circle + pitch strip (drawn by fc-pitch-turf CSS) */}
            <div className="fc-pitch-circle" />
            <div className="fc-pitch-crease fc-pitch-crease--top" />
            <div className="fc-pitch-crease fc-pitch-crease--bottom" />

            {/* TOP ROW: Top-Order Batters (Slots 1, 2, 3) */}
            <div className="relative z-10">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-300 bg-black/70 px-2.5 py-0.5 rounded-full mb-3 inline-block shadow">
                TOP-ORDER BATTERS
              </span>
              <div className="grid grid-cols-3 place-items-center gap-3 sm:gap-4">
                {topOrder.map((player, idx) => {
                  const isSelected = selectedForSwap === player.id;
                  const isCaptain = playingXI.captainPlayerId === player.id;
                  const isWK = playingXI.wicketkeeperPlayerId === player.id;
                  return (
                    <div 
                      key={player.id} 
                      className={`relative transition-transform ${isSelected ? 'scale-110 z-30' : 'hover:scale-105'}`}
                      onClick={() => handlePlayerClick(player.id)}
                      onDoubleClick={() => setSelectedPlayerForModal(player)}
                    >
                      <InjuryBadge player={player} />
                      <FCPlayerCard
                        player={player}
                        size="pitch"
                        isSelected={isSelected}
                      />
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <button
                          onClick={(e) => setCaptain(player.id, e)}
                          className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded cursor-pointer ${
                            isCaptain ? 'bg-[#D4AF37] text-black shadow' : 'bg-black/70 text-slate-400 hover:text-white'
                          }`}
                          title="Set Captain"
                        >
                          C
                        </button>
                        <button
                          onClick={(e) => setWicketkeeper(player.id, e)}
                          className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded cursor-pointer ${
                            isWK ? 'bg-purple-500 text-white shadow' : 'bg-black/70 text-slate-400 hover:text-white'
                          }`}
                          title="Set Wicketkeeper"
                        >
                          WK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MIDDLE ROW: Middle Order & Finishers (Slots 4, 5, 6, 7) */}
            <div className="relative z-10">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-300 bg-black/70 px-2.5 py-0.5 rounded-full mb-3 inline-block shadow">
                MIDDLE ORDER & ALL-ROUNDERS
              </span>
              <div className="grid grid-cols-4 place-items-center gap-3 sm:gap-4">
                {middleOrder.map((player, idx) => {
                  const isSelected = selectedForSwap === player.id;
                  const isCaptain = playingXI.captainPlayerId === player.id;
                  const isWK = playingXI.wicketkeeperPlayerId === player.id;
                  return (
                    <div 
                      key={player.id} 
                      className={`relative transition-transform ${isSelected ? 'scale-110 z-30' : 'hover:scale-105'}`}
                      onClick={() => handlePlayerClick(player.id)}
                      onDoubleClick={() => setSelectedPlayerForModal(player)}
                    >
                      <InjuryBadge player={player} />
                      <FCPlayerCard
                        player={player}
                        size="pitch"
                        isSelected={isSelected}
                      />
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <button
                          onClick={(e) => setCaptain(player.id, e)}
                          className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded cursor-pointer ${
                            isCaptain ? 'bg-[#D4AF37] text-black shadow' : 'bg-black/70 text-slate-400 hover:text-white'
                          }`}
                          title="Set Captain"
                        >
                          C
                        </button>
                        <button
                          onClick={(e) => setWicketkeeper(player.id, e)}
                          className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded cursor-pointer ${
                            isWK ? 'bg-purple-500 text-white shadow' : 'bg-black/70 text-slate-400 hover:text-white'
                          }`}
                          title="Set Wicketkeeper"
                        >
                          WK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM ROW: Bowling Core Attack (Slots 8, 9, 10, 11) */}
            <div className="relative z-10">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-cyan-300 bg-black/70 px-2.5 py-0.5 rounded-full mb-3 inline-block shadow">
                PACE & SPIN ATTACK
              </span>
              <div className="grid grid-cols-4 place-items-center gap-3 sm:gap-4">
                {bowlingAttack.map((player, idx) => {
                  const isSelected = selectedForSwap === player.id;
                  const isCaptain = playingXI.captainPlayerId === player.id;
                  const isWK = playingXI.wicketkeeperPlayerId === player.id;
                  return (
                    <div 
                      key={player.id} 
                      className={`relative transition-transform ${isSelected ? 'scale-110 z-30' : 'hover:scale-105'}`}
                      onClick={() => handlePlayerClick(player.id)}
                      onDoubleClick={() => setSelectedPlayerForModal(player)}
                    >
                      <InjuryBadge player={player} />
                      <FCPlayerCard
                        player={player}
                        size="pitch"
                        isSelected={isSelected}
                      />
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <button
                          onClick={(e) => setCaptain(player.id, e)}
                          className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded cursor-pointer ${
                            isCaptain ? 'bg-[#D4AF37] text-black shadow' : 'bg-black/70 text-slate-400 hover:text-white'
                          }`}
                          title="Set Captain"
                        >
                          C
                        </button>
                        <button
                          onClick={(e) => setWicketkeeper(player.id, e)}
                          className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded cursor-pointer ${
                            isWK ? 'bg-purple-500 text-white shadow' : 'bg-black/70 text-slate-400 hover:text-white'
                          }`}
                          title="Set Wicketkeeper"
                        >
                          WK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* BENCH & RESERVES 4 COLS */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0a0f1d] p-4 sm:p-5 rounded-3xl border border-[#182238] shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 font-heading">
                <Shirt className="w-4 h-4 text-slate-400" /> SQUAD BENCH ({bench.length})
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Click to Swap</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {bench.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 italic bg-[#04060c] rounded-2xl border border-[#182238]">
                  All squad players are in the starting XI.
                </div>
              ) : (
                bench.map(player => (
                  <div
                    key={player.id}
                    onClick={() => handlePlayerClick(player.id)}
                    className="relative"
                  >
                    <InjuryBadge player={player} compact />
                    <FCPlayerCard
                      player={player}
                      size="compact"
                      isSelected={selectedForSwap === player.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chemistry Room */}
          <div className="bg-[#0a0f1d] p-4 sm:p-5 rounded-3xl border border-[#182238] shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 font-heading">
                <Flame className="w-4 h-4 text-[#00E5FF]" /> CHEMISTRY ROOM
              </h3>
              <span className={`text-sm font-black font-mono ${teamChemistry >= 80 ? 'text-[#00FF87]' : teamChemistry >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {teamChemistry}/100
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#04060c] overflow-hidden border border-[#182238]">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#00E5FF] to-[#00FF87]"
                style={{ width: `${teamChemistry}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Chemistry applies a match-day skill multiplier of <strong className="text-[#00FF87]">x{chemMultiplier.toFixed(3)}</strong> — same-nationality bonds, Indian core, role synergy and captain leadership all count.
            </p>
            <div className="space-y-2">
              {chemistryResult.breakdown.map(item => (
                <div key={item.label} className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-[#04060c] overflow-hidden">
                      <div className="h-full bg-[#00E5FF]" style={{ width: `${(item.value / item.max) * 100}%` }} />
                    </div>
                    <span className="font-mono text-slate-500 w-10 text-right">{item.value}/{item.max}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matchday Readiness */}
          <div className="bg-[#0a0f1d] p-4 sm:p-5 rounded-3xl border border-[#182238] shadow-2xl space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 font-heading">
              <ShieldCheck className="w-4 h-4 text-[#00FF87]" /> MATCHDAY READINESS
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className={`p-3 rounded-xl border ${playersNeeded > 0 ? 'border-red-500/40 bg-red-950/20' : 'border-[#182238] bg-[#04060c]'}`}>
                <p className="text-[9px] uppercase font-black text-slate-500">XI Slots</p>
                <p className={`text-lg font-black font-mono ${playersNeeded > 0 ? 'text-red-400' : 'text-[#00FF87]'}`}>{starters.length}/11</p>
              </div>
              <div className={`p-3 rounded-xl border ${injCount > 0 ? 'border-amber-500/40 bg-amber-950/20' : 'border-[#182238] bg-[#04060c]'}`}>
                <p className="text-[9px] uppercase font-black text-slate-500">Injured in XI</p>
                <p className={`text-lg font-black font-mono ${injCount > 0 ? 'text-amber-400' : 'text-[#00FF87]'}`}>{injCount}</p>
              </div>
              <div className="p-3 rounded-xl border border-[#182238] bg-[#04060c]">
                <p className="text-[9px] uppercase font-black text-slate-500">Overseas</p>
                <p className={`text-lg font-black font-mono ${overseasCountInXI > 4 ? 'text-red-400' : 'text-blue-400'}`}>{overseasCountInXI}/4</p>
              </div>
              <div className="p-3 rounded-xl border border-[#182238] bg-[#04060c]">
                <p className="text-[9px] uppercase font-black text-slate-500">Keeper</p>
                <p className={`text-lg font-black font-mono ${hasWK ? 'text-[#00FF87]' : 'text-red-400'}`}>{hasWK ? '✓' : '✗'}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. FC MOBILE MY TEAM HUD & TEAM OVR HEADER (kept under the formation) */}
      <div className="bg-gradient-to-r from-[#070a14] via-[#0a0f1d] to-[#070a14] p-5 sm:p-6 rounded-3xl border border-[#182238] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-[#00FF87]"
            style={{ backgroundColor: userTeam.primaryColor, color: userTeam.secondaryColor }}
          >
            {userTeam.shortName}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight font-heading">
                {userTeam.name} Lineup
              </h2>
              <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40">
                ACTIVE SQUAD
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
              <span>Overseas: <strong className={overseasCountInXI > 4 ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>{overseasCountInXI}/4 Max</strong></span>
              <span>•</span>
              <span>Keeper: <strong className={hasWK ? 'text-[#00FF87]' : 'text-red-400'}>{hasWK ? 'Ready' : 'Missing WK!'}</strong></span>
            </div>
          </div>
        </div>

        {/* Big FC Mobile Team OVR & Chemistry Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-[#04060c] px-4 py-2.5 rounded-2xl border border-[#182238] text-center shadow-lg">
            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest font-mono">TEAM OVR</span>
            <span className="text-2xl font-mono-sport font-black text-[#00FF87] leading-tight">{teamOvr}</span>
          </div>

          <div className="bg-[#04060c] px-4 py-2.5 rounded-2xl border border-[#182238] text-center shadow-lg">
            <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest font-mono">CHEMISTRY</span>
            <span className="text-2xl font-mono-sport font-black text-[#00E5FF] leading-tight">{teamChemistry}<span className="text-xs text-slate-500">/100</span></span>
            <span className="text-[9px] font-mono text-[#00FF87] block">x{chemMultiplier.toFixed(3)} match bonus</span>
          </div>

          <button
            id="btn-auto-best-xi"
            onClick={autoSelectBestXI}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-[#00FF87] to-emerald-400 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition hover:scale-105 active:scale-95 cursor-pointer font-mono"
            title="Auto-select highest OVR lineup within overseas rules"
          >
            <Wand2 className="w-4 h-4" />
            <span>AUTO-BUILD</span>
          </button>
        </div>

      </div>

    </div>
  );
};
