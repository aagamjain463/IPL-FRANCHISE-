import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Building2, Users, DollarSign, Award, TrendingUp, 
  ShieldCheck, ArrowUpRight, Check, Heart, Briefcase, Zap, Shield, ChevronRight,
  Trophy, Flame, Sparkles, Target, BarChart2
} from 'lucide-react';
import { FranchiseFacility, FranchiseStaffMember } from '../types/franchise';
import { INITIAL_FACILITIES, INITIAL_STAFF } from '../engine/progressionEngine';
import { soundFx } from '../audio/soundFx';
import { INITIAL_TEAMS } from '../data/teams';

export const ClubFranchiseView: React.FC = () => {
  const { gameState, setGameState } = useGame();
  const [activeTab, setActiveTab] = useState<'Facilities' | 'FranchiseDNA' | 'TrophyRoom' | 'Rivalries' | 'Staff' | 'Finances' | 'Board'>('Facilities');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  const progression = gameState.progression;
  const facilities = progression?.facilities || INITIAL_FACILITIES;
  const staffList = progression?.staff || INITIAL_STAFF;
  const clubBudget = progression?.clubBudgetCr || 8.5;

  // Calculate Franchise DNA based on user squad
  const userPlayers = (userTeam?.squadPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const youthCount = userPlayers.filter(p => p.age <= 23).length;
  const starCount = userPlayers.filter(p => p.overall >= 88).length;
  const bowlingCount = userPlayers.filter(p => p.role.includes('Bowler')).length;
  const battingCount = userPlayers.filter(p => p.role.includes('Batter')).length;

  let dnaStyle = 'Data-Driven Modern';
  let dnaDesc = 'A balanced, mathematically optimized roster blending analytics with clutch experience.';
  if (youthCount >= 5) {
    dnaStyle = 'Youth Academy Factory';
    dnaDesc = 'A breeding ground for wonderkids and future national captains. High development trajectory.';
  } else if (starCount >= 4) {
    dnaStyle = 'Galácticos Star Power';
    dnaDesc = 'Heavyweight marquee roster built to intimidate opponents on the biggest stages.';
  } else if (bowlingCount >= 8) {
    dnaStyle = 'Bowling Fortress';
    dnaDesc = 'Defends any total on pitch. Lethal combination of pace, yorkers, and mystery spin.';
  } else if (battingCount >= 8) {
    dnaStyle = 'Batting Powerhouse';
    dnaDesc = 'Unapologetic boundary hitters constructed to chase down 200+ totals with ease.';
  }

  const handleUpgradeFacility = (facilityId: string) => {
    const fac = facilities[facilityId];
    if (!fac || fac.level >= fac.maxLevel) return;

    if (clubBudget < fac.upgradeCostCr) {
      setFeedbackMsg(`Insufficient Club Budget! Requires ₹${fac.upgradeCostCr.toFixed(2)} Cr.`);
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    const updatedFacilities = {
      ...facilities,
      [facilityId]: {
        ...fac,
        level: fac.level + 1,
        upgradeCostCr: Number((fac.upgradeCostCr * 1.5).toFixed(2))
      }
    };

    const newBudget = Number((clubBudget - fac.upgradeCostCr).toFixed(2));
    const newXp = (progression?.xp || 0) + 200;

    const updatedProgression = {
      ...(progression || {}),
      xp: newXp,
      level: progression?.level || 1,
      xpToNextLevel: progression?.xpToNextLevel || 500,
      scoutTokens: (progression?.scoutTokens || 5) + 1,
      clubBudgetCr: newBudget,
      facilities: updatedFacilities,
      staff: staffList,
      objectives: progression?.objectives || [],
      achievements: progression?.achievements || [],
      rivalries: progression?.rivalries || {},
      unclaimedRewardsCount: progression?.unclaimedRewardsCount || 0
    };

    setGameState({
      ...gameState,
      progression: updatedProgression
    });

    soundFx.playCheer(false);
    setFeedbackMsg(`Upgraded ${fac.name} to Level ${fac.level + 1}! (+200 XP)`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleToggleStaff = (staffId: string) => {
    const updatedStaff = staffList.map(s => {
      if (s.id === staffId) {
        const nextHired = !s.isHired;
        return { ...s, isHired: nextHired };
      }
      return s;
    });

    const updatedProgression = {
      ...(progression || {}),
      xp: progression?.xp || 0,
      level: progression?.level || 1,
      xpToNextLevel: progression?.xpToNextLevel || 500,
      scoutTokens: progression?.scoutTokens || 5,
      clubBudgetCr: clubBudget,
      facilities,
      staff: updatedStaff,
      objectives: progression?.objectives || [],
      achievements: progression?.achievements || [],
      rivalries: progression?.rivalries || {},
      unclaimedRewardsCount: progression?.unclaimedRewardsCount || 0
    };

    setGameState({
      ...gameState,
      progression: updatedProgression
    });

    soundFx.playHammerKnock();
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn font-sans">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30">
              FRANCHISE HEADQUARTERS
            </span>
            <span className="text-xs text-[#64748b]">• Season {gameState.currentSeason}</span>
          </div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#D4AF37]" />
            <span>Franchise Club, Dynasty & Facilities</span>
          </h2>
          <p className="text-xs text-[#94a3b8]">Oversee high-performance facilities, tactical DNA, trophy showcases, and marquee rivalries.</p>
        </div>

        {/* Budget Chip */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0f172a] px-4 py-2 rounded-xl border border-[#1e293b] text-right">
            <p className="text-[9px] uppercase font-bold text-[#64748b] tracking-wider">Club Development Budget</p>
            <p className="font-mono font-bold text-base text-[#D4AF37]">₹{clubBudget.toFixed(2)} Cr</p>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className="p-3 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{feedbackMsg}</span>
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'Facilities', label: 'Facilities', icon: Building2 },
          { id: 'FranchiseDNA', label: 'Franchise DNA', icon: Sparkles },
          { id: 'TrophyRoom', label: 'Trophy Room', icon: Trophy },
          { id: 'Rivalries', label: 'Rivalry Ledger', icon: Flame },
          { id: 'Staff', label: 'Coaching Staff', icon: Users },
          { id: 'Finances', label: 'Finances & Cap', icon: DollarSign },
          { id: 'Board', label: 'Board & Fans', icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-[#D4AF37] text-black font-black shadow-lg shadow-[#D4AF37]/15' 
                  : 'bg-[#0f172a] text-[#94a3b8] hover:text-white hover:bg-[#1e293b] border border-[#1e293b]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: FACILITIES UPGRADE */}
      {activeTab === 'Facilities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(Object.values(facilities) as FranchiseFacility[]).map(facility => {
            const isMax = facility.level >= facility.maxLevel;
            const canAfford = clubBudget >= facility.upgradeCostCr;

            return (
              <div 
                key={facility.id}
                className="bg-[#0f172a] rounded-2xl p-5 border border-[#1e293b] hover:border-[#D4AF37]/40 transition shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Tier {facility.level} / {facility.maxLevel}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#D4AF37]">
                      {isMax ? 'MAX LEVEL' : `₹${facility.upgradeCostCr.toFixed(2)} Cr`}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white mb-1">{facility.name}</h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">{facility.description}</p>

                  {/* Level Pips */}
                  <div className="flex items-center gap-1.5 mb-4">
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <div 
                        key={lvl}
                        className={`h-2 flex-1 rounded-full transition-all ${
                          lvl <= facility.level ? 'bg-[#D4AF37]' : 'bg-[#1e293b]'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Active Perk */}
                  <div className="p-3 bg-[#05070a] rounded-xl border border-[#1e293b] mb-4">
                    <p className="text-[10px] uppercase font-bold text-[#64748b] mb-1">Active Gameplay Effect</p>
                    <p className="text-xs font-semibold text-emerald-400">{facility.perkDescription}</p>
                  </div>
                </div>

                <button
                  disabled={isMax || !canAfford}
                  onClick={() => handleUpgradeFacility(facility.id)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
                    isMax 
                      ? 'bg-[#1e293b] text-[#64748b] cursor-not-allowed'
                      : canAfford
                      ? 'bg-[#D4AF37] hover:bg-amber-400 text-black font-black active:scale-98 shadow-lg shadow-[#D4AF37]/15'
                      : 'bg-[#1e293b] text-[#94a3b8] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{isMax ? 'Fully Upgraded' : `Upgrade to Level ${facility.level + 1}`}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: FRANCHISE DNA & TACTICAL IDENTITY */}
      {activeTab === 'FranchiseDNA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-gradient-to-br from-[#0c1322] via-[#0f172a] to-[#080d1a] p-6 sm:p-8 rounded-2xl border border-[#1e293b] shadow-2xl space-y-6">
            <div>
              <span className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                DYNAMIC IDENTITY CLUSTER
              </span>
              <h3 className="text-2xl font-black uppercase text-white tracking-tight mt-2 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#D4AF37]" />
                <span>{dnaStyle}</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 leading-relaxed">
                {dnaDesc}
              </p>
            </div>

            {/* Tactical Pillar Meters */}
            <div className="space-y-3.5">
              {[
                { name: 'Youth Focus & Academy Integration', value: Math.min(100, youthCount * 22), color: 'bg-emerald-500' },
                { name: 'Marquee Star Concentration', value: Math.min(100, starCount * 25), color: 'bg-amber-500' },
                { name: 'Bowling Attack Depth', value: Math.min(100, bowlingCount * 12), color: 'bg-blue-500' },
                { name: 'Powerhitting Boundary Ratio', value: Math.min(100, battingCount * 12), color: 'bg-rose-500' }
              ].map((meter, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-white">{meter.name}</span>
                    <span className="font-mono text-[#D4AF37]">{meter.value}%</span>
                  </div>
                  <div className="w-full bg-[#05070a] h-2 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full rounded-full ${meter.color}`} style={{ width: `${meter.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-[#D4AF37]" /> Identity Perks
            </h4>
            <p className="text-xs text-[#94a3b8]">Your franchise identity grants passive strategic advantages in the auction and match simulation.</p>

            <div className="space-y-2.5">
              <div className="p-3 bg-[#05070a] rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-emerald-400 block">Growth Trajectory</span>
                <p className="text-xs text-white mt-0.5">Young players develop attributes 15% faster during post-season progression.</p>
              </div>
              <div className="p-3 bg-[#05070a] rounded-xl border border-white/5">
                <span className="text-[9px] uppercase font-bold text-amber-400 block">Clutch Aura</span>
                <p className="text-xs text-white mt-0.5">Marquee stars gain +4 Composure when defending or chasing in final 3 overs.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TROPHY ROOM & DYNASTY */}
      {activeTab === 'TrophyRoom' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { title: 'IPL Champions Trophy', count: 2, desc: 'Trophy of Champions', color: 'from-[#D4AF37] to-amber-600' },
              { title: 'Super Over Cups', count: 5, desc: 'Clutch 1v1 Arena Titles', color: 'from-blue-500 to-indigo-600' },
              { title: 'Orange Caps (Top Run-Scorers)', count: 3, desc: 'League Batting Supremacy', color: 'from-orange-500 to-amber-500' },
              { title: 'Purple Caps (Top Wicket-Takers)', count: 4, desc: 'Deadly Bowling Mastery', color: 'from-purple-500 to-pink-600' }
            ].map((trophy, i) => (
              <div key={i} className="glass-panel p-5 rounded-2xl shadow-xl text-center space-y-3">
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${trophy.color} flex items-center justify-center text-black shadow-lg`}>
                  <Trophy className="w-7 h-7 text-black" />
                </div>
                <div>
                  <span className="text-2xl font-black font-mono text-white block">{trophy.count}</span>
                  <h4 className="text-xs font-black uppercase tracking-tight text-[#D4AF37]">{trophy.title}</h4>
                  <p className="text-[10px] text-[#64748b] mt-0.5">{trophy.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RIVALRY LEDGER */}
      {activeTab === 'Rivalries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(INITIAL_TEAMS).filter(t => t.id !== gameState.userTeamId).map(opp => (
            <div key={opp.id} className="glass-panel p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  MARQUEE CLASH
                </span>
                <span className="text-xs font-mono font-bold text-[#D4AF37]">Streak: W2</span>
              </div>

              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow"
                  style={{ backgroundColor: opp.primaryColor, color: opp.secondaryColor }}
                >
                  {opp.shortName}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase">{opp.name}</h4>
                  <p className="text-[10px] text-[#64748b]">{opp.city}</p>
                </div>
              </div>

              <div className="p-3 bg-[#05070a] rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-[#94a3b8]">Head-to-Head:</span>
                <span className="font-bold text-white"><strong className="text-emerald-400">8 Wins</strong> - <strong className="text-rose-400">4 Losses</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: STAFF & COACHING */}
      {activeTab === 'Staff' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {staffList.map(member => (
              <div 
                key={member.id}
                className={`bg-[#0f172a] rounded-2xl p-5 border transition shadow-xl flex flex-col justify-between ${
                  member.isHired ? 'border-[#D4AF37]/50' : 'border-[#1e293b] opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                      {member.role}
                    </span>
                    <span className="text-xs font-mono font-bold text-white bg-[#05070a] px-2 py-0.5 rounded-md border border-[#1e293b]">
                      {member.rating} OVR
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white">{member.name}</h3>
                  <p className="text-[11px] text-[#64748b] font-semibold mb-3">{member.nationality} • Salary: ₹{member.salaryCrPerYear.toFixed(2)} Cr/yr</p>

                  <div className="space-y-2 mb-4">
                    <div className="p-2.5 bg-[#05070a] rounded-lg border border-[#1e293b]">
                      <p className="text-[9px] uppercase font-bold text-[#64748b]">Specialty</p>
                      <p className="text-xs text-white font-medium">{member.specialty}</p>
                    </div>
                    <div className="p-2.5 bg-[#05070a] rounded-lg border border-[#1e293b]">
                      <p className="text-[9px] uppercase font-bold text-[#64748b]">Tactical Perk Effect</p>
                      <p className="text-xs text-emerald-400 font-semibold">{member.perkEffect}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStaff(member.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    member.isHired
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-[#D4AF37] hover:bg-amber-400 text-black font-black'
                  }`}
                >
                  {member.isHired ? 'Release Staff Member' : 'Hire for Franchise'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: FINANCES & SPONSORS */}
      {activeTab === 'Finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
              <h3 className="text-sm uppercase font-black text-white tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#D4AF37]" />
                <span>Commercial Revenue Streams</span>
              </h3>

              <div className="space-y-3">
                {[
                  { name: 'IPL Central Broadcast Share', amount: '₹140.00 Cr', desc: 'Guaranteed BCCI central media rights payout.' },
                  { name: 'Principal Shirt Sponsorship (Tata / Dream11)', amount: '₹32.50 Cr', desc: 'Front jersey commercial branding partnership.' },
                  { name: 'Matchday Stadium Gate Receipts', amount: '₹22.80 Cr', desc: '7 home fixtures ticket sales and hospitality suites.' },
                  { name: 'Official Merchandise & Fan Licensing', amount: '₹8.40 Cr', desc: 'Replica kits and digital fan collectibles.' }
                ].map((stream, idx) => (
                  <div key={idx} className="p-3.5 bg-[#05070a] rounded-xl border border-[#1e293b] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{stream.name}</p>
                      <p className="text-[10px] text-[#64748b]">{stream.desc}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{stream.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
              <h3 className="text-sm uppercase font-black text-white tracking-wider">Payroll & Cap Breakdown</h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-[#1e293b]">
                  <span className="text-[#94a3b8]">Auction Purse Cap</span>
                  <span className="font-mono font-bold text-white">₹120.00 Cr</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#1e293b]">
                  <span className="text-[#94a3b8]">Squad Salaries Committed</span>
                  <span className="font-mono font-bold text-amber-400">
                    ₹{((120 - (userTeam?.purseCr || 0))).toFixed(2)} Cr
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#1e293b]">
                  <span className="text-[#94a3b8]">Available Cap</span>
                  <span className="font-mono font-bold text-[#D4AF37]">₹{userTeam?.purseCr.toFixed(2)} Cr</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#94a3b8]">Staff Payroll (Annual)</span>
                  <span className="font-mono font-bold text-blue-400">₹9.50 Cr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: BOARD & FANS */}
      {activeTab === 'Board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
            <h3 className="text-sm uppercase font-black text-white tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Board Expectations & Targets</span>
            </h3>

            <div className="space-y-3">
              {[
                { title: 'Qualify for IPL Playoffs', progress: 'In Progress', status: 'Crucial' },
                { title: 'Maintain Net Positive Purse Discipline', progress: 'Achieved', status: 'Medium' },
                { title: 'Develop Uncapped Domestic Prodigy', progress: 'In Progress', status: 'High' }
              ].map((exp, i) => (
                <div key={i} className="p-3.5 bg-[#05070a] rounded-xl border border-[#1e293b] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{exp.title}</p>
                    <span className="text-[10px] text-[#64748b]">Priority: {exp.status}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    {exp.progress}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-2xl p-6 border border-[#1e293b] shadow-xl space-y-4">
            <h3 className="text-sm uppercase font-black text-white tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span>Fanbase Sentiment & Loyalty</span>
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Fan sentiment is currently <span className="text-emerald-400 font-bold">Strong ({userTeam?.fanSentiment || 85}%)</span>. Winning rivalry clashes against traditional foes directly boosts merchandise sales and stadium attendance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
