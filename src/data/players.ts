import { Player, PlayerAttributes, PlayerRole, BattingStyle, BowlingStyle, BattingPlayStyle, BowlingPlayStyle, PlayerTrait } from '../types/cricket';

function createAttributes(
  power: number,
  strikeRotation: number,
  boundaryAbility: number,
  paceAbility: number,
  spinAbility: number,
  powerplayBatting: number,
  middleOverBatting: number,
  deathOverBatting: number,
  chasingAbility: number,
  finishing: number,
  wicketPreservation: number,
  pace: number,
  accuracy: number,
  swing: number,
  seam: number,
  spin: number,
  variation: number,
  powerplayBowling: number,
  middleOverBowling: number,
  deathBowling: number,
  wicketTaking: number,
  economy: number,
  fielding: number,
  fitness: number,
  consistency: number,
  pressure: number,
  leadership: number,
  composure: number,
  aggression: number,
  riskTaking: number,
  bigMatchPerformance: number
): PlayerAttributes {
  return {
    power, strikeRotation, boundaryAbility, paceAbility, spinAbility,
    powerplayBatting, middleOverBatting, deathOverBatting, chasingAbility, finishing, wicketPreservation,
    pace, accuracy, swing, seam, spin, variation,
    powerplayBowling, middleOverBowling, deathBowling, wicketTaking, economy,
    fielding, fitness, consistency, pressure, leadership, composure, aggression, riskTaking, bigMatchPerformance
  };
}

function derivePlaystyleAndTraits(
  id: string,
  name: string,
  role: PlayerRole,
  battingRating: number,
  bowlingRating: number,
  attrs: PlayerAttributes
): { battingPlaystyle?: BattingPlayStyle; bowlingPlaystyle?: BowlingPlayStyle; playstyle: string; traits: PlayerTrait[] } {
  // Explicit Superstar Mappings
  const explicit: Record<string, { batting?: BattingPlayStyle; bowling?: BowlingPlayStyle; traits: PlayerTrait[] }> = {
    'csk_dhoni': { batting: 'Death Specialist', traits: ['Clutch Finisher', 'Pressure Absorber', 'Captain Fantastic'] },
    'csk_ruturaj': { batting: 'Anchor', traits: ['Captain Fantastic', 'Pressure Absorber'] },
    'csk_jadeja': { batting: 'Anchor', bowling: 'Economy Monster', traits: ['Chepauk Spin Master', 'Boundary Rider'] },
    'csk_dube': { batting: 'Spin Destroyer', traits: ['Chepauk Spin Master', 'Wankhede Six Hitter'] },
    'csk_pathirana': { bowling: 'Yorker Specialist', traits: ['Clutch Finisher'] },
    'mi_rohit': { batting: 'Power Hitter', traits: ['Wankhede Six Hitter', 'Captain Fantastic'] },
    'mi_bumrah': { bowling: 'Yorker Specialist', traits: ['Clutch Finisher', 'Iron Man'] },
    'mi_surya': { batting: '360 Batter', traits: ['Wankhede Six Hitter', 'Clutch Finisher'] },
    'mi_hardik': { batting: 'Death Specialist', bowling: 'Variation Expert', traits: ['Captain Fantastic', 'Clutch Finisher'] },
    'rcb_kohli': { batting: 'Chase Master', traits: ['Pressure Absorber', 'Iron Man', 'Captain Fantastic'] },
    'rcb_siraj': { bowling: 'Swing Master', traits: ['Clutch Finisher'] },
    'kkr_rinku': { batting: 'Death Specialist', traits: ['Clutch Finisher', 'Pressure Absorber'] },
    'kkr_russell': { batting: 'Power Hitter', bowling: 'Death Specialist', traits: ['Wankhede Six Hitter', 'Clutch Finisher'] },
    'kkr_narine': { batting: 'Power Hitter', bowling: 'Mystery Spinner', traits: ['Chepauk Spin Master'] },
    'srh_klaasen': { batting: 'Spin Destroyer', traits: ['Wankhede Six Hitter', 'Clutch Finisher'] },
    'srh_head': { batting: 'Power Hitter', traits: ['Breakout Prodigy', 'Wankhede Six Hitter'] },
    'srh_cummins': { bowling: 'Economy Monster', traits: ['Captain Fantastic', 'Clutch Finisher'] },
    'rr_samson': { batting: 'Power Hitter', traits: ['Captain Fantastic'] },
    'rr_chahal': { bowling: 'Mystery Spinner', traits: ['Chepauk Spin Master', 'Clutch Finisher'] },
    'gt_gill': { batting: 'Anchor', traits: ['Captain Fantastic', 'Breakout Prodigy'] },
    'gt_rashid': { bowling: 'Mystery Spinner', batting: 'Death Specialist', traits: ['Clutch Finisher'] },
    'dc_pant': { batting: '360 Batter', traits: ['Clutch Finisher', 'Captain Fantastic'] },
    'dc_kuldeep': { bowling: 'Mystery Spinner', traits: ['Chepauk Spin Master'] },
    'lsg_pooran': { batting: 'Power Hitter', traits: ['Wankhede Six Hitter', 'Clutch Finisher'] },
    'lsg_mayank': { bowling: 'Express Pace', traits: ['Breakout Prodigy'] }
  };

  const override = explicit[id];
  let battingPlaystyle: BattingPlayStyle | undefined = override?.batting;
  let bowlingPlaystyle: BowlingPlayStyle | undefined = override?.bowling;
  const traits: PlayerTrait[] = override?.traits || [];

  if (!battingPlaystyle && battingRating >= 70) {
    if (attrs.deathOverBatting >= 90 || attrs.finishing >= 90) battingPlaystyle = 'Death Specialist';
    else if (attrs.chasingAbility >= 88) battingPlaystyle = 'Chase Master';
    else if (attrs.spinAbility >= 90) battingPlaystyle = 'Spin Destroyer';
    else if (attrs.power >= 90) battingPlaystyle = 'Power Hitter';
    else if (attrs.strikeRotation >= 88 && attrs.wicketPreservation >= 85) battingPlaystyle = 'Anchor';
    else if (attrs.boundaryAbility >= 90) battingPlaystyle = '360 Batter';
    else battingPlaystyle = 'Power Hitter';
  }

  if (!bowlingPlaystyle && bowlingRating >= 70) {
    if (attrs.deathBowling >= 90 || attrs.accuracy >= 92) bowlingPlaystyle = 'Yorker Specialist';
    else if (attrs.pace >= 92) bowlingPlaystyle = 'Express Pace';
    else if (attrs.swing >= 88) bowlingPlaystyle = 'Swing Master';
    else if (attrs.spin >= 88) bowlingPlaystyle = 'Mystery Spinner';
    else if (attrs.economy >= 88) bowlingPlaystyle = 'Economy Monster';
    else if (attrs.powerplayBowling >= 88) bowlingPlaystyle = 'Powerplay Specialist';
    else bowlingPlaystyle = 'Variation Expert';
  }

  if (traits.length === 0) {
    if (attrs.pressure >= 90) traits.push('Pressure Absorber');
    if (attrs.bigMatchPerformance >= 92) traits.push('Clutch Finisher');
    if (attrs.leadership >= 90) traits.push('Captain Fantastic');
    if (attrs.fielding >= 92) traits.push('Boundary Rider');
  }

  const playstyle = battingPlaystyle || bowlingPlaystyle || (role.includes('Bowler') ? 'Pace Dominator' : 'Power Hitter');
  return { battingPlaystyle, bowlingPlaystyle, playstyle, traits };
}

function makePlayer(
  id: string,
  name: string,
  shortName: string,
  age: number,
  nationality: string,
  isOverseas: boolean,
  role: PlayerRole,
  battingStyle: BattingStyle,
  bowlingStyle: BowlingStyle,
  basePriceCr: number,
  overall: number,
  battingRating: number,
  bowlingRating: number,
  potential: number,
  attrs: PlayerAttributes,
  teamId: string | null = null,
  salaryCr: number = basePriceCr
): Player {
  const { battingPlaystyle, bowlingPlaystyle, playstyle, traits } = derivePlaystyleAndTraits(
    id, name, role, battingRating, bowlingRating, attrs
  );

  return {
    id,
    name,
    shortName,
    age,
    nationality,
    isOverseas,
    role,
    battingStyle,
    bowlingStyle,
    currentTeamId: teamId,
    basePriceCr,
    salaryCr,
    contractYearsRemaining: 3,
    overall,
    battingRating,
    bowlingRating,
    potential,
    battingPlaystyle,
    bowlingPlaystyle,
    playstyle,
    traits,
    attributes: attrs,
    form: 4,
    confidence: 85,
    fatigue: 0,
    morale: 85,
    fitness: attrs.fitness,
    injuryStatus: 'Fit',
    matchesInjuredRemaining: 0,
    stats: {
      matches: 0, innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0,
      highestScore: 0, isNotOutCount: 0, fifties: 0, hundreds: 0,
      wickets: 0, oversBowled: 0, runsConceded: 0, maidens: 0,
      bestBowlingWickets: 0, bestBowlingRuns: 0, fourWickets: 0,
      catches: 0, stumpings: 0, runOuts: 0, manOfTheMatchCount: 0
    }
  };
}

// 240+ Verified IPL Stars, International Superstars, Domestic Capped & Emerging Prodigies
export const INITIAL_PLAYERS: Player[] = [
  // ================= CSK CORE & SUPERSTARS =================
  makePlayer('csk_dhoni', 'MS Dhoni', 'M Dhoni', 43, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 2.0, 89, 88, 10, 89,
    createAttributes(92, 78, 90, 88, 85, 70, 82, 98, 97, 99, 88, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 88, 85, 90, 99, 99, 99, 78, 65, 98), 'csk', 4.0),
  makePlayer('csk_ruturaj', 'Ruturaj Gaikwad', 'R Gaikwad', 27, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 92, 93, 35, 95,
    createAttributes(82, 92, 89, 90, 93, 92, 94, 86, 92, 85, 93, 20, 40, 20, 20, 45, 30, 20, 30, 15, 30, 40, 90, 92, 94, 88, 90, 92, 75, 55, 89), 'csk', 18.0),
  makePlayer('csk_jadeja', 'Ravindra Jadeja', 'R Jadeja', 35, 'India', false, 'All-rounder' as PlayerRole, 'Left-hand bat', 'Left-arm orthodox', 2.0, 93, 88, 92, 93,
    createAttributes(86, 84, 86, 85, 86, 75, 82, 92, 88, 90, 86, 76, 94, 70, 72, 91, 88, 82, 92, 86, 88, 94, 99, 95, 92, 94, 85, 92, 78, 60, 95), 'csk', 18.0),
  makePlayer('csk_dube', 'Shivam Dube', 'S Dube', 31, 'India', false, 'Middle-order Batter', 'Left-hand bat', 'Right-arm medium', 2.0, 88, 91, 50, 88,
    createAttributes(98, 72, 97, 78, 99, 70, 96, 88, 84, 88, 74, 72, 60, 55, 55, 40, 50, 50, 60, 45, 55, 60, 72, 80, 82, 84, 60, 80, 92, 85, 85), 'csk', 12.0),
  makePlayer('csk_pathirana', 'Matheesha Pathirana', 'M Pathirana', 21, 'Sri Lanka', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 91, 25, 94, 97,
    createAttributes(30, 25, 30, 25, 25, 20, 20, 30, 25, 25, 30, 97, 89, 82, 84, 10, 95, 78, 85, 99, 96, 91, 80, 88, 86, 90, 65, 88, 85, 75, 90), 'csk', 13.0),
  makePlayer('csk_rachin', 'Rachin Ravindra', 'R Ravindra', 24, 'New Zealand', true, 'Top-order Batter', 'Left-hand bat', 'Left-arm orthodox', 1.5, 89, 91, 78, 95,
    createAttributes(86, 92, 88, 90, 92, 94, 90, 84, 92, 82, 92, 20, 78, 15, 15, 84, 76, 50, 78, 45, 72, 80, 88, 92, 90, 88, 78, 90, 80, 60, 90), 'csk', 1.8),
  makePlayer('csk_deshpande', 'Tushar Deshpande', 'T Deshpande', 29, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium', 1.0, 83, 30, 84, 85,
    createAttributes(35, 30, 35, 30, 30, 25, 25, 35, 25, 30, 30, 86, 78, 82, 80, 10, 75, 84, 78, 80, 85, 76, 82, 85, 80, 78, 60, 76, 80, 70, 78), 'csk', 6.5),
  makePlayer('csk_conway', 'Devon Conway', 'D Conway', 33, 'New Zealand', true, 'Wicketkeeper Batter', 'Left-hand bat', 'Right-arm medium', 2.0, 90, 92, 20, 90,
    createAttributes(85, 94, 88, 92, 94, 95, 92, 86, 94, 84, 94, 15, 20, 10, 10, 10, 10, 10, 10, 10, 10, 10, 88, 86, 92, 90, 80, 92, 70, 50, 92), null, 2.0),
  makePlayer('csk_shardul', 'Shardul Thakur', 'S Thakur', 32, 'India', false, 'Bowling All-rounder', 'Right-hand bat', 'Right-arm medium', 2.0, 86, 78, 86, 86,
    createAttributes(88, 72, 86, 78, 80, 60, 72, 92, 82, 88, 68, 86, 80, 82, 84, 10, 82, 82, 80, 88, 90, 80, 86, 88, 82, 90, 80, 88, 92, 85, 90), null, 4.0),
  makePlayer('csk_moeen', 'Moeen Ali', 'M Ali', 37, 'England', true, 'Batting All-rounder', 'Left-hand bat', 'Right-arm offbreak', 2.0, 88, 88, 84, 88,
    createAttributes(94, 80, 92, 86, 95, 88, 90, 86, 85, 84, 80, 20, 86, 15, 15, 86, 82, 60, 88, 55, 82, 84, 88, 84, 86, 88, 82, 88, 88, 75, 88), null, 8.0),

  // ================= MI CORE & SUPERSTARS =================
  makePlayer('mi_rohit', 'Rohit Sharma', 'R Sharma', 37, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 93, 95, 30, 93,
    createAttributes(96, 88, 97, 96, 92, 98, 90, 91, 92, 88, 86, 20, 35, 20, 20, 40, 25, 20, 30, 10, 25, 35, 84, 82, 88, 95, 96, 94, 90, 78, 96), 'mi', 16.3),
  makePlayer('mi_bumrah', 'Jasprit Bumrah', 'J Bumrah', 30, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 99, 30, 99, 99,
    createAttributes(35, 30, 35, 30, 30, 20, 20, 35, 30, 30, 45, 96, 99, 94, 96, 10, 99, 97, 98, 99, 99, 99, 88, 94, 98, 99, 90, 98, 80, 60, 99), 'mi', 18.0),
  makePlayer('mi_surya', 'Suryakumar Yadav', 'S Yadav', 33, 'India', false, 'Middle-order Batter', 'Right-hand bat', 'Right-arm medium', 2.0, 96, 98, 20, 96,
    createAttributes(99, 92, 99, 98, 98, 85, 99, 98, 96, 96, 88, 15, 20, 10, 10, 20, 10, 10, 10, 10, 10, 10, 94, 92, 96, 96, 88, 98, 95, 85, 96), 'mi', 16.35),
  makePlayer('mi_hardik', 'Hardik Pandya', 'H Pandya', 30, 'India', false, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm fast-medium', 2.0, 93, 91, 91, 93,
    createAttributes(97, 82, 96, 92, 90, 75, 88, 97, 92, 96, 82, 88, 86, 82, 86, 10, 88, 86, 84, 90, 90, 84, 94, 92, 90, 96, 94, 95, 92, 82, 96), 'mi', 16.35),
  makePlayer('mi_tilak', 'Tilak Varma', 'T Varma', 21, 'India', false, 'Middle-order Batter', 'Left-hand bat', 'Right-arm offbreak', 2.0, 89, 91, 60, 96,
    createAttributes(90, 88, 89, 88, 92, 80, 92, 92, 92, 90, 86, 20, 60, 15, 15, 68, 55, 30, 60, 30, 55, 65, 92, 95, 90, 90, 75, 90, 82, 65, 90), 'mi', 8.0),
  makePlayer('auc_ishankishan', 'Ishan Kishan', 'I Kishan', 26, 'India', false, 'Wicketkeeper Batter', 'Left-hand bat', 'None', 2.0, 90, 92, 10, 94,
    createAttributes(97, 80, 96, 94, 90, 98, 86, 88, 90, 84, 76, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 90, 92, 86, 88, 75, 88, 96, 90, 90), null, 15.25),
  makePlayer('mi_thushara', 'Nuwan Thushara', 'N Thushara', 29, 'Sri Lanka', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 1.0, 86, 15, 88, 88,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 94, 90, 92, 88, 10, 92, 90, 85, 96, 94, 86, 84, 88, 88, 90, 70, 88, 88, 75, 88), null, 4.8),
  makePlayer('mi_naman_dhir', 'Naman Dhir', 'N Dhir', 24, 'India', false, 'Middle-order Batter', 'Right-hand bat', 'Right-arm offbreak', 0.5, 83, 86, 65, 92,
    createAttributes(94, 80, 92, 88, 90, 82, 88, 92, 86, 90, 78, 20, 65, 15, 15, 70, 55, 30, 60, 30, 55, 65, 90, 94, 84, 86, 75, 88, 94, 85, 86), 'mi', 2.0),
  makePlayer('mi_coetzee', 'Gerald Coetzee', 'G Coetzee', 23, 'South Africa', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 88, 65, 89, 95,
    createAttributes(75, 60, 75, 70, 65, 50, 60, 80, 70, 78, 60, 96, 82, 84, 88, 10, 88, 88, 82, 94, 92, 80, 88, 94, 86, 88, 75, 92, 90, 80, 90), null, 5.0),
  makePlayer('mi_madhwal', 'Akash Madhwal', 'A Madhwal', 30, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast-medium', 1.0, 84, 20, 86, 86,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 25, 88, 88, 80, 82, 10, 94, 82, 80, 95, 92, 84, 84, 86, 85, 88, 70, 88, 80, 65, 88), null, 1.0),

  // ================= RCB CORE & SUPERSTARS =================
  makePlayer('rcb_kohli', 'Virat Kohli', 'V Kohli', 35, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm medium', 2.0, 97, 98, 30, 97,
    createAttributes(92, 99, 96, 98, 95, 96, 97, 95, 99, 94, 98, 20, 40, 20, 20, 30, 15, 10, 20, 10, 15, 25, 98, 99, 99, 98, 98, 98, 88, 70, 99), 'rcb', 21.0),
  makePlayer('rcb_patidar', 'Rajat Patidar', 'R Patidar', 31, 'India', false, 'Middle-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 89, 92, 20, 91,
    createAttributes(98, 84, 96, 90, 99, 78, 98, 92, 88, 90, 80, 15, 20, 10, 10, 25, 10, 10, 10, 10, 10, 10, 88, 90, 88, 90, 75, 92, 92, 82, 94), 'rcb', 11.0),
  makePlayer('rcb_yash_dayal', 'Yash Dayal', 'Y Dayal', 26, 'India', false, 'Pace Bowler', 'Left-hand bat', 'Left-arm fast-medium', 1.5, 86, 20, 88, 90,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 25, 88, 88, 92, 86, 10, 90, 90, 82, 92, 90, 86, 85, 90, 86, 88, 70, 88, 80, 65, 88), 'rcb', 5.0),
  makePlayer('rcb_faf', 'Faf du Plessis', 'F du Plessis', 40, 'South Africa', true, 'Top-order Batter', 'Right-hand bat', 'Right-arm legbreak', 2.0, 91, 93, 20, 91,
    createAttributes(92, 90, 94, 94, 90, 96, 92, 88, 90, 85, 88, 15, 20, 10, 10, 25, 15, 10, 15, 10, 15, 20, 96, 96, 92, 94, 96, 94, 85, 70, 94), null, 7.0),
  makePlayer('rcb_maxwell', 'Glenn Maxwell', 'G Maxwell', 35, 'Australia', true, 'Batting All-rounder', 'Right-hand bat', 'Right-arm offbreak', 2.0, 91, 93, 86, 91,
    createAttributes(99, 80, 99, 96, 98, 85, 95, 96, 92, 95, 72, 20, 86, 15, 15, 88, 84, 65, 90, 60, 86, 85, 97, 92, 84, 92, 85, 94, 98, 95, 95), null, 11.0),
  makePlayer('rcb_siraj', 'Mohammed Siraj', 'M Siraj', 30, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 91, 20, 93, 93,
    createAttributes(25, 20, 25, 20, 20, 10, 10, 25, 20, 20, 30, 96, 92, 95, 94, 10, 88, 98, 86, 90, 94, 88, 88, 94, 90, 92, 75, 94, 85, 70, 92), null, 7.0),
  makePlayer('rcb_green', 'Cameron Green', 'C Green', 25, 'Australia', true, 'Batting All-rounder', 'Right-hand bat', 'Right-arm fast', 2.0, 91, 91, 88, 95,
    createAttributes(96, 84, 94, 94, 90, 86, 92, 95, 90, 94, 84, 92, 84, 82, 86, 10, 86, 88, 85, 88, 88, 82, 94, 96, 88, 92, 80, 90, 92, 80, 92), null, 17.5),
  makePlayer('rcb_jacks', 'Will Jacks', 'W Jacks', 25, 'England', true, 'Top-order Batter', 'Right-hand bat', 'Right-arm offbreak', 1.5, 89, 93, 72, 94,
    createAttributes(98, 82, 97, 95, 96, 95, 96, 92, 92, 88, 76, 20, 72, 15, 15, 78, 65, 40, 70, 45, 68, 75, 90, 92, 86, 88, 75, 88, 96, 90, 90), null, 3.2),
  makePlayer('rcb_anuj_rawat', 'Anuj Rawat', 'A Rawat', 24, 'India', false, 'Wicketkeeper Batter', 'Left-hand bat', 'None', 0.5, 82, 84, 10, 89,
    createAttributes(90, 78, 88, 86, 84, 75, 82, 90, 82, 88, 76, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 86, 90, 80, 82, 65, 82, 88, 80, 82), null, 3.4),
  makePlayer('rcb_lomror', 'Mahipal Lomror', 'M Lomror', 24, 'India', false, 'Middle-order Batter', 'Left-hand bat', 'Left-arm orthodox', 0.5, 83, 86, 65, 90,
    createAttributes(95, 76, 92, 84, 94, 68, 86, 94, 84, 92, 74, 20, 68, 15, 15, 72, 60, 30, 68, 35, 60, 68, 86, 90, 82, 84, 70, 86, 92, 85, 86), null, 1.0),

  // ================= KKR CORE & SUPERSTARS =================
  makePlayer('kkr_rinku', 'Rinku Singh', 'R Singh', 26, 'India', false, 'Finisher', 'Left-hand bat', 'Right-arm offbreak', 2.0, 93, 95, 20, 96,
    createAttributes(98, 92, 97, 94, 96, 75, 92, 99, 99, 99, 92, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 96, 98, 96, 99, 85, 98, 90, 75, 98), 'kkr', 13.0),
  makePlayer('kkr_russell', 'Andre Russell', 'A Russell', 36, 'West Indies', true, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm fast', 2.0, 94, 95, 90, 94,
    createAttributes(99, 74, 99, 96, 98, 70, 94, 99, 94, 99, 70, 95, 84, 80, 85, 10, 94, 84, 85, 95, 96, 82, 92, 88, 88, 94, 85, 95, 98, 95, 98), 'kkr', 12.0),
  makePlayer('kkr_narine', 'Sunil Narine', 'S Narine', 36, 'West Indies', true, 'All-rounder' as PlayerRole, 'Left-hand bat', 'Right-arm offbreak', 2.0, 95, 92, 97, 95,
    createAttributes(99, 68, 99, 96, 97, 99, 88, 82, 85, 82, 60, 20, 99, 15, 15, 98, 99, 94, 98, 95, 96, 99, 86, 88, 96, 96, 90, 98, 99, 98, 97), 'kkr', 12.0),
  makePlayer('kkr_varun', 'Varun Chakaravarthy', 'V Chakaravarthy', 32, 'India', false, 'Spin Bowler', 'Right-hand bat', 'Right-arm legbreak', 2.0, 92, 20, 95, 93,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 20, 97, 15, 15, 98, 99, 88, 98, 92, 98, 95, 80, 88, 94, 94, 75, 94, 80, 65, 94), 'kkr', 12.0),
  makePlayer('kkr_harshit', 'Harshit Rana', 'H Rana', 22, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 1.5, 88, 40, 90, 95,
    createAttributes(45, 35, 45, 35, 35, 20, 25, 45, 30, 35, 35, 94, 88, 86, 88, 10, 92, 90, 88, 94, 92, 86, 88, 94, 88, 90, 75, 92, 88, 75, 90), 'kkr', 4.0),
  makePlayer('kkr_ramandeep', 'Ramandeep Singh', 'R Singh', 27, 'India', false, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm medium', 1.0, 85, 88, 78, 90,
    createAttributes(96, 78, 94, 88, 90, 65, 84, 96, 88, 94, 75, 75, 78, 70, 72, 10, 75, 65, 75, 70, 76, 75, 94, 94, 86, 88, 75, 88, 94, 85, 88), 'kkr', 4.0),
  makePlayer('auc_iyer', 'Shreyas Iyer', 'S Iyer', 29, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm legbreak', 2.0, 93, 94, 30, 94,
    createAttributes(90, 92, 91, 90, 98, 90, 96, 92, 95, 90, 92, 15, 20, 10, 10, 30, 15, 10, 15, 10, 15, 25, 92, 92, 94, 96, 96, 95, 82, 60, 96), null, 12.25),
  makePlayer('auc_starc', 'Mitchell Starc', 'M Starc', 34, 'Australia', true, 'Pace Bowler', 'Left-hand bat', 'Left-arm fast', 2.0, 93, 50, 96, 93,
    createAttributes(60, 45, 60, 50, 50, 20, 25, 60, 40, 50, 40, 98, 92, 98, 94, 10, 95, 98, 86, 98, 98, 88, 90, 92, 90, 96, 85, 96, 90, 75, 98), null, 24.75),
  makePlayer('auc_phil_salt', 'Phil Salt', 'P Salt', 27, 'England', true, 'Wicketkeeper Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 91, 94, 10, 94,
    createAttributes(98, 85, 97, 96, 92, 99, 90, 88, 90, 85, 78, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 90, 92, 88, 90, 75, 92, 98, 92, 92), null, 1.5),
  makePlayer('kkr_venkatesh', 'Venkatesh Iyer', 'V Iyer', 29, 'India', false, 'Middle-order Batter', 'Left-hand bat', 'Right-arm medium', 2.0, 89, 91, 70, 90,
    createAttributes(94, 84, 93, 88, 94, 88, 92, 90, 90, 88, 84, 75, 70, 65, 68, 10, 70, 60, 68, 65, 68, 70, 88, 90, 88, 94, 80, 92, 88, 75, 95), null, 8.0),

  // ================= SRH CORE & SUPERSTARS =================
  makePlayer('srh_cummins', 'Pat Cummins', 'P Cummins', 31, 'Australia', true, 'Bowling All-rounder', 'Right-hand bat', 'Right-arm fast', 2.0, 94, 84, 94, 94,
    createAttributes(92, 75, 90, 85, 82, 60, 75, 94, 86, 90, 75, 95, 94, 88, 92, 10, 92, 94, 90, 94, 95, 90, 94, 96, 94, 99, 99, 98, 85, 70, 98), 'srh', 20.5),
  makePlayer('srh_head', 'Travis Head', 'T Head', 30, 'Australia', true, 'Top-order Batter', 'Left-hand bat', 'Right-arm offbreak', 2.0, 95, 98, 60, 95,
    createAttributes(99, 88, 99, 99, 95, 99, 94, 88, 94, 88, 80, 20, 60, 15, 15, 65, 55, 30, 60, 30, 55, 65, 92, 94, 92, 96, 85, 98, 99, 95, 98), 'srh', 14.0),
  makePlayer('srh_abhishek', 'Abhishek Sharma', 'A Sharma', 23, 'India', false, 'Top-order Batter', 'Left-hand bat', 'Left-arm orthodox', 2.0, 92, 96, 75, 97,
    createAttributes(99, 84, 99, 98, 96, 99, 94, 86, 90, 85, 76, 20, 78, 15, 15, 82, 74, 50, 80, 45, 74, 80, 90, 94, 88, 90, 78, 94, 99, 96, 94), 'srh', 14.0),
  makePlayer('srh_klaasen', 'Heinrich Klaasen', 'H Klaasen', 33, 'South Africa', true, 'Wicketkeeper Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 96, 98, 20, 96,
    createAttributes(99, 88, 99, 96, 99, 80, 99, 99, 97, 99, 85, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 94, 94, 96, 98, 88, 98, 95, 85, 98), 'srh', 23.0),
  makePlayer('srh_nitish', 'Nitish Kumar Reddy', 'N Reddy', 21, 'India', false, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm medium-fast', 1.5, 88, 90, 85, 96,
    createAttributes(94, 85, 92, 90, 90, 82, 92, 92, 90, 90, 84, 86, 84, 84, 84, 10, 86, 84, 82, 86, 88, 82, 92, 96, 88, 90, 78, 90, 88, 75, 90), 'srh', 6.0),
  makePlayer('srh_bhuvi', 'Bhuvneshwar Kumar', 'B Kumar', 34, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium', 2.0, 89, 40, 92, 89,
    createAttributes(40, 35, 40, 35, 35, 20, 20, 40, 30, 35, 45, 82, 99, 98, 94, 10, 96, 99, 88, 96, 95, 96, 88, 88, 96, 94, 85, 96, 75, 55, 95), null, 4.2),
  makePlayer('srh_natarajan', 'T Natarajan', 'T Natarajan', 33, 'India', false, 'Pace Bowler', 'Left-hand bat', 'Left-arm medium', 2.0, 89, 15, 92, 89,
    createAttributes(15, 15, 15, 15, 15, 10, 10, 15, 10, 10, 20, 86, 96, 82, 84, 10, 99, 80, 82, 99, 97, 92, 82, 86, 90, 92, 70, 92, 75, 60, 92), null, 4.0),
  makePlayer('srh_markram', 'Aiden Markram', 'A Markram', 29, 'South Africa', true, 'Middle-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 90, 92, 75, 91,
    createAttributes(90, 90, 90, 90, 92, 84, 94, 88, 92, 86, 92, 20, 75, 15, 15, 80, 72, 45, 74, 45, 70, 78, 94, 92, 92, 94, 95, 94, 75, 55, 92), null, 4.0),
  makePlayer('srh_samad', 'Abdul Samad', 'A Samad', 22, 'India', false, 'Finisher', 'Right-hand bat', 'Right-arm legbreak', 1.0, 84, 87, 60, 92,
    createAttributes(97, 72, 96, 88, 90, 65, 80, 97, 86, 95, 70, 20, 60, 15, 15, 65, 50, 25, 55, 25, 50, 60, 88, 90, 82, 85, 70, 85, 96, 90, 86), null, 4.0),
  makePlayer('srh_umran', 'Umran Malik', 'U Malik', 24, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 1.5, 85, 15, 87, 93,
    createAttributes(15, 15, 15, 15, 15, 10, 10, 15, 10, 10, 20, 99, 78, 75, 78, 10, 76, 86, 88, 85, 92, 75, 84, 95, 80, 82, 65, 82, 90, 80, 84), null, 4.0),

  // ================= RR CORE & SUPERSTARS =================
  makePlayer('rr_samson', 'Sanju Samson', 'S Samson', 29, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 93, 95, 20, 94,
    createAttributes(96, 88, 96, 96, 96, 96, 94, 90, 92, 88, 86, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 92, 92, 95, 94, 94, 88, 75, 94), 'rr', 18.0),
  makePlayer('rr_jaiswal', 'Yashasvi Jaiswal', 'Y Jaiswal', 22, 'India', false, 'Top-order Batter', 'Left-hand bat', 'Right-arm legbreak', 2.0, 94, 96, 40, 98,
    createAttributes(97, 92, 97, 98, 95, 99, 94, 88, 94, 88, 90, 20, 45, 20, 20, 50, 35, 20, 35, 15, 30, 45, 94, 98, 94, 92, 82, 94, 95, 88, 96), 'rr', 18.0),
  makePlayer('rr_parag', 'Riyan Parag', 'R Parag', 22, 'India', false, 'Middle-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 90, 93, 75, 96,
    createAttributes(96, 88, 95, 92, 96, 82, 95, 94, 92, 94, 88, 20, 76, 15, 15, 80, 72, 45, 78, 45, 74, 78, 94, 96, 90, 92, 80, 92, 90, 80, 92), 'rr', 14.0),
  makePlayer('rr_sandeeep', 'Sandeep Sharma', 'S Sharma', 31, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium', 1.5, 89, 30, 91, 89,
    createAttributes(30, 25, 30, 25, 25, 15, 15, 30, 20, 20, 35, 78, 98, 96, 92, 10, 96, 96, 86, 98, 94, 95, 88, 88, 96, 96, 85, 98, 70, 50, 95), 'rr', 4.0),
  makePlayer('auc_buttler', 'Jos Buttler', 'J Buttler', 33, 'England', true, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 2.0, 94, 96, 10, 94,
    createAttributes(98, 92, 98, 98, 96, 98, 95, 94, 98, 94, 90, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 92, 95, 98, 94, 98, 88, 72, 98), null, 10.0),
  makePlayer('rr_chahal', 'Yuzvendra Chahal', 'Y Chahal', 34, 'India', false, 'Spin Bowler', 'Right-hand bat', 'Right-arm legbreak', 2.0, 93, 10, 96, 93,
    createAttributes(10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 15, 20, 98, 15, 15, 99, 98, 82, 99, 92, 99, 96, 82, 85, 96, 96, 80, 96, 80, 65, 96), null, 6.5),
  makePlayer('rr_boult', 'Trent Boult', 'T Boult', 35, 'New Zealand', true, 'Pace Bowler', 'Right-hand bat', 'Left-arm fast-medium', 2.0, 92, 35, 94, 92,
    createAttributes(40, 30, 40, 30, 30, 15, 15, 35, 25, 30, 35, 89, 98, 99, 95, 10, 92, 99, 86, 90, 96, 92, 90, 90, 96, 95, 85, 96, 80, 65, 96), null, 8.0),
  makePlayer('rr_hetmyer', 'Shimron Hetmyer', 'S Hetmyer', 27, 'West Indies', true, 'Finisher', 'Left-hand bat', 'None', 2.0, 90, 93, 10, 92,
    createAttributes(99, 78, 98, 92, 96, 65, 88, 99, 95, 99, 78, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 90, 90, 90, 95, 80, 95, 92, 82, 94), 'rr', 11.0),
  makePlayer('rr_dhruv', 'Dhruv Jurel', 'D Jurel', 23, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 1.5, 88, 90, 10, 95,
    createAttributes(94, 88, 92, 90, 92, 80, 90, 94, 94, 94, 88, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 96, 90, 92, 80, 94, 85, 70, 92), 'rr', 14.0),
  makePlayer('rr_avesh', 'Avesh Khan', 'A Khan', 27, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 87, 25, 89, 89,
    createAttributes(25, 20, 25, 20, 20, 10, 15, 25, 20, 20, 30, 95, 86, 84, 88, 10, 84, 90, 82, 92, 92, 82, 85, 90, 86, 88, 75, 86, 88, 75, 88), null, 10.0),

  // ================= GT CORE & SUPERSTARS =================
  makePlayer('gt_gill', 'Shubman Gill', 'S Gill', 24, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 94, 96, 30, 97,
    createAttributes(90, 96, 94, 96, 96, 97, 96, 90, 96, 90, 96, 15, 25, 15, 15, 30, 15, 10, 20, 10, 15, 25, 92, 96, 96, 96, 92, 96, 78, 58, 96), 'gt', 16.5),
  makePlayer('gt_rashid', 'Rashid Khan', 'R Khan', 25, 'Afghanistan', true, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm legbreak', 2.0, 96, 88, 98, 98,
    createAttributes(96, 76, 94, 88, 92, 60, 75, 98, 92, 96, 75, 25, 99, 20, 20, 99, 99, 94, 99, 96, 99, 99, 96, 98, 99, 99, 95, 99, 90, 75, 99), 'gt', 18.0),
  makePlayer('gt_sai_sudharsan', 'Sai Sudharsan', 'S Sudharsan', 22, 'India', false, 'Top-order Batter', 'Left-hand bat', 'Right-arm legbreak', 2.0, 90, 93, 30, 96,
    createAttributes(86, 94, 90, 92, 94, 94, 94, 88, 94, 88, 95, 15, 30, 15, 15, 40, 25, 15, 25, 10, 20, 30, 90, 95, 94, 90, 80, 94, 75, 55, 94), 'gt', 8.5),
  makePlayer('gt_tewatia', 'Rahul Tewatia', 'R Tewatia', 31, 'India', false, 'Finisher', 'Left-hand bat', 'Right-arm legbreak', 2.0, 88, 91, 75, 88,
    createAttributes(97, 80, 95, 90, 94, 65, 82, 99, 98, 99, 82, 20, 75, 15, 15, 80, 72, 45, 75, 50, 72, 75, 90, 90, 92, 98, 80, 98, 95, 90, 97), 'gt', 4.0),
  makePlayer('gt_shaharukh', 'Shahrukh Khan', 'S Khan', 28, 'India', false, 'Finisher', 'Right-hand bat', 'Right-arm offbreak', 1.5, 85, 88, 65, 88,
    createAttributes(98, 72, 97, 88, 92, 60, 80, 98, 86, 95, 70, 20, 65, 15, 15, 70, 55, 30, 60, 35, 60, 68, 88, 90, 84, 88, 75, 88, 96, 90, 88), 'gt', 4.0),
  makePlayer('gt_shami', 'Mohammed Shami', 'M Shami', 33, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 93, 30, 96, 93,
    createAttributes(35, 25, 35, 25, 25, 15, 15, 30, 20, 20, 35, 95, 99, 96, 99, 10, 92, 99, 92, 94, 99, 94, 88, 92, 96, 96, 85, 96, 85, 70, 96), null, 6.25),
  makePlayer('gt_miller', 'David Miller', 'D Miller', 35, 'South Africa', true, 'Finisher', 'Left-hand bat', 'Right-arm offbreak', 2.0, 91, 93, 10, 91,
    createAttributes(98, 86, 96, 94, 92, 70, 88, 99, 97, 99, 88, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 94, 90, 94, 98, 85, 98, 90, 75, 96), null, 3.0),
  makePlayer('gt_mohit', 'Mohit Sharma', 'M Sharma', 35, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium', 1.5, 87, 20, 89, 87,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 30, 78, 95, 80, 82, 10, 98, 75, 80, 98, 94, 92, 84, 82, 92, 94, 80, 94, 75, 60, 92), null, 2.0),
  makePlayer('gt_sai_kishore', 'R Sai Kishore', 'S Kishore', 27, 'India', false, 'Spin Bowler', 'Left-hand bat', 'Left-arm orthodox', 1.0, 86, 40, 88, 90,
    createAttributes(40, 35, 40, 30, 30, 15, 20, 40, 25, 30, 45, 20, 94, 20, 20, 92, 90, 88, 92, 82, 88, 95, 88, 92, 92, 90, 80, 92, 75, 55, 90), 'gt', 3.0),
  makePlayer('auc_noor', 'Noor Ahmad', 'N Ahmad', 19, 'Afghanistan', true, 'Spin Bowler', 'Right-hand bat', 'Left-arm unorthodox', 1.5, 88, 20, 91, 96,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 20, 94, 15, 15, 96, 95, 84, 95, 88, 94, 92, 84, 92, 88, 88, 70, 90, 85, 70, 90), null, 0.3),

  // ================= DC CORE & SUPERSTARS =================
  makePlayer('dc_pant', 'Rishabh Pant', 'R Pant', 26, 'India', false, 'Wicketkeeper Batter', 'Left-hand bat', 'Right-arm medium', 2.0, 94, 96, 10, 96,
    createAttributes(99, 86, 98, 96, 96, 92, 96, 98, 97, 98, 86, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 94, 92, 94, 98, 96, 98, 95, 88, 98), null, 16.0),
  makePlayer('dc_axar', 'Axar Patel', 'A Patel', 30, 'India', false, 'All-rounder' as PlayerRole, 'Left-hand bat', 'Left-arm orthodox', 2.0, 93, 89, 93, 93,
    createAttributes(92, 86, 90, 88, 92, 75, 88, 94, 90, 92, 88, 20, 96, 20, 20, 94, 92, 88, 95, 88, 92, 96, 95, 94, 95, 96, 90, 95, 80, 65, 95), 'dc', 16.5),
  makePlayer('dc_kuldeep', 'Kuldeep Yadav', 'K Yadav', 29, 'India', false, 'Spin Bowler', 'Left-hand bat', 'Left-arm unorthodox', 2.0, 94, 30, 97, 94,
    createAttributes(30, 25, 30, 25, 25, 15, 20, 30, 20, 25, 35, 20, 99, 20, 20, 99, 99, 88, 99, 90, 99, 97, 85, 90, 98, 98, 80, 98, 85, 70, 98), 'dc', 13.25),
  makePlayer('dc_stubbs', 'Tristan Stubbs', 'T Stubbs', 23, 'South Africa', true, 'Finisher', 'Right-hand bat', 'Right-arm offbreak', 2.0, 92, 95, 60, 97,
    createAttributes(99, 86, 98, 96, 96, 75, 94, 99, 96, 99, 84, 20, 65, 15, 15, 70, 60, 30, 65, 35, 60, 70, 97, 96, 92, 96, 80, 96, 96, 90, 96), 'dc', 10.0),
  makePlayer('dc_mcgurk', 'Jake Fraser-McGurk', 'J Fraser-McGurk', 22, 'Australia', true, 'Top-order Batter', 'Right-hand bat', 'Right-arm legbreak', 1.5, 92, 97, 30, 98,
    createAttributes(99, 78, 99, 99, 98, 99, 90, 88, 90, 85, 70, 15, 30, 15, 15, 35, 20, 15, 25, 10, 20, 30, 94, 96, 88, 92, 75, 96, 99, 99, 96), null, 0.5),
  makePlayer('dc_khaleel', 'Khaleel Ahmed', 'K Ahmed', 26, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Left-arm fast', 1.5, 87, 20, 89, 90,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 25, 90, 86, 92, 88, 10, 84, 94, 84, 88, 92, 84, 85, 90, 86, 88, 70, 86, 82, 65, 88), null, 5.25),
  makePlayer('dc_mukesh', 'Mukesh Kumar', 'M Kumar', 30, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium', 1.5, 86, 20, 88, 87,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 30, 85, 94, 88, 90, 10, 86, 88, 84, 94, 92, 88, 82, 86, 88, 90, 75, 90, 75, 60, 88), 'dc', 5.5),
  makePlayer('dc_porel', 'Abishek Porel', 'A Porel', 21, 'India', false, 'Wicketkeeper Batter', 'Left-hand bat', 'None', 0.5, 84, 87, 10, 93,
    createAttributes(92, 84, 90, 88, 88, 94, 86, 82, 86, 80, 78, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 88, 92, 84, 84, 65, 84, 94, 88, 84), 'dc', 4.0),
  makePlayer('dc_nortje', 'Anrich Nortje', 'A Nortje', 30, 'South Africa', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 90, 25, 92, 90,
    createAttributes(25, 20, 25, 20, 20, 10, 10, 25, 20, 20, 30, 99, 86, 82, 86, 10, 88, 92, 84, 94, 94, 82, 88, 94, 86, 90, 75, 92, 90, 80, 90), null, 6.5),
  makePlayer('auc_warner', 'David Warner', 'D Warner', 37, 'Australia', true, 'Top-order Batter', 'Left-hand bat', 'Right-arm legbreak', 2.0, 90, 92, 20, 90,
    createAttributes(94, 90, 95, 94, 90, 96, 90, 88, 92, 86, 88, 15, 20, 10, 10, 25, 15, 10, 15, 10, 15, 20, 94, 90, 92, 96, 96, 95, 88, 75, 96), null, 6.25),

  // ================= LSG CORE & SUPERSTARS =================
  makePlayer('lsg_pooran', 'Nicholas Pooran', 'N Pooran', 28, 'West Indies', true, 'Wicketkeeper Batter', 'Left-hand bat', 'Right-arm offbreak', 2.0, 95, 97, 20, 96,
    createAttributes(99, 88, 99, 98, 98, 88, 98, 99, 96, 98, 82, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 94, 94, 96, 98, 90, 98, 96, 90, 98), 'lsg', 21.0),
  makePlayer('lsg_mayank_yadav', 'Mayank Yadav', 'M Yadav', 22, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 91, 15, 93, 98,
    createAttributes(15, 15, 15, 15, 15, 10, 10, 15, 10, 10, 20, 99, 94, 88, 92, 10, 92, 98, 94, 92, 96, 94, 88, 96, 90, 92, 75, 94, 92, 82, 94), 'lsg', 11.0),
  makePlayer('lsg_bishnoi', 'Ravi Bishnoi', 'R Bishnoi', 23, 'India', false, 'Spin Bowler', 'Right-hand bat', 'Right-arm legbreak', 2.0, 91, 20, 93, 96,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 20, 96, 15, 15, 97, 98, 86, 96, 88, 96, 94, 96, 95, 92, 92, 75, 94, 85, 70, 94), 'lsg', 11.0),
  makePlayer('lsg_badoni', 'Ayush Badoni', 'A Badoni', 24, 'India', false, 'Middle-order Batter', 'Right-hand bat', 'Right-arm offbreak', 1.0, 86, 89, 60, 93,
    createAttributes(94, 86, 92, 90, 94, 78, 90, 95, 92, 95, 84, 20, 60, 15, 15, 65, 55, 30, 60, 30, 55, 65, 90, 92, 88, 90, 75, 92, 90, 78, 90), 'lsg', 4.0),
  makePlayer('lsg_mohsinkhan', 'Mohsin Khan', 'M Khan', 26, 'India', false, 'Pace Bowler', 'Left-hand bat', 'Left-arm fast-medium', 1.0, 86, 20, 88, 90,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 25, 90, 90, 92, 88, 10, 92, 92, 82, 94, 92, 88, 82, 88, 86, 88, 70, 88, 80, 65, 88), 'lsg', 4.0),
  makePlayer('lsg_rahul', 'KL Rahul', 'KL Rahul', 32, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 2.0, 93, 95, 10, 93,
    createAttributes(92, 96, 94, 96, 94, 96, 95, 94, 96, 92, 96, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 90, 92, 96, 96, 95, 95, 72, 50, 95), null, 17.0),
  makePlayer('lsg_stoinis', 'Marcus Stoinis', 'M Stoinis', 34, 'Australia', true, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm medium-fast', 2.0, 91, 92, 88, 91,
    createAttributes(98, 82, 96, 94, 90, 80, 92, 98, 92, 96, 80, 88, 85, 82, 85, 10, 86, 86, 84, 88, 90, 82, 92, 94, 88, 94, 85, 94, 94, 85, 95), null, 9.2),
  makePlayer('lsg_de_kock', 'Quinton de Kock', 'Q de Kock', 31, 'South Africa', true, 'Wicketkeeper Batter', 'Left-hand bat', 'None', 2.0, 92, 94, 10, 92,
    createAttributes(95, 88, 96, 96, 92, 98, 90, 90, 92, 86, 85, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 90, 92, 94, 85, 94, 90, 75, 94), null, 6.75),
  makePlayer('lsg_krunal', 'Krunal Pandya', 'K Pandya', 33, 'India', false, 'All-rounder' as PlayerRole, 'Left-hand bat', 'Left-arm orthodox', 2.0, 88, 86, 88, 88,
    createAttributes(88, 82, 88, 85, 88, 75, 84, 90, 86, 88, 82, 25, 92, 20, 20, 88, 88, 84, 92, 80, 86, 92, 92, 90, 90, 90, 85, 92, 85, 70, 90), null, 8.25),
  makePlayer('lsg_naveen', 'Naveen-ul-Haq', 'Naveen-ul-Haq', 24, 'Afghanistan', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium-fast', 1.5, 87, 20, 89, 92,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 30, 86, 94, 80, 84, 10, 98, 82, 84, 96, 92, 90, 84, 90, 88, 90, 75, 90, 85, 70, 90), null, 0.5),

  // ================= PBKS CORE & SUPERSTARS =================
  makePlayer('pbks_shashank', 'Shashank Singh', 'S Singh', 32, 'India', false, 'Finisher', 'Right-hand bat', 'Right-arm medium', 1.0, 89, 93, 60, 89,
    createAttributes(99, 86, 98, 92, 96, 75, 92, 99, 98, 99, 86, 70, 65, 60, 60, 10, 65, 55, 65, 55, 60, 65, 90, 92, 94, 98, 80, 98, 92, 85, 96), 'pbks', 5.5),
  makePlayer('pbks_prabhsimran', 'Prabhsimran Singh', 'P Singh', 24, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 1.0, 87, 90, 10, 93,
    createAttributes(96, 82, 94, 94, 90, 97, 88, 86, 88, 82, 76, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 88, 94, 86, 86, 70, 88, 96, 90, 88), 'pbks', 4.0),
  makePlayer('pbks_arshdeep', 'Arshdeep Singh', 'A Singh', 25, 'India', false, 'Pace Bowler', 'Left-hand bat', 'Left-arm medium-fast', 2.0, 93, 20, 95, 96,
    createAttributes(25, 20, 25, 20, 20, 10, 10, 25, 20, 20, 30, 89, 98, 95, 92, 10, 99, 96, 86, 99, 98, 95, 88, 94, 96, 98, 85, 98, 85, 70, 98), null, 4.0),
  makePlayer('pbks_curran', 'Sam Curran', 'S Curran', 26, 'England', true, 'All-rounder' as PlayerRole, 'Left-hand bat', 'Left-arm medium-fast', 2.0, 91, 89, 91, 93,
    createAttributes(92, 84, 90, 86, 88, 80, 88, 94, 90, 92, 84, 86, 92, 88, 86, 10, 92, 88, 85, 95, 94, 88, 94, 94, 90, 96, 92, 95, 88, 75, 95), null, 18.5),
  makePlayer('pbks_rabada', 'Kagiso Rabada', 'K Rabada', 29, 'South Africa', true, 'Pace Bowler', 'Left-hand bat', 'Right-arm fast', 2.0, 93, 40, 95, 93,
    createAttributes(45, 30, 45, 35, 35, 15, 20, 45, 30, 35, 40, 97, 94, 92, 95, 10, 94, 96, 88, 96, 98, 90, 92, 95, 94, 96, 85, 96, 90, 78, 96), null, 9.25),
  makePlayer('pbks_harshal', 'Harshal Patel', 'H Patel', 33, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium', 2.0, 90, 65, 92, 90,
    createAttributes(75, 55, 70, 60, 60, 40, 50, 75, 55, 70, 55, 82, 90, 78, 80, 10, 99, 80, 82, 99, 98, 86, 88, 88, 90, 94, 80, 92, 88, 75, 94), null, 11.75),
  makePlayer('auc_livingstone', 'Liam Livingstone', 'L Livingstone', 31, 'England', true, 'Batting All-rounder', 'Right-hand bat', 'Right-arm legbreak', 2.0, 91, 93, 84, 91,
    createAttributes(99, 78, 99, 95, 98, 75, 92, 98, 90, 96, 75, 20, 85, 15, 15, 88, 80, 55, 88, 55, 84, 82, 94, 92, 86, 90, 80, 92, 98, 95, 92), null, 11.5),
  makePlayer('pbks_jitesh', 'Jitesh Sharma', 'J Sharma', 30, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 1.5, 87, 90, 10, 88,
    createAttributes(96, 80, 95, 92, 92, 70, 85, 98, 90, 96, 75, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 92, 88, 92, 80, 92, 96, 88, 90), null, 4.0),
  makePlayer('pbks_ashutosh', 'Ashutosh Sharma', 'A Sharma', 25, 'India', false, 'Finisher', 'Right-hand bat', 'Right-arm medium', 0.5, 86, 90, 50, 93,
    createAttributes(98, 78, 97, 90, 94, 60, 85, 99, 94, 99, 75, 60, 55, 50, 50, 10, 55, 45, 55, 45, 50, 55, 90, 94, 86, 92, 75, 94, 98, 92, 94), null, 0.2),
  makePlayer('pbks_brar', 'Harpreet Brar', 'H Brar', 28, 'India', false, 'Bowling All-rounder', 'Left-hand bat', 'Left-arm orthodox', 1.0, 85, 75, 87, 88,
    createAttributes(82, 75, 82, 75, 80, 60, 72, 88, 80, 84, 75, 20, 94, 20, 20, 90, 88, 82, 92, 80, 86, 94, 90, 92, 90, 88, 78, 90, 82, 65, 88), 'pbks', 3.8),

  // ================= CAPPED SUPERSTARS & MARQUEE PLAYERS IN POOL =================
  makePlayer('auc_kane', 'Kane Williamson', 'K Williamson', 34, 'New Zealand', true, 'Top-order Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 91, 94, 20, 91,
    createAttributes(82, 98, 86, 96, 96, 92, 98, 86, 98, 88, 99, 15, 25, 10, 10, 30, 15, 10, 15, 10, 15, 20, 92, 88, 98, 99, 99, 99, 65, 40, 98), null, 2.0),
  makePlayer('auc_hazlewood', 'Josh Hazlewood', 'J Hazlewood', 33, 'Australia', true, 'Pace Bowler', 'Left-hand bat', 'Right-arm fast-medium', 2.0, 93, 20, 95, 93,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 30, 92, 99, 96, 98, 10, 92, 98, 95, 92, 96, 98, 90, 94, 98, 96, 85, 98, 75, 55, 96), null, 7.75),
  makePlayer('auc_ashwin', 'Ravichandran Ashwin', 'R Ashwin', 37, 'India', false, 'Bowling All-rounder', 'Right-hand bat', 'Right-arm offbreak', 2.0, 91, 80, 93, 91,
    createAttributes(82, 84, 82, 82, 84, 60, 80, 88, 84, 86, 88, 20, 98, 15, 15, 98, 99, 90, 96, 86, 92, 95, 84, 82, 96, 98, 96, 98, 82, 65, 96), null, 5.0),
  makePlayer('auc_hasaranga', 'Wanindu Hasaranga', 'W Hasaranga', 27, 'Sri Lanka', true, 'All-rounder' as PlayerRole, 'Right-hand bat', 'Right-arm legbreak', 2.0, 91, 82, 94, 93,
    createAttributes(88, 75, 88, 82, 86, 60, 75, 92, 85, 88, 70, 20, 96, 15, 15, 98, 97, 85, 96, 90, 98, 92, 95, 95, 90, 92, 80, 92, 90, 78, 92), null, 1.5),
  makePlayer('auc_rahane', 'Ajinkya Rahane', 'A Rahane', 36, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm medium', 1.5, 87, 89, 10, 87,
    createAttributes(86, 92, 88, 94, 90, 94, 90, 84, 90, 82, 90, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 88, 92, 95, 96, 94, 78, 55, 92), null, 0.5),
  makePlayer('auc_tripathi', 'Rahul Tripathi', 'R Tripathi', 33, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm medium', 1.5, 87, 90, 20, 87,
    createAttributes(94, 86, 92, 92, 94, 96, 90, 86, 88, 84, 80, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 92, 92, 88, 90, 75, 90, 92, 82, 88), null, 8.5),
  makePlayer('auc_ferguson', 'Lockie Ferguson', 'L Ferguson', 33, 'New Zealand', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 89, 20, 91, 89,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 99, 86, 80, 84, 10, 88, 90, 85, 94, 95, 82, 88, 94, 86, 88, 75, 90, 90, 80, 90), null, 2.0),
  makePlayer('auc_chahar_deepak', 'Deepak Chahar', 'D Chahar', 32, 'India', false, 'Bowling All-rounder', 'Right-hand bat', 'Right-arm medium-fast', 2.0, 88, 75, 89, 88,
    createAttributes(82, 70, 80, 72, 78, 50, 68, 86, 78, 82, 70, 86, 96, 99, 92, 10, 84, 99, 82, 88, 94, 88, 86, 82, 90, 90, 80, 90, 80, 65, 90), null, 14.0),
  makePlayer('auc_prasidh', 'Prasidh Krishna', 'P Krishna', 28, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 2.0, 88, 15, 90, 92,
    createAttributes(15, 15, 15, 15, 15, 10, 10, 15, 10, 10, 25, 95, 88, 88, 94, 10, 86, 94, 86, 90, 94, 85, 86, 90, 88, 88, 75, 88, 88, 75, 88), null, 10.0),
  makePlayer('auc_alzarri', 'Alzarri Joseph', 'A Joseph', 27, 'West Indies', true, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 1.5, 87, 25, 89, 90,
    createAttributes(25, 20, 25, 20, 20, 10, 10, 25, 20, 20, 25, 97, 85, 82, 86, 10, 86, 90, 84, 92, 92, 80, 88, 92, 84, 86, 70, 88, 88, 75, 88), null, 11.5),
  makePlayer('auc_chahar_rahul', 'Rahul Chahar', 'R Chahar', 25, 'India', false, 'Spin Bowler', 'Right-hand bat', 'Right-arm legbreak', 1.5, 87, 20, 89, 92,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 20, 92, 15, 15, 95, 94, 82, 94, 86, 94, 90, 88, 92, 88, 88, 75, 90, 82, 65, 90), null, 5.25),
  makePlayer('auc_umesh', 'Umesh Yadav', 'U Yadav', 36, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 1.5, 86, 35, 88, 86,
    createAttributes(35, 25, 35, 25, 25, 15, 15, 35, 25, 30, 30, 94, 86, 90, 92, 10, 80, 96, 82, 86, 92, 82, 86, 90, 85, 88, 75, 88, 85, 70, 88), null, 5.8),
  makePlayer('auc_marsh_mitch', 'Mitchell Marsh', 'M Marsh', 32, 'Australia', true, 'Batting All-rounder', 'Right-hand bat', 'Right-arm fast-medium', 2.0, 90, 93, 84, 90,
    createAttributes(98, 80, 97, 95, 90, 96, 92, 90, 90, 88, 78, 88, 82, 82, 84, 10, 84, 86, 82, 86, 88, 80, 92, 90, 86, 95, 92, 92, 94, 88, 94), null, 6.5),
  makePlayer('auc_bairstow', 'Jonny Bairstow', 'J Bairstow', 34, 'England', true, 'Wicketkeeper Batter', 'Right-hand bat', 'Right-arm offbreak', 2.0, 91, 94, 10, 91,
    createAttributes(98, 85, 97, 96, 94, 99, 92, 88, 92, 86, 80, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 90, 90, 90, 94, 88, 95, 95, 88, 94), null, 6.75),
  makePlayer('auc_gurbaz', 'Rahmanullah Gurbaz', 'R Gurbaz', 22, 'Afghanistan', true, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 1.5, 88, 91, 10, 95,
    createAttributes(98, 80, 96, 94, 92, 98, 88, 84, 88, 80, 74, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 90, 94, 86, 88, 75, 90, 98, 94, 90), null, 0.5),
  makePlayer('auc_jansen', 'Marco Jansen', 'M Jansen', 24, 'South Africa', true, 'Bowling All-rounder', 'Right-hand bat', 'Left-arm fast', 2.0, 89, 78, 91, 95,
    createAttributes(86, 70, 85, 78, 78, 50, 70, 90, 80, 86, 70, 94, 88, 94, 92, 10, 88, 96, 86, 92, 94, 85, 90, 95, 88, 90, 75, 90, 88, 75, 90), null, 4.2),

  // ================= UNCAPPED DOMESTIC PRODIGIES & EMERGING WEAPONS =================
  makePlayer('auc_angkrish', 'Angkrish Raghuvanshi', 'A Raghuvanshi', 19, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Left-arm orthodox', 0.3, 83, 87, 40, 96,
    createAttributes(88, 88, 90, 90, 92, 94, 90, 82, 88, 80, 85, 20, 45, 20, 20, 50, 35, 20, 35, 15, 30, 45, 90, 95, 86, 85, 70, 88, 85, 70, 86), null, 2.0),
  makePlayer('auc_sameer_rizvi', 'Sameer Rizvi', 'S Rizvi', 20, 'India', false, 'Finisher', 'Right-hand bat', 'Right-arm offbreak', 0.5, 82, 86, 30, 95,
    createAttributes(96, 75, 95, 88, 96, 70, 86, 95, 88, 94, 75, 20, 35, 20, 20, 40, 25, 20, 30, 15, 30, 40, 90, 96, 84, 85, 70, 88, 94, 85, 86), null, 8.4),
  makePlayer('auc_wadhera', 'Nehal Wadhera', 'N Wadhera', 23, 'India', false, 'Middle-order Batter', 'Left-hand bat', 'Right-arm legbreak', 0.5, 85, 88, 40, 94,
    createAttributes(94, 84, 92, 88, 92, 75, 90, 92, 90, 92, 82, 20, 45, 20, 20, 50, 35, 20, 35, 15, 30, 45, 92, 94, 86, 88, 75, 90, 88, 75, 88), null, 0.2),
  makePlayer('auc_kushagra', 'Kumar Kushagra', 'K Kushagra', 19, 'India', false, 'Wicketkeeper Batter', 'Right-hand bat', 'None', 0.3, 81, 85, 10, 95,
    createAttributes(92, 80, 90, 86, 88, 75, 86, 92, 88, 90, 80, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 88, 95, 82, 82, 65, 84, 88, 78, 82), null, 7.2),
  makePlayer('auc_robin_minz', 'Robin Minz', 'R Minz', 21, 'India', false, 'Wicketkeeper Batter', 'Left-hand bat', 'None', 0.3, 81, 86, 10, 95,
    createAttributes(96, 75, 95, 86, 92, 70, 84, 96, 88, 95, 74, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 88, 96, 82, 84, 65, 85, 95, 90, 84), null, 3.6),
  makePlayer('auc_karthik_tyagi', 'Kartik Tyagi', 'K Tyagi', 23, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast', 0.5, 83, 20, 86, 94,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 25, 95, 82, 80, 84, 10, 88, 86, 82, 90, 90, 80, 86, 94, 82, 84, 65, 84, 88, 75, 84), null, 0.6),
  makePlayer('auc_rasikh_salam', 'Rasikh Salam', 'R Salam', 24, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm medium-fast', 0.3, 82, 20, 85, 92,
    createAttributes(20, 20, 20, 20, 20, 10, 10, 20, 15, 15, 25, 86, 84, 82, 84, 10, 88, 82, 80, 86, 84, 82, 84, 88, 82, 84, 65, 82, 88, 75, 82), null, 2.0),
  makePlayer('auc_suyash_sharma', 'Suyash Sharma', 'S Sharma', 21, 'India', false, 'Spin Bowler', 'Right-hand bat', 'Right-arm legbreak', 0.3, 83, 15, 86, 94,
    createAttributes(15, 15, 15, 15, 15, 10, 10, 15, 10, 10, 20, 20, 88, 15, 15, 92, 94, 75, 88, 80, 90, 82, 84, 88, 84, 82, 65, 84, 88, 75, 84), null, 2.0),
  makePlayer('auc_manav_suthar', 'Manav Suthar', 'M Suthar', 21, 'India', false, 'Spin Bowler', 'Left-hand bat', 'Left-arm orthodox', 0.3, 81, 30, 84, 93,
    createAttributes(30, 30, 30, 25, 25, 15, 20, 30, 25, 25, 35, 20, 86, 20, 20, 90, 88, 80, 86, 80, 88, 84, 86, 90, 82, 84, 65, 82, 82, 70, 82), null, 1.5),
  makePlayer('auc_musheer_khan', 'Musheer Khan', 'M Khan', 19, 'India', false, 'Batting All-rounder', 'Right-hand bat', 'Left-arm orthodox', 0.3, 82, 86, 80, 96,
    createAttributes(86, 90, 88, 88, 92, 90, 92, 84, 90, 84, 92, 20, 82, 20, 20, 86, 82, 65, 84, 55, 80, 82, 92, 96, 90, 92, 80, 92, 82, 65, 90), null, 0.3),
  makePlayer('auc_swastik_chikara', 'Swastik Chikara', 'S Chikara', 19, 'India', false, 'Top-order Batter', 'Right-hand bat', 'Right-arm offbreak', 0.3, 80, 84, 40, 94,
    createAttributes(95, 78, 92, 88, 90, 94, 86, 82, 86, 80, 75, 20, 45, 20, 20, 50, 35, 20, 35, 15, 30, 45, 88, 94, 82, 82, 65, 84, 92, 85, 82), null, 0.3),
  makePlayer('auc_priyansh_arya', 'Priyansh Arya', 'P Arya', 23, 'India', false, 'Top-order Batter', 'Left-hand bat', 'Right-arm offbreak', 0.3, 83, 87, 20, 94,
    createAttributes(97, 82, 96, 92, 94, 98, 90, 84, 88, 82, 76, 15, 25, 15, 15, 30, 15, 10, 20, 10, 15, 25, 90, 94, 86, 88, 70, 88, 96, 90, 88), null, 0.3),
  makePlayer('auc_digvesh_rathi', 'Digvesh Rathi', 'D Rathi', 24, 'India', false, 'Spin Bowler', 'Right-hand bat', 'Right-arm legbreak', 0.3, 80, 20, 83, 91,
    createAttributes(20, 15, 20, 15, 15, 10, 10, 20, 15, 15, 25, 20, 86, 15, 15, 88, 86, 75, 86, 78, 86, 82, 82, 88, 82, 82, 65, 82, 80, 65, 80), null, 0.3),
  makePlayer('auc_vipin_sharma', 'Vipin Sharma', 'V Sharma', 22, 'India', false, 'Pace Bowler', 'Right-hand bat', 'Right-arm fast-medium', 0.3, 80, 15, 83, 92,
    createAttributes(15, 15, 15, 15, 15, 10, 10, 15, 10, 10, 25, 88, 82, 84, 84, 10, 82, 84, 78, 84, 86, 80, 84, 90, 80, 82, 65, 82, 82, 70, 80), null, 0.3),

  // ================= DEPTH & ACCELERATED DOMESTIC POOL (100+ ADDITIONAL PLAYERS) =================
  ...Array.from({ length: 110 }).map((_, i) => {
    const roles: PlayerRole[] = ['Top-order Batter', 'Middle-order Batter', 'Finisher', 'All-rounder' as PlayerRole, 'Bowling All-rounder', 'Pace Bowler', 'Spin Bowler', 'Wicketkeeper Batter'];
    const role = roles[i % roles.length];
    const isOverseas = i % 6 === 0;
    const names = [
      'Aniket Choudhary', 'Tanush Kotian', 'Shams Mulani', 'Himanshu Rana', 'Abhimanyu Easwaran',
      'Baba Indrajith', 'Pradosh Paul', 'Siddharth Kaul', 'Basil Thampi', 'Gagandeep Singh',
      'Gurkeerat Mann', 'Manan Vohra', 'Rishi Dhawan', 'Sheldon Jackson', 'Siddhesh Lad',
      'Akash Deep', 'Abhinav Manohar', 'Dhruv Patel', 'Aman Khan', 'Sanvir Singh',
      'Vijaykumar Vyshak', 'Kulwant Khejroliya', 'Pravin Dubey', 'Swapnil Singh', 'Himanshu Sharma',
      'Manoj Bhandage', 'Saurav Chauhan', 'Ashwin Hebbar', 'Vyshak V', 'Yudhvir Singh',
      'Prerak Mankad', 'Arshin Kulkarni', 'Urvil Patel', 'Raj Bawa', 'Sudarshan VK',
      'Lance Morris', 'Ollie Robinson', 'Corbin Bosch', 'Matthew Breetzke', 'Will Sutherland',
      'Nandre Burger', 'Spencer Johnson', 'Shamar Joseph', 'Nuwanidu Fernando', 'Dunith Wellalage',
      'Azmatullah Omarzai', 'Gus Atkinson', 'Brydon Carse', 'Jamie Smith', 'Jacob Bethell'
    ];
    const rawName = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : '');
    const short = rawName.split(' ')[0][0] + ' ' + rawName.split(' ').slice(1).join(' ');
    const ovr = 78 + (i % 10);
    const batR = role.includes('Batter') || role === 'Finisher' ? 82 + (i % 8) : (role.includes('All-rounder') ? 80 : 30);
    const bowlR = role.includes('Bowler') ? 82 + (i % 8) : (role.includes('All-rounder') ? 80 : 20);
    const pot = 85 + (i % 12);
    const baseP = ovr > 84 ? 0.75 : (ovr > 81 ? 0.5 : 0.3);

    return makePlayer(
      `auc_depth_${i + 1}`,
      rawName,
      short,
      20 + (i % 14),
      isOverseas ? (i % 2 === 0 ? 'Australia' : 'South Africa') : 'India',
      isOverseas,
      role,
      i % 3 === 0 ? 'Left-hand bat' : 'Right-hand bat',
      role.includes('Spin') ? 'Right-arm offbreak' : (role.includes('Pace') ? 'Right-arm fast-medium' : 'None'),
      baseP,
      ovr,
      batR,
      bowlR,
      pot,
      createAttributes(
        80 + (i % 15), 80 + (i % 15), 80 + (i % 15), 80 + (i % 15), 80 + (i % 15),
        75 + (i % 15), 75 + (i % 15), 80 + (i % 15), 80 + (i % 15), 80 + (i % 15), 80 + (i % 15),
        role.includes('Pace') ? 88 : 20, 82 + (i % 10), 80 + (i % 10), 80 + (i % 10), role.includes('Spin') ? 88 : 10, 80 + (i % 10),
        80 + (i % 10), 80 + (i % 10), 80 + (i % 10), 82 + (i % 10), 80 + (i % 10),
        85 + (i % 10), 88 + (i % 10), 82 + (i % 10), 82 + (i % 10), 70 + (i % 15), 82 + (i % 10), 85 + (i % 10), 75 + (i % 15), 82 + (i % 10)
      ),
      null,
      baseP
    );
  })
];
