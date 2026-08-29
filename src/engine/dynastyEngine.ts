import { Player, PlayerRole, BattingStyle, BowlingStyle } from '../types/cricket';

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Dev', 'Dhruv', 'Aryan', 'Samar', 'Kabir', 'Rohan', 'Tanmay', 'Yash', 'Aniket', 'Advait', 'Ishan', 'Reyansh', 'Shaurya'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Singh', 'Rao', 'Iyer', 'Deshmukh', 'Choudhary', 'Bhat', 'Gill', 'Pandey', 'Mishra', 'Gowda', 'Nair'];

export function generateYouthProspect(idSuffix: number): Player {
  const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const name = `${fName} ${lName}`;
  const shortName = `${fName[0]} ${lName}`;
  const age = 18 + Math.floor(Math.random() * 3); // 18 - 20 years old
  
  const roles: PlayerRole[] = ['Top-order Batter', 'Middle-order Batter', 'Finisher', 'Batting All-rounder', 'Bowling All-rounder', 'Pace Bowler', 'Spin Bowler', 'Wicketkeeper Batter'];
  const role = roles[Math.floor(Math.random() * roles.length)];
  const isPacer = role === 'Pace Bowler' || role === 'Bowling All-rounder';
  const isSpinner = role === 'Spin Bowler';
  const isBatter = role === 'Top-order Batter' || role === 'Middle-order Batter' || role === 'Finisher' || role === 'Wicketkeeper Batter';

  const overall = 68 + Math.floor(Math.random() * 8); // 68 - 75
  const potential = 88 + Math.floor(Math.random() * 10); // 88 - 97 (Wonderkid)
  const battingRating = isBatter ? overall + 4 : (isPacer ? 35 : 50);
  const bowlingRating = (isPacer || isSpinner) ? overall + 4 : 25;

  return {
    id: `youth_${Date.now()}_${idSuffix}`,
    name,
    shortName,
    age,
    nationality: 'India',
    isOverseas: false,
    role,
    battingStyle: Math.random() > 0.3 ? 'Right-hand bat' : 'Left-hand bat',
    bowlingStyle: isPacer ? 'Right-arm fast' : (isSpinner ? 'Right-arm legbreak' : 'None'),
    currentTeamId: null,
    basePriceCr: 0.30, // 30 Lakhs
    salaryCr: 0.30,
    contractYearsRemaining: 3,
    overall,
    battingRating,
    bowlingRating,
    potential,
    attributes: {
      power: isBatter ? 85 : 50,
      strikeRotation: isBatter ? 80 : 45,
      boundaryAbility: isBatter ? 84 : 45,
      paceAbility: isBatter ? 82 : 40,
      spinAbility: isBatter ? 84 : 40,
      powerplayBatting: isBatter ? 82 : 30,
      middleOverBatting: isBatter ? 80 : 30,
      deathOverBatting: isBatter ? 86 : 30,
      chasingAbility: isBatter ? 80 : 30,
      finishing: isBatter ? 84 : 30,
      wicketPreservation: 75,
      pace: isPacer ? 92 : 20,
      accuracy: (isPacer || isSpinner) ? 80 : 20,
      swing: isPacer ? 84 : 10,
      seam: isPacer ? 82 : 10,
      spin: isSpinner ? 88 : 10,
      variation: (isPacer || isSpinner) ? 84 : 10,
      powerplayBowling: (isPacer || isSpinner) ? 80 : 20,
      middleOverBowling: (isPacer || isSpinner) ? 82 : 20,
      deathBowling: isPacer ? 86 : 20,
      wicketTaking: (isPacer || isSpinner) ? 85 : 20,
      economy: (isPacer || isSpinner) ? 80 : 20,
      fielding: 88,
      fitness: 94,
      consistency: 78,
      pressure: 86,
      leadership: 70,
      composure: 82,
      aggression: 90,
      riskTaking: 80,
      bigMatchPerformance: 85
    },
    form: 4,
    confidence: 85,
    fatigue: 0,
    morale: 90,
    fitness: 95,
    injuryStatus: 'Fit',
    matchesInjuredRemaining: 0,
    stats: {
      matches: 0, innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
      highestScore: 0, isNotOutCount: 0, fifties: 0, hundreds: 0,
      wickets: 0, oversBowled: 0, runsConceded: 0, maidens: 0,
      bestBowlingWickets: 0, bestBowlingRuns: 0, fourWickets: 0,
      catches: 0, stumpings: 0, runOuts: 0, manOfTheMatchCount: 0
    },
    isYouthProspect: true
  };
}

export function progressPlayerToNextSeason(player: Player): Player {
  const newAge = player.age + 1;
  let overallChange = 0;

  // Growth / Decline curve based on age and potential
  if (newAge <= 24) {
    // Rapid growth phase
    const gap = player.potential - player.overall;
    overallChange = Math.max(1, Math.round(gap * 0.35 * (Math.random() * 0.6 + 0.7)));
  } else if (newAge <= 29) {
    // Peak development
    if (player.overall < player.potential) {
      overallChange = Math.round((player.potential - player.overall) * 0.2);
    } else {
      overallChange = Math.floor(Math.random() * 2);
    }
  } else if (newAge <= 33) {
    // Prime stability
    overallChange = Math.random() > 0.7 ? -1 : (Math.random() > 0.7 ? 1 : 0);
  } else if (newAge <= 37) {
    // Mild age decline
    overallChange = -Math.floor(1 + Math.random() * 2);
  } else {
    // Veteran decline / Retirement possibility
    overallChange = -Math.floor(2 + Math.random() * 3);
  }

  const newOverall = Math.max(55, Math.min(99, player.overall + overallChange));
  const newBatting = Math.max(15, Math.min(99, player.battingRating + overallChange));
  const newBowling = Math.max(15, Math.min(99, player.bowlingRating + overallChange));

  return {
    ...player,
    age: newAge,
    overall: newOverall,
    battingRating: newBatting,
    bowlingRating: newBowling,
    contractYearsRemaining: Math.max(0, player.contractYearsRemaining - 1),
    fitness: 90,
    fatigue: 0,
    form: 3,
    confidence: 80,
    injuryStatus: 'Fit',
    matchesInjuredRemaining: 0,
    stats: {
      matches: 0, innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
      highestScore: 0, isNotOutCount: 0, fifties: 0, hundreds: 0,
      wickets: 0, oversBowled: 0, runsConceded: 0, maidens: 0,
      bestBowlingWickets: 0, bestBowlingRuns: 0, fourWickets: 0,
      catches: 0, stumpings: 0, runOuts: 0, manOfTheMatchCount: 0
    },
    retired: newAge >= 44 || (newAge >= 38 && Math.random() > 0.65)
  };
}
