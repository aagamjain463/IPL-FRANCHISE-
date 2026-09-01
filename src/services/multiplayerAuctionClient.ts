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
  SupabaseAuctionService 
} from './supabaseClient';

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

// Multiplayer Client supporting Supabase Realtime + Express Backend + Local Engine Fallback
export const MultiplayerAuctionClient = {
  // Create Room
  async createRoom(hostName: string, config?: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();

    // 1. Supabase Mode (Direct Cloud Persistence & Realtime)
    if (isSupabaseConfigured()) {
      try {
        const localState = localMultiplayerEngine.createRoom(playerId, hostName, config);
        await SupabaseAuctionService.saveRoom(localState);
        await SupabaseAuctionService.broadcastState(localState);
        return { success: true, state: localState };
      } catch (err: any) {
        console.error('[MultiplayerClient] Supabase create error:', err);
      }
    }
    
    // 2. Express Backend API Mode
    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostPlayerId: playerId, hostName, config })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
      if (!res.ok && res.status !== 0 && res.status !== 404 && res.status !== 405) {
        return { success: false, error: res.data?.error || `Failed to create room (HTTP ${res.status})` };
      }
    } catch {
      // offline fallback
    }

    // 3. Fallback to client-side auction room engine
    const localState = localMultiplayerEngine.createRoom(playerId, hostName, config);
    return { success: true, state: localState };
  },

  // Join Room
  async joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    // 1. Supabase Mode
    if (isSupabaseConfigured()) {
      try {
        const remoteRoom = await SupabaseAuctionService.getRoom(code);
        if (!remoteRoom) {
          return { success: false, error: `Room "${code}" not found on Supabase. Please verify the code.` };
        }
        localMultiplayerEngine.setRoom(remoteRoom);
        const joinRes = localMultiplayerEngine.joinRoom(code, playerId, playerName);
        if (joinRes.success && joinRes.state) {
          await SupabaseAuctionService.saveRoom(joinRes.state);
          await SupabaseAuctionService.broadcastState(joinRes.state);
          return { success: true, state: joinRes.state };
        }
        return joinRes;
      } catch (err: any) {
        console.error('[MultiplayerClient] Supabase join error:', err);
      }
    }

    // 2. Express Backend API Mode
    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId, playerName })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
      if (!res.ok && res.status !== 0 && res.status !== 404 && res.status !== 405) {
        return { success: false, error: res.data?.error || `Room "${code}" not found. Please verify the 6-character code.` };
      }
    } catch {
      // offline fallback
    }

    return localMultiplayerEngine.joinRoom(code, playerId, playerName);
  },

  // Select Franchise
  async selectFranchise(roomCode: string, franchiseId: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.selectFranchise(code, playerId, franchiseId);
      if (res.success && res.state) {
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/select-franchise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId, franchiseId })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.selectFranchise(code, playerId, franchiseId);
  },

  // Toggle Ready
  async toggleReady(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.toggleReady(code, playerId);
      if (res.success && res.state) {
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.toggleReady(code, playerId);
  },

  // Update Config (Host only)
  async updateConfig(roomCode: string, config: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.updateConfig(code, playerId, config);
      if (res.success && res.state) {
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId, config })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.updateConfig(code, playerId, config);
  },

  // Start Auction (Host only)
  async startAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.startAuction(code, playerId);
      if (res.success && res.state) {
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.startAuction(code, playerId);
  },

  // Place Bid
  async placeBid(roomCode: string, bidAmountCr: number): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.placeBid(code, playerId, bidAmountCr);
      if (res.success && res.state) {
        auctionAudio.playBidPaddleSound();
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, playerId, bidAmountCr })
      });

      if (res.ok && res.data?.success && res.data.state) {
        auctionAudio.playBidPaddleSound();
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    auctionAudio.playBidPaddleSound();
    return localMultiplayerEngine.placeBid(code, playerId, bidAmountCr);
  },

  // Pause Auction (Host only)
  async pauseAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.pauseAuction(code, playerId);
      if (res.success && res.state) {
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.pauseAuction(code, playerId);
  },

  // Resume Auction (Host only)
  async resumeAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const code = roomCode.trim().toUpperCase();
    const { playerId } = getOrCreatePlayerIdentity();

    if (isSupabaseConfigured()) {
      const res = localMultiplayerEngine.resumeAuction(code, playerId);
      if (res.success && res.state) {
        await SupabaseAuctionService.saveRoom(res.state);
        await SupabaseAuctionService.broadcastState(res.state);
      }
      return res;
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, hostPlayerId: playerId })
      });

      if (res.ok && res.data?.success && res.data.state) {
        return { success: true, state: res.data.state };
      }
      if (res.data?.error) {
        return { success: false, error: res.data.error };
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.resumeAuction(code, playerId);
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

  // Public room browser
  async getOpenRooms(): Promise<any[]> {
    // 1. Supabase Mode
    if (isSupabaseConfigured()) {
      try {
        const rooms = await SupabaseAuctionService.listRooms();
        if (Array.isArray(rooms) && rooms.length > 0) {
          return rooms.filter(r => r.status === 'lobby').map(room => {
            const host = room.participants.find(p => p.id === room.hostId);
            return {
              code: room.roomCode,
              name: room.roomName || `${host?.name || 'Manager'}'s War Room`,
              hostName: host?.name || 'Host',
              purseCr: room.config.startingPurseCr,
              poolType: room.config.poolType,
              playerCount: room.participants.length,
              maxPlayers: room.config.maxPlayers,
              status: 'In Lobby',
              timerSeconds: room.config.timerSeconds,
              tag: room.config.startingPurseCr >= 120 ? 'High Stakes' : (room.config.timerSeconds <= 10 ? 'Speed' : 'Featured')
            };
          });
        }
      } catch (err) {
        console.warn('[MultiplayerClient] Supabase open rooms error:', err);
      }
    }

    // 2. Express Backend API Mode
    try {
      const res = await safeFetchJson<{ success: boolean; rooms?: any[] }>('/api/multiplayer/rooms', { cache: 'no-store' });
      if (res.ok && res.data?.rooms && Array.isArray(res.data.rooms)) {
        return res.data.rooms;
      }
    } catch {
      // fallback
    }

    return localMultiplayerEngine.getOpenRooms();
  },

  // Get Room State
  async getRoomState(roomCode: string): Promise<MultiplayerRoomState | null> {
    const code = roomCode.trim().toUpperCase();

    if (isSupabaseConfigured()) {
      const supabaseState = await SupabaseAuctionService.getRoom(code);
      if (supabaseState) {
        localMultiplayerEngine.setRoom(supabaseState);
        return supabaseState;
      }
    }

    try {
      const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>(`/api/multiplayer/room/${code}`);
      if (res.ok && res.data?.state) {
        return res.data.state;
      }
    } catch {
      // fallback
    }
    return localMultiplayerEngine.getRoom(code);
  },

  // Subscribe to Room Events (Supabase Realtime + SSE fallback + Local engine listeners)
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

    // Listen to local engine events
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

    // If Supabase is active, subscribe to Supabase Realtime Channel
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

    // Express SSE connection (if backend available)
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


