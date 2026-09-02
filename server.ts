import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { MultiplayerAuctionEngine } from './server/multiplayerAuctionEngine';
import { SupabaseAuctionStore } from './server/supabaseAuctionStore';
import { LeaderboardStore } from './server/leaderboardStore';
import { LeaderboardCategory } from './src/types/leaderboard';
import { MultiplayerRoomState } from './src/types/multiplayerAuction';
import { cloudSaveStore } from './server/cloudSaveStore';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '4mb' }));

  const normalizeRoomCode = (roomCode: string) => String(roomCode || '').trim().toUpperCase();

  const hydrateRoomFromSupabase = async (roomCode: string): Promise<MultiplayerRoomState | null> => {
    const code = normalizeRoomCode(roomCode);
    if (!code) return null;
    const inMemory = MultiplayerAuctionEngine.getRoomState(code);
    const remoteRoom = await Promise.race([
      SupabaseAuctionStore.getRoom(code),
      new Promise<MultiplayerRoomState | null>(resolve => setTimeout(() => resolve(null), 1500))
    ]).catch(() => null);
    if (remoteRoom && (!inMemory || Number(remoteRoom.version || 1) > Number(inMemory.version || 1))) {
      MultiplayerAuctionEngine.setRoomState(remoteRoom);
      return MultiplayerAuctionEngine.getRoomState(code) || remoteRoom;
    }
    return inMemory || remoteRoom || null;
  };

  const persistRoomState = async (state?: MultiplayerRoomState | null) => {
    if (!state) return false;
    return Promise.race([
      SupabaseAuctionStore.saveRoom(state),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1500))
    ]).catch(() => false);
  };

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // Global App Public Configuration for automatic Supabase Realtime synchronization
  app.get('/api/config', (req: Request, res: Response) => {
    const supabaseUrl = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.PUBLIC_SUPABASE_URL ||
      ''
    ).trim();
    const supabaseAnonKey = (
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.PUBLIC_SUPABASE_ANON_KEY ||
      ''
    ).trim();
    res.json({
      supabaseUrl,
      supabaseAnonKey,
      hasSupabase: Boolean(supabaseUrl && supabaseAnonKey),
      hasServerSupabaseStore: SupabaseAuctionStore.isConfigured()
    });
  });

  // ============================================================
  // GOOGLE SIGN-IN + CLOUD SAVE API
  // ============================================================
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { credential, currentSave } = req.body;
      if (!credential || typeof credential !== 'string') {
        return res.status(400).json({ error: 'Google credential is required' });
      }
      const tokenInfo = await cloudSaveStore.verifyGoogleCredential(credential);
      const record = cloudSaveStore.upsertFromGoogle(tokenInfo, currentSave || null);
      const sessionToken = cloudSaveStore.createSessionToken(tokenInfo.sub);
      res.json({ success: true, profile: record.profile, cloudSave: record.save, sessionToken, updatedAt: record.updatedAt });
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Google sign-in failed' });
    }
  });

  const getCloudSessionSub = (req: Request): string | null => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
    return cloudSaveStore.verifySessionToken(token);
  };

  app.get('/api/cloud-save', (req: Request, res: Response) => {
    const sub = getCloudSessionSub(req);
    if (!sub) return res.status(401).json({ error: 'Not signed in' });
    const record = cloudSaveStore.getSave(sub);
    if (!record) return res.status(404).json({ error: 'Cloud profile not found' });
    res.json({ success: true, profile: record.profile, cloudSave: record.save, updatedAt: record.updatedAt });
  });

  app.post('/api/cloud-save', (req: Request, res: Response) => {
    try {
      const sub = getCloudSessionSub(req);
      if (!sub) return res.status(401).json({ error: 'Not signed in' });
      if (!req.body?.save || typeof req.body.save !== 'object') return res.status(400).json({ error: 'save payload is required' });
      const record = cloudSaveStore.writeSave(sub, req.body.save);
      res.json({ success: true, profile: record.profile, cloudSave: record.save, updatedAt: record.updatedAt });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Cloud save failed' });
    }
  });

  // ============================================================
  // GLOBAL LEADERBOARD API — server-backed, never localStorage-only
  // ============================================================
  app.get('/api/leaderboard/:category?', (req: Request, res: Response) => {
    const category = (req.params.category || 'global') as LeaderboardCategory;
    const allowed: LeaderboardCategory[] = ['global', 'friends', 'weekly', 'season', 'highest_ovr', 'auction_master'];
    if (!allowed.includes(category)) {
      return res.status(400).json({ error: 'Invalid leaderboard category' });
    }
    res.json({ success: true, snapshot: LeaderboardStore.snapshot(category, String(req.query.playerId || '')) });
  });

  app.post('/api/leaderboard/profile', (req: Request, res: Response) => {
    const { playerId, displayName } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId is required' });
    res.json({ success: true, profile: LeaderboardStore.upsertProfile(playerId, displayName) });
  });

  // ============================================================
  // MULTIPLAYER AUCTION API & SSE REALTIME STREAM
  // ============================================================
  // 1. Create Room
  app.post('/api/multiplayer/create', async (req: Request, res: Response) => {
    try {
      const { hostPlayerId, hostName, config, roomCode, state } = req.body || {};
      if (!hostPlayerId) {
        return res.status(400).json({ success: false, error: 'hostPlayerId is required' });
      }
      if (state && state.roomCode) {
        const normalizedState = { ...state, roomCode: normalizeRoomCode(state.roomCode) } as MultiplayerRoomState;
        MultiplayerAuctionEngine.setRoomState(normalizedState);
        const syncedState = MultiplayerAuctionEngine.getRoomState(normalizedState.roomCode) || normalizedState;
        const cloudSync = await persistRoomState(syncedState);
        return res.json({ success: true, state: syncedState, cloudSync });
      }
      const roomState = MultiplayerAuctionEngine.createRoom(hostPlayerId, hostName || 'Host Manager', config, roomCode);
      const cloudSync = await persistRoomState(roomState);
      res.json({ success: true, state: roomState, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/create:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error creating room' });
    }
  });

  // 2. Join Room
  app.post('/api/multiplayer/join', async (req: Request, res: Response) => {
    try {
      const { roomCode, playerId, playerName } = req.body || {};
      if (!roomCode || !playerId) {
        return res.status(400).json({ success: false, error: 'roomCode and playerId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.joinRoom(code, String(playerId), playerName || 'Manager');
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/join:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error joining room' });
    }
  });

  // 3. Select Franchise (with server-side duplicate prevention)
  app.post('/api/multiplayer/select-franchise', async (req: Request, res: Response) => {
    try {
      const { roomCode, playerId, franchiseId } = req.body || {};
      if (!roomCode || !playerId || !franchiseId) {
        return res.status(400).json({ success: false, error: 'roomCode, playerId, and franchiseId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.selectFranchise(code, String(playerId), String(franchiseId));
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/select-franchise:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error selecting franchise' });
    }
  });

  // 4. Toggle Ready
  app.post('/api/multiplayer/ready', async (req: Request, res: Response) => {
    try {
      const { roomCode, playerId } = req.body || {};
      if (!roomCode || !playerId) {
        return res.status(400).json({ success: false, error: 'roomCode and playerId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.toggleReady(code, String(playerId));
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/ready:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error updating ready state' });
    }
  });

  // 5. Update Config (Host in Lobby only)
  app.post('/api/multiplayer/config', async (req: Request, res: Response) => {
    try {
      const { roomCode, hostPlayerId, config } = req.body || {};
      if (!roomCode || !hostPlayerId) {
        return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.updateConfig(code, String(hostPlayerId), config);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/config:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error updating config' });
    }
  });

  // 6. Start Auction (Host only)
  app.post('/api/multiplayer/start', async (req: Request, res: Response) => {
    try {
      const { roomCode, hostPlayerId } = req.body || {};
      if (!roomCode || !hostPlayerId) {
        return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.startAuction(code, String(hostPlayerId));
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/start:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error starting auction' });
    }
  });

  // 7. Place Bid (Server Authoritative)
  app.post('/api/multiplayer/bid', async (req: Request, res: Response) => {
    try {
      const { roomCode, playerId, bidAmountCr } = req.body || {};
      if (!roomCode || !playerId || typeof bidAmountCr !== 'number') {
        return res.status(400).json({ success: false, error: 'roomCode, playerId, and valid numeric bidAmountCr are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.placeBid(code, String(playerId), bidAmountCr);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/bid:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error placing bid' });
    }
  });

  // 8. Pause Auction (Host only)
  app.post('/api/multiplayer/pause', async (req: Request, res: Response) => {
    try {
      const { roomCode, hostPlayerId } = req.body || {};
      if (!roomCode || !hostPlayerId) {
        return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.pauseAuction(code, String(hostPlayerId));
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/pause:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error pausing auction' });
    }
  });

  // 9. Resume Auction (Host only)
  app.post('/api/multiplayer/resume', async (req: Request, res: Response) => {
    try {
      const { roomCode, hostPlayerId } = req.body || {};
      if (!roomCode || !hostPlayerId) {
        return res.status(400).json({ success: false, error: 'roomCode and hostPlayerId are required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.resumeAuction(code, String(hostPlayerId));
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/resume:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error resuming auction' });
    }
  });

  // 9b. Finish / Conclude Auction (Host only or automated completion)
  app.post('/api/multiplayer/finish', async (req: Request, res: Response) => {
    try {
      const { roomCode, hostPlayerId } = req.body || {};
      if (!roomCode) {
        return res.status(400).json({ success: false, error: 'roomCode is required' });
      }
      const code = normalizeRoomCode(roomCode);
      await hydrateRoomFromSupabase(code);
      const result = MultiplayerAuctionEngine.finishAuction(code, hostPlayerId ? String(hostPlayerId) : undefined);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      const cloudSync = await persistRoomState(result.state);
      res.json({ ...result, cloudSync });
    } catch (err) {
      console.error('Error in /api/multiplayer/finish:', err);
      res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Server error finishing auction' });
    }
  });

  // 10. Leave Room
  app.post('/api/multiplayer/leave', async (req: Request, res: Response) => {
    try {
      const { roomCode, playerId } = req.body || {};
      if (roomCode && playerId) {
        const code = normalizeRoomCode(roomCode);
        await hydrateRoomFromSupabase(code);
        MultiplayerAuctionEngine.leaveRoom(code, String(playerId));
        const state = MultiplayerAuctionEngine.getRoomState(code);
        if (state) {
          await persistRoomState(state);
        } else {
          await SupabaseAuctionStore.deleteRoom(code);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error in /api/multiplayer/leave:', err);
      res.json({ success: true });
    }
  });

  // 11. Public Open Rooms Browser — only actual existing lobby rooms, never fake/AI rooms
  app.get('/api/multiplayer/rooms', async (req: Request, res: Response) => {
    try {
      const roomsMap = new Map<string, any>();
      MultiplayerAuctionEngine.listOpenRooms().forEach(room => roomsMap.set(normalizeRoomCode(room.code), room));
      const supabaseRooms = await Promise.race([
        SupabaseAuctionStore.listOpenRooms(),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), 1500))
      ]).catch(() => []);
      supabaseRooms.forEach(room => {
        const code = normalizeRoomCode(room.code);
        if (!roomsMap.has(code)) roomsMap.set(code, room);
      });
      res.json({ success: true, rooms: Array.from(roomsMap.values()) });
    } catch (err) {
      console.error('Error in /api/multiplayer/rooms:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch rooms', rooms: [] });
    }
  });

  // Sync Room from client/external transport
  app.post('/api/multiplayer/sync', async (req: Request, res: Response) => {
    try {
      const { state } = req.body || {};
      if (state && state.roomCode) {
        const normalizedState = { ...state, roomCode: normalizeRoomCode(state.roomCode) } as MultiplayerRoomState;
        MultiplayerAuctionEngine.setRoomState(normalizedState);
        await persistRoomState(MultiplayerAuctionEngine.getRoomState(normalizedState.roomCode) || normalizedState);
      }
      res.json({ success: true });
    } catch (err) {
      console.error('Error in /api/multiplayer/sync:', err);
      res.json({ success: false });
    }
  });

  // 12. Get Room State Snapshot
  app.get('/api/multiplayer/room/:roomCode', async (req: Request, res: Response) => {
    try {
      const room = await hydrateRoomFromSupabase(String(req.params.roomCode || ''));
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      res.json({ success: true, state: room });
    } catch (err) {
      console.error('Error in /api/multiplayer/room/:roomCode:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve room snapshot' });
    }
  });

  // 13. Server-Sent Events (SSE) Real-Time Stream
  app.get('/api/multiplayer/events/:roomCode', async (req: Request, res: Response) => {
    const roomCode = normalizeRoomCode(String(req.params.roomCode || ''));
    const room = await hydrateRoomFromSupabase(roomCode);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(': connected\n\n');

    const unsubscribe = MultiplayerAuctionEngine.subscribeSSE(roomCode, res);
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  // AI News & Headlines
  app.post('/api/ai/news-headline', async (req: Request, res: Response) => {
    const { teamName, opponentName, matchResult, mvpName, venue } = req.body;
    const ai = getAIClient();

    if (!ai) {
      // Deterministic fallback
      return res.json({
        headline: `${mvpName} leads ${teamName} in dramatic ${matchResult} at ${venue}!`,
        article: `Cricket fans witnessed a sensational T20 encounter at ${venue}. ${teamName} executed their plans with clinical precision as ${mvpName} starred under lights.`,
        mediaReaction: `"A masterclass in high-pressure execution." — CricWire Daily`
      });
    }

    try {
      const prompt = `Write a dramatic IPL breaking news article header and 2-sentence match report:
Match: ${teamName} vs ${opponentName} at ${venue}.
Result: ${matchResult}.
Key Performer: ${mvpName}.
Output format in strictly valid JSON:
{
  "headline": "punchy newspaper headline",
  "article": "2 sentence exciting summary",
  "mediaReaction": "one sentence quote from a cricket analyst"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      res.json({
        headline: `${mvpName} shines as ${teamName} triumphs at ${venue}!`,
        article: `In a thriller at ${venue}, ${teamName} pulled off a memorable result led by a spirited display from ${mvpName}.`,
        mediaReaction: `"Total dominance in key moments." — Indian Cricket Express`
      });
    }
  });

  // AI Post-Match Press Conference
  app.post('/api/ai/press-conference', async (req: Request, res: Response) => {
    const { teamName, result, topPerformers, controversialDecision } = req.body;
    const ai = getAIClient();

    if (!ai) {
      return res.json({
        question: `Captain, what was the turning point in this high-voltage match against tough opposition?`,
        options: [
          { text: 'We backed our tactical process and executed under pressure in the death overs.', moraleChange: +5, ownerTrustChange: +4 },
          { text: 'The pitch played slightly differently than expected, but the boys showed immense grit.', moraleChange: +3, ownerTrustChange: +2 },
          { text: 'We made a couple of fielding lapses that we need to address immediately in the nets.', moraleChange: -2, ownerTrustChange: +3 }
        ]
      });
    }

    try {
      const prompt = `Generate an intense IPL post-match press conference question for the manager of ${teamName} after a match result of "${result}". Top performer was ${topPerformers}. Controversial context: ${controversialDecision || 'close final over finish'}.
Output JSON format:
{
  "question": "Reporter's probing question to the manager",
  "options": [
    { "text": "Confident/Diplomatic answer", "moraleChange": 4, "ownerTrustChange": 4 },
    { "text": "Aggressive/Honest critical answer", "moraleChange": -2, "ownerTrustChange": 3 },
    { "text": "Praising the youngster/team spirit answer", "moraleChange": 5, "ownerTrustChange": 2 }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch {
      res.json({
        question: `How do you assess the team's tactical execution during the crunch overs today?`,
        options: [
          { text: 'We stayed calm and trusted our bowling plans to cross the finish line.', moraleChange: +4, ownerTrustChange: +3 },
          { text: 'There are areas to clean up, but winning crunch moments is what IPL is about.', moraleChange: +3, ownerTrustChange: +3 },
          { text: 'The conditions were challenging, but individual brilliance bailed us out.', moraleChange: +1, ownerTrustChange: +2 }
        ]
      });
    }
  });

  // AI Natural Language Scouting Query Parser
  app.post('/api/ai/scout-query', async (req: Request, res: Response) => {
    const { query } = req.body;
    const ai = getAIClient();

    if (!ai) {
      return res.json({
        parsedQuery: query,
        scoutSummary: `Scouting database queried for: "${query}". Real player search criteria activated.`
      });
    }

    try {
      const prompt = `Analyze this cricket scouting natural language query for an IPL franchise: "${query}".
Output valid JSON:
{
  "scoutSummary": "One crisp sentence explaining what the scouting department is targeting",
  "roleSuggestion": "e.g. Death Bowler / Wicketkeeper / Finisher / Opener / All-rounder / Spinner / Fast Bowler / ALL",
  "nationalitySuggestion": "Indian / Overseas / ALL",
  "valueSuggestion": "Under 2 Cr / 2-5 Cr / 5-10 Cr / 10-15 Cr / 15 Cr+ / ALL",
  "keyTacticalTraits": ["trait1", "trait2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text || '{}';
      res.json(JSON.parse(text));
    } catch {
      res.json({
        parsedQuery: query,
        scoutSummary: `Scouting database queried for: "${query}". Real player search criteria activated.`
      });
    }
  });

  // Catch-all for undefined API routes so they return JSON, not HTML SPA fallback
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ success: false, error: `API route ${req.method} ${req.path} not found` });
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏏 IPL Franchise Simulator server live on http://localhost:${PORT}`);
  });
}

startServer();
