import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Zap, Calendar, Trophy, Flame, Play, Clock, 
  MapPin, Shield, CheckCircle2, Award, ChevronRight, Activity, RotateCcw
} from 'lucide-react';
import { MATCH_MOMENTS } from '../engine/progressionEngine';
import { MatchMomentScenario } from '../types/franchise';
import { SCENARIO_CHALLENGES, ChallengeScenario } from '../data/challenges';
import { FixturesScheduleView } from './FixturesScheduleView';
import { Team } from '../types/team';

export const PlayCenterView: React.FC = () => {
  const { 
    gameState, 
    prepareMatch, 
    prepareScenarioChallenge, 
    setCurrentScreen, 
    setActiveTab 
  } = useGame();

  const [activeSubTab, setActiveSubTab] = useState<'Matchday' | 'Schedule' | 'Moments' | 'QuickMatch' | 'Challenges' | 'Results'>('Matchday');
  const [selectedQuickTeamA, setSelectedQuickTeamA] = useState<string>(gameState?.userTeamId || 'csk');
  const [selectedQuickTeamB, setSelectedQuickTeamB] = useState<string>('mi');
  const [quickOvers, setQuickOvers] = useState<number>(20);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const schedule = gameState.leagueSchedule || [];
  const nextFixture = schedule[gameState.currentFixtureIndex];
  const fixtureTeamA = nextFixture ? gameState.teams[nextFixture.teamAId] : null;
  const fixtureTeamB = nextFixture ? gameState.teams[nextFixture.teamBId] : null;
  const isUserInNextMatch = nextFixture ? (nextFixture.teamAId === gameState.userTeamId || nextFixture.teamBId === gameState.userTeamId) : false;

  const completedFixtures = schedule.filter(f => f.isPlayed).reverse();

  const handleStartQuickMatch = () => {
    if (!selectedQuickTeamA || !selectedQuickTeamB || selectedQuickTeamA === selectedQuickTeamB) return;
    const dummyFixtureId = nextFixture?.id || schedule[0]?.id;
    if (dummyFixtureId) {
      prepareMatch(dummyFixtureId);
    }
  };

  const handlePlayMoment = (moment: MatchMomentScenario) => {
    const scenario: ChallengeScenario = {
      id: moment.id,
      title: moment.title,
      tagline: moment.subtitle,
      description: moment.contextDesc,
      difficulty: (moment.difficulty === 'Easy' ? 'Medium' : moment.difficulty) as 'Medium' | 'Hard' | 'Extreme',
      targetRuns: moment.targetRuns,
      ballsRemaining: moment.ballsRemaining,
      wicketsRemaining: moment.wicketsInHand,
      userTeamId: moment.chasingTeamId === 'user' ? gameState.userTeamId : moment.chasingTeamId,
      opponentTeamId: moment.defendingTeamId === 'user' ? gameState.userTeamId : moment.defendingTeamId,
      initialInnings1Score: {
        runs: moment.targetRuns - 1,
        wickets: 6,
        overs: 20
      },
      initialInnings2Score: {
        runs: moment.targetRuns - moment.runsNeeded,
        wickets: 10 - moment.wicketsInHand,
        oversCompleted: 20 - Math.ceil(moment.ballsRemaining / 6),
        ballsInOver: (6 - (moment.ballsRemaining % 6)) % 6
      },
      keyTacticalObjective: moment.contextDesc,
      rewardPoints: moment.xpReward
    };

    prepareScenarioChallenge(scenario);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Sub-Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0c12] p-3 md:p-4 rounded-xl border border-[#1e293b]">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
            <span>Match Arena & Play Center</span>
          </h2>
          <p className="text-xs text-[#94a3b8]">Launch matchday fixtures, clutch scenarios, exhibition friendlies, and full season schedules.</p>
        </div>

        {/* Sub-tabs pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'Matchday', label: 'Next Match', icon: Zap },
            { id: 'Moments', label: 'Clutch Moments', icon: Flame },
            { id: 'Schedule', label: 'Schedule', icon: Calendar },
            { id: 'QuickMatch', label: 'Exhibition', icon: Play },
            { id: 'Challenges', label: 'Scenarios', icon: Trophy },
            { id: 'Results', label: 'Results', icon: CheckCircle2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  isActive 
                    ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20 font-black' 
                    : 'bg-[#0f172a] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border border-[#1e293b]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: MATCHDAY HERO & TACTICAL PREPARATION */}
      {activeSubTab === 'Matchday' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Stadium Action Card (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {nextFixture && fixtureTeamA && fixtureTeamB ? (
              <div className="relative bg-gradient-to-t from-[#0f172a] via-[#0b1324] to-[#080d1a] rounded-2xl border border-[#1e293b] overflow-hidden p-6 sm:p-8 shadow-2xl">
                {/* Stadium Mesh Background */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

                <div className="relative z-10 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#D4AF37]">
                      Matchday {nextFixture.matchNumber} of 14 • {nextFixture.venue}
                    </span>
                    {!isUserInNextMatch && (
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Spectator Fixture
                      </span>
                    )}
                  </div>

                  {/* Team Badges & Stadium Header */}
                  <div className="flex items-center justify-center space-x-6 sm:space-x-12 my-6">
                    {/* Home Team */}
                    <div className="text-center group cursor-pointer" onClick={() => setActiveTab('PlayingXI')}>
                      <div 
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-3xl sm:text-4xl mb-2 shadow-2xl mx-auto transform group-hover:scale-105 transition-transform ${
                          fixtureTeamA.id === gameState.userTeamId ? 'ring-4 ring-[#D4AF37] border-2 border-white' : 'border border-white/20'
                        }`}
                        style={{ backgroundColor: fixtureTeamA.primaryColor || '#1e40af', color: fixtureTeamA.secondaryColor || '#ffffff' }}
                      >
                        {fixtureTeamA.shortName}
                      </div>
                      <p className="text-sm font-black uppercase tracking-wider text-white">{fixtureTeamA.name}</p>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Home Team</span>
                    </div>

                    <div className="text-3xl sm:text-5xl font-black italic text-[#334155] select-none">
                      VS
                    </div>

                    {/* Away Team */}
                    <div className="text-center">
                      <div 
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center font-black text-3xl sm:text-4xl mb-2 shadow-2xl mx-auto ${
                          fixtureTeamB.id === gameState.userTeamId ? 'ring-4 ring-[#D4AF37] border-2 border-white' : 'border border-white/20'
                        }`}
                        style={{ backgroundColor: fixtureTeamB.primaryColor || '#dc2626', color: fixtureTeamB.secondaryColor || '#ffffff' }}
                      >
                        {fixtureTeamB.shortName}
                      </div>
                      <p className="text-sm font-black uppercase tracking-wider text-white">{fixtureTeamB.name}</p>
                      <span className="text-[10px] text-[#94a3b8] uppercase tracking-widest">Away Team</span>
                    </div>
                  </div>

                  {/* Stadium Pitch Report & Conditions */}
                  <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto my-6 p-3.5 bg-[#05070a]/80 rounded-xl border border-[#1e293b] text-left">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[#64748b]">Surface Type</p>
                      <p className="text-xs font-bold text-white">True Bounce & Pace</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[#64748b]">Avg 1st Innings</p>
                      <p className="text-xs font-mono font-bold text-[#D4AF37]">188 Runs</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-bold text-[#64748b]">Dew Factor</p>
                      <p className="text-xs font-bold text-blue-400">Moderate (2nd Inn)</p>
                    </div>
                  </div>

                  {/* Match Launch Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    {isUserInNextMatch && (
                      <button
                        onClick={() => setActiveTab('PlayingXI')}
                        className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider border border-[#334155] transition cursor-pointer"
                      >
                        Edit Playing XI
                      </button>
                    )}

                    <button
                      onClick={() => prepareMatch(nextFixture.id)}
                      className="w-full sm:w-auto bg-[#D4AF37] text-black px-10 py-3.5 rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-[#D4AF37]/20 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-black" />
                      <span>{isUserInNextMatch ? 'Enter Matchday Arena' : 'Watch / Simulate Match'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0f172a] rounded-2xl border border-[#1e293b] p-12 text-center shadow-2xl">
                <Trophy className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight">League Fixtures Complete</h3>
                <p className="text-xs text-[#94a3b8] mt-1">Review the final standings or advance to post-season playoffs.</p>
              </div>
            )}
          </div>

          {/* Side Tactical Briefing (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0f172a] rounded-xl p-5 border border-[#1e293b] shadow-xl">
              <h3 className="text-xs uppercase tracking-widest font-black text-[#D4AF37] mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Tactical Analysis</span>
              </h3>
              <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                The matchday pitch rewards aggressive powerplay intent against new-ball pace. Ensure your designated death bowlers are locked into overs 17-20.
              </p>

              <div className="space-y-3 pt-3 border-t border-[#1e293b] text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b]">Toss Advantage:</span>
                  <span className="text-emerald-400 font-bold">Bowl First (62% Win)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b]">Key Matchup:</span>
                  <span className="text-white font-bold">Pace vs Wrist Spin</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748b]">Fielding Dimensions:</span>
                  <span className="text-white font-bold">68m Square / 75m Straight</span>
                </div>
              </div>
            </div>

            {/* Quick Link to Clutch Moments */}
            <div className="bg-gradient-to-r from-amber-500/10 to-[#0f172a] p-5 rounded-xl border border-[#D4AF37]/30 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Fast Gameplay Mode</span>
                </span>
                <span className="text-[10px] bg-[#D4AF37] text-black font-black px-2 py-0.5 rounded-full">New</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Clutch Match Moments</h4>
              <p className="text-xs text-[#94a3b8] mb-3">Jump straight into high-stakes final overs and chase targets in under 3 minutes.</p>
              <button
                onClick={() => setActiveSubTab('Moments')}
                className="text-xs font-bold uppercase tracking-wider text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <span>Play Moments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLUTCH MATCH MOMENTS */}
      {activeSubTab === 'Moments' && (
        <div className="space-y-4">
          <div className="bg-[#0f172a] p-5 rounded-xl border border-[#1e293b] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Clutch Match Moments</span>
              </h3>
              <p className="text-xs text-[#94a3b8]">Short, intense scenarios where one tactical decision decides the match.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MATCH_MOMENTS.map(moment => {
              const chasingTeam = moment.chasingTeamId === 'user' ? userTeam : gameState.teams[moment.chasingTeamId];
              const defendingTeam = moment.defendingTeamId === 'user' ? userTeam : gameState.teams[moment.defendingTeamId];

              return (
                <div 
                  key={moment.id}
                  className="bg-[#0f172a] hover:bg-[#131d33] transition-all rounded-xl p-5 border border-[#1e293b] hover:border-[#D4AF37]/50 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        moment.difficulty === 'Extreme' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        moment.difficulty === 'Hard' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {moment.difficulty} Difficulty
                      </span>
                      <span className="text-xs font-mono font-bold text-[#D4AF37]">
                        +{moment.xpReward} XP
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white">{moment.title}</h4>
                    <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-2">{moment.subtitle}</p>
                    <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">{moment.contextDesc}</p>

                    {/* Situation Stats */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-[#05070a] rounded-lg border border-[#1e293b] text-center mb-4 text-xs font-mono">
                      <div>
                        <p className="text-[9px] text-[#64748b] uppercase">Need</p>
                        <p className="font-bold text-[#D4AF37]">{moment.runsNeeded} Runs</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[#64748b] uppercase">From</p>
                        <p className="font-bold text-white">{moment.ballsRemaining} Balls</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-[#64748b] uppercase">Wickets</p>
                        <p className="font-bold text-emerald-400">{moment.wicketsInHand} In Hand</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlayMoment(moment)}
                    className="w-full py-2.5 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Play Scenario Now</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FULL SCHEDULE */}
      {activeSubTab === 'Schedule' && (
        <FixturesScheduleView />
      )}

      {/* TAB 4: EXHIBITION QUICK MATCH */}
      {activeSubTab === 'QuickMatch' && (
        <div className="max-w-2xl mx-auto bg-[#0f172a] rounded-2xl p-6 sm:p-8 border border-[#1e293b] shadow-2xl space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-black uppercase text-white tracking-tight">Exhibition Quick Match</h3>
            <p className="text-xs text-[#94a3b8] mt-1">Select any two franchises for an instant single-match tactical showdown.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Team A Picker */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-[#64748b] tracking-wider">Team A (Home)</label>
              <select
                value={selectedQuickTeamA}
                onChange={e => setSelectedQuickTeamA(e.target.value)}
                className="w-full bg-[#05070a] border border-[#334155] rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:border-[#D4AF37]"
              >
                {(Object.values(gameState.teams) as Team[]).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                ))}
              </select>
            </div>

            {/* Team B Picker */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-[#64748b] tracking-wider">Team B (Away)</label>
              <select
                value={selectedQuickTeamB}
                onChange={e => setSelectedQuickTeamB(e.target.value)}
                className="w-full bg-[#05070a] border border-[#334155] rounded-xl p-3 text-sm text-white font-bold focus:outline-none focus:border-[#D4AF37]"
              >
                {(Object.values(gameState.teams) as Team[]).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.shortName})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-[#05070a] rounded-xl border border-[#1e293b] flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-bold uppercase">Format Length:</span>
            <div className="flex gap-2">
              {[5, 10, 20].map(ov => (
                <button
                  key={ov}
                  onClick={() => setQuickOvers(ov)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                    quickOvers === ov ? 'bg-[#D4AF37] text-black' : 'bg-[#1e293b] text-white hover:bg-[#334155]'
                  }`}
                >
                  {ov} Overs
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartQuickMatch}
            className="w-full py-3.5 rounded-full bg-[#D4AF37] hover:bg-amber-400 text-black font-black uppercase tracking-widest text-sm transition active:scale-98 flex items-center justify-center gap-2 shadow-xl shadow-[#D4AF37]/20 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Launch Quick Match</span>
          </button>
        </div>
      )}

      {/* TAB 5: SCENARIO CHALLENGES */}
      {activeSubTab === 'Challenges' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCENARIO_CHALLENGES.map(challenge => (
              <div 
                key={challenge.id}
                className="bg-[#0f172a] rounded-xl p-5 border border-[#1e293b] hover:border-[#D4AF37]/50 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {challenge.difficulty}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#D4AF37]">+{challenge.rewardPoints} XP</span>
                  </div>
                  <h4 className="text-base font-black text-white mb-1">{challenge.title}</h4>
                  <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">{challenge.description}</p>
                </div>

                <button
                  onClick={() => prepareScenarioChallenge(challenge)}
                  className="w-full py-2.5 rounded-lg bg-[#1e293b] hover:bg-[#D4AF37] hover:text-black text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Challenge</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: RESULTS */}
      {activeSubTab === 'Results' && (
        <div className="space-y-3">
          {completedFixtures.length > 0 ? (
            completedFixtures.map(f => {
              const teamA = gameState.teams[f.teamAId];
              const teamB = gameState.teams[f.teamBId];
              const winner = f.matchResult?.winnerTeamId ? gameState.teams[f.matchResult.winnerTeamId] : null;

              return (
                <div key={f.id} className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-mono text-[#64748b] uppercase">M{f.matchNumber}</span>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{teamA?.shortName} vs {teamB?.shortName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#D4AF37]">{f.matchResult?.resultMarginText || 'Completed'}</p>
                    <p className="text-[10px] text-[#64748b]">{f.venue}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-[#0f172a] p-8 text-center rounded-xl border border-[#1e293b] text-[#94a3b8]">
              No completed fixtures yet. Play your first match to record results.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
