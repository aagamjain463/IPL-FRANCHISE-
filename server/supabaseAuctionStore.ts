import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MultiplayerRoomState } from '../src/types/multiplayerAuction.js';

interface SupabaseServerCredentials {
  url: string;
  key: string;
}

type PublicRoomTag = 'Featured' | 'High Stakes' | 'Speed' | 'Casual';

export interface ServerPublicRoomItem {
  code: string;
  name: string;
  hostName: string;
  purseCr: number;
  poolType: string;
  playerCount: number;
  maxPlayers: number;
  status: 'In Lobby';
  timerSeconds?: number;
  tag: PublicRoomTag;
  createdVersion?: number;
  updatedAt?: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

function getServerSupabaseCredentials(): SupabaseServerCredentials | null {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  // Prefer a service-role key on the server when available so RLS policy drift cannot
  // strand live rooms. Fall back to anon for projects that only configured public envs.
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key || !url.startsWith('https://')) return null;
  return { url, key };
}

function getClient(): SupabaseClient | null {
  const creds = getServerSupabaseCredentials();
  if (!creds) return null;

  if (cachedClient && cachedUrl === creds.url && cachedKey === creds.key) {
    return cachedClient;
  }

  cachedClient = createClient(creds.url, creds.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        'X-Client-Info': 'ipl-franchise-server-auction-store'
      }
    }
  });
  cachedUrl = creds.url;
  cachedKey = creds.key;
  return cachedClient;
}

function normalizeRoomCode(roomCode: string): string {
  return String(roomCode || '').trim().toUpperCase();
}

function normalizeRoomState(state: MultiplayerRoomState | null | undefined): MultiplayerRoomState | null {
  if (!state || typeof state !== 'object' || !state.roomCode || !state.config) return null;
  return {
    ...state,
    roomCode: normalizeRoomCode(state.roomCode),
    participants: Array.isArray(state.participants) ? state.participants : [],
    playerPool: Array.isArray(state.playerPool) ? state.playerPool : [],
    bidHistory: Array.isArray(state.bidHistory) ? state.bidHistory : [],
    soldRecords: Array.isArray(state.soldRecords) ? state.soldRecords : [],
    unsoldPlayerIds: Array.isArray(state.unsoldPlayerIds) ? state.unsoldPlayerIds : [],
    rankings: Array.isArray(state.rankings) ? state.rankings : [],
    awards: Array.isArray(state.awards) ? state.awards : [],
    version: Number(state.version || 1),
    serverSequence: Number(state.serverSequence || 1)
  };
}

function getRoomTag(state: MultiplayerRoomState): PublicRoomTag {
  if (state.config.timerSeconds <= 10) return 'Speed';
  if (state.config.startingPurseCr >= 120 || state.config.poolType === 'Top 30 Marquee & Stars') return 'High Stakes';
  if (state.config.format === 'Mega Auction') return 'Featured';
  return 'Casual';
}

export function toServerPublicRoomItem(state: MultiplayerRoomState, updatedAt?: string): ServerPublicRoomItem {
  const host = state.participants.find(p => p.id === state.hostId) || state.participants[0];
  return {
    code: normalizeRoomCode(state.roomCode),
    name: state.roomName || `${host?.name || 'Manager'}'s War Room`,
    hostName: host?.name || 'Host Manager',
    purseCr: state.config.startingPurseCr,
    poolType: state.config.poolType,
    playerCount: state.participants.length,
    maxPlayers: state.config.maxPlayers,
    status: 'In Lobby',
    tag: getRoomTag(state),
    timerSeconds: state.config.timerSeconds,
    createdVersion: state.version,
    updatedAt
  };
}

export const SupabaseAuctionStore = {
  isConfigured(): boolean {
    return Boolean(getServerSupabaseCredentials());
  },

  async saveRoom(state: MultiplayerRoomState): Promise<boolean> {
    const supabase = getClient();
    const normalizedState = normalizeRoomState(state);
    if (!supabase || !normalizedState) return false;

    try {
      const host = normalizedState.participants.find(p => p.id === normalizedState.hostId) || normalizedState.participants[0];
      const { error } = await supabase
        .from('ipl_auction_rooms')
        .upsert({
          room_code: normalizedState.roomCode,
          host_id: normalizedState.hostId,
          host_name: host?.name || 'Host Manager',
          status: normalizedState.status,
          participants_count: normalizedState.participants.length,
          is_public: normalizedState.status === 'lobby',
          state: normalizedState,
          updated_at: new Date().toISOString()
        }, { onConflict: 'room_code' });

      if (error) {
        console.error('[Server Supabase] Failed to save auction room:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Server Supabase] Save room exception:', err);
      return false;
    }
  },

  async getRoom(roomCode: string): Promise<MultiplayerRoomState | null> {
    const supabase = getClient();
    const code = normalizeRoomCode(roomCode);
    if (!supabase || !code) return null;

    try {
      const { data, error } = await supabase
        .from('ipl_auction_rooms')
        .select('state')
        .eq('room_code', code)
        .maybeSingle();

      if (error) {
        console.warn('[Server Supabase] Failed to fetch auction room:', error.message);
        return null;
      }
      return normalizeRoomState(data?.state as MultiplayerRoomState | null);
    } catch (err) {
      console.warn('[Server Supabase] Get room exception:', err);
      return null;
    }
  },

  async listOpenRooms(): Promise<ServerPublicRoomItem[]> {
    const supabase = getClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('ipl_auction_rooms')
        .select('state, updated_at')
        .eq('is_public', true)
        .eq('status', 'lobby')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('[Server Supabase] Failed to list auction rooms:', error.message);
        return [];
      }

      return (data || [])
        .map(row => {
          const state = normalizeRoomState(row.state as MultiplayerRoomState | null);
          if (!state || state.status !== 'lobby') return null;
          if (state.participants.length >= state.config.maxPlayers) return null;
          return toServerPublicRoomItem(state, row.updated_at as string | undefined);
        })
        .filter(Boolean) as ServerPublicRoomItem[];
    } catch (err) {
      console.warn('[Server Supabase] List rooms exception:', err);
      return [];
    }
  },

  async deleteRoom(roomCode: string): Promise<boolean> {
    const supabase = getClient();
    const code = normalizeRoomCode(roomCode);
    if (!supabase || !code) return false;

    try {
      const { error } = await supabase
        .from('ipl_auction_rooms')
        .delete()
        .eq('room_code', code);

      if (error) {
        console.warn('[Server Supabase] Failed to delete auction room:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Server Supabase] Delete room exception:', err);
      return false;
    }
  }
};
