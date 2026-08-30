import React from 'react';
import { useGame } from '../context/GameContext';
import { Navbar } from '../components/Navbar';
import { MusicPlayerHud } from '../components/MusicPlayerHud';
import { PlayerCardModal } from '../components/PlayerCardModal';
import { FCLiveHub } from '../components/fc26/FCLiveHub';
import { ChevronsLeft, ChevronsRight, MonitorPlay } from 'lucide-react';

interface MainAppLayoutProps {
  children: React.ReactNode;
}

export const MainAppLayout: React.FC<MainAppLayoutProps> = ({ children }) => {
  const { gameState, selectedPlayerForModal, setSelectedPlayerForModal, showToast } = useGame();
  const [hubOpen, setHubOpen] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('fc_live_hub') !== '0';
    } catch {
      return true;
    }
  });

  if (!gameState) return null;

  const toggleHub = () => {
    const next = !hubOpen;
    setHubOpen(next);
    try {
      localStorage.setItem('fc_live_hub', next ? '1' : '0');
    } catch {
      /* noop */
    }
    showToast(next ? 'Live Hub docked — multi-screen mode ON' : 'Live Hub hidden — focus mode ON', 'info');
  };

  const seasonProgress = gameState.leagueSchedule?.length
    ? Math.min(100, Math.round(((gameState.currentFixtureIndex || 0) / gameState.leagueSchedule.length) * 100))
    : 0;

  return (
    <div className="fc-scanlines min-h-screen bg-canvas text-ink font-sans flex flex-col selection:bg-gold selection:text-black relative">
      {/* Multi-layer FC 26 stadium atmosphere */}
      <div className="fc-atmosphere">
        <div className="fc-atmosphere-grid" />
      </div>

      {/* Global Navigation Hub (Top Bar + Desktop Tabs + Mobile Bottom Nav) */}
      <div className="relative z-10">
        <Navbar />
      </div>

      {/* Season progress strip — broadcast ticker bar */}
      <div className="relative z-10 fc-header border-b-0 px-3 sm:px-6 py-1.5 flex items-center gap-3">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-1.5 shrink-0">
          <MonitorPlay className="w-3 h-3 text-[#00FF87]" />
          SEASON {gameState.currentSeason} · {gameState.seasonStage || 'League'}
        </span>
        <div className="fc-bar flex-1 h-1.5 rounded-full">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#00FF87] via-[#00E5FF] to-[#D4AF37] transition-all duration-700"
            style={{ width: `${seasonProgress}%` }}
          />
        </div>
        <span className="text-[9px] font-mono text-slate-500 shrink-0">
          MATCH {Math.min((gameState.currentFixtureIndex || 0) + 1, gameState.leagueSchedule?.length || 1)} / {gameState.leagueSchedule?.length || 1}
        </span>
        <button
          onClick={toggleHub}
          className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition cursor-pointer"
          title={hubOpen ? 'Focus Mode — Live Hub off' : 'Multi-Screen — Live Hub on'}
        >
          {hubOpen ? <ChevronsRight className="w-3 h-3" /> : <ChevronsLeft className="w-3 h-3" />}
          {hubOpen ? 'FOCUS' : 'LIVE'}
        </button>
      </div>

      {/* Main Content Area — multi-screen grid with dockable Live Hub */}
      <main className="relative z-10 flex-1 w-full max-w-[1800px] mx-auto px-4 md:px-8 pt-5 pb-20 md:pb-12 flex gap-6">
        <div className="flex-1 min-w-0">{children}</div>
        <div className={`w-[330px] shrink-0 transition-all duration-500 ${hubOpen ? 'opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-6 overflow-hidden pointer-events-none'}`}>
          <FCLiveHub />
        </div>
      </main>

      {/* Floating Audio Soundtrack Controller */}
      <MusicPlayerHud />

      {/* Sophisticated Dark Global Footer */}
      <footer className="relative z-10 hidden md:flex px-6 md:px-8 py-3 bg-canvas/80 backdrop-blur border-t border-line justify-between items-center gap-2 mt-auto">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-faint">
              FRANCHISE XI 26 ENGINE: {gameState.currentSeason} SEASON SYNCED
            </span>
          </div>
          <span className="text-[10px] text-ink-faint/70 font-mono hidden lg:inline">
            {userSquadStats(gameState.userTeamId, gameState.teams, gameState.allPlayers)}
          </span>
        </div>
        <div className="text-[10px] text-ink-faint/70 uppercase tracking-wider font-mono">
          FC 26 OF CRICKET • Build. Bid. Dominate.
        </div>
      </footer>

      {/* Global Player Card Modal */}
      <PlayerCardModal
        player={selectedPlayerForModal}
        onClose={() => setSelectedPlayerForModal(null)}
      />
    </div>
  );
};

/** Small helper: squad headline stats for the footer strip. */
function userSquadStats(userTeamId: string, teams: Record<string, any>, players: Record<string, any>): string {
  const t = teams[userTeamId];
  if (!t) return '';
  const squad = (t.rosterPlayerIds || []).map((id: string) => players[id]).filter(Boolean);
  const xiIds = t.playingXI?.playingXIIds || [];
  const xi = xiIds.map((id: string) => players[id]).filter(Boolean);
  const ovr = xi.length ? Math.round(xi.reduce((s: number, p: any) => s + p.overall, 0) / xi.length) : 0;
  return `${squad.length} PLAYERS · XI OVR ${ovr} · PURSE ₹${(t.purseCr || 0).toFixed(1)} CR`;
}
