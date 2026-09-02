import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';
import { 
  MultiplayerRoomState, 
  MultiplayerRanking, 
  MultiplayerAward 
} from '../../types/multiplayerAuction';
import { INITIAL_TEAMS } from '../../data/teams';
import { 
  Trophy, Award, Users, ArrowRight, Shield, 
  RotateCcw, Sparkles, Star, ExternalLink, X,
  CheckCircle2, AlertTriangle, Zap, DollarSign,
  Crown, ChevronRight, BarChart3, HelpCircle,
  Flame, Check
} from 'lucide-react';
import { soundFx } from '../../audio/soundFx';

interface MultiplayerCompletedViewProps {
  roomState: MultiplayerRoomState;
  currentUserId: string;
  onLeaveRoom: () => void;
}

export const MultiplayerCompletedView: React.FC<MultiplayerCompletedViewProps> = ({
  roomState,
  currentUserId,
  onLeaveRoom
}) => {
  const { setActiveTab, setCurrentScreen } = useGame();
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [activeTab, setActiveTabLocal] = useState<'leaderboard' | 'podium' | 'breakdown' | 'awards'>('podium');
  const [showScoreInfoModal, setShowScoreInfoModal] = useState<boolean>(false);
  const [selectedScoreBreakdownParticipant, setSelectedScoreBreakdownParticipant] = useState<MultiplayerRanking | null>(null);

  // Trigger celebratory confetti on mount
  useEffect(() => {
    try {
      soundFx.playVictory?.();
      soundFx.playCheer?.(true);
      confetti({
        particleCount: 140,
        spread: 100,
        origin: { y: 0.55 },
        colors: ['#D4AF37', '#00FF87', '#38BDF8', '#F59E0B', '#EC4899']
      });
      const timeout = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 70,
          origin: { x: 0.1, y: 0.65 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 70,
          origin: { x: 0.9, y: 0.65 }
        });
      }, 700);
      return () => clearTimeout(timeout);
    } catch {
      // ignore
    }
  }, []);

  const rankings = roomState.rankings || [];
  const awards = roomState.awards || [];
  const myRank = rankings.find(r => r.participantId === currentUserId || r.playerId === currentUserId);
  const topThree = rankings.slice(0, 3);

  const inspectedParticipant = roomState.participants.find(p => p.id === selectedParticipantId);
  const inspectedRanking = rankings.find(r => r.participantId === selectedParticipantId || r.playerId === selectedParticipantId);
  const inspectedTeam = inspectedParticipant?.franchiseId ? INITIAL_TEAMS[inspectedParticipant.franchiseId] : null;

  // Selected player for detail breakdown modal
  const activeBreakdown = selectedScoreBreakdownParticipant || (myRank || rankings[0]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fadeIn font-sans pb-20 px-2 sm:px-4">
      {/* 1. Header Banner & Victory Title */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#111827] via-[#090d16] to-[#05070a] border border-[#D4AF37]/40 shadow-2xl p-6 sm:p-10 text-center">
        {/* Glow ambient background elements */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black uppercase tracking-widest border border-[#D4AF37]/30 shadow-lg backdrop-blur-md">
            <Crown className="w-4 h-4 text-[#D4AF37] animate-bounce" />
            IPL MULTIPLAYER AUCTION RESOLUTION
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase">
            War Room Leaderboard
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            The gavel has fallen on Room <strong className="text-white font-mono">{roomState.roomCode}</strong>.
            Squads evaluated using the deterministic 100-Point Scoring Model.
          </p>

          {/* User Performance Badge */}
          {myRank && (
            <div className="pt-2">
              <div className="inline-flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-[#0c121e]/90 px-6 py-3 rounded-2xl border border-[#D4AF37]/40 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#D4AF37]" />
                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                    Your Rank:
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    #{myRank.rank} of {rankings.length}
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
                    Score:
                  </span>
                  <span className="text-lg font-black text-[#00FF87] font-mono">
                    {myRank.finalScore || myRank.auctionScore}/100
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-black uppercase text-[11px] border border-[#D4AF37]/30">
                    {myRank.rewardTitle || 'Franchise Master'}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    +{myRank.xpReward || 500} XP
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Navigation Tab Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            id="btn-tab-podium"
            onClick={() => setActiveTabLocal('podium')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'podium'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Winner Podium</span>
          </button>

          <button
            id="btn-tab-leaderboard"
            onClick={() => setActiveTabLocal('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>All Standings ({rankings.length})</span>
          </button>

          <button
            id="btn-tab-awards"
            onClick={() => setActiveTabLocal('awards')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'awards'
                ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Awards ({awards.length})</span>
          </button>
        </div>

        <button
          id="btn-scoring-rubric-info"
          onClick={() => setShowScoreInfoModal(true)}
          className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
          <span>Scoring Rules (100 Pts)</span>
        </button>
      </div>

      {/* 3. PODIUM VIEW */}
      {activeTab === 'podium' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Olympic 3-Step Podium */}
          {rankings.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 items-end">
              {/* 2nd Place (Silver) */}
              {rankings[1] && (
                <div className="order-2 md:order-1 bg-gradient-to-b from-slate-800/80 to-[#090d16] border-2 border-slate-400/50 rounded-3xl p-6 text-center space-y-4 shadow-xl transform transition hover:-translate-y-1 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-300 text-black font-black font-mono text-sm flex items-center justify-center shadow-lg border-2 border-slate-100">
                    2
                  </div>
                  
                  <div className="pt-3">
                    <div 
                      className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-black text-lg text-white shadow-xl mb-3 border border-white/20"
                      style={{ backgroundColor: rankings[1].primaryColor }}
                    >
                      {rankings[1].franchiseShort}
                    </div>
                    <h3 className="font-black text-lg text-white truncate">{rankings[1].participantName}</h3>
                    <p className="text-xs text-slate-400">{rankings[1].franchiseName}</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Auction Score:</span>
                      <span className="font-mono font-black text-slate-200 text-sm">
                        {rankings[1].finalScore || rankings[1].auctionScore}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Playing XI OVR:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {rankings[1].playingXIOverall || rankings[1].squadOvr} OVR
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Squad Count:</span>
                      <span className="font-mono text-white">{rankings[1].squadCount} Players</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-slate-400/15 text-slate-300 font-bold border border-slate-400/30">
                      {rankings[1].rewardTitle || 'Tactical Genius'}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedParticipantId(rankings[1].participantId)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Inspect Squad
                  </button>
                </div>
              )}

              {/* 1st Place (Gold Champion) */}
              {rankings[0] && (
                <div className="order-1 md:order-2 bg-gradient-to-b from-[#D4AF37]/25 via-[#1a1505] to-[#090d16] border-2 border-[#D4AF37] rounded-3xl p-7 text-center space-y-4 shadow-2xl shadow-[#D4AF37]/20 transform transition hover:-translate-y-2 relative -mt-4">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-[#D4AF37] text-black font-black text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-xl border-2 border-white/50">
                    <Crown className="w-4 h-4 fill-black" /> CHAMPION #1
                  </div>

                  <div className="pt-4">
                    <div 
                      className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl text-white shadow-2xl mb-3 border-2 border-[#D4AF37]"
                      style={{ backgroundColor: rankings[0].primaryColor }}
                    >
                      {rankings[0].franchiseShort}
                    </div>
                    <h3 className="font-black text-xl text-white truncate">{rankings[0].participantName}</h3>
                    <p className="text-xs text-[#D4AF37] font-semibold">{rankings[0].franchiseName}</p>
                  </div>

                  <div className="bg-[#05070a]/90 p-4 rounded-2xl border border-[#D4AF37]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Final Score:</span>
                      <span className="font-mono font-black text-[#00FF87] text-base">
                        {rankings[0].finalScore || rankings[0].auctionScore}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Playing XI OVR:</span>
                      <span className="font-mono font-black text-[#D4AF37] text-sm">
                        {rankings[0].playingXIOverall || rankings[0].squadOvr} OVR
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">Purse Remaining:</span>
                      <span className="font-mono text-white">₹{rankings[0].remainingPurseCr.toFixed(2)} Cr</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-black uppercase text-[11px] border border-[#D4AF37]/40 shadow">
                      🏆 {rankings[0].rewardTitle || 'Auction Grandmaster'}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedParticipantId(rankings[0].participantId)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-widest transition shadow-lg cursor-pointer"
                  >
                    View Winning Squad
                  </button>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {rankings[2] && (
                <div className="order-3 md:order-3 bg-gradient-to-b from-amber-900/30 to-[#090d16] border-2 border-amber-700/50 rounded-3xl p-6 text-center space-y-4 shadow-xl transform transition hover:-translate-y-1 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-white font-black font-mono text-sm flex items-center justify-center shadow-lg border-2 border-amber-500">
                    3
                  </div>

                  <div className="pt-3">
                    <div 
                      className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-black text-lg text-white shadow-xl mb-3 border border-white/20"
                      style={{ backgroundColor: rankings[2].primaryColor }}
                    >
                      {rankings[2].franchiseShort}
                    </div>
                    <h3 className="font-black text-lg text-white truncate">{rankings[2].participantName}</h3>
                    <p className="text-xs text-slate-400">{rankings[2].franchiseName}</p>
                  </div>

                  <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Auction Score:</span>
                      <span className="font-mono font-black text-amber-300 text-sm">
                        {rankings[2].finalScore || rankings[2].auctionScore}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Playing XI OVR:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {rankings[2].playingXIOverall || rankings[2].squadOvr} OVR
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Squad Count:</span>
                      <span className="font-mono text-white">{rankings[2].squadCount} Players</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-amber-700/20 text-amber-300 font-bold border border-amber-700/30">
                      {rankings[2].rewardTitle || 'Strategic Builder'}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedParticipantId(rankings[2].participantId)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Inspect Squad
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Summary Grid of Standings */}
          <div className="bg-[#090d16] border border-slate-800/80 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
                Full Room Evaluation Summary
              </h3>
              <button
                onClick={() => setActiveTabLocal('leaderboard')}
                className="text-xs text-[#D4AF37] hover:underline font-bold flex items-center gap-1"
              >
                <span>Full Standings Table</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rankings.map(r => (
                <div
                  key={r.participantId}
                  onClick={() => {
                    setSelectedScoreBreakdownParticipant(r);
                    setShowScoreInfoModal(true);
                  }}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    r.participantId === currentUserId
                      ? 'bg-[#111827] border-[#D4AF37]/50 shadow-md'
                      : 'bg-slate-900/50 hover:bg-slate-800/50 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 font-black font-mono text-xs flex items-center justify-center shrink-0">
                      #{r.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{r.participantName}</span>
                        {r.participantId === currentUserId && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37] font-black">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">
                        {r.franchiseShort} • {r.squadCount} Players
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-sm text-[#00FF87]">
                      {r.finalScore || r.auctionScore} pts
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {r.playingXIOverall || r.squadOvr} XI OVR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. LEADERBOARD STANDINGS TABLE */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#090d16] border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D4AF37]" /> Official Room Standings & Scores
              </h3>
              <p className="text-xs text-slate-400">
                Sorted by deterministic 100-Point Rubric (Squad Strength, Playing XI, Balance, Efficiency, Completion)
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
              {rankings.length} Teams
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">Manager & Franchise</th>
                  <th className="pb-3 text-center">Score (100)</th>
                  <th className="pb-3 text-center">Best XI OVR</th>
                  <th className="pb-3 text-center">Squad OVR</th>
                  <th className="pb-3 text-center">Players</th>
                  <th className="pb-3 text-center">Overseas</th>
                  <th className="pb-3 text-right">Purse Left</th>
                  <th className="pb-3 text-center pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rankings.map(r => {
                  const isMe = r.participantId === currentUserId || r.playerId === currentUserId;

                  return (
                    <tr 
                      key={r.participantId}
                      className={`hover:bg-slate-800/40 transition ${isMe ? 'bg-[#111827]/80 font-bold border-l-2 border-[#D4AF37]' : ''}`}
                    >
                      <td className="py-3.5 pl-2">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-xs ${
                          r.rank === 1 ? 'bg-amber-400 text-black shadow-md' :
                          r.rank === 2 ? 'bg-slate-300 text-black' :
                          r.rank === 3 ? 'bg-amber-700 text-white' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          #{r.rank}
                        </span>
                      </td>

                      <td className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shadow"
                            style={{ backgroundColor: r.primaryColor, color: r.secondaryColor }}
                          >
                            {r.franchiseShort.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{r.participantName}</span>
                              {isMe && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{r.franchiseName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-[#00FF87]/15 text-[#00FF87] font-mono font-black text-xs border border-[#00FF87]/30">
                          {r.finalScore || r.auctionScore} pts
                        </span>
                      </td>

                      <td className="py-3.5 text-center font-mono font-bold text-emerald-300">
                        {r.playingXIOverall || r.squadOvr} OVR
                      </td>

                      <td className="py-3.5 text-center font-mono text-slate-300">
                        {r.squadOvr} OVR
                      </td>

                      <td className="py-3.5 text-center font-mono text-slate-300">
                        {r.squadCount}
                      </td>

                      <td className="py-3.5 text-center font-mono text-slate-300">
                        {r.overseasCount} / {roomState.config.overseasLimit}
                      </td>

                      <td className="py-3.5 text-right font-mono font-bold text-[#D4AF37]">
                        ₹{r.remainingPurseCr.toFixed(2)} Cr
                      </td>

                      <td className="py-3.5 text-center pr-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedScoreBreakdownParticipant(r);
                              setShowScoreInfoModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#D4AF37] text-[11px] font-bold transition cursor-pointer"
                            title="View Score Breakdown"
                          >
                            Score
                          </button>
                          <button
                            onClick={() => setSelectedParticipantId(r.participantId)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white text-[11px] font-bold transition cursor-pointer"
                          >
                            Roster
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. AWARDS GALLERY */}
      {activeTab === 'awards' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-[#090d16] border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" /> Post-Auction Accolades & Honours
            </h3>
            <p className="text-xs text-slate-400">
              Special recognition for exceptional auction tactics, marquee signings, and value heists.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {awards.map((award, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-3 shadow-xl hover:border-[#D4AF37]/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{award.badge}</span>
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                        ACCOLADE
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{award.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{award.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[120px]">{award.recipientName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {award.franchiseShort}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. SCORE BREAKDOWN & RUBRIC MODAL */}
      {showScoreInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-[#D4AF37]/40 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {activeBreakdown.participantName} - Score Breakdown
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total: <strong className="text-[#00FF87] font-mono text-sm">{activeBreakdown.finalScore || activeBreakdown.auctionScore}/100 Pts</strong> • Rank #{activeBreakdown.rank}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowScoreInfoModal(false);
                  setSelectedScoreBreakdownParticipant(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs">
              {/* 5 Criteria Cards */}
              <div className="space-y-3">
                {/* 1. Squad Strength (40 pts) */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-sm">Squad Strength</span>
                    </div>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {activeBreakdown.breakdown?.squadStrengthScore ?? Math.round((activeBreakdown.squadOvr / 99) * 40)} / 40 Pts
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Average overall rating of the full roster ({activeBreakdown.squadOvr} OVR).
                  </p>
                </div>

                {/* 2. Squad Balance (20 pts) */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-white text-sm">Squad Balance & Roles</span>
                    </div>
                    <span className="font-mono font-black text-blue-400 text-sm">
                      {activeBreakdown.breakdown?.squadBalanceScore ?? 16} / 20 Pts
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Evaluates depth across Batters (≥4), Bowlers (≥4), All-rounders (≥2), Wicketkeepers (≥1), and Overseas limits.
                  </p>
                </div>

                {/* 3. Playing XI Quality (20 pts) */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#D4AF37]" />
                      <span className="font-bold text-white text-sm">Playing XI Quality</span>
                    </div>
                    <span className="font-mono font-black text-[#D4AF37] text-sm">
                      {activeBreakdown.breakdown?.playingXIQualityScore ?? 18} / 20 Pts
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Strength of the best legal 11-player lineup ({activeBreakdown.playingXIOverall || activeBreakdown.squadOvr} XI OVR, max 4 overseas).
                  </p>
                </div>

                {/* 4. Budget Efficiency (10 pts) */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-sm">Budget Efficiency</span>
                    </div>
                    <span className="font-mono font-black text-amber-400 text-sm">
                      {activeBreakdown.breakdown?.budgetEfficiencyScore ?? 8} / 10 Pts
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Performance quality acquired per ₹ Cr invested without leaving crippling unspent capital.
                  </p>
                </div>

                {/* 5. Squad Completion (10 pts) */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white text-sm">Squad Completion</span>
                    </div>
                    <span className="font-mono font-black text-purple-400 text-sm">
                      {activeBreakdown.breakdown?.squadCompletionScore ?? 10} / 10 Pts
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Reaching roster requirements ({activeBreakdown.squadCount} players bought).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. SQUAD INSPECTION MODAL */}
      {inspectedParticipant && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090d16] border border-[#1e293b] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-3">
                {inspectedTeam ? (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow"
                    style={{ backgroundColor: inspectedTeam.primaryColor, color: inspectedTeam.secondaryColor }}
                  >
                    {inspectedTeam.shortName}
                  </div>
                ) : (
                  <Users className="w-8 h-8 text-emerald-400" />
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                    {inspectedParticipant.name} ({inspectedTeam?.name || 'Franchise'}) Final Roster
                  </h3>
                  <p className="text-xs text-slate-400">
                    {inspectedParticipant.squadPlayers.length} Signings • Score: <strong className="text-[#00FF87] font-mono">{inspectedRanking?.finalScore || inspectedRanking?.auctionScore || 85} pts</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedParticipantId(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {inspectedParticipant.squadPlayers.map(p => (
                  <div 
                    key={p.id}
                    className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-mono font-black text-xs text-white border border-slate-700">
                        {p.overall}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[130px]">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.role} {p.isOverseas && '✈️'}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-[#D4AF37]">
                      ₹{(p.salaryCr || p.basePriceCr).toFixed(2)} Cr
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Return to Lounge Action */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
        <button
          id="btn-multiplayer-view-global-ranks"
          onClick={() => {
            setCurrentScreen('Dashboard');
            setActiveTab('Leaderboard');
            window.history.pushState({}, '', '/leaderboard');
          }}
          className="px-8 py-4 rounded-2xl bg-[#00FF87] hover:brightness-110 text-black font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition transform active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View Global Rank</span>
        </button>
        <button
          id="btn-multiplayer-return-lounge"
          onClick={onLeaveRoom}
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:brightness-110 text-black font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2.5 cursor-pointer transition transform active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Multiplayer Lounge</span>
        </button>
      </div>
    </div>
  );
};
