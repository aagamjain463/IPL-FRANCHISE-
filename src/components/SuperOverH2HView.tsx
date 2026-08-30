import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Zap, Trophy, Shield, Flame, Play, Clock, ArrowRight, 
  RotateCcw, Sparkles, Award, Users, CheckCircle2, ChevronRight, Activity, X
} from 'lucide-react';
import { H2HRankedProfile, H2HOpponent, H2HMatchRoomState, H2HBallOutcome, RankedDivision } from '../types/multiplayer';
import { soundFx } from '../audio/soundFx';
import { INITIAL_TEAMS } from '../data/teams';

const DIVISIONS: RankedDivision[] = [
  'Bronze III', 'Bronze II', 'Bronze I',
  'Silver III', 'Silver II', 'Silver I',
  'Gold III', 'Gold II', 'Gold I',
  'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond', 'Legend'
];

export const SuperOverH2HView: React.FC<{ onBackToPlay?: () => void }> = ({ onBackToPlay }) => {
  const { gameState, setGameState } = useGame();

  // Ranked Profile stored in progression or initialized
  const [profile, setProfile] = useState<H2HRankedProfile>(() => {
    const saved = localStorage.getItem('ipl_h2h_ranked_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      division: 'Gold II',
      ratingPoints: 1450,
      wins: 18,
      losses: 7,
      currentStreak: 3,
      bestStreak: 6,
      highestDivision: 'Gold I',
      seasonName: 'IPL Premier Season 4',
      seasonEndsInDays: 12
    };
  });

  const [matchmakingState, setMatchmakingState] = useState<'idle' | 'searching' | 'opponent_found' | 'in_match' | 'post_match'>('idle');
  const [searchTimer, setSearchTimer] = useState<number>(0);
  const [opponent, setOpponent] = useState<H2HOpponent | null>(null);

  // Match Engine State
  const [matchRoom, setMatchRoom] = useState<H2HMatchRoomState | null>(null);
  const [selectedShot, setSelectedShot] = useState<'loft' | 'placement' | 'power' | 'scoop'>('loft');
  const [selectedDelivery, setSelectedDelivery] = useState<'yorker' | 'slower' | 'bouncer' | 'wide'>('yorker');
  const [isProcessingBall, setIsProcessingBall] = useState(false);
  const [lastCommentary, setLastCommentary] = useState<string>('Match ready to begin. Deliver or face the first ball!');

  // Save profile changes
  useEffect(() => {
    localStorage.setItem('ipl_h2h_ranked_profile', JSON.stringify(profile));
  }, [profile]);

  // Matchmaking simulation loop
  useEffect(() => {
    let interval: any;
    if (matchmakingState === 'searching') {
      interval = setInterval(() => {
        setSearchTimer(t => {
          if (t >= 3) {
            // Find opponent
            const opponentTeams = Object.values(INITIAL_TEAMS).filter(t => t.id !== gameState?.userTeamId);
            const pickedTeam = opponentTeams[Math.floor(Math.random() * opponentTeams.length)] || opponentTeams[0];
            
            const opp: H2HOpponent = {
              id: `opp_${Date.now()}`,
              managerName: `Coach_${pickedTeam.shortName}`,
              franchiseId: pickedTeam.id,
              franchiseName: pickedTeam.name,
              shortName: pickedTeam.shortName,
              primaryColor: pickedTeam.primaryColor,
              secondaryColor: pickedTeam.secondaryColor,
              squadOvr: 87 + Math.floor(Math.random() * 5),
              division: profile.division,
              ratingPoints: profile.ratingPoints + (Math.floor(Math.random() * 60) - 30),
              captainName: 'Team Captain',
              recentForm: ['W', 'W', 'L', 'W', 'W']
            };

            setOpponent(opp);
            setMatchmakingState('opponent_found');
            soundFx.playCheer(false);

            // Auto-start match after 2 seconds
            setTimeout(() => {
              const userBattingFirst = Math.random() > 0.5;
              const target = userBattingFirst ? 0 : (12 + Math.floor(Math.random() * 10)); // 12-21 runs target if chasing
              
              setMatchRoom({
                roomId: `ROOM-${Math.floor(1000 + Math.random() * 9000)}`,
                status: 'innings1',
                userIsBattingFirst: userBattingFirst,
                targetRuns: target,
                currentInnings: userBattingFirst ? 1 : 2,
                ballsCompleted: 0,
                runsScored: 0,
                wicketsLost: 0,
                currentBatterName: 'Top Batter',
                currentBowlerName: 'Elite Pacer',
                ballHistory: []
              });
              setMatchmakingState('in_match');
            }, 2000);
            return 0;
          }
          return t + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [matchmakingState, gameState, profile]);

  const handleStartMatchmaking = () => {
    setSearchTimer(0);
    setMatchmakingState('searching');
    soundFx.playHammerKnock();
  };

  const handleCancelMatchmaking = () => {
    setMatchmakingState('idle');
    setSearchTimer(0);
  };

  // Play next ball in Super Over
  const handlePlayBall = () => {
    if (!matchRoom || matchRoom.status === 'completed' || isProcessingBall) return;
    setIsProcessingBall(true);
    soundFx.playBatHit();

    setTimeout(() => {
      const ballNum = matchRoom.ballsCompleted + 1;
      const isBatting = (matchRoom.userIsBattingFirst && matchRoom.currentInnings === 1) || (!matchRoom.userIsBattingFirst && matchRoom.currentInnings === 2);

      // Outcome simulation based on shot & delivery
      let runs = 0;
      let isWicket = false;
      let isBoundary = false;
      let isSix = false;
      let comm = '';

      const rand = Math.random();

      if (isBatting) {
        // User Batting
        if (selectedShot === 'loft') {
          if (rand > 0.65) {
            runs = 6; isSix = true; isBoundary = true;
            comm = `🚀 MASSIVE SIX! Clean strike sailed over deep mid-wicket for 6!`;
            soundFx.playCheer(true);
          } else if (rand > 0.35) {
            runs = 4; isBoundary = true;
            comm = `🔥 CRACKING FOUR! Sliced through extra cover to the fence!`;
            soundFx.playCheer(false);
          } else if (rand > 0.15) {
            runs = 1 + Math.floor(Math.random() * 2);
            comm = `Solid placement into the gap for ${runs} runs.`;
          } else {
            isWicket = true;
            comm = `❌ WICKET! Caught right on the boundary rope trying to clear long-on!`;
            soundFx.playWicketSound();
          }
        } else if (selectedShot === 'power') {
          if (rand > 0.55) {
            runs = 6; isSix = true; isBoundary = true;
            comm = `💥 MAXIMUM! Brutal flat-six into the stadium tier!`;
            soundFx.playCheer(true);
          } else if (rand > 0.25) {
            runs = 4; isBoundary = true;
            comm = `FOUR! Smacked through point with immense bat speed!`;
            soundFx.playCheer(false);
          } else if (rand > 0.15) {
            runs = 1;
            comm = `Quick single scrambled down to third man.`;
          } else {
            isWicket = true;
            comm = `❌ TIMBER! Yorker snuck under the aggressive swing, stumps shattered!`;
            soundFx.playWicketSound();
          }
        } else {
          // Placement / Scoop
          if (rand > 0.4) {
            runs = 4; isBoundary = true;
            comm = `🎯 PRECISION! Delicate scoop beats the fine-leg fielder for FOUR!`;
            soundFx.playCheer(false);
          } else if (rand > 0.1) {
            runs = 2;
            comm = `Superb running between the wickets converts one into two.`;
          } else {
            isWicket = true;
            comm = `❌ RUN OUT! Risky double resulted in a direct hit!`;
            soundFx.playWicketSound();
          }
        }
      } else {
        // User Bowling
        if (selectedDelivery === 'yorker') {
          if (rand > 0.7) {
            isWicket = true;
            comm = `🎯 PINPOINT YORKER! Clean bowled right at the base of off-stump!`;
            soundFx.playWicketSound();
          } else if (rand > 0.4) {
            runs = 1;
            comm = `Dug out well to mid-on for a single.`;
          } else if (rand > 0.2) {
            runs = 0;
            comm = `Dot ball! Terrific toe-crusher right on the blockhole.`;
          } else {
            runs = 4; isBoundary = true;
            comm = `Missed length by inches and edged down to fine leg for FOUR.`;
          }
        } else if (selectedDelivery === 'slower') {
          if (rand > 0.6) {
            isWicket = true;
            comm = `❌ DECEIVED! Slower knuckleball mistimed straight to cover!`;
            soundFx.playWicketSound();
          } else if (rand > 0.3) {
            runs = 1;
            comm = `Batter bamboozled by the change of pace, scrambled single.`;
          } else {
            runs = 6; isSix = true; isBoundary = true;
            comm = `Spotted the slower delivery early and hoisted over long-off for SIX!`;
          }
        } else {
          // Bouncer / Wide line
          if (rand > 0.5) {
            runs = 0;
            comm = `Fiery short ball whizzed past the helmet grill! Dot ball.`;
          } else if (rand > 0.25) {
            runs = 1;
            comm = `Pulled down to deep square leg for one.`;
          } else {
            runs = 4; isBoundary = true;
            comm = `Upper-cut flew over backward point to the ropes!`;
          }
        }
      }

      const newRuns = matchRoom.runsScored + runs;
      const newWickets = matchRoom.wicketsLost + (isWicket ? 1 : 0);
      const isOverComplete = ballNum >= 6 || newWickets >= 2;

      const outcome: H2HBallOutcome = {
        ballNumber: ballNum,
        runs,
        isWicket,
        isBoundary,
        isSix,
        commentary: comm,
        shotType: selectedShot,
        deliveryType: selectedDelivery
      };

      setLastCommentary(comm);

      // Check if match finished or transition to Innings 2
      if (isOverComplete) {
        if (matchRoom.currentInnings === 1 && matchRoom.userIsBattingFirst) {
          // Finished Innings 1 (User bat -> User bowl next)
          setMatchRoom({
            ...matchRoom,
            currentInnings: 2,
            targetRuns: newRuns + 1,
            ballsCompleted: 0,
            runsScored: 0,
            wicketsLost: 0,
            ballHistory: [...matchRoom.ballHistory, outcome]
          });
          setLastCommentary(`Innings 1 Complete! Set target of ${newRuns + 1} runs. Now defend with the ball!`);
        } else {
          // Match Ended!
          const userWon = matchRoom.userIsBattingFirst 
            ? (newRuns < matchRoom.targetRuns)
            : (newRuns >= matchRoom.targetRuns);
          
          const rpDelta = userWon ? 35 : -20;
          const newRP = Math.max(0, profile.ratingPoints + rpDelta);
          
          // Determine division rank
          const divIdx = Math.min(DIVISIONS.length - 1, Math.floor(newRP / 200));
          const newDiv = DIVISIONS[divIdx];

          setProfile(p => ({
            ...p,
            ratingPoints: newRP,
            division: newDiv,
            wins: userWon ? p.wins + 1 : p.wins,
            losses: userWon ? p.losses : p.losses + 1,
            currentStreak: userWon ? p.currentStreak + 1 : 0,
            bestStreak: userWon ? Math.max(p.bestStreak, p.currentStreak + 1) : p.bestStreak
          }));

          setMatchRoom({
            ...matchRoom,
            status: 'completed',
            runsScored: newRuns,
            wicketsLost: newWickets,
            ballsCompleted: ballNum,
            ballHistory: [...matchRoom.ballHistory, outcome],
            winner: userWon ? 'user' : 'opponent',
            rpChange: rpDelta
          });

          setMatchmakingState('post_match');
          if (userWon) soundFx.playCheer(true);
        }
      } else {
        setMatchRoom({
          ...matchRoom,
          runsScored: newRuns,
          wicketsLost: newWickets,
          ballsCompleted: ballNum,
          ballHistory: [...matchRoom.ballHistory, outcome]
        });
      }

      setIsProcessingBall(false);
    }, 450);
  };

  const handlePlayAgain = () => {
    setMatchRoom(null);
    setOpponent(null);
    setMatchmakingState('searching');
    setSearchTimer(0);
  };

  const userTeam = gameState?.teams[gameState?.userTeamId || 'gt'];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Top Banner: Ranked Division & Quick Stats */}
      <div className="bg-[#0f172a] p-5 sm:p-6 rounded-2xl border border-[#1e293b] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" /> RANKED SUPER OVER H2H
            </span>
            <span className="text-xs text-[#64748b]">• {profile.seasonName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight">
            LIVE 1v1 CRICKET CLUTCH ARENA
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            6 balls each. Pure tactical showdown. Battle players worldwide or certified franchise AI bots for Ranked RP.
          </p>
        </div>

        {/* Division Badge & RP */}
        <div className="flex items-center gap-3">
          <div className="bg-[#05070a] px-4 py-2.5 rounded-xl border border-[#1e293b] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center font-black text-black text-base shadow">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[#64748b] block font-bold">Current Tier</span>
              <p className="text-sm font-black text-white">{profile.division}</p>
              <span className="text-xs font-mono font-bold text-[#D4AF37]">{profile.ratingPoints} RP</span>
            </div>
          </div>

          <div className="bg-[#05070a] px-3.5 py-2.5 rounded-xl border border-[#1e293b] text-center">
            <span className="text-[9px] uppercase tracking-wider text-[#64748b] block font-bold">Win Record</span>
            <p className="text-xs font-mono font-bold text-white">
              <span className="text-emerald-400">{profile.wins}W</span> - <span className="text-rose-400">{profile.losses}L</span>
            </p>
            <span className="text-[10px] text-amber-400 font-bold">🔥 {profile.currentStreak} Streak</span>
          </div>
        </div>
      </div>

      {/* STATE 1: IDLE / LOBBY */}
      {matchmakingState === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Action Card */}
          <div className="lg:col-span-8 bg-gradient-to-br from-[#0c1322] via-[#0f172a] to-[#080d1a] p-6 sm:p-8 rounded-2xl border border-[#1e293b] shadow-2xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Servers Online • Low Ping
                </span>
                <span className="text-xs text-slate-400 font-medium">Global Matchmaking Pool</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black uppercase italic text-white tracking-tight">
                ENTER THE CLUTCH ARENA
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] mt-2 max-w-xl leading-relaxed">
                Step up to the 22 yards. 1 Over per team, 2 Wickets maximum. Out-think your opponent with ball-by-ball variations, yorkers, scoop shots, and field placements.
              </p>
            </div>

            {/* Franchise Matchup Card Preview */}
            <div className="bg-[#05070a]/80 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow border border-white/20"
                  style={{ backgroundColor: userTeam?.primaryColor || '#1e3a8a', color: userTeam?.secondaryColor || '#fff' }}
                >
                  {userTeam?.shortName || 'IPL'}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase">{userTeam?.name}</h4>
                  <p className="text-[10px] text-[#D4AF37] font-bold">OVR 89 • Ready for Battle</p>
                </div>
              </div>

              <div className="text-right text-xs font-mono">
                <span className="text-[#64748b] block text-[9px] uppercase font-bold">Ranked Stakes</span>
                <span className="text-emerald-400 font-bold">+35 RP Win</span> / <span className="text-rose-400 font-bold">-20 RP Loss</span>
              </div>
            </div>

            <button
              id="btn-find-h2h-match"
              onClick={handleStartMatchmaking}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black font-black text-base uppercase tracking-wider shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>FIND MATCH (PLAY NOW)</span>
            </button>
          </div>

          {/* Division Ladder Sidebar */}
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37]" /> Ranked Division Ladder
            </h4>
            <p className="text-xs text-[#94a3b8]">Climb divisions by winning Super Over matches and collecting RP.</p>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {['Legend', 'Diamond', 'Platinum I', 'Gold I', 'Gold II', 'Silver I', 'Bronze I'].map((div, i) => {
                const isCurrent = profile.division.startsWith(div.split(' ')[0]);
                return (
                  <div
                    key={div}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                      isCurrent 
                        ? 'bg-[#131d35] border-[#D4AF37] font-bold text-white shadow-sm' 
                        : 'bg-[#05070a] border-white/5 text-[#64748b]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#D4AF37]">#{i + 1}</span>
                      <span>{div}</span>
                    </div>
                    {isCurrent ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#D4AF37] text-black">
                        YOU ARE HERE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#64748b]">{(7 - i) * 300} RP</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: SEARCHING / MATCHMAKING RADAR */}
      {matchmakingState === 'searching' && (
        <div className="bg-[#0f172a] p-10 rounded-2xl border border-[#1e293b] shadow-2xl text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#D4AF37]/30 animate-ping" />
            <div className="w-16 h-16 rounded-full bg-[#05070a] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-xl">
              <Zap className="w-8 h-8 fill-current" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black uppercase text-white tracking-tight">FINDING OPPONENT...</h3>
            <p className="text-xs text-[#94a3b8] mt-1">Searching in {profile.division} matchmaking pool ({profile.ratingPoints} RP)</p>
            <p className="text-xs font-mono font-bold text-[#D4AF37] mt-2">Time elapsed: {searchTimer}s</p>
          </div>

          <button
            onClick={handleCancelMatchmaking}
            className="px-6 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] hover:text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Cancel Search
          </button>
        </div>
      )}

      {/* STATE 3: OPPONENT FOUND */}
      {matchmakingState === 'opponent_found' && opponent && (
        <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#D4AF37] shadow-2xl text-center max-w-2xl mx-auto space-y-6 animate-fadeIn">
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            OPPONENT LOCKED IN!
          </span>

          <div className="flex items-center justify-center gap-6 sm:gap-12 my-6">
            {/* User */}
            <div className="text-center">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-[#D4AF37] mx-auto mb-2"
                style={{ backgroundColor: userTeam?.primaryColor, color: userTeam?.secondaryColor }}
              >
                {userTeam?.shortName}
              </div>
              <h4 className="text-sm font-black text-white uppercase">{userTeam?.name}</h4>
              <span className="text-xs font-mono text-[#D4AF37] font-bold">{profile.ratingPoints} RP</span>
            </div>

            <div className="text-2xl sm:text-3xl font-black italic text-[#64748b]">VS</div>

            {/* Opponent */}
            <div className="text-center">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border border-white/20 mx-auto mb-2"
                style={{ backgroundColor: opponent.primaryColor, color: opponent.secondaryColor }}
              >
                {opponent.shortName}
              </div>
              <h4 className="text-sm font-black text-white uppercase">{opponent.franchiseName}</h4>
              <span className="text-xs font-mono text-[#D4AF37] font-bold">{opponent.ratingPoints} RP</span>
            </div>
          </div>

          <p className="text-xs text-[#94a3b8] font-bold animate-pulse">Launching live Super Over match room...</p>
        </div>
      )}

      {/* STATE 4: IN MATCH SUPER OVER DUEL */}
      {matchmakingState === 'in_match' && matchRoom && opponent && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
          {/* Arena Scoreboard Header */}
          <div className="bg-[#0c1322] p-5 sm:p-6 rounded-2xl border border-[#1e293b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#D4AF37] text-black">
                  {matchRoom.currentInnings === 1 ? 'INNINGS 1' : 'INNINGS 2 (CHASE)'}
                </span>
                <span className="text-xs font-bold text-[#94a3b8]">Super Over Match</span>
              </div>
              <span className="text-xs font-mono text-[#D4AF37] font-bold">Room: {matchRoom.roomId}</span>
            </div>

            {/* Big Score Display */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-[#64748b] block">Current Score</span>
                <div className="text-3xl sm:text-4xl font-black font-mono text-white">
                  {matchRoom.runsScored} / {matchRoom.wicketsLost}
                  <span className="text-sm sm:text-base font-normal text-[#94a3b8] ml-2">({matchRoom.ballsCompleted}/6 Balls)</span>
                </div>
              </div>

              {matchRoom.currentInnings === 2 && (
                <div className="text-right">
                  <span className="text-xs uppercase font-bold text-[#64748b] block">Target Score</span>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-[#D4AF37]">
                    Need {Math.max(0, matchRoom.targetRuns - matchRoom.runsScored)} from {6 - matchRoom.ballsCompleted}
                  </div>
                </div>
              )}
            </div>

            {/* Ball Over Progress Tracker (6 Circles) */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
              {[1, 2, 3, 4, 5, 6].map(ballIndex => {
                const pastBall = matchRoom.ballHistory[ballIndex - 1];
                let bgClass = 'bg-[#05070a] border-[#1e293b] text-[#64748b]';
                let label = `${ballIndex}`;

                if (pastBall) {
                  if (pastBall.isWicket) {
                    bgClass = 'bg-rose-600 text-white font-black border-rose-500';
                    label = 'W';
                  } else if (pastBall.isSix) {
                    bgClass = 'bg-purple-600 text-white font-black border-purple-500';
                    label = '6';
                  } else if (pastBall.isBoundary) {
                    bgClass = 'bg-blue-600 text-white font-black border-blue-500';
                    label = '4';
                  } else {
                    bgClass = 'bg-emerald-600 text-white font-bold border-emerald-500';
                    label = `${pastBall.runs}`;
                  }
                }

                return (
                  <div
                    key={ballIndex}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center font-mono text-xs sm:text-sm shadow ${bgClass}`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commentary & Tactical Action Center */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-5">
            {/* Live Tension Commentary */}
            <div className="bg-[#05070a] p-3.5 rounded-xl border border-white/10 text-xs font-semibold text-[#e2e8f0]">
              <span className="text-[#D4AF37] font-black uppercase mr-2">🎙️ Commentary:</span>
              {lastCommentary}
            </div>

            {/* Tactical Choice Selection */}
            {((matchRoom.userIsBattingFirst && matchRoom.currentInnings === 1) || (!matchRoom.userIsBattingFirst && matchRoom.currentInnings === 2)) ? (
              // BATTING CONTROLS
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider font-bold text-white block">
                  Select Your Batting Shot:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'loft', label: 'Lofted Drive', desc: 'High Risk • 4/6' },
                    { id: 'power', label: 'Power Slog', desc: 'Maximum Distance' },
                    { id: 'placement', label: 'Placement Strike', desc: 'Safe 2s & Gaps' },
                    { id: 'scoop', label: 'Ramp / Scoop', desc: 'Behind Keeper' }
                  ].map(shot => (
                    <button
                      key={shot.id}
                      onClick={() => setSelectedShot(shot.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selectedShot === shot.id
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black shadow'
                          : 'bg-[#05070a] border-[#1e293b] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <span className="text-xs block">{shot.label}</span>
                      <span className="text-[9px] opacity-75 block">{shot.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // BOWLING CONTROLS
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider font-bold text-white block">
                  Select Your Bowling Delivery:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'yorker', label: 'Toe-Crusher Yorker', desc: 'High Wicket Chance' },
                    { id: 'slower', label: 'Knuckle / Slower', desc: 'Deceive Batter' },
                    { id: 'bouncer', label: 'Sharp Bouncer', desc: 'Helmet Height' },
                    { id: 'wide', label: 'Wide-Line Seam', desc: 'Out of Reach' }
                  ].map(deliv => (
                    <button
                      key={deliv.id}
                      onClick={() => setSelectedDelivery(deliv.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        selectedDelivery === deliv.id
                          ? 'bg-blue-600 text-white border-blue-500 font-black shadow'
                          : 'bg-[#05070a] border-[#1e293b] text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <span className="text-xs block">{deliv.label}</span>
                      <span className="text-[9px] opacity-75 block">{deliv.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Execute Ball Button */}
            <button
              id="btn-play-h2h-ball"
              disabled={isProcessingBall}
              onClick={handlePlayBall}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {isProcessingBall ? 'PROCESSING DELIVERY...' : 'DELIVER BALL (NEXT ACTION)'}
            </button>
          </div>
        </div>
      )}

      {/* STATE 5: POST MATCH RANK CLIMB & REWARDS */}
      {matchmakingState === 'post_match' && matchRoom && (
        <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#1e293b] shadow-2xl max-w-xl mx-auto text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-[#05070a] border-2 border-[#D4AF37] shadow-xl">
            <Trophy className="w-8 h-8 text-[#D4AF37]" />
          </div>

          <div>
            <h3 className="text-2xl font-black uppercase text-white tracking-tight">
              {matchRoom.winner === 'user' ? '🎉 SUPER OVER VICTORY!' : 'MATCH DEFEAT'}
            </h3>
            <p className="text-xs text-[#94a3b8] mt-1">
              {matchRoom.winner === 'user' ? 'You mastered the clutch pressure in the 22-yard showdown.' : 'A valiant fight to the final ball.'}
            </p>
          </div>

          {/* Rating Change Chip */}
          <div className="bg-[#05070a] p-4 rounded-xl border border-white/10 flex items-center justify-around">
            <div>
              <span className="text-[9px] uppercase font-bold text-[#64748b] block">Rating Points</span>
              <span className={`text-xl font-mono font-black ${matchRoom.winner === 'user' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {matchRoom.winner === 'user' ? '+35 RP' : '-20 RP'}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-[#64748b] block">Current Division</span>
              <span className="text-base font-black text-white">{profile.division}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-[#64748b] block">Total RP</span>
              <span className="text-base font-mono font-bold text-[#D4AF37]">{profile.ratingPoints}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePlayAgain}
              className="flex-1 py-3 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Play Again
            </button>
            <button
              onClick={() => setMatchmakingState('idle')}
              className="flex-1 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Return to H2H Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
