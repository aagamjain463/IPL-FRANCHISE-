import { MatchState } from './cricket';

export interface StandingsRow {
  teamId: string;
  teamName: string;
  teamShortName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  nrr: number; // Net run rate e.g. +0.485
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  recentForm: ('W' | 'L' | 'T')[];
  streak: string; // e.g. "3W" or "2L"
  qualificationProbability: number; // 0 - 100
}

export interface TournamentFixture {
  id: string;
  matchNumber: number;
  stage: 'League' | 'Qualifier 1' | 'Eliminator' | 'Qualifier 2' | 'Final';
  teamAId: string;
  teamBId: string;
  venue: string;
  city: string;
  isPlayed: boolean;
  matchResult?: {
    winnerTeamId: string;
    marginText: string;
    teamAScore: string;
    teamBScore: string;
    manOfTheMatchPlayerId: string;
  };
  matchData?: MatchState;
}

export type LeagueFixture = TournamentFixture;

export interface SeasonAwards {
  orangeCap: { playerId: string; playerName: string; teamShortName: string; runs: number };
  purpleCap: { playerId: string; playerName: string; teamShortName: string; wickets: number };
  mvp: { playerId: string; playerName: string; teamShortName: string; pts: number };
  emergingPlayer: { playerId: string; playerName: string; teamShortName: string; reason: string };
  championTeamId: string;
  runnerUpTeamId: string;
  biggestSurpriseTeamId: string;
  biggestFlopSigning?: { playerName: string; priceCr: number; teamShortName: string };
  biggestValueSigning?: { playerName: string; priceCr: number; teamShortName: string };
}
