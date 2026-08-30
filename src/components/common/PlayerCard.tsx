import React from 'react';
import { Player } from '../../types/cricket';
import { TOKENS, getPlayerRarity, getRoleBadgeStyle, PlayerRarityTier } from '../../utils/themeTokens';
import { Zap, Shield, Flame, Star, Award, Sparkles, Plane, Trophy } from 'lucide-react';

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
  const rarity: PlayerRarityTier = getPlayerRarity(player);
  const rarityConfig = TOKENS.rarity[rarity];
  const roleStyle = getRoleBadgeStyle(player.role);

  // 1. COMPACT VARIANT (Used in benches, match lineups, and tight rosters)
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
          isSelected 
            ? 'bg-[#1e293b] border-[#D4AF37] shadow-md shadow-[#D4AF37]/10' 
            : 'bg-[#090e1a] hover:bg-[#0f172a] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0f172a] border border-[#1e293b] flex items-center justify-center font-black font-mono text-xs text-[#D4AF37] shrink-0">
            {player.overall}
          </div>
          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white truncate">{player.name}</span>
              {player.isOverseas && <span className="text-[9px] text-blue-400">✈</span>}
              {isCaptain && <span className="text-[9px] font-black text-amber-400"> (C)</span>}
              {isWicketkeeper && <span className="text-[9px] font-black text-purple-400"> (WK)</span>}
            </div>
            <span className="text-[10px] text-slate-400 block">{player.role} • Form: ★{player.form?.toFixed(1) || '4.0'}</span>
          </div>
        </div>

        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${rarityConfig.badgeBg}`}>
          {rarityConfig.label}
        </span>
      </div>
    );
  }

  // 2. FEATURED / AUCTION / STANDARD CARDS
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden group cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/50 shadow-2xl'
          : `border-[#1e293b] hover:${rarityConfig.borderGlow}`
      } bg-gradient-to-b ${rarityConfig.cardGradient} p-4 sm:p-5`}
    >
      {/* Top Banner: OVR, Role, and Rarity Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          
          {/* OVR Shield */}
          <div className="w-12 h-12 rounded-xl bg-[#080d1a] border border-[#1e293b] flex flex-col items-center justify-center shadow-inner group-hover:scale-105 transition-transform shrink-0">
            <span className="text-xl font-black font-mono text-[#D4AF37] leading-none">
              {player.overall}
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              OVR
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                {player.role}
              </span>
              {player.isOverseas && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 flex items-center gap-0.5">
                  <Plane className="w-2.5 h-2.5" /> {player.nationality}
                </span>
              )}
            </div>

            <h4 className="text-sm sm:text-base font-black text-white uppercase tracking-tight mt-1 group-hover:text-[#D4AF37] transition-colors truncate">
              {player.name}
            </h4>
          </div>
        </div>

        {/* Rarity Tier Pill */}
        <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider shadow-sm ${rarityConfig.badgeBg}`}>
          {rarityConfig.label}
        </span>
      </div>

      {/* Attributes & Key Trait Grid */}
      <div className="grid grid-cols-3 gap-2 my-3.5 pt-3 border-t border-white/5 text-center">
        <div className="bg-[#030712]/60 rounded-xl p-2 border border-white/5">
          <span className="text-[9px] font-black text-slate-400 block uppercase">BAT</span>
          <span className="text-xs font-mono font-black text-rose-400">{player.attributes.battingPower}</span>
        </div>
        <div className="bg-[#030712]/60 rounded-xl p-2 border border-white/5">
          <span className="text-[9px] font-black text-slate-400 block uppercase">BOWL</span>
          <span className="text-xs font-mono font-black text-blue-400">{player.attributes.bowlingSkill}</span>
        </div>
        <div className="bg-[#030712]/60 rounded-xl p-2 border border-white/5">
          <span className="text-[9px] font-black text-slate-400 block uppercase">FORM</span>
          <span className="text-xs font-mono font-black text-emerald-400">★{player.form?.toFixed(1) || '4.0'}</span>
        </div>
      </div>

      {/* Signature Playstyle & Contract Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
        <div className="flex items-center gap-1 text-slate-300 font-bold">
          <Zap className="w-3 h-3 text-[#D4AF37]" />
          <span>{player.battingPlaystyle || player.bowlingPlaystyle || 'All-Round Asset'}</span>
        </div>

        <span className="font-mono font-bold text-amber-300">
          ₹{player.salaryCr || player.basePriceCr} Cr
        </span>
      </div>

      {/* Custom Action Button (if provided) */}
      {customActionText && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onCustomAction) onCustomAction();
          }}
          className="mt-3 w-full py-2 rounded-xl bg-[#1e293b] hover:bg-[#D4AF37] hover:text-black text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
        >
          {customActionText}
        </button>
      )}
    </div>
  );
};
