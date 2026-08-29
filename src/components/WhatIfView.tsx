import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { runMonteCarloComparison } from '../engine/whatIfEngine';
import { WhatIfComparisonResult } from '../types/game';
import { Target, Zap, Play, BarChart3, TrendingUp, Sliders } from 'lucide-react';

export const WhatIfView: React.FC = () => {
  const { gameState } = useGame();
  const [iterations, setIterations] = useState<number>(50);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<WhatIfComparisonResult | null>(null);

  const [tacticA, setTacticA] = useState<'Aggressive' | 'Balanced' | 'Conservative' | 'Counter-Attack'>('Aggressive');
  const [tacticB, setTacticB] = useState<'Aggressive' | 'Balanced' | 'Conservative' | 'Counter-Attack'>('Conservative');

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const opponentTeam = (Object.values(gameState.teams) as import('../types/team').Team[]).find(t => t.id !== gameState.userTeamId) || userTeam;

  const handleRunSim = () => {
    if (!userTeam || !opponentTeam) return;
    setIsRunning(true);

    setTimeout(() => {
      const res = runMonteCarloComparison(
        userTeam,
        opponentTeam,
        gameState.allPlayers,
        {
          name: `Tactic A: ${tacticA}`,
          battingApproach: tacticA,
          bowlingPlan: 'Attack Stumps',
          fieldSetting: 'Balanced'
        },
        {
          name: `Tactic B: ${tacticB}`,
          battingApproach: tacticB,
          bowlingPlan: 'Wide Yorker Line',
          fieldSetting: 'Deep Death Defense'
        },
        iterations
      );

      setComparisonResult(res);
      setIsRunning(false);
    }, 100);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Header */}
      <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">What-If Monte Carlo Tactical Lab</h2>
            <p className="text-xs text-[#94a3b8]">Simulate 50-200 parallel matches to rigorously test tactical hypotheses and expected win rates.</p>
          </div>
        </div>

        <button
          id="btn-run-what-if"
          disabled={isRunning}
          onClick={handleRunSim}
          className="px-8 py-3.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isRunning ? <Zap className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-black" />}
          <span>{isRunning ? 'Simulating Matches...' : `Run ${iterations} Match Sims`}</span>
        </button>
      </div>

      {/* Setup Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario A */}
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-3 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#D4AF37]" /> Hypothesis Strategy A
          </h3>
          <div className="space-y-2 text-xs">
            <label className="text-[#94a3b8] block font-semibold uppercase tracking-wider text-[10px]">Batting Approach:</label>
            <select
              value={tacticA}
              onChange={e => setTacticA(e.target.value as any)}
              className="w-full bg-[#05070a] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="Aggressive">Aggressive (Maximum Boundaries)</option>
              <option value="Balanced">Balanced (Standard T20)</option>
              <option value="Conservative">Conservative (Preserve Wickets)</option>
              <option value="Counter-Attack">Counter-Attack (High Tempo)</option>
            </select>
          </div>
        </div>

        {/* Scenario B */}
        <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-3 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#94a3b8]" /> Hypothesis Strategy B
          </h3>
          <div className="space-y-2 text-xs">
            <label className="text-[#94a3b8] block font-semibold uppercase tracking-wider text-[10px]">Batting Approach:</label>
            <select
              value={tacticB}
              onChange={e => setTacticB(e.target.value as any)}
              className="w-full bg-[#05070a] border border-[#1e293b] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="Conservative">Conservative (Preserve Wickets)</option>
              <option value="Balanced">Balanced (Standard T20)</option>
              <option value="Aggressive">Aggressive (Maximum Boundaries)</option>
              <option value="Counter-Attack">Counter-Attack (High Tempo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight italic">Monte Carlo Simulation Results</h3>
              <p className="text-xs text-[#94a3b8]">Tested across {comparisonResult.iterations} full 20-over matches</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-[#64748b] block uppercase font-semibold">Recommended Blueprint</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {comparisonResult.analysisRecommendation}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan A Stats */}
            <div className="bg-[#05070a] p-5 rounded-xl border border-[#D4AF37]/30 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-[#D4AF37]">{comparisonResult.planA.name}</h4>
                <span className="font-mono font-black text-xl text-[#D4AF37]">
                  {comparisonResult.planA.winPercentage}% Win Rate
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Avg Runs Scored</span>
                  <span className="font-mono font-bold text-white text-sm">{comparisonResult.planA.avgScore}</span>
                </div>
                <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Avg Wickets Lost</span>
                  <span className="font-mono font-bold text-white text-sm">{comparisonResult.planA.avgWicketsLost}</span>
                </div>
              </div>
            </div>

            {/* Plan B Stats */}
            <div className="bg-[#05070a] p-5 rounded-xl border border-[#1e293b] space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-[#94a3b8]">{comparisonResult.planB.name}</h4>
                <span className="font-mono font-black text-xl text-white">
                  {comparisonResult.planB.winPercentage}% Win Rate
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Avg Runs Scored</span>
                  <span className="font-mono font-bold text-white text-sm">{comparisonResult.planB.avgScore}</span>
                </div>
                <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase font-semibold">Avg Wickets Lost</span>
                  <span className="font-mono font-bold text-white text-sm">{comparisonResult.planB.avgWicketsLost}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
