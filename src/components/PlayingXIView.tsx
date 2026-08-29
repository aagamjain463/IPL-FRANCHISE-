import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/cricket';
import { 
  ShieldCheck, Crown, Shirt, Zap, AlertTriangle, 
  ArrowUpDown, Sparkles, Check, Flame, ChevronUp, ChevronDown 
} from 'lucide-react';

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
    captainId: allSquadPlayers[0]?.id || '',
    wicketkeeperId: allSquadPlayers.find(p => p.role.includes('Wicketkeeper'))?.id || allSquadPlayers[0]?.id || '',
    powerplayBowlerIds: [],
    deathBowlerIds: [],
    mainSpinBowlerIds: []
  };

  const xiIds = playingXI.playingXIIds || [];
  const starters = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const bench = allSquadPlayers.filter(p => !xiIds.includes(p.id));

  const overseasCountInXI = starters.filter(p => p.isOverseas).length;
  const hasWK = starters.some(p => p.role.includes('Wicketkeeper'));

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

    // Pick top players respecting 4 OS rule
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Tactical Lineup & Playing XI</h2>
            <span className="text-xs text-[#64748b]">• Match Ready</span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Click any player card to swap positions or bring a player in from the bench.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
            overseasCountInXI > 4 ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-[#05070a] text-blue-400 border-[#1e293b]'
          }`}>
            <span>Overseas Quota:</span>
            <span>{overseasCountInXI} / 4 Max</span>
          </div>

          <button
            id="btn-auto-best-xi"
            onClick={autoSelectBestXI}
            className="px-4 py-2 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition flex items-center gap-1.5 shadow"
          >
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span>Auto Best XI</span>
          </button>
        </div>
      </div>

      {overseasCountInXI > 4 && (
        <div className="bg-red-500/15 border border-red-500/40 p-4 rounded-xl flex items-center gap-3 text-red-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong>Illegal Lineup Warning:</strong> You have {overseasCountInXI} overseas players in your Playing XI. The maximum allowed in an IPL match is 4.
          </span>
        </div>
      )}

      {/* Main Grid: Starters vs Bench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Starters (11) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
              <Shirt className="w-4 h-4" /> Batting Order & Starters (1 to 11)
            </h3>
            <span className="text-[11px] text-[#64748b] font-mono">{starters.length} Selected</span>
          </div>

          <div className="space-y-2">
            {starters.map((player, idx) => {
              const isSelected = selectedForSwap === player.id;
              const isCaptain = playingXI.captainPlayerId === player.id;
              const isWK = playingXI.wicketkeeperPlayerId === player.id;

              return (
                <div
                  key={player.id}
                  id={`starter-card-${player.id}`}
                  onClick={() => handlePlayerClick(player.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-xl'
                      : 'bg-[#0f172a] hover:bg-[#131d35] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono font-bold text-xs text-[#D4AF37]">
                      #{idx + 1}
                    </span>

                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayerForModal(player);
                      }}
                      className="w-10 h-10 rounded-lg bg-[#05070a] text-white font-mono font-bold text-sm flex items-center justify-center border border-[#1e293b] hover:border-[#D4AF37] transition"
                    >
                      {player.overall}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">{player.name}</h4>
                        {player.isOverseas ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                            ✈️ OS
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                            🇮🇳 IND
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94a3b8]">
                        {player.role} • BAT {player.battingRating} • BOWL {player.bowlingRating}
                      </span>
                    </div>
                  </div>

                  {/* Badges & Role assignment */}
                  <div className="flex items-center gap-2">
                    <button
                      id={`btn-toggle-c-${player.id}`}
                      onClick={(e) => setCaptain(player.id, e)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 ${
                        isCaptain ? 'bg-[#D4AF37] text-black font-black' : 'bg-[#05070a] text-[#64748b] hover:text-white border border-[#1e293b]'
                      }`}
                      title="Assign Captain"
                    >
                      <Crown className="w-3 h-3" /> C
                    </button>

                    <button
                      id={`btn-toggle-wk-${player.id}`}
                      onClick={(e) => setWicketkeeper(player.id, e)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                        isWK ? 'bg-blue-500 text-white' : 'bg-[#05070a] text-[#64748b] hover:text-white border border-[#1e293b]'
                      }`}
                      title="Assign Wicketkeeper"
                    >
                      WK
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench / Reserves */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] flex items-center gap-1.5">
              <Shirt className="w-4 h-4" /> Bench Reserves ({bench.length})
            </h3>
            <span className="text-[10px] text-[#64748b]">Click to Sub In</span>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {bench.map(player => {
              const isSelected = selectedForSwap === player.id;
              return (
                <div
                  key={player.id}
                  id={`bench-card-${player.id}`}
                  onClick={() => handlePlayerClick(player.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37]'
                      : 'bg-[#0f172a] hover:bg-[#131d35] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlayerForModal(player);
                      }}
                      className="w-9 h-9 rounded-lg bg-[#05070a] text-zinc-300 font-mono font-bold text-xs flex items-center justify-center border border-[#1e293b] hover:scale-105 transition"
                    >
                      {player.overall}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-white">{player.name}</h4>
                        {player.isOverseas && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                            OS
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#94a3b8]">{player.role}</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-[#D4AF37] font-bold uppercase">Sub In</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
