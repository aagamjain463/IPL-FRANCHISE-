import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MultiplayerRoomState } from '../types/multiplayerAuction';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';
let serverFetchedUrl = '';
let serverFetchedKey = '';
let hasInitiatedConfigFetch = false;

export async function fetchServerSupabaseConfig(): Promise<SupabaseCredentials> {
  if (serverFetchedUrl && serverFetchedKey) {
    return { url: serverFetchedUrl, anonKey: serverFetchedKey };
  }
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.supabaseUrl && data?.supabaseAnonKey) {
        serverFetchedUrl = String(data.supabaseUrl).trim();
        serverFetchedKey = String(data.supabaseAnonKey).trim();
        cachedClient = null;
        return { url: serverFetchedUrl, anonKey: serverFetchedKey };
      }
    }
  } catch {
    // ignore
  }
  return getSupabaseCredentials();
}

// Auto-trigger config fetch on module load in browser
if (typeof window !== 'undefined' && !hasInitiatedConfigFetch) {
  hasInitiatedConfigFetch = true;
  fetchServerSupabaseConfig().catch(() => {});
}

export function getSupabaseCredentials(): SupabaseCredentials {
  if (typeof window !== 'undefined' && !hasInitiatedConfigFetch) {
    hasInitiatedConfigFetch = true;
    fetchServerSupabaseConfig().catch(() => {});
  }

  const envObj = (import.meta as unknown as { env?: Record<string, string> }).env;
  const envUrl = (envObj?.VITE_SUPABASE_URL || '').trim();
  const envKey = (envObj?.VITE_SUPABASE_ANON_KEY || '').trim();

  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem('ipl_supabase_url') || '' : '').trim();
  const localKey = (typeof window !== 'undefined' ? localStorage.getItem('ipl_supabase_anon_key') || '' : '').trim();

  return {
    url: serverFetchedUrl || envUrl || localUrl,
    anonKey: serverFetchedKey || envKey || localKey
  };
}


export function isSupabaseConfigured(): boolean {
  const creds = getSupabaseCredentials();
  return Boolean(creds.url && creds.anonKey && creds.url.startsWith('https://'));
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ipl_supabase_url', url.trim());
    localStorage.setItem('ipl_supabase_anon_key', anonKey.trim());
  }
  cachedClient = null;
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ipl_supabase_url');
    localStorage.removeItem('ipl_supabase_anon_key');
  }
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds.url || !creds.anonKey || !creds.url.startsWith('https://')) {
    return null;
  }

  if (cachedClient && lastUrl === creds.url && lastKey === creds.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(creds.url, creds.anonKey, {
      auth: { persistSession: false },
      realtime: {
        params: {
          eventsPerSecond: 20
        }
      }
    });
    lastUrl = creds.url;
    lastKey = creds.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('[Supabase] Init error:', err);
    return null;
  }
}

// ---------------------------------------------------------
// Supabase Database & Realtime Room Engine
// ---------------------------------------------------------

export const SupabaseAuctionService = {
  async listRooms(): Promise<MultiplayerRoomState[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('ipl_auction_rooms')
        .select('state')
        .order('updated_at', { ascending: false })
        .limit(25);

      if (error) {
        console.warn('[Supabase] Failed to list rooms:', error.message);
        return [];
      }

      return (data || []).map(row => row.state as MultiplayerRoomState).filter(Boolean);
    } catch (err) {
      console.warn('[Supabase] List rooms error:', err);
      return [];
    }
  },

  async getRoom(roomCode: string): Promise<MultiplayerRoomState | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const code = roomCode.trim().toUpperCase();
      const { data, error } = await supabase
        .from('ipl_auction_rooms')
        .select('state')
        .eq('room_code', code)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase] Failed to get room:', error.message);
        return null;
      }

      return (data?.state as MultiplayerRoomState) || null;
    } catch (err) {
      console.warn('[Supabase] Get room error:', err);
      return null;
    }
  },

  async saveRoom(state: MultiplayerRoomState): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
      const host = state.participants.find(p => p.id === state.hostId);
      const { error } = await supabase
        .from('ipl_auction_rooms')
        .upsert({
          room_code: state.roomCode.trim().toUpperCase(),
          host_id: state.hostId,
          host_name: host?.name || 'Host',
          status: state.status,
          participants_count: state.participants.length,
          is_public: true,
          state: state,
          updated_at: new Date().toISOString()
        }, { onConflict: 'room_code' });

      if (error) {
        console.error('[Supabase] Save room error:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Supabase] Save room exception:', err);
      return false;
    }
  },

  async broadcastState(state: MultiplayerRoomState) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const code = state.roomCode.trim().toUpperCase();
      const channel = supabase.channel(`room:${code}`);
      
      // Send broadcast event
      await channel.send({
        type: 'broadcast',
        event: 'STATE_UPDATE',
        payload: { state }
      });
    } catch (err) {
      console.warn('[Supabase] Broadcast error:', err);
    }
  }
};
