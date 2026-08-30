import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Mic, MessageSquare, Award, ArrowRight, ShieldCheck, Heart, AlertCircle } from 'lucide-react';

export const PressConferenceView: React.FC = () => {
  const { gameState, answerPressQuestion, setActiveTab, setCurrentScreen } = useGame();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);

  if (!gameState || !gameState.pressConferenceState) return null;

  const press = gameState.pressConferenceState;
  const currentQuestion = press.questions[press.currentQuestionIndex];

  const handleSelectAnswer = (idx: number) => {
    setSelectedOptionIndex(idx);
    setHasAnswered(true);
    answerPressQuestion(idx);
  };

  const handleNext = () => {
    setSelectedOptionIndex(null);
    setHasAnswered(false);
    if (press.currentQuestionIndex >= press.questions.length - 1) {
      setCurrentScreen('Dashboard');
      setActiveTab('Dashboard');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn py-6 font-sans">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Post-Match Press Conference</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30">
                MEDIA GRILLING
              </span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Question {press.currentQuestionIndex + 1} of {press.questions.length} • Address the national cricket media
            </p>
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion ? (
        <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest">
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
                  className={`w-full p-4 rounded-xl border text-left transition text-xs space-y-1.5 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#1e293b] border-[#D4AF37] ring-1 ring-[#D4AF37]'
                      : 'bg-[#05070a] hover:bg-[#131d35] border-[#1e293b] text-[#e2e8f0]'
                  }`}
                >
                  <p className="font-semibold text-white text-xs leading-relaxed">{option.text}</p>
                  <div className="flex items-center gap-4 text-[10px] pt-1 text-[#64748b] font-mono">
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

          {/* Next Button */}
          {hasAnswered && (
            <div className="flex justify-end pt-2">
              <button
                id="btn-next-press-question"
                onClick={handleNext}
                className="px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition hover:scale-105 active:scale-95"
              >
                <span>
                  {press.currentQuestionIndex < press.questions.length - 1 ? 'Next Question' : 'Conclude Press Conference'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#1e293b] text-center space-y-3 shadow-xl">
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Press Conference Concluded</h3>
          <button
            onClick={() => {
              setCurrentScreen('Dashboard');
              setActiveTab('Dashboard');
            }}
            className="px-8 py-3 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition shadow-lg"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
