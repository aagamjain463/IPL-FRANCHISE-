'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

process.env.LEADERBOARD_DATA_PATH = path.join(os.tmpdir(), `ipl-franchise-leaderboard-test-${Date.now()}.json`);

const { MultiplayerAuctionEngine } = await import('../server/multiplayerAuctionEngine');
const { getMultiplayerBidIncrement, normalizeCr } = await import('../src/multiplayer/auctionRules');

const mockSse = () => ({
  write: (_chunk: string) => true
}) as any;

const hostId = `test_host_${Date.now()}`;
const p2Id = `test_p2_${Date.now()}`;
const p3Id = `test_p3_${Date.now()}`;

const room = MultiplayerAuctionEngine.createRoom(hostId, 'Host Tester', {
  minPlayers: 2,
  maxPlayers: 4,
  startingPurseCr: 100,
  poolType: 'Top 15 Accelerated',
  timerSeconds: 10
});
const unsub = MultiplayerAuctionEngine.subscribeSSE(room.roomCode, mockSse());

const join2 = MultiplayerAuctionEngine.joinRoom(room.roomCode, p2Id, 'Race Manager B');
assert.equal(join2.success, true, 'second client can join an active SSE-backed lobby');
const join3 = MultiplayerAuctionEngine.joinRoom(room.roomCode, p3Id, 'Race Manager C');
assert.equal(join3.success, true, 'third client can join');

assert.equal(MultiplayerAuctionEngine.selectFranchise(room.roomCode, hostId, 'csk').success, true);
assert.equal(MultiplayerAuctionEngine.selectFranchise(room.roomCode, p2Id, 'mi').success, true);
assert.equal(MultiplayerAuctionEngine.selectFranchise(room.roomCode, p3Id, 'rcb').success, true);
assert.equal(MultiplayerAuctionEngine.selectFranchise(room.roomCode, p3Id, 'mi').success, false, 'duplicate franchise is rejected');
assert.equal(MultiplayerAuctionEngine.selectFranchise(room.roomCode, p3Id, 'rr').success, true);

assert.equal(MultiplayerAuctionEngine.toggleReady(room.roomCode, hostId).success, true);
assert.equal(MultiplayerAuctionEngine.toggleReady(room.roomCode, p2Id).success, true);
assert.equal(MultiplayerAuctionEngine.toggleReady(room.roomCode, p3Id).success, true);
assert.equal(MultiplayerAuctionEngine.startAuction(room.roomCode, hostId).success, true);

let state = MultiplayerAuctionEngine.getRoomState(room.roomCode)!;
const base = state.currentHighBidCr;
const inc = getMultiplayerBidIncrement(base);
const bidA = normalizeCr(base + inc);
assert.equal(MultiplayerAuctionEngine.placeBid(room.roomCode, hostId, bidA).success, true, 'valid bid accepted');
assert.equal(MultiplayerAuctionEngine.placeBid(room.roomCode, hostId, normalizeCr(bidA + inc)).success, false, 'duplicate highest-bidder bid rejected');
assert.equal(MultiplayerAuctionEngine.placeBid(room.roomCode, p2Id, bidA).success, false, 'stale duplicate bid rejected');
assert.equal(MultiplayerAuctionEngine.placeBid(room.roomCode, p2Id, 999).success, false, 'insufficient purse rejected');

state = MultiplayerAuctionEngine.getRoomState(room.roomCode)!;
state.deadlineEpochMs = Date.now() + 1500;
state.hammerSecondsRemaining = 2;
const lateBid = normalizeCr(state.currentHighBidCr + getMultiplayerBidIncrement(state.currentHighBidCr));
assert.equal(MultiplayerAuctionEngine.placeBid(room.roomCode, p2Id, lateBid).success, true, 'late valid bid accepted');
state = MultiplayerAuctionEngine.getRoomState(room.roomCode)!;
assert.ok(state.hammerSecondsRemaining >= 5, 'anti-snipe extension applied from server');

const raceBase = state.currentHighBidCr;
const raceInc = getMultiplayerBidIncrement(raceBase);
const raceA = MultiplayerAuctionEngine.placeBid(room.roomCode, hostId, normalizeCr(raceBase + raceInc));
const raceB = MultiplayerAuctionEngine.placeBid(room.roomCode, p3Id, normalizeCr(raceBase + raceInc));
assert.equal([raceA.success, raceB.success].filter(Boolean).length, 1, 'simultaneous same-price race has one deterministic winner');

MultiplayerAuctionEngine.leaveRoom(room.roomCode, hostId);
state = MultiplayerAuctionEngine.getRoomState(room.roomCode)!;
assert.notEqual(state.hostId, hostId, 'host transfers after disconnect');
assert.equal(state.participants.filter(p => p.squadPlayerIds.length !== new Set(p.squadPlayerIds).size).length, 0, 'no duplicate player ownership within squads');
assert.equal(state.participants.some(p => p.purseCr < 0), false, 'no negative purses');

unsub();
console.log('Multiplayer auction authoritative-engine tests passed:', room.roomCode);
