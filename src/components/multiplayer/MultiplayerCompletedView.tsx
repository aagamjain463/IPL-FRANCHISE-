import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';
import { 
  MultiplayerRoomState, 
  MultiplayerRanking, 
  MultiplayerAward 
} from '../../types/multiplayerAuction';
import { INITIAL_TEAMS } from '../../data/teams';
import { 
  Trophy, Award, Users, ArrowRight, Shield, 
  RotateCcw, Sparkles, Star, ExternalLink, X
} from 'lucide-react';

interface MultiplayerCompletedViewProps {
  roomState: MultiplayerRoomState;
  currentUserId: string;
  onLeaveRoom: () => void;
}

export const MultiplayerCompletedView: React.FC<MultiplayerCompletedViewProps> = ({
  roomState,
  currentUserId,
  onLeaveRoom
}) => {
  const { setActiveTab, setCurrentScreen } = useGame();
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // Trigger celebratory confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, []);

  const rankings = roomState.rankings || [];
  const awards = roomState.awards || [];
  const currentParticipant = roomState.participants.find(p => p.id === currentUserId);
  const myRank = rankings.find(r => r.participantId === currentUserId);

  const inspectedParticipant = roomState.participants.find(p => p.id === selectedParticipantId);
  const inspectedTeam = inspectedParticipant?.franchiseId ? INITIAL_TEAMS[inspectedParticipant.franchiseId] : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fadeIn font-sans pb-16">
      {/* Top Banner Celebration */}
      <div className="bg-gradient-to-r from-[#D4AF37]/20 via-[#0f172a] to-blue-500/20 p-8 rounded-3xl border-2 border-[#D4AF37]/40 text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-black uppercase tracking-widest border border-[#D4AF37]/40 shadow">
          <Sparkles className="w-4 h-4" /> AUCTION RESOLUTION & CEREMONY
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          IPL Mega Auction Concluded!
        </h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          All lots have been resolved. The war room gavel has fallen. Check out the franchise rankings, squad grades, and auction accolades below.
        </p>

        {myRank && (
          <div className="inline-flex items-center gap-3 bg-[#05070a] px-5 py-2.5 rounded-2xl border border-[#D4AF37]/40 shadow-xl">
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-xs text-slate-300">
              Your Finish: <strong className="text-white font-black text-sm">Rank #{myRank.rank}</strong> with <strong className="text-[#D4AF37] font-mono text-sm">{myRank.squadOvr} Team OVR</strong>
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Awards Gallery */}
      {awards.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D4AF37]" /> Post-Auction Accolades & Honours
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {awards.map((award, idx) => (
              <div 
                key={idx}
                className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl hover:border-[#D4AF37]/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{award.badge}</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                      ACCOLADE
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{award.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{award.description}</p>
                </div>

                <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs">
                  <span className="font-bold text-white truncate max-w-[120px]">{award.recipientName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {award.franchiseShort}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Franchise Standings Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#D4AF37]" /> Final League Standings & Squad Ratings
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {rankings.length} Teams Competed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1e293b] text-[#64748b] uppercase tracking-wider font-bold text-[10px]">
                <th className="pb-3">Rank</th>
                <th className="pb-3">Manager & Franchise</th>
                <th className="pb-3 text-center">Squad OVR</th>
                <th className="pb-3 text-center">Squad Count</th>
                <th className="pb-3 text-center">Overseas</th>
                <th className="pb-3 text-right">Spent Purse</th>
                <th className="pb-3 text-right">Remaining</th>
                <th className="pb-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {rankings.map(r => {
                const isMe = r.participantId === currentUserId;

                return (
                  <tr 
                    key={r.participantId}
                    className={`hover:bg-slate-800/40 transition ${isMe ? 'bg-[#1e293b]/40 font-bold' : ''}`}
                  >
                    <td className="py-3.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-xs ${
                        r.rank === 1 ? 'bg-amber-400 text-black shadow' :
                        r.rank === 2 ? 'bg-slate-300 text-black' :
                        r.rank === 3 ? 'bg-amber-700 text-white' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        #{r.rank}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shadow"
                          style={{ backgroundColor: r.primaryColor, color: r.secondaryColor }}
                        >
                          {r.franchiseShort.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{r.participantName}</span>
                            {isMe && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{r.franchiseName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs border border-emerald-500/30">
                        {r.squadOvr} OVR
                      </span>
                    </td>

                    <td className="py-3.5 text-center font-mono text-slate-300">
                      {r.squadCount} Players
                    </td>

                    <td className="py-3.5 text-center font-mono text-slate-300">
                      {r.overseasCount} / {roomState.config.overseasLimit}
                    </td>

                    <td className="py-3.5 text-right font-mono font-bold text-slate-300">
                      ₹{r.spentPurseCr.toFixed(2)} Cr
                    </td>

                    <td className="py-3.5 text-right font-mono font-bold text-[#D4AF37]">
                      ₹{r.remainingPurseCr.toFixed(2)} Cr
                    </td>

                    <td className="py-3.5 text-center">
                      <button
                        onClick={() => setSelectedParticipantId(r.participantId)}
                        className="px-3 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white text-[11px] font-bold transition cursor-pointer"
                      >
                        Inspect Squad
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQUAD INSPECTION MODAL */}
      {inspectedParticipant && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                {inspectedTeam ? (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow"
                    style={{ backgroundColor: inspectedTeam.primaryColor, color: inspectedTeam.secondaryColor }}
                  >
                    {inspectedTeam.shortName}
                  </div>
                ) : (
                  <Users className="w-6 h-6 text-emerald-400" />
                )}
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {inspectedParticipant.name} ({inspectedTeam?.name || 'Franchise'}) Final Roster
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    {inspectedParticipant.squadPlayers.length} Signings • Remaining Purse: ₹{inspectedParticipant.purseCr.toFixed(2)} Cr
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParticipantId(null)}
                className="p-1 text-[#94a3b8] hover:text-white rounded-lg bg-[#05070a] border border-[#1e293b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {inspectedParticipant.squadPlayers.map(p => (
                  <div 
                    key={p.id}
                    className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center font-mono font-black text-xs text-white">
                        {p.overall}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[130px]">{p.name}</p>
                        <p className="text-[10px] text-[#64748b]">{p.role} {p.isOverseas && '✈️'}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-[#D4AF37]">
                      ₹{(p.salaryCr || p.basePriceCr).toFixed(2)} Cr
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return to Lounge Action */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
        <button
          id="btn-multiplayer-view-global-ranks"
          onClick={() => {
            setCurrentScreen('Dashboard');
            setActiveTab('Leaderboard');
            window.history.pushState({}, '', '/leaderboard');
          }}
          className="px-8 py-4 rounded-2xl bg-[#00FF87] hover:brightness-110 text-black font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition transform active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View Global Rank</span>
        </button>
        <button
          id="btn-multiplayer-return-lounge"
          onClick={onLeaveRoom}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:brightness-110 text-black font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition transform active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Multiplayer Lounge</span>
        </button>
      </div>
    </div>
  );
};
