import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { FCPackOpeningModal } from './fc26/FCPackOpeningModal';
import { getPlayerPlayStylePlus } from '../engine/fc26Engine';
import { 
  Trophy, Zap, Shield, Sparkles, ShoppingBag, Users, MapPin, 
  Dumbbell, Gift, ArrowRight, Radio
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

  // Squad OVR & Chemistry
  const xiIds = userTeam?.playingXI?.playingXIIds?.length ? userTeam.playingXI.playingXIIds : rosterIds.slice(0, 11);
  const xiPlayers = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
  const squadOVR = xiPlayers.length > 0
    ? Math.round(xiPlayers.reduce((sum, p) => sum + p.overall, 0) / xiPlayers.length)
    : 88;

  const teamChemistry = Math.min(100, Math.round(88 + (xiPlayers.filter(p => !p.isOverseas).length * 1.5)));

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

  // Star Captain
  const captainPlayer = userTeam?.captainId ? gameState.allPlayers[userTeam.captainId] : userPlayers[0];
  const captainPlayStyle = captainPlayer ? getPlayerPlayStylePlus(captainPlayer) : null;
  const youthProspects = userPlayers.filter(p => p.isYouthProspect || p.age <= 23);
  const latestNews = gameState.newsFeed && gameState.newsFeed.length > 0 ? gameState.newsFeed[0] : null;

  return (
    <div className="space-y-5 pb-14 animate-fadeIn max-w-7xl mx-auto font-sans select-none">
      
      {/* 1. MINIMALIST FRANCHISE SUMMARY BAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090e1a] border border-[#141d2e] shadow-sm flex flex-wrap items-center justify-between gap-4">
        
        {/* Franchise Title & Match Tracker */}
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow border border-[#00FF87]/50 select-none shrink-0"
            style={{ 
              backgroundColor: userTeam?.primaryColor || '#0a0f1d',
              color: userTeam?.secondaryColor || '#ffffff'
            }}
          >
            {userTeam?.shortName}
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Season {gameState.currentSeason}</span>
              <span>•</span>
              <span>Match {gameState.currentFixtureIndex + 1} of {schedule.length || 14}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {userTeam?.name}
            </h2>
          </div>
        </div>

        {/* Crisp Metric Chips */}
        <div className="flex items-center gap-4 sm:gap-6 ml-auto flex-wrap text-right font-mono">
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase">SQUAD OVR</p>
            <p className="text-lg font-bold text-[#00FF87]">{squadOVR}</p>
          </div>

          <div className="h-6 w-px bg-[#141d2e] hidden sm:block" />

          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase">CHEMISTRY</p>
            <p className="text-lg font-bold text-cyan-400">{teamChemistry}%</p>
          </div>

          <div className="h-6 w-px bg-[#141d2e] hidden sm:block" />

          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase">LEAGUE RANK</p>
            <p className="text-lg font-bold text-amber-400">{userStanding ? rankOrdinal(userRank) : '1st'}</p>
          </div>

          <div className="h-6 w-px bg-[#141d2e] hidden sm:block" />

          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase">RECORD</p>
            <p className="text-lg font-bold text-white">
              {userStanding?.won || 0}W - {userStanding?.lost || 0}L
            </p>
          </div>
        </div>
      </div>

      {/* 2. MAIN HUB GRID: CLEAN MATCHDAY ARENA + STAR PLAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* MATCHDAY ARENA (8 COLS) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#090e1a] border border-[#141d2e] shadow-sm flex flex-col justify-between space-y-6">
          
          {/* Top Fixture Info */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5 text-[#00FF87] font-semibold">
              <Zap className="w-3.5 h-3.5" />
              MATCHDAY {nextFixture ? nextFixture.matchNumber : 1}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {nextFixture?.venue || 'Stadium'}
            </span>
          </div>

          {/* Visual Matchup: Team A vs Team B */}
          {nextFixture && fixtureTeamA && fixtureTeamB ? (
            <div className="flex items-center justify-center space-x-6 sm:space-x-12 my-1">
              {/* Home Team */}
              <div 
                onClick={() => setActiveTab('PlayingXI')}
                className="flex-1 flex flex-col items-center cursor-pointer group"
              >
                <div 
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl shadow border transition-transform duration-200 group-hover:scale-105 ${
                    fixtureTeamA.id === gameState.userTeamId ? 'border-[#00FF87]' : 'border-white/10'
                  }`}
                  style={{ 
                    backgroundColor: fixtureTeamA.primaryColor || '#1e40af', 
                    color: fixtureTeamA.secondaryColor || '#ffffff' 
                  }}
                >
                  {fixtureTeamA.shortName}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white mt-2 group-hover:text-[#00FF87] transition truncate max-w-[120px]">
                  {fixtureTeamA.name}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {fixtureTeamA.id === gameState.userTeamId ? 'Your Club' : 'Home'}
                </span>
              </div>

              {/* VS Divider */}
              <div className="text-slate-500 font-mono font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-lg bg-[#0e1624] border border-[#141d2e]">
                VS
              </div>

              {/* Away Team */}
              <div 
                onClick={() => setActiveTab('PlayingXI')}
                className="flex-1 flex flex-col items-center cursor-pointer group"
              >
                <div 
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl shadow border transition-transform duration-200 group-hover:scale-105 ${
                    fixtureTeamB.id === gameState.userTeamId ? 'border-[#00FF87]' : 'border-white/10'
                  }`}
                  style={{ 
                    backgroundColor: fixtureTeamB.primaryColor || '#dc2626', 
                    color: fixtureTeamB.secondaryColor || '#ffffff' 
                  }}
                >
                  {fixtureTeamB.shortName}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white mt-2 group-hover:text-[#00FF87] transition truncate max-w-[120px]">
                  {fixtureTeamB.name}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {fixtureTeamB.id === gameState.userTeamId ? 'Your Club' : 'Away'}
                </span>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              id="btn-adjust-squad-hero"
              onClick={() => setActiveTab('PlayingXI')}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#0e1624] hover:bg-[#162136] text-white font-semibold text-xs border border-[#141d2e] transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Squad Tactics</span>
            </button>

            <button
              id="btn-play-match-hero"
              onClick={() => prepareMatch(nextFixture?.id || 'm_1')}
              className="w-full sm:flex-1 py-2.5 px-5 rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Play Matchday</span>
            </button>
          </div>

        </div>

        {/* STAR PLAYER SHOWCASE (4 COLS) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-[#090e1a] border border-[#141d2e] shadow-sm flex flex-col items-center justify-between text-center space-y-4">
          
          <div className="w-full flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Star Player
            </span>
            {captainPlayer && (
              <button
                onClick={() => setWalkoutPlayer(captainPlayer)}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-mono transition cursor-pointer"
              >
                Walkout ✨
              </button>
            )}
          </div>

          {captainPlayer ? (
            <div 
              className="cursor-pointer transition-transform duration-200 hover:scale-102"
              onClick={() => setSelectedPlayerForModal(captainPlayer)}
              title="Inspect Player Stats"
            >
              <FCPlayerCard player={captainPlayer} size="md" />
            </div>
          ) : (
            <div className="p-8 text-xs text-slate-500 font-mono">No captain assigned</div>
          )}

          <div className="w-full pt-2 border-t border-[#141d2e] flex items-center justify-between text-left">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Signature Trait</span>
              <p className="text-xs font-bold text-amber-300">
                {captainPlayStyle ? captainPlayStyle.name : 'Master Finisher'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('YouthAcademy')}
              className="px-2.5 py-1 rounded-lg bg-[#0e1624] hover:bg-[#162136] border border-[#141d2e] text-[#00FF87] text-xs font-medium transition cursor-pointer flex items-center gap-1"
            >
              <Dumbbell className="w-3 h-3" />
              <span>Evo</span>
            </button>
          </div>

        </div>

      </div>

      {/* 3. FOUR MINIMALIST FEATURE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* CARD 1: LIVE AUCTION */}
        <div 
          onClick={() => {
            setCurrentScreen('Auction');
            setActiveTab('AuctionLive');
          }}
          className="p-4 rounded-xl bg-[#090e1a] border border-[#141d2e] hover:border-slate-600 hover:bg-[#0e1624] transition cursor-pointer flex flex-col justify-between space-y-3 group"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                Live Auction
              </span>
              <span className="text-[11px] font-mono text-amber-400 font-bold">
                ₹{userTeam?.purseCr.toFixed(1)} Cr
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Scout marquee players, place competitive bids, and build your championship squad.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
            <span>Enter Auction</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 2: EVOLUTIONS LAB */}
        <div 
          onClick={() => setActiveTab('YouthAcademy')}
          className="p-4 rounded-xl bg-[#090e1a] border border-[#141d2e] hover:border-slate-600 hover:bg-[#0e1624] transition cursor-pointer flex flex-col justify-between space-y-3 group"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[#00FF87]" />
                Evolution Lab
              </span>
              <span className="text-[11px] font-mono text-[#00FF87] font-bold">
                {youthProspects.length} Youth
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Upgrade prodigies through targeted training drills and unlock PlayStyles+.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#00FF87] group-hover:text-emerald-300">
            <span>Evolve Squad</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 3: LEAGUE STANDINGS */}
        <div 
          onClick={() => setActiveTab('Standings')}
          className="p-4 rounded-xl bg-[#090e1a] border border-[#141d2e] hover:border-slate-600 hover:bg-[#0e1624] transition cursor-pointer flex flex-col justify-between space-y-3 group"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                Standings
              </span>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                Rank {userRank}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {userStanding?.points || 0} Points • Net Run Rate {(userStanding?.nrr || 0) >= 0 ? `+${userStanding?.nrr.toFixed(2)}` : userStanding?.nrr.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 group-hover:text-cyan-300">
            <span>View Table</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CARD 4: OBJECTIVES & REWARDS */}
        <div 
          onClick={() => setActiveTab('Rewards')}
          className="p-4 rounded-xl bg-[#090e1a] border border-[#141d2e] hover:border-slate-600 hover:bg-[#0e1624] transition cursor-pointer flex flex-col justify-between space-y-3 group"
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-purple-400" />
                Objectives
              </span>
              <span className="text-[11px] font-mono text-purple-400 font-bold">
                {completedObjs}/{totalObjs}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Manager LV {levelInfo.level} • Complete daily franchise milestones.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
            <span>Claim Rewards</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>

      {/* 4. NEWS BANNER */}
      {latestNews && (
        <div className="p-3 rounded-xl bg-[#090e1a] border border-[#141d2e] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
              News
            </span>
            <p className="text-slate-300 truncate">
              <strong className="text-white">{latestNews.headline}:</strong> {latestNews.content}
            </p>
          </div>
        </div>
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


