import React, { StrictMode } from "react";
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
import "./index.css";

// Ensure React is available globally for any modules that reference it directly
// This prevents "React is not defined" runtime errors from legacy or misconfigured modules
// Safe no-op if already defined
;(window as any).React = (window as any).React || React;

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

// Performance monitoring
if ('performance' in window && 'observe' in window.PerformanceObserver) {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === 'navigation') {
        logInfo('Page load performance', {
          loadTime: (entry as any).loadEventEnd - (entry as any).loadEventStart,
          domContentLoaded: (entry as any).domContentLoadedEventEnd - (entry as any).domContentLoadedEventStart,
          ttfb: (entry as any).responseStart - (entry as any).requestStart,
        });
      }
    });
  });
  
  observer.observe({ entryTypes: ['navigation'] });
}

// Query client is now imported from lib/queryPersistence.ts for better caching

// Log app initialization
logInfo('Application starting', {
  environment: import.meta.env.DEV ? 'development' : 'production',
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});

// Register service worker for PWA functionality with update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Allow permanent SW disable/enable via query flags
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('sw') === 'off') {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        localStorage.setItem('sw:disabled', '1');
        logInfo('Service workers disabled and caches cleared');
        window.location.href = window.location.pathname; // drop query
        return;
      }
      if (params.get('sw') === 'on') {
        localStorage.removeItem('sw:disabled');
        logInfo('Service workers re-enabled');
        window.location.href = window.location.pathname;
        return;
      }
    } catch {}

    // If disabled, ensure unregistered and skip registration entirely
    if (localStorage.getItem('sw:disabled') === '1') {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logInfo('SW disabled: skipping registration');
      } catch (e) {
        logError('Failed disabling SW', { e });
      }
      return;
    }

    // Handle ?no-sw=1 - one-time unregister and clear caches
    if (window.location.search.includes('no-sw=1')) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        logInfo('Service workers unregistered and caches cleared');
        // Remove the parameter and reload once
        if (!sessionStorage.getItem('sw-cleared')) {
          sessionStorage.setItem('sw-cleared', '1');
          window.location.href = window.location.pathname;
        } else {
          sessionStorage.removeItem('sw-cleared');
        }
      } catch (error) {
        logError('Failed to clear service workers', { error });
      }
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js?v=2025-10-30-03');
      logInfo('Service worker registered', { registration });

      // Check for updates on load
      registration.update();

      // Handle waiting service worker (new version available)
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Listen for new service worker taking control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          logInfo('New service worker activated, reloading...');
          window.location.reload();
        }
      });

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
    } catch (registrationError) {
      logError('Service worker registration failed', { registrationError });
    }
  });
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
