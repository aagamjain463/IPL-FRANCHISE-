export interface ChallengeScenario {
  id: string;
  title: string;
  tagline: string;
  difficulty: 'Medium' | 'Hard' | 'Extreme';
  userTeamId: string;
  opponentTeamId: string;
  targetRuns: number;
  ballsRemaining: number;
  wicketsRemaining: number;
  initialInnings1Score: { runs: number; wickets: number; overs: number };
  initialInnings2Score: { runs: number; wickets: number; oversCompleted: number; ballsInOver: number };
  description: string;
  keyTacticalObjective: string;
  rewardPoints: number;
}

export const SCENARIO_CHALLENGES: ChallengeScenario[] = [
  {
    id: 'ch_defend_12',
    title: 'Death Over Miracle: Defend 12 off 6',
    tagline: 'Final Over Thriller vs Russell & Rinku',
    difficulty: 'Hard',
    userTeamId: 'csk',
    opponentTeamId: 'kkr',
    targetRuns: 198,
    ballsRemaining: 6,
    wicketsRemaining: 3,
    initialInnings1Score: { runs: 197, wickets: 6, overs: 20 },
    initialInnings2Score: { runs: 186, wickets: 7, oversCompleted: 19, ballsInOver: 0 },
    description: 'You are defending 12 runs in the 20th over at Eden Gardens against the most dangerous finishing duo in T20 history.',
    keyTacticalObjective: 'Execute the perfect yorker / slower ball mix to prevent any boundaries.',
    rewardPoints: 500
  },
  {
    id: 'ch_chase_50',
    title: 'The Impossible Chase: 50 off 18 Balls',
    tagline: 'Required Rate 16.67 RPO',
    difficulty: 'Extreme',
    userTeamId: 'rcb',
    opponentTeamId: 'mi',
    targetRuns: 225,
    ballsRemaining: 18,
    wicketsRemaining: 5,
    initialInnings1Score: { runs: 224, wickets: 4, overs: 20 },
    initialInnings2Score: { runs: 175, wickets: 5, oversCompleted: 17, ballsInOver: 0 },
    description: 'Bumrah has 1 over remaining, while Coetzee and Hardik will bowl the other two. Target the right matchups to pull off an epic heist.',
    keyTacticalObjective: 'Attack the 5th bowler while neutralizing Bumrah with smart singles and twos.',
    rewardPoints: 1000
  },
  {
    id: 'ch_pp_collapse',
    title: 'Crisis Rescue: 28/4 in Powerplay',
    tagline: 'Rebuild the innings from ruin',
    difficulty: 'Medium',
    userTeamId: 'rr',
    opponentTeamId: 'srh',
    targetRuns: 0, // batting 1st
    ballsRemaining: 84, // 14 overs left
    wicketsRemaining: 6,
    initialInnings1Score: { runs: 28, wickets: 4, overs: 6 },
    initialInnings2Score: { runs: 0, wickets: 0, oversCompleted: 0, ballsInOver: 0 },
    description: 'The top order has been demolished by swinging pace. Consolidate in the middle overs, then explode at the death to post a defensible 175+ total.',
    keyTacticalObjective: 'Rotate strike safely to over 15, then switch to aggressive hitting.',
    rewardPoints: 400
  },
  {
    id: 'ch_low_defense',
    title: 'Chepauk Fortress: Defend 135 on a Turner',
    tagline: 'Spin web mastery',
    difficulty: 'Hard',
    userTeamId: 'csk',
    opponentTeamId: 'gt',
    targetRuns: 136,
    ballsRemaining: 120,
    wicketsRemaining: 10,
    initialInnings1Score: { runs: 135, wickets: 8, overs: 20 },
    initialInnings2Score: { runs: 0, wickets: 0, oversCompleted: 0, ballsInOver: 0 },
    description: 'Chepauk pitch is turning square. Use your spin options, ring fielders, and defensive lines to choke GT in the chase.',
    keyTacticalObjective: 'Maintain tight economy and attack the stumps when batters try to slog.',
    rewardPoints: 650
  },
  {
    id: 'ch_final_clash',
    title: 'The Grand IPL Final: Climax Under Lights',
    tagline: 'CSK vs MI El Clásico for the Trophy',
    difficulty: 'Extreme',
    userTeamId: 'mi',
    opponentTeamId: 'csk',
    targetRuns: 188,
    ballsRemaining: 30, // 5 overs left
    wicketsRemaining: 4,
    initialInnings1Score: { runs: 187, wickets: 6, overs: 20 },
    initialInnings2Score: { runs: 138, wickets: 6, oversCompleted: 15, ballsInOver: 0 },
    description: 'Needs 50 off 30 balls in the IPL Final at Ahmedabad in front of 110,000 spectators! Bring home the 6th star.',
    keyTacticalObjective: 'Keep calm under massive stadium pressure and hit boundaries in the 18th & 19th overs.',
    rewardPoints: 1200
  }
];
