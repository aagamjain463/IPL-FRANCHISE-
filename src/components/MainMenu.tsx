import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { INITIAL_TEAMS } from '../data/teams';
import { classifyAIPersonality } from '../engine/auctionEngine';
import {
  Activity,
  ArrowRight,
  BadgeIndianRupee,
  Brain,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dumbbell,
  Gamepad2,
  Gavel,
  Globe2,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap
} from 'lucide-react';
import { MusicPlayerHud } from './MusicPlayerHud';
import { GoogleCloudSaveClient, loadGoogleIdentityScript } from '../services/googleCloudSaveClient';

const featureReel = [
  'Live Mega Auction',
  'Cricket PlayStyles',
  'Chemistry XI',
  'Youth Evolutions',
  'Broadcast Matchday',
  'Rivalry Engine',
  'Board Pressure',
  'Dynamic Newsroom',
  'Venue Intelligence',
  'Career Storylines'
];

const launchModes = [
  { title: 'Dynasty Career', subtitle: 'Multi-season franchise control', icon: <Crown className="w-5 h-5" /> },
  { title: 'Auction War Room', subtitle: 'Build through rival bidding battles', icon: <Gavel className="w-5 h-5" /> },
  { title: 'Matchday Live', subtitle: 'Ball-by-ball broadcast cockpit', icon: <Zap className="w-5 h-5" /> },
  { title: 'Academy Evolution', subtitle: 'Create future stars', icon: <Sparkles className="w-5 h-5" /> }
];

export const MainMenu: React.FC = () => {
  const { startNewFranchise, loadSavedGame, signInWithGoogle } = useGame();
  const [showTitle, setShowTitle] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('csk');
  const [managerName, setManagerName] = useState<string>('Coach');
  const [hasSave] = useState<boolean>(() => Boolean(localStorage.getItem('ipl_franchise_sim_save_v1')));
  const [mode, setMode] = useState<'auction' | 'season'>('auction');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  const menuGoogleButtonRef = useRef<HTMLDivElement | null>(null);

  const teams = Object.values(INITIAL_TEAMS);
  const selectedTeam = INITIAL_TEAMS[selectedTeamId];
  const selectedIndex = teams.findIndex(t => t.id === selectedTeamId);
  const persona = selectedTeam ? classifyAIPersonality(selectedTeam) : null;

  const teamDossier = useMemo(() => {
    if (!selectedTeam) return [];
    return [
      { label: 'Titles', value: selectedTeam.titlesWon, icon: <Trophy className="w-4 h-4" /> },
      { label: 'Starting Purse', value: `₹${selectedTeam.purseCr}Cr`, icon: <BadgeIndianRupee className="w-4 h-4" /> },
      { label: 'Fan Pulse', value: `${selectedTeam.fanSentiment}%`, icon: <Radio className="w-4 h-4" /> },
      { label: 'Board Trust', value: `${selectedTeam.boardConfidence}%`, icon: <Shield className="w-4 h-4" /> }
    ];
  }, [selectedTeam]);

  const selectOffset = (direction: -1 | 1) => {
    const next = (selectedIndex + direction + teams.length) % teams.length;
    setSelectedTeamId(teams[next].id);
  };

  const begin = () => {
    startNewFranchise(selectedTeamId, managerName || 'Coach', mode === 'season');
  };

  useEffect(() => {
    if (showTitle) return;
    const clientId = GoogleCloudSaveClient.getClientId();
    if (!clientId) {
      setCloudError('Google cloud save is not configured on this deployment.');
      return;
    }
    let cancelled = false;
    loadGoogleIdentityScript().then(() => {
      if (cancelled || !menuGoogleButtonRef.current) return;
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return setCloudError('Google did not return a credential.');
          setCloudLoading(true);
          const ok = await signInWithGoogle(response.credential);
          setCloudLoading(false);
          if (!ok) setCloudError('Could not restore Google cloud save.');
        }
      });
      menuGoogleButtonRef.current.innerHTML = '';
      google.accounts.id.renderButton(menuGoogleButtonRef.current, { theme: 'filled_blue', size: 'large', type: 'standard', text: 'continue_with', shape: 'pill', width: 260 });
    }).catch(err => setCloudError(err instanceof Error ? err.message : 'Failed to load Google sign-in'));
    return () => { cancelled = true; };
  }, [showTitle, signInWithGoogle]);

  if (showTitle) {
    return (
      <div className="console-title-screen fc-scanlines" onClick={() => setShowTitle(false)}>
        <div className="console-title-screen__grid" />
        <div className="console-title-screen__hero">
          <div className="console-title-screen__mark"><Gamepad2 className="w-11 h-11" /></div>
          <p>AN ORIGINAL CRICKET FRANCHISE UNIVERSE</p>
          <h1>FRANCHISE<br /><span>XI 26</span></h1>
          <button><Play className="w-4 h-4 fill-current" /> Press / Tap To Enter</button>
        </div>
        <div className="console-title-screen__ticker">
          {[...featureReel, ...featureReel].map((item, i) => <span key={`${item}-${i}`}>{item}</span>)}
        </div>
      </div>
    );
  }

  return (
    <div className="nextgen-menu fc-scanlines">
      <div className="nextgen-menu__stadium" />
      <header className="nextgen-menu__topbar">
        <div>
          <p>FRANCHISE XI 26</p>
          <strong>CRICKET DYNASTY EDITION</strong>
        </div>
        <div className="nextgen-menu__top-actions">
          {hasSave && (
            <button onClick={loadSavedGame} className="nextgen-menu__resume">
              <RotateCcw className="w-4 h-4" /> Resume Save
            </button>
          )}
          <div className="nextgen-menu__google-restore" title={cloudError || 'Restore Google cloud save'}>
            {cloudLoading ? <span>Restoring…</span> : cloudError ? <button type="button">Google Save Setup Needed</button> : <div ref={menuGoogleButtonRef} />}
          </div>
          <button onClick={() => setShowTitle(true)} className="nextgen-menu__ghost">Title Screen</button>
        </div>
      </header>

      <main className="nextgen-menu__main">
        <section className="nextgen-menu__billboard">
          <div className="nextgen-menu__billboard-copy">
            <span className="nextgen-menu__pill"><Sparkles className="w-3.5 h-3.5" /> New Generation Cricket Career</span>
            <h1>Build the most feared T20 franchise on earth.</h1>
            <p>
              Auction wars, player-card identity, PlayStyles, chemistry, tactical matchdays, academy evolutions,
              rivalries, board pressure and a living cricket media universe — all inside one save.
            </p>
          </div>

          <div className="nextgen-menu__mode-stack">
            {launchModes.map((item, index) => (
              <article key={item.title} style={{ '--delay': `${index * 80}ms` } as React.CSSProperties}>
                <span>{item.icon}</span>
                <div>
                  <b>{item.title}</b>
                  <small>{item.subtitle}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="nextgen-menu__selector">
          <div className="nextgen-menu__selector-head">
            <div>
              <p>Choose Your Club</p>
              <h2>Franchise Coverflow</h2>
            </div>
            <div className="nextgen-menu__selector-controls">
              <button onClick={() => selectOffset(-1)}><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => selectOffset(1)}><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="nextgen-menu__teams">
            {teams.map((team, index) => {
              const offset = index - selectedIndex;
              const isSelected = team.id === selectedTeamId;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={isSelected ? 'is-selected' : ''}
                  style={{
                    '--team-primary': team.primaryColor,
                    '--team-secondary': team.secondaryColor,
                    '--offset': offset
                  } as React.CSSProperties}
                >
                  <span>{team.shortName}</span>
                  <b>{team.name}</b>
                  <small>{team.city}</small>
                </button>
              );
            })}
          </div>
        </section>

        {selectedTeam && (
          <section className="nextgen-menu__launchpad">
            <div className="nextgen-menu__club-card">
              <div className="nextgen-menu__club-crest" style={{ backgroundColor: selectedTeam.primaryColor, color: selectedTeam.secondaryColor }}>
                {selectedTeam.shortName}
              </div>
              <div className="nextgen-menu__club-copy">
                <p>Selected Franchise</p>
                <h2>{selectedTeam.name}</h2>
                <span>{persona?.icon} {persona?.name} · {persona?.tagline || 'Elite franchise identity'}</span>
              </div>
            </div>

            <div className="nextgen-menu__dossier">
              {teamDossier.map(item => (
                <div key={item.label}>
                  <span>{item.icon}</span>
                  <p>{item.label}</p>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>

            <div className="nextgen-menu__manager-panel">
              <label>
                <span>Manager Identity</span>
                <input value={managerName} onChange={e => setManagerName(e.target.value)} placeholder="Enter manager name" />
              </label>
              <div className="nextgen-menu__mode-toggle">
                <button className={mode === 'auction' ? 'is-active' : ''} onClick={() => setMode('auction')}>
                  <Gavel className="w-4 h-4" /> Start at Auction
                </button>
                <button className={mode === 'season' ? 'is-active' : ''} onClick={() => setMode('season')}>
                  <Trophy className="w-4 h-4" /> Auto Build Season
                </button>
              </div>
              <button onClick={begin} className="nextgen-menu__start">
                Launch Career <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

        <section className="nextgen-menu__feature-grid">
          {[
            { icon: <Brain className="w-5 h-5" />, title: 'Cricket PlayStyles', text: 'Every star gets role-defining traits and tactical boosts.' },
            { icon: <Users className="w-5 h-5" />, title: 'Chemistry XI', text: 'Build partnerships instead of just chasing overall ratings.' },
            { icon: <Swords className="w-5 h-5" />, title: 'Rivalry Memory', text: 'Derbies change fan pulse, pressure and storyline stakes.' },
            { icon: <Dumbbell className="w-5 h-5" />, title: 'Evolutions', text: 'Turn academy prospects into future franchise icons.' },
            { icon: <Globe2 className="w-5 h-5" />, title: 'Living League', text: 'News, board mandates, events and media pressure evolve.' },
            { icon: <Activity className="w-5 h-5" />, title: 'Venue Intelligence', text: 'Pitch, dew, par score and home edge shape match plans.' }
          ].map(card => (
            <article key={card.title}>
              <span>{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </section>
      </main>

      <MusicPlayerHud />
    </div>
  );
};
