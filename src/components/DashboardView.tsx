import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  Zap, Trophy, Flame, Users, Calendar, MapPin, 
  Target, Gift, Award, Newspaper, ArrowRight, Crown, Shield
} from 'lucide-react';
import { getFranchiseLevelInfo, INITIAL_OBJECTIVES } from '../engine/progressionEngine';
import { TOKENS } from '../utils/themeTokens';

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
  
  // Calculate squad OVR
  const squadOvr = userPlayers.length > 0 
    ? Math.round(userPlayers.reduce((sum, p) => sum + p.overall, 0) / userPlayers.length)
    : 0;

  const standingsList = gameState.standings || [];
  const userStanding = standingsList.find(s => s.teamId === gameState.userTeamId);
  const userRank = standingsList.findIndex(s => s.teamId === gameState.userTeamId) + 1;

  // Ordinal Rank Formatting
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

  // News snippet
  const latestNews = gameState.newsFeed && gameState.newsFeed.length > 0 ? gameState.newsFeed[0] : null;

  return (
    <div className="space-y-6 pb-20 animate-fadeIn max-w-7xl mx-auto font-sans">
      
      {/* === CINEMATIC HERO SECTION === */}
      <div className="relative bg-gradient-to-br from-[#0a0c12] via-[#070b14] to-[#030712] rounded-3xl border border-[#1e293b] overflow-hidden shadow-2xl">
        {/* Ambient Team Color Glow */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(circle at 30% 50%, ${userTeam?.primaryColor || '#D4AF37'} 0%, transparent 50%), 
                        radial-gradient(circle at 70% 50%, ${userTeam?.secondaryColor || '#1e3a8a'} 0%, transparent 50%)`
          }}
        />

        <div className="relative z-10 p-6 sm:p-8 lg:p-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            
            {/* LEFT: MASSIVE TEAM VISUAL */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-2xl flex items-center justify-center font-black text-3xl sm:text-4xl lg:text-5xl shadow-2xl border-2"
                  style={{ 
                    background: `linear-gradient(135deg, ${userTeam?.primaryColor || '#D4AF37'}, ${userTeam?.secondaryColor || '#1e3a8a'})`,
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.2)'
                  }}
                >
                  {userTeam?.shortName}
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tight">
                    {userTeam?.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 justify-center lg:justify-start">
                    <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-black uppercase tracking-wider">
                      SEASON {gameState.currentSeason}
                    </span>
                    <span className="text-xs text-[#64748b] font-medium">
                      {userTeam?.city}
                    </span>
                  </div>
                </div>
              </div>

              {/* KEY STATS ROW */}
              <div className="flex items-center justify-center lg:justify-start gap-6 sm:gap-8 mt-6">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">OVR</p>
                  <p className="text-2xl sm:text-3xl font-black font-mono text-[#D4AF37]">{squadOvr}</p>
                </div>
                <div className="h-8 w-px bg-[#1e293b]" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">PURSE</p>
                  <p className="text-xl sm:text-2xl font-black font-mono text-[#D4AF37]">₹{userTeam?.purseCr.toFixed(1)} Cr</p>
                </div>
                <div className="h-8 w-px bg-[#1e293b]" />
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-[#64748b]">STANDING</p>
                  <p className="text-xl sm:text-2xl font-black font-mono text-blue-400">{userStanding ? rankOrdinal(userRank) : '—'}</p>
                </div>
              </div>
            </div>

            {/* RIGHT: PRIMARY CTA */}
            <div className="flex-shrink-0">
              {nextFixture && fixtureTeamA && fixtureTeamB ? (
                <div className="text-center">
                  <div className="mb-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-[#64748b] mb-2">NEXT MATCH</p>
                    <div className="flex items-center justify-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-lg"
                        style={{ backgroundColor: fixtureTeamA.primaryColor, color: fixtureTeamA.secondaryColor }}
                      >
                        {fixtureTeamA.shortName}
                      </div>
                      <span className="text-lg font-black text-[#94a3b8]">VS</span>
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-lg"
                        style={{ backgroundColor: fixtureTeamB.primaryColor, color: fixtureTeamB.secondaryColor }}
                      >
                        {fixtureTeamB.shortName}
                      </div>
                    </div>
                    <p className="text-xs text-[#94a3b8] mt-2 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3" /> {nextFixture.venue}
                    </p>
                  </div>

                  <button
                    id="btn-play-match-hero"
                    onClick={() => prepareMatch(nextFixture.id)}
                    className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-amber-400 to-amber-300 text-black font-black text-sm sm:text-base uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-3 shadow-xl shadow-[#D4AF37]/30 cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-black" />
                    <span>{isUserInNextMatch ? 'PLAY NEXT MATCH' : 'SIMULATE MATCH'}</span>
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <Trophy className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Season Complete</h3>
                  <p className="text-xs text-[#94a3b8] mt-2">Final standings available in Club section</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === SECONDARY CONTENT GRID === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* SUPER OVER H2H */}
        <div className="bg-gradient-to-br from-[#0c1220] to-[#090e1a] rounded-2xl p-5 border border-[#1e293b] shadow-lg hover:border-red-500/40 transition group cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-red-400">LIVE 1v1</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">Super Over H2H</h3>
          <p className="text-xs text-[#94a3b8] mb-4">Quick 1-over showdowns</p>
          <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-black uppercase tracking-wider">
            <span>Play Now</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* DAILY OBJECTIVE */}
        <div className="bg-gradient-to-br from-[#0c1220] to-[#090e1a] rounded-2xl p-5 border border-[#1e293b] shadow-lg hover:border-blue-500/40 transition group cursor-pointer" onClick={() => setActiveTab('Club')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">DAILY</span>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400">{completedObjs}/{totalObjs}</span>
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">Daily Objective</h3>
          <p className="text-xs text-[#94a3b8] mb-4">Win 1 match today</p>
          <div className="w-full bg-[#05070a] rounded-full h-1.5 overflow-hidden border border-[#1e293b]">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (completedObjs / Math.max(1, totalObjs)) * 100)}%` }} 
            />
          </div>
        </div>

        {/* LIVE EVENT */}
        <div className="bg-gradient-to-br from-[#0c1220] to-[#090e1a] rounded-2xl p-5 border border-[#1e293b] shadow-lg hover:border-amber-500/40 transition group cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">EVENT</span>
            </div>
            <span className="text-[10px] font-bold text-amber-400">2h 14m</span>
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">Live Event</h3>
          <p className="text-xs text-[#94a3b8] mb-4">Rivalry Night bonus</p>
          <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-black uppercase tracking-wider">
            <span>Join Event</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* SEASON PROGRESS */}
        <div className="bg-gradient-to-br from-[#0c1220] to-[#090e1a] rounded-2xl p-5 border border-[#1e293b] shadow-lg hover:border-emerald-500/40 transition group cursor-pointer" onClick={() => setActiveTab('Club')}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">SEASON</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">{userStanding?.won || 0}W</span>
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">Playoffs Race</h3>
          <p className="text-xs text-[#94a3b8] mb-4">2 matches to clinch spot</p>
          <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-black uppercase tracking-wider">
            <span>View Table</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* === PROGRESSION & REWARDS === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* FRANCHISE LEVEL */}
        <div className="bg-[#0c1220] rounded-2xl p-5 border border-[#1e293b] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Franchise Level</h3>
                <p className="text-[10px] text-[#64748b]">Dynasty Progression</p>
              </div>
            </div>
            <span className="text-2xl font-black font-mono text-[#D4AF37]">LV {levelInfo.level}</span>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-[#64748b]">{progression?.xp || 450} XP</span>
              <span className="text-[#64748b]">{levelInfo.nextLevelXp} XP</span>
            </div>
            <div className="w-full bg-[#05070a] rounded-full h-2 overflow-hidden border border-[#1e293b]">
              <div 
                className="bg-gradient-to-r from-[#D4AF37] to-amber-300 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, levelInfo.progressPercent)}%` }} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8]">{unclaimedRewards} rewards available</span>
            <button
              onClick={() => setActiveTab('Club')}
              className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-xs font-black uppercase tracking-wider text-[#D4AF37] border border-[#D4AF37]/30 transition cursor-pointer"
            >
              Claim Rewards
            </button>
          </div>
        </div>

        {/* RECENT NEWS */}
        <div className="bg-[#0c1220] rounded-2xl p-5 border border-[#1e293b] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Newspaper className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Franchise Wire</h3>
                <p className="text-[10px] text-[#64748b]">Latest Updates</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          
          {latestNews ? (
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-tight mb-2 line-clamp-1">
                {latestNews.title}
              </h4>
              <p className="text-xs text-[#94a3b8] line-clamp-2 mb-4">
                {latestNews.summary}
              </p>
              <button
                onClick={() => setActiveTab('Club')}
                className="w-full py-2 rounded-xl bg-[#1e293b] hover:bg-emerald-600 hover:text-white text-xs font-black uppercase tracking-wider text-emerald-300 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Read More</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-[#64748b]">No recent news</p>
            </div>
          )}
        </div>
      </div>

      {/* === QUICK ACCESS GRID === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('Squad')}
          className="bg-[#0c1220] hover:bg-[#131d35] rounded-xl p-4 border border-[#1e293b] hover:border-[#D4AF37]/40 transition text-center group"
        >
          <Users className="w-6 h-6 text-[#94a3b8] group-hover:text-[#D4AF37] mx-auto mb-2" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Squad</span>
        </button>
        
        <button
          onClick={() => setActiveTab('Auction')}
          className="bg-[#0c1220] hover:bg-[#131d35] rounded-xl p-4 border border-[#1e293b] hover:border-[#D4AF37]/40 transition text-center group"
        >
          <Award className="w-6 h-6 text-[#94a3b8] group-hover:text-[#D4AF37] mx-auto mb-2" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Auction</span>
        </button>
        
        <button
          onClick={() => setActiveTab('Club')}
          className="bg-[#0c1220] hover:bg-[#131d35] rounded-xl p-4 border border-[#1e293b] hover:border-[#D4AF37]/40 transition text-center group"
        >
          <Shield className="w-6 h-6 text-[#94a3b8] group-hover:text-[#D4AF37] mx-auto mb-2" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Club</span>
        </button>
        
        <button
          onClick={() => setActiveTab('Play')}
          className="bg-[#0c1220] hover:bg-[#131d35] rounded-xl p-4 border border-[#1e293b] hover:border-[#D4AF37]/40 transition text-center group"
        >
          <Calendar className="w-6 h-6 text-[#94a3b8] group-hover:text-[#D4AF37] mx-auto mb-2" />
          <span className="text-xs font-black uppercase tracking-wider text-white">Schedule</span>
        </button>
      </div>
    </div>
  );
};

