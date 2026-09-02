import React, { useState, useMemo } from 'react';
import { 
  MultiplayerRoomState, 
  MultiplayerParticipant,
  MultiplayerBidRecord 
} from '../../types/multiplayerAuction';
import { INITIAL_TEAMS } from '../../data/teams';
import { 
  Gavel, Clock, Zap, ShieldCheck, Play, Pause, 
  Users, CheckCircle2, AlertCircle, ArrowLeft, Trophy, Sparkles, X, ChevronRight
} from 'lucide-react';
import { Player } from '../../types/cricket';
import { getMultiplayerBidIncrement, normalizeCr } from '../../multiplayer/auctionRules';
import { LeaderboardMiniPanel } from '../LeaderboardMiniPanel';

interface MultiplayerLiveAuctionArenaProps {
  roomState: MultiplayerRoomState;
  currentUserId: string;
  isHost: boolean;
  countdownSeconds: number;
  hammerCall: string;
  onPlaceBid: (bidAmountCr: number) => Promise<boolean>;
  onPauseAuction: () => Promise<boolean>;
  onResumeAuction: () => Promise<boolean>;
  onFinishAuction?: () => Promise<boolean>;
  onLeaveRoom: () => void;
  errorMessage: string | null;
}

export const MultiplayerLiveAuctionArena: React.FC<MultiplayerLiveAuctionArenaProps> = ({
  roomState,
  currentUserId,
  isHost,
  countdownSeconds,
  hammerCall,
  onPlaceBid,
  onPauseAuction,
  onResumeAuction,
  onFinishAuction,
  onLeaveRoom,
  errorMessage
}) => {
  const [showSquadModal, setShowSquadModal] = useState<boolean>(false);
  const [selectedInspectSquadParticipantId, setSelectedInspectSquadParticipantId] = useState<string>(currentUserId);
  const [customBidInput, setCustomBidInput] = useState<string>('');
  const [showFinishConfirm, setShowFinishConfirm] = useState<boolean>(false);

  const currentParticipant = roomState.participants.find(p => p.id === currentUserId);
  const myFranchise = currentParticipant?.franchiseId ? INITIAL_TEAMS[currentParticipant.franchiseId] : null;
  const currentLot = roomState.currentLotPlayer;
  const leadingTeam = roomState.currentHighBidderFranchiseId ? INITIAL_TEAMS[roomState.currentHighBidderFranchiseId] : null;
  const leadingBidder = roomState.participants.find(p => p.id === roomState.currentHighBidderId);

  const isUserLeading = roomState.currentHighBidderId === currentUserId;
  const myPurse = currentParticipant?.purseCr || 0;

  const nextIncrement = currentLot ? getMultiplayerBidIncrement(roomState.currentHighBidCr) : 0.25;
  const standardNextBid = normalizeCr(roomState.currentHighBidCr + nextIncrement);
  const canAffordStandard = myPurse >= standardNextBid;

  // Inspect participant squad
  const inspectParticipant = roomState.participants.find(p => p.id === selectedInspectSquadParticipantId) || currentParticipant;
  const inspectTeam = inspectParticipant?.franchiseId ? INITIAL_TEAMS[inspectParticipant.franchiseId] : null;

  // Overseas check
  const myOverseasCount = (currentParticipant?.squadPlayers || []).filter(p => p.isOverseas).length;
  const isOverseasCapped = Boolean(currentLot?.isOverseas && myOverseasCount >= roomState.config.overseasLimit);
  const isSquadCapped = (currentParticipant?.squadPlayers?.length || 0) >= roomState.config.maxSquadSize;

  const canPlaceAnyBid = !isUserLeading && !roomState.isPaused && roomState.status === 'in_progress' && !isOverseasCapped && !isSquadCapped;

  const handleCustomBid = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customBidInput);
    if (!isNaN(amount) && amount > roomState.currentHighBidCr && amount <= myPurse) {
      onPlaceBid(amount);
      setCustomBidInput('');
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn font-sans pb-12">
      {/* Top Header Bar: Room Info & Host Pause/Resume Control */}
      <div className="bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight italic">
                Live Multiplayer Auction War Room
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Room Code: <strong className="text-[#D4AF37] font-mono">{roomState.roomCode}</strong> • Lot #{roomState.currentLotIndex + 1} of {roomState.totalLots} • {roomState.participants.length} Active Managers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Host Pause/Resume Button (Host only retains this control!) */}
          {isHost && (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-multiplayer-host-pause-resume"
                onClick={() => {
                  if (roomState.isPaused) {
                    onResumeAuction();
                  } else {
                    onPauseAuction();
                  }
                }}
                className={`px-3 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition border flex items-center gap-1.5 cursor-pointer ${
                  roomState.isPaused
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {roomState.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{roomState.isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              {onFinishAuction && (
                <button
                  id="btn-multiplayer-host-finish-early"
                  onClick={() => setShowFinishConfirm(true)}
                  className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                  title="Conclude auction and generate final leaderboard"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Conclude</span>
                </button>
              )}
            </div>
          )}

          <button
            id="btn-multiplayer-my-squad"
            onClick={() => {
              setSelectedInspectSquadParticipantId(currentUserId);
              setShowSquadModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-white border border-[#1e293b] font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>My Squad ({currentParticipant?.squadPlayers.length || 0})</span>
          </button>

          <button
            id="btn-multiplayer-leave-live"
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-[#05070a] hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-[#1e293b] transition cursor-pointer"
            title="Leave Auction Arena"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PAUSED BANNER (When Host pauses auction) */}
      <LeaderboardMiniPanel title="Live Rank Table" compact />

      {roomState.isPaused && (
        <div className="bg-amber-950/80 border-2 border-amber-500 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <Pause className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                AUCTION PAUSED
              </h3>
              <p className="text-xs text-amber-200/90">
                Paused by host. Bidding and timers are temporarily suspended. Waiting for host to resume...
              </p>
            </div>
          </div>
          {isHost && (
            <button
              onClick={onResumeAuction}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow"
            >
              Resume Now
            </button>
          )}
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/40 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-red-300 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* MAIN AUCTION STAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Player Spotlight & Live Bidding Stage */}
        <div className="lg:col-span-2 space-y-6">
          {currentLot ? (
            <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] p-6 relative overflow-hidden shadow-2xl space-y-6">
              {/* Header Lot & Set Tag */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1e293b]/60 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-mono font-black border border-[#D4AF37]/30 uppercase text-[11px] tracking-wider shadow-sm">
                    {currentLot.auctionSetCode || 'Marquee Pool'}
                  </span>
                  {currentLot.isOverseas ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/40">
                      ✈️ Overseas ({currentLot.nationality})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
                      🇮🇳 Indian Capped
                    </span>
                  )}
                  {roomState.bidHistory.length >= 3 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-black text-[10px] border border-orange-500/40 flex items-center gap-1 animate-pulse">
                      🔥 Bidding War ({roomState.bidHistory.length} bids)
                    </span>
                  )}
                </div>

                <span className="text-slate-400 font-mono text-[11px] font-bold">
                  LOT #{roomState.currentLotIndex + 1} OF {roomState.totalLots}
                </span>
              </div>

              {/* Player Spotlight Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#1e293b]">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0e1628] to-[#05070a] border-2 border-[#D4AF37]/50 flex flex-col items-center justify-center shadow-xl shrink-0">
                    <span className="text-3xl font-black font-mono text-[#D4AF37] leading-none">{currentLot.overall}</span>
                    <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 mt-0.5">OVR</span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                      {currentLot.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                      {currentLot.role} • {currentLot.age} yrs • {currentLot.battingStyle}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 font-mono">
                      <span>Bat: <strong className="text-rose-400 font-bold">{currentLot.battingRating}</strong></span>
                      <span>•</span>
                      <span>Bowl: <strong className="text-blue-400 font-bold">{currentLot.bowlingRating}</strong></span>
                      <span>•</span>
                      <span>Potential: <strong className="text-purple-400 font-bold">{currentLot.potential}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-[#05070a] p-3.5 rounded-xl border border-[#1e293b] shrink-0">
                  <span className="text-slate-400 text-[10px] block uppercase tracking-widest font-black">Base Price</span>
                  <span className="font-mono font-black text-[#D4AF37] text-lg sm:text-xl">₹{currentLot.basePriceCr.toFixed(2)} Cr</span>
                </div>
              </div>

              {/* LIVE BIDDING STAGE & COUNTDOWN */}
              <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-amber-500/10 via-transparent to-blue-500/10 rounded-2xl p-5 border border-white/5">
                <div>
                  <span className="text-xs uppercase font-black text-slate-400 tracking-widest block mb-1">
                    Current Highest Paddle
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl md:text-6xl font-black font-mono text-[#D4AF37] tracking-tight drop-shadow-xl">
                      ₹{roomState.currentHighBidCr.toFixed(2)}
                    </span>
                    <span className="text-xl font-black text-[#D4AF37]">Cr</span>
                  </div>

                  {leadingTeam && leadingBidder ? (
                    <div className="flex items-center gap-2.5 mt-2 bg-[#05070a] px-3.5 py-1.5 rounded-xl border border-[#1e293b] w-fit shadow-md">
                      <div 
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shadow"
                        style={{ backgroundColor: leadingTeam.primaryColor, color: leadingTeam.secondaryColor }}
                      >
                        {leadingTeam.shortName.slice(0, 3)}
                      </div>
                      <span className="text-xs text-slate-200">
                        Leading: <strong className="text-white font-bold">{leadingTeam.name}</strong> ({leadingBidder.name})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 mt-1 block font-mono">Opening Bid at Base Price</span>
                  )}
                </div>

                {/* Urgency Countdown Clock */}
                <div className="flex items-center gap-4 bg-[#05070a] p-4 rounded-2xl border border-[#1e293b] w-full sm:w-auto justify-between sm:justify-start shadow-inner">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-black block mb-0.5 tracking-wider">Auctioneer Call</span>
                    <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-sm ${
                      hammerCall === 'Going Twice' ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' :
                      hammerCall === 'Going Once' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      hammerCall === 'Sold!' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      hammerCall === 'Unsold' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    }`}>
                      {hammerCall}
                    </span>
                  </div>

                  <div className="w-px h-10 bg-[#1e293b]" />

                  <div className="flex items-center gap-2.5">
                    <Clock className={`w-6 h-6 ${countdownSeconds <= 3 ? 'text-red-400 animate-bounce' : 'text-[#D4AF37]'}`} />
                    <span className={`font-mono font-black text-3xl ${countdownSeconds <= 3 ? 'text-red-400' : 'text-white'}`}>
                      0:{countdownSeconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>

              {/* BIDDING PADDLE CONTROLS */}
              <div className="pt-3 border-t border-[#1e293b] space-y-3">
                {/* Main Large Action Button */}
                <button
                  id="btn-multiplayer-raise-bid"
                  onClick={() => onPlaceBid(standardNextBid)}
                  disabled={!canPlaceAnyBid || !canAffordStandard}
                  className={`w-full py-5 px-6 rounded-2xl font-black text-base uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 transition transform active:scale-95 ${
                    isUserLeading
                      ? 'bg-emerald-950/80 text-emerald-300 border-2 border-emerald-500/50 cursor-not-allowed shadow-emerald-500/10'
                      : !canPlaceAnyBid || !canAffordStandard
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:brightness-110 text-black shadow-[#D4AF37]/30 cursor-pointer animate-pulse'
                  }`}
                >
                  <Zap className="w-6 h-6 fill-current" />
                  <span>
                    {isUserLeading 
                      ? 'You Hold Leading Bid' 
                      : isOverseasCapped 
                      ? 'Overseas Limit Reached'
                      : isSquadCapped
                      ? 'Squad Cap Reached'
                      : !canAffordStandard
                      ? 'Insufficient Purse'
                      : `Raise Bid to ₹${standardNextBid.toFixed(2)} Cr`}
                  </span>
                </button>

                {/* Quick Increment Paddles */}
                {canPlaceAnyBid && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[nextIncrement, 0.50, 1.00, 2.00].filter((inc, index, arr) => arr.indexOf(inc) === index).map(inc => {
                      const bidVal = normalizeCr(roomState.currentHighBidCr + inc);
                      const canAfford = myPurse >= bidVal;

                      return (
                        <button
                          key={inc}
                          onClick={() => {
                            if (canAfford) {
                              onPlaceBid(bidVal);
                            }
                          }}
                          disabled={!canAfford}
                          className={`p-2.5 rounded-xl border text-xs font-mono font-black transition flex items-center justify-center gap-1 ${
                            canAfford
                              ? 'bg-[#05070a] hover:bg-[#1e293b] text-[#D4AF37] border-[#1e293b] cursor-pointer hover:border-[#D4AF37]/50'
                              : 'bg-[#05070a]/50 text-slate-600 border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          <span>+ ₹{inc.toFixed(2)} Cr</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (₹{bidVal.toFixed(2)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#1e293b] text-center space-y-3 shadow-xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Auction Lot Complete</h3>
              <p className="text-xs text-[#94a3b8]">Processing final lot resolutions...</p>
            </div>
          )}

          {/* Live Paddle Bids Feed */}
          <div className="glass-panel p-5 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] flex items-center gap-2">
                <Gavel className="w-4 h-4 text-[#D4AF37]" /> Live Room Bids Ticker
              </h4>
              <span className="text-[10px] text-[#64748b] font-mono">{roomState.bidHistory.length} Bids</span>
            </div>

            {roomState.bidHistory.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                {roomState.bidHistory.slice().reverse().map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-[#05070a] rounded-xl border border-[#1e293b]">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] shadow"
                        style={{ backgroundColor: b.franchisePrimaryColor, color: b.franchiseSecondaryColor }}
                      >
                        {b.franchiseShort.slice(0, 3)}
                      </div>
                      <div>
                        <span className="font-bold text-white">{b.participantName}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({b.franchiseShort})</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#D4AF37]">₹{b.bidAmountCr.toFixed(2)} Cr</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No bids recorded on this lot yet. Be the first to raise your paddle!</p>
            )}
          </div>
        </div>

        {/* Right Column: All Franchise Desks Table & Real-Time Purses */}
        <div className="glass-panel p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Franchise Desks & Purses
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              {roomState.participants.length} Desks
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {roomState.participants.map(p => {
              const team = p.franchiseId ? INITIAL_TEAMS[p.franchiseId] : null;
              const isMe = p.id === currentUserId;
              const isLeadingNow = p.id === roomState.currentHighBidderId;
              const overseas = p.squadPlayers.filter(pl => pl.isOverseas).length;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    isLeadingNow
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : isMe
                      ? 'bg-[#1e293b]/70 border-[#D4AF37]'
                      : 'bg-[#05070a] border-[#1e293b]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {team ? (
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shadow"
                        style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                      >
                        {team.shortName.slice(0, 3)}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-[#1e293b] flex items-center justify-center text-[10px] text-slate-400 font-bold">
                        ?
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate max-w-[110px]">{p.name}</span>
                        {isMe && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold">
                            YOU
                          </span>
                        )}
                        {isLeadingNow && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-black font-black animate-pulse">
                            BIDDER
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#64748b]">
                        {team?.name || 'Franchise'} • {p.squadPlayers.length} squad ({overseas} OS)
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-mono font-bold text-[#D4AF37] text-xs">
                      ₹{p.purseCr.toFixed(2)} Cr
                    </span>
                    <button
                      onClick={() => {
                        setSelectedInspectSquadParticipantId(p.id);
                        setShowSquadModal(true);
                      }}
                      className="text-[10px] text-[#94a3b8] hover:text-white underline cursor-pointer"
                    >
                      Inspect Squad
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SQUAD INSPECTION MODAL */}
      {showSquadModal && inspectParticipant && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                {inspectTeam ? (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow"
                    style={{ backgroundColor: inspectTeam.primaryColor, color: inspectTeam.secondaryColor }}
                  >
                    {inspectTeam.shortName}
                  </div>
                ) : (
                  <Users className="w-6 h-6 text-emerald-400" />
                )}
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {inspectParticipant.name} ({inspectTeam?.name || 'Franchise'}) Roster
                  </h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    {inspectParticipant.squadPlayers.length} Players • Remaining Purse: ₹{inspectParticipant.purseCr.toFixed(2)} Cr
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSquadModal(false)}
                className="p-1 text-[#94a3b8] hover:text-white rounded-lg bg-[#05070a] border border-[#1e293b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {inspectParticipant.squadPlayers.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#64748b]">
                  No players acquired in the auction yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {inspectParticipant.squadPlayers.map(p => (
                    <div 
                      key={p.id}
                      className="p-2.5 bg-[#05070a] rounded-xl border border-[#1e293b] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center font-mono font-bold text-xs text-white">
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOST FINISH AUCTION CONFIRMATION MODAL */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/40 shrink-0">
                <Gavel className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Conclude Auction?
                </h3>
                <p className="text-xs text-slate-400">
                  This will end active bidding and immediately rank all participants on the Final Leaderboard.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] text-xs text-slate-300 space-y-1">
              <p>• Final scores will be calculated for all {roomState.participants.length} franchises.</p>
              <p>• Winner podium, best playing XIs, and rewards will be awarded.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="btn-cancel-conclude"
                onClick={() => setShowFinishConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-conclude"
                onClick={async () => {
                  setShowFinishConfirm(false);
                  if (onFinishAuction) {
                    await onFinishAuction();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
              >
                Yes, Conclude & Rank
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
