import { GameSave, SAVE_VERSION } from '../types/game';
import { Player } from '../types/cricket';

const RIVAL_MAP: Record<string, string[]> = {
  csk: ['mi', 'rcb'],
  mi: ['csk', 'rcb'],
  rcb: ['csk', 'mi'],
  kkr: ['mi', 'rcb'],
  srh: ['rcb', 'csk'],
  rr: ['mi', 'pbks'],
  dc: ['kkr', 'lsg'],
  gt: ['csk', 'rcb'],
  lsg: ['dc', 'kkr'],
  pbks: ['rr', 'dc']
};

/**
 * Backward-compatible save migration. Old saves (v1) get every new field
 * defaulted so nothing crashes and old campaigns can continue.
 */
export function migrateSave(raw: unknown): GameSave | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as GameSave;
  if (!parsed.userTeamId || !parsed.teams) return null;

  parsed.saveVersion = parsed.saveVersion || SAVE_VERSION;
  parsed.seasonStage = parsed.seasonStage || 'Auction';
  parsed.currentFixtureIndex = parsed.currentFixtureIndex || 0;
  parsed.newsFeed = parsed.newsFeed || [];
  parsed.leagueSchedule = parsed.leagueSchedule || [];
  parsed.standings = parsed.standings || [];
  parsed.youthAcademyPool = parsed.youthAcademyPool || [];
  parsed.tradeOffers = parsed.tradeOffers || [];
  parsed.franchiseAchievements = parsed.franchiseAchievements || [];
  parsed.seasonHistory = parsed.seasonHistory || [];
  parsed.retiredPlayers = parsed.retiredPlayers || [];
  parsed.seasonSummary = parsed.seasonSummary || null;

  // Rivals for extra tension (2 designated AI rivals per franchise)
  if (!parsed.rivalTeamIds || parsed.rivalTeamIds.length === 0) {
    parsed.rivalTeamIds = RIVAL_MAP[parsed.userTeamId] || [];
  }

  // Backfill player extension fields
  Object.values(parsed.allPlayers).forEach(p => {
    const player = p as Player;
    if (player.injuryProneness === undefined) {
      player.injuryProneness = player.age >= 33 ? 40 : player.role.includes('Pace Bowler') ? 28 : 15;
    }
    if (player.energy === undefined) player.energy = Math.max(0, 100 - player.fatigue);
    player.formerTeamIds = player.formerTeamIds || [];
    player.matchRating = player.matchRating ?? 0;
    player.seasonRating = player.seasonRating ?? 0;
    player.careerStats = player.careerStats || {};
    // Ensure all stats maps exist
    player.stats = player.stats || {
      matches: 0, innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, highestScore: 0,
      isNotOutCount: 0, fifties: 0, hundreds: 0, wickets: 0, oversBowled: 0, runsConceded: 0,
      maidens: 0, bestBowlingWickets: 0, bestBowlingRuns: 0, fourWickets: 0, catches: 0,
      stumpings: 0, runOuts: 0, manOfTheMatchCount: 0
    };
  });

  // Backfill team fields
  Object.values(parsed.teams).forEach(t => {
    t.rosterPlayerIds = t.rosterPlayerIds || [];
    t.homePitchType = t.homePitchType || 'Balanced';
    if (!t.playingXI || !t.playingXI.playingXIIds || t.playingXI.playingXIIds.length === 0) {
      const squad = (t.rosterPlayerIds || []).map(id => parsed.allPlayers[id]).filter(Boolean);
      const top11 = squad.slice(0, 11).map(p => p.id);
      t.playingXI = {
        teamId: t.id,
        playingXIIds: top11,
        battingOrder: top11,
        captainId: t.captainId && top11.includes(t.captainId) ? t.captainId : (top11[0] || ''),
        wicketkeeperId: squad.find(p => p.role.includes('Wicketkeeper'))?.id || (top11[0] || ''),
        powerplayBowlerIds: [],
        deathBowlerIds: [],
        mainSpinBowlerIds: [],
        impactPlayerId: squad[11]?.id,
        impactPlayerUsed: false
      };
    }
  });

  if (parsed.auctionState) {
    parsed.auctionState.bidHistory = parsed.auctionState.bidHistory || [];
    parsed.auctionState.soldPlayerRecords = parsed.auctionState.soldPlayerRecords || [];
    parsed.auctionState.unsoldPlayerIds = parsed.auctionState.unsoldPlayerIds || [];
    parsed.auctionState.allPlayerPool = parsed.auctionState.allPlayerPool || [];
  }

  return parsed;
}
