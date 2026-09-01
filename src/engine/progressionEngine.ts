import { FranchiseProgressionState, FranchiseFacility, FranchiseStaffMember, ObjectiveItem, AchievementItem, DynamicRivalry, MatchMomentScenario } from '../types/franchise';

export const INITIAL_FACILITIES: Record<string, FranchiseFacility> = {
  scouting: {
    id: 'scouting',
    name: 'Scouting Center',
    level: 1,
    maxLevel: 5,
    upgradeCostCr: 1.5,
    description: 'Deploys domestic & international talent spotters to discover hidden gems and accurate player valuations.',
    perkDescription: '+15% Scouting Report Accuracy & Unlocks Hidden Potential Ratings',
    statBonus: 'Accuracy Tier 1'
  },
  training: {
    id: 'training',
    name: 'High Performance Center',
    level: 1,
    maxLevel: 5,
    upgradeCostCr: 2.0,
    description: 'State-of-the-art batting cages, biomechanics tracking, and bowling speed radars.',
    perkDescription: '+20% Player Development Speed & Tactical Familiarity',
    statBonus: 'Development +20%'
  },
  medical: {
    id: 'medical',
    name: 'Sports Medicine & Recovery Lab',
    level: 1,
    maxLevel: 5,
    upgradeCostCr: 1.2,
    description: 'Cryotherapy chambers, physio recovery suites, and injury prevention protocols.',
    perkDescription: '-30% Injury Chance & 2x Faster Player Stamina Recovery',
    statBonus: 'Recovery 2x'
  },
  analytics: {
    id: 'analytics',
    name: 'Matchup & Data Lab',
    level: 1,
    maxLevel: 5,
    upgradeCostCr: 1.8,
    description: 'Algorithmic ball-by-ball matchup models analyzing opponent weak zones and strike rotation.',
    perkDescription: 'Unlocks In-Match Live Ball Advantage Indicators & Opposition Matchup Radar',
    statBonus: 'Matchup Advantage +10%'
  },
  academy: {
    id: 'academy',
    name: 'Franchise Youth Academy',
    level: 1,
    maxLevel: 5,
    upgradeCostCr: 2.5,
    description: 'Grassroots development program scouting uncapped state prodigies across India.',
    perkDescription: 'Guarantees 1 High-Potential (90+ POT) Uncapped Indian Prodigy Per Season',
    statBonus: '1 Elite Prodigy/Season'
  }
};

export const INITIAL_STAFF: FranchiseStaffMember[] = [
  {
    id: 'coach_1',
    name: 'Stephen Fleming',
    role: 'Head Coach',
    salaryCrPerYear: 3.5,
    rating: 94,
    specialty: 'Dressing Room Calm & Clutch Tactics',
    perkEffect: '+8% Win probability in final over finishes',
    nationality: 'New Zealand',
    isHired: true
  },
  {
    id: 'coach_2',
    name: 'Mike Hussey',
    role: 'Batting Coach',
    salaryCrPerYear: 2.0,
    rating: 91,
    specialty: 'Powerplay Strike Rotation & Anchor Mastery',
    perkEffect: '+10% Batting consistency in 180+ chases',
    nationality: 'Australia',
    isHired: true
  },
  {
    id: 'coach_3',
    name: 'Dwayne Bravo',
    role: 'Bowling Coach',
    salaryCrPerYear: 2.0,
    rating: 92,
    specialty: 'Death Overs Variations & Wide Yorkmaster',
    perkEffect: '-1.2 Economy rate in overs 16-20',
    nationality: 'West Indies',
    isHired: true
  },
  {
    id: 'scout_1',
    name: 'Joydeep Mukherjee',
    role: 'Chief Scout',
    salaryCrPerYear: 1.2,
    rating: 88,
    specialty: 'Domestic Ranji & SMAT Radar',
    perkEffect: 'Discovers uncapped domestic gems with 100% price accuracy',
    nationality: 'India',
    isHired: true
  },
  {
    id: 'analyst_1',
    name: 'Dan Weston',
    role: 'Lead Analyst',
    salaryCrPerYear: 1.0,
    rating: 89,
    specialty: 'Ball-by-Ball Matchup Clustering',
    perkEffect: '+15% Edge against opposition key batter matchup weaknesses',
    nationality: 'United Kingdom',
    isHired: false
  },
  {
    id: 'physio_1',
    name: 'Tommy Simsek',
    role: 'Head Physio',
    salaryCrPerYear: 0.8,
    rating: 90,
    specialty: 'Fast Bowler Workload & Shoulder Rehab',
    perkEffect: 'Fast bowlers maintain 95%+ fitness across long tournaments',
    nationality: 'Australia',
    isHired: true
  }
];

export const INITIAL_OBJECTIVES: ObjectiveItem[] = [
  {
    id: 'obj_daily_1',
    title: 'Win 1 Matchday Fixture',
    description: 'Outplay your opposition in the league and secure 2 points.',
    category: 'daily',
    progress: 0,
    target: 1,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 150,
    rewardCoinsCr: 0.25,
    rewardScoutTokens: 1,
    iconType: 'trophy'
  },
  {
    id: 'obj_daily_2',
    title: 'Hit 8 Sixes in a Match',
    description: 'Unleash attacking cricket and clear the ropes 8 times in any format.',
    category: 'daily',
    progress: 0,
    target: 8,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 120,
    rewardCoinsCr: 0.15,
    rewardScoutTokens: 1,
    iconType: 'flame'
  },
  {
    id: 'obj_daily_3',
    title: 'Complete 1 In-Depth Scouting Report',
    description: 'Inspect player cards or unlock scout analysis in the Scouting Department.',
    category: 'daily',
    progress: 0,
    target: 1,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 100,
    rewardCoinsCr: 0.10,
    rewardScoutTokens: 2,
    iconType: 'scout'
  },
  {
    id: 'obj_weekly_1',
    title: 'Win 5 League Matches',
    description: 'Maintain top form across a grueling weekly stretch.',
    category: 'weekly',
    progress: 0,
    target: 5,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 500,
    rewardCoinsCr: 1.0,
    rewardScoutTokens: 5,
    iconType: 'shield'
  },
  {
    id: 'obj_weekly_2',
    title: 'Discover 3 High Potential Real Players',
    description: 'Add 3 real domestic or overseas players to your franchise watchlist.',
    category: 'weekly',
    progress: 0,
    target: 3,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 350,
    rewardCoinsCr: 0.5,
    rewardScoutTokens: 4,
    iconType: 'users'
  },
  {
    id: 'obj_season_1',
    title: 'Reach the IPL Playoffs (Top 4 Finish)',
    description: 'Qualify for Qualifier 1, Qualifier 2, or the Eliminator.',
    category: 'season',
    progress: 0,
    target: 1,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 1500,
    rewardCoinsCr: 5.0,
    rewardScoutTokens: 10,
    iconType: 'crown'
  },
  {
    id: 'obj_season_2',
    title: 'Win the IPL Championship Trophy',
    description: 'Lifting the prestigious trophy in the Grand Final.',
    category: 'season',
    progress: 0,
    target: 1,
    isCompleted: false,
    isClaimed: false,
    rewardXp: 3000,
    rewardCoinsCr: 10.0,
    rewardScoutTokens: 20,
    iconType: 'trophy'
  }
];

export const INITIAL_ACHIEVEMENTS: AchievementItem[] = [
  {
    id: 'ach_first_win',
    title: 'Opening Account',
    description: 'Win your first official matchday fixture as Franchise Head.',
    category: 'Match',
    isUnlocked: false,
    rewardXp: 200,
    icon: 'zap'
  },
  {
    id: 'ach_auction_master',
    title: 'Auction Mastermind',
    description: 'Complete the IPL Mega Auction with all 25 squad slots filled within budget.',
    category: 'Auction',
    isUnlocked: false,
    rewardXp: 350,
    icon: 'gavel'
  },
  {
    id: 'ach_century',
    title: 'Ton Up!',
    description: 'Have a batter score an individual 100+ runs in a single match.',
    category: 'Match',
    isUnlocked: false,
    rewardXp: 400,
    icon: 'flame'
  },
  {
    id: 'ach_5fer',
    title: 'Fifer Heroics',
    description: 'Have a bowler take 5 or more wickets in a match.',
    category: 'Match',
    isUnlocked: false,
    rewardXp: 500,
    icon: 'target'
  },
  {
    id: 'ach_dynasty_5',
    title: 'Rising Franchise (Level 5)',
    description: 'Reach Franchise Level 5 through persistent competitive excellence.',
    category: 'Dynasty',
    isUnlocked: false,
    rewardXp: 600,
    icon: 'award'
  },
  {
    id: 'ach_trophy',
    title: 'Champions of India',
    description: 'Win the IPL Championship trophy.',
    category: 'Dynasty',
    isUnlocked: false,
    rewardXp: 2000,
    icon: 'crown'
  }
];

export const INITIAL_RIVALRIES: Record<string, DynamicRivalry> = {
  csk: {
    opponentTeamId: 'csk',
    rivalryName: 'The Southern & Coastal Derby',
    intensity: 'Heated',
    matchesPlayed: 4,
    userWins: 2,
    opponentWins: 2,
    lastEncounterResult: 'Won by 5 runs',
    biggestWin: 'Won by 38 runs'
  },
  mi: {
    opponentTeamId: 'mi',
    rivalryName: 'El Clásico of IPL',
    intensity: 'Fierce',
    matchesPlayed: 5,
    userWins: 3,
    opponentWins: 2,
    lastEncounterResult: 'Lost by 3 wickets',
    biggestWin: 'Won by 24 runs'
  },
  rcb: {
    opponentTeamId: 'rcb',
    rivalryName: 'The Royal Derby',
    intensity: 'Classic',
    matchesPlayed: 3,
    userWins: 2,
    opponentWins: 1,
    lastEncounterResult: 'Won by 14 runs',
    biggestWin: 'Won by 6 wickets'
  },
  kkr: {
    opponentTeamId: 'kkr',
    rivalryName: 'Knight Clash',
    intensity: 'Heated',
    matchesPlayed: 3,
    userWins: 1,
    opponentWins: 2,
    lastEncounterResult: 'Lost by 12 runs',
    biggestWin: 'Won by 8 wickets'
  }
};

export const MATCH_MOMENTS: MatchMomentScenario[] = [
  {
    id: 'moment_death_defense',
    title: 'Defend 12 off 6 Balls',
    subtitle: 'Death Bowling Masterclass',
    difficulty: 'Hard',
    runsNeeded: 13,
    ballsRemaining: 6,
    wicketsInHand: 4,
    targetRuns: 198,
    chasingTeamId: 'csk',
    defendingTeamId: 'user',
    batterIds: ['auc_ms_dhoni', 'auc_ravindra_jadeja'],
    bowlerId: 'auc_jasprit_bumrah',
    contextDesc: 'Final over of a high-scoring blockbuster at Wankhede. MS Dhoni is on strike requiring 13 to win with Jasprit Bumrah holding the ball.',
    xpReward: 350
  },
  {
    id: 'moment_chase_blitz',
    title: 'Chase 45 from 18 Balls',
    subtitle: 'Finisher Heroics',
    difficulty: 'Extreme',
    runsNeeded: 45,
    ballsRemaining: 18,
    wicketsInHand: 5,
    targetRuns: 215,
    chasingTeamId: 'user',
    defendingTeamId: 'kkr',
    batterIds: ['auc_rinku_singh', 'auc_andre_russell'],
    bowlerId: 'auc_mitchell_starc',
    contextDesc: '15 runs per over needed against a world-class pace-spin combination at Eden Gardens. One false shot ends the season.',
    xpReward: 500
  },
  {
    id: 'moment_powerplay_rebuild',
    title: 'Rebuild from 18/3 in Powerplay',
    subtitle: 'Crisis Management',
    difficulty: 'Medium',
    runsNeeded: 160,
    ballsRemaining: 84,
    wicketsInHand: 7,
    targetRuns: 178,
    chasingTeamId: 'user',
    defendingTeamId: 'srh',
    batterIds: ['auc_virat_kohli', 'auc_surya_kumar_yadav'],
    bowlerId: 'auc_pat_cummins',
    contextDesc: 'Early collapses happen. Counter-attack or consolidate with your captain and middle-order stalwart.',
    xpReward: 250
  },
  {
    id: 'moment_super_over',
    title: 'IPL Grand Final: Super Over',
    subtitle: 'Winner Takes All',
    difficulty: 'Extreme',
    runsNeeded: 16,
    ballsRemaining: 6,
    wicketsInHand: 2,
    targetRuns: 16,
    chasingTeamId: 'user',
    defendingTeamId: 'mi',
    batterIds: ['auc_rohit_sharma', 'auc_heinrich_klaasen'],
    bowlerId: 'auc_jasprit_bumrah',
    contextDesc: 'Tied after 40 overs! 6 balls to decide the championship crown under blinding stadium floodlights.',
    xpReward: 750
  }
];

export function getFranchiseLevelInfo(xp: number): { level: number; title: string; currentLevelXp: number; nextLevelXp: number; progressPercent: number } {
  // Levels: 1 to 50
  // Level 1: 0 - 500
  // Level 2: 500 - 1200
  // Level 5: 3500 (Rising Franchise)
  // Level 10: 10000 (Established Franchise)
  // Level 25: 35000 (Elite Franchise)
  // Level 50: 100000 (IPL Dynasty)
  let level = 1;
  let prevThreshold = 0;
  let nextThreshold = 500;

  for (let i = 1; i <= 50; i++) {
    const threshold = Math.round(350 * Math.pow(i, 1.45));
    if (xp >= threshold) {
      level = i + 1;
      prevThreshold = threshold;
    } else {
      nextThreshold = threshold;
      break;
    }
  }

  let title = 'New Franchise';
  if (level >= 50) title = 'IPL Dynasty';
  else if (level >= 25) title = 'Elite Franchise';
  else if (level >= 15) title = 'Contender Franchise';
  else if (level >= 10) title = 'Established Franchise';
  else if (level >= 5) title = 'Rising Franchise';
  else if (level >= 2) title = 'Developing Club';

  const range = nextThreshold - prevThreshold;
  const currentLevelProgress = Math.max(0, xp - prevThreshold);
  const progressPercent = Math.min(100, Math.round((currentLevelProgress / (range || 1)) * 100));

  return {
    level,
    title,
    currentLevelXp: xp,
    nextLevelXp: nextThreshold,
    progressPercent
  };
}

export function initFranchiseProgression(): FranchiseProgressionState {
  return {
    xp: 450,
    level: 1,
    xpToNextLevel: 500,
    scoutTokens: 5,
    clubBudgetCr: 8.5,
    facilities: { ...INITIAL_FACILITIES },
    staff: [...INITIAL_STAFF],
    objectives: [...INITIAL_OBJECTIVES],
    achievements: [...INITIAL_ACHIEVEMENTS],
    rivalries: { ...INITIAL_RIVALRIES },
    unclaimedRewardsCount: 1
  };
}
