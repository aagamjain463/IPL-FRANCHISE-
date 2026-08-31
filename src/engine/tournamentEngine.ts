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

export function getPlayoffTeams(standings: StandingsRow[]): string[] {
  return standings.slice(0, 4).map(r => r.teamId);
}

export function isLeagueStageComplete(schedule: TournamentFixture[]): boolean {
  return schedule.length > 0 && schedule.every(f => f.isPlayed && f.stage === 'League');
}

/**
 * Authentic IPL playoff fixtures from the final league table:
 * Q1: 1 v 2 (winner → Final), Eliminator: 3 v 4 (winner → Q2),
 * Q2: Q1 loser v Eliminator winner (winner → Final), Final.
 * Q1/Eliminators play at the higher seed's home venue.
 */
export function generatePlayoffFixtures(
  standings: StandingsRow[],
  season: number,
  startMatchNumber: number
): TournamentFixture[] {
  const teams = getPlayoffTeams(standings);
  if (teams.length < 4) return [];
  const venueOf = (teamId: string, teamsMap?: Record<string, any>): { venue: string; city: string } => {
    const t = teamsMap?.[teamId];
    return { venue: t?.homeVenue || 'IPL Playoff Arena', city: t?.city || 'India' };
  };

  const q1venue = venueOf(teams[0]);
  const elimVenue = venueOf(teams[2]);

  return [
    {
      id: `po_q1_${season}`,
      matchNumber: startMatchNumber,
      stage: 'Qualifier 1',
      teamAId: teams[0],
      teamBId: teams[1],
      venue: q1venue.venue,
      city: q1venue.city,
      isPlayed: false
    },
    {
      id: `po_elim_${season}`,
      matchNumber: startMatchNumber + 1,
      stage: 'Eliminator',
      teamAId: teams[2],
      teamBId: teams[3],
      venue: elimVenue.venue,
      city: elimVenue.city,
      isPlayed: false
    },
    {
      id: `po_q2_${season}`,
      matchNumber: startMatchNumber + 2,
      stage: 'Qualifier 2',
      teamAId: '', // resolved after Q1 + Eliminator
      teamBId: '',
      venue: 'Playoff Theatre',
      city: 'India',
      isPlayed: false
    },
    {
      id: `po_final_${season}`,
      matchNumber: startMatchNumber + 3,
      stage: 'Final',
      teamAId: '',
      teamBId: '',
      venue: 'IPL Grand Final Stadium',
      city: 'India',
      isPlayed: false
    }
  ];
}

export function resolvePlayoffFixtures(
  schedule: TournamentFixture[],
  teams: Record<string, any>
): TournamentFixture[] {
  const winnerOf = (f?: TournamentFixture) => (f ? ((f as any).winnerTeamId || f.matchResult?.winnerTeamId || '') : '');
  const q1 = schedule.find(s => s.stage === 'Qualifier 1');
  const elim = schedule.find(s => s.stage === 'Eliminator');
  const q2 = schedule.find(s => s.stage === 'Qualifier 2');

  return schedule.map(f => {
    if (f.stage === 'Qualifier 1' || f.stage === 'Eliminator') return f;

    if (f.stage === 'Qualifier 2' && q1?.isPlayed && elim?.isPlayed) {
      const q1Loser = q1.teamAId === winnerOf(q1) ? q1.teamBId : q1.teamAId;
      const elimWinner = winnerOf(elim);
      const homeTeam = teams[elimWinner] || teams[q1Loser];
      return {
        ...f,
        teamAId: q1Loser,
        teamBId: elimWinner,
        venue: homeTeam?.homeVenue || f.venue,
        city: homeTeam?.city || f.city
      };
    }
    if (f.stage === 'Final' && q1?.isPlayed && q2?.isPlayed) {
      const q1Winner = winnerOf(q1);
      const q2Winner = winnerOf(q2);
      const homeTeam = teams[q1Winner] || teams[q2Winner];
      return {
        ...f,
        teamAId: q1Winner,
        teamBId: q2Winner,
        venue: homeTeam?.homeVenue || f.venue,
        city: homeTeam?.city || f.city
      };
    }
    return f;
  });
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

    // Qualification Prob: ~15 pts usually secures a top-4 finish in a 10-team 18-game league
    const effectiveWins = row.points / 2;
    const winRate = row.played > 0 ? effectiveWins / row.played : 0.5;
    const gamesLeft = 18 - row.played;
    const winsNeeded = Math.max(0, 14.5 - effectiveWins);
    const expectedFutureWins = winRate * gamesLeft;
    const qualificationProbability = Math.min(98, Math.max(2, Math.round(50 + (expectedFutureWins - winsNeeded) * 14 + row.nrr * 9)));

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
