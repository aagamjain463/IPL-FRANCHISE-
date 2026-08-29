// Seamless Backwards Compatibility Routing for soundFx
// Routes all legacy soundFx calls into the unified central audioManager

import { audioManager } from './audioManager';

export const soundFx = {
  playBatHit: (isBoundary: boolean = false, isSix: boolean = false) => 
    audioManager.playBatHit(isBoundary, isSix),

  playWicketSound: () => 
    audioManager.playWicketSound(),

  playCheer: (isSix: boolean = false) => 
    audioManager.triggerCrowdRoar(isSix ? 1.0 : 0.6, isSix ? 2000 : 1200),

  playHammerKnock: (isAcquired: boolean = false) => 
    audioManager.playAuctionHammer(isAcquired),

  playTimerTick: (isUrgent: boolean = false) => 
    audioManager.playCountdownTick(isUrgent),

  playBidChime: (isUser: boolean = false) => 
    audioManager.playAuctionBid(isUser),

  playOutbid: () =>
    audioManager.playOutbidAlert(),

  playBigReveal: () =>
    audioManager.playBigPlayerReveal(),

  playVictory: () =>
    audioManager.playVictorySting(),

  playDefeat: () =>
    audioManager.playDefeatSting(),

  playRewardClaim: () =>
    audioManager.playRewardClaim(),

  playLevelUp: () =>
    audioManager.playLevelUp(),

  setMuted: (muted: boolean) => {
    if (muted && audioManager.getSettings().isSfxEnabled) {
      audioManager.toggleSfx();
    } else if (!muted && !audioManager.getSettings().isSfxEnabled) {
      audioManager.toggleSfx();
    }
  },

  getMuted: () => !audioManager.getSettings().isSfxEnabled,

  toggleMute: () => !audioManager.toggleSfx()
};
