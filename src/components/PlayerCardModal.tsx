import React, { useState } from 'react';
import { Player } from '../types/cricket';
import { useGame } from '../context/GameContext';
import { 
  X, Award, Activity, Heart, Shield, Zap, Sparkles, 
  TrendingUp, Bookmark, Target, Check, Star, UserCheck,
  Flame, ChevronRight, Gauge, Trophy, Diamond, ArrowUpCircle
} from 'lucide-react';
import { soundFx } from '../audio/soundFx';
import { FCPlayerCard } from './fc26/FCPlayerCard';
import { getFCCardTier, getFCPlayerRatings, getPlayerPlayStylePlus } from '../engine/fc26Engine';

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

  const [activeTab, setActiveTabLocal] = useState<'attributes' | 'skillboost' | 'playstyles' | 'contract'>('attributes');
  const [selectedRank, setSelectedRank] = useState<number>(3);

  if (!player) return null;

  const tier = getFCCardTier(player);
  const ratings = getFCPlayerRatings(player);
  const playStylePlus = getPlayerPlayStylePlus(player);
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

  // Rank upgrade levels simulation
  const rankTiers = [
    { rank: 1, name: 'Rank 1 (Base)', ovrBoost: 0, cost: '0 Gems', color: 'text-slate-400' },
    { rank: 2, name: 'Rank 2 (Silver)', ovrBoost: 1, cost: '500 💎', color: 'text-slate-300' },
    { rank: 3, name: 'Rank 3 (Gold)', ovrBoost: 2, cost: '1,200 💎', color: 'text-[#D4AF37]' },
    { rank: 4, name: 'Rank 4 (Diamond)', ovrBoost: 3, cost: '2,500 💎', color: 'text-[#00E5FF]' },
    { rank: 5, name: 'Rank 5 (Master)', ovrBoost: 5, cost: '5,000 💎', color: 'text-[#00FF87]' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-lg animate-fadeIn font-sans">
      <div 
        className="relative w-full max-w-4xl bg-[#070a14] border border-[#182238] rounded-3xl shadow-2xl overflow-hidden text-[#f1f5f9] flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* TOP STATUS BAR */}
        <div className="bg-gradient-to-r from-[#0a0f1d] via-[#10192e] to-[#0a0f1d] px-6 py-3.5 border-b border-[#182238] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#00FF87]/20 text-[#00FF87] font-black text-[10px] uppercase tracking-wider border border-[#00FF87]/30 flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3" /> FC MOBILE PLAYER BIO
            </span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {tier} • {player.nationality}
            </span>
          </div>

          <button 
            id="btn-close-player-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#04060c] hover:bg-[#182238] text-slate-400 hover:text-white transition border border-[#182238] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MAIN BODY: 3D CARD LEFT + DETAILS RIGHT */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 5 COLS: 3D FC MOBILE CARD + QUICK ACTIONS */}
          <div className="lg:col-span-5 flex flex-col items-center justify-between space-y-4">
            <div className="flex justify-center w-full">
              <FCPlayerCard
                player={{
                  ...player,
                  overall: player.overall + (rankTiers[selectedRank - 1]?.ovrBoost || 0)
                }}
                size="md"
                rankLevel={selectedRank}
                skillBoost={5 + selectedRank}
              />
            </div>

            {/* Quick Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                onClick={handleToggleWatchlist}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  isWatchlisted
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-[#0a0f1d] hover:bg-[#182238] text-blue-300 border border-blue-500/30'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isWatchlisted ? 'Watchlisted' : '+ Watchlist'}</span>
              </button>

              <button
                onClick={handleToggleTarget}
                className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  isTargeted
                    ? 'bg-[#D4AF37] text-black shadow-md font-black'
                    : 'bg-[#0a0f1d] hover:bg-[#182238] text-[#D4AF37] border border-[#D4AF37]/30'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>{isTargeted ? 'Target Set' : '+ Target'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT 7 COLS: TABS & ATTRIBUTE RADAR */}
          <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
            
            {/* Header Info */}
            <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight font-heading">
                  {player.name}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {player.role} • {player.age} Years • {player.battingStyle} • {player.bowlingStyle}
                </p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">MARKET VALUE</span>
                <span className="text-base font-black text-[#00FF87]">₹{player.basePriceCr} Cr</span>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex bg-[#04060c] p-1 rounded-2xl border border-[#182238]">
              {[
                { id: 'attributes', label: 'ATTRIBUTES' },
                { id: 'skillboost', label: 'RANK & BOOST' },
                { id: 'playstyles', label: 'PLAYSTYLES+' },
                { id: 'contract', label: 'CONTRACT' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTabLocal(t.id as any)}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-[#00FF87] text-black shadow font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: ATTRIBUTES */}
            {activeTab === 'attributes' && (
              <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">FC Mobile Performance Pillars</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  
                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 font-bold uppercase">Batting Mastery</span>
                      <span className="font-mono font-black text-amber-300 text-sm">{ratings.bat}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${ratings.bat}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Power: {attrs.powerHitting}</span>
                      <span>Timing: {attrs.timing}</span>
                    </div>
                  </div>

                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-400 font-bold uppercase">Bowling Craft</span>
                      <span className="font-mono font-black text-cyan-300 text-sm">{ratings.bwl}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${ratings.bwl}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Control: {attrs.control}</span>
                      <span>Death: {attrs.deathBowling}</span>
                    </div>
                  </div>

                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 font-bold uppercase">Pace & Agility</span>
                      <span className="font-mono font-black text-emerald-300 text-sm">{ratings.spd}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${ratings.spd}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Running: {attrs.runningBetweenWickets}</span>
                      <span>Speed: {attrs.pace}</span>
                    </div>
                  </div>

                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-400 font-bold uppercase">Clutch Mentality</span>
                      <span className="font-mono font-black text-rose-300 text-sm">{ratings.clu}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-rose-400 h-full rounded-full" style={{ width: `${ratings.clu}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Under Pressure: {attrs.pressureHandling}</span>
                      <span>Captaincy: {attrs.leadership}</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB CONTENT 2: SKILL BOOST & RANK UP */}
            {activeTab === 'skillboost' && (
              <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#00FF87]">Rank Up Ascension Ladder</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select rank level to preview overall rating boosts and unlocked diamond badges.
                </p>

                <div className="space-y-2">
                  {rankTiers.map(r => (
                    <div
                      key={r.rank}
                      onClick={() => setSelectedRank(r.rank)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        selectedRank === r.rank
                          ? 'bg-[#10192e] border-[#00FF87] ring-1 ring-[#00FF87]'
                          : 'bg-[#04060c] border-[#182238] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5">
                          {[...Array(r.rank)].map((_, i) => (
                            <span key={i} className="w-2 h-2 rotate-45 rounded-[0.5px] bg-[#00FF87]" />
                          ))}
                        </div>
                        <span className={`text-xs font-black ${r.color}`}>{r.name}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="font-bold text-[#00FF87]">+{r.ovrBoost} OVR</span>
                        <span className="text-slate-400">{r.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: PLAYSTYLES+ */}
            {activeTab === 'playstyles' && (
              <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">PlayStyles+ & Traits</h4>
                
                {playStylePlus ? (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-[#04060c] border border-amber-400/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 fill-amber-300" /> {playStylePlus.name} (PlayStyle+)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-black font-mono">
                        SIGNATURE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{playStylePlus.description}</p>
                    <div className="text-xs text-[#00FF87] font-bold pt-1 border-t border-slate-800">
                      ⚡ In-Match Boost: {playStylePlus.inGameEffect}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#04060c] border border-[#182238] text-xs text-slate-400">
                    Standard PlayStyle Tier. Evolve in Academy to unlock Signature PlayStyle+.
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {(player.traits || []).map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#04060c] border border-[#182238] text-xs text-purple-300 font-bold">
                      ★ {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: CONTRACT */}
            {activeTab === 'contract' && (
              <div className="bg-[#0a0f1d] p-4 rounded-2xl border border-[#182238] space-y-3 text-xs">
                <h4 className="font-black uppercase tracking-wider text-slate-400">Franchise Contract Details</h4>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238]">
                    <span className="text-[10px] text-slate-400 block uppercase">Annual Wage</span>
                    <span className="text-base font-black text-white">₹{player.salaryCr} Cr</span>
                  </div>
                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238]">
                    <span className="text-[10px] text-slate-400 block uppercase">Contract Remaining</span>
                    <span className="text-base font-black text-[#D4AF37]">{player.contractYearsRemaining} Years</span>
                  </div>
                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238]">
                    <span className="text-[10px] text-slate-400 block uppercase">Base Auction Tag</span>
                    <span className="text-base font-black text-cyan-300">₹{player.basePriceCr} Cr</span>
                  </div>
                  <div className="bg-[#04060c] p-3 rounded-xl border border-[#182238]">
                    <span className="text-[10px] text-slate-400 block uppercase">Form Multiplier</span>
                    <span className="text-base font-black text-emerald-400">★{player.form?.toFixed(1) || '4.0'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
