import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
const TrustPage = lazy(() => import('@/pages/TrustPage'));
import { Card, CardContent } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RequireVerification } from '@/components/auth/RequireVerification';
import Layout from '@/components/Layout';
import {
  Index,
  NotFound,
  LoginPage,
  RegisterPage,
  OnboardingSecurityPage,
  OnboardingPayoutPage,
  ForgotPasswordPage,
  CommissionDashboard,
  GamificationDashboard,
  AdvancedSearchPage,
  MyTribePage,
  GroveFeedPage,
  CommunicationsHub,
  DashboardPage,
  BulkUploadWizardPage,
  BulkSowerPage,
  BulkSeedFeedPage,
  BulkProductDetailPage,
  BulkDirectoryPage,
  BulkWhispererDashboardPage,
  FactoriesDirectoryPage,
  FactoryDetailPage,
  TierSeedFlowPage,
  StatsPage,
  ProfilePage,
  BrowseOrchardsPage,
  TribalAliveFeedPage,
  LiveRoomDetailPage,
  LiveLoungePage,
  OrchardPage,
  CreateOrchardPage,
  MyOrchardsPage,
  BasketPage,
  EditOrchardPage,
  PremiumRoomsLanding,
  PremiumRoomViewPage,
  EditPremiumRoomPage,
  AnimatedOrchardPage,
  OrchardCreatedPage,
  OrchardErrorPage,
  TithingPage,
  PaymentCancelledPage,
  PaymentSuccessPage,
  FreeWillGiftingPage,
  SeedSubmissionPage,
  YhvhOrchardsPage,
  Yhvh364Page,
  RadioSlotApplicationPage,
  CommunityVideosPage,
  MarketingVideosGallery,
  CompanionsHubPage,
  CommunityOfferingPage,
  TestBasketPage,
  GroveStationPage,
  RadioManagementPage,
  ClubhousePage,
  VideoPage,
  VideoUploadPage,
  RadioPage,
  CreatePremiumRoomPage,
  WalletSettingsPage,
  PayoutSettingsPage,
  MyWalletPage,
  GosatWalletsPage,
  BinancePayTestPage,
  NowPaymentsTestPage,
  PaypalTestPage,
  SowerProfile,
  RadioSessions,
  LiveRooms,
  RadioGenerator,
  LiveRoomsPage,
  CreateLiveRoomPage,
  SupportUsPage,
  ProductsPage,
  MyProductsPage,
  UploadForm,
  SellerCredentialsPage,
  TribalHeartsPage,
  AdminCredentialsPage,
  AdminPayoutConfirmationsPage,
  AdminAttachCoversPage,
  EditForm,
  ProductBasketPage,
  MusicLibraryPage,
  MyRadioOptInPage,
  MyS2GLibraryPage,
  S2GCommunityLibraryPage,
  S2GCommunityMusicPage,
  LibraryUploadForm,
  AmbassadorThumbnailPage,
  GoSatGhostAccessThumbnailPage,
  TrueTequfahClock,
  Sow2GrowCalendarPage,
  EnochianCalendarDesignPage,
  EternalForestPage,
  AdminAnalyticsPage,
  AdminDashboardPage,
  AdminRadioPage,
  AdminSeedsPage,
  AdminPaymentsPage,
  AuthDebugPage,
  LiveSeedPage,
  LearnSharePage,
  WanderingDirectoryPage,
  PlantASeedPage,
} from './lazyPages';

export const LoadingFallback = () => (
  <Card className="m-4">
    <CardContent className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">Loading...</span>
    </CardContent>
  </Card>
);

const AppRoutes = () => (
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
     <Route path="/bulk/directory" element={
       <Suspense fallback={<LoadingFallback />}><BulkDirectoryPage /></Suspense>
     } />
     <Route path="/bulk/whisperer" element={
       <ProtectedRoute>
         <Suspense fallback={<LoadingFallback />}><BulkWhispererDashboardPage /></Suspense>
       </ProtectedRoute>
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
    <Route path="/factories" element={<Layout><FactoriesDirectoryPage /></Layout>} />
    <Route path="/factories/:slug" element={<Layout><FactoryDetailPage /></Layout>} />
    <Route path="/homestead" element={<TierSeedFlowPage tier="homestead" />} />
    <Route path="/grove" element={<TierSeedFlowPage tier="grove" />} />
    <Route path="/orchard" element={<TierSeedFlowPage tier="orchard" />} />
    <Route path="/estate" element={<TierSeedFlowPage tier="estate" />} />
    <Route path="/harvest-works" element={<TierSeedFlowPage tier="harvest_works" />} />
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
      <ProtectedRoute><RequireVerification><CreateOrchardPage /></RequireVerification></ProtectedRoute>
    } />
    <Route path="/plant-new-seed" element={
      <ProtectedRoute><RequireVerification><CreateOrchardPage /></RequireVerification></ProtectedRoute>
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
    <Route path="/admin-fee" element={
      <ProtectedRoute><TithingPage /></ProtectedRoute>
    } />
    {/* Legacy redirects for old /tithing bookmarks */}
    <Route path="/tithing" element={<Navigate to="/admin-fee" replace />} />
    <Route path="/tithing-2" element={<Navigate to="/admin-fee" replace />} />
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
      <ProtectedRoute allowIncompleteSetup>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-xl">Loading...</div></div>}>
          <CommunicationsHub />
        </Suspense>
      </ProtectedRoute>
    } />
    <Route path="/chatapp" element={<Navigate to="/communications-hub#chats" replace />} />
    <Route path="/onboarding/security" element={
      <ProtectedRoute allowIncompleteSetup>
        <OnboardingSecurityPage />
      </ProtectedRoute>
    } />
    <Route path="/onboarding/payout" element={
      <ProtectedRoute allowIncompleteSetup>
        <OnboardingPayoutPage />
      </ProtectedRoute>
    } />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
    <Route path="/my-radio-opt-in" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><MyRadioOptInPage /></Suspense></Layout></ProtectedRoute>
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
      <ProtectedRoute><ProfilePage /></ProtectedRoute>
    } />
    <Route path="/wallet-settings" element={
      <ProtectedRoute><Layout><WalletSettingsPage /></Layout></ProtectedRoute>
    } />
    <Route path="/settings/payouts" element={
      <ProtectedRoute><Layout><PayoutSettingsPage /></Layout></ProtectedRoute>
    } />
    <Route path="/wallet" element={
      <ProtectedRoute><Layout><MyWalletPage /></Layout></ProtectedRoute>
    } />
    <Route path="/binance-pay-test" element={
      <ProtectedRoute><Layout><BinancePayTestPage /></Layout></ProtectedRoute>
    } />
    <Route path="/dev/nowpay-test" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><NowPaymentsTestPage /></Layout></ProtectedRoute>
    } />
    <Route path="/dev/paypal-test" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><PaypalTestPage /></Layout></ProtectedRoute>
    } />
    <Route path="/admin/analytics" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><AdminAnalyticsPage /></Layout></ProtectedRoute>
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
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><Suspense fallback={<LoadingFallback />}><AdminCredentialsPage /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/admin/payout-confirmations" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><Suspense fallback={<LoadingFallback />}><AdminPayoutConfirmationsPage /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/admin/attach-covers" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><Suspense fallback={<LoadingFallback />}><AdminAttachCoversPage /></Suspense></Layout></ProtectedRoute>
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
    <Route path="/trust" element={<Suspense fallback={<LoadingFallback />}><TrustPage /></Suspense>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
