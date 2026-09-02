import React, { useMemo } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useGame } from '../context/GameContext';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { FCPackOpeningModal } from './fc26/FCPackOpeningModal';
import { computeTeamChemistry } from '../engine/chemistryEngine';
import { getFranchiseLevelInfo, INITIAL_OBJECTIVES } from '../engine/progressionEngine';
import { deriveRewardProgression, ensureRewardEcosystem } from '../rewards/rewardEngine';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
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
      title: 'Squad Gallery',
      label: 'Player Cards & Form',
      stat: `${userPlayers.length} Players`,
      tab: 'Squad' as AppTab,
      icon: <Users className="w-5 h-5" />,
      tone: '#00E5FF',
      className: 'hub-world--squad'
    },
    {
      title: 'Playing XI Lab',
      label: 'Matchday Lineup & Tactics',
      stat: `${xiPlayers.length}/11 Selected`,
      tab: 'PlayingXI' as AppTab,
      icon: <Gauge className="w-5 h-5" />,
      tone: '#00FF87',
      className: 'hub-world--xi'
    },
    {
      title: 'Mega Auction',
      label: 'Solo Bidding War Room',
      stat: `${auctionProgress}% Pool`,
      tab: 'AuctionLive' as AppTab,
      screen: 'Auction' as GameScreen,
      icon: <Gavel className="w-5 h-5" />,
      tone: '#D4AF37',
      className: 'hub-world--auction'
    },
    {
      title: 'Match Center',
      label: 'Live Matchday Cockpit',
      stat: nextUserFixture ? `M${nextUserFixture.matchNumber}` : 'Ready',
      tab: 'Play' as AppTab,
      icon: <Zap className="w-5 h-5 fill-current" />,
      tone: '#FF1E56',
      className: 'hub-world--match'
    },
    {
      title: 'Tournament',
      label: 'Standings & Fixtures',
      stat: userStanding ? `${userStanding.points} pts` : 'Table',
      tab: 'League' as AppTab,
      icon: <Trophy className="w-5 h-5" />,
      tone: '#8B5CF6',
      className: 'hub-world--league'
    },
    {
      title: 'Scouting Net',
      label: 'Talent Intelligence',
      stat: `${gameState.scoutingDepartment?.watchlist?.length || 0} Targets`,
      tab: 'Scout' as AppTab,
      icon: <Target className="w-5 h-5" />,
      tone: '#38BDF8',
      className: 'hub-world--scout'
    },
    {
      title: 'Youth Academy',
      label: 'Wonderkid Evolutions',
      stat: `${gameState.youthAcademyPool?.length || 0} Prospects`,
      tab: 'YouthAcademy' as AppTab,
      icon: <Sparkles className="w-5 h-5" />,
      tone: '#10B981',
      className: 'hub-world--academy'
    },
    {
      title: 'Franchise HQ',
      label: 'Club Boardroom & Staff',
      stat: `LV ${levelInfo.level}`,
      tab: 'Club' as AppTab,
      icon: <Shield className="w-5 h-5" />,
      tone: '#FFE27D',
      className: 'hub-world--club'
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

      {/* HIGHLIGHT OF THE GAME: PROMINENT LIVE MULTIPLAYER ARENA (TOP PLACEMENT) */}
      <motion.section 
        className="home-multiplayer-hero-banner" 
        variants={shouldReduceMotion ? undefined : cardMotion}
      >
        <div className="home-multiplayer-hero-banner__glow" />
        <div className="home-multiplayer-hero-banner__inner">
          <div className="home-multiplayer-hero-banner__content">
            <div className="home-multiplayer-hero-banner__badge">
              <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
              <span className="text-[#00FF87] font-black tracking-widest text-[11px] uppercase flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> LIVE MULTIPLAYER ARENA
              </span>
              <span className="home-multiplayer-hero-banner__badge-pill">REAL-TIME PVP</span>
            </div>

            <h2 className="home-multiplayer-hero-banner__title">
              LIVE MULTIPLAYER AUCTION
            </h2>

            <p className="home-multiplayer-hero-banner__desc">
              Synchronized real-time IPL bidding war with live human managers. Host a private room with a share code or battle in public multiplayer lobbies.
            </p>

            <div className="home-multiplayer-hero-banner__features">
              <div className="home-multiplayer-hero-banner__pill">
                <Check className="w-3.5 h-3.5 text-[#00FF87]" /> Real Managers Only
              </div>
              <div className="home-multiplayer-hero-banner__pill">
                <Check className="w-3.5 h-3.5 text-[#00FF87]" /> Live SSE Low Latency
              </div>
              <div className="home-multiplayer-hero-banner__pill">
                <Check className="w-3.5 h-3.5 text-[#00FF87]" /> 10 Franchise War Rooms
              </div>
            </div>
          </div>

          <div className="home-multiplayer-hero-banner__actions">
            <button 
              id="btn-home-enter-multiplayer-top"
              onClick={() => enterWorld('MultiplayerAuction', 'MultiplayerAuction')}
              className="btn-volt px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#00FF87]/25 hover:scale-[1.02] active:scale-[0.98] transition font-mono"
            >
              <Radio className="w-4 h-4 text-black" />
              <span>ENTER LIVE WAR ROOMS</span>
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </motion.section>

      <section className="ultimate-hub__grid">
        <aside className="ultimate-hub__side">
          <div className="ultimate-panel ultimate-panel--star">
            <div className="ultimate-panel__head">
              <span><Flame className="w-4 h-4 text-amber-400" /> Franchise Icon</span>
              {captainPlayer && (
                <button 
                  id="btn-trigger-walkout-home" 
                  onClick={() => triggerWalkout(captainPlayer)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
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

          <div className="ultimate-panel">
            <div className="ultimate-panel__head">
              <span className="flex items-center gap-2 text-slate-100 font-bold">
                <Target className="w-4 h-4 text-[#00FF87]" /> Objectives
              </span>
              <button 
                onClick={() => enterWorld('Rewards')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Vault
              </button>
            </div>
            <div className="ultimate-objective-meter">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Completed</span>
                <b className="text-[#00FF87] font-mono font-bold">{completedObjectives} / {objectives.length || 1}</b>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <span 
                  className="h-full bg-gradient-to-r from-emerald-400 to-[#00FF87] block rounded-full transition-all duration-500" 
                  style={{ width: `${(completedObjectives / Math.max(1, objectives.length)) * 100}%` }} 
                />
              </div>
            </div>
            <div className="ultimate-list space-y-2 mt-3">
              {activeObjectives.slice(0, 4).map(obj => {
                const percent = Math.min(100, Math.round((obj.progress / Math.max(1, obj.target)) * 100));
                const isComplete = obj.progress >= obj.target;
                return (
                  <button 
                    key={obj.id} 
                    onClick={() => enterWorld('Rewards')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 hover:border-[#00FF87]/40 text-left transition group cursor-pointer"
                  >
                    <span className="text-slate-100 font-semibold text-xs leading-snug group-hover:text-white line-clamp-1 pr-2">
                      {obj.title}
                    </span>
                    <em className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                      isComplete 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {percent}%
                    </em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ultimate-panel">
            <div className="ultimate-panel__head">
              <span className="flex items-center gap-2 text-slate-100 font-bold">
                <Bell className="w-4 h-4 text-cyan-400" /> Broadcast Feed
              </span>
              <button 
                onClick={() => enterWorld('News')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Wire
              </button>
            </div>
            <div className="ultimate-news space-y-2 mt-2">
              {latestNews.length ? latestNews.slice(0, 4).map(item => (
                <button 
                  key={item.id} 
                  onClick={() => enterWorld('News')}
                  className="w-full flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-400/40 text-left transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
                      {item.category}
                    </b>
                  </div>
                  <span className="text-slate-100 font-medium text-xs leading-snug group-hover:text-white line-clamp-2">
                    {item.title}
                  </span>
                </button>
              )) : (
                <p className="ultimate-empty text-slate-400 text-xs py-4 text-center">No broadcast alerts yet.</p>
              )}
            </div>
          </div>
        </aside>

        <div className="ultimate-hub__worlds">
          <div className="ultimate-hub__section-title">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#00FF87] font-bold">GAME MODES</p>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Enter the Cricket Universe</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Direct access to all franchise operations</span>
          </div>
          
          <motion.div className="ultimate-hub__world-grid" variants={shouldReduceMotion ? undefined : listContainerMotion}>
            {worlds.map(world => (
              <motion.button
                key={world.title}
                onClick={() => enterWorld(world.tab, world.screen || 'Dashboard')}
                whileHover={shouldReduceMotion ? undefined : cardHoverGesture}
                whileTap={shouldReduceMotion ? undefined : tapGesture}
                variants={shouldReduceMotion ? undefined : cardMotion}
                className={`ultimate-world-card ${world.className}`}
                style={{ '--hub-tone': world.tone } as React.CSSProperties}
              >
                <div className="ultimate-world-card__orb" />
                <div className="ultimate-world-card__top">
                  <span className="ultimate-world-card__icon">{world.icon}</span>
                  <em className="ultimate-world-card__stat font-mono">{world.stat}</em>
                </div>
                <div className="ultimate-world-card__body">
                  <p className="ultimate-world-card__label">{world.label}</p>
                  <h3 className="ultimate-world-card__title">{world.title}</h3>
                </div>
                <div className="ultimate-world-card__enter">
                  <span>OPEN</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
