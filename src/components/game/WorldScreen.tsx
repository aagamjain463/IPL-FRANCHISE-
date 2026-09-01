import React from 'react';
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
      <div className="game-world__content">{children}</div>
    </section>
  );
};

