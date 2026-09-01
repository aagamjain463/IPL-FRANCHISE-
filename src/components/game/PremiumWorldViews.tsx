import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGame } from '../../context/GameContext';
import { SquadManagementView } from '../SquadManagementView';
import { MatchLiveView } from '../MatchLiveView';
import { NewsRoomView } from '../NewsRoomView';
import { ClubFranchiseView } from '../ClubFranchiseView';
import { YouthAcademyView } from '../YouthAcademyView';
import { SuperOverH2HView } from '../SuperOverH2HView';
import { FCPlayerCard } from '../fc26/FCPlayerCard';
import { getBidIncrement } from '../../engine/auctionEngine';
import { getLiveSeasonEvent, getPreMatchBriefing } from '../../engine/ultimateCricketEngine';
import { bidPulseMotion, cardHoverGesture, cardMotion, cinematicHeroMotion, listContainerMotion, revealUpMotion, subtleHoverGesture, tapGesture } from '../../motion';
import { LeaderboardMiniPanel } from '../LeaderboardMiniPanel';
import {
  ArrowRight,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gavel,
  Gift,
  Play,
  Shield,
  Swords,
  Trophy,
  Users,
  Zap
} from 'lucide-react';

const FormStrip: React.FC<{ form?: string[] }> = ({ form = ['W', 'W', 'L', 'W', 'W'] }) => (
  <div className="premium-form-strip">
    {form.map((f, i) => <span key={i} className={f === 'W' ? 'is-win' : 'is-loss'}>{f}</span>)}
  </div>
);

const EventCarousel: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState, setActiveTab } = useGame();
  const event = gameState ? getLiveSeasonEvent(gameState) : null;
  const items = [
    { title: 'Auction Wars', desc: 'Win value battles under purse pressure.', timer: event?.timer || 'LIVE', reward: '500 XP + Scout Tokens', tone: '#D4AF37', icon: <Gavel className="w-7 h-7" />, action: () => setActiveTab('AuctionLive') },
    { title: 'Super Over Showdown', desc: 'Clutch six-ball ranked cricket.', timer: '02:14:32', reward: '+35 RP per win', tone: '#FF1E56', icon: <Zap className="w-7 h-7" />, action: () => setActiveTab('Play') },
    { title: 'Rivalry Night', desc: 'Beat your rival and swing fan sentiment.', timer: 'MATCHDAY', reward: 'Fan Pulse Boost', tone: '#00E5FF', icon: <Swords className="w-7 h-7" />, action: () => setActiveTab('Play') },
    { title: 'Champions Cup', desc: 'Push for playoff qualification.', timer: 'SEASON', reward: 'Legacy Trophy XP', tone: '#8B5CF6', icon: <Trophy className="w-7 h-7" />, action: () => setActiveTab('League') }
  ];

  return (
    <motion.div className="premium-event-carousel" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
      {items.map(item => (
        <motion.button
          key={item.title}
          onClick={item.action}
          variants={shouldReduceMotion ? undefined : cardMotion}
          whileHover={shouldReduceMotion ? undefined : cardHoverGesture}
          whileTap={shouldReduceMotion ? undefined : tapGesture}
          style={{ '--event': item.tone } as React.CSSProperties}
        >
          <i>{item.icon}</i>
          <small>ENDS IN {item.timer}</small>
          <h3>{item.title}</h3>
          <p>{item.desc}</p>
          <b>{item.reward}</b>
          <span>ENTER <ArrowRight className="w-4 h-4" /></span>
        </motion.button>
      ))}
    </motion.div>
  );
};

export const PremiumPlayView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState, prepareMatch, setActiveTab } = useGame();
  const [showH2H, setShowH2H] = useState(false);
  if (!gameState) return null;
  if (showH2H) return <SuperOverH2HView onBackToPlay={() => setShowH2H(false)} />;

  const team = gameState.teams[gameState.userTeamId];
  const briefing = getPreMatchBriefing(gameState);
  const opponentId = briefing?.fixture.teamAId === gameState.userTeamId ? briefing?.fixture.teamBId : briefing?.fixture.teamAId;
  const opponent = opponentId ? gameState.teams[opponentId] : null;
  const modes = [
    { title: 'Super Over H2H', kicker: 'LIVE 1v1', desc: 'Six balls. Two wickets. Pure pressure.', icon: <Zap className="w-8 h-8" />, tone: '#FF1E56', action: () => setShowH2H(true), big: true },
    { title: 'Season', kicker: 'LEAGUE', desc: 'Fixtures, standings and playoff path.', icon: <Trophy className="w-8 h-8" />, tone: '#D4AF37', action: () => setActiveTab('League') },
    { title: 'Live Events', kicker: 'EVENTS', desc: 'Timed rewards and special objectives.', icon: <Gift className="w-8 h-8" />, tone: '#00E5FF', action: () => setActiveTab('Rewards') },
    { title: 'Rivalries', kicker: 'DERBY', desc: 'High-pressure franchise battles.', icon: <Swords className="w-8 h-8" />, tone: '#8B5CF6', action: () => setActiveTab('Challenges') }
  ];

  return (
    <motion.div className="premium-play-screen premium-play-screen--minimal" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
      <motion.section className="premium-versus-hero" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}>
        <motion.div variants={shouldReduceMotion ? undefined : revealUpMotion}>
          <p>MATCHDAY</p>
          <h1>One clean route into the next match.</h1>
          <span>No duplicate start panels. Choose your next fixture here, then enter the stadium.</span>
        </motion.div>
        {briefing && (
          <motion.div className="premium-h2h-card" variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : subtleHoverGesture}>
            <small>NEXT MATCH</small>
            <div className="premium-versus-line">
              <b style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}>{team.shortName}</b>
              <strong>VS</strong>
              <b style={{ backgroundColor: opponent?.primaryColor, color: opponent?.secondaryColor }}>{opponent?.shortName || 'OPP'}</b>
            </div>
            <p>{briefing.venue.venue}</p>
            <FormStrip />
            <button onClick={() => prepareMatch(briefing.fixture.id)}>START MATCH <ChevronRight className="w-4 h-4" /></button>
          </motion.div>
        )}
      </motion.section>
      <motion.section className="premium-mode-grid premium-mode-grid--clean" variants={shouldReduceMotion ? undefined : listContainerMotion}>
        {modes.map(m => (
          <motion.button
            key={m.title}
            onClick={m.action}
            variants={shouldReduceMotion ? undefined : cardMotion}
            whileHover={shouldReduceMotion ? undefined : cardHoverGesture}
            whileTap={shouldReduceMotion ? undefined : tapGesture}
            className={m.big ? 'is-featured' : ''}
            style={{ '--mode': m.tone } as React.CSSProperties}
          >
            <i>{m.icon}</i>
            <small>{m.kicker}</small>
            <h2>{m.title}</h2>
            <p>{m.desc}</p>
            <span>OPEN <ArrowRight className="w-4 h-4" /></span>
          </motion.button>
        ))}
      </motion.section>
      <EventCarousel />
    </motion.div>
  );
};

export const PremiumAuctionView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const {
    gameState,
    placeUserBid,
    fastForwardAuctionPlayer,
    simulateCurrentAuctionSet,
    simulateEntireAuction,
    togglePauseAuction,
    toggleAutoBid,
    setSelectedPlayerForModal,
    setActiveTab,
    setCurrentScreen
  } = useGame();
  const [panel, setPanel] = useState<'live' | 'pool' | 'teams'>('live');
  const [auctionMode, setAuctionMode] = useState<'choice' | 'ai-ready' | 'ai-live'>('choice');
  const [inspectTeamId, setInspectTeamId] = useState<string>(gameState?.userTeamId || '');

  useEffect(() => {
    if (gameState?.auctionState && auctionMode !== 'ai-live' && !gameState.auctionState.isPaused) {
      togglePauseAuction();
    }
  }, [auctionMode, gameState?.auctionState?.isPaused, togglePauseAuction]);

  if (!gameState?.auctionState) return null;

  const auc = gameState.auctionState;
  const player = auc.activePlayer;
  const team = gameState.teams[gameState.userTeamId];
  const leading = auc.currentLeadingTeamId ? gameState.teams[auc.currentLeadingTeamId] : null;
  const nextBid = Number((auc.currentBidCr + getBidIncrement(auc.currentBidCr)).toFixed(2));
  const isUserLeading = auc.currentLeadingTeamId === gameState.userTeamId;
  const canBid = Boolean(player && team?.purseCr >= nextBid && !isUserLeading);
  const upcoming = auc.allPlayerPool.slice((auc.currentPlayerIndex || 0) + 1, (auc.currentPlayerIndex || 0) + 9);
  const userSquad = (team.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const inspectedTeam = gameState.teams[inspectTeamId] || team;
  const inspectedSquad = (inspectedTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean).sort((a, b) => b.overall - a.overall);
  const openMultiplayer = () => {
    setActiveTab('MultiplayerAuction');
    setCurrentScreen('MultiplayerAuction');
    window.history.pushState({}, '', '/multiplayer-auction');
    window.dispatchEvent(new Event('ipl-franchise-location-change'));
  };
  const startAIAuction = () => {
    setAuctionMode('ai-live');
    if (auc.isPaused) togglePauseAuction();
  };

  if (!player) {
    return (
      <motion.div className="clean-auction" initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.section className="clean-auction__complete" variants={shouldReduceMotion ? undefined : cinematicHeroMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
          <Trophy className="w-14 h-14" />
          <h1>Auction Complete</h1>
          <p>All lots are complete. Review your roster or enter the season.</p>
          <button onClick={() => { setCurrentScreen('Dashboard'); setActiveTab('PlayingXI'); }}>BUILD PLAYING XI</button>
        </motion.section>
      </motion.div>
    );
  }

  if (auctionMode !== 'ai-live') {
    return (
      <motion.div className="clean-auction clean-auction--gateway" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
        <motion.section className="auction-mode-gateway" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}>
          <div className="auction-mode-gateway__intro">
            <small>AUCTION WAR ROOM</small>
            <h1>Choose your auction format.</h1>
            <p>Start with a controlled AI single-player auction or enter the real-time multiplayer arena with actual hosted rooms.</p>
          </div>
          <div className="auction-mode-gateway__cards">
            <motion.button variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture} whileTap={shouldReduceMotion ? undefined : tapGesture} onClick={() => setAuctionMode('ai-ready')} className={auctionMode === 'ai-ready' ? 'is-selected' : ''}>
              <i><Gavel className="w-8 h-8" /></i>
              <span>SINGLE PLAYER</span>
              <h2>AI Auction</h2>
              <p>Bid against realistic franchise AI. The auction will not begin until you press Start.</p>
              <b>Solo War Room</b>
            </motion.button>
            <motion.button variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture} whileTap={shouldReduceMotion ? undefined : tapGesture} onClick={openMultiplayer} className="is-multiplayer">
              <i><Users className="w-8 h-8" /></i>
              <span>REAL-TIME</span>
              <h2>Live Multiplayer</h2>
              <p>Host or join real rooms with friends. Only active lobbies appear — no fake AI rooms.</p>
              <b>Online Auction</b>
            </motion.button>
          </div>
          <LeaderboardMiniPanel title="Auction Master Rankings" compact />
        </motion.section>

        {auctionMode === 'ai-ready' && (
          <motion.section className="auction-start-panel" variants={shouldReduceMotion ? undefined : cardMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
            <div>
              <small>NEXT LOT READY</small>
              <h2>{player.name}</h2>
              <p>{player.role} · {player.nationality} · Base ₹{player.basePriceCr.toFixed(2)}Cr · {player.overall} OVR</p>
            </div>
            <button onClick={startAIAuction}>START AI AUCTION</button>
          </motion.section>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div className="clean-auction" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
      <motion.section className="clean-auction__stage" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}>
        <div className="clean-auction__player">
          <small>LOT #{auc.currentPlayerIndex + 1} / {auc.allPlayerPool.length}</small>
          <h1 onClick={() => setSelectedPlayerForModal(player)}>{player.name}</h1>
          <p>{player.role} · {player.nationality} · {player.age} yrs · Base ₹{player.basePriceCr.toFixed(2)}Cr</p>
          <div className="clean-auction__attributes">
            <span><b>{player.overall}</b> OVR</span>
            <span><b>{player.battingRating}</b> BAT</span>
            <span><b>{player.bowlingRating}</b> BOWL</span>
            <span><b>{player.potential}</b> POT</span>
          </div>
        </div>

        <motion.div className="clean-auction__bid" variants={shouldReduceMotion ? undefined : cardMotion}>
          <small>CURRENT BID</small>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={`${auc.activePlayer?.id || 'lot'}-${auc.currentBidCr}`}
              variants={shouldReduceMotion ? undefined : bidPulseMotion}
              initial={shouldReduceMotion ? false : "initial"}
              animate="enter"
              exit="exit"
            >₹{auc.currentBidCr.toFixed(2)}Cr</motion.h2>
          </AnimatePresence>
          <p>{leading ? `${leading.name} leading` : 'No paddle raised yet'}</p>
          <div className="clean-auction__timer"><Clock className="w-5 h-5" /> 0:{auc.auctionTimerSeconds.toString().padStart(2, '0')} · {auc.hammerState}</div>
          <div className="clean-auction__actions clean-auction__actions--two">
            <motion.button onClick={placeUserBid} disabled={!canBid} whileTap={shouldReduceMotion ? undefined : tapGesture}>{isUserLeading ? 'YOU LEAD' : `BID ₹${nextBid}Cr`}</motion.button>
            <motion.button onClick={fastForwardAuctionPlayer} className="ghost" whileTap={shouldReduceMotion ? undefined : tapGesture}>RESOLVE LOT</motion.button>
          </div>
        </motion.div>
      </motion.section>

      <motion.section className="clean-auction__status" variants={shouldReduceMotion ? undefined : listContainerMotion}>
        <div><small>Your Purse</small><b>₹{team.purseCr.toFixed(2)}Cr</b></div>
        <div><small>Squad</small><b>{userSquad.length}/25</b></div>
        <div><small>Overseas</small><b>{userSquad.filter(p => p.isOverseas).length}/8</b></div>
        <div><small>Sold</small><b>{auc.soldPlayerRecords.length}</b></div>
        <div><small>Unsold</small><b>{auc.unsoldPlayerIds.length}</b></div>
      </motion.section>

      <LeaderboardMiniPanel title="Auction Master Leaderboard" compact />

      <section className="clean-auction__tabs clean-auction__tabs--multiplayer">
        <button className="clean-auction__multiplayer-entry" onClick={openMultiplayer}>LIVE MULTIPLAYER</button>
        {(['live', 'pool', 'teams'] as const).map(x => <button key={x} className={panel === x ? 'is-active' : ''} onClick={() => setPanel(x)}>{x}</button>)}
        <button onClick={togglePauseAuction}>{auc.isPaused ? 'RESUME' : 'PAUSE'}</button>
        <button onClick={toggleAutoBid}>AUTO BID {auc.isAutoBidEnabled ? 'ON' : 'OFF'}</button>
        <button onClick={simulateCurrentAuctionSet}>SIM SET</button>
        <button onClick={() => simulateEntireAuction(false)}>SIM AUCTION</button>
      </section>

      {panel === 'live' && (
        <section className="clean-auction__lower">
          <article>
            <h3>Recent Bids</h3>
            <AnimatePresence initial={false}>
              {auc.bidHistory.slice(0, 8).map((b, i) => <motion.div key={`${b.teamId}-${b.timestamp}-${b.bidAmountCr}`} className="clean-row clean-row--bid" variants={shouldReduceMotion ? undefined : bidPulseMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter" exit="exit"><span>{b.teamShortName}</span><b>₹{b.bidAmountCr.toFixed(2)}Cr</b></motion.div>)}
            </AnimatePresence>
            {!auc.bidHistory.length && <p className="clean-muted">Waiting for rival paddles...</p>}
          </article>
          <article>
            <h3>On Deck</h3>
            {upcoming.slice(0, 6).map((p, i) => <motion.button key={p.id} onClick={() => setSelectedPlayerForModal(p)} className="clean-row" variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : subtleHoverGesture} whileTap={shouldReduceMotion ? undefined : tapGesture}><span>#{auc.currentPlayerIndex + i + 2} {p.name}</span><b>{p.overall}</b></motion.button>)}
          </article>
        </section>
      )}

      {panel === 'pool' && (
        <section className="clean-auction__pool">
          {upcoming.map((p, i) => <button key={p.id} onClick={() => setSelectedPlayerForModal(p)}><small>LOT #{auc.currentPlayerIndex + i + 2}</small><h3>{p.name}</h3><span>{p.role}</span><b>{p.overall}</b></button>)}
        </section>
      )}

      {panel === 'teams' && (
        <section className="clean-auction__opponents">
          <div className="clean-auction__teams">
            {(Object.values(gameState.teams) as any[]).map(t => (
              <button
                key={t.id}
                onClick={() => setInspectTeamId(t.id)}
                className={inspectedTeam.id === t.id ? 'is-active' : ''}
              >
                <span style={{ backgroundColor: t.primaryColor, color: t.secondaryColor }}>{t.shortName}</span>
                <div><h3>{t.name}</h3><p>{t.rosterPlayerIds.length}/25 squad</p></div>
                <b>₹{t.purseCr.toFixed(1)}Cr</b>
              </button>
            ))}
          </div>

          <article className="clean-auction__squad-inspector">
            <header>
              <div>
                <small>OPPONENT SQUAD INSPECTOR</small>
                <h3>{inspectedTeam.name}</h3>
              </div>
              <b>{inspectedSquad.length}/25</b>
            </header>
            <div className="clean-auction__squad-list">
              {inspectedSquad.length ? inspectedSquad.map(p => (
                <button key={p.id} onClick={() => setSelectedPlayerForModal(p)}>
                  <span>{p.overall}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.role} · {p.isOverseas ? p.nationality : 'Indian'} · ₹{(p.salaryCr || p.basePriceCr || 0).toFixed(2)}Cr</small>
                  </div>
                  <em>{p.form?.toFixed ? p.form.toFixed(1) : p.form} FORM</em>
                </button>
              )) : <p className="clean-muted">No players in this squad yet. Watch their auction strategy as lots resolve.</p>}
            </div>
          </article>
        </section>
      )}
    </motion.div>
  );
};

export const PremiumSquadView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState, setSelectedPlayerForModal, setActiveTab } = useGame();
  if (!gameState) return <SquadManagementView />;
  const team = gameState.teams[gameState.userTeamId];
  const squad = (team.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const starters = (team.playingXI?.playingXIIds || squad.slice(0, 11).map(p => p.id)).map(id => gameState.allPlayers[id]).filter(Boolean);
  const bench = squad.filter(p => !starters.some(s => s.id === p.id));
  const ovr = starters.length ? Math.round(starters.reduce((s, p) => s + p.overall, 0) / starters.length) : 0;
  return (
    <motion.div className="premium-squad-screen" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter">
      <motion.section className="premium-squad-hero" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}>
        <motion.div variants={shouldReduceMotion ? undefined : revealUpMotion}><p>YOUR SQUAD</p><h1>{team.name}</h1><span>OVR {ovr} · {squad.length}/25 players · {squad.filter(p => p.isOverseas).length}/8 overseas</span><button onClick={() => setActiveTab('PlayingXI')}>MANAGE STARTING XI</button></motion.div>
        <motion.div className="premium-card-row" variants={shouldReduceMotion ? undefined : listContainerMotion}>{starters.slice(0, 4).map(p => <motion.button key={p.id} layoutId={`player-card-${p.id}`} variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : subtleHoverGesture} whileTap={shouldReduceMotion ? undefined : tapGesture} onClick={() => setSelectedPlayerForModal(p)}><FCPlayerCard player={p} size="sm" /></motion.button>)}</motion.div>
      </motion.section>
      <section className="premium-squad-lanes"><article><h2>STARTING XI</h2>{starters.slice(0, 11).map((p, i) => <button key={p.id} onClick={() => setSelectedPlayerForModal(p)}><b>{i + 1}</b><span>{p.name}<small>{p.role}</small></span><em>{p.overall}</em></button>)}</article><article><h2>BENCH</h2>{bench.slice(0, 11).map(p => <button key={p.id} onClick={() => setSelectedPlayerForModal(p)}><b>{p.isOverseas ? 'OS' : 'IN'}</b><span>{p.name}<small>Form {p.form}</small></span><em>{p.overall}</em></button>)}</article></section>
      <SquadManagementView />
    </motion.div>
  );
};

export const PremiumMatchLiveView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState } = useGame();
  const match = gameState?.currentMatchState;
  if (!gameState || !match) return <MatchLiveView />;
  const teamA = gameState.teams[match.teamAId];
  const teamB = gameState.teams[match.teamBId];
  const innings: any = match.currentInningsIndex === 1 ? match.innings1 : match.innings2;
  const latest = (match as any).commentary?.[0] || (match as any).matchEvents?.[0];
  const latestText = typeof latest === 'string' ? latest : latest?.commentary || latest?.description || 'Match atmosphere building...';
  return <motion.div className="premium-live-match" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter"><motion.section className="premium-scorebug" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}><motion.div variants={shouldReduceMotion ? undefined : revealUpMotion}><small>LIVE MATCH</small><h1>{teamA?.shortName} vs {teamB?.shortName}</h1><p>{match.venue}</p></motion.div><div className="premium-score"><AnimatePresence mode="wait" initial={false}><motion.b key={`${innings?.totalRuns || 0}-${innings?.wickets || 0}`} variants={shouldReduceMotion ? undefined : bidPulseMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter" exit="exit">{innings?.totalRuns || 0}/{innings?.wickets || 0}</motion.b></AnimatePresence><span>{innings?.oversCompleted || 0}.{innings?.ballsInCurrentOver || 0} overs</span></div><motion.div className="premium-moment" variants={shouldReduceMotion ? undefined : cardMotion}><small>BIG MOMENT</small><h2>{latestText.includes('SIX') || latestText.includes('6') ? 'SIX!' : latestText.includes('FOUR') || latestText.includes('4') ? 'FOUR!' : latestText.includes('WICKET') ? 'WICKET!' : 'LIVE'}</h2><p>{latestText}</p></motion.div></motion.section><MatchLiveView /></motion.div>;
};

export const PremiumNewsView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState } = useGame();
  if (!gameState) return <NewsRoomView />;
  const news = gameState.newsFeed || [];
  return <motion.div className="premium-news-screen" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter"><motion.section className="premium-news-hero" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}><p>FRANCHISE NEWSROOM</p><h1>{news[0]?.title || 'Your franchise story starts now.'}</h1><span>{news[0]?.summary || 'Every auction bid, match result and career moment becomes part of the media universe.'}</span></motion.section><motion.div className="premium-news-grid" variants={shouldReduceMotion ? undefined : listContainerMotion}>{news.slice(0, 8).map(n => <motion.article key={n.id} variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : subtleHoverGesture}><small>{n.category} · {n.timestampFormatted}</small><h2>{n.title}</h2><p>{n.summary}</p></motion.article>)}</motion.div><NewsRoomView /></motion.div>;
};

export const PremiumClubView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState } = useGame();
  if (!gameState) return <ClubFranchiseView />;
  const team = gameState.teams[gameState.userTeamId];
  const best = (team.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean).sort((a, b) => b.overall - a.overall)[0];
  const winRate = team.totalMatchesPlayed ? Math.round((team.totalMatchesWon / team.totalMatchesPlayed) * 100) : 0;
  return <motion.div className="premium-club-screen" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter"><motion.section className="premium-club-hero" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}><motion.div className="premium-club-crest" variants={shouldReduceMotion ? undefined : cardMotion} style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}>{team.shortName}</motion.div><motion.div variants={shouldReduceMotion ? undefined : revealUpMotion}><p>YOUR CLUB</p><h1>{team.name}</h1><span>{team.homeVenue} · {team.city}</span></motion.div></motion.section><motion.section className="premium-legacy-row" variants={shouldReduceMotion ? undefined : listContainerMotion}>{[{ label: 'Titles', value: team.titlesWon, icon: <Trophy /> }, { label: 'Win Rate', value: `${winRate}%`, icon: <Flame /> }, { label: 'Fans', value: `${team.fanSentiment}%`, icon: <Users /> }, { label: 'Board', value: `${team.boardConfidence}%`, icon: <Shield /> }, { label: 'Best Player', value: best?.name || 'TBD', icon: <Crown /> }].map(x => <motion.article key={x.label} variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : subtleHoverGesture}><i>{x.icon}</i><small>{x.label}</small><b>{x.value}</b></motion.article>)}</motion.section><ClubFranchiseView /></motion.div>;
};

export const PremiumAcademyView: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const { gameState } = useGame();
  if (!gameState) return <YouthAcademyView />;
  const prospects = gameState.youthAcademyPool || [];
  return <motion.div className="premium-academy-screen" variants={shouldReduceMotion ? undefined : listContainerMotion} initial={shouldReduceMotion ? false : "initial"} animate="enter"><motion.section className="premium-academy-hero" variants={shouldReduceMotion ? undefined : cinematicHeroMotion}><motion.div variants={shouldReduceMotion ? undefined : revealUpMotion}><p>YOUTH ACADEMY</p><h1>Build the next franchise icon.</h1><span>Prospects, potential, development paths and future-star card moments.</span></motion.div><motion.div className="premium-prospect-strip" variants={shouldReduceMotion ? undefined : listContainerMotion}>{prospects.slice(0, 4).map(p => <motion.article key={p.id} layoutId={`prospect-${p.id}`} variants={shouldReduceMotion ? undefined : cardMotion} whileHover={shouldReduceMotion ? undefined : cardHoverGesture}><small>{p.age} YEARS</small><h2>{p.name}</h2><b>OVR {p.overall}</b><span>POT {p.potential}</span></motion.article>)}</motion.div></motion.section><YouthAcademyView /></motion.div>;
};

export { EventCarousel };
