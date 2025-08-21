import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { BasketProvider } from "./hooks/useBasket";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AppContextProvider } from "./contexts/AppContext";
import LiveActivityWidget from "./components/LiveActivityWidget";
import { lazy, Suspense } from "react";
import "./utils/errorDetection"; // Initialize error detection
import "./utils/cookieConfig"; // Configure cookie policy

// Initialize error detection system
console.log('🚀 Error Detection System Initialized');

// Lazy-loaded pages
const SupportUsPage = lazy(() => import("./pages/SupportUsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AuthDebugPage = lazy(() => import("./pages/AuthDebugPage"));

// Pages that exist
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
import ChatappPage from "./pages/ChatappPage";
import CommunityVideosPage from "./pages/CommunityVideosPage";
import AIAssistantPage from "./pages/AIAssistantPage"; // AI Marketing Assistant
import BasketPage from "./pages/BasketPage";
import TestBasketPage from "./pages/TestBasketPage";
import GroveStationPage from "./pages/GroveStationPage";
import RadioManagementPage from "./pages/RadioManagementPage";

// Components
import ProtectedRoute from "./components/ProtectedRoute";
import WalletProtectedRoute from "./components/WalletProtectedRoute";
import Layout from "./components/Layout";

const queryClient = new QueryClient();

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

               {/* AI Assistant */}
               <Route path="/ai-assistant" element={
                 <ProtectedRoute>
                   <Layout>
                     <AIAssistantPage />
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
              
              {/* Payment Routes */}
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
              
              {/* Catch-all route - MUST BE LAST */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <LiveActivityWidget />
        </TooltipProvider>
      </AppContextProvider>
    </BasketProvider>
  </AuthProvider>
</ThemeProvider>
</QueryClientProvider>
);

export default App;