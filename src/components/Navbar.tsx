import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useGame } from '../context/GameContext';
import { AppTab, FCThemeMode } from '../types/game';
import { Team } from '../types/team';
import { 
  Users, BarChart3, ShoppingBag, Zap, 
  Sparkles, Gift, Volume2, VolumeX, Shuffle, RotateCcw, X, 
  Crown, Layers, Palette, Cloud, CloudCheck, LogIn, Check, Globe,
  Copy, ExternalLink, AlertCircle, AlertTriangle, Download, Upload, RefreshCw, Key, ShieldCheck
} from 'lucide-react';
import { getFranchiseLevelInfo } from '../engine/progressionEngine';
import { getRouteForTab } from '../navigation/screenRoutes';
import { motionSprings, tapGesture } from '../motion';
import { GoogleCloudSaveClient, loadGoogleIdentityScript } from '../services/googleCloudSaveClient';

const THEME_OPTIONS: { id: FCThemeMode; label: string; bg: string; accent: string }[] = [
  { id: 'fc_neon_dark', label: 'FC 26 Neon Dark', bg: '#04060c', accent: '#00FF87' },
  { id: 'royal_gold', label: 'Royal Gold Dynasty', bg: '#06080e', accent: '#D4AF37' },
  { id: 'emerald_stadium', label: 'Emerald Pitch', bg: '#020c06', accent: '#10B981' },
  { id: 'cyberpunk_crimson', label: 'Cyber Crimson', bg: '#0c0408', accent: '#FF1E56' },
  { id: 'champions_cyan', label: 'Champions Cyan', bg: '#020914', accent: '#00E5FF' },
  { id: 'stealth_carbon', label: 'Stealth Carbon', bg: '#050505', accent: '#E2E8F0' }
];

export const Navbar: React.FC = () => {
  const { 
    gameState, 
    activeTab, 
    setActiveTab, 
    isMuted, 
    toggleMute, 
    setCurrentScreen,
    restartGame,
    setThemeMode,
    signInWithGoogle,
    signOutGoogle,
    saveToCloudSync,
    setGameState
  } = useGame();

  const shouldReduceMotion = useReducedMotion();
  const [showFranchiseModal, setShowFranchiseModal] = useState<boolean>(false);
  const [showRestartModal, setShowRestartModal] = useState<boolean>(false);
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState<boolean>(false);
  const [pendingSwitchTeamId, setPendingSwitchTeamId] = useState<string | null>(null);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [syncSuccessToast, setSyncSuccessToast] = useState<boolean>(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState<boolean>(false);
  const [customClientId, setCustomClientId] = useState<string>(GoogleCloudSaveClient.getClientId());
  const [isEditingClientId, setIsEditingClientId] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [copiedOrigin, setCopiedOrigin] = useState<boolean>(false);
  const [copiedClientId, setCopiedClientId] = useState<boolean>(false);
  const [reinitKey, setReinitKey] = useState<number>(0);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const currentTheme = gameState?.themeMode || 'fc_neon_dark';
    document.body.className = `theme-${currentTheme.replace(/_/g, '-')}`;
  }, [gameState?.themeMode]);

  useEffect(() => {
    if (!showGoogleModal || gameState?.googleProfile?.isLoggedIn) return;
    const clientId = GoogleCloudSaveClient.getClientId();
    if (!clientId) {
      setGoogleAuthError('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to the deployment environment.');
      return;
    }

    let cancelled = false;
    setIsGoogleAuthLoading(true);
    setGoogleAuthError(null);
    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current) return;
        const google = (window as any).google;
        if (!google?.accounts?.id) {
          throw new Error('Google Identity Services failed to load in browser.');
        }
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              setGoogleAuthError('Google did not return a sign-in credential.');
              return;
            }
            setIsGoogleAuthLoading(true);
            const ok = await signInWithGoogle(response.credential);
            setIsGoogleAuthLoading(false);
            if (ok) setShowGoogleModal(false);
          }
        });
        googleButtonRef.current.innerHTML = '';
        google.accounts.id.renderButton(googleButtonRef.current, {
          type: 'standard',
          theme: 'filled_blue',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(360, googleButtonRef.current.clientWidth || 320)
        });
      })
      .catch(err => setGoogleAuthError(err instanceof Error ? err.message : 'Failed to load Google sign-in'))
      .finally(() => {
        if (!cancelled) setIsGoogleAuthLoading(false);
      });
    return () => { cancelled = true; };
  }, [showGoogleModal, gameState?.googleProfile?.isLoggedIn, signInWithGoogle, reinitKey]);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const progression = gameState.progression;
  const levelInfo = getFranchiseLevelInfo(progression?.xp || 450);
  const unclaimedRewards = progression?.unclaimedRewardsCount || 0;
  const isGoogleLoggedIn = !!gameState.googleProfile?.isLoggedIn;
  const pendingSwitchTeam = pendingSwitchTeamId ? gameState.teams[pendingSwitchTeamId] : null;

  const handleSyncCloud = async () => {
    const ok = await saveToCloudSync();
    if (ok) {
      setSyncSuccessToast(true);
      setTimeout(() => setSyncSuccessToast(false), 2500);
    }
  };

  const handleCopyOrigin = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.origin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2500);
  };

  const handleCopyClientId = () => {
    navigator.clipboard.writeText(customClientId);
    setCopiedClientId(true);
    setTimeout(() => setCopiedClientId(false), 2500);
  };

  const handleApplyCustomClientId = () => {
    GoogleCloudSaveClient.setCustomClientId(customClientId);
    setIsEditingClientId(false);
    setReinitKey(k => k + 1);
  };

  const handleResetClientId = () => {
    GoogleCloudSaveClient.setCustomClientId('');
    const def = GoogleCloudSaveClient.getClientId();
    setCustomClientId(def);
    setIsEditingClientId(false);
    setReinitKey(k => k + 1);
  };

  const handleExportBackup = () => {
    if (!gameState) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `franchise-xi-save-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {
      // ignore
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.teams && parsed.userTeamId) {
          localStorage.setItem('ipl_franchise_sim_save_v1', JSON.stringify(parsed));
          setGameState(parsed);
          setSyncSuccessToast(true);
          setTimeout(() => setSyncSuccessToast(false), 2500);
          setShowGoogleModal(false);
        } else {
          setGoogleAuthError('Invalid save file structure. Make sure you upload an exported Franchise XI save JSON.');
        }
      } catch {
        setGoogleAuthError('Failed to parse uploaded file. Please ensure it is a valid JSON save.');
      }
    };
    reader.readAsText(file);
  };

  // Streamlined Minimalist Nav Tabs including Cards and Auction
  const primaryNavTabs: { 
    id: AppTab; 
    label: string; 
    icon: React.ReactNode; 
    badge?: number;
  }[] = [
    { id: 'Dashboard', label: 'HUB', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'PlayingXI', label: 'SQUAD', icon: <Users className="w-4 h-4" /> },
    { id: 'Squad', label: 'CARDS', icon: <Layers className="w-4 h-4" /> },
    { id: 'AuctionLive', label: 'AUCTION', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'Play', label: 'MATCHDAY', icon: <Zap className="w-4 h-4 fill-current" /> },
    { id: 'YouthAcademy', label: 'EVO LAB', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'Leaderboard', label: 'RANKS', icon: <Globe className="w-4 h-4" /> },
    { id: 'Rewards', label: 'VAULT', icon: <Gift className="w-4 h-4" />, badge: unclaimedRewards }
  ];

  const handleTabClick = (tabId: AppTab) => {
    const nextScreen = tabId === 'AuctionLive' ? 'Auction' : tabId === 'MatchLive' ? 'MatchLive' : 'Dashboard';
    setCurrentScreen(nextScreen);
    setActiveTab(tabId);
    window.history.pushState({}, '', getRouteForTab(tabId));
  };

  const isHomeActive = activeTab === 'Dashboard';
  const isPlayActive = activeTab === 'Play' || activeTab === 'Schedule' || activeTab === 'Challenges' || activeTab === 'WhatIfSimulator' || activeTab === 'MatchLive';
  const isAuctionActive = activeTab === 'AuctionLive' || activeTab === 'MultiplayerAuction';
  const isSquadActive = activeTab === 'PlayingXI';
  const isCardsActive = activeTab === 'Squad';
  const isEvoActive = activeTab === 'YouthAcademy' || activeTab === 'FCEvolutions';
  const isVaultActive = activeTab === 'Rewards' || activeTab === 'Leaderboard' || activeTab === 'Club' || activeTab === 'Standings' || activeTab === 'League';

  return (
    <>
      {/* MINIMALIST HEADER BAR */}
      <header className="fc-header sticky top-0 z-40 select-none">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left: Brand Identity (Guaranteed no overlap) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Team Logo Badge */}
            <div 
              onClick={() => handleTabClick('Dashboard')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm tracking-wider cursor-pointer border border-[#00FF87]/50 shadow-lg shadow-[#00FF87]/20 transition hover:scale-105 active:scale-95 shrink-0 relative overflow-hidden"
              style={{ 
                backgroundColor: userTeam?.primaryColor || '#0a0f1d',
                color: userTeam?.secondaryColor || '#ffffff'
              }}
              title="Go to Home Hub"
            >
              <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
              {userTeam?.shortName || 'FC'}
            </div>

            {/* Franchise Info */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span 
                  onClick={() => handleTabClick('Dashboard')}
                  className="text-xs sm:text-sm font-black text-white tracking-tight truncate cursor-pointer hover:text-[#00FF87] transition max-w-[100px] sm:max-w-[150px] md:max-w-[190px]"
                >
                  {userTeam?.name}
                </span>
                <button
                  id="btn-switch-franchise-nav"
                  onClick={() => setShowFranchiseModal(true)}
                  className="p-1 rounded-md bg-[#0e1726] hover:bg-[#18263d] text-slate-400 hover:text-[#00FF87] transition cursor-pointer shrink-0"
                  title="Switch Franchise"
                >
                  <Shuffle className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="text-[#00FF87] font-semibold">LV {levelInfo.level}</span>
                <span>•</span>
                <span>₹{userTeam?.purseCr.toFixed(1)} Cr</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-[#94a3b8]">SEASON {gameState.currentSeason}</span>
              </div>
            </div>
          </div>

          {/* Center: Minimalist Desktop Navigation — FC Dock */}
          <nav className="fc-dock hidden md:flex items-center gap-0.5 p-1 rounded-2xl shrink-0">
            {primaryNavTabs.map(tab => {
              let isTabSelected = false;
              if (tab.id === 'Dashboard') isTabSelected = isHomeActive;
              else if (tab.id === 'PlayingXI') isTabSelected = isSquadActive;
              else if (tab.id === 'Squad') isTabSelected = isCardsActive;
              else if (tab.id === 'AuctionLive') isTabSelected = isAuctionActive;
              else if (tab.id === 'Play') isTabSelected = isPlayActive;
              else if (tab.id === 'YouthAcademy') isTabSelected = isEvoActive;
              else if (tab.id === 'Rewards') isTabSelected = isVaultActive;

              return (
                <motion.button
                  key={tab.id}
                  id={`nav-tab-${tab.id.toLowerCase()}`}
                  onClick={() => handleTabClick(tab.id)}
                  whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                  whileTap={shouldReduceMotion ? undefined : tapGesture}
                  className={`fc-dock-item px-3.5 py-2 rounded-xl text-[11px] font-bold tracking-wider transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none relative overflow-hidden ${
                    isTabSelected
                      ? 'fc-dock-active'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isTabSelected && !shouldReduceMotion && (
                    <motion.span layoutId="primary-nav-active" className="fc-dock-item__motion-bg" transition={motionSprings.nav} />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">{tab.icon}</span>
                  <span className="relative z-10">{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="relative z-10 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-bold flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
          </nav>

          {/* Right: Minimalist Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Google Cloud Save Button */}
            <button
              id="btn-google-cloud-sync"
              onClick={() => setShowGoogleModal(true)}
              className={`google-save-nav p-2 sm:px-3 sm:py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-black uppercase tracking-wider cursor-pointer ${
                isGoogleLoggedIn
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                  : 'bg-white text-slate-950 border-white hover:border-[#00FF87] hover:bg-[#00FF87]'
              }`}
              title={isGoogleLoggedIn ? 'Google Account Connected (Cloud Synced)' : 'Sign In with Google Account to Save Progress'}
            >
              {isGoogleLoggedIn ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-mono">Cloud Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="text-[11px]">Google Save</span>
                </div>
              )}
            </button>

            {/* Theme Switcher Button */}
            <button
              id="btn-theme-switcher"
              onClick={() => setShowThemeModal(true)}
              className="p-2 rounded-xl bg-[#090e1a] hover:bg-[#121c2e] text-slate-400 hover:text-white border border-[#141d2e] transition cursor-pointer"
              title="Change Game Theme Style"
            >
              <Palette className="w-3.5 h-3.5 text-[#00FF87]" />
            </button>

            {/* Quick Matchday Action */}
            <button
              id="btn-quick-play-nav"
              onClick={() => handleTabClick('Play')}
              className="btn-volt px-4 py-2 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span className="hidden sm:inline">MATCHDAY</span>
            </button>

            {/* Sound Toggle */}
            <button
              id="btn-sound-toggle"
              onClick={toggleMute}
              className="p-2 rounded-xl bg-[#090e1a] hover:bg-[#121c2e] text-slate-400 hover:text-white border border-[#141d2e] transition cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#00FF87]" />}
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE PERSISTENT BOTTOM NAVIGATION BAR */}
      <nav
        className="fc-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-50 px-2 py-1 flex items-center justify-around"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      >
        {primaryNavTabs.map(tab => {
          let isTabSelected = false;
          if (tab.id === 'Dashboard') isTabSelected = isHomeActive;
          else if (tab.id === 'PlayingXI') isTabSelected = isSquadActive;
          else if (tab.id === 'Squad') isTabSelected = isCardsActive;
          else if (tab.id === 'AuctionLive') isTabSelected = isAuctionActive;
          else if (tab.id === 'Play') isTabSelected = isPlayActive;
          else if (tab.id === 'YouthAcademy') isTabSelected = isEvoActive;
          else if (tab.id === 'Rewards') isTabSelected = isVaultActive;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              whileTap={shouldReduceMotion ? undefined : tapGesture}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer overflow-hidden ${
                isTabSelected 
                  ? 'text-[#00FF87] font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isTabSelected && !shouldReduceMotion && (
                <motion.span layoutId="mobile-nav-active" className="fc-bottom-nav__motion-bg" transition={motionSprings.nav} />
              )}
              <div className={`relative z-10 p-1 rounded-md ${isTabSelected ? 'bg-[#00FF87]/15' : ''}`}>
                {tab.icon}
              </div>
              <span className="relative z-10 text-[9px] uppercase font-medium tracking-wide mt-0.5">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute z-20 top-0.5 right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </motion.button>
          );
        })}
      </nav>

      {/* FRANCHISE SWITCHER MODAL */}
      {showFranchiseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-[#182238] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#182238] pb-3">
              <div className="flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-[#00FF87]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Select Franchise</h3>
              </div>
              <button
                onClick={() => setShowFranchiseModal(false)}
                className="p-1 rounded-lg bg-[#04060c] hover:bg-[#182238] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {(Object.values(gameState.teams) as Team[]).map(t => {
                const isSelected = gameState.userTeamId === t.id;
                return (
                  <div
                    key={t.id}
                    id={`switch-team-${t.id}`}
                    onClick={() => {
                      // Switching franchise = beginning a brand-new campaign:
                      // current progress is deleted, the new team starts from the auction at 0.
                      if (isSelected) {
                        setShowFranchiseModal(false);
                        return;
                      }
                      setShowFranchiseModal(false);
                      setPendingSwitchTeamId(t.id);
                      setShowSwitchConfirmModal(true);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer border transition text-center flex flex-col items-center justify-between ${
                      isSelected
                        ? 'border-[#00FF87] bg-[#10192e]'
                        : 'border-[#182238] bg-[#04060c] hover:bg-[#121c2e]'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs mb-1.5 shadow"
                      style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}
                    >
                      {t.shortName}
                    </div>
                    <h4 className="font-semibold text-xs text-white truncate w-full">{t.name}</h4>
                    <span className="text-[10px] text-[#00FF87] font-mono mt-0.5">₹{t.purseCr.toFixed(1)} Cr</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SWITCH FRANCHISE DESTRUCTIVE CONFIRMATION */}
      {showSwitchConfirmModal && pendingSwitchTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#182238] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">Switch Franchise?</h3>
                  <p className="text-[11px] text-red-300/70">This cannot be undone.</p>
                </div>
              </div>
              <button
                onClick={() => { setShowSwitchConfirmModal(false); setPendingSwitchTeamId(null); }}
                className="p-1 rounded-lg bg-[#04060c] hover:bg-[#182238] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-slate-300 leading-relaxed">
              Your current progress with <strong className="text-white">{userTeam?.name}</strong> would be
              <strong className="text-red-400"> deleted</strong>, and you will start from
              <strong className="text-[#D4AF37]"> 0</strong> with
              <strong className="text-white"> {pendingSwitchTeam.name}</strong> — the auction has not taken
              place yet, so you begin at the very first lot with a full ₹120 Cr purse.
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => { setShowSwitchConfirmModal(false); setPendingSwitchTeamId(null); }}
                className="py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-switch-franchise"
                onClick={() => {
                  const teamId = pendingSwitchTeam.id;
                  setShowSwitchConfirmModal(false);
                  setPendingSwitchTeamId(null);
                  restartGame({ newTeamId: teamId });
                }}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition cursor-pointer"
              >
                Yes, Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTART PROGRESS MODAL */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-[#182238] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#182238] pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Restart Campaign</h3>
              </div>
              <button
                onClick={() => setShowRestartModal(false)}
                className="p-1 rounded-lg bg-[#04060c] hover:bg-[#182238] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowRestartModal(false);
                  restartGame();
                }}
                className="w-full p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition text-left cursor-pointer"
              >
                <p className="font-bold text-xs">Reset Campaign & Return to Setup</p>
                <p className="text-[11px] text-red-300/70 mt-0.5">Clears current save and allows choosing a brand new franchise.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THEME SWITCHER MODAL */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-[#182238] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#182238] pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#00FF87]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Theme & Visual Atmosphere</h3>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1 rounded-lg bg-[#04060c] hover:bg-[#182238] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEME_OPTIONS.map(theme => {
                const isCurrent = (gameState.themeMode || 'fc_neon_dark') === theme.id;
                return (
                  <button
                    key={theme.id}
                    id={`theme-btn-${theme.id}`}
                    onClick={() => {
                      setThemeMode(theme.id);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? 'border-[#00FF87] bg-[#121c2e] shadow-lg shadow-[#00FF87]/10'
                        : 'border-[#182238] bg-[#04060c] hover:bg-[#0c1424]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full border border-white/20" 
                          style={{ backgroundColor: theme.accent }}
                        />
                        <span className="text-xs font-bold text-white">{theme.label}</span>
                      </div>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-[#00FF87]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE ACCOUNT & CLOUD SYNC MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0f1d] border border-[#182238] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#182238] pb-3">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">Google Cloud Save & Sync</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-lg bg-[#04060c] hover:bg-[#182238] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isGoogleLoggedIn ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3">
                  <img 
                    src={gameState.googleProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60'} 
                    alt="Google Avatar"
                    className="w-10 h-10 rounded-full border border-emerald-400 object-cover"
                  />
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate">
                      {gameState.googleProfile?.name || 'Cricket Manager'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono truncate">
                      {gameState.googleProfile?.email}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Last Synced: {gameState.googleProfile?.lastCloudSyncedAt ? new Date(gameState.googleProfile.lastCloudSyncedAt).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    id="btn-trigger-cloud-sync"
                    onClick={handleSyncCloud}
                    className="flex-1 py-3 rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{syncSuccessToast ? 'Synced Successfully!' : 'Sync Now to Cloud'}</span>
                  </button>

                  <button
                    id="btn-signout-google"
                    onClick={() => {
                      signOutGoogle();
                      setShowGoogleModal(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in with your Google account. Your current franchise squad, auction budget, progression, and unlocked cards will sync to cloud storage automatically.
                </p>

                {/* Important notice explaining Error 401 */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Note on "OAuth client was not found" (Error 401):</span>
                    Google takes 2–5 minutes to propagate newly created OAuth Client IDs across its worldwide auth servers. If you just created this client, wait a moment and try again.
                  </div>
                </div>

                {googleAuthError && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <span className="font-semibold block mb-0.5">Authentication Note:</span>
                      {googleAuthError}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex flex-col items-center justify-center min-h-[56px] gap-2">
                  {isGoogleAuthLoading && !googleAuthError ? (
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider self-center flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00FF87]" />
                      Loading Google sign-in…
                    </span>
                  ) : null}
                  <div id="google-real-signin-button" ref={googleButtonRef} className="w-full flex justify-center" />
                </div>

                {/* EXPANDABLE GOOGLE CLOUD SETUP DIAGNOSTICS */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-[#04060c]/60">
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-bold text-slate-300 hover:text-white transition hover:bg-white/5 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-[#00FF87]" />
                      Google Cloud Console Settings & Origin
                    </span>
                    <span className="text-[10px] text-slate-500">{showDiagnostics ? 'Hide' : 'Configure / View'}</span>
                  </button>

                  {showDiagnostics && (
                    <div className="p-3.5 border-t border-white/10 space-y-3 text-[11px]">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Authorized JavaScript Origin (Add to Google Console)</span>
                          <button
                            type="button"
                            onClick={handleCopyOrigin}
                            className="text-[#00FF87] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedOrigin ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="bg-[#02040a] px-2.5 py-1.5 rounded-lg border border-white/10 font-mono text-[10px] text-slate-300 select-all break-all">
                          {typeof window !== 'undefined' ? window.location.origin : 'Current domain'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Active Client ID</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleCopyClientId}
                              className="text-[#00FF87] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedClientId ? 'Copied!' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingClientId(!isEditingClientId)}
                              className="text-slate-400 hover:text-white transition cursor-pointer"
                            >
                              {isEditingClientId ? 'Cancel' : 'Edit'}
                            </button>
                          </div>
                        </div>

                        {isEditingClientId ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={customClientId}
                              onChange={(e) => setCustomClientId(e.target.value)}
                              placeholder="351798723783-...apps.googleusercontent.com"
                              className="w-full bg-[#02040a] px-2.5 py-1.5 rounded-lg border border-[#00FF87]/50 font-mono text-[10px] text-white focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleApplyCustomClientId}
                                className="px-3 py-1 rounded-md bg-[#00FF87] text-black font-bold text-[10px] hover:bg-[#00e57a] transition cursor-pointer"
                              >
                                Save & Apply
                              </button>
                              <button
                                type="button"
                                onClick={handleResetClientId}
                                className="px-3 py-1 rounded-md bg-white/10 text-slate-300 font-medium text-[10px] hover:bg-white/20 transition cursor-pointer"
                              >
                                Reset to Default
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#02040a] px-2.5 py-1.5 rounded-lg border border-white/10 font-mono text-[10px] text-slate-300 select-all break-all">
                            {customClientId || 'None set'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* OFFLINE SAVE BACKUP FALLBACK */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Offline Save Backup:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-[#00FF87]" />
                      <span>Export JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-cyan-400" />
                      <span>Import JSON</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportBackup}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

