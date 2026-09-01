import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { GameSave } from '../types/game';

export type CricketPlayStyle = {
  name: string;
  tier: 'Base' | 'Plus' | 'Elite';
  category: 'Batting' | 'Bowling' | 'Fielding' | 'Mental';
  boost: string;
};

export type CardVariant = 'Icon' | 'Marquee' | 'Future Star' | 'Form Surge' | 'Playoff Hero' | 'Core' | 'Recovery';

export const getCricketPlayStyles = (player: Player): CricketPlayStyle[] => {
  const styles: CricketPlayStyle[] = [];
  const a: any = player.attributes || {};
  const tier = (score: number): CricketPlayStyle['tier'] => score >= 92 ? 'Elite' : score >= 84 ? 'Plus' : 'Base';

  if ((player.battingRating || 0) >= 84) {
    const finisherScore = Math.max(a.powerHitting || 0, a.finishing || 0, player.battingRating || 0);
    styles.push({ name: finisherScore >= 88 ? 'Power Finisher' : 'Strike Architect', tier: tier(finisherScore), category: 'Batting', boost: '+ late-over boundary intent' });
  }
  if ((a.temperament || player.overall || 0) >= 84) {
    styles.push({ name: 'Chase Master', tier: tier(a.temperament || player.overall), category: 'Mental', boost: '+ pressure composure' });
  }
  if ((player.bowlingRating || 0) >= 82) {
    const deathScore = Math.max(a.deathBowling || 0, player.bowlingRating || 0);
    styles.push({ name: deathScore >= 88 ? 'Yorker Specialist' : 'Wicket Taker', tier: tier(deathScore), category: 'Bowling', boost: '+ tactical wicket threat' });
  }
  if ((a.fielding || 0) >= 84) {
    styles.push({ name: 'Boundary Rider', tier: tier(a.fielding), category: 'Fielding', boost: '+ run-save impact' });
  }
  if (!styles.length) {
    styles.push({ name: player.role.includes('Bowler') ? 'Control Bowler' : 'Role Specialist', tier: 'Base', category: player.role.includes('Bowler') ? 'Bowling' : 'Batting', boost: '+ role stability' });
  }
  return styles.slice(0, 3);
};

export const getCardVariant = (player: Player, gameState?: GameSave): CardVariant => {
  if (player.injuryStatus && player.injuryStatus !== 'Fit') return 'Recovery';
  if (player.isYouthProspect || player.age <= 22 || player.potential >= 90) return 'Future Star';
  if ((player as any).isMarquee || player.overall >= 90) return 'Marquee';
  if ((player.form || 0) >= 4.4) return 'Form Surge';
  const team = player.currentTeamId ? gameState?.teams[player.currentTeamId] : null;
  if (team && team.titlesWon >= 4 && player.overall >= 86) return 'Icon';
  return 'Core';
};

export const getTacticalIdentity = (team: Team, players: Record<string, Player>) => {
  const squad = (team.rosterPlayerIds || []).map(id => players[id]).filter(Boolean);
  const hitters = squad.filter(p => ((p.attributes as any)?.powerHitting || p.battingRating || 0) >= 84).length;
  const spinners = squad.filter(p => /spin|orthodox|break/i.test(p.bowlingStyle || '')).length;
  const pacers = squad.filter(p => /fast|medium/i.test(p.bowlingStyle || '')).length;
  const youth = squad.filter(p => p.age <= 24 || p.isYouthProspect).length;
  const death = squad.filter(p => (p.attributes?.deathBowling || 0) >= 82).length;

  const candidates = [
    { name: 'Powerplay Blitz', score: hitters * 14 + team.aiPersonality.battingPriority, summary: 'Explosive starts and fearless boundary pressure.' },
    { name: 'Spin Web', score: spinners * 18 + team.aiPersonality.bowlingPriority, summary: 'Middle-overs squeeze through turn, matchups and field traps.' },
    { name: 'Pace Battery', score: pacers * 16 + team.aiPersonality.riskTolerance, summary: 'Hard lengths, powerplay carry and death-over hostility.' },
    { name: 'Youth Revolution', score: youth * 18 + team.aiPersonality.youthPreference, summary: 'High-potential squad building with aggressive development minutes.' },
    { name: 'Death Overs Dominion', score: death * 20 + team.aiPersonality.analyticsPreference, summary: 'Yorkers, matchup planning and closing games under pressure.' }
  ].sort((a, b) => b.score - a.score);

  return candidates[0] || { name: 'Balanced Dynasty', score: 50, summary: 'Flexible squad construction across every phase.' };
};

export const getVenueProfile = (team?: Team) => {
  const city = team?.city || '';
  const venue = team?.homeVenue || 'Franchise Stadium';
  const lower = `${city} ${venue}`.toLowerCase();
  if (lower.includes('chennai')) return { venue, pitch: 'Spin Fortress', dew: 'Low', firstInningsPar: 171, homeEdge: '+9%', note: 'Finger spin and matchup control decide the middle overs.' };
  if (lower.includes('mumbai') || lower.includes('wankhede')) return { venue, pitch: 'Chase Theatre', dew: 'High', firstInningsPar: 192, homeEdge: '+7%', note: 'Dew rewards chasing, pace-on hitting and death-over nerve.' };
  if (lower.includes('bengaluru') || lower.includes('chinnaswamy')) return { venue, pitch: 'Six-Hitting Dome', dew: 'High', firstInningsPar: 205, homeEdge: '+5%', note: 'Short boundaries create pressure on defensive bowling plans.' };
  if (lower.includes('kolkata') || lower.includes('eden')) return { venue, pitch: 'Momentum Arena', dew: 'Medium', firstInningsPar: 184, homeEdge: '+8%', note: 'Crowd momentum swings can flip innings in a single over.' };
  return { venue, pitch: team?.homePitchType || 'Balanced Stadium', dew: 'Medium', firstInningsPar: 182, homeEdge: '+6%', note: 'Balanced conditions reward adaptable XIs and flexible batting roles.' };
};

export const getBoardMandate = (team: Team, gameState: GameSave) => {
  if (team.titlesWon >= 4) return { title: 'Win Now Dynasty', demand: 'Reach the Final and sign one marquee-level game changer.', pressure: 'Extreme' };
  if ((gameState.seasonStage || '').includes('Auction')) return { title: 'Auction Statement', demand: 'Build a legal 18+ player squad without destroying future purse flexibility.', pressure: 'High' };
  if (team.fanSentiment < 55) return { title: 'Repair the Fanbase', demand: 'Win a rivalry match and restore matchday belief.', pressure: 'High' };
  return { title: 'Playoff Push', demand: 'Finish top four while developing one Indian core player.', pressure: 'Medium' };
};

export const getLiveSeasonEvent = (gameState: GameSave) => {
  const stage = gameState.seasonStage || 'LeagueStage';
  if (stage === 'Auction') return { name: 'Auction Week', reward: 'Scout Tokens + Marquee Intel', timer: 'LIVE', color: '#D4AF37' };
  if (stage === 'SeasonEnd') return { name: 'Final Fever Awards', reward: 'Champion Cards + Legacy XP', timer: 'ENDS AFTER RECAP', color: '#FFE27D' };
  const idx = gameState.currentFixtureIndex || 0;
  if (idx > (gameState.leagueSchedule?.length || 1) * 0.72) return { name: 'Playoff Push', reward: 'Pressure PlayStyle Boosts', timer: 'FINAL RUN', color: '#FF1E56' };
  return { name: 'Rivalry Week', reward: 'Fan Pulse + Manager XP', timer: 'THIS MATCHDAY', color: '#00E5FF' };
};

export const getCareerStories = (gameState: GameSave) => {
  const team = gameState.teams[gameState.userTeamId];
  const squad = (team?.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const youth = squad.find(p => p.age <= 23 || p.isYouthProspect);
  const star = [...squad].sort((a, b) => b.overall - a.overall)[0];
  const rivalId = gameState.rivalTeamIds?.[0];
  const rival = rivalId ? gameState.teams[rivalId] : null;
  return [
    youth ? `${youth.name} is trending as a possible Future Star evolution candidate.` : 'Scouts want academy investment before the next intake window.',
    star ? `${star.name} is the locker-room reference point for your tactical identity.` : 'The board expects an auction headline signing to energize fans.',
    rival ? `${rival.name} are watching your auction targets and preparing a rivalry statement.` : 'League rivals are adjusting to your management style.'
  ];
};

export const getPreMatchBriefing = (gameState: GameSave) => {
  const fixture = gameState.leagueSchedule?.find(f => !f.isPlayed && (f.teamAId === gameState.userTeamId || f.teamBId === gameState.userTeamId)) || gameState.leagueSchedule?.[gameState.currentFixtureIndex];
  if (!fixture) return null;
  const a = gameState.teams[fixture.teamAId];
  const b = gameState.teams[fixture.teamBId];
  const userTeam = gameState.teams[gameState.userTeamId];
  const venue = getVenueProfile(a);
  const userXI = userTeam?.playingXI?.playingXIIds || [];
  const xiAvg = userXI.length ? Math.round(userXI.reduce((sum, id) => sum + (gameState.allPlayers[id]?.overall || 0), 0) / userXI.length) : 0;
  const oppId = fixture.teamAId === gameState.userTeamId ? fixture.teamBId : fixture.teamAId;
  const opp = gameState.teams[oppId];
  const oppSquad = (opp?.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const oppPower = oppSquad.length ? Math.round(oppSquad.slice(0, 11).reduce((s, p) => s + p.overall, 0) / Math.min(11, oppSquad.length)) : 78;
  const winProb = Math.max(25, Math.min(75, 50 + (xiAvg - oppPower) * 1.8 + (a?.id === gameState.userTeamId ? 4 : 0)));
  return {
    title: `${a?.shortName || 'T1'} vs ${b?.shortName || 'T2'}`,
    fixture,
    venue,
    winProb: Math.round(winProb),
    keyBattle: oppSquad[0] ? `Contain ${oppSquad[0].name} before the tactical timeout.` : 'Win the powerplay and protect death-over matchups.',
    advice: venue.dew === 'High' ? 'Consider chasing if you win the toss; dew can add late batting value.' : 'Prioritize role clarity and matchup bowling through overs 7-15.'
  };
};

export const getRivalrySnapshot = (gameState: GameSave) => {
  const team = gameState.teams[gameState.userTeamId];
  const rivalId = gameState.rivalTeamIds?.[0];
  const rival = rivalId ? gameState.teams[rivalId] : null;
  const rivalry = rivalId ? gameState.progression?.rivalries?.[rivalId] : null;
  return {
    name: rival ? `${team?.shortName || 'YOU'} vs ${rival.shortName}` : 'Derby Watch',
    rivalName: rival?.name || 'Nearest Rival',
    intensity: rivalry?.intensity || 'Fierce',
    record: rivalry ? `${rivalry.userWins}-${rivalry.opponentWins}` : '0-0',
    hook: rival ? `${rival.shortName} can change your board confidence and fan sentiment in one night.` : 'Rivalries unlock higher pressure rewards.'
  };
};
