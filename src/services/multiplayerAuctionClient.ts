import { 
  MultiplayerRoomState, 
  MultiplayerAuctionConfig, 
  MultiplayerClientEvent
} from '../types/multiplayerAuction';
import { safeFetchJson } from '../utils/safeFetch';
import { localMultiplayerEngine } from './localMultiplayerEngine';
import { 
  isSupabaseConfigured, 
  getSupabaseClient, 
  fetchServerSupabaseConfig,
  SupabaseAuctionService 
} from './supabaseClient';
import { CloudRelayService } from './cloudRelayService';

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

// Helper to broadcast state changes across all available transports (Supabase, Cloud Relay, Express, Local)
async function syncRoomStateAcrossTransports(state: MultiplayerRoomState, options?: { skipSupabase?: boolean }) {
  if (!state?.roomCode) return;
  const code = state.roomCode.trim().toUpperCase();

  // 1. Local Engine
  localMultiplayerEngine.setRoom(state);

  // 2. Global Cloud Relay
  CloudRelayService.publishRoomState(state).catch(() => {});

  // 3. Supabase (if configured)
  if (!options?.skipSupabase && isSupabaseConfigured()) {
    try {
      await SupabaseAuctionService.saveRoom(state);
      await SupabaseAuctionService.broadcastState(state);
    } catch {
      // ignore
    }
  }
}

// Multiplayer Client supporting Cloud Relay + Supabase Realtime + Express Backend + Local Engine Fallback
export const MultiplayerAuctionClient = {
  // Create Room
  async createRoom(hostName: string, config?: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    await fetchServerSupabaseConfig().catch(() => {});
    const { playerId } = getOrCreatePlayerIdentity();
    const cleanHostName = hostName?.trim() || 'Tactician';

    // Initialize local state
    const localState = localMultiplayerEngine.createRoom(playerId, cleanHostName, config);
    const code = localState.roomCode.trim().toUpperCase();

    // 1. Sync to Express Backend API with matching roomCode & state
    try {
      await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>('/api/multiplayer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hostPlayerId: playerId, 
          hostName: cleanHostName, 
          config, 
          roomCode: code,
          state: localState 
        })
      });
    } catch {
      // ignore
    }

    // 2. Sync to Supabase (if configured)
    if (isSupabaseConfigured()) {
      try {
        await SupabaseAuctionService.saveRoom(localState);
        await SupabaseAuctionService.broadcastState(localState);
      } catch (err: any) {
        console.warn('[MultiplayerClient] Supabase create error:', err);
      }
    }

    // 3. Sync to Cloud Relay immediately
    CloudRelayService.publishRoomState(localState).catch(() => {});

    return { success: true, state: localState };
  },

  // Join Room
  async joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    await fetchServerSupabaseConfig().catch(() => {});
    if (!roomCode || !roomCode.trim()) {
      return { success: false, error: 'Please enter a valid room code.' };
    }
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();
    const cleanPlayerName = playerName?.trim() || 'Manager';

    // 1. Try Supabase Mode First (Global Cloud Database)
    if (isSupabaseConfigured()) {
      try {
        const remoteRoom = await SupabaseAuctionService.getRoom(code);
        if (remoteRoom) {
          localMultiplayerEngine.setRoom(remoteRoom);
          const joinRes = localMultiplayerEngine.joinRoom(code, playerId, cleanPlayerName);
          if (joinRes.success && joinRes.state) {
            await syncRoomStateAcrossTransports(joinRes.state);
            return { success: true, state: joinRes.state };
          }
          if (!joinRes.success && joinRes.error) {
            return joinRes;
          }
        }
      } catch (err: any) {
        console.warn('[MultiplayerClient] Supabase join check error:', err);
      }
    }

    // 2. Try Express Backend API Mode
    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId, playerName: cleanPlayerName })
      });

      if (res.ok && res.data?.success && res.data.state) {
        await syncRoomStateAcrossTransports(res.data.state);
        return { success: true, state: res.data.state };
      }
    } catch {
      // offline fallback
    }

    // 3. Try Cloud Relay Mode (Global peer discovery)
    try {
      const cloudRoom = await CloudRelayService.fetchRoomState(code);
      if (cloudRoom) {
        localMultiplayerEngine.setRoom(cloudRoom);
        const joinRes = localMultiplayerEngine.joinRoom(code, playerId, cleanPlayerName);
        if (joinRes.success && joinRes.state) {
          await syncRoomStateAcrossTransports(joinRes.state);
          return { success: true, state: joinRes.state };
        }
        if (!joinRes.success && joinRes.error) {
          return joinRes;
        }
      }
    } catch {
      // ignore
    }

    // 4. Try Local Engine / LocalStorage / BroadcastChannel
    const localRoom = localMultiplayerEngine.getRoom(code);
    if (localRoom) {
      const joinRes = localMultiplayerEngine.joinRoom(code, playerId, cleanPlayerName);
      if (joinRes.success && joinRes.state) {
        await syncRoomStateAcrossTransports(joinRes.state);
        return { success: true, state: joinRes.state };
      }
      return joinRes;
    }

    return { 
      success: false, 
      error: `Room "${code}" does not exist or has finished. Please double check the 6-character room code or ask the host for the active code.` 
    };
  },

  // Select Franchise
  async selectFranchise(roomCode: string, franchiseId: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    // Update local engine first for instant UI response
    const localRes = localMultiplayerEngine.selectFranchise(code, playerId, franchiseId);
    if (localRes.success && localRes.state) {
      syncRoomStateAcrossTransports(localRes.state);
    }

    // Also notify Express backend if available
    try {
      safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>('/api/multiplayer/select-franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId, franchiseId })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
  },

  // Toggle Ready
  async toggleReady(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    const localRes = localMultiplayerEngine.toggleReady(code, playerId);
    if (localRes.success && localRes.state) {
      syncRoomStateAcrossTransports(localRes.state);
    }

    try {
      safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>('/api/multiplayer/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
  },

  // Update Config (Host only)
  async updateConfig(roomCode: string, config: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    const localRes = localMultiplayerEngine.updateConfig(code, playerId, config);
    if (localRes.success && localRes.state) {
      syncRoomStateAcrossTransports(localRes.state);
    }

    try {
      safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>('/api/multiplayer/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId, config })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
  },

  // Start Auction (Host only)
  async startAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    const localRes = localMultiplayerEngine.startAuction(code, playerId);
    if (localRes.success && localRes.state) {
      syncRoomStateAcrossTransports(localRes.state);
    }

    try {
      safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>('/api/multiplayer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
  },

  // Place Bid
  async placeBid(roomCode: string, bidAmountCr: number): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    const localRes = localMultiplayerEngine.placeBid(code, playerId, bidAmountCr);
    if (localRes.success && localRes.state) {
      auctionAudio.playBidPaddleSound();
      syncRoomStateAcrossTransports(localRes.state);
    }

    try {
      safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>('/api/multiplayer/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId, bidAmountCr })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
  },

  // Pause Auction (Host only)
  async pauseAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    const localRes = localMultiplayerEngine.pauseAuction(code, playerId);
    if (localRes.success && localRes.state) {
      syncRoomStateAcrossTransports(localRes.state);
    }

    try {
      safeFetchJson('/api/multiplayer/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
  },

  // Resume Auction (Host only)
  async resumeAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    const localRes = localMultiplayerEngine.resumeAuction(code, playerId);
    if (localRes.success && localRes.state) {
      syncRoomStateAcrossTransports(localRes.state);
    }

    try {
      safeFetchJson('/api/multiplayer/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
      }).catch(() => {});
    } catch {
      // ignore
    }

    return localRes;
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

  // Public room browser: collects rooms from all transports and merges deduplicated
  async getOpenRooms(): Promise<any[]> {
    await fetchServerSupabaseConfig().catch(() => {});
    const roomsMap = new Map<string, any>();

    // 1. Fetch from Supabase (if configured) - Primary Cloud Source
    if (isSupabaseConfigured()) {
      try {
        const supRooms = await SupabaseAuctionService.listRooms();
        if (Array.isArray(supRooms)) {
          supRooms.filter(r => r.status === 'lobby').forEach(room => {
            const host = room.participants.find(p => p.id === room.hostId);
            const code = room.roomCode.toUpperCase();
            roomsMap.set(code, {
              code,
              name: room.roomName || `${host?.name || 'Manager'}'s War Room`,
              hostName: host?.name || 'Host',
              purseCr: room.config.startingPurseCr,
              poolType: room.config.poolType,
              playerCount: room.participants.length,
              maxPlayers: room.config.maxPlayers,
              status: 'In Lobby',
              timerSeconds: room.config.timerSeconds,
              tag: room.config.startingPurseCr >= 120 ? 'High Stakes' : (room.config.timerSeconds <= 10 ? 'Speed' : 'Featured')
            });
          });
        }
      } catch (err) {
        console.warn('[MultiplayerClient] Supabase open rooms error:', err);
      }
    }

    // 2. Fetch from Express Backend API
    try {
      const res = await safeFetchJson<{ success: boolean; rooms?: any[] }>('/api/multiplayer/rooms', { cache: 'no-store' });
      if (res.ok && Array.isArray(res.data?.rooms)) {
        res.data.rooms.forEach(r => {
          if (r?.code && !roomsMap.has(r.code.toUpperCase())) {
            roomsMap.set(r.code.toUpperCase(), r);
          }
        });
      }
    } catch {
      // ignore
    }

    // 3. Fetch from Global Cloud Relay
    try {
      const relayRooms = await CloudRelayService.listOpenRooms();
      if (Array.isArray(relayRooms)) {
        relayRooms.forEach(r => {
          if (r?.code && !roomsMap.has(r.code.toUpperCase())) {
            roomsMap.set(r.code.toUpperCase(), r);
          }
        });
      }
    } catch {
      // ignore
    }

    // 4. Fetch from Local Engine & LocalStorage
    try {
      const localRooms = localMultiplayerEngine.getOpenRooms();
      if (Array.isArray(localRooms)) {
        localRooms.forEach(r => {
          if (r?.code && !roomsMap.has(r.code.toUpperCase())) {
            roomsMap.set(r.code.toUpperCase(), r);
          }
        });
      }
    } catch {
      // ignore
    }

    return Array.from(roomsMap.values());
  },

  // Get Room State Snapshot
  async getRoomState(roomCode: string): Promise<MultiplayerRoomState | null> {
    if (!roomCode) return null;
    await fetchServerSupabaseConfig().catch(() => {});
    const code = roomCode.trim().toUpperCase();

    // 1. Supabase Mode
    if (isSupabaseConfigured()) {
      const supabaseState = await SupabaseAuctionService.getRoom(code);
      if (supabaseState) {
        localMultiplayerEngine.setRoom(supabaseState);
        return supabaseState;
      }
    }

    // 2. Express Backend API Mode
    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>(`/api/multiplayer/room/${code}`);
      if (res.ok && res.data?.state) {
        localMultiplayerEngine.setRoom(res.data.state);
        return res.data.state;
      }
    } catch {
      // fallback
    }

    // 3. Cloud Relay Mode
    try {
      const cloudState = await CloudRelayService.fetchRoomState(code);
      if (cloudState) {
        localMultiplayerEngine.setRoom(cloudState);
        return cloudState;
      }
    } catch {
      // ignore
    }

    return localMultiplayerEngine.getRoom(code);
  },

  // Subscribe to Room Events (Multi-channel: Local + Cloud Relay + Supabase Realtime + Express SSE)
  subscribeRoomEvents(
    roomCode: string, 
    onEvent: (event: MultiplayerClientEvent) => void,
    onConnectionChange?: (connected: boolean) => void
  ): () => void {
    const code = roomCode.trim().toUpperCase();
    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isCleanedUp = false;

    // 1. Listen to Local Engine Events (including BroadcastChannel)
    const unsubscribeLocal = localMultiplayerEngine.subscribe(code, (ev) => {
      if (isCleanedUp) return;
      if (ev.type === 'BID_PLACED') {
        auctionAudio.playBidPaddleSound();
      } else if (ev.type === 'LOT_SOLD') {
        auctionAudio.playGavelSound();
        auctionAudio.playSoldFanfare();
      } else if (ev.type === 'LOT_UNSOLD') {
        auctionAudio.playGavelSound();
      }
      onEvent(ev);
    });

    // 2. Subscribe to Global Cloud Relay
    const unsubscribeCloudRelay = CloudRelayService.subscribe(
      code,
      (state) => {
        if (isCleanedUp) return;
        localMultiplayerEngine.setRoom(state);
        onEvent({ type: 'STATE_UPDATE', state });
        onConnectionChange?.(true);
      },
      (event) => {
        if (isCleanedUp) return;
        onEvent(event);
      }
    );

    // 3. If Supabase is active, subscribe to Supabase Realtime Channel
    let supabaseChannel: any = null;
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        supabaseChannel = supabase.channel(`room:${code}`)
          .on('broadcast', { event: 'STATE_UPDATE' }, (payload: any) => {
            if (isCleanedUp) return;
            if (payload?.payload?.state) {
              const state = payload.payload.state as MultiplayerRoomState;
              localMultiplayerEngine.setRoom(state);
              onEvent({ type: 'STATE_UPDATE', state });
            }
          })
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'ipl_auction_rooms', 
            filter: `room_code=eq.${code}` 
          }, (payload: any) => {
            if (isCleanedUp) return;
            if (payload?.new && payload.new.state) {
              const state = payload.new.state as MultiplayerRoomState;
              localMultiplayerEngine.setRoom(state);
              onEvent({ type: 'STATE_UPDATE', state });
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              onConnectionChange?.(true);
            }
          });
      } catch (err) {
        console.warn('[Supabase] Subscription error:', err);
      }
    }

    // 4. Express SSE connection (if backend available)
    const connectSSE = () => {
      if (isCleanedUp || isSupabaseConfigured()) return;
      try {
        if (eventSource) {
          eventSource.close();
        }
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
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isCleanedUp && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 3000);
          }
        };
      } catch {
        onConnectionChange?.(true);
      }
    };

    connectSSE();

    // Active state sync polling (every 1.5s) to guarantee instantaneous lobby and lot synchronization
    fallbackInterval = setInterval(async () => {
      if (isCleanedUp) return;
      const state = await MultiplayerAuctionClient.getRoomState(code);
      if (state) {
        onEvent({ type: 'STATE_UPDATE', state });
      }
    }, 1500);

    return () => {
      isCleanedUp = true;
      unsubscribeLocal();
      unsubscribeCloudRelay();
      if (supabaseChannel && supabase) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {
          // ignore
        }
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }
    };
  }
};


