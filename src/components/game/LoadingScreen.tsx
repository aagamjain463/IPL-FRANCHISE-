import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { ScreenRouteMeta } from '../../navigation/screenRoutes';

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

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ route, durationMs = 760, onComplete }) => {
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
    <div className={`screen-loading screen-loading--${route.variant}`}>
      <div className="screen-loading__stadium" />
      <div className="screen-loading__panel">
        <div className="screen-loading__brand">
          <span className="screen-loading__crest"><Shield className="w-5 h-5" /></span>
          <span>IPL FRANCHISE</span>
        </div>
        <p className="screen-loading__eyebrow">{route.eyebrow}</p>
        <h1>ENTERING {route.title.toUpperCase()}</h1>
        <p className="screen-loading__subtitle">{route.subtitle}</p>
        <div className="screen-loading__progress">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">
            <span>{activeMessage}</span>
            <span className="text-white font-mono">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} tone={toneByVariant[route.variant] || 'volt'} />
        </div>
        <div className="screen-loading__steps">
          {messages.map((message, index) => {
            const done = progress >= ((index + 1) / messages.length) * 100 - 10;
            return (
              <span key={message} className={done ? 'is-done' : ''}>
                <Zap className="w-3 h-3" /> {message}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
