import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import EnhancedErrorBoundary from "./components/error/EnhancedErrorBoundary";
import PerformanceMonitor from "./components/performance/PerformanceMonitor";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load heavy components for better performance
const EnhancedAnalyticsDashboard = lazy(() => import('./components/admin/EnhancedAnalyticsDashboard'));
const UserManagementDashboard = lazy(() => import('./components/admin/UserManagementDashboard'));
const ContentModerationDashboard = lazy(() => import('./components/admin/ContentModerationDashboard'));
const CommissionDashboard = lazy(() => import('./components/marketing/CommissionDashboard'));
const GamificationDashboard = lazy(() => import('./components/gamification/GamificationDashboard'));
const AdvancedSearchPage = lazy(() => import('./pages/AdvancedSearchPage'));

// Import existing components
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BrowseOrchardsPage from "./pages/BrowseOrchardsPage";
import AnimatedOrchardPage from "./pages/AnimatedOrchardPage";
import CreateOrchardPage from "./pages/CreateOrchardPage";
import OrchardCreatedPage from "./pages/OrchardCreatedPage";
import OrchardPage from "./pages/OrchardPage";
import OrchardErrorPage from "./pages/OrchardErrorPage";
import TithingPage from "./pages/TithingPage";
import AdminAnalyticsPage from "./pages/AdminAnalyticsPage";
import ProfilePage from "./pages/ProfilePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelledPage from "./pages/PaymentCancelledPage";
import DashboardPage from "./pages/DashboardPage";
import MyOrchardsPage from "./pages/MyOrchardsPage";
import FreeWillGiftingPage from "./pages/FreeWillGiftingPage";
import SeedSubmissionPage from "./pages/SeedSubmissionPage";
import YhvhOrchardsPage from "./pages/YhvhOrchardsPage";
import EditOrchardPage from "./pages/EditOrchardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import { AdminRadioPage } from "./pages/AdminRadioPage";
import { AdminSeedsPage } from "./pages/AdminSeedsPage";
import ChatappPage from "./pages/ChatappPage";
import CommunityVideosPage from "./pages/CommunityVideosPage";
import MarketingVideosGallery from "./pages/MarketingVideosGallery.jsx";
import AIAssistantPage from "./pages/AIAssistantPage";
import BasketPage from "./pages/BasketPage";
import TestBasketPage from "./pages/TestBasketPage";
import GroveStationPage from "./pages/GroveStationPage";
import RadioManagementPage from "./pages/RadioManagementPage";
import ClubhousePage from "./pages/ClubhousePage";

// Lazy-loaded pages for performance
const SupportUsPage = lazy(() => import("./pages/SupportUsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AuthDebugPage = lazy(() => import("./pages/AuthDebugPage"));

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import WalletProtectedRoute from "./components/WalletProtectedRoute";
import Layout from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { AppContextProvider } from "./contexts/AppContext";
import LiveActivityWidget from "./components/LiveActivityWidget";
import "./utils/errorDetection"; // Initialize error detection
import "./utils/cookieConfig"; // Configure cookie policy

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

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
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="sow2grow-ui-theme">
      <AuthProvider>
          <BasketProvider>
            <AppContextProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <EnhancedErrorBoundary>
                  <Suspense fallback={<LoadingFallback />}>
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
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/regrow-access" element={
                <ProtectedRoute>
                  <Layout>
                    <BrowseOrchardsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Orchard Routes */}
              <Route path="/browse-orchards" element={
                <ProtectedRoute>
                  <Layout>
                    <BrowseOrchardsPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/orchards/:orchardId" element={
                <ProtectedRoute>
                  <Layout>
                    <OrchardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Legacy orchard route redirect */}
              <Route path="/orchard/:orchardId" element={
                <ProtectedRoute>
                  <Layout>
                    <OrchardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/animated-orchard/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <AnimatedOrchardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/orchard-error/:orchardId" element={
                <ProtectedRoute>
                  <Layout>
                    <OrchardErrorPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Orchard Management Routes */}
              <Route path="/create-orchard" element={
                <ProtectedRoute>
                  <Layout>
                    <CreateOrchardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/plant-new-seed" element={
                <ProtectedRoute>
                  <Layout>
                    <CreateOrchardPage />
                  </Layout>
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
              
               {/* Chatapp */}
              <Route path="/chatapp" element={
                <ProtectedRoute>
                  <Layout>
                    <ChatappPage />
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

              {/* Clubhouse - Live Audio Conversations */}
              <Route path="/clubhouse" element={
                <ProtectedRoute>
                  <ClubhousePage />
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

              {/* Support Us - Phantom Wallet Payments */}
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
                <WalletProtectedRoute>
                  <Layout>
                    <BasketPage />
                  </Layout>
                </WalletProtectedRoute>
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
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
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
              
              {/* Catch-all route - MUST BE LAST */}
              <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </EnhancedErrorBoundary>
                <PerformanceMonitor />
                <LiveActivityWidget />
              </BrowserRouter>
            </TooltipProvider>
          </AppContextProvider>
        </BasketProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;