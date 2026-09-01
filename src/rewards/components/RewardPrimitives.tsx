import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Award, Check, Coins, Gift, Shield, Star, Ticket, Trophy, Zap } from 'lucide-react';
import { cardMotion, listContainerMotion, tapGesture } from '../../motion';
import { ObjectiveItem } from '../../types/franchise';
import { objectiveStatus, RewardGrant, RewardQueueItem } from '../rewardEngine';

const iconFor = (kind: RewardGrant['kind']) => {
  switch (kind) {
    case 'xp': return <Zap className="w-5 h-5" />;
    case 'budget': return <Coins className="w-5 h-5" />;
    case 'scoutTokens': return <Ticket className="w-5 h-5" />;
    case 'badge': return <Award className="w-5 h-5" />;
    case 'collection': return <Gift className="w-5 h-5" />;
    case 'h2h': return <Trophy className="w-5 h-5" />;
    default: return <Star className="w-5 h-5" />;
  }
};

export const XPBar: React.FC<{ value: number; current: number; max: number; label?: string }> = ({ value, current, max, label }) => {
  const reduce = useReducedMotion();
  return (
    <div className="reward-xpbar">
      <div className="reward-xpbar__top"><span>{label || 'Franchise XP'}</span><b>{current.toLocaleString()} / {max.toLocaleString()} XP</b></div>
      <div className="reward-xpbar__track">
        <motion.span initial={reduce ? false : { width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }} transition={{ duration: reduce ? 0.01 : 0.65, ease: [0.16, 1, 0.3, 1] }} />
      </div>
    </div>
  );
};

export const RewardCard: React.FC<{ grant: RewardGrant }> = ({ grant }) => (
  <div className={`reward-card reward-card--${grant.rarity}`}>
    <i>{iconFor(grant.kind)}</i>
    <div><small>{grant.title}</small><b>{typeof grant.value === 'number' ? (grant.kind === 'budget' ? `₹${grant.value}Cr` : `+${grant.value}`) : grant.value}</b><p>{grant.description}</p></div>
  </div>
);

export const ObjectiveProgressCard: React.FC<{ objective: ObjectiveItem; onClaim?: () => void; disabled?: boolean }> = ({ objective, onClaim, disabled }) => {
  const reduce = useReducedMotion();
  const status = objectiveStatus(objective);
  const pct = Math.round((objective.progress / Math.max(1, objective.target)) * 100);
  return (
    <motion.article className={`objective-card objective-card--${status.toLowerCase().replace(/\s/g, '-')}`} variants={reduce ? undefined : cardMotion}>
      <div className="objective-card__head"><span>{objective.category}</span><b>{status}</b></div>
      <h3>{objective.title}</h3>
      <p>{objective.description}</p>
      <XPBar value={pct} current={objective.progress} max={objective.target} label="Progress" />
      <div className="objective-card__foot">
        <span>+{objective.rewardXp} XP · ₹{objective.rewardCoinsCr}Cr · {objective.rewardScoutTokens} Tokens</span>
        {objective.isClaimed ? <button disabled><Check className="w-4 h-4" /> Claimed</button> : objective.isCompleted ? <motion.button whileTap={reduce ? undefined : tapGesture} disabled={disabled} onClick={onClaim}>Claim</motion.button> : <button disabled>In Progress</button>}
      </div>
    </motion.article>
  );
};

export const RewardQueue: React.FC<{ items: RewardQueueItem[]; onClear?: () => void }> = ({ items, onClear }) => {
  const reduce = useReducedMotion();
  if (!items.length) return null;
  const latest = items[0];
  return (
    <motion.section className="reward-queue" variants={reduce ? undefined : cardMotion} initial={reduce ? false : 'initial'} animate="enter">
      <div className="reward-queue__head"><span><Shield className="w-4 h-4" /> Reward Claimed</span><button onClick={onClear}>Dismiss</button></div>
      <h2>{latest.source}</h2>
      <motion.div className="reward-queue__grants" variants={reduce ? undefined : listContainerMotion}>{latest.grants.map(g => <RewardCard key={g.id} grant={g} />)}</motion.div>
    </motion.section>
  );
};
