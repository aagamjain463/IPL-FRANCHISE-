import { Player, PlayerRole } from '../types/cricket';
import { Team } from '../types/team';
import { 
  AuctionState, 
  AuctionBid, 
  AIAssistantAdvice, 
  AuctionSetInfo, 
  AuctionSetCode,
  AuctionPhase,
  AIDecisionType,
  TeamSquadNeeds,
  PlayerScarcityAnalysis,
  AIDecisionContext
} from '../types/auction';

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

// ------------------------------------------------------------------
// 9 DISTINCT AI BIDDER PERSONALITIES
// Every franchise is classified into exactly one archetype from its
// aiPersonality traits; the archetype drives visible behavior in the
// auction room and augments the numeric bidding math below.
// ------------------------------------------------------------------
export type AIPersonalityId =
  | 'GALACTICO'
  | 'MONEYBALL'
  | 'AGGRESSOR'
  | 'PATIENT_BUILDER'
  | 'BOWLING_FIRST'
  | 'BATTING_BARRAGE'
  | 'RIVAL_HUNTER'
  | 'SCARCITY_HAWK'
  | 'FRUGAL_PUNTER';

export interface AIPersonalityProfile {
  id: AIPersonalityId;
  name: string;
  tagline: string;
  bidBehavior: string;
  icon: string;
  confidence: number; // 0..1 how strongly the traits match
}

export const AI_PERSONALITY_PROFILES: Record<AIPersonalityId, Omit<AIPersonalityProfile, 'id' | 'confidence'>> = {
  GALACTICO: {
    name: 'The Galactico',
    tagline: 'Stars over statistics',
    bidBehavior: 'Chases marquee names, overspends on the biggest brands, then stumbles on depth picks.',
    icon: '⭐'
  },
  MONEYBALL: {
    name: 'The Moneyball Analyst',
    tagline: 'Value per crore only',
    bidBehavior: 'Deep analytics: waits for market inefficiency, refuses emotional overpays, pounces on hidden gems.',
    icon: '📊'
  },
  AGGRESSOR: {
    name: 'The Aggressor',
    tagline: 'First paddle, last man out',
    bidBehavior: 'Opens strong and keeps bidding wars alive; loves early dominance and big-ticket names.',
    icon: '🔥'
  },
  PATIENT_BUILDER: {
    name: 'The Patient Builder',
    tagline: 'Dynasty over one day',
    bidBehavior: 'Low aggression, high youth preference; builds a 3-year core and rarely overpays.',
    icon: '🌱'
  },
  BOWLING_FIRST: {
    name: 'The Bowling Barracks',
    tagline: 'Wickets win trophies',
    bidBehavior: 'Prioritizes pace, spin and death-bowling assets; willingly pays premium for bowlers.',
    icon: '🎯'
  },
  BATTING_BARRAGE: {
    name: 'The Batting Barrage',
    tagline: 'Boundary count aesthetics',
    bidBehavior: 'Invests in explosive top orders and finishers; leaves bowling depth till late rounds.',
    icon: '💥'
  },
  RIVAL_HUNTER: {
    name: 'The Rival Hunter',
    tagline: 'Block your enemy',
    bidBehavior: 'Inflates prices on players their rivals need the most, even at a small financial loss.',
    icon: '⚔️'
  },
  SCARCITY_HAWK: {
    name: 'The Scarcity Hawk',
    tagline: 'Last good player left',
    bidBehavior: 'Senses thinning pools, escalates hard when elite options run out, stores budget early.',
    icon: '🦅'
  },
  FRUGAL_PUNTER: {
    name: 'The Frugal Punter',
    tagline: 'Bargain-bin specialist',
    bidBehavior: 'Bids late and low, waits for the accelerated round, and fills squads with value picks.',
    icon: '🪙'
  }
};

export function classifyAIPersonality(team: Team): AIPersonalityProfile {
  const p = team.aiPersonality || {} as Team['aiPersonality'];
  const g = (v?: number) => v ?? 50;

  const archetypes: { id: AIPersonalityId; score: number }[] = [
    { id: 'GALACTICO', score: g(p.starPreference) * 0.6 + (100 - g(p.budgetDiscipline)) * 0.3 + g(p.riskTolerance) * 0.1 },
    { id: 'MONEYBALL', score: g(p.analyticsPreference) * 0.55 + g(p.budgetDiscipline) * 0.35 + (100 - g(p.starPreference)) * 0.1 },
    { id: 'AGGRESSOR', score: g(p.aggression) * 0.55 + g(p.riskTolerance) * 0.3 + (100 - g(p.patience)) * 0.15 },
    { id: 'PATIENT_BUILDER', score: g(p.youthPreference) * 0.5 + g(p.patience) * 0.3 + (100 - g(p.aggression)) * 0.2 },
    { id: 'BOWLING_FIRST', score: g(p.bowlingPriority) * 0.85 + g(p.analyticsPreference) * 0.15 },
    { id: 'BATTING_BARRAGE', score: g(p.battingPriority) * 0.85 + g(p.aggression) * 0.15 },
    { id: 'RIVAL_HUNTER', score: g(p.rivalryTendency) * 0.7 + g(p.scarcitySensitivity) * 0.3 },
    { id: 'SCARCITY_HAWK', score: g(p.scarcitySensitivity) * 0.55 + g(p.biddingPersistence) * 0.3 + g(p.analyticsPreference) * 0.15 },
    { id: 'FRUGAL_PUNTER', score: g(p.budgetDiscipline) * 0.55 + (100 - g(p.scarcitySensitivity)) * 0.3 + (100 - g(p.aggression)) * 0.15 }
  ];

  archetypes.sort((a, b) => b.score - a.score);
  const top = archetypes[0];
  const second = archetypes[1] || top;
  const spread = Math.abs(top.score - second.score);
  const confidence = Math.min(1, 0.42 + spread / 90);

  return {
    id: top.id,
    confidence: Number(confidence.toFixed(2)),
    ...AI_PERSONALITY_PROFILES[top.id]
  };
}

export function assignPlayerAuctionSets(players: Player[]): Player[] {
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
  return 0.50; // 50 Lakhs standard above 10 Cr in IPL
}

const clampAuctionNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function applyRealWorldAuctionElasticity(player: Player, valuationCr: number, marketAnchorCr: number): number {
  // Not a hard ceiling: this is a soft market-resistance curve. IPL teams can still create
  // surprise overpays, but bidding becomes increasingly irrational once it drifts far above
  // a player's real market band, so ₹40-50Cr outcomes become naturally rare instead of capped.
  const isGenerational = player.overall >= 95;
  const isMarquee = player.overall >= 92 || player.auctionSetCode === 'M1' || player.auctionSetCode === 'M2';
  const isUncappedFever = !player.isCapped && player.age <= 24 && player.potential >= 90;
  const rationalStretch = isGenerational ? 1.34 : isMarquee ? 1.26 : isUncappedFever ? 1.44 : player.overall >= 88 ? 1.20 : 1.14;
  const softBandCr = marketAnchorCr * rationalStretch;

  if (valuationCr <= softBandCr) return valuationCr;

  const excessCr = valuationCr - softBandCr;
  const elasticity = isGenerational ? 0.34 : isUncappedFever ? 0.42 : isMarquee ? 0.30 : 0.24;
  return softBandCr + Math.pow(excessCr, 0.82) * elasticity;
}

function getAuctionSurpriseMultiplier(player: Player, team: Team): number {
  const personality = team.aiPersonality;
  const aggression = personality?.aggression ?? 50;
  const risk = personality?.riskTolerance ?? 50;
  const persistence = personality?.biddingPersistence ?? 65;
  const starOrGem = player.overall >= 92 || (!player.isCapped && player.potential >= 90);
  const feverChance = starOrGem
    ? clampAuctionNumber((aggression + risk + persistence - 185) / 450, 0.015, 0.16)
    : clampAuctionNumber((aggression + risk - 125) / 650, 0.005, 0.055);

  if (Math.random() > feverChance) return 1;
  return Number((1.06 + Math.random() * (starOrGem ? 0.16 : 0.09)).toFixed(3));
}

// -------------------------------------------------------------
// 1. DYNAMIC SQUAD-NEEDS ENGINE
// -------------------------------------------------------------

export function calculateTeamSquadNeeds(team: Team, teamPlayers: Player[]): TeamSquadNeeds {
  const totalPlayers = teamPlayers.length;
  const overseasCount = teamPlayers.filter(p => p.isOverseas).length;
  const indianCount = totalPlayers - overseasCount;

  // Granular role categorization
  const topOrderCount = teamPlayers.filter(p => 
    p.role === 'Top-order Batter' || (p.attributes?.powerplayBatting && p.attributes.powerplayBatting >= 78)
  ).length;

  const middleOrderCount = teamPlayers.filter(p => 
    p.role === 'Middle-order Batter' || (p.attributes?.middleOverBatting && p.attributes.middleOverBatting >= 78)
  ).length;

  const finisherCount = teamPlayers.filter(p => 
    p.role === 'Finisher' || (p.attributes?.finishing && p.attributes.finishing >= 80) || (p.attributes?.deathOverBatting && p.attributes.deathOverBatting >= 80)
  ).length;

  const wicketkeeperCount = teamPlayers.filter(p => 
    p.role === 'Wicketkeeper Batter' || p.role.includes('Wicketkeeper')
  ).length;

  const allRounderCount = teamPlayers.filter(p => 
    p.role.includes('All-rounder') || (p.battingRating >= 70 && p.bowlingRating >= 65)
  ).length;

  const paceBowlerCount = teamPlayers.filter(p => 
    p.role === 'Pace Bowler' || p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium')
  ).length;

  const spinBowlerCount = teamPlayers.filter(p => 
    p.role === 'Spin Bowler' || p.bowlingStyle.includes('spin') || p.bowlingStyle.includes('break') || p.bowlingStyle.includes('orthodox')
  ).length;

  const powerplayBowlerCount = teamPlayers.filter(p => 
    p.attributes?.powerplayBowling && p.attributes.powerplayBowling >= 80
  ).length;

  const deathBowlerCount = teamPlayers.filter(p => 
    p.attributes?.deathBowling && p.attributes.deathBowling >= 80
  ).length;

  // Helper to compute need urgency and weight with correct conditional ordering
  const evaluateNeed = (current: number, target: number): { urgency: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; weight: number } => {
    if (current === 0 && target >= 1) {
      return { urgency: 'CRITICAL', weight: 1.35 };
    }
    if (current < target) {
      return { urgency: 'HIGH', weight: 1.20 };
    }
    if (current === target) {
      return { urgency: 'MEDIUM', weight: 1.05 };
    }
    if (current === target + 1) {
      return { urgency: 'LOW', weight: 0.88 };
    }
    // current >= target + 2 (Depth surplus)
    return { urgency: 'NONE', weight: 0.70 };
  };

  const topOrder = { current: topOrderCount, target: 3, ...evaluateNeed(topOrderCount, 3) };
  const middleOrder = { current: middleOrderCount, target: 3, ...evaluateNeed(middleOrderCount, 3) };
  const finisher = { current: finisherCount, target: 2, ...evaluateNeed(finisherCount, 2) };
  const wicketkeeper = { current: wicketkeeperCount, target: 2, ...evaluateNeed(wicketkeeperCount, 2) };
  const allRounder = { current: allRounderCount, target: 3, ...evaluateNeed(allRounderCount, 3) };
  const paceBowler = { current: paceBowlerCount, target: 4, ...evaluateNeed(paceBowlerCount, 4) };
  const spinBowler = { current: spinBowlerCount, target: 3, ...evaluateNeed(spinBowlerCount, 3) };
  const powerplayBowler = { current: powerplayBowlerCount, target: 2, ...evaluateNeed(powerplayBowlerCount, 2) };
  const deathBowler = { current: deathBowlerCount, target: 2, ...evaluateNeed(deathBowlerCount, 2) };

  const allNeeds = [topOrder, middleOrder, finisher, wicketkeeper, allRounder, paceBowler, spinBowler, powerplayBowler, deathBowler];
  const criticalNeedsCount = allNeeds.filter(n => n.urgency === 'CRITICAL').length;
  const highNeedsCount = allNeeds.filter(n => n.urgency === 'HIGH').length;

  const overallNeedScore = Math.min(100, Math.round((criticalNeedsCount * 25 + highNeedsCount * 12) + Math.max(0, 18 - totalPlayers) * 3));

  return {
    teamId: team.id,
    totalPlayers,
    overseasCount,
    indianCount,
    needs: {
      topOrder,
      middleOrder,
      finisher,
      wicketkeeper,
      allRounder,
      paceBowler,
      spinBowler,
      powerplayBowler,
      deathBowler
    },
    overallNeedScore,
    criticalNeedsCount
  };
}

export function calculatePlayerNeedFit(player: Player, squadNeeds: TeamSquadNeeds): { multiplier: number; reasoning: string; primaryUrgency: string } {
  const needs = squadNeeds.needs;
  let multiplier = 1.0;
  const matchedReasons: string[] = [];
  let highestUrgency: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  const updateUrgency = (u: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    const priority = { 'CRITICAL': 5, 'HIGH': 4, 'MEDIUM': 3, 'LOW': 2, 'NONE': 1 };
    if (priority[u] > priority[highestUrgency]) {
      highestUrgency = u;
    }
  };

  // 1. Wicketkeeper check
  if (player.role.includes('Wicketkeeper')) {
    multiplier *= needs.wicketkeeper.weight;
    updateUrgency(needs.wicketkeeper.urgency);
    if (needs.wicketkeeper.urgency === 'CRITICAL') matchedReasons.push('Critical need for primary wicketkeeper');
    else if (needs.wicketkeeper.urgency === 'HIGH') matchedReasons.push('High need for keeper-batter depth');
  }

  // 2. Death bowler check
  if (player.attributes?.deathBowling && player.attributes.deathBowling >= 82) {
    multiplier *= needs.deathBowler.weight;
    updateUrgency(needs.deathBowler.urgency);
    if (needs.deathBowler.urgency === 'CRITICAL') matchedReasons.push('Critical need for specialist death bowler');
    else if (needs.deathBowler.urgency === 'HIGH') matchedReasons.push('Seeking proven death over weapon');
  }

  // 3. Powerplay bowling check
  if (player.attributes?.powerplayBowling && player.attributes.powerplayBowling >= 82) {
    multiplier *= (needs.powerplayBowler.weight * 0.5 + 0.5);
    updateUrgency(needs.powerplayBowler.urgency);
    if (needs.powerplayBowler.urgency === 'CRITICAL') matchedReasons.push('Desperately seeking new-ball swing weapon');
  }

  // 4. Role-based matching
  if (player.role === 'Pace Bowler') {
    multiplier *= needs.paceBowler.weight;
    updateUrgency(needs.paceBowler.urgency);
    if (needs.paceBowler.urgency === 'CRITICAL' || needs.paceBowler.urgency === 'HIGH') matchedReasons.push('Pace attack reinforcement required');
  } else if (player.role === 'Spin Bowler') {
    multiplier *= needs.spinBowler.weight;
    updateUrgency(needs.spinBowler.urgency);
    if (needs.spinBowler.urgency === 'CRITICAL' || needs.spinBowler.urgency === 'HIGH') matchedReasons.push('Spin bowling reinforcement required');
  } else if (player.role.includes('All-rounder')) {
    multiplier *= needs.allRounder.weight;
    updateUrgency(needs.allRounder.urgency);
    if (needs.allRounder.urgency === 'CRITICAL' || needs.allRounder.urgency === 'HIGH') matchedReasons.push('Multi-skill all-rounder needed for balance');
  } else if (player.role === 'Finisher' || (player.attributes?.finishing && player.attributes.finishing >= 85)) {
    multiplier *= needs.finisher.weight;
    updateUrgency(needs.finisher.urgency);
    if (needs.finisher.urgency === 'CRITICAL' || needs.finisher.urgency === 'HIGH') matchedReasons.push('Explosive late-overs finisher required');
  } else if (player.role === 'Top-order Batter') {
    multiplier *= needs.topOrder.weight;
    updateUrgency(needs.topOrder.urgency);
  } else if (player.role === 'Middle-order Batter') {
    multiplier *= needs.middleOrder.weight;
    updateUrgency(needs.middleOrder.urgency);
  }

  // 5. Overseas constraint penalty
  if (player.isOverseas) {
    if (squadNeeds.overseasCount >= 8) {
      multiplier = 0;
      matchedReasons.push('Overseas quota full (8/8)');
      highestUrgency = 'NONE';
    } else if (squadNeeds.overseasCount >= 7) {
      multiplier *= 0.65;
      matchedReasons.push('Final overseas slot remaining - preserving flexibility');
    } else if (squadNeeds.overseasCount >= 6) {
      multiplier *= 0.85;
    }
  } else {
    // Indian premium
    if (player.overall >= 88) {
      multiplier *= 1.15;
      matchedReasons.push('Premium Indian capped superstar core');
    } else if (player.potential >= 90) {
      multiplier *= 1.20;
      matchedReasons.push('High-ceiling Indian prodigy');
    }
  }

  // 6. Overall squad capacity constraint
  if (squadNeeds.totalPlayers >= 25) {
    multiplier = 0;
    matchedReasons.push('Roster cap reached (25/25)');
    highestUrgency = 'NONE';
  }

  const reasoning = matchedReasons.length > 0 ? matchedReasons.join(' • ') : 'Standard squad depth fit';
  return {
    multiplier: Math.max(0, Number(multiplier.toFixed(3))),
    reasoning,
    primaryUrgency: highestUrgency
  };
}

// -------------------------------------------------------------
// 2. PLAYER SCARCITY ANALYSIS
// -------------------------------------------------------------

export function calculatePlayerScarcity(
  player: Player,
  remainingPool: Player[],
  allTeams?: Record<string, Team>,
  allPlayers?: Record<string, Player>
): PlayerScarcityAnalysis {
  const isCapped = player.isCapped ?? (player.overall >= 86 || player.isOverseas || player.basePriceCr >= 1.0);
  
  // Count remaining players in same primary role
  const roleRemaining = remainingPool.filter(p => p.role === player.role && p.id !== player.id);
  const roleRemainingCount = roleRemaining.length;

  // Comparable remaining (within rating bracket ±3 OVR)
  const comparableRemaining = remainingPool.filter(p => 
    Math.abs(p.overall - player.overall) <= 3 && 
    (p.role === player.role || (player.role.includes('Bowler') && p.role.includes('Bowler')) || (player.role.includes('Batter') && p.role.includes('Batter'))) &&
    p.id !== player.id
  );
  const comparableRemainingCount = comparableRemaining.length;

  // Elite remaining (OVR >= 88 or potential >= 90)
  const eliteRemaining = remainingPool.filter(p => 
    p.id !== player.id &&
    ((p.isCapped && p.overall >= 88) || (!p.isCapped && p.potential >= 90)) &&
    (p.role === player.role || (player.role.includes('All-rounder') && p.role.includes('All-rounder')))
  );
  const eliteRemainingCount = eliteRemaining.length;

  // Count how many teams still have high/critical need for this role
  let teamsNeedingRoleCount = 0;
  if (allTeams && allPlayers) {
    Object.values(allTeams).forEach(t => {
      const squad = (t.rosterPlayerIds || []).map(id => allPlayers[id]).filter(Boolean);
      const needs = calculateTeamSquadNeeds(t, squad);
      const fit = calculatePlayerNeedFit(player, needs);
      if (fit.primaryUrgency === 'CRITICAL' || fit.primaryUrgency === 'HIGH') {
        teamsNeedingRoleCount++;
      }
    });
  } else {
    // Default estimate if teams map not provided
    teamsNeedingRoleCount = Math.max(1, Math.min(6, Math.floor(10 - (player.overall / 12))));
  }

  // Final elite option detection: only 1-2 elite options left with multiple teams competing
  const isFinalEliteOption = (player.overall >= 88 || player.potential >= 90) && eliteRemainingCount <= 2 && teamsNeedingRoleCount >= 2;

  // Scarcity Index (0.0 to 1.0)
  let scarcityIndex = 0.5;
  if (isFinalEliteOption) {
    scarcityIndex = 0.95;
  } else {
    const roleScarcityFactor = Math.max(0, 1 - (roleRemainingCount / 12));
    const demandFactor = Math.min(1, teamsNeedingRoleCount / 5);
    scarcityIndex = Math.min(1.0, Math.max(0.1, roleScarcityFactor * 0.6 + demandFactor * 0.4));
  }

  // Scarcity Multiplier (0.88 to 1.40)
  let scarcityMultiplier = 1.0;
  if (isFinalEliteOption) {
    scarcityMultiplier = 1.28 + Math.min(0.12, (teamsNeedingRoleCount - 2) * 0.04); // Up to +40% for final elite
  } else if (scarcityIndex >= 0.75) {
    scarcityMultiplier = 1.15 + (scarcityIndex - 0.75) * 0.5; // +15% to +27%
  } else if (scarcityIndex <= 0.30) {
    scarcityMultiplier = 0.90 + scarcityIndex * 0.25; // Depth surplus discount
  } else {
    scarcityMultiplier = 1.0 + (scarcityIndex - 0.5) * 0.25;
  }

  return {
    playerId: player.id,
    role: player.role,
    comparableRemainingCount,
    roleRemainingCount,
    eliteRemainingCount,
    teamsNeedingRoleCount,
    scarcityIndex: Number(scarcityIndex.toFixed(2)),
    isFinalEliteOption,
    scarcityMultiplier: Number(scarcityMultiplier.toFixed(2))
  };
}

// -------------------------------------------------------------
// 3. AUCTION PHASE ENGINE
// -------------------------------------------------------------

export function getAuctionPhase(currentIndex: number, totalPool: number, setCode?: string): AuctionPhase {
  if (setCode === 'ACC1') return 'ACCELERATED';
  const progressRatio = totalPool > 0 ? currentIndex / totalPool : 0;

  if (setCode === 'M1' || setCode === 'M2' || progressRatio < 0.18) {
    return 'EARLY';
  }
  if (['BA1', 'AL1', 'WK1', 'FA1', 'SP1'].includes(setCode || '') || progressRatio < 0.55) {
    return 'MIDDLE';
  }
  if (['UBA1', 'UAL1', 'UWK1', 'UFA1', 'USP1'].includes(setCode || '') || progressRatio < 0.85) {
    return 'LATE';
  }
  return 'FINAL';
}

export function getPhaseMultiplier(phase: AuctionPhase, player: Player, personality?: Team['aiPersonality']): number {
  const isMarquee = player.overall >= 92 || player.auctionSetCode === 'M1' || player.auctionSetCode === 'M2';
  const isProdigy = !player.isCapped && player.potential >= 90;

  switch (phase) {
    case 'EARLY':
      // Early phase: Franchises spend heavily on marquee pillars, but conserve purse on tier-3 filler
      if (isMarquee) return 1.08;
      if (player.overall >= 88) return 1.02;
      return 0.92;

    case 'MIDDLE':
      // Middle phase: Peak tactical bidding to fill key starting XI roles
      return 1.00;

    case 'LATE':
      // Late phase: Uncapped gems create bidding wars, depth players sell at fair/discount values
      if (isProdigy) return 1.18;
      return 0.95;

    case 'FINAL':
    case 'ACCELERATED':
      // Accelerated / Final phase: Roster size compliance is paramount
      return 0.90;
  }
}

// -------------------------------------------------------------
// 4. BUDGET MANAGEMENT & RESERVED PURSE
// -------------------------------------------------------------

export function calculateReservedPurse(team: Team, minTargetSquadSize: number = 18): { reservedPurseCr: number; availablePurseCr: number } {
  const currentSquadSize = team.rosterPlayerIds.length;
  const remainingSlotsNeeded = Math.max(0, minTargetSquadSize - currentSquadSize);

  // Reserve min budget per remaining slot (₹0.30 - ₹0.50 Cr)
  const costPerSlot = remainingSlotsNeeded > 8 ? 0.40 : 0.30;
  const reservedPurseCr = Number((Math.max(0, remainingSlotsNeeded - 1) * costPerSlot).toFixed(2));
  const availablePurseCr = Number(Math.max(0, team.purseCr - reservedPurseCr).toFixed(2));

  return { reservedPurseCr, availablePurseCr };
}

// -------------------------------------------------------------
// 5. BASE MARKET VALUE
// -------------------------------------------------------------

export function calculateBaseMarketValue(player: Player): number {
  const isCapped = player.isCapped ?? (player.overall >= 86 || player.isOverseas || player.basePriceCr >= 1.0);

  if (isCapped) {
    if (player.overall >= 95) {
      // Tier-1 All-Time Superstars (Bumrah, Klaasen, Starc, Pant) ~₹19 - 26.5 Cr
      return 19.0 + (player.overall - 95) * 2.2;
    }
    if (player.overall >= 92) {
      // Marquee Franchise Pillars (Iyer, Buttler, Cummins, Rahul, Rashid) ~₹13.5 - 18.5 Cr
      return 13.5 + (player.overall - 92) * 1.6;
    }
    if (player.overall >= 89) {
      // Capped Stars (Arshdeep, Siraj, Boult, Chahal, Maxwell, Phil Salt) ~₹9.0 - 13.0 Cr
      return 9.0 + (player.overall - 89) * 1.3;
    }
    if (player.overall >= 86) {
      // Established Capped Regulars (Bhuvi, Rahane, Ashwin, Deepak Chahar, Tripathi) ~₹4.5 - 8.5 Cr
      return 4.5 + (player.overall - 86) * 1.3;
    }
    if (player.overall >= 83) {
      // Solid Capped Squad Depth ~₹2.0 - 4.2 Cr
      return 2.0 + (player.overall - 83) * 0.7;
    }
    return Math.max(player.basePriceCr, 0.8 + (player.overall - 75) * 0.12);
  }

  // UNCAPPED PLAYERS
  const rawUncapped = 0.4 + Math.max(0, player.overall - 78) * 0.35;
  let baseValue = Math.max(player.basePriceCr, rawUncapped);

  const isHighPotentialYouth = player.age <= 24 && player.potential >= 90;
  const hasExplosiveSkill = 
    (player.attributes?.power && player.attributes.power >= 86) ||
    (player.attributes?.pace && player.attributes.pace >= 88) ||
    (player.attributes?.deathBowling && player.attributes.deathBowling >= 86) ||
    (player.role.includes('Wicketkeeper') && player.battingRating >= 80);

  if (isHighPotentialYouth && hasExplosiveSkill) {
    // Breakout sensations (Rizvi, Kushagra, Ashutosh, Mayank Yadav, Tyagi) ~₹5.5 - 11.5 Cr
    baseValue = Math.max(baseValue, 5.5 + (player.potential - 90) * 1.0 + (player.overall - 80) * 0.8);
  } else if (isHighPotentialYouth || hasExplosiveSkill) {
    baseValue = Math.max(baseValue, 2.5 + (player.potential - 88) * 0.5);
  }

  return Number(baseValue.toFixed(2));
}

// -------------------------------------------------------------
// 6. MAIN CONTEXTUAL VALUATION FUNCTION (EVALUATE PLAYER VALUE)
// -------------------------------------------------------------

export function evaluatePlayerValueForTeam(
  player: Player,
  team: Team,
  teamPlayers: Player[],
  remainingTargetsCount: number = 8,
  auctionPhase: AuctionPhase = 'MIDDLE',
  remainingPool: Player[] = []
): number {
  if (team.rosterPlayerIds.length >= 25) return 0;
  const currentOverseasCount = teamPlayers.filter(p => p.isOverseas).length;
  if (player.isOverseas && currentOverseasCount >= 8) return 0;

  // 1. Base Market Value
  const baseMarketValue = calculateBaseMarketValue(player);

  // 2. Squad Needs Fit Multiplier
  const squadNeeds = calculateTeamSquadNeeds(team, teamPlayers);
  const needFit = calculatePlayerNeedFit(player, squadNeeds);
  if (needFit.multiplier <= 0) return 0;

  // 3. Scarcity Multiplier
  const scarcity = calculatePlayerScarcity(player, remainingPool);
  const scarcitySensitivity = (team.aiPersonality?.scarcitySensitivity ?? 75) / 100;
  const appliedScarcity = 1.0 + (scarcity.scarcityMultiplier - 1.0) * scarcitySensitivity;

  // 4. Phase Multiplier
  const phaseMult = getPhaseMultiplier(auctionPhase, player, team.aiPersonality);

  // 5. Franchise Personality Multiplier
  let personalityMult = 1.0;
  const p = team.aiPersonality;
  if (p) {
    if (player.overall >= 90) {
      personalityMult += ((p.starPreference - 50) / 50) * 0.12;
    }
    if (player.age <= 23 || (!player.isCapped && player.potential >= 90)) {
      personalityMult += ((p.youthPreference - 50) / 50) * 0.22;
    }
    if (player.role.includes('Bowler')) {
      personalityMult += ((p.bowlingPriority - 50) / 50) * 0.10;
    }
    if (player.role.includes('Batter')) {
      personalityMult += ((p.battingPriority - 50) / 50) * 0.10;
    }
    personalityMult += ((p.aggression - 50) / 50) * 0.08;
    personalityMult -= ((p.budgetDiscipline - 50) / 50) * 0.08;
  }

  // Combine valuation, then pass it through a real-world IPL market-resistance curve.
  // This keeps the auction free-form and dramatic without relying on an artificial fixed price cap.
  let contextualValuation = baseMarketValue * needFit.multiplier * appliedScarcity * phaseMult * personalityMult;
  contextualValuation = applyRealWorldAuctionElasticity(player, contextualValuation, baseMarketValue);

  // 6. Purse & Budget Constraints
  const { reservedPurseCr, availablePurseCr } = calculateReservedPurse(team, 18);
  if (availablePurseCr <= 0) return 0;

  // Dynamic purse discipline: teams protect enough money to complete a real squad instead of
  // spending half their purse on one player. This is strategic behavior, not a price ceiling.
  const slotsRemaining = Math.max(1, 18 - team.rosterPlayerIds.length);
  let maxPurseShare = 0.24;
  if (slotsRemaining <= 2) {
    maxPurseShare = 0.62;
  } else if (slotsRemaining <= 5) {
    maxPurseShare = 0.42;
  } else if (slotsRemaining <= 8) {
    maxPurseShare = 0.32;
  } else {
    maxPurseShare = 0.24;
  }

  if (player.overall >= 94) {
    maxPurseShare = Math.min(0.68, maxPurseShare + 0.06);
  } else if (!player.isCapped && player.potential >= 90) {
    maxPurseShare = Math.min(0.46, maxPurseShare + 0.04);
  }

  const discipline = p?.budgetDiscipline ?? 65;
  const risk = p?.riskTolerance ?? 50;
  const aggression = p?.aggression ?? 50;
  const purseTemperament = clampAuctionNumber(1 + (risk - discipline) / 260 + (aggression - 50) / 360, 0.78, 1.14);
  maxPurseShare *= purseTemperament;

  const teamBudgetCap = availablePurseCr * maxPurseShare;
  const finalValuation = Math.min(contextualValuation, teamBudgetCap, availablePurseCr);

  return Number(Math.max(player.basePriceCr, Math.min(team.purseCr, finalValuation)).toFixed(2));
}

// -------------------------------------------------------------
// 7. COMPREHENSIVE AI DECISION ENGINE
// -------------------------------------------------------------

export function evaluateAIDecisionForTeam(
  player: Player,
  team: Team,
  teamPlayers: Player[],
  auctionState: AuctionState,
  allTeams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId?: string
): AIDecisionContext {
  const currentBid = auctionState.currentBidCr;
  const nextBidAmount = Number((currentBid + getBidIncrement(currentBid)).toFixed(2));
  const currentLeaderId = auctionState.currentLeadingTeamId;
  const isAlreadyLeader = currentLeaderId === team.id;
  const p = team.aiPersonality;

  // Default negative context helper
  const makeDecision = (
    decision: AIDecisionType, 
    reasoning: string, 
    ceiling: number = 0, 
    willingness: number = 0, 
    isPressure: boolean = false
  ): AIDecisionContext => ({
    teamId: team.id,
    teamShortName: team.shortName,
    playerId: player.id,
    playerName: player.name,
    decision,
    reasoning,
    baseValuationCr: calculateBaseMarketValue(player),
    squadNeedMultiplier: 1.0,
    scarcityMultiplier: 1.0,
    personalityMultiplier: 1.0,
    budgetMultiplier: 1.0,
    phaseMultiplier: 1.0,
    rivalPressureAdjustmentCr: 0,
    momentumBonusCr: 0,
    effectiveCeilingCr: ceiling,
    currentBidCr: currentBid,
    nextBidAmountCr: nextBidAmount,
    willingnessScore: willingness,
    confidencePercent: Math.min(100, Math.max(10, Math.round(willingness * 10))),
    isBluffOrPressure: isPressure
  });

  // Hard Rule Checks
  if (isAlreadyLeader) {
    return makeDecision('WAIT', 'Currently holding the highest bid');
  }
  if (team.rosterPlayerIds.length >= 25) {
    return makeDecision('DROP_OUT', 'Maximum squad size limit reached (25 players)');
  }
  if (team.purseCr < nextBidAmount) {
    return makeDecision('DROP_OUT', 'Insufficient franchise purse');
  }
  const overseasCount = teamPlayers.filter(pl => pl.isOverseas).length;
  if (player.isOverseas && overseasCount >= 8) {
    return makeDecision('DROP_OUT', 'Overseas quota full (8/8)');
  }

  // Calculate Reserved Purse & Remaining Slots
  const { reservedPurseCr, availablePurseCr } = calculateReservedPurse(team, 18);
  if (availablePurseCr < nextBidAmount) {
    return makeDecision('SAVE_BUDGET', 'Preserving purse for remaining squad slots');
  }

  // Contextual Evaluation
  const pool = auctionState.allPlayerPool || [];
  const phase = getAuctionPhase(auctionState.currentPlayerIndex, pool.length, player.auctionSetCode);
  const remainingPool = pool.slice(auctionState.currentPlayerIndex + 1);
  const squadNeeds = calculateTeamSquadNeeds(team, teamPlayers);
  const needFit = calculatePlayerNeedFit(player, squadNeeds);
  const scarcity = calculatePlayerScarcity(player, remainingPool, allTeams, allPlayers);
  const baseValuation = calculateBaseMarketValue(player);

  const baseCeiling = evaluatePlayerValueForTeam(
    player,
    team,
    teamPlayers,
    8,
    phase,
    remainingPool
  );

  // Bidding Momentum & War Persistence
  const bidsByTeamInLot = auctionState.bidHistory.filter(b => b.teamId === team.id).length;
  const totalBidsInLot = auctionState.bidHistory.length;
  const isBiddingWar = totalBidsInLot >= 4;

  let momentumStretch = 1.0;
  if (isBiddingWar && (p?.biddingPersistence ?? 70) > 70) {
    // High persistence teams stretch up to +6% in a war for priority targets
    if (needFit.primaryUrgency === 'CRITICAL' || needFit.primaryUrgency === 'HIGH') {
      momentumStretch = 1.0 + ((p?.biddingPersistence ?? 70) - 70) * 0.002;
    }
  }

  // Aggression stretch
  const aggressionFactor = ((p?.aggression ?? 50) - 50) / 100;
  const aggressionStretch = 1.0 + Math.max(-0.05, Math.min(0.10, aggressionFactor * 0.08));

  // RIVAL-SPOILER: franchises with high rivalry tendency inflate the price for
  // whatever the user is chasing (they know their rival's needs hurt them).
  let rivalryStretch = 1.0;
  let isRivalSpoil = false;
  if (
    userTeamId &&
    currentLeaderId === userTeamId &&
    (p?.rivalryTendency ?? 50) >= 70 &&
    (needFit.primaryUrgency === 'CRITICAL' || needFit.primaryUrgency === 'HIGH')
  ) {
    const rivalBias = Math.min(1, ((p?.rivalryTendency ?? 70) - 50) / 50);
    rivalryStretch = 1.0 + rivalBias * 0.12; // up to +12% price pain against the user
    isRivalSpoil = true;
  }

  // Archetype behavior modifiers (the 9 personalities adjust the same math differently)
  const archetype = classifyAIPersonality(team).id;
  let archetypeStretch = 1.0;
  if (archetype === 'GALACTICO' && player.overall >= 90) archetypeStretch *= 1.05;
  if (archetype === 'MONEYBALL' && nextBidAmount > baseValuation * 1.25) archetypeStretch *= 0.82;
  if (archetype === 'AGGRESSOR') archetypeStretch *= 1.04;
  if (archetype === 'PATIENT_BUILDER' && player.age >= 31 && player.overall < 90) archetypeStretch *= 0.88;
  if (archetype === 'BOWLING_FIRST' && player.role.includes('Bowler')) archetypeStretch *= 1.05;
  if (archetype === 'BATTING_BARRAGE' && player.role.includes('Batter')) archetypeStretch *= 1.05;
  if (archetype === 'SCARCITY_HAWK' && scarcity.isFinalEliteOption) archetypeStretch *= 1.08;
  if (archetype === 'FRUGAL_PUNTER') {
    if (player.overall >= 92) archetypeStretch *= 0.88;
    if (!player.isCapped) archetypeStretch *= 1.05;
  }

  // Effective ceiling for this team in this auction state. A soft market-resistance curve
  // prevents endless AI escalation while still allowing rare IPL-style surprise premiums.
  let effectiveCeiling = baseCeiling * momentumStretch * aggressionStretch * rivalryStretch * archetypeStretch;
  effectiveCeiling = applyRealWorldAuctionElasticity(player, effectiveCeiling, baseValuation);
  effectiveCeiling = Math.min(effectiveCeiling, availablePurseCr, team.purseCr);

  // Controlled Randomness / Realistic Variance: enough to surprise, not enough to break economy.
  const randomVariance = (Math.random() - 0.5) * 0.08;
  const randomizedCeiling = Number((effectiveCeiling * (1 + randomVariance) * getAuctionSurpriseMultiplier(player, team)).toFixed(2));

  // Value-hunting archetypes wait out bidding wars rather than feed them
  if (
    isBiddingWar &&
    (archetype === 'MONEYBALL' || archetype === 'FRUGAL_PUNTER') &&
    nextBidAmount > baseValuation * 1.12 &&
    Math.random() < 0.55
  ) {
    return makeDecision(
      'WAIT',
      `${archetype === 'MONEYBALL' ? 'Analytics say overpriced' : 'Punter is patient'} — letting the war burn out before re-entering`,
      effectiveCeiling,
      2.5
    );
  }

  // Check if current bid exceeds team's willingness
  if (nextBidAmount > randomizedCeiling) {
    // Check Strategic Pressure / Bluff condition
    const isLeadingRivalDesperate = currentLeaderId && allTeams[currentLeaderId] && (() => {
      const leaderTeam = allTeams[currentLeaderId];
      const leaderSquad = (leaderTeam.rosterPlayerIds || []).map(id => allPlayers[id]).filter(Boolean);
      const leaderNeeds = calculateTeamSquadNeeds(leaderTeam, leaderSquad);
      const leaderFit = calculatePlayerNeedFit(player, leaderNeeds);
      return leaderFit.primaryUrgency === 'CRITICAL' || leaderFit.primaryUrgency === 'HIGH';
    })();

    const realisticPressureBand = baseValuation * (player.overall >= 92 ? 1.16 : 1.08);
    if (isRivalSpoil && nextBidAmount <= realisticPressureBand && Math.random() < 0.34) {
      return makeDecision(
        'PRESSURE_BID',
        `RIVAL SPOILER: ${team.shortName} briefly inflating the price against ${allTeams[userTeamId!]?.shortName || 'your franchise'} without losing purse discipline`,
        nextBidAmount,
        6.0,
        true
      );
    }

    const canAffordPressure = availablePurseCr >= nextBidAmount * 1.5;
    const isPriceFarBelowMarket = nextBidAmount <= baseValuation * 0.88;
    const hasAggressivePersona = (p?.aggression ?? 50) >= 75 || (p?.riskTolerance ?? 50) >= 75;

    if (isLeadingRivalDesperate && canAffordPressure && isPriceFarBelowMarket && hasAggressivePersona && Math.random() < 0.22) {
      return makeDecision(
        'PRESSURE_BID',
        `Strategic pressure bid against rival (${allTeams[currentLeaderId!]?.shortName}) for high-value asset`,
        nextBidAmount,
        5.5,
        true
      );
    }

    return makeDecision(
      'DROP_OUT',
      `Bid ₹${nextBidAmount} Cr exceeds maximum calculated valuation of ₹${effectiveCeiling} Cr`,
      effectiveCeiling,
      0
    );
  }

  // Next bid is within ceiling -> Determine Bid Decision Type & Willingness
  const margin = randomizedCeiling - nextBidAmount;
  const isHighPriority = needFit.primaryUrgency === 'CRITICAL' || needFit.primaryUrgency === 'HIGH';
  const isStealValue = nextBidAmount <= baseValuation * 0.75;
  const isStarPlayer = player.overall >= 92 || player.auctionSetCode === 'M1' || player.auctionSetCode === 'M2';

  let decisionType: AIDecisionType = 'BID';
  let willingness = 5.0 + margin;

  if (isStarPlayer && isHighPriority) {
    decisionType = 'AGGRESSIVE_BID';
    willingness += 4.0;
  } else if (isStealValue) {
    decisionType = 'VALUE_BID';
    willingness += 3.5;
  } else if (isBiddingWar) {
    decisionType = 'AGGRESSIVE_BID';
    willingness += 2.0;
  } else if (margin <= 0.50) {
    decisionType = 'BID';
  }

  const decisionContext: AIDecisionContext = {
    teamId: team.id,
    teamShortName: team.shortName,
    playerId: player.id,
    playerName: player.name,
    decision: decisionType,
    reasoning: needFit.reasoning,
    baseValuationCr: baseValuation,
    squadNeedMultiplier: needFit.multiplier,
    scarcityMultiplier: scarcity.scarcityMultiplier,
    personalityMultiplier: 1.0,
    budgetMultiplier: 1.0,
    phaseMultiplier: 1.0,
    rivalPressureAdjustmentCr: 0,
    momentumBonusCr: Number((baseCeiling * (momentumStretch - 1)).toFixed(2)),
    effectiveCeilingCr: effectiveCeiling,
    currentBidCr: currentBid,
    nextBidAmountCr: nextBidAmount,
    willingnessScore: Number(willingness.toFixed(2)),
    confidencePercent: Math.min(100, Math.max(15, Math.round((margin / (baseValuation || 1)) * 100 + 40))),
    isBluffOrPressure: false
  };

  return decisionContext;
}

// -------------------------------------------------------------
// 8. GET NEXT AI BID (FOR LIVE AUCTION TICKER)
// -------------------------------------------------------------

export function getNextAIBid(
  auctionState: AuctionState,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId: string
): { teamId: string; bidAmountCr: number; decisionContext?: AIDecisionContext } | null {
  if (!auctionState.activePlayer) return null;
  const player = auctionState.activePlayer;
  const currentLeader = auctionState.currentLeadingTeamId;

  const candidateDecisions: AIDecisionContext[] = [];

  Object.values(teams).forEach(team => {
    if (team.id === userTeamId) return; // User handles own bids
    if (team.id === currentLeader) return; // Already leading

    const teamPlayers = (team.rosterPlayerIds || []).map(id => allPlayers[id]).filter(Boolean);
    const decisionCtx = evaluateAIDecisionForTeam(
      player,
      team,
      teamPlayers,
      auctionState,
      teams,
      allPlayers,
      userTeamId
    );

    if (
      decisionCtx.decision === 'BID' || 
      decisionCtx.decision === 'AGGRESSIVE_BID' || 
      decisionCtx.decision === 'VALUE_BID' || 
      decisionCtx.decision === 'PRESSURE_BID'
    ) {
      candidateDecisions.push(decisionCtx);
    }
  });

  if (candidateDecisions.length === 0) return null;

  // Weighted contender selection: the strongest bidder is favored, but not guaranteed.
  // This creates realistic room behavior: hesitation, surprise paddles, and late rival jumps.
  candidateDecisions.sort((a, b) => b.willingnessScore - a.willingnessScore);
  const contenders = candidateDecisions.slice(0, Math.min(4, candidateDecisions.length));
  const topScore = Math.max(1, contenders[0]?.willingnessScore || 1);
  const pressure = auctionState.auctionTimerSeconds <= 3 ? 1.12 : auctionState.auctionTimerSeconds <= 5 ? 1.04 : 0.92;
  const bidProbability = clampAuctionNumber(0.38 + (topScore / 18) * pressure + contenders.length * 0.035, 0.38, 0.88);
  if (Math.random() > bidProbability) return null;

  const weights = contenders.map((ctx, index) => {
    const recencyPenalty = auctionState.bidHistory[0]?.teamId === ctx.teamId ? 0.72 : 1;
    const rankBias = 1 / (1 + index * 0.52);
    return Math.max(0.05, ctx.willingnessScore) * rankBias * recencyPenalty;
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = contenders[0];
  for (let i = 0; i < contenders.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      chosen = contenders[i];
      break;
    }
  }

  return {
    teamId: chosen.teamId,
    bidAmountCr: chosen.nextBidAmountCr,
    decisionContext: chosen
  };
}

// -------------------------------------------------------------
// 9. SIMULATE COMPETITIVE AUCTION BATTLE (FOR RESOLVING A LOT)
// -------------------------------------------------------------

export function simulateAuctionBattle(
  player: Player,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId?: string,
  userMaxBidCr?: number,
  rivalTargetIds?: string[]
): { winningTeamId: string; finalPriceCr: number; bidHistory?: AuctionBid[] } | null {
  // Collect all interested teams and compute their contextual ceilings
  interface TeamCompetitor {
    teamId: string;
    teamShortName: string;
    ceiling: number;
    persistence: number;
    aggression: number;
    bidsPlaced: number;
  }

  const competitors: TeamCompetitor[] = [];

  Object.values(teams).forEach(team => {
    if (team.rosterPlayerIds.length >= 25) return;
    const teamPlayers = (team.rosterPlayerIds || []).map(id => allPlayers[id]).filter(Boolean);

    if (player.isOverseas) {
      const osCount = teamPlayers.filter(p => p.isOverseas).length;
      if (osCount >= 8) return;
    }

    let ceiling = 0;
    if (userTeamId && team.id === userTeamId) {
      ceiling = userMaxBidCr ?? 0;
    } else {
      const val = evaluatePlayerValueForTeam(player, team, teamPlayers, 8, 'MIDDLE');
      const p = team.aiPersonality;
      const persistenceBonus = (p?.biddingPersistence ?? 70) > 75 ? 1.035 : 1.005;
      const randomVar = (Math.random() - 0.5) * 0.075;
      // Rival spoiler: high-rivalry AI can stretch, but only inside the same realistic market curve.
      let spoiler = 1.0;
      if (userTeamId && rivalTargetIds?.includes(player.id) && (p?.rivalryTendency ?? 50) >= 70) {
        spoiler = 1.0 + Math.min(1, ((p?.rivalryTendency ?? 70) - 50) / 50) * 0.065;
      }
      const rawCeiling = val * persistenceBonus * spoiler * (1 + randomVar) * getAuctionSurpriseMultiplier(player, team);
      ceiling = Number(applyRealWorldAuctionElasticity(player, rawCeiling, calculateBaseMarketValue(player)).toFixed(2));
    }

    const { availablePurseCr } = calculateReservedPurse(team, 18);
    const affordableCeiling = Math.min(ceiling, availablePurseCr, team.purseCr);

    if (affordableCeiling >= player.basePriceCr) {
      competitors.push({
        teamId: team.id,
        teamShortName: team.shortName,
        ceiling: affordableCeiling,
        persistence: team.aiPersonality?.biddingPersistence ?? 70,
        aggression: team.aiPersonality?.aggression ?? 50,
        bidsPlaced: 0
      });
    }
  });

  if (competitors.length === 0) return null;

  // Single team interested -> Sold at base price
  if (competitors.length === 1) {
    return {
      winningTeamId: competitors[0].teamId,
      finalPriceCr: player.basePriceCr
    };
  }

  // Multi-team bidding battle simulation
  let currentPrice = player.basePriceCr;
  let activeLeaderId = competitors[0].teamId;
  let activeCompetitors = [...competitors];
  const simulatedHistory: AuctionBid[] = [];

  // Opening bid
  simulatedHistory.push({
    teamId: activeLeaderId,
    teamShortName: competitors[0].teamShortName,
    bidAmountCr: currentPrice,
    timestamp: Date.now()
  });

  let safetyCounter = 0;
  while (activeCompetitors.length > 1 && safetyCounter < 60) {
    safetyCounter++;
    const nextInc = getBidIncrement(currentPrice);
    const nextPrice = Number((currentPrice + nextInc).toFixed(2));

    // Filter competitors who are still willing and able to pay nextPrice.
    // Near their limit, franchises may blink early; this makes the battle thrilling without
    // mechanically marching to every team's exact maximum valuation.
    const marketAnchor = calculateBaseMarketValue(player);
    activeCompetitors = activeCompetitors.filter(c => {
      if (c.teamId === activeLeaderId) return true;
      if (c.ceiling < nextPrice) return false;

      const ceilingPressure = nextPrice / Math.max(c.ceiling, 0.1);
      const marketPressure = nextPrice / Math.max(marketAnchor, player.basePriceCr, 0.1);
      let dropoutChance = 0;
      if (ceilingPressure > 0.78) dropoutChance += (ceilingPressure - 0.78) * 1.55;
      if (ceilingPressure > 0.92) dropoutChance += (ceilingPressure - 0.92) * 2.10;
      if (marketPressure > 1.16) dropoutChance += (marketPressure - 1.16) * 0.28;
      if (marketPressure > 1.34) dropoutChance += (marketPressure - 1.34) * 0.48;
      dropoutChance -= (c.persistence - 65) * 0.0022;
      dropoutChance -= (c.aggression - 55) * 0.0018;

      return Math.random() >= clampAuctionNumber(dropoutChance, 0.015, 0.64);
    });

    if (activeCompetitors.length <= 1) {
      break;
    }

    // Pick next challenger (other than activeLeader) with highest willingness
    const challengers = activeCompetitors.filter(c => c.teamId !== activeLeaderId);
    challengers.sort((a, b) => (b.ceiling - nextPrice) - (a.ceiling - nextPrice));

    const nextBidder = challengers[0];
    if (!nextBidder) break;

    currentPrice = nextPrice;
    activeLeaderId = nextBidder.teamId;
    nextBidder.bidsPlaced++;

    simulatedHistory.unshift({
      id: `bid_${nextBidder.teamId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teamId: nextBidder.teamId,
      teamShortName: nextBidder.teamShortName,
      bidAmountCr: currentPrice,
      timestamp: Date.now()
    });
  }

  return {
    winningTeamId: activeLeaderId,
    finalPriceCr: currentPrice,
    bidHistory: simulatedHistory
  };
}

// -------------------------------------------------------------
// 10. AI ASSISTANT ADVICE GENERATOR
// -------------------------------------------------------------

export function generateAIAssistantAdvice(
  player: Player,
  userTeam: Team,
  userSquad: Player[],
  currentBidCr: number
): AIAssistantAdvice {
  const estimatedVal = evaluatePlayerValueForTeam(player, userTeam, userSquad);
  const premium = currentBidCr > estimatedVal ? Math.round(((currentBidCr - estimatedVal) / (estimatedVal || 1)) * 100) : 0;
  
  const squadNeeds = calculateTeamSquadNeeds(userTeam, userSquad);
  const needFit = calculatePlayerNeedFit(player, squadNeeds);
  const scarcity = calculatePlayerScarcity(player, []);

  let verdict = 'Fair Market Value';
  if (currentBidCr > estimatedVal * 1.25) {
    verdict = 'Overpriced / Risky';
  } else if (currentBidCr < estimatedVal * 0.80) {
    verdict = 'High Value Steal Target';
  } else if (scarcity.isFinalEliteOption) {
    verdict = 'Elite Scarcity Target';
  }

  let needAnalysis = needFit.reasoning;
  if (needFit.primaryUrgency === 'CRITICAL') {
    needAnalysis = `CRITICAL NEED: ${needFit.reasoning}. Recommended to secure without hesitation.`;
  } else if (needFit.primaryUrgency === 'HIGH') {
    needAnalysis = `HIGH PRIORITY: ${needFit.reasoning}.`;
  } else if (needFit.primaryUrgency === 'NONE') {
    needAnalysis = `LOW PRIORITY: Squad already deep in this category. Preserve purse for scarce positions.`;
  }

  let rivalInterest = `Moderate franchise demand expected for ${player.role}.`;
  if (scarcity.isFinalEliteOption) {
    rivalInterest = `INTENSE BIDDING WAR EXPECTED: Only ${scarcity.eliteRemainingCount} elite option(s) remaining for ${scarcity.teamsNeedingRoleCount} needy teams!`;
  } else if (player.overall >= 92) {
    rivalInterest = `Heavy paddle wars guaranteed from top franchises (MI, RCB, SRH).`;
  }

  return {
    verdict,
    recommendedMaxBidCr: estimatedVal,
    squadNeedAnalysis: needAnalysis,
    rivalInterestAssessment: rivalInterest,
    valuePremiumPercent: premium,
    isHighValueTarget: estimatedVal >= 6.5 && currentBidCr <= estimatedVal,
    scarcityAnalysis: scarcity,
    squadNeeds,
    alternativeTargetsRemaining: scarcity.comparableRemainingCount
  };
}

// -------------------------------------------------------------
// 11. INITIALIZE AUCTION STATE
// -------------------------------------------------------------

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
    autoBidUser: false,
    isAutoBidEnabled: false
  };
}

// -------------------------------------------------------------
// 12. FULL AUCTION SIMULATION (FAST & ROBUST)
// -------------------------------------------------------------

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
    auc.allPlayerPool.forEach(p => {
      if (playersCopy[p.id]) {
        playersCopy[p.id].currentTeamId = null;
        playersCopy[p.id].salaryCr = 0;
      }
    });

    Object.values(teamsCopy).forEach(t => {
      t.rosterPlayerIds = t.rosterPlayerIds.filter(id => {
        const pl = playersCopy[id];
        return pl && !auc.allPlayerPool.some(ap => ap.id === id);
      });
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

    let userMaxBid: number | undefined = undefined;
    const userTeam = teamsCopy[userTeamId];
    if (userTeam) {
      const userSquad = userTeam.rosterPlayerIds.map(id => playersCopy[id]).filter(Boolean);
      const isTarget = prioritySet.has(player.id);
      
      if (options?.userAutoBid || isTarget) {
        const baseVal = evaluatePlayerValueForTeam(player, userTeam, userSquad);
        const multiplier = isTarget ? 1.30 : 1.02;
        userMaxBid = Number((baseVal * multiplier).toFixed(2));
      }
    }

    const battle = simulateAuctionBattle(
      player,
      teamsCopy,
      playersCopy,
      userTeamId,
      userMaxBid,
      Array.from(prioritySet)
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
          buyingTeamId: winningTeam.id,
          biddingHistory: battle.bidHistory
        });
      }
    } else {
      auc.unsoldPlayerIds.push(player.id);
    }
  }

  // ACCELERATED DEPTH ROUND: Ensure every team satisfies minimum roster quota (18 - 25 players)
  const remainingUnsold = [...auc.unsoldPlayerIds];
  const updatedUnsold: string[] = [];

  for (const unsoldId of remainingUnsold) {
    const player = playersCopy[unsoldId];
    if (!player) continue;

    const needyTeams = Object.values(teamsCopy)
      .filter(t => t.rosterPlayerIds.length < 21 && t.purseCr >= player.basePriceCr)
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
    const death = sorted.filter(p => p.attributes?.deathBowling && p.attributes.deathBowling > 75).map(p => p.id);
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

// -------------------------------------------------------------
// 13. SIMULATE CURRENT SET IN AUCTION
// -------------------------------------------------------------

export function simulateCurrentSetInAuction(
  auctionState: AuctionState,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>,
  userTeamId: string,
  userPriorityTargetIds?: string[]
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

    const battle = simulateAuctionBattle(player, teamsCopy, playersCopy, userTeamId, userMaxBid, userPriorityTargetIds);
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
          buyingTeamId: winningTeam.id,
          biddingHistory: battle.bidHistory
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

// -------------------------------------------------------------
// 14. TELEMETRY & DEBUG HELPER
// -------------------------------------------------------------

export function getAIDecisionTelemetry(decisionCtx: AIDecisionContext): string {
  return `
[AI DECISION TELEMETRY]
Franchise: ${decisionCtx.teamShortName} (${decisionCtx.teamId})
Target Player: ${decisionCtx.playerName} (ID: ${decisionCtx.playerId})
Base Market Valuation: ₹${decisionCtx.baseValuationCr.toFixed(2)} Cr
Squad Need Multiplier: ${decisionCtx.squadNeedMultiplier}x
Scarcity Multiplier: ${decisionCtx.scarcityMultiplier}x
Effective Ceiling: ₹${decisionCtx.effectiveCeilingCr.toFixed(2)} Cr
Current Lot Bid: ₹${decisionCtx.currentBidCr.toFixed(2)} Cr -> Next Required Bid: ₹${decisionCtx.nextBidAmountCr.toFixed(2)} Cr
Decision: ${decisionCtx.decision} (Willingness: ${decisionCtx.willingnessScore.toFixed(1)}, Confidence: ${decisionCtx.confidencePercent}%)
Reasoning: ${decisionCtx.reasoning}
${decisionCtx.isBluffOrPressure ? '>> STRATEGIC PRESSURE BLUFF ACTIVE <<' : ''}
`.trim();
}
