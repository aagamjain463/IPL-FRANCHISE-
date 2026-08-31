import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoadingScreen } from './LoadingScreen';
import { getRouteMetaByPath, getRouteMetaForState, ScreenRouteMeta } from '../../navigation/screenRoutes';
import { AppTab, GameScreen } from '../../types/game';
import { gameAudioEvents } from '../../audio/gameAudioEvents';

interface ScreenTransitionProps {
  screen: GameScreen;
  tab: AppTab;
  children: React.ReactNode;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({ screen, tab, children }) => {
  const [locationPath, setLocationPath] = useState(() => window.location.pathname);
  const [loadingRoute, setLoadingRoute] = useState<ScreenRouteMeta | null>(null);
  const firstRender = useRef(true);
  const previousKey = useRef(`${screen}:${tab}:${window.location.pathname}`);

  useEffect(() => {
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    const emit = () => {
      window.dispatchEvent(new Event('ipl-franchise-location-change'));
    };

    window.history.pushState = function pushStatePatched(...args) {
      const target = typeof args[2] === 'string' ? args[2] : '';
      const targetPath = target ? new URL(target, window.location.origin).pathname : '';
      const method = targetPath && targetPath === window.location.pathname ? originalReplace : originalPush;
      const result = method.apply(this, args as Parameters<typeof originalPush>);
      emit();
      return result;
    };

    window.history.replaceState = function replaceStatePatched(...args) {
      const result = originalReplace.apply(this, args as Parameters<typeof originalReplace>);
      emit();
      return result;
    };

    return () => {
      window.history.pushState = originalPush;
      window.history.replaceState = originalReplace;
    };
  }, []);

  useEffect(() => {
    const onLocation = () => setLocationPath(window.location.pathname);
    window.addEventListener('popstate', onLocation);
    window.addEventListener('ipl-franchise-location-change', onLocation);
    return () => {
      window.removeEventListener('popstate', onLocation);
      window.removeEventListener('ipl-franchise-location-change', onLocation);
    };
  }, []);

  const route = useMemo(() => {
    const stateRoute = getRouteMetaForState(screen, tab);
    const pathRoute = getRouteMetaByPath(locationPath);
    // Prefer the actual game state so component-level tab changes without a
    // manual URL write still receive the correct FC-style destination loader.
    return stateRoute || pathRoute;
  }, [locationPath, screen, tab]);

  useEffect(() => {
    const nextKey = `${screen}:${tab}:${route.path}`;
    if (firstRender.current) {
      firstRender.current = false;
      previousKey.current = nextKey;
      return;
    }
    if (previousKey.current !== nextKey) {
      previousKey.current = nextKey;
      setLoadingRoute(route);
      gameAudioEvents.trigger('navigation', route.variant);
    }
  }, [route, screen, tab]);

  const finishTransition = useCallback(() => {
    gameAudioEvents.trigger('screen-enter', loadingRoute?.variant);
    setLoadingRoute(null);
  }, [loadingRoute?.variant]);

  return (
    <>
      <div className={`screen-transition-content ${loadingRoute ? 'screen-transition-content--exiting' : 'screen-transition-content--entered'}`}>
        {children}
      </div>
      {loadingRoute && <LoadingScreen route={loadingRoute} onComplete={finishTransition} />}
    </>
  );
};
