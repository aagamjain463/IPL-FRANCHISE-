import { Player } from '../types/cricket';
import { FCCardTier, FCPlayerRatings, PlayStylePlusDef, FCIQTacticPreset, HawkEyeDRSReview, FCEvolutionPath } from '../types/fc26';

export const PLAYSTYLES_PLUS: Record<string, PlayStylePlusDef> = {
  helicopter_whip: {
    id: 'helicopter_whip',
    name: 'Helicopter Whip+',
    category: 'Batting',
    badgeColor: '#D4AF37', // Gold
    shortTag: 'WHIP+',
    description: 'Unlocks ferocious bottom-hand wrist snap to convert toe-crushing yorkers into 90m+ boundaries.',
    inGameEffect: '+30% boundary conversion against Yorker line deliveries in overs 16-20.',
    applicableRoles: ['Finisher', 'Middle-order Batter', 'Batting All-rounder']
  },
  yorker_precision: {
    id: 'yorker_precision',
    name: 'Yorker Precision+',
    category: 'Bowling',
    badgeColor: '#00F0FF', // Cyan Electric
    shortTag: 'YORK+',
    description: 'Pinpoint laser accuracy targeting the base of off & middle stump with late reverse swing.',
    inGameEffect: '+35% dot ball rate and +25% clean-bowled dismissal chance in death overs.',
    applicableRoles: ['Pace Bowler', 'Bowling All-rounder']
  },
  cover_drive_maestro: {
    id: 'cover_drive_maestro',
    name: 'Cover Drive Maestro+',
    category: 'Batting',
    badgeColor: '#39FF14', // Neon Green
    shortTag: 'DRIVE+',
    description: 'Weight transfer perfection through covers with clinical gap finding and zero aerial risk.',
    inGameEffect: '+28% boundary frequency against standard length outside-off balls in Powerplay.',
    applicableRoles: ['Top-order Batter', 'Middle-order Batter']
  },
  mystery_spin: {
    id: 'mystery_spin',
    name: 'Mystery Spin+',
    category: 'Bowling',
    badgeColor: '#BD00FF', // Neon Purple
    shortTag: 'SPIN+',
    description: 'Undetectable arm speed variations with carrom ball, knuckle drift, and sharp turn.',
    inGameEffect: '+32% false shot and outside edge induction against top-order batters in middle overs.',
    applicableRoles: ['Spin Bowler', 'Bowling All-rounder']
  },
  express_thunderbolt: {
    id: 'express_thunderbolt',
    name: 'Express Thunderbolt+',
    category: 'Bowling',
    badgeColor: '#FF3131', // Neon Red
    shortTag: '150KM+',
    description: 'Unrelenting 150+ km/h pace intimidation causing delayed batter reaction times and rushed mistimed pulls.',
    inGameEffect: '+20% top-edge caught dismissals on bouncers and short-pitched deliveries.',
    applicableRoles: ['Pace Bowler']
  },
  bludgeon_power: {
    id: 'bludgeon_power',
    name: 'Bludgeon Power+',
    category: 'Batting',
    badgeColor: '#FF6B00', // Neon Orange
    shortTag: 'POW99+',
    description: 'Raw explosive bat speed capable of clearing the stadium roof even from inside edges.',
    inGameEffect: '+40% chance of clearing boundaries on mis-hits and slow pitches.',
    applicableRoles: ['Finisher', 'Middle-order Batter', 'Batting All-rounder']
  },
  scoop_wizard: {
    id: 'scoop_wizard',
    name: '360° Scoop Wizard+',
    category: 'Batting',
    badgeColor: '#00E5FF',
    shortTag: '360°+',
    description: 'Defies conventional field settings using lap sweeps, reverse ramps, and behind-keeper scoops.',
    inGameEffect: '+35% boundary rate when fine leg and third man are inside the 30-yard ring.',
    applicableRoles: ['Top-order Batter', 'Middle-order Batter', 'Finisher']
  },
  bullet_arm: {
    id: 'bullet_arm',
    name: 'Bullet Arm 99+',
    category: 'Fielding',
    badgeColor: '#E6FB04', // Neon Yellow
    shortTag: 'ARM+',
    description: 'Flat, blistering 140km/h direct-hit throws from deep boundary ropes that eliminate hesitation.',
    inGameEffect: '+50% direct hit run-out rate and denies opposition aggressive 2nd runs completely.',
    applicableRoles: ['Batting All-rounder', 'Bowling All-rounder', 'Middle-order Batter', 'Top-order Batter']
  },
  lightning_gloves: {
    id: 'lightning_gloves',
    name: 'Lightning Gloves+',
    category: 'Fielding',
    badgeColor: '#00FF9D',
    shortTag: 'GLOVE+',
    description: 'Sub-0.12 second blind stumping reaction time and acrobatic diving leg-side takes.',
    inGameEffect: '+45% stumping speed against charging batters and 0 dropped catches behind stumps.',
    applicableRoles: ['Wicketkeeper Batter']
  },
  captains_aura: {
    id: 'captains_aura',
    name: "Captain's Aura+",
    category: 'Clutch',
    badgeColor: '#D4AF37',
    shortTag: 'AURA+',
    description: 'Inspires maximum composure during high-pressure run chases and enhances DRS review precision.',
    inGameEffect: '+15% team clutch composure rating and 1 extra successful DRS overturn probability.',
    applicableRoles: ['Top-order Batter', 'Middle-order Batter', 'Pace Bowler', 'Batting All-rounder', 'Wicketkeeper Batter']
  },
  death_anchor: {
    id: 'death_anchor',
    name: 'Death Anchor+',
    category: 'Batting',
    badgeColor: '#7000FF',
    shortTag: 'ANCH+',
    description: 'Impenetrable defense during early collapses followed by accelerating strike rotation.',
    inGameEffect: 'Reduces top-order collapse frequency by 40% when 2 wickets fall early in powerplay.',
    applicableRoles: ['Top-order Batter', 'Middle-order Batter']
  },
  inswing_menace: {
    id: 'inswing_menace',
    name: 'Inswing Menace+',
    category: 'Bowling',
    badgeColor: '#0099FF',
    shortTag: 'SWING+',
    description: 'Late banana swing under the lights penetrating between bat and pad of right-handers.',
    inGameEffect: '+30% LBW and Bowled wickets in the opening 2 overs of the match.',
    applicableRoles: ['Pace Bowler', 'Bowling All-rounder']
  }
};

/**
 * Assigns signature PlayStyles+ to iconic players based on name / attributes
 */
export function getPlayerPlayStylePlus(player: Player): PlayStylePlusDef | null {
  const name = player.name.toLowerCase();
  const shortName = (player.shortName || '').toLowerCase();

  // Signature Player Lookups
  if (name.includes('dhoni') || shortName.includes('dhoni')) return PLAYSTYLES_PLUS.helicopter_whip;
  if (name.includes('bumrah') || shortName.includes('bumrah')) return PLAYSTYLES_PLUS.yorker_precision;
  if (name.includes('kohli') || shortName.includes('kohli')) return PLAYSTYLES_PLUS.cover_drive_maestro;
  if (name.includes('rashid') || name.includes('narine') || name.includes('chakravarthy')) return PLAYSTYLES_PLUS.mystery_spin;
  if (name.includes('mayank yadav') || name.includes('umran') || name.includes('starc') || name.includes('wood')) return PLAYSTYLES_PLUS.express_thunderbolt;
  if (name.includes('russell') || name.includes('klaasen') || name.includes('pooran') || name.includes('head')) return PLAYSTYLES_PLUS.bludgeon_power;
  if (name.includes('suryakumar') || name.includes('sky') || name.includes('villiers') || name.includes('maxwell')) return PLAYSTYLES_PLUS.scoop_wizard;
  if (name.includes('jadeja') || name.includes('phillips') || name.includes('warner')) return PLAYSTYLES_PLUS.bullet_arm;
  if (name.includes('pant') || name.includes('samson') || name.includes('de kock')) return PLAYSTYLES_PLUS.lightning_gloves;
  if (name.includes('rohit') || name.includes('cummins') || name.includes('shreyas')) return PLAYSTYLES_PLUS.captains_aura;
  if (name.includes('bhuvi') || name.includes('bhuvneshwar') || name.includes('arshdeep') || name.includes('boult') || name.includes('shami')) return PLAYSTYLES_PLUS.inswing_menace;
  if (name.includes('kl rahul') || name.includes('williamson') || name.includes('gill')) return PLAYSTYLES_PLUS.death_anchor;

  // Attribute-based Fallbacks for High Overall Players
  if (player.overall >= 85) {
    if (player.role === 'Pace Bowler' || player.role === 'Bowling All-rounder') {
      if (player.attributes.deathBowling >= 86) return PLAYSTYLES_PLUS.yorker_precision;
      if (player.attributes.swing >= 86) return PLAYSTYLES_PLUS.inswing_menace;
      if (player.attributes.pace >= 88) return PLAYSTYLES_PLUS.express_thunderbolt;
    }
    if (player.role === 'Spin Bowler') {
      if (player.attributes.variation >= 84 || player.attributes.spin >= 86) return PLAYSTYLES_PLUS.mystery_spin;
    }
    if (player.role === 'Finisher' || player.role === 'Middle-order Batter') {
      if (player.attributes.power >= 88) return PLAYSTYLES_PLUS.bludgeon_power;
      if (player.attributes.deathOverBatting >= 86) return PLAYSTYLES_PLUS.helicopter_whip;
    }
    if (player.role === 'Top-order Batter') {
      if (player.attributes.powerplayBatting >= 86) return PLAYSTYLES_PLUS.cover_drive_maestro;
      if (player.attributes.wicketPreservation >= 85) return PLAYSTYLES_PLUS.death_anchor;
    }
    if (player.role === 'Wicketkeeper Batter') {
      return PLAYSTYLES_PLUS.lightning_gloves;
    }
  }

  return null;
}

/**
 * Determines FC 26 Card Tier
 */
export function getFCCardTier(player: Player): FCCardTier {
  const name = player.name.toLowerCase();
  if (name.includes('dhoni') || name.includes('tendulkar') || name.includes('malinga') || name.includes('gayle') || name.includes('villiers')) {
    return 'Icon Legend';
  }
  if (player.overall >= 90) {
    return 'TOTW';
  }
  if (player.overall >= 86) {
    return 'Centurions';
  }
  if (player.overall >= 78) {
    return 'Gold Rare';
  }
  if (player.age <= 22 && player.potential >= 84) {
    return 'Wonderkid Evo';
  }
  if (player.overall >= 70) {
    return 'Silver Rare';
  }
  return 'Gold Rare';
}

/**
 * Computes the 6 FC 26 Face Card Ratings:
 * BAT, BWL, SPD, CLU, FLD, PHY
 */
export function getFCPlayerRatings(player: Player): FCPlayerRatings {
  const attr = player.attributes;

  // 1. BAT: Batting rating combined with boundary ability & power
  const bat = Math.min(99, Math.max(40, Math.round(
    attr.power * 0.35 + 
    attr.boundaryAbility * 0.25 + 
    attr.middleOverBatting * 0.2 + 
    attr.powerplayBatting * 0.2
  )));

  // 2. BWL: Bowling wicket taking, accuracy & variation
  const bwl = Math.min(99, Math.max(35, Math.round(
    attr.wicketTaking * 0.35 + 
    attr.accuracy * 0.25 + 
    attr.deathBowling * 0.2 + 
    attr.variation * 0.2
  )));

  // 3. SPD: Bowler pace release or running speed
  const isPacer = player.bowlingStyle.includes('fast') || player.bowlingStyle.includes('medium');
  const spd = isPacer 
    ? Math.min(99, Math.max(50, Math.round(attr.pace * 0.8 + attr.fitness * 0.2)))
    : Math.min(99, Math.max(50, Math.round(attr.strikeRotation * 0.5 + attr.fitness * 0.5)));

  // 4. CLU: Clutch mentality & finishing in pressure
  const clu = Math.min(99, Math.max(45, Math.round(
    attr.finishing * 0.35 + 
    attr.pressure * 0.3 + 
    attr.bigMatchPerformance * 0.25 + 
    attr.composure * 0.1
  )));

  // 5. FLD: Fielding & reflexes
  const fld = Math.min(99, Math.max(45, Math.round(
    attr.fielding * 0.8 + 
    attr.fitness * 0.2
  )));

  // 6. PHY: Physical durability, leadership & fitness
  const phy = Math.min(99, Math.max(50, Math.round(
    attr.fitness * 0.5 + 
    attr.consistency * 0.25 + 
    attr.leadership * 0.25
  )));

  return {
    overall: player.overall,
    bat,
    bwl,
    spd,
    clu,
    fld,
    phy
  };
}

/**
 * FC IQ Tactical Presets for Cricket Pitch Radar
 */
export const FC_IQ_PRESETS: FCIQTacticPreset[] = [
  {
    id: 'fc_gegenpress_death',
    name: 'Gegenpress Yorker Choke',
    code: 'GP-99',
    description: 'High-intensity death overs field: Deep boundary sweepers at long-on/off with boundary ring protection and tight yorker channels.',
    mentality: 'High Press',
    aggression: 9,
    fieldingIntensity: 9,
    boundaryProtection: 'Balanced 360',
    keyPlayStyleSynergy: 'Yorker Precision+ & Bullet Arm 99+',
    defaultPositions: [
      { id: 'pos_wk', name: 'Wicketkeeper', x: 50, y: 88, zone: 'Close In' },
      { id: 'pos_bowler', name: 'Bowler (Follow-thru)', x: 50, y: 35, zone: 'Inner Ring' },
      { id: 'pos_long_on', name: 'Deep Long On', x: 32, y: 15, zone: 'Deep Boundary' },
      { id: 'pos_long_off', name: 'Deep Long Off', x: 68, y: 15, zone: 'Deep Boundary' },
      { id: 'pos_deep_midwicket', name: 'Deep Mid-Wicket', x: 16, y: 42, zone: 'Deep Boundary' },
      { id: 'pos_deep_cover', name: 'Deep Extra Cover', x: 84, y: 42, zone: 'Deep Boundary' },
      { id: 'pos_deep_square', name: 'Deep Square Leg', x: 18, y: 72, zone: 'Deep Boundary' },
      { id: 'pos_mid_wicket', name: 'Inner Mid-Wicket', x: 33, y: 55, zone: 'Inner Ring' },
      { id: 'pos_cover_pt', name: 'Inner Cover Point', x: 68, y: 58, zone: 'Inner Ring' },
      { id: 'pos_short_fine', name: 'Short Fine Leg', x: 36, y: 80, zone: 'Inner Ring' },
      { id: 'pos_short_third', name: 'Short Third Man', x: 65, y: 80, zone: 'Inner Ring' }
    ]
  },
  {
    id: 'fc_tikitaka_spin',
    name: 'Tiki-Taka Spin Web',
    code: 'SPIN-IQ',
    description: 'Middle overs squeeze: 7 fielders suffocating the 30-yard circle to deny singles, inducing high-risk lofted mis-hits.',
    mentality: 'Balanced',
    aggression: 7,
    fieldingIntensity: 8,
    boundaryProtection: 'Ring Lockdown',
    keyPlayStyleSynergy: 'Mystery Spin+ & Lightning Gloves+',
    defaultPositions: [
      { id: 'pos_wk', name: 'Wicketkeeper (Up)', x: 50, y: 82, zone: 'Close In' },
      { id: 'pos_bowler', name: 'Bowler', x: 50, y: 35, zone: 'Inner Ring' },
      { id: 'pos_slip', name: 'Slip', x: 58, y: 82, zone: 'Slip Cordon' },
      { id: 'pos_silly_point', name: 'Silly Point / Pad Away', x: 62, y: 65, zone: 'Inner Ring' },
      { id: 'pos_short_leg', name: 'Short Leg', x: 38, y: 65, zone: 'Inner Ring' },
      { id: 'pos_extra_cover', name: 'Extra Cover (Ring)', x: 74, y: 52, zone: 'Inner Ring' },
      { id: 'pos_mid_wicket', name: 'Mid-Wicket (Ring)', x: 26, y: 52, zone: 'Inner Ring' },
      { id: 'pos_long_on', name: 'Deep Long On', x: 30, y: 14, zone: 'Deep Boundary' },
      { id: 'pos_deep_midwicket', name: 'Deep Mid-Wicket', x: 14, y: 40, zone: 'Deep Boundary' },
      { id: 'pos_point', name: 'Backward Point', x: 75, y: 72, zone: 'Inner Ring' },
      { id: 'pos_short_fine', name: 'Short Fine Leg', x: 34, y: 82, zone: 'Inner Ring' }
    ]
  },
  {
    id: 'fc_slip_cordon_blitz',
    name: 'Powerplay Cordon Blitz',
    code: 'SWING-99',
    description: 'Attacking new-ball setup with 3 slips and catching gullies to capitalize on swinging deliveries under floodlights.',
    mentality: 'Ultra Attacking',
    aggression: 10,
    fieldingIntensity: 9,
    boundaryProtection: 'Heavy Off-side',
    keyPlayStyleSynergy: 'Inswing Menace+ & Express Thunderbolt+',
    defaultPositions: [
      { id: 'pos_wk', name: 'Wicketkeeper (Back)', x: 50, y: 92, zone: 'Close In' },
      { id: 'pos_bowler', name: 'Bowler', x: 50, y: 35, zone: 'Inner Ring' },
      { id: 'pos_slip1', name: '1st Slip', x: 58, y: 91, zone: 'Slip Cordon' },
      { id: 'pos_slip2', name: '2nd Slip', x: 64, y: 89, zone: 'Slip Cordon' },
      { id: 'pos_gully', name: 'Catching Gully', x: 72, y: 82, zone: 'Slip Cordon' },
      { id: 'pos_point', name: 'Point (Ring)', x: 78, y: 64, zone: 'Inner Ring' },
      { id: 'pos_cover', name: 'Cover (Ring)', x: 70, y: 48, zone: 'Inner Ring' },
      { id: 'pos_mid_off', name: 'Mid-Off', x: 60, y: 32, zone: 'Inner Ring' },
      { id: 'pos_mid_on', name: 'Mid-On', x: 40, y: 32, zone: 'Inner Ring' },
      { id: 'pos_mid_wicket', name: 'Mid-Wicket', x: 28, y: 55, zone: 'Inner Ring' },
      { id: 'pos_fine_leg', name: 'Deep Fine Leg', x: 18, y: 85, zone: 'Deep Boundary' }
    ]
  },
  {
    id: 'fc_bodyline_trap',
    name: 'Bodyline Bouncer Trap',
    code: 'BOUNCE-99',
    description: 'Aggressive short-pitch barrage setup packing the leg-side boundary with 2 catchers behind square.',
    mentality: 'High Press',
    aggression: 9,
    fieldingIntensity: 8,
    boundaryProtection: 'Heavy Leg-side',
    keyPlayStyleSynergy: 'Express Thunderbolt+ & Cover Drive Maestro+',
    defaultPositions: [
      { id: 'pos_wk', name: 'Wicketkeeper', x: 50, y: 90, zone: 'Close In' },
      { id: 'pos_bowler', name: 'Bowler', x: 50, y: 35, zone: 'Inner Ring' },
      { id: 'pos_deep_fine_leg', name: 'Deep Fine Leg', x: 15, y: 88, zone: 'Deep Boundary' },
      { id: 'pos_deep_square_leg', name: 'Deep Square Leg', x: 12, y: 68, zone: 'Deep Boundary' },
      { id: 'pos_deep_mid_wicket', name: 'Deep Mid-Wicket', x: 14, y: 38, zone: 'Deep Boundary' },
      { id: 'pos_long_on', name: 'Long On', x: 32, y: 15, zone: 'Deep Boundary' },
      { id: 'pos_short_leg', name: 'Forward Short Leg', x: 38, y: 65, zone: 'Close In' },
      { id: 'pos_leg_gully', name: 'Leg Gully', x: 42, y: 82, zone: 'Slip Cordon' },
      { id: 'pos_point', name: 'Point', x: 76, y: 66, zone: 'Inner Ring' },
      { id: 'pos_cover', name: 'Cover', x: 72, y: 48, zone: 'Inner Ring' },
      { id: 'pos_mid_off', name: 'Mid-Off', x: 62, y: 34, zone: 'Inner Ring' }
    ]
  }
];

/**
 * Generate a Hawk-Eye DRS simulation review
 */
export function generateHawkEyeReview(
  batterName: string, 
  bowlerName: string, 
  type: 'LBW' | 'Caught Behind' | 'Stumping' = 'LBW',
  originalDecision: 'Out' | 'Not Out' = 'Out'
): HawkEyeDRSReview {
  const isCaught = type === 'Caught Behind';
  const isLBW = type === 'LBW';

  if (isCaught) {
    const snickoSpike = Math.random() > 0.45;
    const finalDecision = snickoSpike ? 'OUT' : 'NOT OUT';
    const isOverturned = (originalDecision === 'Out' && finalDecision === 'NOT OUT') || (originalDecision === 'Not Out' && finalDecision === 'OUT');

    return {
      id: 'drs_' + Date.now(),
      reviewType: 'Caught Behind',
      reviewingTeamId: 'csk',
      batterName,
      bowlerName,
      originalOnFieldDecision: originalDecision,
      finalDecision,
      isOverturned,
      umpiresCall: false,
      snickoSpikeOccurred: snickoSpike,
      ballSpeedKmph: Math.round(135 + Math.random() * 15),
      pitching: 'In Line',
      impact: 'In Line',
      wickets: 'Hitting',
      impactPointText: snickoSpike ? 'Clear spike on Ultra-Edge as ball passes outside edge' : 'Flat line on Ultra-Edge. No contact with bat or glove.',
      thirdUmpireDialogues: [
        'Roll that Ultra-Edge through again please...',
        snickoSpike ? 'We have a distinct deflection spike on the Ultra-Edge soundwave.' : 'No spike detected. Clear gap between bat and ball.',
        `I am ready with my decision. You will have to reverse your decision. Signal ${finalDecision}.`
      ]
    };
  }

  // LBW Simulation
  const pitchingList: Array<'In Line' | 'Outside Off' | 'Outside Leg'> = ['In Line', 'In Line', 'Outside Off'];
  const impactList: Array<'In Line' | 'Outside Off'> = ['In Line', 'In Line', 'In Line', 'Outside Off'];
  const wicketsList: Array<'Hitting' | "Umpire's Call" | 'Missing'> = ['Hitting', 'Hitting', "Umpire's Call", 'Missing'];

  const pitching = pitchingList[Math.floor(Math.random() * pitchingList.length)];
  const impact = impactList[Math.floor(Math.random() * impactList.length)];
  const wickets = wicketsList[Math.floor(Math.random() * wicketsList.length)];

  let finalDecision: 'OUT' | 'NOT OUT' = 'OUT';
  let umpiresCall = false;

  if (pitching === 'Outside Leg' || impact === 'Outside Off' || wickets === 'Missing') {
    finalDecision = 'NOT OUT';
  } else if (wickets === "Umpire's Call") {
    umpiresCall = true;
    finalDecision = originalDecision === 'Out' ? 'OUT' : 'NOT OUT';
  }

  const isOverturned = (originalDecision === 'Out' && finalDecision === 'NOT OUT') || (originalDecision === 'Not Out' && finalDecision === 'OUT');

  return {
    id: 'drs_' + Date.now(),
    reviewType: 'LBW',
    reviewingTeamId: 'csk',
    batterName,
    bowlerName,
    originalOnFieldDecision: originalDecision,
    finalDecision,
    isOverturned,
    umpiresCall,
    snickoSpikeOccurred: false,
    ballSpeedKmph: Math.round(138 + Math.random() * 12),
    pitching,
    impact,
    wickets,
    impactPointText: `Pitching: ${pitching} | Impact: ${impact} | Wickets: ${wickets}`,
    thirdUmpireDialogues: [
      'Front foot is fair, no problem with the no ball.',
      'Ultra-Edge confirms no bat involved. Moving to ball tracking.',
      `Pitching: ${pitching}. Impact: ${impact}. Wickets: ${wickets}.`,
      `Stay with your on-field decision / Overturn decision. Signal ${finalDecision}.`
    ]
  };
}

/**
 * FC 26 Wonderkid Evolutions Catalog
 */
export const FC_EVOLUTION_PATHS: FCEvolutionPath[] = [
  {
    id: 'evo_death_finisher',
    name: 'Clutch Finisher Ascension',
    badge: '⚡ FINISH 99',
    requiredMaxOvr: 84,
    rewardTier: 'Centurions',
    ovrUpgrade: 4,
    statUpgrades: {
      bat: 6,
      clu: 8,
      phy: 4
    },
    grantedPlayStyle: PLAYSTYLES_PLUS.helicopter_whip,
    requirements: [
      { id: 'req_1', description: 'Score 120+ runs in death overs (overs 16-20)', target: 120, current: 48 },
      { id: 'req_2', description: 'Hit 8 sixes in successful run chases', target: 8, current: 5 },
      { id: 'req_3', description: 'Win 2 Player of the Match awards', target: 2, current: 1 }
    ]
  },
  {
    id: 'evo_express_pacer',
    name: '150KM/H Speed Demon',
    badge: '🔥 SPEED 150+',
    requiredMaxOvr: 82,
    rewardTier: 'TOTW',
    ovrUpgrade: 5,
    statUpgrades: {
      bwl: 6,
      spd: 8,
      clu: 4
    },
    grantedPlayStyle: PLAYSTYLES_PLUS.express_thunderbolt,
    requirements: [
      { id: 'req_1', description: 'Bowl 15 powerplay overs with economy under 7.5', target: 15, current: 9 },
      { id: 'req_2', description: 'Take 6 clean-bowled or LBW wickets', target: 6, current: 4 },
      { id: 'req_3', description: 'Deliver 12 dot balls in death overs', target: 12, current: 8 }
    ]
  },
  {
    id: 'evo_mystery_master',
    name: 'Doosra & Carrom Prodigy',
    badge: '🌀 MYSTERY 99',
    requiredMaxOvr: 80,
    rewardTier: 'Wonderkid Evo',
    ovrUpgrade: 6,
    statUpgrades: {
      bwl: 8,
      clu: 6,
      fld: 4
    },
    grantedPlayStyle: PLAYSTYLES_PLUS.mystery_spin,
    requirements: [
      { id: 'req_1', description: 'Take 10 middle over wickets (overs 7-15)', target: 10, current: 6 },
      { id: 'req_2', description: 'Bowl a maiden over in the tournament', target: 1, current: 0 },
      { id: 'req_3', description: 'Maintain tournament economy below 6.8', target: 1, current: 1 }
    ]
  }
];
