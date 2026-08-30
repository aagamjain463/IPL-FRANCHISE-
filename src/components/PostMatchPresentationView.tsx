import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Trophy, Mic, Award, ArrowRight, ShieldCheck, Heart, 
  TrendingUp, CheckCircle2, ChevronRight, BarChart2, Star, Sparkles, Home
} from 'lucide-react';
import { Player } from '../types/cricket';

export const PostMatchPresentationView: React.FC = () => {
  const { gameState, answerPressQuestion, setActiveTab, setCurrentScreen } = useGame();
  const [activeTab, setActivePresentationTab] = useState<'Awards' | 'Press' | 'Standings'>('Awards');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);

  // Fail-safe default container if game state is not yet loaded
  if (!gameState) {
    return (
      <div className="p-8 text-center text-white">
        <p>Loading post-match presentation...</p>
        <button
          onClick={() => {
            setCurrentScreen('Dashboard');
            setActiveTab('Dashboard');
          }}
          className="mt-4 px-6 py-2 bg-[#D4AF37] text-black font-bold rounded-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const press = gameState.pressConferenceState;
  const currentQuestionIndex = press?.currentQuestionIndex || 0;
  const questionsList = press?.questions || [];
  const currentQuestion = questionsList[currentQuestionIndex] || {
    id: 'default_q',
    journalistName: 'Harsha Bhogle',
    mediaOutlet: 'Cricbuzz Live',
    questionText: 'Coach, how do you assess your team execution in the decisive overs under high pressure tonight?',
    options: [
      {
        text: 'Our tactical plans were executed with ruthless precision by the entire unit.',
        ownerTrustChange: 5,
        playerMoraleChange: 8
      },
      {
        text: 'We identified key areas for improvement and will continue to refine our match tempo.',
        ownerTrustChange: 3,
        playerMoraleChange: 4
      },
      {
        text: 'The conditions were demanding and the intent displayed was top-class.',
        ownerTrustChange: 4,
        playerMoraleChange: 6
      }
    ]
  };

  // Find most recent played fixture for presentation details
  const recentFixture = gameState.leagueSchedule.slice().reverse().find(f => f.isPlayed) || gameState.leagueSchedule[0];
  const teamA = recentFixture ? gameState.teams[recentFixture.teamAId] : null;
  const teamB = recentFixture ? gameState.teams[recentFixture.teamBId] : null;
  const winnerTeam = recentFixture?.winnerTeamId ? gameState.teams[recentFixture.winnerTeamId] : teamA;

  const allPlayersList = (Object.values(gameState.allPlayers) as Player[]);

  // Select Man of the Match
  const momCandidates = allPlayersList
    .filter(p => p.currentTeamId === recentFixture?.teamAId || p.currentTeamId === recentFixture?.teamBId)
    .sort((a, b) => (b.stats.runs + b.stats.wickets * 25) - (a.stats.runs + a.stats.wickets * 25));
  
  const potm: Player | undefined = momCandidates[0] || allPlayersList[0];

  const handleSelectAnswer = (idx: number) => {
    setSelectedOptionIndex(idx);
    setHasAnswered(true);
    if (answerPressQuestion) {
      answerPressQuestion(idx);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionIndex(null);
    setHasAnswered(false);
    if (currentQuestionIndex >= questionsList.length - 1) {
      setCurrentScreen('Dashboard');
      setActiveTab('Dashboard');
    }
  };

  const handleFinishPresentation = () => {
    setCurrentScreen('Dashboard');
    setActiveTab('Dashboard');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Broadcast Header Banner */}
      <div className="glass-panel fc-glow-gold p-6 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#D4AF37]/15 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-24 rounded-full bg-[#00FF87]/10 blur-[70px] pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-lg fc-icon-glow-simple">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/40 uppercase tracking-widest">
                OFFICIAL BROADCAST
              </span>
              <span className="text-xs text-[#64748b] font-mono">MATCH #{recentFixture?.matchNumber || 1}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight mt-1">
              POST-MATCH PRESENTATION & MEDIA
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {recentFixture?.venue || 'Wankhede Stadium'}, {recentFixture?.city || 'Mumbai'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-[#05070a] p-1.5 rounded-xl border border-[#1e293b] gap-1">
          <button
            onClick={() => setActivePresentationTab('Awards')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
              activeTab === 'Awards'
                ? 'bg-[#D4AF37] text-black shadow font-black'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Ceremony</span>
          </button>

          <button
            onClick={() => setActivePresentationTab('Press')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
              activeTab === 'Press'
                ? 'bg-[#D4AF37] text-black shadow font-black'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Media Room</span>
          </button>

          <button
            onClick={() => setActivePresentationTab('Standings')}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 ${
              activeTab === 'Standings'
                ? 'bg-[#D4AF37] text-black shadow font-black'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* 1. CEREMONY & AWARDS TAB */}
      {activeTab === 'Awards' && (
        <div className="space-y-6">
          {/* Match Result Card */}
          <div className="bg-gradient-to-tr from-[#0f172a] via-[#0b1329] to-[#0f172a] p-6 sm:p-8 rounded-2xl border border-[#1e293b] shadow-2xl text-center space-y-4">
            <span className="text-xs uppercase tracking-widest font-black text-[#D4AF37]">
              MATCH RESULT
            </span>

            <div className="flex items-center justify-center gap-6 sm:gap-12 py-2">
              <div className="text-center">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow border border-white/20 mx-auto mb-2"
                  style={{ backgroundColor: teamA?.primaryColor || '#1e3a8a', color: teamA?.secondaryColor || '#ffffff' }}
                >
                  {teamA?.shortName || 'T1'}
                </div>
                <p className="font-bold text-xs text-white">{teamA?.name || 'Team A'}</p>
              </div>

              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-white italic">
                  {recentFixture?.resultText || `${winnerTeam?.name || 'Match'} won the contest`}
                </p>
                {recentFixture?.scoreSummary && (
                  <p className="text-xs font-mono text-[#D4AF37] mt-1">
                    {recentFixture.scoreSummary}
                  </p>
                )}
              </div>

              <div className="text-center">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow border border-white/20 mx-auto mb-2"
                  style={{ backgroundColor: teamB?.primaryColor || '#ea580c', color: teamB?.secondaryColor || '#ffffff' }}
                >
                  {teamB?.shortName || 'T2'}
                </div>
                <p className="font-bold text-xs text-white">{teamB?.name || 'Team B'}</p>
              </div>
            </div>
          </div>

          {/* Player of the Match Spotlight */}
          {potm && (
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#D4AF37]/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#D4AF37]/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-[#D4AF37]/30 border-2 border-[#D4AF37] flex items-center justify-center text-3xl shadow-xl">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-[#D4AF37] text-black">
                      PLAYER OF THE MATCH
                    </span>
                    <span className="text-xs text-[#94a3b8]">{potm.role}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">{potm.name}</h3>
                  <p className="text-xs text-[#94a3b8]">
                    {gameState.teams[potm.currentTeamId || '']?.name || 'Franchise Star'} • Rating: <strong className="text-[#D4AF37]">{potm.overall} OVR</strong>
                  </p>
                </div>
              </div>

              {/* Award Stat Chips */}
              <div className="flex items-center gap-3">
                <div className="bg-[#05070a] px-4 py-3 rounded-xl border border-[#1e293b] text-center min-w-[90px]">
                  <span className="text-[10px] text-[#64748b] uppercase font-bold block">Runs Season</span>
                  <span className="text-lg font-black font-mono text-[#D4AF37]">{potm.stats?.runs || 0}</span>
                </div>
                <div className="bg-[#05070a] px-4 py-3 rounded-xl border border-[#1e293b] text-center min-w-[90px]">
                  <span className="text-[10px] text-[#64748b] uppercase font-bold block">Wickets Season</span>
                  <span className="text-lg font-black font-mono text-blue-400">{potm.stats?.wickets || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <button
              onClick={() => setActivePresentationTab('Press')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-[#D4AF37]" />
              <span>Attend Post-Match Press Conference</span>
            </button>

            <button
              id="btn-return-dashboard"
              onClick={handleFinishPresentation}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Franchise Hub</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. PRESS CONFERENCE / MEDIA ROOM TAB */}
      {activeTab === 'Press' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-black uppercase tracking-widest">
                  LIVE Q&A
                </span>
                <span className="text-xs text-[#94a3b8]">
                  Question {currentQuestionIndex + 1} of {questionsList.length || 1}
                </span>
              </div>
              <span className="text-xs font-mono text-[#64748b]">Post-Match Broadcast</span>
            </div>

            {/* Journalist Question */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                  {currentQuestion.journalistName} ({currentQuestion.mediaOutlet})
                </span>
              </div>
              <p className="text-base md:text-lg font-bold text-white leading-relaxed italic">
                "{currentQuestion.questionText}"
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOptionIndex === idx;

                return (
                  <button
                    key={idx}
                    id={`btn-press-opt-${idx}`}
                    disabled={hasAnswered}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full p-4 rounded-xl border text-left transition text-xs space-y-2 flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e293b] border-[#D4AF37] ring-2 ring-[#D4AF37]'
                        : hasAnswered
                        ? 'bg-[#05070a]/60 border-[#1e293b] opacity-60'
                        : 'bg-[#05070a] hover:bg-[#131d35] border-[#1e293b] text-[#e2e8f0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-white text-xs sm:text-sm leading-relaxed">{option.text}</p>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-4 text-[10px] pt-1 font-mono">
                      <span className={option.ownerTrustChange >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        Board Trust: {option.ownerTrustChange > 0 ? `+${option.ownerTrustChange}` : option.ownerTrustChange}%
                      </span>
                      <span className={option.playerMoraleChange >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        Squad Morale: {option.playerMoraleChange > 0 ? `+${option.playerMoraleChange}` : option.playerMoraleChange}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Post-Answer Feedback & Next Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#1e293b]">
              <div className="text-xs text-[#94a3b8]">
                {hasAnswered ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Response registered with the board and dressing room.
                  </span>
                ) : (
                  <span>Select the response that best matches your managerial philosophy.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {hasAnswered && currentQuestionIndex < questionsList.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}

                <button
                  id="btn-complete-press"
                  onClick={handleFinishPresentation}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Conclude & Return to Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. STANDINGS / TABLE TAB */}
      {activeTab === 'Standings' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div>
                <h3 className="font-bold text-white text-base uppercase tracking-tight">League Standings Update</h3>
                <p className="text-xs text-[#94a3b8]">Updated table after Match #{recentFixture?.matchNumber || 1}</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-bold">TOP 4 QUALIFY</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-[#1e293b] text-[#64748b] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Pos</th>
                    <th className="py-2.5 px-3">Team</th>
                    <th className="py-2.5 px-2 text-center">P</th>
                    <th className="py-2.5 px-2 text-center">W</th>
                    <th className="py-2.5 px-2 text-center">L</th>
                    <th className="py-2.5 px-2 text-center">NRR</th>
                    <th className="py-2.5 px-3 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {gameState.standings.map((row, idx) => {
                    const team = gameState.teams[row.teamId];
                    const isUserTeam = row.teamId === gameState.userTeamId;

                    return (
                      <tr 
                        key={row.teamId}
                        className={`border-b border-[#1e293b]/50 ${
                          isUserTeam ? 'bg-[#D4AF37]/10 font-bold' : idx < 4 ? 'bg-[#05070a]/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx < 4 ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#64748b]'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black"
                              style={{ backgroundColor: team?.primaryColor || '#333', color: team?.secondaryColor || '#fff' }}
                            >
                              {team?.shortName || row.teamId}
                            </div>
                            <span className={isUserTeam ? 'text-[#D4AF37]' : 'text-white'}>
                              {team?.name || row.teamId}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono">{row.played}</td>
                        <td className="py-3 px-2 text-center font-mono text-emerald-400">{row.won}</td>
                        <td className="py-3 px-2 text-center font-mono text-rose-400">{row.lost}</td>
                        <td className="py-3 px-2 text-center font-mono text-[#94a3b8]">
                          {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-white text-sm">
                          {row.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action */}
            <div className="flex justify-end pt-3">
              <button
                id="btn-standings-return"
                onClick={handleFinishPresentation}
                className="px-8 py-3 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Franchise Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
