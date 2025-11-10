import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { logInfo, logError } from '@/lib/logging';

// Extend Window interface for custom properties
interface WindowWithNavDirty extends Window {
  __NAV_DIRTY?: boolean;
}

// Simple global beforeunload protection honoring window.__NAV_DIRTY
export const NavigationMonitor = () => {
  const location = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    logInfo('Navigation attempt', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      navType,
      timestamp: Date.now(),
    });
  }, [location, navType]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      // Only block if flagged as dirty
      if ((window as WindowWithNavDirty).__NAV_DIRTY) {
        e.preventDefault();
        e.returnValue = '';
        logInfo('beforeunload blocked due to dirty state');
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', handler);
    // Log back/forward button navigation
    const onPop = () => {
      logInfo('History popstate navigation', { pathname: window.location.pathname });
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  return null;
};
