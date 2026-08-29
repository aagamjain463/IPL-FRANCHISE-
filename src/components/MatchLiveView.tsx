import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  BatterScorecard, 
  BowlerScorecard, 
  ShotZone, 
  BatterApproach, 
  ShotPreference, 
  RunningRisk, 
  BowlingPlan, 
  FieldSetting, 
  PaceVariation 
} from '../types/cricket';
import { 
  Zap, Play, FastForward, SkipForward, Shield, 
  Activity, Award, Radio, Trophy, Sliders, CheckCircle2, Home,
  Flame, Target, Wind, Compass, ShieldAlert, Sparkles, ChevronRight, Gauge
} from 'lucide-react';

export const MatchLiveView: React.FC = () => {
  const { 
    gameState, 
    bowlBall, 
    simOver, 
    simInnings, 
    simFullMatch, 
    updateMatchTactics, 
    completeCurrentMatch,
    setSelectedPlayerForModal,
    activeChallenge
  } = useGame();

  const [activeScorecardTab, setActiveScorecardTab] = useState<'LiveFeed' | 'Scorecard1' | 'Scorecard2' | 'Tactics'>('LiveFeed');
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Auto-play interval
  useEffect(() => {
    if (!isAutoPlaying || !gameState?.currentMatchState || gameState.currentMatchState.isMatchCompleted) {
      return;
    }
    const timer = setInterval(() => {
      bowlBall();
    }, 700);
    return () => clearInterval(timer);
  }, [isAutoPlaying, gameState?.currentMatchState?.isMatchCompleted]);

  if (!gameState || !gameState.currentMatchState) {
    return (
      <div className="p-8 text-center bg-zinc-900 rounded-2xl border border-zinc-800">
        <h3 className="text-base font-bold text-white">No Active Match in Progress</h3>
      </div>
    );
  }

  const match = gameState.currentMatchState;
  const currentInnings = match.currentInningsIndex === 1 ? match.innings1 : match.innings2;
  const battingTeam = gameState.teams[currentInnings.battingTeamId];
  const bowlingTeam = gameState.teams[currentInnings.bowlingTeamId];

  const striker = gameState.allPlayers[currentInnings.currentStrikerId];
  const nonStriker = gameState.allPlayers[currentInnings.currentNonStrikerId];
  const activeBowler = gameState.allPlayers[currentInnings.currentBowlerId];

  const strikerCard: BatterScorecard | undefined = striker ? currentInnings.batterScorecards[striker.id] : undefined;
  const nonStrikerCard: BatterScorecard | undefined = nonStriker ? currentInnings.batterScorecards[nonStriker.id] : undefined;
  const bowlerCard: BowlerScorecard | undefined = activeBowler ? currentInnings.bowlerScorecards[activeBowler.id] : undefined;

  const currentOverFormatted = `${currentInnings.oversCompleted}.${currentInnings.ballsInCurrentOver}`;
  const isChasing = match.currentInningsIndex === 2;
  const target = currentInnings.target || 0;
  const runsNeeded = isChasing ? Math.max(0, target - currentInnings.totalRuns) : 0;
  const ballsRemaining = Math.max(0, (20 - currentInnings.oversCompleted) * 6 - currentInnings.ballsInCurrentOver);
  const currentRR = currentInnings.oversCompleted > 0 ? (currentInnings.totalRuns / (currentInnings.oversCompleted + currentInnings.ballsInCurrentOver / 6)).toFixed(2) : '0.00';
  const reqRR = ballsRemaining > 0 && isChasing ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';

  // Win Probability calculation
  let teamAWinProb = 50;
  if (match.isMatchCompleted) {
    teamAWinProb = match.winnerTeamId === match.teamAId ? 100 : 0;
  } else if (isChasing) {
    const isTeamABatting = currentInnings.battingTeamId === match.teamAId;
    const diff = runsNeeded - (ballsRemaining * 1.5);
    const prob = Math.max(5, Math.min(95, 50 - (diff * 2.5)));
    teamAWinProb = isTeamABatting ? Math.round(prob) : Math.round(100 - prob);
  }

  const latestBall = currentInnings.recentBalls[0];
  
  // Tactical Context
  const isUserMatch = match.teamAId === gameState.userTeamId || match.teamBId === gameState.userTeamId;
  const isUserTeamA = match.teamAId === gameState.userTeamId;
  const userTeamId = gameState.userTeamId;
  const userTactics = isUserTeamA ? match.tactics.teamATactics : match.tactics.teamBTactics;
  const oppTactics = isUserTeamA ? match.tactics.teamBTactics : match.tactics.teamATactics;
  const isUserBatting = isUserMatch && currentInnings.battingTeamId === gameState.userTeamId;
  const isUserBowling = isUserMatch && currentInnings.bowlingTeamId === gameState.userTeamId;

  const handleUpdateUserTactics = (patch: Partial<typeof userTactics>) => {
    if (!isUserMatch) return;
    updateMatchTactics(userTeamId, patch);
  };

  const battingApproaches: { id: BatterApproach; label: string; desc: string; color: string }[] = [
    { id: 'Anchor / Conserve', label: 'Anchor', desc: 'Preserve wickets, build base', color: 'text-sky-400' },
    { id: 'Rotate Strike', label: 'Rotate Strike', desc: 'Singles/twos, low dot %', color: 'text-emerald-400' },
    { id: 'Balanced', label: 'Balanced', desc: 'Natural tempo', color: 'text-white' },
    { id: 'Aggressive', label: 'Aggressive', desc: 'Boundary hunting', color: 'text-amber-400' },
    { id: 'Counter-Attack', label: 'Counter-Attack', desc: 'Exploit field gaps', color: 'text-orange-400' },
    { id: 'Maximum Attack', label: 'Carnage 6s', desc: 'Maximum boundary risk', color: 'text-red-400' }
  ];

  const shotPreferences: { id: ShotPreference; label: string }[] = [
    { id: 'All-Ground (Balanced)', label: '360° Balanced' },
    { id: 'Target Leg-Side (Pulls/Sweeps)', label: 'Target Leg (Pulls/Sweeps)' },
    { id: 'Target Off-Side (Covers/Point)', label: 'Target Off (Covers/Point)' },
    { id: 'Straight Down V', label: 'Straight Down the V' },
    { id: 'Ramps & 360 Innovation', label: 'Ramps & Innovations' }
  ];

  const runningRisks: { id: RunningRisk; label: string }[] = [
    { id: 'Safe', label: 'Safe Runs Only' },
    { id: 'Standard', label: 'Standard Running' },
    { id: 'Aggressive Twos', label: 'Push Aggressive 2s' }
  ];

  const bowlingPlans: { id: BowlingPlan; label: string; desc: string }[] = [
    { id: 'Pinpoint Yorkers', label: 'Pinpoint Yorkers', desc: 'Target base of stumps (death over economy)' },
    { id: 'Test Match Hard Length', label: 'Test Hard Length', desc: 'Hit the deck 6-8m on off-stump' },
    { id: 'Attack Stumps', label: 'Attack Stumps', desc: 'Wicket hunting on direct lines' },
    { id: 'Short-Pitch & Bouncers', label: 'Bouncer Barrage', desc: 'Short pitched heat & bodyline' },
    { id: 'Slower Ball Variations', label: 'Slower Ball Mix', desc: 'Knuckleballs, off-cutters & back of hand' },
    { id: 'Wide Outside Off Channel', label: 'Wide Yorker Channel', desc: 'Stay out of batter arc' },
    { id: 'Contain Runs', label: 'Containment Line', desc: 'Choke boundaries & build dots' }
  ];

  const fieldSettings: { id: FieldSetting; label: string }[] = [
    { id: 'Balanced', label: 'Balanced 4-5 Field' },
    { id: 'Aggressive Cordon (Slips/Ring)', label: 'Aggressive Cordon (Slips/Close)' },
    { id: 'Deep Boundary Lockdown (5 Back)', label: 'Deep Boundary Lockdown (5 Back)' },
    { id: 'Inner Ring Choke (Cut-off 1s)', label: 'Inner Ring Choke (Cut-off 1s)' },
    { id: 'Leg-Side Trap', label: 'Leg-Side Trap' },
    { id: 'Off-Side Trap', label: 'Off-Side Ring Trap' }
  ];

  const paceVariations: { id: PaceVariation; label: string }[] = [
    { id: 'Express Pace', label: 'Express Pace' },
    { id: 'Mix Pace & Cutters', label: 'Mix Pace & Cutters' },
    { id: 'Heavy Flight & Drift', label: 'Heavy Flight & Drift (Spin)' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Stadium Broadcast Scoreboard Header */}
      <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Radio className="w-32 h-32 text-[#D4AF37]" />
        </div>

        {/* Top Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1e293b] text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE BROADCAST
            </span>
            <span className="text-[#94a3b8] font-medium">
              {match.venue}, {match.city} • Pitch: <strong className="text-[#D4AF37]">{match.pitch.type}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <span className="text-[#94a3b8]">CRR: <strong className="text-white">{currentRR}</strong></span>
            {isChasing && (
              <span className="text-[#94a3b8]">RRR: <strong className="text-[#D4AF37]">{reqRR}</strong></span>
            )}
          </div>
        </div>

        {/* Center Live Score Display */}
        <div className="py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow border border-white/20"
                style={{ backgroundColor: battingTeam?.primaryColor, color: battingTeam?.secondaryColor }}
              >
                {battingTeam?.shortName}
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#e2e8f0]">{battingTeam?.name}</h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-black font-mono text-white tracking-tight">
                    {currentInnings.totalRuns}/{currentInnings.wickets}
                  </span>
                  <span className="text-xl font-bold font-mono text-[#D4AF37]">
                    ({currentOverFormatted} / 20 ov)
                  </span>
                </div>
              </div>
            </div>

            {isChasing ? (
              <p className="text-sm font-semibold text-emerald-400 mt-2">
                Need <strong className="font-mono text-white">{runsNeeded}</strong> runs from <strong className="font-mono text-white">{ballsRemaining}</strong> balls (Target: {target})
              </p>
            ) : (
              <p className="text-xs text-[#94a3b8] mt-1">
                1st Innings • Projected Score: <strong className="text-white font-mono">{Math.round(Number(currentRR) * 20)}</strong>
              </p>
            )}
          </div>

          {/* Opponent & Match Status */}
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs text-[#94a3b8]">Bowling: <strong className="text-white">{bowlingTeam?.name}</strong></span>
            {match.innings1.isCompleted && (
              <span className="text-xs font-mono text-[#94a3b8] mt-0.5">
                1st Innings: {gameState.teams[match.innings1.battingTeamId]?.shortName} {match.innings1.totalRuns}/{match.innings1.wickets} (20.0 ov)
              </span>
            )}
            {match.isMatchCompleted && (
              <div className="mt-2 px-4 py-2 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs uppercase tracking-wider">
                🏆 {match.resultMarginText}
              </div>
            )}
          </div>
        </div>

        {/* Win Probability Bar */}
        <div className="pt-2 border-t border-[#1e293b]">
          <div className="flex justify-between text-[11px] font-bold mb-1">
            <span className="text-[#D4AF37]">{gameState.teams[match.teamAId]?.shortName} ({teamAWinProb}%)</span>
            <span className="text-[#64748b] uppercase tracking-widest text-[10px]">Win Probability</span>
            <span className="text-blue-400">{gameState.teams[match.teamBId]?.shortName} ({100 - teamAWinProb}%)</span>
          </div>
          <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden flex">
            <div className="bg-[#D4AF37] h-2 transition-all duration-300" style={{ width: `${teamAWinProb}%` }} />
          </div>
        </div>
      </div>

      {/* Main Split: Pitch 2D + Live Batsmen / Bowler Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: In-crease Players & Pitch Visual */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batters & Active Bowler Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Striker */}
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#D4AF37]/40 space-y-2 shadow-lg relative">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                  🏏 Striker (*)
                </span>
                <span className="text-[10px] text-[#64748b]">SR: {strikerCard?.strikeRate || 0}</span>
              </div>
              <h4 
                onClick={() => striker && setSelectedPlayerForModal(striker)}
                className="font-bold text-sm text-white cursor-pointer hover:text-[#D4AF37] transition truncate"
              >
                {striker?.name || 'Striker'}
              </h4>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-[#D4AF37]">{strikerCard?.runs || 0}</span>
                <span className="text-xs text-[#94a3b8]">({strikerCard?.balls || 0}b • {strikerCard?.fours || 0}x4 • {strikerCard?.sixes || 0}x6)</span>
              </div>
              {isUserBatting && (
                <div className="pt-2 border-t border-[#1e293b]/80 flex items-center justify-between text-[10px]">
                  <span className="text-[#64748b] uppercase font-bold">Intent:</span>
                  <span className="font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                    {userTactics.batterApproach || 'Balanced'}
                  </span>
                </div>
              )}
            </div>

            {/* Non-Striker */}
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94a3b8] font-medium">Non-Striker</span>
                <span className="text-[10px] text-[#64748b]">SR: {nonStrikerCard?.strikeRate || 0}</span>
              </div>
              <h4 
                onClick={() => nonStriker && setSelectedPlayerForModal(nonStriker)}
                className="font-bold text-sm text-white cursor-pointer hover:text-[#D4AF37] transition truncate"
              >
                {nonStriker?.name || 'Non-Striker'}
              </h4>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-[#e2e8f0]">{nonStrikerCard?.runs || 0}</span>
                <span className="text-xs text-[#94a3b8]">({nonStrikerCard?.balls || 0}b • {nonStrikerCard?.fours || 0}x4 • {nonStrikerCard?.sixes || 0}x6)</span>
              </div>
            </div>

            {/* Bowler */}
            <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400 font-bold">🎯 Bowler</span>
                <span className="text-[10px] text-[#64748b]">Econ: {bowlerCard?.economy || 0}</span>
              </div>
              <h4 
                onClick={() => activeBowler && setSelectedPlayerForModal(activeBowler)}
                className="font-bold text-sm text-white cursor-pointer hover:text-blue-400 transition truncate"
              >
                {activeBowler?.name || 'Bowler'}
              </h4>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black text-blue-400">{bowlerCard?.wickets || 0} - {bowlerCard?.runsConceded || 0}</span>
                <span className="text-xs text-[#94a3b8]">({bowlerCard?.overs || 0} ov • {bowlerCard?.dots || 0} dots)</span>
              </div>
              {isUserBowling && (
                <div className="pt-2 border-t border-[#1e293b]/80 flex items-center justify-between text-[10px]">
                  <span className="text-[#64748b] uppercase font-bold">Plan:</span>
                  <span className="font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 truncate max-w-[120px]">
                    {userTactics.bowlingPlan || 'Attack Stumps'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Real-Time Tactical Controller Bar */}
          <div className="bg-[#0b1329] p-3.5 rounded-2xl border border-[#1e293b] space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                {isUserBatting ? 'Active Batting Command (User)' : isUserBowling ? 'Active Bowling Command (User)' : 'Match Tactical Console'}
              </span>
              <button
                onClick={() => setActiveScorecardTab('Tactics')}
                className="text-[10px] font-bold text-[#94a3b8] hover:text-white uppercase flex items-center gap-1"
              >
                <span>Full Tactics Deck</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {isUserBatting && (
              <div className="flex flex-wrap items-center gap-1.5">
                {battingApproaches.map(app => {
                  const isCurrent = userTactics.batterApproach === app.id;
                  return (
                    <button
                      key={app.id}
                      id={`btn-intent-${app.id.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleUpdateUserTactics({ batterApproach: app.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#D4AF37] text-black shadow-md font-black'
                          : 'bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                      }`}
                    >
                      <span>{app.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isUserBowling && (
              <div className="flex flex-wrap items-center gap-1.5">
                {bowlingPlans.slice(0, 5).map(plan => {
                  const isCurrent = userTactics.bowlingPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      id={`btn-plan-${plan.id.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleUpdateUserTactics({ bowlingPlan: plan.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-500 text-white shadow-md font-black border border-blue-400'
                          : 'bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                      }`}
                    >
                      <span>{plan.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2D Stadium Wagon Wheel & Shot Radar */}
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-xl">
            <div className="space-y-2 max-w-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Fielding & Shot Radar</span>
              <h4 className="text-base font-bold text-white">
                {latestBall ? `Last Ball: ${latestBall.runsScored} runs (${latestBall.shotZone})` : 'Awaiting Delivery'}
              </h4>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                {latestBall?.commentaryText || 'Match underway in full stadium glory.'}
              </p>
            </div>

            {/* Stadium Pitch Canvas Representation */}
            <div className="relative w-48 h-48 rounded-full border-2 border-[#1e293b] bg-[#05070a] flex items-center justify-center shadow-inner">
              {/* Inner 30 yard circle */}
              <div className="w-28 h-28 rounded-full border border-dashed border-[#1e293b] flex items-center justify-center">
                {/* 22 yard strip */}
                <div className="w-5 h-12 bg-[#D4AF37]/20 rounded border border-[#D4AF37]/40 flex flex-col justify-between items-center py-0.5">
                  <div className="w-2 h-0.5 bg-white" />
                  <div className="w-2 h-0.5 bg-white" />
                </div>
              </div>

              {/* Shot Zone Indicator Dot */}
              {latestBall && (
                <div className="absolute top-4 right-8 w-3.5 h-3.5 rounded-full bg-[#D4AF37] animate-ping" />
              )}
            </div>
          </div>

          {/* Match Controls / Buttons */}
          <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b] space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Simulation Controls</span>
              {match.isMatchCompleted ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    id="btn-finish-match"
                    onClick={() => completeCurrentMatch(false)}
                    className="px-6 py-3 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4 text-black" />
                    <span>Post-Match Media & Ceremony</span>
                  </button>

                  <button
                    id="btn-skip-to-dashboard"
                    onClick={() => completeCurrentMatch(true)}
                    className="px-5 py-3 rounded-full bg-[#1e293b] hover:bg-[#334155] text-[#e2e8f0] font-bold text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-[#94a3b8]" />
                    <span>Skip to Franchise Hub</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-bowl-ball"
                    onClick={bowlBall}
                    className="px-5 py-2.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-md transition hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>Bowl Ball</span>
                  </button>

                  <button
                    id="btn-sim-over"
                    onClick={simOver}
                    className="px-4 py-2.5 rounded-full bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] font-bold text-xs uppercase tracking-wider transition border border-[#1e293b] flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Sim Over</span>
                  </button>

                  <button
                    id="btn-sim-innings"
                    onClick={simInnings}
                    className="px-4 py-2.5 rounded-full bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] font-bold text-xs uppercase tracking-wider transition border border-[#1e293b] flex items-center gap-1 cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Sim Innings</span>
                  </button>

                  <button
                    id="btn-sim-match"
                    onClick={simFullMatch}
                    className="px-4 py-2.5 rounded-full bg-[#05070a] hover:bg-[#1e293b] text-[#e2e8f0] font-bold text-xs uppercase tracking-wider transition border border-[#1e293b] flex items-center gap-1 cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Sim Match</span>
                  </button>

                  <button
                    id="btn-toggle-autoplay"
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition border flex items-center gap-1 cursor-pointer ${
                      isAutoPlaying
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                        : 'bg-[#05070a] text-[#94a3b8] border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {isAutoPlaying ? 'Pause Auto' : 'Auto Play'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Commentary Stream & Live Tactical Settings */}
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-[#05070a] p-1 rounded-xl border border-[#1e293b]">
            <button
              onClick={() => setActiveScorecardTab('LiveFeed')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeScorecardTab === 'LiveFeed' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Commentary
            </button>
            <button
              onClick={() => setActiveScorecardTab('Tactics')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeScorecardTab === 'Tactics' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Tactics
            </button>
            <button
              onClick={() => setActiveScorecardTab('Scorecard1')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeScorecardTab === 'Scorecard1' ? 'bg-[#D4AF37] text-black font-black' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              Card
            </button>
          </div>

          {/* Commentary Feed */}
          {activeScorecardTab === 'LiveFeed' && (
            <div className="bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b] space-y-3 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#D4AF37]" /> Live Ball-by-Ball Feed
              </h4>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 text-xs">
                {currentInnings.recentBalls.map((b, i) => (
                  <div key={i} className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#94a3b8] font-bold">{b.overNumber}.{b.ballInOver}</span>
                      <span className={`px-2 py-0.5 rounded font-black font-mono ${
                        b.eventType === '6' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        b.eventType === '4' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        b.eventType === 'WICKET' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                        b.eventType === '0' ? 'bg-[#1e293b] text-[#94a3b8]' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {b.eventType === 'WICKET' ? 'WICKET' : `${b.runsScored} RUNS`}
                      </span>
                    </div>
                    <p className="text-[#e2e8f0] text-[11px] leading-relaxed">{b.commentaryText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tactical In-Match Adjustments Deck */}
          {activeScorecardTab === 'Tactics' && (
            <div className="bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b] space-y-5 text-xs shadow-xl max-h-[580px] overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                <h4 className="font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#D4AF37]" /> Tactical Blueprint
                </h4>
                <span className="text-[10px] text-[#94a3b8] font-mono">
                  {isUserMatch ? `${gameState.teams[userTeamId]?.shortName} Manager` : 'AI Spectator Mode'}
                </span>
              </div>

              {!isUserMatch ? (
                /* SPECTATOR AI VS AI DISPLAY */
                <div className="space-y-4">
                  <div className="p-4 bg-[#05070a] rounded-xl border border-[#1e293b] text-center space-y-2">
                    <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      SPECTATOR MATCH
                    </span>
                    <h5 className="font-bold text-white text-xs">AI vs AI Tactical Simulation</h5>
                    <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                      Your franchise is not participating in this fixture. Both teams are autonomously managed by their respective AI head coaches.
                    </p>
                  </div>

                  {/* Team A AI Profile */}
                  <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px]">{gameState.teams[match.teamAId]?.name}</span>
                      <span className="text-[9px] text-[#D4AF37] font-mono font-bold">AI STRATEGY</span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] space-y-1">
                      <p>Batting Approach: <strong className="text-white">{match.tactics.teamATactics.batterApproach}</strong></p>
                      <p>Bowling Plan: <strong className="text-white">{match.tactics.teamATactics.bowlingPlan}</strong></p>
                    </div>
                  </div>

                  {/* Team B AI Profile */}
                  <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px]">{gameState.teams[match.teamBId]?.name}</span>
                      <span className="text-[9px] text-blue-400 font-mono font-bold">AI STRATEGY</span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] space-y-1">
                      <p>Batting Approach: <strong className="text-white">{match.tactics.teamBTactics.batterApproach}</strong></p>
                      <p>Bowling Plan: <strong className="text-white">{match.tactics.teamBTactics.bowlingPlan}</strong></p>
                    </div>
                  </div>
                </div>
              ) : (
                /* USER FRANCHISE CONTROLS */
                <>
                  {/* BATTING CONTROLS SECTION */}
                  <div className={`space-y-3.5 p-3 rounded-xl border ${
                    isUserBatting
                      ? 'bg-[#05070a] border-[#D4AF37]/50 ring-1 ring-[#D4AF37]/30'
                      : 'bg-[#05070a]/60 border-[#1e293b] opacity-75'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h5 className="font-black text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" /> Batting Strategy
                      </h5>
                      {isUserBatting ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 animate-pulse">
                          ACTIVE ON CREASE
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b] font-mono">
                          Applies In Batting Innings
                        </span>
                      )}
                    </div>

                    {/* Batting Intent */}
                    <div className="space-y-1.5">
                      <label className="text-[#94a3b8] block font-semibold text-[11px]">Batting Approach:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {battingApproaches.map(mode => (
                          <button
                            key={mode.id}
                            onClick={() => handleUpdateUserTactics({ batterApproach: mode.id })}
                            className={`p-2 rounded-lg border text-[11px] font-bold text-left transition flex flex-col justify-between cursor-pointer ${
                              userTactics.batterApproach === mode.id
                                ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black'
                                : 'bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#1e293b] hover:text-white'
                            }`}
                          >
                            <span className="font-bold">{mode.label}</span>
                            <span className={`text-[9px] ${userTactics.batterApproach === mode.id ? 'text-black/80' : 'text-[#64748b]'}`}>{mode.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shot Zone Target Preference */}
                    <div className="space-y-1.5">
                      <label className="text-[#94a3b8] block font-semibold text-[11px]">Shot Targeting Zone:</label>
                      <div className="grid grid-cols-1 gap-1">
                        {shotPreferences.map(pref => (
                          <button
                            key={pref.id}
                            onClick={() => handleUpdateUserTactics({ shotPreference: pref.id })}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold text-left transition flex items-center justify-between cursor-pointer ${
                              (userTactics.shotPreference || 'All-Ground') === pref.id
                                ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/60'
                                : 'bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#1e293b]'
                            }`}
                          >
                            <span>{pref.label}</span>
                            {(userTactics.shotPreference || 'All-Ground') === pref.id && (
                              <CheckCircle2 className="w-3 h-3 text-[#D4AF37]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Running Risk */}
                    <div className="space-y-1.5">
                      <label className="text-[#94a3b8] block font-semibold text-[11px]">Running Between Wickets:</label>
                      <div className="grid grid-cols-3 gap-1">
                        {runningRisks.map(r => (
                          <button
                            key={r.id}
                            onClick={() => handleUpdateUserTactics({ runningRisk: r.id })}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition cursor-pointer ${
                              (userTactics.runningRisk || 'Balanced') === r.id
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                                : 'bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#1e293b]'
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* BOWLING CONTROLS SECTION */}
                  <div className={`space-y-3.5 p-3 rounded-xl border ${
                    isUserBowling
                      ? 'bg-[#05070a] border-blue-500/50 ring-1 ring-blue-500/30'
                      : 'bg-[#05070a]/60 border-[#1e293b] opacity-75'
                  }`}>
                    <div className="flex items-center justify-between">
                      <h5 className="font-black text-white uppercase text-[11px] flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-400" /> Bowling Plan & Field Settings
                      </h5>
                      {isUserBowling ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30 animate-pulse">
                          ACTIVE IN FIELD
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b] font-mono">
                          Applies In Bowling Innings
                        </span>
                      )}
                    </div>

                    {/* Bowling Plan */}
                    <div className="space-y-1.5">
                      <label className="text-[#94a3b8] block font-semibold text-[11px]">Delivery & Length Target:</label>
                      <div className="grid grid-cols-1 gap-1">
                        {bowlingPlans.map(plan => (
                          <button
                            key={plan.id}
                            onClick={() => handleUpdateUserTactics({ bowlingPlan: plan.id })}
                            className={`px-2.5 py-2 rounded-lg border text-[11px] font-bold text-left transition flex items-center justify-between cursor-pointer ${
                              (userTactics.bowlingPlan || 'Attack Stumps') === plan.id
                                ? 'bg-blue-500 text-white border-blue-400 shadow-md font-bold'
                                : 'bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#1e293b] hover:text-white'
                            }`}
                          >
                            <div>
                              <span className="block">{plan.label}</span>
                              <span className={`text-[9px] block ${
                                (userTactics.bowlingPlan || 'Attack Stumps') === plan.id ? 'text-white/80' : 'text-[#64748b]'
                              }`}>
                                {plan.desc}
                              </span>
                            </div>
                            {(userTactics.bowlingPlan || 'Attack Stumps') === plan.id && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Field Setting */}
                    <div className="space-y-1.5">
                      <label className="text-[#94a3b8] block font-semibold text-[11px]">Field Placement Ring:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {fieldSettings.map(field => (
                          <button
                            key={field.id}
                            onClick={() => handleUpdateUserTactics({ fieldSetting: field.id })}
                            className={`p-2 rounded-lg border text-[10px] font-bold text-left transition truncate cursor-pointer ${
                              (userTactics.fieldSetting || 'Balanced') === field.id
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 font-bold'
                                : 'bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#1e293b]'
                            }`}
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pace Variation */}
                    <div className="space-y-1.5">
                      <label className="text-[#94a3b8] block font-semibold text-[11px]">Pace / Spin Release:</label>
                      <div className="grid grid-cols-3 gap-1">
                        {paceVariations.map(pv => (
                          <button
                            key={pv.id}
                            onClick={() => handleUpdateUserTactics({ paceVariation: pv.id })}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition cursor-pointer ${
                              (userTactics.paceVariation || 'Mix Pace & Cutters') === pv.id
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/60 font-bold'
                                : 'bg-[#0f172a] text-[#94a3b8] border-[#1e293b] hover:bg-[#1e293b]'
                            }`}
                          >
                            {pv.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Scorecard Tab */}
          {activeScorecardTab === 'Scorecard1' && (
            <div className="bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b] space-y-4 text-xs shadow-xl">
              <h4 className="font-bold uppercase tracking-widest text-white">Full Inning Scorecard</h4>
              
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[#64748b] pb-1 border-b border-[#1e293b] text-[10px] uppercase tracking-wider">
                  <span>Batter</span>
                  <div className="flex gap-4 font-mono">
                    <span>R</span>
                    <span>B</span>
                    <span>4s</span>
                    <span>6s</span>
                    <span>SR</span>
                  </div>
                </div>

                {(Object.values(currentInnings.batterScorecards) as BatterScorecard[]).map(card => (
                  <div key={card.playerId} className="flex justify-between py-1 border-b border-[#1e293b]/60 text-[#e2e8f0]">
                    <span className="font-medium truncate max-w-[110px]">
                      {card.playerName} {!card.isOut && <strong className="text-[#D4AF37]">*</strong>}
                    </span>
                    <div className="flex gap-4 font-mono font-bold">
                      <span className="text-[#D4AF37]">{card.runs}</span>
                      <span className="text-[#94a3b8]">{card.balls}</span>
                      <span className="text-[#94a3b8]">{card.fours}</span>
                      <span className="text-[#94a3b8]">{card.sixes}</span>
                      <span className="text-[#94a3b8]">{card.strikeRate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
