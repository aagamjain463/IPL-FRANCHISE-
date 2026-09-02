import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { GameSave, GameScreen, AppTab, FCThemeMode, GoogleAccountProfile, SAVE_VERSION, SeasonSummary } from '../types/game';
import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { AuctionState, AuctionBid } from '../types/auction';
import { MatchState, MatchPlayingXI, InningsState } from '../types/cricket';
import { StandingsRow, TournamentFixture } from '../types/tournament';
import { INITIAL_TEAMS } from '../data/teams';
import { INITIAL_PLAYERS } from '../data/players';
import { SCENARIO_CHALLENGES, ChallengeScenario } from '../data/challenges';
import { initAuctionState, getNextAIBid, getBidIncrement, evaluatePlayerValueForTeam, simulateAuctionBattle, simulateFullAuctionPool, simulateCurrentSetInAuction, calculateTeamSquadNeeds, calculatePlayerNeedFit } from '../engine/auctionEngine';
import { initStandings, generateLeagueSchedule, updateStandingsWithMatch, calculateSeasonAwards, generatePlayoffFixtures, resolvePlayoffFixtures, isLeagueStageComplete } from '../engine/tournamentEngine';
import { initMatchState, simulateNextBall, simulateOver, simulateInnings, simulateFullMatch, applyImpactSubstitution, getInningsOvers, buildPitchCondition, estimateWinProbability } from '../engine/cricketEngine';
import { generateYouthProspect, progressPlayerToNextSeason } from '../engine/dynastyEngine';
import { applyMatchResults, refreshPlayersForMatchday } from '../engine/matchResultsEngine';
import { migrateSave } from '../engine/saveMigration';
import { TradeOffer, evaluateTradeProposal } from '../engine/tradeEngine';
import { soundFx } from '../audio/soundFx';
import { audioManager } from '../audio/audioManager';
import { ScoutingDepartmentData, WatchlistItem, PriorityLevel, ScoutAlert } from '../types/scout';
import { FranchiseProgressionState } from '../types/franchise';
import { getFranchiseLevelInfo, initFranchiseProgression } from '../engine/progressionEngine';
import { completeAchievement, ensureRewardEcosystem, progressObjectiveById, RewardQueueItem } from '../rewards/rewardEngine';
import { getRouteForState } from '../utils/router';
import { GoogleCloudSaveClient } from '../services/googleCloudSaveClient';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const awardProgressionXp = (progression: FranchiseProgressionState | undefined, xpGain: number, source: string): FranchiseProgressionState | undefined => {
  if (!progression) return progression;
  const stable = ensureRewardEcosystem(progression);
  const nextXp = Math.max(0, (stable.xp || 0) + xpGain);
  const levelInfo = getFranchiseLevelInfo(nextXp);
  const reward: RewardQueueItem = {
    id: `event_${source.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`,
    source,
    createdAt: Date.now(),
    claimed: true,
    grants: [{ id: `${source}_xp`, kind: 'xp', title: 'Franchise XP', value: xpGain, description: 'Earned from real franchise activity', rarity: xpGain >= 80 ? 'epic' : xpGain >= 35 ? 'rare' : 'common' }]
  };
  return {
    ...stable,
    xp: nextXp,
    level: levelInfo.level,
    xpToNextLevel: levelInfo.nextLevelXp,
    rewards: { ...stable.rewards, queue: [reward, ...stable.rewards.queue].slice(0, 8), history: [reward, ...stable.rewards.history].slice(0, 40) }
  } as FranchiseProgressionState;
};

interface GameContextType {
  gameState: GameSave | null;
  setGameState: React.Dispatch<React.SetStateAction<GameSave | null>>;
  currentScreen: GameScreen;
  activeTab: AppTab;
  isMuted: boolean;
  selectedPlayerForModal: Player | null;
  activeChallenge: ChallengeScenario | null;
  toast: { id: number; message: string; tone?: 'info' | 'success' | 'warn' | 'danger' } | null;
  showToast: (message: string, tone?: 'info' | 'success' | 'warn' | 'danger') => void;
  setCurrentScreen: (screen: GameScreen) => void;
  setActiveTab: (tab: AppTab) => void;
  toggleMute: () => void;
  setSelectedPlayerForModal: (p: Player | null) => void;
  startNewFranchise: (teamId: string, managerName: string, autoSimulateAuction?: boolean, startMultiplayerAuction?: boolean) => void;
  switchUserFranchise: (newTeamId: string) => void;
  restartGame: (options?: { restartAuctionOnly?: boolean; newTeamId?: string; resetEverything?: boolean }) => void;
  loadSavedGame: () => boolean;
  saveCurrentGame: () => void;
  resetToMenu: () => void;
  // Theme & Google Cloud Progress
  setThemeMode: (theme: FCThemeMode) => void;
  signInWithGoogle: (credential: string) => Promise<boolean>;
  signOutGoogle: () => void;
  saveToCloudSync: () => Promise<boolean>;
  // Auction actions
  startAuctionMode: () => void;
  placeUserBid: () => void;
  passUserBid: () => void;
  fastForwardAuctionPlayer: () => void;
  simulateEntireAuction: (fromBeginning?: boolean, autoBuildUserSquad?: boolean) => void;
  simulateCurrentAuctionSet: () => void;
  toggleAutoBid: () => void;
  togglePauseAuction: () => void;
  // Playing XI actions
  updateUserPlayingXI: (xi: MatchPlayingXI) => void;
  buildValidXIForTeam: (teamId?: string) => MatchPlayingXI | null;
  runTrainingSession: (focus: 'batting' | 'bowling' | 'recovery') => { applied: number; message: string };
  executeImpactSub: (teamId: string, playerOutId: string, playerInId: string) => void;
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
  advanceToNextSeason: (releasePlayerIds?: string[]) => void;
  beginOffSeason: () => void;
  openSeasonRecap: () => void;
  setHomePitchType: (pitch: string) => void;
  validateUserSquad: () => { valid: boolean; issues: string[] };
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
  // Walkout reveal actions
  currentWalkoutPlayer: Player | null;
  triggerWalkout: (player: Player) => void;
  exitWalkout: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEY = 'ipl_franchise_sim_save_v1';

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameSave | null>(null);
  const [currentScreen, setCurrentScreenState] = useState<GameScreen>('MainMenu');
  const [activeTab, setActiveTabState] = useState<AppTab>('Dashboard');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [currentWalkoutPlayer, setCurrentWalkoutPlayer] = useState<Player | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeScenario | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string; tone?: 'info' | 'success' | 'warn' | 'danger' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outbidFlagRef = useRef<string | null>(null);
  const cloudSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCloudSaveJsonRef = useRef<string>('');

  const pushGameRoute = (screen: GameScreen, tab: AppTab) => {
    if (typeof window === 'undefined' || screen === 'MainMenu') return;
    const route = getRouteForState(screen, tab);
    if (route && window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
  };

  const triggerWalkout = (player: Player) => {
    setCurrentWalkoutPlayer(player);
    setSelectedPlayerForModal(null);
    setCurrentScreenState('Walkout');
    setActiveTabState('Walkout');
    pushGameRoute('Walkout', 'Walkout');
  };

  const exitWalkout = () => {
    setCurrentWalkoutPlayer(null);
    setCurrentScreenState('Dashboard');
    setActiveTabState('Dashboard');
    pushGameRoute('Dashboard', 'Dashboard');
  };

  const setCurrentScreen = (screen: GameScreen) => {
    setCurrentScreenState(screen);
  };

  const setActiveTab = (tab: AppTab) => {
    setActiveTabState(tab);
    const nextScreen: GameScreen = tab === 'MultiplayerAuction'
      ? 'MultiplayerAuction'
      : tab === 'AuctionLive'
        ? 'Auction'
        : tab === 'MatchLive'
          ? 'MatchLive'
          : tab === 'Walkout'
            ? 'Walkout'
            : currentScreen === 'Auction' || currentScreen === 'MatchLive' || currentScreen === 'MultiplayerAuction' || currentScreen === 'Walkout'
              ? 'Dashboard'
              : currentScreen;
    setCurrentScreenState(nextScreen);
    pushGameRoute(nextScreen, tab);
  };

  const showToast = (message: string, tone: 'info' | 'success' | 'warn' | 'danger' = 'info') => {
    setToast({ id: Date.now(), message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // Auto-load game if exists (with migration of old saves)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = migrateSave(JSON.parse(saved));
        if (parsed && parsed.userTeamId && parsed.teams) {
          // Sanitize & backfill missing collections to guarantee zero crashes on outdated saves
          // Scouting department + progression fallbacks for very old saves
          if (!parsed.scoutingDepartment) {
            parsed.scoutingDepartment = {
              level: 3,
              scoutingBudgetSpentCr: 1.5,
              watchlist: [],
              auctionTargetIds: [],
              unlockedReportIds: [],
              completedMissionIds: [],
              alerts: []
            };
          } else {
            parsed.scoutingDepartment.watchlist = parsed.scoutingDepartment.watchlist || [];
            parsed.scoutingDepartment.auctionTargetIds = parsed.scoutingDepartment.auctionTargetIds || [];
            parsed.scoutingDepartment.unlockedReportIds = parsed.scoutingDepartment.unlockedReportIds || [];
            parsed.scoutingDepartment.completedMissionIds = parsed.scoutingDepartment.completedMissionIds || [];
            parsed.scoutingDepartment.alerts = parsed.scoutingDepartment.alerts || [];
            parsed.scoutingDepartment.level = parsed.scoutingDepartment.level || 3;
          }

          if (!parsed.progression) {
            parsed.progression = initFranchiseProgression();
          }

          // Persist migrated state immediately
          parsed.saveVersion = SAVE_VERSION;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

          setGameState(parsed);
          setCurrentScreen(parsed.currentScreen || 'Dashboard');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // If localStorage was cleared but this browser still has a Google session, recover from cloud.
  useEffect(() => {
    if (gameState || !GoogleCloudSaveClient.getSessionToken()) return;
    let cancelled = false;
    GoogleCloudSaveClient.loadCloudSave().then(result => {
      if (cancelled || !result.success || !result.cloudSave) return;
      const restored = { ...migrateSave(result.cloudSave), googleProfile: result.profile || result.cloudSave.googleProfile || null, saveVersion: SAVE_VERSION };
      setGameState(restored);
      setCurrentScreen(restored.currentScreen || 'Dashboard');
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(restored)); } catch {}
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const saveCurrentGame = () => {
    if (!gameState) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...gameState, saveVersion: SAVE_VERSION, updatedAt: Date.now() }));
    } catch {
      // ignore
    }
  };

  // Auto-persist every state change (debounced) so refresh never loses progress
  useEffect(() => {
    if (!gameState) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...gameState, saveVersion: SAVE_VERSION, updatedAt: Date.now() }));
      } catch { /* storage full — ignore */ }
    }, 350);
    return () => clearTimeout(t);
  }, [gameState]);

  // If the browser has a valid Google cloud session, restore the latest server save on app load.
  useEffect(() => {
    if (!gameState || gameState.googleProfile?.isLoggedIn || !GoogleCloudSaveClient.getSessionToken()) return;
    let cancelled = false;
    GoogleCloudSaveClient.loadCloudSave().then(result => {
      if (cancelled || !result.success || !result.profile) return;
      const remoteSave = result.cloudSave ? migrateSave(result.cloudSave) : null;
      const localUpdatedAt = gameState.updatedAt || 0;
      const remoteUpdatedAt = remoteSave?.updatedAt || 0;
      const nextState = remoteSave && remoteUpdatedAt >= localUpdatedAt
        ? { ...remoteSave, googleProfile: result.profile, saveVersion: SAVE_VERSION }
        : { ...gameState, googleProfile: result.profile, saveVersion: SAVE_VERSION };
      setGameState(nextState);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)); } catch {}
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [Boolean(gameState), gameState?.googleProfile?.isLoggedIn]);

  // Real cloud autosave: after Google sign-in, progress is sent to the backend on changes.
  useEffect(() => {
    if (!gameState?.googleProfile?.isLoggedIn || !GoogleCloudSaveClient.getSessionToken()) return;
    const payload = { ...gameState, saveVersion: SAVE_VERSION, updatedAt: Date.now() };
    const serialized = JSON.stringify(payload);
    if (serialized === lastCloudSaveJsonRef.current) return;
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = setTimeout(() => {
      lastCloudSaveJsonRef.current = serialized;
      GoogleCloudSaveClient.saveCloudGame(payload).catch(() => undefined);
    }, 1200);
    return () => {
      if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    };
  }, [gameState]);

  const toggleMute = () => {
    const next = soundFx.toggleMute();
    setIsMuted(next);
  };

  const startNewFranchise = (teamId: string, managerName: string, autoSimulateAuction: boolean = false, startMultiplayerAuction: boolean = false) => {
    // Deep clone initial teams & players
    const teamsMap: Record<string, Team> = JSON.parse(JSON.stringify(INITIAL_TEAMS));
    const playersMap: Record<string, Player> = {};
    INITIAL_PLAYERS.forEach(p => {
      playersMap[p.id] = JSON.parse(JSON.stringify(p));
    });

    // Populate team roster arrays based on players assigned to teams
    Object.values(teamsMap).forEach(t => {
      t.rosterPlayerIds = [];
      t.homePitchType = t.homePitchType || 'Balanced';
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

    if (startMultiplayerAuction) {
      currentScreenVal = 'MultiplayerAuction';
      activeTabVal = 'MultiplayerAuction';
    } else if (autoSimulateAuction) {
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

    const rivalMap: Record<string, string[]> = {
      csk: ['mi', 'rcb'], mi: ['csk', 'rcb'], rcb: ['csk', 'mi'], kkr: ['mi', 'rcb'],
      srh: ['rcb', 'csk'], rr: ['mi', 'pbks'], dc: ['kkr', 'lsg'], gt: ['csk', 'rcb'],
      lsg: ['dc', 'kkr'], pbks: ['rr', 'dc']
    };

    let signedInProfile: GoogleAccountProfile | null = null;
    try {
      signedInProfile = GoogleCloudSaveClient.getSessionToken()
        ? JSON.parse(localStorage.getItem('google_cloud_synced_profile') || 'null')
        : null;
    } catch { signedInProfile = null; }

    const initialSave: GameSave = {
      saveId: `save_${Date.now()}`,
      saveName: `${teamsMap[teamId]?.name || 'Franchise'} Campaign`,
      timestamp: Date.now(),
      updatedAt: Date.now(),
      saveVersion: SAVE_VERSION,
      googleProfile: signedInProfile,
      currentSeason: 2026,
      seasonStage,
      userTeamId: teamId,
      rivalTeamIds: rivalMap[teamId] || [],
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
          timestampFormatted: 'Season 2026 Opening',
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
            timestampFormatted: 'Season 2026 Opening',
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
        const parsed = migrateSave(JSON.parse(saved));
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
      if (isUserAcquired) {
        gameState.progression = awardProgressionXp(gameState.progression, player.overall >= 88 ? 90 : 45, `Auction Signing: ${player.name}`);
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
      // Stay on the Auction Room so the completion panel with restart /
      // team-switch / live-multiplayer options stays visible.
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
      if (winner.id === gameState.userTeamId) {
        gameState.progression = awardProgressionXp(gameState.progression, player.overall >= 88 ? 90 : 45, `Auction Signing: ${player.name}`);
      }
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
      // Stay on the Auction Room so the completion panel stays visible.
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
      currentScreen: 'Auction'
    };

    setGameState(newState);
    setCurrentScreen('Auction');
    setActiveTab('AuctionLive');
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
      gameState.userTeamId,
      gameState.scoutingDepartment?.auctionTargetIds
    );

    const newState: GameSave = {
      ...gameState,
      auctionState: updatedAuction,
      teams: updatedTeams,
      allPlayers: updatedPlayers
    };

    if (updatedAuction.isCompleted) {
      newState.seasonStage = 'LeagueStage';
      newState.currentScreen = 'Auction';
      setCurrentScreen('Auction');
      setActiveTab('AuctionLive');
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

  const togglePauseAuction = () => {
    if (!gameState || !gameState.auctionState) return;
    const nextPaused = !gameState.auctionState.isPaused;
    setGameState({
      ...gameState,
      auctionState: {
        ...gameState.auctionState,
        isPaused: nextPaused
      }
    });
    if (nextPaused) {
      soundFx.playBatHit(false, false);
    } else {
      soundFx.playHammerKnock();
    }
  };

  const setThemeMode = (theme: FCThemeMode) => {
    if (!gameState) return;
    setGameState({
      ...gameState,
      themeMode: theme
    });
    try {
      localStorage.setItem('fc_theme_mode', theme);
    } catch {}
    soundFx.playBatHit(false, false);
  };

  const signInWithGoogle = async (credential: string): Promise<boolean> => {
    const localSnapshot = gameState ? { ...gameState, saveVersion: SAVE_VERSION, updatedAt: Date.now() } : null;
    const result = await GoogleCloudSaveClient.signInWithCredential(credential, localSnapshot);
    if (!result.success || !result.profile) {
      showToast(result.error || 'Google sign-in failed. Check Google OAuth configuration.', 'danger');
      return false;
    }

    const remoteSave = result.cloudSave ? migrateSave(result.cloudSave) : null;
    if (!localSnapshot && !remoteSave) {
      try { localStorage.setItem('google_cloud_synced_profile', JSON.stringify(result.profile)); } catch {}
      showToast('Google sign-in complete. Start a franchise and it will save to cloud automatically.', 'success');
      return true;
    }
    const shouldUseRemote = Boolean(remoteSave && (!localSnapshot || (remoteSave.updatedAt || 0) > (localSnapshot.updatedAt || 0)));
    const baseSave = shouldUseRemote && remoteSave ? remoteSave : localSnapshot!;
    const nextState: GameSave = {
      ...baseSave,
      googleProfile: result.profile,
      saveVersion: SAVE_VERSION,
      updatedAt: Date.now()
    };

    setGameState(nextState);
    setCurrentScreen(nextState.currentScreen || 'Dashboard');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      localStorage.setItem('google_cloud_synced_profile', JSON.stringify(result.profile));
    } catch {}
    soundFx.playCheer(true);
    showToast(shouldUseRemote ? 'Google sign-in complete — cloud save restored.' : 'Google sign-in complete — progress synced.', 'success');
    return true;
  };

  const signOutGoogle = () => {
    if (!gameState) return;
    GoogleCloudSaveClient.clearSession();
    const newState = {
      ...gameState,
      googleProfile: null
    };
    setGameState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      localStorage.removeItem('google_cloud_synced_profile');
    } catch {}
    soundFx.playBatHit(false, false);
  };

  const saveToCloudSync = async (): Promise<boolean> => {
    if (!gameState?.googleProfile?.isLoggedIn) return false;
    const result = await GoogleCloudSaveClient.saveCloudGame({ ...gameState, saveVersion: SAVE_VERSION, updatedAt: Date.now() });
    if (!result.success || !result.profile) {
      showToast(result.error || 'Cloud sync failed. Please sign in again.', 'warn');
      return false;
    }
    const newState = { ...gameState, googleProfile: result.profile, saveVersion: SAVE_VERSION, updatedAt: result.updatedAt || Date.now() };
    setGameState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      localStorage.setItem('google_cloud_synced_profile', JSON.stringify(result.profile));
    } catch {}
    soundFx.playCheer(true);
    return true;
  };

  // Auto-advance auction AI bids timer loop
  useEffect(() => {
    if (currentScreen !== 'Auction' || !gameState || !gameState.auctionState || gameState.auctionState.isCompleted || !gameState.auctionState.activePlayer) {
      return;
    }

    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev || !prev.auctionState || !prev.auctionState.activePlayer) return prev;
        if (prev.auctionState.isPaused) return prev; // ABSOLUTE PAUSE LOCK
        const auc = { ...prev.auctionState };
        
        // AI bid candidate
        const aiBid = getNextAIBid(auc, prev.teams, prev.allPlayers, prev.userTeamId);
        if (aiBid && Math.random() > 0.4) {
          const wasUserLeading = auc.currentLeadingTeamId === prev.userTeamId;
          if (wasUserLeading) outbidFlagRef.current = aiBid.teamId;
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

  // Outbid + auction-complete toasts (visual companion to the audio alert)
  useEffect(() => {
    if (outbidFlagRef.current && gameState?.auctionState) {
      const team = gameState.teams[outbidFlagRef.current];
      showToast(`YOU HAVE BEEN OUTBID — ${team?.name || 'A rival franchise'} leads the lot.`, 'danger');
      outbidFlagRef.current = null;
    }
  }, [gameState?.auctionState?.currentLeadingTeamId]);

  useEffect(() => {
    if (gameState?.auctionState?.isCompleted && currentScreen === 'Auction') {
      showToast('Auction complete — build your XI and start the season!', 'success');
    }
  }, [gameState?.auctionState?.isCompleted]);

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

  const buildValidXIForTeam = (teamId?: string): MatchPlayingXI | null => {
    if (!gameState) return null;
    const team = gameState.teams[teamId || gameState.userTeamId];
    if (!team) return null;
    const xi = buildValidXI(team, gameState.allPlayers);
    return xi;
  };

  /**
   * Run one training block on matchdays between fixtures. Costs club budget
   * (1.2 Cr), applies form/morale/energy effects scaled by the High Performance
   * Center level, and can never be spammed into infinite growth (1 per matchday).
   */
  const runTrainingSession = (focus: 'batting' | 'bowling' | 'recovery'): { applied: number; message: string } => {
    if (!gameState) return { applied: 0, message: 'Game not ready.' };
    const team = gameState.teams[gameState.userTeamId];
    if (!team) return { applied: 0, message: 'No franchise selected.' };
    const prog = gameState.progression;
    const budget = prog?.clubBudgetCr || 8.5;
    const COST_CR = 1.2;
    if (budget < COST_CR) return { applied: 0, message: `Not enough club budget (₹${COST_CR.toFixed(2)} Cr). Upgrade or save up.` };
    if ((team as any).trainedThisMatchday) return { applied: 0, message: 'Your squad already trained today — rest up for matchday.' };

    const allPlayers = JSON.parse(JSON.stringify(gameState.allPlayers)) as Record<string, Player>;
    const squadIds = team.rosterPlayerIds || [];
    const trainLvl = prog?.facilities?.training?.level || 1;
    const boost = 1 + (trainLvl - 1) * 0.2;

    let applied = 0;
    squadIds.forEach(id => {
      const p = allPlayers[id];
      if (!p || p.injuryStatus && p.injuryStatus !== 'Fit') return;
      if (focus === 'batting') {
        if (p.role.includes('Batter') || p.role.includes('All-rounder') || p.role.includes('Wicketkeeper')) {
          p.form = clamp(Number((p.form + 0.06 * boost).toFixed(2)), 1, 5);
          p.morale = clamp(p.morale + 2, 20, 100);
          p.energy = clamp(p.energy - 4, 0, 100);
          applied++;
        }
      } else if (focus === 'bowling') {
        if (p.role.includes('Bowler') || p.role.includes('All-rounder')) {
          p.form = clamp(Number((p.form + 0.06 * boost).toFixed(2)), 1, 5);
          p.morale = clamp(p.morale + 2, 20, 100);
          p.energy = clamp(p.energy - 4, 0, 100);
          applied++;
        }
      } else {
        // Recovery: light session on the whole squad
        p.energy = clamp(p.energy + 8, 0, 100);
        p.fatigue = clamp(p.fatigue - 6, 0, 100);
        p.fitness = clamp(p.fitness + 1.5, 20, 100);
        p.morale = clamp(p.morale + 1, 20, 100);
        applied++;
      }
    });

    const trainedProg = prog ? { ...ensureRewardEcosystem(prog), clubBudgetCr: Number((budget - COST_CR).toFixed(2)) } as FranchiseProgressionState : undefined;
    const updatedProg = awardProgressionXp(trainedProg, 40, 'Training Session');

    setGameState({
      ...gameState,
      allPlayers,
      progression: updatedProg,
      teams: {
        ...gameState.teams,
        [team.id]: { ...team, trainedThisMatchday: true }
      }
    });
    saveCurrentGame();

    const focusLabel = focus === 'batting' ? 'Batting nets' : focus === 'bowling' ? 'Bowling cage' : 'Recovery & mobility';
    return { applied, message: `${focusLabel} complete — ${applied} player(s) sharpened (+40 XP).` };
  };

  const executeImpactSub = (teamId: string, playerOutId: string, playerInId: string) => {
    if (!gameState || !gameState.currentMatchState) return;
    // Managers can only substitute players from their own franchise.
    if (teamId !== gameState.userTeamId) {
      showToast('You can only manage substitutions for your own franchise.', 'warn');
      return;
    }
    const match: MatchState = JSON.parse(JSON.stringify(gameState.currentMatchState));
    const result = applyImpactSubstitution(match, teamId, playerOutId, playerInId, gameState.allPlayers);
    if (!result.ok) {
      showToast(result.message, 'warn');
      return;
    }
    const pIn = gameState.allPlayers[playerInId];
    if (pIn) {
      pIn.stats.matches += 1; // impact player is part of the match XI
    }
    soundFx.playCheer(true);
    showToast(result.message, 'success');
    setGameState({
      ...gameState,
      currentMatchState: match
    });
  };

  // --- XI VALIDATION & AUTO-FILL HELPERS ---
  const buildValidXI = (team: Team, playersMap: Record<string, Player>): MatchPlayingXI => {
    const squad = (team.rosterPlayerIds || []).map(id => playersMap[id]).filter(Boolean);
    const current = team.playingXI;
    // Injured players are excluded from valid XIs — they cannot take the field.
    const fitSquad = squad.filter(p => !p.injuryStatus || p.injuryStatus === 'Fit');
    const candidateIds = (current?.playingXIIds || [])
      .filter(id => squad.some(p => p.id === id))
      .filter(id => !playersMap[id]?.injuryStatus || playersMap[id]?.injuryStatus === 'Fit');
    const wkInCandidate = candidateIds.some(id => playersMap[id]?.role.includes('Wicketkeeper'));
    const osInCandidate = candidateIds.filter(id => playersMap[id]?.isOverseas).length;
    const bowlersCandidate = candidateIds.filter(id => (playersMap[id]?.bowlingRating || 0) > 55).length;

    if (candidateIds.length >= 11 && wkInCandidate && osInCandidate <= 4 && bowlersCandidate >= 4) {
      return {
        ...current!,
        battingOrder: (current!.battingOrder || candidateIds).filter(id => candidateIds.includes(id)),
        playingXIIds: candidateIds,
        impactPlayerUsed: current!.impactPlayerUsed || false
      };
    }

    // Build: keeper first, then best remaining, honor 4-overseas cap, keep 4 bowlers
    const sorted = [...fitSquad].sort((a, b) => b.overall - a.overall);
    const picked: Player[] = [];
    let osCount = 0;
    const wk = sorted.find(p => p.role.includes('Wicketkeeper') && p.injuryStatus === 'Fit');
    if (wk) { picked.push(wk); if (wk.isOverseas) osCount++; }
    const orderFallback = sorted.filter(p => p !== wk && (!p.injuryStatus || p.injuryStatus === 'Fit'));
    orderFallback.forEach(p => {
      if (picked.length >= 11) return;
      if (p.isOverseas) {
        if (osCount < 4) { picked.push(p); osCount++; }
      } else {
        picked.push(p);
      }
    });
    // Force in a 5th bowler only if the XI has fewer than 4 and slot remains
    if (picked.filter(p => (p.bowlingRating || 0) > 55).length < 4) {
      const bowler = sorted.find(b => !picked.includes(b) && (b.bowlingRating || 0) > 55);
      if (bowler && picked.length < 11) { picked.pop(); picked.push(bowler); }
    }
    const ids = picked.slice(0, 11).map(p => p.id);
    const pacers = picked.filter(p => p.bowlingStyle.includes('fast') || p.bowlingStyle.includes('medium')).map(p => p.id);
    const spinners = picked.filter(p => p.bowlingStyle.includes('spin') || p.bowlingStyle.includes('break') || p.bowlingStyle.includes('orthodox')).map(p => p.id);
    const death = picked.filter(p => (p.attributes?.deathBowling || 0) >= 78).map(p => p.id);
    return {
      teamId: team.id,
      playingXIIds: ids,
      battingOrder: ids,
      captainId: picked[0]?.id || '',
      wicketkeeperId: wk?.id || ids[0] || '',
      powerplayBowlerIds: pacers.slice(0, 2),
      deathBowlerIds: (death.length >= 2 ? death : [...death, ...pacers]).slice(0, 2),
      mainSpinBowlerIds: spinners.slice(0, 2),
      impactPlayerId: sorted[11]?.id,
      impactPlayerUsed: false
    };
  };

  const validateUserSquad = (): { valid: boolean; issues: string[] } => {
    if (!gameState) return { valid: false, issues: ['Game not ready'] };
    const team = gameState.teams[gameState.userTeamId];
    const squad = (team?.rosterPlayerIds || []).map(id => gameState.allPlayers[id]).filter(Boolean);
    const xi = team?.playingXI;
    const xiIds = xi?.playingXIIds || [];
    const xiPlayers = xiIds.map(id => gameState.allPlayers[id]).filter(Boolean);
    const issues: string[] = [];

    if (squad.length < 16) issues.push(`Only ${squad.length} squad players — IPL requires a minimum squad of 18 (you can still practice, but strengthen in the auction).`);
    if (xiPlayers.length < 11) issues.push(`Playing XI has only ${xiPlayers.length}/11 players.`);
    if (xiPlayers.length > 11) issues.push('Playing XI has more than 11 players.');
    if (!xiPlayers.some(p => p.role.includes('Wicketkeeper'))) issues.push('No wicketkeeper in the Playing XI.');
    if (xiPlayers.filter(p => p.isOverseas).length > 4) issues.push('More than 4 overseas players in the XI — max is 4 on field.');
    if (xiPlayers.filter(p => (p.bowlingRating || 0) > 55).length < 4) issues.push('Fewer than 4 bowling options in the XI.');
    if (xiPlayers.some(p => p.injuryStatus && p.injuryStatus !== 'Fit')) issues.push(`${xiPlayers.filter(p => p.injuryStatus && p.injuryStatus !== 'Fit').map(p => p.name).join(', ')} is injured and cannot play.`);

    return { valid: issues.length === 0, issues };
  };

  // --- MATCH OPERATIONS ---
  const prepareMatch = (fixtureId: string) => {
    if (!gameState) return;

    // Resolve playoff matchups (Q2 / Final) before kicking off
    let schedule = gameState.leagueSchedule;
    const needsResolve = schedule.some(f => (f.stage === 'Qualifier 2' || f.stage === 'Final') && (!f.teamAId || !f.teamBId));
    if (needsResolve) {
      schedule = resolvePlayoffFixtures(schedule, gameState.teams);
    }

    const fixture = schedule.find(f => f.id === fixtureId) || schedule[gameState.currentFixtureIndex];
    if (!fixture) {
      showToast('Season complete — open the Season Recap.', 'warn');
      setActiveTab('SeasonRecap');
      return;
    }
    if (fixture.isPlayed) {
      showToast('That fixture has already been played.', 'info');
      return;
    }
    if (!fixture.teamAId || !fixture.teamBId) {
      showToast('This fixture is waiting for previous playoff results.', 'info');
      return;
    }

    const teamA = gameState.teams[fixture.teamAId];
    const teamB = gameState.teams[fixture.teamBId];
    if (!teamA || !teamB) return;

    // Squad legality gate for the user's match
    const isUserFixture = fixture.teamAId === gameState.userTeamId || fixture.teamBId === gameState.userTeamId;
    if (isUserFixture) {
      const check = validateUserSquad();
      if (!check.valid) {
        check.issues.slice(0, 3).forEach(i => showToast(i, 'warn'));
        setActiveTab('PlayingXI');
        return;
      }
    }

    // Recovery day: fatigue eases, injuries tick down (fresh player objects)
    // Facility levels (Training Center / Medical Lab / Data Lab) scale recovery.
    const allPlayers = JSON.parse(JSON.stringify(gameState.allPlayers)) as Record<string, Player>;
    const facilities = gameState.progression?.facilities || {};
    refreshPlayersForMatchday(allPlayers, {
      training: (facilities as any).training?.level,
      medical: (facilities as any).medical?.level,
      analytics: (facilities as any).analytics?.level
    });

    // Auto-fill both XIs to legal 11s
    const teamAXI = buildValidXI(teamA, allPlayers);
    const teamBXI = buildValidXI(teamB, allPlayers);
    const teams: Record<string, Team> = JSON.parse(JSON.stringify(gameState.teams));
    teams[teamA.id] = { ...teams[teamA.id], playingXI: teamAXI };
    teams[teamB.id] = { ...teams[teamB.id], playingXI: teamBXI };
    // New matchday: reset today's training lock so a fresh session is available
    teams[gameState.userTeamId] = { ...teams[gameState.userTeamId], trainedThisMatchday: false };

    const matchTypeMap: Record<string, MatchState['matchType']> = {
      'Qualifier 1': 'Qualifier 1',
      'Eliminator': 'Eliminator',
      'Qualifier 2': 'Qualifier 2',
      'Final': 'Final'
    };
    // Home surface: fixture venue belongs to the home team (teamA for league games)
    const homePitch = teams[fixture.teamAId]?.homePitchType;

    const matchState = initMatchState(
      fixture.id,
      gameState.currentSeason,
      teamA.id,
      teamB.id,
      fixture.venue,
      fixture.city,
      teamAXI,
      teamBXI,
      allPlayers,
      matchTypeMap[fixture.stage] || 'League',
      homePitch
    );

    setGameState({
      ...gameState,
      teams,
      allPlayers,
      leagueSchedule: schedule,
      currentMatchState: matchState,
      currentScreen: 'MatchLive'
    });
    setCurrentScreen('MatchLive');
    setActiveTab('MatchLive');
    window.history.pushState({}, '', '/match');
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
    window.history.pushState({}, '', '/match');
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
    // HARD RULE: the manager can only ever control their own franchise.
    // Opposition tactics are managed entirely by the AI engine.
    if (teamId !== gameState.userTeamId) return;
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
    if (!match.isMatchCompleted) {
      showToast('The match has not finished yet.', 'warn');
      return;
    }

    const allPlayers = JSON.parse(JSON.stringify(gameState.allPlayers)) as Record<string, Player>;
    const teams = JSON.parse(JSON.stringify(gameState.teams)) as Record<string, Team>;

    // 1. Apply match results: season stats, ratings, form, fatigue, injuries
    //    The user's Medical Lab level reduces injury risk for their franchise.
    const userMedLevel = gameState.progression?.facilities?.medical?.level || 1;
    teams[gameState.userTeamId] = { ...teams[gameState.userTeamId], medicalLabLevel: userMedLevel };
    const results = applyMatchResults(match, allPlayers, teams, userMedLevel > 1 ? userMedLevel : undefined);
    if (results.momPlayerId && allPlayers[results.momPlayerId]) {
      allPlayers[results.momPlayerId].stats.manOfTheMatchCount += 1;
    }
    match.manOfTheMatchPlayerId = results.momPlayerId;
    match.manOfTheMatchDescription = results.momDescription;

    // 2. Update points table with correct NRR overs (all-out = full quota)
    const overs1 = getInningsOvers(match.innings1);
    const overs2 = getInningsOvers(match.innings2);
    let standings = updateStandingsWithMatch(
      gameState.standings,
      match.teamAId,
      match.teamBId,
      match.winnerTeamId,
      match.innings1.totalRuns,
      overs1,
      match.innings2.totalRuns,
      overs2
    );

    // 3. Mark fixture played + store results
    const battersSummary = (inn: InningsState) => {
      const t = teams[inn.battingTeamId];
      return `${t?.shortName || 'T'} ${inn.totalRuns}/${inn.wickets}`;
    };
    let schedule = gameState.leagueSchedule.map(f => {
      if (f.id === match.id) {
        const tA = teams[match.teamAId];
        const tB = teams[match.teamBId];
        const winner = teams[match.winnerTeamId || ''];
        return {
          ...f,
          isPlayed: true,
          matchResult: {
            winnerTeamId: match.winnerTeamId || '',
            marginText: match.resultMarginText || 'Completed',
            teamAScore: battersSummary(match.innings1),
            teamBScore: battersSummary(match.innings2),
            manOfTheMatchPlayerId: results.momPlayerId
          },
          // legacy top-level fields read by existing views
          winnerTeamId: match.winnerTeamId,
          resultText: match.resultMarginText,
          scoreSummary: `${tA?.shortName || 'T1'} ${match.innings1.totalRuns}/${match.innings1.wickets} vs ${tB?.shortName || 'T2'} ${match.innings2.totalRuns}/${match.innings2.wickets}`,
          winningTeamName: winner?.name
        };
      }
      return f;
    });

    const updatedNews = [...gameState.newsFeed];
    const winnerName = teams[match.winnerTeamId || match.teamAId]?.name || 'Winners';
    const loserTeamId = match.winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
    const loserName = teams[loserTeamId]?.name || 'Opposition';
    updatedNews.unshift({
      id: `news_${Date.now()}`,
      title: `${winnerName} Secure ${match.matchType === 'Final' ? 'the IPL TITLE' : 'a Victory'}!`,
      category: match.matchType === 'Final' ? 'Championship' : 'Match Report',
      summary: `${match.resultMarginText || 'Clinical performance under the floodlights.'} ${results.momDescription}`,
      timestampFormatted: `Match ${match.matchType}`,
      impactRating: match.matchType === 'Final' ? 'Big' : 'Medium',
      teamId: match.winnerTeamId,
      relatedTeamId: loserTeamId
    });

    // 4. Generate playoffs once the league stage completes
    const leagueFixtures = schedule.filter(f => f.stage === 'League');
    const hasPlayoffs = schedule.some(f => f.stage !== 'League');
    const leagueComplete = leagueFixtures.length > 0 && leagueFixtures.every(f => f.isPlayed);
    if (leagueComplete && !hasPlayoffs) {
      schedule = [...schedule, ...generatePlayoffFixtures(standings, gameState.currentSeason, schedule.length + 1)];
      const top4 = standings.slice(0, 4).map(r => teams[r.teamId]?.shortName || r.teamShortName).join(', ');
      updatedNews.unshift({
        id: `news_playoffs_${Date.now()}`,
        title: `PLAYOFFS SET: ${top4} Qualify for the IPL Knockouts!`,
        category: 'Playoffs',
        summary: `The league stage is complete. Qualifier 1 pits the top two, while the Eliminator decides the fourth semi-finalist.`,
        timestampFormatted: `Season ${gameState.currentSeason}`,
        impactRating: 'High',
        teamId: gameState.userTeamId
      });
    }
    if (hasPlayoffs) {
      schedule = resolvePlayoffFixtures(schedule, teams);
    }

    // 5. Season end: compute awards + summary once the Final is done
    let seasonSummary: SeasonSummary | null = null;
    let seasonStage = gameState.seasonStage || 'LeagueStage';
    const finalFixture = schedule.filter(f => f.stage === 'Final').find(f => f.isPlayed);
    if (finalFixture) {
      const championId = (finalFixture as any).winnerTeamId || finalFixture.matchResult?.winnerTeamId || '';
      const runnerUpId = championId === finalFixture.teamAId ? finalFixture.teamBId : finalFixture.teamAId;
      const awards = calculateSeasonAwards(allPlayers, teams, standings, championId, runnerUpId);
      const userFinish = championId === gameState.userTeamId ? 'Champions'
        : runnerUpId === gameState.userTeamId ? 'Runners-Up'
        : schedule.some(f => f.stage !== 'League' && (f.teamAId === gameState.userTeamId || f.teamBId === gameState.userTeamId)) ? 'Playoffs'
        : 'League Stage';
      const userStanding = standings.find(r => r.teamId === gameState.userTeamId);
      seasonStage = 'SeasonEnd';
      seasonSummary = {
        seasonYear: gameState.currentSeason,
        championTeamId: championId,
        runnerUpTeamId: runnerUpId,
        userTeamFinish: userFinish,
        userRecord: userStanding ? `${userStanding.won}W-${userStanding.lost}L-${userStanding.tied}T` : '0-0',
        orangeCap: awards.orangeCap,
        purpleCap: awards.purpleCap,
        mvp: awards.mvp,
        emergingPlayer: awards.emergingPlayer,
        playoffResults: schedule.filter(f => f.stage !== 'League' && f.isPlayed).map(f => ({
          stage: f.stage,
          resultText: `${teams[f.teamAId]?.shortName || 'T1'} v ${teams[f.teamBId]?.shortName || 'T2'} — ${(f as any).resultText || f.matchResult?.marginText || 'Completed'}`
        })),
        awardWinners: [
          { playerId: awards.orangeCap.playerId, playerName: awards.orangeCap.playerName, teamShortName: awards.orangeCap.teamShortName, award: 'Orange Cap' },
          { playerId: awards.purpleCap.playerId, playerName: awards.purpleCap.playerName, teamShortName: awards.purpleCap.teamShortName, award: 'Purple Cap' },
          { playerId: awards.mvp.playerId, playerName: awards.mvp.playerName, teamShortName: awards.mvp.teamShortName, award: 'Season MVP' },
          { playerId: awards.emergingPlayer.playerId, playerName: awards.emergingPlayer.playerName, teamShortName: awards.emergingPlayer.teamShortName, award: 'Emerging Player' }
        ]
      };
      updatedNews.unshift({
        id: `news_champion_${Date.now()}`,
        title: `🏆 ${teams[championId]?.name || 'Champions'} are IPL CHAMPIONS ${gameState.currentSeason}!`,
        category: 'Championship',
        summary: `${awards.orangeCap.playerName} takes the Orange Cap (${awards.orangeCap.runs} runs) while ${awards.purpleCap.playerName} claims the Purple Cap (${awards.purpleCap.wickets} wickets). ${awards.emergingPlayer.playerName} is the Emerging Player.`,
        timestampFormatted: `Season ${gameState.currentSeason} Final`,
        impactRating: 'Big',
        teamId: championId
      });
    }

    // 6. Injury news + progression/fan/board reactions
    results.injuredNews.forEach(n => updatedNews.unshift(n));
    const userTeam = teams[gameState.userTeamId];
    if (userTeam) {
      const userWon = match.winnerTeamId === gameState.userTeamId;
      const isUserMatch = match.teamAId === gameState.userTeamId || match.teamBId === gameState.userTeamId;
      if (isUserMatch) {
        userTeam.fanSentiment = Math.max(10, Math.min(100, Number((userTeam.fanSentiment + (userWon ? 4 : -2)).toFixed(1))));
        userTeam.boardConfidence = Math.max(10, Math.min(100, Number((userTeam.boardConfidence + (userWon ? 3 : -2)).toFixed(1))));
        userTeam.mediaReputation = Math.max(10, Math.min(100, Number((userTeam.mediaReputation + (userWon ? 2 : -1)).toFixed(1))));
      }
      // Rivalry tracking
      const rivalIds = gameState.rivalTeamIds || [];
      const oppId = match.teamAId === gameState.userTeamId ? match.teamBId : match.teamAId;
      if (isUserMatch && rivalIds.includes(oppId) && gameState.progression) {
        const progress = JSON.parse(JSON.stringify(gameState.progression));
        const rival = progress.rivalries[oppId] || {
          opponentTeamId: oppId,
          rivalryName: `${userTeam.shortName} vs ${teams[oppId]?.shortName || 'Rivals'}`,
          intensity: 'Fierce',
          matchesPlayed: 0,
          userWins: 0,
          opponentWins: 0
        };
        rival.matchesPlayed += 1;
        if (userWon) rival.userWins += 1; else rival.opponentWins += 1;
        rival.lastEncounterResult = `${userWon ? userTeam.shortName : teams[oppId]?.shortName || 'Rival'} won`;
        progress.rivalries[oppId] = rival;
        gameState.progression = progress;
      }
    }
    if (gameState.progression) {
      const userWon = match.winnerTeamId === gameState.userTeamId;
      const isUserMatch = match.teamAId === gameState.userTeamId || match.teamBId === gameState.userTeamId;
      const xpGain = (isUserMatch ? (userWon ? 30 : 12) : 4) + (match.matchType === 'Final' ? 30 : match.matchType !== 'League' ? 15 : 0);
      let updatedProgression = awardProgressionXp(gameState.progression, xpGain, isUserMatch ? (userWon ? 'Match Victory' : 'Match Participation') : 'League Result');
      if (updatedProgression && isUserMatch) {
        if (userWon) {
          updatedProgression = progressObjectiveById(updatedProgression, 'obj_daily_1', 1);
          updatedProgression = progressObjectiveById(updatedProgression, 'obj_weekly_1', 1);
          updatedProgression = completeAchievement(updatedProgression, 'ach_first_win', gameState.currentSeason);
        }
        const userInnings = [match.innings1, match.innings2].filter(innings => innings.battingTeamId === gameState.userTeamId);
        const userSixes = userInnings.reduce((sum, innings) => sum + Object.values(innings.battingScorecard || {}).reduce((sixSum: number, card: any) => sixSum + (card.sixes || 0), 0), 0);
        if (userSixes > 0) updatedProgression = progressObjectiveById(updatedProgression, 'obj_daily_2', userSixes);
        if (match.matchType === 'Final' && userWon) {
          updatedProgression = progressObjectiveById(updatedProgression, 'obj_season_2', 1);
          updatedProgression = completeAchievement(updatedProgression, 'ach_trophy', gameState.currentSeason);
        }
      }
      gameState.progression = updatedProgression;
    }

    // 7. Press conference (user matches only) or straight to hub
    const isUserMatch = match.teamAId === gameState.userTeamId || match.teamBId === gameState.userTeamId;
    let pressState = gameState.pressConferenceState;
    let targetScreen: GameScreen = skipToDashboard ? 'Dashboard' : (isUserMatch ? 'PostMatchPresentation' : 'Dashboard');
    if (isUserMatch && !skipToDashboard) {
      const isUserWinner = match.winnerTeamId === gameState.userTeamId;
      const oppTeam = teams[match.teamAId === gameState.userTeamId ? match.teamBId : match.teamAId];
      pressState = {
        questions: [
          {
            id: `press_q1_${Date.now()}`,
            journalistName: 'Harsha Bhogle',
            mediaOutlet: 'Cricbuzz Live',
            questionText: `${isUserWinner ? `Stupendous win for ${userTeam?.name}!` : `A hard-fought battle against ${oppTeam?.name || 'the opponents'}.`} What was the decisive factor tonight?`,
            options: [
              { text: 'Our tactical plan was executed with total clarity — the right matchups won us the key moments.', ownerTrustChange: 5, playerMoraleChange: 8 },
              { text: 'Credit to the squad for their intensity; we stayed calm when the pressure index climbed.', ownerTrustChange: 4, playerMoraleChange: 9 },
              { text: 'Fine margins decide T20s. We will review the data and come back sharper.', ownerTrustChange: 6, playerMoraleChange: 5 }
            ]
          },
          {
            id: `press_q2_${Date.now()}`,
            journalistName: 'Sanjay Manjrekar',
            mediaOutlet: 'ESPNCricinfo',
            questionText: 'How do you keep this squad hungry for the rest of the season?',
            options: [
              { text: 'Fearless cricket is our DNA — we empower everyone to express themselves.', ownerTrustChange: 4, playerMoraleChange: 7 },
              { text: 'Deep preparation and trust in the full 18+ group. Everyone is ready when called.', ownerTrustChange: 7, playerMoraleChange: 6 }
            ]
          }
        ],
        currentQuestionIndex: 0,
        matchId: match.id
      };
    }

    const nextIndex = schedule.findIndex(f => !f.isPlayed);
    const newState: GameSave = {
      ...gameState,
      teams,
      allPlayers,
      standings,
      leagueSchedule: schedule,
      currentFixtureIndex: nextIndex === -1 ? schedule.length : nextIndex,
      currentMatchState: undefined,
      currentScreen: targetScreen,
      seasonStage,
      seasonSummary,
      pressConferenceState: pressState,
      newsFeed: updatedNews,
      progression: gameState.progression
    };

    setGameState(newState);
    setCurrentScreen(targetScreen);
    if (targetScreen === 'Dashboard') setActiveTab('Dashboard');
    if (match.matchType === 'Final') {
      showToast(finalFixture ? '🏆 Season complete! Open the Season Recap.' : 'Match complete.', 'success');
    } else if (isUserMatch) {
      showToast(match.winnerTeamId === gameState.userTeamId ? 'Victory! Match applied to the table.' : 'Defeat. Match applied to the table.', match.winnerTeamId === gameState.userTeamId ? 'success' : 'warn');
    } else {
      showToast('Result simulated. Table updated.', 'info');
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
      userTeam.boardConfidence = Math.min(100, Math.max(10, userTeam.boardConfidence + (opt.ownerTrustChange || 0)));
      userTeam.fanSentiment = Math.min(100, Math.max(10, userTeam.fanSentiment + (opt.playerMoraleChange > 0 ? 3 : -1)));
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

  const beginOffSeason = () => {
    if (!gameState) return;
    const newState: GameSave = {
      ...gameState,
      seasonStage: 'OffSeason',
      currentScreen: 'Dashboard'
    };
    setGameState(newState);
    setCurrentScreen('Dashboard');
    setActiveTab('OffSeason');
    window.history.pushState({}, '', '/offseason');
    showToast('Off-season: choose retentions & your home pitch, then start the next auction.', 'info');
    saveCurrentGame();
  };

  const openSeasonRecap = () => {
    if (!gameState) return;
    setCurrentScreen('Dashboard');
    setActiveTab('SeasonRecap');
    window.history.pushState({}, '', '/recap');
  };

  const setHomePitchType = (pitch: string) => {
    if (!gameState) return;
    const teams = JSON.parse(JSON.stringify(gameState.teams)) as Record<string, Team>;
    if (teams[gameState.userTeamId]) teams[gameState.userTeamId].homePitchType = pitch;
    setGameState({ ...gameState, teams });
    saveCurrentGame();
    showToast(`Home surface set: ${pitch}.`, 'success');
  };

  const advanceToNextSeason = (releasePlayerIds: string[] = []) => {
    if (!gameState) return;
    const nextSeasonYear = gameState.currentSeason + 1;
    const releaseSet = new Set(releasePlayerIds);
    const userTeam = gameState.teams[gameState.userTeamId];

    // 1. Age/develop every player, reset season stats
    const updatedPlayers: Record<string, Player> = {};
    const retiredPool: Player[] = [];
    (Object.values(gameState.allPlayers) as Player[]).forEach(p => {
      const progressed = progressPlayerToNextSeason(p);
      if (progressed.retired) {
        retiredPool.push({ ...progressed, currentTeamId: null, retired: true });
        return;
      }
      updatedPlayers[progressed.id] = progressed;
    });

    // 2. Release selections go back into the auction pool
    const teams: Record<string, Team> = JSON.parse(JSON.stringify(gameState.teams));
    const releasedIds: string[] = [];
    Object.values(teams).forEach(t => {
      t.rosterPlayerIds = t.rosterPlayerIds.filter(id => {
        if (userTeam && t.id === gameState.userTeamId && releaseSet.has(id)) {
          releasedIds.push(id);
          const p = updatedPlayers[id];
          if (p) {
            p.currentTeamId = null;
            p.salaryCr = 0;
            updatedPlayers[id] = p;
          }
          return false;
        }
        return updatedPlayers[id] !== undefined;
      });
    });
    // 3. Season history
    const summary = gameState.seasonSummary;
    const historyRecord = summary ? {
      seasonYear: gameState.currentSeason,
      championTeamId: summary.championTeamId,
      runnerUpTeamId: summary.runnerUpTeamId,
      userTeamFinish: summary.userTeamFinish,
      orangeCap: `${summary.orangeCap.playerName} (${summary.orangeCap.runs})`,
      purpleCap: `${summary.purpleCap.playerName} (${summary.purpleCap.wickets})`,
      mvp: summary.mvp.playerName,
      userRecord: summary.userRecord
    } : null;
    const seasonHistory = historyRecord ? [...(gameState.seasonHistory || []), historyRecord] : (gameState.seasonHistory || []);

    // 4. Purse: 120 Cr minus retained salaries (real IPL logic), released players free
    Object.values(teams).forEach(t => {
      const spent = t.rosterPlayerIds.reduce((sum, id) => sum + (updatedPlayers[id]?.salaryCr || 0), 0);
      t.purseCr = Number(Math.max(5, 120 - spent).toFixed(2));
      t.playingXI = undefined;
    });

    // 5. New uncapped Indian prospects enter the auction pool
    const auctionPool: Player[] = [];
    releasedIds.forEach(id => { if (updatedPlayers[id]) auctionPool.push(updatedPlayers[id]); });
    const prospects = [generateYouthProspect(1), generateYouthProspect(2), generateYouthProspect(3), generateYouthProspect(4)];
    prospects.slice(0, 3).forEach((prospect, i) => {
      prospect.id = `youth_s${nextSeasonYear}_${i}_${Date.now()}`;
      prospect.basePriceCr = 0.30;
      prospect.salaryCr = 0;
      prospect.injuryProneness = 12;
      prospect.energy = 100;
      prospect.formerTeamIds = [];
      updatedPlayers[prospect.id] = prospect;
      auctionPool.push(prospect);
    });

    const newStandings = initStandings(teams);
    const newFixtures = generateLeagueSchedule(teams);
    const newAuction = initAuctionState(auctionPool);

    const newState: GameSave = {
      ...gameState,
      saveVersion: SAVE_VERSION,
      currentSeason: nextSeasonYear,
      seasonStage: 'Auction',
      seasonSummary: null,
      allPlayers: updatedPlayers,
      teams,
      standings: newStandings,
      leagueSchedule: newFixtures,
      currentFixtureIndex: 0,
      youthAcademyPool: prospects.slice(3),
      retiredPlayers: [...(gameState.retiredPlayers || []), ...retiredPool],
      seasonHistory,
      auctionState: newAuction,
      currentScreen: 'Auction',
      pressConferenceState: null
    };

    setGameState(newState);
    setCurrentScreen('Auction');
    setActiveTab('AuctionLive');
    window.history.pushState({}, '', '/auction');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...newState, saveVersion: SAVE_VERSION, updatedAt: Date.now() }));
    showToast(`Season ${nextSeasonYear} Mega Auction begins — ₹${teams[gameState.userTeamId]?.purseCr.toFixed(2)} Cr purse.`, 'success');
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
      userTeam.boardConfidence = Math.min(100, Math.max(10, userTeam.boardConfidence + option.ownerTrustChange));
      userTeam.fanSentiment = Math.min(100, Math.max(10, userTeam.fanSentiment + (option.moraleChange > 0 ? 3 : -2)));
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
        toast,
        showToast,
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
        togglePauseAuction,
        setThemeMode,
        signInWithGoogle,
        signOutGoogle,
        saveToCloudSync,
        updateUserPlayingXI,
        buildValidXIForTeam,
        runTrainingSession,
        executeImpactSub,
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
        beginOffSeason,
        openSeasonRecap,
        setHomePitchType,
        validateUserSquad,
        submitPressAnswer,
        answerPressQuestion,
        upgradeScoutLevel,
        addToWatchlist,
        removeFromWatchlist,
        updateWatchlistNote,
        toggleAuctionTarget,
        completeScoutMission,
        markAlertRead,
        currentWalkoutPlayer,
        triggerWalkout,
        exitWalkout
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
