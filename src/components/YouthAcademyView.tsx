import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, PlayerRole, BattingStyle, BowlingStyle } from '../types/cricket';
import { 
  GraduationCap, Sparkles, Zap, Award, Target, TrendingUp, 
  UserCheck, ShieldCheck, Flame, ChevronRight, CheckCircle2,
  Calendar, Star, Dumbbell, BookOpen, AlertCircle
} from 'lucide-react';
import { soundFx } from '../audio/soundFx';

interface AcademyProspect {
  id: string;
  name: string;
  age: number;
  role: PlayerRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  overall: number;
  potential: number;
  readinessPct: number;
  focusArea: 'Power Hitting' | 'Death Bowling' | 'Spin Craft' | 'Match Temperament' | 'Athleticism';
  trainingProgress: number; // 0 - 100
  scoutReport: string;
  specialTrait: string;
  contractCostCr: number;
}

const INITIAL_PROSPECTS: AcademyProspect[] = [
  {
    id: 'acad_1',
    name: 'Aarav "Rocket" Sharma',
    age: 18,
    role: 'Pace Bowler',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm fast',
    overall: 73,
    potential: 89,
    readinessPct: 82,
    focusArea: 'Death Bowling',
    trainingProgress: 75,
    scoutReport: 'Raw express pace clocked at 150 km/h in U-19 Cooch Behar Trophy. Has lethal yorkers but requires line discipline under death pressure.',
    specialTrait: 'Thunderbolt Yorker (+8 Death Pace)',
    contractCostCr: 0.5
  },
  {
    id: 'acad_2',
    name: 'Kabir Varma',
    age: 19,
    role: 'Top-order Batter',
    battingStyle: 'Left-hand bat',
    bowlingStyle: 'None',
    overall: 75,
    potential: 91,
    readinessPct: 88,
    focusArea: 'Power Hitting',
    trainingProgress: 90,
    scoutReport: 'Explosive top-order striker with a 360-degree range. Clean bat swing against 140+ pace, drawing strong comparisons to young left-hand legends.',
    specialTrait: 'Powerplay Rampage (+10 Strike Rate PP)',
    contractCostCr: 0.8
  },
  {
    id: 'acad_3',
    name: 'Rohan Deshmukh',
    age: 19,
    role: 'Batting All-rounder',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'Right-arm legbreak',
    overall: 72,
    potential: 88,
    readinessPct: 70,
    focusArea: 'Spin Craft',
    trainingProgress: 60,
    scoutReport: 'Genuine dual-threat prodigy. Spins ball both ways with sharp wrong-uns and smashes lusty maximums at #7.',
    specialTrait: 'Mystery Googly (+7 Wicket Impact)',
    contractCostCr: 0.6
  },
  {
    id: 'acad_4',
    name: 'Tanmay Saxena',
    age: 17,
    role: 'Wicketkeeper Batter',
    battingStyle: 'Right-hand bat',
    bowlingStyle: 'None',
    overall: 70,
    potential: 87,
    readinessPct: 65,
    focusArea: 'Match Temperament',
    trainingProgress: 50,
    scoutReport: 'Immaculate glovework against wrist spin. Calm under high-pressure chases in domestic youth circuits.',
    specialTrait: 'Lightning Stumping (+12 Reflexes)',
    contractCostCr: 0.4
  }
];

export const YouthAcademyView: React.FC = () => {
  const { gameState, setGameState } = useGame();
  const [prospects, setProspects] = useState<AcademyProspect[]>(INITIAL_PROSPECTS);
  const [selectedProspect, setSelectedProspect] = useState<AcademyProspect>(INITIAL_PROSPECTS[0]);
  const [drillSuccessAlert, setDrillSuccessAlert] = useState<string | null>(null);

  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const handleRunIntensiveDrill = (prospectId: string) => {
    const updated = prospects.map(p => {
      if (p.id === prospectId) {
        const boostOvr = p.trainingProgress >= 85 ? 1 : 0;
        const newProgress = Math.min(100, p.trainingProgress + 15);
        return {
          ...p,
          overall: p.overall + boostOvr,
          trainingProgress: newProgress,
          readinessPct: Math.min(100, p.readinessPct + 6)
        };
      }
      return p;
    });

    setProspects(updated);
    const curr = updated.find(p => p.id === prospectId);
    if (curr) setSelectedProspect(curr);

    soundFx.playCheer(false);
    setDrillSuccessAlert(`⚡ Intensive Drill Completed! ${selectedProspect.name} gained +15% Training Mastery and sharpness!`);
    setTimeout(() => setDrillSuccessAlert(null), 3500);
  };

  const handleGraduateToSeniorSquad = (prospect: AcademyProspect) => {
    const currentRoster = userTeam.rosterPlayerIds || [];
    if (currentRoster.length >= 25) {
      alert('Squad Limit Reached (25/25 Players)! Release or trade a player first.');
      return;
    }

    // Convert Prospect to Senior Player
    const newPlayerId = `player_grad_${prospect.id}_${Date.now()}`;
    const newPlayer: Player = {
      id: newPlayerId,
      name: prospect.name,
      shortName: prospect.name.split(' ').pop() || prospect.name,
      age: prospect.age,
      nationality: 'India',
      isOverseas: false,
      role: prospect.role,
      battingStyle: prospect.battingStyle,
      bowlingStyle: prospect.bowlingStyle,
      currentTeamId: userTeam.id,
      overall: prospect.overall,
      battingRating: prospect.role.includes('Batter') ? prospect.overall + 3 : prospect.overall - 4,
      bowlingRating: prospect.role.includes('Bowler') ? prospect.overall + 3 : prospect.overall - 5,
      potential: prospect.potential,
      form: 4.6,
      confidence: 85,
      fatigue: 10,
      morale: 95,
      fitness: 95,
      injuryStatus: 'Fit',
      matchesInjuredRemaining: 0,
      salaryCr: prospect.contractCostCr,
      basePriceCr: prospect.contractCostCr,
      contractYearsRemaining: 3,
      isCapped: false,
      isYouthProspect: true,
      attributes: {
        power: prospect.role.includes('Batter') ? 82 : 68,
        strikeRotation: 76,
        boundaryAbility: 78,
        paceAbility: 75,
        spinAbility: 74,
        powerplayBatting: 77,
        middleOverBatting: 73,
        deathOverBatting: 79,
        chasingAbility: 75,
        finishing: 76,
        wicketPreservation: 72,
        pace: prospect.role.includes('Pace') ? 85 : 45,
        accuracy: 74,
        swing: 75,
        seam: 76,
        spin: prospect.role.includes('Spin') ? 82 : 30,
        variation: 78,
        powerplayBowling: 75,
        middleOverBowling: 73,
        deathBowling: 80,
        wicketTaking: 78,
        economy: 73,
        fielding: 80,
        fitness: 90,
        consistency: 74,
        pressure: 76,
        leadership: 65,
        composure: 75,
        aggression: 80,
        riskTaking: 65,
        bigMatchPerformance: 75
      },
      stats: {
        matches: 0,
        innings: 0,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        highestScore: 0,
        isNotOutCount: 0,
        fifties: 0,
        hundreds: 0,
        wickets: 0,
        oversBowled: 0,
        runsConceded: 0,
        maidens: 0,
        bestBowlingWickets: 0,
        bestBowlingRuns: 0,
        fourWickets: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
        manOfTheMatchCount: 0
      }
    };

    const updatedAllPlayers = {
      ...gameState.allPlayers,
      [newPlayerId]: newPlayer
    };

    const updatedUserTeam = {
      ...userTeam,
      rosterPlayerIds: [...currentRoster, newPlayerId]
    };

    setGameState({
      ...gameState,
      allPlayers: updatedAllPlayers,
      teams: {
        ...gameState.teams,
        [userTeam.id]: updatedUserTeam
      }
    });

    // Remove from Academy list
    const remainingProspects = prospects.filter(p => p.id !== prospect.id);
    setProspects(remainingProspects);
    if (remainingProspects.length > 0) {
      setSelectedProspect(remainingProspects[0]);
    }

    soundFx.playCheer(true);
    setDrillSuccessAlert(`🎉 OFFICIAL GRADUATION: ${prospect.name} promoted to ${userTeam.name} Senior IPL Roster!`);
    setTimeout(() => setDrillSuccessAlert(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 font-sans">
      
      {/* 1. ACADEMY HERO & FACILITY STATUS */}
      <div className="bg-gradient-to-r from-[#0c1322] via-[#090e1a] to-[#030712] p-6 rounded-3xl border border-[#1e293b] shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-xl">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight italic">
                {userTeam.name} Elite Youth Academy
              </h2>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                TIER 3 FACILITY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Developing India's next generation of match-winners through bespoke athletic development and biomechanics.
            </p>
          </div>
        </div>

        {/* Academy Metrics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#05070a] px-4 py-2.5 rounded-xl border border-[#1e293b] text-center">
            <span className="text-[9px] uppercase font-black text-slate-400 block">PROSPECTS IN TRAINING</span>
            <span className="text-sm font-mono font-black text-[#D4AF37]">{prospects.length} Active</span>
          </div>
          <div className="bg-[#05070a] px-4 py-2.5 rounded-xl border border-[#1e293b] text-center">
            <span className="text-[9px] uppercase font-black text-slate-400 block">AVERAGE POTENTIAL</span>
            <span className="text-sm font-mono font-black text-emerald-400">89.3 OVR</span>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {drillSuccessAlert && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-lg">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>{drillSuccessAlert}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
      )}

      {/* 2. PROSPECTS GRID & BESPOKE DEVELOPMENT LAB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Prospects List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#D4AF37]" />
            <span>Academy Development Cohort ({prospects.length})</span>
          </h3>

          <div className="space-y-3">
            {prospects.map(p => {
              const isSelected = selectedProspect.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProspect(p)}
                  className={`p-4 rounded-2xl border transition cursor-pointer shadow-xl relative overflow-hidden ${
                    isSelected 
                      ? 'bg-gradient-to-r from-[#0f172a] to-[#1e293b] border-[#D4AF37]' 
                      : 'bg-[#090e1a] border-[#1e293b] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#05070a] border border-[#1e293b] flex items-center justify-center font-mono font-black text-xs text-[#D4AF37]">
                        {p.overall}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-white">{p.name}</h4>
                          <span className="text-[9px] font-bold text-slate-400">({p.age}y)</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{p.role} • Potential: <strong className="text-emerald-400 font-mono">{p.potential} OVR</strong></p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                        {p.readinessPct}% Ready
                      </span>
                    </div>
                  </div>

                  {/* Training Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Training Progress:</span>
                      <span className="text-[#D4AF37] font-mono">{p.trainingProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#05070a] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-400 transition-all duration-500 rounded-full"
                        style={{ width: `${p.trainingProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prospect Detail & Action Hub (7 Cols) */}
        {selectedProspect && (
          <div className="lg:col-span-7 bg-[#090e1a] p-6 rounded-3xl border border-[#1e293b] shadow-2xl space-y-6">
            
            {/* Header & Meta */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                    {selectedProspect.role}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">{selectedProspect.age} Years Old</span>
                </div>
                <h3 className="text-2xl font-black text-white mt-1 uppercase italic tracking-tight">
                  {selectedProspect.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedProspect.battingStyle} {selectedProspect.bowlingStyle ? `• ${selectedProspect.bowlingStyle}` : ''}
                </p>
              </div>

              {/* Ratings Ring */}
              <div className="flex items-center gap-3">
                <div className="bg-[#05070a] p-3 rounded-2xl border border-[#1e293b] text-center min-w-[70px]">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">CURRENT</span>
                  <span className="text-xl font-mono font-black text-[#D4AF37]">{selectedProspect.overall}</span>
                </div>
                <div className="bg-[#05070a] p-3 rounded-2xl border border-[#1e293b] text-center min-w-[70px]">
                  <span className="text-[9px] uppercase font-black text-emerald-400 block">CEILING</span>
                  <span className="text-xl font-mono font-black text-emerald-400">{selectedProspect.potential}</span>
                </div>
              </div>
            </div>

            {/* Special Trait & Focus */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#05070a] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Signature Academy Trait
                </span>
                <p className="text-xs font-black text-white">{selectedProspect.specialTrait}</p>
              </div>

              <div className="bg-[#05070a] p-4 rounded-2xl border border-[#1e293b] space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-400" /> Primary Focus Module
                </span>
                <p className="text-xs font-black text-white">{selectedProspect.focusArea}</p>
              </div>
            </div>

            {/* Scout Assessment */}
            <div className="bg-[#05070a] p-4 rounded-2xl border border-[#1e293b] space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                <span>Head of Academy Scouting Dossier</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{selectedProspect.scoutReport}"
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleRunIntensiveDrill(selectedProspect.id)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-amber-300 border border-amber-500/30 font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Dumbbell className="w-4 h-4 text-amber-400" />
                <span>Run Intensive Training Drill</span>
              </button>

              <button
                onClick={() => handleGraduateToSeniorSquad(selectedProspect)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <UserCheck className="w-4 h-4 fill-black" />
                <span>Promote to Senior Roster (₹{selectedProspect.contractCostCr} Cr)</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
