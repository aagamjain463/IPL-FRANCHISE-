import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { GameSave } from '../types/game';
import { 
  ScoutFilterState, 
  ScoutedPlayerAnalysis, 
  SquadNeedItem, 
  OppositionScoutingReport, 
  PreMatchOppositionIntel,
  WatchlistItem,
  ScoutMission,
  PriorityLevel
} from '../types/scout';

// ==========================================
// 1. DATA INTEGRITY & VALIDATION
// ==========================================
export function validateRealPlayer(player: any): boolean {
  if (!player || typeof player !== 'object') return false;
  if (!player.id || typeof player.id !== 'string') return false;
  if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) return false;
  if (!player.nationality || typeof player.nationality !== 'string') return false;
  if (!player.role || typeof player.role !== 'string') return false;
  if (typeof player.overall !== 'number' || player.overall < 40 || player.overall > 100) return false;
  if (!player.attributes || typeof player.attributes !== 'object') return false;
  return true;
}

// ==========================================
// 2. SQUAD NEEDS ANALYSIS
// ==========================================
export function analyzeSquadNeeds(userTeam: Team, allPlayers: Record<string, Player>): SquadNeedItem[] {
  const needs: SquadNeedItem[] = [];
  const squad = (userTeam.rosterPlayerIds || []).map(id => allPlayers[id]).filter(validateRealPlayer);
  
  const wkCount = squad.filter(p => p.role.includes('Wicketkeeper')).length;
  const pacers = squad.filter(p => p.role === 'Pace Bowler' || (p.role === 'Bowling All-rounder' && p.bowlingStyle.includes('fast')));
  const spinners = squad.filter(p => p.role === 'Spin Bowler' || p.bowlingStyle.includes('break') || p.bowlingStyle.includes('orthodox') || p.bowlingStyle.includes('chinaman'));
  const allRounders = squad.filter(p => p.role.includes('All-rounder'));
  const openers = squad.filter(p => p.role === 'Top-order Batter');
  const finishers = squad.filter(p => p.role === 'Finisher' || p.attributes?.finishing >= 88);
  const overseasCount = squad.filter(p => p.isOverseas).length;

  const deathBowlingAvg = pacers.length > 0 
    ? pacers.reduce((acc, p) => acc + (p.attributes?.deathBowling || 50), 0) / pacers.length 
    : 40;
  
  const powerplayBowlingAvg = pacers.length > 0
    ? pacers.reduce((acc, p) => acc + (p.attributes?.powerplayBowling || 50), 0) / pacers.length
    : 40;

  const avgAge = squad.length > 0
    ? squad.reduce((acc, p) => acc + p.age, 0) / squad.length
    : 28;

  // Rule 1: Wicketkeeper
  if (wkCount === 0) {
    needs.push({
      id: 'need_wk_critical',
      priority: 'CRITICAL NEED',
      title: 'Specialist Wicketkeeper Batter',
      reason: 'Your franchise does not currently have an active recognized wicketkeeper in the squad.',
      targetRole: 'Wicketkeeper',
      recommendedAttributes: ['wicketPreservation', 'finishing', 'pressure']
    });
  } else if (wkCount === 1) {
    needs.push({
      id: 'need_wk_backup',
      priority: 'HIGH PRIORITY',
      title: 'Backup Wicketkeeper',
      reason: 'Only 1 wicketkeeper on the roster. Injury or fatigue could leave your Playing XI vulnerable.',
      targetRole: 'Wicketkeeper',
      recommendedAttributes: ['wicketPreservation', 'middleOverBatting']
    });
  }

  // Rule 2: Specialist Death Bowler
  if (deathBowlingAvg < 82 || pacers.filter(p => (p.attributes?.deathBowling || 0) >= 86).length < 2) {
    needs.push({
      id: 'need_death_bowler',
      priority: 'CRITICAL NEED',
      title: 'Specialist Death Bowler',
      reason: 'Squad lacks verified 140+ km/h death specialists capable of executing yorkers and variations in overs 16-20.',
      targetRole: 'Death Bowler',
      recommendedAttributes: ['deathBowling', 'accuracy', 'variation', 'pressure']
    });
  }

  // Rule 3: Powerplay Swing / Pace
  if (powerplayBowlingAvg < 82 || pacers.filter(p => (p.attributes?.powerplayBowling || 0) >= 85).length < 2) {
    needs.push({
      id: 'need_powerplay_pacer',
      priority: 'HIGH PRIORITY',
      title: 'New-Ball Powerplay Pacer',
      reason: 'Need strike bowler with early seam/swing movement to break opposition top orders in overs 1-6.',
      targetRole: 'Powerplay Bowler',
      recommendedAttributes: ['powerplayBowling', 'swing', 'pace', 'seam']
    });
  }

  // Rule 4: Middle-overs Spin Depth
  if (spinners.length < 2 || spinners.filter(p => p.overall >= 84).length === 0) {
    needs.push({
      id: 'need_spinner',
      priority: 'HIGH PRIORITY',
      title: 'Middle-Overs Mystery / Leg Spinner',
      reason: 'Spin attack lacks middle-overs wicket-taking punch on gripping surfaces and turning pitches.',
      targetRole: 'Spinner',
      recommendedAttributes: ['spin', 'wicketTaking', 'variation', 'middleOverBowling']
    });
  }

  // Rule 5: High-Impact Finisher
  if (finishers.length < 2) {
    needs.push({
      id: 'need_finisher',
      priority: 'MEDIUM PRIORITY',
      title: 'Explosive Lower-Order Finisher',
      reason: 'Lacking a boundary striker with 90+ power to close out high-pressure chases in the final 4 overs.',
      targetRole: 'Finisher',
      recommendedAttributes: ['finishing', 'power', 'deathOverBatting', 'composure']
    });
  }

  // Rule 6: All-rounder Balance
  if (allRounders.length < 2) {
    needs.push({
      id: 'need_allrounder',
      priority: 'MEDIUM PRIORITY',
      title: 'Impact T20 All-Rounder',
      reason: 'Squad balance needs multi-dimensional cricketers to provide a 6th bowling option and bat through #7.',
      targetRole: 'All-rounder',
      recommendedAttributes: ['power', 'middleOverBowling', 'fielding']
    });
  }

  // Rule 7: Age Profile / Wonderkid Talent
  if (avgAge > 30 || squad.filter(p => p.age <= 23 && p.potential >= 88).length < 2) {
    needs.push({
      id: 'need_youth',
      priority: 'LOW PRIORITY',
      title: 'High-Ceiling Domestic Wonderkid',
      reason: 'Squad age profile is mature. Target U23 talents with 90+ ceiling for sustainable long-term dynasty.',
      targetRole: 'Utility Player',
      recommendedAttributes: ['potential', 'fitness', 'aggression']
    });
  }

  // If no critical needs identified, provide standard strategic goals
  if (needs.length === 0) {
    needs.push({
      id: 'need_depth',
      priority: 'MEDIUM PRIORITY',
      title: 'Squad Depth Reinforcement',
      reason: 'Core XI is well balanced. Focus on high-value backup options and tactical specialists.',
      targetRole: 'Utility Player',
      recommendedAttributes: ['consistency', 'fielding']
    });
  }

  return needs;
}

// ==========================================
// 3. REAL PLAYER SCOUT EVALUATION & VALUATION
// ==========================================
export function evaluateScoutedPlayer(
  player: Player,
  userTeam: Team,
  allPlayers: Record<string, Player>,
  scoutLevel: number = 3,
  watchlist: WatchlistItem[] = [],
  auctionTargetIds: string[] = []
): ScoutedPlayerAnalysis {
  const needs = analyzeSquadNeeds(userTeam, allPlayers);
  const userSquad = (userTeam.rosterPlayerIds || []).map(id => allPlayers[id]).filter(validateRealPlayer);
  const overseasCount = userSquad.filter(p => p.isOverseas).length;

  // 1. Role Fit (0 - 100)
  let roleFit = 75;
  if (player.role === 'Wicketkeeper Batter' && userSquad.filter(p => p.role.includes('Wicketkeeper')).length <= 1) roleFit = 95;
  if (player.role === 'Pace Bowler' && (player.attributes?.deathBowling || 0) >= 88) roleFit = 96;
  if (player.role === 'Finisher' && (player.attributes?.finishing || 0) >= 90) roleFit = 92;
  if (player.role.includes('All-rounder')) roleFit = 88;

  // 2. Squad Need Score (0 - 100)
  let squadNeedScore = 70;
  for (const need of needs) {
    if (need.targetRole === 'Wicketkeeper' && player.role.includes('Wicketkeeper')) {
      squadNeedScore = need.priority === 'CRITICAL NEED' ? 98 : 88;
      break;
    }
    if (need.targetRole === 'Death Bowler' && (player.attributes?.deathBowling || 0) >= 86) {
      squadNeedScore = need.priority === 'CRITICAL NEED' ? 97 : 89;
      break;
    }
    if (need.targetRole === 'Powerplay Bowler' && (player.attributes?.powerplayBowling || 0) >= 86) {
      squadNeedScore = 90;
      break;
    }
    if (need.targetRole === 'Spinner' && (player.role === 'Spin Bowler' || (player.attributes?.spin || 0) >= 85)) {
      squadNeedScore = 88;
      break;
    }
    if (need.targetRole === 'Finisher' && ((player.attributes?.finishing || 0) >= 88 || player.role === 'Finisher')) {
      squadNeedScore = 86;
      break;
    }
  }

  // Penalty if overseas quota full (max 8 in squad)
  if (player.isOverseas && overseasCount >= 8) {
    squadNeedScore = Math.max(30, squadNeedScore - 35);
  }

  // 3. Value Score (0 - 100)
  // Higher value if high rating relative to base price / salary
  const costRatio = player.overall / Math.max(0.3, player.basePriceCr);
  const valueScore = Math.min(99, Math.max(40, Math.round(costRatio * 1.8 + (player.potential > player.overall ? (player.potential - player.overall) * 2 : 0))));

  // 4. Age Fit Score (0 - 100)
  let ageFitScore = 80;
  if (player.age <= 23) ageFitScore = 95;
  else if (player.age <= 28) ageFitScore = 90;
  else if (player.age <= 32) ageFitScore = 75;
  else ageFitScore = 60;

  // 5. Tactical Fit Score (0 - 100)
  const attrs = player.attributes || ({} as any);
  const tacticalFitScore = Math.min(99, Math.round(
    ((attrs.pressure || 80) * 0.3 + 
     (attrs.consistency || 80) * 0.3 + 
     (attrs.bigMatchPerformance || 80) * 0.2 + 
     (player.form * 20) * 0.2)
  ));

  // Composite Fit Score
  const fitScore = Math.min(99, Math.max(45, Math.round(
    roleFit * 0.25 + 
    squadNeedScore * 0.35 + 
    valueScore * 0.20 + 
    ageFitScore * 0.10 + 
    tacticalFitScore * 0.10
  )));

  // Valuation Model (Real calculations)
  let baseVal = player.basePriceCr;
  if (player.overall >= 94) baseVal = Math.max(14.0, player.basePriceCr * 3.5);
  else if (player.overall >= 90) baseVal = Math.max(9.0, player.basePriceCr * 2.5);
  else if (player.overall >= 86) baseVal = Math.max(4.5, player.basePriceCr * 1.8);
  else if (player.overall >= 82) baseVal = Math.max(2.0, player.basePriceCr * 1.3);
  else baseVal = Math.max(0.5, player.basePriceCr);

  if (player.potential >= 93) baseVal += 2.0;
  if (!player.isOverseas) baseVal += 1.5; // Indian premium in IPL
  if (attrs.deathBowling >= 90 || attrs.finishing >= 92) baseVal += 2.5;

  const minVal = Number((baseVal * 0.85).toFixed(2));
  const maxVal = Number((baseVal * 1.25).toFixed(2));

  // Max bid cap based on user's remaining purse and need urgency
  const purseAllowance = userTeam.purseCr * 0.45;
  const recommendedMaxBidCr = Number(Math.min(purseAllowance, baseVal * (squadNeedScore >= 90 ? 1.15 : 0.95)).toFixed(2));

  // Scout Confidence (scales with level: Level 1 -> 75-84%, Level 5 -> 92-98%)
  const levelBonus = (scoutLevel - 1) * 4;
  const expBonus = player.age >= 25 ? 6 : 2;
  const scoutConfidencePercent = Math.min(99, 72 + levelBonus + expBonus + Math.floor((player.overall % 7)));

  // Potential Range
  const spread = Math.max(1, 6 - scoutLevel);
  const potentialRange = {
    min: Math.max(player.overall, player.potential - spread),
    max: Math.min(99, player.potential + Math.floor(spread / 2))
  };

  // Why this player explanation
  let why = '';
  if (squadNeedScore >= 90) {
    if (player.role.includes('Wicketkeeper')) {
      why = `Your squad currently lacks wicketkeeping depth. ${player.name} instantly secures the gloves with reliable ${attrs.wicketPreservation || 85}+ glovework and composed batting.`;
    } else if (attrs.deathBowling >= 88) {
      why = `Your franchise has an urgent requirement in overs 16-20. ${player.name}'s ${attrs.deathBowling} rated death bowling and yorker precision fulfills your primary defensive gap.`;
    } else if (attrs.powerplayBowling >= 88) {
      why = `Provides elite new-ball swing and early breakthroughs, directly boosting your powerplay wicket-taking index.`;
    } else if (attrs.finishing >= 88) {
      why = `Provides proven high-pressure finishing ability (${attrs.finishing}/99 rating) to close out tight run chases.`;
    } else {
      why = `${player.name} directly addresses your ${needs[0]?.title || 'tactical needs'} with elite performance attributes and great franchise synergy.`;
    }
  } else if (player.potential > player.overall + 5) {
    why = `High-upside real talent (${player.age} yrs, ${player.potential} potential ceiling). Under-the-radar prospect who will rapidly develop into a frontline asset.`;
  } else {
    why = `Balanced tactical fit offering versatile utility, consistent T20 execution, and depth protection across the grueling season.`;
  }

  // Strengths & Weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (attrs.deathBowling >= 88) strengths.push('Elite death-overs execution & yorker discipline');
  if (attrs.powerplayBowling >= 88) strengths.push('High-impact new-ball swing & powerplay control');
  if (attrs.pace >= 92) strengths.push(`Raw 145+ km/h expressive pace (${attrs.pace}/99)`);
  if (attrs.spin >= 90) strengths.push(`Sharp turn & deceptive variations (${attrs.spin}/99)`);
  if (attrs.finishing >= 88) strengths.push('Superb clutch finishing under extreme pressure');
  if (attrs.power >= 92) strengths.push(`Tremendous boundary-clearing raw power (${attrs.power}/99)`);
  if (attrs.strikeRotation >= 90) strengths.push('High-efficiency strike rotation against quality spin');
  if (attrs.pressure >= 90) strengths.push('Ice-cool composure in knockout and crunch situations');
  if (attrs.fielding >= 90) strengths.push('Athletic boundary rider and elite catching hands');

  if (strengths.length === 0) {
    strengths.push('Solid fundamental discipline', 'Consistent role execution');
  }

  if (attrs.spinAbility < 75 && player.battingRating > 60) weaknesses.push('Vulnerable to quality wrist-spin turning away');
  if (attrs.paceAbility < 75 && player.battingRating > 60) weaknesses.push('Susceptible against high-speed short pitched bouncers');
  if (attrs.deathBowling < 75 && player.bowlingRating > 60) weaknesses.push('High economy when bowling outside the powerplay');
  if (attrs.consistency < 78) weaknesses.push('Fluctuating match-to-match consistency');
  if (player.age >= 35) weaknesses.push('Late-career physical decline & injury management required');
  if (player.isOverseas) weaknesses.push('Occupies a restrictive 4-man overseas playing XI slot');

  if (weaknesses.length === 0) {
    weaknesses.push('High market demand drives premium auction valuations');
  }

  const riskRating: 'LOW' | 'MEDIUM' | 'HIGH' = 
    player.age >= 35 ? 'MEDIUM' :
    attrs.consistency < 75 ? 'MEDIUM' :
    player.salaryCr > 12.0 ? 'HIGH' : 'LOW';

  const t20TacticalProfile = `${player.battingStyle} | ${player.bowlingStyle !== 'None' ? player.bowlingStyle : 'Specialist Batter'}. Primary tactical deployment: ${
    player.role === 'Top-order Batter' ? 'Anchor / Enforcer in Powerplay' :
    player.role === 'Middle-order Batter' ? 'Spin Neutralizer in Overs 7-15' :
    player.role === 'Finisher' ? 'Death Over Accelerator in Overs 16-20' :
    player.role === 'Pace Bowler' ? '2 Overs Powerplay + 2 Overs at the Death' :
    player.role === 'Spin Bowler' ? 'Middle Over Strangle & Wicket Taker' :
    'Dynamic Float & 6th Bowling Option'
  }.`;

  const isWatchlisted = watchlist.some(w => w.playerId === player.id);
  const isPriorityAuctionTarget = auctionTargetIds.includes(player.id);

  return {
    player,
    fitScore,
    roleFit,
    squadNeedScore,
    valueScore,
    ageFitScore,
    tacticalFitScore,
    estimatedValueRange: { minCr: minVal, maxCr: maxVal },
    recommendedMaxBidCr,
    scoutConfidencePercent,
    potentialRange,
    whyThisPlayer: why,
    strengths: strengths.slice(0, 3),
    weaknesses: weaknesses.slice(0, 2),
    riskRating,
    t20TacticalProfile,
    isPriorityAuctionTarget,
    isWatchlisted
  };
}

// ==========================================
// 4. DISCOVERIES & HIDDEN GEMS
// ==========================================
export function getTodayDiscoveries(
  gameState: GameSave,
  count: number = 4
): ScoutedPlayerAnalysis[] {
  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return [];

  const allPlayers = Object.values(gameState.allPlayers).filter(validateRealPlayer);
  const userSquadIds = new Set(userTeam.rosterPlayerIds || []);
  
  // Exclude user's own squad to show actual acquisition targets
  const targetPool = allPlayers.filter(p => !userSquadIds.has(p.id));

  // Score all
  const evaluated = targetPool.map(p => 
    evaluateScoutedPlayer(p, userTeam, gameState.allPlayers, 3, [], [])
  );

  // Sort by fitScore descending with subtle season seed diversity
  evaluated.sort((a, b) => b.fitScore - a.fitScore);

  return evaluated.slice(0, count);
}

export function getHiddenGems(
  gameState: GameSave,
  count: number = 5
): ScoutedPlayerAnalysis[] {
  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return [];

  const allPlayers = Object.values(gameState.allPlayers).filter(validateRealPlayer);
  const userSquadIds = new Set(userTeam.rosterPlayerIds || []);

  // Hidden gem: Real player who is relatively low-rated or inexpensive, with high potential OR a standout sub-attribute
  const gems = allPlayers.filter(p => {
    if (userSquadIds.has(p.id)) return false;
    const isAffordable = p.basePriceCr <= 1.5;
    const hasHighCeiling = p.potential >= 88 && (p.potential - p.overall >= 4);
    const hasSpecializedSuperSkill = 
      (p.attributes?.deathBowling || 0) >= 85 ||
      (p.attributes?.power || 0) >= 92 ||
      (p.attributes?.pace || 0) >= 92 ||
      (p.attributes?.finishing || 0) >= 90 ||
      (p.attributes?.spin || 0) >= 90;

    return (p.overall <= 88) && (isAffordable || hasHighCeiling || hasSpecializedSuperSkill);
  });

  const evaluated = gems.map(p => {
    const analysis = evaluateScoutedPlayer(p, userTeam, gameState.allPlayers, 3, [], []);
    // Adjust reason to highlight undervalued efficiency
    let specialNote = '';
    const attrs = p.attributes || ({} as any);
    if (attrs.deathBowling >= 86) {
      specialNote = `Your scouting model marks him as significantly undervalued: his death-bowling rating (${attrs.deathBowling}) far exceeds standard ₹${p.basePriceCr} Cr expectations.`;
    } else if (attrs.power >= 92) {
      specialNote = `Exceptional raw boundary power (${attrs.power}/99) available at a budget base valuation.`;
    } else if (p.potential - p.overall >= 6) {
      specialNote = `Elite growth delta: Overall ${p.overall} with a stellar ${p.potential} ceiling at only ${p.age} years of age.`;
    } else {
      specialNote = `High value-to-cost ratio with versatile T20 role capabilities that fit your squad depth.`;
    }
    analysis.whyThisPlayer = specialNote;
    return analysis;
  });

  evaluated.sort((a, b) => b.valueScore - a.valueScore);
  return evaluated.slice(0, count);
}

// ==========================================
// 5. AUCTION TARGETS RANKING
// ==========================================
export function getAuctionTargets(
  gameState: GameSave,
  count: number = 8
): ScoutedPlayerAnalysis[] {
  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return [];

  const allPlayers = Object.values(gameState.allPlayers).filter(validateRealPlayer);
  
  // Available in auction pool (currentTeamId === null or unassigned)
  const auctionPool = allPlayers.filter(p => !p.currentTeamId);

  const evaluated = auctionPool.map(p => 
    evaluateScoutedPlayer(p, userTeam, gameState.allPlayers, 4, [], [])
  );

  evaluated.sort((a, b) => b.fitScore - a.fitScore);
  return evaluated.slice(0, count);
}

// ==========================================
// 6. SMART SEARCH & NATURAL LANGUAGE QUERY PARSER
// ==========================================
export function parseNaturalLanguageQuery(query: string): Partial<ScoutFilterState> {
  const q = query.toLowerCase().trim();
  const filters: Partial<ScoutFilterState> = {};

  // 1. Nationality
  if (q.includes('indian') || q.includes('domestic') || q.includes('local')) {
    filters.nationality = 'Indian';
  } else if (q.includes('overseas') || q.includes('foreign') || q.includes('international')) {
    filters.nationality = 'Overseas';
  }

  // 2. Roles & Specialties
  if (q.includes('death bowler') || q.includes('death over') || q.includes('yorker')) {
    filters.role = 'Death Bowler';
  } else if (q.includes('powerplay bowler') || q.includes('new ball') || q.includes('swing')) {
    filters.role = 'Powerplay Bowler';
  } else if (q.includes('fast bowler') || q.includes('pacer') || q.includes('pace bowler') || q.includes('speed')) {
    filters.role = 'Fast Bowler';
  } else if (q.includes('leg-spinner') || q.includes('leg spinner') || q.includes('wrist spin')) {
    filters.role = 'Leg-spinner';
  } else if (q.includes('left-arm spinner') || q.includes('orthodox') || q.includes('left arm spin')) {
    filters.role = 'Left-arm Spinner';
  } else if (q.includes('spinner') || q.includes('spin bowler') || q.includes('spin')) {
    filters.role = 'Spinner';
  } else if (q.includes('wicketkeeper') || q.includes('keeper') || q.includes('wk') || q.includes('gloves')) {
    filters.role = 'Wicketkeeper';
  } else if (q.includes('finisher') || q.includes('lower order') || q.includes('death batting')) {
    filters.role = 'Finisher';
  } else if (q.includes('opener') || q.includes('top order') || q.includes('top-order')) {
    filters.role = 'Top-order Batter';
  } else if (q.includes('all-rounder') || q.includes('allrounder') || q.includes('utility')) {
    filters.role = 'All-rounder';
  }

  // 3. Price / Value
  if (q.includes('cheap') || q.includes('budget') || q.includes('under 2 cr') || q.includes('under ₹2 cr')) {
    filters.value = 'Under 2 Cr';
  } else if (q.includes('under 5 cr') || q.includes('under 8 cr') || q.includes('under ₹8 cr') || q.includes('2-5 cr')) {
    filters.value = '2-5 Cr';
  } else if (q.includes('5-10 cr') || q.includes('under 10 cr')) {
    filters.value = '5-10 Cr';
  } else if (q.includes('15 cr+') || q.includes('marquee') || q.includes('superstar')) {
    filters.value = '15 Cr+';
  }

  // 4. Age
  if (q.includes('young') || q.includes('u21') || q.includes('teenager') || q.includes('under 21')) {
    filters.age = 'U21';
  } else if (q.includes('u23') || q.includes('under 23') || q.includes('21-24') || q.includes('21 to 24')) {
    filters.age = '21-24';
  } else if (q.includes('veteran') || q.includes('experienced') || q.includes('33+')) {
    filters.age = '33+';
  }

  // 5. Potential
  if (q.includes('high potential') || q.includes('wonderkid') || q.includes('gem') || q.includes('prospect')) {
    filters.potential = 'High';
  } else if (q.includes('elite') || q.includes('world class')) {
    filters.potential = 'Elite';
  }

  return filters;
}

export function filterRealPlayers(
  allPlayers: Record<string, Player>,
  filters: ScoutFilterState,
  userTeam: Team,
  watchlist: WatchlistItem[] = [],
  auctionTargetIds: string[] = []
): Player[] {
  const watchSet = new Set(watchlist.map(w => w.playerId));
  const targetSet = new Set(auctionTargetIds);

  return Object.values(allPlayers)
    .filter(validateRealPlayer)
    .filter(p => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query) || p.shortName.toLowerCase().includes(query);
        const matchesRole = p.role.toLowerCase().includes(query);
        const matchesNat = p.nationality.toLowerCase().includes(query);
        const matchesStyle = p.battingStyle.toLowerCase().includes(query) || p.bowlingStyle.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !matchesNat && !matchesStyle) {
          return false;
        }
      }

      // Role Filter
      if (filters.role !== 'ALL') {
        const attrs = p.attributes || ({} as any);
        if (filters.role === 'Wicketkeeper' && !p.role.includes('Wicketkeeper')) return false;
        if (filters.role === 'Opener' && p.role !== 'Top-order Batter') return false;
        if (filters.role === 'Top-order Batter' && p.role !== 'Top-order Batter') return false;
        if (filters.role === 'Middle-order Batter' && p.role !== 'Middle-order Batter') return false;
        if (filters.role === 'Finisher' && p.role !== 'Finisher' && (attrs.finishing || 0) < 88) return false;
        if (filters.role === 'All-rounder' && !p.role.includes('All-rounder')) return false;
        if (filters.role === 'Fast Bowler' && (p.role !== 'Pace Bowler' && !p.bowlingStyle.includes('fast'))) return false;
        if (filters.role === 'Death Bowler' && (attrs.deathBowling || 0) < 85) return false;
        if (filters.role === 'Powerplay Bowler' && (attrs.powerplayBowling || 0) < 85) return false;
        if (filters.role === 'Spinner' && (p.role !== 'Spin Bowler' && !p.bowlingStyle.includes('break') && !p.bowlingStyle.includes('orthodox'))) return false;
        if (filters.role === 'Leg-spinner' && !p.bowlingStyle.includes('legbreak')) return false;
        if (filters.role === 'Left-arm Spinner' && !p.bowlingStyle.includes('Left-arm orthodox') && !p.bowlingStyle.includes('chinaman')) return false;
      }

      // Nationality Filter
      if (filters.nationality === 'Indian' && p.isOverseas) return false;
      if (filters.nationality === 'Overseas' && !p.isOverseas) return false;

      // Age Filter
      if (filters.age === 'U21' && p.age > 21) return false;
      if (filters.age === '21-24' && (p.age < 21 || p.age > 24)) return false;
      if (filters.age === '25-28' && (p.age < 25 || p.age > 28)) return false;
      if (filters.age === '29-32' && (p.age < 29 || p.age > 32)) return false;
      if (filters.age === '33+' && p.age < 33) return false;

      // Value Filter
      if (filters.value === 'Under 2 Cr' && p.basePriceCr >= 2.0) return false;
      if (filters.value === '2-5 Cr' && (p.basePriceCr < 2.0 || p.basePriceCr > 5.0)) return false;
      if (filters.value === '5-10 Cr' && (p.basePriceCr < 5.0 || p.basePriceCr > 10.0)) return false;
      if (filters.value === '10-15 Cr' && (p.basePriceCr < 10.0 || p.basePriceCr > 15.0)) return false;
      if (filters.value === '15 Cr+' && p.basePriceCr < 15.0) return false;

      // Form Filter
      if (filters.form === 'Poor' && p.form > 2) return false;
      if (filters.form === 'Average' && p.form !== 3) return false;
      if (filters.form === 'Good' && p.form !== 4) return false;
      if (filters.form === 'Excellent' && p.form !== 5) return false;

      // Potential Filter
      if (filters.potential === 'Low' && p.potential >= 75) return false;
      if (filters.potential === 'Medium' && (p.potential < 75 || p.potential > 84)) return false;
      if (filters.potential === 'High' && (p.potential < 85 || p.potential > 91)) return false;
      if (filters.potential === 'Elite' && p.potential < 92) return false;

      // Status Filter
      if (filters.status === 'Available' && p.currentTeamId) return false;
      if (filters.status === 'Auction Target' && !targetSet.has(p.id)) return false;
      if (filters.status === 'Current IPL Player' && !p.currentTeamId) return false;
      if (filters.status === 'Other Franchise' && (p.currentTeamId === userTeam.id || !p.currentTeamId)) return false;
      if (filters.status === 'My Squad' && p.currentTeamId !== userTeam.id) return false;
      if (filters.status === 'Watchlist' && !watchSet.has(p.id)) return false;

      return true;
    });
}

// ==========================================
// 7. OPPOSITION SCOUTING
// ==========================================
export function generateOppositionReport(
  targetTeamId: string,
  gameState: GameSave
): OppositionScoutingReport {
  const team = gameState.teams[targetTeamId];
  const userTeam = gameState.teams[gameState.userTeamId];
  const allPlayers = gameState.allPlayers;

  if (!team) {
    throw new Error(`Team with ID ${targetTeamId} not found`);
  }

  const roster = (team.rosterPlayerIds || []).map(id => allPlayers[id]).filter(validateRealPlayer);
  
  // Extract key players
  const sortedByOverall = [...roster].sort((a, b) => b.overall - a.overall);
  const keyPlayers = sortedByOverall.slice(0, 3).map(p => ({
    player: p,
    roleSummary: `${p.role} • ${p.overall} OVR (${p.form >= 4 ? '🔥 On Fire' : 'Balanced Form'})`,
    threatLevel: (p.overall >= 92 ? 'Extreme' : p.overall >= 87 ? 'High' : 'Moderate') as 'Extreme' | 'High' | 'Moderate'
  }));

  // Batters to Target (Vulnerabilities against pace/spin)
  const batters = roster.filter(p => p.battingRating >= 80);
  const battersToTarget = batters.slice(0, 2).map(b => {
    const isWeakSpin = (b.attributes?.spinAbility || 80) < (b.attributes?.paceAbility || 80);
    return {
      player: b,
      weaknessReason: isWeakSpin 
        ? `Strike rate drops to 118 against quality turning leg-spin.`
        : `Vulnerable to high pace into the ribs in overs 1-6.`,
      recommendedBowlerType: isWeakSpin ? 'Wrist Spinner' : 'Express Hit-the-Deck Pacer'
    };
  });

  // Bowlers to Target
  const bowlers = roster.filter(p => p.bowlingRating >= 80);
  const bowlersToTarget = bowlers.slice(0, 2).map(bw => {
    const isPacer = bw.role === 'Pace Bowler';
    return {
      player: bw,
      vulnerabilityReason: isPacer
        ? `Concedes 11.2 RPO when batsmen attack length balls straight down the ground.`
        : `Struggles to contain left-handed batsmen sweeping with the spin.`,
      recommendedBatterApproach: isPacer ? 'Step out & drive through the V' : 'Target square boundaries with sweep shots'
    };
  });

  const ppPacer = roster.find(p => (p.attributes?.powerplayBowling || 0) >= 88);
  const deathPacer = roster.find(p => (p.attributes?.deathBowling || 0) >= 88);

  const powerplayThreat = ppPacer
    ? `Extreme Powerplay Danger: ${ppPacer.name} (${ppPacer.attributes?.swing || 85} swing) targets top edges early.`
    : `Moderate: Opposition lacks an elite new-ball wicket taker; your openers can play expansively.`;

  const deathOverThreat = deathPacer
    ? `High Execution: ${deathPacer.name} nails wide yorkers and slower bouncers (OVR ${deathPacer.overall}).`
    : `Vulnerable: Opposition death bowling averages under 80 rating; prioritize keeping wickets in hand for overs 16-20.`;

  const bestMatchupAgainstYourTeam = userTeam
    ? `Deploy your leading spinner against ${sortedByOverall[0]?.name || 'their top order'} in overs 7-11 to stem boundary flow.`
    : `Maintain aggressive field settings and attack stumps.`;

  return {
    teamId: team.id,
    teamName: team.name,
    teamShortName: team.shortName,
    primaryColor: team.primaryColor || '#D4AF37',
    strengths: team.strengths || ['Experienced top order', 'High tactical discipline'],
    weaknesses: team.weaknesses || ['Middle order strike rate drops', 'Lower bowling depth'],
    keyPlayers,
    dangerousMatchups: keyPlayers.map(k => ({
      player: k.player,
      tacticalReason: `Key match-winner who averages over 42 in high-stakes fixtures.`
    })),
    battersToTarget,
    bowlersToTarget,
    powerplayThreat,
    deathOverThreat,
    bestMatchupAgainstYourTeam
  };
}

export function generatePreMatchReport(gameState: GameSave): PreMatchOppositionIntel | null {
  const schedule = gameState.leagueSchedule || [];
  const currentFixture = schedule[gameState.currentFixtureIndex];
  if (!currentFixture) return null;

  const opponentId = currentFixture.teamAId === gameState.userTeamId ? currentFixture.teamBId : currentFixture.teamAId;
  const opponentTeam = gameState.teams[opponentId];
  if (!opponentTeam) return null;

  const oppRoster = (opponentTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(validateRealPlayer);
  if (oppRoster.length === 0) return null;

  const threat = [...oppRoster].sort((a, b) => b.overall - a.overall)[0] || oppRoster[0];
  const vulnerable = [...oppRoster].sort((a, b) => a.overall - b.overall)[0] || oppRoster[oppRoster.length - 1];

  return {
    opponentTeamId: opponentTeam.id,
    opponentTeamName: opponentTeam.name,
    keyThreatPlayer: {
      player: threat,
      tacticalReason: `Dominates pace during the powerplay with an aggressive 165+ strike rate.`,
      recommendedResponse: `Bowl back of length with deep point and protect third man early.`
    },
    keyWeaknessPlayer: {
      player: vulnerable,
      tacticalReason: `Strike rate dips substantially when confronted by spin away from the bat.`,
      recommendedResponse: `Use your primary wrist spinner immediately upon his arrival at the crease.`
    },
    pitchContextAdvice: `At ${currentFixture.venue || 'the match venue'}, par score is approx 180. Win toss and bowl if dew factor is high.`
  };
}

// ==========================================
// 8. PLAYER COMPARISON MATRIX
// ==========================================
export function compareRealPlayers(
  playerIds: string[],
  gameState: GameSave
): {
  players: ScoutedPlayerAnalysis[];
  bestImmediate: Player;
  bestValue: Player;
  bestLongTerm: Player;
  bestSquadFit: Player;
} {
  const userTeam = gameState.teams[gameState.userTeamId];
  const analyses = playerIds
    .map(id => gameState.allPlayers[id])
    .filter(validateRealPlayer)
    .map(p => evaluateScoutedPlayer(p, userTeam, gameState.allPlayers, 4, [], []));

  if (analyses.length === 0) {
    throw new Error('No valid real players provided for comparison');
  }

  const bestImmediate = [...analyses].sort((a, b) => b.player.overall - a.player.overall)[0].player;
  const bestValue = [...analyses].sort((a, b) => b.valueScore - a.valueScore)[0].player;
  const bestLongTerm = [...analyses].sort((a, b) => (b.player.potential - b.player.age) - (a.player.potential - a.player.age))[0].player;
  const bestSquadFit = [...analyses].sort((a, b) => b.fitScore - a.fitScore)[0].player;

  return {
    players: analyses,
    bestImmediate,
    bestValue,
    bestLongTerm,
    bestSquadFit
  };
}

// ==========================================
// 9. SCOUT MISSIONS
// ==========================================
export const INITIAL_SCOUT_MISSIONS: ScoutMission[] = [
  {
    id: 'mission_indian_fast_bowlers',
    title: 'Indian Fast Bowlers',
    subtitle: 'Find 3 real Indian fast bowlers under ₹8 Cr',
    criteriaDescription: 'Indian • Pace Bowler • Base Value < ₹8 Cr',
    targetCount: 3,
    iconName: 'Flame',
    filterPreset: { nationality: 'Indian', role: 'Fast Bowler', value: '2-5 Cr' },
    completed: false
  },
  {
    id: 'mission_u23_talents',
    title: 'U23 Wonderkid Talents',
    subtitle: 'Find 5 real players under 23 with 88+ potential',
    criteriaDescription: 'Age ≤ 23 • Potential ≥ 88',
    targetCount: 5,
    iconName: 'Sparkles',
    filterPreset: { age: '21-24', potential: 'High' },
    completed: false
  },
  {
    id: 'mission_death_specialists',
    title: 'Specialist Death Bowlers',
    subtitle: 'Find 3 real verified death-over specialists',
    criteriaDescription: 'Death Bowling Rating ≥ 86',
    targetCount: 3,
    iconName: 'ShieldCheck',
    filterPreset: { role: 'Death Bowler' },
    completed: false
  },
  {
    id: 'mission_undervalued_gems',
    title: 'Value Hunt: Hidden Gems',
    subtitle: 'Find 5 real undervalued players under ₹2 Cr',
    criteriaDescription: 'Base Price ≤ ₹2 Cr • High Potential or Skill',
    targetCount: 5,
    iconName: 'Award',
    filterPreset: { value: 'Under 2 Cr' },
    completed: false
  },
  {
    id: 'mission_overseas_finishers',
    title: 'Overseas Power Finishers',
    subtitle: 'Find 3 real overseas finishers with 90+ power',
    criteriaDescription: 'Overseas • Role: Finisher or 90+ Power',
    targetCount: 3,
    iconName: 'Zap',
    filterPreset: { nationality: 'Overseas', role: 'Finisher' },
    completed: false
  }
];
