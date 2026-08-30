import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { AppTab, FCThemeMode } from '../types/game';
import { Team } from '../types/team';
import { 
  Users, BarChart3, ShoppingBag, Zap, 
  Sparkles, Gift, Volume2, VolumeX, Shuffle, RotateCcw, X, 
  Crown, Layers, Palette, Cloud, CloudCheck, LogIn, Check, Globe
} from 'lucide-react';
import { getFranchiseLevelInfo } from '../engine/progressionEngine';
import { getRouteForState } from '../utils/router';

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
    switchUserFranchise,
    restartGame,
    setThemeMode,
    signInWithGoogle,
    signOutGoogle,
    saveToCloudSync
  } = useGame();

  const [showFranchiseModal, setShowFranchiseModal] = useState<boolean>(false);
  const [showRestartModal, setShowRestartModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>('');
  const [customGoogleName, setCustomGoogleName] = useState<string>('');
  const [syncSuccessToast, setSyncSuccessToast] = useState<boolean>(false);

  useEffect(() => {
    const currentTheme = gameState?.themeMode || 'fc_neon_dark';
    document.body.className = `theme-${currentTheme.replace(/_/g, '-')}`;
  }, [gameState?.themeMode]);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const progression = gameState.progression;
  const levelInfo = getFranchiseLevelInfo(progression?.xp || 450);
  const unclaimedRewards = progression?.unclaimedRewardsCount || 0;
  const isGoogleLoggedIn = !!gameState.googleProfile?.isLoggedIn;

  const handleSyncCloud = () => {
    const ok = saveToCloudSync();
    if (ok) {
      setSyncSuccessToast(true);
      setTimeout(() => setSyncSuccessToast(false), 2500);
    }
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
    { id: 'Rewards', label: 'VAULT', icon: <Gift className="w-4 h-4" />, badge: unclaimedRewards }
  ];

  const handleTabClick = (tabId: AppTab) => {
    setActiveTab(tabId);
    if (tabId === 'AuctionLive') {
      setCurrentScreen('Auction');
      window.history.pushState({}, '', '/auction');
    } else if (tabId === 'MatchLive') {
      setCurrentScreen('MatchLive');
      window.history.pushState({}, '', '/play/live');
    } else if (tabId === 'Play') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/play');
    } else if (tabId === 'PlayingXI') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/tactics');
    } else if (tabId === 'Squad') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/squad');
    } else if (tabId === 'YouthAcademy') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/academy');
    } else if (tabId === 'Club') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/club');
    } else if (tabId === 'Rewards') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/rewards');
    } else if (tabId === 'Dashboard') {
      setCurrentScreen('Dashboard');
      window.history.pushState({}, '', '/');
    } else {
      setCurrentScreen('Dashboard');
      const route = getRouteForState('Dashboard', tabId);
      window.history.pushState({}, '', route);
    }
  };

  const isHomeActive = activeTab === 'Dashboard';
  const isPlayActive = activeTab === 'Play' || activeTab === 'Schedule' || activeTab === 'Challenges' || activeTab === 'WhatIfSimulator' || activeTab === 'MatchLive';
  const isAuctionActive = activeTab === 'AuctionLive' || activeTab === 'MultiplayerAuction';
  const isSquadActive = activeTab === 'PlayingXI';
  const isCardsActive = activeTab === 'Squad';
  const isEvoActive = activeTab === 'YouthAcademy' || activeTab === 'FCEvolutions';
  const isVaultActive = activeTab === 'Rewards' || activeTab === 'Club' || activeTab === 'Standings' || activeTab === 'League';

  return (
    <>
      {/* MINIMALIST HEADER BAR */}
      <header className="sticky top-0 z-40 bg-[#060912]/95 backdrop-blur-md border-b border-[#141d2e] select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left: Brand Identity (Guaranteed no overlap) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Team Logo Badge */}
            <div 
              onClick={() => handleTabClick('Dashboard')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm tracking-wider cursor-pointer border border-[#00FF87]/50 shadow-sm transition hover:scale-105 active:scale-95 shrink-0"
              style={{ 
                backgroundColor: userTeam?.primaryColor || '#0a0f1d',
                color: userTeam?.secondaryColor || '#ffffff'
              }}
              title="Go to Home Hub"
            >
              {userTeam?.shortName || 'FC'}
            </div>

            {/* Franchise Info */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span 
                  onClick={() => handleTabClick('Dashboard')}
                  className="text-xs sm:text-sm font-bold text-white tracking-tight truncate cursor-pointer hover:text-[#00FF87] transition max-w-[100px] sm:max-w-[140px] md:max-w-[180px]"
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
              </div>
            </div>
          </div>

          {/* Center: Minimalist Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-[#090e1a] p-1 rounded-xl border border-[#141d2e] shrink-0">
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
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id.toLowerCase()}`}
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer select-none relative ${
                    isTabSelected
                      ? 'bg-[#121c2e] text-[#00FF87] font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1624]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-bold flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Right: Minimalist Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Google Cloud Save Button */}
            <button
              id="btn-google-cloud-sync"
              onClick={() => setShowGoogleModal(true)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isGoogleLoggedIn
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                  : 'bg-[#090e1a] text-slate-300 border-[#141d2e] hover:border-[#00FF87]/40 hover:text-white'
              }`}
              title={isGoogleLoggedIn ? 'Google Account Connected (Cloud Synced)' : 'Sign In with Google Account to Save Progress'}
            >
              {isGoogleLoggedIn ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden lg:inline text-[11px] font-mono">Cloud Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="hidden sm:inline text-[11px]">Sign In</span>
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
              className="bg-[#00FF87] hover:bg-[#00e57a] text-black px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer font-mono shadow-sm"
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060912]/95 backdrop-blur-md border-t border-[#141d2e] px-2 py-1 flex items-center justify-around"
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
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                isTabSelected 
                  ? 'text-[#00FF87] font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-md ${isTabSelected ? 'bg-[#00FF87]/15' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[9px] uppercase font-medium tracking-wide mt-0.5">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute top-0.5 right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-bold flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
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
                      switchUserFranchise(t.id);
                      setShowFranchiseModal(false);
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
                      Last Synced: {gameState.googleProfile?.lastSyncedAt ? new Date(gameState.googleProfile.lastSyncedAt).toLocaleTimeString() : 'Just now'}
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
                  Sign in with your Google account to automatically backup your franchise squads, auction history, custom evolutions, and unlocked rewards safely to the cloud across all devices.
                </p>

                {/* 1-Click Fast Google Sign-in */}
                <button
                  id="btn-oneclick-google-login"
                  onClick={() => {
                    signInWithGoogle('manager@cricket.com', 'Cricket Franchise Director');
                    setShowGoogleModal(false);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Custom Google Email Entry Option */}
                <div className="pt-2 border-t border-[#182238] space-y-2">
                  <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                    Or specify custom manager profile:
                  </div>
                  <input
                    type="email"
                    placeholder="manager@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-[#04060c] border border-[#182238] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF87]"
                  />
                  <input
                    type="text"
                    placeholder="Manager Display Name"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-[#04060c] border border-[#182238] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00FF87]"
                  />
                  <button
                    onClick={() => {
                      if (customGoogleEmail.trim()) {
                        signInWithGoogle(customGoogleEmail.trim(), customGoogleName.trim() || 'Manager');
                        setShowGoogleModal(false);
                      }
                    }}
                    disabled={!customGoogleEmail.trim()}
                    className="w-full py-2 rounded-lg bg-[#141d2e] hover:bg-[#1f2d47] text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    Save & Link Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

