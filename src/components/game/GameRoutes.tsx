import React, { Suspense } from 'react';
import { useGame } from '../../context/GameContext';
import { getRouteMetaForState } from '../../navigation/screenRoutes';
import { MainAppLayout } from '../../layouts/MainAppLayout';
import { AuctionLayout } from '../../layouts/AuctionLayout';
import { MatchLayout } from '../../layouts/MatchLayout';
import { WorldScreen } from './WorldScreen';
import { LoadingScreen } from './LoadingScreen';

const DashboardView = React.lazy(() => import('../DashboardView').then(m => ({ default: m.DashboardView })));
const AuctionView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumAuctionView })));
const MultiplayerAuctionHome = React.lazy(() => import('../multiplayer/MultiplayerAuctionHome').then(m => ({ default: m.MultiplayerAuctionHome })));
const PlayCenterView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumPlayView })));
const PlayingXIView = React.lazy(() => import('../PlayingXIView').then(m => ({ default: m.PlayingXIView })));
const SquadManagementView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumSquadView })));
const ClubFranchiseView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumClubView })));
const YouthAcademyView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumAcademyView })));
const ScoutDepartmentView = React.lazy(() => import('../ScoutDepartmentView').then(m => ({ default: m.ScoutDepartmentView })));
const TradeCenterView = React.lazy(() => import('../TradeCenterView').then(m => ({ default: m.TradeCenterView })));
const StandingsView = React.lazy(() => import('../StandingsView').then(m => ({ default: m.StandingsView })));
const LeagueCenterView = React.lazy(() => import('../LeagueCenterView').then(m => ({ default: m.LeagueCenterView })));
const FixturesScheduleView = React.lazy(() => import('../FixturesScheduleView').then(m => ({ default: m.FixturesScheduleView })));
const RewardsCenterView = React.lazy(() => import('../RewardsCenterView').then(m => ({ default: m.RewardsCenterView })));
const LeaderboardView = React.lazy(() => import('../LeaderboardView').then(m => ({ default: m.LeaderboardView })));
const ChallengesView = React.lazy(() => import('../ChallengesView').then(m => ({ default: m.ChallengesView })));
const WhatIfView = React.lazy(() => import('../WhatIfView').then(m => ({ default: m.WhatIfView })));
const ProfileLegacyView = React.lazy(() => import('../ProfileLegacyView').then(m => ({ default: m.ProfileLegacyView })));
const FCEvolutionView = React.lazy(() => import('../fc26/FCEvolutionView').then(m => ({ default: m.FCEvolutionView })));
const FCIQTacticsRadar = React.lazy(() => import('../fc26/FCIQTacticsRadar').then(m => ({ default: m.FCIQTacticsRadar })));
const MatchLiveView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumMatchLiveView })));
const PostMatchPresentationView = React.lazy(() => import('../PostMatchPresentationView').then(m => ({ default: m.PostMatchPresentationView })));
const PressConferenceView = React.lazy(() => import('../PressConferenceView').then(m => ({ default: m.PressConferenceView })));
const SeasonRecapView = React.lazy(() => import('../SeasonRecapView').then(m => ({ default: m.SeasonRecapView })));
const OffSeasonView = React.lazy(() => import('../OffSeasonView').then(m => ({ default: m.OffSeasonView })));
const NewsRoomView = React.lazy(() => import('./PremiumWorldViews').then(m => ({ default: m.PremiumNewsView })));

export const GameRoutes: React.FC = () => {
  const { currentScreen, activeTab } = useGame();
  const route = getRouteMetaForState(currentScreen, activeTab);
  const fallback = <LoadingScreen route={route} durationMs={3600} />;

  if (currentScreen === 'Walkout' || activeTab === 'Walkout') {
    // Dedicated full-viewport reveal: fits the device width exactly, no page scrolling.
    return (
      <div className="fixed inset-0 z-[90] w-full h-dvh overflow-hidden bg-[#030712]">
        <WorldScreen route={route} compact>
          <Suspense fallback={fallback}><WalkoutRevealView /></Suspense>
        </WorldScreen>
      </div>
    );
  }
  if (currentScreen === 'MultiplayerAuction' || activeTab === 'MultiplayerAuction') {
    return (
      <MainAppLayout>
        <WorldScreen route={route}>
          <Suspense fallback={fallback}><MultiplayerAuctionHome /></Suspense>
        </WorldScreen>
      </MainAppLayout>
    );
  }

  if (currentScreen === 'Auction' || activeTab === 'AuctionLive') {
    return (
      <AuctionLayout>
        <WorldScreen route={route} compact>
          <Suspense fallback={fallback}><AuctionView /></Suspense>
        </WorldScreen>
      </AuctionLayout>
    );
  }

  if (currentScreen === 'MatchLive' || activeTab === 'MatchLive') {
    return (
      <MatchLayout>
        <WorldScreen route={route} compact>
          <Suspense fallback={fallback}><MatchLiveView /></Suspense>
        </WorldScreen>
      </MatchLayout>
    );
  }

  if (currentScreen === 'PressConference') {
    return (
      <MainAppLayout>
        <WorldScreen route={route}>
          <Suspense fallback={fallback}><PressConferenceView /></Suspense>
        </WorldScreen>
      </MainAppLayout>
    );
  }

  if (currentScreen === 'PostMatchPresentation') {
    return (
      <MainAppLayout>
        <WorldScreen route={route}>
          <Suspense fallback={fallback}><PostMatchPresentationView /></Suspense>
        </WorldScreen>
      </MainAppLayout>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'Dashboard': return <DashboardView />;
      case 'Play': return <PlayCenterView />;
      case 'PlayingXI': return <PlayingXIView />;
      case 'Squad': return <SquadManagementView />;
      case 'Club': return <ClubFranchiseView />;
      case 'YouthAcademy': return <YouthAcademyView />;
      case 'Scout': return <ScoutDepartmentView />;
      case 'TradeCenter':
      case 'Market': return <TradeCenterView />;
      case 'Standings': return <StandingsView />;
      case 'League': return <LeagueCenterView />;
      case 'Schedule': return <FixturesScheduleView />;
      case 'Rewards': return <RewardsCenterView />;
      case 'Leaderboard': return <LeaderboardView />;
      case 'Challenges': return <ChallengesView />;
      case 'WhatIfSimulator': return <WhatIfView />;
      case 'Profile': return <ProfileLegacyView />;
      case 'FCEvolutions': return <FCEvolutionView />;
      case 'TacticsRadar': return <FCIQTacticsRadar />;
      case 'SeasonRecap': return <SeasonRecapView />;
      case 'OffSeason': return <OffSeasonView />;
      case 'News': return <NewsRoomView />;
      default: return <DashboardView />;
    }
  };

  return (
    <MainAppLayout>
      <WorldScreen route={route} compact={activeTab === 'Dashboard'}>
        <Suspense fallback={fallback}>{renderTab()}</Suspense>
      </WorldScreen>
    </MainAppLayout>
  );
};
