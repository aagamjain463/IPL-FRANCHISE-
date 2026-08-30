import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  RefreshCw, ArrowRightLeft, Shield, AlertCircle, CheckCircle2, 
  DollarSign, Sparkles, Scale, UserPlus, FileText, ChevronRight, Zap
} from 'lucide-react';
import { Player } from '../types/cricket';
import { soundFx } from '../audio/soundFx';

export const TradeCenterView: React.FC = () => {
  const { gameState, setGameState, proposeTrade, setSelectedPlayerForModal } = useGame();
  const [activeSubTab, setActiveSubTab] = useState<'TradeMachine' | 'FreeAgents'>('TradeMachine');
  const [partnerTeamId, setPartnerTeamId] = useState<string>('mi');
  const [offeredPlayerId, setOfferedPlayerId] = useState<string>('');
  const [requestedPlayerId, setRequestedPlayerId] = useState<string>('');
  const [cashCr, setCashCr] = useState<number>(0);
  const [tradeMessage, setTradeMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const partnerTeam = gameState.teams[partnerTeamId];

  const userSquad = userTeam ? (userTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean) : [];
  const partnerSquad = partnerTeam ? (partnerTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean) : [];

  const offeredPlayer = offeredPlayerId ? gameState.allPlayers[offeredPlayerId] : null;
  const requestedPlayer = requestedPlayerId ? gameState.allPlayers[requestedPlayerId] : null;

  // Calculate Trade Fairness Score (-100 to +100, where 0 is dead even)
  let tradeScore = 0;
  if (offeredPlayer && requestedPlayer) {
    const ovrDiff = (offeredPlayer.overall + (cashCr * 2.5)) - requestedPlayer.overall;
    const ageDiff = (requestedPlayer.age - offeredPlayer.age) * 0.8;
    tradeScore = Math.round(ovrDiff * 10 + ageDiff * 5);
  }

  const handlePropose = () => {
    if (!offeredPlayerId || !requestedPlayerId) {
      setTradeMessage({ success: false, text: 'Please select one player to offer and one player to receive.' });
      return;
    }

    const res = proposeTrade(partnerTeamId, [offeredPlayerId], [requestedPlayerId], cashCr);
    setTradeMessage({ success: res.success, text: res.feedback });
    if (res.success) {
      soundFx.playCheer(true);
      setOfferedPlayerId('');
      setRequestedPlayerId('');
      setCashCr(0);
    }
  };

  // Free Agents: Players in allPlayers not currently on any roster
  const allRosterIds = new Set<string>();
  (Object.values(gameState.teams) as import('../types/team').Team[]).forEach(t => {
    (t.rosterPlayerIds || []).forEach(id => allRosterIds.add(id));
  });

  const freeAgents = (Object.values(gameState.allPlayers) as Player[])
    .filter(p => !allRosterIds.has(p.id))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 20);

  const handleSignFreeAgent = (player: Player) => {
    const currentRoster = userTeam?.rosterPlayerIds || [];
    if (currentRoster.length >= 25) {
      alert('Squad Full! You must release or trade a player before signing a free agent.');
      return;
    }

    const cost = player.basePriceCr || 0.5;
    if ((userTeam?.purseCr || 0) < cost) {
      alert('Insufficient Purse to sign this free agent!');
      return;
    }

    const updatedUserTeam = {
      ...userTeam,
      purseCr: Math.max(0, userTeam.purseCr - cost),
      rosterPlayerIds: [...currentRoster, player.id]
    };

    const updatedPlayer = {
      ...player,
      currentTeamId: userTeam.id,
      salaryCr: cost
    };

    setGameState({
      ...gameState,
      allPlayers: {
        ...gameState.allPlayers,
        [player.id]: updatedPlayer
      },
      teams: {
        ...gameState.teams,
        [userTeam.id]: updatedUserTeam
      }
    });

    soundFx.playCheer(true);
    setTradeMessage({
      success: true,
      text: `🎉 Free Agent Signed: ${player.name} joined ${userTeam.name} on a ₹${cost} Cr contract!`
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      
      {/* 1. HEADER & NAVIGATION SUBTABS */}
      <div className="bg-gradient-to-r from-[#0c1322] via-[#090e1a] to-[#030712] p-6 rounded-3xl border border-[#1e293b] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-xl">
            <RefreshCw className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight italic">
              IPL Transfer Window & Trade Machine
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Negotiate mid-season player swaps, cash considerations, or sign high-value uncontracted free agents.
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 bg-[#05070a] p-1 rounded-2xl border border-[#1e293b]">
          <button
            onClick={() => setActiveSubTab('TradeMachine')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'TradeMachine'
                ? 'bg-[#D4AF37] text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Trade Machine</span>
          </button>
          <button
            onClick={() => setActiveSubTab('FreeAgents')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'FreeAgents'
                ? 'bg-[#D4AF37] text-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Free Agent Pool ({freeAgents.length})</span>
          </button>
        </div>
      </div>

      {/* Trade Status Alert Message */}
      {tradeMessage && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs leading-relaxed animate-fadeIn shadow-xl ${
          tradeMessage.success 
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-500/15 border-red-500/40 text-red-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {tradeMessage.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />}
            <span className="font-bold">{tradeMessage.text}</span>
          </div>
          <button onClick={() => setTradeMessage(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {/* VIEW 1: TRADE MACHINE */}
      {activeSubTab === 'TradeMachine' && (
        <div className="space-y-6">
          
          {/* Partner Selector & Evaluation Bar */}
          <div className="bg-[#090e1a] p-4 rounded-2xl border border-[#1e293b] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-bold uppercase">Trading Partner:</span>
              <select
                value={partnerTeamId}
                onChange={e => {
                  setPartnerTeamId(e.target.value);
                  setRequestedPlayerId('');
                  setTradeMessage(null);
                }}
                className="bg-[#05070a] border border-[#1e293b] text-white rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-[#D4AF37] cursor-pointer"
              >
                {(Object.values(gameState.teams) as import('../types/team').Team[]).filter(t => t.id !== gameState.userTeamId).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                ))}
              </select>
            </div>

            {/* Valuation Index Meter */}
            {offeredPlayer && requestedPlayer && (
              <div className="flex items-center gap-3 bg-[#05070a] px-4 py-2 rounded-xl border border-[#1e293b]">
                <Scale className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs text-slate-400 font-bold uppercase">Deal Valuation:</span>
                <span className={`text-xs font-mono font-black ${
                  tradeScore >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {tradeScore >= 15 ? 'Highly Favorable for Partner' : tradeScore >= -10 ? 'Fair & Competitive' : 'Unfavorable Offer'}
                </span>
              </div>
            )}
          </div>

          {/* Side-by-Side Roster Picker */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: User Team Offers */}
            <div className="bg-[#090e1a] p-5 rounded-3xl border border-[#1e293b] space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                    style={{ backgroundColor: userTeam?.primaryColor, color: userTeam?.secondaryColor }}
                  >
                    {userTeam?.shortName}
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    {userTeam?.name} (You Offer)
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#D4AF37] font-bold">
                  Purse: ₹{userTeam?.purseCr.toFixed(2)} Cr
                </span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {userSquad.map(p => {
                  const isSelected = offeredPlayerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setOfferedPlayerId(p.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected 
                          ? 'bg-[#0f172a] border-[#D4AF37] ring-2 ring-[#D4AF37]/50 shadow-lg' 
                          : 'bg-[#05070a] hover:bg-[#1e293b]/50 border-[#1e293b]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-[#0a0f1d] font-mono font-black text-xs flex items-center justify-center text-[#D4AF37] border border-[#1e293b]">
                          {p.overall}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-black text-xs text-white">{p.name}</h5>
                            {p.isOverseas && <span className="text-[9px] text-blue-400 font-bold">✈️</span>}
                          </div>
                          <span className="text-[10px] text-slate-400">{p.role} • {p.age} yrs • Form: ★{p.form?.toFixed(1) || '4.0'}</span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-xs text-amber-300">₹{p.salaryCr || p.basePriceCr} Cr</span>
                    </div>
                  );
                })}
              </div>

              {/* Cash Incentive Control */}
              <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Add Cash Incentive (₹ Cr):</span>
                <input
                  type="number"
                  min="0"
                  max={userTeam?.purseCr || 20}
                  step="0.5"
                  value={cashCr}
                  onChange={e => setCashCr(Math.max(0, Number(e.target.value)))}
                  className="w-28 bg-[#05070a] border border-[#1e293b] rounded-xl px-3 py-1.5 text-center font-mono font-black text-[#D4AF37] text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {/* Right: Partner Team Request */}
            <div className="bg-[#090e1a] p-5 rounded-3xl border border-[#1e293b] space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                    style={{ backgroundColor: partnerTeam?.primaryColor, color: partnerTeam?.secondaryColor }}
                  >
                    {partnerTeam?.shortName}
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    {partnerTeam?.name} (You Request)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  Purse: ₹{partnerTeam?.purseCr.toFixed(2)} Cr
                </span>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {partnerSquad.map(p => {
                  const isSelected = requestedPlayerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setRequestedPlayerId(p.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isSelected 
                          ? 'bg-[#0f172a] border-[#D4AF37] ring-2 ring-[#D4AF37]/50 shadow-lg' 
                          : 'bg-[#05070a] hover:bg-[#1e293b]/50 border-[#1e293b]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-[#0a0f1d] font-mono font-black text-xs flex items-center justify-center text-slate-200 border border-[#1e293b]">
                          {p.overall}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-black text-xs text-white">{p.name}</h5>
                            {p.isOverseas && <span className="text-[9px] text-blue-400 font-bold">✈️</span>}
                          </div>
                          <span className="text-[10px] text-slate-400">{p.role} • {p.age} yrs • Form: ★{p.form?.toFixed(1) || '4.0'}</span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-xs text-slate-300">₹{p.salaryCr || p.basePriceCr} Cr</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
                <span>Roster Count: <strong className="text-white">{partnerSquad.length} / 25</strong></span>
                <span>Team Avg OVR: <strong className="text-[#D4AF37]">{partnerSquad.length > 0 ? Math.round(partnerSquad.reduce((a, b) => a + b.overall, 0) / partnerSquad.length) : 0}</strong></span>
              </div>
            </div>

          </div>

          {/* Submit Action Button */}
          <div className="flex justify-center pt-4">
            <button
              id="btn-submit-trade-proposal"
              onClick={handlePropose}
              disabled={!offeredPlayerId || !requestedPlayerId}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 transition cursor-pointer ${
                offeredPlayerId && requestedPlayerId
                  ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
              }`}
            >
              <ArrowRightLeft className="w-5 h-5" />
              <span>Submit Official Trade Proposal to GM</span>
            </button>
          </div>

        </div>
      )}

      {/* VIEW 2: FREE AGENT POOL */}
      {activeSubTab === 'FreeAgents' && (
        <div className="bg-[#090e1a] rounded-3xl border border-[#1e293b] overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-tight flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                <span>Available Free Agents & Uncontracted Prospects</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sign players directly to your roster outside the mega auction window.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#05070a] px-3 py-1.5 rounded-xl border border-[#1e293b]">
              Your Available Purse: ₹{userTeam?.purseCr.toFixed(2)} Cr
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {freeAgents.map(player => (
              <div 
                key={player.id}
                className="p-4 bg-[#05070a] rounded-2xl border border-[#1e293b] hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0a0f1d] border border-[#1e293b] flex items-center justify-center font-mono font-black text-xs text-[#D4AF37]">
                      {player.overall}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-black text-white">{player.name}</h4>
                        {player.isOverseas ? (
                          <span className="text-[9px] text-blue-400 font-bold">✈️ {player.nationality}</span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold">🇮🇳</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{player.role} • {player.age}y</p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-amber-300">
                    ₹{player.basePriceCr || 0.5} Cr
                  </span>
                </div>

                <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedPlayerForModal(player)}
                    className="px-3 py-1.5 rounded-xl bg-[#0f172a] text-slate-300 hover:text-white text-[10px] font-bold uppercase transition"
                  >
                    View Dossier
                  </button>
                  <button
                    onClick={() => handleSignFreeAgent(player)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black text-[10px] font-black uppercase tracking-wider transition hover:scale-105 active:scale-95 shadow"
                  >
                    Sign Player
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
