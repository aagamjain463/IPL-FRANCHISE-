import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { INITIAL_TEAMS } from '../data/teams';
import { SCENARIO_CHALLENGES } from '../data/challenges';
import { Trophy, Shield, Zap, Play, RotateCcw, Award, Flame, UserCheck, Users, Gavel, Sparkles } from 'lucide-react';
import { MusicPlayerHud } from './MusicPlayerHud';
import { classifyAIPersonality } from '../engine/auctionEngine';

export const MainMenu: React.FC = () => {
  const { startNewFranchise, loadSavedGame, prepareScenarioChallenge } = useGame();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('csk');
  const [managerName, setManagerName] = useState<string>('Coach');
  const [hasSave, setHasSave] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('ipl_franchise_sim_save_v1'));
  });

  const selectedTeam = INITIAL_TEAMS[selectedTeamId];
  const selectedPersona = selectedTeam ? classifyAIPersonality(selectedTeam) : null;

  return (
    <div className="fc-scanlines min-h-screen bg-[#05070a] text-[#e2e8f0] flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black font-sans relative">
      {/* FC 26 Stadium atmosphere */}
      <div className="fc-atmosphere">
        <div className="fc-atmosphere-grid" />
      </div>

      {/* Hero Header */}
      <div className="relative z-10 overflow-hidden pt-10 pb-10 px-4 md:px-8 border-b border-[#1e293b] shadow-xl">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#0B1220_0%,#0E1B2E_45%,#0A101C_100%)]" />
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#00FF87]/10 blur-[110px]" />
        <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#D4AF37]/10 blur-[110px]" />

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.25em] px-3 py-1 rounded-full bg-[#00FF87]/10 text-[#00FF87] font-black border border-[#00FF87]/40 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> THE FC 26 OF CRICKET
              </span>
              <span className="text-[10px] font-mono text-slate-500">• 2026 Dynasty Edition</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase italic leading-none">
              FRANCHISE <span className="gradient-text">XI&nbsp;26</span>
            </h1>
            <p className="text-[#94a3b8] text-sm md:text-base mt-3 max-w-xl leading-relaxed">
              Own a franchise. Outbid nine distinct AI GMs. Build an XI with real chemistry.
              Play every ball on the broadcast. Win the IPL — then do it all again, season after season.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 text-[10px] font-mono text-slate-500">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">⚡ LIVE MEGA AUCTION</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">🧪 BALL-BY-BALL ENGINE</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">🔥 CHEMISTRY &amp; TACTICS</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">🏆 MULTI-SEASON DYNASTY</span>
            </div>
          </div>

          {hasSave && (
            <button
              id="btn-resume-campaign"
              onClick={() => loadSavedGame()}
              className="btn-volt px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resume Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Selection Area */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-8 w-full space-y-8">
        {/* Step 1: Manager Name */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 fc-pop">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37] flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> MANAGER PROFILE
            </h2>
            <p className="text-xs text-[#94a3b8] mt-1">Your identity for press conferences, media interviews, and the record books.</p>
          </div>
          <div className="w-full md:w-80">
            <input
              id="input-manager-name"
              type="text"
              value={managerName}
              onChange={e => setManagerName(e.target.value)}
              placeholder="e.g. Master Tactician"
              className="w-full bg-black/40 border border-[#334155] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FF87] transition font-medium"
            />
          </div>
        </div>

        {/* Step 2: Choose Franchise */}
        <div className="fc-pop-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#D4AF37]" /> SELECT YOUR FRANCHISE
              </h2>
              <p className="text-xs text-[#94a3b8]">Ten real franchises. Each has its own GM personality at the auction table.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {Object.values(INITIAL_TEAMS).map(team => {
              const isSelected = selectedTeamId === team.id;
              const persona = classifyAIPersonality(team);
              return (
                <div
                  key={team.id}
                  id={`team-card-${team.id}`}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition relative overflow-hidden border fc-lift ${
                    isSelected
                      ? 'glass-panel fc-glow-gold border-[#D4AF37] scale-[1.02]'
                      : 'bg-[#0a0f1d]/80 border-[#1e293b] hover:border-[#334155]'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mb-3 shadow-md border border-white/20 relative"
                    style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}
                  >
                    <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent rounded-xl pointer-events-none" />
                    {team.shortName}
                  </div>

                  <h3 className="font-bold text-sm text-white">{team.name}</h3>
                  <p className="text-[10px] text-[#94a3b8] truncate">{team.city}</p>
                  <p className="text-[9px] font-mono text-amber-500/80 mt-1">{persona.icon} {persona.name}</p>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-[#64748b]">Titles:</span>
                    <span className="font-mono font-bold text-[#D4AF37] flex items-center gap-0.5">
                      <Trophy className="w-3 h-3" /> {team.titlesWon}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-[#00FF87] animate-pulse shadow-lg shadow-[#00FF87]/60" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Team Dossier & Launch Button */}
        {selectedTeam && (
          <div className="glass-panel fc-glow-gold p-6 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 fc-pop-2">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border border-white/20 shadow relative overflow-hidden"
                  style={{ backgroundColor: selectedTeam.primaryColor, color: selectedTeam.secondaryColor }}
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                  {selectedTeam.shortName}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{selectedTeam.name} Dossier</h3>
                  <p className="text-xs text-[#94a3b8]">Fortress: {selectedTeam.homeVenue}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Purse</span>
                  <span className="font-mono font-bold text-[#D4AF37] text-sm">₹{selectedTeam.purseCr} Cr</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Tagline</span>
                  <span className="font-medium text-[#e2e8f0] truncate block">{selectedPersona?.tagline}</span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">Board</span>
                  <span className="font-medium text-green-400">
                    {selectedTeam.boardConfidence > 70 ? 'Patient' : 'Demanding'}
                  </span>
                </div>
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[#64748b] block text-[10px] uppercase tracking-wider font-semibold">GM Style</span>
                  <span className="font-medium text-blue-400">{selectedPersona?.name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <button
                id="btn-launch-dynasty"
                onClick={() => startNewFranchise(selectedTeamId, managerName, false)}
                className="btn-gold w-full sm:w-auto px-7 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Single Player Auction</span>
              </button>

              <button
                id="btn-launch-multiplayer-auction"
                onClick={() => startNewFranchise(selectedTeamId, managerName, false, true)}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 cursor-pointer border border-blue-400/30"
              >
                <Users className="w-4 h-4" />
                <span>🌐 Multiplayer Room</span>
              </button>

              <button
                id="btn-launch-dynasty-sim-auction"
                onClick={() => startNewFranchise(selectedTeamId, managerName, true)}
                className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-[#D4AF37]/40 text-[#D4AF37] font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                title="Automatically draft balanced rosters for all 10 franchises and advance directly to the season dashboard"
              >
                <Zap className="w-4 h-4 fill-[#D4AF37]" />
                <span>Sim &amp; Play</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Scenario Challenges Showcase */}
        <div className="pt-2 fc-pop-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#e2e8f0] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" /> INSTANT CLUTCH SCENARIOS
            </h3>
            <span className="text-xs text-[#64748b]">Jump straight into historical pressure moments</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SCENARIO_CHALLENGES.slice(0, 3).map(ch => (
              <div
                key={ch.id}
                id={`scenario-preview-${ch.id}`}
                onClick={() => prepareScenarioChallenge(ch)}
                className="glass-panel fc-lift rounded-2xl p-4 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {ch.difficulty}
                    </span>
                    <span className="text-[10px] text-[#D4AF37] font-mono font-bold">{ch.rewardPoints} pts</span>
                  </div>
                  <h4 className="font-bold text-xs text-white mt-1">{ch.title}</h4>
                  <p className="text-[11px] text-[#94a3b8] mt-1 line-clamp-2">{ch.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#D4AF37] font-bold uppercase tracking-wider">
                  <span>Play Clutch Over</span>
                  <Zap className="w-3.5 h-3.5 fill-[#D4AF37]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACHIEVEMENT STRIP */}
        <div className="glass-panel rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Gavel, label: '1. OWN', desc: 'Choose your franchise & GM persona' },
            { icon: Zap, label: '2. AUCTION', desc: 'Outbid 9 AI rivals live' },
            { icon: Shield, label: '3. BUILD', desc: 'XI, chemistry, training & tactics' },
            { icon: Trophy, label: '4. WIN', desc: 'League → Playoffs → IPL Final' }
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center text-[#00FF87] shrink-0">
                <s.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white uppercase tracking-widest">{s.label}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-4 py-6 text-center text-xs text-[#64748b] border-t border-[#1e293b] w-full">
        FRANCHISE XI 26 • Ball-by-ball tactical core • Multi-season dynasty • Build. Bid. Dominate.
      </footer>

      {/* Floating Audio Soundtrack & Broadcast HUD */}
      <MusicPlayerHud />
    </div>
  );
};
