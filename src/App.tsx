import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
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
import SacredDayBanner from "./components/SacredDayBanner";
import { useReferralCapture } from "./hooks/useReferralCapture";

function ReferralCaptureMount() {
  useReferralCapture();
  return null;
}

const EnhancedAnalyticsDashboard = lazy(() => import('./components/admin/EnhancedAnalyticsDashboard'));
const UserManagementDashboard = lazy(() => import('./components/admin/UserManagementDashboard'));
const ContentModerationDashboard = lazy(() => import('./components/admin/ContentModerationDashboard'));
const CommissionDashboard = lazy(() => import('./components/marketing/CommissionDashboard'));
const GamificationDashboard = lazy(() => import('./components/gamification/GamificationDashboard'));
const AdvancedSearchPage = lazy(() => import('./pages/AdvancedSearchPage'));
const MyTribePage = lazy(() => import('./pages/MyTribePage'));

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const ChatApp = lazy(() => import("./pages/ChatApp"));
const GroveFeedPage = lazy(() => import("./pages/GroveFeedPage"));
const CommunicationsHub = lazy(() =>
  import("./pages/CommunicationsHub").catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load CommunicationsHub:', error);
    }
    return {
      default: () => (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Error Loading Communications Hub</h1>
            <p className="text-muted-foreground mb-4">Failed to load the Communications Hub module.</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Reload Page</button>
          </div>
        </div>
      )
    };
  })
);
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const BulkUploadWizardPage = lazy(() => import("./pages/BulkUploadWizardPage"));
const BulkSowerPage = lazy(() => import("./pages/BulkSowerPage"));
const BulkSeedFeedPage = lazy(() => import("./pages/BulkSeedFeedPage"));
const BulkProductDetailPage = lazy(() => import("./pages/BulkProductDetailPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BrowseOrchardsPage = lazy(() => import("./pages/BrowseOrchardsPage"));
const TribalAliveFeedPage = lazy(() => import("./pages/TribalAliveFeedPage"));
const LiveRoomDetailPage = lazy(() => import("./pages/LiveRoomDetailPage"));
const LiveLoungePage = lazy(() => import("./pages/LiveLoungePage"));
const OrchardPage = lazy(() => import("./pages/OrchardPage"));
const CreateOrchardPage = lazy(() => import("./pages/CreateOrchardPage"));
const MyOrchardsPage = lazy(() => import("./pages/MyOrchardsPage"));
const BasketPage = lazy(() => import("./pages/BasketPage"));
const EditOrchardPage = lazy(() => import("./pages/EditOrchardPage"));
const PremiumRoomsLanding = lazy(() => import("./pages/PremiumRoomsLanding"));
const PremiumRoomViewPage = lazy(() => import("./pages/PremiumRoomViewPage"));
const EditPremiumRoomPage = lazy(() => import("./pages/EditPremiumRoomPage"));
const AnimatedOrchardPage = lazy(() => import("./pages/AnimatedOrchardPage"));
const OrchardCreatedPage = lazy(() => import("./pages/OrchardCreatedPage"));
const OrchardErrorPage = lazy(() => import("./pages/OrchardErrorPage"));
const TithingPage = lazy(() => import("./pages/TithingPage"));
const PaymentCancelledPage = lazy(() => import("./pages/PaymentCancelledPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const FreeWillGiftingPage = lazy(() => import("./pages/FreeWillGiftingPage"));
const SeedSubmissionPage = lazy(() => import("./pages/SeedSubmissionPage"));
const YhvhOrchardsPage = lazy(() => import("./pages/YhvhOrchardsPage"));
const Yhvh364Page = lazy(() => import("./pages/Yhvh364Page"));
const RadioSlotApplicationPage = lazy(() => import("./pages/RadioSlotApplicationPage"));
const PremiumRoomsPage = lazy(() => import("./pages/PremiumRoomsPage"));
const CommunityVideosPage = lazy(() => import("./pages/CommunityVideosPage"));
const MarketingVideosGallery = lazy(() => import("./pages/MarketingVideosGallery.jsx"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const CompanionsHubPage = lazy(() => import("./pages/CompanionsHubPage"));
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
const BinancePayTestPage = lazy(() => import("./pages/BinancePayTestPage"));
const SowerProfile = lazy(() => import("./pages/SowerProfile"));
const RadioSessions = lazy(() => import("./pages/RadioSessions"));
const LiveRooms = lazy(() => import("./pages/LiveRooms"));
const RadioGenerator = lazy(() => import("./pages/RadioGenerator"));
const LiveRoomsPage = lazy(() => import("./pages/LiveRoomsPage"));
const CreateLiveRoomPage = lazy(() => import("./pages/CreateLiveRoomPage"));
const SupportUsPage = lazy(() => import("./pages/SupportUsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const MyProductsPage = lazy(() => import("./pages/MyProductsPage"));
const UploadForm = lazy(() => import("./components/products/UploadForm"));
const SellerCredentialsPage = lazy(() => import("./pages/SellerCredentialsPage"));
const TribalHeartsPage = lazy(() => import("./pages/TribalHeartsPage"));
const AdminCredentialsPage = lazy(() => import("./pages/AdminCredentialsPage"));
const AdminAttachCoversPage = lazy(() => import("./pages/AdminAttachCoversPage"));
const EditForm = lazy(() => import("./components/products/EditForm"));
const ProductBasketPage = lazy(() => import("./pages/ProductBasketPage"));
const MusicLibraryPage = lazy(() =>
  import("./pages/MusicLibraryPage").catch((error) => {
    console.error('Failed to load MusicLibraryPage:', error);
    return Promise.resolve({
      default: () => (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Failed to load Music Library</h2>
          <p className="mb-4">Please refresh the page or try again later.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-500 text-white">Refresh Page</button>
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
const EternalForestPage = lazy(() => import("./pages/EternalForestPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminRadioPage = lazy(() => import("./pages/AdminRadioPage"));
const AdminSeedsPage = lazy(() => import("./pages/AdminSeedsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AuthDebugPage = lazy(() => import("./pages/AuthDebugPage"));
const LiveSeedPage = lazy(() => import("./pages/LiveSeedPage"));
const LearnSharePage = lazy(() => import("./pages/LearnSharePage"));
const WanderingDirectoryPage = lazy(() => import("./pages/WanderingDirectoryPage"));
import ProtectedRoute from "./components/ProtectedRoute";
import { RequireVerification } from "./components/auth/RequireVerification";
import Layout from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { ProductBasketProvider } from "./contexts/ProductBasketContext";
import { AlbumBuilderProvider } from "./contexts/AlbumBuilderContext";
import { LiveSessionPlaylistProvider } from "./contexts/LiveSessionPlaylistContext";
import { AppContextProvider } from "./contexts/AppContext";
import { VisualEditorProvider } from "./contexts/VisualEditorContext";
import { EditorModeToggle } from "./components/visual-editor/EditorModeToggle";
import LiveActivityWidget from "./components/LiveActivityWidget";
import FloatingBasketButton from "./components/products/FloatingBasketButton";
import "./utils/errorDetection";
import "./utils/cookieConfig";
import { CallManagerProvider } from '@/providers/CallManagerProvider';
import EnhancedErrorBoundary from "@/components/error/EnhancedErrorBoundary";
import { logError } from "@/lib/logging";
import { NavigationMonitor } from "@/components/monitoring/NavigationMonitor";
import { DeadLinkDetector } from "@/components/monitoring/DeadLinkDetector";
import { NotificationBanner } from "@/components/NotificationBanner";
import GroundskeeperWidget from "@/components/grove/GroundskeeperWidget";
const PlantASeedPage = lazy(() => import("./pages/PlantASeedPage"));

const LoadingFallback = () => (
  <Card className="m-4">
    <CardContent className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">Loading...</span>
    </CardContent>
  </Card>
);

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
                <SacredDayBanner />
                <ReferralCaptureMount />
                <IncomingCallOverlay />
                <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                      <AccessibilityChecker />
                      <ResponsiveLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/start-your-journey" element={<RegisterPage />} />
              <Route path="/ambassador-thumbnail" element={<AmbassadorThumbnailPage />} />
              <Route path="/gosat-ghost-access-thumbnail" element={<GoSatGhostAccessThumbnailPage />} />
              <Route path="/tequfah-clock" element={<TrueTequfahClock />} />
              <Route path="/sow2grow-calendar" element={<Sow2GrowCalendarPage />} />
              <Route path="/enochian-calendar-design" element={
                <Layout><Suspense fallback={<LoadingFallback />}><EnochianCalendarDesignPage /></Suspense></Layout>
              } />
              <Route path="/auth-debug" element={
                <Suspense fallback={<div>Loading...</div>}><AuthDebugPage /></Suspense>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <DashboardPage />
                  </RequireVerification>
                </ProtectedRoute>
              } />
              <Route path="/dashboard/sower/upload" element={
                <ProtectedRoute>
                  <RequireVerification>
                    <Suspense fallback={<LoadingFallback />}><BulkUploadWizardPage /></Suspense>
                  </RequireVerification>
                </ProtectedRoute>
              } />
              <Route path="/bulk/sower/:slug" element={
                <Suspense fallback={<LoadingFallback />}><BulkSowerPage /></Suspense>
              } />
              <Route path="/bulk/sower/:slug/feed" element={
                <Suspense fallback={<LoadingFallback />}><BulkSeedFeedPage /></Suspense>
              } />
              <Route path="/bulk/products/:slug" element={
                <Suspense fallback={<LoadingFallback />}><BulkProductDetailPage /></Suspense>
              } />
              <Route path="/stats" element={
                <ProtectedRoute><RequireVerification><StatsPage /></RequireVerification></ProtectedRoute>
              } />
              <Route path="/regrow-access" element={
                <ProtectedRoute><RequireVerification><Layout><BrowseOrchardsPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/tribal-hearts" element={
                <ProtectedRoute><RequireVerification><TribalHeartsPage /></RequireVerification></ProtectedRoute>
              } />
              <Route path="/browse-orchards" element={
                <ProtectedRoute><RequireVerification><BrowseOrchardsPage /></RequireVerification></ProtectedRoute>
              } />
              <Route path="/orchard-alive" element={
                <ProtectedRoute><RequireVerification><Layout><TribalAliveFeedPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/live/:seedId/room" element={
                <ProtectedRoute><RequireVerification><LiveRoomDetailPage /></RequireVerification></ProtectedRoute>
              } />
              <Route path="/seed/:seedId" element={
                <ProtectedRoute><RequireVerification><LiveRoomDetailPage /></RequireVerification></ProtectedRoute>
              } />
              <Route path="/live-lounge" element={
                <ProtectedRoute><Layout><LiveLoungePage /></Layout></ProtectedRoute>
              } />
              <Route path="/live-lounge" element={
                <ProtectedRoute><Layout><LiveLoungePage /></Layout></ProtectedRoute>
              } />
              <Route path="/orchards/:orchardId" element={
                <ProtectedRoute><RequireVerification><Layout><OrchardPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/orchard/:orchardId" element={
                <ProtectedRoute><RequireVerification><Layout><OrchardPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/animated-orchard/:id" element={
                <ProtectedRoute><RequireVerification><Layout><AnimatedOrchardPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/orchard-error/:orchardId" element={
                <ProtectedRoute><RequireVerification><Layout><OrchardErrorPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/create-orchard" element={
                <ProtectedRoute><RequireVerification><Layout><CreateOrchardPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/plant-new-seed" element={
                <ProtectedRoute><RequireVerification><Layout><CreateOrchardPage /></Layout></RequireVerification></ProtectedRoute>
              } />
              <Route path="/edit-orchard/:orchardId" element={
                <ProtectedRoute><Layout><EditOrchardPage /></Layout></ProtectedRoute>
              } />
              <Route path="/orchard-created" element={
                <ProtectedRoute><Layout><OrchardCreatedPage /></Layout></ProtectedRoute>
              } />
              <Route path="/my-orchards" element={
                <ProtectedRoute><MyOrchardsPage /></ProtectedRoute>
              } />
              <Route path="/live-seed/:orchardId" element={
                <ProtectedRoute><LiveSeedPage /></ProtectedRoute>
              } />
              <Route path="/learn-share" element={
                <ProtectedRoute><LearnSharePage /></ProtectedRoute>
              } /><Route path="/wandering-directory" element={
              <ProtectedRoute><WanderingDirectoryPage /></ProtectedRoute>
              } />
              <Route path="/tithing" element={
                <ProtectedRoute><TithingPage /></ProtectedRoute>
              } />
              <Route path="/tithing-2" element={
                <ProtectedRoute><TithingPage /></ProtectedRoute>
              } />
              <Route path="/free-will-gifting" element={
                <ProtectedRoute><FreeWillGiftingPage /></ProtectedRoute>
              } />
              <Route path="/seed-submission" element={
                <ProtectedRoute><Layout><SeedSubmissionPage /></Layout></ProtectedRoute>
              } />
              <Route path="/364yhvh-days" element={
                <ProtectedRoute><Yhvh364Page /></ProtectedRoute>
              } />
              <Route path="/364yhvh-orchards" element={
                <ProtectedRoute><YhvhOrchardsPage /></ProtectedRoute>
              } />
              <Route path="/grove-feed" element={
                <ProtectedRoute><Layout><GroveFeedPage /></Layout></ProtectedRoute>
              } />
              <Route path="/communications-hub" element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-xl">Loading...</div></div>}>
                    <CommunicationsHub />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/chatapp" element={<Navigate to="/communications-hub#chats" replace />} />
              <Route path="/radio-slot-application" element={
                <ProtectedRoute><Layout><RadioSlotApplicationPage /></Layout></ProtectedRoute>
              } />
              <Route path="/premium-rooms" element={
                <ProtectedRoute><Layout><PremiumRoomsLanding /></Layout></ProtectedRoute>
              } />
              <Route path="/premium-room/:id" element={
                <ProtectedRoute><Layout><PremiumRoomViewPage /></Layout></ProtectedRoute>
              } />
              <Route path="/premium-room/:id/edit" element={
                <ProtectedRoute><Layout><EditPremiumRoomPage /></Layout></ProtectedRoute>
              } />
              <Route path="/community-videos" element={
                <ProtectedRoute><Layout><CommunityVideosPage /></Layout></ProtectedRoute>
              } />
              <Route path="/marketing-videos" element={
                <ProtectedRoute><Layout><MarketingVideosGallery /></Layout></ProtectedRoute>
              } />
              <Route path="/grove-station" element={
                <ProtectedRoute><Layout><GroveStationPage /></Layout></ProtectedRoute>
              } />
              <Route path="/radio-management" element={
                <ProtectedRoute allowedRoles={['radio_admin', 'admin', 'gosat']}>
                  <Layout><RadioManagementPage /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/music-library" element={
                <Layout><Suspense fallback={<LoadingFallback />}><MusicLibraryPage /></Suspense></Layout>
              } />
              <Route path="/apply-radio-slot" element={
                <ProtectedRoute><Layout><RadioSlotApplicationPage /></Layout></ProtectedRoute>
              } />
              <Route path="/create-premium-room" element={
                <ProtectedRoute><Layout><CreatePremiumRoomPage /></Layout></ProtectedRoute>
              } />
              <Route path="/radio" element={
                <ProtectedRoute><Layout><RadioPage /></Layout></ProtectedRoute>
              } />
              <Route path="/sower/:id" element={
                <ProtectedRoute><Layout><SowerProfile /></Layout></ProtectedRoute>
              } />
              <Route path="/radio-sessions" element={
                <ProtectedRoute><Layout><RadioSessions /></Layout></ProtectedRoute>
              } />
              <Route path="/live-rooms" element={
                <ProtectedRoute><Layout><LiveRooms /></Layout></ProtectedRoute>
              } />
              <Route path="/radio-generator" element={
                <ProtectedRoute><Layout><RadioGenerator /></Layout></ProtectedRoute>
              } />
              <Route path="/clubhouse" element={
                <ProtectedRoute><ClubhousePage /></ProtectedRoute>
              } />
              <Route path="/video/:id" element={<VideoPage />} />
              <Route path="/upload" element={
                <ProtectedRoute requireAuth><VideoUploadPage /></ProtectedRoute>
              } />
              <Route path="/ai-assistant" element={
                <ProtectedRoute><Layout><CreateOrchardPage /></Layout></ProtectedRoute>
              } />
              <Route path="/companions" element={
                <ProtectedRoute><Suspense fallback={<div>Loading...</div>}><CompanionsHubPage /></Suspense></ProtectedRoute>
              } />
              <Route path="/community-offering" element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}><CommunityOfferingPage /></Suspense>
                </ProtectedRoute>
              } />
              <Route path="/support-us" element={
                <ProtectedRoute><Layout><Suspense fallback={<div>Loading...</div>}><SupportUsPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/admin/payments" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Suspense fallback={<div>Loading...</div>}><AdminPaymentsPage /></Suspense>
                </ProtectedRoute>
              } />
              <Route path="/gosat/wallets" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout><Suspense fallback={<LoadingFallback />}><GosatWalletsPage /></Suspense></Layout>
                </ProtectedRoute>
              } />
              <Route path="/basket" element={
                <ProtectedRoute><Layout><BasketPage /></Layout></ProtectedRoute>
              } />
              <Route path="/test-basket" element={
                <ProtectedRoute><Layout><TestBasketPage /></Layout></ProtectedRoute>
              } />
              <Route path="/app-flow" element={
                <ProtectedRoute><Layout><BrowseOrchardsPage /></Layout></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
              } />
              <Route path="/wallet-settings" element={
                <ProtectedRoute><Layout><WalletSettingsPage /></Layout></ProtectedRoute>
              } />
              <Route path="/binance-pay-test" element={
                <ProtectedRoute><Layout><BinancePayTestPage /></Layout></ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute><Layout><AdminAnalyticsPage /></Layout></ProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Suspense fallback={<div>Loading...</div>}><AdminDashboardPage /></Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/radio" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout><Suspense fallback={<LoadingFallback />}><AdminRadioPage /></Suspense></Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/seeds" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout><Suspense fallback={<LoadingFallback />}><AdminSeedsPage /></Suspense></Layout>
                </ProtectedRoute>
              } />
              <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/commissions" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><CommissionDashboard /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/my-tribe" element={
                <ProtectedRoute><Suspense fallback={<LoadingFallback />}><MyTribePage /></Suspense></ProtectedRoute>
              } />
              <Route path="/achievements" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><GamificationDashboard /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/eternal-forest" element={
                <ProtectedRoute><Suspense fallback={<LoadingFallback />}><EternalForestPage /></Suspense></ProtectedRoute>
              } />
              <Route path="/search" element={
                <Layout><Suspense fallback={<LoadingFallback />}><AdvancedSearchPage /></Suspense></Layout>
              } />
              <Route path="/live-rooms" element={
                <Layout><LiveRoomsPage /></Layout>
              } />
              <Route path="/create-live-room" element={
                <ProtectedRoute><Layout><CreateLiveRoomPage /></Layout></ProtectedRoute>
              } />
              <Route path="/products" element={
                <Layout><Suspense fallback={<LoadingFallback />}><ProductsPage /></Suspense></Layout>
              } />
              <Route path="/my-products" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><MyProductsPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/products/upload" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><UploadForm /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/seller/credentials" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><SellerCredentialsPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/admin/credentials" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><AdminCredentialsPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/admin/attach-covers" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><AdminAttachCoversPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/products/edit/:id" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><EditForm /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/products/basket" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><ProductBasketPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/my-s2g-library" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><MyS2GLibraryPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/my-s2g-library/upload" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><LibraryUploadForm /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="/s2g-community-library" element={
                <Layout><Suspense fallback={<LoadingFallback />}><S2GCommunityLibraryPage /></Suspense></Layout>
              } />
              <Route path="/s2g-community-music" element={
                <Layout><Suspense fallback={<LoadingFallback />}><S2GCommunityMusicPage /></Suspense></Layout>
              } />
              <Route path="/plant-a-seed" element={
                <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><PlantASeedPage /></Suspense></Layout></ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
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