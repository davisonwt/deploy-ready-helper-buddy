import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import ResponsiveLayout from "./components/layout/ResponsiveLayout";
import AccessibilityChecker from "./components/accessibility/AccessibilityChecker";
import IncomingCallOverlay from "./components/chat/IncomingCallOverlay";
import AudioUnlocker from "./components/audio/AudioUnlocker";
import SoundUnlockBanner from "./components/audio/SoundUnlockBanner";
import SacredDayBanner from "./components/SacredDayBanner";
import { useReferralCapture } from "./hooks/useReferralCapture";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { ProductBasketProvider } from "./contexts/ProductBasketContext";
import { AlbumBuilderProvider } from "./contexts/AlbumBuilderContext";
import { LiveSessionPlaylistProvider } from "./contexts/LiveSessionPlaylistContext";
import { AppContextProvider } from "./contexts/AppContext";
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
import AppRoutes, { LoadingFallback } from "./routes/AppRoutes";

function ReferralCaptureMount() {
  useReferralCapture();
  return null;
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
                <AudioUnlocker />
                <SoundUnlockBanner />
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
                        <GroundskeeperWidget />
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
