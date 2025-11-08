/**
 * Runtime detection for duplicate React instances
 * Helps diagnose "dispatcher is null" errors caused by multiple React copies
 */

export function detectDuplicateReact(): { hasDuplicate: boolean; count: number } {
  try {
    // Check DevTools hook for multiple renderers
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
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

export function logReactDiagnostics() {
  const React = require('react');
  const ReactDOM = require('react-dom');
  
  console.log('🔍 React Diagnostics:', {
    reactVersion: React.version,
    reactDomVersion: ReactDOM.version,
    versionMatch: React.version === ReactDOM.version,
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

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearCacheAndReload = clearCacheAndReload;
  (window as any).checkReactDuplicates = detectDuplicateReact;
}
