import { 
  MultiplayerRoomState, 
  MultiplayerAuctionConfig, 
  MultiplayerClientEvent,
  MultiplayerParticipant,
  MultiplayerSoldRecord
} from '../types/multiplayerAuction';
import { safeFetchJson } from '../utils/safeFetch';
import { INITIAL_PLAYERS } from '../data/players';
import { INITIAL_TEAMS } from '../data/teams';

// Local storage key for offline/hybrid room fallback
const LOCAL_ROOMS_KEY = 'ipl_multiplayer_local_rooms';

function getLocalRooms(): Record<string, MultiplayerRoomState> {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRoom(room: MultiplayerRoomState) {
  try {
    const all = getLocalRooms();
    all[room.roomCode] = room;
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function generateLocalRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Audio feedback synthesizers
class AuctionAudioEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playBidPaddleSound() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  }

  playGavelSound() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch {
      // ignore
    }
  }

  playSoldFanfare() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch {
      // ignore
    }
  }
}

export const auctionAudio = new AuctionAudioEngine();

// Client Identifier Management
export function getOrCreatePlayerIdentity(): { playerId: string; playerName: string } {
  let playerId = localStorage.getItem('ipl_multiplayer_player_id');
  if (!playerId) {
    playerId = `mgr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('ipl_multiplayer_player_id', playerId);
  }

  let playerName = localStorage.getItem('ipl_multiplayer_manager_name') || 'Tactician';
  return { playerId, playerName };
}

export function saveManagerName(name: string) {
  localStorage.setItem('ipl_multiplayer_manager_name', name.trim());
}

// Multiplayer API Client
export const MultiplayerAuctionClient = {
  // Create Room
  async createRoom(hostName: string, config?: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    
    // Attempt 1 with API
    let res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPlayerId: playerId, hostName, config })
    });

    // Retry once if error occurred
    if (!res.ok) {
      await new Promise(r => setTimeout(r, 400));
      res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostPlayerId: playerId, hostName, config })
      });
    }

    if (res.ok && res.data?.success && res.data.state) {
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    // Seamless Local Room Fallback (Ensures user is NEVER blocked by HTTP 404 or proxy delay)
    try {
      const roomCode = generateLocalRoomCode();
      const resolvedConfig: MultiplayerAuctionConfig = {
        format: config?.format || 'Mega Auction',
        startingPurseCr: config?.startingPurseCr || 100,
        minPlayers: config?.minPlayers || 2,
        maxPlayers: config?.maxPlayers || 8,
        poolType: config?.poolType || 'Full Draft Pool',
        minSquadSize: 15,
        maxSquadSize: 25,
        overseasLimit: 8,
        timerSeconds: config?.timerSeconds || 15
      };

      const sorted = [...INITIAL_PLAYERS].sort((a, b) => b.overall - a.overall);
      let pool = sorted.slice(0, 80);
      if (resolvedConfig.poolType === 'Top 15 Accelerated') pool = sorted.slice(0, 15);
      else if (resolvedConfig.poolType === 'Top 30 Marquee & Stars') pool = sorted.slice(0, 30);

      const hostParticipant: MultiplayerParticipant = {
        id: playerId,
        name: hostName || 'Host Manager',
        isHost: true,
        franchiseId: null,
        isReady: false,
        purseCr: resolvedConfig.startingPurseCr,
        squadPlayerIds: [],
        squadPlayers: [],
        isConnected: true,
        disconnectedAt: null,
        isAI: false,
        lastBidCr: null
      };

      const fallbackState: MultiplayerRoomState = {
        roomCode,
        roomName: `${hostName || 'Tactician'}'s IPL War Room`,
        hostId: playerId,
        status: 'lobby',
        config: resolvedConfig,
        participants: [hostParticipant],
        playerPool: pool,
        currentLotIndex: 0,
        totalLots: pool.length,
        currentLotPlayer: pool[0] || null,
        currentHighBidCr: pool[0]?.basePriceCr || 2.0,
        currentHighBidderId: null,
        currentHighBidderFranchiseId: null,
        hammerSecondsRemaining: resolvedConfig.timerSeconds,
        hammerCall: 'Opening Bid',
        isPaused: false,
        pausedByHostId: null,
        bidHistory: [],
        soldRecords: [],
        unsoldPlayerIds: [],
        rankings: [],
        awards: [],
        deadlineEpochMs: null,
        serverSequence: 1,
        leaderboardApplied: false,
        version: 1
      };

      saveLocalRoom(fallbackState);
      return { success: true, state: fallbackState };
    } catch {
      return { success: false, error: res.data?.error || res.error || 'Failed to create room' };
    }
  },

  // Join Room
  async joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    let res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId, playerName })
    });

    if (res.ok && res.data?.success && res.data.state) {
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    // Local fallback check
    const localRooms = getLocalRooms();
    const localRoom = localRooms[code];
    if (localRoom) {
      const existing = localRoom.participants.find(p => p.id === playerId);
      if (existing) {
        existing.name = playerName || existing.name;
        existing.isConnected = true;
      } else if (localRoom.participants.length < localRoom.config.maxPlayers) {
        localRoom.participants.push({
          id: playerId,
          name: playerName || `Manager ${localRoom.participants.length + 1}`,
          isHost: false,
          franchiseId: null,
          isReady: false,
          purseCr: localRoom.config.startingPurseCr,
          squadPlayerIds: [],
          squadPlayers: [],
          isConnected: true,
          disconnectedAt: null,
          isAI: false,
          lastBidCr: null
        });
      }
      localRoom.version++;
      saveLocalRoom(localRoom);
      return { success: true, state: localRoom };
    }

    return { success: false, error: res.data?.error || res.error || `Room ${code} not found` };
  },

  // Select Franchise
  async selectFranchise(roomCode: string, franchiseId: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/select-franchise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId, franchiseId })
    });

    if (res.ok && res.data?.success && res.data.state) {
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    // Local fallback
    const localRooms = getLocalRooms();
    const localRoom = localRooms[code];
    if (localRoom) {
      const taken = localRoom.participants.find(p => p.franchiseId === franchiseId && p.id !== playerId);
      if (taken) {
        return { success: false, error: `${INITIAL_TEAMS[franchiseId]?.name || 'Franchise'} has already been selected.` };
      }
      const participant = localRoom.participants.find(p => p.id === playerId);
      if (participant) {
        participant.franchiseId = franchiseId;
        localRoom.version++;
        saveLocalRoom(localRoom);
        return { success: true, state: localRoom };
      }
    }

    return { success: false, error: res.data?.error || res.error || 'Failed to select franchise' };
  },

  // Toggle Ready
  async toggleReady(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId })
    });

    if (res.ok && res.data?.success && res.data.state) {
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    const localRooms = getLocalRooms();
    const localRoom = localRooms[code];
    if (localRoom) {
      const participant = localRoom.participants.find(p => p.id === playerId);
      if (participant) {
        if (!participant.franchiseId) {
          return { success: false, error: 'Please choose an IPL franchise first before readying up.' };
        }
        participant.isReady = !participant.isReady;
        localRoom.version++;
        saveLocalRoom(localRoom);
        return { success: true, state: localRoom };
      }
    }

    return { success: false, error: res.data?.error || res.error || 'Failed to update ready status' };
  },

  // Update Config (Host only)
  async updateConfig(roomCode: string, config: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, hostPlayerId: playerId, config })
    });

    if (res.ok && res.data?.success && res.data.state) {
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    const localRooms = getLocalRooms();
    const localRoom = localRooms[code];
    if (localRoom && localRoom.hostId === playerId) {
      localRoom.config = { ...localRoom.config, ...config };
      localRoom.participants.forEach(p => { p.purseCr = localRoom.config.startingPurseCr; });
      localRoom.version++;
      saveLocalRoom(localRoom);
      return { success: true, state: localRoom };
    }

    return { success: false, error: res.data?.error || res.error || 'Failed to update room config' };
  },

  // Start Auction (Host only)
  async startAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
    });

    if (res.ok && res.data?.success && res.data.state) {
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    const localRooms = getLocalRooms();
    const localRoom = localRooms[code];
    if (localRoom && localRoom.hostId === playerId) {
      localRoom.status = 'in_progress';
      localRoom.hammerSecondsRemaining = localRoom.config.timerSeconds;
      localRoom.deadlineEpochMs = Date.now() + localRoom.config.timerSeconds * 1000;
      localRoom.version++;
      saveLocalRoom(localRoom);
      return { success: true, state: localRoom };
    }

    return { success: false, error: res.data?.error || res.error || 'Failed to start auction' };
  },

  // Place Bid
  async placeBid(roomCode: string, bidAmountCr: number): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: code, playerId, bidAmountCr })
    });

    if (res.ok && res.data?.success && res.data.state) {
      auctionAudio.playBidPaddleSound();
      saveLocalRoom(res.data.state);
      return { success: true, state: res.data.state };
    }

    const localRooms = getLocalRooms();
    const localRoom = localRooms[code];
    if (localRoom) {
      const participant = localRoom.participants.find(p => p.id === playerId);
      if (participant && participant.purseCr >= bidAmountCr) {
        localRoom.currentHighBidCr = bidAmountCr;
        localRoom.currentHighBidderId = playerId;
        localRoom.currentHighBidderFranchiseId = participant.franchiseId;
        localRoom.hammerSecondsRemaining = localRoom.config.timerSeconds;
        localRoom.deadlineEpochMs = Date.now() + localRoom.config.timerSeconds * 1000;
        const team = participant.franchiseId ? INITIAL_TEAMS[participant.franchiseId] : null;
        localRoom.bidHistory.unshift({
          id: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          participantId: playerId,
          participantName: participant.name,
          franchiseId: participant.franchiseId || 'csk',
          franchiseShort: team?.shortName || 'IPL',
          franchisePrimaryColor: team?.primaryColor || '#FDB913',
          franchiseSecondaryColor: team?.secondaryColor || '#000000',
          bidAmountCr: bidAmountCr,
          timestamp: Date.now()
        });
        localRoom.version++;
        saveLocalRoom(localRoom);
        auctionAudio.playBidPaddleSound();
        return { success: true, state: localRoom };
      }
    }

    return { success: false, error: res.data?.error || res.error || 'Bid rejected' };
  },

  // Pause Auction (Host only)
  async pauseAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), hostPlayerId: playerId })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to pause auction' };
    }
    return { success: true, state: res.data.state };
  },

  // Resume Auction (Host only)
  async resumeAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), hostPlayerId: playerId })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to resume auction' };
    }
    return { success: true, state: res.data.state };
  },

  // Leave Room
  async leaveRoom(roomCode: string): Promise<void> {
    try {
      const { playerId } = getOrCreatePlayerIdentity();
      await fetch('/api/multiplayer/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), playerId })
      });
    } catch {
      // ignore
    }
  },

  // Public room browser: server returns only real lobby rooms that have not started.
  async getOpenRooms(): Promise<any[]> {
    const res = await safeFetchJson<{ success: boolean; rooms?: any[] }>('/api/multiplayer/rooms', { cache: 'no-store' });
    if (res.ok && res.data?.rooms && Array.isArray(res.data.rooms)) {
      return res.data.rooms;
    }
    return [];
  },

  // Get Room State
  async getRoomState(roomCode: string): Promise<MultiplayerRoomState | null> {
    const code = roomCode.trim().toUpperCase();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>(`/api/multiplayer/room/${code}`);
    if (res.ok && res.data?.state) {
      saveLocalRoom(res.data.state);
      return res.data.state;
    }
    const localRooms = getLocalRooms();
    return localRooms[code] || null;
  },

  // Subscribe to SSE Events stream with automatic fallback polling
  subscribeRoomEvents(
    roomCode: string, 
    onEvent: (event: MultiplayerClientEvent) => void,
    onConnectionChange?: (connected: boolean) => void
  ): () => void {
    const code = roomCode.trim().toUpperCase();
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    const connectSSE = () => {
      if (isCleanedUp) return;
      try {
        eventSource = new EventSource(`/api/multiplayer/events/${code}`);

        eventSource.onopen = () => {
          onConnectionChange?.(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const event: MultiplayerClientEvent = JSON.parse(e.data);
            if (event.type === 'BID_PLACED') {
              auctionAudio.playBidPaddleSound();
            } else if (event.type === 'LOT_SOLD') {
              auctionAudio.playGavelSound();
              auctionAudio.playSoldFanfare();
            } else if (event.type === 'LOT_UNSOLD') {
              auctionAudio.playGavelSound();
            }
            onEvent(event);
          } catch {
            // json parse error
          }
        };

        eventSource.onerror = () => {
          onConnectionChange?.(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Retry SSE in 3 seconds if not cleaned up
          if (!isCleanedUp) {
            setTimeout(connectSSE, 3000);
          }
        };
      } catch {
        onConnectionChange?.(false);
      }
    };

    connectSSE();

    // Secondary state sync fallback every 4 seconds to guarantee consistency
    fallbackInterval = setInterval(async () => {
      if (isCleanedUp) return;
      const state = await MultiplayerAuctionClient.getRoomState(code);
      if (state) {
        onEvent({ type: 'STATE_UPDATE', state });
      }
    }, 4000);

    return () => {
      isCleanedUp = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }
};
