import { 
  Player, 
  MatchState, 
  InningsState, 
  BallByBallEvent, 
  BallEventType, 
  DismissalType, 
  ShotZone,
  TacticalInstructions,
  MatchPlayingXI,
  MatchHighlight,
  PitchCondition
} from '../types/cricket';
import { getDeterministicCommentary } from '../data/commentaryTemplates';
import { computeTeamChemistry, getChemistryMultiplier } from './chemistryEngine';

const SHOT_ZONES: ShotZone[] = [
  'Fine Leg', 'Square Leg', 'Mid Wicket', 'Long On', 'Straight',
  'Long Off', 'Extra Cover', 'Cover', 'Point', 'Third Man'
];

export const PITCH_PROFILES: Record<string, Omit<PitchCondition, 'type'>> = {
  'Balanced': { bounce: 65, turn: 55, paceAssistance: 60, dewFactor: 40, parScore: 170 },
  'Flat (High Scoring)': { bounce: 70, turn: 30, paceAssistance: 70, dewFactor: 50, parScore: 182 },
  'Green (Pace & Swing)': { bounce: 80, turn: 35, paceAssistance: 85, dewFactor: 30, parScore: 158 },
  'Dusty (Spin & Turn)': { bounce: 55, turn: 85, paceAssistance: 40, dewFactor: 35, parScore: 162 },
  'Slow & Sticky (Gripping)': { bounce: 45, turn: 70, paceAssistance: 30, dewFactor: 60, parScore: 160 }
};

/** Map a surface pick (home pitch or fixture) to a full PitchCondition. */
export function buildPitchCondition(type?: string): PitchCondition {
  const safeType = (type && PITCH_PROFILES[type]) ? type : 'Balanced';
  return { type: safeType as PitchCondition['type'], ...PITCH_PROFILES[safeType] };
}

/** Current teamA win probability estimate used by engine + UI (smooth, non-random). */
export function estimateWinProbability(match: MatchState): number {
  if (match.isMatchCompleted) return match.winnerTeamId === match.teamAId ? 100 : 0;
  const inn = match.currentInningsIndex === 1 ? match.innings1 : match.innings2;
  const isChasing = match.currentInningsIndex === 2;
  const target = inn.target || 0;
  const runsNeeded = Math.max(0, target - inn.totalRuns);
  const ballsRemaining = Math.max(0, (20 - inn.oversCompleted) * 6 - inn.ballsInCurrentOver);
  const wickets = inn.wickets;

  if (!isChasing) {
    // 1st innings: parity at ~170/8, scale with score & wickets lost (rough but smooth)
    const raw = 50 + (inn.totalRuns - 170) * 0.35 - (inn.wickets - 4) * 4;
    // account for the chasing team's batting strength later — keep neutral here
    return Math.min(78, Math.max(22, Math.round(raw)));
  }

  // 2nd innings chasing: implied rate edge + wickets in hand
  const reqRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 99;
  const parity = 170; // modern T20 par on the match's pitch
  const t1Score = match.innings1.totalRuns;
  const firstInningsEdge = (t1Score - parity) * 0.15; // bigger 1st innings = chasing harder
  const rateEdge = (8.6 - reqRate) * 1.6;
  const wicketEdge = (9 - wickets) * 2.2;
  const raw = 50 + rateEdge * 0.5 + wicketEdge + firstInningsEdge;
  const isTeamABatting = inn.battingTeamId === match.teamAId;
  const chasingProb = Math.min(95, Math.max(5, Math.round(raw)));
  return isTeamABatting ? chasingProb : 100 - chasingProb;
}

export function createEmptyInnings(battingTeamId: string, bowlingTeamId: string, target?: number): InningsState {
  return {
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    wickets: 0,
    oversCompleted: 0,
    ballsInCurrentOver: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    currentStrikerId: '',
    currentNonStrikerId: '',
    currentBowlerId: '',
    batterScorecards: {},
    bowlerScorecards: {},
    fow: [],
    recentBalls: [],
    timeline: [],
    isCompleted: false,
    target
  };
}

export function initMatchState(
  id: string,
  season: number,
  teamAId: string,
  teamBId: string,
  venue: string,
  city: string,
  teamAXI: MatchPlayingXI,
  teamBXI: MatchPlayingXI,
  allPlayers: Record<string, Player>,
  matchType: MatchState['matchType'] = 'League',
  customPitchType?: string
): MatchState {
  // Toss
  const tossWinnerId = Math.random() > 0.5 ? teamAId : teamBId;
  const tossDecision: 'Bat' | 'Bowl' = Math.random() > 0.4 ? 'Bowl' : 'Bat';

  let firstBattingTeamId = teamAId;
  let firstBowlingTeamId = teamBId;

  if (tossWinnerId === teamAId) {
    firstBattingTeamId = tossDecision === 'Bat' ? teamAId : teamBId;
    firstBowlingTeamId = tossDecision === 'Bat' ? teamBId : teamAId;
  } else {
    firstBattingTeamId = tossDecision === 'Bat' ? teamBId : teamAId;
    firstBowlingTeamId = tossDecision === 'Bat' ? teamAId : teamBId;
  }

  // Squad chemistry (kept in match snapshot so sim is deterministic per match)
  const aSquad = (teamAXI.playingXIIds || []).map(id => allPlayers[id]).filter(Boolean);
  const bSquad = (teamBXI.playingXIIds || []).map(id => allPlayers[id]).filter(Boolean);
  const aChem = computeTeamChemistry(aSquad).score;
  const bChem = computeTeamChemistry(bSquad).score;

  const innings1 = createEmptyInnings(firstBattingTeamId, firstBowlingTeamId);
  const innings2 = createEmptyInnings(firstBowlingTeamId, firstBattingTeamId);

  const battingXI = firstBattingTeamId === teamAId ? teamAXI : teamBXI;
  const bowlingXI = firstBowlingTeamId === teamAId ? teamAXI : teamBXI;

  // Openers
  innings1.currentStrikerId = battingXI.battingOrder[0] || battingXI.playingXIIds[0];
  innings1.currentNonStrikerId = battingXI.battingOrder[1] || battingXI.playingXIIds[1];
  innings1.currentBowlerId = bowlingXI.powerplayBowlerIds[0] || bowlingXI.playingXIIds[10];

  // Initialize scorecards
  [innings1.currentStrikerId, innings1.currentNonStrikerId].forEach((pId, idx) => {
    const p = allPlayers[pId];
    if (p) {
      innings1.batterScorecards[pId] = {
        playerId: pId,
        playerName: p.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
        isOut: false,
        dismissalText: 'not out',
        battingPosition: idx + 1
      };
    }
  });

  const bP = allPlayers[innings1.currentBowlerId];
  if (bP) {
    innings1.bowlerScorecards[innings1.currentBowlerId] = {
      playerId: innings1.currentBowlerId,
      playerName: bP.name,
      overs: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      wides: 0,
      noBalls: 0
    };
  }

  const defaultTactics: TacticalInstructions = {
    batterApproach: 'Balanced',
    bowlingPlan: 'Attack Stumps',
    fieldSetting: 'Balanced',
    protectWicket: false
  };

  return {
    id,
    season,
    matchType,
    teamAId,
    teamBId,
    venue,
    city,
    pitch: buildPitchCondition((customPitchType as string) || undefined),
    weather: 'Clear Night',
    tossWinnerId,
    tossDecision,
    teamAXI,
    teamBXI,
    innings1,
    innings2,
    currentInningsIndex: 1,
    isMatchCompleted: false,
    tactics: {
      teamATactics: { ...defaultTactics },
      teamBTactics: { ...defaultTactics }
    },
    matchSeed: `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
    probHistory: [],
    highlights: [],
    teamAChemistry: aChem,
    teamBChemistry: bChem,
    momentum: 50
  };
}

/** Total overs bowled (as a float) in an innings for NRR purposes. */
export function getInningsOvers(innings: InningsState): number {
  let overs = innings.oversCompleted + innings.ballsInCurrentOver / 6;
  // A side bowled out is charged the full quota for NRR purposes
  if (innings.wickets >= 10) overs = 20;
  return Math.min(20, Number(overs.toFixed(2)));
}

export function selectNextBowler(
  innings: InningsState,
  bowlingXI: MatchPlayingXI,
  allPlayers: Record<string, Player>,
  overNumber: number
): string {
  const isPowerplay = overNumber < 6;
  const isDeath = overNumber >= 15;
  const lastBowlerId = innings.currentBowlerId;

  const isFit = (p?: Player) => !p || p.injuryStatus === 'Fit' || p.injuryStatus === undefined;
  const validBowlers = bowlingXI.playingXIIds.filter(id => {
    if (id === lastBowlerId) return false;
    const card = innings.bowlerScorecards[id];
    if (card && card.overs >= 4.0) return false; // Max 4 overs in T20
    const p = allPlayers[id];
    return p && p.bowlingRating > 40 && isFit(p);
  });

  if (validBowlers.length === 0) {
    const fallback = bowlingXI.playingXIIds.filter(id => id !== lastBowlerId && (innings.bowlerScorecards[id]?.overs || 0) < 4.0 && isFit(allPlayers[id]));
    return fallback[0] || bowlingXI.playingXIIds[0];
  }

  if (isPowerplay && bowlingXI.powerplayBowlerIds.length > 0) {
    const ppCandidate = bowlingXI.powerplayBowlerIds.find(id => validBowlers.includes(id));
    if (ppCandidate) return ppCandidate;
  }

  if (isDeath && bowlingXI.deathBowlerIds.length > 0) {
    const deathCandidate = bowlingXI.deathBowlerIds.find(id => validBowlers.includes(id));
    if (deathCandidate) return deathCandidate;
  }

  // Sort by rating & economy
  validBowlers.sort((a, b) => {
    const pA = allPlayers[a];
    const pB = allPlayers[b];
    return (pB?.bowlingRating || 0) - (pA?.bowlingRating || 0);
  });

  return validBowlers[0];
}

/**
 * IPL Impact Player substitution: one player per team, once per match.
 * Replaces the player everywhere they appear in the match XI (batting order,
 * bowling pool, in-crease positions) and records a highlight.
 */
export function applyImpactSubstitution(
  match: MatchState,
  teamId: string,
  playerOutId: string,
  playerInId: string,
  allPlayers: Record<string, Player>
): { ok: boolean; message: string } {
  const isTeamA = match.teamAId === teamId;
  const xi = isTeamA ? match.teamAXI : match.teamBXI;

  if (xi.impactPlayerUsed) {
    return { ok: false, message: 'Impact Player already used by this team this match.' };
  }
  if (match.isMatchCompleted) {
    return { ok: false, message: 'Match has already finished.' };
  }
  const outIdx = xi.playingXIIds.indexOf(playerOutId);
  if (outIdx === -1) return { ok: false, message: 'Player to replace is not in the playing XI.' };
  if (!playerInId || xi.playingXIIds.includes(playerInId)) {
    return { ok: false, message: 'Impact player must come from outside the current XI.' };
  }

  xi.impactPlayerUsed = true;
  xi.impactPlayerId = playerInId;
  const outName = allPlayers[playerOutId]?.name || playerOutId;
  const inName = allPlayers[playerInId]?.name || playerInId;

  // Replace within XI + batting order (impact sub takes the batting slot of the replaced player)
  xi.playingXIIds = xi.playingXIIds.map(id => (id === playerOutId ? playerInId : id));
  xi.battingOrder = (xi.battingOrder || []).map(id => (id === playerOutId ? playerInId : id));

  // Captain/WK overrides if they left
  if (xi.captainId === playerOutId) xi.captainId = playerInId;
  if (xi.wicketkeeperId === playerOutId) xi.wicketkeeperId = playerInId;

  const inn = match.currentInningsIndex === 1 ? match.innings1 : match.innings2;

  // Mid-innings replacement of batters/bowler
  if (inn.currentStrikerId === playerOutId) inn.currentStrikerId = playerInId;
  if (inn.currentNonStrikerId === playerOutId) inn.currentNonStrikerId = playerInId;
  if (inn.currentBowlerId === playerOutId) inn.currentBowlerId = playerInId;

  // Seed fresh scorecard if the replacement hasn't batted
  const pIn = allPlayers[playerInId];
  if (pIn && !inn.batterScorecards[playerInId]) {
    inn.batterScorecards[playerInId] = {
      playerId: playerInId,
      playerName: pIn.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissalText: 'not out',
      battingPosition: Object.keys(inn.batterScorecards).length + 1
    };
  }

  match.highlights = match.highlights || [];
  match.highlights.unshift({
    id: `hl_sub_${Date.now()}`,
    type: 'IMPACT_SUB',
    overLabel: `${inn.oversCompleted}.${inn.ballsInCurrentOver}`,
    playerName: inName,
    teamShortName: '',
    text: `🔄 Impact Player activated: ${inName} replaces ${outName}.`
  });

  return { ok: true, message: `${inName} replaces ${outName} as the Impact Player.` };
}

export function simulateNextBall(
  match: MatchState,
  allPlayers: Record<string, Player>
): { updatedMatch: MatchState; event: BallByBallEvent } {
  const currentInnings = match.currentInningsIndex === 1 ? match.innings1 : match.innings2;
  const battingXI = currentInnings.battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
  const bowlingXI = currentInnings.bowlingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
  const battingTactics = currentInnings.battingTeamId === match.teamAId ? match.tactics.teamATactics : match.tactics.teamBTactics;
  const bowlingTactics = currentInnings.bowlingTeamId === match.teamAId ? match.tactics.teamATactics : match.tactics.teamBTactics;

  // Chemistry: small spice (up to ±6% on skill), never decisive alone
  const battingChemScore = currentInnings.battingTeamId === match.teamAId ? (match.teamAChemistry ?? 50) : (match.teamBChemistry ?? 50);
  const bowlingChemScore = currentInnings.bowlingTeamId === match.teamAId ? (match.teamAChemistry ?? 50) : (match.teamBChemistry ?? 50);
  const battingChemMult = getChemistryMultiplier(battingChemScore);
  const bowlingChemMult = getChemistryMultiplier(bowlingChemScore);

  // Check striker
  if (!currentInnings.currentStrikerId) {
    currentInnings.currentStrikerId = battingXI.battingOrder[0] || battingXI.playingXIIds[0];
  }
  if (!currentInnings.currentNonStrikerId) {
    currentInnings.currentNonStrikerId = battingXI.battingOrder[1] || battingXI.playingXIIds[1];
  }

  const striker = allPlayers[currentInnings.currentStrikerId];
  const nonStriker = allPlayers[currentInnings.currentNonStrikerId];
  const bowler = allPlayers[currentInnings.currentBowlerId];

  // If scorecard entry doesn't exist, create it
  if (striker && !currentInnings.batterScorecards[striker.id]) {
    currentInnings.batterScorecards[striker.id] = {
      playerId: striker.id,
      playerName: striker.name,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0,
      isOut: false,
      dismissalText: 'not out',
      battingPosition: Object.keys(currentInnings.batterScorecards).length + 1
    };
  }

  if (bowler && !currentInnings.bowlerScorecards[bowler.id]) {
    currentInnings.bowlerScorecards[bowler.id] = {
      playerId: bowler.id,
      playerName: bowler.name,
      overs: 0,
      maidens: 0,
      runsConceded: 0,
      wickets: 0,
      economy: 0,
      dots: 0,
      wides: 0,
      noBalls: 0
    };
  }

  const overNum = currentInnings.oversCompleted;
  const ballInOver = currentInnings.ballsInCurrentOver + 1;
  const isPowerplay = overNum < 6;
  const isDeath = overNum >= 15;
  const ovr18plus = overNum >= 17;
  const isChasing = match.currentInningsIndex === 2;
  const target = currentInnings.target || 0;
  const runsNeeded = isChasing ? Math.max(0, target - currentInnings.totalRuns) : 0;
  const ballsRemaining = Math.max(0, (20 - overNum) * 6 - currentInnings.ballsInCurrentOver);
  const reqRunRate = ballsRemaining > 0 ? (runsNeeded / ballsRemaining) * 6 : 0;

  // Compute ball probabilities
  const bAttr = striker?.attributes || {
    power: 70, boundaryAbility: 70, strikeRotation: 70, paceAbility: 70, spinAbility: 70,
    powerplayBatting: 70, middleOverBatting: 70, deathOverBatting: 70, chasingAbility: 70,
    finishing: 70, wicketPreservation: 70, composure: 70, aggression: 70
  };

  const bowlAttr = bowler?.attributes || {
    accuracy: 70, variation: 70, wicketTaking: 70, economy: 70,
    powerplayBowling: 70, middleOverBowling: 70, deathBowling: 70, composure: 70
  };

  const isSpinner = bowler?.bowlingStyle.includes('spin') || bowler?.bowlingStyle.includes('orthodox') || bowler?.bowlingStyle.includes('legbreak') || bowler?.bowlingStyle.includes('chinaman');

  // Matchup Modifier
  let batterSkill = (bAttr.power + bAttr.boundaryAbility + bAttr.strikeRotation) / 3;
  if (isSpinner) {
    batterSkill = (batterSkill + bAttr.spinAbility) / 2;
  } else {
    batterSkill = (batterSkill + bAttr.paceAbility) / 2;
  }
  batterSkill *= battingChemMult;

  let bowlerSkill = (bowlAttr.accuracy + bowlAttr.wicketTaking + bowlAttr.economy) / 3;
  bowlerSkill *= bowlingChemMult;

  if (isPowerplay) {
    batterSkill = (batterSkill + bAttr.powerplayBatting) / 2;
    bowlerSkill = (bowlerSkill + bowlAttr.powerplayBowling) / 2;
  } else if (isDeath) {
    batterSkill = (batterSkill + bAttr.deathOverBatting + bAttr.finishing) / 3;
    bowlerSkill = (bowlerSkill + bowlAttr.deathBowling) / 2;
  }

  // Tactical influence
  let aggressionMult = 1.0;
  let boundaryBoost = 1.0;
  let sixBoost = 1.0;
  let singleBoost = 1.0;
  let dotBallWeight = 1.0;
  let wicketRiskMult = 1.0;

  // --- PLAYSTYLES & TRAITS CALCULATION (CRICKET SIMULATION CORE) ---
  const bStyle = striker?.battingPlaystyle;
  const bowlStyle = bowler?.bowlingPlaystyle;
  const bTraits = striker?.traits || [];
  const bowlTraits = bowler?.traits || [];

  // Striker PlayStyles
  if (bStyle === 'Power Hitter') {
    boundaryBoost *= 1.22;
    sixBoost *= 1.35;
    dotBallWeight *= 0.92;
  } else if (bStyle === 'Chase Master') {
    if (isChasing) {
      singleBoost *= 1.25;
      wicketRiskMult *= 0.7; // Ice-cold composure during chases
      if (reqRunRate > 9.5) boundaryBoost *= 1.2;
    }
  } else if (bStyle === 'Anchor') {
    wicketRiskMult *= 0.6;
    singleBoost *= 1.3;
    boundaryBoost *= 0.85;
    dotBallWeight *= 0.8;
  } else if (bStyle === 'Death Specialist') {
    if (isDeath) {
      boundaryBoost *= 1.35;
      sixBoost *= 1.45;
      singleBoost *= 1.15;
    }
  } else if (bStyle === 'Spin Destroyer') {
    if (isSpinner) {
      boundaryBoost *= 1.4;
      sixBoost *= 1.45;
      wicketRiskMult *= 0.7;
    }
  } else if (bStyle === 'Pace Dominator') {
    if (!isSpinner) {
      boundaryBoost *= 1.3;
      sixBoost *= 1.3;
      wicketRiskMult *= 0.75;
    }
  } else if (bStyle === '360 Batter') {
    boundaryBoost *= 1.25;
    dotBallWeight *= 0.85;
  } else if (bStyle === 'Big Match Player') {
    if (match.matchType === 'Qualifier 1' || match.matchType === 'Qualifier 2' || match.matchType === 'Eliminator' || match.matchType === 'Final') {
      boundaryBoost *= 1.25;
      wicketRiskMult *= 0.8;
    }
  }

  // Striker Traits
  if (bTraits.includes('Clutch Finisher') && isChasing && runsNeeded <= 36 && ballsRemaining <= 24) {
    boundaryBoost *= 1.3;
    sixBoost *= 1.4;
    wicketRiskMult *= 0.75;
  }
  if (bTraits.includes('Pressure Absorber') && currentInnings.wickets >= 3 && overNum < 10) {
    wicketRiskMult *= 0.65;
    singleBoost *= 1.2;
  }
  if (bTraits.includes('Wankhede Six Hitter') && (match.venue.toLowerCase().includes('wankhede') || match.venue.toLowerCase().includes('chinnaswamy'))) {
    sixBoost *= 1.35;
  }
  if (bTraits.includes('Chepauk Spin Master') && match.venue.toLowerCase().includes('chepauk')) {
    if (isSpinner) boundaryBoost *= 1.3;
  }

  // Bowler PlayStyles
  let planWicketBonus = 1.0;
  let planEconomyBonus = 1.0;
  let yorkerDotBonus = 1.0;

  if (bowlStyle === 'Yorker Specialist') {
    if (isDeath) {
      planEconomyBonus *= 1.32;
      planWicketBonus *= 1.35;
      yorkerDotBonus *= 1.4;
    }
  } else if (bowlStyle === 'Express Pace') {
    dotBallWeight *= 1.25;
    if (isPowerplay) planWicketBonus *= 1.3;
  } else if (bowlStyle === 'Swing Master') {
    if (isPowerplay || match.weather === 'Overcast & Breezy') {
      planWicketBonus *= 1.4;
      planEconomyBonus *= 1.2;
    }
  } else if (bowlStyle === 'Mystery Spinner') {
    if (isSpinner) {
      dotBallWeight *= 1.3;
      planWicketBonus *= 1.35;
    }
  } else if (bowlStyle === 'Powerplay Specialist') {
    if (isPowerplay) {
      planEconomyBonus *= 1.35;
      planWicketBonus *= 1.3;
    }
  } else if (bowlStyle === 'Economy Monster') {
    planEconomyBonus *= 1.35;
    boundaryBoost *= 0.8;
    sixBoost *= 0.75;
    dotBallWeight *= 1.3;
  } else if (bowlStyle === 'Variation Expert') {
    if (isDeath || overNum >= 12) {
      planEconomyBonus *= 1.25;
      planWicketBonus *= 1.25;
    }
  }

  // Bowler Traits
  if (bowlTraits.includes('Clutch Finisher') && isChasing && runsNeeded <= 20) {
    planEconomyBonus *= 1.3;
    planWicketBonus *= 1.3;
  }
  if (bowlTraits.includes('Chepauk Spin Master') && match.venue.toLowerCase().includes('chepauk') && isSpinner) {
    planWicketBonus *= 1.4;
    planEconomyBonus *= 1.3;
  }

  // Batting approach mapping
  switch (battingTactics.batterApproach) {
    case 'Anchor / Conserve':
      aggressionMult = 0.6;
      wicketRiskMult = 0.45;
      boundaryBoost = 0.5;
      singleBoost = 1.25;
      dotBallWeight = 1.15;
      break;
    case 'Rotate Strike':
      aggressionMult = 0.85;
      wicketRiskMult = 0.65;
      boundaryBoost = 0.75;
      singleBoost = 1.6;
      dotBallWeight = 0.65;
      break;
    case 'Balanced':
      aggressionMult = 1.0;
      wicketRiskMult = 1.0;
      break;
    case 'Aggressive':
      aggressionMult = 1.45;
      wicketRiskMult = 1.35;
      boundaryBoost = 1.4;
      dotBallWeight = 0.9;
      break;
    case 'Maximum Attack':
      aggressionMult = 1.8;
      wicketRiskMult = 1.85;
      boundaryBoost = 1.85;
      dotBallWeight = 0.8;
      break;
    case 'Counter-Attack':
      aggressionMult = 1.6;
      wicketRiskMult = 1.5;
      boundaryBoost = 1.6;
      break;
  }

  // Running Risk
  if (battingTactics.runningRisk === 'Aggressive Twos') {
    singleBoost *= 1.3;
    wicketRiskMult *= 1.15; // small run-out risk increase
  } else if (battingTactics.runningRisk === 'Safe') {
    wicketRiskMult *= 0.9;
    singleBoost *= 0.85;
  }

  // Bowling Plan tactical impact
  switch (bowlingTactics.bowlingPlan) {
    case 'Pinpoint Yorkers':
    case 'Yorker Plan':
      planEconomyBonus *= isDeath ? 1.35 : 1.1;
      planWicketBonus *= 1.2;
      yorkerDotBonus *= 1.3;
      break;
    case 'Short-Pitch & Bouncers':
    case 'Short-ball Plan':
      if (bAttr.power < 75 || bAttr.paceAbility < 75) {
        planWicketBonus = 1.35;
      } else {
        boundaryBoost *= 1.2; // good pullers punish short balls
      }
      break;
    case 'Test Match Hard Length':
      if (isPowerplay) {
        planWicketBonus = 1.4;
        planEconomyBonus = 1.2;
      } else {
        planEconomyBonus = 1.05;
      }
      break;
    case 'Slower Ball Variations':
    case 'Slower-ball Plan':
      if (isDeath || !isPowerplay) {
        planEconomyBonus = 1.3;
        planWicketBonus = 1.15;
      }
      break;
    case 'Wide Outside Off Channel':
      planEconomyBonus = 1.25;
      if (battingTactics.shotPreference === 'Target Leg-Side (Pulls/Sweeps)') {
        planWicketBonus = 1.3; // mismatched batter intent
      }
      break;
    case 'Attack Stumps':
    case 'Attack Wickets':
      planWicketBonus = 1.35;
      boundaryBoost *= 1.1; // attacking stumps gives scoring opportunities
      break;
    case 'Contain Runs':
      planEconomyBonus = 1.3;
      planWicketBonus = 0.8;
      break;
  }

  // Field Setting impact
  let boundarySavingMult = 1.0;
  let catchOpportunityMult = 1.0;
  switch (bowlingTactics.fieldSetting) {
    case 'Aggressive Cordon (Slips/Ring)':
      catchOpportunityMult = 1.4;
      boundarySavingMult = 1.2; // more boundaries leak
      break;
    case 'Deep Boundary Lockdown (5 Back)':
    case 'Ring Boundary':
    case 'Defensive':
      boundarySavingMult = 0.65; // stops sixes & boundaries
      singleBoost *= 1.4; // singles conceded easily
      catchOpportunityMult = 0.85;
      break;
    case 'Inner Ring Choke (Cut-off 1s)':
      singleBoost *= 0.55;
      dotBallWeight *= 1.35;
      boundarySavingMult = 1.15;
      break;
    case 'Leg-Side Trap':
      if (battingTactics.shotPreference === 'Target Leg-Side (Pulls/Sweeps)') {
        catchOpportunityMult = 1.5;
        boundarySavingMult = 0.8;
      }
      break;
    case 'Off-Side Trap':
      if (battingTactics.shotPreference === 'Target Off-Side (Covers/Point)') {
        catchOpportunityMult = 1.5;
        boundarySavingMult = 0.8;
      }
      break;
  }

  if (isChasing && reqRunRate > 11) {
    aggressionMult *= 1.3;
    boundaryBoost *= 1.2;
    wicketRiskMult *= 1.25;
  }

  // Pitch influence
  let pitchWicketMod = 1.0;
  let pitchBoundaryMod = 1.0;
  if (match.pitch.type === 'Flat (High Scoring)') pitchBoundaryMod = 1.25;
  if (match.pitch.type === 'Dusty (Spin & Turn)' && isSpinner) pitchWicketMod = 1.35;
  if (match.pitch.type === 'Green (Pace & Swing)' && !isSpinner && isPowerplay) pitchWicketMod = 1.4;

  // Base odds
  const diff = (batterSkill * aggressionMult - bowlerSkill * planEconomyBonus) / 100;
  let pWicket = Math.max(0.015, (0.042 - diff * 0.02) * pitchWicketMod * wicketRiskMult * planWicketBonus * catchOpportunityMult);
  let pSix = Math.max(0.008, (0.045 + diff * 0.05) * pitchBoundaryMod * boundaryBoost * sixBoost * (aggressionMult > 1.1 ? 1.4 : 0.6) * (bowlingTactics.fieldSetting?.includes('Deep') ? 0.7 : 1.0));
  let pFour = Math.max(0.04, (0.12 + diff * 0.08) * pitchBoundaryMod * boundaryBoost * boundarySavingMult * (isPowerplay ? 1.3 : 1.0));
  let pTwo = 0.07 * (battingTactics.runningRisk === 'Aggressive Twos' ? 1.5 : 1.0);
  let pSingle = (0.34 + (bAttr.strikeRotation / 220)) * singleBoost * (1 / yorkerDotBonus);
  let pWide = (0.032 * (100 - bowlAttr.accuracy) / 100) * (bowlingTactics.bowlingPlan === 'Wide Outside Off Channel' ? 1.3 : 1.0);
  let pNoBall = 0.007;

  // Shot zone calculation based on preference
  let shotZone: ShotZone = SHOT_ZONES[Math.floor(Math.random() * SHOT_ZONES.length)];
  if (battingTactics.shotPreference === 'Target Leg-Side (Pulls/Sweeps)') {
    const legZones: ShotZone[] = ['Fine Leg', 'Square Leg', 'Mid Wicket'];
    shotZone = legZones[Math.floor(Math.random() * legZones.length)];
  } else if (battingTactics.shotPreference === 'Target Off-Side (Covers/Point)') {
    const offZones: ShotZone[] = ['Extra Cover', 'Cover', 'Point', 'Third Man'];
    shotZone = offZones[Math.floor(Math.random() * offZones.length)];
  } else if (battingTactics.shotPreference === 'Straight Down V') {
    const straightZones: ShotZone[] = ['Long On', 'Straight', 'Long Off'];
    shotZone = straightZones[Math.floor(Math.random() * straightZones.length)];
  } else if (battingTactics.shotPreference === 'Ramps & 360 Innovation') {
    const rampZones: ShotZone[] = ['Fine Leg', 'Third Man', 'Point', 'Square Leg'];
    shotZone = rampZones[Math.floor(Math.random() * rampZones.length)];
  }

  const rand = Math.random();
  let eventType: BallEventType = '0';
  let runsScored = 0;
  let extras = 0;
  let isLegalBall = true;
  let dismissal: { type: DismissalType; dismissedPlayerId: string; dismissedPlayerName: string; description: string; fielderId?: string; fielderName?: string } | undefined = undefined;

  if (rand < pWide) {
    eventType = 'WIDE';
    runsScored = 0;
    extras = 1;
    isLegalBall = false;
  } else if (rand < pWide + pNoBall) {
    eventType = 'NO_BALL';
    runsScored = 1;
    extras = 1;
    isLegalBall = false;
  } else if (rand < pWide + pNoBall + pWicket) {
    eventType = 'WICKET';
    runsScored = 0;
    const dRand = Math.random();
    let dType: DismissalType = 'Caught';
    if (dRand < 0.28) dType = 'Bowled';
    else if (dRand < 0.46) dType = 'LBW';
    else if (dRand < 0.90) dType = 'Caught';
    else if (dRand < 0.96) dType = 'Run Out';
    else dType = 'Stumped';

    // Assign the fielder so stats can credit catches/stumpings/run-outs
    const bowlingPool = bowlingXI.playingXIIds.map(id => allPlayers[id]).filter(Boolean);
    let fielder: Player | undefined;
    if (dType === 'Stumped') {
      fielder = allPlayers[bowlingXI.wicketkeeperId] || bowlingPool[0];
    } else if (dType === 'Caught') {
      fielder = bowlingPool[Math.floor(Math.random() * bowlingPool.length)];
    } else if (dType === 'Run Out') {
      fielder = bowlingPool[Math.floor(Math.random() * bowlingPool.length)];
    }

    dismissal = {
      type: dType,
      dismissedPlayerId: striker ? striker.id : 'striker',
      dismissedPlayerName: striker ? striker.name : 'Striker',
      fielderId: fielder?.id,
      fielderName: fielder?.name,
      description: dType === 'Stumped' && fielder
        ? `${dType} by ${fielder.name} off ${bowler?.name || 'Bowler'}`
        : `${dType}${fielder ? ` by ${fielder.name}` : ` by ${bowler?.name || 'Bowler'}`}`
    };
  } else if (rand < pWide + pNoBall + pWicket + pSix) {
    eventType = '6';
    runsScored = 6;
  } else if (rand < pWide + pNoBall + pWicket + pSix + pFour) {
    eventType = '4';
    runsScored = 4;
  } else if (rand < pWide + pNoBall + pWicket + pSix + pFour + pTwo) {
    eventType = '2';
    runsScored = 2;
  } else if (rand < pWide + pNoBall + pWicket + pSix + pFour + pTwo + pSingle) {
    eventType = '1';
    runsScored = 1;
  } else {
    eventType = '0';
    runsScored = 0;
  }

  // Update Inning State
  currentInnings.totalRuns += (runsScored + extras);
  if (eventType === 'WIDE') currentInnings.extras.wides += 1;
  if (eventType === 'NO_BALL') currentInnings.extras.noBalls += 1;
  currentInnings.extras.total += extras;

  // Batter scorecard update
  if (striker && currentInnings.batterScorecards[striker.id]) {
    const bCard = currentInnings.batterScorecards[striker.id];
    if (isLegalBall || eventType === 'NO_BALL') {
      bCard.balls += 1;
      bCard.runs += runsScored;
      if (runsScored === 4) bCard.fours += 1;
      if (runsScored === 6) bCard.sixes += 1;
      bCard.strikeRate = Number(((bCard.runs / bCard.balls) * 100).toFixed(1));
    }
    if (eventType === 'WICKET') {
      bCard.isOut = true;
      bCard.dismissalText = dismissal ? dismissal.description : 'out';
    }
  }

  // Bowler scorecard update
  if (bowler && currentInnings.bowlerScorecards[bowler.id]) {
    const bowlCard = currentInnings.bowlerScorecards[bowler.id];
    bowlCard.runsConceded += (runsScored + extras);
    if (eventType === 'WICKET') bowlCard.wickets += 1;
    if (runsScored === 0 && extras === 0) bowlCard.dots += 1;
    if (eventType === 'WIDE') bowlCard.wides += 1;
    if (eventType === 'NO_BALL') bowlCard.noBalls += 1;
  }

  if (isLegalBall) {
    currentInnings.ballsInCurrentOver += 1;
  }

  // Handle Wicket & Next Batter
  if (eventType === 'WICKET') {
    currentInnings.wickets += 1;
    currentInnings.fow.push({
      wicket: currentInnings.wickets,
      score: currentInnings.totalRuns,
      over: `${overNum}.${currentInnings.ballsInCurrentOver}`,
      playerId: striker?.id || '',
      playerName: striker?.name || ''
    });

    if (currentInnings.wickets < 10) {
      const nextIndex = currentInnings.wickets + 1; // e.g. 3rd batter
      const nextBatterId = battingXI.battingOrder[nextIndex] || battingXI.playingXIIds[nextIndex];
      currentInnings.currentStrikerId = nextBatterId;
      if (nextBatterId && allPlayers[nextBatterId]) {
        currentInnings.batterScorecards[nextBatterId] = {
          playerId: nextBatterId,
          playerName: allPlayers[nextBatterId].name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          strikeRate: 0,
          isOut: false,
          dismissalText: 'not out',
          battingPosition: nextIndex + 1
        };
      }
    }
  } else if (runsScored % 2 === 1) {
    // Strike rotation for odd runs
    const temp = currentInnings.currentStrikerId;
    currentInnings.currentStrikerId = currentInnings.currentNonStrikerId;
    currentInnings.currentNonStrikerId = temp;
  }

  // Record run-conceded baseline at the start of each over (for maidens)
  if (ballInOver === 1 && bowler && currentInnings.bowlerScorecards[bowler.id]) {
    currentInnings.runsAtOverStart = currentInnings.runsAtOverStart || {};
    currentInnings.runsAtOverStart[bowler.id] = currentInnings.bowlerScorecards[bowler.id].runsConceded;
  }

  // Over completion check
  if (currentInnings.ballsInCurrentOver >= 6) {
    currentInnings.oversCompleted += 1;
    currentInnings.ballsInCurrentOver = 0;

    // Strike rotation at end of over
    const temp = currentInnings.currentStrikerId;
    currentInnings.currentStrikerId = currentInnings.currentNonStrikerId;
    currentInnings.currentNonStrikerId = temp;

    // Update bowler overs + maiden detection
    if (bowler && currentInnings.bowlerScorecards[bowler.id]) {
      const bCard = currentInnings.bowlerScorecards[bowler.id];
      const overStartRuns = currentInnings.runsAtOverStart?.[bowler.id] ?? bCard.runsConceded;
      if (bCard.runsConceded - overStartRuns === 0) {
        bCard.maidens += 1;
        match.highlights = match.highlights || [];
        match.highlights.unshift({
          id: `hl_maiden_${Date.now()}`,
          type: 'DEATH_BOWLING',
          overLabel: `${currentInnings.oversCompleted}.0`,
          playerName: bowler.name,
          teamShortName: '',
          text: `🧊 Maiden over from ${bowler.name}.`
        });
      }
      bCard.overs += 1;
      bCard.economy = Number((bCard.runsConceded / bCard.overs).toFixed(2));
    }

    // Pick next bowler
    if (currentInnings.oversCompleted < 20 && currentInnings.wickets < 10) {
      currentInnings.currentBowlerId = selectNextBowler(currentInnings, bowlingXI, allPlayers, currentInnings.oversCompleted);
    }
  }

  // Check Innings/Match Completion
  if (isChasing) {
    if (currentInnings.totalRuns >= target) {
      currentInnings.isCompleted = true;
      match.isMatchCompleted = true;
      match.winnerTeamId = currentInnings.battingTeamId;
      const wicketsLeft = 10 - currentInnings.wickets;
      const teamWinnerTag = (match.winnerTeamId || '').toUpperCase();
      match.resultMarginText = `${teamWinnerTag} won by ${wicketsLeft} wickets`;
    } else if (currentInnings.wickets >= 10 || currentInnings.oversCompleted >= 20) {
      currentInnings.isCompleted = true;
      match.isMatchCompleted = true;
      if (currentInnings.totalRuns === target - 1) {
        match.resultMarginText = 'Match Tied! Heading to Super Over!';
      } else {
        match.winnerTeamId = currentInnings.bowlingTeamId;
        const runMargin = (target - 1) - currentInnings.totalRuns;
        const teamWinnerTag = (match.winnerTeamId || '').toUpperCase();
        match.resultMarginText = `${teamWinnerTag} won by ${runMargin} runs`;
      }
    }
  } else {
    // Innings 1
    if (currentInnings.wickets >= 10 || currentInnings.oversCompleted >= 20) {
      currentInnings.isCompleted = true;
      match.currentInningsIndex = 2;
      match.innings2.target = currentInnings.totalRuns + 1;
      // Setup Innings 2 Openers & Bowler
      const inn2BattingXI = match.innings2.battingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
      const inn2BowlingXI = match.innings2.bowlingTeamId === match.teamAId ? match.teamAXI : match.teamBXI;
      match.innings2.currentStrikerId = inn2BattingXI.battingOrder[0] || inn2BattingXI.playingXIIds[0];
      match.innings2.currentNonStrikerId = inn2BattingXI.battingOrder[1] || inn2BattingXI.playingXIIds[1];
      match.innings2.currentBowlerId = inn2BowlingXI.powerplayBowlerIds[0] || inn2BowlingXI.playingXIIds[10];

      [match.innings2.currentStrikerId, match.innings2.currentNonStrikerId].forEach((pId, idx) => {
        const p = allPlayers[pId];
        if (p) {
          match.innings2.batterScorecards[pId] = {
            playerId: pId,
            playerName: p.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            isOut: false,
            dismissalText: 'not out',
            battingPosition: idx + 1
          };
        }
      });
    }
  }

  // ---- Broadcast state: momentum, win probability, highlights ----
  const battingTeamTag = battingXI.teamId || (currentInnings.battingTeamId === match.teamAId ? match.teamAXI.teamId : match.teamBXI.teamId);
  const highlightTouch = (type: MatchHighlight['type'], overLabel: string, playerName: string, text: string) => {
    match.highlights = match.highlights || [];
    match.highlights.unshift({ id: `hl_${Date.now()}_${match.highlights.length}`, type, overLabel, playerName, teamShortName: battingTeamTag, text });
    if (match.highlights.length > 40) match.highlights.pop();
  };

  // Momentum meter: batting team gains with boundaries & wickets in hand, bowling with dots/wickets
  if (match.momentum === undefined) match.momentum = 50;
  let momentumDelta = 0;
  if (eventType === '6') momentumDelta += 8;
  else if (eventType === '4') momentumDelta += 5;
  else if (eventType === '1' || eventType === '2') momentumDelta += 1.5;
  else if (eventType === 'WICKET') momentumDelta -= 14;
  else if (eventType === '0' && !isPowerplay) momentumDelta += 0.5;
  if (isDeath && eventType === '0') momentumDelta += 0.5;
  match.momentum = Math.max(4, Math.min(96, Number((match.momentum + momentumDelta).toFixed(1))));

  match.probHistory = match.probHistory || [];
  match.probHistory.push(estimateWinProbability(match));
  if (match.probHistory.length > 140) match.probHistory.shift();

  // Milestone highlights (50s / 100s)
  if (striker && currentInnings.batterScorecards[striker.id]) {
    const sCard = currentInnings.batterScorecards[striker.id];
    currentInnings.fiftiesNoted = currentInnings.fiftiesNoted || [];
    currentInnings.hundredsNoted = currentInnings.hundredsNoted || [];
    if (sCard.runs >= 100 && !currentInnings.hundredsNoted.includes(striker.id)) {
      currentInnings.hundredsNoted.push(striker.id);
      highlightTouch('HUNDRED', `${overNum}.${currentInnings.ballsInCurrentOver}`, striker.name, `💯 CENTURY! ${striker.name} brings up a magnificent hundred!`);
    } else if (sCard.runs >= 50 && !currentInnings.fiftiesNoted.includes(striker.id)) {
      currentInnings.fiftiesNoted.push(striker.id);
      highlightTouch('FIFTY', `${overNum}.${currentInnings.ballsInCurrentOver}`, striker.name, `🎉 FIFTY! ${striker.name} races to a superb fifty!`);
    }
  }

  // Boundary / wicket highlights
  if ((eventType === '6' || eventType === '4') && (isDeath || ovr18plus)) {
    highlightTouch(
      eventType === '6' ? 'SIX' : 'FOUR',
      `${overNum}.${currentInnings.ballsInCurrentOver}`,
      striker?.name || 'Batter',
      eventType === '6'
        ? `💥 MASSIVE SIX in the death overs! ${striker?.name || 'The batter'} clears the ropes.`
        : `🎯 CRUCIAL BOUNDARY in the death overs from ${striker?.name || 'the batter'}.`
    );
  } else if (eventType === '6' && isPowerplay) {
    highlightTouch('SIX', `${overNum}.${currentInnings.ballsInCurrentOver}`, striker?.name || 'Batter', `⚡ Powerplay SIX! ${striker?.name || 'The batter'} goes downtown early.`);
  }
  if (eventType === 'WICKET') {
    highlightTouch('WICKET', `${overNum}.${currentInnings.ballsInCurrentOver}`, bowler?.name || 'Bowler', `🔥 WICKET! ${dismissal?.description || `${bowler?.name || 'Bowler'} strikes`} — ${striker?.name || 'The batter'} departs.`);
  }

  // Hat-trick probe: 3 consecutive legal balls by the same bowler all wickets
  if (bowler && eventType === 'WICKET' && isLegalBall) {
    const recentLegal = currentInnings.timeline.slice(-3);
    const hatTrick = recentLegal.length === 3 && recentLegal.every(e => e.bowlerId === bowler.id && e.eventType === 'WICKET');
    if (hatTrick) {
      highlightTouch('HAT_TRICK', `${overNum}.${currentInnings.ballsInCurrentOver}`, bowler.name, `🎩 HAT-TRICK! ${bowler.name} sends three batters back in three balls — historic moment!`);
    }
  }

  // Create ball event record
  const commentaryText = getDeterministicCommentary(
    eventType,
    runsScored,
    striker ? striker.name : 'Batter',
    bowler ? bowler.name : 'Bowler',
    shotZone,
    dismissal?.type,
    `${overNum}.${currentInnings.ballsInCurrentOver}`
  );

  const event: BallByBallEvent = {
    inningsIndex: match.currentInningsIndex,
    overNumber: overNum,
    ballInOver: isLegalBall ? currentInnings.ballsInCurrentOver : currentInnings.ballsInCurrentOver,
    totalBallsInInnings: currentInnings.timeline.length + 1,
    bowlerId: bowler ? bowler.id : '',
    bowlerName: bowler ? bowler.name : '',
    batterId: striker ? striker.id : '',
    batterName: striker ? striker.name : '',
    nonStrikerId: nonStriker ? nonStriker.id : '',
    nonStrikerName: nonStriker ? nonStriker.name : '',
    eventType,
    runsScored,
    extras,
    isLegalBall,
    dismissal,
    shotZone,
    shotSpeedKmph: Math.floor(128 + Math.random() * 22),
    isBoundary: runsScored === 4 || runsScored === 6,
    isSix: runsScored === 6,
    scoreAfterBall: currentInnings.totalRuns,
    wicketsAfterBall: currentInnings.wickets,
    commentaryText
  };

  currentInnings.timeline.push(event);
  currentInnings.recentBalls.unshift(event);
  if (currentInnings.recentBalls.length > 24) currentInnings.recentBalls.pop();

  return { updatedMatch: match, event };
}

// Batch Fast-Forward Simulation
export function simulateOver(match: MatchState, allPlayers: Record<string, Player>): MatchState {
  if (match.isMatchCompleted) return match;
  const currentInnings = match.currentInningsIndex === 1 ? match.innings1 : match.innings2;
  const targetOver = currentInnings.oversCompleted + 1;

  while (!match.isMatchCompleted && currentInnings.oversCompleted < targetOver && !currentInnings.isCompleted) {
    simulateNextBall(match, allPlayers);
  }
  return match;
}

export function simulateInnings(match: MatchState, allPlayers: Record<string, Player>): MatchState {
  if (match.isMatchCompleted) return match;
  const targetInningsIndex = match.currentInningsIndex;
  while (!match.isMatchCompleted && match.currentInningsIndex === targetInningsIndex) {
    simulateNextBall(match, allPlayers);
  }
  return match;
}

export function simulateFullMatch(match: MatchState, allPlayers: Record<string, Player>): MatchState {
  while (!match.isMatchCompleted) {
    simulateNextBall(match, allPlayers);
  }
  return match;
}
