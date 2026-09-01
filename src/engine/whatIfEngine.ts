import { MatchState, Player, MatchPlayingXI, TacticalInstructions } from '../types/cricket';
import { Team } from '../types/team';
import { WhatIfComparisonResult } from '../types/game';
import { initMatchState, simulateFullMatch } from './cricketEngine';

export interface WhatIfSimulationResult {
  scenarioName: string;
  originalWinRate: number;
  alternativeWinRate: number;
  sampleSize: number;
  averageScoreOriginal: number;
  averageScoreAlternative: number;
  tacticalInsight: string;
}

export function runMonteCarloComparison(
  userTeam: Team,
  opponentTeam: Team,
  allPlayers: Record<string, Player>,
  planA: { name: string; battingApproach: any; bowlingPlan: any; fieldSetting: any },
  planB: { name: string; battingApproach: any; bowlingPlan: any; fieldSetting: any },
  iterations: number = 50
): WhatIfComparisonResult {
  const userXI: MatchPlayingXI = {
    teamId: userTeam.id,
    playingXIIds: userTeam.rosterPlayerIds.slice(0, 11),
    captainId: userTeam.captainId,
    wicketkeeperId: userTeam.wicketkeeperId,
    battingOrder: userTeam.rosterPlayerIds.slice(0, 11),
    powerplayBowlerIds: userTeam.rosterPlayerIds.slice(0, 2),
    deathBowlerIds: userTeam.rosterPlayerIds.slice(0, 2),
    mainSpinBowlerIds: userTeam.rosterPlayerIds.slice(2, 4)
  };

  const oppXI: MatchPlayingXI = {
    teamId: opponentTeam.id,
    playingXIIds: opponentTeam.rosterPlayerIds.slice(0, 11),
    captainId: opponentTeam.captainId,
    wicketkeeperId: opponentTeam.wicketkeeperId,
    battingOrder: opponentTeam.rosterPlayerIds.slice(0, 11),
    powerplayBowlerIds: opponentTeam.rosterPlayerIds.slice(0, 2),
    deathBowlerIds: opponentTeam.rosterPlayerIds.slice(0, 2),
    mainSpinBowlerIds: opponentTeam.rosterPlayerIds.slice(2, 4)
  };

  let winsA = 0;
  let totalScoreA = 0;
  let totalWicketsA = 0;

  let winsB = 0;
  let totalScoreB = 0;
  let totalWicketsB = 0;

  for (let i = 0; i < iterations; i++) {
    // Run with Plan A
    const matchA = initMatchState(
      `sim_a_${i}`,
      2026,
      userTeam.id,
      opponentTeam.id,
      userTeam.homeVenue,
      userTeam.city,
      JSON.parse(JSON.stringify(userXI)),
      JSON.parse(JSON.stringify(oppXI)),
      allPlayers,
      'League',
      'Balanced'
    );
    matchA.tactics.teamATactics.batterApproach = planA.battingApproach;
    matchA.tactics.teamATactics.bowlingPlan = planA.bowlingPlan;
    const finA = simulateFullMatch(matchA, allPlayers);
    if (finA.winnerTeamId === userTeam.id) winsA++;
    totalScoreA += finA.innings1.totalRuns;
    totalWicketsA += finA.innings1.wickets;

    // Run with Plan B
    const matchB = initMatchState(
      `sim_b_${i}`,
      2026,
      userTeam.id,
      opponentTeam.id,
      userTeam.homeVenue,
      userTeam.city,
      JSON.parse(JSON.stringify(userXI)),
      JSON.parse(JSON.stringify(oppXI)),
      allPlayers,
      'League',
      'Balanced'
    );
    matchB.tactics.teamATactics.batterApproach = planB.battingApproach;
    matchB.tactics.teamATactics.bowlingPlan = planB.bowlingPlan;
    const finB = simulateFullMatch(matchB, allPlayers);
    if (finB.winnerTeamId === userTeam.id) winsB++;
    totalScoreB += finB.innings1.totalRuns;
    totalWicketsB += finB.innings1.wickets;
  }

  const winPctA = Math.round((winsA / iterations) * 100);
  const winPctB = Math.round((winsB / iterations) * 100);
  const avgScoreA = Math.round(totalScoreA / iterations);
  const avgScoreB = Math.round(totalScoreB / iterations);
  const avgWicketsA = Number((totalWicketsA / iterations).toFixed(1));
  const avgWicketsB = Number((totalWicketsB / iterations).toFixed(1));

  let rec = '';
  if (winPctA > winPctB + 4) {
    rec = `${planA.name} (+${winPctA - winPctB}% higher win expectancy)`;
  } else if (winPctB > winPctA + 4) {
    rec = `${planB.name} (+${winPctB - winPctA}% higher win expectancy)`;
  } else {
    rec = 'Statistically Even (~50/50 baseline)';
  }

  return {
    iterations,
    planA: {
      name: planA.name,
      winPercentage: winPctA,
      avgScore: avgScoreA,
      avgWicketsLost: avgWicketsA
    },
    planB: {
      name: planB.name,
      winPercentage: winPctB,
      avgScore: avgScoreB,
      avgWicketsLost: avgWicketsB
    },
    analysisRecommendation: rec
  };
}
