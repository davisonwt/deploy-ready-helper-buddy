// Centralized lazy-loaded page imports.
// Extracted verbatim from src/App.tsx — no behavioural changes.
import React, { lazy } from 'react';

// Eager imports (kept eager exactly as in App.tsx)
export { default as Index } from '@/pages/Index';
export { default as NotFound } from '@/pages/NotFound';
export { default as LoginPage } from '@/pages/LoginPage';
export { default as RegisterPage } from '@/pages/RegisterPage';
export { default as OnboardingSecurityPage } from '@/pages/OnboardingSecurityPage';
export { default as OnboardingPayoutPage } from '@/pages/OnboardingPayoutPage';
export { default as ForgotPasswordPage } from '@/pages/ForgotPasswordPage';

// Admin / lazy dashboards
export const EnhancedAnalyticsDashboard = lazy(() => import('@/components/admin/EnhancedAnalyticsDashboard'));
export const UserManagementDashboard = lazy(() => import('@/components/admin/UserManagementDashboard'));
export const ContentModerationDashboard = lazy(() => import('@/components/admin/ContentModerationDashboard'));
export const CommissionDashboard = lazy(() => import('@/components/marketing/CommissionDashboard'));
export const GamificationDashboard = lazy(() => import('@/components/gamification/GamificationDashboard'));
export const AdvancedSearchPage = lazy(() => import('@/pages/AdvancedSearchPage'));
export const MyTribePage = lazy(() => import('@/pages/MyTribePage'));

export const ChatApp = lazy(() => import('@/pages/ChatApp'));
export const GroveFeedPage = lazy(() => import('@/pages/GroveFeedPage'));
export const CommunicationsHub = lazy(() =>
  import('@/pages/CommunicationsHub').catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to load CommunicationsHub:', error);
    }
    return {
      default: () =>
        React.createElement(
          'div',
          { className: 'flex items-center justify-center min-h-screen' },
          React.createElement(
            'div',
            { className: 'text-center' },
            React.createElement('h1', { className: 'text-2xl font-bold mb-4' }, 'Error Loading Communications Hub'),
            React.createElement(
              'p',
              { className: 'text-muted-foreground mb-4' },
              'Failed to load the Communications Hub module.'
            ),
            React.createElement(
              'button',
              {
                onClick: () => window.location.reload(),
                className:
                  'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90',
              },
              'Reload Page'
            )
          )
        ),
    };
  })
);
export const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
export const BulkUploadWizardPage = lazy(() => import('@/pages/BulkUploadWizardPage'));
export const BulkSowerPage = lazy(() => import('@/pages/BulkSowerPage'));
export const BulkSeedFeedPage = lazy(() => import('@/pages/BulkSeedFeedPage'));
export const BulkProductDetailPage = lazy(() => import('@/pages/BulkProductDetailPage'));
export const BulkDirectoryPage = lazy(() => import('@/pages/BulkDirectoryPage'));
export const BulkWhispererDashboardPage = lazy(() => import('@/pages/BulkWhispererDashboardPage'));
export const FactoriesDirectoryPage = lazy(() => import('@/pages/FactoriesDirectoryPage'));
export const FactoryDetailPage = lazy(() => import('@/pages/FactoryDetailPage'));
export const TierSeedFlowPage = lazy(() => import('@/pages/TierSeedFlowPage'));
export const StatsPage = lazy(() => import('@/pages/StatsPage'));
export const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
export const BrowseOrchardsPage = lazy(() => import('@/pages/BrowseOrchardsPage'));
export const TribalAliveFeedPage = lazy(() => import('@/pages/TribalAliveFeedPage'));
export const LiveRoomDetailPage = lazy(() => import('@/pages/LiveRoomDetailPage'));
export const LiveLoungePage = lazy(() => import('@/pages/LiveLoungePage'));
export const OrchardPage = lazy(() => import('@/pages/OrchardPage'));
export const CreateOrchardPage = lazy(() => import('@/pages/CreateOrchardPage'));
export const MyOrchardsPage = lazy(() => import('@/pages/MyOrchardsPage'));
export const BasketPage = lazy(() => import('@/pages/BasketPage'));
export const EditOrchardPage = lazy(() => import('@/pages/EditOrchardPage'));
export const PremiumRoomsLanding = lazy(() => import('@/pages/PremiumRoomsLanding'));
export const PremiumRoomViewPage = lazy(() => import('@/pages/PremiumRoomViewPage'));
export const EditPremiumRoomPage = lazy(() => import('@/pages/EditPremiumRoomPage'));
export const AnimatedOrchardPage = lazy(() => import('@/pages/AnimatedOrchardPage'));
export const OrchardCreatedPage = lazy(() => import('@/pages/OrchardCreatedPage'));
export const OrchardErrorPage = lazy(() => import('@/pages/OrchardErrorPage'));
export const TithingPage = lazy(() => import('@/pages/TithingPage'));
export const PaymentCancelledPage = lazy(() => import('@/pages/PaymentCancelledPage'));
export const PaymentSuccessPage = lazy(() => import('@/pages/PaymentSuccessPage'));
export const FreeWillGiftingPage = lazy(() => import('@/pages/FreeWillGiftingPage'));
export const SeedSubmissionPage = lazy(() => import('@/pages/SeedSubmissionPage'));
export const YhvhOrchardsPage = lazy(() => import('@/pages/YhvhOrchardsPage'));
export const Yhvh364Page = lazy(() => import('@/pages/Yhvh364Page'));
export const RadioSlotApplicationPage = lazy(() => import('@/pages/RadioSlotApplicationPage'));
export const PremiumRoomsPage = lazy(() => import('@/pages/PremiumRoomsPage'));
export const CommunityVideosPage = lazy(() => import('@/pages/CommunityVideosPage'));
export const MarketingVideosGallery = lazy(() => import('@/pages/MarketingVideosGallery.jsx'));
export const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage'));
export const CompanionsHubPage = lazy(() => import('@/pages/CompanionsHubPage'));
export const CommunityOfferingPage = lazy(() => import('@/pages/CommunityOfferingPage'));
export const TestBasketPage = lazy(() => import('@/pages/TestBasketPage'));
export const GroveStationPage = lazy(() => import('@/pages/GroveStationPage'));
export const RadioManagementPage = lazy(() => import('@/pages/RadioManagementPage'));
export const ClubhousePage = lazy(() => import('@/pages/ClubhousePage'));
export const VideoPage = lazy(() => import('@/pages/VideoPage'));
export const VideoUploadPage = lazy(() => import('@/pages/VideoUploadPage'));
export const RadioPage = lazy(() => import('@/components/radio/RadioPage'));
export const CreatePremiumRoomPage = lazy(() =>
  import('@/pages/CreatePremiumRoomPage').then((m) => ({ default: m.CreatePremiumRoomPage }))
);
export const WalletSettingsPage = lazy(() => import('@/pages/WalletSettingsPage'));
export const PayoutSettingsPage = lazy(() => import('@/pages/PayoutSettingsPage'));
export const GosatWalletsPage = lazy(() => import('@/pages/GosatWalletsPage'));
export const BinancePayTestPage = lazy(() => import('@/pages/BinancePayTestPage'));
export const NowPaymentsTestPage = lazy(() => import('@/pages/NowPaymentsTestPage'));
export const PaypalTestPage = lazy(() => import('@/pages/PaypalTestPage'));
export const SowerProfile = lazy(() => import('@/pages/SowerProfile'));
export const RadioSessions = lazy(() => import('@/pages/RadioSessions'));
export const LiveRooms = lazy(() => import('@/pages/LiveRooms'));
export const RadioGenerator = lazy(() => import('@/pages/RadioGenerator'));
export const LiveRoomsPage = lazy(() => import('@/pages/LiveRoomsPage'));
export const CreateLiveRoomPage = lazy(() => import('@/pages/CreateLiveRoomPage'));
export const SupportUsPage = lazy(() => import('@/pages/SupportUsPage'));
export const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
export const MyProductsPage = lazy(() => import('@/pages/MyProductsPage'));
export const UploadForm = lazy(() => import('@/components/products/UploadForm'));
export const SellerCredentialsPage = lazy(() => import('@/pages/SellerCredentialsPage'));
export const TribalHeartsPage = lazy(() => import('@/pages/TribalHeartsPage'));
export const AdminCredentialsPage = lazy(() => import('@/pages/AdminCredentialsPage'));
export const AdminPayoutConfirmationsPage = lazy(() => import('@/pages/AdminPayoutConfirmationsPage'));
export const AdminAttachCoversPage = lazy(() => import('@/pages/AdminAttachCoversPage'));
export const EditForm = lazy(() => import('@/components/products/EditForm'));
export const ProductBasketPage = lazy(() => import('@/pages/ProductBasketPage'));
export const MusicLibraryPage = lazy(() =>
  import('@/pages/MusicLibraryPage').catch((error) => {
    console.error('Failed to load MusicLibraryPage:', error);
    return Promise.resolve({
      default: () =>
        React.createElement(
          'div',
          { className: 'p-8 text-center' },
          React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'Failed to load Music Library'),
          React.createElement('p', { className: 'mb-4' }, 'Please refresh the page or try again later.'),
          React.createElement(
            'button',
            {
              onClick: () => window.location.reload(),
              className: 'px-4 py-2 bg-blue-500 text-white',
            },
            'Refresh Page'
          )
        ),
    });
  })
);
export const MyS2GLibraryPage = lazy(() => import('@/pages/MyS2GLibraryPage'));
export const S2GCommunityLibraryPage = lazy(() => import('@/pages/S2GCommunityLibraryPage'));
export const S2GCommunityMusicPage = lazy(() => import('@/pages/S2GCommunityMusicPage'));
export const LibraryUploadForm = lazy(() => import('@/components/library/LibraryUploadForm'));
export const AmbassadorThumbnailPage = lazy(() => import('@/pages/AmbassadorThumbnailPage'));
export const GoSatGhostAccessThumbnailPage = lazy(() => import('@/pages/GoSatGhostAccessThumbnailPage'));
export const TrueTequfahClock = lazy(() => import('@/components/TrueTequfahClock'));
export const Sow2GrowCalendarPage = lazy(() => import('@/pages/Sow2GrowCalendarPage'));
export const EnochianCalendarDesignPage = lazy(() => import('@/pages/EnochianCalendarDesignPage'));
export const EternalForestPage = lazy(() => import('@/pages/EternalForestPage'));
export const AdminAnalyticsPage = lazy(() => import('@/pages/AdminAnalyticsPage'));
export const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));
export const AdminRadioPage = lazy(() => import('@/pages/AdminRadioPage'));
export const AdminSeedsPage = lazy(() => import('@/pages/AdminSeedsPage'));
export const AdminPaymentsPage = lazy(() => import('@/pages/AdminPaymentsPage'));
export const AuthDebugPage = lazy(() => import('@/pages/AuthDebugPage'));
export const LiveSeedPage = lazy(() => import('@/pages/LiveSeedPage'));
export const LearnSharePage = lazy(() => import('@/pages/LearnSharePage'));
export const WanderingDirectoryPage = lazy(() => import('@/pages/WanderingDirectoryPage'));
export const PlantASeedPage = lazy(() => import('@/pages/PlantASeedPage'));
export const MyRadioOptInPage = lazy(() => import('@/pages/MyRadioOptInPage'));
