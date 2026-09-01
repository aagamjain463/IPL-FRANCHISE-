import React, { useState } from 'react';
import { 
  MultiplayerRoomState, 
  MultiplayerAuctionConfig,
  MultiplayerAuctionFormat,
  MultiplayerPlayerPoolType 
} from '../../types/multiplayerAuction';
import { INITIAL_TEAMS } from '../../data/teams';
import { 
  Users, Shield, Check, Copy, Share2, Play, Settings2, 
  AlertCircle, Sparkles, UserCheck, Flame, ArrowLeft, Clock
} from 'lucide-react';

interface MultiplayerLobbyViewProps {
  roomState: MultiplayerRoomState;
  currentUserId: string;
  isHost: boolean;
  onSelectFranchise: (franchiseId: string) => Promise<boolean>;
  onToggleReady: () => Promise<boolean>;
  onUpdateConfig: (config: Partial<MultiplayerAuctionConfig>) => Promise<boolean>;
  onStartAuction: () => Promise<boolean>;
  onLeaveRoom: () => void;
  errorMessage: string | null;
  isLoading: boolean;
}

export const MultiplayerLobbyView: React.FC<MultiplayerLobbyViewProps> = ({
  roomState,
  currentUserId,
  isHost,
  onSelectFranchise,
  onToggleReady,
  onUpdateConfig,
  onStartAuction,
  onLeaveRoom,
  errorMessage,
  isLoading
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  const currentParticipant = roomState.participants.find(p => p.id === currentUserId);
  const selectedFranchiseId = currentParticipant?.franchiseId || null;
  const isReady = Boolean(currentParticipant?.isReady);

  // Check if taken by other player
  const takenFranchises = new Map<string, string>(); // franchiseId -> participantName
  roomState.participants.forEach(p => {
    if (p.franchiseId) {
      takenFranchises.set(p.franchiseId, p.name);
    }
  });

  const allPlayersHaveFranchise = roomState.participants.every(p => Boolean(p.franchiseId));
  const hasMinPlayers = roomState.participants.length >= roomState.config.minPlayers;
  const allPlayersReady = roomState.participants.every(p => p.isReady);
  const canStartAuction = isHost && hasMinPlayers && allPlayersHaveFranchise && allPlayersReady;

  const getInviteUrl = () => {
    const url = new URL(window.location.href);
    url.pathname = '/multiplayer-auction';
    url.searchParams.set('room', roomState.roomCode);
    return url.toString();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareRoom = () => {
    const inviteUrl = getInviteUrl();
    if (navigator.share) {
      navigator.share({
        title: 'Join my IPL Live Auction Room!',
        text: `Join my live IPL Franchise Mega Auction on room code: ${roomState.roomCode}`,
        url: inviteUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteUrl).catch(() => navigator.clipboard.writeText(roomState.roomCode));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn font-sans pb-12">
      {/* Top Banner: Room Code & Lobby Info */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                AUCTION LOBBY
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {roomState.participants.length}/{roomState.config.maxPlayers} Players Joined
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mt-1">
              {roomState.roomName}
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Format: <strong className="text-[#D4AF37]">{roomState.config.format}</strong> • Starting Purse: <strong className="text-[#D4AF37]">₹{roomState.config.startingPurseCr} Cr</strong> • Timer: <strong className="text-[#D4AF37]">{roomState.config.timerSeconds}s</strong>
            </p>
          </div>
        </div>

        {/* Room Code Card & Share Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="bg-[#05070a] p-2.5 px-4 rounded-xl border border-[#1e293b] flex items-center gap-3 shadow-inner">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 block">Room Code</span>
              <span className="text-2xl font-mono font-black text-[#D4AF37] tracking-widest leading-none">
                {roomState.roomCode}
              </span>
            </div>
            <button
              id="btn-copy-room-code"
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#D4AF37] transition cursor-pointer"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              id="btn-share-room"
              onClick={handleShareRoom}
              className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-blue-400 transition cursor-pointer"
              title="Share Room Invite"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {isHost && (
            <button
              id="btn-open-host-config"
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#D4AF37] border border-[#D4AF37]/30 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Settings2 className="w-4 h-4" />
              <span>Settings</span>
            </button>
          )}

          <button
            id="btn-leave-lobby"
            onClick={onLeaveRoom}
            className="px-3.5 py-2.5 rounded-xl bg-[#05070a] hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-[#1e293b] font-bold text-xs uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/40 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-red-300 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Select IPL Franchise (Duplicate Prevention Enforced) */}
      <div className="glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#D4AF37]" /> Select Your IPL Franchise
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Choose any available IPL franchise. Each team can only be claimed by ONE manager per room.
            </p>
          </div>
          {selectedFranchiseId && (
            <span className="text-xs px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 w-fit flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Selected: {INITIAL_TEAMS[selectedFranchiseId]?.name}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          {Object.values(INITIAL_TEAMS).map(team => {
            const isSelectedByMe = selectedFranchiseId === team.id;
            const takenBy = takenFranchises.get(team.id);
            const isTakenByOther = takenBy && !isSelectedByMe;

            return (
              <div
                key={team.id}
                id={`franchise-pick-${team.id}`}
                onClick={() => {
                  if (!isTakenByOther && !isSelectedByMe && !isReady) {
                    onSelectFranchise(team.id);
                  }
                }}
                className={`p-3.5 rounded-xl transition relative overflow-hidden border flex flex-col justify-between ${
                  isSelectedByMe
                    ? 'border-[#D4AF37] bg-[#172554] shadow-xl shadow-[#D4AF37]/15 ring-2 ring-[#D4AF37]'
                    : isTakenByOther
                    ? 'border-slate-800 bg-[#070b14]/80 opacity-50 cursor-not-allowed'
                    : isReady
                    ? 'border-[#1e293b] bg-[#0b1329] cursor-not-allowed opacity-80'
                    : 'border-[#1e293b] bg-[#0b1329] hover:bg-[#131d35] hover:border-[#D4AF37]/50 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md border border-white/20"
                      style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                    >
                      {team.shortName}
                    </div>

                    {isSelectedByMe && (
                      <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black flex items-center justify-center font-black text-xs shadow">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {isTakenByOther && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                        TAKEN
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-xs text-white truncate">{team.name}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{team.city}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#1e293b] text-[10px]">
                  {isSelectedByMe ? (
                    <span className="text-[#D4AF37] font-bold">YOUR FRANCHISE</span>
                  ) : isTakenByOther ? (
                    <span className="text-red-400 truncate block">Taken by {takenBy}</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Available</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 2: Connected Managers Roster Table & Ready Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> Connected Managers ({roomState.participants.length})
            </h3>
            <span className="text-xs text-slate-400">
              Min {roomState.config.minPlayers} required to begin
            </span>
          </div>

          <div className="space-y-2">
            {roomState.participants.map((p, idx) => {
              const team = p.franchiseId ? INITIAL_TEAMS[p.franchiseId] : null;
              const isMe = p.id === currentUserId;

              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isMe
                      ? 'bg-[#1e293b]/70 border-[#D4AF37]'
                      : 'bg-[#05070a] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#1e293b] text-slate-400 font-mono font-bold text-xs flex items-center justify-center">
                      #{idx + 1}
                    </div>

                    {team ? (
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow border border-white/10"
                        style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                      >
                        {team.shortName}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#1e293b] border border-dashed border-slate-600 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                        ?
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        {isMe && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold">
                            YOU
                          </span>
                        )}
                        {p.isHost && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            HOST
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {team ? team.name : <span className="text-amber-400 font-medium italic">Selecting franchise...</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#D4AF37] hidden sm:inline">
                      ₹{p.purseCr} Cr
                    </span>

                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      p.isReady
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {p.isReady ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> READY
                        </>
                      ) : (
                        <>NOT READY</>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Player Action Bar & Ready/Start Buttons */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-xl">
          <div className="space-y-3">
            <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" /> War Room Status
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b] flex items-center justify-between">
                <span className="text-slate-400">Franchise Selected</span>
                <span className={`font-bold ${selectedFranchiseId ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedFranchiseId ? 'Yes' : 'Required'}
                </span>
              </div>

              <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b] flex items-center justify-between">
                <span className="text-slate-400">Ready Status</span>
                <span className={`font-bold ${isReady ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isReady ? 'Ready to Bid' : 'Not Ready'}
                </span>
              </div>

              <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b] flex items-center justify-between">
                <span className="text-slate-400">Total Draft Lots</span>
                <span className="font-mono font-bold text-white">
                  {roomState.totalLots} Players
                </span>
              </div>
            </div>

            {!hasMinPlayers && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 leading-snug">
                Waiting for at least {roomState.config.minPlayers} managers to join this room. Share your room code <strong className="text-white font-mono">{roomState.roomCode}</strong> with friends.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              id="btn-toggle-ready-lobby"
              onClick={onToggleReady}
              disabled={!selectedFranchiseId || isLoading}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                !selectedFranchiseId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isReady
                  ? 'bg-[#1e293b] hover:bg-[#334155] text-emerald-400 border border-emerald-500/50 shadow-emerald-500/10'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isReady ? 'I am Ready (Click to Unready)' : 'Toggle Ready'}</span>
            </button>

            {isHost && (
              <button
                id="btn-host-start-auction"
                onClick={onStartAuction}
                disabled={!canStartAuction || isLoading}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 transition ${
                  canStartAuction
                    ? 'bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:brightness-110 text-black shadow-[#D4AF37]/30 cursor-pointer animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
                title={!canStartAuction ? 'All players must pick a franchise and toggle ready before starting.' : 'Launch live bidding arena'}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Auction</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Host Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <Settings2 className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">Auction Room Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg bg-[#05070a] text-slate-400 hover:text-white border border-[#1e293b]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Auction Format */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Auction Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mega Auction', 'Mini Auction', 'Accelerated', 'Custom'] as MultiplayerAuctionFormat[]).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => onUpdateConfig({ format: fmt })}
                      className={`p-3 rounded-xl border font-bold text-left transition ${
                        roomState.config.format === fmt
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting Purse */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Starting Purse (Cr)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 75, 100, 120].map(purse => (
                    <button
                      key={purse}
                      onClick={() => onUpdateConfig({ startingPurseCr: purse })}
                      className={`p-2.5 rounded-xl border font-mono font-bold transition ${
                        roomState.config.startingPurseCr === purse
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      ₹{purse} Cr
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Pool */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Draft Player Pool</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['Full Draft Pool', 'Top 30 Marquee & Stars', 'Top 15 Accelerated'] as MultiplayerPlayerPoolType[]).map(pool => (
                    <button
                      key={pool}
                      onClick={() => onUpdateConfig({ poolType: pool })}
                      className={`p-2.5 rounded-xl border font-bold text-center text-[11px] transition ${
                        roomState.config.poolType === pool
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      {pool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bid Timer */}
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Hammer Timer (Seconds)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map(sec => (
                    <button
                      key={sec}
                      onClick={() => onUpdateConfig({ timerSeconds: sec })}
                      className={`p-2.5 rounded-xl border font-mono font-bold transition ${
                        roomState.config.timerSeconds === sec
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1e293b] flex justify-end">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-6 py-2.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
