/**
 * Runtime detection for duplicate React instances
 * Helps diagnose "dispatcher is null" errors caused by multiple React copies
 */

interface ReactDevToolsHook {
  renderers?: Map<number, unknown>;
}

export function detectDuplicateReact(): { hasDuplicate: boolean; count: number } {
  try {
    // Check DevTools hook for multiple renderers
    const hook = (window as Window & { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook }).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook?.renderers) {
      const rendererCount = hook.renderers.size || 0;
      return {
        hasDuplicate: rendererCount > 1,
        count: rendererCount
      };
    }
  } catch (error) {
    console.warn('Could not check for duplicate React instances:', error);
  }
  
  return { hasDuplicate: false, count: 0 };
}

export function logReactDiagnostics(ReactLib?: { version?: string }, ReactDOMLib?: { version?: string }) {
  const React = ReactLib ?? (typeof window !== 'undefined' ? (window as Window & { React?: { version?: string } }).React : undefined);
  const ReactDOM = ReactDOMLib ?? (typeof window !== 'undefined' ? (window as Window & { ReactDOM?: { version?: string } }).ReactDOM : undefined);
  
  console.log('🔍 React Diagnostics:', {
    reactVersion: React?.version,
    reactDomVersion: ReactDOM?.version,
    versionMatch: React?.version === ReactDOM?.version,
    isDevelopment: import.meta.env.DEV
  });

  const duplication = detectDuplicateReact();
  
  if (duplication.hasDuplicate) {
    console.error(
      `⚠️ DUPLICATE REACT DETECTED: ${duplication.count} renderers found! ` +
      `This causes "dispatcher is null" errors. ` +
      `Clear cache and hard reload (Ctrl+Shift+R / Cmd+Shift+R)`
    );
  } else {
    console.log('✅ No duplicate React instances detected');
  }
  
  return duplication;
}

/**
 * Provides a one-click cache clear utility
 */
export function clearCacheAndReload() {
  // Clear localStorage flags
  localStorage.removeItem('sw:disabled');
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    });
  }
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  
  // Hard reload
  window.location.reload();
}

/**
 * Disable Service Worker, purge caches, and reload.
 * Prevents SW from re-registering on next load.
 */
export function disableServiceWorkerAndReload() {
  try {
    // Persist flag to skip registration in main.tsx
    localStorage.setItem('sw:disabled', '1');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }

    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
  } finally {
    window.location.reload();
  }
}

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as Window & { 
    clearCacheAndReload?: () => void;
    disableServiceWorkerAndReload?: () => void;
    checkReactDuplicates?: () => { hasDuplicate: boolean; count: number };
  }).clearCacheAndReload = clearCacheAndReload;
  (window as Window & { 
    clearCacheAndReload?: () => void;
    disableServiceWorkerAndReload?: () => void;
    checkReactDuplicates?: () => { hasDuplicate: boolean; count: number };
  }).disableServiceWorkerAndReload = disableServiceWorkerAndReload;
  (window as Window & { 
    clearCacheAndReload?: () => void;
    disableServiceWorkerAndReload?: () => void;
    checkReactDuplicates?: () => { hasDuplicate: boolean; count: number };
  }).checkReactDuplicates = detectDuplicateReact;
}
