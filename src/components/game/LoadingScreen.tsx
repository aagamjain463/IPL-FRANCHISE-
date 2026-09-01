import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Shield, Zap } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { ScreenRouteMeta } from '../../navigation/screenRoutes';
import { cinematicHeroMotion, listContainerMotion, revealUpMotion, overlayMotion, reduceMotionTransition } from '../../motion';

interface LoadingScreenProps {
  route: ScreenRouteMeta;
  durationMs?: number;
  onComplete?: () => void;
}

const toneByVariant: Record<string, 'gold' | 'volt' | 'cyan' | 'ruby'> = {
  auction: 'gold',
  match: 'ruby',
  tournament: 'cyan',
  scouting: 'cyan',
  academy: 'volt',
  squad: 'volt',
  franchise: 'gold',
  press: 'ruby',
  settings: 'cyan',
  hub: 'volt'
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ route, durationMs = 4600, onComplete }) => {
  const shouldReduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(8);
  const messages = route.loadingMessages.length ? route.loadingMessages : ['Preparing Screen', 'Loading Data', 'Finalizing Entry'];
  const activeMessage = useMemo(() => {
    const index = Math.min(messages.length - 1, Math.floor((progress / 100) * messages.length));
    return messages[index];
  }, [messages, progress]);

  useEffect(() => {
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - started;
      const pct = Math.min(100, 8 + (elapsed / durationMs) * 92);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, onComplete, route.path]);

  return (
    <motion.div
      className={`screen-loading screen-loading--${route.variant}`}
      variants={shouldReduceMotion ? undefined : overlayMotion}
      initial={shouldReduceMotion ? false : "initial"}
      animate="enter"
      exit="exit"
      transition={shouldReduceMotion ? reduceMotionTransition : undefined}
    >
      <motion.div className="screen-loading__stadium" initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: shouldReduceMotion ? 0.01 : 0.45 }} />
      <motion.div className="screen-loading__panel" variants={shouldReduceMotion ? undefined : cinematicHeroMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
        <motion.div className="screen-loading__brand" variants={shouldReduceMotion ? undefined : revealUpMotion}>
          <span className="screen-loading__crest"><Shield className="w-5 h-5" /></span>
          <span>FRANCHISE XI 26</span>
        </motion.div>
        <motion.p className="screen-loading__eyebrow" variants={shouldReduceMotion ? undefined : revealUpMotion}>{route.eyebrow}</motion.p>
        <motion.h1 variants={shouldReduceMotion ? undefined : revealUpMotion}>ENTERING {route.title.toUpperCase()}</motion.h1>
        <motion.p className="screen-loading__subtitle" variants={shouldReduceMotion ? undefined : revealUpMotion}>{route.subtitle}</motion.p>
        <motion.div className="screen-loading__progress" variants={shouldReduceMotion ? undefined : revealUpMotion}>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">
            <span>{activeMessage}</span>
            <span className="text-white font-mono">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} tone={toneByVariant[route.variant] || 'volt'} />
        </motion.div>
        <motion.div className="screen-loading__steps" variants={shouldReduceMotion ? undefined : listContainerMotion}>
          {messages.map((message, index) => {
            const done = progress >= ((index + 1) / messages.length) * 100 - 10;
            return (
              <motion.span key={message} className={done ? 'is-done' : ''} variants={shouldReduceMotion ? undefined : revealUpMotion}>
                <Zap className="w-3 h-3" /> {message}
              </motion.span>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
