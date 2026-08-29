export interface FranchiseFacility {
  id: 'scouting' | 'training' | 'medical' | 'analytics' | 'academy';
  name: string;
  level: number; // 1 to 5
  maxLevel: number;
  upgradeCostCr: number;
  description: string;
  perkDescription: string;
  statBonus: string;
}

export interface FranchiseStaffMember {
  id: string;
  name: string;
  role: 'Head Coach' | 'Batting Coach' | 'Bowling Coach' | 'Chief Scout' | 'Lead Analyst' | 'Head Physio';
  salaryCrPerYear: number;
  rating: number; // 1 - 99
  specialty: string;
  perkEffect: string;
  nationality: string;
  isHired: boolean;
}

export interface ObjectiveItem {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'season';
  progress: number;
  target: number;
  isCompleted: boolean;
  isClaimed: boolean;
  rewardXp: number;
  rewardCoinsCr: number;
  rewardScoutTokens: number;
  iconType: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category: 'Auction' | 'Match' | 'Dynasty' | 'Scouting' | 'Squad';
  isUnlocked: boolean;
  unlockedAtSeason?: number;
  rewardXp: number;
  icon: string;
}

export interface MatchMomentScenario {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  runsNeeded: number;
  ballsRemaining: number;
  wicketsInHand: number;
  targetRuns: number;
  chasingTeamId: string;
  defendingTeamId: string;
  batterIds: string[];
  bowlerId: string;
  contextDesc: string;
  xpReward: number;
}

export interface DynamicRivalry {
  opponentTeamId: string;
  rivalryName: string;
  intensity: 'Heated' | 'Classic' | 'Fierce' | 'Neutral';
  matchesPlayed: number;
  userWins: number;
  opponentWins: number;
  lastEncounterResult?: string;
  biggestWin?: string;
}

export interface FranchiseProgressionState {
  xp: number;
  level: number;
  xpToNextLevel: number;
  scoutTokens: number;
  clubBudgetCr: number;
  facilities: Record<string, FranchiseFacility>;
  staff: FranchiseStaffMember[];
  objectives: ObjectiveItem[];
  achievements: AchievementItem[];
  rivalries: Record<string, DynamicRivalry>;
  unclaimedRewardsCount: number;
}
