import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Mic, Award, ArrowRight, ShieldCheck, Heart, Radio, Flame, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Player, BatterScorecard, BowlerScorecard } from '../types/cricket';

export const PostMatchPresentationView: React.FC = () => {
  const { gameState, answerPressQuestion, setActiveTab, setCurrentScreen } = useGame();
  const [activeTab, setActivePresentationTab] = useState<'Awards' | 'Press' | 'Standings'>('Awards');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);

  if (!gameState) return null;

  const press = gameState.pressConferenceState;
  const currentQuestion = press && press.questions ? press.questions[press.currentQuestionIndex || 0] : null;

  // Find most recent played fixture for presentation details
  const recentFixture = gameState.leagueSchedule.slice().reverse().find(f => f.isPlayed) || gameState.leagueSchedule[0];
  const winnerTeam = recentFixture?.matchResult?.winnerTeamId ? gameState.teams[recentFixture.matchResult.winnerTeamId] : null;
  const teamA = recentFixture ? gameState.teams[recentFixture.teamAId] : null;
  const teamB = recentFixture ? gameState.teams[recentFixture.teamBId] : null;

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

  const handleNextPressQuestion = () => {
    setSelectedOptionIndex(null);
    setHasAnswered(false);
    if (press && press.currentQuestionIndex >= press.questions.length - 1) {
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
      <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-inner">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-bold border border-[#D4AF37]/40 uppercase tracking-widest">
                OFFICIAL CEREMONY
              </span>
              <span className="text-xs text-[#64748b] font-mono">MATCH #{recentFixture?.matchNumber || 1}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight mt-1">
              POST-MATCH PRESENTATION
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {recentFixture?.venue}, {recentFixture?.city}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-[#05070a] p-1.5 rounded-xl border border-[#1e293b]">
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
        </div>
      </div>

      {activeTab === 'Awards' && (
        <div className="space-y-6">
          {/* Match Result Hero Card */}
          <div className="bg-gradient-to-tr from-[#0f172a] via-[#0b1329] to-[#0f172a] p-6 sm:p-8 rounded-2xl border border-[#1e293b] shadow-2xl text-center space-y-4">
            <span className="text-xs uppercase tracking-widest font-black text-[#D4AF37]">
              MATCH RESULT
            </span>

            <div className="flex items-center justify-center gap-6 sm:gap-12 py-2">
              <div className="text-center">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-black text-xl shadow border border-white/20 mx-auto mb-2"
                  style={{ backgroundColor: teamA?.primaryColor, color: teamA?.secondaryColor }}
                >
                  {teamA?.shortName}
                </div>
                <p className="font-bold text-xs text-white">{teamA?.name}</p>
              </div>

              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-white italic">
                  {recentFixture?.resultText || 'Match Concluded'}
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
                  style={{ backgroundColor: teamB?.primaryColor, color: teamB?.secondaryColor }}
                >
                  {teamB?.shortName}
                </div>
                <p className="font-bold text-xs text-white">{teamB?.name}</p>
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
                    {gameState.teams[potm.currentTeamId || '']?.name || 'Franchise Star'} • Overall Rating: <strong className="text-[#D4AF37]">{potm.overall} OVR</strong>
                  </p>
                </div>
              </div>

              {/* Award Stat Chips */}
              <div className="flex items-center gap-3">
                <div className="bg-[#05070a] px-4 py-3 rounded-xl border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#64748b] uppercase font-bold block">Runs Season</span>
                  <span className="text-lg font-black font-mono text-[#D4AF37]">{potm.stats.runs}</span>
                </div>
                <div className="bg-[#05070a] px-4 py-3 rounded-xl border border-[#1e293b] text-center">
                  <span className="text-[10px] text-[#64748b] uppercase font-bold block">Wickets Season</span>
                  <span className="text-lg font-black font-mono text-blue-400">{potm.stats.wickets}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <button
              onClick={() => setActivePresentationTab('Press')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4 text-[#D4AF37]" />
              <span>Attend Post-Match Press Conference</span>
            </button>

            <button
              id="btn-return-dashboard"
              onClick={handleFinishPresentation}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <span>Return to Franchise Hub</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'Press' && (
        <div className="space-y-6">
          {/* Question Box */}
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-xl space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest">
                  {currentQuestion?.journalistName || 'Harsha Bhogle'} ({currentQuestion?.mediaOutlet || 'Cricbuzz Live'})
                </span>
              </div>
              <p className="text-base md:text-lg font-bold text-white leading-relaxed italic">
                "{currentQuestion?.questionText || 'Coach, how do you assess your team execution in the decisive overs under high pressure tonight?'}"
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {(currentQuestion?.options || [
                {
                  text: 'Our tactical plans were executed with ruthless precision by the bowling unit.',
                  ownerTrustChange: 5,
                  playerMoraleChange: 8
                },
                {
                  text: 'We identified key areas for improvement and will refine our middle-over tempo.',
                  ownerTrustChange: 2,
                  playerMoraleChange: 3
                },
                {
                  text: 'The conditions favored bold shot-making and our intent was top-class.',
                  ownerTrustChange: 3,
                  playerMoraleChange: 6
                }
              ]).map((option, idx) => {
                const isSelected = selectedOptionIndex === idx;

                return (
                  <button
                    key={idx}
                    id={`btn-press-opt-${idx}`}
                    disabled={hasAnswered}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full p-4 rounded-xl border text-left transition text-xs space-y-1.5 flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37]'
                        : 'bg-[#05070a] hover:bg-[#131d35] border-[#1e293b] text-[#e2e8f0]'
                    }`}
                  >
                    <p className="font-semibold text-white text-xs leading-relaxed">{option.text}</p>
                    <div className="flex items-center gap-4 text-[10px] pt-1 font-mono">
                      <span className={option.ownerTrustChange >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        Board Trust: {option.ownerTrustChange > 0 ? `+${option.ownerTrustChange}` : option.ownerTrustChange}%
                      </span>
                      <span className={option.playerMoraleChange >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        Morale: {option.playerMoraleChange > 0 ? `+${option.playerMoraleChange}` : option.playerMoraleChange}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action */}
            <div className="flex justify-end pt-2">
              <button
                id="btn-complete-press"
                onClick={handleFinishPresentation}
                className="px-6 py-3 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Conclude Press & Proceed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
