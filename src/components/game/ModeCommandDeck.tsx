import React from 'react';
import { ScreenRouteMeta } from '../../navigation/screenRoutes';
import { useGame } from '../../context/GameContext';
import { getBoardMandate, getLiveSeasonEvent, getPreMatchBriefing, getRivalrySnapshot, getTacticalIdentity, getVenueProfile } from '../../engine/ultimateCricketEngine';
import { Activity, Bell, Brain, CalendarDays, Crown, Gauge, MapPin, Radio, Shield, Swords, Trophy, Zap } from 'lucide-react';

interface ModeCommandDeckProps {
  route: ScreenRouteMeta;
}

export const ModeCommandDeck: React.FC<ModeCommandDeckProps> = ({ route }) => {
  const { gameState } = useGame();
  if (!gameState) return null;
  const team = gameState.teams[gameState.userTeamId];
  if (!team) return null;

  const squad = (team.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
  const xiIds = team.playingXI?.playingXIIds || squad.slice(0, 11).map(p => p.id);
  const xiAvg = xiIds.length ? Math.round(xiIds.reduce((sum, id) => sum + (gameState.allPlayers[id]?.overall || 0), 0) / xiIds.length) : 0;
  const identity = getTacticalIdentity(team, gameState.allPlayers);
  const board = getBoardMandate(team, gameState);
  const event = getLiveSeasonEvent(gameState);
  const venue = getVenueProfile(team);
  const briefing = getPreMatchBriefing(gameState);
  const rivalry = getRivalrySnapshot(gameState);
  const auctionPct = gameState.auctionState ? Math.round(((gameState.auctionState.currentPlayerIndex || 0) / Math.max(1, gameState.auctionState.allPlayerPool.length || 1)) * 100) : 100;
  const seasonPct = gameState.leagueSchedule?.length ? Math.round(((gameState.currentFixtureIndex || 0) / gameState.leagueSchedule.length) * 100) : 0;

  const metrics = [
    { label: 'XI OVR', value: xiAvg || '—', icon: <Gauge className="w-4 h-4" /> },
    { label: 'Purse', value: `₹${team.purseCr.toFixed(1)}Cr`, icon: <Crown className="w-4 h-4" /> },
    { label: 'Auction', value: `${auctionPct}%`, icon: <Trophy className="w-4 h-4" /> },
    { label: 'Season', value: `${seasonPct}%`, icon: <CalendarDays className="w-4 h-4" /> }
  ];

  return (
    <div className={`mode-command mode-command--${route.variant}`}>
      <div className="mode-command__hero">
        <div className="mode-command__crest" style={{ backgroundColor: team.primaryColor, color: team.secondaryColor }}>{team.shortName}</div>
        <div className="mode-command__title">
          <p>FRANCHISE XI 26 / {route.eyebrow}</p>
          <h2>{route.title}</h2>
          <span>{route.subtitle}</span>
        </div>
        <div className="mode-command__event" style={{ '--event-tone': event.color } as React.CSSProperties}>
          <Radio className="w-4 h-4" /> {event.name}
        </div>
      </div>

      <div className="mode-command__metrics">
        {metrics.map(metric => (
          <div key={metric.label}>
            <span>{metric.icon}</span>
            <p>{metric.label}</p>
            <b>{metric.value}</b>
          </div>
        ))}
      </div>

      <div className="mode-command__intel">
        <article>
          <header><Brain className="w-4 h-4" /> Tactical DNA</header>
          <b>{identity.name}</b>
          <p>{identity.summary}</p>
        </article>
        <article>
          <header><Shield className="w-4 h-4" /> Board Mandate</header>
          <b>{board.title}</b>
          <p>{board.demand}</p>
        </article>
        <article>
          <header><MapPin className="w-4 h-4" /> Venue Edge</header>
          <b>{venue.pitch}</b>
          <p>{venue.firstInningsPar} par · Dew {venue.dew} · Edge {venue.homeEdge}</p>
        </article>
        <article>
          <header><Swords className="w-4 h-4" /> Rivalry</header>
          <b>{rivalry.name}</b>
          <p>{rivalry.intensity} intensity · {rivalry.record}</p>
        </article>
        {briefing && (
          <article className="mode-command__wide">
            <header><Zap className="w-4 h-4" /> Pre-Match Brief</header>
            <b>{briefing.title} · {briefing.winProb}% Win Probability</b>
            <p>{briefing.keyBattle}</p>
          </article>
        )}
        <article className="mode-command__wide">
          <header><Bell className="w-4 h-4" /> Live World Pulse</header>
          <b>{gameState.newsFeed?.[0]?.title || 'The season world is live.'}</b>
          <p><Activity className="w-3 h-3 inline mr-1" />State preserved across routes — auction, squad, scouting, match and season data stay alive.</p>
        </article>
      </div>
    </div>
  );
};
