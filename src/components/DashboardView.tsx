import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { FCPackOpeningModal } from './fc26/FCPackOpeningModal';
import { getPlayerPlayStylePlus } from '../engine/fc26Engine';
import { computeTeamChemistry } from '../engine/chemistryEngine';
import {
  Trophy, Zap, Shield, Sparkles, ShoppingBag, Users, MapPin,
  Dumbbell, Gift, ArrowRight, Radio, Gavel, TrendingUp, HeartPulse, Layers, Newspaper, ChevronRight
} from 'lucide-react';
import { getFranchiseLevelInfo, INITIAL_OBJECTIVES } from '../engine/progressionEngine';

export const DashboardView: React.FC = () => {
  const {
    gameState,
    setActiveTab,
    setCurrentScreen,
    prepareMatch,
    setSelectedPlayerForModal
  } = useGame();

  const [walkoutPlayer, setWalkoutPlayer] = useState<any | null>(null);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const schedule = gameState.leagueSchedule || [];
  const nextFixture = schedule[gameState.currentFixtureIndex];
  const fixtureTeamA = nextFixture ? gameState.teams[nextFixture.teamAId] : null;
  const fixtureTeamB = nextFixture ? gameState.teams[nextFixture.teamBId] : null;

  const rosterIds = userTeam?.rosterPlayerIds || [];
  const userPlayers = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);

  // Squad OVR & Chemistry (real engine values)
  const xiIds = userTeam?.playingXI?.playingXIIds?.length ? userTeam.playingXI.playingXIIds : rosterIds.slice(0, 11);
  const xiPlayers = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const squadOVR = xiPlayers.length > 0
    ? Math.round(xiPlayers.reduce((sum, p) => sum + p.overall, 0) / xiPlayers.length)
    : 0;
  const chemistry = computeTeamChemistry(xiPlayers);
  const injured = userPlayers.filter(p => p.injuryStatus && p.injuryStatus !== 'Fit').length;

  const standingsList = gameState.standings || [];
  const userStanding = standingsList.find(s => s.teamId === gameState.userTeamId);
  const userRank = standingsList.findIndex(s => s.teamId === gameState.userTeamId) + 1;
  const rankOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Progression & Objectives
  const progression = gameState.progression;
  const levelInfo = getFranchiseLevelInfo(progression?.xp || 450);
  const objectives = progression?.objectives || INITIAL_OBJECTIVES;
  const completedObjs = objectives.filter(o => o.isCompleted).length;
  const totalObjs = objectives.length || 5;

  const captainPlayer = userTeam?.captainId ? gameState.allPlayers[userTeam.captainId] : userPlayers[0];
  const captainPlayStyle = captainPlayer ? getPlayerPlayStylePlus(captainPlayer) : null;
  const youthProspects = userPlayers.filter(p => p.isYouthProspect || p.age <= 23);
  const latestNews = gameState.newsFeed && gameState.newsFeed.length > 0 ? gameState.newsFeed[0] : null;

  const isSeasonEnd = !!gameState.seasonSummary || gameState.seasonStage === 'SeasonEnd';
  const rosterEmpty = userPlayers.length === 0;

  const enterWorld = (tab: any, screen: any, path: string) => {
    setCurrentScreen(screen);
    setActiveTab(tab);
    window.history.pushState({}, '', path);
  };

  const worldGateways = [
    { title: 'Auction', kicker: 'War Room', meta: `₹${(userTeam?.purseCr || 0).toFixed(1)} Cr purse`, icon: <Gavel className="w-5 h-5" />, color: 'rgba(212,175,55,.28)', shadow: 'rgba(212,175,55,.55)', action: () => enterWorld('AuctionLive', 'Auction', '/auction') },
    { title: 'Franchise', kicker: 'Club HQ', meta: `${userTeam?.fanSentiment || 0}% fan pulse`, icon: <Shield className="w-5 h-5" />, color: 'rgba(255,226,125,.20)', shadow: 'rgba(255,226,125,.40)', action: () => enterWorld('Club', 'Dashboard', '/franchise') },
    { title: 'Squad', kicker: 'Cards & Roster', meta: `${userPlayers.length} players`, icon: <Users className="w-5 h-5" />, color: 'rgba(0,229,255,.22)', shadow: 'rgba(0,229,255,.45)', action: () => enterWorld('Squad', 'Dashboard', '/squad') },
    { title: 'Playing XI', kicker: 'Tactics Lab', meta: `${xiPlayers.length || 0}/11 selected`, icon: <Layers className="w-5 h-5" />, color: 'rgba(0,255,135,.22)', shadow: 'rgba(0,255,135,.45)', action: () => enterWorld('PlayingXI', 'Dashboard', '/playing-xi') },
    { title: 'Tournament', kicker: 'Competition', meta: userStanding ? `${userStanding.points} pts` : 'League ready', icon: <Trophy className="w-5 h-5" />, color: 'rgba(139,92,246,.22)', shadow: 'rgba(139,92,246,.45)', action: () => enterWorld('League', 'Dashboard', '/tournament') },
    { title: 'Matchday', kicker: 'Live Arena', meta: nextFixture ? `M${nextFixture.matchNumber}` : 'No fixture', icon: <Zap className="w-5 h-5 fill-current" />, color: 'rgba(255,30,86,.22)', shadow: 'rgba(255,30,86,.45)', action: () => enterWorld('Play', 'Dashboard', '/play') },
    { title: 'Scouting', kicker: 'Talent Network', meta: `${gameState.scoutingDepartment?.watchlist?.length || 0} watchlist`, icon: <Radio className="w-5 h-5" />, color: 'rgba(0,229,255,.20)', shadow: 'rgba(0,229,255,.4)', action: () => enterWorld('Scout', 'Dashboard', '/scouting') },
    { title: 'Academy', kicker: 'Youth Lab', meta: `${gameState.youthAcademyPool?.length || 0} prospects`, icon: <Sparkles className="w-5 h-5" />, color: 'rgba(0,255,135,.20)', shadow: 'rgba(0,255,135,.4)', action: () => enterWorld('YouthAcademy', 'Dashboard', '/youth-academy') }
  ];
  const nextThree = schedule.slice(gameState.currentFixtureIndex, gameState.currentFixtureIndex + 3).filter(f => !f.isPlayed);
  const nextUserFixture = schedule.find(f => !f.isPlayed && (f.teamAId === gameState.userTeamId || f.teamBId === gameState.userTeamId));

  return (
    <div className="space-y-6 pb-14 animate-fadeIn font-sans select-none">
      {/* ============ FC 26 HERO: NEXT MATCHDAY ============ */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#101B2E] fc-glow-volt">
        {/* Hero backdrop: brand gradient + stadium light */}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#0B1220_0%,#0E1B2E_45%,#0A101C_100%)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#00FF87]/10 blur-[100px]" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-[#00E5FF]/10 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.35]" style={{
          backgroundImage: 'radial-gradient(circle at 50% 120%, rgba(0,255,135,.18), transparent 55%)'
        }} />

        <div className="relative p-5 sm:p-8">
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/40 text-[#00FF87] text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Zap className="w-3 h-3 fill-current" /> MATCHDAY {nextFixture ? nextFixture.matchNumber : 1}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                SEASON {gameState.currentSeason} • {nextFixture?.stage || 'League'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" /> {nextFixture?.venue || 'Stadium'}
            </span>
          </div>

          {rosterEmpty ? (
            /* First-run: no squad yet */
            <div className="text-center py-8 sm:py-12">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-[#D4AF37]/30 to-[#D4AF37]/5 border border-[#D4AF37]/40 flex items-center justify-center mb-5 shadow-2xl fc-pulse">
                <Gavel className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <h2 className="gradient-text-gold text-2xl sm:text-4xl font-black uppercase italic tracking-tight">Your Dynasty Starts At The Auction</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-3 max-w-lg mx-auto leading-relaxed">
                No squad yet. Enter the Mega Auction Arena, outbid 9 rival franchises and assemble your first XI.
              </p>
              <button
                onClick={() => { setCurrentScreen('Auction'); setActiveTab('AuctionLive'); window.history.pushState({}, '', '/auction'); }}
                className="btn-gold mt-6 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer inline-flex items-center gap-2"
              >
                <Gavel className="w-4 h-4" /> ENTER THE MEGA AUCTION
              </button>
            </div>
          ) : nextFixture && fixtureTeamA && fixtureTeamB ? (
            <>
              {/* Big matchup */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 py-2">
                {[
                  { t: fixtureTeamA, tag: fixtureTeamA.id === gameState.userTeamId ? 'YOUR CLUB' : 'HOME' },
                  { t: fixtureTeamB, tag: fixtureTeamB.id === gameState.userTeamId ? 'YOUR CLUB' : 'AWAY' }
                ].map(({ t, tag }) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab('PlayingXI')}
                    className="group flex flex-col items-center cursor-pointer"
                  >
                    <div
                      className="w-20 h-20 sm:w-28 sm:h-28 rounded-[22px] flex items-center justify-center font-black text-xl sm:text-3xl shadow-2xl border-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-2 relative overflow-hidden"
                      style={{
                        backgroundColor: t.primaryColor,
                        color: t.secondaryColor,
                        borderColor: t.id === gameState.userTeamId ? '#00FF87' : 'rgba(255,255,255,.15)'
                      }}
                    >
                      <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20 pointer-events-none" />
                      {t.shortName}
                    </div>
                    <p className="text-xs sm:text-sm font-black text-white mt-2.5 group-hover:text-[#00FF87] transition">{t.name}</p>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 ${t.id === gameState.userTeamId ? 'text-[#00FF87]' : 'text-slate-500'}`}>{tag}</span>
                  </button>
                ))}
                <div className="hidden sm:flex flex-col items-center px-2">
                  <span className="fc-display text-5xl text-white/90">VS</span>
                  <span className="text-[9px] font-mono text-[#D4AF37] uppercase tracking-[0.3em] mt-1">T20 • 20/20</span>
                </div>
                <div className="sm:hidden text-[#D4AF37] font-black text-lg tracking-widest">VS</div>
              </div>

              {/* CTA row */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
                <button
                  onClick={() => prepareMatch(nextFixture.id)}
                  className="btn-volt w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black text-sm uppercase tracking-[0.18em] cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current" /> PLAY MATCHDAY
                </button>
                <button
                  onClick={() => setActiveTab('PlayingXI')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-black text-xs uppercase tracking-[0.18em] cursor-pointer inline-flex items-center justify-center gap-2 transition hover:border-[#00FF87]/40"
                >
                  <Layers className="w-4 h-4 text-[#00E5FF]" /> SET UP XI
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">Season fixture grid is being built…</div>
          )}
        </div>
      </section>

      {/* ============ GAME WORLD GATEWAYS ============ */}
      <section className="fc-pop-1 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">Enter World</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">Franchise Universe</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">Each card launches a routed game screen with its own loading sequence, environment layer and preserved campaign state.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {worldGateways.map((world, index) => (
            <button
              key={world.title}
              onClick={world.action}
              className="world-gateway-card p-4 text-left min-h-[140px] group"
              style={{ '--world-color': world.color, '--world-shadow': world.shadow } as React.CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="w-11 h-11 rounded-2xl bg-black/45 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  {world.icon}
                </span>
                <span className="text-[10px] font-mono text-slate-500">0{index + 1}</span>
              </div>
              <div className="mt-5">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">{world.kicker}</p>
                <h3 className="text-lg font-black uppercase text-white tracking-tight group-hover:text-[#00FF87] transition-colors">{world.title}</h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-[#D4AF37]">{world.meta}</span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ============ CLUB IDENTITY STRIP ============ */}
      <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2.5 fc-pop-1">
        {[
          { label: 'SQUAD OVR', value: squadOVR || '—', color: 'text-[#00FF87]' },
          { label: 'CHEMISTRY', value: xiPlayers.length ? `${chemistry.score}` : '—', color: 'text-[#00E5FF]' },
          { label: 'LEAGUE RANK', value: userRank > 0 ? rankOrdinal(userRank) : '—', color: 'text-[#D4AF37]' },
          { label: 'RECORD', value: userStanding ? `${userStanding.won}W-${userStanding.lost}L` : '0-0', color: 'text-white' },
          { label: 'INJURIES', value: injured, color: injured > 0 ? 'text-red-400' : 'text-white' },
          { label: 'PURSE', value: `₹${(userTeam?.purseCr || 0).toFixed(0)}`, color: 'text-[#D4AF37]' },
          { label: 'MANAGER LV', value: levelInfo.level, color: 'text-purple-300' }
        ].map(stat => (
          <div key={stat.label} className="glass-panel rounded-2xl px-3 py-3 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
            <p className={`text-lg font-black font-mono ${stat.color} mt-0.5`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* ============ FC 26 ACTION TILES ============ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 fc-pop-2">
        {[
          {
            key: 'auction',
            icon: <Gavel className="w-4 h-4" />,
            title: 'Live Auction',
            sub: `₹${(userTeam?.purseCr || 0).toFixed(1)} Cr remaining`,
            desc: 'Outbid 9 distinct AI franchises and build your championship roster.',
            color: 'text-[#D4AF37]', bg: 'from-[#D4AF37]/15 to-transparent',
            action: () => { setCurrentScreen('Auction'); setActiveTab('AuctionLive'); window.history.pushState({}, '', '/auction'); }
          },
          {
            key: 'squad',
            icon: <Users className="w-4 h-4" />,
            title: 'Squad Builder',
            sub: `${userPlayers.length} players`,
            desc: 'Chemistry room, matchday readiness, training & fitness pulse.',
            color: 'text-[#00E5FF]', bg: 'from-[#00E5FF]/15 to-transparent',
            action: () => setActiveTab('PlayingXI')
          },
          {
            key: 'cards',
            icon: <Layers className="w-4 h-4" />,
            title: 'Card Binder',
            sub: `${youthProspects.length} youth`,
            desc: 'Holographic FC-style cards, evolutions and skill upgrades.',
            color: 'text-[#00FF87]', bg: 'from-[#00FF87]/15 to-transparent',
            action: () => setActiveTab('Squad')
          },
          {
            key: 'league',
            icon: <Trophy className="w-4 h-4" />,
            title: 'League Table',
            sub: userStanding ? `${userStanding.points} pts` : '—',
            desc: 'Points, NRR and the road through Qualifiers to the Final.',
            color: 'text-cyan-300', bg: 'from-cyan-400/15 to-transparent',
            action: () => setActiveTab('Standings')
          }
        ].map(tile => (
          <button
            key={tile.key}
            onClick={tile.action}
            className={`glass-panel fc-lift rounded-2xl p-4 text-left bg-gradient-to-br ${tile.bg} cursor-pointer group`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center ${tile.color}`}>{tile.icon}</span>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wide mt-3">{tile.title}</h3>
            <p className={`text-[10px] font-mono font-bold mt-0.5 ${tile.color}`}>{tile.sub}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">{tile.desc}</p>
          </button>
        ))}
      </section>

      {/* ============ STAR + NEXT FIXTURES ============ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 fc-pop-3">
        {/* Star player */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-5 flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> STAR PLAYER
            </span>
            {captainPlayer && (
              <button onClick={() => setWalkoutPlayer(captainPlayer)} className="text-[10px] font-mono text-amber-400 hover:text-amber-200 cursor-pointer">
                WALKOUT ✨
              </button>
            )}
          </div>
          {captainPlayer ? (
            <div className="cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => setSelectedPlayerForModal(captainPlayer)}>
              <FCPlayerCard player={captainPlayer} size="md" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono">No captain assigned yet</div>
          )}
          <div className="w-full mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Signature PlayStyle</span>
              <p className="text-xs font-black text-amber-300">{captainPlayStyle ? captainPlayStyle.name : '—'}</p>
            </div>
            <button onClick={() => setActiveTab('YouthAcademy')} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#00FF87] text-[10px] font-bold cursor-pointer flex items-center gap-1">
              <Dumbbell className="w-3 h-3" /> EVO
            </button>
          </div>
        </div>

        {/* Next fixtures */}
        <div className="lg:col-span-8 glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-[0.25em] font-black text-white flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00FF87]" /> ROAD AHEAD
            </span>
            <button onClick={() => setActiveTab('Schedule')} className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer flex items-center gap-1">
              FULL FIXTURES <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {nextUserFixture || nextThree.length > 0 ? (
            <div className="space-y-2">
              {(nextThree.length ? nextThree : [nextUserFixture].filter(Boolean)).slice(0, 4).map(f => {
                const a = gameState.teams[f.teamAId];
                const b = gameState.teams[f.teamBId];
                const isUser = f.teamAId === gameState.userTeamId || f.teamBId === gameState.userTeamId;
                return (
                  <div key={f.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isUser ? 'bg-[#00FF87]/8 border-[#00FF87]/25' : 'bg-black/20 border-white/5'}`}>
                    <span className="text-[9px] font-mono text-slate-500 w-8">M{f.matchNumber}</span>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: a?.primaryColor, color: a?.secondaryColor }}>{a?.shortName}</span>
                      <span className="text-[10px] text-slate-600 font-black">v</span>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black" style={{ backgroundColor: b?.primaryColor, color: b?.secondaryColor }}>{b?.shortName}</span>
                      <span className="text-[10px] font-bold text-white truncate hidden sm:inline ml-1">{a?.shortName} vs {b?.shortName}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 hidden md:inline">{f.stage}</span>
                    {isUser && <span className="text-[8px] font-black uppercase text-[#00FF87] px-1.5 py-0.5 rounded bg-[#00FF87]/15">YOU</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Season complete — check the recap!</p>
          )}
          <button
            onClick={() => setActiveTab('Play')}
            className="w-full mt-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black uppercase tracking-widest text-slate-300 cursor-pointer transition"
          >
            Open Match Center →
          </button>
        </div>
      </section>

      {/* ============ SEASON END / NEWS ============ */}
      {isSeasonEnd && (
        <section className="glass-panel fc-glow-gold rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-9 h-9 text-[#D4AF37]" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Season {gameState.currentSeason} Complete</h3>
              <p className="text-xs text-slate-300">Awards are in — recap the season or start the off-season retentions.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('SeasonRecap')} className="btn-gold px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer">Season Recap</button>
            <button onClick={() => setActiveTab('OffSeason')} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-[10px] font-black uppercase tracking-widest cursor-pointer transition">Off-Season</button>
          </div>
        </section>
      )}

      {/* Objectives strip */}
      <section className="glass-panel rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
            <Gift className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white">Objectives & Rewards</p>
            <p className="text-[10px] text-slate-500 truncate">{completedObjs}/{totalObjs} complete • {levelInfo.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="fc-bar w-28 sm:w-40 h-2 rounded-full">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-[#00E5FF]" style={{ width: `${(completedObjs / (totalObjs || 1)) * 100}%` }} />
          </div>
          <button onClick={() => setActiveTab('Rewards')} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 cursor-pointer transition">
            Claim
          </button>
        </div>
      </section>

      {/* News wire */}
      {(latestNews || gameState.newsFeed?.length > 0) && (
        <button
          onClick={() => setActiveTab('News')}
          className="w-full glass-panel rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-[#00E5FF]/40 transition group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest shrink-0 flex items-center gap-1">
              <Radio className="w-3 h-3" /> NEWS
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate group-hover:text-[#00E5FF] transition">{latestNews?.title}</p>
              <p className="text-[10px] text-slate-500 truncate">{latestNews?.summary}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
        </button>
      )}

      {/* WALKOUT MODAL */}
      {walkoutPlayer && (
        <FCPackOpeningModal
          player={walkoutPlayer}
          onClose={() => setWalkoutPlayer(null)}
        />
      )}
    </div>
  );
};
