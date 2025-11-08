let navigationDirty = false;

export const setNavigationDirty = (dirty: boolean) => {
  navigationDirty = !!dirty;
  (window as any).__NAV_DIRTY = navigationDirty;
};

export const isNavigationDirty = () => navigationDirty;

// Optional hook to toggle protection within forms or flows
import { useEffect } from 'react';
export const useNavigationProtection = (enabled: boolean) => {
  useEffect(() => {
    setNavigationDirty(enabled);
    return () => {
      // Clear on unmount if it was enabled by this scope
      if (enabled) setNavigationDirty(false);
    };
  }, [enabled]);
};
