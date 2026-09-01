import { AchievementItem, FranchiseProgressionState, ObjectiveItem } from '../types/franchise';
import { Team } from '../types/team';
import { Player } from '../types/cricket';
import { getFranchiseLevelInfo, INITIAL_ACHIEVEMENTS, INITIAL_OBJECTIVES } from '../engine/progressionEngine';

export type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RewardKind = 'xp' | 'budget' | 'scoutTokens' | 'badge' | 'collection' | 'h2h';
export type RewardEventType = 'match_participation' | 'match_win' | 'auction_signing' | 'auction_complete' | 'h2h_play' | 'h2h_win' | 'scout_report' | 'academy_milestone';

export interface RewardGrant {
  id: string;
  kind: RewardKind;
  title: string;
  value: number | string;
  description: string;
  rarity: RewardRarity;
}

export interface RewardQueueItem {
  id: string;
  source: string;
  grants: RewardGrant[];
  createdAt: number;
  claimed: boolean;
}

export interface DailyStreakState {
  currentDay: number;
  lastClaimDate: string | null;
  claimedDates: string[];
}

export interface H2HProgressionState {
  rating: number;
  points: number;
  wins: number;
  losses: number;
  streak: number;
}

export interface RewardEcosystemState {
  queue: RewardQueueItem[];
  history: RewardQueueItem[];
  dailyStreak: DailyStreakState;
  h2h: H2HProgressionState;
  collectionClaimedMilestones: number[];
  playerMastery: Record<string, { xp: number; level: number }>;
}

export interface RewardProgressionViewModel {
  xp: number;
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  claimableObjectives: number;
  completedObjectives: number;
  totalObjectives: number;
  nextObjective?: ObjectiveItem;
  collectionCount: number;
  collectionMilestone: number;
  h2hTier: H2HTier;
}

export interface H2HTier {
  id: string;
  label: string;
  minRating: number;
  color: string;
}

export const H2H_TIERS: H2HTier[] = [
  { id: 'bronze', label: 'Bronze', minRating: 0, color: '#CD7F32' },
  { id: 'silver', label: 'Silver', minRating: 800, color: '#CBD5E1' },
  { id: 'gold', label: 'Gold', minRating: 1200, color: '#D4AF37' },
  { id: 'platinum', label: 'Platinum', minRating: 1600, color: '#00E5FF' },
  { id: 'elite', label: 'Elite', minRating: 2000, color: '#8B5CF6' },
  { id: 'legend', label: 'Legend', minRating: 2500, color: '#FF1E56' }
];

export const DAILY_STREAK_REWARDS: RewardGrant[][] = [
  [{ id: 'streak_d1_xp', kind: 'xp', title: 'Day 1 Login', value: 150, description: 'Franchise XP', rarity: 'common' }],
  [{ id: 'streak_d2_budget', kind: 'budget', title: 'Day 2 Budget Boost', value: 0.25, description: 'Club budget', rarity: 'common' }],
  [{ id: 'streak_d3_tokens', kind: 'scoutTokens', title: 'Day 3 Scout Tokens', value: 2, description: 'Scouting currency', rarity: 'rare' }],
  [{ id: 'streak_d4_badge', kind: 'badge', title: 'Day 4 Profile Badge', value: 'Training Camp', description: 'Cosmetic badge', rarity: 'rare' }],
  [{ id: 'streak_d5_xp', kind: 'xp', title: 'Day 5 XP Surge', value: 350, description: 'Franchise XP', rarity: 'epic' }],
  [{ id: 'streak_d6_tokens', kind: 'scoutTokens', title: 'Day 6 Elite Report', value: 4, description: 'Scout tokens', rarity: 'epic' }],
  [{ id: 'streak_d7_reward', kind: 'badge', title: 'Day 7 Premium Badge', value: 'Weekly Commander', description: 'Cosmetic reward', rarity: 'legendary' }, { id: 'streak_d7_xp', kind: 'xp', title: 'Weekly XP', value: 600, description: 'Franchise XP', rarity: 'legendary' }]
];

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function ensureRewardEcosystem(progression: FranchiseProgressionState): FranchiseProgressionState & { rewards: RewardEcosystemState } {
  const anyProg = progression as FranchiseProgressionState & { rewards?: Partial<RewardEcosystemState> };
  const rewards: RewardEcosystemState = {
    queue: anyProg.rewards?.queue || [],
    history: anyProg.rewards?.history || [],
    dailyStreak: anyProg.rewards?.dailyStreak || { currentDay: 1, lastClaimDate: null, claimedDates: [] },
    h2h: anyProg.rewards?.h2h || { rating: 1000, points: 0, wins: 0, losses: 0, streak: 0 },
    collectionClaimedMilestones: anyProg.rewards?.collectionClaimedMilestones || [],
    playerMastery: anyProg.rewards?.playerMastery || {}
  };

  return {
    ...progression,
    objectives: progression.objectives?.length ? progression.objectives : INITIAL_OBJECTIVES,
    achievements: progression.achievements?.length ? progression.achievements : INITIAL_ACHIEVEMENTS,
    rewards
  };
}

export function getH2HTier(rating: number): H2HTier {
  return [...H2H_TIERS].reverse().find(tier => rating >= tier.minRating) || H2H_TIERS[0];
}

export function deriveRewardProgression(
  progression: FranchiseProgressionState,
  userTeam?: Team,
  allPlayers?: Record<string, Player>
): RewardProgressionViewModel {
  const stable = ensureRewardEcosystem(progression);
  const level = getFranchiseLevelInfo(stable.xp || 0);
  const objectives = stable.objectives || [];
  const claimableObjectives = objectives.filter(o => o.isCompleted && !o.isClaimed).length;
  const nextObjective = objectives.find(o => !o.isClaimed && !o.isCompleted) || objectives.find(o => o.isCompleted && !o.isClaimed);
  const collectionCount = userTeam ? new Set(userTeam.rosterPlayerIds || []).size : 0;
  const collectionMilestone = [25, 50, 100, 150, 250].find(m => collectionCount < m) || 250;

  return {
    xp: stable.xp || 0,
    level: level.level,
    title: level.title,
    currentLevelXp: level.currentLevelXp,
    nextLevelXp: level.nextLevelXp,
    progressPercent: level.progressPercent,
    claimableObjectives,
    completedObjectives: objectives.filter(o => o.isCompleted).length,
    totalObjectives: objectives.length,
    nextObjective,
    collectionCount,
    collectionMilestone,
    h2hTier: getH2HTier(stable.rewards.h2h.rating)
  };
}

export function objectiveStatus(objective: ObjectiveItem): 'CLAIMED' | 'COMPLETED' | 'IN PROGRESS' | 'AVAILABLE' {
  if (objective.isClaimed) return 'CLAIMED';
  if (objective.isCompleted) return 'COMPLETED';
  if (objective.progress > 0) return 'IN PROGRESS';
  return 'AVAILABLE';
}

export function applyObjectiveClaim(progression: FranchiseProgressionState, objectiveId: string): { progression: FranchiseProgressionState; reward?: RewardQueueItem } {
  const stable = ensureRewardEcosystem(progression);
  const objective = stable.objectives.find(o => o.id === objectiveId);
  if (!objective || !objective.isCompleted || objective.isClaimed) return { progression: stable };

  const allGrants: RewardGrant[] = [
    { id: `${objective.id}_xp`, kind: 'xp', title: 'Franchise XP', value: objective.rewardXp, description: objective.title, rarity: objective.rewardXp >= 500 ? 'epic' : 'rare' },
    { id: `${objective.id}_budget`, kind: 'budget', title: 'Club Budget', value: objective.rewardCoinsCr, description: 'Facility and staff budget', rarity: objective.rewardCoinsCr >= 1 ? 'epic' : 'common' },
    { id: `${objective.id}_tokens`, kind: 'scoutTokens', title: 'Scout Tokens', value: objective.rewardScoutTokens, description: 'Use in the scouting department', rarity: objective.rewardScoutTokens >= 5 ? 'epic' : 'rare' }
  ];
  const grants = allGrants.filter(grant => Number(grant.value) > 0 || typeof grant.value === 'string');

  const reward: RewardQueueItem = {
    id: `reward_${objective.id}_${Date.now()}`,
    source: objective.title,
    grants,
    createdAt: Date.now(),
    claimed: true
  };

  const updatedObjectives = stable.objectives.map(o => o.id === objectiveId ? { ...o, isClaimed: true } : o);
  const nextXp = (stable.xp || 0) + objective.rewardXp;
  const nextLevel = getFranchiseLevelInfo(nextXp);

  return {
    reward,
    progression: {
      ...stable,
      xp: nextXp,
      level: nextLevel.level,
      xpToNextLevel: nextLevel.nextLevelXp,
      clubBudgetCr: Number(((stable.clubBudgetCr || 0) + objective.rewardCoinsCr).toFixed(2)),
      scoutTokens: (stable.scoutTokens || 0) + objective.rewardScoutTokens,
      objectives: updatedObjectives,
      unclaimedRewardsCount: updatedObjectives.filter(o => o.isCompleted && !o.isClaimed).length,
      rewards: { ...stable.rewards, queue: [reward, ...stable.rewards.queue].slice(0, 8), history: [reward, ...stable.rewards.history].slice(0, 40) }
    } as FranchiseProgressionState
  };
}

export function claimAllObjectiveRewards(progression: FranchiseProgressionState): { progression: FranchiseProgressionState; rewards: RewardQueueItem[] } {
  let current = progression;
  const rewards: RewardQueueItem[] = [];
  for (const objective of progression.objectives || []) {
    if (objective.isCompleted && !objective.isClaimed) {
      const result = applyObjectiveClaim(current, objective.id);
      current = result.progression;
      if (result.reward) rewards.push(result.reward);
    }
  }
  return { progression: current, rewards };
}

export function claimDailyStreak(progression: FranchiseProgressionState, date = new Date()): { progression: FranchiseProgressionState; reward?: RewardQueueItem } {
  const stable = ensureRewardEcosystem(progression);
  const key = todayKey(date);
  if (stable.rewards.dailyStreak.claimedDates.includes(key)) return { progression: stable };

  const dayIndex = Math.max(0, Math.min(6, (stable.rewards.dailyStreak.currentDay || 1) - 1));
  const grants = DAILY_STREAK_REWARDS[dayIndex];
  const xpGrant = grants.filter(g => g.kind === 'xp').reduce((sum, g) => sum + Number(g.value || 0), 0);
  const budgetGrant = grants.filter(g => g.kind === 'budget').reduce((sum, g) => sum + Number(g.value || 0), 0);
  const tokenGrant = grants.filter(g => g.kind === 'scoutTokens').reduce((sum, g) => sum + Number(g.value || 0), 0);
  const nextXp = (stable.xp || 0) + xpGrant;
  const level = getFranchiseLevelInfo(nextXp);
  const reward: RewardQueueItem = { id: `daily_streak_${key}`, source: `Daily Streak Day ${dayIndex + 1}`, grants, createdAt: Date.now(), claimed: true };

  return {
    reward,
    progression: {
      ...stable,
      xp: nextXp,
      level: level.level,
      xpToNextLevel: level.nextLevelXp,
      clubBudgetCr: Number(((stable.clubBudgetCr || 0) + budgetGrant).toFixed(2)),
      scoutTokens: (stable.scoutTokens || 0) + tokenGrant,
      rewards: {
        ...stable.rewards,
        dailyStreak: {
          currentDay: stable.rewards.dailyStreak.currentDay >= 7 ? 1 : stable.rewards.dailyStreak.currentDay + 1,
          lastClaimDate: key,
          claimedDates: [...stable.rewards.dailyStreak.claimedDates, key].slice(-14)
        },
        queue: [reward, ...stable.rewards.queue].slice(0, 8),
        history: [reward, ...stable.rewards.history].slice(0, 40)
      }
    } as FranchiseProgressionState
  };
}

export function progressObjectiveById(progression: FranchiseProgressionState, objectiveId: string, amount = 1): FranchiseProgressionState {
  const stable = ensureRewardEcosystem(progression);
  const updated = stable.objectives.map(obj => {
    if (obj.id !== objectiveId || obj.isClaimed) return obj;
    const progress = Math.min(obj.target, (obj.progress || 0) + amount);
    return { ...obj, progress, isCompleted: progress >= obj.target };
  });
  return { ...stable, objectives: updated, unclaimedRewardsCount: updated.filter(o => o.isCompleted && !o.isClaimed).length } as FranchiseProgressionState;
}

export function completeAchievement(progression: FranchiseProgressionState, achievementId: string, season: number): FranchiseProgressionState {
  const stable = ensureRewardEcosystem(progression);
  const achievement = stable.achievements.find(a => a.id === achievementId);
  if (!achievement || achievement.isUnlocked) return stable;
  const nextXp = (stable.xp || 0) + achievement.rewardXp;
  const level = getFranchiseLevelInfo(nextXp);
  const reward: RewardQueueItem = {
    id: `achievement_${achievement.id}_${Date.now()}`,
    source: achievement.title,
    createdAt: Date.now(),
    claimed: true,
    grants: [{ id: `${achievement.id}_xp`, kind: 'xp', title: 'Achievement XP', value: achievement.rewardXp, description: achievement.description, rarity: achievement.rewardXp >= 1000 ? 'legendary' : 'epic' }]
  };
  return {
    ...stable,
    xp: nextXp,
    level: level.level,
    xpToNextLevel: level.nextLevelXp,
    achievements: stable.achievements.map(a => a.id === achievementId ? { ...a, isUnlocked: true, unlockedAtSeason: season } : a),
    rewards: { ...stable.rewards, queue: [reward, ...stable.rewards.queue].slice(0, 8), history: [reward, ...stable.rewards.history].slice(0, 40) }
  } as FranchiseProgressionState;
}
