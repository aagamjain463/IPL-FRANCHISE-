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
  Flame, Target, Wind, Compass, ShieldAlert, Sparkles, ChevronRight, Gauge,
  Eye, Crosshair, HelpCircle, X
} from 'lucide-react';
import { HawkEyeDRSModal } from './fc26/HawkEyeDRSModal';
import { FCIQTacticsRadar } from './fc26/FCIQTacticsRadar';
import { generateHawkEyeReview, getPlayerPlayStylePlus } from '../engine/fc26Engine';
import { HawkEyeDRSReview } from '../types/fc26';

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
    activeChallenge,
    executeImpactSub,
    showToast
  } = useGame();

  const [activeScorecardTab, setActiveScorecardTab] = useState<'LiveFeed' | 'Scorecard1' | 'Scorecard2' | 'Tactics'>('LiveFeed');
  const [screenMode, setScreenMode] = useState<'broadcast' | 'split'>(() => {
    try { return localStorage.getItem('fc_match_screen') === 'split' ? 'split' : 'broadcast'; } catch { return 'broadcast'; }
  });
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [activeDRSReview, setActiveDRSReview] = useState<HawkEyeDRSReview | null>(null);
  const [showTacticsRadarModal, setShowTacticsRadarModal] = useState<boolean>(false);
  const [showImpactSubModal, setShowImpactSubModal] = useState<boolean>(false);
  const [subOutPlayerId, setSubOutPlayerId] = useState<string>('');
  const [subInPlayerId, setSubInPlayerId] = useState<string>('');

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

  // PlayStyles+
  const strikerPlayStyle = striker ? getPlayerPlayStylePlus(striker) : null;
  const bowlerPlayStyle = activeBowler ? getPlayerPlayStylePlus(activeBowler) : null;

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
  // SPECTATOR MATCH: your franchise is not playing — you have zero control,
  // you can only watch live or sim the result.
  const isSpectatorMatch = !isUserMatch;

  const handleUpdateUserTactics = (patch: Partial<typeof userTactics>) => {
    if (!isUserMatch) return;
    updateMatchTactics(userTeamId, patch);
  };

  const handleTriggerDRS = () => {
    if (!striker || !activeBowler) return;
    const isLBW = Math.random() > 0.5;
    const review = generateHawkEyeReview(
      striker.name,
      activeBowler.name,
      isLBW ? 'LBW' : 'Caught Behind',
      'Out'
    );
    setActiveDRSReview(review);
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
    <div className="space-y-6 animate-fadeIn pb-12 font-sans select-none">
      {/* Stadium Broadcast Scoreboard Header */}
      <div className="glass-panel fc-glow-volt p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#00FF87]/10 blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#00E5FF]/10 blur-[80px] pointer-events-none" />
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Radio className="w-32 h-32 text-[#D4AF37]" />
        </div>

        {/* Top Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1e293b] text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> FC 26 BROADCAST
            </span>
            <span className="text-slate-400 font-medium">
              {match.venue}, {match.city} • Pitch: <strong className="text-[#D4AF37]">{match.pitch.type}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isUserMatch && (
              <button
                onClick={handleTriggerDRS}
                className="px-3 py-1 rounded-full bg-[#131d35] hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Trigger Hawk-Eye 3D Ball Tracking"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Hawk-Eye DRS Review</span>
              </button>
            )}

            <div className="flex items-center gap-3 font-mono">
              <span className="text-slate-400">CRR: <strong className="text-white">{currentRR}</strong></span>
              {isChasing && (
                <span className="text-slate-400">RRR: <strong className="text-[#D4AF37]">{reqRR}</strong></span>
              )}
            </div>
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
                  <span className="fc-display text-5xl md:text-6xl text-white tracking-tight">
                    {currentInnings.totalRuns}<span className="text-white/40">/</span>{currentInnings.wickets}
                  </span>
                  <span className="fc-display text-xl text-[#D4AF37]">
                    ({currentOverFormatted} / 20)
                  </span>
                </div>
              </div>
            </div>

            {isChasing ? (
              <p className="text-sm font-semibold text-emerald-400 mt-2">
                Need <strong className="font-mono text-white">{runsNeeded}</strong> runs from <strong className="font-mono text-white">{ballsRemaining}</strong> balls (Target: {target})
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                1st Innings • Projected Score: <strong className="text-white font-mono">{Math.round(Number(currentRR) * 20)}</strong>
              </p>
            )}
          </div>

          {/* Opponent & Match Status */}
          <div className="flex flex-col items-start md:items-end">
            <span className="text-xs text-slate-400">Bowling: <strong className="text-white">{bowlingTeam?.name}</strong></span>
            {match.innings1.isCompleted && (
              <span className="text-xs font-mono text-slate-400 mt-0.5">
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
            <span className="text-slate-500 uppercase tracking-widest text-[10px]">Win Probability</span>
            <span className="text-blue-400">{gameState.teams[match.teamBId]?.shortName} ({100 - teamAWinProb}%)</span>
          </div>
          <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden flex">
            <div className="bg-[#D4AF37] h-2 transition-all duration-300" style={{ width: `${teamAWinProb}%` }} />
          </div>
        </div>
      </div>

      {/* Multi-Screen mode toggle (FC TV broadcast vs side-by-side split) */}
      <div className="flex items-center justify-between gap-3 glass-panel rounded-2xl px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Radio className="w-3 h-3 animate-pulse" /> BROADCAST {screenMode === 'split' ? 'SPLIT' : '4K'}
          </span>
          <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
            MULTI-SCREEN MODE — {screenMode === 'broadcast' ? 'Scoreboard focus' : 'Scoreboard + commentary + stats'}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-black/30 rounded-xl border border-white/10 p-1">
          <button
            onClick={() => { setScreenMode('broadcast'); try { localStorage.setItem('fc_match_screen', 'broadcast'); } catch {} }}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition cursor-pointer ${screenMode === 'broadcast' ? 'bg-[#00FF87] text-black' : 'text-slate-400 hover:text-white'}`}
          >
            TV
          </button>
          <button
            onClick={() => { setScreenMode('split'); try { localStorage.setItem('fc_match_screen', 'split'); } catch {} }}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition cursor-pointer ${screenMode === 'split' ? 'bg-[#00E5FF] text-black' : 'text-slate-400 hover:text-white'}`}
          >
            SPLIT
          </button>
        </div>
      </div>

      {/* Main Split: Pitch 2D + Live Batsmen / Bowler Box */}
      <div className={`grid grid-cols-1 gap-6 ${screenMode === 'split' ? 'lg:grid-cols-2 2xl:grid-cols-3' : 'lg:grid-cols-3'}`}>
        {/* Left 2 Cols: In-crease Players & Pitch Visual */}
        <div className={`${screenMode === 'split' ? '' : 'lg:col-span-2'} space-y-6`}>
          {/* Batters & Active Bowler Cards with PlayStyles+ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Striker */}
            <div className="bg-[#090d16] p-4 rounded-2xl border border-[#D4AF37]/40 space-y-2 shadow-xl relative">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D4AF37] font-bold flex items-center gap-1">
                  🏏 Striker (*)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">SR: {strikerCard?.strikeRate || 0}</span>
              </div>
              
              <div className="flex items-center justify-between gap-1">
                <h4 
                  onClick={() => striker && setSelectedPlayerForModal(striker)}
                  className="font-bold text-sm text-white cursor-pointer hover:text-[#D4AF37] transition truncate"
                >
                  {striker?.name || 'Striker'}
                </h4>
                {strikerPlayStyle && (
                  <span 
                    title={strikerPlayStyle.description}
                    className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 shadow-sm shrink-0"
                  >
                    {strikerPlayStyle.shortTag}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black font-mono-sport text-[#D4AF37]">{strikerCard?.runs || 0}</span>
                <span className="text-xs text-slate-400">({strikerCard?.balls || 0}b • {strikerCard?.fours || 0}x4 • {strikerCard?.sixes || 0}x6)</span>
              </div>
              {isUserBatting && (
                <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 uppercase font-bold">Intent:</span>
                  <span className="font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                    {userTactics.batterApproach || 'Balanced'}
                  </span>
                </div>
              )}
            </div>

            {/* Non-Striker */}
            <div className="bg-[#090d16] p-4 rounded-2xl border border-[#1e293b] space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Non-Striker</span>
                <span className="text-[10px] text-slate-400 font-mono">SR: {nonStrikerCard?.strikeRate || 0}</span>
              </div>
              <h4 
                onClick={() => nonStriker && setSelectedPlayerForModal(nonStriker)}
                className="font-bold text-sm text-white cursor-pointer hover:text-[#D4AF37] transition truncate"
              >
                {nonStriker?.name || 'Non-Striker'}
              </h4>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black font-mono-sport text-[#e2e8f0]">{nonStrikerCard?.runs || 0}</span>
                <span className="text-xs text-slate-400">({nonStrikerCard?.balls || 0}b • {nonStrikerCard?.fours || 0}x4 • {nonStrikerCard?.sixes || 0}x6)</span>
              </div>
            </div>

            {/* Bowler */}
            <div className="bg-[#090d16] p-4 rounded-2xl border border-[#1e293b] space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400 font-bold">🎯 Bowler</span>
                <span className="text-[10px] text-slate-400 font-mono">Econ: {bowlerCard?.economy || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <h4 
                  onClick={() => activeBowler && setSelectedPlayerForModal(activeBowler)}
                  className="font-bold text-sm text-white cursor-pointer hover:text-blue-400 transition truncate"
                >
                  {activeBowler?.name || 'Bowler'}
                </h4>
                {bowlerPlayStyle && (
                  <span 
                    title={bowlerPlayStyle.description}
                    className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm shrink-0"
                  >
                    {bowlerPlayStyle.shortTag}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 font-mono">
                <span className="text-2xl font-black font-mono-sport text-blue-400">{bowlerCard?.wickets || 0} - {bowlerCard?.runsConceded || 0}</span>
                <span className="text-xs text-slate-400">({bowlerCard?.overs || 0} ov • {bowlerCard?.dots || 0} dots)</span>
              </div>
              {isUserBowling && (
                <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 uppercase font-bold">Plan:</span>
                  <span className="font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 truncate max-w-[120px]">
                    {userTactics.bowlingPlan || 'Attack Stumps'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Real-Time Tactical Controller Bar */}
          <div className={`bg-[#0b1329] p-3.5 rounded-2xl border space-y-2.5 shadow-lg ${isSpectatorMatch ? 'border-slate-600/40 opacity-90' : 'border-[#1e293b]'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isSpectatorMatch ? 'text-slate-400' : 'text-[#D4AF37]'}`}>
                <Sliders className="w-3.5 h-3.5" />
                {isSpectatorMatch
                  ? 'Spectator Mode — No Control (Watch / Sim Only)'
                  : isUserBatting ? 'Active Batting Command (User)' : isUserBowling ? 'Active Bowling Command (User)' : 'Match Tactical Console'}
              </span>
              {!isSpectatorMatch && (
                <button
                  onClick={() => setShowTacticsRadarModal(true)}
                  className="text-[10px] font-bold text-amber-300 hover:text-white uppercase flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30"
                >
                  <Crosshair className="w-3 h-3 text-amber-400" />
                  <span>3D Tactical Radar</span>
                </button>
              )}
            </div>

            {isSpectatorMatch && (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/30 text-slate-300">
                <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-[11px] leading-snug">
                  Neutral match — your franchise is not playing tonight. Both teams are controlled by the AI.
                  You can watch the simulation or use <strong className="text-white">Sim Over / Sim Innings / Sim Match</strong> below.
                </p>
              </div>
            )}

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
                          : 'bg-[#05070a] hover:bg-[#1e293b] text-slate-400 hover:text-white border border-[#1e293b]'
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
                          : 'bg-[#05070a] hover:bg-[#1e293b] text-slate-400 hover:text-white border border-[#1e293b]'
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
          <div className="bg-[#090d16] p-6 rounded-3xl border border-[#1e293b] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
            <div className="space-y-2 max-w-sm">
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Fielding & Shot Radar</span>
              <h4 className="text-base font-bold text-white">
                {latestBall ? `Last Ball: ${latestBall.runsScored} runs (${latestBall.shotZone})` : 'Awaiting Delivery'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
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
          <div className="bg-[#090d16] p-5 rounded-3xl border border-[#1e293b] space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Simulation Controls</span>
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
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>Skip to Franchise Hub</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Ball-by-ball control is ONLY available when your franchise is playing */}
                  {!isSpectatorMatch && (
                    <button
                      id="btn-bowl-ball"
                      onClick={bowlBall}
                      className="px-5 py-2.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest shadow-md transition hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>Bowl Ball</span>
                    </button>
                  )}

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
                        : 'bg-[#05070a] text-slate-400 border-[#1e293b] hover:text-white'
                    }`}
                  >
                    {isAutoPlaying ? 'Pause Auto' : isSpectatorMatch ? 'Auto Watch' : 'Auto Play'}
                  </button>

                  {/* Impact sub is only for YOUR franchise, and only in your matches */}
                  {!isSpectatorMatch && (
                    <button
                      id="btn-open-impact-sub"
                      onClick={() => setShowImpactSubModal(true)}
                      className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#00FF87] to-emerald-400 text-black font-black text-xs uppercase tracking-wider transition hover:scale-105 active:scale-95 shadow-lg shadow-[#00FF87]/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-black" />
                      <span>Impact Sub</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Commentary Stream & Live Tactical Settings */}
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1 bg-[#05070a] p-1 rounded-2xl border border-[#1e293b]">
            <button
              onClick={() => setActiveScorecardTab('LiveFeed')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeScorecardTab === 'LiveFeed' ? 'bg-[#D4AF37] text-black font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Feed
            </button>
            {isUserMatch && (
              <button
                onClick={() => setActiveScorecardTab('Tactics')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeScorecardTab === 'Tactics' ? 'bg-[#D4AF37] text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                FC IQ Tactics
              </button>
            )}
            <button
              onClick={() => setActiveScorecardTab('Scorecard1')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeScorecardTab === 'Scorecard1' ? 'bg-[#D4AF37] text-black font-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              Scorecard
            </button>
          </div>

          {/* Live Feed Commentary */}
          {activeScorecardTab === 'LiveFeed' && (
            <div className="bg-[#090d16] p-4 rounded-2xl border border-[#1e293b] space-y-3 max-h-[500px] overflow-y-auto pr-1 shadow-2xl">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Ball-by-Ball Feed</h4>
              {currentInnings.recentBalls.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Play has commenced. Awaiting opening ball.</p>
              ) : (
                currentInnings.recentBalls.map((b, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#0c1220] border border-[#1e293b] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-300">{b.overNumber + 1}.{b.ballInOver}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        b.isWicket ? 'bg-rose-500 text-white' : b.runsScored === 6 ? 'bg-amber-400 text-black' : b.runsScored === 4 ? 'bg-blue-400 text-black' : 'bg-[#1e293b] text-slate-300'
                      }`}>
                        {b.isWicket ? 'WICKET' : `${b.runsScored} RUNS`}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-snug">{b.commentaryText}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tactics Settings Tab — phase-gated: you can only see/set controls for YOUR team's current phase */}
          {activeScorecardTab === 'Tactics' && (
            <div className="bg-[#090d16] p-4 rounded-2xl border border-[#1e293b] space-y-4 text-xs shadow-2xl">
              <div className="flex items-center justify-between">
                <h4 className="font-black uppercase tracking-widest text-white">
                  {isUserBatting
                    ? `Batting Command — ${gameState.teams[gameState.userTeamId]?.shortName || 'Your Team'}`
                    : isUserBowling
                      ? `Bowling Command — ${gameState.teams[gameState.userTeamId]?.shortName || 'Your Team'}`
                      : 'In-Match Tactics & FC IQ'}
                </h4>
                <button
                  onClick={() => setShowTacticsRadarModal(true)}
                  className="text-[10px] font-bold text-cyan-300 hover:underline cursor-pointer"
                >
                  Interactive Radar ↗
                </button>
              </div>

              {/* Batting Approaches — ONLY while YOUR team is batting */}
              {isUserBatting && (
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold text-[11px]">Batting Approach (Your Team):</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {battingApproaches.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => handleUpdateUserTactics({ batterApproach: mode.id })}
                        className={`p-2 rounded-lg border text-[11px] font-bold text-left transition flex flex-col justify-between cursor-pointer ${
                          userTactics.batterApproach === mode.id
                            ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black'
                            : 'bg-[#0f172a] text-slate-400 border-[#1e293b] hover:bg-[#1e293b] hover:text-white'
                        }`}
                      >
                        <span className="font-bold">{mode.label}</span>
                        <span className={`text-[9px] ${userTactics.batterApproach === mode.id ? 'text-black/80' : 'text-slate-500'}`}>{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bowling Plans — ONLY while YOUR team is bowling */}
              {isUserBowling && (
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold text-[11px]">Delivery & Length Target (Your Team):</label>
                  <div className="grid grid-cols-1 gap-1">
                    {bowlingPlans.slice(0, 4).map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => handleUpdateUserTactics({ bowlingPlan: plan.id })}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold text-left transition flex items-center justify-between cursor-pointer ${
                          (userTactics.bowlingPlan || 'Attack Stumps') === plan.id
                            ? 'bg-blue-500 text-white border-blue-400 font-bold'
                            : 'bg-[#0f172a] text-slate-400 border-[#1e293b] hover:bg-[#1e293b] hover:text-white'
                        }`}
                      >
                        <span>{plan.label}</span>
                        {(userTactics.bowlingPlan || 'Attack Stumps') === plan.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isUserBatting && !isUserBowling && (
                <p className="text-[11px] text-slate-500 italic">Tactical controls unlock when your franchise takes the field.</p>
              )}
            </div>
          )}

          {/* Full Scorecard Tab */}
          {activeScorecardTab === 'Scorecard1' && (
            <div className="bg-[#090d16] p-4 rounded-2xl border border-[#1e293b] space-y-4 text-xs shadow-2xl">
              <h4 className="font-bold uppercase tracking-widest text-white">Full Inning Scorecard</h4>
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-500 pb-1 border-b border-[#1e293b] text-[10px] uppercase tracking-wider">
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
                  <div key={card.playerId} className="flex justify-between py-1 border-b border-[#1e293b]/60 text-slate-200">
                    <span className="font-medium truncate max-w-[110px]">
                      {card.playerName} {!card.isOut && <strong className="text-[#D4AF37]">*</strong>}
                    </span>
                    <div className="flex gap-4 font-mono font-bold">
                      <span className="text-[#D4AF37]">{card.runs}</span>
                      <span className="text-slate-400">{card.balls}</span>
                      <span className="text-slate-400">{card.fours}</span>
                      <span className="text-slate-400">{card.sixes}</span>
                      <span className="text-slate-400">{card.strikeRate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HAWK-EYE DRS SIMULATION MODAL */}
      {activeDRSReview && (
        <HawkEyeDRSModal
          review={activeDRSReview}
          onClose={() => setActiveDRSReview(null)}
        />
      )}

      {/* 3D TACTICAL RADAR MODAL */}
      {showTacticsRadarModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-[#1e293b] rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowTacticsRadarModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#131d35] text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <FCIQTacticsRadar
              onApplyTactics={(preset) => {
                if (!isUserMatch) return;
                // Translate FC IQ preset → live TacticalInstructions (real engine impact)
                const battApproach = preset.mentality === 'Ultra Attacking' ? 'Maximum Attack'
                  : preset.mentality === 'High Press' ? 'Aggressive'
                  : preset.mentality === 'Cautious' ? 'Rotate Strike'
                  : preset.mentality === 'Ultra Defensive' ? 'Anchor / Conserve'
                  : 'Balanced';
                const field = preset.boundaryProtection === 'Heavy Off-side' ? 'Off-Side Trap'
                  : preset.boundaryProtection === 'Heavy Leg-side' ? 'Leg-Side Trap'
                  : preset.boundaryProtection === 'Ring Lockdown' ? 'Inner Ring Choke (Cut-off 1s)'
                  : 'Balanced';
                const plan = preset.aggression >= 8 ? 'Attack Stumps'
                  : preset.aggression >= 5 ? 'Test Match Hard Length'
                  : 'Contain Runs';
                updateMatchTactics(userTeamId, {
                  batterApproach: battApproach,
                  bowlingPlan: plan,
                  fieldSetting: field,
                  protectWicket: preset.mentality === 'Ultra Defensive' || preset.mentality === 'Cautious'
                });
                showToast(`FC IQ "${preset.name}" applied — ${preset.mentality} mindset live.`, 'success');
              }}
            />
          </div>
        </div>
      )}

      {/* IMPACT PLAYER SUBSTITUTION MODAL */}
      {showImpactSubModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-[#00FF87]/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#00FF87]" />
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Tactical Impact Substitution</h3>
                  <p className="text-xs text-slate-400">Deploy a specialist from your bench into the live matchday XI</p>
                </div>
              </div>
              <button
                onClick={() => setShowImpactSubModal(false)}
                className="p-2 rounded-xl bg-[#131d35] text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player Out Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-400">Select Player to Replace (OUT):</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(gameState.teams[gameState.userTeamId]?.playingXI?.playingXIIds || []).map(id => {
                    const player = gameState.allPlayers[id];
                    if (!player) return null;
                    const isSelected = subOutPlayerId === id;
                    return (
                      <div
                        key={id}
                        onClick={() => setSubOutPlayerId(id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                          isSelected ? 'bg-rose-950/40 border-rose-500 text-white font-bold' : 'bg-[#05070a] border-[#1e293b] text-slate-300 hover:bg-[#121c2e]'
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-bold">{player.name}</span>
                          <span className="text-[10px] text-slate-400 block">{player.role}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-400">{player.overall} OVR</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bench Player In Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#00FF87]">Select Impact Star (IN):</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {(gameState.teams[gameState.userTeamId]?.rosterPlayerIds || [])
                    .filter(id => !(gameState.teams[gameState.userTeamId]?.playingXI?.playingXIIds || []).includes(id))
                    .map(id => {
                      const player = gameState.allPlayers[id];
                      if (!player) return null;
                      const isSelected = subInPlayerId === id;
                      return (
                        <div
                          key={id}
                          onClick={() => setSubInPlayerId(id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                            isSelected ? 'bg-emerald-950/40 border-[#00FF87] text-white font-bold' : 'bg-[#05070a] border-[#1e293b] text-slate-300 hover:bg-[#121c2e]'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold">{player.name}</span>
                            <span className="text-[10px] text-emerald-400 block">{player.role}</span>
                          </div>
                          <span className="font-mono font-bold text-[#00FF87]">{player.overall} OVR</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e293b]">
              <button
                onClick={() => setShowImpactSubModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!subOutPlayerId || !subInPlayerId}
                onClick={() => {
                  executeImpactSub(gameState.userTeamId, subOutPlayerId, subInPlayerId);
                  setShowImpactSubModal(false);
                }}
                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
                  subOutPlayerId && subInPlayerId
                    ? 'bg-[#00FF87] hover:bg-[#00e57a] text-black shadow-lg shadow-[#00FF87]/20 active:scale-95'
                    : 'bg-[#1e293b] text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Confirm Impact Sub</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
