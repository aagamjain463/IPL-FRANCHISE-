export type PlayerRole = 'Top-order Batter' | 'Middle-order Batter' | 'Finisher' | 'Wicketkeeper Batter' | 'Batting All-rounder' | 'Bowling All-rounder' | 'Pace Bowler' | 'Spin Bowler';

export type BattingStyle = 'Right-hand bat' | 'Left-hand bat';
export type BowlingStyle = 
  | 'Right-arm fast' 
  | 'Right-arm fast-medium'
  | 'Right-arm medium-fast'
  | 'Right-arm medium' 
  | 'Left-arm fast' 
  | 'Left-arm fast-medium'
  | 'Left-arm medium-fast'
  | 'Left-arm medium' 
  | 'Right-arm offbreak' 
  | 'Right-arm legbreak' 
  | 'Left-arm orthodox' 
  | 'Left-arm chinaman' 
  | 'Left-arm unorthodox'
  | 'None';

export type InjuryStatus = 'Fit' | 'Minor Strain (1 match)' | 'Hamstring Strain (2 matches)' | 'Fracture (4 matches)';

export interface PlayerAttributes {
  // Batting
  power: number; // 0 - 100
  strikeRotation: number;
  boundaryAbility: number;
  paceAbility: number;
  spinAbility: number;
  powerplayBatting: number;
  middleOverBatting: number;
  deathOverBatting: number;
  chasingAbility: number;
  finishing: number;
  wicketPreservation: number;

  // Bowling
  pace: number;
  accuracy: number;
  swing: number;
  seam: number;
  spin: number;
  variation: number;
  powerplayBowling: number;
  middleOverBowling: number;
  deathBowling: number;
  wicketTaking: number;
  economy: number;

  // Mental & General
  fielding: number;
  fitness: number;
  consistency: number;
  pressure: number;
  leadership: number;
  composure: number;
  aggression: number;
  riskTaking: number;
  bigMatchPerformance: number;
}

export interface Player {
  id: string;
  name: string;
  shortName: string;
  age: number;
  nationality: string;
  isOverseas: boolean;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  currentTeamId: string | null; // null if in auction pool
  basePriceCr: number; // in Crores INR e.g. 2.0
  salaryCr: number;
  contractYearsRemaining: number;

  // Ratings
  overall: number; // 50 - 99
  battingRating: number;
  bowlingRating: number;
  potential: number; // 50 - 99

  // Attributes
  attributes: PlayerAttributes;

  // Dynamic status
  form: number; // 1 (frozen) to 5 (on fire)
  confidence: number; // 0 - 100
  fatigue: number; // 0 (fresh) to 100 (exhausted)
  morale: number; // 0 - 100
  fitness: number; // 0 - 100
  injuryStatus: InjuryStatus;
  matchesInjuredRemaining: number;

  // Season Stats (Dynamic)
  stats: {
    matches: number;
    innings: number;
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
    highestScore: number;
    isNotOutCount: number;
    fifties: number;
    hundreds: number;
    wickets: number;
    oversBowled: number;
    runsConceded: number;
    maidens: number;
    bestBowlingWickets: number;
    bestBowlingRuns: number;
    fourWickets: number;
    catches: number;
    stumpings: number;
    runOuts: number;
    manOfTheMatchCount: number;
  };

  // Career / History
  isCapped?: boolean;
  auctionSetCode?: string;
  auctionSetName?: string;
  isYouthProspect?: boolean;
  retired?: boolean;
  avatarColor?: string;
}

export type BatterApproach = 
  | 'Anchor / Conserve' 
  | 'Rotate Strike' 
  | 'Balanced' 
  | 'Aggressive' 
  | 'Maximum Attack' 
  | 'Counter-Attack';

export type ShotPreference = 
  | 'All-Ground (Balanced)'
  | 'Target Leg-Side (Pulls/Sweeps)'
  | 'Target Off-Side (Covers/Point)'
  | 'Straight Down V'
  | 'Ramps & 360 Innovation';

export type RunningRisk = 'Safe' | 'Standard' | 'Aggressive Twos';

export type BowlingPlan = 
  | 'Pinpoint Yorkers' 
  | 'Short-Pitch & Bouncers' 
  | 'Test Match Hard Length' 
  | 'Slower Ball Variations' 
  | 'Wide Outside Off Channel' 
  | 'Attack Stumps'
  | 'Contain Runs'
  | 'Short-ball Plan'
  | 'Yorker Plan'
  | 'Slower-ball Plan'
  | 'Attack Wickets';

export type FieldSetting = 
  | 'Aggressive Cordon (Slips/Ring)' 
  | 'Balanced' 
  | 'Deep Boundary Lockdown (5 Back)' 
  | 'Inner Ring Choke (Cut-off 1s)' 
  | 'Leg-Side Trap' 
  | 'Off-Side Trap'
  | 'Defensive'
  | 'Ring Boundary';

export type PaceVariation = 'Express Pace' | 'Mix Pace & Cutters' | 'Heavy Flight & Drift';

export interface TacticalInstructions {
  batterApproach: BatterApproach;
  shotPreference?: ShotPreference;
  runningRisk?: RunningRisk;
  bowlingPlan: BowlingPlan;
  fieldSetting: FieldSetting;
  paceVariation?: PaceVariation;
  targetBowlerId?: string;
  protectWicket: boolean;
}

export type PitchType = 'Flat (High Scoring)' | 'Green (Pace & Swing)' | 'Dusty (Spin & Turn)' | 'Slow & Sticky (Gripping)' | 'Balanced';
export type WeatherCondition = 'Clear Night' | 'Hot & Humid' | 'Overcast & Breezy' | 'Heavy Dew';

export interface PitchCondition {
  type: PitchType;
  bounce: number; // 0 - 100
  turn: number; // 0 - 100
  paceAssistance: number; // 0 - 100
  dewFactor: number; // 0 (none) to 100 (heavy 2nd innings dew)
  parScore: number; // e.g. 175
}

export type BallEventType = '0' | '1' | '2' | '3' | '4' | '6' | 'WICKET' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';
export type DismissalType = 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket' | 'None';

export type ShotZone = 'Fine Leg' | 'Square Leg' | 'Mid Wicket' | 'Long On' | 'Straight' | 'Long Off' | 'Extra Cover' | 'Cover' | 'Point' | 'Third Man';

export interface BallByBallEvent {
  inningsIndex: number; // 1 or 2
  overNumber: number; // 0 to 19
  ballInOver: number; // 1 to 6 (valid balls)
  totalBallsInInnings: number;
  bowlerId: string;
  bowlerName: string;
  batterId: string;
  batterName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  eventType: BallEventType;
  runsScored: number;
  extras: number;
  isLegalBall: boolean;
  dismissal?: {
    type: DismissalType;
    dismissedPlayerId: string;
    dismissedPlayerName: string;
    fielderId?: string;
    fielderName?: string;
    description: string;
  };
  shotZone?: ShotZone;
  shotSpeedKmph?: number;
  isBoundary: boolean;
  isSix: boolean;
  scoreAfterBall: number;
  wicketsAfterBall: number;
  commentaryText: string;
  aiEnhancedCommentary?: string;
}

export interface BatterScorecard {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  dismissalText: string;
  battingPosition: number;
}

export interface BowlerScorecard {
  playerId: string;
  playerName: string;
  overs: number; // e.g. 3.4
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;
  dots: number;
  wides: number;
  noBalls: number;
}

export interface InningsState {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  oversCompleted: number;
  ballsInCurrentOver: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  batterScorecards: Record<string, BatterScorecard>;
  bowlerScorecards: Record<string, BowlerScorecard>;
  fow: Array<{ wicket: number; score: number; over: string; playerId: string; playerName: string }>;
  recentBalls: BallByBallEvent[];
  timeline: BallByBallEvent[];
  isCompleted: boolean;
  target?: number; // for 2nd innings
}

export interface MatchTacticsState {
  teamATactics: TacticalInstructions;
  teamBTactics: TacticalInstructions;
}

export interface MatchPlayingXI {
  teamId: string;
  playingXIIds: string[]; // 11 players
  impactPlayerId?: string;
  impactPlayerUsed?: boolean;
  captainId: string;
  wicketkeeperId: string;
  battingOrder: string[]; // 11 player IDs in order
  powerplayBowlerIds: string[];
  deathBowlerIds: string[];
  mainSpinBowlerIds: string[];
}

export interface MatchState {
  id: string;
  season: number;
  matchType: 'League' | 'Qualifier 1' | 'Eliminator' | 'Qualifier 2' | 'Final' | 'Quick Match' | 'Challenge';
  teamAId: string;
  teamBId: string;
  venue: string;
  city: string;
  pitch: PitchCondition;
  weather: WeatherCondition;
  tossWinnerId: string;
  tossDecision: 'Bat' | 'Bowl';

  teamAXI: MatchPlayingXI;
  teamBXI: MatchPlayingXI;

  innings1: InningsState;
  innings2: InningsState;
  superOver?: {
    team1Innings: InningsState;
    team2Innings: InningsState;
    winnerId: string;
  };

  currentInningsIndex: 1 | 2 | 3; // 3 for super over
  isMatchCompleted: boolean;
  winnerTeamId?: string;
  resultMarginText?: string;
  manOfTheMatchPlayerId?: string;
  manOfTheMatchDescription?: string;

  tactics: MatchTacticsState;
}

export type { LeagueFixture } from './tournament';
