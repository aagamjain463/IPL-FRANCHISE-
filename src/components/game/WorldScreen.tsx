import React from 'react';
import { Gavel, Home, Radio, Shield, Sparkles, Trophy, Users, Zap } from 'lucide-react';
import { ScreenRouteMeta, getRouteForTab } from '../../navigation/screenRoutes';
import { useGame } from '../../context/GameContext';
import { AppTab, GameScreen } from '../../types/game';

interface WorldScreenProps {
  route: ScreenRouteMeta;
  children: React.ReactNode;
  compact?: boolean;
}

const railItems: Array<{ label: string; tab: AppTab; screen: GameScreen; icon: React.ReactNode }> = [
  { label: 'Hub', tab: 'Dashboard', screen: 'Dashboard', icon: <Home className="w-4 h-4" /> },
  { label: 'Auction', tab: 'AuctionLive', screen: 'Auction', icon: <Gavel className="w-4 h-4" /> },
  { label: 'Squad', tab: 'Squad', screen: 'Dashboard', icon: <Users className="w-4 h-4" /> },
  { label: 'XI', tab: 'PlayingXI', screen: 'Dashboard', icon: <Shield className="w-4 h-4" /> },
  { label: 'Match', tab: 'Play', screen: 'Dashboard', icon: <Zap className="w-4 h-4" /> },
  { label: 'League', tab: 'League', screen: 'Dashboard', icon: <Trophy className="w-4 h-4" /> },
  { label: 'Scout', tab: 'Scout', screen: 'Dashboard', icon: <Radio className="w-4 h-4" /> },
  { label: 'Academy', tab: 'YouthAcademy', screen: 'Dashboard', icon: <Sparkles className="w-4 h-4" /> }
];

export const WorldScreen: React.FC<WorldScreenProps> = ({ route, children, compact = false }) => {
  const { activeTab, setActiveTab, setCurrentScreen } = useGame();

  const enter = (tab: AppTab, screen: GameScreen) => {
    setCurrentScreen(screen);
    setActiveTab(tab);
    window.history.pushState({}, '', getRouteForTab(tab));
  };

  return (
    <section className={`game-world game-world--${route.variant} ${compact ? 'game-world--compact' : ''}`}>
      <div className="game-world__backdrop" />
      <div className="game-world__beam game-world__beam--left" />
      <div className="game-world__beam game-world__beam--right" />
      <div className="world-director-rail" aria-label="World quick navigation">
        {railItems.map(item => (
          <button
            key={item.label}
            onClick={() => enter(item.tab, item.screen)}
            className={activeTab === item.tab ? 'is-active' : ''}
            title={`Enter ${item.label}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="game-world__content">{children}</div>
    </section>
  );
};
