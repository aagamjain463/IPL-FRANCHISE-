import React from 'react';
import { useGame } from '../context/GameContext';
import { 
  Trophy, Award, Crown, Shield, Flame, Star, 
  TrendingUp, Users, Calendar, Target, Zap, Clock
} from 'lucide-react';
import { getFranchiseLevelInfo, INITIAL_RIVALRIES } from '../engine/progressionEngine';
import { DynamicRivalry } from '../types/franchise';

export const ProfileLegacyView: React.FC = () => {
  const { gameState } = useGame();

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const progression = gameState.progression;
  const xp = progression?.xp || 450;
  const levelInfo = getFranchiseLevelInfo(xp);
  const rivalries = progression?.rivalries || INITIAL_RIVALRIES;

  const totalMatches = userTeam?.totalMatchesPlayed || 14;
  const totalWins = userTeam?.totalMatchesWon || 9;
  const winPercent = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Hero Franchise Profile Header */}
      <div className="relative bg-gradient-to-r from-[#0f172a] via-[#131d33] to-[#0a0c12] rounded-2xl p-6 sm:p-8 border border-[#1e293b] shadow-2xl overflow-hidden">
        {/* Ambient Glow */}
        <div 
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: userTeam?.primaryColor || '#D4AF37' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Franchise Crest */}
          <div 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center font-black text-3xl sm:text-4xl shadow-2xl border-2 border-white/30 shrink-0"
            style={{ backgroundColor: userTeam?.primaryColor || '#D4AF37', color: userTeam?.secondaryColor || '#000' }}
          >
            {userTeam?.shortName}
          </div>

          {/* Franchise Identity & Level Bar */}
          <div className="flex-1 text-center md:text-left space-y-3 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tight flex items-center justify-center md:justify-start gap-2">
                  <span>{userTeam?.name}</span>
                  <span className="text-sm font-normal not-italic px-2.5 py-0.5 rounded-full bg-[#1e293b] text-[#D4AF37] border border-[#D4AF37]/30">
                    Est. 2008
                  </span>
                </h2>
                <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">
                  Manager: <span className="text-white">{gameState.managerName}</span> • Head Coach & GM
                </p>
              </div>

              {/* Level Badge */}
              <div className="inline-flex items-center gap-2 bg-[#05070a] px-4 py-2 rounded-xl border border-[#D4AF37]/40 shadow-inner">
                <Crown className="w-5 h-5 text-[#D4AF37]" />
                <div className="text-left">
                  <p className="text-[9px] uppercase font-bold text-[#64748b]">Franchise Tier</p>
                  <p className="text-sm font-black text-white">Level {levelInfo.level} <span className="text-[#D4AF37] font-semibold text-xs">• {levelInfo.title}</span></p>
                </div>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-[#94a3b8]">Dynasty Experience (XP)</span>
                <span className="font-mono text-[#D4AF37] font-bold">{levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP</span>
              </div>
              <div className="h-2.5 bg-[#05070a] rounded-full overflow-hidden border border-[#1e293b]">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-[#D4AF37] rounded-full transition-all duration-700 shadow-lg shadow-[#D4AF37]/30"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Trophy Room & Career Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: Trophy Cabinet (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Trophy Cabinet */}
          <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
            <h3 className="text-sm uppercase font-black text-white tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#D4AF37]" />
              <span>Franchise Trophy Cabinet</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'IPL Championship', count: userTeam?.titlesWon || 1, icon: Trophy, color: 'text-[#D4AF37]' },
                { name: 'Final Appearances', count: userTeam?.finalsReached || 2, icon: Award, color: 'text-blue-400' },
                { name: 'Orange Caps', count: 2, icon: Crown, color: 'text-amber-500' },
                { name: 'Purple Caps', count: 1, icon: Star, color: 'text-purple-400' }
              ].map((trophy, idx) => {
                const Icon = trophy.icon;
                return (
                  <div key={idx} className="bg-[#05070a] p-4 rounded-xl border border-[#1e293b] text-center space-y-1">
                    <Icon className={`w-6 h-6 mx-auto ${trophy.color}`} />
                    <p className="text-xl font-black font-mono text-white">{trophy.count}</p>
                    <p className="text-[10px] uppercase font-bold text-[#64748b] leading-tight">{trophy.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Head-to-Head Rivalries */}
          <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
            <h3 className="text-sm uppercase font-black text-white tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              <span>Dynamic IPL Rivalries</span>
            </h3>

            <div className="space-y-3">
              {(Object.values(rivalries) as DynamicRivalry[]).map(rivalry => {
                const opponent = gameState.teams[rivalry.opponentTeamId];
                return (
                  <div key={rivalry.opponentTeamId} className="p-4 bg-[#05070a] rounded-xl border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{rivalry.rivalryName}</span>
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          {rivalry.intensity}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8]">
                        vs <span className="text-white font-bold">{opponent?.name}</span> • Last match: {rivalry.lastEncounterResult || 'Recent win'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-center">
                        <p className="text-[9px] text-[#64748b] uppercase">User Wins</p>
                        <p className="font-bold text-emerald-400 text-sm">{rivalry.userWins}</p>
                      </div>
                      <span className="text-[#334155] font-bold">-</span>
                      <div className="text-center">
                        <p className="text-[9px] text-[#64748b] uppercase">Opponent</p>
                        <p className="font-bold text-red-400 text-sm">{rivalry.opponentWins}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Career Records & All-Time Stats (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
            <h3 className="text-sm uppercase font-black text-white tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Franchise Records</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#64748b]">Highest Team Total</p>
                  <p className="font-bold text-white">234/4 (20.0 ov)</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">vs RCB</span>
              </div>

              <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#64748b]">Lowest Total Defended</p>
                  <p className="font-bold text-white">128/9 (20.0 ov)</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">vs MI (Won by 6)</span>
              </div>

              <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#64748b]">Record Chase</p>
                  <p className="font-bold text-white">208/3 (18.4 ov)</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">vs KKR</span>
              </div>

              <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#64748b]">All-Time Win Rate</p>
                  <p className="font-bold text-white">{winPercent}% ({totalWins}W - {totalMatches - totalWins}L)</p>
                </div>
                <span className="text-[10px] text-[#D4AF37] font-mono font-bold">{totalMatches} Matches</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
