import { BallEventType, DismissalType, ShotZone } from '../types/cricket';

export function getDeterministicCommentary(
  event: BallEventType,
  runs: number,
  batterName: string,
  bowlerName: string,
  shotZone?: ShotZone,
  dismissalType?: DismissalType,
  overFormatted: string = '0.1'
): string {
  const zone = shotZone || 'Extra Cover';
  
  if (event === '6') {
    const lines = [
      `MASSIVE MAXIMUM! ${batterName} skips down the track and bludgeons ${bowlerName} high over ${zone}! The ball is lost in the upper tier!`,
      `BOOM! Pure timing and muscle from ${batterName}! Swatted over ${zone} into the ecstatic crowd for SIX!`,
      `THAT IS GIGANTIC! ${batterName} picks the slower ball from ${bowlerName} early and deposits it into orbit over ${zone}! 6 runs!`,
      `UNBELIEVABLE HIT! Clean connection from ${batterName}! Clears the boundary rope by 20 rows over ${zone}!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (event === '4') {
    const lines = [
      `CRACKING SHOT! ${batterName} leans into the drive and threads the gap through ${zone} for a blistering FOUR!`,
      `FOUR RUNS! Delicious wristwork by ${batterName}, beating the diving sweeper at ${zone}!`,
      `SHORT AND PUNISHED! ${batterName} rocks back and pulls ${bowlerName} with venom past ${zone} for FOUR!`,
      `STAND AND DELIVER! Pounded through ${zone}! The outfield is lightning fast and that races away for a boundary!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (event === 'WICKET') {
    if (dismissalType === 'Bowled') {
      return `TIMBER! CLEAN BOWLED! ${bowlerName} fires in a searing yorker that crashes straight into middle and off! ${batterName} has to walk back!`;
    }
    if (dismissalType === 'LBW') {
      return `UP GOES THE FINGER! Loud appeal from ${bowlerName}, given! ${batterName} is trapped plumb in front of all three stumps! LBW!`;
    }
    if (dismissalType === 'Caught') {
      return `OUT! IN THE AIR AND TAKEN! ${batterName} slices the ball towards ${zone}, fielder settles underneath and pouches it safely! Big breakthrough for ${bowlerName}!`;
    }
    if (dismissalType === 'Stumped') {
      return `STUMPED! Lightning quick glovework behind the stumps! ${batterName} was out of the crease and the bails are off in a flash!`;
    }
    if (dismissalType === 'Run Out') {
      return `RUN OUT! Disaster in the middle! Direct hit at the striker's end and ${batterName} is caught well short of ground!`;
    }
    return `WICKET! ${bowlerName} strikes! Crucial blow as ${batterName} departs for the dugout!`;
  }

  if (event === '0') {
    const lines = [
      `Dot ball. ${bowlerName} beats the outside edge with a probing delivery outside off. No run.`,
      `Pitched on good length, ${batterName} defends solidly towards ${zone}. Dot ball.`,
      `Slower bouncer from ${bowlerName}! ${batterName} swings and misses completely. Great variation!`,
      `Speared into the blockhole! ${batterName} digs it out back to the bowler. Dot ball.`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (event === '1') {
    return `${batterName} taps ${bowlerName} towards ${zone} and hustles through for a sharp single.`;
  }

  if (event === '2') {
    return `Worked into the vacant gap near ${zone}. Excellent communication and swift running between the wickets allows two easy runs.`;
  }

  if (event === '3') {
    return `Drilled past the infield! Great chase and boundary dive from the fielder saves one run. Three runs scored.`;
  }

  if (event === 'WIDE') {
    return `WIDE! ${bowlerName} spills this delivery well outside the tramline. Umpire signals an extra run.`;
  }

  if (event === 'NO_BALL') {
    return `NO BALL! Overstepping by ${bowlerName}! Free hit coming up on the next delivery!`;
  }

  return `Single taken as ${batterName} works it away.`;
}
