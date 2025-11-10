import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import App from "./App";
import { supabase } from "@/integrations/supabase/client";
import { ProductionErrorBoundary } from "@/components/error/ProductionErrorBoundary";
import { logInfo, logError } from "@/lib/logging";
import { queryClient } from "./lib/queryPersistence";
import { CryptoComProvider } from '@/providers/CryptoComProvider';
import { clearRoleCache } from '@/hooks/useUserRoles';
import { logReactDiagnostics } from '@/utils/reactDuplicateDetector';
import "./index.css";
import React from "react";
import * as ReactDOMPkg from "react-dom";

// Extend Window interface for cache clearing
declare global {
  interface Window {
    clearRoleCache: typeof clearRoleCache;
  }
}

// Expose cache clearing for logout
if (typeof window !== 'undefined') {
  window.clearRoleCache = clearRoleCache;
}

// Global error handling
window.addEventListener('error', (event) => {
  logError('Global error caught', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logError('Unhandled promise rejection', {
    reason: event.reason,
    stack: event.reason?.stack,
  });
});

// Defer performance monitoring to avoid blocking
if ('performance' in window && import.meta.env.DEV) {
  setTimeout(() => {
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      logInfo('⚡ Load Performance', {
        'Total Load': `${Math.round(navTiming.loadEventEnd - navTiming.loadEventStart)}ms`,
        'DOM Ready': `${Math.round(navTiming.domContentLoadedEventEnd - navTiming.fetchStart)}ms`,
        'TTFB': `${Math.round(navTiming.responseStart - navTiming.requestStart)}ms`,
      });
    }
  }, 1000);
}

// Query client is now imported from lib/queryPersistence.ts for better caching

// Log app initialization
logInfo('Application starting', {
  environment: import.meta.env.DEV ? 'development' : 'production',
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});

// Version sanity check (detect multiple React copies)
try {
  console.groupCollapsed('Version Check');
  console.log('React version:', (React as { version?: string }).version);
  console.log('React DOM version:', (ReactDOMPkg as { version?: string }).version);
  console.groupEnd();
  
  // Detect duplicate React instances
  const duplication = logReactDiagnostics(React, ReactDOMPkg);
  if (duplication?.hasDuplicate) {
    // Prevent SW from re-registering; user can call window.disableServiceWorkerAndReload()
    try {
      localStorage.setItem('sw:disabled', '1');
      console.warn('⚠️ Duplicate React detected. Service worker disabled for this session. Run window.disableServiceWorkerAndReload() to purge caches and reload.');
    } catch (swError) {
      // Silently fail if localStorage is unavailable
      console.warn('Failed to set sw:disabled flag:', swError);
    }
  }
} catch (e) {
  console.warn('Version check failed', e);
}

// Defer service worker registration - ONLY IN PRODUCTION
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  // Wait for page to fully load and become idle
  window.addEventListener('load', () => {
    // Use requestIdleCallback to defer SW registration
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => registerServiceWorker(), { timeout: 2000 });
    } else {
      setTimeout(registerServiceWorker, 2000);
    }
  });
}

async function registerServiceWorker() {
  try {
    // Check if SW is disabled
    if (localStorage.getItem('sw:disabled') === '1') {
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js?v=2025-11-08-v3');
    
    // Only update if page is visible (don't interrupt user)
    if (document.visibilityState === 'visible') {
      registration.update();
    }
  } catch (error) {
    // Silently fail - don't block app functionality
    console.warn('Service worker registration skipped:', error.message);
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SessionContextProvider supabaseClient={supabase}>
          <ProductionErrorBoundary>
            <CryptoComProvider>
              <App />
            </CryptoComProvider>
          </ProductionErrorBoundary>
        </SessionContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
