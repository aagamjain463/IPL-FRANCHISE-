import React, { useEffect, useState } from 'react';
import { Trophy, Zap, Shield, Sparkles, Gavel, Radio, Users, Calendar } from 'lucide-react';

interface ModeLoadingOverlayProps {
  targetMode?: string;
  modeTitle?: string;
  onComplete: () => void;
}

const TIPS = [
  'FRANCHISE XI: Bidding discipline in early marquee sets preserves funds for uncapped gems.',
  'Death Over Tactics: Deploy pinpoint yorkers and slower ball variations to choke boundary leakage.',
  'Match Engine: Left-hand / Right-hand batting partnerships disrupt opponent bowling line and lengths.',
  'Squad Chemistry: Balance your 25-man roster with at least 5 frontline pacers and 3 specialized spinners.',
  'Scout Radar: Domestic uncapped prodigies can develop into 95+ OVR superstars across seasons.'
];

export const ModeLoadingOverlay: React.FC<ModeLoadingOverlayProps> = ({ targetMode, modeTitle, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const activeMode = targetMode || modeTitle || 'TACTICAL HUB';

  useEffect(() => {
    const start = Date.now();
    const duration = 520; // 520ms snappy FC Mobile-style transition

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        onComplete();
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete]);

  const getModeIcon = () => {
    switch (activeMode) {
      case 'Auction':
      case 'AuctionLive':
      case 'MEGA AUCTION':
      case 'MultiplayerAuction':
        return <Gavel className="w-10 h-10 text-[#D4AF37] animate-bounce" />;
      case 'MatchLive':
      case 'MATCH ARENA':
        return <Radio className="w-10 h-10 text-red-400 animate-pulse" />;
      case 'Schedule':
      case 'Fixtures':
      case 'FIXTURES & SCHEDULE':
        return <Calendar className="w-10 h-10 text-blue-400" />;
      case 'Squad':
      case 'PlayingXI':
      case 'TEAM TACTICS':
        return <Users className="w-10 h-10 text-emerald-400" />;
      default:
        return <Trophy className="w-10 h-10 text-[#D4AF37]" />;
    }
  };

  const getModeTitle = () => {
    if (modeTitle) return `LOADING ${modeTitle.toUpperCase()}`;
    switch (activeMode) {
      case 'Auction':
      case 'AuctionLive':
        return 'ENTERING MEGA AUCTION ARENA';
      case 'MultiplayerAuction':
        return 'CONNECTING TO MULTIPLAYER AUCTION ROOM';
      case 'MatchLive':
        return 'LOADING MATCHDAY STADIUM BROADCAST';
      case 'Schedule':
      case 'Fixtures':
        return 'ACCESSING LEAGUE FIXTURES & STANDINGS';
      case 'Squad':
      case 'PlayingXI':
        return 'INITIALIZING SQUAD & TACTICAL ROSTER';
      case 'YouthAcademy':
        return 'SCANNING DOMESTIC SCOUTING RADAR';
      default:
        return `LOADING ${(activeMode || 'ARENA').toUpperCase()}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070a] flex flex-col items-center justify-between p-8 select-none">
      {/* Top Brand Tag */}
      <div className="flex items-center gap-2 pt-6">
        <div className="w-8 h-8 rounded-lg bg-[#D4AF37] text-black font-black flex items-center justify-center text-xs tracking-tighter">
          XI
        </div>
        <div>
          <h1 className="text-sm font-black text-white tracking-widest uppercase">FRANCHISE XI</h1>
          <p className="text-[9px] text-[#D4AF37] uppercase tracking-wider font-bold">Build. Bid. Dominate.</p>
        </div>
      </div>

      {/* Center Cinematic Card */}
      <div className="flex flex-col items-center text-center max-w-md w-full space-y-5">
        <div className="w-24 h-24 rounded-2xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center shadow-2xl shadow-[#D4AF37]/10 relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/10 to-transparent" />
          {getModeIcon()}
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider italic">
            {getModeTitle()}
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1">Synchronizing league database & match tactics...</p>
        </div>

        {/* Golden Progress Bar */}
        <div className="w-full bg-[#1e293b] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#334155]/40">
          <div
            className="h-full bg-gradient-to-r from-[#b38f2a] via-[#D4AF37] to-amber-300 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="w-full flex justify-between text-[10px] font-mono text-[#64748b]">
          <span>INITIALIZING</span>
          <span className="text-[#D4AF37] font-bold">{progress}%</span>
        </div>
      </div>

      {/* Bottom Pro Tip */}
      <div className="max-w-lg w-full bg-[#0b1329] p-3.5 rounded-xl border border-[#1e293b] text-center text-xs shadow-lg">
        <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider block mb-1">
          💡 Manager Tip
        </span>
        <p className="text-[#94a3b8] text-[11px] leading-relaxed">
          {TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
};
