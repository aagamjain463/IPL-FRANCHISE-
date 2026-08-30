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

export const PlayingXIView: React.FC = () => {
  const { gameState, updateUserPlayingXI, setSelectedPlayerForModal } = useGame();
  const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const rosterIds = userTeam.rosterPlayerIds || [];
  const allSquadPlayers = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);

  const playingXI = userTeam.playingXI || {
    teamId: userTeam.id,
    playingXIIds: allSquadPlayers.slice(0, 11).map(p => p.id),
    battingOrder: allSquadPlayers.slice(0, 11).map(p => p.id),
    captainPlayerId: allSquadPlayers[0]?.id || '',
    wicketkeeperPlayerId: allSquadPlayers.find(p => p.role.includes('Wicketkeeper'))?.id || allSquadPlayers[0]?.id || '',
    powerplayBowlerIds: [],
    deathBowlerIds: []
  };

  const xiIds = playingXI.playingXIIds || [];
  const starters = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const bench = allSquadPlayers.filter(p => !xiIds.includes(p.id));

  const overseasCountInXI = starters.filter(p => p.isOverseas).length;
  const hasWK = starters.some(p => p.role.includes('Wicketkeeper'));
  const teamOvr = starters.length > 0 ? Math.round(starters.reduce((acc, p) => acc + p.overall, 0) / starters.length) : 0;
  const teamChemistry = Math.min(100, Math.round(90 + (starters.filter(p => !p.isOverseas).length * 1.5)));

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
    const sorted = [...allSquadPlayers].sort((a, b) => b.overall - a.overall);
    const selected: Player[] = [];
    let osCount = 0;

    for (const p of sorted) {
      if (selected.length >= 11) break;
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
      
      {/* 1. FC MOBILE MY TEAM HUD & TEAM OVR HEADER */}
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
            <span className="text-2xl font-mono-sport font-black text-[#00E5FF] leading-tight">{teamChemistry}/100</span>
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

      {/* 2. MAIN FC MOBILE STADIUM PITCH FORMATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PITCH 8 COLS: 11 CARDS STANDING ON TURF */}
        <div className="lg:col-span-8 bg-[#0a0f1d] p-4 sm:p-6 rounded-3xl border border-[#182238] shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-[#00FF87] flex items-center gap-1.5">
                <Users className="w-4 h-4" /> MATCHDAY FORMATION PITCH
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Click card to swap • Double-click for bio
            </span>
          </div>

          {/* Authentic FC Turf Grass Canvas */}
          <div className="fc-pitch-turf rounded-2xl p-4 sm:p-6 border-2 border-emerald-900/60 shadow-inner relative flex flex-col justify-around min-h-[520px] gap-6">
            
            {/* Pitch Center Ring Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
              <div className="w-36 h-36 rounded-full border-2 border-white" />
              <div className="absolute w-full h-[2px] bg-white" />
            </div>

            {/* TOP ROW: Top-Order Batters (Slots 1, 2, 3) */}
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-300 bg-black/60 px-2 py-0.5 rounded-full mb-2 inline-block">
                TOP-ORDER BATTERS
              </span>
              <div className="flex items-center justify-around gap-2">
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
                      <FCPlayerCard
                        player={player}
                        size="mini"
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
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-300 bg-black/60 px-2 py-0.5 rounded-full mb-2 inline-block">
                MIDDLE ORDER & ALL-ROUNDERS
              </span>
              <div className="flex items-center justify-around gap-2">
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
                      <FCPlayerCard
                        player={player}
                        size="mini"
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
            <div>
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-cyan-300 bg-black/60 px-2 py-0.5 rounded-full mb-2 inline-block">
                PACE & SPIN ATTACK
              </span>
              <div className="flex items-center justify-around gap-2">
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
                      <FCPlayerCard
                        player={player}
                        size="mini"
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
        </div>

      </div>

    </div>
  );
};
