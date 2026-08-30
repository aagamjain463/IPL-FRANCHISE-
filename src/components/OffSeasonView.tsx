import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/cricket';
import { Gavel, Plane, MapPin, Trash2, Undo2, Wallet, ShieldAlert, Sparkles } from 'lucide-react';

const PITCH_OPTIONS = [
  { id: 'Flat (High Scoring)', label: 'Flat & True', desc: 'High-scoring: 180+ par, explosive batting' },
  { id: 'Green (Pace & Swing)', label: 'Green & Seaming', desc: 'Pace-friendly: low scores, new-ball wickets' },
  { id: 'Dusty (Spin & Turn)', label: 'Dusty Turner', desc: 'Spin heaven: spinners dominate after over 6' },
  { id: 'Slow & Sticky (Gripping)', label: 'Slow & Sticky', desc: 'Low bounce: cutters and slow bowlers rule' },
  { id: 'Balanced', label: 'Balanced', desc: 'Even contest: both disciplines rewarded' }
];

export const OffSeasonView: React.FC = () => {
  const { gameState, advanceToNextSeason, setHomePitchType } = useGame();
  const [releaseIds, setReleaseIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const players = (userTeam?.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const retainedCost = players
    .filter(p => !releaseIds.includes(p.id))
    .reduce((sum, p) => sum + (p.salaryCr || 0), 0);
  const projectedPurse = Math.max(5, 120 - retainedCost);

  const toggleRelease = (id: string) => {
    setReleaseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const startAuction = () => {
    if (confirmOpen) return;
    advanceToNextSeason(releaseIds);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Header */}
      <div className="bg-[#0f172a] p-6 rounded-3xl border border-[#1e293b] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
            <Plane className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase italic text-white tracking-tight">Off-season & Retentions</h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">Choose who stays, who goes, and your home surface before the {gameState.currentSeason + 1} Mega Auction.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#05070a] rounded-2xl border border-[#1e293b] px-4 py-3">
          <Wallet className="w-4 h-4 text-[#00FF87]" />
          <div>
            <p className="text-[9px] uppercase font-bold text-[#64748b]">Projected Auction Purse</p>
            <p className="text-lg font-black font-mono text-[#00FF87]">₹{projectedPurse.toFixed(2)} Cr</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Retention list */}
        <div className="lg:col-span-8 bg-[#0f172a] rounded-3xl border border-[#1e293b] p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-widest font-black text-white">Retain / Release ({players.length - releaseIds.length} of {players.length} retained)</h3>
            <button
              onClick={() => setReleaseIds([])}
              className="text-[10px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <Undo2 className="w-3 h-3" /> Reset
            </button>
          </div>
          <p className="text-[11px] text-[#94a3b8] mb-4 leading-relaxed">
            Released players re-enter the auction pool at their base price. Their salary is removed from your purse calculation — retaining a star costs you auction money (₹{retainedCost.toFixed(2)} Cr locked into {players.length - releaseIds.length} players).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {players.map(p => {
              const isReleased = releaseIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleRelease(p.id)}
                  className={`p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                    isReleased ? 'border-rose-500/60 bg-rose-950/30' : 'border-[#1e293b] bg-[#05070a] hover:border-[#334155]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${isReleased ? 'text-rose-300 line-through' : 'text-white'}`}>{p.name}</p>
                    <p className="text-[10px] text-[#64748b] uppercase font-bold">{p.role} • {p.age}y • {p.overall} OVR {p.potential > p.overall + 5 ? '(POT ' + p.potential + ')' : ''}</p>
                    <p className="text-[10px] font-mono text-[#94a3b8] mt-1">Salary ₹{(p.salaryCr || 0).toFixed(2)} Cr {isReleased ? '→ back to pool' : '→ locked in'}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isReleased ? 'bg-rose-500 text-white' : 'bg-[#1e293b] text-white'}`}>
                    {isReleased ? <Trash2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#00FF87]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: home pitch + start */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0f172a] rounded-3xl border border-[#1e293b] p-5 shadow-2xl space-y-3">
            <h3 className="text-xs uppercase tracking-widest font-black text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#00FF87]" /> Home Surface
            </h3>
            <p className="text-[11px] text-[#94a3b8]">Your home pitches shape auction strategy and match outcomes. Choose wisely.</p>
            <div className="space-y-2">
              {PITCH_OPTIONS.map(opt => {
                const active = (userTeam?.homePitchType || 'Balanced') === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setHomePitchType(opt.id)}
                    className={`w-full p-3 rounded-xl border text-left transition ${
                      active ? 'border-[#00FF87] bg-[#00FF87]/10' : 'border-[#1e293b] bg-[#05070a] hover:border-[#334155]'
                    }`}
                  >
                    <p className={`text-xs font-black uppercase tracking-wider ${active ? 'text-[#00FF87]' : 'text-white'}`}>{opt.label}</p>
                    <p className="text-[10px] text-[#64748b] mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {releaseIds.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-amber-200">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{releaseIds.length} player(s) will leave — you must rebuy the roles you release at the auction. Purse increases by {players.filter(p => releaseIds.includes(p.id)).reduce((s, p) => s + (p.salaryCr || 0), 0).toFixed(2)} Cr.</p>
            </div>
          )}

          <button
            onClick={startAuction}
            className="w-full py-4 rounded-2xl bg-[#D4AF37] hover:bg-amber-400 text-black font-black text-sm uppercase tracking-widest shadow-xl transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Gavel className="w-4 h-4 fill-black" />
            Start Season {gameState.currentSeason + 1} Mega Auction
          </button>
          <p className="text-[10px] text-[#64748b] text-center">All 10 franchises reset to a 120 Cr purse minus retained salaries.</p>
        </div>
      </div>

      {/* Confirm */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-[#182238] rounded-3xl max-w-md w-full p-6 text-center space-y-4">
            <p className="text-lg font-black text-white">Launching Season {gameState.currentSeason + 1} Auction…</p>
            <p className="text-xs text-[#94a3b8]">Players are developing, retentions finalized, and the auction room is opening.</p>
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-[#1e293b] text-white text-xs font-bold cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
