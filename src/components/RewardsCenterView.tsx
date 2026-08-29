import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Award, Trophy, Flame, Shield, Check, 
  Crown, Star, CheckCircle2, Gift, Sparkles, ChevronRight
} from 'lucide-react';
import { ObjectiveItem, AchievementItem } from '../types/franchise';
import { INITIAL_OBJECTIVES, INITIAL_ACHIEVEMENTS } from '../engine/progressionEngine';
import { soundFx } from '../audio/soundFx';

export const RewardsCenterView: React.FC = () => {
  const { gameState, setGameState } = useGame();
  const [activeCategory, setActiveCategory] = useState<'daily' | 'weekly' | 'season' | 'achievements'>('daily');
  const [rewardClaimAlert, setRewardClaimAlert] = useState<string | null>(null);

  if (!gameState) return null;

  const progression = gameState.progression;
  const objectives: ObjectiveItem[] = progression?.objectives || INITIAL_OBJECTIVES;
  const achievements: AchievementItem[] = progression?.achievements || INITIAL_ACHIEVEMENTS;

  const filteredObjectives = objectives.filter(o => o.category === activeCategory);
  const claimableCount = objectives.filter(o => o.isCompleted && !o.isClaimed).length;

  const handleClaimObjective = (objId: string) => {
    const obj = objectives.find(o => o.id === objId);
    if (!obj || !obj.isCompleted || obj.isClaimed) return;

    const updatedObjectives = objectives.map(o => {
      if (o.id === objId) {
        return { ...o, isClaimed: true };
      }
      return o;
    });

    const newXp = (progression?.xp || 0) + obj.rewardXp;
    const newCoins = Number(((progression?.clubBudgetCr || 8.5) + obj.rewardCoinsCr).toFixed(2));
    const newTokens = (progression?.scoutTokens || 5) + obj.rewardScoutTokens;

    const updatedProgression = {
      ...(progression || {}),
      xp: newXp,
      level: progression?.level || 1,
      xpToNextLevel: progression?.xpToNextLevel || 500,
      scoutTokens: newTokens,
      clubBudgetCr: newCoins,
      facilities: progression?.facilities || {},
      staff: progression?.staff || [],
      objectives: updatedObjectives,
      achievements: progression?.achievements || [],
      rivalries: progression?.rivalries || {},
      unclaimedRewardsCount: Math.max(0, (progression?.unclaimedRewardsCount || 1) - 1)
    };

    setGameState({
      ...gameState,
      progression: updatedProgression
    });

    soundFx.playCheer(true);
    setRewardClaimAlert(`Claimed! +${obj.rewardXp} XP, +₹${obj.rewardCoinsCr} Cr Budget, +${obj.rewardScoutTokens} Scout Tokens!`);
    setTimeout(() => setRewardClaimAlert(null), 3500);
  };

  const handleClaimAll = () => {
    const claimable = objectives.filter(o => o.isCompleted && !o.isClaimed);
    if (claimable.length === 0) return;

    let totalXp = 0;
    let totalCoins = 0;
    let totalTokens = 0;

    const updatedObjectives = objectives.map(o => {
      if (o.isCompleted && !o.isClaimed) {
        totalXp += o.rewardXp;
        totalCoins += o.rewardCoinsCr;
        totalTokens += o.rewardScoutTokens;
        return { ...o, isClaimed: true };
      }
      return o;
    });

    const newXp = (progression?.xp || 0) + totalXp;
    const newCoins = Number(((progression?.clubBudgetCr || 8.5) + totalCoins).toFixed(2));
    const newTokens = (progression?.scoutTokens || 5) + totalTokens;

    const updatedProgression = {
      ...(progression || {}),
      xp: newXp,
      level: progression?.level || 1,
      xpToNextLevel: progression?.xpToNextLevel || 500,
      scoutTokens: newTokens,
      clubBudgetCr: newCoins,
      facilities: progression?.facilities || {},
      staff: progression?.staff || [],
      objectives: updatedObjectives,
      achievements: progression?.achievements || [],
      rivalries: progression?.rivalries || {},
      unclaimedRewardsCount: 0
    };

    setGameState({
      ...gameState,
      progression: updatedProgression
    });

    soundFx.playCheer(true);
    setRewardClaimAlert(`Claimed All Rewards! +${totalXp} XP, +₹${totalCoins.toFixed(2)} Cr Budget, +${totalTokens} Tokens!`);
    setTimeout(() => setRewardClaimAlert(null), 3500);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Rewards Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0a0c12] p-4 rounded-xl border border-[#1e293b]">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#D4AF37]" />
            <span>Objectives & Reward Center</span>
          </h2>
          <p className="text-xs text-[#94a3b8]">Complete daily matchday tasks, weekly milestones, and achievements to unlock XP and budget.</p>
        </div>

        {claimableCount > 0 && (
          <button
            onClick={handleClaimAll}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-500 text-black font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-lg shadow-[#D4AF37]/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-black" />
            <span>Claim All Rewards ({claimableCount})</span>
          </button>
        )}
      </div>

      {/* Claim Alert */}
      {rewardClaimAlert && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{rewardClaimAlert}</span>
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'daily', label: 'Daily Objectives', icon: Flame },
          { id: 'weekly', label: 'Weekly Milestones', icon: Shield },
          { id: 'season', label: 'Season Quests', icon: Crown },
          { id: 'achievements', label: 'Achievements', icon: Trophy }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          const count = tab.id !== 'achievements' 
            ? objectives.filter(o => o.category === tab.id && o.isCompleted && !o.isClaimed).length
            : 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                isActive 
                  ? 'bg-[#D4AF37] text-black font-black shadow-lg shadow-[#D4AF37]/15' 
                  : 'bg-[#0f172a] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border border-[#1e293b]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[10px] flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* OBJECTIVES LIST */}
      {activeCategory !== 'achievements' ? (
        <div className="space-y-3">
          {filteredObjectives.map(obj => {
            const pct = Math.min(100, Math.round((obj.progress / obj.target) * 100));

            return (
              <div 
                key={obj.id}
                className={`bg-[#0f172a] rounded-2xl p-5 border transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  obj.isCompleted && !obj.isClaimed
                    ? 'border-[#D4AF37] bg-gradient-to-r from-amber-500/10 to-[#0f172a]'
                    : obj.isClaimed
                    ? 'border-[#1e293b] opacity-60'
                    : 'border-[#1e293b]'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">{obj.title}</h3>
                    {obj.isClaimed ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-[#64748b]">Claimed</span>
                    ) : obj.isCompleted ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ready to Claim</span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-[#64748b]">{obj.progress} / {obj.target}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8]">{obj.description}</p>

                  {/* Progress Bar */}
                  <div className="h-1.5 bg-[#05070a] rounded-full overflow-hidden max-w-md">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        obj.isCompleted ? 'bg-emerald-400' : 'bg-[#D4AF37]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Rewards & Claim Button */}
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs">
                    <p className="font-mono font-bold text-[#D4AF37]">+{obj.rewardXp} XP</p>
                    <p className="text-[10px] font-mono text-[#64748b]">+₹{obj.rewardCoinsCr} Cr • +{obj.rewardScoutTokens} Token</p>
                  </div>

                  <button
                    disabled={!obj.isCompleted || obj.isClaimed}
                    onClick={() => handleClaimObjective(obj.id)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                      obj.isClaimed
                        ? 'bg-[#1e293b] text-[#64748b] cursor-not-allowed'
                        : obj.isCompleted
                        ? 'bg-[#D4AF37] hover:bg-amber-400 text-black font-black active:scale-95 shadow-lg shadow-[#D4AF37]/20'
                        : 'bg-[#1e293b] text-[#94a3b8] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {obj.isClaimed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Claimed</span>
                      </>
                    ) : (
                      <span>Claim</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ACHIEVEMENTS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map(ach => (
            <div 
              key={ach.id}
              className={`bg-[#0f172a] rounded-2xl p-5 border transition shadow-xl space-y-3 ${
                ach.isUnlocked ? 'border-[#D4AF37]/50' : 'border-[#1e293b] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#64748b] tracking-wider px-2 py-0.5 rounded-full bg-[#05070a]">
                  {ach.category}
                </span>
                <span className="text-xs font-mono font-bold text-[#D4AF37]">+{ach.rewardXp} XP</span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white mb-1 flex items-center gap-2">
                  <Trophy className={`w-4 h-4 ${ach.isUnlocked ? 'text-[#D4AF37]' : 'text-[#64748b]'}`} />
                  <span>{ach.title}</span>
                </h4>
                <p className="text-xs text-[#94a3b8]">{ach.description}</p>
              </div>

              <div className="pt-2 border-t border-[#1e293b] flex items-center justify-between text-xs">
                <span className={ach.isUnlocked ? 'text-emerald-400 font-bold' : 'text-[#64748b]'}>
                  {ach.isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
