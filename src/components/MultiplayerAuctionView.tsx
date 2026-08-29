import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { INITIAL_TEAMS } from '../data/teams';
import { Users, Gavel, Settings, Zap, Shield, Sparkles, Trophy, Play, CheckCircle2, Copy } from 'lucide-react';

export const MultiplayerAuctionView: React.FC = () => {
  const { gameState, startNewFranchise, setGameState, setCurrentScreen, setActiveTab } = useGame();
  
  const [roomCode] = useState(() => `XI-ROOM-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>(gameState?.userTeamId || 'gt');
  const [startingPurseCr, setStartingPurseCr] = useState<number>(120);
  const [overseasLimit, setOverseasLimit] = useState<number>(8);
  const [squadSizeCap, setSquadSizeCap] = useState<number>(25);
  const [timerSeconds, setTimerSeconds] = useState<number>(10);
  const [isCopied, setIsCopied] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLaunchCustomAuction = () => {
    // Reconfigure tournament parameters with custom purse & squad limits
    startNewFranchise(selectedFranchiseId, 'Multiplayer Host');
    setHasStarted(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Header */}
      <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
        <div className="lg:col-span-7 bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#D4AF37]" /> Pick Your Franchise Table
          </h3>
          <p className="text-xs text-[#94a3b8]">Select which team banner you will represent on the auction auction floor.</p>

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
        <div className="lg:col-span-5 bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-xl space-y-5">
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
            <div className="flex justify-between text-[10px] text-[#64748b] font-mono">
              <span>₹80 Cr (Low Budget)</span>
              <span>₹160 Cr (Mega Splurge)</span>
            </div>
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

          {/* Max Squad Size */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-[#94a3b8]">Roster Target Size:</span>
              <span className="font-mono text-emerald-400">{squadSizeCap} Players (IPL Depth)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[20, 22, 25].map(sz => (
                <button
                  key={sz}
                  onClick={() => setSquadSizeCap(sz)}
                  className={`py-1.5 rounded-lg border text-xs font-bold font-mono transition ${
                    squadSizeCap === sz
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black'
                      : 'bg-[#05070a] text-[#94a3b8] border-[#1e293b] hover:text-white'
                  }`}
                >
                  {sz} Players
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
              onClick={handleLaunchCustomAuction}
              className="w-full py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gavel className="w-4 h-4" />
              <span>Launch Custom Auction Room</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
