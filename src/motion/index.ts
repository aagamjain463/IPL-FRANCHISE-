import { Variants } from 'motion/react';

export const motionDurations = {
  micro: 0.18,
  ui: 0.28,
  component: 0.36,
  screen: 0.48,
  moment: 0.72
} as const;

export const motionEasings = {
  standard: [0.16, 1, 0.3, 1],
  exit: [0.7, 0, 0.84, 0],
  emphasized: [0.2, 0.8, 0.2, 1],
  linear: [0, 0, 1, 1]
} as const;

export const motionSprings = {
  press: { type: 'spring', stiffness: 520, damping: 34, mass: 0.55 },
  card: { type: 'spring', stiffness: 360, damping: 30, mass: 0.78 },
  nav: { type: 'spring', stiffness: 420, damping: 36, mass: 0.72 },
  hero: { type: 'spring', stiffness: 140, damping: 24, mass: 0.95 }
} as const;

export const pageMotion: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.992, filter: 'blur(6px)' },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: motionDurations.screen, ease: motionEasings.standard }
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.996,
    filter: 'blur(4px)',
    transition: { duration: motionDurations.ui, ease: motionEasings.exit }
  }
};

export const cinematicHeroMotion: Variants = {
  initial: { opacity: 0, y: 28, scale: 0.985 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...motionSprings.hero, staggerChildren: 0.06, delayChildren: 0.04 }
  }
};

export const revealUpMotion: Variants = {
  initial: { opacity: 0, y: 18 },
  enter: { opacity: 1, y: 0, transition: { duration: motionDurations.component, ease: motionEasings.standard } }
};

export const listContainerMotion: Variants = {
  initial: {},
  enter: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } }
};

export const cardMotion: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  enter: { opacity: 1, y: 0, scale: 1, transition: motionSprings.card }
};

export const bidPulseMotion: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  enter: { opacity: 1, scale: 1, y: 0, transition: { ...motionSprings.card, stiffness: 470 } },
  exit: { opacity: 0, scale: 1.04, y: -8, transition: { duration: motionDurations.micro } }
};

export const modalMotion: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 18 },
  enter: { opacity: 1, scale: 1, y: 0, transition: motionSprings.card },
  exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: motionDurations.micro, ease: motionEasings.exit } }
};

export const overlayMotion: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: motionDurations.ui } },
  exit: { opacity: 0, transition: { duration: motionDurations.micro } }
};

export const tapGesture = { scale: 0.975 };
export const cardHoverGesture = { y: -6, scale: 1.012 };
export const subtleHoverGesture = { y: -2, scale: 1.006 };

export const reduceMotionTransition = { duration: 0.01 };

export function reduced<T>(shouldReduce: boolean, animated: T, fallback: T): T {
  return shouldReduce ? fallback : animated;
}
