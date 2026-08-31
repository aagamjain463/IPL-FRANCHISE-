import React from 'react';
import { Player } from '../../types/cricket';
import { FCPlayerCard } from '../fc26/FCPlayerCard';

interface PlayerCardProps {
  player: Player;
  variant?: 'standard' | 'compact' | 'featured' | 'auction' | 'squad';
  onClick?: () => void;
  isSelected?: boolean;
  isCaptain?: boolean;
  isWicketkeeper?: boolean;
  customActionText?: string;
  onCustomAction?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  variant = 'standard',
  onClick,
  isSelected = false,
  isCaptain = false,
  isWicketkeeper = false,
  customActionText,
  onCustomAction
}) => {
  if (variant === 'compact') {
    return (
      <FCPlayerCard
        player={player}
        size="compact"
        onClick={onClick}
        isSelected={isSelected}
      />
    );
  }

  const cardSize = variant === 'featured' ? 'lg' : variant === 'auction' ? 'md' : 'md';

  return (
    <div className="relative group">
      <FCPlayerCard
        player={player}
        size={cardSize}
        onClick={onClick}
        isSelected={isSelected}
      />

      {/* Optional Captain / WK Badge Overlay */}
      {(isCaptain || isWicketkeeper) && (
        <div className="absolute top-2 left-2 z-40 flex items-center gap-1">
          {isCaptain && (
            <span className="px-2 py-0.5 rounded-full bg-[#D4AF37] text-black font-black text-[9px] shadow-lg border border-yellow-200">
              (C) CAPTAIN
            </span>
          )}
          {isWicketkeeper && (
            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white font-black text-[9px] shadow-lg border border-purple-300">
              (WK)
            </span>
          )}
        </div>
      )}

      {/* Custom Action Button (e.g. In Auction / Swap) */}
      {customActionText && onCustomAction && (
        <div className="mt-2 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCustomAction();
            }}
            className="w-full py-1.5 rounded-xl bg-[#00FF87] hover:bg-[#00e077] text-black font-black text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
          >
            {customActionText}
          </button>
        </div>
      )}
    </div>
  );
};
