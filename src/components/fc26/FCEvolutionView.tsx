import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { FCPlayerCard } from './FCPlayerCard';
import { FC_EVOLUTION_PATHS } from '../../engine/fc26Engine';
import { FCEvolutionPath } from '../../types/fc26';
import { Player } from '../../types/cricket';
import { Sparkles, Trophy, Flame, Zap, CheckCircle2, ChevronRight, Award, Dumbbell } from 'lucide-react';
import confetti from 'canvas-confetti';

export const FCEvolutionView: React.FC = () => {
  const { gameState, userTeam, updatePlayer } = useGame();
  const [selectedPath, setSelectedPath] = useState<FCEvolutionPath>(FC_EVOLUTION_PATHS[0]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activeEvolutions, setActiveEvolutions] = useState<Record<string, { pathId: string; progress: number }>>({});
  const [completedEvoPlayer, setCompletedEvoPlayer] = useState<Player | null>(null);

  // Eligible players: players in user's team under required max OVR
  const teamPlayers = userTeam?.squadPlayerIds.map(id => gameState?.allPlayers[id]).filter((p): p is Player => !!p) || [];
  const eligiblePlayers = teamPlayers.filter(p => p.overall <= selectedPath.requiredMaxOvr);

  const selectedPlayer = selectedPlayerId ? gameState?.allPlayers[selectedPlayerId] : eligiblePlayers[0];

  const handleStartEvolution = (player: Player) => {
    setActiveEvolutions(prev => ({
      ...prev,
      [player.id]: {
        pathId: selectedPath.id,
        progress: 0
      }
    }));
  };

  const handleCompleteDrill = (player: Player) => {
    // Advance progress
    const currentProg = activeEvolutions[player.id]?.progress || 0;
    const newProg = currentProg + 1;

    if (newProg >= 3) {
      // Evolution Complete! Apply upgrades
      const upgradedPlayer: Player = {
        ...player,
        overall: Math.min(99, player.overall + selectedPath.ovrUpgrade),
        attributes: {
          ...player.attributes,
          power: player.attributes.power + (selectedPath.statUpgrades.bat || 0),
          wicketTaking: player.attributes.wicketTaking + (selectedPath.statUpgrades.bwl || 0),
          pace: player.attributes.pace + (selectedPath.statUpgrades.spd || 0),
          finishing: player.attributes.finishing + (selectedPath.statUpgrades.clu || 0),
          fielding: player.attributes.fielding + (selectedPath.statUpgrades.fld || 0),
          fitness: player.attributes.fitness + (selectedPath.statUpgrades.phy || 0)
        }
      };

      updatePlayer(upgradedPlayer);
      setCompletedEvoPlayer(upgradedPlayer);
      try {
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.6 } });
      } catch {}
    } else {
      setActiveEvolutions(prev => ({
        ...prev,
        [player.id]: {
          pathId: selectedPath.id,
          progress: newProg
        }
      }));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-white select-none">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#131d35] to-[#0c1220] border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] shadow-lg">
            <Sparkles className="w-6 h-6 fill-[#D4AF37]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-black">
                FC 26 EVOLUTIONS
              </span>
              <span className="text-xs text-amber-300 font-bold">WONDERKID ACADEMY</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-heading mt-0.5">
              Player Evolution Pathways
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Level up prospective talents through tactical match drills to unlock dynamic card art, attribute boosts, and signature PlayStyles+.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Evolution Slots</span>
            <div className="text-sm font-black text-emerald-400 font-mono">1 / 1 ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Evolution Paths + Selected Player Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT 4 COLS: Evolution Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Available Evolution Slots</span>
          </h3>

          <div className="space-y-3">
            {FC_EVOLUTION_PATHS.map((path) => {
              const isSelected = selectedPath.id === path.id;
              return (
                <button
                  key={path.id}
                  onClick={() => setSelectedPath(path)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#131d35] border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.25)] text-white'
                      : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        {path.badge}
                      </span>
                      <h4 className="font-black text-sm uppercase tracking-tight mt-1.5 font-heading">
                        {path.name}
                      </h4>
                    </div>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      +{path.ovrUpgrade} OVR
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Max OVR: {path.requiredMaxOvr}</span>
                    <span className="text-amber-300 font-bold">Reward: {path.grantedPlayStyle.shortTag}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CENTER 4 COLS: Eligible Players In Squad */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Eligible Squad Players (≤{selectedPath.requiredMaxOvr} OVR)</span>
          </h3>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {eligiblePlayers.map((player) => {
              const isSelected = selectedPlayer?.id === player.id;
              const isEvolving = !!activeEvolutions[player.id];

              return (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#1e293b] border-cyan-400 shadow-md text-white'
                      : 'bg-[#0f172a] border-[#1e293b] hover:bg-[#131d35] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shadow"
                      style={{ backgroundColor: player.avatarColor || '#334155' }}
                    >
                      {player.shortName?.slice(0, 2) || player.name.slice(0, 2)}
                    </div>
                    <div>
                      <h5 className="text-xs font-black uppercase tracking-tight">{player.name}</h5>
                      <span className="text-[10px] text-slate-400 font-medium">{player.role} • Age {player.age}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-amber-300 font-mono-sport">{player.overall} OVR</span>
                    {isEvolving && (
                      <span className="block text-[9px] font-bold text-emerald-400">IN PROGRESS</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 4 COLS: Evolution Preview & Drill Actions */}
        <div className="lg:col-span-4 flex flex-col items-center">
          {selectedPlayer ? (
            <div className="w-full flex flex-col items-center p-5 rounded-2xl bg-[#090d16] border border-[#1e293b] shadow-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3">
                PROJECTED EVOLVED CARD
              </span>

              {/* 3D Holographic Card Preview */}
              <FCPlayerCard
                player={{
                  ...selectedPlayer,
                  overall: selectedPlayer.overall + selectedPath.ovrUpgrade
                }}
                customTier={selectedPath.rewardTier}
                size="md"
              />

              {/* Requirements & Drills */}
              <div className="w-full mt-4 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Evolution Objectives:
                </div>
                {selectedPath.requirements.map((req, idx) => (
                  <div key={req.id} className="p-2 rounded-lg bg-[#0c1220] border border-[#1e293b] text-xs">
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>{req.description}</span>
                      <span className="text-amber-400 font-mono">
                        {(activeEvolutions[selectedPlayer.id]?.progress || 0) > idx ? req.target : req.current} / {req.target}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${(activeEvolutions[selectedPlayer.id]?.progress || 0) > idx ? 100 : (req.current / req.target) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-4">
                {!activeEvolutions[selectedPlayer.id] ? (
                  <button
                    id="btn-start-evolution"
                    onClick={() => handleStartEvolution(selectedPlayer)}
                    className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#e5c158] text-black font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-black" />
                    <span>Begin Evolution</span>
                  </button>
                ) : (
                  <button
                    id="btn-complete-training-drill"
                    onClick={() => handleCompleteDrill(selectedPlayer)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Dumbbell className="w-4 h-4" />
                    <span>Run Match Objective Drill ({activeEvolutions[selectedPlayer.id].progress}/3)</span>
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a player to preview evolution
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
