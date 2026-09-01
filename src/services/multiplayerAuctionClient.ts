import { 
  MultiplayerRoomState, 
  MultiplayerAuctionConfig, 
  MultiplayerClientEvent 
} from '../types/multiplayerAuction';
import { safeFetchJson } from '../utils/safeFetch';

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
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPlayerId: playerId, hostName, config })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to create room' };
    }
    return { success: true, state: res.data.state };
  },

  // Join Room
  async joinRoom(roomCode: string, playerName: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), playerId, playerName })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to join room' };
    }
    return { success: true, state: res.data.state };
  },

  // Select Franchise
  async selectFranchise(roomCode: string, franchiseId: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/select-franchise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), playerId, franchiseId })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to select franchise' };
    }
    return { success: true, state: res.data.state };
  },

  // Toggle Ready
  async toggleReady(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), playerId })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to update ready status' };
    }
    return { success: true, state: res.data.state };
  },

  // Update Config (Host only)
  async updateConfig(roomCode: string, config: Partial<MultiplayerAuctionConfig>): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), hostPlayerId: playerId, config })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to update room config' };
    }
    return { success: true, state: res.data.state };
  },

  // Start Auction (Host only)
  async startAuction(roomCode: string): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), hostPlayerId: playerId })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Failed to start auction' };
    }
    return { success: true, state: res.data.state };
  },

  // Place Bid
  async placeBid(roomCode: string, bidAmountCr: number): Promise<{ success: boolean; state?: MultiplayerRoomState; error?: string }> {
    const { playerId } = getOrCreatePlayerIdentity();
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState; error?: string }>('/api/multiplayer/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: roomCode.trim().toUpperCase(), playerId, bidAmountCr })
    });
    if (!res.ok || !res.data?.success) {
      return { success: false, error: res.data?.error || res.error || 'Bid rejected' };
    }
    auctionAudio.playBidPaddleSound();
    return { success: true, state: res.data.state };
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
    const res = await safeFetchJson<{ success: boolean; state?: MultiplayerRoomState }>(`/api/multiplayer/room/${roomCode.trim().toUpperCase()}`);
    if (res.ok && res.data?.state) {
      return res.data.state;
    }
    return null;
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
