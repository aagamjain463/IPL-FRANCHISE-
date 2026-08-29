import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  Trophy, Zap, Shield, TrendingUp, 
  Flame, Award, ArrowRight, Activity, Newspaper, Target,
  Calendar, CheckCircle2, Gift, Sparkles, ShoppingBag, Users, Building2, MapPin, Clock
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

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const schedule = gameState.leagueSchedule || [];
  const nextFixture = schedule[gameState.currentFixtureIndex];
  const fixtureTeamA = nextFixture ? gameState.teams[nextFixture.teamAId] : null;
  const fixtureTeamB = nextFixture ? gameState.teams[nextFixture.teamBId] : null;
  const isUserInNextMatch = nextFixture 
    ? (nextFixture.teamAId === gameState.userTeamId || nextFixture.teamBId === gameState.userTeamId) 
    : false;
  
  const fixtureOpponentTeam = isUserInNextMatch 
    ? (fixtureTeamA?.id === gameState.userTeamId ? fixtureTeamB : fixtureTeamA)
    : (fixtureTeamB || fixtureTeamA);

  const rosterIds = userTeam?.rosterPlayerIds || [];
  const userPlayers = rosterIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const overseasCount = userPlayers.filter(p => p.isOverseas).length;

  // Squad OVR: average overall rating of the confirmed Playing XI (falls back to full roster)
  const xiIds = userTeam?.playingXI?.playingXIIds?.length ? userTeam.playingXI.playingXIIds : rosterIds.slice(0, 11);
  const xiPlayers = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const squadOVR = xiPlayers.length > 0
    ? Math.round(xiPlayers.reduce((sum, p) => sum + p.overall, 0) / xiPlayers.length)
    : 0;

  const standingsList = gameState.standings || [];
  const userStanding = standingsList.find(s => s.teamId === gameState.userTeamId);
  const userRank = standingsList.findIndex(s => s.teamId === gameState.userTeamId) + 1;

  // Ordinal Rank Formatting (1st, 2nd, 3rd...)
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
  const unclaimedRewards = progression?.unclaimedRewardsCount || 0;

  // Top Key Performer
  const topPerformer = userPlayers.length > 0 
    ? [...userPlayers].sort((a, b) => (b.stats.runs + b.stats.wickets * 20) - (a.stats.runs + a.stats.wickets * 20))[0]
    : null;

  // News snippet
  const latestNews = gameState.newsFeed && gameState.newsFeed.length > 0 ? gameState.newsFeed[0] : null;

  return (
    <div className="space-y-5 pb-12 animate-fadeIn max-w-6xl mx-auto font-sans">
      
      {/* 1. FRANCHISE STATUS HEADER STRIP */}
      <div className="bg-surface-deep rounded-2xl p-4 sm:p-5 border border-line shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Franchise Identity */}
        <div className="flex items-center gap-3.5">
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg border border-white/20 select-none shrink-0"
            style={{ 
              background: `linear-gradient(135deg, ${userTeam?.primaryColor || '#D4AF37'}, ${userTeam?.secondaryColor || '#1e3a8a'})`,
              color: '#ffffff'
            }}
          >
            {userTeam?.shortName}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-gold px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20">
                SEASON {gameState.currentSeason}
              </span>
              <span className="text-[10px] uppercase font-bold text-ink-faint">
                MATCH {gameState.currentFixtureIndex + 1} OF {schedule.length || 14}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white uppercase italic tracking-tight">
              {userTeam?.name}
            </h2>
          </div>
        </div>

        {/* Key High-Level Sports Indicators */}
        <div className="flex items-center gap-3 sm:gap-6 ml-auto flex-wrap">
          {/* Squad OVR */}
          <div className="text-center sm:text-right">
            <p className="text-[9px] uppercase font-bold tracking-widest text-ink-faint">Squad OVR</p>
            <p className="text-base sm:text-lg font-black font-mono text-gold leading-tight">
              {squadOVR || '—'}
            </p>
          </div>

          <div className="h-7 w-px bg-line hidden sm:block" />

          {/* League Position */}
          <div className="text-center sm:text-right">
            <p className="text-[9px] uppercase font-bold tracking-widest text-ink-faint">Standing</p>
            <p className="text-base sm:text-lg font-black font-mono text-blue-400 leading-tight">
              {userStanding ? rankOrdinal(userRank) : '—'}
            </p>
          </div>

          <div className="h-7 w-px bg-line hidden sm:block" />

          {/* Form Streak */}
          <div className="text-center sm:text-right">
            <p className="text-[9px] uppercase font-bold tracking-widest text-ink-faint">Record & Form</p>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className="text-xs sm:text-sm font-black text-white font-mono">
                {userStanding?.won || 0}W-{userStanding?.lost || 0}L
              </span>
              {userStanding?.recentForm && userStanding.recentForm.length > 0 && (
                <span className="flex items-center gap-0.5 ml-1">
                  {userStanding.recentForm.map((result, i) => (
                    <span
                      key={i}
                      title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Tie'}
                      className={`w-4 h-4 rounded-[4px] flex items-center justify-center text-[8px] font-black ${
                        result === 'W'
                          ? 'bg-success/20 text-success border border-success/40'
                          : result === 'L'
                          ? 'bg-danger/20 text-danger border border-danger/40'
                          : 'bg-ink-faint/20 text-ink-muted border border-ink-faint/40'
                      }`}
                    >
                      {result}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>

          <div className="h-7 w-px bg-line hidden sm:block" />

          {/* Purse */}
          <div className="text-center sm:text-right">
            <p className="text-[9px] uppercase font-bold tracking-widest text-ink-faint">Purse Available</p>
            <p className="text-base sm:text-lg font-black font-mono text-gold leading-tight">
              ₹{userTeam?.purseCr.toFixed(2)} Cr
            </p>
          </div>
        </div>
      </div>

      {/* 2. HERO: NEXT MATCH CARD (High-Impact Sports Presentation) */}
      {nextFixture && fixtureTeamA && fixtureTeamB ? (
        <div className="relative bg-gradient-to-b from-[#0e1628] via-[#090e1a] to-[#060a12] rounded-3xl border border-line overflow-hidden shadow-2xl p-6 sm:p-8">
          {/* Subtle Ambient Stadium Backlight */}
          <div 
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 blur-3xl opacity-20 pointer-events-none rounded-full"
            style={{ backgroundColor: userTeam?.primaryColor || '#D4AF37' }}
          />

          <div className="relative z-10 flex flex-col items-center text-center space-y-5">
            
            {/* Top Match Info Badge */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-line/80 border border-white/10 text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5 shadow-sm">
                <Calendar className="w-3 h-3 text-gold" />
                <span>MATCHDAY {nextFixture.matchNumber}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-surface/80 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>{nextFixture.venue}</span>
              </div>
            </div>

            {/* Visual Matchup: Team A vs Team B */}
            <div className="flex items-center justify-center space-x-6 sm:space-x-12 my-2 w-full max-w-xl">
              
              {/* Home Team */}
              <div 
                onClick={() => setActiveTab('PlayingXI')}
                className="flex-1 flex flex-col items-center cursor-pointer group"
              >
                <div 
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl shadow-2xl border-2 transition-transform group-hover:scale-105 ${
                    fixtureTeamA.id === gameState.userTeamId ? 'border-gold ring-4 ring-gold/20' : 'border-white/20'
                  }`}
                  style={{ 
                    backgroundColor: fixtureTeamA.primaryColor || '#1e40af', 
                    color: fixtureTeamA.secondaryColor || '#ffffff' 
                  }}
                >
                  {fixtureTeamA.shortName}
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-2.5 group-hover:text-gold transition">
                  {fixtureTeamA.name}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mt-0.5">
                  {fixtureTeamA.id === gameState.userTeamId ? 'YOUR TEAM (HOME)' : 'HOME'}
                </span>
              </div>

              {/* VS Badge */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-line border border-white/10 flex items-center justify-center font-black text-xs italic text-ink-muted shadow-inner">
                  VS
                </div>
                <span className="text-[9px] uppercase font-bold text-ink-faint mt-1 tracking-widest">T20</span>
              </div>

              {/* Away Team */}
              <div 
                onClick={() => setActiveTab('PlayingXI')}
                className="flex-1 flex flex-col items-center cursor-pointer group"
              >
                <div 
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl shadow-2xl border-2 transition-transform group-hover:scale-105 ${
                    fixtureTeamB.id === gameState.userTeamId ? 'border-gold ring-4 ring-gold/20' : 'border-white/20'
                  }`}
                  style={{ 
                    backgroundColor: fixtureTeamB.primaryColor || '#dc2626', 
                    color: fixtureTeamB.secondaryColor || '#ffffff' 
                  }}
                >
                  {fixtureTeamB.shortName}
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white mt-2.5 group-hover:text-gold transition">
                  {fixtureTeamB.name}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  {fixtureTeamB.id === gameState.userTeamId ? 'YOUR TEAM (AWAY)' : 'AWAY'}
                </span>
              </div>
            </div>

            {/* Tactical Pitch Summary Preview */}
            <p className="text-xs text-ink-muted max-w-md italic">
              {fixtureOpponentTeam 
                ? `Opposition Danger: Captain ${gameState.allPlayers[fixtureOpponentTeam.captainId]?.name || 'Top Lineup'}. Optimize bowling matchups for powerplay.`
                : 'Review team combinations and confirm your Playing XI before kickoff.'}
            </p>

            {/* Primary Action Button (Large & Dominant) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md pt-2">
              {isUserInNextMatch && (
                <button
                  id="btn-adjust-squad-hero"
                  onClick={() => setActiveTab('PlayingXI')}
                  className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-line hover:bg-[#2b3a4f] text-white font-black text-xs uppercase tracking-wider border border-white/10 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4 text-gold" />
                  <span>Adjust Playing XI</span>
                </button>
              )}

              <button
                id="btn-play-match-hero"
                onClick={() => prepareMatch(nextFixture.id)}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-gold via-amber-400 to-amber-300 text-black font-black text-xs sm:text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-gold/20 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>{isUserInNextMatch ? 'PLAY MATCH' : 'SIMULATE MATCH'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0e1628] rounded-3xl border border-line p-8 text-center shadow-2xl">
          <Trophy className="w-12 h-12 text-gold mx-auto mb-3" />
          <h3 className="text-lg font-black text-white uppercase tracking-tight">League Fixtures Concluded</h3>
          <p className="text-xs text-ink-muted mt-1">Review the final standings or initiate the next season campaign.</p>
        </div>
      )}

      {/* 3. DYNAMIC HUB CARDS (Minimalist, High Usability, No Clutter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARD 1: DAILY OBJECTIVES */}
        <div className="bg-surface-deep rounded-2xl p-4 sm:p-5 border border-line shadow-lg flex flex-col justify-between space-y-4 hover:border-gold/30 transition group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-ink-faint flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                OBJECTIVES
              </span>
              <span className="text-xs font-mono font-bold text-blue-400">{completedObjs}/{totalObjs}</span>
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight mt-2">Daily Missions</h4>
            <p className="text-xs text-ink-muted mt-1">
              {completedObjs === totalObjs 
                ? 'All objectives finished! Claim your XP bonuses.' 
                : 'Win matches, scout talent, and hit match targets.'}
            </p>
          </div>

          <div>
            <div className="w-full bg-canvas rounded-full h-2 overflow-hidden mb-3 border border-line">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (completedObjs / Math.max(1, totalObjs)) * 100)}%` }} 
              />
            </div>
            <button
              onClick={() => setActiveTab('Rewards')}
              className="w-full py-2.5 rounded-xl bg-line group-hover:bg-blue-600 group-hover:text-white text-xs font-black uppercase tracking-wider text-blue-300 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>View Missions</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 2: REWARDS & CLAIM */}
        <div className="bg-surface-deep rounded-2xl p-4 sm:p-5 border border-line shadow-lg flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-ink-faint flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                REWARDS
              </span>
              {unclaimedRewards > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-black text-[10px] border border-amber-500/30 animate-pulse">
                  {unclaimedRewards} READY
                </span>
              ) : (
                <span className="text-[10px] font-bold text-ink-faint">CLAIMED</span>
              )}
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight mt-2">Dynasty Unlocks</h4>
            <p className="text-xs text-ink-muted mt-1">
              {unclaimedRewards > 0 
                ? `${unclaimedRewards} unlocked rewards waiting in the vault.` 
                : `Level up to LV ${levelInfo.level + 1} to unlock elite scout perks.`}
            </p>
          </div>

          <div>
            <button
              onClick={() => setActiveTab('Rewards')}
              className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                unclaimedRewards > 0 
                  ? 'bg-gradient-to-r from-amber-500 to-gold text-black shadow-lg shadow-amber-500/20 hover:scale-102' 
                  : 'bg-line group-hover:bg-line-strong text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{unclaimedRewards > 0 ? 'Claim Rewards' : 'Open Vault'}</span>
            </button>
          </div>
        </div>

        {/* CARD 3: SCOUTING RADAR */}
        <div className="bg-surface-deep rounded-2xl p-4 sm:p-5 border border-line shadow-lg flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-ink-faint flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                SCOUTING
              </span>
              <span className="text-[10px] font-bold text-purple-400 font-mono">POOL ACTIVE</span>
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight mt-2">Talent Radar</h4>
            <p className="text-xs text-ink-muted mt-1">
              Scout top wonderkids and shortlist marquee targets for upcoming auction.
            </p>
          </div>

          <div>
            <button
              onClick={() => setActiveTab('YouthAcademy')}
              className="w-full py-2.5 rounded-xl bg-line group-hover:bg-purple-600 group-hover:text-white text-xs font-black uppercase tracking-wider text-purple-300 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Explore Scouts</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CARD 4: FRANCHISE WIRE / NEWS */}
        <div className="bg-surface-deep rounded-2xl p-4 sm:p-5 border border-line shadow-lg flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-widest text-ink-faint flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-emerald-400" />
                IPL NEWS
              </span>
              <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
              </span>
            </div>
            <h4 className="text-sm font-black text-white uppercase tracking-tight mt-2 truncate">
              {latestNews ? latestNews.title : 'Trade Window Open'}
            </h4>
            <p className="text-xs text-ink-muted mt-1 line-clamp-2">
              {latestNews ? latestNews.summary : 'Franchises finalizing player retention lists and auction purse allocations.'}
            </p>
          </div>

          <div>
            <button
              onClick={() => setActiveTab('TradeCenter')}
              className="w-full py-2.5 rounded-xl bg-line group-hover:bg-emerald-600 group-hover:text-white text-xs font-black uppercase tracking-wider text-emerald-300 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Trade Wire</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

