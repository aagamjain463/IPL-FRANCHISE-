// Centralized Design System Tokens for IPL FRANCHISE 2.0
export const TOKENS = {
  colors: {
    bgDark: '#030712',
    bgCard: '#090e1a',
    bgCardElevated: '#0f172a',
    bgCardGlass: 'rgba(15, 23, 42, 0.85)',
    borderSubtle: '#1e293b',
    borderAccent: 'rgba(212, 175, 55, 0.35)',
    gold: '#D4AF37',
    goldLight: '#F3E5AB',
    goldGlow: 'rgba(212, 175, 55, 0.15)',
    emerald: '#10b981',
    rose: '#f43f5e',
    blue: '#3b82f6',
    amber: '#f59e0b',
    purple: '#a855f7',
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b'
  },
  typography: {
    heading: "font-['Rajdhani',_'Chakra_Petch',_sans-serif]",
    body: "font-['Plus_Jakarta_Sans',_sans-serif]",
    mono: "font-mono font-bold"
  },
  surfaces: {
    card: 'bg-[#090e1a] border border-[#1e293b] rounded-2xl shadow-xl',
    cardElevated: 'bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl',
    cardInteractive: 'bg-[#090e1a] hover:bg-[#0f172a] border border-[#1e293b] hover:border-[#334155] rounded-2xl transition-all duration-200 cursor-pointer shadow-lg',
    cardGold: 'bg-gradient-to-b from-[#0f172a] to-[#090e1a] border border-[#D4AF37]/40 rounded-2xl shadow-2xl shadow-[#D4AF37]/10'
  },
  rarity: {
    STANDARD: {
      label: 'STANDARD',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      borderGlow: 'border-slate-700',
      cardGradient: 'from-slate-900 via-[#090e1a] to-slate-950',
      accent: '#94a3b8'
    },
    INFORM: {
      label: 'IN-FORM',
      badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
      borderGlow: 'border-emerald-500/50 shadow-emerald-500/10',
      cardGradient: 'from-emerald-950/40 via-[#090e1a] to-[#030712]',
      accent: '#10b981'
    },
    BREAKOUT: {
      label: 'BREAKOUT',
      badgeBg: 'bg-blue-950/90 text-blue-300 border-blue-500/50',
      borderGlow: 'border-blue-500/50 shadow-blue-500/10',
      cardGradient: 'from-blue-950/40 via-[#090e1a] to-[#030712]',
      accent: '#3b82f6'
    },
    ELITE: {
      label: 'ELITE',
      badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
      borderGlow: 'border-amber-500/60 shadow-amber-500/15',
      cardGradient: 'from-amber-950/40 via-[#090e1a] to-[#030712]',
      accent: '#f59e0b'
    },
    LEGEND: {
      label: 'LEGEND',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-black font-black border-[#D4AF37]',
      borderGlow: 'border-[#D4AF37] shadow-[#D4AF37]/25',
      cardGradient: 'from-amber-950/60 via-[#0f172a] to-[#030712]',
      accent: '#D4AF37'
    }
  }
};

export type PlayerRarityTier = 'STANDARD' | 'INFORM' | 'BREAKOUT' | 'ELITE' | 'LEGEND';

export function getPlayerRarity(player: { overall: number; form?: number; age?: number; potential?: number }): PlayerRarityTier {
  if (player.overall >= 90) return 'LEGEND';
  if (player.overall >= 85) return 'ELITE';
  if (player.form && player.form >= 4.5) return 'INFORM';
  if ((player.age && player.age <= 23) && (player.potential && player.potential >= 86)) return 'BREAKOUT';
  return 'STANDARD';
}

export function getRoleBadgeStyle(role: string): { bg: string; text: string; border: string } {
  switch (role.toLowerCase()) {
    case 'batsman':
    case 'batter':
      return { bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-500/40' };
    case 'bowler':
      return { bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-500/40' };
    case 'all-rounder':
    case 'allrounder':
      return { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-500/40' };
    case 'wicketkeeper':
    case 'wk':
      return { bg: 'bg-purple-950/60', text: 'text-purple-400', border: 'border-purple-500/40' };
    default:
      return { bg: 'bg-slate-900/80', text: 'text-slate-300', border: 'border-slate-700' };
  }
}

