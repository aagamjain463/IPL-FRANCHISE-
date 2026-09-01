import { MultiplayerAuctionEngine } from '../../server/multiplayerAuctionEngine.js';
import { SupabaseAuctionStore } from '../../server/supabaseAuctionStore.js';
import { MultiplayerRoomState } from '../../src/types/multiplayerAuction';

function normalizeRoomCode(roomCode: string): string {
  return String(roomCode || '').trim().toUpperCase();
}

function getPathParts(req: any): string[] {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') return [raw];

  const url = String(req.url || '');
  const pathname = url.split('?')[0];
  const prefix = '/api/multiplayer/';

  if (pathname.startsWith(prefix)) {
    return pathname.slice(prefix.length).split('/').filter(Boolean);
  }

  return [];
}

function parseBody(req: any): any {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

async function hydrateRoom(roomCode: string): Promise<MultiplayerRoomState | null> {
  const code = normalizeRoomCode(roomCode);
  if (!code) return null;
  const room = await SupabaseAuctionStore.getRoom(code);
  if (room) MultiplayerAuctionEngine.setRoomState(room);
  return room;
}

async function persistResult(result: { success: boolean; state?: MultiplayerRoomState; error?: string }) {
  if (result.success && result.state) {
    const state = MultiplayerAuctionEngine.getRoomState(result.state.roomCode) || result.state;
    const cloudSync = await SupabaseAuctionStore.saveRoom(state);
    return { ...result, state, cloudSync };
  }
  return result;
}

export default async function handler(req: any, res: any) {
  const parts = getPathParts(req);
  const action = parts[0] || '';
  const method = String(req.method || 'GET').toUpperCase();
  const body = parseBody(req);

  try {
    if (method === 'GET' && action === 'rooms') {
      const rooms = await SupabaseAuctionStore.listOpenRooms();
      return res.status(200).json({ success: true, rooms });
    }

    if (method === 'GET' && action === 'room' && parts[1]) {
      const state = await SupabaseAuctionStore.getRoom(parts[1]);
      if (!state) return res.status(404).json({ success: false, error: 'Room not found' });
      return res.status(200).json({ success: true, state });
    }

    if (method === 'POST' && action === 'sync') {
      if (body.state?.roomCode) {
        const normalizedState = { ...body.state, roomCode: normalizeRoomCode(body.state.roomCode) } as MultiplayerRoomState;
        await SupabaseAuctionStore.saveRoom(normalizedState);
      }
      return res.status(200).json({ success: true });
    }

    if (method === 'POST' && action === 'create') {
      const { hostPlayerId, hostName, config, roomCode, state } = body || {};
      if (!hostPlayerId) return res.status(400).json({ success: false, error: 'hostPlayerId is required' });

      if (state?.roomCode) {
        const normalizedState = { ...state, roomCode: normalizeRoomCode(state.roomCode) } as MultiplayerRoomState;
        const cloudSync = await SupabaseAuctionStore.saveRoom(normalizedState);
        return res.status(200).json({ success: true, state: normalizedState, cloudSync });
      }

      const roomState = MultiplayerAuctionEngine.createRoom(String(hostPlayerId), hostName || 'Host Manager', config, roomCode);
      const cloudSync = await SupabaseAuctionStore.saveRoom(roomState);
      return res.status(200).json({ success: true, state: roomState, cloudSync });
    }

    if (method === 'POST' && action === 'join') {
      const { roomCode, playerId, playerName } = body || {};
      if (!roomCode || !playerId) return res.status(400).json({ success: false, error: 'roomCode and playerId are required' });
      await hydrateRoom(roomCode);
      const result = MultiplayerAuctionEngine.joinRoom(normalizeRoomCode(roomCode), String(playerId), playerName || 'Manager');
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && action === 'select-franchise') {
      const { roomCode, playerId, franchiseId } = body || {};
      if (!roomCode || !playerId || !franchiseId) return res.status(400).json({ success: false, error: 'roomCode, playerId, and franchiseId are required' });
      await hydrateRoom(roomCode);
      const result = MultiplayerAuctionEngine.selectFranchise(normalizeRoomCode(roomCode), String(playerId), String(franchiseId));
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && action === 'ready') {
      const { roomCode, playerId } = body || {};
      if (!roomCode || !playerId) return res.status(400).json({ success: false, error: 'roomCode and playerId are required' });
      await hydrateRoom(roomCode);
      const result = MultiplayerAuctionEngine.toggleReady(normalizeRoomCode(roomCode), String(playerId));
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && action === 'config') {
      const { roomCode, hostPlayerId, config } = body || {};
      if (!roomCode || !hostPlayerId) return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      await hydrateRoom(roomCode);
      const result = MultiplayerAuctionEngine.updateConfig(normalizeRoomCode(roomCode), String(hostPlayerId), config);
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && action === 'start') {
      const { roomCode, hostPlayerId } = body || {};
      if (!roomCode || !hostPlayerId) return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      await hydrateRoom(roomCode);
      const result = MultiplayerAuctionEngine.startAuction(normalizeRoomCode(roomCode), String(hostPlayerId));
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && action === 'bid') {
      const { roomCode, playerId, bidAmountCr } = body || {};
      if (!roomCode || !playerId || typeof bidAmountCr !== 'number') return res.status(400).json({ success: false, error: 'roomCode, playerId, and valid numeric bidAmountCr are required' });
      await hydrateRoom(roomCode);
      const result = MultiplayerAuctionEngine.placeBid(normalizeRoomCode(roomCode), String(playerId), bidAmountCr);
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && (action === 'pause' || action === 'resume')) {
      const { roomCode, hostPlayerId } = body || {};
      if (!roomCode || !hostPlayerId) return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      await hydrateRoom(roomCode);
      const result = action === 'pause'
        ? MultiplayerAuctionEngine.pauseAuction(normalizeRoomCode(roomCode), String(hostPlayerId))
        : MultiplayerAuctionEngine.resumeAuction(normalizeRoomCode(roomCode), String(hostPlayerId));
      const saved = await persistResult(result);
      return res.status(result.success ? 200 : 400).json(saved);
    }

    if (method === 'POST' && action === 'leave') {
      const { roomCode, playerId } = body || {};
      if (roomCode && playerId) {
        await hydrateRoom(roomCode);
        MultiplayerAuctionEngine.leaveRoom(normalizeRoomCode(roomCode), String(playerId));
        const state = MultiplayerAuctionEngine.getRoomState(normalizeRoomCode(roomCode));
        if (state) await SupabaseAuctionStore.saveRoom(state);
        else await SupabaseAuctionStore.deleteRoom(normalizeRoomCode(roomCode));
      }
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ success: false, error: `API route ${method} /api/multiplayer/${parts.join('/')} not found` });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Multiplayer API failed'
    });
  }
}
