import React, { useMemo } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useGame } from '../context/GameContext';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { computeTeamChemistry } from '../engine/chemistryEngine';
import { getFranchiseLevelInfo, INITIAL_OBJECTIVES } from '../engine/progressionEngine';
import { deriveRewardProgression, ensureRewardEcosystem } from '../rewards/rewardEngine';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Crown,
  Dumbbell,
  Flame,
  Gavel,
  Gauge,
  Gift,
  Medal,
  Radio,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap
} from 'lucide-react';
import { AppTab, GameScreen } from '../types/game';
import { cardHoverGesture, cardMotion, cinematicHeroMotion, listContainerMotion, revealUpMotion, subtleHoverGesture, tapGesture } from '../motion';

const routeFor = (tab: AppTab): string => {
  const map: Partial<Record<AppTab, string>> = {
    AuctionLive: '/auction',
    MultiplayerAuction: '/multiplayer-auction',
    Club: '/franchise',
    Squad: '/squad',
    PlayingXI: '/playing-xi',
    League: '/tournament',
    Standings: '/standings',
    Play: '/play',
    Scout: '/scouting',
    YouthAcademy: '/youth-academy',
    Challenges: '/challenges',
    TradeCenter: '/trade-center',
    Rewards: '/rewards',
    Leaderboard: '/leaderboard',
    News: '/news',
    SeasonRecap: '/recap',
    OffSeason: '/offseason',
    Profile: '/settings',
    Dashboard: '/home'
  };
  return map[tab] || '/home';
};

export const DashboardView: React.FC = () => {
  const {
    gameState,
    setActiveTab,
    setCurrentScreen,
    prepareMatch,
    setSelectedPlayerForModal,
    triggerWalkout
  } = useGame();
  const shouldReduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 90, damping: 24, mass: 0.5 });
  const smoothY = useSpring(pointerY, { stiffness: 90, damping: 24, mass: 0.5 });
  const heroLightX = useTransform(smoothX, [-0.5, 0.5], [-18, 18]);
  const heroLightY = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);
  const posterX = useTransform(smoothX, [-0.5, 0.5], [10, -10]);
  const posterY = useTransform(smoothY, [-0.5, 0.5], [5, -5]);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const schedule = gameState.leagueSchedule || [];
  const nextFixture = schedule[gameState.currentFixtureIndex];
  const nextUserFixture = schedule.find(f => !f.isPlayed && (f.teamAId === gameState.userTeamId || f.teamBId === gameState.userTeamId)) || nextFixture;
  const fixtureTeamA = nextUserFixture ? gameState.teams[nextUserFixture.teamAId] : null;
  const fixtureTeamB = nextUserFixture ? gameState.teams[nextUserFixture.teamBId] : null;
  const rosterIds = userTeam?.rosterPlayerIds || [];
  const userPlayers = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const xiIds = userTeam?.playingXI?.playingXIIds?.length ? userTeam.playingXI.playingXIIds : rosterIds.slice(0, 11);
  const xiPlayers = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const squadOVR = xiPlayers.length ? Math.round(xiPlayers.reduce((sum, p) => sum + p.overall, 0) / xiPlayers.length) : 0;
  const chemistry = computeTeamChemistry(xiPlayers);
  const standingsList = gameState.standings || [];
  const userStanding = standingsList.find(s => s.teamId === gameState.userTeamId);
  const userRank = standingsList.findIndex(s => s.teamId === gameState.userTeamId) + 1;
  const objectives = gameState.progression?.objectives || INITIAL_OBJECTIVES;
  const levelInfo = getFranchiseLevelInfo(gameState.progression?.xp || 450);
  const rewardProgression = gameState.progression ? deriveRewardProgression(ensureRewardEcosystem(gameState.progression), userTeam, gameState.allPlayers) : null;
  const activeObjectives = objectives.filter(o => !o.isCompleted).slice(0, 3);
  const completedObjectives = objectives.filter(o => o.isCompleted).length;
  const latestNews = gameState.newsFeed?.slice(0, 4) || [];
  const captainPlayer = userTeam?.captainId ? gameState.allPlayers[userTeam.captainId] : userPlayers[0];
  const topPlayers = useMemo(() => [...userPlayers].sort((a, b) => b.overall - a.overall).slice(0, 4), [userPlayers]);
  const auctionProgress = gameState.auctionState
    ? Math.round(((gameState.auctionState.currentPlayerIndex || 0) / Math.max(1, gameState.auctionState.allPlayerPool.length || 1)) * 100)
    : 100;

  const enterWorld = (tab: AppTab, screen: GameScreen = 'Dashboard') => {
    setCurrentScreen(screen);
    setActiveTab(tab);
    window.history.pushState({}, '', routeFor(tab));
  };

  const handleHeroPointer = (event: React.MouseEvent<HTMLElement>) => {
    if (shouldReduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const worlds = [
    {
      title: 'Ultimate Auction',
      label: 'Solo + Live Multiplayer',
      desc: 'Host real-time rooms, battle friends, or run solo purse-pressure auction nights.',
      stat: `${auctionProgress}% auction`,
      tab: 'AuctionLive' as AppTab,
      screen: 'Auction' as GameScreen,
      icon: <Gavel className="w-6 h-6" />,
      tone: '#D4AF37',
      className: 'hub-world--auction'
    },
    {
      title: 'Franchise HQ',
      label: 'Boardroom',
      desc: 'Facilities, finances, identity, fan pulse and dynasty growth.',
      stat: `LV ${levelInfo.level}`,
      tab: 'Club' as AppTab,
      icon: <Shield className="w-6 h-6" />,
      tone: '#FFE27D',
      className: 'hub-world--club'
    },
    {
      title: 'Squad Galaxy',
      label: 'Player Cards',
      desc: 'Inspect stars, form, fitness, contracts and future upgrades.',
      stat: `${userPlayers.length}/25 players`,
      tab: 'Squad' as AppTab,
      icon: <Users className="w-6 h-6" />,
      tone: '#00E5FF',
      className: 'hub-world--squad'
    },
    {
      title: 'XI Tactics Lab',
      label: 'Match Selection',
      desc: 'Captain, vice captain, impact player, roles and balance.',
      stat: `${xiPlayers.length}/11 XI`,
      tab: 'PlayingXI' as AppTab,
      icon: <Gauge className="w-6 h-6" />,
      tone: '#00FF87',
      className: 'hub-world--xi'
    },
    {
      title: 'Tournament',
      label: 'Competition Map',
      desc: 'Fixtures, standings, records, playoff ladder and qualification.',
      stat: userStanding ? `${userStanding.points} pts` : '0 pts',
      tab: 'League' as AppTab,
      icon: <Trophy className="w-6 h-6" />,
      tone: '#8B5CF6',
      className: 'hub-world--league'
    },
    {
      title: 'Matchday',
      label: 'Stadium Tunnel',
      desc: 'Broadcast simulation cockpit, ball-by-ball tactics and momentum.',
      stat: nextUserFixture ? `M${nextUserFixture.matchNumber}` : 'Ready',
      tab: 'Play' as AppTab,
      icon: <Zap className="w-6 h-6 fill-current" />,
      tone: '#FF1E56',
      className: 'hub-world--match'
    },
    {
      title: 'Scouting Net',
      label: 'Data Room',
      desc: 'Watchlists, reports, AI recommendations and hidden-value searches.',
      stat: `${gameState.scoutingDepartment?.watchlist?.length || 0} targets`,
      tab: 'Scout' as AppTab,
      icon: <Target className="w-6 h-6" />,
      tone: '#38BDF8',
      className: 'hub-world--scout'
    },
    {
      title: 'Youth Academy',
      label: 'Evolution Lab',
      desc: 'Create the next icon through prospects, development and pathways.',
      stat: `${gameState.youthAcademyPool?.length || 0} prospects`,
      tab: 'YouthAcademy' as AppTab,
      icon: <Sparkles className="w-6 h-6" />,
      tone: '#10B981',
      className: 'hub-world--academy'
    }
  ];

  const clubVitals = [
    { label: 'Squad OVR', value: squadOVR || '—', icon: <Medal className="w-4 h-4" />, tone: 'text-[#00FF87]' },
    { label: 'Chemistry', value: xiPlayers.length ? chemistry.score : '—', icon: <Activity className="w-4 h-4" />, tone: 'text-[#00E5FF]' },
    { label: 'Purse', value: `₹${(userTeam?.purseCr || 0).toFixed(1)}Cr`, icon: <Crown className="w-4 h-4" />, tone: 'text-[#D4AF37]' },
    { label: 'Rank', value: userRank > 0 ? `#${userRank}` : '—', icon: <Trophy className="w-4 h-4" />, tone: 'text-violet-300' }
  ];

  return (
    <motion.div className="ultimate-hub min-h-full pb-16 select-none" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
      <motion.section
        className="ultimate-hub__hero ultimate-hub__hero--motion"
        variants={shouldReduceMotion ? undefined : cinematicHeroMotion}
        onMouseMove={handleHeroPointer}
        onMouseLeave={() => { pointerX.set(0); pointerY.set(0); }}
      >
        <motion.div className="ultimate-hub__lights" style={shouldReduceMotion ? undefined : { x: heroLightX, y: heroLightY }} />
        <motion.div className="ultimate-hub__identity" variants={shouldReduceMotion ? undefined : revealUpMotion}>
          <div className="ultimate-hub__crest-wrap">
            <div
              className="ultimate-hub__crest"
              style={{ backgroundColor: userTeam?.primaryColor || '#06121f', color: userTeam?.secondaryColor || '#fff' }}
            >
              {userTeam?.shortName || 'XI'}
            </div>
          </div>
          <div className="ultimate-hub__copy">
            <p className="ultimate-hub__eyebrow">FRANCHISE XI 26 / CAREER HUB</p>
            <h1>{userTeam?.name || 'IPL Franchise'}</h1>
            <p className="ultimate-hub__tagline">
              Build a dynasty through auction warfare, tactical matchdays, youth evolutions and high-pressure IPL nights.
            </p>
            <div className="ultimate-hub__chips">
              <span>Season {gameState.currentSeason}</span>
              <span>{gameState.seasonStage || 'League Stage'}</span>
              <span>{userTeam?.city || 'India'}</span>
              <span>{userTeam?.homeVenue || 'Home Ground'}</span>
            </div>
          </div>
        </motion.div>

        <motion.div className="ultimate-hub__match-poster" variants={shouldReduceMotion ? undefined : revealUpMotion} style={shouldReduceMotion ? undefined : { x: posterX, y: posterY }}>
          <div className="ultimate-hub__poster-top">
            <span><CalendarDays className="w-3.5 h-3.5" /> NEXT MATCHDAY</span>
            <b>{nextUserFixture?.stage || 'League'}</b>
          </div>
          {nextUserFixture && fixtureTeamA && fixtureTeamB ? (
            <>
              <div className="ultimate-hub__versus">
                {[fixtureTeamA, fixtureTeamB].map(t => (
                  <button key={t.id} onClick={() => enterWorld('PlayingXI')} className="ultimate-hub__team">
                    <span style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}>{t.shortName}</span>
                    <b>{t.name}</b>
                  </button>
                ))}
                <div className="ultimate-hub__vs">VS</div>
              </div>
              <div className="ultimate-hub__poster-actions">
                <button onClick={() => prepareMatch(nextUserFixture.id)} className="btn-volt px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-[.18em] flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 fill-current" /> Play Matchday
                </button>
                <button onClick={() => enterWorld('PlayingXI')} className="ultimate-hub__ghost-btn">Set XI</button>
              </div>
            </>
          ) : (
            <div className="ultimate-hub__empty-match">Season schedule is being built...</div>
          )}
        </motion.div>
      </motion.section>

      <motion.section className="ultimate-hub__vitals" variants={shouldReduceMotion ? undefined : listContainerMotion}>
        {clubVitals.map(vital => (
          <motion.div key={vital.label} className="ultimate-hub__vital-card" variants={shouldReduceMotion ? undefined : cardMotion}>
            <span className={vital.tone}>{vital.icon}</span>
            <div>
              <p>{vital.label}</p>
              <b className={vital.tone}>{vital.value}</b>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* Highlight of the game: Live Multiplayer Auction marquee banner moved prominently to the top */}
      <motion.section 
        id="home-multiplayer-spotlight"
        className="home-multiplayer-highlight cursor-pointer"
        variants={shouldReduceMotion ? undefined : cardMotion}
        onClick={() => enterWorld('MultiplayerAuction' as AppTab, 'MultiplayerAuction' as GameScreen)}
      >
        <div className="min-w-0">
          <small className="flex items-center gap-1.5 text-amber-300 font-black tracking-widest text-[11px] uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>GLOBAL LIVE MULTIPLAYER</span>
          </small>
          <h2 className="text-white font-heading font-black text-2xl sm:text-4xl uppercase tracking-tight mt-1">
            Live Multiplayer Auction
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl line-clamp-2">
            Host real-time auction rooms or join friends across the globe in a live synchronized bidding war.
          </p>
        </div>

        <div className="home-multiplayer-highlight__stats shrink-0">
          <span><b>REAL</b> PVP</span>
          <span><b>SYNC</b> LIVE</span>
          <span><b>10</b> TEAMS</span>
        </div>

        <button 
          id="btn-enter-multiplayer-top"
          className="btn-volt shrink-0 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            enterWorld('MultiplayerAuction' as AppTab, 'MultiplayerAuction' as GameScreen);
          }}
        >
          <span>JOIN WAR ROOM</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.section>

      <section className="ultimate-hub__grid">
        <aside className="ultimate-hub__side">
          <div className="ultimate-panel ultimate-panel--star">
            <div className="ultimate-panel__head">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                <Flame className="w-4 h-4 text-amber-400" /> Franchise Star
              </span>
              {captainPlayer && (
                <button 
                  id="btn-trigger-walkout-home"
                  onClick={() => triggerWalkout(captainPlayer)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black text-[10px] uppercase tracking-wider transition cursor-pointer"
                >
                  Walkout
                </button>
              )}
            </div>
            {captainPlayer ? (
              <div className="ultimate-star" onClick={() => setSelectedPlayerForModal(captainPlayer)}>
                <FCPlayerCard player={captainPlayer} size="md" />
              </div>
            ) : (
              <p className="ultimate-empty">Win your first auction battle to reveal a franchise icon.</p>
            )}
          </div>

          {/* Objectives Section - Enhanced Typography & Modern Sports Styling */}
          <div className="ultimate-panel">
            <div className="ultimate-panel__head">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400">
                <Target className="w-4 h-4 text-emerald-400" /> Target Objectives
              </span>
              <button 
                onClick={() => enterWorld('Rewards')}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-[10px] uppercase tracking-wider transition cursor-pointer"
              >
                Vault
              </button>
            </div>

            {/* Objective Progress Bar */}
            <div className="p-2.5 rounded-xl bg-[#060a14] border border-white/10 mb-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Level Progress</span>
                <span className="font-mono text-amber-400 font-black">{completedObjectives} / {objectives.length || 1} Complete</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(8, (completedObjectives / Math.max(1, objectives.length)) * 100))}%` }} 
                />
              </div>
            </div>

            {/* Objective Cards */}
            <div className="ultimate-list space-y-1.5">
              {activeObjectives.map(obj => {
                const pct = Math.min(100, Math.round((obj.progress / Math.max(1, obj.target)) * 100));
                return (
                  <button 
                    key={obj.id} 
                    onClick={() => enterWorld('Rewards')}
                    className="w-full p-2.5 rounded-xl bg-[#0a0f1d] hover:bg-[#121b2d] border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {obj.title}
                      </span>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-black">
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Broadcast Wire Section - Clean Sports Feed */}
          <div className="ultimate-panel">
            <div className="ultimate-panel__head">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <Bell className="w-4 h-4 text-cyan-400" /> Broadcast Feed
              </span>
              <button 
                onClick={() => enterWorld('News')}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-black text-[10px] uppercase tracking-wider transition cursor-pointer"
              >
                All News
              </button>
            </div>
            
            <div className="ultimate-news space-y-1.5">
              {latestNews.length ? latestNews.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => enterWorld('News')}
                  className="w-full p-2.5 rounded-xl bg-[#0a0f1d] hover:bg-[#121b2d] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col gap-1 group cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {item.category}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-bold">
                      WIRE
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-2 leading-tight">
                    {item.title}
                  </span>
                </button>
              )) : (
                <p className="ultimate-empty text-xs text-slate-400 p-2">No headlines yet.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Minimalist, Clean & Attractive Game Mode Tiles */}
        <div className="ultimate-hub__worlds">
          <div className="ultimate-hub__section-title flex items-end justify-between mb-3">
            <div>
              <p className="text-amber-400 font-black text-[11px] uppercase tracking-widest">GAME MODES</p>
              <h2 className="text-white font-heading font-black text-2xl sm:text-3xl uppercase tracking-tight">Enter the Cricket Universe</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">Instant Launch</span>
          </div>

          <motion.div className="ultimate-hub__world-grid" variants={shouldReduceMotion ? undefined : listContainerMotion}>
            {worlds.map(world => (
              <motion.button
                key={world.title}
                onClick={() => enterWorld(world.tab, world.screen || 'Dashboard')}
                whileHover={shouldReduceMotion ? undefined : cardHoverGesture}
                whileTap={shouldReduceMotion ? undefined : tapGesture}
                variants={shouldReduceMotion ? undefined : cardMotion}
                className="group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-left flex flex-col justify-between min-h-[140px] sm:min-h-[160px] border border-white/10 hover:border-white/25 transition-all duration-300 bg-gradient-to-br from-[#0c1222]/90 via-[#070b16]/95 to-[#04060d] hover:shadow-xl hover:shadow-black/60 cursor-pointer"
                style={{
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`
                }}
              >
                {/* Subtle Neon Color Glow on Hover */}
                <div 
                  className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-15 group-hover:opacity-35 transition-opacity duration-300 blur-xl pointer-events-none"
                  style={{ backgroundColor: world.tone }}
                />

                {/* Top Row: Icon + Stat Chip */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-md transition-transform duration-300 group-hover:scale-105"
                    style={{ 
                      backgroundColor: `${world.tone}15`, 
                      borderColor: `${world.tone}40`,
                      color: world.tone 
                    }}
                  >
                    {world.icon}
                  </div>

                  <span 
                    className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border font-mono-sport"
                    style={{ 
                      backgroundColor: `${world.tone}15`, 
                      borderColor: `${world.tone}35`,
                      color: world.tone 
                    }}
                  >
                    {world.stat}
                  </span>
                </div>

                {/* Bottom Row: Minimalist Category & Bold Title */}
                <div className="relative z-10 mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-300 transition-colors">
                    {world.label}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 font-heading uppercase tracking-wide transition-colors">
                      {world.title}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {rewardProgression && (
        <motion.section className="home-reward-widget" variants={shouldReduceMotion ? undefined : cardMotion}>
          <div>
            <small><Gift className="w-4 h-4" /> FRANCHISE PROGRESSION</small>
            <h2>Level {rewardProgression.level} · {rewardProgression.title}</h2>
            <p>{rewardProgression.claimableObjectives} claimable reward(s) · {rewardProgression.completedObjectives}/{rewardProgression.totalObjectives} objectives complete</p>
          </div>
          <div className="home-reward-widget__bar"><span style={{ width: `${rewardProgression.progressPercent}%` }} /></div>
          <button onClick={() => enterWorld('Rewards')}>VIEW REWARDS <ChevronRight className="w-4 h-4" /></button>
        </motion.section>
      )}

      <section className="ultimate-hub__squad-strip">
        <div className="ultimate-hub__section-title">
          <div>
            <p>Elite Core</p>
            <h2>Top Player Cards</h2>
          </div>
          <button onClick={() => enterWorld('Squad')}>Open Squad <ChevronRight className="w-4 h-4" /></button>
        </div>
        <motion.div className="ultimate-hub__cards-row" variants={shouldReduceMotion ? undefined : listContainerMotion}>
          {topPlayers.length ? topPlayers.map(player => (
            <motion.button
              key={player.id}
              onClick={() => setSelectedPlayerForModal(player)}
              layoutId={`player-card-${player.id}`}
              variants={shouldReduceMotion ? undefined : cardMotion}
              whileHover={shouldReduceMotion ? undefined : subtleHoverGesture}
              whileTap={shouldReduceMotion ? undefined : tapGesture}
            >
              <FCPlayerCard player={player} size="sm" />
            </motion.button>
          )) : (
            <div className="ultimate-hub__draft-call">
              <Gavel className="w-8 h-8" />
              <div>
                <h3>No squad built yet</h3>
                <p>Enter the Ultimate Auction and build your first dynasty roster.</p>
              </div>
              <button onClick={() => enterWorld('AuctionLive', 'Auction')}>Auction</button>
            </div>
          )}
        </motion.div>
      </section>

      <section className="ultimate-hub__quick-actions">
        <button onClick={() => enterWorld('Club')}><Dumbbell className="w-4 h-4" /> Facilities</button>
        <button onClick={() => enterWorld('TradeCenter')}><Users className="w-4 h-4" /> Trade Center</button>
        <button onClick={() => enterWorld('Challenges')}><Medal className="w-4 h-4" /> Challenges</button>
        <button onClick={() => enterWorld('Profile')}><Crown className="w-4 h-4" /> Settings</button>
      </section>
    </motion.div>
  );
};
