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
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b'
  },
  rarity: {
    STANDARD: {
      label: 'STANDARD',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      borderGlow: 'border-slate-700',
      accent: '#94a3b8'
    },
    INFORM: {
      label: 'IN-FORM',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      borderGlow: 'border-emerald-500/50',
      accent: '#10b981'
    },
    BREAKOUT: {
      label: 'BREAKOUT',
      badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
      borderGlow: 'border-blue-500/50',
      accent: '#3b82f6'
    },
    ELITE: {
      label: 'ELITE',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      borderGlow: 'border-amber-500/60 shadow-amber-500/10',
      accent: '#f59e0b'
    },
    LEGEND: {
      label: 'LEGEND',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-black font-black border-[#D4AF37]',
      borderGlow: 'border-[#D4AF37] shadow-[#D4AF37]/20',
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
