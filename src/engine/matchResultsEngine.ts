import { Player, MatchState, InningsState, BatterScorecard, BowlerScorecard, InjuryStatus } from '../types/cricket';
import { Team } from '../types/team';
import { NewsArticle } from '../types/game';

export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  rating: number; // 1 - 10
  runs: number;
  balls: number;
  wickets: number;
  overs: number;
  runsConceded: number;
  catches: number;
  teamShortName: string;
  teamWon: boolean;
}

export interface MatchResultsSummary {
  playerRatings: Record<string, number>;
  ratedPlayers: PlayerMatchRating[];
  momPlayerId: string;
  momPlayerName: string;
  momDescription: string;
  injuredNews: NewsArticle[];
  injuryMap: Record<string, InjuryStatus>;
  news: NewsArticle[];
}

const INJURY_OPTIONS: { status: InjuryStatus; matches: number }[] = [
  { status: 'Minor Strain (1 match)', matches: 1 },
  { status: 'Hamstring Strain (2 matches)', matches: 2 },
  { status: 'Fracture (4 matches)', matches: 4 }
];

function pickInjuryStatus(): { status: InjuryStatus; matches: number } {
  const r = Math.random();
  if (r < 0.55) return INJURY_OPTIONS[0];
  if (r < 0.9) return INJURY_OPTIONS[1];
  return INJURY_OPTIONS[2];
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function shortName(teamId: string | undefined, teams: Record<string, Team>): string {
  return teamId ? teams[teamId]?.shortName || 'IPL' : 'IPL';
}

/**
 * Applies a completed match to all 22 participants:
 * season stats, rolling form, fatigue, fitness, injuries, match ratings,
 * plus a Man of the Match and supporting narrative.
 */
export function applyMatchResults(
  match: MatchState,
  allPlayers: Record<string, Player>,
  teams: Record<string, Team>,
  medicalLabLevel?: number
): MatchResultsSummary {
  const players = { ...allPlayers };
  const ratedPlayers: PlayerMatchRating[] = [];
  const injuredNews: NewsArticle[] = [];
  const news: NewsArticle[] = [];
  const injuryMap: Record<string, InjuryStatus> = {};
  const winnerId = match.winnerTeamId;
  const inns1 = match.innings1;
  const inns2 = match.innings2;

  const teamIdsInMatch = [match.teamAId, match.teamBId];

  // Count catches/run-outs/stumpings awarded to each fielder exactly once
  const catchCredits: Record<string, number> = {};
  [inns1, inns2].forEach(inn => {
    inn.timeline.forEach(e => {
      if (e.dismissal?.fielderId && (e.dismissal.type === 'Caught' || e.dismissal.type === 'Run Out' || e.dismissal.type === 'Stumped')) {
        catchCredits[e.dismissal.fielderId] = (catchCredits[e.dismissal.fielderId] || 0) + 1;
      }
    });
  });
  Object.entries(catchCredits).forEach(([pid, count]) => {
    if (players[pid]) players[pid].stats.catches += count;
  });

  // Player match rating computation
  const computeRating = (p: Player, batted: BatterScorecard | undefined, bowled: BowlerScorecard | undefined, batTeamWon: boolean): number => {
    let rating = 5.0;
    const runs = batted?.runs || 0;
    const balls = batted?.balls || 0;
    const wickets = bowled?.wickets || 0;
    const overs = bowled?.overs || 0;
    const conceded = bowled?.runsConceded || 0;
    const dots = bowled?.dots || 0;
    const catches = catchCredits[p.id] || 0;

    rating += runs * 0.09;
    if (balls >= 6) {
      const sr = (runs / balls) * 100;
      if (sr >= 150) rating += 1.2;
      else if (sr >= 125) rating += 0.7;
      else if (sr < 90 && balls >= 10) rating -= 0.6;
    }
    rating += wickets * 1.15;
    if (overs >= 3) {
      const econ = conceded / overs;
      if (econ <= 5.5) rating += 1.2;
      else if (econ <= 7.0) rating += 0.6;
      else if (econ >= 11) rating -= 0.8;
    }
    if (dots >= 10) rating += 0.3;
    rating += catches * 0.45;
    if (batTeamWon) rating += 0.35;
    return Number(clamp(rating, 1, 10).toFixed(1));
  };

  const applyInnings = (innings: InningsState) => {
    const batTeam = teams[innings.battingTeamId];
    const batTeamWon = winnerId === innings.battingTeamId;
    const bowTeam = teams[innings.bowlingTeamId];

    Object.values(innings.batterScorecards).forEach(card => {
      const p = players[card.playerId];
      if (!p) return;
      const bowled = innings.bowlerScorecards[card.playerId];
      const rating = computeRating(p, card, bowled, batTeamWon);
      p.matchRating = rating;
      p.seasonRating = p.seasonRating ? Number(((p.seasonRating * 0.7) + (rating * 0.3)).toFixed(1)) : rating;

      // Season stats
      p.stats.innings += 1;
      p.stats.runs += card.runs;
      p.stats.ballsFaced += card.balls;
      p.stats.fours += card.fours;
      p.stats.sixes += card.sixes;
      if (card.runs > p.stats.highestScore) p.stats.highestScore = card.runs;
      if (!card.isOut) p.stats.isNotOutCount += 1;
      if (card.runs >= 50 && card.runs < 100) p.stats.fifties += 1;
      if (card.runs >= 100) p.stats.hundreds += 1;

      // Form shift (rating drives a -0.5..+0.5 swing; win adds a small bonus)
      const formDelta = (rating - 6) * 0.25 + (batTeamWon ? 0.25 : -0.25);
      p.form = Number(clamp(p.form + formDelta, 1, 5).toFixed(2));

      // Morale follows form and result
      p.morale = clamp(p.morale + (batTeamWon ? 2 : -1) + (rating >= 7.5 ? 3 : 0), 20, 100);

      // Fatigue: batting wear (balls faced), keeping wear
      let fatigueDelta = 6 + card.balls * 0.22;
      if (p.role.includes('Wicketkeeper')) fatigueDelta += 6;
      if (p.attributes?.pace && p.attributes.pace >= 85) fatigueDelta += 3;
      p.fatigue = clamp(p.fatigue + fatigueDelta, 0, 100);
      p.energy = clamp(100 - p.fatigue, 0, 100);

      ratedPlayers.push({
        playerId: p.id,
        playerName: p.name,
        rating,
        runs: card.runs,
        balls: card.balls,
        wickets: bowled?.wickets || 0,
        overs: bowled?.overs || 0,
        runsConceded: bowled?.runsConceded || 0,
        catches: catchCredits[p.id] || 0,
        teamShortName: shortName(p.currentTeamId || undefined, teams),
        teamWon: batTeamWon
      });
    });

    Object.values(innings.bowlerScorecards).forEach(card => {
      const p = players[card.playerId];
      if (!p) return;
      const hasBatted = Object.values(innings.batterScorecards).some(c => c.playerId === card.playerId);
      if (hasBatted) return; // rating/stat block handled above
      const rating = computeRating(p, undefined, card, batTeamWon);
      p.matchRating = rating;
      p.seasonRating = p.seasonRating ? Number(((p.seasonRating * 0.7) + (rating * 0.3)).toFixed(1)) : rating;

      p.stats.wickets += card.wickets;
      p.stats.oversBowled += card.overs;
      p.stats.runsConceded += card.runsConceded;
      p.stats.maidens += card.maidens;
      if (card.wickets >= 4) p.stats.fourWickets += 1;
      if (card.wickets > p.stats.bestBowlingWickets || (card.wickets === p.stats.bestBowlingWickets && card.runsConceded < p.stats.bestBowlingRuns)) {
        p.stats.bestBowlingWickets = card.wickets;
        p.stats.bestBowlingRuns = card.runsConceded;
      }

      const formDelta = (rating - 6) * 0.25 + (batTeamWon ? -0.25 : 0.25);
      p.form = Number(clamp(p.form + formDelta, 1, 5).toFixed(2));
      p.morale = clamp(p.morale + (batTeamWon ? -1 : 2) + (rating >= 7.5 ? 3 : 0), 20, 100);
      p.fatigue = clamp(p.fatigue + 8 + (p.attributes?.pace && p.attributes.pace >= 85 ? 6 : 0) + card.overs * 1.1, 0, 100);
      p.energy = clamp(100 - p.fatigue, 0, 100);

      ratedPlayers.push({
        playerId: p.id,
        playerName: p.name,
        rating,
        runs: 0,
        balls: 0,
        wickets: card.wickets,
        overs: card.overs,
        runsConceded: card.runsConceded,
        catches: 0,
        teamShortName: shortName(p.currentTeamId || undefined, teams),
        teamWon: batTeamWon
      });
    });

    // Fielding-only players still get a small rating & form credit
    Object.keys(catchCredits).forEach(fid => {
      const p = players[fid];
      if (!p) return;
      const alreadyRated = ratedPlayers.some(r => r.playerId === fid);
      if (!alreadyRated) {
        p.matchRating = 5.5;
        p.form = Number(clamp(p.form + 0.12, 1, 5).toFixed(2));
        ratedPlayers.push({
          playerId: p.id,
          playerName: p.name,
          rating: 5.5,
          runs: 0,
          balls: 0,
          wickets: 0,
          overs: 0,
          runsConceded: 0,
          catches: catchCredits[fid],
          teamShortName: shortName(p.currentTeamId || undefined, teams),
          teamWon: winnerId === p.currentTeamId
        });
      }
    });
  };

  applyInnings(inns1);
  applyInnings(inns2);

  // Everyone in both XIs played the match
  const participantIds = new Set<string>([...match.teamAXI.playingXIIds, ...match.teamBXI.playingXIIds, ...(match.teamAXI.impactPlayerId ? [match.teamAXI.impactPlayerId] : []), ...(match.teamBXI.impactPlayerId ? [match.teamBXI.impactPlayerId] : [])]);
  participantIds.forEach(pid => {
    const p = players[pid];
    if (!p) return;
    p.stats.matches += 1;
    p.fitness = clamp(p.fitness - (p.fatigue > 70 ? 2 : 0.5), 20, 100);
  });

  // Injury rolls (injuryProneness defaults by age/role when missing)
  // Medical Lab level (1-5) reduces injury risk: level 5 ≈ 55% fewer injuries
  const medProtection = medicalLabLevel && medicalLabLevel > 1 ? 1 - (medicalLabLevel - 1) * 0.14 : 1;
  participantIds.forEach(pid => {
    const p = players[pid];
    if (!p || p.injuryStatus && p.injuryStatus !== 'Fit') return;
    // Per-team medical protection from home franchise's lab (user support upgrades)
    const teamLab = p.currentTeamId ? teams[p.currentTeamId]?.medicalLabLevel : undefined;
    const protection = (teamLab && teamLab > 1 ? 1 - (teamLab - 1) * 0.14 : 1) * medProtection;
    const proneness = p.injuryProneness ?? (p.age >= 33 ? 40 : p.role.includes('Pace Bowler') ? 28 : 15);
    const overworked = p.fatigue > 82 ? 0.05 : 0;
    const risk = ((proneness / 100) * 0.10 + overworked) * protection;
    if (Math.random() < risk) {
      const injury = pickInjuryStatus();
      p.injuryStatus = injury.status;
      p.matchesInjuredRemaining = injury.matches;
      p.morale = clamp(p.morale - 8, 20, 100);
      injuryMap[p.id] = injury.status;
      injuredNews.push({
        id: `news_injury_${p.id}_${Date.now()}`,
        title: `INJURY ALERT: ${p.name} Ruled Out (${injury.status})`,
        category: 'Injury',
        summary: `${p.name} has picked up an injury and is expected to miss ${injury.matches === 1 ? 'the next match' : `the next ${injury.matches} matches`}.`,
        timestampFormatted: `Season ${match.season}`,
        impactRating: p.overall >= 85 ? 'High' : 'Medium',
        teamId: p.currentTeamId || undefined
      });
    }
  });

  // Sort ratings for MoM (runs + wickets*20 + catches*8, tie-broken by rating)
  const sorted = [...ratedPlayers].sort((a, b) => {
    const ptsA = a.runs + a.wickets * 20 + a.catches * 8 + a.rating;
    const ptsB = b.runs + b.wickets * 20 + b.catches * 8 + b.rating;
    return ptsB - ptsA;
  });
  const mom = sorted[0];
  const momDescription = mom
    ? `${mom.playerName} starred with ${mom.runs} runs${mom.wickets ? ` and ${mom.wickets} wickets` : ''} (rating ${mom.rating.toFixed(1)}).`
    : 'A team effort settled the contest.';

  // Update player map back
  Object.keys(players).forEach(k => { allPlayers[k] = players[k]; });

  return {
    playerRatings: Object.fromEntries(ratedPlayers.map(r => [r.playerId, r.rating])),
    ratedPlayers,
    momPlayerId: mom?.playerId || '',
    momPlayerName: mom?.playerName || '',
    momDescription,
    injuredNews,
    injuryMap,
    news: [...injuredNews]
  };
}

/**
 * Rest between matchdays: recover fatigue/fitness, count down injuries, small form bump.
 * Facility levels (optional) scale the recovery: Training center speeds readiness,
 * Medical lab accelerates injury healing and adds injury-prevention.
 */
export function refreshPlayersForMatchday(
  players: Record<string, Player>,
  facilityLevels?: { training?: number; medical?: number; analytics?: number }
): void {
  const trainLvl = facilityLevels?.training || 1;
  const medLvl = facilityLevels?.medical || 1;
  const anaLvl = facilityLevels?.analytics || 1;
  const recoveryMult = 1 + (medLvl - 1) * 0.12; // up to +48% at level 5
  const trainingMult = 1 + (trainLvl - 1) * 0.10; // up to +40% at level 5

  Object.values(players).forEach(p => {
    const rested = p.fatigue > 0;
    const baseRecovery = rested ? 16 : 8;
    p.fatigue = clamp(p.fatigue - baseRecovery * recoveryMult, 0, 100);
    p.energy = clamp(100 - p.fatigue, 0, 100);
    p.fitness = clamp(p.fitness + (p.fatigue < 60 ? 1.5 : 0.5) * trainingMult, 20, 100);
    if (p.injuryStatus && p.injuryStatus !== 'Fit') {
      p.matchesInjuredRemaining = Math.max(0, p.matchesInjuredRemaining - 1);
      if (p.matchesInjuredRemaining === 0) {
        p.injuryStatus = 'Fit';
        p.fatigue = 20;
      }
    }
    // Analytics lab steadies form drift; training sharpens it slightly
    const formDriftRate = 0.03 * (1 - (anaLvl - 1) * 0.12);
    const trainingEdge = (trainLvl - 1) * 0.002;
    p.form = Number(clamp(
      p.form > 3.4 ? p.form - formDriftRate + trainingEdge * 0.2
        : p.form < 2.6 ? p.form + formDriftRate + trainingEdge
        : p.form,
      1, 5
    ).toFixed(2));
  });
}
