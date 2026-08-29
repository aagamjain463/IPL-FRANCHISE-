import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, ArrowRightLeft, Shield, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';

export const TradeCenterView: React.FC = () => {
  const { gameState, proposeTrade, setSelectedPlayerForModal } = useGame();
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

  const handlePropose = () => {
    if (!offeredPlayerId || !requestedPlayerId) {
      setTradeMessage({ success: false, text: 'Please select one player to offer and one player to receive.' });
      return;
    }

    const res = proposeTrade(partnerTeamId, [offeredPlayerId], [requestedPlayerId], cashCr);
    setTradeMessage({ success: res.success, text: res.feedback });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Header */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">IPL Trade Machine & Transfer Window</h2>
            <p className="text-xs text-[#94a3b8]">Negotiate player swaps and cash adjustments with AI franchise general managers.</p>
          </div>
        </div>

        {/* Partner Team Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748b] font-semibold uppercase tracking-wider">Trading Partner:</span>
          <select
            value={partnerTeamId}
            onChange={e => {
              setPartnerTeamId(e.target.value);
              setRequestedPlayerId('');
              setTradeMessage(null);
            }}
            className="bg-[#05070a] border border-[#1e293b] text-white rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-[#D4AF37]"
          >
            {(Object.values(gameState.teams) as import('../types/team').Team[]).filter(t => t.id !== gameState.userTeamId).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {tradeMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
          tradeMessage.success 
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' 
            : 'bg-red-500/15 border-red-500/40 text-red-300'
        }`}>
          {tradeMessage.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{tradeMessage.text}</span>
        </div>
      )}

      {/* Main Trade Negotiation Stage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Your Assets to Send */}
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#D4AF37]" /> You Offer ({userTeam?.name})
            </h3>
            <span className="text-[11px] font-mono text-[#94a3b8]">Purse: ₹{userTeam?.purseCr.toFixed(2)} Cr</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {userSquad.map(p => {
              const isSelected = offeredPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setOfferedPlayerId(p.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected 
                      ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37]' 
                      : 'bg-[#05070a] hover:bg-[#131d35] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded bg-[#05070a] font-mono font-bold text-xs flex items-center justify-center text-[#D4AF37] border border-[#1e293b]">
                      {p.overall}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-white">{p.name}</h5>
                      <span className="text-[10px] text-[#94a3b8]">{p.role} • {p.age} yrs</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#D4AF37]">₹{p.salaryCr} Cr</span>
                </div>
              );
            })}
          </div>

          {/* Cash adjustment */}
          <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs">
            <span className="text-[#94a3b8]">Add Cash Incentive (₹ Cr):</span>
            <input
              type="number"
              min="0"
              max={userTeam?.purseCr || 20}
              step="0.5"
              value={cashCr}
              onChange={e => setCashCr(Number(e.target.value))}
              className="w-24 bg-[#05070a] border border-[#1e293b] rounded-lg px-2 py-1 text-center font-mono font-bold text-[#D4AF37] text-xs focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Right Side: Partner Assets to Receive */}
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#94a3b8]" /> You Request ({partnerTeam?.name})
            </h3>
            <span className="text-[11px] font-mono text-[#94a3b8]">Purse: ₹{partnerTeam?.purseCr.toFixed(2)} Cr</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {partnerSquad.map(p => {
              const isSelected = requestedPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setRequestedPlayerId(p.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected 
                      ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37]' 
                      : 'bg-[#05070a] hover:bg-[#131d35] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded bg-[#05070a] font-mono font-bold text-xs flex items-center justify-center text-[#e2e8f0] border border-[#1e293b]">
                      {p.overall}
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-white">{p.name}</h5>
                      <span className="text-[10px] text-[#94a3b8]">{p.role} • {p.age} yrs</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#94a3b8]">₹{p.salaryCr} Cr</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-2">
        <button
          id="btn-submit-trade-proposal"
          onClick={handlePropose}
          className="px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition hover:scale-105 active:scale-95"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Submit Official Trade Offer to General Manager</span>
        </button>
      </div>
    </div>
  );
};
