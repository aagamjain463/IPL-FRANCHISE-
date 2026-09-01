import { GameScreen, AppTab } from '../types/game';
import { ROUTE_BY_PATH, getRouteMetaForState } from '../navigation/screenRoutes';

export interface AppRoute {
  path: string;
  screen: GameScreen;
  tab: AppTab;
  isStandaloneMode: boolean;
}

export const ROUTES: Record<string, AppRoute> = Object.fromEntries(
  Object.entries(ROUTE_BY_PATH).map(([path, route]) => [
    path,
    {
      path,
      screen: route.screen,
      tab: route.tab,
      isStandaloneMode: route.isStandaloneMode
    }
  ])
) as Record<string, AppRoute>;

export const getRouteForState = (screen: GameScreen, tab: AppTab): string => {
  return getRouteMetaForState(screen, tab).path;
};

export const parseCurrentPath = (pathname: string): { screen: GameScreen; tab: AppTab; isStandalone: boolean } => {
  const clean = pathname.replace(/\/$/, '') || '/';
  const match = ROUTES[clean] || ROUTES['/home'] || ROUTES['/'];
  return { screen: match.screen, tab: match.tab, isStandalone: match.isStandaloneMode };
};
