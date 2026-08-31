import React, { useState } from 'react';
import { Player } from '../../types/cricket';
import { FCCardTier } from '../../types/fc26';
import { getFCCardTier, getFCPlayerRatings, getPlayerPlayStylePlus } from '../../engine/fc26Engine';
import { Zap, Shield, Flame, Sparkles, Award, Star, Diamond } from 'lucide-react';

interface FCPlayerCardProps {
  player: Player;
  customTier?: FCCardTier;
  size?: 'mini' | 'sm' | 'md' | 'lg' | 'hero' | 'compact';
  rankLevel?: number; // 0 to 5
  skillBoost?: number; // e.g. +5
  showDetailsModalOnClick?: boolean;
  onClick?: () => void;
  className?: string;
  isWalkout?: boolean;
  isSelected?: boolean;
}

export const FCPlayerCard: React.FC<FCPlayerCardProps> = ({
  player,
  customTier,
  size = 'md',
  rankLevel = 3,
  skillBoost = 5,
  onClick,
  className = '',
  isWalkout = false,
  isSelected = false
}) => {
  const tier = customTier || getFCCardTier(player);
  const ratings = getFCPlayerRatings(player);
  const playStylePlus = getPlayerPlayStylePlus(player);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [showPsTooltip, setShowPsTooltip] = useState(false);

  // Mouse tilt calculation for realistic 3D feel
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (size === 'mini' || size === 'compact') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;
    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.4
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos({ x: 50, y: 50, opacity: 0 });
  };

  // Authentic FC Mobile Card Art Tiers
  const getTierTheme = () => {
    switch (tier) {
      case 'Icon Legend':
        return {
          bgGradient: 'bg-gradient-to-b from-[#fff7d1] via-[#e6be44] to-[#78540c]',
          cardFrame: 'border-[#ffe97d]',
          headerGlow: 'bg-[#ffd700]',
          textColor: 'text-[#1e1502]',
          subTextColor: 'text-[#423107]',
          statColor: 'text-[#ffd700]',
          glow: 'shadow-[0_0_35px_rgba(230,190,68,0.5)]',
          badgeBg: 'bg-[#2b1f02] text-[#ffe67d] border-[#ffe67d]/70',
          accent: '#FFE27D',
          borderGrad: 'from-[#fff3a8] via-[#e5b839] to-[#805900]'
        };
      case 'TOTW':
        return {
          bgGradient: 'bg-gradient-to-b from-[#021f3d] via-[#05386b] to-[#011429]',
          cardFrame: 'border-[#00E5FF]',
          headerGlow: 'bg-[#00E5FF]',
          textColor: 'text-[#e0f7ff]',
          subTextColor: 'text-[#7dd3fc]',
          statColor: 'text-[#00E5FF]',
          glow: 'shadow-[0_0_35px_rgba(0,229,255,0.45)]',
          badgeBg: 'bg-[#03203c] text-[#38bdf8] border-[#00E5FF]/70',
          accent: '#00E5FF',
          borderGrad: 'from-[#38bdf8] via-[#0284c7] to-[#082f49]'
        };
      case 'Centurions':
        return {
          bgGradient: 'bg-gradient-to-b from-[#5c0d1e] via-[#3b0813] to-[#1a0308]',
          cardFrame: 'border-[#ff4b72]',
          headerGlow: 'bg-[#FF1E56]',
          textColor: 'text-[#ffe4e9]',
          subTextColor: 'text-[#fda4af]',
          statColor: 'text-[#FF1E56]',
          glow: 'shadow-[0_0_35px_rgba(255,30,86,0.45)]',
          badgeBg: 'bg-[#360812] text-[#f43f5e] border-[#ff4b72]/70',
          accent: '#FF1E56',
          borderGrad: 'from-[#f43f5e] via-[#be123c] to-[#4c0519]'
        };
      case 'Wonderkid Evo':
        return {
          bgGradient: 'bg-gradient-to-b from-[#033b26] via-[#022317] to-[#01140d]',
          cardFrame: 'border-[#00FF87]',
          headerGlow: 'bg-[#00FF87]',
          textColor: 'text-[#dcfce7]',
          subTextColor: 'text-[#86efac]',
          statColor: 'text-[#00FF87]',
          glow: 'shadow-[0_0_35px_rgba(0,255,135,0.45)]',
          badgeBg: 'bg-[#022619] text-[#00FF87] border-[#00FF87]/70',
          accent: '#00FF87',
          borderGrad: 'from-[#00FF87] via-[#059669] to-[#064e3b]'
        };
      case 'Silver Rare':
        return {
          bgGradient: 'bg-gradient-to-b from-[#e2e8f0] via-[#94a3b8] to-[#334155]',
          cardFrame: 'border-[#cbd5e1]',
          headerGlow: 'bg-[#e2e8f0]',
          textColor: 'text-[#0f172a]',
          subTextColor: 'text-[#334155]',
          statColor: 'text-[#e2e8f0]',
          glow: 'shadow-[0_0_25px_rgba(226,232,240,0.3)]',
          badgeBg: 'bg-[#1e293b] text-white border-slate-400',
          accent: '#cbd5e1',
          borderGrad: 'from-slate-200 via-slate-400 to-slate-700'
        };
      case 'Gold Rare':
      default:
        return {
          bgGradient: 'bg-gradient-to-b from-[#e5ca72] via-[#b89530] to-[#59430c]',
          cardFrame: 'border-[#ffe17d]',
          headerGlow: 'bg-[#D4AF37]',
          textColor: 'text-[#241a02]',
          subTextColor: 'text-[#473406]',
          statColor: 'text-[#FFE27D]',
          glow: 'shadow-[0_0_30px_rgba(212,175,55,0.4)]',
          badgeBg: 'bg-[#332503] text-[#ffd666] border-[#ffe17d]/70',
          accent: '#D4AF37',
          borderGrad: 'from-[#fef08a] via-[#ca8a04] to-[#713f12]'
        };
    }
  };

  const theme = getTierTheme();

  const positionBadge = () => {
    switch (player.role) {
      case 'Top-order Batter': return 'BAT';
      case 'Middle-order Batter': return 'MID';
      case 'Finisher': return 'FIN';
      case 'Wicketkeeper Batter': return 'WK';
      case 'Batting All-rounder': return 'ALL';
      case 'Bowling All-rounder': return 'ALL';
      case 'Pace Bowler': return 'PAC';
      case 'Spin Bowler': return 'SPN';
      default: return 'ALL';
    }
  };

  const countryFlags: Record<string, string> = {
    'India': '🇮🇳',
    'Australia': '🇦🇺',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'South Africa': '🇿🇦',
    'New Zealand': '🇳🇿',
    'West Indies': '🌴',
    'Afghanistan': '🇦🇫',
    'Sri Lanka': '🇱🇰',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩'
  };

  const flag = countryFlags[player.nationality] || '🏏';

  // 1. MINI TOKEN (For 3D Turf Formation / Field Pitch)
  if (size === 'mini') {
    return (
      <div
        onClick={onClick}
        className={`relative select-none cursor-pointer flex flex-col items-center transition-all duration-200 hover:scale-110 ${className}`}
      >
        <div className={`w-14 h-18 sm:w-16 sm:h-20 rounded-xl p-[2px] bg-gradient-to-b ${theme.borderGrad} ${theme.glow} shadow-xl relative overflow-hidden flex flex-col justify-between`}>
          {/* Card Top Pill */}
          <div className="flex items-center justify-between px-1 pt-0.5">
            <span className="font-black text-xs sm:text-sm font-mono-sport text-white drop-shadow">
              {ratings.overall}
            </span>
            <span className="text-[8px] font-black text-white px-1 rounded bg-black/40">
              {positionBadge()}
            </span>
          </div>

          {/* Player Mini Avatar */}
          <div className="flex items-center justify-center my-0.5">
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs text-white border border-white/40 shadow"
              style={{ backgroundColor: player.avatarColor || '#1e293b' }}
            >
              {player.shortName?.slice(0, 2).toUpperCase() || player.name.slice(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Bottom Name Pill */}
          <div className="bg-black/90 px-1 py-0.5 rounded-b-[10px] text-center truncate">
            <span className="text-[8px] sm:text-[9px] font-black text-white truncate block">
              {player.shortName || player.name.split(' ').pop()}
            </span>
          </div>
        </div>

        {/* Rank Diamonds 💎 under card */}
        <div className="flex items-center gap-0.5 mt-1">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rotate-45 rounded-[1px] ${
                i < rankLevel ? 'bg-[#00FF87] shadow-[0_0_6px_#00FF87]' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. COMPACT ROW / SQUAD BENCH CARD
  if (size === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group select-none ${
          isSelected 
            ? 'bg-[#10192e] border-[#00FF87] shadow-lg shadow-[#00FF87]/20 ring-1 ring-[#00FF87]' 
            : 'bg-[#0a0f1d] hover:bg-[#121b2d] border-[#182238]'
        } ${className}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Mini OVR Badge */}
          <div className={`w-10 h-10 rounded-xl p-[1.5px] bg-gradient-to-b ${theme.borderGrad} shrink-0 shadow flex items-center justify-center`}>
            <div className="w-full h-full bg-[#05070d] rounded-[10px] flex flex-col items-center justify-center">
              <span className={`font-black text-sm font-mono-sport leading-none ${theme.statColor}`}>
                {ratings.overall}
              </span>
              <span className="text-[7px] font-black uppercase text-slate-400">
                {positionBadge()}
              </span>
            </div>
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-white group-hover:text-[#00FF87] transition truncate font-heading uppercase">
                {player.name}
              </h4>
              <span className="text-xs">{flag}</span>
              {player.isYouthProspect && (
                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-[#00FF87]/20 text-[#00FF87] border border-[#00FF87]/40">
                  EVO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium">
              <span>{player.role}</span>
              <span>•</span>
              <span className="font-mono text-emerald-400 font-bold">₹{player.salaryCr} Cr</span>
            </div>
          </div>
        </div>

        {/* Right PlayStyle+ / Tier Tag */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${theme.badgeBg}`}>
            {tier}
          </span>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`w-1 h-1 rotate-45 rounded-[0.5px] ${
                  i < rankLevel ? 'bg-[#00FF87]' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. STANDARD, MEDIUM, LARGE & HERO 3D FOIL CARDS
  const sizeClasses = {
    sm: 'w-[155px] h-[245px] text-[10px]',
    md: 'w-[215px] h-[335px] text-xs',
    lg: 'w-[275px] h-[425px] text-sm',
    hero: 'w-[325px] h-[495px] text-base',
    mini: '',
    compact: ''
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: 'transform 0.12s ease-out'
      }}
      className={`relative select-none cursor-pointer group rounded-[24px] p-[3px] bg-gradient-to-b ${theme.borderGrad} transition-all duration-300 ${sizeClasses[size]} ${theme.glow} ${className}`}
    >
      {/* Outer Card Hex/Shield Container */}
      <div 
        className={`w-full h-full rounded-[22px] ${theme.bgGradient} p-[3px] border ${theme.cardFrame} relative overflow-hidden shadow-2xl flex flex-col justify-between fc-card-shimmer`}
      >
        {/* Holographic dynamic glare overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-30"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)`,
            opacity: glarePos.opacity
          }}
        />

        {/* FC Mobile Angular Scanlines Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.15)_0%,transparent_40%,rgba(0,0,0,0.3)_100%)] pointer-events-none z-10" />

        {/* TOP SECTION: OVR, Position, Rank Diamonds, Flag, Skill Boost */}
        <div className="relative p-3 z-20 flex flex-col justify-between flex-1">
          
          {/* Top Header Row */}
          <div className="flex items-start justify-between">
            
            {/* OVR + Position + Flag */}
            <div className="flex flex-col items-center">
              <span className={`font-black text-3xl md:text-4xl leading-none tracking-tighter ${theme.textColor} font-mono-sport drop-shadow`}>
                {ratings.overall}
              </span>
              <span className={`font-black text-xs uppercase tracking-wider ${theme.subTextColor} mt-0.5`}>
                {positionBadge()}
              </span>
              <div className="w-5 h-[1.5px] bg-black/20 my-1" />
              <span className="text-sm drop-shadow" title={player.nationality}>{flag}</span>
              {player.currentTeamId && (
                <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-80 font-mono">
                  {player.currentTeamId.toUpperCase()}
                </span>
              )}
            </div>

            {/* Top Right: Tier Badge, Rank Diamonds & PlayStyles+ */}
            <div className="flex flex-col items-end gap-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${theme.badgeBg} shadow-sm font-mono`}>
                {tier}
              </span>

              {/* Rank Up Green Diamonds 💎 */}
              <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-xs">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rotate-45 rounded-[0.5px] transition-all ${
                      i < rankLevel ? 'bg-[#00FF87] shadow-[0_0_8px_#00FF87]' : 'bg-slate-600/70'
                    }`}
                  />
                ))}
              </div>

              {/* Skill Boost Indicator */}
              <span className="text-[9px] font-mono font-black text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                +{skillBoost} BOOST
              </span>

              {/* Signature PlayStyle+ Badge */}
              {playStylePlus && (
                <div 
                  className="relative group/ps mt-0.5"
                  onMouseEnter={() => setShowPsTooltip(true)}
                  onMouseLeave={() => setShowPsTooltip(false)}
                >
                  <div 
                    className="flex items-center gap-1 px-2 py-0.8 rounded-md bg-gradient-to-r from-[#00FF87] to-emerald-400 text-black font-black text-[9px] tracking-tight border border-white/60 shadow-md animate-pulse cursor-help"
                  >
                    <Sparkles className="w-2.5 h-2.5 fill-black text-black" />
                    <span>{playStylePlus.shortTag}</span>
                  </div>

                  {/* PlayStyles+ Tooltip */}
                  {showPsTooltip && (
                    <div className="absolute right-0 top-6 w-48 p-2.5 rounded-xl bg-[#04060c] border border-[#00FF87] text-white z-50 shadow-2xl pointer-events-none text-left backdrop-blur-lg">
                      <div className="flex items-center gap-1.5 text-[#00FF87] font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5 fill-[#00FF87]" />
                        <span>{playStylePlus.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1 leading-snug">
                        {playStylePlus.description}
                      </p>
                      <div className="mt-1.5 pt-1 border-t border-slate-800 text-[9px] text-[#00FF87] font-medium">
                        ⚡ {playStylePlus.inGameEffect}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Player Portrait Avatar Center Piece */}
          <div className="relative flex-1 flex items-center justify-center my-1">
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/20 backdrop-blur-xs flex items-center justify-center border-2 border-white/30 shadow-inner">
              <div 
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-black text-2xl text-white shadow-xl"
                style={{ backgroundColor: player.avatarColor || '#1e293b' }}
              >
                {player.shortName?.slice(0, 2).toUpperCase() || player.name.slice(0, 2).toUpperCase()}
              </div>
              {player.form >= 4 && (
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-orange-600 border border-white text-white shadow-lg animate-bounce">
                  <Flame className="w-3.5 h-3.5 fill-white" />
                </div>
              )}
            </div>
          </div>

          {/* Player Name Banner with FC Mobile Style Bar */}
          <div className="text-center bg-black/40 py-1 px-2 rounded-xl backdrop-blur-xs border border-white/10">
            <h4 className={`font-black text-xs md:text-sm uppercase tracking-tight truncate ${theme.textColor} drop-shadow font-heading`}>
              {player.name}
            </h4>
            <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-wider opacity-80 mt-0.5">
              <span>{player.role}</span>
              <span>•</span>
              <span>AGE {player.age}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: 6 FC Mobile Core Attributes */}
        <div className="bg-black/90 backdrop-blur-md p-2 rounded-b-[20px] border-t border-white/15 z-20 text-white">
          <div className="grid grid-cols-6 gap-0.5 text-center font-mono-sport">
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400">BAT</span>
              <span className="font-black text-xs md:text-sm text-amber-300">{ratings.bat}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400">BWL</span>
              <span className="font-black text-xs md:text-sm text-cyan-300">{ratings.bwl}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400">SPD</span>
              <span className="font-black text-xs md:text-sm text-emerald-300">{ratings.spd}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400">CLU</span>
              <span className="font-black text-xs md:text-sm text-rose-300">{ratings.clu}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400">FLD</span>
              <span className="font-black text-xs md:text-sm text-yellow-300">{ratings.fld}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] md:text-[9px] font-bold text-slate-400">PHY</span>
              <span className="font-black text-xs md:text-sm text-purple-300">{ratings.phy}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
