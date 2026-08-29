import React from 'react';
import { useGame } from '../context/GameContext';
import { SCENARIO_CHALLENGES } from '../data/challenges';
import { Flame, Trophy, Play, Zap, ShieldAlert } from 'lucide-react';

export const ChallengesView: React.FC = () => {
  const { prepareScenarioChallenge } = useGame();

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Header */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">IPL Clutch Scenario Challenges</h2>
            <p className="text-xs text-[#94a3b8]">Step onto the pitch in high-pressure historical moments and write your own legacy.</p>
          </div>
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SCENARIO_CHALLENGES.map(ch => {
          const diffColor = 
            ch.difficulty === 'Extreme' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            ch.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
            'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30';

          return (
            <div
              key={ch.id}
              className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] hover:border-[#D4AF37]/50 transition flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${diffColor}`}>
                    {ch.difficulty}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#D4AF37] flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" /> {ch.rewardPoints} Pts
                  </span>
                </div>

                <h3 className="text-base font-black text-white mt-3">{ch.title}</h3>
                <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{ch.description}</p>

                {/* Scenario details */}
                <div className="bg-[#05070a] p-3.5 rounded-xl border border-[#1e293b] mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Matchup:</span>
                    <span className="text-[#e2e8f0] font-bold uppercase">{ch.userTeamId} vs {ch.opponentTeamId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Objective:</span>
                    <span className="text-[#D4AF37] font-bold">{ch.keyTacticalObjective}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Equation:</span>
                    <span className="text-white font-mono font-bold">
                      {ch.targetRuns > 0 ? `Need ${ch.targetRuns - ch.initialInnings2Score.runs} runs off ${ch.ballsRemaining} balls` : 'Set a high 1st Innings total'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                id={`btn-play-scenario-${ch.id}`}
                onClick={() => prepareScenarioChallenge(ch)}
                className="w-full py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play Scenario Now</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
