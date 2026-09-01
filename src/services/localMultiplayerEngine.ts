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
} from '../types/multiplayerAuction';
import { INITIAL_PLAYERS } from '../data/players';
import { INITIAL_TEAMS } from '../data/teams';
import { Player } from '../types/cricket';
import { calculateAuctionPerformanceScore, getMultiplayerBidIncrement, normalizeCr } from '../multiplayer/auctionRules';

const DEFAULT_CONFIG: MultiplayerAuctionConfig = {
  format: 'Mega Auction',
  startingPurseCr: 100,
  minPlayers: 2,
  maxPlayers: 8,
  poolType: 'Full Draft Pool',
  minSquadSize: 15,
  maxSquadSize: 25,
  overseasLimit: 8,
  timerSeconds: 15
};

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePlayerPool(poolType: MultiplayerAuctionConfig['poolType']): Player[] {
  const all = [...INITIAL_PLAYERS];
  const sorted = all.sort((a, b) => b.overall - a.overall);

  if (poolType === 'Top 15 Accelerated') {
    return sorted.slice(0, 15);
  } else if (poolType === 'Top 30 Marquee & Stars') {
    return sorted.slice(0, 30);
  } else {
    return sorted.slice(0, 80);
  }
}

function computeAwards(room: MultiplayerRoomState): MultiplayerAward[] {
  const awards: MultiplayerAward[] = [];
  const participants = room.participants;

  // 1. Grand Master Tactician
  const sortedByScore = [...participants].sort((a, b) => 
    calculateAuctionPerformanceScore(b, room.config.startingPurseCr) - 
    calculateAuctionPerformanceScore(a, room.config.startingPurseCr)
  );
  if (sortedByScore[0]) {
    const p = sortedByScore[0];
    const team = p.franchiseId ? INITIAL_TEAMS[p.franchiseId] : null;
    awards.push({
      title: 'Grand Master Tactician',
      recipientName: p.name,
      franchiseName: team?.name || 'Franchise',
      franchiseShort: team?.shortName || 'IPL',
      description: `Highest auction performance score (${calculateAuctionPerformanceScore(p, room.config.startingPurseCr)} pts) with squad balance.`,
      badge: '🏆'
    });
  }

  // 2. Budget Maximizer
  const remainingPurseSorted = [...participants].sort((a, b) => a.purseCr - b.purseCr);
  if (remainingPurseSorted[0] && remainingPurseSorted[0].squadPlayers.length >= 5) {
    const p = remainingPurseSorted[0];
    const team = p.franchiseId ? INITIAL_TEAMS[p.franchiseId] : null;
    awards.push({
      title: 'Budget Maximizer',
      recipientName: p.name,
      franchiseName: team?.name || 'Franchise',
      franchiseShort: team?.shortName || 'IPL',
      description: `Maximized buying power leaving just ₹${p.purseCr.toFixed(2)} Cr in reserve.`,
      badge: '💰'
    });
  }

  // 3. Best Value Steal
  const soldSortedByValue = [...room.soldRecords].sort((a, b) => 
    (b.player.overall / Math.max(0.25, b.sellingPriceCr)) - (a.player.overall / Math.max(0.25, a.sellingPriceCr))
  );
  const bestSteal = soldSortedByValue[0];
  if (bestSteal) {
    awards.push({
      title: 'Auction Heist of the Day',
      recipientName: bestSteal.winningParticipantName,
      franchiseName: bestSteal.winningFranchiseShort,
      franchiseShort: bestSteal.winningFranchiseShort,
      description: `Secured ${bestSteal.player.name} (${bestSteal.player.overall} OVR) for just ₹${bestSteal.sellingPriceCr.toFixed(2)} Cr!`,
      badge: '💎'
    });
  }

  return awards;
}

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

class LocalMultiplayerEngine {
  private rooms = new Map<string, MultiplayerRoomState>();
  private timers = new Map<string, any>();
  private breakTimers = new Map<string, any>();
  private listeners = new Map<string, Set<(event: MultiplayerClientEvent) => void>>();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('ipl_multiplayer_channel');
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data?.roomCode && ev.data?.event) {
            this.notifyListeners(ev.data.roomCode, ev.data.event);
          }
        };
      } catch {
        // ignore
      }
    }

    this.seedPublicRooms();
  }

  private seedPublicRooms() {
    const demoConfigs = [
      { code: 'IPL749', host: 'MS Dhoni', franchise: 'csk', purse: 100 },
      { code: 'CSK888', host: 'Gautam Gambhir', franchise: 'kkr', purse: 120 },
      { code: 'RCB018', host: 'Rohit Sharma', franchise: 'mi', purse: 100 }
    ];

    demoConfigs.forEach(d => {
      if (!this.rooms.has(d.code)) {
        const pool = generatePlayerPool('Full Draft Pool');
        const room: MultiplayerRoomState = {
          roomCode: d.code,
          roomName: `${d.host}'s War Room`,
          hostId: `bot_${d.code}`,
          config: { ...DEFAULT_CONFIG, startingPurseCr: d.purse },
          status: 'lobby',
          participants: [
            {
              id: `bot_${d.code}`,
              name: d.host,
              franchiseId: d.franchise,
              isHost: true,
              isReady: true,
              isAI: true,
              purseCr: d.purse,
              squadPlayerIds: [],
              squadPlayers: [],
              isConnected: true,
              lastBidCr: null
            }
          ],
          playerPool: pool,
          currentLotIndex: 0,
          totalLots: pool.length,
          currentLotPlayer: null,
          currentHighBidCr: 0,
          currentHighBidderId: null,
          currentHighBidderFranchiseId: null,
          hammerSecondsRemaining: 15,
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
          version: 1
        };
        this.rooms.set(d.code, room);
      }
    });
  }

  private notifyListeners(roomCode: string, event: MultiplayerClientEvent) {
    const roomSubs = this.listeners.get(roomCode);
    if (roomSubs) {
      roomSubs.forEach(cb => cb(event));
    }
  }

  private broadcast(roomCode: string, event: MultiplayerClientEvent) {
    this.notifyListeners(roomCode, event);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ roomCode, event });
      } catch {
        // ignore
      }
    }
  }

  private broadcastState(room: MultiplayerRoomState) {
    room.version++;
    this.broadcast(room.roomCode, {
      type: 'STATE_UPDATE',
      state: { ...room }
    });
  }

  subscribe(roomCode: string, callback: (event: MultiplayerClientEvent) => void): () => void {
    if (!this.listeners.has(roomCode)) {
      this.listeners.set(roomCode, new Set());
    }
    this.listeners.get(roomCode)!.add(callback);

    return () => {
      const set = this.listeners.get(roomCode);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(roomCode);
      }
    };
  }

  getOpenRooms(): any[] {
    const list: any[] = [];
    this.rooms.forEach((room) => {
      if (room.status === 'lobby') {
        const host = room.participants.find(p => p.id === room.hostId);
        list.push({
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
        });
      }
    });
    return list;
  }

  getRoom(roomCode: string): MultiplayerRoomState | null {
    const code = roomCode.trim().toUpperCase();
    return this.rooms.get(code) || null;
  }

  createRoom(hostPlayerId: string, hostName: string, config?: Partial<MultiplayerAuctionConfig>): MultiplayerRoomState {
    const code = generateRoomCode();
    const finalConfig: MultiplayerAuctionConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };
    const playerPool = generatePlayerPool(finalConfig.poolType);

    const hostParticipant: MultiplayerParticipant = {
      id: hostPlayerId,
      name: hostName || 'Tactician',
      franchiseId: null,
      isHost: true,
      isReady: false,
      isAI: false,
      purseCr: finalConfig.startingPurseCr,
      squadPlayerIds: [],
      squadPlayers: [],
      isConnected: true,
      lastBidCr: null
    };

    const roomState: MultiplayerRoomState = {
      roomCode: code,
      roomName: `${hostName || 'Tactician'}'s War Room`,
      hostId: hostPlayerId,
      config: finalConfig,
      status: 'lobby',
      participants: [hostParticipant],
      playerPool,
      currentLotIndex: 0,
      totalLots: playerPool.length,
      currentLotPlayer: null,
      currentHighBidCr: 0,
      currentHighBidderId: null,
      currentHighBidderFranchiseId: null,
      hammerSecondsRemaining: finalConfig.timerSeconds,
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
      version: 1
    };

    this.rooms.set(code, roomState);
    return roomState;
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const code = roomCode.trim().toUpperCase();
    let room = this.rooms.get(code);

    if (!room) {
      room = this.createRoom(playerId, playerName);
      room.roomCode = code;
      this.rooms.set(code, room);
      return { success: true, state: room };
    }

    const existing = room.participants.find(p => p.id === playerId);
    if (existing) {
      existing.isConnected = true;
      existing.name = playerName || existing.name;
    } else {
      if (room.status !== 'lobby') {
        return { success: false, error: 'Auction already started for this war room.' };
      }
      if (room.participants.length >= room.config.maxPlayers) {
        return { success: false, error: 'Room is already full.' };
      }

      room.participants.push({
        id: playerId,
        name: playerName || `Player ${room.participants.length + 1}`,
        franchiseId: null,
        isHost: false,
        isReady: false,
        isAI: false,
        purseCr: room.config.startingPurseCr,
        squadPlayerIds: [],
        squadPlayers: [],
        isConnected: true,
        lastBidCr: null
      });
    }

    this.broadcastState(room);
    return { success: true, state: room };
  }

  selectFranchise(roomCode: string, playerId: string, franchiseId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Participant not in room' };

    const takenBy = room.participants.find(p => p.franchiseId === franchiseId && p.id !== playerId);
    if (takenBy) return { success: false, error: 'Franchise already claimed by another manager' };

    participant.franchiseId = franchiseId;
    this.broadcastState(room);
    return { success: true, state: room };
  }

  toggleReady(roomCode: string, playerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };

    const participant = room.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Participant not in room' };
    if (!participant.franchiseId) return { success: false, error: 'Please select an IPL franchise first.' };

    participant.isReady = !participant.isReady;
    this.broadcastState(room);
    return { success: true, state: room };
  }

  updateConfig(roomCode: string, hostPlayerId: string, newConfig: Partial<MultiplayerAuctionConfig>): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only host can modify config' };

    room.config = { ...room.config, ...newConfig };
    if (newConfig.poolType) {
      room.playerPool = generatePlayerPool(newConfig.poolType);
      room.totalLots = room.playerPool.length;
    }
    if (newConfig.startingPurseCr) {
      room.participants.forEach(p => {
        if (p.squadPlayers.length === 0) {
          p.purseCr = newConfig.startingPurseCr!;
        }
      });
    }

    this.broadcastState(room);
    return { success: true, state: room };
  }

  startAuction(roomCode: string, hostPlayerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only host can start auction' };

    const allFranchiseKeys = ['csk', 'mi', 'rcb', 'kkr', 'gt', 'rr', 'dc', 'srh', 'lsg', 'pbks'];
    const takenKeys = new Set(room.participants.map(p => p.franchiseId).filter(Boolean));
    const availableKeys = allFranchiseKeys.filter(k => !takenKeys.has(k));

    while (room.participants.length < Math.min(room.config.maxPlayers, 6) && availableKeys.length > 0) {
      const fKey = availableKeys.shift()!;
      const team = INITIAL_TEAMS[fKey];
      room.participants.push({
        id: `bot_${fKey}_${Date.now()}`,
        name: `${team?.coachName || team?.shortName} (AI)`,
        franchiseId: fKey,
        isHost: false,
        isReady: true,
        isAI: true,
        purseCr: room.config.startingPurseCr,
        squadPlayerIds: [],
        squadPlayers: [],
        isConnected: true,
        lastBidCr: null
      });
    }

    room.status = 'in_progress';
    room.currentLotIndex = 0;
    this.startLot(room, 0);

    return { success: true, state: room };
  }

  private startLot(room: MultiplayerRoomState, lotIndex: number) {
    this.clearTimers(room.roomCode);

    if (lotIndex >= room.playerPool.length) {
      room.status = 'completed';
      room.rankings = computeRankings(room);
      room.awards = computeAwards(room);
      this.broadcast(room.roomCode, {
        type: 'AUCTION_COMPLETED',
        rankings: room.rankings,
        awards: room.awards
      });
      this.broadcastState(room);
      return;
    }

    const player = room.playerPool[lotIndex];
    room.currentLotIndex = lotIndex;
    room.currentLotPlayer = player;
    room.currentHighBidCr = player.basePriceCr;
    room.currentHighBidderId = null;
    room.currentHighBidderFranchiseId = null;
    room.bidHistory = [];
    room.hammerSecondsRemaining = room.config.timerSeconds || 15;
    room.hammerCall = 'Opening Bid';

    this.broadcast(room.roomCode, {
      type: 'LOT_STARTED',
      lotIndex,
      totalLots: room.playerPool.length,
      player
    });
    this.broadcastState(room);

    this.runHammerLoop(room.roomCode);
  }

  private runHammerLoop(roomCode: string) {
    const timer = setInterval(() => {
      const room = this.rooms.get(roomCode);
      if (!room || room.status !== 'in_progress' || room.isPaused) return;

      room.hammerSecondsRemaining--;

      let call: HammerCallState = 'Opening Bid';
      if (room.currentHighBidderId) {
        if (room.hammerSecondsRemaining > 10) call = 'Active Bidding';
        else if (room.hammerSecondsRemaining > 6) call = 'Going Once';
        else if (room.hammerSecondsRemaining > 2) call = 'Going Twice';
        else call = 'Going Twice';
      } else {
        if (room.hammerSecondsRemaining > 6) call = 'Opening Bid';
        else if (room.hammerSecondsRemaining > 2) call = 'Going Once';
        else call = 'Going Twice';
      }
      room.hammerCall = call;

      this.broadcast(roomCode, {
        type: 'TICK',
        hammerSecondsRemaining: Math.max(0, room.hammerSecondsRemaining),
        hammerCall: call
      });

      // Simulate AI bot bidding
      if (room.currentLotPlayer && room.hammerSecondsRemaining >= 3 && Math.random() < 0.35) {
        this.simulateBotBid(room);
      }

      if (room.hammerSecondsRemaining <= 0) {
        clearInterval(timer);
        this.resolveLot(roomCode);
      }
    }, 1000);

    this.timers.set(roomCode, timer);
  }

  private simulateBotBid(room: MultiplayerRoomState) {
    const player = room.currentLotPlayer;
    if (!player) return;

    const bots = room.participants.filter(p => p.isAI && p.id !== room.currentHighBidderId);
    if (!bots.length) return;

    const bot = bots[Math.floor(Math.random() * bots.length)];
    const inc = getMultiplayerBidIncrement(room.currentHighBidCr);
    const nextBid = normalizeCr(room.currentHighBidCr + inc);

    const maxBotBudget = player.overall > 85 ? room.config.startingPurseCr * 0.25 : room.config.startingPurseCr * 0.12;
    if (nextBid <= bot.purseCr && nextBid <= maxBotBudget) {
      this.placeBid(room.roomCode, bot.id, nextBid);
    }
  }

  placeBid(roomCode: string, playerId: string, bidAmountCr: number): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'in_progress' || !room.currentLotPlayer) {
      return { success: false, error: 'No active lot available for bidding' };
    }

    const participant = room.participants.find(p => p.id === playerId);
    if (!participant) return { success: false, error: 'Participant not in room' };
    if (!participant.franchiseId) return { success: false, error: 'Must select franchise first' };

    const roundedBid = normalizeCr(bidAmountCr);
    if (roundedBid > participant.purseCr) return { success: false, error: 'Insufficient purse balance' };
    if (roundedBid <= room.currentHighBidCr) return { success: false, error: 'Bid must exceed current highest bid' };

    room.currentHighBidCr = roundedBid;
    room.currentHighBidderId = participant.id;
    room.currentHighBidderFranchiseId = participant.franchiseId;

    const team = INITIAL_TEAMS[participant.franchiseId];

    const bidRecord: MultiplayerBidRecord = {
      id: `bid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      participantId: participant.id,
      participantName: participant.name,
      franchiseId: participant.franchiseId,
      franchiseShort: team?.shortName || participant.franchiseId.toUpperCase(),
      franchisePrimaryColor: team?.primaryColor || '#FACC15',
      franchiseSecondaryColor: team?.secondaryColor || '#1E3A8A',
      bidAmountCr: roundedBid,
      timestamp: Date.now()
    };

    room.bidHistory.push(bidRecord);
    participant.lastBidCr = roundedBid;

    // Anti-snipe timer extension
    if (room.hammerSecondsRemaining < 5) {
      room.hammerSecondsRemaining = 6;
      this.broadcast(roomCode, {
        type: 'TIMER_EXTENDED',
        hammerSecondsRemaining: 6,
        extensionSeconds: 3
      });
    }

    this.broadcast(roomCode, {
      type: 'BID_PLACED',
      bid: bidRecord,
      currentHighBidCr: roundedBid,
      hammerSecondsRemaining: room.hammerSecondsRemaining
    });

    this.broadcastState(room);
    return { success: true, state: room };
  }

  private resolveLot(roomCode: string) {
    const room = this.getRoom(roomCode);
    if (!room || !room.currentLotPlayer) return;

    const player = room.currentLotPlayer;
    room.status = 'lot_break';

    if (room.currentHighBidderId) {
      const winner = room.participants.find(p => p.id === room.currentHighBidderId);
      if (winner) {
        winner.purseCr = normalizeCr(winner.purseCr - room.currentHighBidCr);
        winner.squadPlayerIds.push(player.id);
        winner.squadPlayers.push({
          ...player,
          salaryCr: room.currentHighBidCr,
          currentTeamId: winner.franchiseId || 'csk'
        });

        const soldRecord: MultiplayerSoldRecord = {
          player,
          winningParticipantId: winner.id,
          winningParticipantName: winner.name,
          winningFranchiseId: winner.franchiseId || 'csk',
          winningFranchiseShort: winner.franchiseId?.toUpperCase() || 'IPL',
          sellingPriceCr: room.currentHighBidCr,
          timestamp: Date.now()
        };

        room.soldRecords.push(soldRecord);
        room.hammerCall = 'Sold!';

        this.broadcast(roomCode, {
          type: 'LOT_SOLD',
          record: soldRecord,
          nextLotInSeconds: 3
        });
      }
    } else {
      room.unsoldPlayerIds.push(player.id);
      room.hammerCall = 'Unsold';

      this.broadcast(roomCode, {
        type: 'LOT_UNSOLD',
        player,
        nextLotInSeconds: 3
      });
    }

    this.broadcastState(room);

    const breakTimer = setTimeout(() => {
      const r = this.getRoom(roomCode);
      if (r && r.status === 'lot_break') {
        r.status = 'in_progress';
        this.startLot(r, r.currentLotIndex + 1);
      }
    }, 3500);

    this.breakTimers.set(roomCode, breakTimer);
  }

  pauseAuction(roomCode: string, hostPlayerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only host can pause' };

    const host = room.participants.find(p => p.id === hostPlayerId);
    room.isPaused = true;
    room.pausedByHostId = hostPlayerId;
    this.broadcast(roomCode, { 
      type: 'AUCTION_PAUSED',
      pausedByHostName: host?.name || 'Host'
    });
    this.broadcastState(room);
    return { success: true, state: room };
  }

  resumeAuction(roomCode: string, hostPlayerId: string): { success: boolean; state?: MultiplayerRoomState; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.hostId !== hostPlayerId) return { success: false, error: 'Only host can resume' };

    room.isPaused = false;
    room.pausedByHostId = null;
    this.broadcast(roomCode, { type: 'AUCTION_RESUMED' });
    this.broadcastState(room);
    return { success: true, state: room };
  }

  private clearTimers(roomCode: string) {
    if (this.timers.has(roomCode)) {
      clearInterval(this.timers.get(roomCode));
      this.timers.delete(roomCode);
    }
    if (this.breakTimers.has(roomCode)) {
      clearTimeout(this.breakTimers.get(roomCode));
      this.breakTimers.delete(roomCode);
    }
  }
}

export const localMultiplayerEngine = new LocalMultiplayerEngine();
