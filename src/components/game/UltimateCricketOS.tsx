import React from 'react';
import { useGame } from '../../context/GameContext';
import {
  getBoardMandate,
  getCareerStories,
  getCricketPlayStyles,
  getLiveSeasonEvent,
  getPreMatchBriefing,
  getRivalrySnapshot,
  getTacticalIdentity,
  getVenueProfile
} from '../../engine/ultimateCricketEngine';
import { Activity, Brain, CalendarDays, Crown, Flame, MapPin, Newspaper, ShieldAlert, Sparkles, Swords, Target, Trophy, Zap } from 'lucide-react';

export const UltimateCricketOS: React.FC = () => {
  const { gameState } = useGame();
  if (!gameState) return null;

  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) return null;

  const squad = (userTeam.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const topPlayer = [...squad].sort((a, b) => b.overall - a.overall)[0];
  const playStyles = topPlayer ? getCricketPlayStyles(topPlayer) : [];
  const identity = getTacticalIdentity(userTeam, gameState.allPlayers);
  const venue = getVenueProfile(userTeam);
  const board = getBoardMandate(userTeam, gameState);
  const event = getLiveSeasonEvent(gameState);
  const stories = getCareerStories(gameState);
  const briefing = getPreMatchBriefing(gameState);
  const rivalry = getRivalrySnapshot(gameState);

  return (
    <section className="ultimate-os">
      <div className="ultimate-os__headline">
        <div>
          <p>FRANCHISE XI 26 OPERATING SYSTEM</p>
          <h2>Living Cricket Universe</h2>
        </div>
        <span>PlayStyles · Chemistry · Rivalries · Story Engine · Live Events</span>
      </div>

      <div className="ultimate-os__grid">
        <article className="ultimate-os-card ultimate-os-card--event" style={{ '--os-tone': event.color } as React.CSSProperties}>
          <div className="ultimate-os-card__icon"><Sparkles className="w-5 h-5" /></div>
          <p>Live Seasonal Program</p>
          <h3>{event.name}</h3>
          <span>{event.reward}</span>
          <b>{event.timer}</b>
        </article>

        <article className="ultimate-os-card" style={{ '--os-tone': '#00FF87' } as React.CSSProperties}>
          <div className="ultimate-os-card__icon"><Brain className="w-5 h-5" /></div>
          <p>Tactical Identity</p>
          <h3>{identity.name}</h3>
          <span>{identity.summary}</span>
          <b>DNA SCORE {Math.round(identity.score)}</b>
        </article>

        <article className="ultimate-os-card" style={{ '--os-tone': '#D4AF37' } as React.CSSProperties}>
          <div className="ultimate-os-card__icon"><Crown className="w-5 h-5" /></div>
          <p>Board Mandate</p>
          <h3>{board.title}</h3>
          <span>{board.demand}</span>
          <b>{board.pressure} PRESSURE</b>
        </article>

        <article className="ultimate-os-card" style={{ '--os-tone': '#00E5FF' } as React.CSSProperties}>
          <div className="ultimate-os-card__icon"><MapPin className="w-5 h-5" /></div>
          <p>Home Venue Intelligence</p>
          <h3>{venue.pitch}</h3>
          <span>{venue.note}</span>
          <b>PAR {venue.firstInningsPar} · DEW {venue.dew}</b>
        </article>
      </div>

      <div className="ultimate-os__deep-grid">
        <article className="ultimate-os-panel">
          <header><Flame className="w-4 h-4" /> Cricket PlayStyles</header>
          {topPlayer ? (
            <>
              <div className="ultimate-os-player">
                <strong>{topPlayer.name}</strong>
                <span>{topPlayer.overall} OVR · {topPlayer.role}</span>
              </div>
              <div className="ultimate-os-tags">
                {playStyles.map(style => (
                  <span key={style.name}>
                    <b>{style.tier}</b> {style.name}<em>{style.boost}</em>
                  </span>
                ))}
              </div>
            </>
          ) : <p className="ultimate-os-muted">Draft stars in the auction to unlock PlayStyle identity.</p>}
        </article>

        <article className="ultimate-os-panel">
          <header><CalendarDays className="w-4 h-4" /> Pre-Match Strategy Room</header>
          {briefing ? (
            <div className="ultimate-os-briefing">
              <div><b>{briefing.title}</b><span>{briefing.venue.venue}</span></div>
              <div className="ultimate-os-prob"><span style={{ width: `${briefing.winProb}%` }} /><b>{briefing.winProb}% WIN PROB</b></div>
              <p><Target className="w-3.5 h-3.5" /> {briefing.keyBattle}</p>
              <p><Zap className="w-3.5 h-3.5" /> {briefing.advice}</p>
            </div>
          ) : <p className="ultimate-os-muted">No active fixture available.</p>}
        </article>

        <article className="ultimate-os-panel">
          <header><Swords className="w-4 h-4" /> Rivalry Engine</header>
          <div className="ultimate-os-rivalry">
            <Trophy className="w-9 h-9" />
            <div>
              <b>{rivalry.name}</b>
              <span>{rivalry.rivalName} · {rivalry.intensity} · Record {rivalry.record}</span>
              <p>{rivalry.hook}</p>
            </div>
          </div>
        </article>

        <article className="ultimate-os-panel">
          <header><Newspaper className="w-4 h-4" /> Dynamic Story Engine</header>
          <div className="ultimate-os-stories">
            {stories.map((story, index) => (
              <p key={story}><Activity className="w-3.5 h-3.5" /> <b>Story {index + 1}</b> {story}</p>
            ))}
          </div>
        </article>

        <article className="ultimate-os-panel ultimate-os-panel--wide">
          <header><ShieldAlert className="w-4 h-4" /> Complete Game-Changer Layer Activated</header>
          <div className="ultimate-os-features">
            {[
              'Console startup flow', 'Living franchise hub', 'Card ecosystem', 'Cricket PlayStyles', 'Chemistry-driven XI', 'Broadcast matchday',
              'Auction room 2.0', 'Youth evolutions', 'Manager career XP', 'Newsroom/social feed', 'Rivalry memory', 'Tactical identity',
              'Pre-match strategy', 'Immersive loaders', 'Reward reveals', 'Venue effects', 'Morale/fitness hooks', 'Board expectations',
              'Live seasonal events', 'Facility-based navigation', 'Ultimate Team layer foundation', 'Smarter AI hooks', 'Career story arcs', 'Trophy celebration path'
            ].map(feature => <span key={feature}>{feature}</span>)}
          </div>
        </article>
      </div>
    </section>
  );
};
