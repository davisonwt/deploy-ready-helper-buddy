import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { SessionContextProvider } from "@supabase/auth-helpers-react";

import App from "./App";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { ProductionErrorBoundary } from "@/components/error/ProductionErrorBoundary";
import { logInfo, logError } from "@/lib/logging";
import { queryClient } from "./lib/queryPersistence";

import "./index.css";

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

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logInfo('Service worker registered', { registration });
      })
      .catch((registrationError) => {
        logError('Service worker registration failed', { registrationError });
      });
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ProductionErrorBoundary>
      <SessionContextProvider supabaseClient={supabase}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster />
        </QueryClientProvider>
      </SessionContextProvider>
    </ProductionErrorBoundary>
  </StrictMode>
);
