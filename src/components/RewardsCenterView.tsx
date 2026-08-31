import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Award, Trophy, Flame, Shield, Check, 
  Crown, Star, CheckCircle2, Gift, Sparkles, ChevronRight,
  Zap, Package, Lock, Timer, RotateCw, Gem, Coins, ArrowUpRight
} from 'lucide-react';
import { ObjectiveItem, AchievementItem } from '../types/franchise';
import { INITIAL_OBJECTIVES, INITIAL_ACHIEVEMENTS } from '../engine/progressionEngine';
import { soundFx } from '../audio/soundFx';

interface DailyStreakDay {
  day: number;
  label: string;
  rewardType: 'coins' | 'xp' | 'pack' | 'tokens' | 'marquee';
  amountText: string;
  isClaimed: boolean;
  isToday: boolean;
}

const INITIAL_STREAK_DAYS: DailyStreakDay[] = [
  { day: 1, label: 'Day 1', rewardType: 'coins', amountText: '₹2.0 Cr', isClaimed: true, isToday: false },
  { day: 2, label: 'Day 2', rewardType: 'xp', amountText: '500 XP', isClaimed: true, isToday: false },
  { day: 3, label: 'Day 3', rewardType: 'tokens', amountText: '5 Scout Tokens', isClaimed: false, isToday: true },
  { day: 4, label: 'Day 4', rewardType: 'coins', amountText: '₹5.0 Cr', isClaimed: false, isToday: false },
  { day: 5, label: 'Day 5', rewardType: 'pack', amountText: 'Elite Gold Pack', isClaimed: false, isToday: false },
  { day: 6, label: 'Day 6', rewardType: 'xp', amountText: '1,500 XP', isClaimed: false, isToday: false },
  { day: 7, label: 'Day 7', rewardType: 'marquee', amountText: 'Walkout Star + ₹10 Cr', isClaimed: false, isToday: false }
];

export const RewardsCenterView: React.FC = () => {
  const { gameState, setGameState } = useGame();
  const [activeCategory, setActiveCategory] = useState<'streak' | 'daily' | 'weekly' | 'season' | 'pass' | 'achievements'>('streak');
  const [rewardClaimAlert, setRewardClaimAlert] = useState<string | null>(null);
  const [streakDays, setStreakDays] = useState<DailyStreakDay[]>(INITIAL_STREAK_DAYS);
  const [mysteryPackOpening, setMysteryPackOpening] = useState<boolean>(false);
  const [mysteryPackReward, setMysteryPackReward] = useState<{ title: string; desc: string; type: string } | null>(null);

  if (!gameState) return null;

  const progression = gameState.progression;
  const objectives: ObjectiveItem[] = progression?.objectives || INITIAL_OBJECTIVES;
  const achievements: AchievementItem[] = progression?.achievements || INITIAL_ACHIEVEMENTS;

  const filteredObjectives = objectives.filter(o => o.category === activeCategory);
  const claimableCount = objectives.filter(o => o.isCompleted && !o.isClaimed).length;

  const handleClaimStreakToday = () => {
    const todayIndex = streakDays.findIndex(s => s.isToday && !s.isClaimed);
    if (todayIndex === -1) return;

    const updated = [...streakDays];
    updated[todayIndex].isClaimed = true;
    setStreakDays(updated);

    const newCoins = Number(((progression?.clubBudgetCr || 8.5) + 3.0).toFixed(2));
    const newXp = (progression?.xp || 0) + 600;
    const newTokens = (progression?.scoutTokens || 5) + 5;

    const updatedProgression = {
      ...(progression || {}),
      xp: newXp,
      level: progression?.level || 1,
      xpToNextLevel: progression?.xpToNextLevel || 500,
      scoutTokens: newTokens,
      clubBudgetCr: newCoins,
      facilities: progression?.facilities || {},
      staff: progression?.staff || [],
      objectives: progression?.objectives || [],
      achievements: progression?.achievements || [],
      rivalries: progression?.rivalries || {},
      unclaimedRewardsCount: Math.max(0, (progression?.unclaimedRewardsCount || 1) - 1)
    };

    setGameState({
      ...gameState,
      progression: updatedProgression
    });

    soundFx.playCheer(true);
    setRewardClaimAlert('Day 3 Streak Claimed! +5 Scout Tokens, +600 XP & ₹3.0 Cr added to franchise!');
    setTimeout(() => setRewardClaimAlert(null), 4000);
  };

  const handleOpenMysteryPack = () => {
    if (mysteryPackOpening) return;
    setMysteryPackOpening(true);
    soundFx.playHammerKnock(true);

    setTimeout(() => {
      soundFx.playCheer(true);
      const possibleDrops = [
        { title: '⚡ Marquee Evolution Card + ₹5.0 Cr', desc: 'Instant +3 OVR upgrade token applied to squad!', type: 'marquee' },
        { title: '💎 1,200 XP Franchise Boost', desc: 'Leveled up your manager reputation and VIP standing!', type: 'xp' },
        { title: '🔥 8 Scout Tokens & 100% Match Stamina', desc: 'Unlocked elite international scouting reports!', type: 'scout' }
      ];
      const drop = possibleDrops[Math.floor(Math.random() * possibleDrops.length)];
      setMysteryPackReward(drop);
      setMysteryPackOpening(false);
    }, 1400);
  };

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
      {/* Rewards Header Banner */}
      <div className="bg-gradient-to-r from-[#090e1a] via-[#10192e] to-[#090e1a] p-6 rounded-3xl border border-[#141d2e] shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#00FF87]/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-black uppercase tracking-wider">
                FC 26 VIP Vault
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Streak: <strong className="text-[#00FF87]">3 Days Active</strong>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
              <Gift className="w-7 h-7 text-[#D4AF37]" />
              <span>Rewards & Retention Vault</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Claim daily login bonuses, unpack mystery walkouts, level up your season battle pass, and complete tactical objectives.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {claimableCount > 0 && (
              <button
                id="btn-claim-all-rewards"
                onClick={handleClaimAll}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#00FF87] to-emerald-400 text-black font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-lg shadow-[#00FF87]/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Claim All ({claimableCount})</span>
              </button>
            )}

            <button
              id="btn-open-mystery-pack"
              onClick={handleOpenMysteryPack}
              disabled={mysteryPackOpening}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:brightness-110 text-black font-black uppercase text-xs tracking-wider flex items-center gap-2 hover:scale-105 active:scale-95 transition shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Package className={`w-4 h-4 ${mysteryPackOpening ? 'animate-bounce' : ''}`} />
              <span>{mysteryPackOpening ? 'Unpacking Walkout...' : 'Free Daily Pack'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Claim Alert Toast */}
      {rewardClaimAlert && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{rewardClaimAlert}</span>
          </div>
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Mystery Pack Opened Modal / Banner */}
      {mysteryPackReward && (
        <div className="p-6 bg-gradient-to-r from-amber-950/60 via-[#10192e] to-amber-950/60 rounded-3xl border-2 border-[#D4AF37] shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#D4AF37] font-black text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Walkout Pack Unlocked!</span>
            </div>
            <button 
              onClick={() => setMysteryPackReward(null)}
              className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <h3 className="text-xl font-black text-white">{mysteryPackReward.title}</h3>
          <p className="text-xs text-slate-300">{mysteryPackReward.desc}</p>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#141d2e] pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: 'streak', label: '7-Day Streak', icon: Flame },
          { id: 'pass', label: 'VIP Season Pass', icon: Crown },
          { id: 'daily', label: 'Daily Objectives', icon: Zap },
          { id: 'weekly', label: 'Weekly Milestones', icon: Shield },
          { id: 'season', label: 'Season Quests', icon: Trophy },
          { id: 'achievements', label: 'Achievements', icon: Star }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          const count = tab.id !== 'achievements' && tab.id !== 'streak' && tab.id !== 'pass'
            ? objectives.filter(o => o.category === tab.id && o.isCompleted && !o.isClaimed).length
            : 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shrink-0 ${
                isActive 
                  ? 'bg-[#00FF87] text-black font-black shadow-lg shadow-[#00FF87]/20' 
                  : 'bg-[#090e1a] text-slate-400 hover:text-white hover:bg-[#121c2e] border border-[#141d2e]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. 7-DAY STREAK TAB */}
      {activeCategory === 'streak' && (
        <div className="space-y-6">
          <div className="bg-[#090e1a] p-6 rounded-3xl border border-[#141d2e] space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <span>Daily Login Streak Ladder</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Log in every day to claim compounding budget, scout tokens, and guaranteed Walkout packs!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">Current Multiplier:</span>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-black text-xs">
                  1.5x Multiplier
                </span>
              </div>
            </div>

            {/* Streak Days Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {streakDays.map(item => (
                <div
                  key={item.day}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition space-y-3 relative ${
                    item.isClaimed
                      ? 'bg-[#04060c] border-[#141d2e] opacity-70'
                      : item.isToday
                      ? 'bg-gradient-to-b from-[#10192e] to-[#0a0f1d] border-[#00FF87] shadow-xl shadow-[#00FF87]/15 ring-2 ring-[#00FF87]/30'
                      : 'bg-[#060912] border-[#141d2e]'
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold">
                    <span>{item.label}</span>
                    {item.isClaimed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-[#090e1a] border border-[#141d2e] flex items-center justify-center text-xl shadow-inner">
                    {item.rewardType === 'coins' && '💰'}
                    {item.rewardType === 'xp' && '⭐'}
                    {item.rewardType === 'tokens' && '🎟️'}
                    {item.rewardType === 'pack' && '📦'}
                    {item.rewardType === 'marquee' && '👑'}
                  </div>

                  <div>
                    <div className="font-mono font-bold text-xs text-white truncate w-full">
                      {item.amountText}
                    </div>
                  </div>

                  {item.isToday && !item.isClaimed ? (
                    <button
                      id="btn-claim-today-streak"
                      onClick={handleClaimStreakToday}
                      className="w-full py-2 rounded-xl bg-[#00FF87] hover:bg-[#00e57a] text-black font-black text-[11px] uppercase tracking-wider transition cursor-pointer shadow-md"
                    >
                      Claim
                    </button>
                  ) : item.isClaimed ? (
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Claimed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. VIP SEASON PASS TAB */}
      {activeCategory === 'pass' && (
        <div className="bg-[#090e1a] p-6 rounded-3xl border border-[#141d2e] space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Season 1: Dynasty Battle Pass (Tier 6 / 30)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Earn XP in matches, auctions, and squad building to unlock elite rewards.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-[#00FF87]">3,450 / 5,000 XP</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">To Tier 7</div>
            </div>
          </div>

          {/* Progress Line */}
          <div className="h-2 bg-[#04060c] rounded-full overflow-hidden border border-[#141d2e]">
            <div className="h-full bg-gradient-to-r from-[#00FF87] to-amber-400 rounded-full" style={{ width: '69%' }} />
          </div>

          {/* Tier Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { tier: 5, reward: '₹5 Cr Franchise Grant', status: 'Claimed', unlocked: true },
              { tier: 6, reward: 'Elite Batsman Evo Card', status: 'Ready to Claim', unlocked: true },
              { tier: 7, reward: '10 Scout Tokens', status: 'Locked (1,550 XP needed)', unlocked: false },
              { tier: 8, reward: 'Marquee Walkout Pack', status: 'Locked (3,550 XP needed)', unlocked: false }
            ].map(t => (
              <div
                key={t.tier}
                className={`p-4 rounded-2xl border space-y-3 ${
                  t.status === 'Ready to Claim'
                    ? 'bg-[#10192e] border-[#00FF87] shadow-lg shadow-[#00FF87]/10'
                    : t.unlocked
                    ? 'bg-[#04060c] border-[#141d2e] opacity-70'
                    : 'bg-[#060912] border-[#141d2e] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#D4AF37]">Tier {t.tier}</span>
                  {t.unlocked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
                </div>
                <div className="font-black text-sm text-white">{t.reward}</div>
                <div className="text-[11px] text-slate-400">{t.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. STANDARD OBJECTIVES LIST (Daily, Weekly, Season) */}
      {(activeCategory === 'daily' || activeCategory === 'weekly' || activeCategory === 'season') && (
        <div className="space-y-3">
          {filteredObjectives.map(obj => {
            const pct = Math.min(100, Math.round((obj.progress / obj.target) * 100));

            return (
              <div 
                key={obj.id}
                className={`bg-[#090e1a] rounded-2xl p-5 border transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  obj.isCompleted && !obj.isClaimed
                    ? 'border-[#00FF87] bg-gradient-to-r from-emerald-950/20 to-[#090e1a]'
                    : obj.isClaimed
                    ? 'border-[#141d2e] opacity-60'
                    : 'border-[#141d2e]'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">{obj.title}</h3>
                    {obj.isClaimed ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Claimed</span>
                    ) : obj.isCompleted ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ready to Claim</span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-slate-500">{obj.progress} / {obj.target}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{obj.description}</p>

                  {/* Progress Bar */}
                  <div className="h-1.5 bg-[#04060c] rounded-full overflow-hidden max-w-md">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        obj.isCompleted ? 'bg-emerald-400' : 'bg-[#00FF87]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Rewards & Claim Button */}
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs">
                    <p className="font-mono font-bold text-[#00FF87]">+{obj.rewardXp} XP</p>
                    <p className="text-[10px] font-mono text-slate-400">+₹{obj.rewardCoinsCr} Cr • +{obj.rewardScoutTokens} Token</p>
                  </div>

                  <button
                    disabled={!obj.isCompleted || obj.isClaimed}
                    onClick={() => handleClaimObjective(obj.id)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                      obj.isClaimed
                        ? 'bg-[#141d2e] text-slate-500 cursor-not-allowed'
                        : obj.isCompleted
                        ? 'bg-[#00FF87] hover:bg-[#00e57a] text-black font-black active:scale-95 shadow-lg shadow-[#00FF87]/20'
                        : 'bg-[#141d2e] text-slate-500 opacity-50 cursor-not-allowed'
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
      )}

      {/* 4. ACHIEVEMENTS GRID */}
      {activeCategory === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map(ach => (
            <div 
              key={ach.id}
              className={`bg-[#090e1a] rounded-2xl p-5 border transition shadow-xl space-y-3 ${
                ach.isUnlocked ? 'border-[#00FF87]/50' : 'border-[#141d2e] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 py-0.5 rounded-full bg-[#04060c]">
                  {ach.category}
                </span>
                <span className="text-xs font-mono font-bold text-[#00FF87]">+{ach.rewardXp} XP</span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white mb-1 flex items-center gap-2">
                  <Trophy className={`w-4 h-4 ${ach.isUnlocked ? 'text-[#00FF87]' : 'text-slate-500'}`} />
                  <span>{ach.title}</span>
                </h4>
                <p className="text-xs text-slate-400">{ach.description}</p>
              </div>

              <div className="pt-2 border-t border-[#141d2e] flex items-center justify-between text-xs">
                <span className={ach.isUnlocked ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
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
