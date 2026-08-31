import { Player, PlayerRole } from './cricket';

export type FCCardTier = 
  | 'Gold Rare' 
  | 'TOTW' 
  | 'Icon Legend' 
  | 'Centurions' 
  | 'Flashback' 
  | 'Wonderkid Evo' 
  | 'Silver Rare';

export interface PlayStylePlusDef {
  id: string;
  name: string;
  category: 'Batting' | 'Bowling' | 'Fielding' | 'Physical' | 'Clutch';
  badgeColor: string;
  shortTag: string;
  description: string;
  inGameEffect: string;
  applicableRoles: PlayerRole[];
}

export interface FCPlayerRatings {
  overall: number; // 50 - 99
  bat: number;     // Batting Mastery & Boundary Power
  bwl: number;     // Bowling Accuracy, Movement & Deception
  spd: number;     // Release Pace (bowler) / Running Between Wickets (batter)
  clu: number;     // Clutch Mentality & Death Over Execution
  fld: number;     // Ground Fielding, Catching & Cannon Arm
  phy: number;     // Physical Stamina, Bounce Resistance & Fitness
}

export interface FCEvolvedCard {
  playerId: string;
  tier: FCCardTier;
  ovrBoost: number;
  unlockedPlayStyles: string[];
  evolutionLevel: number;
  dynamicImageGlow?: string;
}

export interface FCPositionPlacement {
  id: string;
  name: string;
  x: number; // 0 to 100 on field (50 = pitch center)
  y: number; // 0 to 100 on field (50 = pitch center)
  zone: 'Inner Ring' | 'Deep Boundary' | 'Slip Cordon' | 'Close In';
  assignedPlayerId?: string;
  assignedPlayerName?: string;
}

export interface FCIQTacticPreset {
  id: string;
  name: string;
  code: string;
  description: string;
  mentality: 'Ultra Defensive' | 'Cautious' | 'Balanced' | 'High Press' | 'Ultra Attacking';
  aggression: number; // 1 - 10
  fieldingIntensity: number; // 1 - 10
  boundaryProtection: 'Heavy Off-side' | 'Heavy Leg-side' | 'Balanced 360' | 'Ring Lockdown';
  keyPlayStyleSynergy: string;
  defaultPositions: FCPositionPlacement[];
}

export interface HawkEyeDRSReview {
  id: string;
  reviewType: 'LBW' | 'Caught Behind' | 'Stumping';
  reviewingTeamId: string;
  batterName: string;
  bowlerName: string;
  originalOnFieldDecision: 'Out' | 'Not Out';
  finalDecision: 'OUT' | 'NOT OUT';
  isOverturned: boolean;
  umpiresCall: boolean;
  snickoSpikeOccurred: boolean;
  ballSpeedKmph: number;
  pitching: 'In Line' | 'Outside Off' | 'Outside Leg';
  impact: 'In Line' | 'Outside Off' | 'Outside Leg';
  wickets: 'Hitting' | "Umpire's Call" | 'Missing';
  impactPointText: string;
  thirdUmpireDialogues: string[];
}

export interface FCEvolutionPath {
  id: string;
  name: string;
  badge: string;
  requiredMaxOvr: number;
  rewardTier: FCCardTier;
  ovrUpgrade: number;
  statUpgrades: Partial<FCPlayerRatings>;
  grantedPlayStyle: PlayStylePlusDef;
  requirements: Array<{
    id: string;
    description: string;
    target: number;
    current: number;
  }>;
}
