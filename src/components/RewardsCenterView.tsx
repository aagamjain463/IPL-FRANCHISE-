import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Award, CalendarDays, CheckCircle2, ChevronRight, Crown, Flame, Gift, Radio, Shield, Sparkles, Star, Target, Trophy, Users, Zap } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { SAVE_VERSION } from '../types/game';
import { soundFx } from '../audio/soundFx';
import { cardHoverGesture, cardMotion, cinematicHeroMotion, listContainerMotion, revealUpMotion, tapGesture } from '../motion';
import { DAILY_STREAK_REWARDS, applyObjectiveClaim, claimAllObjectiveRewards, claimDailyStreak, deriveRewardProgression, ensureRewardEcosystem, H2H_TIERS, objectiveStatus } from '../rewards/rewardEngine';
import { ObjectiveProgressCard, RewardCard, RewardQueue, XPBar } from '../rewards/components/RewardPrimitives';

const STORAGE_KEY = 'ipl_franchise_sim_save_v1';

type RewardTab = 'daily' | 'weekly' | 'season' | 'h2h' | 'collection' | 'achievements' | 'history';

const persistGame = (nextState: any) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...nextState, saveVersion: SAVE_VERSION, updatedAt: Date.now() }));
  } catch {
    // ignore storage failures; in-memory state is still updated
  }
};

export const RewardsCenterView: React.FC = () => {
  const { gameState, setGameState, setActiveTab } = useGame();
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTabLocal] = useState<RewardTab>('daily');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!gameState?.progression) return null;

  const progression = ensureRewardEcosystem(gameState.progression);
  const userTeam = gameState.teams[gameState.userTeamId];
  const view = deriveRewardProgression(progression, userTeam, gameState.allPlayers);
  const objectives = progression.objectives || [];
  const achievements = progression.achievements || [];
  const rewardState = progression.rewards;
  const dailyObjectives = objectives.filter(o => o.category === 'daily');
  const weeklyObjectives = objectives.filter(o => o.category === 'weekly');
  const seasonObjectives = objectives.filter(o => o.category === 'season');
  const nextCollectionPct = Math.round((view.collectionCount / Math.max(1, view.collectionMilestone)) * 100);

  const earnedToday = useMemo(() => {
    const key = new Date().toISOString().slice(0, 10);
    return rewardState.dailyStreak.claimedDates.includes(key);
  }, [rewardState.dailyStreak.claimedDates]);

  const updateProgression = (nextProgression: any, message?: string) => {
    const nextState = { ...gameState, progression: nextProgression };
    setGameState(nextState);
    persistGame(nextState);
    if (message) {
      setToast(message);
      setTimeout(() => setToast(null), 3200);
    }
  };

  const handleClaimObjective = (objectiveId: string) => {
    if (claimingId) return;
    setClaimingId(objectiveId);
    const result = applyObjectiveClaim(progression, objectiveId);
    if (result.reward) {
      soundFx.playRewardClaim();
      updateProgression(result.progression, `${result.reward.source} claimed`);
    }
    setTimeout(() => setClaimingId(null), 350);
  };

  const handleClaimAll = () => {
    if (claimingId) return;
    setClaimingId('all');
    const result = claimAllObjectiveRewards(progression);
    if (result.rewards.length) {
      soundFx.playRewardClaim();
      updateProgression(result.progression, `${result.rewards.length} reward(s) claimed`);
    }
    setTimeout(() => setClaimingId(null), 350);
  };

  const handleClaimDaily = () => {
    if (claimingId || earnedToday) return;
    setClaimingId('daily-streak');
    const result = claimDailyStreak(progression);
    if (result.reward) {
      soundFx.playRewardClaim();
      updateProgression(result.progression, `Daily streak day ${rewardState.dailyStreak.currentDay} claimed`);
    }
    setTimeout(() => setClaimingId(null), 350);
  };

  const handleClearQueue = () => {
    updateProgression({ ...progression, rewards: { ...rewardState, queue: [] } });
  };

  const renderObjectives = (list: typeof objectives) => (
    <motion.div className="reward-objective-grid" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : 'initial'} animate="enter">
      {list.map(objective => (
        <ObjectiveProgressCard key={objective.id} objective={objective} disabled={claimingId === objective.id || claimingId === 'all'} onClaim={() => handleClaimObjective(objective.id)} />
      ))}
      {!list.length && <div className="reward-empty">No objectives in this track yet. Play matches, auction lots, and academy sessions to progress.</div>}
    </motion.div>
  );

  return (
    <motion.div className="reward-center" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : 'initial'} animate="enter">
      <AnimatePresence>{toast && <motion.div className="reward-toast" variants={shouldReduceMotion ? undefined : cardMotion} initial={shouldReduceMotion ? false : 'initial'} animate="enter" exit={{ opacity: 0, y: -10 }}><CheckCircle2 className="w-4 h-4" />{toast}</motion.div>}</AnimatePresence>

      <motion.section className="reward-hero" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}>
        <motion.div variants={shouldReduceMotion ? undefined : revealUpMotion}>
          <small><Gift className="w-4 h-4" /> FRANCHISE REWARD CENTER</small>
          <h1>Play. Earn. Progress. Unlock.</h1>
          <p>Every meaningful match, auction signing, challenge, scouting action and season milestone feeds one connected franchise progression ecosystem.</p>
        </motion.div>
        <motion.div className="reward-level-card" variants={shouldReduceMotion ? undefined : cardMotion}>
          <span>FRANCHISE LEVEL</span>
          <b>{view.level}</b>
          <em>{view.title}</em>
          <XPBar value={view.progressPercent} current={view.currentLevelXp} max={view.nextLevelXp} />
        </motion.div>
      </motion.section>

      <RewardQueue items={rewardState.queue} onClear={handleClearQueue} />

      <section className="reward-summary-grid">
        <motion.article variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture}>
          <i><Target className="w-5 h-5" /></i><small>Claimable</small><b>{view.claimableObjectives}</b><p>{view.completedObjectives}/{view.totalObjectives} objectives complete</p>
        </motion.article>
        <motion.article variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture}>
          <i><Radio className="w-5 h-5" /></i><small>H2H Rank</small><b style={{ color: view.h2hTier.color }}>{view.h2hTier.label}</b><p>{rewardState.h2h.rating} rating · {rewardState.h2h.wins} wins</p>
        </motion.article>
        <motion.article variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture}>
          <i><Users className="w-5 h-5" /></i><small>Collection</small><b>{view.collectionCount}/{view.collectionMilestone}</b><p>Actual acquired players only</p>
        </motion.article>
        <motion.article variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture}>
          <i><Sparkles className="w-5 h-5" /></i><small>Scout Tokens</small><b>{progression.scoutTokens}</b><p>Earn through objectives and streaks</p>
        </motion.article>
      </section>

      <section className="daily-streak-track">
        <div className="reward-section-head">
          <div><small><CalendarDays className="w-4 h-4" /> DAILY STREAK</small><h2>7-day reward path</h2><p>Forgiving login rewards. Claim once per day; no paid random packs.</p></div>
          <button disabled={earnedToday || claimingId === 'daily-streak'} onClick={handleClaimDaily}>{earnedToday ? 'CLAIMED TODAY' : 'CLAIM TODAY'}</button>
        </div>
        <div className="daily-streak-track__days">
          {DAILY_STREAK_REWARDS.map((grants, index) => {
            const day = index + 1;
            const isToday = day === rewardState.dailyStreak.currentDay;
            const wasClaimed = day < rewardState.dailyStreak.currentDay || (isToday && earnedToday);
            return <div key={day} className={`daily-streak-day ${isToday ? 'is-today' : ''} ${wasClaimed ? 'is-claimed' : ''}`}><span>DAY {day}</span><b>{grants[0].title}</b><small>{wasClaimed ? 'Claimed' : isToday ? 'Today' : 'Upcoming'}</small></div>;
          })}
        </div>
      </section>

      <nav className="reward-tabs">
        {[
          ['daily', 'Daily', Flame], ['weekly', 'Weekly', Shield], ['season', 'Season', Trophy], ['h2h', 'H2H', Zap], ['collection', 'Collection', Users], ['achievements', 'Achievements', Star], ['history', 'History', Award]
        ].map(([id, label, Icon]) => (
          <motion.button key={id as string} whileTap={shouldReduceMotion ? undefined : tapGesture} className={activeTab === id ? 'is-active' : ''} onClick={() => setActiveTabLocal(id as RewardTab)}>
            {activeTab === id && !shouldReduceMotion && <motion.span layoutId="reward-tab-active" />}
            <Icon className="w-4 h-4" /><b>{label as string}</b>
          </motion.button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.section key={activeTab} className="reward-tab-panel" initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: shouldReduceMotion ? 0.01 : 0.24 }}>
          {activeTab === 'daily' && renderObjectives(dailyObjectives)}
          {activeTab === 'weekly' && renderObjectives(weeklyObjectives)}
          {activeTab === 'season' && renderObjectives(seasonObjectives)}
          {activeTab === 'h2h' && (
            <div className="h2h-reward-panel">
              <div><small>COMPETITIVE TRACK</small><h2>{view.h2hTier.label} Division</h2><p>H2H rewards use real H2H results when recorded. Losses give participation progress; wins drive rating and streak growth.</p><XPBar value={Math.min(100, (rewardState.h2h.rating % 400) / 4)} current={rewardState.h2h.rating} max={(H2H_TIERS.find(t => t.minRating > rewardState.h2h.rating)?.minRating || 2500)} label="Rating Progress" /></div>
              <div className="h2h-tier-list">{H2H_TIERS.map(t => <div key={t.id} className={rewardState.h2h.rating >= t.minRating ? 'is-unlocked' : ''}><span style={{ background: t.color }} /><b>{t.label}</b><small>{t.minRating}+ Rating</small></div>)}</div>
            </div>
          )}
          {activeTab === 'collection' && (
            <div className="collection-reward-panel"><div><small>PLAYER COLLECTION</small><h2>{view.collectionCount} acquired players</h2><p>Collection progress uses your actual squad/unlocked players. Milestones unlock XP, badges, and presentation cosmetics without gambling mechanics.</p><XPBar value={nextCollectionPct} current={view.collectionCount} max={view.collectionMilestone} label="Next Collection Milestone" /></div><div className="collection-milestones">{[25, 50, 100, 150, 250].map(m => <span key={m} className={view.collectionCount >= m ? 'is-done' : ''}>{m}<small>Players</small></span>)}</div></div>
          )}
          {activeTab === 'achievements' && (
            <div className="achievement-grid">{achievements.map(a => <article key={a.id} className={a.isUnlocked ? 'is-unlocked' : ''}><i>{a.isUnlocked ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}</i><small>{a.category}</small><h3>{a.title}</h3><p>{a.description}</p><b>{a.isUnlocked ? `Unlocked Season ${a.unlockedAtSeason || gameState.currentSeason}` : `Reward +${a.rewardXp} XP`}</b></article>)}</div>
          )}
          {activeTab === 'history' && (
            <div className="reward-history">{rewardState.history.length ? rewardState.history.map(item => <article key={item.id}><small>{new Date(item.createdAt).toLocaleDateString()}</small><h3>{item.source}</h3><div>{item.grants.map(g => <RewardCard key={g.id} grant={g} />)}</div></article>) : <div className="reward-empty">No rewards claimed yet. Complete an objective or claim the daily streak.</div>}</div>
          )}
        </motion.section>
      </AnimatePresence>

      <section className="next-best-action">
        <div><small>NEXT BEST ACTION</small><h2>{view.nextObjective?.title || 'Play one more match'}</h2><p>{view.nextObjective?.description || 'Start a Matchday fixture or enter Super Over H2H to push your franchise progression forward.'}</p></div>
        <button onClick={() => setActiveTab('Play')}>PLAY AGAIN <ChevronRight className="w-4 h-4" /></button>
      </section>
    </motion.div>
  );
};
