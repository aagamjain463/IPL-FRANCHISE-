import { Player } from '../types/cricket';
import { MultiplayerParticipant } from '../types/multiplayerAuction';

export interface BidIncrementBand {
  minCr: number;
  maxCr: number | null;
  incrementCr: number;
}

export interface MultiplayerAuctionRulesConfig {
  defaultTimerSeconds: number;
  antiSnipeThresholdSeconds: number;
  antiSnipeExtensionSeconds: number;
  reconnectGraceMs: number;
  bidIncrementBands: BidIncrementBand[];
  scoringWeights: {
    squadOvr: number;
    efficiency: number;
    roleCoverage: number;
    remainingPurse: number;
    squadDepth: number;
  };
}

export const MULTIPLAYER_AUCTION_RULES: MultiplayerAuctionRulesConfig = {
  defaultTimerSeconds: 15,
  antiSnipeThresholdSeconds: 3,
  antiSnipeExtensionSeconds: 5,
  reconnectGraceMs: 90_000,
  bidIncrementBands: [
    { minCr: 0, maxCr: 5, incrementCr: 0.25 },
    { minCr: 5, maxCr: 10, incrementCr: 0.5 },
    { minCr: 10, maxCr: 20, incrementCr: 1 },
    { minCr: 20, maxCr: null, incrementCr: 2 }
  ],
  scoringWeights: {
    squadOvr: 0.42,
    efficiency: 0.22,
    roleCoverage: 0.18,
    remainingPurse: 0.08,
    squadDepth: 0.1
  }
};

export function getMultiplayerBidIncrement(currentBidCr: number): number {
  const band = MULTIPLAYER_AUCTION_RULES.bidIncrementBands.find(item =>
    currentBidCr >= item.minCr && (item.maxCr === null || currentBidCr < item.maxCr)
  );
  return band?.incrementCr || 0.25;
}

export function normalizeCr(value: number): number {
  return Number(value.toFixed(2));
}

export function isValidBidIncrement(currentBidCr: number, bidAmountCr: number): boolean {
  const minNextBid = normalizeCr(currentBidCr + getMultiplayerBidIncrement(currentBidCr));
  const roundedBid = normalizeCr(bidAmountCr);
  if (roundedBid < minNextBid) return false;
  const increment = getMultiplayerBidIncrement(currentBidCr);
  const steps = Math.round((roundedBid - currentBidCr) / increment);
  return Math.abs(normalizeCr(currentBidCr + steps * increment) - roundedBid) < 0.001;
}

export function calculateAuctionPerformanceScore(participant: MultiplayerParticipant, startingPurseCr: number): number {
  const squad = participant.squadPlayers || [];
  if (!squad.length) return 0;

  const avgOvr = squad.reduce((sum, player) => sum + player.overall, 0) / squad.length;
  const spentCr = Math.max(0, startingPurseCr - participant.purseCr);
  const ovrPerCr = spentCr > 0 ? squad.reduce((sum, player) => sum + player.overall, 0) / spentCr : 0;
  const normalizedEfficiency = Math.min(100, ovrPerCr * 3.2);
  const roleCoverage = getRoleCoverageScore(squad);
  const remainingPurseScore = Math.min(100, Math.max(0, (participant.purseCr / startingPurseCr) * 100));
  const depthScore = Math.min(100, (squad.length / 15) * 100);
  const w = MULTIPLAYER_AUCTION_RULES.scoringWeights;

  return Math.round(
    avgOvr * w.squadOvr +
    normalizedEfficiency * w.efficiency +
    roleCoverage * w.roleCoverage +
    remainingPurseScore * w.remainingPurse +
    depthScore * w.squadDepth
  );
}

export function getRoleCoverageScore(players: Player[]): number {
  const hasBatter = players.some(p => p.role.includes('Batter') || p.role.includes('Wicketkeeper'));
  const hasBowler = players.some(p => p.role.includes('Bowler'));
  const hasAllRounder = players.some(p => p.role.includes('All-rounder'));
  const hasKeeper = players.some(p => p.role.includes('Wicketkeeper'));
  const overseasOk = players.filter(p => p.isOverseas).length <= 8;
  const coverage = [hasBatter, hasBowler, hasAllRounder, hasKeeper, overseasOk].filter(Boolean).length;
  return (coverage / 5) * 100;
}
