import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import ResponsiveLayout from "./components/layout/ResponsiveLayout";
import OnboardingTour from "./components/onboarding/OnboardingTour";
import HelpModal from "./components/help/HelpModal";
import AccessibilityChecker from "./components/accessibility/AccessibilityChecker";
import { Card, CardContent } from "@/components/ui/card";
import IncomingCallOverlay from "./components/chat/IncomingCallOverlay";
import AudioUnlocker from "./components/audio/AudioUnlocker";
import SoundUnlockBanner from "./components/audio/SoundUnlockBanner";

// Lazy load heavy components for better performance
const EnhancedAnalyticsDashboard = lazy(() => import('./components/admin/EnhancedAnalyticsDashboard'));
const UserManagementDashboard = lazy(() => import('./components/admin/UserManagementDashboard'));
const ContentModerationDashboard = lazy(() => import('./components/admin/ContentModerationDashboard'));
const CommissionDashboard = lazy(() => import('./components/marketing/CommissionDashboard'));
const GamificationDashboard = lazy(() => import('./components/gamification/GamificationDashboard'));
const AdvancedSearchPage = lazy(() => import('./pages/AdvancedSearchPage'));

// CRITICAL PATH: Only load auth pages immediately
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// DEFERRED LOADING: All other pages lazy loaded
const ChatApp = lazy(() => import("./pages/ChatApp"));
const GroveFeedPage = lazy(() => import("./pages/GroveFeedPage"));
const CommunicationsHub = lazy(() => 
  import("./pages/CommunicationsHub").catch((error) => {
    // Log error for debugging but don't expose to user in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load CommunicationsHub:', error);
    }
    return {
      default: () => (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Error Loading Communications Hub</h1>
            <p className="text-muted-foreground mb-4">Failed to load the Communications Hub module.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    };
  })
);
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BrowseOrchardsPage = lazy(() => import("./pages/BrowseOrchardsPage"));
const OrchardPage = lazy(() => import("./pages/OrchardPage"));
const CreateOrchardPage = lazy(() => import("./pages/CreateOrchardPage"));
const MyOrchardsPage = lazy(() => import("./pages/MyOrchardsPage"));
const BasketPage = lazy(() => import("./pages/BasketPage"));
const EditOrchardPage = lazy(() => import("./pages/EditOrchardPage"));
const PremiumRoomsLanding = lazy(() => import("./pages/PremiumRoomsLanding"));
const PremiumRoomViewPage = lazy(() => import("./pages/PremiumRoomViewPage"));
const EditPremiumRoomPage = lazy(() => import("./pages/EditPremiumRoomPage"));

// Lazy load secondary pages for better performance
const AnimatedOrchardPage = lazy(() => import("./pages/AnimatedOrchardPage"));
const OrchardCreatedPage = lazy(() => import("./pages/OrchardCreatedPage"));
const OrchardErrorPage = lazy(() => import("./pages/OrchardErrorPage"));
const TithingPage = lazy(() => import("./pages/TithingPage"));
const PaymentCancelledPage = lazy(() => import("./pages/PaymentCancelledPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const FreeWillGiftingPage = lazy(() => import("./pages/FreeWillGiftingPage"));
const SeedSubmissionPage = lazy(() => import("./pages/SeedSubmissionPage"));
const YhvhOrchardsPage = lazy(() => import("./pages/YhvhOrchardsPage"));
const RadioSlotApplicationPage = lazy(() => import("./pages/RadioSlotApplicationPage"));
const PremiumRoomsPage = lazy(() => import("./pages/PremiumRoomsPage"));
const CommunityVideosPage = lazy(() => import("./pages/CommunityVideosPage"));
const MarketingVideosGallery = lazy(() => import("./pages/MarketingVideosGallery.jsx"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const CommunityOfferingPage = lazy(() => import("./pages/CommunityOfferingPage"));
const TestBasketPage = lazy(() => import("./pages/TestBasketPage"));
const GroveStationPage = lazy(() => import("./pages/GroveStationPage"));
const RadioManagementPage = lazy(() => import("./pages/RadioManagementPage"));
const ClubhousePage = lazy(() => import("./pages/ClubhousePage"));
const VideoPage = lazy(() => import("./pages/VideoPage"));
const VideoUploadPage = lazy(() => import("./pages/VideoUploadPage"));
const RadioPage = lazy(() => import("./components/radio/RadioPage"));
const CreatePremiumRoomPage = lazy(() => import("./pages/CreatePremiumRoomPage").then(m => ({ default: m.CreatePremiumRoomPage })));
const WalletSettingsPage = lazy(() => import("./pages/WalletSettingsPage"));
const GosatWalletsPage = lazy(() => import("./pages/GosatWalletsPage"));
// BinancePayTestPage removed - using NOWPayments only
const SowerProfile = lazy(() => import("./pages/SowerProfile"));
const RadioSessions = lazy(() => import("./pages/RadioSessions"));
const LiveRooms = lazy(() => import("./pages/LiveRooms"));
const RadioGenerator = lazy(() => import("./pages/RadioGenerator"));
const LiveRoomsPage = lazy(() => import("./pages/LiveRoomsPage"));
const CreateLiveRoomPage = lazy(() => import("./pages/CreateLiveRoomPage"));
const SupportUsPage = lazy(() => import("./pages/SupportUsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const MyProductsPage = lazy(() => import("./pages/MyProductsPage"));
const BecomeWhispererPage = lazy(() => import("./pages/BecomeWhispererPage"));
const UploadForm = lazy(() => import("./components/products/UploadForm"));
const EditForm = lazy(() => import("./components/products/EditForm"));
const ProductBasketPage = lazy(() => import("./pages/ProductBasketPage"));
const MusicLibraryPage = lazy(() => 
  import("./pages/MusicLibraryPage").catch((error) => {
    console.error('Failed to load MusicLibraryPage:', error);
    // Return a fallback component module
    return Promise.resolve({
      default: () => (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Failed to load Music Library</h2>
          <p className="mb-4">Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white"
          >
            Refresh Page
          </button>
        </div>
      )
    });
  })
);
const MyS2GLibraryPage = lazy(() => import("./pages/MyS2GLibraryPage"));
const S2GCommunityLibraryPage = lazy(() => import("./pages/S2GCommunityLibraryPage"));
const S2GCommunityMusicPage = lazy(() => import("./pages/S2GCommunityMusicPage"));
const LibraryUploadForm = lazy(() => import("./components/library/LibraryUploadForm"));
const AmbassadorThumbnailPage = lazy(() => import("./pages/AmbassadorThumbnailPage"));
const GoSatGhostAccessThumbnailPage = lazy(() => import("./pages/GoSatGhostAccessThumbnailPage"));
const TrueTequfahClock = lazy(() => import("./components/TrueTequfahClock"));
const Sow2GrowCalendarPage = lazy(() => import("./pages/Sow2GrowCalendarPage"));
const EnochianCalendarDesignPage = lazy(() => import("./pages/EnochianCalendarDesignPage"));
const WheelsInItselfPage = lazy(() => import("./pages/WheelsInItselfPage"));
const EternalForestPage = lazy(() => import("./pages/EternalForestPage"));
const MemryPage = lazy(() => import("./pages/MemryPage"));

// 364ttt - Weekly Torah Top Ten
const TorahTopTenPage = lazy(() => import("./pages/TorahTopTenPage"));
const VotingPage = lazy(() => import("./pages/VotingPage"));
const AlbumDetailPage = lazy(() => import("./pages/AlbumDetailPage"));

// Lazy load admin pages (only accessed by admins)
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminRadioPage = lazy(() => import("./pages/AdminRadioPage"));
const AdminSeedsPage = lazy(() => import("./pages/AdminSeedsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AuthDebugPage = lazy(() => import("./pages/AuthDebugPage"));

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import AnonymousSupportGate from "@/components/auth/AnonymousSupportGate";
import { RequireVerification } from "./components/auth/RequireVerification";
import Layout from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { ProductBasketProvider } from "./contexts/ProductBasketContext";
import { AlbumBuilderProvider } from "./contexts/AlbumBuilderContext";
import { LiveSessionPlaylistProvider } from "./contexts/LiveSessionPlaylistContext";
import { AppContextProvider } from "./contexts/AppContext";
import { VisualEditorProvider } from "./contexts/VisualEditorContext";
// EditorModeToggle removed per user request
import LiveActivityWidget from "./components/LiveActivityWidget";
import FloatingBasketButton from "./components/products/FloatingBasketButton";
import "./utils/errorDetection"; // Initialize error detection
import "./utils/cookieConfig"; // Configure cookie policy
import { CallManagerProvider } from '@/providers/CallManagerProvider';
import EnhancedErrorBoundary from "@/components/error/EnhancedErrorBoundary";
import { logError } from "@/lib/logging";
import { NavigationMonitor } from "@/components/monitoring/NavigationMonitor";
import { DeadLinkDetector } from "@/components/monitoring/DeadLinkDetector";
import { NotificationBanner } from "@/components/NotificationBanner";

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <Card className="m-4">
    <CardContent className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">Loading...</span>
    </CardContent>
  </Card>
);

// Legacy route redirect helper (preserves query/hash)
const LegacyCommunicationsRedirect: React.FC<{ defaultHash?: string }> = ({ defaultHash }) => {
  const location = useLocation();
  const hash = location.hash || defaultHash || "";
  return <Navigate to={`/communications-hub${location.search}${hash}`} replace />;
};

const CommunicationsHubEntry: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const support = params.get("support");

  if (support === "password-reset") {
    return (
      <AnonymousSupportGate>
        <CommunicationsHub />
      </AnonymousSupportGate>
    );
  }

  return (
    <ProtectedRoute>
      <CommunicationsHub />
    </ProtectedRoute>
  );
};

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
                {/* EditorModeToggle removed */}
                <NavigationMonitor />
                <DeadLinkDetector />
                <Toaster />
                <Sonner />
                <AudioUnlocker />
                <SoundUnlockBanner />
                <NotificationBanner />
                <IncomingCallOverlay />
                <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <AccessibilityChecker />
                      <ResponsiveLayout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/start-your-journey" element={<RegisterPage />} />
              <Route path="/ambassador-thumbnail" element={<AmbassadorThumbnailPage />} />
              <Route path="/gosat-ghost-access-thumbnail" element={<GoSatGhostAccessThumbnailPage />} />
              <Route path="/tequfah-clock" element={<TrueTequfahClock />} />
              <Route path="/sow2grow-calendar" element={<Sow2GrowCalendarPage />} />
              <Route path="/enochian-calendar-design" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <EnochianCalendarDesignPage />
                  </Suspense>
                </Layout>
              } />
              <Route path="/wheels-in-itself" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <WheelsInItselfPage />
                  </Suspense>
                </Layout>
              } />
              
              {/* Debug route for auth issues */}
              <Route path="/auth-debug" element={
                <Suspense fallback={<div>Loading...</div>}>
                  <AuthDebugPage />
                </Suspense>
              } />
              
              {/* Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/stats" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <StatsPage />
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/regrow-access" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <BrowseOrchardsPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              {/* Orchard Routes */}
              <Route path="/browse-orchards" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <BrowseOrchardsPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/orchards/:orchardId" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <OrchardPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              {/* Legacy orchard route redirect */}
              <Route path="/orchard/:orchardId" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <OrchardPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/animated-orchard/:id" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <AnimatedOrchardPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/orchard-error/:orchardId" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <OrchardErrorPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              {/* Orchard Management Routes */}
              <Route path="/create-orchard" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <CreateOrchardPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/plant-new-seed" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Layout>
                      <CreateOrchardPage />
                    </Layout>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              
              <Route path="/edit-orchard/:orchardId" element={
                <ProtectedRoute>
                  <Layout>
                    <EditOrchardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/orchard-created" element={
                <ProtectedRoute>
                  <Layout>
                    <OrchardCreatedPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* My Orchards */}
              <Route path="/my-orchards" element={
                <ProtectedRoute>
                  <Layout>
                    <MyOrchardsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Financial Routes */}
              <Route path="/tithing" element={
                <ProtectedRoute>
                  <Layout>
                    <TithingPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/tithing-2" element={
                <ProtectedRoute>
                  <Layout>
                    <TithingPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Free Will Gifting */}
              <Route path="/free-will-gifting" element={
                <ProtectedRoute>
                  <Layout>
                    <FreeWillGiftingPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Seed Submission */}
              <Route path="/seed-submission" element={
                <ProtectedRoute>
                  <Layout>
                    <SeedSubmissionPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* 364yhvh Orchards */}
              <Route path="/364yhvh-orchards" element={
                <ProtectedRoute>
                  <Layout>
                    <YhvhOrchardsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Grove Feed - Unified Discovery Feed */}
              <Route path="/grove-feed" element={
                <ProtectedRoute>
                  <Layout>
                    <GroveFeedPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Legacy alias: /communications -> /communications-hub (preserve query/hash) */}
              <Route path="/communications" element={<LegacyCommunicationsRedirect />} />

              {/* Communications Hub - Unified Interface */}
              <Route path="/communications-hub/*" element={
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-xl">Loading Communications Hub...</div></div>}>
                  <CommunicationsHubEntry />
                </Suspense>
              } />
              
              {/* ChatApp - Redirect to Communications Hub */}
              <Route path="/chatapp" element={
                <Navigate to="/communications-hub#chats" replace />
              } />
              
              {/* Radio Slot Application - Keep functional */}
              <Route path="/radio-slot-application" element={
                <ProtectedRoute>
                  <Layout>
                    <RadioSlotApplicationPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Premium Rooms Landing - Keep functional */}
               <Route path="/premium-rooms" element={
                <ProtectedRoute>
                  <Layout>
                    <PremiumRoomsLanding />
                  </Layout>
                </ProtectedRoute>
              } />
               
               <Route path="/premium-room/:id" element={
                 <ProtectedRoute>
                   <Layout>
                     <PremiumRoomViewPage />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               <Route path="/premium-room/:id/edit" element={
                 <ProtectedRoute>
                   <Layout>
                     <EditPremiumRoomPage />
                   </Layout>
                 </ProtectedRoute>
               } />
              
               {/* Community Videos */}
                <Route path="/community-videos" element={
                  <ProtectedRoute>
                    <Layout>
                      <CommunityVideosPage />
                    </Layout>
                  </ProtectedRoute>
                 } />

                {/* Marketing Videos Gallery */}
                <Route path="/marketing-videos" element={
                  <ProtectedRoute>
                    <Layout>
                      <MarketingVideosGallery />
                    </Layout>
                  </ProtectedRoute>
                 } />

               {/* Grove Station - 24hr Radio */}
              <Route path="/grove-station" element={
                <ProtectedRoute>
                  <Layout>
                    <GroveStationPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
               <Route path="/radio-management" element={
                <ProtectedRoute allowedRoles={['radio_admin', 'admin', 'gosat']}>
                  <Layout>
                    <RadioManagementPage />
                  </Layout>
                </ProtectedRoute>
               } />
               
               <Route path="/music-library" element={
                 <Layout>
                   <Suspense fallback={<LoadingFallback />}>
                     <MusicLibraryPage />
                   </Suspense>
                 </Layout>
               } />
               
               <Route path="/apply-radio-slot" element={
                 <ProtectedRoute>
                   <Layout>
                     <RadioSlotApplicationPage />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               <Route path="/create-premium-room" element={
                 <ProtectedRoute>
                   <Layout>
                     <CreatePremiumRoomPage />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               {/* Radio Station */}
               <Route path="/radio" element={
                 <ProtectedRoute>
                   <Layout>
                     <RadioPage />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               <Route path="/sower/:id" element={
                 <ProtectedRoute>
                   <Layout>
                     <SowerProfile />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               <Route path="/radio-sessions" element={
                 <ProtectedRoute>
                   <Layout>
                     <RadioSessions />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               <Route path="/live-rooms" element={
                 <ProtectedRoute>
                   <Layout>
                     <LiveRooms />
                   </Layout>
                 </ProtectedRoute>
               } />
               
               <Route path="/radio-generator" element={
                 <ProtectedRoute>
                   <Layout>
                     <RadioGenerator />
                   </Layout>
                 </ProtectedRoute>
               } />

               {/* Clubhouse - Live Audio Conversations */}
              <Route path="/clubhouse" element={
                <ProtectedRoute>
                  <ClubhousePage />
                </ProtectedRoute>
              } />

              {/* 364ttt - Weekly Torah Top Ten */}
              <Route path="/364ttt" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <TorahTopTenPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/364ttt/vote" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <VotingPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/364ttt/album/:weekId" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <AlbumDetailPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Video System */}
              <Route path="/video/:id" element={<VideoPage />} />
              <Route path="/upload" element={
                <ProtectedRoute requireAuth>
                  <VideoUploadPage />
                </ProtectedRoute>
              } />

               {/* AI Assistant - Redirect to Create Orchard */}
               <Route path="/ai-assistant" element={
                 <ProtectedRoute>
                   <Layout>
                     <CreateOrchardPage />
                   </Layout>
                 </ProtectedRoute>
               } />

               {/* Community Offering Generator */}
               <Route path="/community-offering" element={
                 <ProtectedRoute>
                   <Suspense fallback={<div>Loading...</div>}>
                     <CommunityOfferingPage />
                   </Suspense>
                 </ProtectedRoute>
               } />

              {/* Support Us */}
              <Route path="/support-us" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<div>Loading...</div>}>
                      <SupportUsPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Admin Payment Dashboard */}
              <Route path="/admin/payments" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Suspense fallback={<div>Loading...</div>}>
                    <AdminPaymentsPage />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Gosat Organization Wallets */}
              <Route path="/gosat/wallets" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <GosatWalletsPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/basket" element={
                <ProtectedRoute>
                  <Layout>
                    <BasketPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/test-basket" element={
                <ProtectedRoute>
                  <Layout>
                    <TestBasketPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/app-flow" element={
                <ProtectedRoute>
                  <Layout>
                    <BrowseOrchardsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* User Routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* s2g Memry - TikTok-like social media */}
              <Route path="/memry" element={
                <ProtectedRoute>
                  <Layout>
                    <MemryPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/wallet-settings" element={
                <ProtectedRoute>
                  <Layout>
                    <WalletSettingsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              {/* Binance Pay test page removed - using NOWPayments only */}
              
              {/* Admin Routes */}
              <Route path="/admin/analytics" element={
                <ProtectedRoute>
                  <Layout>
                    <AdminAnalyticsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout>
                    <AdminDashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout>
                    <Suspense fallback={<div>Loading...</div>}>
                      <AdminDashboardPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/radio" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <AdminRadioPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/seeds" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <AdminSeedsPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Payment Routes */}
              <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              
              <Route path="/commissions" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <CommissionDashboard />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/achievements" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <GamificationDashboard />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/eternal-forest" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <EternalForestPage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/search" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <AdvancedSearchPage />
                  </Suspense>
                </Layout>
              } />
              
              {/* Live Rooms Routes */}
              <Route path="/live-rooms" element={
                <Layout>
                  <LiveRoomsPage />
                </Layout>
              } />
              <Route path="/create-live-room" element={
                <ProtectedRoute>
                  <Layout>
                    <CreateLiveRoomPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Products/Marketplace Routes */}
              <Route path="/products" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <ProductsPage />
                  </Suspense>
                </Layout>
              } />
              <Route path="/my-products" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <MyProductsPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/products/upload" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <UploadForm />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/products/edit/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <EditForm />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/products/basket" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <ProductBasketPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Whisperer (Marketing Agent) Route */}
              <Route path="/become-whisperer" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <BecomeWhispererPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* S2G Library Routes */}
              <Route path="/my-s2g-library" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <MyS2GLibraryPage />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/my-s2g-library/upload" element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingFallback />}>
                      <LibraryUploadForm />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/s2g-community-library" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <S2GCommunityLibraryPage />
                  </Suspense>
                </Layout>
              } />
              <Route path="/s2g-community-music" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <S2GCommunityMusicPage />
                  </Suspense>
                </Layout>
              } />
              
              {/* Catch-all route - MUST BE LAST */}
              <Route path="*" element={<NotFound />} />
                  </Routes>
                  </ResponsiveLayout>
                  </Suspense>
                </ErrorBoundary>
              <LiveActivityWidget />
              <FloatingBasketButton />
              <OnboardingTour />
              <HelpModal />
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