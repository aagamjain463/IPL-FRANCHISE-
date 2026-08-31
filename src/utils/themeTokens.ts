// Centralized Design System Tokens for IPL FRANCHISE 2.0
export const TOKENS = {
  // === COLOR SYSTEM ===
  colors: {
    // Backgrounds
    bgDark: '#030712',
    bgDarkSurface: '#05070a',
    bgCard: '#090e1a',
    bgCardElevated: '#0f172a',
    bgCardGlass: 'rgba(15, 23, 42, 0.85)',
    bgHero: '#0a0c12',
    bgHeroGradient: 'linear-gradient(135deg, #0a0c12 0%, #030712 100%)',
    
    // Borders
    borderSubtle: '#1e293b',
    borderMedium: '#334155',
    borderAccent: 'rgba(212, 175, 55, 0.35)',
    borderGold: '#D4AF37',
    
    // Gold Accent System
    gold: '#D4AF37',
    goldLight: '#F3E5AB',
    goldGlow: 'rgba(212, 175, 55, 0.15)',
    goldGradient: 'linear-gradient(135deg, #D4AF37 0%, #F3E5AB 100%)',
    goldShadow: 'rgba(212, 175, 55, 0.25)',
    
    // Status Colors
    emerald: '#10b981',
    emeraldGlow: 'rgba(16, 185, 129, 0.15)',
    rose: '#f43f5e',
    roseGlow: 'rgba(244, 63, 94, 0.15)',
    blue: '#3b82f6',
    blueGlow: 'rgba(59, 130, 246, 0.15)',
    amber: '#f59e0b',
    amberGlow: 'rgba(245, 158, 11, 0.15)',
    purple: '#a855f7',
    purpleGlow: 'rgba(168, 85, 247, 0.15)',
    
    // Typography
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textGold: '#D4AF37',
    
    // Surface Gradients
    surfacePremium: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(9, 14, 26, 0.95) 100%)',
    surfaceHero: 'linear-gradient(135deg, rgba(10, 12, 18, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)',
    surfaceCard: 'linear-gradient(180deg, #0f172a 0%, #090e1a 100%)',
    
    // Status Gradients
    successGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    dangerGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
    infoGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
  },
  
  // === SPACING SYSTEM ===
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
    '5xl': '8rem'     // 128px
  },
  
  // === TYPOGRAPHY SYSTEM ===
  typography: {
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px
    '4xl': '2.25rem',    // 36px
    '5xl': '3rem',       // 48px
    '6xl': '3.75rem',    // 60px
    '7xl': '4.5rem',     // 72px
    '8xl': '6rem',       // 96px
    '9xl': '8rem'        // 128px
  },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
      loose: '2'
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },
  
  // === BORDER RADIUS SYSTEM ===
  borderRadius: {
    none: '0',
    sm: '0.25rem',     // 4px
    md: '0.375rem',    // 6px
    lg: '0.5rem',      // 8px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px'
  },
  
  // === SHADOW SYSTEM ===
  shadow: {
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    small: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    premium: '0 0 40px -10px rgba(212, 175, 55, 0.3)',
    gold: '0 0 30px -5px rgba(212, 175, 55, 0.4)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  
  // === ANIMATION TIMING ===
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
      cinematic: '1000ms'
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      premium: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  // === MOTION TOKENS ===
  motion: {
    hover: {
      scale: '1.02',
      brightness: '1.05'
    },
    tap: {
      scale: '0.98',
      brightness: '0.95'
    },
    slide: {
      amount: '8px'
    },
    fade: {
      from: '0',
      to: '1'
    }
  },
  
  // === COMPONENT VARIANTS ===
  components: {
    card: {
      compact: {
        padding: '0.75rem',
        borderRadius: '0.5rem',
        shadow: 'small'
      },
      standard: {
        padding: '1rem',
        borderRadius: '0.75rem',
        shadow: 'medium'
      },
      featured: {
        padding: '1.5rem',
        borderRadius: '1rem',
        shadow: 'large'
      },
      premium: {
        padding: '2rem',
        borderRadius: '1.5rem',
        shadow: 'premium'
      }
    },
    button: {
      primary: {
        background: 'linear-gradient(135deg, #D4AF37 0%, #F3E5AB 100%)',
        color: '#000000',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      },
      secondary: {
        background: '#0f172a',
        color: '#D4AF37',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      },
      tertiary: {
        background: 'transparent',
        color: '#94a3b8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      },
      action: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#ffffff',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }
    },
    input: {
      standard: {
        background: '#05070a',
        border: '1px solid #334155',
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem'
      },
      premium: {
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '0.75rem',
        padding: '1rem 1.25rem'
      },
      search: {
        background: 'rgba(9, 14, 26, 0.9)',
        border: '1px solid #1e293b',
        borderRadius: '9999px',
        padding: '0.75rem 1.5rem'
      }
    }
  },
  
  // === PLAYER RARITY SYSTEM ===
  rarity: {
    STANDARD: {
      label: 'STANDARD',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      borderGlow: 'border-slate-700',
      accent: '#94a3b8',
      shadow: 'shadow-slate-900/20'
    },
    INFORM: {
      label: 'IN-FORM',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      borderGlow: 'border-emerald-500/50',
      accent: '#10b981',
      shadow: 'shadow-emerald-500/20'
    },
    BREAKOUT: {
      label: 'BREAKOUT',
      badgeBg: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
      borderGlow: 'border-blue-500/50',
      accent: '#3b82f6',
      shadow: 'shadow-blue-500/20'
    },
    ELITE: {
      label: 'ELITE',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      borderGlow: 'border-amber-500/60 shadow-amber-500/10',
      accent: '#f59e0b',
      shadow: 'shadow-amber-500/30'
    },
    LEGEND: {
      label: 'LEGEND',
      badgeBg: 'bg-gradient-to-r from-amber-500 to-[#D4AF37] text-black font-black border-[#D4AF37]',
      borderGlow: 'border-[#D4AF37] shadow-[#D4AF37]/20',
      accent: '#D4AF37',
      shadow: 'shadow-[#D4AF37]/40'
    }
  },
  
  // === STATUS COLORS ===
  status: {
    form: {
      excellent: '#10b981',
      good: '#3b82f6',
      average: '#f59e0b',
      poor: '#f43f5e'
    },
    fitness: {
      peak: '#10b981',
      good: '#3b82f6',
      average: '#f59e0b',
      injured: '#f43f5e'
    },
    morale: {
      high: '#10b981',
      normal: '#3b82f6',
      low: '#f59e0b',
      critical: '#f43f5e'
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

// === UTILITY FUNCTIONS ===
export function getStatusColor(status: number, type: 'form' | 'fitness' | 'morale' = 'form'): string {
  const thresholds = {
    form: [4, 3, 2, 1],
    fitness: [90, 75, 60, 40],
    morale: [80, 60, 40, 20]
  };
  
  const colors = {
    form: TOKENS.status.form,
    fitness: TOKENS.status.fitness,
    morale: TOKENS.status.morale
  };
  
  const [excellent, good, average, poor] = thresholds[type];
  const colorSet = colors[type];
  
  if (status >= excellent) return colorSet.excellent;
  if (status >= good) return colorSet.good;
  if (status >= average) return colorSet.average;
  return colorSet.poor;
}
