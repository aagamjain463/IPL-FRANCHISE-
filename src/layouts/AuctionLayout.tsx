import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  ArrowLeft, Gavel, Users, Target, Clock, Trophy, 
  Volume2, VolumeX, Shield, AlertTriangle, X, Check, Eye, Layers, Sparkles
} from 'lucide-react';
import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { MusicPlayerHud } from '../components/MusicPlayerHud';
import { PlayerCardModal } from '../components/PlayerCardModal';

interface AuctionLayoutProps {
  children: React.ReactNode;
}

export const AuctionLayout: React.FC<AuctionLayoutProps> = ({ children }) => {
  const { 
    gameState, 
    setCurrentScreen, 
    setActiveTab, 
    isMuted, 
    toggleMute,
    selectedPlayerForModal,
    setSelectedPlayerForModal 
  } = useGame();

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showTargetsModal, setShowTargetsModal] = useState<boolean>(false);
  const [showSquadModal, setShowSquadModal] = useState<boolean>(false);

  if (!gameState || !gameState.auctionState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const auc = gameState.auctionState;
  const userSquad = userTeam ? (userTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean) : [];
  const overseasCount = userSquad.filter(p => p.isOverseas).length;

  const handleExitAuction = () => {
    // Navigate safely back to main home dashboard
    setCurrentScreen('Dashboard');
    setActiveTab('Dashboard');
    window.history.pushState({}, '', '/');
  };

  const targetsList = (gameState.scoutingDepartment?.auctionTargetIds || [])
    .map(id => gameState.allPlayers[id])
    .filter(Boolean) as Player[];

  return (
    <div className="min-h-screen w-full bg-[#030712] text-[#e2e8f0] flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black relative">
      {/* EXCLUSIVE AUCTION TOP BAR (NO MAIN NAVBAR) */}
      <header className="sticky top-0 z-40 bg-[#070b14]/95 backdrop-blur-md border-b border-[#1e293b] shadow-2xl px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: Exit Auction and Mode Title */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            id="btn-exit-auction-top"
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-[#1e293b] hover:border-red-500/40 text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm"
            title="Return to Franchise Hub"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Auction</span>
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow">
              <Gavel className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight uppercase italic text-white">
                  Mega Auction <span className="text-[#D4AF37]">Arena</span>
                </h1>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-bold border border-red-500/30 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-[#94a3b8] font-mono">
                {auc.activePlayer ? `Lot #${auc.currentPlayerIndex + 1} of ${auc.allPlayerPool.length}` : 'Auction Completed'}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Franchise Purse & Quick Modal Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Franchise Purse Badge */}
          <div className="flex items-center space-x-2 bg-[#0f172a] px-3 py-1.5 rounded-xl border border-[#1e293b] shadow-inner">
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] shadow"
              style={{ backgroundColor: userTeam?.primaryColor || '#D4AF37', color: userTeam?.secondaryColor || '#000' }}
            >
              {userTeam?.shortName}
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-bold tracking-widest text-[#64748b] leading-none">Your Purse</p>
              <p className="text-[#D4AF37] font-mono font-black text-xs sm:text-sm leading-tight">
                ₹{userTeam?.purseCr.toFixed(2)} Cr
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Modals */}
          <div className="flex items-center space-x-1.5">
            <button
              id="btn-switch-multiplayer-auction"
              onClick={() => {
                setCurrentScreen('MultiplayerAuction');
                setActiveTab('MultiplayerAuction');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37]/20 to-amber-500/20 hover:from-[#D4AF37]/30 hover:to-amber-500/30 text-[#D4AF37] hover:text-white border border-[#D4AF37]/40 text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Enter Real-Time Live Multiplayer Auction War Rooms"
            >
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden lg:inline">Multiplayer Room</span>
            </button>

            <button
              id="btn-auction-history-modal"
              onClick={() => setShowHistoryModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
              title="View Sold & Unsold Players"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">History</span>
              <span className="text-[10px] font-mono font-bold text-white bg-[#1e293b] px-1 rounded">
                {auc.soldPlayerRecords.length}
              </span>
            </button>

            <button
              id="btn-auction-targets-modal"
              onClick={() => setShowTargetsModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
              title="View Scouted Priority Targets"
            >
              <Target className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden md:inline">Targets</span>
              <span className="text-[10px] font-mono font-bold text-white bg-[#1e293b] px-1 rounded">
                {targetsList.length}
              </span>
            </button>

            <button
              id="btn-auction-squad-modal"
              onClick={() => setShowSquadModal(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
              title="View Your 25-Man Roster"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Squad</span>
              <span className="text-[10px] font-mono font-bold text-white bg-[#1e293b] px-1 rounded">
                {userSquad.length}/25
              </span>
            </button>

            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] transition cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-green-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* FULL VIEWPORT AUCTION ARENA */}
      <main className="flex-1 w-full p-3 sm:p-5 md:p-8 max-w-[1700px] mx-auto">
        {children}
      </main>

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Leave Auction Mode?</h3>
                <p className="text-xs text-[#94a3b8]">Return to Franchise Command Center</p>
              </div>
            </div>

            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Your auction state, current squad additions, team purses, and bidding history are safely saved. You can re-enter the Mega Auction War Room at any time.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Stay in Auction
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  handleExitAuction();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Exit to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUCTION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">Auction Transaction Log</h3>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-[#94a3b8] hover:text-white rounded-lg bg-[#05070a] border border-[#1e293b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {auc.soldPlayerRecords.length === 0 && auc.unsoldPlayerIds.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#64748b]">
                  No auction lots completed yet. Bidding is underway.
                </div>
              ) : (
                <>
                  <h4 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                    Sold Players ({auc.soldPlayerRecords.length})
                  </h4>
                  <div className="space-y-1.5">
                    {auc.soldPlayerRecords.slice().reverse().map((record, i) => {
                      const buyer = gameState.teams[record.buyingTeamId];
                      return (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-[#05070a] rounded-xl border border-[#1e293b]">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="px-2 py-0.5 rounded text-[10px] font-black"
                              style={{ backgroundColor: buyer?.primaryColor || '#1e293b', color: buyer?.secondaryColor || '#fff' }}
                            >
                              {buyer?.shortName}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-white">{record.player.name}</p>
                              <p className="text-[10px] text-[#64748b]">{record.player.role} • {record.player.nationality}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-mono font-black text-[#D4AF37]">₹{record.sellingPriceCr.toFixed(2)} Cr</p>
                            <p className="text-[9px] text-[#64748b]">Base: ₹{record.player.basePriceCr} Cr</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {auc.unsoldPlayerIds.length > 0 && (
                    <>
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mt-4">
                        Unsold Lots ({auc.unsoldPlayerIds.length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {auc.unsoldPlayerIds.map(id => {
                          const p = gameState.allPlayers[id];
                          if (!p) return null;
                          return (
                            <div key={id} className="p-2 bg-[#05070a] rounded-lg border border-red-500/20 text-xs">
                              <p className="font-bold text-white truncate">{p.name}</p>
                              <p className="text-[10px] text-[#64748b]">{p.role} • Base ₹{p.basePriceCr} Cr</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY TARGETS MODAL */}
      {showTargetsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-black text-white uppercase tracking-tight">Scouted Auction Targets</h3>
              </div>
              <button 
                onClick={() => setShowTargetsModal(false)}
                className="p-1 text-[#94a3b8] hover:text-white rounded-lg bg-[#05070a] border border-[#1e293b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {targetsList.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#64748b]">
                  No auction priority targets marked yet. Add players from the Scout Radar or player cards.
                </div>
              ) : (
                targetsList.map(p => {
                  const isSold = auc.soldPlayerRecords.some(r => r.player.id === p.id);
                  const isUnsold = auc.unsoldPlayerIds.includes(p.id);
                  return (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPlayerForModal(p)}
                      className="p-3 bg-[#05070a] hover:bg-[#1e293b]/60 rounded-xl border border-[#1e293b] flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center font-mono font-bold text-xs text-[#D4AF37]">
                          {p.overall}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{p.name}</p>
                          <p className="text-[10px] text-[#64748b]">{p.role} • {p.nationality} • {p.auctionSetName || 'Marquee'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-[#D4AF37]">Base: ₹{p.basePriceCr} Cr</p>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isSold ? 'bg-emerald-500/20 text-emerald-400' : isUnsold ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {isSold ? 'Sold' : isUnsold ? 'Unsold' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY SQUAD MODAL */}
      {showSquadModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">{userTeam?.name} Roster</h3>
                  <p className="text-[11px] text-[#94a3b8]">
                    {userSquad.length}/25 Players • Overseas: {overseasCount}/8 • Purse: ₹{userTeam?.purseCr.toFixed(2)} Cr
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
              {userSquad.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#64748b]">
                  Your squad is currently empty. Start placing bids in the auction arena!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {userSquad.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedPlayerForModal(p)}
                      className="p-2.5 bg-[#05070a] hover:bg-[#1e293b]/60 rounded-xl border border-[#1e293b] flex items-center justify-between cursor-pointer transition"
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

      {/* Global Player Card Modal */}
      <PlayerCardModal
        player={selectedPlayerForModal}
        onClose={() => setSelectedPlayerForModal(null)}
      />

      {/* Floating Audio Soundtrack & Broadcast HUD */}
      <MusicPlayerHud />
    </div>
  );
};
