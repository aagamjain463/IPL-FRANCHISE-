import { Team } from '../types/team';
import { Player } from '../types/cricket';
import { StandingsRow, TournamentFixture, SeasonAwards } from '../types/tournament';

export function initStandings(teams: Record<string, Team>): StandingsRow[] {
  return Object.values(teams).map(t => ({
    teamId: t.id,
    teamName: t.name,
    teamShortName: t.shortName,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    noResult: 0,
    points: 0,
    nrr: 0.0,
    runsFor: 0,
    oversFor: 0,
    runsAgainst: 0,
    oversAgainst: 0,
    recentForm: [],
    streak: '-',
    qualificationProbability: 40
  }));
}

export function generateLeagueSchedule(teams: Record<string, Team>): TournamentFixture[] {
  const teamList = Object.values(teams);
  const fixtures: TournamentFixture[] = [];
  let matchCounter = 1;

  // Generate home and away / round-robin matches
  for (let i = 0; i < teamList.length; i++) {
    for (let j = i + 1; j < teamList.length; j++) {
      const teamA = teamList[i];
      const teamB = teamList[j];

      // Match 1: at Team A's home
      fixtures.push({
        id: `fix_${matchCounter}`,
        matchNumber: matchCounter,
        stage: 'League',
        teamAId: teamA.id,
        teamBId: teamB.id,
        venue: teamA.homeVenue,
        city: teamA.city,
        isPlayed: false
      });
      matchCounter++;

      // Match 2: at Team B's home
      fixtures.push({
        id: `fix_${matchCounter}`,
        matchNumber: matchCounter,
        stage: 'League',
        teamAId: teamB.id,
        teamBId: teamA.id,
        venue: teamB.homeVenue,
        city: teamB.city,
        isPlayed: false
      });
      matchCounter++;
    }
  }

  // Shuffle fixtures slightly so teams play alternately
  for (let k = fixtures.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    const temp = fixtures[k];
    fixtures[k] = fixtures[r];
    fixtures[r] = temp;
    fixtures[k].matchNumber = k + 1;
  }
  fixtures[0].matchNumber = 1;

  return fixtures;
}

export function updateStandingsWithMatch(
  standings: StandingsRow[],
  teamAId: string,
  teamBId: string,
  winnerTeamId: string | undefined,
  teamARuns: number,
  teamAOvers: number,
  teamBRuns: number,
  teamBOvers: number
): StandingsRow[] {
  return standings.map(row => {
    if (row.teamId !== teamAId && row.teamId !== teamBId) return row;

    const isTeamA = row.teamId === teamAId;
    const runsScored = isTeamA ? teamARuns : teamBRuns;
    const oversFaced = isTeamA ? teamAOvers : teamBOvers;
    const runsConceded = isTeamA ? teamBRuns : teamARuns;
    const oversBowled = isTeamA ? teamBOvers : teamAOvers;

    const played = row.played + 1;
    let won = row.won;
    let lost = row.lost;
    let tied = row.tied;
    let points = row.points;
    const recentForm = [...row.recentForm];

    if (!winnerTeamId) {
      tied += 1;
      points += 1;
      recentForm.push('T');
    } else if (winnerTeamId === row.teamId) {
      won += 1;
      points += 2;
      recentForm.push('W');
    } else {
      lost += 1;
      recentForm.push('L');
    }

    if (recentForm.length > 5) recentForm.shift();

    const runsForTotal = row.runsFor + runsScored;
    const oversForTotal = row.oversFor + oversFaced;
    const runsAgainstTotal = row.runsAgainst + runsConceded;
    const oversAgainstTotal = row.oversAgainst + oversBowled;

    const forRate = oversForTotal > 0 ? runsForTotal / oversForTotal : 0;
    const againstRate = oversAgainstTotal > 0 ? runsAgainstTotal / oversAgainstTotal : 0;
    const nrr = Number((forRate - againstRate).toFixed(3));

    // Streak calculation
    let streakCount = 1;
    for (let i = recentForm.length - 1; i > 0; i--) {
      if (recentForm[i] === recentForm[i - 1]) streakCount++;
      else break;
    }
    const lastResult = recentForm[recentForm.length - 1] || 'W';
    const streak = `${streakCount}${lastResult}`;

    // Qualification Prob
    const qualificationProbability = Math.min(100, Math.max(5, Math.round((points / 28) * 100 + (nrr * 10))));

    return {
      ...row,
      played,
      won,
      lost,
      tied,
      points,
      runsFor: runsForTotal,
      oversFor: oversForTotal,
      runsAgainst: runsAgainstTotal,
      oversAgainst: oversAgainstTotal,
      nrr,
      recentForm,
      streak,
      qualificationProbability
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.nrr - a.nrr;
  });
}

export function calculateSeasonAwards(
  allPlayers: Record<string, Player>,
  teams: Record<string, Team>,
  standings: StandingsRow[],
  finalWinnerTeamId: string,
  finalRunnerUpTeamId: string
): SeasonAwards {
  const players = Object.values(allPlayers);

  // Orange Cap
  const sortedBatters = [...players].sort((a, b) => b.stats.runs - a.stats.runs);
  const orange = sortedBatters[0] || players[0];

  // Purple Cap
  const sortedBowlers = [...players].sort((a, b) => b.stats.wickets - a.stats.wickets);
  const purple = sortedBowlers[0] || players[0];

  // MVP (runs * 1 + wickets * 25 + catches * 10)
  const sortedMVP = [...players].sort((a, b) => {
    const ptsA = a.stats.runs + (a.stats.wickets * 25) + (a.stats.catches * 10);
    const ptsB = b.stats.runs + (b.stats.wickets * 25) + (b.stats.catches * 10);
    return ptsB - ptsA;
  });
  const mvp = sortedMVP[0] || players[0];

  // Emerging Player (age <= 23 with highest performance)
  const youngsters = players.filter(p => p.age <= 23).sort((a, b) => {
    const ptsA = a.stats.runs + a.stats.wickets * 20;
    const ptsB = b.stats.runs + b.stats.wickets * 20;
    return ptsB - ptsA;
  });
  const emerging = youngsters[0] || players[0];

  const getShortName = (p: Player) => {
    if (!p.currentTeamId) return 'IPL';
    return teams[p.currentTeamId]?.shortName || 'IPL';
  };

  return {
    orangeCap: {
      playerId: orange.id,
      playerName: orange.name,
      teamShortName: getShortName(orange),
      runs: orange.stats.runs
    },
    purpleCap: {
      playerId: purple.id,
      playerName: purple.name,
      teamShortName: getShortName(purple),
      wickets: purple.stats.wickets
    },
    mvp: {
      playerId: mvp.id,
      playerName: mvp.name,
      teamShortName: getShortName(mvp),
      pts: mvp.stats.runs + (mvp.stats.wickets * 25)
    },
    emergingPlayer: {
      playerId: emerging.id,
      playerName: emerging.name,
      teamShortName: getShortName(emerging),
      reason: `Breakthrough season with ${emerging.stats.runs} runs & ${emerging.stats.wickets} wickets!`
    },
    championTeamId: finalWinnerTeamId,
    runnerUpTeamId: finalRunnerUpTeamId,
    biggestSurpriseTeamId: standings[0]?.teamId || 'csk'
  };
}
