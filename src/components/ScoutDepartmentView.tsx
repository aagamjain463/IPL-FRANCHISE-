import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/cricket';
import { Team } from '../types/team';
import { 
  ScoutFilterState, 
  ScoutRoleCategory, 
  NationalityFilter, 
  AgeFilter, 
  ValueFilter, 
  FormFilter, 
  PotentialFilter, 
  StatusFilter,
  PriorityLevel
} from '../types/scout';
import { 
  analyzeSquadNeeds, 
  evaluateScoutedPlayer, 
  getTodayDiscoveries, 
  getHiddenGems, 
  getAuctionTargets, 
  filterRealPlayers, 
  parseNaturalLanguageQuery,
  generateOppositionReport,
  generatePreMatchReport,
  compareRealPlayers,
  INITIAL_SCOUT_MISSIONS,
  validateRealPlayer
} from '../engine/scoutEngine';
import { 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Users, 
  TrendingUp, 
  Target, 
  Compass, 
  SlidersHorizontal, 
  Star, 
  Bookmark, 
  AlertCircle, 
  Flame, 
  ChevronRight, 
  Zap, 
  Scale, 
  Eye, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  DollarSign, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  Info,
  Layers,
  Activity,
  UserCheck
} from 'lucide-react';

type ScoutingSubTab = 'hub' | 'database' | 'gems' | 'auction' | 'opposition' | 'compare' | 'missions' | 'watchlist';

export const ScoutDepartmentView: React.FC = () => {
  const { 
    gameState, 
    setSelectedPlayerForModal, 
    upgradeScoutLevel, 
    addToWatchlist, 
    removeFromWatchlist, 
    updateWatchlistNote, 
    toggleAuctionTarget, 
    completeScoutMission, 
    markAlertRead,
    setActiveTab
  } = useGame();

  const [activeSubTab, setActiveSubTab] = useState<ScoutingSubTab>('hub');
  const [nlQueryInput, setNlQueryInput] = useState<string>('');
  const [isNlLoading, setIsNlLoading] = useState<boolean>(false);
  const [nlSummaryMessage, setNlSummaryMessage] = useState<string | null>(null);

  // Filter States for Database View
  const [filters, setFilters] = useState<ScoutFilterState>({
    role: 'ALL',
    nationality: 'ALL',
    age: 'ALL',
    value: 'ALL',
    form: 'ALL',
    potential: 'ALL',
    status: 'ALL',
    searchQuery: ''
  });

  // Selected Player for Deep Scouting Drawer
  const [scoutedPlayerDetail, setScoutedPlayerDetail] = useState<Player | null>(null);
  
  // Player Comparison IDs
  const [comparisonIds, setComparisonIds] = useState<string[]>(['mi_bumrah', 'auc_arshdeep']);
  
  // Selected Opposition Team for Scouting
  const [selectedOpponentTeamId, setSelectedOpponentTeamId] = useState<string>('csk');
  
  // Upgrade Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [upgradeFeedback, setUpgradeFeedback] = useState<string | null>(null);

  // Watchlist Note Editing
  const [editingNotePlayerId, setEditingNotePlayerId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');
  const [tempPriority, setTempPriority] = useState<PriorityLevel>('Medium');

  if (!gameState) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-950 min-h-screen">
        Loading Scouting Department...
      </div>
    );
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const dept = gameState.scoutingDepartment || {
    level: 3,
    scoutingBudgetSpentCr: 1.5,
    watchlist: [],
    auctionTargetIds: [],
    unlockedReportIds: [],
    completedMissionIds: [],
    alerts: []
  };

  const allPlayersCount = Object.keys(gameState.allPlayers || {}).length;
  const squadNeeds = useMemo(() => analyzeSquadNeeds(userTeam, gameState.allPlayers), [userTeam, gameState.allPlayers]);
  const discoveries = useMemo(() => getTodayDiscoveries(gameState, 4), [gameState]);
  const hiddenGems = useMemo(() => getHiddenGems(gameState, 6), [gameState]);
  const auctionTargets = useMemo(() => getAuctionTargets(gameState, 8), [gameState]);

  // Filtered players list
  const filteredPlayers = useMemo(() => {
    return filterRealPlayers(
      gameState.allPlayers,
      filters,
      userTeam,
      dept.watchlist || [],
      dept.auctionTargetIds || []
    );
  }, [gameState.allPlayers, filters, userTeam, dept.watchlist, dept.auctionTargetIds]);

  // Opposition Scout Report
  const oppositionReport = useMemo(() => {
    try {
      return generateOppositionReport(selectedOpponentTeamId, gameState);
    } catch {
      return null;
    }
  }, [selectedOpponentTeamId, gameState]);

  // Pre-Match Intel
  const preMatchIntel = useMemo(() => generatePreMatchReport(gameState), [gameState]);

  // Player Comparison Analysis
  const comparisonAnalysis = useMemo(() => {
    if (comparisonIds.length < 2) return null;
    try {
      return compareRealPlayers(comparisonIds, gameState);
    } catch {
      return null;
    }
  }, [comparisonIds, gameState]);

  // Natural Language Search Handler
  const handleNaturalLanguageSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsNlLoading(true);
    setNlSummaryMessage(null);

    // Local deterministic parser always extracts reliable filters immediately
    const parsedFilters = parseNaturalLanguageQuery(queryText);
    setFilters(prev => ({
      ...prev,
      ...parsedFilters,
      searchQuery: ''
    }));

    setActiveSubTab('database');

    // Also call server AI endpoint if available for conversational briefing
    try {
      const res = await fetch('/api/ai/scout-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });
      if (res.ok) {
        const data = await res.json();
        setNlSummaryMessage(data.scoutSummary || `Scouting query applied: "${queryText}"`);
      } else {
        setNlSummaryMessage(`Scouting filters activated for: "${queryText}"`);
      }
    } catch {
      setNlSummaryMessage(`Scouting filters activated for: "${queryText}"`);
    } finally {
      setIsNlLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      role: 'ALL',
      nationality: 'ALL',
      age: 'ALL',
      value: 'ALL',
      form: 'ALL',
      potential: 'ALL',
      status: 'ALL',
      searchQuery: ''
    });
    setNlQueryInput('');
    setNlSummaryMessage(null);
  };

  const handleUpgradeClick = () => {
    const res = upgradeScoutLevel();
    setUpgradeFeedback(res.message);
    setTimeout(() => setUpgradeFeedback(null), 3500);
  };

  const handleAddComparison = (playerId: string) => {
    if (comparisonIds.includes(playerId)) return;
    if (comparisonIds.length >= 4) {
      setComparisonIds([comparisonIds[1], comparisonIds[2], comparisonIds[3], playerId]);
    } else {
      setComparisonIds([...comparisonIds, playerId]);
    }
    setActiveSubTab('compare');
  };

  const handleRemoveComparison = (playerId: string) => {
    if (comparisonIds.length <= 2) return;
    setComparisonIds(comparisonIds.filter(id => id !== playerId));
  };

  const openNoteEditor = (playerId: string, currentNote: string = '', currentPriority: PriorityLevel = 'Medium') => {
    setEditingNotePlayerId(playerId);
    setTempNoteText(currentNote);
    setTempPriority(currentPriority);
  };

  const saveNoteEditor = () => {
    if (editingNotePlayerId) {
      updateWatchlistNote(editingNotePlayerId, tempNoteText, tempPriority);
      setEditingNotePlayerId(null);
    }
  };

  return (
    <div id="scouting-department-container" className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      
      {/* Top Professional Header Bar */}
      <div id="scout-header" className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
                  IPL Scouting Department
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL PLAYERS ONLY
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Authoritative talent discovery, opposition analysis & algorithmic valuation for <span className="text-amber-400 font-semibold">{userTeam?.name}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics & Scout Level Badge */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Level Badge */}
            <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/80 rounded-xl px-3 py-2">
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Network Level</div>
                <div className="text-sm font-black text-amber-400 flex items-center gap-1">
                  <span>Level {dept.level} / 5</span>
                  <div className="flex gap-0.5 ml-1">
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <span key={lvl} className={`w-1.5 h-3 rounded-sm ${lvl <= dept.level ? 'bg-amber-400' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <button
                id="btn-upgrade-scout"
                onClick={() => setShowUpgradeModal(true)}
                className="ml-2 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Upgrade
              </button>
            </div>

            {/* Quick Metrics Counter */}
            <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
              <div>
                <div className="text-slate-400">Database</div>
                <div className="font-bold text-white text-sm">{allPlayersCount} Real Stars</div>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <div className="text-slate-400">Watchlist</div>
                <div className="font-bold text-amber-400 text-sm">{(dept.watchlist || []).length}</div>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <div className="text-slate-400">Targets</div>
                <div className="font-bold text-emerald-400 text-sm">{(dept.auctionTargetIds || []).length}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Natural Language Prompt Search Bar */}
        <div className="max-w-7xl mx-auto mt-5">
          <div className="relative flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                id="input-nl-scout"
                type="text"
                value={nlQueryInput}
                onChange={e => setNlQueryInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNaturalLanguageSearch(nlQueryInput)}
                placeholder="Ask scouting network: e.g., 'Indian death bowler under ₹8 Cr', 'Backup wicketkeeper', 'Young left-handed opener'..."
                className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
              <button
                id="btn-scout-search"
                onClick={() => handleNaturalLanguageSearch(nlQueryInput)}
                disabled={isNlLoading || !nlQueryInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all flex items-center gap-1"
              >
                {isNlLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Scout
              </button>
            </div>

            {/* Presets Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                'Indian death bowler under ₹8 Cr',
                'Young left-handed opener',
                'Backup wicketkeeper',
                'Finisher under pressure',
                'Overseas mystery spinner',
                'Under-valued gems under ₹2 Cr'
              ].map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    setNlQueryInput(preset);
                    handleNaturalLanguageSearch(preset);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-all hover:text-amber-400 hover:border-amber-500/40"
                >
                  {preset}
                </button>
              ))}
              {(filters.role !== 'ALL' || filters.nationality !== 'ALL' || filters.age !== 'ALL' || filters.value !== 'ALL' || nlSummaryMessage) && (
                <button
                  onClick={handleClearFilters}
                  className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-[11px] text-red-300 transition-all flex items-center gap-1"
                >
                  <XCircle className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* AI Intelligence Briefing Bar if returned */}
          {nlSummaryMessage && (
            <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{nlSummaryMessage}</span>
            </div>
          )}
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto mt-5 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/60 pt-3">
          {[
            { id: 'hub', label: 'Department Hub', icon: <Award className="w-4 h-4" /> },
            { id: 'database', label: 'Real Player Database', icon: <Users className="w-4 h-4" /> },
            { id: 'gems', label: 'Hidden Gems', icon: <Zap className="w-4 h-4 text-emerald-400" /> },
            { id: 'auction', label: 'Auction Targets', icon: <Target className="w-4 h-4 text-amber-400" /> },
            { id: 'opposition', label: 'Opposition Intel', icon: <Eye className="w-4 h-4 text-sky-400" /> },
            { id: 'compare', label: 'Comparison Tool', icon: <Scale className="w-4 h-4 text-purple-400" /> },
            { id: 'missions', label: 'Scout Missions', icon: <ShieldCheck className="w-4 h-4 text-rose-400" /> },
            { id: 'watchlist', label: `Watchlist (${(dept.watchlist || []).length})`, icon: <Star className="w-4 h-4 text-yellow-400" /> }
          ].map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`subtab-${tab.id}`}
                onClick={() => setActiveSubTab(tab.id as ScoutingSubTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>

      {/* Main Content Area Based on Sub-Tab */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* 1. DEPARTMENT HUB */}
        {activeSubTab === 'hub' && (
          <div className="space-y-8">
            
            {/* Squad Needs Priority Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wide">
                    Live Squad Needs Analysis
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Algorithmic evaluation of {userTeam?.name} depth & balance
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {squadNeeds.map(need => {
                  const isCrit = need.priority === 'CRITICAL NEED';
                  const isHigh = need.priority === 'HIGH PRIORITY';
                  return (
                    <div 
                      key={need.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        isCrit 
                          ? 'bg-red-950/20 border-red-800/60 shadow-lg shadow-red-950/20' 
                          : isHigh 
                            ? 'bg-amber-950/20 border-amber-800/50' 
                            : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isCrit 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : isHigh 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {need.priority}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">{need.targetRole}</span>
                      </div>
                      <h3 className="font-bold text-white text-sm mb-1">{need.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{need.reason}</p>
                      <div className="flex flex-wrap gap-1">
                        {need.recommendedAttributes.map(attr => (
                          <span key={attr} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Today's Real Discoveries */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wide">
                    Today&apos;s Real Player Discoveries
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveSubTab('database')} 
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  View All Database <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {discoveries.map(disc => {
                  const p = disc.player;
                  const isWatch = (dept.watchlist || []).some(w => w.playerId === p.id);
                  const isTarget = (dept.auctionTargetIds || []).includes(p.id);

                  return (
                    <div 
                      key={p.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all flex flex-col justify-between group shadow-lg shadow-black/20"
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {p.role}
                          </span>
                          <span className="text-xs font-black text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            {disc.fitScore}% Fit
                          </span>
                        </div>

                        {/* Player Basic Info */}
                        <div className="flex items-center gap-3 my-2">
                          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-lg text-amber-400">
                            {p.name[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base leading-snug group-hover:text-amber-300 transition-colors">
                              {p.name}
                            </h3>
                            <div className="text-xs text-slate-400">
                              {p.nationality} • {p.age} yrs • OVR <span className="font-bold text-white">{p.overall}</span>
                            </div>
                          </div>
                        </div>

                        {/* Scout Why This Player */}
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 my-2.5">
                          <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Scout Assessment
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                            {disc.whyThisPlayer}
                          </p>
                        </div>

                        {/* Key Stats Bar */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300 my-2">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Est. Valuation</span>
                            <span className="font-bold text-white">₹{disc.estimatedValueRange.minCr} - ₹{disc.estimatedValueRange.maxCr} Cr</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Confidence</span>
                            <span className="font-bold text-emerald-400">{disc.scoutConfidencePercent}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setScoutedPlayerDetail(p)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Full Report
                        </button>
                        <button
                          onClick={() => isWatch ? removeFromWatchlist(p.id) : addToWatchlist(p.id, 'High')}
                          title={isWatch ? "Remove from Watchlist" : "Add to Watchlist"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isWatch 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' 
                              : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isWatch ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => toggleAuctionTarget(p.id)}
                          title={isTarget ? "Remove from Auction Targets" : "Set as Priority Auction Target"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isTarget 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                          }`}
                        >
                          <Target className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Teasers: Hidden Gems & Auction Targets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Hidden Gems Teaser */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      Real Hidden Gems & High-Value Picks
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveSubTab('gems')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="space-y-2.5">
                  {hiddenGems.slice(0, 3).map(gem => (
                    <div 
                      key={gem.player.id}
                      onClick={() => setScoutedPlayerDetail(gem.player)}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center font-bold text-emerald-400 text-sm">
                          {gem.player.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{gem.player.name}</div>
                          <div className="text-[11px] text-slate-400">{gem.player.role} • {gem.player.age} yrs • Potential <span className="font-bold text-emerald-400">{gem.player.potential}</span></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white">₹{gem.player.basePriceCr} Cr</div>
                        <span className="text-[10px] text-emerald-400 font-semibold">{gem.valueScore} Value Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opposition Intel Teaser */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-sky-400" />
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      Next Match Opposition Scouting
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActiveSubTab('opposition')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-bold"
                  >
                    Scout Teams &rarr;
                  </button>
                </div>

                {preMatchIntel ? (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-slate-200">Upcoming Fixture Opponent</span>
                      <span className="font-black text-amber-400 uppercase">{preMatchIntel.opponentTeamName}</span>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Key Threat Player</div>
                      <div className="font-bold text-white">{preMatchIntel.keyThreatPlayer.player.name}</div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{preMatchIntel.keyThreatPlayer.tacticalReason}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Vulnerability to Exploit</div>
                      <div className="font-bold text-white">{preMatchIntel.keyWeaknessPlayer.player.name}</div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{preMatchIntel.keyWeaknessPlayer.tacticalReason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 text-slate-400 text-xs text-center">
                    No active match fixture scheduled. Use Opposition Intel tab to scout all 10 IPL franchises.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* 2. REAL PLAYER DATABASE VIEW */}
        {activeSubTab === 'database' && (
          <div className="space-y-6">
            
            {/* Filter Matrix Controls */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm uppercase">Smart Scouting Filters</h3>
                </div>
                <div className="text-xs text-slate-400">
                  Showing <span className="font-bold text-white">{filteredPlayers.length}</span> of {allPlayersCount} verified real players
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 text-xs">
                
                {/* Role */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Role</label>
                  <select
                    value={filters.role}
                    onChange={e => setFilters({ ...filters, role: e.target.value as ScoutRoleCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="Opener">Opener</option>
                    <option value="Top-order Batter">Top-order</option>
                    <option value="Middle-order Batter">Middle-order</option>
                    <option value="Finisher">Finisher</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                    <option value="All-rounder">All-rounder</option>
                    <option value="Fast Bowler">Fast Bowler</option>
                    <option value="Death Bowler">Death Specialist</option>
                    <option value="Powerplay Bowler">Powerplay Bowler</option>
                    <option value="Spinner">Spinner</option>
                    <option value="Leg-spinner">Leg-spinner</option>
                    <option value="Left-arm Spinner">Left-arm Spinner</option>
                  </select>
                </div>

                {/* Nationality */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Nationality</label>
                  <select
                    value={filters.nationality}
                    onChange={e => setFilters({ ...filters, nationality: e.target.value as NationalityFilter })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Nationalities</option>
                    <option value="Indian">Indian Only</option>
                    <option value="Overseas">Overseas Only</option>
                  </select>
                </div>

                {/* Age Group */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Age</label>
                  <select
                    value={filters.age}
                    onChange={e => setFilters({ ...filters, age: e.target.value as AgeFilter })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Ages</option>
                    <option value="U21">U21 (Teenagers)</option>
                    <option value="21-24">21 - 24 Years</option>
                    <option value="25-28">25 - 28 Years (Prime)</option>
                    <option value="29-32">29 - 32 Years</option>
                    <option value="33+">33+ Years (Veterans)</option>
                  </select>
                </div>

                {/* Value Band */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Base Price / Value</label>
                  <select
                    value={filters.value}
                    onChange={e => setFilters({ ...filters, value: e.target.value as ValueFilter })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Valuations</option>
                    <option value="Under 2 Cr">Under ₹2 Cr (Budget)</option>
                    <option value="2-5 Cr">₹2 - ₹5 Cr</option>
                    <option value="5-10 Cr">₹5 - ₹10 Cr</option>
                    <option value="10-15 Cr">₹10 - ₹15 Cr</option>
                    <option value="15 Cr+">₹15 Cr+ (Marquee)</option>
                  </select>
                </div>

                {/* Form Level */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Form</label>
                  <select
                    value={filters.form}
                    onChange={e => setFilters({ ...filters, form: e.target.value as FormFilter })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Forms</option>
                    <option value="Excellent">🔥 Excellent (Form 5)</option>
                    <option value="Good">Good (Form 4)</option>
                    <option value="Average">Average (Form 3)</option>
                    <option value="Poor">Poor (Form 1-2)</option>
                  </select>
                </div>

                {/* Potential */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Potential</label>
                  <select
                    value={filters.potential}
                    onChange={e => setFilters({ ...filters, potential: e.target.value as PotentialFilter })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Potentials</option>
                    <option value="Elite">Elite (92+ Ceiling)</option>
                    <option value="High">High (85 - 91)</option>
                    <option value="Medium">Medium (75 - 84)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={e => setFilters({ ...filters, status: e.target.value as StatusFilter })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Available">Auction Pool (Unassigned)</option>
                    <option value="Auction Target">Priority Auction Target</option>
                    <option value="Current IPL Player">Signed IPL Players</option>
                    <option value="Other Franchise">Other Franchises</option>
                    <option value="My Squad">My Squad ({userTeam?.shortName})</option>
                    <option value="Watchlist">My Watchlist</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Players Grid */}
            {filteredPlayers.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
                <AlertCircle className="w-10 h-10 text-amber-400/60 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">No real players match this filter</h3>
                <p className="text-xs text-slate-400 mt-1">Try broadening your criteria or reset the search filters.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-3 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlayers.map(p => {
                  const evalAnalysis = evaluateScoutedPlayer(p, userTeam, gameState.allPlayers, dept.level, dept.watchlist || [], dept.auctionTargetIds || []);
                  const isWatch = (dept.watchlist || []).some(w => w.playerId === p.id);
                  const isTarget = (dept.auctionTargetIds || []).includes(p.id);

                  return (
                    <div 
                      key={p.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col justify-between group shadow-sm"
                    >
                      <div>
                        {/* Header Bar */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {p.role}
                            </span>
                            {p.currentTeamId ? (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                                {gameState.teams[p.currentTeamId]?.shortName || p.currentTeamId}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                Auction Pool
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-black text-amber-400">
                            {evalAnalysis.fitScore}% Fit
                          </span>
                        </div>

                        {/* Name & OVR */}
                        <div className="flex items-center justify-between my-2">
                          <div>
                            <h3 className="font-bold text-white text-base group-hover:text-amber-300 transition-colors">
                              {p.name}
                            </h3>
                            <div className="text-xs text-slate-400">
                              {p.nationality} • {p.age} yrs • {p.battingStyle}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-white">{p.overall}</div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">OVR</span>
                          </div>
                        </div>

                        {/* Attribute Badges */}
                        <div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-slate-950/70 p-2 rounded-lg border border-slate-800/70 my-2">
                          <div>
                            <span className="text-slate-500 block">BAT</span>
                            <span className="font-bold text-white">{p.battingRating}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">BOWL</span>
                            <span className="font-bold text-white">{p.bowlingRating}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">POTENTIAL</span>
                            <span className="font-bold text-emerald-400">{evalAnalysis.potentialRange.min}-{evalAnalysis.potentialRange.max}</span>
                          </div>
                        </div>

                        {/* Key Strength Line */}
                        <div className="text-xs text-slate-300 line-clamp-1 my-1">
                          <span className="text-amber-400 font-semibold">Strength:</span> {evalAnalysis.strengths[0]}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setScoutedPlayerDetail(p)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Scout Report
                        </button>
                        <button
                          onClick={() => handleAddComparison(p.id)}
                          title="Compare with other players"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-950 text-slate-400 hover:text-purple-300 border border-slate-700 transition-all"
                        >
                          <Scale className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => isWatch ? removeFromWatchlist(p.id) : addToWatchlist(p.id, 'Medium')}
                          title={isWatch ? "Remove from Watchlist" : "Add to Watchlist"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isWatch 
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' 
                              : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${isWatch ? 'fill-yellow-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => toggleAuctionTarget(p.id)}
                          title={isTarget ? "Remove from Target List" : "Add to Target List"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isTarget 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                          }`}
                        >
                          <Target className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* 3. HIDDEN GEMS & UNDERVALUED PROSPECTS */}
        {activeSubTab === 'gems' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-wide">
                  Real Hidden Gems & High-Value Prospects
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Verified real cricketers with base valuations under ₹2.0 Cr, standout specialized sub-ratings (such as death bowling or finishing), and high growth potential.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiddenGems.map(gem => {
                const p = gem.player;
                const isWatch = (dept.watchlist || []).some(w => w.playerId === p.id);
                const isTarget = (dept.auctionTargetIds || []).includes(p.id);

                return (
                  <div 
                    key={p.id}
                    className="bg-slate-900/90 border border-emerald-800/40 hover:border-emerald-500/60 rounded-2xl p-5 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {p.role}
                        </span>
                        <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                          Value Score: {gem.valueScore}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 my-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center font-black text-lg text-emerald-400">
                          {p.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{p.name}</h3>
                          <div className="text-xs text-slate-400">{p.nationality} • {p.age} yrs • Base ₹{p.basePriceCr} Cr</div>
                        </div>
                      </div>

                      {/* Scout Assessment */}
                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 my-2.5">
                        <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-1">
                          Scouting Intel
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {gem.whyThisPlayer}
                        </p>
                      </div>

                      {/* Key Attributes */}
                      <div className="space-y-1.5 my-2">
                        {gem.strengths.map(s => (
                          <div key={s} className="text-xs text-slate-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => setScoutedPlayerDetail(p)}
                        className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
                      >
                        Deep Scout Profile
                      </button>
                      <button
                        onClick={() => isWatch ? removeFromWatchlist(p.id) : addToWatchlist(p.id, 'High')}
                        className={`p-2 rounded-xl border transition-all ${
                          isWatch ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isWatch ? 'fill-yellow-400' : ''}`} />
                      </button>
                      <button
                        onClick={() => toggleAuctionTarget(p.id)}
                        className={`p-2 rounded-xl border transition-all ${
                          isTarget ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Target className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. AUCTION TARGETS BOARD */}
        {activeSubTab === 'auction' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wide">
                    Priority Auction Target Board
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Algorithmic valuation model calculated for {userTeam?.name}&apos;s remaining purse (₹{userTeam?.purseCr.toFixed(2)} Cr) and tactical vacancies.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('AuctionLive')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                Go to Live Auction &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {auctionTargets.map((target, idx) => {
                const p = target.player;
                const isSelectedTarget = (dept.auctionTargetIds || []).includes(p.id);

                return (
                  <div 
                    key={p.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Priority #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                          {target.fitScore}% Fit
                        </span>
                      </div>

                      <div className="my-2">
                        <h3 className="font-bold text-white text-base">{p.name}</h3>
                        <div className="text-xs text-slate-400">{p.role} • {p.nationality} • {p.age} yrs</div>
                      </div>

                      {/* Valuation Box */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-2 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Base Price:</span>
                          <span className="font-bold text-white">₹{p.basePriceCr} Cr</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Est. Market Value:</span>
                          <span className="font-bold text-amber-400">₹{target.estimatedValueRange.minCr} - ₹{target.estimatedValueRange.maxCr} Cr</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-800 pt-1.5">
                          <span className="text-slate-300 font-semibold">Recommended Max Bid:</span>
                          <span className="font-black text-emerald-400 text-sm">₹{target.recommendedMaxBidCr} Cr</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800/80 my-2">
                        <span className="text-amber-400 font-semibold">Tactical Role:</span> {target.whyThisPlayer}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => setScoutedPlayerDetail(p)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => toggleAuctionTarget(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          isSelectedTarget 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-amber-500 text-slate-950 border-amber-400'
                        }`}
                      >
                        {isSelectedTarget ? '✓ Targeted' : '+ Target'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. OPPOSITION SCOUTING */}
        {activeSubTab === 'opposition' && (
          <div className="space-y-6">
            
            {/* Team Selector Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {(Object.values(gameState.teams) as Array<{ id: string; name: string; shortName: string }>).map(t => {
                const isSelected = t.id === selectedOpponentTeamId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedOpponentTeamId(t.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all border ${
                      isSelected 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {t.shortName} • {t.name}
                  </button>
                );
              })}
            </div>

            {/* Opposition Report Content */}
            {oppositionReport && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Team Overview & Strengths / Weaknesses */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-black text-white">{oppositionReport.teamName}</h3>
                        <span className="text-xs text-slate-400">{oppositionReport.teamShortName} Tactical Dossier</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400">
                        {oppositionReport.teamShortName}
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Key Strengths
                        </div>
                        <ul className="space-y-1">
                          {oppositionReport.strengths.map(s => (
                            <li key={s} className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-slate-300">
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase text-red-400 tracking-wider mb-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Vulnerabilities to Attack
                        </div>
                        <ul className="space-y-1">
                          {oppositionReport.weaknesses.map(w => (
                            <li key={w} className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-slate-300">
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Powerplay & Death Over Intel */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
                    <h4 className="font-bold text-white uppercase text-xs tracking-wider">Phase Phase Breakdown</h4>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="font-bold text-amber-400 mb-0.5">Overs 1-6 (Powerplay)</div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{oppositionReport.powerplayThreat}</p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="font-bold text-red-400 mb-0.5">Overs 16-20 (Death Overs)</div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{oppositionReport.deathOverThreat}</p>
                    </div>
                  </div>
                </div>

                {/* Key Threat Players & Matchup Suggestions */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Key Players */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
                    <h3 className="text-base font-black text-white uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" /> Key Threats to Neutralize
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {oppositionReport.keyPlayers.map(k => (
                        <div 
                          key={k.player.id}
                          onClick={() => setScoutedPlayerDetail(k.player)}
                          className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                              {k.threatLevel} Threat
                            </span>
                            <span className="font-bold text-white text-xs">{k.player.overall} OVR</span>
                          </div>
                          <div className="font-bold text-white text-sm mt-1">{k.player.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{k.roleSummary}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Targetable Batters & Bowlers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Batters to Target */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
                      <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-wider flex items-center gap-1.5">
                        <CrosshairIcon className="w-4 h-4" /> Batters with Technical Flaws
                      </h4>
                      {oppositionReport.battersToTarget.map(b => (
                        <div key={b.player.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="font-bold text-white text-sm">{b.player.name}</div>
                          <p className="text-slate-400 text-[11px] my-1">{b.weaknessReason}</p>
                          <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-medium">
                            Counter: {b.recommendedBowlerType}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bowlers to Target */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-xs space-y-3">
                      <h4 className="font-bold text-sky-400 uppercase text-xs tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4" /> Bowlers to Attack
                      </h4>
                      {oppositionReport.bowlersToTarget.map(bw => (
                        <div key={bw.player.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="font-bold text-white text-sm">{bw.player.name}</div>
                          <p className="text-slate-400 text-[11px] my-1">{bw.vulnerabilityReason}</p>
                          <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-medium">
                            Approach: {bw.recommendedBatterApproach}
                          </span>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* 6. PLAYER COMPARISON TOOL */}
        {activeSubTab === 'compare' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wide">
                    Real Player Side-by-Side Comparison
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Compare 2 to 4 real cricket players across radar attributes, tactical value, and squad fit.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSubTab('database')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all"
                >
                  + Add Players from Database
                </button>
              </div>
            </div>

            {comparisonAnalysis && (
              <div className="space-y-6">
                
                {/* Algorithmic Winner Awards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block">Best Immediate Option</span>
                    <span className="font-black text-white text-sm">{comparisonAnalysis.bestImmediate.name}</span>
                    <span className="text-slate-400 text-[10px] block">OVR {comparisonAnalysis.bestImmediate.overall}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase block">Best Value Option</span>
                    <span className="font-black text-white text-sm">{comparisonAnalysis.bestValue.name}</span>
                    <span className="text-slate-400 text-[10px] block">₹{comparisonAnalysis.bestValue.basePriceCr} Cr Base</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-sky-400 font-bold uppercase block">Best Long-Term Option</span>
                    <span className="font-black text-white text-sm">{comparisonAnalysis.bestLongTerm.name}</span>
                    <span className="text-slate-400 text-[10px] block">{comparisonAnalysis.bestLongTerm.age} yrs • Potential {comparisonAnalysis.bestLongTerm.potential}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-purple-400 font-bold uppercase block">Best Squad Fit</span>
                    <span className="font-black text-white text-sm">{comparisonAnalysis.bestSquadFit.name}</span>
                    <span className="text-slate-400 text-[10px] block">Tactical Synergies</span>
                  </div>
                </div>

                {/* Side-by-Side Comparison Matrix Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {comparisonAnalysis.players.map(item => {
                    const p = item.player;
                    const attrs = p.attributes || ({} as any);

                    return (
                      <div key={p.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-bold uppercase text-slate-400">{p.role}</span>
                          {comparisonIds.length > 2 && (
                            <button
                              onClick={() => handleRemoveComparison(p.id)}
                              className="text-slate-500 hover:text-red-400 text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div>
                          <h3 className="font-black text-white text-base">{p.name}</h3>
                          <div className="text-slate-400 text-[11px]">{p.nationality} • {p.age} yrs • ₹{p.basePriceCr} Cr</div>
                        </div>

                        {/* Ratings Overview */}
                        <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Overall Rating:</span>
                              <span className="font-bold text-white">{p.overall}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${p.overall}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Potential Ceiling:</span>
                              <span className="font-bold text-emerald-400">{p.potential}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${p.potential}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span className="text-slate-400">Squad Fit:</span>
                              <span className="font-bold text-purple-400">{item.fitScore}%</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-purple-400 h-full rounded-full" style={{ width: `${item.fitScore}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Detailed Sub-Ratings */}
                        <div className="space-y-1.5 text-[11px] text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Batting Rating:</span>
                            <span className="font-bold">{p.battingRating}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Bowling Rating:</span>
                            <span className="font-bold">{p.bowlingRating}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Power / Boundary:</span>
                            <span className="font-bold">{attrs.power || 75} / {attrs.boundaryAbility || 75}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Death Execution:</span>
                            <span className="font-bold">{attrs.deathBowling || attrs.deathOverBatting || 75}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Pressure / Big Match:</span>
                            <span className="font-bold">{attrs.pressure || 80} / {attrs.bigMatchPerformance || 80}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setScoutedPlayerDetail(p)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all mt-2"
                        >
                          Full Profile
                        </button>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>
        )}

        {/* 7. SCOUT MISSIONS */}
        {activeSubTab === 'missions' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-wide">
                  Active Scouting Missions & Directives
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Execute structured scouting bounties to discover specialized talent profiles matching your tactical roadmaps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INITIAL_SCOUT_MISSIONS.map(mission => {
                const isDone = (dept.completedMissionIds || []).includes(mission.id);

                return (
                  <div 
                    key={mission.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Mission Directive
                        </span>
                        {isDone ? (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 font-semibold">Active</span>
                        )}
                      </div>

                      <h3 className="font-bold text-white text-base mb-1">{mission.title}</h3>
                      <p className="text-xs text-slate-300 mb-3">{mission.subtitle}</p>
                      <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Criteria</span>
                        {mission.criteriaDescription}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            ...mission.filterPreset
                          }));
                          setActiveSubTab('database');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" /> Execute Query
                      </button>

                      {!isDone && (
                        <button
                          onClick={() => completeScoutMission(mission.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. WATCHLIST & ALERTS */}
        {activeSubTab === 'watchlist' && (
          <div className="space-y-6">
            
            {/* Watchlist Header */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <h2 className="text-lg font-black text-white uppercase tracking-wide">
                    Franchise Watchlist & Scouting Notes
                  </h2>
                </div>
                <p className="text-xs text-slate-400">
                  Track key real players, assign custom scouting priorities, and record scouting notes across seasons.
                </p>
              </div>
            </div>

            {/* Watchlist Items */}
            {(dept.watchlist || []).length === 0 ? (
              <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
                <Star className="w-10 h-10 text-yellow-400/50 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">Your Watchlist is empty</h3>
                <p className="text-xs text-slate-400 mt-1">Browse the real player database and click the star icon to track players.</p>
                <button
                  onClick={() => setActiveSubTab('database')}
                  className="mt-3 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg"
                >
                  Explore Database
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dept.watchlist || []).map(item => {
                  const p = gameState.allPlayers[item.playerId];
                  if (!p) return null;

                  return (
                    <div 
                      key={item.playerId}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between text-xs space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            item.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {item.priority} Priority
                          </span>
                          <span className="text-[10px] text-slate-500">{item.addedDateFormatted}</span>
                        </div>

                        <div className="flex items-center justify-between my-1">
                          <div>
                            <h3 className="font-bold text-white text-base">{p.name}</h3>
                            <div className="text-slate-400 text-[11px]">{p.role} • {p.nationality} • {p.age} yrs</div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white text-sm">OVR {p.overall}</span>
                            <span className="text-[10px] text-emerald-400 block">Pot {p.potential}</span>
                          </div>
                        </div>

                        {/* Custom Scout Notes */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Scout Notes</span>
                            <button
                              onClick={() => openNoteEditor(p.id, item.notes, item.priority)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold"
                            >
                              Edit Note
                            </button>
                          </div>
                          <p className="text-slate-300 text-xs italic">
                            {item.notes || 'No custom notes added. Click edit to record tactical observations.'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setScoutedPlayerDetail(p)}
                          className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all text-xs"
                        >
                          Full Report
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(p.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold transition-all"
                        >
                          Remove
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Department Alerts Stream */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-black text-white text-base uppercase tracking-wide mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Scouting Alerts & Intelligence Stream
              </h3>
              <div className="space-y-2">
                {(dept.alerts || []).map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      alert.isRead ? 'bg-slate-950/50 border-slate-800/60 text-slate-400' : 'bg-amber-950/20 border-amber-800/50 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div>{alert.message}</div>
                        <span className="text-[10px] text-slate-500">{alert.timestampFormatted}</span>
                      </div>
                    </div>
                    {!alert.isRead && (
                      <button
                        onClick={() => markAlertRead(alert.id)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold uppercase shrink-0"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ==========================================
          DEEP PLAYER SCOUTING REPORT MODAL / DRAWER
      ========================================== */}
      {scoutedPlayerDetail && (() => {
        const p = scoutedPlayerDetail;
        const analysis = evaluateScoutedPlayer(p, userTeam, gameState.allPlayers, dept.level, dept.watchlist || [], dept.auctionTargetIds || []);
        const attrs = p.attributes || ({} as any);
        const isWatch = (dept.watchlist || []).some(w => w.playerId === p.id);
        const isTarget = (dept.auctionTargetIds || []).includes(p.id);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-5">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-2xl text-amber-400">
                    {p.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-white">{p.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {p.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.nationality} • {p.age} years old • {p.battingStyle} • {p.bowlingStyle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setScoutedPlayerDetail(null)}
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Tactical Assessment Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">
                    Franchise Fit Evaluation
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {analysis.fitScore}% Overall Fit
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {analysis.whyThisPlayer}
                </p>
                <div className="text-[11px] text-slate-400 italic">
                  T20 Role: {analysis.t20TacticalProfile}
                </div>
              </div>

              {/* Algorithmic Valuation Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">Estimated Value</span>
                  <span className="font-black text-amber-400 text-sm">₹{analysis.estimatedValueRange.minCr} - ₹{analysis.estimatedValueRange.maxCr} Cr</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Max Bid Advisor</span>
                  <span className="font-black text-emerald-400 text-sm">₹{analysis.recommendedMaxBidCr} Cr</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Scout Confidence</span>
                  <span className="font-black text-white text-sm">{analysis.scoutConfidencePercent}%</span>
                </div>
              </div>

              {/* Detailed Radar Sub-Ratings */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Verified Attributes Dossier</h4>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="font-bold text-amber-400 text-xs">Batting Profile</div>
                    <div className="flex justify-between text-slate-300">
                      <span>Power / Six Hitting:</span>
                      <span className="font-bold text-white">{attrs.power || 75}/99</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Strike Rotation:</span>
                      <span className="font-bold text-white">{attrs.strikeRotation || 75}/99</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Death Finishing:</span>
                      <span className="font-bold text-white">{attrs.finishing || attrs.deathOverBatting || 75}/99</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Pace vs Spin Rating:</span>
                      <span className="font-bold text-white">{attrs.paceAbility || 80} / {attrs.spinAbility || 80}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="font-bold text-sky-400 text-xs">Bowling & Mental</div>
                    <div className="flex justify-between text-slate-300">
                      <span>Express Pace / Spin:</span>
                      <span className="font-bold text-white">{attrs.pace || attrs.spin || 70}/99</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Death Over Execution:</span>
                      <span className="font-bold text-white">{attrs.deathBowling || 70}/99</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Pressure Composure:</span>
                      <span className="font-bold text-white">{attrs.pressure || 80}/99</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Big Match Index:</span>
                      <span className="font-bold text-white">{attrs.bigMatchPerformance || 80}/99</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-800/40">
                  <div className="font-bold text-emerald-400 text-xs mb-1.5">Key Strengths</div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {analysis.strengths.map(s => (
                      <li key={s}>• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-950/20 p-3 rounded-xl border border-red-800/40">
                  <div className="font-bold text-red-400 text-xs mb-1.5">Areas of Vulnerability</div>
                  <ul className="space-y-1 text-slate-300 text-[11px]">
                    {analysis.weaknesses.map(w => (
                      <li key={w}>• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    handleAddComparison(p.id);
                    setScoutedPlayerDetail(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5" /> Compare
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => isWatch ? removeFromWatchlist(p.id) : addToWatchlist(p.id, 'High')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isWatch ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isWatch ? 'fill-yellow-400' : ''}`} />
                    {isWatch ? 'Watchlisted' : 'Add to Watchlist'}
                  </button>

                  <button
                    onClick={() => toggleAuctionTarget(p.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isTarget ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    {isTarget ? 'Targeted' : 'Set as Target'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ==========================================
          UPGRADE SCOUTING NETWORK MODAL
      ========================================== */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-white uppercase">Upgrade Scouting Network</h3>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Expanding your scouting infrastructure unlocks higher accuracy valuation algorithms, deeper opposition flaw tracking, and tighter potential confidence bounds.
            </p>

            {/* Level Tier Roadmap */}
            <div className="space-y-2 text-xs">
              {[
                { lvl: 1, name: 'Basic Domestic Network', desc: 'Standard player records & base attributes' },
                { lvl: 2, name: 'State Association Scouts', desc: 'Detailed radar ratings & form tracking' },
                { lvl: 3, name: 'National Analytics Grid', desc: 'Opposition weakness tracking & match reports (Current)' },
                { lvl: 4, name: 'Algorithmic Valuation Core', desc: 'Recommended max bids & valuation bands' },
                { lvl: 5, name: 'Elite Global Network', desc: 'Ultra-accurate potential ranges (±1 OVR) & hidden gems' }
              ].map(tier => {
                const isUnlocked = tier.lvl <= dept.level;
                const isCurrent = tier.lvl === dept.level;
                return (
                  <div 
                    key={tier.lvl}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isCurrent 
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' 
                        : isUnlocked 
                          ? 'bg-slate-950/80 border-slate-800 text-slate-400' 
                          : 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Level {tier.lvl}: {tier.name}</span>
                        {isCurrent && <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 rounded font-black">CURRENT</span>}
                      </div>
                      <div className="text-[11px] mt-0.5">{tier.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {upgradeFeedback && (
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 text-center font-bold">
                {upgradeFeedback}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-400 block">Upgrade Cost:</span>
                <span className="font-black text-amber-400 text-sm">₹{(dept.level * 1.5).toFixed(2)} Cr</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Close
                </button>
                {dept.level < 5 && (
                  <button
                    onClick={handleUpgradeClick}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20"
                  >
                    Confirm Upgrade
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          WATCHLIST NOTE EDITOR MODAL
      ========================================== */}
      {editingNotePlayerId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 text-slate-100 space-y-4">
            <h3 className="font-bold text-white text-base">Edit Scouting Note</h3>
            
            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Priority</label>
              <select
                value={tempPriority}
                onChange={e => setTempPriority(e.target.value as PriorityLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-medium"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold uppercase block mb-1">Tactical Observations</label>
              <textarea
                value={tempNoteText}
                onChange={e => setTempNoteText(e.target.value)}
                placeholder="e.g., Must target if primary death bowler exceeds ₹10 Cr in auction..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 h-24 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingNotePlayerId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveNoteEditor}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function CrosshairIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}
