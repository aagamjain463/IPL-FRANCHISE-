import React, { useEffect, useState } from 'react';
import { useMultiplayerAuction } from '../../hooks/useMultiplayerAuction';
import { MultiplayerAuctionClient } from '../../services/multiplayerAuctionClient';
import { MultiplayerLobbyView } from './MultiplayerLobbyView';
import { MultiplayerLiveAuctionArena } from './MultiplayerLiveAuctionArena';
import { MultiplayerCompletedView } from './MultiplayerCompletedView';
import { MultiplayerAuctionConfig } from '../../types/multiplayerAuction';
import { LeaderboardMiniPanel } from '../LeaderboardMiniPanel';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { isSupabaseConfigured, fetchServerSupabaseConfig } from '../../services/supabaseClient';
import { 
  Users, Plus, LogIn, Shield, Sparkles, Gavel, 
  Zap, Clock, Award, AlertCircle, Edit2, Check,
  Search, RefreshCw, Radio, Flame, Trophy, Globe, Database
} from 'lucide-react';

interface PublicRoomItem {
  code: string;
  name: string;
  hostName: string;
  purseCr: number;
  poolType: string;
  playerCount: number;
  maxPlayers: number;
  status: 'In Lobby';
  timerSeconds?: number;
  tag: 'Featured' | 'High Stakes' | 'Speed' | 'Casual';
}

const DEFAULT_PUBLIC_ROOMS: PublicRoomItem[] = [];


export const MultiplayerAuctionHome: React.FC = () => {
  const {
    identity,
    updateManagerIdentity,
    roomState,
    currentParticipant,
    isHost,
    isLoading,
    errorMessage,
    setErrorMessage,
    countdownSeconds,
    hammerCall,
    createRoom,
    joinRoom,
    selectFranchise,
    toggleReady,
    updateConfig,
    startAuction,
    placeBid,
    pauseAuction,
    resumeAuction,
    leaveRoom
  } = useMultiplayerAuction();

  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [editingName, setEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(identity.playerName);

  // Config setup state for creating room
  const [customStartingPurse, setCustomStartingPurse] = useState<number>(100);
  const [customMaxPlayers, setCustomMaxPlayers] = useState<number>(8);
  const [customPoolType, setCustomPoolType] = useState<MultiplayerAuctionConfig['poolType']>('Full Draft Pool');
  const [customTimer, setCustomTimer] = useState<number>(15);

  // Live rooms browser state
  const [roomFilter, setRoomFilter] = useState<'All' | 'Featured' | 'High Stakes' | 'Speed' | 'Casual'>('All');
  const [roomSearch, setRoomSearch] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomItem[]>(DEFAULT_PUBLIC_ROOMS);
  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseActive, setSupabaseActive] = useState(isSupabaseConfigured());

  const loadOpenRooms = async () => {
    setIsRefreshingRooms(true);
    const rooms = await MultiplayerAuctionClient.getOpenRooms();
    setPublicRooms(rooms as PublicRoomItem[]);
    setIsRefreshingRooms(false);
  };

  useEffect(() => {
    fetchServerSupabaseConfig().then(() => {
      setSupabaseActive(isSupabaseConfigured());
      loadOpenRooms();
    }).catch(() => {
      loadOpenRooms();
    });
    const refreshInterval = window.setInterval(loadOpenRooms, 2500);
    return () => window.clearInterval(refreshInterval);
  }, []);

  const handleRefreshRooms = () => {
    loadOpenRooms();
  };

  const handleInstantJoin = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setInputRoomCode(cleanCode);
    await joinRoom(cleanCode);
  };

  const filteredRooms = publicRooms.filter(r => {
    const matchesFilter = roomFilter === 'All' || r.tag === roomFilter;
    const matchesSearch = r.name.toLowerCase().includes(roomSearch.toLowerCase()) || 
                          r.code.toLowerCase().includes(roomSearch.toLowerCase()) ||
                          r.hostName.toLowerCase().includes(roomSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleSaveName = () => {
    if (tempName.trim()) {
      updateManagerIdentity(tempName.trim());
      setEditingName(false);
    }
  };

  const handleCreateRoomSubmit = async () => {
    setErrorMessage(null);
    await createRoom({
      startingPurseCr: customStartingPurse,
      minPlayers: Math.min(2, customMaxPlayers),
      maxPlayers: customMaxPlayers,
      poolType: customPoolType,
      timerSeconds: customTimer
    });
  };

  const handleJoinRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a 6-character room code.');
      return;
    }
    if (cleanCode.length < 4) {
      setErrorMessage('Room code must be at least 4 characters long.');
      return;
    }
    setErrorMessage(null);
    await joinRoom(cleanCode);
  };

  // If currently in a room, render the appropriate stage
  if (roomState) {
    if (roomState.status === 'lobby') {
      return (
        <MultiplayerLobbyView
          roomState={roomState}
          currentUserId={identity.playerId}
          isHost={isHost}
          onSelectFranchise={selectFranchise}
          onToggleReady={toggleReady}
          onUpdateConfig={updateConfig}
          onStartAuction={startAuction}
          onLeaveRoom={leaveRoom}
          errorMessage={errorMessage}
          isLoading={isLoading}
        />
      );
    }

    if (roomState.status === 'in_progress' || roomState.status === 'lot_break') {
      return (
        <MultiplayerLiveAuctionArena
          roomState={roomState}
          currentUserId={identity.playerId}
          isHost={isHost}
          countdownSeconds={countdownSeconds}
          hammerCall={hammerCall}
          onPlaceBid={placeBid}
          onPauseAuction={pauseAuction}
          onResumeAuction={resumeAuction}
          onLeaveRoom={leaveRoom}
          errorMessage={errorMessage}
        />
      );
    }

    if (roomState.status === 'completed') {
      return (
        <MultiplayerCompletedView
          roomState={roomState}
          currentUserId={identity.playerId}
          onLeaveRoom={leaveRoom}
        />
      );
    }
  }

  // Otherwise, render the Multiplayer Auction Lounge Entry Screen
  return (
    <div className="multiplayer-auction-home space-y-8 max-w-6xl mx-auto animate-fadeIn font-sans pb-16">
      {/* Hero Banner */}
      <div className="multiplayer-auction-hero bg-gradient-to-br from-[#0f172a] via-[#172554]/40 to-[#05070a] p-8 rounded-3xl border border-[#1e293b] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black uppercase tracking-widest border border-[#D4AF37]/30 shadow">
              <Sparkles className="w-3.5 h-3.5" /> REAL-TIME MULTIPLAYER WAR ROOM
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              Live Multiplayer IPL Auction
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Create or join live multiplayer rooms with friends across any device. Pick your IPL franchise, manage real purses, and battle in real time with server-synced hammer timers.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  supabaseActive
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>{supabaseActive ? 'Supabase Realtime Active ⚡' : 'Setup Supabase Cloud Sync'}</span>
              </button>
            </div>
          </div>

          {/* Manager Identity Card */}
          <div className="bg-[#05070a] p-4 rounded-2xl border border-[#1e293b] shrink-0 w-full md:w-auto shadow-inner">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mb-1">
              Your Manager Name
            </span>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  maxLength={20}
                  className="px-3 py-1.5 rounded-xl bg-[#0f172a] border border-[#D4AF37] text-white text-xs font-bold focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-2 rounded-xl bg-[#D4AF37] text-black hover:brightness-110 font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 justify-between">
                <span className="text-base font-bold text-white">{identity.playerName}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition"
                  title="Edit Manager Name"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <LeaderboardMiniPanel title="Live Multiplayer Leaderboard" />

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="bg-red-500/15 border border-red-500/40 p-4 rounded-2xl flex items-center gap-3 text-xs text-red-300 animate-shake shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Cards: Create Room & Join Room */}
      <div className="multiplayer-action-grid grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CREATE ROOM CARD */}
        <div className="bg-[#0f172a] p-6 sm:p-8 rounded-3xl border border-[#1e293b] flex flex-col justify-between space-y-6 shadow-2xl hover:border-[#D4AF37]/40 transition">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Create Auction Room</h3>
                <p className="text-xs text-slate-400">Host a new war room and invite friends with a 6-digit code.</p>
              </div>
            </div>

            {/* Config Selectors */}
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Starting Purse</label>
                <div className="grid grid-cols-3 gap-2">
                  {[75, 100, 120].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCustomStartingPurse(p)}
                      className={`py-2 rounded-xl border font-mono font-bold transition ${
                        customStartingPurse === p
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      ₹{p} Cr
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Managers</label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 6, 8, 10].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setCustomMaxPlayers(count)}
                      className={`py-2 rounded-xl border font-mono font-bold transition ${
                        customMaxPlayers === count
                          ? 'border-[#00FF87] bg-[#00FF87]/15 text-[#00FF87]'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider">Player Draft Pool</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Full Draft Pool', label: 'Full Pool (80)' },
                    { id: 'Top 30 Marquee & Stars', label: 'Top 30 Stars' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCustomPoolType(item.id as MultiplayerAuctionConfig['poolType'])}
                      className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition truncate ${
                        customPoolType === item.id
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-white'
                          : 'border-[#1e293b] bg-[#05070a] text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            id="btn-create-multiplayer-room"
            onClick={handleCreateRoomSubmit}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:brightness-110 text-black font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isLoading ? 'Creating Room...' : 'Create Room & Open Lobby'}</span>
          </button>
        </div>

        {/* JOIN ROOM CARD */}
        <div className="bg-[#0f172a] p-6 sm:p-8 rounded-3xl border border-[#1e293b] flex flex-col justify-between space-y-6 shadow-2xl hover:border-blue-500/40 transition">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg">
                <LogIn className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Join Existing Room</h3>
                <p className="text-xs text-slate-400">Enter the 6-character room code shared by the host.</p>
              </div>
            </div>

            <form onSubmit={handleJoinRoomSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 text-xs uppercase tracking-wider">
                  6-Character Room Code
                </label>
                <input
                  id="input-multiplayer-room-code"
                  type="text"
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IPL749"
                  maxLength={6}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[#05070a] border-2 border-[#1e293b] focus:border-blue-400 text-white font-mono font-black text-xl tracking-widest text-center uppercase transition focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                Make sure you are connected to the internet. Once in the lobby, claim any unpicked IPL franchise.
              </p>
            </form>
          </div>

          <button
            id="btn-join-multiplayer-room"
            onClick={handleJoinRoomSubmit}
            disabled={isLoading || !inputRoomCode.trim()}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 transition transform active:scale-95 ${
              !inputRoomCode.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-blue-500 hover:bg-blue-400 text-white shadow-blue-500/20 cursor-pointer'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Joining Room...' : 'Enter War Room'}</span>
          </button>
        </div>
      </div>

      {/* LIVE PUBLIC ROOMS BROWSER */}
      <div className="multiplayer-live-rooms bg-[#0f172a] p-6 sm:p-8 rounded-3xl border border-[#1e293b] space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Live Public War Rooms & Arenas
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Only real host-created lobby rooms appear here. Started auctions are hidden so every room shown is joinable.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshRooms}
              className="p-2.5 rounded-xl bg-[#05070a] border border-[#1e293b] text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Refresh Room List"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingRooms ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
          {/* Tag filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {(['All', 'Featured', 'High Stakes', 'Speed', 'Casual'] as const).map(tag => (
              <button
                key={tag}
                onClick={() => setRoomFilter(tag)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  roomFilter === tag
                    ? 'bg-[#D4AF37] text-black shadow-md'
                    : 'bg-[#05070a] text-slate-400 hover:text-white border border-[#1e293b]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              placeholder="Search rooms or codes..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#05070a] border border-[#1e293b] text-xs text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRooms.map(room => (
            <div
              key={room.code}
              className="bg-[#05070a] p-4 sm:p-5 rounded-2xl border border-[#1e293b] hover:border-[#D4AF37]/50 transition space-y-4 group shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                      {room.code}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {room.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ⏱ {room.timerSeconds || 15}s
                    </span>
                  </div>
                  <h4 className="font-black text-sm text-white group-hover:text-[#D4AF37] transition">
                    {room.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Host: <span className="text-slate-300 font-bold">{room.hostName}</span> • Pool: <span className="text-slate-300">{room.poolType}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-[#D4AF37] font-mono">
                    ₹{room.purseCr} Cr
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">
                    Purse
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    <strong className="text-white font-bold">{room.playerCount}</strong>/{room.maxPlayers} Franchises
                  </span>
                </div>

                <button
                  id={`btn-join-room-${room.code}`}
                  onClick={() => handleInstantJoin(room.code)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-400 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer transition transform active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>Join Room</span>
                </button>
              </div>
            </div>
          ))}

          {filteredRooms.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
No open live rooms right now. Create a room above and share the code — it will appear here for other real users until the host starts the auction.
            </div>
          )}
        </div>
      </div>

      {/* Feature Highlights Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="glass-panel p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-white">Live Synchronized Bidding</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time paddle raises streamed via Server-Sent Events with audio sound effects and visual feedback.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-white">Server-Authoritative Purses</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            No client spoofing. Purses, overseas quotas, squad sizes, and hammer countdowns are validated server-side.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-sm text-white">Accolades & Post-Auction Ranks</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dynasty Architects, Moneyball Mastermind, and Heist of the Day awards with deep squad inspections.
          </p>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigured={() => {
          setSupabaseActive(isSupabaseConfigured());
          loadOpenRooms();
        }}
      />
    </div>
  );
};

