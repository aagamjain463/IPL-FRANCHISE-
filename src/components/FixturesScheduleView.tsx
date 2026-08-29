import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { StandingsView } from './StandingsView';
import { Calendar, Trophy, Zap, Shield, Filter, CheckCircle2, Clock, MapPin, Eye, Play } from 'lucide-react';
import { LeagueFixture } from '../types/cricket';
import { Team } from '../types/team';

export const FixturesScheduleView: React.FC = () => {
  const { gameState, prepareMatch, setActiveTab, setCurrentScreen } = useGame();
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'MyTeam' | 'Completed' | 'Upcoming'>('All');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [activeSection, setActiveSection] = useState<'Fixtures' | 'PointsTable'>('Fixtures');

  if (!gameState) return null;

  const schedule = gameState.leagueSchedule || [];
  const currentIdx = gameState.currentFixtureIndex || 0;
  const userTeamId = gameState.userTeamId;

  // Filter fixtures
  const filteredSchedule = schedule.filter(fixture => {
    // Status filter
    if (selectedFilter === 'MyTeam' && fixture.teamAId !== userTeamId && fixture.teamBId !== userTeamId) {
      return false;
    }
    if (selectedFilter === 'Completed' && !fixture.isPlayed) {
      return false;
    }
    if (selectedFilter === 'Upcoming' && fixture.isPlayed) {
      return false;
    }

    // Team specific filter
    if (teamFilter !== 'All' && fixture.teamAId !== teamFilter && fixture.teamBId !== teamFilter) {
      return false;
    }

    return true;
  });

  const totalPlayed = schedule.filter(f => f.isPlayed).length;
  const totalUpcoming = schedule.filter(f => !f.isPlayed).length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Header & Sub-Navigation */}
      <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Season {gameState.currentSeason} Fixture Schedule
            </span>
            <span className="text-xs text-[#64748b]">• 70 League Matches + Playoffs</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
            FIXTURES & MATCHDAY SCHEDULE
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Complete schedule of past results, live clashes, and future fixtures across all 10 franchises.
          </p>
        </div>

        {/* Section Toggle */}
        <div className="flex items-center bg-[#05070a] p-1.5 rounded-xl border border-[#1e293b]">
          <button
            id="btn-tab-fixtures-list"
            onClick={() => setActiveSection('Fixtures')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
              activeSection === 'Fixtures'
                ? 'bg-[#D4AF37] text-black shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            All Fixtures ({schedule.length})
          </button>
          <button
            id="btn-tab-points-table"
            onClick={() => setActiveSection('PointsTable')}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
              activeSection === 'PointsTable'
                ? 'bg-[#D4AF37] text-black shadow'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Points Table</span>
          </button>
        </div>
      </div>

      {activeSection === 'PointsTable' ? (
        <StandingsView />
      ) : (
        <>
          {/* Summary Metric Strip & Filter Bar */}
          <div className="bg-[#0b1329] p-4 rounded-2xl border border-[#1e293b] flex flex-wrap items-center justify-between gap-4 shadow-lg">
            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedFilter('All')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedFilter === 'All'
                    ? 'bg-[#1e293b] text-white border border-[#D4AF37]/50'
                    : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                }`}
              >
                All ({schedule.length})
              </button>

              <button
                onClick={() => setSelectedFilter('MyTeam')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedFilter === 'MyTeam'
                    ? 'bg-[#D4AF37] text-black font-black shadow'
                    : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>My Franchise ({schedule.filter(f => f.teamAId === userTeamId || f.teamBId === userTeamId).length})</span>
              </button>

              <button
                onClick={() => setSelectedFilter('Completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedFilter === 'Completed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Past Results ({totalPlayed})</span>
              </button>

              <button
                onClick={() => setSelectedFilter('Upcoming')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedFilter === 'Upcoming'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-[#05070a] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                }`}
              >
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Upcoming ({totalUpcoming})</span>
              </button>
            </div>

            {/* Franchise Dropdown Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748b] font-medium flex items-center gap-1">
                <Filter className="w-3 h-3" /> Team:
              </span>
              <select
                value={teamFilter}
                onChange={e => setTeamFilter(e.target.value)}
                className="bg-[#05070a] border border-[#334155] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] font-semibold"
              >
                <option value="All">All 10 Franchises</option>
                {(Object.values(gameState.teams) as Team[]).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fixtures List */}
          <div className="space-y-3">
            {filteredSchedule.length === 0 ? (
              <div className="bg-[#0f172a] p-12 rounded-2xl border border-[#1e293b] text-center text-xs text-[#94a3b8]">
                No fixtures found matching the selected filters.
              </div>
            ) : (
              filteredSchedule.map((fixture, idx) => {
                const teamA = gameState.teams[fixture.teamAId];
                const teamB = gameState.teams[fixture.teamBId];
                const isUserMatch = fixture.teamAId === userTeamId || fixture.teamBId === userTeamId;
                const isCurrentFixture = schedule[currentIdx]?.id === fixture.id;

                return (
                  <div
                    key={fixture.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg ${
                      isCurrentFixture
                        ? 'bg-gradient-to-r from-[#131d35] via-[#0f172a] to-[#131d35] border-[#D4AF37] ring-1 ring-[#D4AF37]/50 shadow-2xl'
                        : isUserMatch
                        ? 'bg-[#0f172a] border-[#D4AF37]/30 hover:border-[#D4AF37]/60'
                        : 'bg-[#0b1329] border-[#1e293b] hover:bg-[#0f172a]'
                    }`}
                  >
                    {/* Left: Match Number, Stage, Venue */}
                    <div className="space-y-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#D4AF37] font-bold">
                          MATCH #{fixture.matchNumber}
                        </span>
                        {isCurrentFixture && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                            NEXT MATCHDAY
                          </span>
                        )}
                        {isUserMatch && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            YOUR FIXTURE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] pt-1">
                        <MapPin className="w-3 h-3 text-[#64748b]" />
                        <span>{fixture.venue}, {fixture.city}</span>
                      </div>
                    </div>

                    {/* Center: Team A vs Team B Cards */}
                    <div className="flex-1 flex items-center justify-center gap-4 sm:gap-8 my-2 md:my-0 w-full md:w-auto">
                      {/* Team A (Home) */}
                      <div className="flex items-center gap-2.5 text-right justify-end flex-1">
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-[150px]">
                            {teamA?.name}
                          </p>
                          <span className="text-[10px] text-[#64748b]">Home Team</span>
                        </div>
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow border border-white/20"
                          style={{ backgroundColor: teamA?.primaryColor, color: teamA?.secondaryColor }}
                        >
                          {teamA?.shortName}
                        </div>
                      </div>

                      {/* VS or Score Indicator */}
                      <div className="text-center px-2">
                        {fixture.isPlayed ? (
                          <span className="text-xs font-mono font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-lg border border-[#D4AF37]/30 block whitespace-nowrap">
                            COMPLETED
                          </span>
                        ) : (
                          <span className="text-xs font-black italic text-[#475569]">
                            VS
                          </span>
                        )}
                      </div>

                      {/* Team B (Away) */}
                      <div className="flex items-center gap-2.5 text-left justify-start flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow border border-white/20"
                          style={{ backgroundColor: teamB?.primaryColor, color: teamB?.secondaryColor }}
                        >
                          {teamB?.shortName}
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-white truncate max-w-[120px] sm:max-w-[150px]">
                            {teamB?.name}
                          </p>
                          <span className="text-[10px] text-[#64748b]">Away Team</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Outcome or Play Button */}
                    <div className="min-w-[180px] flex justify-end items-center w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#1e293b]">
                      {fixture.isPlayed ? (
                        <div className="text-right space-y-0.5 w-full md:w-auto">
                          <p className="text-xs font-bold text-emerald-400">
                            {fixture.resultText || 'Match Concluded'}
                          </p>
                          {fixture.scoreSummary && (
                            <p className="text-[11px] font-mono text-[#94a3b8]">
                              {fixture.scoreSummary}
                            </p>
                          )}
                        </div>
                      ) : isCurrentFixture ? (
                        <button
                          id={`btn-play-fixture-${fixture.id}`}
                          onClick={() => prepareMatch(fixture.id)}
                          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-black" />
                          <span>{isUserMatch ? 'Play Matchday' : 'Watch / Sim'}</span>
                        </button>
                      ) : (
                        <div className="text-right text-[11px] text-[#64748b] font-mono flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled (Round {Math.floor(fixture.matchNumber / 5) + 1})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};
