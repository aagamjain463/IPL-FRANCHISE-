import { Player } from '../types/cricket';

export interface ChemistryBreakdownItem {
  label: string;
  value: number;
  max: number;
}

export interface ChemistryResult {
  score: number; // 0 - 100
  multiplier: number; // 1.0 at 50, caps at ~1.06 (chemistry is spice, not god mode)
  breakdown: ChemistryBreakdownItem[];
}

/**
 * FC-style team chemistry for cricket.
 * Rules are intentionally soft (+0% to +6% match influence) — selection and
 * tactics must do the heavy lifting. Chemistry links:
 *  - Same nationality pairs
 *  - Home-grown Indian core
 *  - Key role synergies (WK + spin balancer, opener + anchor, finisher + death bowler)
 *  - Captain leadership
 *  - Youth + experience balance
 */
export function computeTeamChemistry(players: Player[]): ChemistryResult {
  const breakdown: ChemistryBreakdownItem[] = [];

  // 1. Nationality bonds (+ up to 20)
  const nationCounts: Record<string, number> = {};
  players.forEach(p => {
    nationCounts[p.nationality] = (nationCounts[p.nationality] || 0) + 1;
  });
  let nationBonds = 0;
  Object.values(nationCounts).forEach(count => {
    nationBonds += Math.max(0, count - 1) * 4;
  });
  const nationScore = Math.min(20, Math.round(nationBonds));
  breakdown.push({ label: 'Nationality bonds', value: nationScore, max: 20 });

  // 2. Home-grown Indian core (+ up to 15)
  const indianCount = players.filter(p => !p.isOverseas).length;
  const indianRatio = players.length > 0 ? indianCount / players.length : 0;
  const coreScore = Math.round(indianRatio * 15);
  breakdown.push({ label: 'Indian core', value: coreScore, max: 15 });

  // 3. Role synergy (+ up to 20)
  const hasWk = players.some(p => p.role.includes('Wicketkeeper'));
  const hasPacer = players.some(p => p.role.includes('Pace Bowler') || p.bowlingStyle.includes('fast'));
  const hasSpinner = players.some(p => p.role.includes('Spin Bowler') || p.bowlingStyle.toLowerCase().includes('spin') || p.bowlingStyle.toLowerCase().includes('break') || p.bowlingStyle.toLowerCase().includes('orthodox'));
  const hasFinisher = players.some(p => p.role === 'Finisher' || (p.attributes?.finishing ?? 0) >= 84);
  const hasOpener = players.some(p => p.role === 'Top-order Batter' || (p.attributes?.powerplayBatting ?? 0) >= 82);
  const hasAnchor = players.some(p => p.battingPlaystyle === 'Anchor' || (p.attributes?.wicketPreservation ?? 0) >= 84);
  const deathBowler = players.filter(p => (p.attributes?.deathBowling ?? 0) >= 82).length;

  let roleScore = 0;
  if (hasWk) roleScore += 4;
  if (hasSpinner) roleScore += 4;
  if (hasPacer) roleScore += 3;
  if (hasFinisher) roleScore += 3;
  if (hasOpener) roleScore += 2;
  if (hasAnchor) roleScore += 2;
  if (deathBowler >= 2) roleScore += 2;
  roleScore = Math.min(20, roleScore);
  breakdown.push({ label: 'Role synergy', value: roleScore, max: 20 });

  // 4. Captain leadership (+ up to 15)
  const leader = players.find(p => p.attributes?.leadership && p.attributes.leadership >= 85);
  const captainScore = leader ? Math.min(15, 5 + Math.round((leader.attributes!.leadership - 85) / 2)) : 0;
  breakdown.push({ label: 'Captain leadership', value: captainScore, max: 15 });

  // 5. Youth + veteran mix (+ up to 10)
  const youth = players.filter(p => p.age <= 23).length;
  const veterans = players.filter(p => p.age >= 30).length;
  const mixScore = youth > 0 && veterans > 0 ? Math.min(10, (youth + veterans >= 4 ? 10 : 6)) : 2;
  breakdown.push({ label: 'Youth + experience mix', value: mixScore, max: 10 });

  // 6. Keeper + spin partnership (+ up to 5)
  const hasWicketkeepingSpecialist = players.some(p => p.role.includes('Wicketkeeper') && (p.attributes?.fielding ?? 0) >= 80);
  const wkSpinScore = hasWicketkeepingSpecialist && hasSpinner ? 5 : 0;
  breakdown.push({ label: 'WK–spin partnership', value: wkSpinScore, max: 5 });

  // 7. Shared franchise history (+ up to 15)
  const historyCounts: Record<string, number> = {};
  players.forEach(p => (p.formerTeamIds || []).forEach(tid => {
    historyCounts[tid] = (historyCounts[tid] || 0) + 1;
  }));
  const historyBonds = Object.values(historyCounts).reduce((acc, c) => acc + Math.max(0, c - 1) * 3, 0);
  const historyScore = Math.min(15, Math.round(historyBonds));
  if (historyScore > 0) breakdown.push({ label: 'Shared franchise history', value: historyScore, max: 15 });

  const rawScore = breakdown.reduce((acc, b) => acc + b.value, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // 50 chemistry = neutral. Every 10 points above = +1.2% influence (cap +6%).
  const multiplier = Number(Math.min(1.06, 1.0 + ((score - 50) / 100) * 0.12).toFixed(4));

  return { score, multiplier, breakdown };
}

export function getChemistryMultiplier(score: number): number {
  return Math.min(1.06, 1.0 + ((score - 50) / 100) * 0.12);
}

/** Human-readable grade for the chemistry score. */
export function chemistryGrade(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Elite Chemistry', color: 'text-[#00FF87]' };
  if (score >= 70) return { label: 'Strong Chemistry', color: 'text-emerald-400' };
  if (score >= 55) return { label: 'Solid Chemistry', color: 'text-cyan-400' };
  if (score >= 40) return { label: 'Fragmented Unit', color: 'text-amber-400' };
  return { label: 'Low Cohesion', color: 'text-rose-400' };
}
