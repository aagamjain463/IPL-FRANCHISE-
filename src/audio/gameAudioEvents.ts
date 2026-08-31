import { audioManager } from './audioManager';
import { ScreenVariant } from '../navigation/screenRoutes';

export type GameAudioEvent =
  | 'navigation'
  | 'screen-enter'
  | 'auction-bid'
  | 'auction-sold'
  | 'button-hover'
  | 'button-click'
  | 'match-event'
  | 'notification';

export const gameAudioEvents = {
  trigger(event: GameAudioEvent, variant?: ScreenVariant) {
    try {
      switch (event) {
        case 'navigation':
        case 'screen-enter':
          if (variant === 'auction') audioManager.playBigPlayerReveal();
          else if (variant === 'match') audioManager.triggerCrowdRoar(0.35, 650);
          else audioManager.playBatHit(false, false);
          break;
        case 'auction-bid':
          audioManager.playAuctionBid(true);
          break;
        case 'auction-sold':
          audioManager.playAuctionHammer(true);
          break;
        case 'match-event':
          audioManager.playBatHit(true, false);
          break;
        case 'notification':
        case 'button-click':
        case 'button-hover':
        default:
          audioManager.playBatHit(false, false);
      }
    } catch {
      // Audio must never block navigation or gameplay.
    }
  }
};
