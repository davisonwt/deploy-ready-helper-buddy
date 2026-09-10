import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { TileErrorBoundary } from "@/components/error/TileErrorBoundary";
import ErrorBoundary from "./components/ErrorBoundary";
import ResponsiveLayout from "./components/layout/ResponsiveLayout";
import AccessibilityChecker from "./components/accessibility/AccessibilityChecker";
import IncomingCallOverlay from "./components/chat/IncomingCallOverlay";
import AudioUnlocker from "./components/audio/AudioUnlocker";
import SoundUnlockBanner from "./components/audio/SoundUnlockBanner";
import SacredDayBanner from "./components/SacredDayBanner";
import { useReferralCapture } from "./hooks/useReferralCapture";
import { useWhispererCapture } from "./hooks/useWhispererCapture";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { ProductBasketProvider } from "./contexts/ProductBasketContext";
import FloatingBasketButton from "./components/products/FloatingBasketButton";
import WalletBalanceChip from "./components/payments/WalletBalanceChip";

import { AlbumBuilderProvider } from "./contexts/AlbumBuilderContext";
import { LiveSessionPlaylistProvider } from "./contexts/LiveSessionPlaylistContext";
import { AppContextProvider, useAppContext } from "./contexts/AppContext";
import { VisualEditorProvider } from "./contexts/VisualEditorContext";
import "./utils/errorDetection";
import "./utils/cookieConfig";
import { CallManagerProvider } from '@/providers/CallManagerProvider';
import EnhancedErrorBoundary from "@/components/error/EnhancedErrorBoundary";
import { logError } from "@/lib/logging";
import { NavigationMonitor } from "@/components/monitoring/NavigationMonitor";
import { DeadLinkDetector } from "@/components/monitoring/DeadLinkDetector";
import { NotificationBanner } from "@/components/NotificationBanner";
import { PayoutSetupBanner } from "@/components/PayoutSetupBanner";
import GroundskeeperWidget from "@/components/grove/GroundskeeperWidget";
import { BuildUpdateBanner } from "@/components/BuildUpdateBanner";
import AppRoutes, { LoadingFallback } from "./routes/AppRoutes";
import SolanaPaymentHost from "@/components/payments/SolanaPaymentHost";

function ReferralCaptureMount() {
  useReferralCapture();
  useWhispererCapture();
  return null;
}

/**
 * The three fixed-bottom-right global widgets (basket FAB, wallet chip,
 * pine-tree GroundskeeperWidget) -- hidden while a stall interior is open
 * (AppContext.stallInteriorOpen) since its own fixed bottom tile strip has
 * no room to coexist with them. Farm-Stalls batch 2, item 1.
 */
function GlobalChrome() {
  const { stallInteriorOpen } = useAppContext();
  if (stallInteriorOpen) return null;
  return (
    <>
      <FloatingBasketButton />
      <TileErrorBoundary name="wallet balance" inline><WalletBalanceChip /></TileErrorBoundary>
      <GroundskeeperWidget />
    </>
  );
}

const App = () => (
  <EnhancedErrorBoundary onError={(error) => {
    logError('AuthProvider subtree error', { message: error.message, stack: error.stack });
  }}>
    <AuthProvider>
      <AppContextProvider>
        <VisualEditorProvider>
        <CallManagerProvider>
        <BasketProvider>
            <ProductBasketProvider>
              <AlbumBuilderProvider>
                <LiveSessionPlaylistProvider>
                  <TooltipProvider>
              <ThemeProvider defaultTheme="system" storageKey="sow2grow-ui-theme">
                <NavigationMonitor />
                <DeadLinkDetector />
                <Toaster />
                <Sonner />
                <SolanaPaymentHost />
                <AudioUnlocker />
                <SoundUnlockBanner />
                <BuildUpdateBanner />
                <NotificationBanner />
                <PayoutSetupBanner />
                <SacredDayBanner />
                <ReferralCaptureMount />
                <IncomingCallOverlay />
                <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <AccessibilityChecker />
                      <ResponsiveLayout>
                        <AppRoutes />
                        <GlobalChrome />
                      </ResponsiveLayout>

                    </Suspense>
                </ErrorBoundary>
              </ThemeProvider>
                  </TooltipProvider>
                </LiveSessionPlaylistProvider>
              </AlbumBuilderProvider>
            </ProductBasketProvider>
          </BasketProvider>
          </CallManagerProvider>
        </VisualEditorProvider>
      </AppContextProvider>
    </AuthProvider>
  </EnhancedErrorBoundary>
);

export default App;
