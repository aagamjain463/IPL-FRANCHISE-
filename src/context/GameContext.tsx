import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameSave, GameScreen, AppTab } from '../types/game';
import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { AuctionState, AuctionBid } from '../types/auction';
import { MatchState, MatchPlayingXI } from '../types/cricket';
import { StandingsRow, TournamentFixture } from '../types/tournament';
import { INITIAL_TEAMS } from '../data/teams';
import { INITIAL_PLAYERS } from '../data/players';
import { SCENARIO_CHALLENGES, ChallengeScenario } from '../data/challenges';
import { initAuctionState, getNextAIBid, getBidIncrement, evaluatePlayerValueForTeam, simulateAuctionBattle, simulateFullAuctionPool, simulateCurrentSetInAuction } from '../engine/auctionEngine';
import { initStandings, generateLeagueSchedule, updateStandingsWithMatch, calculateSeasonAwards } from '../engine/tournamentEngine';
import { initMatchState, simulateNextBall, simulateOver, simulateInnings, simulateFullMatch } from '../engine/cricketEngine';
import { generateYouthProspect, progressPlayerToNextSeason } from '../engine/dynastyEngine';
import { TradeOffer, evaluateTradeProposal } from '../engine/tradeEngine';
import { soundFx } from '../audio/soundFx';
import { audioManager } from '../audio/audioManager';
import { ScoutingDepartmentData, WatchlistItem, PriorityLevel, ScoutAlert } from '../types/scout';
import { FranchiseProgressionState } from '../types/franchise';
import { initFranchiseProgression } from '../engine/progressionEngine';

interface GameContextType {
  gameState: GameSave | null;
  setGameState: React.Dispatch<React.SetStateAction<GameSave | null>>;
  currentScreen: GameScreen;
  activeTab: AppTab;
  isMuted: boolean;
  selectedPlayerForModal: Player | null;
  activeChallenge: ChallengeScenario | null;
  setCurrentScreen: (screen: GameScreen) => void;
  setActiveTab: (tab: AppTab) => void;
  toggleMute: () => void;
  setSelectedPlayerForModal: (p: Player | null) => void;
  startNewFranchise: (teamId: string, managerName: string, autoSimulateAuction?: boolean) => void;
  switchUserFranchise: (newTeamId: string) => void;
  restartGame: (options?: { restartAuctionOnly?: boolean; newTeamId?: string; resetEverything?: boolean }) => void;
  loadSavedGame: () => boolean;
  saveCurrentGame: () => void;
  resetToMenu: () => void;
  // Auction actions
  startAuctionMode: () => void;
  placeUserBid: () => void;
  passUserBid: () => void;
  fastForwardAuctionPlayer: () => void;
  simulateEntireAuction: (fromBeginning?: boolean, autoBuildUserSquad?: boolean) => void;
  simulateCurrentAuctionSet: () => void;
  toggleAutoBid: () => void;
  // Playing XI actions
  updateUserPlayingXI: (xi: MatchPlayingXI) => void;
  // Match & Simulation actions
  prepareMatch: (fixtureId: string) => void;
  prepareScenarioChallenge: (challenge: ChallengeScenario) => void;
  bowlBall: () => void;
  simOver: () => void;
  simInnings: () => void;
  simFullMatch: () => void;
  updateMatchTactics: (teamId: string, tactics: any) => void;
  completeCurrentMatch: () => void;
  // Trade & Dynasty
  proposeTrade: (receivingTeamId: string, offeredIds: string[], requestedIds: string[], cashCr: number) => { success: boolean; feedback: string };
  signYouthProspect: (prospect: Player) => void;
  advanceToNextSeason: () => void;
  submitPressAnswer: (option: { text: string; moraleChange: number; ownerTrustChange: number }) => void;
  answerPressQuestion: (optionIndex: number) => void;
  // Scouting Department
  upgradeScoutLevel: () => { success: boolean; message: string };
  addToWatchlist: (playerId: string, priority?: PriorityLevel, notes?: string) => void;
  removeFromWatchlist: (playerId: string) => void;
  updateWatchlistNote: (playerId: string, notes: string, priority?: PriorityLevel) => void;
  toggleAuctionTarget: (playerId: string) => void;
  completeScoutMission: (missionId: string) => void;
  markAlertRead: (alertId: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'ipl_franchise_sim_save_v1';

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameSave | null>(null);
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('MainMenu');
  const [activeTab, setActiveTab] = useState<AppTab>('Dashboard');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeScenario | null>(null);

  // Auto-load game if exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameSave;
        if (parsed && parsed.userTeamId && parsed.teams) {
          // Sanitize & backfill missing collections to guarantee zero crashes on outdated saves
          parsed.standings = parsed.standings || [];
          parsed.leagueSchedule = parsed.leagueSchedule || [];
          parsed.newsFeed = parsed.newsFeed || [];
          parsed.youthAcademyPool = parsed.youthAcademyPool || [];
          parsed.tradeOffers = parsed.tradeOffers || [];
          parsed.franchiseAchievements = parsed.franchiseAchievements || [];

          // Ensure scoutingDepartment exists
          if (!parsed.scoutingDepartment) {
            parsed.scoutingDepartment = {
              level: 3,
              scoutingBudgetSpentCr: 1.5,
              watchlist: [],
              auctionTargetIds: [],
              unlockedReportIds: [],
              completedMissionIds: [],
              alerts: [
                {
                  id: 'alert_init',
                  playerId: 'auc_mayank_yadav',
                  type: 'SCOUT_NOTE',
                  message: 'IPL Scouting Network operational. Real player database loaded with verified tactical profiles.',
                  timestampFormatted: 'Season Start',
                  isRead: false
                }
              ]
            };
          } else {
            parsed.scoutingDepartment.watchlist = parsed.scoutingDepartment.watchlist || [];
            parsed.scoutingDepartment.auctionTargetIds = parsed.scoutingDepartment.auctionTargetIds || [];
            parsed.scoutingDepartment.unlockedReportIds = parsed.scoutingDepartment.unlockedReportIds || [];
            parsed.scoutingDepartment.completedMissionIds = parsed.scoutingDepartment.completedMissionIds || [];
            parsed.scoutingDepartment.alerts = parsed.scoutingDepartment.alerts || [];
            parsed.scoutingDepartment.level = parsed.scoutingDepartment.level || 3;
          }

          Object.values(parsed.teams).forEach(t => {
            t.rosterPlayerIds = t.rosterPlayerIds || [];
            if (!t.playingXI || !t.playingXI.playingXIIds) {
              const squad = t.rosterPlayerIds.map(id => parsed.allPlayers[id]).filter(Boolean);
              const top11 = squad.slice(0, 11).map(p => p.id);
              t.playingXI = {
                teamId: t.id,
                playingXIIds: top11,
                battingOrder: top11,
                captainId: top11[0] || '',
                wicketkeeperId: squad.find(p => p.role.includes('Wicketkeeper'))?.id || top11[0] || '',
                powerplayBowlerIds: [],
                deathBowlerIds: [],
                mainSpinBowlerIds: []
              };
            }
          });

          if (parsed.auctionState) {
            parsed.auctionState.bidHistory = parsed.auctionState.bidHistory || [];
            parsed.auctionState.soldPlayerRecords = parsed.auctionState.soldPlayerRecords || [];
            parsed.auctionState.unsoldPlayerIds = parsed.auctionState.unsoldPlayerIds || [];
            parsed.auctionState.allPlayerPool = parsed.auctionState.allPlayerPool || [];
          }

          if (!parsed.progression) {
            parsed.progression = initFranchiseProgression();
          }

          setGameState(parsed);
          setCurrentScreen(parsed.currentScreen || 'Dashboard');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCurrentGame = () => {
    if (!gameState) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch {
      // ignore
    }
  };

  const toggleMute = () => {
    const next = soundFx.toggleMute();
    setIsMuted(next);
  };

  const startNewFranchise = (teamId: string, managerName: string, autoSimulateAuction: boolean = false) => {
    // Deep clone initial teams & players
    const teamsMap: Record<string, Team> = JSON.parse(JSON.stringify(INITIAL_TEAMS));
    const playersMap: Record<string, Player> = {};
    INITIAL_PLAYERS.forEach(p => {
      playersMap[p.id] = JSON.parse(JSON.stringify(p));
    });

    // Populate team roster arrays based on players assigned to teams
    Object.values(teamsMap).forEach(t => {
      t.rosterPlayerIds = [];
    });
    Object.values(playersMap).forEach(p => {
      if (p.currentTeamId && teamsMap[p.currentTeamId]) {
        teamsMap[p.currentTeamId].rosterPlayerIds.push(p.id);
      }
    });

    // Create Initial Lineups
    Object.values(teamsMap).forEach(t => {
      const pList = t.rosterPlayerIds.map(id => playersMap[id]).filter(Boolean);
      // Select top 11 by overall
      const sorted = [...pList].sort((a, b) => b.overall - a.overall);
      const top11 = sorted.slice(0, 11).map(p => p.id);
      const pacers = sorted.filter(p => p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium')).map(p => p.id);
      const death = sorted.filter(p => p.attributes.deathBowling > 80).map(p => p.id);

      t.playingXI = {
        teamId: t.id,
        playingXIIds: top11,
        battingOrder: top11,
        captainId: sorted[0]?.id || '',
        wicketkeeperId: sorted.find(p => p.role.includes('Wicketkeeper'))?.id || sorted[0]?.id || '',
        impactPlayerId: sorted[11]?.id,
        powerplayBowlerIds: pacers.slice(0, 2),
        deathBowlerIds: death.slice(0, 2),
        mainSpinBowlerIds: sorted.filter(p => p.bowlingStyle.includes('spin') || p.bowlingStyle.includes('break') || p.bowlingStyle.includes('orthodox')).slice(0, 2).map(p => p.id)
      };
    });

    const unassignedPool = Object.values(playersMap).filter(p => !p.currentTeamId);
    let auction = initAuctionState(unassignedPool);
    const standings = initStandings(teamsMap);
    const fixtures = generateLeagueSchedule(teamsMap);

    let seasonStage: GameSave['seasonStage'] = 'Auction';
    let currentScreenVal: GameScreen = 'Auction';
    let activeTabVal: AppTab = 'AuctionLive';

    if (autoSimulateAuction) {
      const simResult = simulateFullAuctionPool(auction, teamsMap, playersMap, teamId, {
        fromBeginning: true,
        userAutoBid: true
      });
      auction = simResult.updatedAuction;
      Object.assign(teamsMap, simResult.updatedTeams);
      Object.assign(playersMap, simResult.updatedPlayers);
      seasonStage = 'LeagueStage';
      currentScreenVal = 'Dashboard';
      activeTabVal = 'Dashboard';
    }

    const initialSave: GameSave = {
      saveId: `save_${Date.now()}`,
      saveName: `${teamsMap[teamId]?.name || 'Franchise'} Campaign`,
      timestamp: Date.now(),
      currentSeason: 2025,
      seasonStage,
      userTeamId: teamId,
      userRole: 'Head Coach & GM',
      managerName: managerName || 'Coach',
      teams: teamsMap,
      allPlayers: playersMap,
      auctionState: auction,
      leagueSchedule: fixtures,
      currentFixtureIndex: 0,
      standings,
      youthAcademyPool: [generateYouthProspect(1), generateYouthProspect(2), generateYouthProspect(3), generateYouthProspect(4)],
      tradeOffers: [],
      newsFeed: [
        {
          id: 'n_welcome',
          title: `BREAKING: ${managerName || 'New Manager'} Appointed Head Coach & GM of ${teamsMap[teamId]?.name}!`,
          category: 'Management',
          summary: `The franchise board has officially entrusted the dynasty to the new tactician ahead of the Mega Auction. Fans are buzzing with anticipation.`,
          timestampFormatted: 'Season 2025 Opening',
          impactRating: 'High',
          teamId
        }
      ],
      franchiseAchievements: [],
      scoutingDepartment: {
        level: 3,
        scoutingBudgetSpentCr: 1.5,
        watchlist: [],
        auctionTargetIds: [],
        unlockedReportIds: [],
        completedMissionIds: [],
        alerts: [
          {
            id: 'alert_welcome',
            playerId: 'auc_mayank_yadav',
            type: 'SCOUT_NOTE',
            message: 'IPL Scouting Network operational. Real player database loaded with verified tactical profiles.',
            timestampFormatted: 'Season 2025 Opening',
            isRead: false
          }
        ]
      },
      progression: initFranchiseProgression(),
      currentScreen: currentScreenVal
    };

    setGameState(initialSave);
    setCurrentScreen(currentScreenVal);
    setActiveTab(activeTabVal);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialSave));
    if (autoSimulateAuction) {
      soundFx.playCheer();
    }
  };

  const switchUserFranchise = (newTeamId: string) => {
    if (!gameState || !gameState.teams[newTeamId]) return;
    const newTeam = gameState.teams[newTeamId];
    const oldTeam = gameState.teams[gameState.userTeamId];

    const updatedNews = [...gameState.newsFeed];
    updatedNews.unshift({
      id: `news_switch_${Date.now()}`,
      title: `SENSATIONAL MOVE: ${gameState.managerName} Takes Over as Head Coach of ${newTeam.name}!`,
      category: 'Management',
      summary: `In a blockbuster managerial change, ${gameState.managerName} departs ${oldTeam?.name || 'former franchise'} to take full tactical and auction command of ${newTeam.name}.`,
      timestampFormatted: 'Just Now',
      impactRating: 'High',
      teamId: newTeamId
    });

    const updatedState: GameSave = {
      ...gameState,
      userTeamId: newTeamId,
      saveName: `${newTeam.name} Campaign`,
      newsFeed: updatedNews
    };

    setGameState(updatedState);
    soundFx.playCheer();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
    } catch {}
  };

  const restartGame = (options?: { restartAuctionOnly?: boolean; newTeamId?: string; resetEverything?: boolean }) => {
    if (options?.resetEverything) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setGameState(null);
      setCurrentScreen('MainMenu');
      return;
    }

    const teamId = options?.newTeamId || gameState?.userTeamId || 'csk';
    const managerName = gameState?.managerName || 'Coach';
    startNewFranchise(teamId, managerName);
  };

  const loadSavedGame = (): boolean => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameSave;
        if (parsed && parsed.userTeamId) {
          setGameState(parsed);
          setCurrentScreen(parsed.currentScreen || 'Dashboard');
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  };

  const resetToMenu = () => {
    setCurrentScreen('MainMenu');
  };

  const startAuctionMode = () => {
    if (!gameState) return;
    const newState: GameSave = {
      ...gameState,
      currentScreen: 'Auction'
    };
    setGameState(newState);
    setCurrentScreen('Auction');
    setActiveTab('AuctionLive');
    window.history.pushState({}, '', '/auction');
    saveCurrentGame();
  };

  // --- AUCTION ACTIONS ---
  const placeUserBid = () => {
    if (!gameState || !gameState.auctionState || !gameState.auctionState.activePlayer) return;
    const auc = { ...gameState.auctionState };
    const player = auc.activePlayer!;
    const userTeam = gameState.teams[gameState.userTeamId];
    if (!userTeam) return;

    const nextBid = Number((auc.currentBidCr + getBidIncrement(auc.currentBidCr)).toFixed(2));
    if (userTeam.purseCr < nextBid) return;

    auc.currentBidCr = nextBid;
    auc.currentLeadingTeamId = userTeam.id;
    auc.hammerState = 'Bidding';
    auc.auctionTimerSeconds = 10;
    auc.bidHistory.unshift({
      teamId: userTeam.id,
      teamShortName: userTeam.shortName,
      bidAmountCr: nextBid,
      timestamp: Date.now()
    });

    audioManager.playAuctionBid(true);
    if (nextBid >= 10 || nextBid >= player.basePriceCr * 1.5) {
      audioManager.setAuctionIntensity(3);
    }

    setGameState({
      ...gameState,
      auctionState: auc
    });
  };

  const passUserBid = () => {
    if (!gameState || !gameState.auctionState || !gameState.auctionState.activePlayer) return;
    const auc = { ...gameState.auctionState };
    const player = auc.activePlayer!;

    // Resolve AI winner or next bid
    if (auc.currentLeadingTeamId) {
      // Finalize sale to current leader
      const winningTeam = gameState.teams[auc.currentLeadingTeamId];
      const isUserAcquired = winningTeam?.id === gameState.userTeamId;
      if (winningTeam) {
        winningTeam.purseCr = Number((winningTeam.purseCr - auc.currentBidCr).toFixed(2));
        winningTeam.rosterPlayerIds.push(player.id);
        player.currentTeamId = winningTeam.id;
        player.salaryCr = auc.currentBidCr;
        gameState.allPlayers[player.id] = { ...player, currentTeamId: winningTeam.id, salaryCr: auc.currentBidCr };
        auc.soldPlayerRecords.push({
          player,
          sellingPriceCr: auc.currentBidCr,
          buyingTeamId: winningTeam.id
        });
      }
      audioManager.playAuctionHammer(isUserAcquired);
    } else {
      // Unsold
      auc.unsoldPlayerIds.push(player.id);
      audioManager.playUnsoldSound();
    }

    // Move to next player in pool
    auc.currentPlayerIndex += 1;
    const nextPlayer = auc.allPlayerPool[auc.currentPlayerIndex] || null;
    auc.activePlayer = nextPlayer;
    auc.currentBidCr = nextPlayer ? nextPlayer.basePriceCr : 0;
    auc.currentLeadingTeamId = null;
    auc.bidHistory = [];
    auc.auctionTimerSeconds = 10;
    auc.hammerState = 'Bidding';

    if (nextPlayer && (nextPlayer.overall >= 88 || nextPlayer.isMarquee)) {
      audioManager.playBigPlayerReveal();
    } else {
      audioManager.setAuctionIntensity(1);
    }

    if (!nextPlayer) {
      auc.isCompleted = true;
      gameState.seasonStage = 'LeagueStage';
      setCurrentScreen('Dashboard');
    }

    setGameState({ ...gameState, auctionState: auc });
    saveCurrentGame();
  };

  const fastForwardAuctionPlayer = () => {
    if (!gameState || !gameState.auctionState || !gameState.auctionState.activePlayer) return;
    const auc = { ...gameState.auctionState };
    const player = auc.activePlayer!;

    // Run realistic competitive auction battle between franchises
    const userTeam = gameState.teams[gameState.userTeamId];
    const userSquad = userTeam?.rosterPlayerIds.map(id => gameState.allPlayers[id]).filter(Boolean) || [];
    const userMaxBid = auc.autoBidUser ? evaluatePlayerValueForTeam(player, userTeam, userSquad) : 0;

    const battleResult = simulateAuctionBattle(
      player,
      gameState.teams,
      gameState.allPlayers,
      auc.autoBidUser ? gameState.userTeamId : undefined,
      userMaxBid
    );

    if (battleResult) {
      const winner = gameState.teams[battleResult.winningTeamId];
      const finalPrice = battleResult.finalPriceCr;
      winner.purseCr = Number((winner.purseCr - finalPrice).toFixed(2));
      winner.rosterPlayerIds.push(player.id);
      player.currentTeamId = winner.id;
      player.salaryCr = finalPrice;
      gameState.allPlayers[player.id] = { ...player, currentTeamId: winner.id, salaryCr: finalPrice };
      auc.soldPlayerRecords.push({
        player,
        sellingPriceCr: finalPrice,
        buyingTeamId: winner.id
      });
      soundFx.playHammerKnock();
    } else {
      auc.unsoldPlayerIds.push(player.id);
    }

    auc.currentPlayerIndex += 1;
    const nextPlayer = auc.allPlayerPool[auc.currentPlayerIndex] || null;
    auc.activePlayer = nextPlayer;
    auc.currentBidCr = nextPlayer ? nextPlayer.basePriceCr : 0;
    auc.currentLeadingTeamId = null;
    auc.bidHistory = [];
    auc.auctionTimerSeconds = 10;

    if (!nextPlayer) {
      auc.isCompleted = true;
      gameState.seasonStage = 'LeagueStage';
      setCurrentScreen('Dashboard');
    }

    setGameState({ ...gameState, auctionState: auc });
    saveCurrentGame();
  };

  const simulateEntireAuction = (fromBeginning: boolean = false, autoBuildUserSquad: boolean = true) => {
    if (!gameState || !gameState.auctionState) return;

    const targetIds = gameState.scoutingDepartment?.auctionTargetIds || [];
    const { updatedAuction, updatedTeams, updatedPlayers } = simulateFullAuctionPool(
      gameState.auctionState,
      gameState.teams,
      gameState.allPlayers,
      gameState.userTeamId,
      {
        fromBeginning,
        userAutoBid: autoBuildUserSquad,
        userPriorityTargetIds: targetIds
      }
    );

    const updatedNews = [...gameState.newsFeed];
    const userTeam = updatedTeams[gameState.userTeamId];
    updatedNews.unshift({
      id: `news_auc_sim_${Date.now()}`,
      title: `IPL MEGA AUCTION CONCLUDED: All 10 Franchise Rosters Finalized!`,
      category: 'Auction',
      summary: `${userTeam?.name} successfully secured ${userTeam?.rosterPlayerIds.length} players with ₹${userTeam?.purseCr.toFixed(2)} Cr remaining purse. The tournament stage is officially underway!`,
      timestampFormatted: 'Auction Completed',
      impactRating: 'High',
      teamId: gameState.userTeamId
    });

    const newState: GameSave = {
      ...gameState,
      auctionState: updatedAuction,
      teams: updatedTeams,
      allPlayers: updatedPlayers,
      seasonStage: 'LeagueStage',
      newsFeed: updatedNews,
      currentScreen: 'Dashboard'
    };

    setGameState(newState);
    setCurrentScreen('Dashboard');
    setActiveTab('Dashboard');
    soundFx.playCheer();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {}
  };

  const simulateCurrentAuctionSet = () => {
    if (!gameState || !gameState.auctionState) return;

    const { updatedAuction, updatedTeams, updatedPlayers } = simulateCurrentSetInAuction(
      gameState.auctionState,
      gameState.teams,
      gameState.allPlayers,
      gameState.userTeamId
    );

    const newState: GameSave = {
      ...gameState,
      auctionState: updatedAuction,
      teams: updatedTeams,
      allPlayers: updatedPlayers
    };

    if (updatedAuction.isCompleted) {
      newState.seasonStage = 'LeagueStage';
      newState.currentScreen = 'Dashboard';
      setCurrentScreen('Dashboard');
      setActiveTab('Dashboard');
    }

    setGameState(newState);
    soundFx.playHammerKnock();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {}
  };

  const toggleAutoBid = () => {
    if (!gameState || !gameState.auctionState) return;
    setGameState({
      ...gameState,
      auctionState: {
        ...gameState.auctionState,
        autoBidUser: !gameState.auctionState.autoBidUser
      }
    });
  };

  // Auto-advance auction AI bids timer loop
  useEffect(() => {
    if (currentScreen !== 'Auction' || !gameState || !gameState.auctionState || gameState.auctionState.isCompleted || !gameState.auctionState.activePlayer) {
      return;
    }

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev || !prev.auctionState || !prev.auctionState.activePlayer) return prev;
        const auc = { ...prev.auctionState };
        
        // AI bid candidate
        const aiBid = getNextAIBid(auc, prev.teams, prev.allPlayers, prev.userTeamId);
        if (aiBid && Math.random() > 0.4) {
          const wasUserLeading = auc.currentLeadingTeamId === prev.userTeamId;
          auc.currentBidCr = aiBid.bidAmountCr;
          auc.currentLeadingTeamId = aiBid.teamId;
          auc.hammerState = 'Bidding';
          auc.auctionTimerSeconds = 8;
          auc.bidHistory.unshift({
            teamId: aiBid.teamId,
            teamShortName: prev.teams[aiBid.teamId]?.shortName || 'AI',
            bidAmountCr: aiBid.bidAmountCr,
            timestamp: Date.now(),
            decisionType: aiBid.decisionContext?.decision,
            isPressureBid: aiBid.decisionContext?.isBluffOrPressure,
            biddingWarCount: auc.bidHistory.length + 1
          });

          if (wasUserLeading) {
            audioManager.playOutbidAlert();
          } else {
            audioManager.playAuctionBid(false);
          }

          if (aiBid.bidAmountCr >= 10 || aiBid.bidAmountCr >= (auc.activePlayer?.basePriceCr || 2) * 1.5) {
            audioManager.setAuctionIntensity(3);
          }
          return { ...prev, auctionState: auc };
        }

        // Decrement timer
        if (auc.auctionTimerSeconds > 1) {
          auc.auctionTimerSeconds -= 1;
          if (auc.auctionTimerSeconds <= 3) {
            auc.hammerState = 'Going Twice';
            audioManager.playCountdownTick(true);
            audioManager.setAuctionIntensity(4);
          } else if (auc.auctionTimerSeconds <= 5) {
            auc.hammerState = 'Going Once';
            audioManager.playCountdownTick(false);
          }
          return { ...prev, auctionState: auc };
        } else {
          // Timer hit 0 -> Sold / Unsold
          const player = auc.activePlayer;
          if (auc.currentLeadingTeamId) {
            const winner = prev.teams[auc.currentLeadingTeamId];
            const isUserAcquired = winner?.id === prev.userTeamId;
            if (winner) {
              winner.purseCr = Number((winner.purseCr - auc.currentBidCr).toFixed(2));
              winner.rosterPlayerIds.push(player.id);
              player.currentTeamId = winner.id;
              player.salaryCr = auc.currentBidCr;
              prev.allPlayers[player.id] = { ...player, currentTeamId: winner.id, salaryCr: auc.currentBidCr };
              auc.soldPlayerRecords.push({
                player,
                sellingPriceCr: auc.currentBidCr,
                buyingTeamId: winner.id
              });
            }
            audioManager.playAuctionHammer(isUserAcquired);
          } else {
            auc.unsoldPlayerIds.push(player.id);
            audioManager.playUnsoldSound();
          }

          auc.currentPlayerIndex += 1;
          const nextP = auc.allPlayerPool[auc.currentPlayerIndex] || null;
          auc.activePlayer = nextP;
          auc.currentBidCr = nextP ? nextP.basePriceCr : 0;
          auc.currentLeadingTeamId = null;
          auc.bidHistory = [];
          auc.auctionTimerSeconds = 10;
          auc.hammerState = 'Bidding';

          if (nextP && (nextP.overall >= 88 || nextP.isMarquee)) {
            audioManager.playBigPlayerReveal();
          } else {
            audioManager.setAuctionIntensity(1);
          }

          if (!nextP) {
            auc.isCompleted = true;
            prev.seasonStage = 'LeagueStage';
          }

          return { ...prev, auctionState: auc };
        }
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [currentScreen, gameState?.auctionState?.activePlayer?.id]);

  // --- PLAYING XI ---
  const updateUserPlayingXI = (xi: MatchPlayingXI) => {
    if (!gameState) return;
    const teams = { ...gameState.teams };
    if (teams[gameState.userTeamId]) {
      teams[gameState.userTeamId].playingXI = xi;
    }
    setGameState({ ...gameState, teams });
    saveCurrentGame();
  };

  // --- MATCH OPERATIONS ---
  const prepareMatch = (fixtureId: string) => {
    if (!gameState) return;
    const fixture = gameState.leagueSchedule.find(f => f.id === fixtureId) || gameState.leagueSchedule[gameState.currentFixtureIndex];
    if (!fixture) return;

    const teamA = gameState.teams[fixture.teamAId];
    const teamB = gameState.teams[fixture.teamBId];
    if (!teamA || !teamB) return;

    const matchState = initMatchState(
      fixture.id,
      gameState.currentSeason,
      teamA.id,
      teamB.id,
      fixture.venue,
      fixture.city,
      teamA.playingXI || {
        teamId: teamA.id,
        playingXIIds: teamA.rosterPlayerIds.slice(0, 11),
        captainId: teamA.captainId,
        wicketkeeperId: teamA.wicketkeeperId,
        battingOrder: teamA.rosterPlayerIds.slice(0, 11),
        powerplayBowlerIds: teamA.rosterPlayerIds.slice(0, 2),
        deathBowlerIds: teamA.rosterPlayerIds.slice(0, 2),
        mainSpinBowlerIds: teamA.rosterPlayerIds.slice(2, 4)
      },
      teamB.playingXI || {
        teamId: teamB.id,
        playingXIIds: teamB.rosterPlayerIds.slice(0, 11),
        captainId: teamB.captainId,
        wicketkeeperId: teamB.wicketkeeperId,
        battingOrder: teamB.rosterPlayerIds.slice(0, 11),
        powerplayBowlerIds: teamB.rosterPlayerIds.slice(0, 2),
        deathBowlerIds: teamB.rosterPlayerIds.slice(0, 2),
        mainSpinBowlerIds: teamB.rosterPlayerIds.slice(2, 4)
      },
      gameState.allPlayers,
      fixture.stage === 'Playoff' ? 'Qualifier 1' : 'League'
    );

    setGameState({
      ...gameState,
      currentMatchState: matchState,
      currentScreen: 'MatchLive'
    });
    setCurrentScreen('MatchLive');
    setActiveTab('MatchLive');
    window.history.pushState({}, '', '/play/live');
  };

  const prepareScenarioChallenge = (challenge: ChallengeScenario) => {
    if (!gameState) return;
    const teamA = gameState.teams[challenge.userTeamId];
    const teamB = gameState.teams[challenge.opponentTeamId];
    if (!teamA || !teamB) return;

    const matchState = initMatchState(
      challenge.id,
      gameState.currentSeason,
      teamA.id,
      teamB.id,
      teamA.homeVenue,
      teamA.city,
      teamA.playingXI,
      teamB.playingXI,
      gameState.allPlayers,
      'League'
    );

    // Apply scenario initial state
    matchState.innings1.totalRuns = challenge.initialInnings1Score.runs;
    matchState.innings1.wickets = challenge.initialInnings1Score.wickets;
    matchState.innings1.oversCompleted = challenge.initialInnings1Score.overs;
    matchState.innings1.isCompleted = true;

    matchState.currentInningsIndex = 2;
    matchState.innings2.target = challenge.targetRuns;
    matchState.innings2.totalRuns = challenge.initialInnings2Score.runs;
    matchState.innings2.wickets = challenge.initialInnings2Score.wickets;
    matchState.innings2.oversCompleted = challenge.initialInnings2Score.oversCompleted;
    matchState.innings2.ballsInCurrentOver = challenge.initialInnings2Score.ballsInOver;

    setActiveChallenge(challenge);
    setGameState({
      ...gameState,
      currentMatchState: matchState,
      currentScreen: 'MatchLive'
    });
    setCurrentScreen('MatchLive');
    setActiveTab('MatchLive');
    window.history.pushState({}, '', '/play/live');
  };

  const bowlBall = () => {
    if (!gameState || !gameState.currentMatchState || gameState.currentMatchState.isMatchCompleted) return;
    const { updatedMatch, event } = simulateNextBall(gameState.currentMatchState, gameState.allPlayers);

    // Play reactive broadcast sounds
    if (event.eventType === '6') {
      audioManager.playBatHit(false, true);
    } else if (event.eventType === '4') {
      audioManager.playBatHit(true, false);
    } else if (event.eventType === 'WICKET') {
      audioManager.playWicketSound();
    } else {
      audioManager.playBatHit(false, false);
    }

    if (updatedMatch.isMatchCompleted) {
      if (updatedMatch.winnerTeamId === gameState.userTeamId) {
        if (updatedMatch.matchType === 'Final') {
          audioManager.playChampionshipCelebration();
        } else {
          audioManager.playVictorySting();
        }
      } else if (updatedMatch.winnerTeamId) {
        audioManager.playDefeatSting();
      }
    }

    setGameState({
      ...gameState,
      currentMatchState: { ...updatedMatch }
    });
  };

  const simOver = () => {
    if (!gameState || !gameState.currentMatchState || gameState.currentMatchState.isMatchCompleted) return;
    const match = simulateOver(gameState.currentMatchState, gameState.allPlayers);
    audioManager.playBatHit(true, false);
    if (match.isMatchCompleted) {
      if (match.winnerTeamId === gameState.userTeamId) {
        audioManager.playVictorySting();
      } else if (match.winnerTeamId) {
        audioManager.playDefeatSting();
      }
    }
    setGameState({ ...gameState, currentMatchState: { ...match } });
  };

  const simInnings = () => {
    if (!gameState || !gameState.currentMatchState || gameState.currentMatchState.isMatchCompleted) return;
    const match = simulateInnings(gameState.currentMatchState, gameState.allPlayers);
    audioManager.triggerCrowdRoar(0.9, 2000);
    if (match.isMatchCompleted) {
      if (match.winnerTeamId === gameState.userTeamId) {
        audioManager.playVictorySting();
      } else if (match.winnerTeamId) {
        audioManager.playDefeatSting();
      }
    }
    setGameState({ ...gameState, currentMatchState: { ...match } });
  };

  const simFullMatch = () => {
    if (!gameState || !gameState.currentMatchState || gameState.currentMatchState.isMatchCompleted) return;
    const match = simulateFullMatch(gameState.currentMatchState, gameState.allPlayers);
    audioManager.triggerCrowdRoar(1.0, 2500);
    if (match.isMatchCompleted) {
      if (match.winnerTeamId === gameState.userTeamId) {
        if (match.matchType === 'Final') {
          audioManager.playChampionshipCelebration();
        } else {
          audioManager.playVictorySting();
        }
      } else if (match.winnerTeamId) {
        audioManager.playDefeatSting();
      }
    }
    setGameState({ ...gameState, currentMatchState: { ...match } });
  };

  const updateMatchTactics = (teamId: string, tactics: any) => {
    if (!gameState || !gameState.currentMatchState) return;
    const match = { ...gameState.currentMatchState };
    if (teamId === match.teamAId) {
      match.tactics.teamATactics = { ...match.tactics.teamATactics, ...tactics };
    } else {
      match.tactics.teamBTactics = { ...match.tactics.teamBTactics, ...tactics };
    }
    setGameState({ ...gameState, currentMatchState: match });
  };

  const completeCurrentMatch = (skipToDashboard?: boolean) => {
    if (!gameState || !gameState.currentMatchState) return;
    const match = gameState.currentMatchState;
    const standings = updateStandingsWithMatch(
      gameState.standings,
      match.teamAId,
      match.teamBId,
      match.winnerTeamId,
      match.innings1.totalRuns,
      match.innings1.oversCompleted + (match.innings1.ballsInCurrentOver / 6),
      match.innings2.totalRuns,
      match.innings2.oversCompleted + (match.innings2.ballsInCurrentOver / 6)
    );

    // Mark fixture as played
    const schedule = gameState.leagueSchedule.map(f => {
      if (f.id === match.id) {
        return {
          ...f,
          isPlayed: true,
          winnerTeamId: match.winnerTeamId,
          resultText: match.resultMarginText,
          scoreSummary: `${gameState.teams[match.innings1.battingTeamId]?.shortName || 'Team 1'} ${match.innings1.totalRuns}/${match.innings1.wickets} vs ${gameState.teams[match.innings2.battingTeamId]?.shortName || 'Team 2'} ${match.innings2.totalRuns}/${match.innings2.wickets}`
        };
      }
      return f;
    });

    const nextIndex = gameState.currentFixtureIndex + 1;
    const updatedNews = [...gameState.newsFeed];

    // Generate News headline
    const winnerName = gameState.teams[match.winnerTeamId || match.teamAId]?.name || 'Winners';
    updatedNews.unshift({
      id: `news_${Date.now()}`,
      title: `${winnerName} Secure Thrilling Victory in IPL Classic!`,
      category: 'Match Report',
      summary: match.resultMarginText || 'Clinical performance under the floodlights.',
      timestampFormatted: `Match ${nextIndex}`,
      impactRating: 'Medium',
      teamId: match.winnerTeamId
    });

    // Generate Dynamic Press Conference Questions
    const isUserWinner = match.winnerTeamId === gameState.userTeamId;
    const isUserMatch = match.teamAId === gameState.userTeamId || match.teamBId === gameState.userTeamId;
    const userTeam = gameState.teams[gameState.userTeamId];
    const oppTeamId = match.teamAId === gameState.userTeamId ? match.teamBId : match.teamAId;
    const oppTeam = gameState.teams[oppTeamId];

    const pressQuestions = [];
    if (isUserWinner) {
      pressQuestions.push({
        id: `press_q1_${Date.now()}`,
        journalistName: 'Harsha Bhogle',
        mediaOutlet: 'Cricbuzz Live',
        questionText: `Stupendous win for ${userTeam?.name || 'the squad'}! What was the decisive turning point tonight?`,
        options: [
          {
            text: 'Our middle order took calculated risks and executed our tactics with absolute clarity.',
            ownerTrustChange: 5,
            playerMoraleChange: 8
          },
          {
            text: 'Credit to our bowling battery for hitting their lengths and choking boundaries at the death.',
            ownerTrustChange: 4,
            playerMoraleChange: 9
          },
          {
            text: 'We never lose faith in our game plan, but we stay humble as the tournament progresses.',
            ownerTrustChange: 6,
            playerMoraleChange: 5
          }
        ]
      });
      pressQuestions.push({
        id: `press_q2_${Date.now()}`,
        journalistName: 'Ravi Shastri',
        mediaOutlet: 'Star Sports Broadcast',
        questionText: 'The team spirit and high intensity were evident throughout the 40 overs. How do you keep this momentum going?',
        options: [
          {
            text: 'Fearless cricket is in our DNA. We empower every player to express themselves freely.',
            ownerTrustChange: 4,
            playerMoraleChange: 7
          },
          {
            text: 'Deep preparation and total trust in our 25-man squad. Everyone is ready to deliver when called upon.',
            ownerTrustChange: 7,
            playerMoraleChange: 6
          }
        ]
      });
    } else if (isUserMatch) {
      pressQuestions.push({
        id: `press_q1_${Date.now()}`,
        journalistName: 'Sanjay Manjrekar',
        mediaOutlet: 'ESPNCricinfo',
        questionText: `A hard-fought battle against ${oppTeam?.name || 'the opponents'}. Where did the match slip from your grasp?`,
        options: [
          {
            text: 'We fell slightly short with the bat and gave away loose deliveries during the powerplay. We will fix it.',
            ownerTrustChange: 2,
            playerMoraleChange: 3
          },
          {
            text: 'I take full tactical responsibility as manager. The squad gave 100% effort on the field.',
            ownerTrustChange: 3,
            playerMoraleChange: 8
          },
          {
            text: 'T20 is a game of fine margins. We will analyze the match data and bounce back stronger in our next match.',
            ownerTrustChange: 5,
            playerMoraleChange: 5
          }
        ]
      });
    } else {
      pressQuestions.push({
        id: `press_q1_${Date.now()}`,
        journalistName: 'Aakash Chopra',
        mediaOutlet: 'JioCinema Studio',
        questionText: 'A gripping clash in the tournament. How do you view the standings shaping up at this stage?',
        options: [
          {
            text: 'The table is fiercely competitive. Every single fixture and Net Run Rate point is critical.',
            ownerTrustChange: 4,
            playerMoraleChange: 4
          }
        ]
      });
    }

    const pressState = {
      questions: pressQuestions,
      currentQuestionIndex: 0,
      matchId: match.id
    };

    const targetScreen = skipToDashboard ? 'Dashboard' : 'PostMatchPresentation';

    const newState: GameSave = {
      ...gameState,
      standings,
      leagueSchedule: schedule,
      currentFixtureIndex: nextIndex,
      currentMatchState: undefined,
      currentScreen: targetScreen,
      pressConferenceState: pressState,
      newsFeed: updatedNews
    };

    setGameState(newState);
    setCurrentScreen(targetScreen);
    if (skipToDashboard) {
      setActiveTab('Dashboard');
    }
    saveCurrentGame();
  };

  const answerPressQuestion = (optionIndex: number) => {
    if (!gameState) return;
    const press = gameState.pressConferenceState;
    if (!press || !press.questions) return;
    const currentQ = press.questions[press.currentQuestionIndex || 0];
    if (!currentQ || !currentQ.options[optionIndex]) return;

    const opt = currentQ.options[optionIndex];
    const userTeam = gameState.teams[gameState.userTeamId];
    if (userTeam) {
      userTeam.ownerTrust = Math.min(100, Math.max(10, userTeam.ownerTrust + (opt.ownerTrustChange || 0)));
      userTeam.fanApproval = Math.min(100, Math.max(10, userTeam.fanApproval + (opt.playerMoraleChange > 0 ? 3 : -1)));
      if (opt.playerMoraleChange) {
        userTeam.rosterPlayerIds.forEach(pId => {
          const p = gameState.allPlayers[pId];
          if (p) {
            p.morale = Math.min(100, Math.max(20, p.morale + opt.playerMoraleChange));
          }
        });
      }
    }

    const nextIdx = (press.currentQuestionIndex || 0) + 1;
    const updatedPress = {
      ...press,
      currentQuestionIndex: nextIdx
    };

    setGameState({
      ...gameState,
      pressConferenceState: updatedPress
    });
    soundFx.playBatHit();
    saveCurrentGame();
  };

  // --- TRADES & DYNASTY ---
  const proposeTrade = (receivingTeamId: string, offeredIds: string[], requestedIds: string[], cashCr: number) => {
    if (!gameState) return { success: false, feedback: 'Game not ready' };
    const offer: TradeOffer = {
      id: `trade_${Date.now()}`,
      offeringTeamId: gameState.userTeamId,
      receivingTeamId,
      offeredPlayerIds: offeredIds,
      requestedPlayerIds: requestedIds,
      cashAdjustmentCr: cashCr,
      status: 'Pending',
      aiFeedback: ''
    };

    const evalResult = evaluateTradeProposal(offer, gameState.teams, gameState.allPlayers);
    offer.status = evalResult.accepted ? 'Accepted' : 'Rejected';
    offer.aiFeedback = evalResult.aiFeedback;

    if (evalResult.accepted) {
      const userTeam = gameState.teams[gameState.userTeamId];
      const partnerTeam = gameState.teams[receivingTeamId];
      
      // Swap players
      userTeam.rosterPlayerIds = userTeam.rosterPlayerIds.filter(id => !offeredIds.includes(id)).concat(requestedIds);
      partnerTeam.rosterPlayerIds = partnerTeam.rosterPlayerIds.filter(id => !requestedIds.includes(id)).concat(offeredIds);
      
      // Update cash
      userTeam.purseCr = Number((userTeam.purseCr - cashCr).toFixed(2));
      partnerTeam.purseCr = Number((partnerTeam.purseCr + cashCr).toFixed(2));

      // Update player teamId
      offeredIds.forEach(id => {
        if (gameState.allPlayers[id]) gameState.allPlayers[id].currentTeamId = receivingTeamId;
      });
      requestedIds.forEach(id => {
        if (gameState.allPlayers[id]) gameState.allPlayers[id].currentTeamId = gameState.userTeamId;
      });

      gameState.tradeOffers.unshift(offer);
      saveCurrentGame();
      return { success: true, feedback: evalResult.aiFeedback };
    } else {
      gameState.tradeOffers.unshift(offer);
      saveCurrentGame();
      return { success: false, feedback: evalResult.aiFeedback };
    }
  };

  const signYouthProspect = (prospect: Player) => {
    if (!gameState) return;
    const userTeam = gameState.teams[gameState.userTeamId];
    if (userTeam.rosterPlayerIds.length >= 25) return;
    if (userTeam.purseCr < prospect.salaryCr) return;

    userTeam.purseCr = Number((userTeam.purseCr - prospect.salaryCr).toFixed(2));
    userTeam.rosterPlayerIds.push(prospect.id);
    prospect.currentTeamId = userTeam.id;
    gameState.allPlayers[prospect.id] = prospect;
    gameState.youthAcademyPool = gameState.youthAcademyPool.filter(p => p.id !== prospect.id);

    saveCurrentGame();
    setGameState({ ...gameState });
  };

  const advanceToNextSeason = () => {
    if (!gameState) return;
    const nextSeasonYear = gameState.currentSeason + 1;
    
    // Progress all players
    const updatedPlayers: Record<string, Player> = {};
    (Object.values(gameState.allPlayers) as Player[]).forEach(p => {
      const progressed = progressPlayerToNextSeason(p);
      updatedPlayers[progressed.id] = progressed;
    });

    // Reset season awards & standings
    const newStandings = initStandings(gameState.teams);
    const newFixtures = generateLeagueSchedule(gameState.teams);
    const newYouth = [generateYouthProspect(1), generateYouthProspect(2), generateYouthProspect(3), generateYouthProspect(4)];

    // Reset team purses for new season auction
    (Object.values(gameState.teams) as Team[]).forEach(t => {
      t.purseCr = 40.0;
    });

    const unassignedPool = Object.values(updatedPlayers).filter(p => !p.currentTeamId);
    const newAuction = initAuctionState(unassignedPool);

    const newState: GameSave = {
      ...gameState,
      currentSeason: nextSeasonYear,
      seasonStage: 'Auction',
      allPlayers: updatedPlayers,
      standings: newStandings,
      leagueSchedule: newFixtures,
      currentFixtureIndex: 0,
      youthAcademyPool: newYouth,
      auctionState: newAuction,
      currentScreen: 'Auction'
    };

    setGameState(newState);
    setCurrentScreen('Auction');
    saveCurrentGame();
  };

  const upgradeScoutLevel = (): { success: boolean; message: string } => {
    if (!gameState) return { success: false, message: 'Game state not found' };
    const userTeam = gameState.teams[gameState.userTeamId];
    if (!userTeam) return { success: false, message: 'User team not found' };

    const dept = gameState.scoutingDepartment || {
      level: 1,
      scoutingBudgetSpentCr: 0,
      watchlist: [],
      auctionTargetIds: [],
      unlockedReportIds: [],
      completedMissionIds: [],
      alerts: []
    };

    if (dept.level >= 5) {
      return { success: false, message: 'Scouting Department is already at MAX Level 5.' };
    }

    const upgradeCost = dept.level * 1.5; // Level 1->2: 1.5Cr, 2->3: 3.0Cr, 3->4: 4.5Cr, 4->5: 6.0Cr
    if (userTeam.purseCr < upgradeCost) {
      return { success: false, message: `Insufficient purse balance. Need ₹${upgradeCost.toFixed(2)} Cr to upgrade.` };
    }

    userTeam.purseCr = Number((userTeam.purseCr - upgradeCost).toFixed(2));
    dept.level = dept.level + 1;
    dept.scoutingBudgetSpentCr = Number(((dept.scoutingBudgetSpentCr || 0) + upgradeCost).toFixed(2));

    const newAlert: ScoutAlert = {
      id: `alert_upgrade_${Date.now()}`,
      playerId: '',
      type: 'SCOUT_NOTE',
      message: `Scouting Network upgraded to Level ${dept.level}! Unlocked higher accuracy radar attributes & tactical depth.`,
      timestampFormatted: 'Just now',
      isRead: false
    };
    dept.alerts = [newAlert, ...(dept.alerts || [])];

    setGameState({
      ...gameState,
      scoutingDepartment: { ...dept }
    });
    soundFx.playCheer();
    saveCurrentGame();
    return { success: true, message: `Scouting Network upgraded to Level ${dept.level}!` };
  };

  const addToWatchlist = (playerId: string, priority: PriorityLevel = 'Medium', notes: string = '') => {
    if (!gameState) return;
    const dept = gameState.scoutingDepartment || {
      level: 3,
      scoutingBudgetSpentCr: 1.5,
      watchlist: [],
      auctionTargetIds: [],
      unlockedReportIds: [],
      completedMissionIds: [],
      alerts: []
    };

    const existingIndex = dept.watchlist.findIndex(w => w.playerId === playerId);
    const dateStr = `Season ${gameState.currentSeason}`;

    if (existingIndex >= 0) {
      dept.watchlist[existingIndex] = {
        ...dept.watchlist[existingIndex],
        priority,
        notes: notes || dept.watchlist[existingIndex].notes
      };
    } else {
      dept.watchlist.push({
        playerId,
        priority,
        notes,
        addedSeason: gameState.currentSeason,
        addedDateFormatted: dateStr
      });
    }

    setGameState({
      ...gameState,
      scoutingDepartment: { ...dept }
    });
    soundFx.playBatHit();
    saveCurrentGame();
  };

  const removeFromWatchlist = (playerId: string) => {
    if (!gameState) return;
    const dept = gameState.scoutingDepartment;
    if (!dept) return;

    dept.watchlist = (dept.watchlist || []).filter(w => w.playerId !== playerId);
    setGameState({
      ...gameState,
      scoutingDepartment: { ...dept }
    });
    saveCurrentGame();
  };

  const updateWatchlistNote = (playerId: string, notes: string, priority?: PriorityLevel) => {
    if (!gameState) return;
    const dept = gameState.scoutingDepartment;
    if (!dept) return;

    const item = (dept.watchlist || []).find(w => w.playerId === playerId);
    if (item) {
      item.notes = notes;
      if (priority) item.priority = priority;
      setGameState({
        ...gameState,
        scoutingDepartment: { ...dept }
      });
      saveCurrentGame();
    }
  };

  const toggleAuctionTarget = (playerId: string) => {
    if (!gameState) return;
    const dept = gameState.scoutingDepartment || {
      level: 3,
      scoutingBudgetSpentCr: 1.5,
      watchlist: [],
      auctionTargetIds: [],
      unlockedReportIds: [],
      completedMissionIds: [],
      alerts: []
    };

    const targetSet = new Set(dept.auctionTargetIds || []);
    if (targetSet.has(playerId)) {
      targetSet.delete(playerId);
    } else {
      targetSet.add(playerId);
      soundFx.playCheer();
    }

    dept.auctionTargetIds = Array.from(targetSet);
    setGameState({
      ...gameState,
      scoutingDepartment: { ...dept }
    });
    saveCurrentGame();
  };

  const completeScoutMission = (missionId: string) => {
    if (!gameState) return;
    const dept = gameState.scoutingDepartment;
    if (!dept) return;

    if (!dept.completedMissionIds.includes(missionId)) {
      dept.completedMissionIds.push(missionId);
      soundFx.playCheer();
      setGameState({
        ...gameState,
        scoutingDepartment: { ...dept }
      });
      saveCurrentGame();
    }
  };

  const markAlertRead = (alertId: string) => {
    if (!gameState) return;
    const dept = gameState.scoutingDepartment;
    if (!dept) return;

    const alert = (dept.alerts || []).find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
      setGameState({
        ...gameState,
        scoutingDepartment: { ...dept }
      });
      saveCurrentGame();
    }
  };

  const submitPressAnswer = (option: { text: string; moraleChange: number; ownerTrustChange: number }) => {
    if (!gameState) return;
    const userTeam = gameState.teams[gameState.userTeamId];
    if (userTeam) {
      userTeam.ownerTrust = Math.min(100, Math.max(10, userTeam.ownerTrust + option.ownerTrustChange));
      userTeam.fanApproval = Math.min(100, Math.max(10, userTeam.fanApproval + (option.moraleChange > 0 ? 3 : -2)));
    }
    setCurrentScreen('Dashboard');
    setActiveTab('Dashboard');
    saveCurrentGame();
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        currentScreen,
        activeTab,
        isMuted,
        selectedPlayerForModal,
        activeChallenge,
        setCurrentScreen,
        setActiveTab,
        toggleMute,
        setSelectedPlayerForModal,
        startNewFranchise,
        switchUserFranchise,
        restartGame,
        loadSavedGame,
        saveCurrentGame,
        resetToMenu,
        startAuctionMode,
        placeUserBid,
        passUserBid,
        fastForwardAuctionPlayer,
        simulateEntireAuction,
        simulateCurrentAuctionSet,
        toggleAutoBid,
        updateUserPlayingXI,
        prepareMatch,
        prepareScenarioChallenge,
        bowlBall,
        simOver,
        simInnings,
        simFullMatch,
        updateMatchTactics,
        completeCurrentMatch,
        proposeTrade,
        signYouthProspect,
        advanceToNextSeason,
        submitPressAnswer,
        answerPressQuestion,
        upgradeScoutLevel,
        addToWatchlist,
        removeFromWatchlist,
        updateWatchlistNote,
        toggleAuctionTarget,
        completeScoutMission,
        markAlertRead
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};
