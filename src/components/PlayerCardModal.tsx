import React, { useState } from 'react';
import { Player } from '../types/cricket';
import { useGame } from '../context/GameContext';
import { 
  X, Award, Activity, Heart, Shield, Zap, Sparkles, 
  TrendingUp, Bookmark, Target, Check, Star, UserCheck
} from 'lucide-react';
import { soundFx } from '../audio/soundFx';

interface Props {
  player: Player | null;
  onClose: () => void;
}

export const PlayerCardModal: React.FC<Props> = ({ player, onClose }) => {
  const { 
    gameState, 
    addToWatchlist, 
    removeFromWatchlist, 
    toggleAuctionTarget, 
    setActiveTab, 
    setCurrentScreen 
  } = useGame();

  const [activeTab, setActiveTabLocal] = useState<'profile' | 'batting' | 'bowling' | 'scout'>('profile');

  if (!player) return null;

  const attrs = player.attributes;
  const isWatchlisted = (gameState?.scouting?.watchlist || []).some(w => w.playerId === player.id);
  const isTargeted = (gameState?.scouting?.auctionTargets || []).includes(player.id);

  const handleToggleWatchlist = () => {
    if (isWatchlisted) {
      removeFromWatchlist(player.id);
    } else {
      addToWatchlist(player.id, 'Shortlisted from player card');
      soundFx.playHammerKnock();
    }
  };

  const handleToggleTarget = () => {
    toggleAuctionTarget(player.id);
    soundFx.playHammerKnock();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
      <div 
        className="relative w-full max-w-2xl bg-[#080d18] border border-[#1e293b] rounded-3xl shadow-2xl overflow-hidden text-[#e2e8f0] flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* CARD TOP PRESENTATION HEADER */}
        <div className="relative bg-gradient-to-r from-[#0f172a] via-[#131d35] to-[#0b1222] p-5 sm:p-6 border-b border-[#1e293b]">
          <div className="flex items-start justify-between gap-4">
            
            {/* OVR Rating Badge & Player Hero */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-600 p-0.5 shadow-xl flex flex-col items-center justify-center text-black shrink-0">
                <div className="w-full h-full bg-[#0c1322] rounded-2xl flex flex-col items-center justify-center border border-[#D4AF37]/50">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-[#D4AF37] leading-none">
                    {player.overall}
                  </span>
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#94a3b8] mt-0.5">
                    OVR
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight">
                    {player.name}
                  </h2>
                  {player.isOverseas ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      ✈️ {player.nationality}
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      🇮🇳 Domestic
                    </span>
                  )}
                  {player.isYouthProspect && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Wonderkid
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#94a3b8] mt-1 font-semibold">
                  {player.role} • {player.age} yrs • {player.battingStyle} • {player.bowlingStyle}
                </p>

                <div className="flex items-center gap-3 text-xs mt-2 font-mono">
                  <span className="text-[#94a3b8]">Base: <strong className="text-white">₹{player.basePriceCr} Cr</strong></span>
                  <span className="text-[#94a3b8]">Salary: <strong className="text-emerald-400">₹{player.salaryCr} Cr</strong></span>
                  <span className="text-[#94a3b8]">Contract: <strong className="text-[#D4AF37]">{player.contractYearsRemaining}Y</strong></span>
                </div>
              </div>
            </div>

            {/* Close Modal Button */}
            <button 
              id="btn-close-player-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#05070a] hover:bg-[#1e293b] text-[#94a3b8] hover:text-white transition border border-[#1e293b] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Bar on Card */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 flex-wrap">
            <button
              onClick={handleToggleWatchlist}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                isWatchlisted
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-[#0a0f1d] hover:bg-[#1e293b] text-blue-300 border border-blue-500/30'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
            </button>

            <button
              onClick={handleToggleTarget}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                isTargeted
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'bg-[#0a0f1d] hover:bg-[#1e293b] text-[#D4AF37] border border-[#D4AF37]/30'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isTargeted ? 'Auction Target' : 'Target for Auction'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1e293b] bg-[#060a12] px-5">
          {[
            { id: 'profile', label: 'Attributes & Status' },
            { id: 'batting', label: 'Batting Mastery' },
            { id: 'bowling', label: 'Bowling & Fielding' },
            { id: 'scout', label: 'Scout Analysis' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabLocal(tab.id as any)}
              className={`py-2.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-[#64748b] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB: PROFILE & STATUS */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Form & Fitness Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0e1628] p-3 rounded-2xl border border-[#1e293b]">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Form</span>
                    <span className="font-bold text-white">{player.form}/5 ★</span>
                  </div>
                  <div className="w-full bg-[#05070a] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(player.form / 5) * 100}%` }} />
                  </div>
                </div>

                <div className="bg-[#0e1628] p-3 rounded-2xl border border-[#1e293b]">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> Fitness</span>
                    <span className="font-bold text-white">{player.fitness}%</span>
                  </div>
                  <div className="w-full bg-[#05070a] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${player.fitness}%` }} />
                  </div>
                </div>

                <div className="bg-[#0e1628] p-3 rounded-2xl border border-[#1e293b]">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1">
                    <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-[#D4AF37]" /> Morale</span>
                    <span className="font-bold text-white">{player.confidence}%</span>
                  </div>
                  <div className="w-full bg-[#05070a] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#D4AF37] h-1.5 rounded-full" style={{ width: `${player.confidence}%` }} />
                  </div>
                </div>

                <div className="bg-[#0e1628] p-3 rounded-2xl border border-[#1e293b]">
                  <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1">
                    <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-purple-400" /> Potential</span>
                    <span className="font-bold text-purple-300">{player.potential} OVR</span>
                  </div>
                  <div className="w-full bg-[#05070a] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${player.potential}%` }} />
                  </div>
                </div>
              </div>

              {/* Season Stats Summary */}
              <div className="bg-[#0e1628] p-4 rounded-2xl border border-[#1e293b]">
                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Season T20 Performance
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="bg-[#060a12] p-2.5 rounded-xl border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[9px] uppercase font-bold">Matches</span>
                    <span className="font-black text-white font-mono text-sm">{player.stats.matches}</span>
                  </div>
                  <div className="bg-[#060a12] p-2.5 rounded-xl border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[9px] uppercase font-bold">Runs</span>
                    <span className="font-black text-[#D4AF37] font-mono text-sm">{player.stats.runs}</span>
                  </div>
                  <div className="bg-[#060a12] p-2.5 rounded-xl border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[9px] uppercase font-bold">High Score</span>
                    <span className="font-black text-white font-mono text-sm">{player.stats.highestScore}</span>
                  </div>
                  <div className="bg-[#060a12] p-2.5 rounded-xl border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[9px] uppercase font-bold">Wickets</span>
                    <span className="font-black text-blue-400 font-mono text-sm">{player.stats.wickets}</span>
                  </div>
                  <div className="bg-[#060a12] p-2.5 rounded-xl border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[9px] uppercase font-bold">Catches</span>
                    <span className="font-black text-white font-mono text-sm">{player.stats.catches}</span>
                  </div>
                  <div className="bg-[#060a12] p-2.5 rounded-xl border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[9px] uppercase font-bold">POTM</span>
                    <span className="font-black text-purple-400 font-mono text-sm">{player.stats.manOfTheMatchCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BATTING MASTERY */}
          {activeTab === 'batting' && (
            <div className="bg-[#0e1628] p-5 rounded-2xl border border-[#1e293b] space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#D4AF37]" /> Batting Rating: {player.battingRating}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <AttrBar label="Power Hitting" val={attrs.power} />
                <AttrBar label="Boundary Striking" val={attrs.boundaryAbility} />
                <AttrBar label="Strike Rotation" val={attrs.strikeRotation} />
                <AttrBar label="Pace Hitting" val={attrs.paceAbility} />
                <AttrBar label="Spin Hitting" val={attrs.spinAbility} />
                <AttrBar label="Powerplay Batting" val={attrs.powerplayBatting} />
                <AttrBar label="Death Over Slogging" val={attrs.deathOverBatting} />
                <AttrBar label="Finishing & Clutch" val={attrs.finishing} />
                <AttrBar label="Chasing Pressure" val={attrs.chasingAbility} />
              </div>
            </div>
          )}

          {/* TAB: BOWLING & FIELDING */}
          {activeTab === 'bowling' && (
            <div className="bg-[#0e1628] p-5 rounded-2xl border border-[#1e293b] space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" /> Bowling Rating: {player.bowlingRating}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                <AttrBar label="Accuracy & Line" val={attrs.accuracy} />
                <AttrBar label="Wicket Taking Impact" val={attrs.wicketTaking} />
                <AttrBar label="Death Yorker Spec" val={attrs.deathBowling} />
                <AttrBar label="Powerplay Swing" val={attrs.powerplayBowling} />
                <AttrBar label="Economy Control" val={attrs.economy} />
                <AttrBar label="Fielding & Reflexes" val={attrs.fielding} />
              </div>
            </div>
          )}

          {/* TAB: SCOUT ANALYSIS */}
          {activeTab === 'scout' && (
            <div className="bg-[#0e1628] p-5 rounded-2xl border border-[#1e293b] space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">
                  Tactical Scout Evaluation
                </h4>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {player.overall >= 88 
                    ? `${player.name} is a marquee IPL franchise pillar with unmatched match-winning pedigree.`
                    : player.potential >= 85
                    ? `${player.name} is a high-ceiling prodigy with prime upside for multi-year franchise development.`
                    : `${player.name} provides vital depth and reliable situational role execution.`}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#060a12] border border-[#1e293b] flex items-center justify-between text-xs">
                <span className="text-[#94a3b8]">Estimated Auction Value:</span>
                <span className="text-[#D4AF37] font-mono font-black text-sm">₹{Math.max(player.basePriceCr, Number((player.basePriceCr * (player.overall / 70)).toFixed(2)))} Cr</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const AttrBar: React.FC<{ label: string; val: number }> = ({ label, val }) => {
  const getColor = (v: number) => {
    if (v >= 90) return 'bg-[#D4AF37] text-[#D4AF37]';
    if (v >= 80) return 'bg-emerald-400 text-emerald-300';
    if (v >= 65) return 'bg-blue-400 text-blue-300';
    return 'bg-[#64748b] text-[#94a3b8]';
  };

  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-[#94a3b8] font-semibold">{label}</span>
        <span className={`font-mono font-black ${getColor(val).split(' ')[1]}`}>{val}</span>
      </div>
      <div className="w-full bg-[#05070a] rounded-full h-1.5 border border-[#1e293b]">
        <div className={`h-1.5 rounded-full ${getColor(val).split(' ')[0]}`} style={{ width: `${Math.min(100, val)}%` }} />
      </div>
    </div>
  );
};
