import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import PerformanceMonitor from "./components/performance/PerformanceMonitor";
import ResponsiveLayout from "./components/layout/ResponsiveLayout";
import OnboardingTour from "./components/onboarding/OnboardingTour";
import HelpModal from "./components/help/HelpModal";
import AccessibilityChecker from "./components/accessibility/AccessibilityChecker";
import { Card, CardContent } from "@/components/ui/card";
import IncomingCallOverlay from "./components/chat/IncomingCallOverlay";
import GlobalAudioCallBridge from "./components/chat/GlobalAudioCallBridge";
import AudioUnlocker from "./components/audio/AudioUnlocker";
import SoundUnlockBanner from "./components/audio/SoundUnlockBanner";

// Lazy load heavy components for better performance
const EnhancedAnalyticsDashboard = lazy(() => import('./components/admin/EnhancedAnalyticsDashboard'));
const UserManagementDashboard = lazy(() => import('./components/admin/UserManagementDashboard'));
const ContentModerationDashboard = lazy(() => import('./components/admin/ContentModerationDashboard'));
const CommissionDashboard = lazy(() => import('./components/marketing/CommissionDashboard'));
const GamificationDashboard = lazy(() => import('./components/gamification/GamificationDashboard'));
const AdvancedSearchPage = lazy(() => import('./pages/AdvancedSearchPage'));

// Import critical pages (needed immediately to prevent React dispatcher errors from lazy loading)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatApp from "./pages/ChatApp";
import PremiumRoomsLanding from "./pages/PremiumRoomsLanding";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import BrowseOrchardsPage from "./pages/BrowseOrchardsPage";
import OrchardPage from "./pages/OrchardPage";
import CreateOrchardPage from "./pages/CreateOrchardPage";
import MyOrchardsPage from "./pages/MyOrchardsPage";
import BasketPage from "./pages/BasketPage";
import EditOrchardPage from "./pages/EditOrchardPage";

// Lazy load secondary pages for better performance
const AnimatedOrchardPage = lazy(() => import("./pages/AnimatedOrchardPage"));
const OrchardCreatedPage = lazy(() => import("./pages/OrchardCreatedPage"));
const OrchardErrorPage = lazy(() => import("./pages/OrchardErrorPage"));
const TithingPage = lazy(() => import("./pages/TithingPage"));
const PaymentCancelledPage = lazy(() => import("./pages/PaymentCancelledPage"));
const FreeWillGiftingPage = lazy(() => import("./pages/FreeWillGiftingPage"));
const SeedSubmissionPage = lazy(() => import("./pages/SeedSubmissionPage"));
const YhvhOrchardsPage = lazy(() => import("./pages/YhvhOrchardsPage"));
const RadioSlotApplicationPage = lazy(() => import("./pages/RadioSlotApplicationPage"));
const PremiumRoomsPage = lazy(() => import("./pages/PremiumRoomsPage"));
const CommunityVideosPage = lazy(() => import("./pages/CommunityVideosPage"));
const MarketingVideosGallery = lazy(() => import("./pages/MarketingVideosGallery.jsx"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const TestBasketPage = lazy(() => import("./pages/TestBasketPage"));
const GroveStationPage = lazy(() => import("./pages/GroveStationPage"));
const RadioManagementPage = lazy(() => import("./pages/RadioManagementPage"));
const ClubhousePage = lazy(() => import("./pages/ClubhousePage"));
const VideoPage = lazy(() => import("./pages/VideoPage"));
const VideoUploadPage = lazy(() => import("./pages/VideoUploadPage"));
const RadioPage = lazy(() => import("./components/radio/RadioPage"));
const CreatePremiumRoomPage = lazy(() => import("./pages/CreatePremiumRoomPage").then(m => ({ default: m.CreatePremiumRoomPage })));
const WalletSettingsPage = lazy(() => import("./pages/WalletSettingsPage"));
const SowerProfile = lazy(() => import("./pages/SowerProfile"));
const RadioSessions = lazy(() => import("./pages/RadioSessions"));
const LiveRooms = lazy(() => import("./pages/LiveRooms"));
const RadioGenerator = lazy(() => import("./pages/RadioGenerator"));
const LiveRoomsPage = lazy(() => import("./pages/LiveRoomsPage"));
const CreateLiveRoomPage = lazy(() => import("./pages/CreateLiveRoomPage"));
const SupportUsPage = lazy(() => import("./pages/SupportUsPage"));

// Lazy load admin pages (only accessed by admins)
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminRadioPage = lazy(() => import("./pages/AdminRadioPage").then(m => ({ default: m.AdminRadioPage })));
const AdminSeedsPage = lazy(() => import("./pages/AdminSeedsPage").then(m => ({ default: m.AdminSeedsPage })));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AuthDebugPage = lazy(() => import("./pages/AuthDebugPage"));

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import { RequireVerification } from "./components/auth/RequireVerification";
import Layout from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { AppContextProvider } from "./contexts/AppContext";
import LiveActivityWidget from "./components/LiveActivityWidget";
import { FloatingLiveWidget } from "./components/dashboard/FloatingLiveWidget";
import "./utils/errorDetection"; // Initialize error detection
import "./utils/cookieConfig"; // Configure cookie policy
import { CallManagerProvider } from '@/hooks/useCallManager';

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <Card className="m-4">
    <CardContent className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">Loading...</span>
    </CardContent>
  </Card>
);

const App = () => (
  <AuthProvider>
    <AppContextProvider>
      <CallManagerProvider>
        <BasketProvider>
          <TooltipProvider>
            <ThemeProvider defaultTheme="system" storageKey="sow2grow-ui-theme">
              <Toaster />
              <Sonner />
              <AudioUnlocker />
              <SoundUnlockBanner />
              <IncomingCallOverlay />
              <GlobalAudioCallBridge />
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
              
              {/* ChatApp - Clean Organized Interface */}
              <Route path="/chatapp" element={
                <ProtectedRoute>
                  <Layout>
                    <ChatApp />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Radio Slot Application */}
              <Route path="/radio-slot-application" element={
                <ProtectedRoute>
                  <Layout>
                    <RadioSlotApplicationPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Premium Rooms */}
               <Route path="/premium-rooms" element={
                 <ProtectedRoute>
                   <Layout>
                     <PremiumRoomsLanding />
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

              <Route path="/wallet-settings" element={
                <ProtectedRoute>
                  <Layout>
                    <WalletSettingsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/analytics" element={
                <ProtectedRoute>
                  <Layout>
                    <AdminAnalyticsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <AdminDashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <ProtectedRoute>
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
                    <AdminRadioPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admin/seeds" element={
                <ProtectedRoute allowedRoles={['admin', 'gosat']}>
                  <Layout>
                    <AdminSeedsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Payment Routes */}
              <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
              
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
              
              {/* Catch-all route - MUST BE LAST */}
              <Route path="*" element={<NotFound />} />
                  </Routes>
                  </ResponsiveLayout>
                  </Suspense>
                </ErrorBoundary>
              <PerformanceMonitor />
              <LiveActivityWidget />
              <FloatingLiveWidget />
              <OnboardingTour />
              <HelpModal />
            </ThemeProvider>
          </TooltipProvider>
        </BasketProvider>
      </CallManagerProvider>
    </AppContextProvider>
  </AuthProvider>
    
);

export default App;