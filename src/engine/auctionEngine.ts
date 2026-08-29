import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { AuctionState, AuctionBid, AIAssistantAdvice, AuctionSetInfo, AuctionSetCode } from '../types/auction';

export const AUCTION_SETS_INFO: Record<AuctionSetCode, AuctionSetInfo> = {
  'M1': {
    code: 'M1',
    name: 'Marquee Set 1 (M1)',
    category: 'Marquee',
    description: 'Tier-1 international superstars & franchise cornerstones.',
    isCapped: true
  },
  'M2': {
    code: 'M2',
    name: 'Marquee Set 2 (M2)',
    category: 'Marquee',
    description: 'Tier-1 elite match-winners, world-class pace & spin maestros.',
    isCapped: true
  },
  'BA1': {
    code: 'BA1',
    name: 'Capped Batters (BA1)',
    category: 'Capped',
    description: 'Established international & domestic capped top/middle order anchors.',
    isCapped: true
  },
  'AL1': {
    code: 'AL1',
    name: 'Capped All-Rounders (AL1)',
    category: 'Capped',
    description: 'High-impact two-dimensional game changers with international pedigree.',
    isCapped: true
  },
  'WK1': {
    code: 'WK1',
    name: 'Capped Wicketkeepers (WK1)',
    category: 'Capped',
    description: 'Dynamic glovemen and explosive top/middle order match-winners.',
    isCapped: true
  },
  'FA1': {
    code: 'FA1',
    name: 'Capped Fast Bowlers (FA1)',
    category: 'Capped',
    description: 'Express pace weapons, swing specialists, and proven death-over yorker kings.',
    isCapped: true
  },
  'SP1': {
    code: 'SP1',
    name: 'Capped Spinners (SP1)',
    category: 'Capped',
    description: 'Mystery spinners and proven wrist/finger spin wicket-takers.',
    isCapped: true
  },
  'UBA1': {
    code: 'UBA1',
    name: 'Uncapped Batters (UBA1)',
    category: 'Uncapped',
    description: 'Exciting domestic prodigies & power-hitters seeking their IPL breakthrough.',
    isCapped: false
  },
  'UAL1': {
    code: 'UAL1',
    name: 'Uncapped All-Rounders (UAL1)',
    category: 'Uncapped',
    description: 'Hard-hitting domestic finishers & multi-skill emerging youngsters.',
    isCapped: false
  },
  'UWK1': {
    code: 'UWK1',
    name: 'Uncapped Wicketkeepers (UWK1)',
    category: 'Uncapped',
    description: 'Promising young keepers with solid glovework and clean ball-striking.',
    isCapped: false
  },
  'UFA1': {
    code: 'UFA1',
    name: 'Uncapped Fast Bowlers (UFA1)',
    category: 'Uncapped',
    description: 'Raw pace talents and domestic swing prodigies looking to ignite.',
    isCapped: false
  },
  'USP1': {
    code: 'USP1',
    name: 'Uncapped Spinners (USP1)',
    category: 'Uncapped',
    description: 'Domestic mystery spinners and turners ready for the big stage.',
    isCapped: false
  },
  'ACC1': {
    code: 'ACC1',
    name: 'Accelerated Round (ACC1)',
    category: 'Accelerated',
    description: 'Rapid-fire bidding round for recalled unsold and depth squad players.',
    isCapped: false
  }
};

export const SET_ORDER: AuctionSetCode[] = [
  'M1', 'M2', 'BA1', 'AL1', 'WK1', 'FA1', 'SP1', 
  'UBA1', 'UAL1', 'UWK1', 'UFA1', 'USP1', 'ACC1'
];

export function assignPlayerAuctionSets(players: Player[]): Player[] {
  // Known mapping for realistic IPL Mega Auction sets
  const setMapping: Record<string, { set: AuctionSetCode; capped: boolean }> = {
    // M1
    'auc_starc': { set: 'M1', capped: true },
    'auc_buttler': { set: 'M1', capped: true },
    'auc_iyer': { set: 'M1', capped: true },
    'dc_pant': { set: 'M1', capped: true },
    'lsg_rahul': { set: 'M1', capped: true },
    'pbks_rabada': { set: 'M1', capped: true },

    // M2
    'pbks_arshdeep': { set: 'M2', capped: true },
    'rcb_siraj': { set: 'M2', capped: true },
    'rcb_maxwell': { set: 'M2', capped: true },
    'auc_warner': { set: 'M2', capped: true },
    'rr_chahal': { set: 'M2', capped: true },
    'gt_shami': { set: 'M2', capped: true },

    // BA1
    'auc_kane': { set: 'BA1', capped: true },
    'auc_rahane': { set: 'BA1', capped: true },
    'auc_tripathi': { set: 'BA1', capped: true },
    'dc_mcgurk': { set: 'BA1', capped: true },
    'auc_tripathi_manish': { set: 'BA1', capped: true },

    // AL1
    'pbks_curran': { set: 'AL1', capped: true },
    'lsg_stoinis': { set: 'AL1', capped: true },
    'auc_livingstone': { set: 'AL1', capped: true },
    'auc_ashwin': { set: 'AL1', capped: true },
    'auc_hasaranga': { set: 'AL1', capped: true },

    // WK1
    'auc_ishankishan': { set: 'WK1', capped: true },
    'auc_phil_salt': { set: 'WK1', capped: true },
    'auc_conway': { set: 'WK1', capped: true },

    // FA1
    'auc_hazlewood': { set: 'FA1', capped: true },
    'rr_boult': { set: 'FA1', capped: true },
    'srh_bhuvi': { set: 'FA1', capped: true },
    'auc_chahar_deepak': { set: 'FA1', capped: true },
    'dc_nortje': { set: 'FA1', capped: true },
    'auc_ferguson': { set: 'FA1', capped: true },
    'auc_natrajan': { set: 'FA1', capped: true },
    'auc_prasidh': { set: 'FA1', capped: true },
    'auc_alzarri': { set: 'FA1', capped: true },
    'auc_umesh': { set: 'FA1', capped: true },

    // SP1
    'auc_chahar_rahul': { set: 'SP1', capped: true },
    'auc_noor': { set: 'SP1', capped: true },

    // UBA1
    'auc_angkrish': { set: 'UBA1', capped: false },
    'auc_sameer_rizvi': { set: 'UBA1', capped: false },
    'auc_wadhera': { set: 'UBA1', capped: false },

    // UAL1
    'auc_ashutosh': { set: 'UAL1', capped: false },
    'auc_ramandeep': { set: 'UAL1', capped: false },

    // UWK1
    'auc_kushagra': { set: 'UWK1', capped: false },
    'auc_robin_minz': { set: 'UWK1', capped: false },

    // UFA1
    'auc_karthik_tyagi': { set: 'UFA1', capped: false },
    'auc_nandre_burger': { set: 'UFA1', capped: true },
    'auc_rasikh_salam': { set: 'UFA1', capped: false },

    // USP1
    'auc_suyash_sharma': { set: 'USP1', capped: false },
    'auc_manav_suthar': { set: 'USP1', capped: false }
  };

  return players.map(p => {
    const pCopy = { ...p };
    const mapped = setMapping[pCopy.id];

    if (mapped) {
      pCopy.auctionSetCode = mapped.set;
      pCopy.auctionSetName = AUCTION_SETS_INFO[mapped.set]?.name || mapped.set;
      pCopy.isCapped = mapped.capped;
    } else {
      // Dynamic fallback set tagging
      const isCapped = pCopy.isCapped !== undefined ? pCopy.isCapped : (pCopy.overall >= 86 || pCopy.isOverseas || pCopy.basePriceCr >= 1.0);
      pCopy.isCapped = isCapped;

      if (isCapped) {
        if (pCopy.overall >= 93) {
          pCopy.auctionSetCode = 'M1';
        } else if (pCopy.overall >= 90) {
          pCopy.auctionSetCode = 'M2';
        } else if (pCopy.role.includes('Wicketkeeper')) {
          pCopy.auctionSetCode = 'WK1';
        } else if (pCopy.role.includes('All-rounder')) {
          pCopy.auctionSetCode = 'AL1';
        } else if (pCopy.role.includes('Pace Bowler')) {
          pCopy.auctionSetCode = 'FA1';
        } else if (pCopy.role.includes('Spin Bowler')) {
          pCopy.auctionSetCode = 'SP1';
        } else {
          pCopy.auctionSetCode = 'BA1';
        }
      } else {
        if (pCopy.role.includes('Wicketkeeper')) {
          pCopy.auctionSetCode = 'UWK1';
        } else if (pCopy.role.includes('All-rounder')) {
          pCopy.auctionSetCode = 'UAL1';
        } else if (pCopy.role.includes('Pace Bowler')) {
          pCopy.auctionSetCode = 'UFA1';
        } else if (pCopy.role.includes('Spin Bowler')) {
          pCopy.auctionSetCode = 'USP1';
        } else {
          pCopy.auctionSetCode = 'UBA1';
        }
      }
      pCopy.auctionSetName = AUCTION_SETS_INFO[pCopy.auctionSetCode as AuctionSetCode]?.name || pCopy.auctionSetCode;
    }

    return pCopy;
  });
}

export function sortAuctionPlayerPool(pool: Player[]): Player[] {
  const tagged = assignPlayerAuctionSets(pool);

  return tagged.sort((a, b) => {
    const setIdxA = SET_ORDER.indexOf((a.auctionSetCode as AuctionSetCode) || 'ACC1');
    const setIdxB = SET_ORDER.indexOf((b.auctionSetCode as AuctionSetCode) || 'ACC1');

    if (setIdxA !== setIdxB) {
      return setIdxA - setIdxB;
    }

    // Within same set: higher base price first, then higher overall rating
    if (b.basePriceCr !== a.basePriceCr) {
      return b.basePriceCr - a.basePriceCr;
    }
    return b.overall - a.overall;
  });
}

export function getBidIncrement(currentBidCr: number): number {
  if (currentBidCr < 1.0) return 0.10; // 10 Lakhs
  if (currentBidCr < 2.0) return 0.20; // 20 Lakhs
  if (currentBidCr < 5.0) return 0.25; // 25 Lakhs
  if (currentBidCr < 10.0) return 0.50; // 50 Lakhs
  return 0.50; // 50 Lakhs increment above 10 Cr (matches real IPL Mega Auction increments)
}

/**
 * Calculates a realistic IPL Mega Auction valuation for a player from the perspective of a specific franchise.
 * Reflects genuine IPL economics:
 * - Top-tier Marquee superstars (Pant, Starc, Iyer, Cummins) cap out around ₹22 - 27.5 Cr.
 * - Star capped match-winners trade around ₹10 - 18 Cr.
 * - Solid capped regulars trade around ₹4 - 9 Cr.
 * - Uncapped prodigies & bidding war breakout sensations can reach ₹6 - 13.5 Cr (like Kushagra, Rizvi, Shahrukh).
 * - Standard uncapped & depth trade around ₹0.3 - 3.0 Cr.
 * - Prevents runaway compounding multipliers and enforces franchise purse allocation discipline.
 */
export function evaluatePlayerValueForTeam(
  player: Player,
  team: Team,
  teamPlayers: Player[],
  remainingTargetsCount: number = 8
): number {
  // Check squad limits first
  if (team.rosterPlayerIds.length >= 25) return 0;
  const currentOverseasCount = teamPlayers.filter(p => p.isOverseas).length;
  if (player.isOverseas && currentOverseasCount >= 8) return 0;

  const isCapped = player.isCapped ?? (player.overall >= 86 || player.isOverseas || player.basePriceCr >= 1.0);

  // 1. Establish realistic Base Market Value curve
  let baseMarketValue = player.basePriceCr;

  if (isCapped) {
    if (player.overall >= 95) {
      // Elite Tier-1 Superstars (e.g. Bumrah, Starc, Klaasen, Pant)
      baseMarketValue = 18.0 + (player.overall - 95) * 2.5; // ~18.0 - 25.5 Cr
    } else if (player.overall >= 92) {
      // Tier-1 Franchise Pillars (e.g. Iyer, Buttler, Cummins, Rashid, Rahul)
      baseMarketValue = 13.0 + (player.overall - 92) * 1.5; // ~13.0 - 17.5 Cr
    } else if (player.overall >= 89) {
      // High-Impact Capped Stars (e.g. Arshdeep, Siraj, Boult, Chahal, Maxwell, Phil Salt, Ishan)
      baseMarketValue = 8.5 + (player.overall - 89) * 1.4; // ~8.5 - 12.7 Cr
    } else if (player.overall >= 86) {
      // Solid Established Capped Regulars (e.g. Bhuvi, Rahane, Ashwin, Deepak Chahar, Tripathi)
      baseMarketValue = 4.0 + (player.overall - 86) * 1.3; // ~4.0 - 7.9 Cr
    } else if (player.overall >= 83) {
      // Capped Squad Players (e.g. Umesh, Manish Pandey, Alzarri)
      baseMarketValue = 1.8 + (player.overall - 83) * 0.7; // ~1.8 - 3.9 Cr
    } else {
      // Depth / Reserve Capped
      baseMarketValue = Math.max(player.basePriceCr, 0.8 + (player.overall - 75) * 0.10);
    }
  } else {
    // UNCAPPED PLAYERS
    // Base uncapped starting valuation
    const rawUncapped = 0.4 + Math.max(0, player.overall - 78) * 0.35; // 0.4 to ~3.2 Cr
    baseMarketValue = Math.max(player.basePriceCr, rawUncapped);

    // Uncapped Excitement & Potential Multiplier:
    // Real IPL teams (like CSK, PBKS, SRH, GT) go into heated paddle wars for young Indian talent
    // with elite potential, express pace (145kph+), power hitters (powerHitting > 85), mystery spinners, or keeper-batters.
    // Surprises can realistically go for 8 to 14 Crore!
    const isHighPotentialYouth = player.age <= 24 && player.potential >= 90;
    const hasExplosiveSkill = 
      (player.attributes.power && player.attributes.power >= 88) ||
      (player.attributes.pace && player.attributes.pace >= 90) ||
      (player.attributes.deathBowling && player.attributes.deathBowling >= 88) ||
      (player.role.includes('Wicketkeeper') && player.battingRating >= 82);

    if (isHighPotentialYouth && hasExplosiveSkill) {
      // Young breakout prodigy (e.g. Sameer Rizvi, Kumar Kushagra, Mayank Yadav, Ashutosh, Tyagi)
      // Base demand pushes to 6.0 - 11.5 Cr with bidding momentum
      baseMarketValue = Math.max(baseMarketValue, 5.5 + (player.potential - 90) * 1.0 + (player.overall - 80) * 0.8);
    } else if (isHighPotentialYouth || hasExplosiveSkill) {
      baseMarketValue = Math.max(baseMarketValue, 2.5 + (player.potential - 88) * 0.5);
    }
  }

  // 2. Additive / Proportional Percentage Adjustments (Bounded to avoid runaway 50 Cr spikes)
  let adjustmentMultiplier = 1.0;

  // A. Indian Scarcity Premium (Crucial for playing XI balance)
  if (!player.isOverseas) {
    if (isCapped && player.overall >= 88) {
      adjustmentMultiplier += 0.15; // +15% for top Indian stars
    } else if (!isCapped && player.potential >= 90) {
      adjustmentMultiplier += 0.20; // +20% for top Indian prodigies
    } else {
      adjustmentMultiplier += 0.08;
    }
  } else {
    // Overseas depth penalties
    if (currentOverseasCount >= 7) {
      adjustmentMultiplier -= 0.40;
    } else if (currentOverseasCount >= 6) {
      adjustmentMultiplier -= 0.20;
    }
  }

  // B. Positional Need in Team
  const roleCount = teamPlayers.filter(p => p.role === player.role).length;
  if (roleCount === 0) {
    adjustmentMultiplier += 0.18; // Desperately needed primary slot
  } else if (roleCount === 1) {
    adjustmentMultiplier += 0.06;
  } else if (roleCount >= 3) {
    adjustmentMultiplier -= 0.20; // Already deep in this role
  } else if (roleCount >= 4) {
    adjustmentMultiplier -= 0.35;
  }

  // C. Death Bowling & Specialized Needs
  if (player.attributes.deathBowling && player.attributes.deathBowling >= 88) {
    const deathBowlersInSquad = teamPlayers.filter(p => p.attributes.deathBowling && p.attributes.deathBowling >= 85).length;
    if (deathBowlersInSquad === 0) {
      adjustmentMultiplier += 0.15;
    }
  }

  // D. Franchise AI Personality Nuance
  const p = team.aiPersonality;
  if (p) {
    if (player.overall >= 90) {
      adjustmentMultiplier += ((p.starPreference - 50) / 50) * 0.12; // +/- 12%
    }
    if (player.age <= 23 || (!isCapped && player.potential >= 90)) {
      adjustmentMultiplier += ((p.youthPreference - 50) / 50) * 0.25; // +/- 25% (allows youth-heavy teams to bid 10+ Cr on gems!)
    }
    adjustmentMultiplier += ((p.aggression - 50) / 50) * 0.10; // +/- 10%
    adjustmentMultiplier -= ((p.budgetDiscipline - 50) / 50) * 0.10; // +/- 10%
  }

  // Calculate adjusted team valuation
  let adjustedValue = baseMarketValue * Math.max(0.4, adjustmentMultiplier);

  // 3. Realistic Franchise Purse & Budget Allocation (How Real IPL Teams Budget)
  // A team never spends 40-50% of its entire starting purse on one player because it must build
  // a balanced 18-25 man squad.
  const currentSquadSize = team.rosterPlayerIds.length;
  const minRemainingSlots = Math.max(1, 18 - currentSquadSize);
  
  // Reserve at least ₹0.50 Cr per remaining slot to avoid getting stranded
  const reserveForOtherSlots = Math.max(0, (minRemainingSlots - 1) * 0.50);
  const availablePurse = Math.max(0, team.purseCr - reserveForOtherSlots);

  // Maximum share of available purse a team will allocate to a single player
  let maxPurseShare = 0.32; // Default ~32% of available purse
  if (minRemainingSlots <= 2) {
    maxPurseShare = 0.85; // Nearly full squad, can splurge remaining funds
  } else if (minRemainingSlots <= 5) {
    maxPurseShare = 0.50;
  } else if (minRemainingSlots <= 8) {
    maxPurseShare = 0.40;
  } else {
    maxPurseShare = 0.30;
  }

  // For genuine marquee superstars (94+ OVR) or historic bidding wars, allow up to 36% of purse
  if (player.overall >= 94) {
    maxPurseShare = Math.min(0.85, maxPurseShare + 0.08);
  }

  const teamBudgetCap = availablePurse * maxPurseShare;
  const finalValuation = Math.min(adjustedValue, teamBudgetCap, team.purseCr - reserveForOtherSlots);

  return Number(Math.max(player.basePriceCr, finalValuation).toFixed(2));
}

export function generateAIAssistantAdvice(
  player: Player,
  userTeam: Team,
  userSquad: Player[],
  currentBidCr: number
): AIAssistantAdvice {
  const estimatedVal = evaluatePlayerValueForTeam(player, userTeam, userSquad);
  const premium = currentBidCr > estimatedVal ? Math.round(((currentBidCr - estimatedVal) / estimatedVal) * 100) : 0;
  
  const roleCount = userSquad.filter(p => p.role === player.role).length;
  let needAnalysis = `You have ${roleCount} ${player.role}(s) in your squad.`;
  if (roleCount === 0) {
    needAnalysis += ` CRITICAL NEED: You have no players in this role!`;
  } else if (roleCount >= 3) {
    needAnalysis += ` Moderate priority: You already have healthy depth here.`;
  }

  let verdict = 'Fair Value';
  if (currentBidCr > estimatedVal * 1.25) {
    verdict = 'Overpriced / Risky';
  } else if (currentBidCr < estimatedVal * 0.80) {
    verdict = 'High Value Steal Target';
  }

  return {
    verdict,
    recommendedMaxBidCr: estimatedVal,
    squadNeedAnalysis: needAnalysis,
    rivalInterestAssessment: `Heavy interest expected from teams needing ${player.role}.`,
    valuePremiumPercent: premium,
    isHighValueTarget: estimatedVal > 7.0 && currentBidCr <= estimatedVal
  };
}

export function getNextAIBid(
  auctionState: AuctionState,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId: string
): { teamId: string; bidAmountCr: number } | null {
  if (!auctionState.activePlayer) return null;
  const player = auctionState.activePlayer;
  const currentBid = auctionState.currentBidCr;
  const currentLeader = auctionState.currentLeadingTeamId;
  const nextBidAmount = Number((currentBid + getBidIncrement(currentBid)).toFixed(2));

  // Find all candidate AI teams willing to bid at or above nextBidAmount
  const interestedAIs: Array<{ teamId: string; maxVal: number; willingness: number }> = [];

  Object.values(teams).forEach(team => {
    if (team.id === userTeamId) return; // User handles own bids
    if (team.id === currentLeader) return; // Already leading

    // Check squad size limit (max 25)
    if (team.rosterPlayerIds.length >= 25) return;

    // Check budget
    if (team.purseCr < nextBidAmount) return;

    // Overseas quota check
    const teamPlayers = team.rosterPlayerIds.map(id => allPlayers[id]).filter(Boolean);
    if (player.isOverseas) {
      const osCount = teamPlayers.filter(p => p.isOverseas).length;
      if (osCount >= 8) return;
    }

    const maxVal = evaluatePlayerValueForTeam(player, team, teamPlayers);

    // AI bidding psychology: In heated paddle wars, aggressive franchises can stretch
    // by 5-10% of their valuation before finally pulling out
    const aggressionBonus = (team.aiPersonality?.aggression || 50) > 75 ? 1.08 : 1.02;
    const effectiveCeiling = Number((maxVal * aggressionBonus).toFixed(2));

    if (effectiveCeiling >= nextBidAmount) {
      // Willingness score based on valuation margin and aggression
      const margin = effectiveCeiling - nextBidAmount;
      const aggression = (team.aiPersonality?.aggression || 50) / 100;
      const willingness = (margin + 1.0) * (0.5 + aggression * 0.5);
      interestedAIs.push({ teamId: team.id, maxVal: effectiveCeiling, willingness });
    }
  });

  if (interestedAIs.length === 0) return null;

  // Sort by willingness and pick the highest
  interestedAIs.sort((a, b) => b.willingness - a.willingness);
  const chosen = interestedAIs[0];

  return {
    teamId: chosen.teamId,
    bidAmountCr: nextBidAmount
  };
}

/**
 * Simulates a realistic competitive auction outcome between all interested teams
 * based on second-price auction mechanics with bidding war momentum.
 */
export function simulateAuctionBattle(
  player: Player,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId?: string,
  userMaxBidCr?: number
): { winningTeamId: string; finalPriceCr: number } | null {
  const interestedTeams: Array<{ teamId: string; ceiling: number }> = [];

  Object.values(teams).forEach(team => {
    if (team.rosterPlayerIds.length >= 25) return;
    const teamPlayers = team.rosterPlayerIds.map(id => allPlayers[id]).filter(Boolean);
    
    if (player.isOverseas) {
      const osCount = teamPlayers.filter(p => p.isOverseas).length;
      if (osCount >= 8) return;
    }

    let ceiling = 0;
    if (userTeamId && team.id === userTeamId) {
      ceiling = userMaxBidCr ?? 0;
    } else {
      const maxVal = evaluatePlayerValueForTeam(player, team, teamPlayers);
      const aggressionBonus = (team.aiPersonality?.aggression || 50) > 75 ? 1.08 : 1.02;
      ceiling = Number((maxVal * aggressionBonus).toFixed(2));
    }

    if (ceiling >= player.basePriceCr && team.purseCr >= player.basePriceCr) {
      const affordableCeiling = Math.min(ceiling, team.purseCr);
      if (affordableCeiling >= player.basePriceCr) {
        interestedTeams.push({ teamId: team.id, ceiling: affordableCeiling });
      }
    }
  });

  if (interestedTeams.length === 0) return null;

  // Sort by ceiling descending
  interestedTeams.sort((a, b) => b.ceiling - a.ceiling);

  if (interestedTeams.length === 1) {
    // Only 1 team interested: sold at opening base price
    return {
      winningTeamId: interestedTeams[0].teamId,
      finalPriceCr: player.basePriceCr
    };
  }

  // 2 or more teams competed in a bidding war:
  // Winner is top team (T1), price is determined by where 2nd team (T2) dropped out + 1 bid increment
  const winner = interestedTeams[0];
  const runnerUp = interestedTeams[1];
  const increment = getBidIncrement(runnerUp.ceiling);
  const battlePrice = Number(Math.min(winner.ceiling, runnerUp.ceiling + increment).toFixed(2));
  const finalPriceCr = Math.max(player.basePriceCr, battlePrice);

  return {
    winningTeamId: winner.teamId,
    finalPriceCr
  };
}

export function initAuctionState(playerPool: Player[]): AuctionState {
  const sortedPool = sortAuctionPlayerPool(playerPool);

  return {
    currentSetIndex: 0,
    currentPlayerIndex: 0,
    allPlayerPool: sortedPool,
    soldPlayerRecords: [],
    unsoldPlayerIds: [],
    passedPlayerIds: [],
    activePlayer: sortedPool[0] || null,
    currentBidCr: sortedPool[0] ? sortedPool[0].basePriceCr : 0,
    currentLeadingTeamId: null,
    bidHistory: [],
    auctionTimerSeconds: 10,
    hammerState: 'Bidding',
    isPaused: false,
    isCompleted: false,
    isAcceleratedMode: false,
    autoBidUser: false
  };
}

/**
 * Simulates all remaining players (or entire pool from index 0) through competitive AI bidding
 */
export function simulateFullAuctionPool(
  auctionState: AuctionState,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId: string,
  options?: {
    fromBeginning?: boolean;
    userAutoBid?: boolean;
    userPriorityTargetIds?: string[];
  }
): {
  updatedAuction: AuctionState;
  updatedTeams: Record<string, Team>;
  updatedPlayers: Record<string, Player>;
} {
  const auc = JSON.parse(JSON.stringify(auctionState)) as AuctionState;
  const teamsCopy = JSON.parse(JSON.stringify(teams)) as Record<string, Team>;
  const playersCopy = JSON.parse(JSON.stringify(allPlayers)) as Record<string, Player>;

  const prioritySet = new Set(options?.userPriorityTargetIds || []);
  const startIndex = options?.fromBeginning ? 0 : auc.currentPlayerIndex;

  if (options?.fromBeginning) {
    auc.soldPlayerRecords = [];
    auc.unsoldPlayerIds = [];
    auc.passedPlayerIds = [];
    // Reset auction allocations for players in pool
    auc.allPlayerPool.forEach(p => {
      if (playersCopy[p.id]) {
        playersCopy[p.id].currentTeamId = null;
        playersCopy[p.id].salaryCr = 0;
      }
    });
    // Reset team rosters to only pre-auction retained players
    Object.values(teamsCopy).forEach(t => {
      t.rosterPlayerIds = t.rosterPlayerIds.filter(id => {
        const pl = playersCopy[id];
        return pl && !auc.allPlayerPool.some(ap => ap.id === id);
      });
      // Restore initial base purse ₹120.0 Cr minus pre-retained salary
      let spent = 0;
      t.rosterPlayerIds.forEach(id => {
        spent += playersCopy[id]?.salaryCr || 0;
      });
      t.purseCr = Number(Math.max(10, 120.0 - spent).toFixed(2));
    });
  }

  for (let i = startIndex; i < auc.allPlayerPool.length; i++) {
    const player = auc.allPlayerPool[i];
    if (!player) continue;

    // Check if user should aggressively bid
    let userMaxBid: number | undefined = undefined;
    const userTeam = teamsCopy[userTeamId];
    if (userTeam) {
      const userSquad = userTeam.rosterPlayerIds.map(id => playersCopy[id]).filter(Boolean);
      const isTarget = prioritySet.has(player.id);
      
      if (options?.userAutoBid || isTarget) {
        const baseVal = evaluatePlayerValueForTeam(player, userTeam, userSquad);
        const multiplier = isTarget ? 1.35 : 1.05;
        userMaxBid = Number((baseVal * multiplier).toFixed(2));
      }
    }

    const battle = simulateAuctionBattle(
      player,
      teamsCopy,
      playersCopy,
      userTeamId,
      userMaxBid
    );

    if (battle) {
      const winningTeam = teamsCopy[battle.winningTeamId];
      if (winningTeam) {
        winningTeam.purseCr = Number((winningTeam.purseCr - battle.finalPriceCr).toFixed(2));
        if (!winningTeam.rosterPlayerIds.includes(player.id)) {
          winningTeam.rosterPlayerIds.push(player.id);
        }
        player.currentTeamId = winningTeam.id;
        player.salaryCr = battle.finalPriceCr;
        if (playersCopy[player.id]) {
          playersCopy[player.id].currentTeamId = winningTeam.id;
          playersCopy[player.id].salaryCr = battle.finalPriceCr;
        }

        auc.soldPlayerRecords.push({
          player,
          sellingPriceCr: battle.finalPriceCr,
          buyingTeamId: winningTeam.id
        });
      }
    } else {
      auc.unsoldPlayerIds.push(player.id);
    }
  }

  // ACCELERATED DEPTH DRAFT ROUND: Ensure every team satisfies IPL roster depth (21 - 25 players)
  const remainingUnsold = [...auc.unsoldPlayerIds];
  const updatedUnsold: string[] = [];

  for (const unsoldId of remainingUnsold) {
    const player = playersCopy[unsoldId];
    if (!player) continue;

    // Find teams that still need depth (squad size < 22 and have purse >= basePrice)
    const needyTeams = Object.values(teamsCopy)
      .filter(t => t.rosterPlayerIds.length < 22 && t.purseCr >= player.basePriceCr)
      .sort((a, b) => a.rosterPlayerIds.length - b.rosterPlayerIds.length);

    if (needyTeams.length > 0) {
      const chosenTeam = needyTeams[0];
      const overseasCount = chosenTeam.rosterPlayerIds.map(id => playersCopy[id]).filter(p => p?.isOverseas).length;

      if (!player.isOverseas || overseasCount < 8) {
        chosenTeam.purseCr = Number((chosenTeam.purseCr - player.basePriceCr).toFixed(2));
        chosenTeam.rosterPlayerIds.push(player.id);
        player.currentTeamId = chosenTeam.id;
        player.salaryCr = player.basePriceCr;
        if (playersCopy[player.id]) {
          playersCopy[player.id].currentTeamId = chosenTeam.id;
          playersCopy[player.id].salaryCr = player.basePriceCr;
        }

        auc.soldPlayerRecords.push({
          player,
          sellingPriceCr: player.basePriceCr,
          buyingTeamId: chosenTeam.id
        });
        continue;
      }
    }

    updatedUnsold.push(unsoldId);
  }
  auc.unsoldPlayerIds = updatedUnsold;

  // Finalize auction state
  auc.currentPlayerIndex = auc.allPlayerPool.length;
  auc.activePlayer = null;
  auc.currentBidCr = 0;
  auc.currentLeadingTeamId = null;
  auc.isCompleted = true;
  auc.hammerState = 'Bidding';

  // Automatically update line-ups / playing XIs for all teams
  Object.values(teamsCopy).forEach(t => {
    const squad = t.rosterPlayerIds.map(id => playersCopy[id]).filter(Boolean);
    const sorted = [...squad].sort((a, b) => b.overall - a.overall);
    const top11 = sorted.slice(0, 11).map(p => p.id);
    const pacers = sorted.filter(p => p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium')).map(p => p.id);
    const spinners = sorted.filter(p => p.bowlingStyle.includes('spin') || p.bowlingStyle.includes('break') || p.bowlingStyle.includes('orthodox')).map(p => p.id);
    const death = sorted.filter(p => p.attributes.deathBowling > 75).map(p => p.id);
    const wk = sorted.find(p => p.role.includes('Wicketkeeper'))?.id || sorted[0]?.id || '';

    t.playingXI = {
      teamId: t.id,
      playingXIIds: top11,
      battingOrder: top11,
      captainId: t.captainId && top11.includes(t.captainId) ? t.captainId : (sorted[0]?.id || ''),
      wicketkeeperId: wk,
      impactPlayerId: sorted[11]?.id,
      powerplayBowlerIds: pacers.slice(0, 2),
      deathBowlerIds: death.slice(0, 2),
      mainSpinBowlerIds: spinners.slice(0, 2)
    };
  });

  return {
    updatedAuction: auc,
    updatedTeams: teamsCopy,
    updatedPlayers: playersCopy
  };
}

/**
 * Simulates just the current auction set
 */
export function simulateCurrentSetInAuction(
  auctionState: AuctionState,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId: string
): {
  updatedAuction: AuctionState;
  updatedTeams: Record<string, Team>;
  updatedPlayers: Record<string, Player>;
} {
  const auc = JSON.parse(JSON.stringify(auctionState)) as AuctionState;
  const teamsCopy = JSON.parse(JSON.stringify(teams)) as Record<string, Team>;
  const playersCopy = JSON.parse(JSON.stringify(allPlayers)) as Record<string, Player>;

  if (!auc.activePlayer) {
    return { updatedAuction: auc, updatedTeams: teamsCopy, updatedPlayers: playersCopy };
  }

  const taggedPool = assignPlayerAuctionSets(auc.allPlayerPool);
  const currentSetCode = taggedPool[auc.currentPlayerIndex]?.auctionSetCode;

  let currentIndex = auc.currentPlayerIndex;
  while (currentIndex < auc.allPlayerPool.length) {
    const pTagged = taggedPool[currentIndex];
    if (pTagged?.auctionSetCode !== currentSetCode) {
      break;
    }

    const player = auc.allPlayerPool[currentIndex];
    const userTeam = teamsCopy[userTeamId];
    const userSquad = userTeam?.rosterPlayerIds.map(id => playersCopy[id]).filter(Boolean) || [];
    const userMaxBid = auc.autoBidUser ? evaluatePlayerValueForTeam(player, userTeam, userSquad) : undefined;

    const battle = simulateAuctionBattle(player, teamsCopy, playersCopy, userTeamId, userMaxBid);
    if (battle) {
      const winningTeam = teamsCopy[battle.winningTeamId];
      if (winningTeam) {
        winningTeam.purseCr = Number((winningTeam.purseCr - battle.finalPriceCr).toFixed(2));
        if (!winningTeam.rosterPlayerIds.includes(player.id)) {
          winningTeam.rosterPlayerIds.push(player.id);
        }
        player.currentTeamId = winningTeam.id;
        player.salaryCr = battle.finalPriceCr;
        if (playersCopy[player.id]) {
          playersCopy[player.id].currentTeamId = winningTeam.id;
          playersCopy[player.id].salaryCr = battle.finalPriceCr;
        }

        auc.soldPlayerRecords.push({
          player,
          sellingPriceCr: battle.finalPriceCr,
          buyingTeamId: winningTeam.id
        });
      }
    } else {
      auc.unsoldPlayerIds.push(player.id);
    }

    currentIndex++;
  }

  auc.currentPlayerIndex = currentIndex;
  const nextPlayer = auc.allPlayerPool[currentIndex] || null;
  auc.activePlayer = nextPlayer;
  auc.currentBidCr = nextPlayer ? nextPlayer.basePriceCr : 0;
  auc.currentLeadingTeamId = null;
  auc.bidHistory = [];
  auc.auctionTimerSeconds = 10;
  auc.hammerState = 'Bidding';

  if (!nextPlayer) {
    auc.isCompleted = true;
  }

  return {
    updatedAuction: auc,
    updatedTeams: teamsCopy,
    updatedPlayers: playersCopy
  };
}

