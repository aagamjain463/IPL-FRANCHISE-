import { MultiplayerRoomState, MultiplayerClientEvent } from '../types/multiplayerAuction';

// Public zero-config real-time relay topic prefix
const RELAY_BASE = 'https://ntfy.sh';
const LOBBY_TOPIC = 'ipl_auction_live_lobby_v2';

interface RelayMessage {
  type: 'ROOM_ANNOUNCE' | 'ROOM_STATE' | 'EVENT';
  roomCode: string;
  state?: MultiplayerRoomState;
  event?: MultiplayerClientEvent;
  timestamp: number;
}

// In-memory cache of rooms discovered from global cloud relay
const discoveredRelayRooms = new Map<string, { state: MultiplayerRoomState; lastSeen: number }>();

export const CloudRelayService = {
  // Announce or broadcast room state to global cloud relay
  async publishRoomState(state: MultiplayerRoomState): Promise<void> {
    if (!state?.roomCode) return;
    const code = state.roomCode.trim().toUpperCase();

    // Cache locally
    discoveredRelayRooms.set(code, { state, lastSeen: Date.now() });

    try {
      const payload: RelayMessage = {
        type: 'ROOM_STATE',
        roomCode: code,
        state,
        timestamp: Date.now()
      };

      // 1. Send state to specific room topic
      fetch(`${RELAY_BASE}/ipl_auction_room_${code.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});

      // 2. Announce to public lobby topic if in lobby
      if (state.status === 'lobby') {
        const lobbyMsg: RelayMessage = {
          type: 'ROOM_ANNOUNCE',
          roomCode: code,
          state,
          timestamp: Date.now()
        };

        fetch(`${RELAY_BASE}/${LOBBY_TOPIC}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lobbyMsg)
        }).catch(() => {});
      }
    } catch {
      // ignore network glitches
    }
  },

  // Fetch room state from cloud relay
  async fetchRoomState(roomCode: string): Promise<MultiplayerRoomState | null> {
    const code = roomCode.trim().toUpperCase();
    
    // Check cache first if fresh (< 15 seconds old)
    const cached = discoveredRelayRooms.get(code);
    if (cached && Date.now() - cached.lastSeen < 15000) {
      return cached.state;
    }

    try {
      // Poll latest message from room topic
      const res = await fetch(`${RELAY_BASE}/ipl_auction_room_${code.toLowerCase()}/json?poll=1&since=10m`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) return cached?.state || null;
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      
      let latestState: MultiplayerRoomState | null = null;
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          const messageObj = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed;
          if (messageObj?.state && messageObj?.roomCode === code) {
            latestState = messageObj.state;
            break;
          }
        } catch {
          // ignore line parse
        }
      }

      if (latestState) {
        discoveredRelayRooms.set(code, { state: latestState, lastSeen: Date.now() });
        return latestState;
      }
    } catch {
      // ignore
    }

    return cached?.state || null;
  },

  // List public open rooms discovered from global cloud lobby
  async listOpenRooms(): Promise<any[]> {
    const now = Date.now();
    
    // Clean up rooms older than 15 minutes
    for (const [code, entry] of discoveredRelayRooms.entries()) {
      if (now - entry.lastSeen > 900000 || entry.state.status !== 'lobby') {
        discoveredRelayRooms.delete(code);
      }
    }

    try {
      const res = await fetch(`${RELAY_BASE}/${LOBBY_TOPIC}/json?poll=1&since=10m`, {
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);

        lines.forEach(line => {
          try {
            const parsed = JSON.parse(line);
            const msg = typeof parsed.message === 'string' ? JSON.parse(parsed.message) : parsed;
            if (msg?.state && msg.state.roomCode && msg.state.status === 'lobby') {
              const code = msg.state.roomCode.trim().toUpperCase();
              discoveredRelayRooms.set(code, { state: msg.state, lastSeen: msg.timestamp || Date.now() });
            }
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore
    }

    const openList: any[] = [];
    discoveredRelayRooms.forEach(({ state }) => {
      if (state.status === 'lobby') {
        const host = state.participants.find(p => p.id === state.hostId) || state.participants[0];
        openList.push({
          code: state.roomCode,
          name: state.roomName || `${host?.name || 'Manager'}'s War Room`,
          hostName: host?.name || 'Host',
          purseCr: state.config.startingPurseCr,
          poolType: state.config.poolType,
          playerCount: state.participants.length,
          maxPlayers: state.config.maxPlayers,
          status: 'In Lobby',
          timerSeconds: state.config.timerSeconds,
          tag: state.config.startingPurseCr >= 120 ? 'High Stakes' : (state.config.timerSeconds <= 10 ? 'Speed' : 'Featured')
        });
      }
    });

    return openList;
  },

  // Subscribe to real-time events for a specific room
  subscribe(
    roomCode: string, 
    onState: (state: MultiplayerRoomState) => void,
    onEvent?: (event: MultiplayerClientEvent) => void
  ): () => void {
    const code = roomCode.trim().toUpperCase();
    let es: EventSource | null = null;
    let pollTimer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    try {
      es = new EventSource(`${RELAY_BASE}/ipl_auction_room_${code.toLowerCase()}/sse`);

      es.onmessage = (e) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(e.data);
          const parsed = typeof data.message === 'string' ? JSON.parse(data.message) : data;
          if (parsed?.state && parsed.roomCode === code) {
            discoveredRelayRooms.set(code, { state: parsed.state, lastSeen: Date.now() });
            onState(parsed.state);
          }
          if (parsed?.event && onEvent) {
            onEvent(parsed.event);
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => {
        // SSE error, fallback to periodic poll
      };
    } catch {
      // EventSource not supported
    }

    // Backup polling every 2.5 seconds
    pollTimer = setInterval(async () => {
      if (isCancelled) return;
      const state = await CloudRelayService.fetchRoomState(code);
      if (state && !isCancelled) {
        onState(state);
      }
    }, 2500);

    return () => {
      isCancelled = true;
      if (es) {
        es.close();
        es = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
  }
};
