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

export interface AuctionEvaluationResult {
  finalScore: number;
  breakdown: {
    squadStrength: number;
    squadBalance: number;
    playingXIQuality: number;
    budgetEfficiency: number;
    squadCompletion: number;
  };
  squadOvr: number;
  playingXIOverall: number;
  playingXIPlayers: Player[];
  squadValueCr: number;
  spentPurseCr: number;
  remainingPurseCr: number;
  playersBought: number;
  overseasCount: number;
  marqueeCount: number;
}

/**
 * Deterministically constructs the strongest legal Playing XI from the given squad.
 * Rules for valid XI:
 * - Exactly 11 players (or as many as available up to 11)
 * - At least 1 Wicketkeeper
 * - At least 3 specialized/top-order Batters
 * - At least 3 specialized Bowlers (Pace & Spin)
 * - 1 to 3 All-rounders
 * - Maximum 4 Overseas players
 */
export function generateBestPlayingXI(players: Player[], maxOverseas: number = 4): {
  playingXI: Player[];
  overall: number;
  hasKeeper: boolean;
  bowlingOptionsCount: number;
  overseasCount: number;
  validXI: boolean;
} {
  if (!players || players.length === 0) {
    return {
      playingXI: [],
      overall: 0,
      hasKeeper: false,
      bowlingOptionsCount: 0,
      overseasCount: 0,
      validXI: false
    };
  }

  // Sort squad by overall rating descending
  const sorted = [...players].sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));

  const keepers = sorted.filter(p => p.role.includes('Wicketkeeper'));
  const pureBatters = sorted.filter(p => p.role.includes('Batter') && !p.role.includes('Wicketkeeper'));
  const allRounders = sorted.filter(p => p.role.includes('All-rounder'));
  const pureBowlers = sorted.filter(p => p.role.includes('Bowler') && !p.role.includes('All-rounder'));

  const selected: Player[] = [];
  let overseasSelected = 0;

  const tryAdd = (player: Player): boolean => {
    if (selected.some(p => p.id === player.id)) return false;
    if (selected.length >= 11) return false;
    if (player.isOverseas && overseasSelected >= maxOverseas) return false;

    selected.push(player);
    if (player.isOverseas) overseasSelected++;
    return true;
  };

  // 1. Mandatory 1 Wicketkeeper (highest rating)
  for (const k of keepers) {
    if (tryAdd(k)) break;
  }

  // 2. Add top 3 Batters
  let addedBatters = 0;
  for (const b of pureBatters) {
    if (addedBatters >= 3) break;
    if (tryAdd(b)) addedBatters++;
  }

  // 3. Add top 3 Bowlers
  let addedBowlers = 0;
  for (const bo of pureBowlers) {
    if (addedBowlers >= 3) break;
    if (tryAdd(bo)) addedBowlers++;
  }

  // 4. Add top 1 All-rounder
  let addedAR = 0;
  for (const ar of allRounders) {
    if (addedAR >= 1) break;
    if (tryAdd(ar)) addedAR++;
  }

  // 5. Fill remaining spots up to 11 with highest overall available eligible players
  for (const p of sorted) {
    if (selected.length >= 11) break;
    tryAdd(p);
  }

  // If overseas cap prevented reaching 11, try adding eligible domestic players
  if (selected.length < Math.min(11, players.length)) {
    for (const p of sorted) {
      if (selected.length >= 11) break;
      if (!p.isOverseas && !selected.some(s => s.id === p.id)) {
        selected.push(p);
      }
    }
  }

  const hasKeeper = selected.some(p => p.role.includes('Wicketkeeper'));
  const bowlingOptionsCount = selected.filter(p => p.role.includes('Bowler') || p.role.includes('All-rounder') || (p.bowlingRating && p.bowlingRating >= 65)).length;
  const overseasCount = selected.filter(p => p.isOverseas).length;
  const validXI = selected.length === 11 && hasKeeper && bowlingOptionsCount >= 5 && overseasCount <= maxOverseas;

  const overall = selected.length > 0
    ? Math.round(selected.reduce((sum, p) => sum + p.overall, 0) / selected.length)
    : 0;

  return {
    playingXI: selected,
    overall,
    hasKeeper,
    bowlingOptionsCount,
    overseasCount,
    validXI
  };
}

/**
 * Deterministic calculateAuctionScore evaluating a squad out of 100 points:
 * - A. Squad Strength (40 pts)
 * - B. Squad Balance (20 pts)
 * - C. Playing XI Quality (20 pts)
 * - D. Budget Efficiency (10 pts)
 * - E. Squad Completion (10 pts)
 */
export function calculateAuctionScore(
  participant: MultiplayerParticipant,
  startingPurseCr: number = 100,
  targetMinSquad: number = 11
): AuctionEvaluationResult {
  const squad = participant.squadPlayers || [];
  const playersBought = squad.length;
  const spentPurseCr = Number(Math.max(0, startingPurseCr - (participant.purseCr || 0)).toFixed(2));
  const remainingPurseCr = Number((participant.purseCr || 0).toFixed(2));
  const overseasCount = squad.filter(p => p.isOverseas).length;
  const marqueeCount = squad.filter(p => p.overall >= 88 || p.basePriceCr >= 2.0).length;
  const squadValueCr = Number(squad.reduce((sum, p) => sum + (p.salaryCr || p.basePriceCr || 1), 0).toFixed(2));

  if (playersBought === 0) {
    return {
      finalScore: 0,
      breakdown: {
        squadStrength: 0,
        squadBalance: 0,
        playingXIQuality: 0,
        budgetEfficiency: 0,
        squadCompletion: 0
      },
      squadOvr: 0,
      playingXIOverall: 0,
      playingXIPlayers: [],
      squadValueCr: 0,
      spentPurseCr: 0,
      remainingPurseCr,
      playersBought: 0,
      overseasCount: 0,
      marqueeCount: 0
    };
  }

  // --- A. Squad Strength (Max 40 points) ---
  const avgOvr = squad.reduce((sum, p) => sum + p.overall, 0) / playersBought;
  // Base strength from average rating: 95 OVR -> ~36 pts, 85 OVR -> ~32 pts, 75 OVR -> ~26 pts
  const baseStrength = (Math.max(40, Math.min(100, avgOvr)) / 100) * 32;

  // Star & Marquee quality bonus (up to 5 pts)
  const eliteStars = squad.filter(p => p.overall >= 88).length;
  const marqueeBonus = Math.min(5, eliteStars * 1.25);

  // Role strength sub-components (up to 3 pts)
  const batters = squad.filter(p => p.role.includes('Batter') || p.role.includes('Wicketkeeper'));
  const bowlers = squad.filter(p => p.role.includes('Bowler') || p.role.includes('All-rounder'));
  const avgBatRating = batters.length > 0 ? batters.reduce((sum, p) => sum + (p.battingRating || p.overall), 0) / batters.length : 50;
  const avgBowlRating = bowlers.length > 0 ? bowlers.reduce((sum, p) => sum + (p.bowlingRating || p.overall), 0) / bowlers.length : 50;
  const roleStrengthBonus = Math.min(3, ((avgBatRating + avgBowlRating) / 200) * 3);

  const squadStrength = Number(Math.min(40, Math.max(0, baseStrength + marqueeBonus + roleStrengthBonus)).toFixed(1));

  // --- B. Squad Balance (Max 20 points) ---
  const keepers = squad.filter(p => p.role.includes('Wicketkeeper')).length;
  const pureBatCount = squad.filter(p => p.role.includes('Batter') && !p.role.includes('Wicketkeeper')).length;
  const pureBowlCount = squad.filter(p => p.role.includes('Bowler')).length;
  const arCount = squad.filter(p => p.role.includes('All-rounder')).length;
  const spinBowlers = squad.filter(p => p.bowlingStyle && (p.bowlingStyle.includes('Spin') || p.bowlingStyle.includes('Slow') || p.bowlingStyle.includes('Orthodox'))).length;
  const paceBowlers = squad.filter(p => p.bowlingStyle && (p.bowlingStyle.includes('Fast') || p.bowlingStyle.includes('Medium') || p.bowlingStyle.includes('Pace'))).length;

  let balanceScore = 0;
  // 1. Wicketkeeper coverage: 5 pts
  if (keepers >= 1) balanceScore += keepers >= 2 ? 5 : 4.5;

  // 2. Batting depth: 4.5 pts
  balanceScore += Math.min(4.5, (pureBatCount / 3) * 4.5);

  // 3. Bowling depth: 4.5 pts
  balanceScore += Math.min(4.5, (pureBowlCount / 3) * 4.5);

  // 4. All-rounder balance: 3.5 pts
  balanceScore += Math.min(3.5, (arCount / 2) * 3.5);

  // 5. Pace & Spin diversity: 2.5 pts
  if (paceBowlers >= 1 && spinBowlers >= 1) {
    balanceScore += 2.5;
  } else if (paceBowlers >= 1 || spinBowlers >= 1) {
    balanceScore += 1.2;
  }

  // Extreme imbalance penalty (e.g. 10 batters and 0 bowlers)
  if (pureBowlCount === 0 && arCount === 0) balanceScore = Math.max(2, balanceScore - 8);
  if (pureBatCount === 0 && keepers === 0) balanceScore = Math.max(2, balanceScore - 8);

  const squadBalance = Number(Math.min(20, Math.max(0, balanceScore)).toFixed(1));

  // --- C. Playing XI Quality (Max 20 points) ---
  const xiResult = generateBestPlayingXI(squad);
  const xiOvr = xiResult.overall;
  // Scaled: 92+ OVR -> 18.5 - 20 pts, 85 OVR -> 16.5 pts, 75 OVR -> 13.5 pts
  let xiScore = (Math.max(40, Math.min(100, xiOvr)) / 100) * 17;
  if (xiResult.validXI) xiScore += 3.0; // Valid legal XI completion bonus
  else if (xiResult.playingXI.length >= 8 && xiResult.hasKeeper) xiScore += 1.5;

  const playingXIQuality = Number(Math.min(20, Math.max(0, xiScore)).toFixed(1));

  // --- D. Budget Efficiency (Max 10 points) ---
  // Quality per Cr spent
  let efficiencyScore = 0;
  if (spentPurseCr > 0) {
    const ovrPerCr = (avgOvr * Math.min(15, playersBought)) / spentPurseCr;
    // Standard good range: 8-15
    efficiencyScore += Math.min(6.5, (ovrPerCr / 12) * 6.5);
  } else {
    efficiencyScore += 2;
  }

  // Prudent purse usage (having ₹1 - ₹20 Cr remaining is healthy; 0 is okay; leaving 80% unspent is bad)
  const purseUtilization = spentPurseCr / startingPurseCr;
  if (purseUtilization >= 0.70 && purseUtilization <= 0.98) {
    efficiencyScore += 2.5;
  } else if (purseUtilization >= 0.50 && purseUtilization < 0.70) {
    efficiencyScore += 2.0;
  } else if (purseUtilization > 0.98) {
    efficiencyScore += 1.8;
  } else {
    efficiencyScore += 1.0;
  }

  // Value retention: reward high average rating relative to prices
  const avgPrice = spentPurseCr / Math.max(1, playersBought);
  if (avgOvr >= 85 && avgPrice <= 9.0) efficiencyScore += 1.0;
  else if (avgOvr >= 80 && avgPrice <= 6.0) efficiencyScore += 1.0;

  const budgetEfficiency = Number(Math.min(10, Math.max(0, efficiencyScore)).toFixed(1));

  // --- E. Squad Completion (Max 10 points) ---
  const target = Math.max(7, Math.min(15, targetMinSquad));
  const sizeRatio = Math.min(1.0, playersBought / target);
  let completionScore = sizeRatio * 6.0;

  if (playersBought >= 11) completionScore += 2.5;
  else if (playersBought >= 7) completionScore += 1.5;

  if (keepers >= 1 && (pureBatCount + arCount) >= 4 && (pureBowlCount + arCount) >= 4) {
    completionScore += 1.5;
  }

  const squadCompletion = Number(Math.min(10, Math.max(0, completionScore)).toFixed(1));

  // --- Total (100 Points Max) ---
  const finalScore = Number(
    Math.min(100, Math.max(0, squadStrength + squadBalance + playingXIQuality + budgetEfficiency + squadCompletion)).toFixed(1)
  );

  return {
    finalScore,
    breakdown: {
      squadStrength,
      squadBalance,
      playingXIQuality,
      budgetEfficiency,
      squadCompletion
    },
    squadOvr: Math.round(avgOvr),
    playingXIOverall: xiResult.overall,
    playingXIPlayers: xiResult.playingXI,
    squadValueCr,
    spentPurseCr,
    remainingPurseCr,
    playersBought,
    overseasCount,
    marqueeCount
  };
}

/**
 * Assign dynamic titles, badges, and XP rewards based on participant rank and total room count
 */
export function assignRankRewards(rank: number, totalParticipants: number): {
  rewardTitle: string;
  rewardBadge: string;
  xpReward: number;
} {
  if (rank === 1) {
    return {
      rewardTitle: 'Auction Champion',
      rewardBadge: '🏆',
      xpReward: 2500
    };
  }

  if (rank === 2) {
    return {
      rewardTitle: 'Auction Master',
      rewardBadge: '🥈',
      xpReward: 1750
    };
  }

  if (rank === 3) {
    return {
      rewardTitle: 'Auction Strategist',
      rewardBadge: '🥉',
      xpReward: 1200
    };
  }

  const midThreshold = Math.max(4, Math.ceil(totalParticipants * 0.5));
  if (rank <= midThreshold) {
    return {
      rewardTitle: 'Elite Manager',
      rewardBadge: '🎖️',
      xpReward: 800
    };
  }

  if (rank <= Math.min(8, totalParticipants - 1)) {
    return {
      rewardTitle: 'Pro Manager',
      rewardBadge: '⭐',
      xpReward: 500
    };
  }

  return {
    rewardTitle: 'Rookie Manager',
    rewardBadge: '🔰',
    xpReward: 300
  };
}

export function calculateAuctionPerformanceScore(participant: MultiplayerParticipant, startingPurseCr: number): number {
  return calculateAuctionScore(participant, startingPurseCr).finalScore;
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

