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
import "./index.css";
import { startGardenParticles } from '@/utils/confetti';
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

logInfo('Application starting', {
  environment: import.meta.env.DEV ? 'development' : 'production',
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
});

if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => registerServiceWorker(), { timeout: 2000 });
    } else {
      setTimeout(registerServiceWorker, 2000);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    startGardenParticles();
  });
}

async function registerServiceWorker() {
  try {
    if (localStorage.getItem('sw:disabled') === '1') return;
    const registration = await navigator.serviceWorker.register('/sw.js?v=2025-11-08-v3');
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
