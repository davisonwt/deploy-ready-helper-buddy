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
import { reloadOnceForStaleChunk } from '@/lib/staleChunkReload';
import "./index.css";
import '@/utils/confetti';

declare global {
  interface Window {
    clearRoleCache: typeof clearRoleCache;
  }
}

if (typeof window !== 'undefined') {
  window.clearRoleCache = clearRoleCache;
}

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

// Standard Vite pattern: a lazy route/component chunk whose hash no
// longer exists on the server (this tab has a stale index.html cached
// from before the last deploy) throws here instead of silently failing.
// Reload once to pick up the current deployment -- see
// lib/staleChunkReload.ts for the shared single-reload guard, also used
// by ErrorBoundary.tsx for the same failure arriving via React's own
// error-boundary path instead of this window event.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk()) {
    event.preventDefault();
  }
});

logInfo('Application starting', {
  environment: import.meta.env.DEV ? 'development' : 'production',
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});

if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  // A new SW taking control (skipWaiting + clients.claim in sw.js) only
  // changes which SW intercepts THIS tab's future requests — it does not
  // touch the JS already running in memory, which still references the
  // previous deploy's content-hashed chunk filenames. Reload once so an
  // already-open tab lands on the new build instead of later 404ing on a
  // lazy import() for a chunk that no longer exists on the server.
  //
  // controllerchange fires identically for that case AND for a brand-new
  // visitor's very first SW install (navigator.serviceWorker.controller
  // goes from null -> the new SW either way) -- a first visit has no
  // stale JS to recover from, so this used to force an unwanted reload on
  // every new visitor. Only reload when a controller already existed
  // BEFORE this script ran, i.e. an old SW from a previous visit is being
  // replaced, not installed for the first time.
  const hadControllerAlready = !!navigator.serviceWorker.controller;
  let refreshingForNewServiceWorker = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAlready) return;
    if (refreshingForNewServiceWorker) return;
    refreshingForNewServiceWorker = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => registerServiceWorker(), { timeout: 2000 });
    } else {
      setTimeout(registerServiceWorker, 2000);
    }
  });
}

async function registerServiceWorker() {
  try {
    if (localStorage.getItem('sw:disabled') === '1') return;
    const registration = await navigator.serviceWorker.register('/sw.js?v=2026-08-26-payment-fix');
    if (document.visibilityState === 'visible') {
      registration.update();
    }
  } catch (error) {
    console.warn('Service worker registration skipped:', error.message);
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

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
