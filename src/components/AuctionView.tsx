import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { 
  generateAIAssistantAdvice, 
  getBidIncrement, 
  AUCTION_SETS_INFO, 
  SET_ORDER,
  assignPlayerAuctionSets
} from '../engine/auctionEngine';
import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { AuctionSetCode } from '../types/auction';
import { 
  Gavel, Clock, TrendingUp, ShieldCheck, Zap, 
  Sparkles, CheckCircle2, ArrowRight, UserCheck, AlertCircle, Play,
  Users, Layers, Search, Filter, Eye, ChevronRight, Check, Trophy, Globe, Flame,
  FastForward, RotateCcw, Shuffle, X, RefreshCw, Cpu
} from 'lucide-react';

type AuctionTab = 'live' | 'upcoming' | 'squads';
type StatusFilter = 'all' | 'upcoming' | 'sold' | 'unsold' | 'on_auction';
type CappedFilter = 'all' | 'capped' | 'uncapped';
type OriginFilter = 'all' | 'indian' | 'overseas';

export const AuctionView: React.FC = () => {
  const { 
    gameState, 
    placeUserBid, 
    passUserBid, 
    fastForwardAuctionPlayer,
    simulateEntireAuction,
    simulateCurrentAuctionSet,
    toggleAutoBid,
    switchUserFranchise,
    restartGame,
    setSelectedPlayerForModal,
    setActiveTab,
    setCurrentScreen
  } = useGame();

  const [activeAuctionTab, setActiveAuctionTab] = useState<AuctionTab>('live');
  const [selectedSetFilter, setSelectedSetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cappedFilter, setCappedFilter] = useState<CappedFilter>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSimConfirmModal, setShowSimConfirmModal] = useState<boolean>(false);
  const [showFranchiseModal, setShowFranchiseModal] = useState<boolean>(false);
  const [simFromBeginningOption, setSimFromBeginningOption] = useState<boolean>(false);
  const [isAuctionPaused, setIsAuctionPaused] = useState<boolean>(false);
  const [showQuitModal, setShowQuitModal] = useState<boolean>(false);
  
  // Squads view state
  const [selectedSquadTeamId, setSelectedSquadTeamId] = useState<string>(gameState?.userTeamId || 'csk');
  const [squadRoleFilter, setSquadRoleFilter] = useState<string>('all');

  if (!gameState || !gameState.auctionState) return null;

  const auc = gameState.auctionState;
  const player = auc.activePlayer;
  const userTeam = gameState.teams[gameState.userTeamId];
  const userSquad = userTeam ? (userTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean) : [];

  const nextBidIncrement = player ? getBidIncrement(auc.currentBidCr) : 0.2;
  const nextUserBidAmount = Number((auc.currentBidCr + nextBidIncrement).toFixed(2));
  const isUserLeading = auc.currentLeadingTeamId === gameState.userTeamId;
  const canAfford = userTeam ? userTeam.purseCr >= nextUserBidAmount : false;

  const aiAdvice = (player && userTeam) ? generateAIAssistantAdvice(player, userTeam, userSquad, auc.currentBidCr) : null;
  const leadingTeam = auc.currentLeadingTeamId ? gameState.teams[auc.currentLeadingTeamId] : null;

  // Process and tag all players in auction pool with set info
  const taggedPlayerPool = useMemo(() => {
    return assignPlayerAuctionSets(auc.allPlayerPool);
  }, [auc.allPlayerPool]);

  // Next 3 upcoming players in queue
  const nextUpcomingQueue = useMemo(() => {
    return taggedPlayerPool.slice(auc.currentPlayerIndex + 1, auc.currentPlayerIndex + 4);
  }, [taggedPlayerPool, auc.currentPlayerIndex]);

  // Filtered upcoming/all auction players
  const filteredAuctionPlayers = useMemo(() => {
    return taggedPlayerPool.filter((p, index) => {
      // Determine real-time status
      const isCurrent = auc.activePlayer?.id === p.id;
      const isSold = auc.soldPlayerRecords.some(r => r.player.id === p.id);
      const isUnsold = auc.unsoldPlayerIds.includes(p.id);
      const isUpcoming = index > auc.currentPlayerIndex;

      // Status filter
      if (statusFilter === 'upcoming' && !isUpcoming) return false;
      if (statusFilter === 'sold' && !isSold) return false;
      if (statusFilter === 'unsold' && !isUnsold) return false;
      if (statusFilter === 'on_auction' && !isCurrent) return false;

      // Set filter
      if (selectedSetFilter !== 'all' && p.auctionSetCode !== selectedSetFilter) return false;

      // Capped filter
      if (cappedFilter === 'capped' && !p.isCapped) return false;
      if (cappedFilter === 'uncapped' && p.isCapped) return false;

      // Origin filter
      if (originFilter === 'indian' && p.isOverseas) return false;
      if (originFilter === 'overseas' && !p.isOverseas) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q) || p.shortName.toLowerCase().includes(q);
        const matchesRole = p.role.toLowerCase().includes(q);
        const matchesSet = p.auctionSetCode?.toLowerCase().includes(q) || p.auctionSetName?.toLowerCase().includes(q);
        const matchesNat = p.nationality.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesSet && !matchesNat) return false;
      }

      return true;
    });
  }, [taggedPlayerPool, auc.activePlayer, auc.soldPlayerRecords, auc.unsoldPlayerIds, auc.currentPlayerIndex, statusFilter, selectedSetFilter, cappedFilter, originFilter, searchQuery]);

  // Group filtered players by Auction Set Code for set-based views
  const groupedBySet = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    filteredAuctionPlayers.forEach(p => {
      const setCode = p.auctionSetCode || 'ACC1';
      if (!groups[setCode]) {
        groups[setCode] = [];
      }
      groups[setCode].push(p);
    });
    return groups;
  }, [filteredAuctionPlayers]);

  // Selected team for squads explorer
  const selectedTeam = gameState.teams[selectedSquadTeamId] || userTeam;
  const selectedTeamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return (selectedTeam.rosterPlayerIds || [])
      .map(id => gameState.allPlayers[id])
      .filter(Boolean)
      .map(p => {
        // Tag with isCapped if missing
        return {
          ...p,
          isCapped: p.isCapped !== undefined ? p.isCapped : (p.overall >= 86 || p.isOverseas || p.basePriceCr >= 1.0)
        };
      });
  }, [selectedTeam, gameState.allPlayers]);

  // Filtered squad players
  const filteredSquadPlayers = useMemo(() => {
    return selectedTeamPlayers.filter(p => {
      if (squadRoleFilter === 'all') return true;
      if (squadRoleFilter === 'batters') return p.role.includes('Batter') || p.role.includes('Finisher');
      if (squadRoleFilter === 'allrounders') return p.role.includes('All-rounder');
      if (squadRoleFilter === 'bowlers') return p.role.includes('Bowler');
      if (squadRoleFilter === 'keepers') return p.role.includes('Wicketkeeper');
      if (squadRoleFilter === 'overseas') return p.isOverseas;
      if (squadRoleFilter === 'capped') return p.isCapped;
      if (squadRoleFilter === 'uncapped') return !p.isCapped;
      return true;
    });
  }, [selectedTeamPlayers, squadRoleFilter]);

  // Overall auction statistics
  const totalPoolCount = taggedPlayerPool.length;
  const totalSoldCount = auc.soldPlayerRecords.length;
  const totalUnsoldCount = auc.unsoldPlayerIds.length;
  const totalRemainingCount = Math.max(0, totalPoolCount - totalSoldCount - totalUnsoldCount - (auc.activePlayer ? 1 : 0));
  const totalPurseSpentLeague = (Object.values(gameState.teams) as Team[]).reduce((sum, t) => sum + (120 - t.purseCr), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Top Header Banner & Multi-View Navigation */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white uppercase tracking-tight italic">IPL Mega Auction War Room</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /> LIVE AUCTION
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              {auc.activePlayer ? (
                <>Lot #{auc.currentPlayerIndex + 1} of {totalPoolCount} • <span className="text-[#D4AF37] font-semibold">{auc.activePlayer.auctionSetName || 'Marquee Pool'}</span></>
              ) : (
                <>Auction Stage Complete</>
              )}
            </p>
          </div>
        </div>

        {/* View Mode Switching Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="bg-[#05070a] p-1 rounded-xl border border-[#1e293b] flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-start">
            <button
              id="btn-tab-live-auction"
              onClick={() => setActiveAuctionTab('live')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeAuctionTab === 'live'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              <Gavel className="w-4 h-4" />
              <span>Live Stage</span>
            </button>

            <button
              id="btn-tab-upcoming-players"
              onClick={() => setActiveAuctionTab('upcoming')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeAuctionTab === 'upcoming'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Upcoming & Sets</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
                activeAuctionTab === 'upcoming' ? 'bg-black/20 text-black' : 'bg-[#1e293b] text-[#D4AF37]'
              }`}>
                {totalRemainingCount}
              </span>
            </button>

            <button
              id="btn-tab-team-squads"
              onClick={() => setActiveAuctionTab('squads')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
                activeAuctionTab === 'squads'
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>All Squads</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-black ${
                activeAuctionTab === 'squads' ? 'bg-black/20 text-black' : 'bg-[#1e293b] text-[#94a3b8]'
              }`}>
                10
              </span>
            </button>
          </div>

          {/* Auction Control Actions */}
          <div className="flex items-center gap-2">
            <button
              id="btn-pause-auction"
              onClick={() => setIsAuctionPaused(!isAuctionPaused)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition border flex items-center gap-1.5 cursor-pointer ${
                isAuctionPaused
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] border-[#1e293b]'
              }`}
              title={isAuctionPaused ? 'Resume Auction' : 'Pause Auction'}
            >
              {isAuctionPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />}
              <span>{isAuctionPaused ? 'Resume Auction' : 'Pause Auction'}</span>
            </button>

            <button
              id="btn-quit-auction-room"
              onClick={() => setShowQuitModal(true)}
              className="px-3 py-2 rounded-xl bg-[#05070a] hover:bg-red-500/20 hover:text-red-400 text-[#94a3b8] font-bold text-xs uppercase tracking-wider transition border border-[#1e293b] flex items-center gap-1 cursor-pointer"
              title="Pause & Exit Auction Arena"
            >
              <X className="w-3.5 h-3.5" />
              <span>Quit</span>
            </button>
          </div>
        </div>
      </div>

      {/* AUCTION SIMULATION & FRANCHISE TOOLBAR */}
      <div className="bg-[#0b1329] p-3.5 rounded-2xl border border-[#1e293b] flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-sim-full-auction-prompt"
            onClick={() => {
              setSimFromBeginningOption(false);
              setShowSimConfirmModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            title="Automatically complete the entire auction with realistic AI bidding for all franchises"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Sim Entire Auction</span>
          </button>

          <button
            id="btn-sim-auction-from-start"
            onClick={() => {
              setSimFromBeginningOption(true);
              setShowSimConfirmModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#D4AF37] border border-[#D4AF37]/40 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            title="Reset rosters and simulate full auction from the very beginning (Set 1 Marquee)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sim from Start</span>
          </button>

          {auc.activePlayer && (
            <button
              id="btn-sim-current-set"
              onClick={simulateCurrentAuctionSet}
              className="px-3.5 py-2 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-white border border-[#1e293b] font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
              title={`Simulate all remaining players in Set ${auc.activePlayer.auctionSetCode || 'Current'}`}
            >
              <FastForward className="w-3.5 h-3.5 text-blue-400" />
              <span>Sim Set [{auc.activePlayer.auctionSetCode || 'Current'}]</span>
            </button>
          )}

          <button
            id="btn-toggle-auto-bid"
            onClick={toggleAutoBid}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition border flex items-center gap-1.5 cursor-pointer ${
              auc.isAutoBidEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-[#05070a] text-[#94a3b8] border-[#1e293b] hover:text-white'
            }`}
            title="Allow AI Chief Scout to automatically bid on high-value targets for your franchise"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Auto-Bid: {auc.isAutoBidEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-switch-franchise-auction"
            onClick={() => setShowFranchiseModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] border border-[#1e293b] font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            title="Change your active franchise anytime"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Switch Team ({userTeam?.shortName})</span>
          </button>

          <button
            id="btn-reset-auction-fresh"
            onClick={() => restartGame({ newTeamId: gameState.userTeamId })}
            className="p-2 rounded-xl bg-[#05070a] hover:bg-red-500/20 text-[#94a3b8] hover:text-red-400 border border-[#1e293b] transition cursor-pointer"
            title="Reset auction to Lot 1 with full purse"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE AUCTION STAGE */}
      {activeAuctionTab === 'live' && (
        <>
          {player ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Active Player Showcase & Bidding Paddle */}
              <div className="lg:col-span-2 space-y-6">
                {/* Player Card & Current Bid Status */}
                <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] p-6 relative overflow-hidden shadow-2xl">
                  {/* Real IPL Set Tag & Capped Indicator Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#1e293b]/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-mono font-bold border border-[#D4AF37]/30 uppercase text-[11px]">
                        {player.auctionSetCode ? `[${player.auctionSetCode}] ${AUCTION_SETS_INFO[player.auctionSetCode as AuctionSetCode]?.name || player.auctionSetName}` : 'Set 1 Marquee'}
                      </span>
                      {player.isCapped ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30 flex items-center gap-1">
                          ⭐ CAPPED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                          🌱 UNCAPPED
                        </span>
                      )}
                    </div>

                    <span className="text-[#64748b] text-[11px]">
                      Lot #{auc.currentPlayerIndex + 1} of {totalPoolCount}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#1e293b]">
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => setSelectedPlayerForModal(player)}
                        className="w-16 h-16 rounded-xl bg-[#05070a] border border-[#1e293b] flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] transition group"
                        title="Click to scout full player profile"
                      >
                        <span className="text-2xl font-black font-mono text-[#D4AF37] group-hover:scale-110 transition">{player.overall}</span>
                        <span className="text-[9px] uppercase font-bold text-[#64748b]">OVR</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 
                            onClick={() => setSelectedPlayerForModal(player)}
                            className="text-2xl font-black text-white cursor-pointer hover:text-[#D4AF37] transition"
                          >
                            {player.name}
                          </h3>
                          {player.isOverseas ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                              ✈️ {player.nationality}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                              🇮🇳 Indian
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#94a3b8] mt-1">
                          {player.role} • {player.age} yrs • {player.battingStyle} • {player.bowlingStyle}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748b]">
                          <span>Bat: <strong className="text-white font-mono">{player.battingRating}</strong></span>
                          <span>•</span>
                          <span>Bowl: <strong className="text-white font-mono">{player.bowlingRating}</strong></span>
                          <span>•</span>
                          <span>Potential: <strong className="text-purple-400 font-mono">{player.potential}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Base Price */}
                    <div className="text-left sm:text-right">
                      <span className="text-[#64748b] text-xs block uppercase tracking-wider font-semibold">Base Price</span>
                      <span className="font-mono font-bold text-white text-base">₹{player.basePriceCr.toFixed(2)} Cr</span>
                    </div>
                  </div>

                  {/* Center Bidding Stage: Live Bid & Gavel Status */}
                  <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <span className="text-xs uppercase font-bold text-[#94a3b8] tracking-widest block mb-1">
                        Current Highest Bid
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-5xl font-black font-mono text-[#D4AF37] tracking-tight">
                          ₹{auc.currentBidCr.toFixed(2)}
                        </span>
                        <span className="text-lg font-bold text-[#D4AF37]">Cr</span>
                      </div>

                      {leadingTeam ? (
                        <div className="flex items-center gap-2 mt-2">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shadow"
                            style={{ backgroundColor: leadingTeam.primaryColor, color: leadingTeam.secondaryColor }}
                          >
                            {leadingTeam.shortName.slice(0, 3)}
                          </div>
                          <span className="text-xs text-[#94a3b8]">
                            Held by <strong className="text-white">{leadingTeam.name}</strong>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#64748b] mt-1 block">Opening Bid at Base Price</span>
                      )}
                    </div>

                    {/* Gavel & Urgency Clock */}
                    <div className="flex items-center gap-4 bg-[#05070a] p-4 rounded-xl border border-[#1e293b] w-full sm:w-auto justify-between sm:justify-start">
                      <div className="text-center">
                        <span className="text-[10px] text-[#64748b] uppercase font-bold block mb-0.5">Auctioneer</span>
                        <span className={`text-xs font-black uppercase px-2.5 py-1 rounded ${
                          auc.hammerState === 'Going Twice' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                          auc.hammerState === 'Going Once' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {auc.hammerState}
                        </span>
                      </div>

                      <div className="w-px h-8 bg-[#1e293b]" />

                      <div className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${auc.auctionTimerSeconds <= 3 ? 'text-red-400 animate-bounce' : 'text-[#D4AF37]'}`} />
                        <span className="font-mono font-black text-2xl text-white">
                          0:{auc.auctionTimerSeconds.toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bidding Interaction Buttons */}
                  <div className="pt-4 border-t border-[#1e293b] grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      id="btn-raise-bid"
                      onClick={placeUserBid}
                      disabled={!canAfford || isUserLeading}
                      className={`py-3.5 px-4 rounded-full font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition ${
                        isUserLeading
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-not-allowed'
                          : canAfford
                          ? 'bg-[#D4AF37] text-black hover:scale-105 active:scale-95 shadow-[#D4AF37]/20 cursor-pointer'
                          : 'bg-[#1e293b] text-[#64748b] cursor-not-allowed'
                      }`}
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>
                        {isUserLeading 
                          ? 'You are High Bidder' 
                          : `Raise Bid (₹${nextUserBidAmount} Cr)`}
                      </span>
                    </button>

                    <button
                      id="btn-pass-bid"
                      onClick={passUserBid}
                      className="py-3.5 px-4 rounded-full bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] font-bold text-xs uppercase tracking-widest transition border border-[#1e293b] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Pass / Concede</span>
                    </button>

                    <button
                      id="btn-fast-sim-player"
                      onClick={fastForwardAuctionPlayer}
                      className="py-3.5 px-4 rounded-full bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] font-bold text-xs uppercase tracking-widest transition border border-[#1e293b] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Fast Resolve</span>
                    </button>
                  </div>
                </div>

                {/* AI Assistant Scouting Analysis Card */}
                {aiAdvice && (
                  <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#D4AF37]" /> AI Chief Scout Assessment
                      </h4>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        aiAdvice.verdict.includes('Steal') ? 'bg-emerald-500/20 text-emerald-400' :
                        aiAdvice.verdict.includes('Risky') ? 'bg-red-500/20 text-red-400' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
                      }`}>
                        {aiAdvice.verdict}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
                        <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Recommended Ceiling</span>
                        <span className="font-mono font-bold text-[#D4AF37] text-sm">₹{aiAdvice.recommendedMaxBidCr} Cr</span>
                      </div>

                      <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b] sm:col-span-2">
                        <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Squad Need Analysis</span>
                        <p className="text-[#94a3b8] text-[11px] mt-0.5 leading-snug">{aiAdvice.squadNeedAnalysis}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Next 3 Upcoming Lots Preview Carousel */}
                {nextUpcomingQueue.length > 0 && (
                  <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#e2e8f0] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#D4AF37]" /> On Deck: Next 3 Upcoming Lots
                      </h4>
                      <button
                        onClick={() => setActiveAuctionTab('upcoming')}
                        className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
                      >
                        View Full Pool <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {nextUpcomingQueue.map((np, idx) => (
                        <div 
                          key={np.id}
                          onClick={() => setSelectedPlayerForModal(np)}
                          className="bg-[#05070a] p-3.5 rounded-xl border border-[#1e293b] hover:border-[#D4AF37]/60 transition cursor-pointer space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#D4AF37] font-bold">
                              {np.auctionSetCode || 'LOT'} • #{auc.currentPlayerIndex + 2 + idx}
                            </span>
                            <span className="font-mono font-bold text-white text-xs">
                              {np.overall} OVR
                            </span>
                          </div>

                          <div>
                            <span className="font-bold text-white text-sm block group-hover:text-[#D4AF37] transition truncate">
                              {np.name}
                            </span>
                            <span className="text-[11px] text-[#94a3b8] block truncate">
                              {np.role} {np.isOverseas ? '✈️' : '🇮🇳'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1e293b]/60">
                            <span className="text-[#64748b]">Base: ₹{np.basePriceCr} Cr</span>
                            <span className={`text-[10px] font-bold ${np.isCapped ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {np.isCapped ? 'Capped' : 'Uncapped'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Bids Feed */}
                <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-3 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Live Paddle Bids Log</h4>
                  {auc.bidHistory.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-xs">
                      {auc.bidHistory.map((b, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-[#05070a] rounded-lg border border-[#1e293b]">
                          <span className="font-bold text-white">{b.teamShortName || (b.teamId || '').toUpperCase() || 'BIDDER'}</span>
                          <span className="font-mono font-bold text-[#D4AF37]">₹{b.bidAmountCr.toFixed(2)} Cr</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748b]">Waiting for opening paddle...</p>
                  )}
                </div>
              </div>

              {/* Right Col: All 10 Franchise Purses Tracker & Quick Squad Inspection */}
              <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Franchise Purses & Rosters
                  </h4>
                  <span className="text-[10px] text-[#64748b] font-mono">10 Teams</span>
                </div>

                <div className="space-y-2 text-xs">
                  {(Object.values(gameState.teams) as Team[]).map(t => {
                    const isUser = t.id === gameState.userTeamId;
                    const overseasInSquad = (t.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(p => p?.isOverseas).length;

                    return (
                      <div 
                        key={t.id} 
                        className={`p-3 rounded-xl border flex items-center justify-between transition group ${
                          isUser ? 'bg-[#1e293b]/70 border-[#D4AF37] text-white font-bold' : 'bg-[#05070a] border-[#1e293b] text-[#94a3b8] hover:border-[#1e293b]/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow"
                            style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}
                          >
                            {t.shortName.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate block max-w-[95px] text-white font-semibold">{t.name}</span>
                              {isUser && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold">YOU</span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#64748b] font-normal">
                              {t.rosterPlayerIds.length}/25 squad • {overseasInSquad}/8 OS
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-mono font-bold text-[#D4AF37] text-xs">
                            ₹{t.purseCr.toFixed(2)} Cr
                          </span>
                          <button
                            onClick={() => {
                              setSelectedSquadTeamId(t.id);
                              setActiveAuctionTab('squads');
                            }}
                            className="text-[10px] text-[#94a3b8] hover:text-white underline"
                          >
                            View Squad
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#1e293b] text-center space-y-3 shadow-xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Mega Auction Finished!</h3>
              <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                All players in the draft pool have been sold or finalized. You are ready to select your Playing XI and begin the IPL tournament!
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  id="btn-goto-playing-xi"
                  onClick={() => {
                    setCurrentScreen('Dashboard');
                    setActiveTab('PlayingXI');
                  }}
                  className="px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition"
                >
                  Go to Playing XI Setup
                </button>
                <button
                  onClick={() => setActiveAuctionTab('squads')}
                  className="px-6 py-3.5 rounded-full bg-[#05070a] hover:bg-[#1e293b] text-white font-bold text-xs uppercase tracking-widest border border-[#1e293b] transition"
                >
                  Review Final Squads
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* VIEW 2: UPCOMING PLAYERS & REAL IPL SETS */}
      {activeAuctionTab === 'upcoming' && (
        <div className="space-y-6">
          {/* Summary Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Total Draft Pool</span>
              <span className="text-xl font-mono font-black text-white">{totalPoolCount} Players</span>
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Remaining Upcoming</span>
              <span className="text-xl font-mono font-black text-[#D4AF37]">{totalRemainingCount} Lots</span>
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Sold Hammer Deals</span>
              <span className="text-xl font-mono font-black text-emerald-400">{totalSoldCount} Sold</span>
            </div>
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-[#64748b] block text-[10px] uppercase font-semibold">League Spend</span>
              <span className="text-xl font-mono font-black text-[#D4AF37]">₹{totalPurseSpentLeague.toFixed(1)} Cr</span>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-4 shadow-xl">
            {/* Search Input and Top Quick Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player, role, country, or set..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#05070a] border border-[#1e293b] rounded-xl text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Status & Capped Toggles */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="bg-[#05070a] p-1 rounded-lg border border-[#1e293b] flex items-center gap-1">
                  {(['all', 'upcoming', 'sold', 'unsold'] as StatusFilter[]).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition ${
                        statusFilter === st ? 'bg-[#D4AF37] text-black' : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="bg-[#05070a] p-1 rounded-lg border border-[#1e293b] flex items-center gap-1">
                  {(['all', 'capped', 'uncapped'] as CappedFilter[]).map(cf => (
                    <button
                      key={cf}
                      onClick={() => setCappedFilter(cf)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition ${
                        cappedFilter === cf ? 'bg-[#D4AF37] text-black' : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {cf}
                    </button>
                  ))}
                </div>

                <div className="bg-[#05070a] p-1 rounded-lg border border-[#1e293b] flex items-center gap-1">
                  {(['all', 'indian', 'overseas'] as OriginFilter[]).map(of => (
                    <button
                      key={of}
                      onClick={() => setOriginFilter(of)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition ${
                        originFilter === of ? 'bg-[#D4AF37] text-black' : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {of === 'indian' ? '🇮🇳 Ind' : of === 'overseas' ? '✈️ OS' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Set Selection Pills (Real IPL Auction Groups) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] block mb-2">
                IPL Auction Sets & Groups
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedSetFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedSetFilter === 'all'
                      ? 'bg-[#D4AF37] text-black font-black'
                      : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                  }`}
                >
                  All Sets ({totalPoolCount})
                </button>
                {SET_ORDER.map(setCode => {
                  const setInfo = AUCTION_SETS_INFO[setCode];
                  if (!setInfo) return null;
                  const countInSet = taggedPlayerPool.filter(p => p.auctionSetCode === setCode).length;
                  if (countInSet === 0) return null;

                  return (
                    <button
                      key={setCode}
                      onClick={() => setSelectedSetFilter(setCode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedSetFilter === setCode
                          ? 'bg-[#D4AF37] text-black font-black'
                          : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                      }`}
                    >
                      <span>{setInfo.name}</span>
                      <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                        selectedSetFilter === setCode ? 'bg-black/20 text-black font-bold' : 'bg-[#1e293b] text-[#64748b]'
                      }`}>
                        {countInSet}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grouped Player Cards List */}
          <div className="space-y-6">
            {Object.keys(groupedBySet).length > 0 ? (
              SET_ORDER.filter(sc => groupedBySet[sc]?.length > 0).map(setCode => {
                const setInfo = AUCTION_SETS_INFO[setCode];
                const setPlayers = groupedBySet[setCode] || [];

                return (
                  <div key={setCode} className="bg-[#0f172a] rounded-2xl border border-[#1e293b] overflow-hidden shadow-xl">
                    {/* Set Group Header */}
                    <div className="p-4 bg-[#05070a] border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center font-mono font-bold text-[#D4AF37] text-xs">
                          {setCode}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm">{setInfo?.name || setCode}</h3>
                            {setInfo?.isCapped ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                ⭐ CAPPED
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                🌱 UNCAPPED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748b]">{setInfo?.description}</p>
                        </div>
                      </div>

                      <span className="text-xs text-[#94a3b8] font-mono">
                        {setPlayers.length} player(s) in set
                      </span>
                    </div>

                    {/* Players in Set Table / Cards Grid */}
                    <div className="divide-y divide-[#1e293b]/60">
                      {setPlayers.map((p, pIndex) => {
                        const isCurrent = auc.activePlayer?.id === p.id;
                        const soldRecord = auc.soldPlayerRecords.find(r => r.player.id === p.id);
                        const isUnsold = auc.unsoldPlayerIds.includes(p.id);
                        const originalIndex = taggedPlayerPool.findIndex(orig => orig.id === p.id);
                        const isUpcoming = originalIndex > auc.currentPlayerIndex;
                        const buyerTeam = soldRecord ? gameState.teams[soldRecord.buyingTeamId] : null;

                        return (
                          <div 
                            key={p.id}
                            className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:bg-[#1e293b]/30 ${
                              isCurrent ? 'bg-[#D4AF37]/5 border-l-4 border-l-[#D4AF37]' : ''
                            }`}
                          >
                            {/* Left: Player OVR & Basic Details */}
                            <div className="flex items-center gap-3.5">
                              <div 
                                onClick={() => setSelectedPlayerForModal(p)}
                                className="w-12 h-12 rounded-xl bg-[#05070a] border border-[#1e293b] flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] transition group flex-shrink-0"
                              >
                                <span className="text-lg font-mono font-black text-[#D4AF37] group-hover:scale-105 transition">{p.overall}</span>
                                <span className="text-[8px] uppercase font-bold text-[#64748b]">OVR</span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span 
                                    onClick={() => setSelectedPlayerForModal(p)}
                                    className="font-bold text-white text-base hover:text-[#D4AF37] cursor-pointer transition"
                                  >
                                    {p.name}
                                  </span>
                                  {p.isOverseas ? (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                                      ✈️ {p.nationality}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                      🇮🇳
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#94a3b8] mt-0.5">
                                  {p.role} • {p.age} yrs • {p.battingStyle} • {p.bowlingStyle}
                                </p>
                              </div>
                            </div>

                            {/* Middle: Attributes & Base Price */}
                            <div className="flex items-center gap-4 text-xs">
                              <div className="bg-[#05070a] px-3 py-1.5 rounded-lg border border-[#1e293b]">
                                <span className="text-[#64748b] block text-[9px] uppercase font-semibold">Ratings</span>
                                <span className="text-white font-mono">Bat: <strong>{p.battingRating}</strong> | Bowl: <strong>{p.bowlingRating}</strong></span>
                              </div>

                              <div className="bg-[#05070a] px-3 py-1.5 rounded-lg border border-[#1e293b]">
                                <span className="text-[#64748b] block text-[9px] uppercase font-semibold">Base Price</span>
                                <span className="text-[#D4AF37] font-mono font-bold">₹{p.basePriceCr.toFixed(2)} Cr</span>
                              </div>
                            </div>

                            {/* Right: Real-time Status Badge & Action */}
                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                              {isCurrent ? (
                                <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 font-black text-xs border border-red-500/30 animate-pulse flex items-center gap-1.5">
                                  <Flame className="w-3.5 h-3.5 text-red-400" /> ON AUCTION NOW
                                </span>
                              ) : soldRecord ? (
                                <div className="flex items-center gap-2">
                                  {buyerTeam && (
                                    <div 
                                      className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shadow"
                                      style={{ backgroundColor: buyerTeam.primaryColor, color: buyerTeam.secondaryColor }}
                                    >
                                      {buyerTeam.shortName.slice(0, 3)}
                                    </div>
                                  )}
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                                    SOLD • ₹{soldRecord.sellingPriceCr.toFixed(2)} Cr ({buyerTeam?.name || 'Franchise'})
                                  </span>
                                </div>
                              ) : isUnsold ? (
                                <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/30">
                                  UNSOLD
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-[#05070a] text-[#94a3b8] font-bold text-xs border border-[#1e293b] flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" /> Lot #{originalIndex + 1}
                                </span>
                              )}

                              <button
                                onClick={() => setSelectedPlayerForModal(p)}
                                className="px-3 py-1.5 rounded-lg bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] font-bold text-xs uppercase transition border border-[#1e293b] flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> Scout
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#1e293b] text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-[#64748b] mx-auto" />
                <h4 className="text-white font-bold text-sm">No players match the selected filters</h4>
                <p className="text-xs text-[#94a3b8]">Try resetting search filters or set selection.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: ALL 10 FRANCHISE SQUADS EXPLORER */}
      {activeAuctionTab === 'squads' && (
        <div className="space-y-6">
          {/* Franchise Selector Grid / Tabs */}
          <div className="bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b] shadow-xl">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] block mb-3">
              Select Franchise to Inspect Live Squad & Finances
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(Object.values(gameState.teams) as Team[]).map(t => {
                const isSelected = t.id === selectedSquadTeamId;
                const isUser = t.id === gameState.userTeamId;

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedSquadTeamId(t.id)}
                    className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37] shadow-lg'
                        : 'bg-[#05070a] border-[#1e293b] hover:border-[#1e293b]/90 text-[#94a3b8]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shadow"
                        style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}
                      >
                        {t.shortName.slice(0, 3)}
                      </div>
                      {isUser && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-bold">
                          YOU
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="font-bold text-white text-xs block truncate">{t.name}</span>
                      <span className="text-[10px] font-mono text-[#D4AF37] font-bold block">
                        ₹{t.purseCr.toFixed(2)} Cr Purse
                      </span>
                    </div>

                    <span className="text-[10px] text-[#64748b]">
                      {t.rosterPlayerIds.length}/25 squad
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Franchise Summary Banner */}
          {selectedTeam && (
            <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#1e293b]">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg"
                    style={{ backgroundColor: selectedTeam.primaryColor, color: selectedTeam.secondaryColor }}
                  >
                    {selectedTeam.shortName.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-white">{selectedTeam.name}</h3>
                      {selectedTeam.id === gameState.userTeamId && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/30">
                          Your Managed Franchise
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-0.5">
                      Home: {selectedTeam.homeGround} • Captain: {selectedTeam.captainName || 'TBD'}
                    </p>
                  </div>
                </div>

                {/* Remaining Purse & Spend Metrics */}
                <div className="text-left sm:text-right">
                  <span className="text-[#64748b] text-xs block uppercase tracking-wider font-semibold">Available Auction Purse</span>
                  <div className="flex items-baseline sm:justify-end gap-1.5">
                    <span className="text-3xl font-mono font-black text-[#D4AF37]">
                      ₹{selectedTeam.purseCr.toFixed(2)}
                    </span>
                    <span className="text-sm font-bold text-[#D4AF37]">Cr</span>
                  </div>
                  <span className="text-[11px] text-[#64748b]">
                    Spent: ₹{(120 - selectedTeam.purseCr).toFixed(2)} Cr of ₹120.00 Cr
                  </span>
                </div>
              </div>

              {/* Roster Composition Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Squad Capacity</span>
                  <span className="text-base font-mono font-bold text-white">
                    {selectedTeam.rosterPlayerIds.length} / 25
                  </span>
                  <span className="text-[10px] text-[#94a3b8] block mt-0.5">
                    (Min required: 18)
                  </span>
                </div>

                <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Overseas Slots</span>
                  <span className="text-base font-mono font-bold text-blue-400">
                    {selectedTeamPlayers.filter(p => p.isOverseas).length} / 8
                  </span>
                  <span className="text-[10px] text-[#94a3b8] block mt-0.5">
                    {8 - selectedTeamPlayers.filter(p => p.isOverseas).length} slots free
                  </span>
                </div>

                <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Capped vs Uncapped</span>
                  <span className="text-base font-mono font-bold text-amber-400">
                    {selectedTeamPlayers.filter(p => p.isCapped).length} Capped
                  </span>
                  <span className="text-[10px] text-[#94a3b8] block mt-0.5">
                    {selectedTeamPlayers.filter(p => !p.isCapped).length} Uncapped
                  </span>
                </div>

                <div className="bg-[#05070a] p-3 rounded-xl border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Avg Squad Rating</span>
                  <span className="text-base font-mono font-bold text-[#D4AF37]">
                    {selectedTeamPlayers.length > 0
                      ? Math.round(selectedTeamPlayers.reduce((sum, p) => sum + p.overall, 0) / selectedTeamPlayers.length)
                      : 0} OVR
                  </span>
                  <span className="text-[10px] text-[#94a3b8] block mt-0.5">
                    Overall Strength
                  </span>
                </div>
              </div>

              {/* Squad Role Filters */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1e293b]/60">
                {[
                  { id: 'all', label: 'All Players' },
                  { id: 'batters', label: 'Batters' },
                  { id: 'allrounders', label: 'All-Rounders' },
                  { id: 'bowlers', label: 'Bowlers' },
                  { id: 'keepers', label: 'Wicketkeepers' },
                  { id: 'overseas', label: '✈️ Overseas' },
                  { id: 'capped', label: '⭐ Capped' },
                  { id: 'uncapped', label: '🌱 Uncapped' }
                ].map(rf => (
                  <button
                    key={rf.id}
                    onClick={() => setSquadRoleFilter(rf.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      squadRoleFilter === rf.id
                        ? 'bg-[#D4AF37] text-black font-black'
                        : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>

              {/* Squad Player Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSquadPlayers.length > 0 ? (
                  filteredSquadPlayers.map(p => {
                    const soldRecord = auc.soldPlayerRecords.find(r => r.player.id === p.id);

                    return (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedPlayerForModal(p)}
                        className="bg-[#05070a] p-4 rounded-xl border border-[#1e293b] hover:border-[#D4AF37]/60 transition cursor-pointer space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#0f172a] border border-[#1e293b] flex flex-col items-center justify-center font-mono text-[#D4AF37] font-black text-sm group-hover:scale-105 transition">
                              {p.overall}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-sm group-hover:text-[#D4AF37] transition">
                                  {p.name}
                                </span>
                                {p.isOverseas ? (
                                  <span className="text-[10px] text-blue-400">✈️</span>
                                ) : (
                                  <span className="text-[10px] text-emerald-400">🇮🇳</span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#94a3b8] block">
                                {p.role} • {p.age} yrs
                              </span>
                            </div>
                          </div>

                          {p.isCapped ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              CAPPED
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              UNCAPPED
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1e293b]/60">
                          <div>
                            <span className="text-[10px] text-[#64748b] block">Contract / Salary</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ₹{p.salaryCr.toFixed(2)} Cr/yr
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-[#64748b] block">Acquisition</span>
                            <span className="text-[11px] font-bold text-white">
                              {soldRecord ? '🔨 Auction Buy' : '🔒 Retained'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 text-center bg-[#05070a] rounded-xl border border-[#1e293b]">
                    <p className="text-xs text-[#64748b]">No players found matching this role filter.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SIMULATION CONFIRMATION MODAL */}
      {showSimConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">
                    {simFromBeginningOption ? 'Simulate Auction From Start' : 'Simulate Entire Auction'}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">AI Draft Engine will complete all lots with strategic bidding.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSimConfirmModal(false)}
                className="p-1.5 rounded-lg bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-[#05070a] rounded-xl border border-[#1e293b] space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-white">Franchise Auto-Bid Mode</span>
                  <span className="text-[#D4AF37] uppercase text-[10px] font-mono">
                    {auc.isAutoBidEnabled ? 'AI Scout Auto-Drafting Active' : 'AI Scout Target-Focused'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                  {simFromBeginningOption
                    ? 'All rosters will be reset and drafted from Lot 1 using team salary caps and tactical AI scouts. You will advance immediately to the season dashboard with a complete 25-man squad.'
                    : 'The simulator will resolve all remaining marquee, capped, and uncapped auction sets. Squads and Playing XIs will be balanced automatically.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-confirm-sim-auction-action"
                  onClick={() => {
                    simulateEntireAuction(simFromBeginningOption);
                    setShowSimConfirmModal(false);
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-[#D4AF37] hover:scale-105 active:scale-95 text-black font-black text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Confirm Simulation</span>
                </button>
                <button
                  onClick={() => setShowSimConfirmModal(false)}
                  className="px-4 py-3.5 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FRANCHISE SWITCHER MODAL */}
      {showFranchiseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Switch Active Franchise</h3>
                  <p className="text-xs text-[#94a3b8]">Select any franchise to take over their auction paddle & squad.</p>
                </div>
              </div>
              <button
                onClick={() => setShowFranchiseModal(false)}
                className="p-1.5 rounded-lg bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {(Object.values(gameState.teams) as Team[]).map(t => {
                const isSelected = gameState.userTeamId === t.id;
                return (
                  <div
                    key={t.id}
                    id={`switch-team-auction-${t.id}`}
                    onClick={() => {
                      switchUserFranchise(t.id);
                      setShowFranchiseModal(false);
                    }}
                    className={`p-3 rounded-xl cursor-pointer border transition text-center flex flex-col items-center justify-between ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#131d35] shadow-lg scale-105'
                        : 'border-[#1e293b] bg-[#05070a] hover:bg-[#1e293b]/70 hover:border-[#334155]'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm mb-2 shadow"
                      style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}
                    >
                      {t.shortName}
                    </div>
                    <h4 className="font-bold text-xs text-white truncate w-full">{t.name}</h4>
                    <span className="text-[10px] text-[#D4AF37] font-mono mt-1 font-semibold">₹{t.purseCr.toFixed(1)} Cr</span>
                    {isSelected && (
                      <span className="mt-2 text-[9px] uppercase font-bold bg-[#D4AF37] text-black px-1.5 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* QUIT / PAUSE AUCTION CONFIRM MODAL */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">Pause & Exit Auction?</h3>
                <p className="text-xs text-[#94a3b8]">You can return anytime or sim remaining sets to enter the season.</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                id="btn-resume-from-quit"
                onClick={() => {
                  setShowQuitModal(false);
                  setIsAuctionPaused(false);
                }}
                className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow hover:scale-[1.02] transition cursor-pointer"
              >
                Resume Auction Bidding
              </button>

              <button
                id="btn-sim-and-exit"
                onClick={() => {
                  setShowQuitModal(false);
                  simulateEntireAuction(false);
                  setCurrentScreen('Dashboard');
                  setActiveTab('Dashboard');
                }}
                className="w-full py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider border border-[#334155] transition cursor-pointer"
              >
                Simulate Remaining & Enter Season
              </button>

              <button
                id="btn-exit-to-dashboard-now"
                onClick={() => {
                  setShowQuitModal(false);
                  setCurrentScreen('Dashboard');
                  setActiveTab('Dashboard');
                }}
                className="w-full py-2.5 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white font-bold text-xs uppercase tracking-wider transition border border-[#1e293b] cursor-pointer"
              >
                Exit to Franchise Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
