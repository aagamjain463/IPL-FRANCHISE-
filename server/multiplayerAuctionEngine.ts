import { Response } from 'express';
import { 
  MultiplayerRoomState, 
  MultiplayerAuctionConfig, 
  MultiplayerParticipant, 
  MultiplayerBidRecord, 
  MultiplayerSoldRecord, 
  MultiplayerRanking, 
  MultiplayerAward,
  MultiplayerClientEvent,
  HammerCallState
} from '../src/types/multiplayerAuction';
import { INITIAL_PLAYERS } from '../src/data/players';
import { INITIAL_TEAMS } from '../src/data/teams';
import { Player } from '../src/types/cricket';
import { calculateAuctionPerformanceScore, getMultiplayerBidIncrement, isValidBidIncrement, MULTIPLAYER_AUCTION_RULES, normalizeCr } from '../src/multiplayer/auctionRules';
import { LeaderboardStore } from './leaderboardStore';

// Default config
const DEFAULT_CONFIG: MultiplayerAuctionConfig = {
  format: 'Mega Auction',
  startingPurseCr: 100,
  minPlayers: 2,
  maxPlayers: 10,
  poolType: 'Full Draft Pool',
  minSquadSize: 15,
  maxSquadSize: 25,
  overseasLimit: 8,
  timerSeconds: MULTIPLAYER_AUCTION_RULES.defaultTimerSeconds
};

// Memory store for active multiplayer rooms
const rooms = new Map<string, MultiplayerRoomState>();
const roomTimers = new Map<string, NodeJS.Timeout>();
const roomBreakTimers = new Map<string, NodeJS.Timeout>();
const sseClients = new Map<string, Set<Response>>();

function getRoomTag(config: MultiplayerAuctionConfig): 'Featured' | 'High Stakes' | 'Speed' | 'Casual' {
  if (config.timerSeconds <= 10) return 'Speed';
  if (config.startingPurseCr >= 120 || config.poolType === 'Top 30 Marquee & Stars') return 'High Stakes';
  if (config.format === 'Mega Auction') return 'Featured';
  return 'Casual';
}

// Helper to generate 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Broadcast event to all SSE subscribers in room
function broadcastToRoom(roomCode: string, event: MultiplayerClientEvent) {
  const clients = sseClients.get(roomCode);
  if (!clients || clients.size === 0) return;

  const dataString = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(res => {
    try {
      res.write(dataString);
    } catch {
      // client dropped
    }
  });
}

// Broadcast full state update
function broadcastState(room: MultiplayerRoomState) {
  room.version++;
  broadcastToRoom(room.roomCode, {
    type: 'STATE_UPDATE',
    state: room
  });
}

// Filter and prepare player pool based on poolType
function generatePlayerPool(poolType: MultiplayerAuctionConfig['poolType']): Player[] {
  const all = [...INITIAL_PLAYERS];

  // Sort by overall descending
  const sorted = all.sort((a, b) => b.overall - a.overall);

  if (poolType === 'Top 15 Accelerated') {
    return sorted.slice(0, 15);
  } else if (poolType === 'Top 30 Marquee & Stars') {
    return sorted.slice(0, 30);
  } else {
    // Full Draft Pool (up to 80 diverse players for exciting multiplayer session)
    return sorted.slice(0, 80);
  }
}

// Compute dynamic awards when auction completes
function computeAwards(room: MultiplayerRoomState): MultiplayerAward[] {
  const awards: MultiplayerAward[] = [];
  const participants = room.participants;

  if (participants.length === 0) return awards;

  // 1. Best Overall Squad
  const byAvgOvr = [...participants].map(p => {
    const avg = p.squadPlayers.length > 0 
      ? p.squadPlayers.reduce((acc, pl) => acc + pl.overall, 0) / p.squadPlayers.length 
      : 0;
    return { p, avg };
  }).sort((a, b) => b.avg - a.avg);

  if (byAvgOvr.length > 0 && byAvgOvr[0].p.squadPlayers.length > 0) {
    const top = byAvgOvr[0].p;
    const team = top.franchiseId ? INITIAL_TEAMS[top.franchiseId] : null;
    awards.push({
      title: 'Dynasty Architects (Best Squad)',
      recipientName: top.name,
      franchiseName: team?.name || 'Franchise',
      franchiseShort: team?.shortName || 'IPL',
      description: `Assembled the highest quality roster averaging ${byAvgOvr[0].avg.toFixed(1)} OVR with ${top.squadPlayers.length} world-class signings.`,
      badge: '🏆'
    });
  }

  // 2. Best Value Hunter (most OVR points per Cr spent)
  const byEfficiency = [...participants].map(p => {
    const totalSpent = room.config.startingPurseCr - p.purseCr;
    const totalOvr = p.squadPlayers.reduce((acc, pl) => acc + pl.overall, 0);
    const score = totalSpent > 0 ? totalOvr / totalSpent : 0;
    return { p, score, totalSpent };
  }).sort((a, b) => b.score - a.score);

  if (byEfficiency.length > 0 && byEfficiency[0].p.squadPlayers.length > 0) {
    const top = byEfficiency[0].p;
    const team = top.franchiseId ? INITIAL_TEAMS[top.franchiseId] : null;
    awards.push({
      title: 'Moneyball Mastermind (Best Value)',
      recipientName: top.name,
      franchiseName: team?.name || 'Franchise',
      franchiseShort: team?.shortName || 'IPL',
      description: `Maximum return on investment with efficient bidding discipline across ${top.squadPlayers.length} players.`,
      badge: '💰'
    });
  }

  // 3. Biggest Steal
  const steals = [...room.soldRecords].filter(r => r.player.overall >= 88 && r.sellingPriceCr <= 3.5);
  if (steals.length > 0) {
    const bestSteal = steals.sort((a, b) => (b.player.overall / b.sellingPriceCr) - (a.player.overall / a.sellingPriceCr))[0];
    awards.push({
      title: 'Auction Heist of the Day',
      recipientName: bestSteal.winningParticipantName,
      franchiseName: bestSteal.winningFranchiseShort,
      franchiseShort: bestSteal.winningFranchiseShort,
      description: `Secured ${bestSteal.player.name} (${bestSteal.player.overall} OVR) for just ₹${bestSteal.sellingPriceCr.toFixed(2)} Cr!`,
      badge: '💎'
    });
  }

  // 4. Marquee Galactico Signings
  const highestSale = [...room.soldRecords].sort((a, b) => b.sellingPriceCr - a.sellingPriceCr)[0];
  if (highestSale) {
    awards.push({
      title: 'Record Breaker Galactico',
      recipientName: highestSale.winningParticipantName,
      franchiseName: highestSale.winningFranchiseShort,
      franchiseShort: highestSale.winningFranchiseShort,
      description: `Broke the bank for ${highestSale.player.name} with a massive ₹${highestSale.sellingPriceCr.toFixed(2)} Cr winning paddle.`,
      badge: '👑'
    });
  }

  return awards;
}

// Compute final rankings table
function computeRankings(room: MultiplayerRoomState): MultiplayerRanking[] {
  return room.participants.map(p => {
    const team = p.franchiseId ? INITIAL_TEAMS[p.franchiseId] : null;
    const squadCount = p.squadPlayers.length;
    const squadOvr = squadCount > 0 
      ? Math.round(p.squadPlayers.reduce((sum, pl) => sum + pl.overall, 0) / squadCount) 
      : 0;
    const overseasCount = p.squadPlayers.filter(pl => pl.isOverseas).length;
    const spentPurseCr = Number((room.config.startingPurseCr - p.purseCr).toFixed(2));
    const remainingPurseCr = Number(p.purseCr.toFixed(2));
    const auctionScore = calculateAuctionPerformanceScore(p, room.config.startingPurseCr);
    const purchases = room.soldRecords.filter(r => r.winningParticipantId === p.id);
    const bestPurchase = purchases.slice().sort((a, b) => (b.player.overall / Math.max(0.25, b.sellingPriceCr)) - (a.player.overall / Math.max(0.25, a.sellingPriceCr)))[0];
    const biggestOverpay = purchases.slice().sort((a, b) => b.sellingPriceCr - a.sellingPriceCr)[0];

    return {
      rank: 1,
      participantId: p.id,
      participantName: p.name,
      franchiseId: p.franchiseId || 'csk',
      franchiseName: team?.name || 'Franchise',
      franchiseShort: team?.shortName || 'IPL',
      primaryColor: team?.primaryColor || '#D4AF37',
      secondaryColor: team?.secondaryColor || '#000',
      squadOvr,
      squadCount,
      overseasCount,
      spentPurseCr,
      remainingPurseCr,
      auctionScore,
      bestPurchaseName: bestPurchase?.player.name,
      biggestOverpayName: biggestOverpay?.player.name
    };
  }).sort((a, b) => {
    if (b.auctionScore !== a.auctionScore) return b.auctionScore - a.auctionScore;
    if (b.squadOvr !== a.squadOvr) return b.squadOvr - a.squadOvr;
    return b.squadCount - a.squadCount;
  }).map((r, index) => ({
    ...r,
    rank: index + 1
  }));
}

// Resolution for active lot
function resolveCurrentLot(room: MultiplayerRoomState) {
  const currentLot = room.currentLotPlayer;
  if (!currentLot) return;
  if (room.soldRecords.some(record => record.player.id === currentLot.id)) return;
  room.deadlineEpochMs = null;

  if (room.currentHighBidderId) {
    const winningParticipant = room.participants.find(p => p.id === room.currentHighBidderId);
    if (winningParticipant) {
      const winningFranchise = winningParticipant.franchiseId ? INITIAL_TEAMS[winningParticipant.franchiseId] : null;
      
      if (winningParticipant.purseCr < room.currentHighBidCr) {
        room.currentHighBidderId = null;
        room.currentHighBidderFranchiseId = null;
        resolveCurrentLot(room);
        return;
      }

      // Deduct purse and add player; server enforces single ownership per room.
      winningParticipant.purseCr = Math.max(0, Number((winningParticipant.purseCr - room.currentHighBidCr).toFixed(2)));
      if (!winningParticipant.squadPlayerIds.includes(currentLot.id)) winningParticipant.squadPlayerIds.push(currentLot.id);
      if (!winningParticipant.squadPlayers.some(player => player.id === currentLot.id)) {
        winningParticipant.squadPlayers.push({
          ...currentLot,
          salaryCr: room.currentHighBidCr,
          currentTeamId: winningParticipant.franchiseId
        });
      }

      const soldRecord: MultiplayerSoldRecord = {
        player: currentLot,
        winningParticipantId: winningParticipant.id,
        winningParticipantName: winningParticipant.name,
        winningFranchiseId: winningParticipant.franchiseId || 'csk',
        winningFranchiseShort: winningFranchise?.shortName || 'IPL',
        sellingPriceCr: room.currentHighBidCr,
        timestamp: Date.now()
      };

      room.soldRecords.push(soldRecord);
      room.status = 'lot_break';
      room.hammerCall = 'Sold!';

      broadcastToRoom(room.roomCode, {
        type: 'LOT_SOLD',
        record: soldRecord,
        nextLotInSeconds: 3
      });
      broadcastState(room);
    }
  } else {
    // Unsold
    room.unsoldPlayerIds.push(currentLot.id);
    room.status = 'lot_break';
    room.hammerCall = 'Unsold';

    broadcastToRoom(room.roomCode, {
      type: 'LOT_UNSOLD',
      player: currentLot,
      nextLotInSeconds: 3
    });
    broadcastState(room);
  }

  // After 3 seconds of lot break, advance to next player
  const breakTimer = setTimeout(() => {
    advanceToNextLot(room.roomCode);
  }, 3200);
  breakTimer.unref?.();

  roomBreakTimers.set(room.roomCode, breakTimer);
}

// Advance to next lot or complete auction
function advanceToNextLot(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const nextIndex = room.currentLotIndex + 1;

  if (nextIndex < room.playerPool.length) {
    room.currentLotIndex = nextIndex;
    room.currentLotPlayer = room.playerPool[nextIndex];
    room.currentHighBidCr = room.currentLotPlayer.basePriceCr;
    room.currentHighBidderId = null;
    room.currentHighBidderFranchiseId = null;
    room.hammerSecondsRemaining = room.config.timerSeconds;
    room.deadlineEpochMs = Date.now() + room.config.timerSeconds * 1000;
    room.hammerCall = 'Opening Bid';
    room.status = 'in_progress';

    broadcastToRoom(room.roomCode, {
      type: 'LOT_STARTED',
      player: room.currentLotPlayer,
      lotIndex: nextIndex,
      totalLots: room.totalLots
    });
    broadcastState(room);
  } else {
    // Auction Finished!
    room.status = 'completed';
    room.currentLotPlayer = null;
    room.rankings = computeRankings(room);
    room.awards = computeAwards(room);
    if (!room.leaderboardApplied) {
      LeaderboardStore.recordAuctionResults(room.rankings.map(ranking => ({
        playerId: ranking.participantId,
        displayName: ranking.participantName,
        rank: ranking.rank,
        totalParticipants: room.rankings.length,
        spentPurseCr: ranking.spentPurseCr,
        squadOvr: ranking.squadOvr,
        auctionScore: ranking.auctionScore,
        trophies: ranking.rank === 1 ? 1 : 0
      })));
      room.leaderboardApplied = true;
    }

    // Stop timer
    const timer = roomTimers.get(roomCode);
    if (timer) {
      clearInterval(timer);
      roomTimers.delete(roomCode);
    }

    broadcastToRoom(room.roomCode, {
      type: 'AUCTION_COMPLETED',
      rankings: room.rankings,
      awards: room.awards
    });
    broadcastState(room);
  }
}

// Start room server timer ticker
function startRoomTimer(roomCode: string) {
  // Clear any existing timer
  const existing = roomTimers.get(roomCode);
  if (existing) clearInterval(existing);

  const timer = setInterval(() => {
    const room = rooms.get(roomCode);
    if (!room) {
      clearInterval(timer);
      roomTimers.delete(roomCode);
      return;
    }

    // Skip ticking if paused or during lot break
    if (room.isPaused || room.status !== 'in_progress') {
      return;
    }

    const msRemaining = Math.max(0, (room.deadlineEpochMs || Date.now()) - Date.now());
    room.hammerSecondsRemaining = Math.ceil(msRemaining / 1000);

    // Update hammer state description from server deadline, not client time
    if (room.hammerSecondsRemaining <= 3) {
      room.hammerCall = 'Going Twice';
    } else if (room.hammerSecondsRemaining <= 7) {
      room.hammerCall = 'Going Once';
    } else {
      room.hammerCall = room.currentHighBidderId ? 'Active Bidding' : 'Opening Bid';
    }

    // Broadcast tick
    broadcastToRoom(room.roomCode, {
      type: 'TICK',
      hammerSecondsRemaining: room.hammerSecondsRemaining,
      hammerCall: room.hammerCall
    });

    // Check expiry
    if (room.hammerSecondsRemaining <= 0) {
      resolveCurrentLot(room);
    }
  }, 1000);

  timer.unref?.();
  roomTimers.set(roomCode, timer);
}

// ==========================================
// EXPORTED PUBLIC ENGINE CONTROLLER
// ==========================================
export const MultiplayerAuctionEngine = {
  // Create Room
  createRoom(hostPlayerId: string, hostName: string, customConfig?: Partial<MultiplayerAuctionConfig>): MultiplayerRoomState {
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const config: MultiplayerAuctionConfig = {
      ...DEFAULT_CONFIG,
      ...customConfig
    };

    const hostParticipant: MultiplayerParticipant = {
      id: hostPlayerId,
      name: hostName || 'Host Manager',
      isHost: true,
      franchiseId: null,
      isReady: false,
      purseCr: config.startingPurseCr,
      squadPlayerIds: [],
      squadPlayers: [],
      isConnected: true,
      disconnectedAt: null,
      isAI: false,
      lastBidCr: null
    };

    const pool = generatePlayerPool(config.poolType);

    const room: MultiplayerRoomState = {
      roomCode,
      roomName: `${hostName}'s IPL War Room`,
      hostId: hostPlayerId,
      status: 'lobby',
      config,
      participants: [hostParticipant],
      playerPool: pool,
      currentLotIndex: 0,
      totalLots: pool.length,
      currentLotPlayer: pool[0] || null,
      currentHighBidCr: pool[0]?.basePriceCr || 2.0,
      currentHighBidderId: null,
      currentHighBidderFranchiseId: null,
      hammerSecondsRemaining: config.timerSeconds,
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

    rooms.set(roomCode, room);
    return room;
  },

  // Join Room
  joinRoom(roomCode: string, playerId: string, playerName: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) {
      return { success: false, error: `Room ${roomCode} not found.` };
    }

    const existingParticipant = room.participants.find(p => p.id === playerId);
    if (existingParticipant) {
      existingParticipant.isConnected = true;
      existingParticipant.disconnectedAt = null;
      existingParticipant.name = playerName || existingParticipant.name;
      broadcastState(room);
      return { success: true, state: room };
    }

    if (room.status !== 'lobby') {
      return { success: false, error: 'Auction is already in progress in this room.' };
    }

    if (room.participants.length >= room.config.maxPlayers) {
      return { success: false, error: `Room is full (Maximum ${room.config.maxPlayers} players).` };
    }

    const newParticipant: MultiplayerParticipant = {
      id: playerId,
      name: playerName || `Manager ${room.participants.length + 1}`,
      isHost: false,
      franchiseId: null,
      isReady: false,
      purseCr: room.config.startingPurseCr,
      squadPlayerIds: [],
      squadPlayers: [],
      isConnected: true,
      disconnectedAt: null,
      isAI: false,
      lastBidCr: null
    };

    room.participants.push(newParticipant);
    broadcastState(room);
    return { success: true, state: room };
  },

  // Select Franchise (Enforces duplicate prevention)
  selectFranchise(roomCode: string, playerId: string, franchiseId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    if (room.status !== 'lobby') {
      return { success: false, error: 'Franchises can only be changed before the auction starts.' };
    }

    // Verify franchise exists
    if (!INITIAL_TEAMS[franchiseId]) {
      return { success: false, error: 'Invalid franchise selected.' };
    }

    // Server-side duplicate franchise prevention
    const alreadyTakenByOther = room.participants.find(p => p.franchiseId === franchiseId && p.id !== playerId);
    if (alreadyTakenByOther) {
      return { 
        success: false, 
        error: `${INITIAL_TEAMS[franchiseId].name} has already been claimed by ${alreadyTakenByOther.name}. Please select another team.` 
      };
    }

    const participant = room.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Participant not found in room.' };

    participant.franchiseId = franchiseId;
    broadcastState(room);
    return { success: true, state: room };
  },

  // Toggle Ready
  toggleReady(roomCode: string, playerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    const participant = room.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Participant not in room.' };

    if (!participant.franchiseId) {
      return { success: false, error: 'Please choose an IPL franchise first before readying up.' };
    }

    participant.isReady = !participant.isReady;
    broadcastState(room);
    return { success: true, state: room };
  },

  // Update Config (Host only, in lobby)
  updateConfig(roomCode: string, hostPlayerId: string, newConfig: Partial<MultiplayerAuctionConfig>): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    if (room.hostId !== hostPlayerId) {
      return { success: false, error: 'Only the room host can modify auction settings.' };
    }

    if (room.status !== 'lobby') {
      return { success: false, error: 'Settings cannot be modified after auction has begun.' };
    }

    room.config = {
      ...room.config,
      ...newConfig
    };

    // Update starting purse for all participants
    room.participants.forEach(p => {
      p.purseCr = room.config.startingPurseCr;
    });

    // Update pool if poolType changed
    if (newConfig.poolType) {
      const pool = generatePlayerPool(newConfig.poolType);
      room.playerPool = pool;
      room.totalLots = pool.length;
      room.currentLotPlayer = pool[0] || null;
      room.currentHighBidCr = pool[0]?.basePriceCr || 2.0;
    }

    broadcastState(room);
    return { success: true, state: room };
  },

  // Start Auction (Host only)
  startAuction(roomCode: string, hostPlayerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    if (room.hostId !== hostPlayerId) {
      return { success: false, error: 'Only the room host can start the auction.' };
    }

    if (room.status !== 'lobby') {
      return { success: false, error: 'Auction has already started.' };
    }

    if (room.participants.length < room.config.minPlayers) {
      return { 
        success: false, 
        error: `At least ${room.config.minPlayers} players are required to start the auction (Currently ${room.participants.length}).` 
      };
    }

    // Check all players have franchise
    const unpicked = room.participants.filter(p => !p.franchiseId);
    if (unpicked.length > 0) {
      return { 
        success: false, 
        error: `Waiting for all players to select a franchise (${unpicked.map(p => p.name).join(', ')}).` 
      };
    }

    // Initialize auction arena
    const pool = generatePlayerPool(room.config.poolType);
    room.playerPool = pool;
    room.totalLots = pool.length;
    room.currentLotIndex = 0;
    room.currentLotPlayer = pool[0];
    room.currentHighBidCr = pool[0]?.basePriceCr || 2.0;
    room.currentHighBidderId = null;
    room.currentHighBidderFranchiseId = null;
    room.hammerSecondsRemaining = room.config.timerSeconds;
    room.deadlineEpochMs = Date.now() + room.config.timerSeconds * 1000;
    room.hammerCall = 'Opening Bid';
    room.status = 'in_progress';
    room.isPaused = false;
    room.pausedByHostId = null;

    // Start server ticker
    startRoomTimer(room.roomCode);

    broadcastToRoom(room.roomCode, {
      type: 'LOT_STARTED',
      player: room.currentLotPlayer,
      lotIndex: 0,
      totalLots: room.totalLots
    });
    broadcastState(room);

    return { success: true, state: room };
  },

  // Place Bid (Any participant)
  placeBid(roomCode: string, playerId: string, bidAmountCr: number): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    if (room.status !== 'in_progress') {
      return { success: false, error: 'Auction is currently not accepting bids.' };
    }

    if (room.isPaused) {
      return { success: false, error: 'Auction is currently paused by host.' };
    }

    const serverSecondsRemaining = Math.ceil(Math.max(0, (room.deadlineEpochMs || Date.now()) - Date.now()) / 1000);
    room.hammerSecondsRemaining = serverSecondsRemaining;
    if (serverSecondsRemaining <= 0) {
      resolveCurrentLot(room);
      return { success: false, error: 'Timer expired before this bid reached the auction server.' };
    }

    const participant = room.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Participant not in room.' };
    if (!participant.isConnected && !participant.isAI) return { success: false, error: 'Participant is disconnected.' };

    if (!participant.franchiseId) {
      return { success: false, error: 'No franchise chosen.' };
    }

    // Cannot outbid self
    if (room.currentHighBidderId === playerId) {
      return { success: false, error: 'You already hold the highest bid!' };
    }

    // Check squad cap
    if (participant.squadPlayers.length >= room.config.maxSquadSize) {
      return { success: false, error: `Squad limit reached (${room.config.maxSquadSize} players max).` };
    }

    // Check overseas cap
    const currentLot = room.currentLotPlayer;
    if (currentLot?.isOverseas) {
      const overseasCount = participant.squadPlayers.filter(p => p.isOverseas).length;
      if (overseasCount >= room.config.overseasLimit) {
        return { success: false, error: `Overseas player cap reached (${room.config.overseasLimit} max).` };
      }
    }

    // Bid must be higher and follow centralized increments
    const roundedBid = normalizeCr(bidAmountCr);
    const minNextBid = normalizeCr(room.currentHighBidCr + getMultiplayerBidIncrement(room.currentHighBidCr));
    if (roundedBid <= room.currentHighBidCr) {
      return { success: false, error: `Bid must be higher than current bid (₹${room.currentHighBidCr.toFixed(2)} Cr).` };
    }
    if (!isValidBidIncrement(room.currentHighBidCr, roundedBid)) {
      return { success: false, error: `Invalid bid increment. Next valid bid is at least ₹${minNextBid.toFixed(2)} Cr.` };
    }

    // Check purse
    if (participant.purseCr < roundedBid) {
      return { 
        success: false, 
        error: `Insufficient purse balance! You have ₹${participant.purseCr.toFixed(2)} Cr remaining.` 
      };
    }

    // Apply Bid
    room.currentHighBidCr = roundedBid;
    room.currentHighBidderId = playerId;
    room.currentHighBidderFranchiseId = participant.franchiseId;
    participant.lastBidCr = roundedBid;

    // Anti-snipe: only extend near deadline; otherwise keep the server deadline authoritative.
    let extendedBy = 0;
    if (room.hammerSecondsRemaining <= MULTIPLAYER_AUCTION_RULES.antiSnipeThresholdSeconds) {
      extendedBy = MULTIPLAYER_AUCTION_RULES.antiSnipeExtensionSeconds;
      room.deadlineEpochMs = Date.now() + extendedBy * 1000;
      room.hammerSecondsRemaining = extendedBy;
    }
    room.hammerCall = 'Active Bidding';
    room.serverSequence += 1;

    const franchise = INITIAL_TEAMS[participant.franchiseId];

    const bidRecord: MultiplayerBidRecord = {
      id: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      participantId: playerId,
      participantName: participant.name,
      franchiseId: participant.franchiseId,
      franchiseShort: franchise?.shortName || 'IPL',
      franchisePrimaryColor: franchise?.primaryColor || '#D4AF37',
      franchiseSecondaryColor: franchise?.secondaryColor || '#000',
      bidAmountCr: roundedBid,
      timestamp: Date.now()
    };

    room.bidHistory.push(bidRecord);

    broadcastToRoom(room.roomCode, {
      type: 'BID_PLACED',
      bid: bidRecord,
      currentHighBidCr: roundedBid,
      hammerSecondsRemaining: room.hammerSecondsRemaining
    });
    if (extendedBy > 0) {
      broadcastToRoom(room.roomCode, {
        type: 'TIMER_EXTENDED',
        hammerSecondsRemaining: room.hammerSecondsRemaining,
        extensionSeconds: extendedBy
      });
    }

    broadcastState(room);
    return { success: true, state: room };
  },

  // Pause Auction (Host only)
  pauseAuction(roomCode: string, hostPlayerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    if (room.hostId !== hostPlayerId) {
      return { success: false, error: 'Only the host has pause control.' };
    }

    if (room.status !== 'in_progress') {
      return { success: false, error: 'Auction is not currently in progress.' };
    }

    const host = room.participants.find(p => p.id === hostPlayerId);
    room.isPaused = true;
    room.pausedByHostId = hostPlayerId;

    broadcastToRoom(room.roomCode, {
      type: 'AUCTION_PAUSED',
      pausedByHostName: host?.name || 'Host'
    });
    broadcastState(room);

    return { success: true, state: room };
  },

  // Resume Auction (Host only)
  resumeAuction(roomCode: string, hostPlayerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: false, error: 'Room not found.' };

    if (room.hostId !== hostPlayerId) {
      return { success: false, error: 'Only the host has resume control.' };
    }

    room.isPaused = false;
    room.pausedByHostId = null;

    broadcastToRoom(room.roomCode, {
      type: 'AUCTION_RESUMED'
    });
    broadcastState(room);

    return { success: true, state: room };
  },

  // Leave / Disconnect Room
  leaveRoom(roomCode: string, playerId: string): { success: boolean } {
    const room = rooms.get(roomCode.toUpperCase());
    if (!room) return { success: true };

    if (room.status === 'lobby') {
      room.participants = room.participants.filter(p => p.id !== playerId);
      if (room.participants.length === 0) {
        rooms.delete(roomCode);
        return { success: true };
      }
      // Reassign host if host left in lobby
      if (room.hostId === playerId && room.participants.length > 0) {
        room.hostId = room.participants[0].id;
        room.participants[0].isHost = true;
      }
      broadcastState(room);
    } else {
      // In live auction: mark disconnected
      const p = room.participants.find(part => part.id === playerId);
      if (p) {
        p.isConnected = false;
        p.disconnectedAt = Date.now();
        if (room.hostId === playerId) {
          const nextHost = room.participants.find(part => part.isConnected && part.id !== playerId) || room.participants.find(part => part.id !== playerId);
          if (nextHost) {
            p.isHost = false;
            nextHost.isHost = true;
            room.hostId = nextHost.id;
          }
        }
        broadcastState(room);
      }
    }

    return { success: true };
  },

  // Public lobby browser: only real rooms that currently exist and have not started yet.
  listOpenRooms() {
    return Array.from(rooms.values())
      .filter(room => {
        const liveConnections = sseClients.get(room.roomCode)?.size || 0;
        return room.status === 'lobby' && liveConnections > 0 && room.participants.length > 0 && room.participants.length < room.config.maxPlayers;
      })
      .map(room => {
        const host = room.participants.find(p => p.id === room.hostId) || room.participants[0];
        return {
          code: room.roomCode,
          name: room.roomName,
          hostName: host?.name || 'Host Manager',
          purseCr: room.config.startingPurseCr,
          poolType: room.config.poolType,
          playerCount: room.participants.length,
          maxPlayers: room.config.maxPlayers,
          status: 'In Lobby' as const,
          tag: getRoomTag(room.config),
          timerSeconds: room.config.timerSeconds,
          createdVersion: room.version
        };
      })
      .sort((a, b) => b.playerCount - a.playerCount || a.name.localeCompare(b.name));
  },

  // Get Room State
  getRoomState(roomCode: string): MultiplayerRoomState | null {
    return rooms.get(roomCode.toUpperCase()) || null;
  },

  // Subscribe SSE stream
  subscribeSSE(roomCode: string, res: Response): () => void {
    const code = roomCode.toUpperCase();
    if (!sseClients.has(code)) {
      sseClients.set(code, new Set());
    }

    const clientSet = sseClients.get(code)!;
    clientSet.add(res);

    // Initial state push
    const room = rooms.get(code);
    if (room) {
      res.write(`data: ${JSON.stringify({ type: 'STATE_UPDATE', state: room })}\n\n`);
    }

    // Cleanup when connection closes
    return () => {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        sseClients.delete(code);
      }
    };
  }
};
