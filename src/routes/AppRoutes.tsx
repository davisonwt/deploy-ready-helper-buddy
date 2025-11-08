import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RequireVerification } from '@/components/auth/RequireVerification';
import Layout from '@/components/Layout';
import NotFound from '@/pages/NotFound';
import Index from '@/pages/Index';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';

// Lazy-loaded pages used by header navigation
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const CreateOrchardPage = lazy(() => import('@/pages/CreateOrchardPage'));
const MyOrchardsPage = lazy(() => import('@/pages/MyOrchardsPage'));
const BrowseOrchardsPage = lazy(() => import('@/pages/BrowseOrchardsPage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const UploadForm = lazy(() => import('@/components/products/UploadForm'));
const MarketingVideosGallery = lazy(() => import('@/pages/MarketingVideosGallery.jsx'));
const YhvhOrchardsPage = lazy(() => import('@/pages/YhvhOrchardsPage'));
const ChatApp = lazy(() => import('@/pages/ChatApp'));
const RadioSlotApplicationPage = lazy(() => import('@/pages/RadioSlotApplicationPage'));
const PremiumRoomsLanding = lazy(() => import('@/pages/PremiumRoomsLanding'));
const GroveStationPage = lazy(() => import('@/pages/GroveStationPage'));
const RadioManagementPage = lazy(() => import('@/pages/RadioManagementPage'));
const TithingPage = lazy(() => import('@/pages/TithingPage'));
const FreeWillGiftingPage = lazy(() => import('@/pages/FreeWillGiftingPage'));
const SupportUsPage = lazy(() => import('@/pages/SupportUsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
const AdminSeedsPage = lazy(() => import('@/pages/AdminSeedsPage').then(m => ({ default: m.AdminSeedsPage })));
const AdminRadioPage = lazy(() => import('@/pages/AdminRadioPage').then(m => ({ default: m.AdminRadioPage })));

const Fallback = () => <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback /> }>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Primary nav destinations */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <RequireVerification>
              <Layout>
                <DashboardPage />
              </Layout>
            </RequireVerification>
          </ProtectedRoute>
        } />

        <Route path="/create-orchard" element={
          <ProtectedRoute>
            <RequireVerification>
              <Layout>
                <CreateOrchardPage />
              </Layout>
            </RequireVerification>
          </ProtectedRoute>
        } />

        {/* Grouped: My Content */}
        <Route path="/my-orchards" element={
          <ProtectedRoute>
            <Layout>
              <MyOrchardsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/browse-orchards" element={
          <ProtectedRoute>
            <RequireVerification>
              <Layout>
                <BrowseOrchardsPage />
              </Layout>
            </RequireVerification>
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute>
            <Layout>
              <ProductsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/products/upload" element={
          <ProtectedRoute>
            <Layout>
              <UploadForm />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/marketing-videos" element={
          <ProtectedRoute>
            <Layout>
              <MarketingVideosGallery />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/364yhvh-orchards" element={
          <ProtectedRoute>
            <Layout>
              <YhvhOrchardsPage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Group: Chatapp */}
        <Route path="/chatapp" element={
          <ProtectedRoute>
            <Layout>
              <ChatApp />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/radio-slot-application" element={
          <ProtectedRoute>
            <Layout>
              <RadioSlotApplicationPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/premium-rooms" element={
          <ProtectedRoute>
            <Layout>
              <PremiumRoomsLanding />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/grove-station" element={
          <ProtectedRoute>
            <Layout>
              <GroveStationPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/radio-management" element={
          <ProtectedRoute allowedRoles={["radio_admin", "admin", "gosat"]}>
            <Layout>
              <RadioManagementPage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Let it Rain */}
        <Route path="/tithing" element={
          <ProtectedRoute>
            <Layout>
              <TithingPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/free-will-gifting" element={
          <ProtectedRoute>
            <Layout>
              <FreeWillGiftingPage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Support */}
        <Route path="/support-us" element={
          <ProtectedRoute>
            <Layout>
              <SupportUsPage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={["admin", "gosat"]}>
            <Layout>
              <AdminDashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/seeds" element={
          <ProtectedRoute allowedRoles={["admin", "gosat"]}>
            <Layout>
              <AdminSeedsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/radio" element={
          <ProtectedRoute allowedRoles={["admin", "gosat"]}>
            <Layout>
              <AdminRadioPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
