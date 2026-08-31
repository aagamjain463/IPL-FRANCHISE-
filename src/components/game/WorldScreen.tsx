import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ScreenRouteMeta } from '../../navigation/screenRoutes';

interface WorldScreenProps {
  route: ScreenRouteMeta;
  children: React.ReactNode;
  compact?: boolean;
}

export const WorldScreen: React.FC<WorldScreenProps> = ({ route, children, compact = false }) => {
  return (
    <section className={`game-world game-world--${route.variant} ${compact ? 'game-world--compact' : ''}`}>
      <div className="game-world__backdrop" />
      <div className="game-world__beam game-world__beam--left" />
      <div className="game-world__beam game-world__beam--right" />
      {!compact && route.variant !== 'hub' && (
        <header className="game-world__header fc-pop">
          <div>
            <p className="game-world__eyebrow">{route.eyebrow}</p>
            <h1>{route.title}</h1>
            <p>{route.subtitle}</p>
          </div>
          <div className="game-world__tag">
            IPL FRANCHISE <ChevronRight className="w-3 h-3" /> {route.title.toUpperCase()}
          </div>
        </header>
      )}
      <div className="game-world__content">{children}</div>
    </section>
  );
};
