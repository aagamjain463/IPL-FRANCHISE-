import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { INITIAL_TEAMS } from '../data/teams';
import { 
  Users, Gavel, Settings, Zap, Shield, Sparkles, Trophy, 
  Play, CheckCircle2, Copy, Clock, Flame, ChevronRight, Check, ArrowRight, RotateCcw
} from 'lucide-react';
import { LiveAuctionParticipant, LiveAuctionRoomState } from '../types/multiplayer';
import { soundFx } from '../audio/soundFx';
import { Player } from '../types/cricket';

export const MultiplayerAuctionView: React.FC = () => {
  const { gameState, startNewFranchise, setGameState, setCurrentScreen, setActiveTab } = useGame();
  
  const [roomCode] = useState(() => `XI-ROOM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>(gameState?.userTeamId || 'gt');
  const [startingPurseCr, setStartingPurseCr] = useState<number>(120);
  const [overseasLimit, setOverseasLimit] = useState<number>(8);
  const [squadSizeCap, setSquadSizeCap] = useState<number>(25);
  const [timerSeconds, setTimerSeconds] = useState<number>(10);
  const [isCopied, setIsCopied] = useState(false);

  // Live Auction State
  const [roomState, setRoomState] = useState<LiveAuctionRoomState | null>(null);
  const [liveLotIndex, setLiveLotIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(10);
  const [currentLotPlayer, setCurrentLotPlayer] = useState<Player | null>(null);
  const [isAiBidding, setIsAiBidding] = useState<boolean>(false);
  const [soldMessage, setSoldMessage] = useState<string | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Launch live auction arena room
  const handleLaunchRoom = () => {
    const teams = Object.values(INITIAL_TEAMS);
    const participants: LiveAuctionParticipant[] = teams.map((t, idx) => ({
      id: `p_${t.id}`,
      name: t.id === selectedFranchiseId ? 'You (Host)' : `AI Desk (${t.shortName})`,
      isHuman: t.id === selectedFranchiseId,
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName,
      primaryColor: t.primaryColor,
      purseCr: startingPurseCr,
      squadCount: 14,
      isReady: true
    }));

    // Find pool players
    const allPlayersList = Object.values(gameState?.allPlayers || {}) as Player[];
    const pool = allPlayersList.filter(p => !p.currentTeamId || p.overall >= 80).slice(0, 15);
    const firstPlayer = pool[0] || allPlayersList[0];

    const initialRoom: LiveAuctionRoomState = {
      roomCode,
      roomName: `Mega Auction Championship 2026`,
      hostId: `p_${selectedFranchiseId}`,
      participants,
      status: 'in_progress',
      currentLotIndex: 0,
      totalLots: Math.min(12, pool.length),
      currentLotPlayerId: firstPlayer?.id || null,
      currentHighBidCr: firstPlayer?.basePriceCr || 2.0,
      currentHighBidderId: null,
      hammerSecondsRemaining: timerSeconds,
      bidHistory: [],
      customRules: {
        startingPurseCr,
        overseasLimit,
        squadSizeCap,
        timerSeconds
      }
    };

    setCurrentLotPlayer(firstPlayer);
    setRoomState(initialRoom);
    setCountdown(timerSeconds);
    soundFx.playHammerKnock();
  };

  // Countdown hammer clock ticker
  useEffect(() => {
    let interval: any;
    if (roomState && roomState.status === 'in_progress') {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            // LOT SOLD!
            handleLotSold();
            return timerSeconds;
          }
          if (prev === 4) {
            // Trigger AI bid if not user high bidder
            triggerAiBidChance();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [roomState, countdown]);

  const triggerAiBidChance = () => {
    if (!roomState || !currentLotPlayer) return;
    // 60% chance an AI team raises the bid if below market value
    const maxVal = (currentLotPlayer.overall / 10) * 1.5;
    if (roomState.currentHighBidCr < maxVal && Math.random() > 0.35) {
      const aiParticipants = roomState.participants.filter(p => !p.isHuman && p.purseCr > (roomState.currentHighBidCr + 0.5));
      if (aiParticipants.length > 0) {
        const bidder = aiParticipants[Math.floor(Math.random() * aiParticipants.length)];
        const increment = 0.5;
        const newBid = Number((roomState.currentHighBidCr + increment).toFixed(2));

        setIsAiBidding(true);
        soundFx.playHammerKnock();

        setRoomState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            currentHighBidCr: newBid,
            currentHighBidderId: bidder.id,
            bidHistory: [
              {
                participantId: bidder.id,
                participantName: bidder.name,
                teamShort: bidder.shortName,
                bidCr: newBid,
                timestamp: Date.now()
              },
              ...prev.bidHistory.slice(0, 7)
            ]
          };
        });

        setCountdown(timerSeconds); // reset timer on fresh bid
        setTimeout(() => setIsAiBidding(false), 500);
      }
    }
  };

  // User places bid
  const handleUserBid = (incrementCr: number) => {
    if (!roomState || !currentLotPlayer) return;
    const userParticipant = roomState.participants.find(p => p.isHuman);
    if (!userParticipant) return;

    const nextBid = Number((roomState.currentHighBidCr + incrementCr).toFixed(2));
    if (userParticipant.purseCr < nextBid) {
      alert("Insufficient purse for this bid!");
      return;
    }

    soundFx.playHammerKnock();
    setRoomState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        currentHighBidCr: nextBid,
        currentHighBidderId: userParticipant.id,
        bidHistory: [
          {
            participantId: userParticipant.id,
            participantName: userParticipant.name,
            teamShort: userParticipant.shortName,
            bidCr: nextBid,
            timestamp: Date.now()
          },
          ...prev.bidHistory.slice(0, 7)
        ]
      };
    });

    setCountdown(timerSeconds); // reset timer
  };

  // Hammer falls: Lot Sold
  const handleLotSold = () => {
    if (!roomState || !currentLotPlayer) return;
    const winner = roomState.participants.find(p => p.id === roomState.currentHighBidderId);
    
    soundFx.playHammerKnock();
    if (winner?.isHuman) {
      soundFx.playCheer(true);
      setSoldMessage(`🎉 SOLD TO YOU! ${currentLotPlayer.name} joins your squad for ₹${roomState.currentHighBidCr} Cr!`);
    } else if (winner) {
      setSoldMessage(`🔨 SOLD to ${winner.teamName} for ₹${roomState.currentHighBidCr} Cr.`);
    } else {
      setSoldMessage(`UNSOLD! ${currentLotPlayer.name} goes into the accelerated pool.`);
    }

    // Update winner purse
    const updatedParticipants = roomState.participants.map(p => {
      if (p.id === roomState.currentHighBidderId) {
        return {
          ...p,
          purseCr: Number((p.purseCr - roomState.currentHighBidCr).toFixed(2)),
          squadCount: p.squadCount + 1
        };
      }
      return p;
    });

    // Advance to next lot after 3s
    setTimeout(() => {
      setSoldMessage(null);
      const nextIdx = liveLotIndex + 1;
      const allPlayersList = Object.values(gameState?.allPlayers || {}) as Player[];
      const pool = allPlayersList.filter(p => !p.currentTeamId || p.overall >= 80);
      
      if (nextIdx >= Math.min(10, pool.length)) {
        // Auction complete!
        setRoomState({
          ...roomState,
          status: 'completed',
          participants: updatedParticipants
        });
      } else {
        const nextPlayer = pool[nextIdx] || allPlayersList[nextIdx];
        setCurrentLotPlayer(nextPlayer);
        setLiveLotIndex(nextIdx);
        setRoomState({
          ...roomState,
          currentLotIndex: nextIdx,
          currentLotPlayerId: nextPlayer?.id || null,
          currentHighBidCr: nextPlayer?.basePriceCr || 2.0,
          currentHighBidderId: null,
          participants: updatedParticipants,
          bidHistory: []
        });
        setCountdown(timerSeconds);
      }
    }, 3000);
  };

  // 1. SETUP / LOBBY SCREEN
  if (!roomState) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn font-sans">
        {/* Header */}
        <div className="glass-panel p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30 flex items-center gap-1">
                <Users className="w-3 h-3" /> MULTIPLAYER CUSTOM ROOM
              </span>
              <span className="text-xs text-[#64748b]">• Real-Time Auction Lounge</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
              LIVE MULTIPLAYER MEGA AUCTION
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Host or join custom bidding wars with customizable purses, overseas quotas, and fast-paced hammer timers.
            </p>
          </div>

          {/* Room Code Badge */}
          <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b] flex items-center gap-3">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[#64748b] block font-bold">Room Code</span>
              <span className="text-sm font-black font-mono text-[#D4AF37]">{roomCode}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white transition cursor-pointer"
              title="Copy Room Code"
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Grid: Franchise Picker + Custom Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Franchise Picker (7 Cols) */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" /> Pick Your Franchise Table
            </h3>
            <p className="text-xs text-[#94a3b8]">Select which team banner you will represent on the auction floor.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.values(INITIAL_TEAMS).map(team => {
                const isSelected = selectedFranchiseId === team.id;
                return (
                  <div
                    key={team.id}
                    onClick={() => setSelectedFranchiseId(team.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[#131d35] border-[#D4AF37] ring-1 ring-[#D4AF37]/50 shadow-md scale-[1.02]'
                        : 'bg-[#05070a] border-[#1e293b] hover:bg-[#131d35]/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shadow border border-white/20"
                      style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                    >
                      {team.shortName}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{team.name}</p>
                      <span className="text-[10px] text-[#64748b]">{team.city}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Room Settings (5 Cols) */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-2xl shadow-xl space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
              <Settings className="w-4 h-4" /> Custom Auction Rules
            </h3>

            {/* Starting Purse */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#94a3b8]">Starting Purse:</span>
                <span className="font-mono text-[#D4AF37]">₹{startingPurseCr}.00 Cr</span>
              </div>
              <input
                type="range"
                min="80"
                max="160"
                step="10"
                value={startingPurseCr}
                onChange={e => setStartingPurseCr(parseInt(e.target.value))}
                className="w-full accent-[#D4AF37] bg-[#1e293b] h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Max Overseas Slots */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#94a3b8]">Max Overseas Slots:</span>
                <span className="font-mono text-white">{overseasLimit} Players</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => setOverseasLimit(num)}
                    className={`py-1.5 rounded-lg border text-xs font-bold font-mono transition ${
                      overseasLimit === num
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black'
                        : 'bg-[#05070a] text-[#94a3b8] border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {num} Slots
                  </button>
                ))}
              </div>
            </div>

            {/* Hammer Timer */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#94a3b8]">Hammer Countdown Timer:</span>
                <span className="font-mono text-blue-400">{timerSeconds} Seconds</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimerSeconds(t)}
                    className={`py-1.5 rounded-lg border text-xs font-bold font-mono transition ${
                      timerSeconds === t
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black'
                        : 'bg-[#05070a] text-[#94a3b8] border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {t}s Clock
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <div className="pt-3">
              <button
                id="btn-launch-multiplayer-room"
                onClick={handleLaunchRoom}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-[#D4AF37]/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Gavel className="w-5 h-5" />
                <span>ENTER LIVE AUCTION ROOM</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. LIVE AUCTION ARENA VIEW
  const highBidder = roomState.participants.find(p => p.id === roomState.currentHighBidderId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Arena Top Status Bar */}
      <div className="bg-[#0c1322] p-4 sm:p-5 rounded-2xl border border-[#1e293b] shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-black flex items-center justify-center font-black">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-white">{roomState.roomName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                LIVE SYNC
              </span>
            </div>
            <span className="text-xs text-[#94a3b8]">Lot {liveLotIndex + 1} of {roomState.totalLots}</span>
          </div>
        </div>

        {/* Hammer Countdown Timer */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border font-mono font-black text-xl flex items-center gap-2 ${
            countdown <= 3 ? 'bg-rose-600 text-white border-rose-400 animate-bounce' : 'bg-[#05070a] text-[#D4AF37] border-[#1e293b]'
          }`}>
            <Clock className="w-5 h-5" />
            <span>00:0{countdown}</span>
          </div>

          <button
            onClick={() => setRoomState(null)}
            className="px-3 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Sold Notification Banner */}
      {soldMessage && (
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border border-emerald-500 text-emerald-200 rounded-2xl text-sm font-black text-center shadow-2xl animate-fadeIn">
          {soldMessage}
        </div>
      )}

      {/* Main Arena Layout (Lot Player + Live Bidding Wars) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Player Lot Spotlight (6 Cols) */}
        {currentLotPlayer && (
          <div className="lg:col-span-6 bg-gradient-to-br from-[#0c1322] via-[#0f172a] to-[#080d1a] p-6 rounded-2xl border border-[#1e293b] shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-600 p-0.5 shadow-xl flex items-center justify-center">
                  <div className="w-full h-full bg-[#05070a] rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-2xl font-black font-mono text-[#D4AF37] leading-none">{currentLotPlayer.overall}</span>
                    <span className="text-[8px] uppercase font-bold text-[#64748b]">OVR</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    {currentLotPlayer.role}
                  </span>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight mt-1">
                    {currentLotPlayer.name}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">{currentLotPlayer.nationality} • {currentLotPlayer.age} yrs</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-[#64748b] block">Base Price</span>
                <span className="text-base font-mono font-black text-white">₹{currentLotPlayer.basePriceCr} Cr</span>
              </div>
            </div>

            {/* Key Skill Highlights */}
            <div className="grid grid-cols-3 gap-2 text-center bg-[#05070a] p-3 rounded-xl border border-white/5">
              <div>
                <span className="text-[9px] uppercase font-bold text-[#64748b] block">Batting</span>
                <span className="text-sm font-mono font-bold text-rose-400">{currentLotPlayer.battingRating}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[#64748b] block">Bowling</span>
                <span className="text-sm font-mono font-bold text-blue-400">{currentLotPlayer.bowlingRating}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[#64748b] block">Playstyle</span>
                <span className="text-xs font-bold text-emerald-400 truncate block">{currentLotPlayer.battingPlaystyle || currentLotPlayer.bowlingPlaystyle || 'All-Round'}</span>
              </div>
            </div>

            {/* Current Highest Bid Highlight */}
            <div className="p-4 rounded-xl bg-[#05070a] border border-[#D4AF37]/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#D4AF37] block">Current High Bid</span>
                <div className="text-3xl font-black font-mono text-white">
                  ₹{roomState.currentHighBidCr.toFixed(2)} Cr
                </div>
              </div>
              {highBidder ? (
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-[#64748b] block">Leading Desk</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span 
                      className="px-2 py-0.5 rounded font-black text-xs shadow"
                      style={{ backgroundColor: highBidder.primaryColor, color: '#fff' }}
                    >
                      {highBidder.shortName}
                    </span>
                    <span className="text-xs font-bold text-white">{highBidder.name}</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-[#64748b] italic">Waiting for opening bid...</span>
              )}
            </div>

            {/* Live Bidding Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#94a3b8] block">
                Place Your Franchise Bid:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[0.25, 0.50, 1.00].map(inc => (
                  <button
                    key={inc}
                    onClick={() => handleUserBid(inc)}
                    className="py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition shadow-md shadow-[#D4AF37]/15 cursor-pointer"
                  >
                    + ₹{inc.toFixed(2)} Cr
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: Connected Desks & Live Bid Feed (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Live Bid Ticker Feed */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b] shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#D4AF37]" /> Live Floor Bidding Feed
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {roomState.bidHistory.length === 0 ? (
                <p className="text-xs text-[#64748b] italic">No bids placed for this lot yet.</p>
              ) : (
                roomState.bidHistory.map((b, i) => (
                  <div key={i} className="p-2 rounded-lg bg-[#05070a] border border-white/5 flex items-center justify-between text-xs animate-fadeIn">
                    <span className="font-bold text-white">{b.participantName}</span>
                    <span className="font-mono font-bold text-[#D4AF37]">₹{b.bidCr.toFixed(2)} Cr</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Connected Desks Table */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b] shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Table Desks & Purse Ledger
            </h4>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {roomState.participants.map(p => (
                <div 
                  key={p.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    p.isHuman ? 'bg-[#131d35] border-[#D4AF37]' : 'bg-[#05070a] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] shadow"
                      style={{ backgroundColor: p.primaryColor, color: '#fff' }}
                    >
                      {p.shortName}
                    </div>
                    <span className="font-bold text-white">{p.name}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-[#94a3b8]">{p.squadCount} Squad</span>
                    <span className="text-emerald-400 font-bold">₹{p.purseCr.toFixed(2)} Cr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
