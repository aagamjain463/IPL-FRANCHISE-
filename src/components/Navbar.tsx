import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { AppTab } from '../types/game';
import { Team } from '../types/team';
import { 
  Trophy, Users, Calendar, BarChart3, RefreshCw, 
  Award, Zap, Volume2, VolumeX, Flame, Target, 
  ShieldCheck, ShoppingBag, Shuffle, RotateCcw, X, Check, Shield,
  Building2, Crown, Gift, Sparkles, MoreHorizontal, ChevronRight
} from 'lucide-react';
import { getFranchiseLevelInfo } from '../engine/progressionEngine';

export const Navbar: React.FC = () => {
  const { 
    gameState, 
    activeTab, 
    setActiveTab, 
    isMuted, 
    toggleMute, 
    setCurrentScreen,
    switchUserFranchise,
    restartGame
  } = useGame();

  const [showFranchiseModal, setShowFranchiseModal] = useState<boolean>(false);
  const [showRestartModal, setShowRestartModal] = useState<boolean>(false);
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const progression = gameState.progression;
  const levelInfo = getFranchiseLevelInfo(progression?.xp || 450);
  const unclaimedRewards = progression?.unclaimedRewardsCount || 0;

  // 5 CORE SPORTS GAME MAIN SECTIONS
  const primaryNavTabs: { 
    id: AppTab; 
    label: string; 
    icon: React.ReactNode; 
    badge?: number;
    sublabel?: string;
  }[] = [
    { id: 'Dashboard', label: 'HOME', icon: <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />, sublabel: 'Hub' },
    { id: 'Play', label: 'PLAY', icon: <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" />, sublabel: 'Matchday' },
    { id: 'AuctionLive', label: 'AUCTION', icon: <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />, sublabel: 'Arena' },
    { id: 'PlayingXI', label: 'SQUAD', icon: <Users className="w-4 h-4 md:w-5 md:h-5" />, sublabel: 'Tactics' },
    { id: 'Club', label: 'CLUB', icon: <Building2 className="w-4 h-4 md:w-5 md:h-5" />, sublabel: 'Scout & Facilities' }
  ];

  const handleTabClick = (tabId: AppTab) => {
    setActiveTab(tabId);
    if (tabId === 'AuctionLive') {
      setCurrentScreen('Auction');
    } else if (tabId === 'MatchLive') {
      setCurrentScreen('MatchLive');
    } else {
      setCurrentScreen('Dashboard');
    }
  };

  // Determine which primary group is active
  const isHomeActive = activeTab === 'Dashboard';
  const isPlayActive = activeTab === 'Play' || activeTab === 'Schedule' || activeTab === 'Challenges' || activeTab === 'WhatIfSimulator';
  const isAuctionActive = activeTab === 'AuctionLive';
  const isSquadActive = activeTab === 'PlayingXI' || activeTab === 'Squad';
  const isClubActive = activeTab === 'Club' || activeTab === 'YouthAcademy' || activeTab === 'TradeCenter' || activeTab === 'Scout' || activeTab === 'Market';

  return (
    <>
      {/* TOP STATUS & FRANCHISE BAR */}
      <header className="sticky top-0 z-40 bg-[#070b14]/95 backdrop-blur-lg border-b border-[#1e293b] shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Franchise Crest & Identity */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
            <div 
              onClick={() => handleTabClick('Dashboard')}
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm tracking-wider shadow-lg hover:scale-105 transition-transform cursor-pointer border border-white/20 shrink-0 select-none"
              style={{ 
                background: `linear-gradient(135deg, ${userTeam?.primaryColor || '#D4AF37'}, ${userTeam?.secondaryColor || '#1e3a8a'})`,
                color: '#ffffff'
              }}
              title="Go to Home Hub"
            >
              {userTeam?.shortName || 'IPL'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 
                  onClick={() => handleTabClick('Dashboard')}
                  className="text-sm sm:text-base font-black tracking-tight uppercase italic text-white truncate cursor-pointer hover:text-[#D4AF37] transition"
                >
                  {userTeam?.name}
                </h1>
                <button
                  id="btn-switch-franchise-nav"
                  onClick={() => setShowFranchiseModal(true)}
                  className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#0f172a] hover:bg-[#1e293b] text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] font-bold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shrink-0"
                  title="Switch franchise anytime"
                >
                  <Shuffle className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">Switch</span>
                </button>
              </div>

              {/* Progression Level Indicator Bar */}
              <div 
                onClick={() => handleTabClick('Rewards')}
                className="flex items-center gap-2 cursor-pointer group"
                title="View Dynasty Progression & Rewards"
              >
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#D4AF37] flex items-center gap-1">
                  <Crown className="w-3 h-3 text-[#D4AF37]" />
                  LV {levelInfo.level}
                </span>
                <div className="w-16 sm:w-24 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-300 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, levelInfo.progressPercent))}%` }}
                  />
                </div>
                <span className="text-[9px] text-[#64748b] hidden md:inline font-mono">
                  {progression?.xp || 450}/{levelInfo.nextLevelXp} XP
                </span>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (FC-Inspired 5-Core Sections) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-[#05070a] p-1 rounded-2xl border border-[#1e293b]">
            {primaryNavTabs.map(tab => {
              let isTabSelected = false;
              if (tab.id === 'Dashboard') isTabSelected = isHomeActive;
              else if (tab.id === 'Play') isTabSelected = isPlayActive;
              else if (tab.id === 'AuctionLive') isTabSelected = isAuctionActive;
              else if (tab.id === 'PlayingXI') isTabSelected = isSquadActive;
              else if (tab.id === 'Club') isTabSelected = isClubActive;

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id.toLowerCase()}`}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    isTabSelected
                      ? 'bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-[#D4AF37] border border-[#D4AF37]/50 shadow-md shadow-[#D4AF37]/10'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#0f172a]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[9px] font-black flex items-center justify-center">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Right: Purse Balance & Fast Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Purse Badge */}
            <div className="bg-[#0f172a] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-[#1e293b] text-right">
              <p className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-[#64748b] leading-none">Purse</p>
              <p className="text-[#D4AF37] font-mono font-black text-xs sm:text-sm leading-tight">
                ₹{userTeam?.purseCr.toFixed(2)} Cr
              </p>
            </div>

            {/* Claimable Rewards Badge */}
            <button
              id="btn-rewards-nav"
              onClick={() => handleTabClick('Rewards')}
              className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer relative ${
                unclaimedRewards > 0 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' 
                  : 'bg-[#0f172a] text-[#94a3b8] hover:text-white border-[#1e293b]'
              }`}
              title="Rewards Center"
            >
              <Gift className="w-4 h-4" />
              {unclaimedRewards > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[9px] font-black flex items-center justify-center shadow">
                  {unclaimedRewards}
                </span>
              )}
            </button>

            {/* Sound Mute Toggle */}
            <button
              id="btn-sound-toggle"
              onClick={toggleMute}
              className="p-1.5 sm:p-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b] transition cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
            </button>

            {/* Primary Action Quick Play CTA */}
            <button
              id="btn-quick-play-nav"
              onClick={() => handleTabClick('Play')}
              className="bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-black uppercase tracking-wider text-xs hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span className="hidden sm:inline">Play</span>
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE PERSISTENT BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#070b14]/95 backdrop-blur-xl border-t border-[#1e293b] px-2 py-1.5 shadow-2xl flex items-center justify-around">
        {primaryNavTabs.map(tab => {
          let isTabSelected = false;
          if (tab.id === 'Dashboard') isTabSelected = isHomeActive;
          else if (tab.id === 'Play') isTabSelected = isPlayActive;
          else if (tab.id === 'AuctionLive') isTabSelected = isAuctionActive;
          else if (tab.id === 'PlayingXI') isTabSelected = isSquadActive;
          else if (tab.id === 'Club') isTabSelected = isClubActive;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isTabSelected 
                  ? 'text-[#D4AF37] font-black scale-105' 
                  : 'text-[#64748b] hover:text-[#94a3b8]'
              }`}
            >
              <div className={`p-1 rounded-lg ${isTabSelected ? 'bg-[#D4AF37]/15' : ''}`}>
                {tab.icon}
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider mt-0.5">{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute top-0 right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-mono text-[8px] font-black flex items-center justify-center">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* FRANCHISE SWITCHER MODAL */}
      {showFranchiseModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Select IPL Franchise</h3>
                  <p className="text-xs text-[#94a3b8]">Switch team management at any point in the season.</p>
                </div>
              </div>
              <button
                onClick={() => setShowFranchiseModal(false)}
                className="p-1.5 rounded-lg bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto pr-1">
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
                    className={`p-3 rounded-xl cursor-pointer border transition text-center flex flex-col items-center justify-between ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#131d35] shadow-lg scale-105'
                        : 'border-[#1e293b] bg-[#05070a] hover:bg-[#1e293b]/70 hover:border-[#334155]'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm mb-2 shadow"
                      style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}
                    >
                      {t.shortName}
                    </div>
                    <h4 className="font-bold text-xs text-white truncate w-full">{t.name}</h4>
                    <span className="text-[10px] text-[#D4AF37] font-mono mt-1 font-semibold">₹{t.purseCr.toFixed(1)} Cr</span>
                    {isSelected && (
                      <span className="mt-2 text-[9px] uppercase font-bold bg-[#D4AF37] text-black px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* RESTART PROGRESS MODAL */}
      {showRestartModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Restart Campaign</h3>
                  <p className="text-xs text-[#94a3b8]">Reset franchise progress and start fresh.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRestartModal(false)}
                className="p-1.5 rounded-lg bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition"
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
                className="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition text-left"
              >
                <p className="font-bold text-sm">Reset Campaign & Return to Setup</p>
                <p className="text-xs text-red-300/70 mt-1">Clears current save and allows choosing a brand new franchise.</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

