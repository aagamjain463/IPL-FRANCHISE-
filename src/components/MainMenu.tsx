import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { INITIAL_TEAMS } from '../data/teams';
import { SCENARIO_CHALLENGES } from '../data/challenges';
import { Trophy, Shield, Zap, Play, RotateCcw, Award, Flame, UserCheck } from 'lucide-react';
import { MusicPlayerHud } from './MusicPlayerHud';

export const MainMenu: React.FC = () => {
  const { startNewFranchise, loadSavedGame, prepareScenarioChallenge } = useGame();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('csk');
  const [managerName, setManagerName] = useState<string>('Coach');
  const [hasSave, setHasSave] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('ipl_franchise_sim_save_v1'));
  });

  const selectedTeam = INITIAL_TEAMS[selectedTeamId];

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e2e8f0] flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black font-sans">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-[#0a0c12] pt-10 pb-8 px-4 md:px-8 border-b border-[#1e293b] shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" /> T20 Franchise Simulator
              </span>
              <span className="text-xs text-[#64748b]">• 2026 Dynasty Edition</span>
            </div>
                           <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase italic">
                  IPL AUCTION GAME <span className="text-[#D4AF37]">SIMULATOR</span>
                </h1>
                
                <p className="text-[#94a3b8] text-sm md:text-base mt-2 max-w-xl leading-relaxed">
                  Play an immersive IPL auction game and build your own cricket franchise. 
                  Bid on players, manage your auction purse, build your squad, and lead 
                  your team through a multi-season IPL-style franchise simulation.
                </p>
          </div>

          {hasSave && (
            <button
              id="btn-resume-campaign"
              onClick={() => loadSavedGame()}
              className="px-6 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Selection Area */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full space-y-8">
        {/* Step 1: Manager Name */}
        <div className="bg-[#0f172a] p-5 rounded-xl border border-[#1e293b] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Manager Profile
            </h2>
            <p className="text-xs text-[#94a3b8] mt-0.5">Enter your manager identity for press conferences, media interviews, and records.</p>
          </div>
          <div className="w-full md:w-72">
            <input
              id="input-manager-name"
              type="text"
              value={managerName}
              onChange={e => setManagerName(e.target.value)}
              placeholder="e.g. Master Tactician"
              className="w-full bg-[#05070a] border border-[#334155] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition font-medium"
            />
          </div>
        </div>

        {/* Step 2: Choose Franchise */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D4AF37]" /> Select Your Franchise (10 Teams)
              </h2>
              <p className="text-xs text-[#94a3b8]">Each franchise features distinct budgets, home venue pitch traits, and board expectations.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {Object.values(INITIAL_TEAMS).map(team => {
              const isSelected = selectedTeamId === team.id;
              return (
                <div
                  key={team.id}
                  id={`team-card-${team.id}`}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`p-4 rounded-xl cursor-pointer transition relative overflow-hidden border ${
                    isSelected
                      ? 'border-[#D4AF37] bg-[#131d35] shadow-2xl shadow-[#D4AF37]/10 scale-[1.02]'
                      : 'border-[#1e293b] bg-[#0f172a] hover:bg-[#131d35]/60 hover:border-[#334155]'
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mb-3 shadow-md border border-white/20"
                    style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                  >
                    {team.shortName}
                  </div>

                  <h3 className="font-bold text-sm text-white">{team.name}</h3>
                  <p className="text-[11px] text-[#94a3b8] truncate">{team.city}</p>

                  <div className="mt-3 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[11px]">
                    <span className="text-[#64748b]">Titles:</span>
                    <span className="font-mono font-bold text-[#D4AF37] flex items-center gap-0.5">
                      <Trophy className="w-3 h-3" /> {team.titlesWon}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Team Dossier & Launch Button */}
        {selectedTeam && (
          <div className="bg-[#0f172a] p-6 rounded-2xl border border-[#1e293b] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border border-white/20 shadow"
                  style={{ backgroundColor: selectedTeam.primaryColor, color: selectedTeam.secondaryColor }}
                >
                  {selectedTeam.shortName}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{selectedTeam.name} Dossier</h3>
                  <p className="text-xs text-[#94a3b8]">Home Fortress: {selectedTeam.homeVenue}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-[#05070a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Purse Balance</span>
                  <span className="font-mono font-bold text-[#D4AF37] text-sm">₹{selectedTeam.purseCr} Cr</span>
                </div>
                <div className="bg-[#05070a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Core Strength</span>
                  <span className="font-medium text-[#e2e8f0] truncate block">{selectedTeam.strengths[0] || 'Balanced'}</span>
                </div>
                <div className="bg-[#05070a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Board Stance</span>
                  <span className="font-medium text-green-400">
                    {selectedTeam.boardConfidence > 70 ? 'Patient' : 'Demanding'}
                  </span>
                </div>
                <div className="bg-[#05070a] p-2.5 rounded-lg border border-[#1e293b]">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Draft Stance</span>
                  <span className="font-medium text-blue-400">
                    {selectedTeam.aiPersonality.starPreference > 70 ? 'Star Power' : 'Data Driven'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <button
                id="btn-launch-dynasty"
                onClick={() => startNewFranchise(selectedTeamId, managerName, false)}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-[#D4AF37]/20"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Live Mega Auction</span>
              </button>

              <button
                id="btn-launch-dynasty-sim-auction"
                onClick={() => startNewFranchise(selectedTeamId, managerName, true)}
                className="w-full sm:w-auto px-6 py-4 rounded-full bg-[#1e293b] hover:bg-[#334155] border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
                title="Automatically draft balanced rosters for all 10 franchises and advance directly to the season dashboard"
              >
                <Zap className="w-4 h-4 fill-[#D4AF37]" />
                <span>Sim Auction & Play</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Scenario Challenges Showcase */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#e2e8f0] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" /> Instant Clutch Scenarios
            </h3>
            <span className="text-xs text-[#64748b]">Hop straight into historical pressure moments</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SCENARIO_CHALLENGES.slice(0, 3).map(ch => (
              <div 
                key={ch.id}
                id={`scenario-preview-${ch.id}`}
                onClick={() => prepareScenarioChallenge(ch)}
                className="bg-[#0f172a] hover:bg-[#131d35] border border-[#1e293b] hover:border-[#D4AF37]/50 p-4 rounded-xl cursor-pointer transition flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {ch.difficulty}
                    </span>
                    <span className="text-[10px] text-[#D4AF37] font-mono font-bold">{ch.rewardPoints} pts</span>
                  </div>
                  <h4 className="font-bold text-xs text-white mt-1">{ch.title}</h4>
                  <p className="text-[11px] text-[#94a3b8] mt-1 line-clamp-2">{ch.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-[#1e293b] flex items-center justify-between text-[11px] text-[#D4AF37] font-bold uppercase tracking-wider">
                  <span>Play Clutch Over</span>
                  <Zap className="w-3.5 h-3.5 fill-[#D4AF37]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      {/* SEO / Game Information */}
<section className="max-w-6xl mx-auto w-full px-4 md:px-8 pb-8">
  <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 md:p-8">
    <h2 className="text-xl md:text-2xl font-black text-white mb-3">
      IPL Auction Game
    </h2>

    <p className="text-sm text-[#94a3b8] leading-relaxed max-w-4xl">
      Build your own IPL franchise in an immersive cricket management
      simulator. Bid on players, manage your auction purse, select your
      squad and make strategic decisions that shape your franchise across
      multiple seasons.
    </p>

    <h2 className="text-xl md:text-2xl font-black text-white mt-7 mb-3">
      IPL Auction Simulator
    </h2>

    <p className="text-sm text-[#94a3b8] leading-relaxed max-w-4xl">
      Experience the strategy of an IPL-style player auction. Evaluate
      players, decide when to bid, manage your budget and build a balanced
      squad for your franchise.
    </p>

    <h2 className="text-xl md:text-2xl font-black text-white mt-7 mb-3">
      Build Your Cricket Franchise
    </h2>

    <p className="text-sm text-[#94a3b8] leading-relaxed max-w-4xl">
      Choose your franchise, take control as manager and develop your team
      over multiple seasons. Manage your squad and make tactical decisions
      as you attempt to build a successful cricket dynasty.
    </p>
  </div>
  <div className="mt-6">
  <a
    href="/ipl-auction-game"
    className="inline-flex items-center px-5 py-3 rounded-full border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold uppercase tracking-widest hover:bg-[#D4AF37]/10 transition"
  >
    Learn More About the IPL Auction Game
  </a>
</div>
</section>
      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-[#64748b] border-t border-[#1e293b] w-full">
        Full Deterministic Sports Simulator Engine • Designed for Deep Replayability • Multi-Season Dynasty
      </footer>

      {/* Floating Audio Soundtrack & Broadcast HUD */}
      <MusicPlayerHud />
    </div>
  );
};
