import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
const TrustPage = lazy(() => import('@/pages/TrustPage'));
import { Card, CardContent } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RequireVerification } from '@/components/auth/RequireVerification';
import { RequireSettlementConsent } from '@/components/auth/RequireSettlementConsent';
import Layout from '@/components/Layout';
// Small (just an icon + stop button when the radio is on, null otherwise)
// -- not lazy, no heavy engine behind it like GlobalLiveSessionOverlay.
import GlobalRadioPlayer from '@/components/media/GlobalRadioPlayer';
// Lazy -- this pulls in the whole Daily.co call engine (LiveStage/
// LiveStageOverlay), which must NOT land in the main bundle every page
// load pays for just because this is mounted unconditionally at the root.
const GlobalLiveSessionOverlay = lazy(() => import('@/components/live/GlobalLiveSessionOverlay'));
import { S2G_BALANCE_ENABLED } from '@/lib/featureFlags';
import {
  Index,
  NotFound,
  LoginPage,
  RegisterPage,
  OnboardingSecurityPage,
  OnboardingPayoutPage,
  ForgotPasswordPage,
  GamificationDashboard,
  MyTribePage,
  GroveFeedPage,
  CommunicationsHub,
  DashboardPage,
  StallBuildPage,
  StallVisitPage,
  StallsFeedPage,
  LiveNowPage,
  ReceiptPage,
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
  MemberProfilePage,
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
  CommunityVideosPage,
  MarketingVideosGallery,
  CompanionsHubPage,
  CommunityOfferingPage,
  TestBasketPage,
  GroveStationPage,
  ClubhousePage,
  VideoPage,
  
  CreatePremiumRoomPage,
  PayoutSettingsPage,
  PaypalConnectedPage,
  SowIndexPage,
  SowChooserPage,
  SowMusicPage,
  SowArtPage,
  SowBookPage,
  SowProductPage,
  SowHandPage,
  HandSeedDetailPage,
  SowWheelPage,
  WheelSeedDetailPage,
  SowPillowPage,
  PillowSeedDetailPage,
  SleepingSeedsPage,
  MyListingsPage,
  RegisterWanderingPage,
  StorePage,
  PrivacyPage,
  TermsPage,
  DisclaimerPage,
  MyOrdersPage,
  MySeedsPage,
  EscrowQueuePage,
  BooksPage,
  BooksCatalogItemPage,
  InvoiceViewPage,
  PublicPayPage,
  PaystackReturnPage,
  JobInvoicingDashboardPage,
  JobNoteFormPage,
  JobDetailPage,
  EstimateBuilderPage,
  PublicEstimateApprovalPage,
  JoinPage,
  CallPage,
  GosatSubscriptionsPage,
  MyWalletPage,
  GosatTreasuryPage,
  AdminPayoutsPage,
  GosatOrchardsPage,
  NowPaymentsTestPage,
  PaypalTestPage,
  SowerProfile,
  
  LiveRoomsPage,
  CreateLiveRoomPage,
  SupportUsPage,
  ProductsPage,
  UploadForm,
  TribalHeartsPage,
  AdminCredentialsPage,
  AdminPayoutConfirmationsPage,
  AdminAttachCoversPage,
  AdminAiUsagePage,
  EditForm,
  ProductBasketPage,
  MusicLibraryPage,
  MusicTrackDetailPage,
  MyRadioOptInPage,
  SowerLibraryPage,
  S2GCommunityLibraryPage,
  S2GCommunityMusicPage,
  LibraryUploadForm,
  AmbassadorThumbnailPage,
  GoSatGhostAccessThumbnailPage,
  TrueTequfahClock,
  Sow2GrowCalendarPage,
  PrintCalendarPage,
  EnochianCalendarDesignPage,
  EternalForestPage,
  AdminAnalyticsPage,
  AdminDashboardPage,
  AdminSeedsPage,
  AdminSettlementConsentsPage,
  
  AuthDebugPage,
  LiveSeedPage,
  LearnSharePage,
  LearnShareVideoPage,
  WanderingDirectoryPage,
  PlantASeedPage,
  ChatApp,
  ConversationsPage,
  CommunityChatsPage,
  SessionPage,
  ClassroomPage,
  ClassroomDashboardPage,
  SkillDropPage,
  BecomeWhispererPage,
  WhisperersFeedPage,
  WhispererRequestsPage,
  PrescriptionSubmitPage,
  PrescriptionsInboxPage,
} from './lazyPages';

export const LoadingFallback = () => (
  <Card className="m-4">
    <CardContent className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">Loading...</span>
    </CardContent>
  </Card>
);

const OAuthConsent = lazy(() => import('@/pages/OAuthConsent'));

/** Flow v2 step 1: redirects a duplicate parameterized route to its real
 * one, carrying the param value across (`to` uses the same `:name`
 * placeholder as the route it's mounted on). */
function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  const path = Object.entries(params).reduce(
    (acc, [key, value]) => (value != null ? acc.replace(`:${key}`, value) : acc),
    to,
  );
  return <Navigate to={path} replace />;
}

/** Flow v2 step 7: /search -> /stalls-feed, carrying a `?q=` search term
 * across if the old link had one (StallsFeedPage reads it on mount to
 * pre-fill its own search box). */
function SearchRedirect() {
  const location = useLocation();
  const q = new URLSearchParams(location.search).get('q');
  return <Navigate to={q ? `/stalls-feed?q=${encodeURIComponent(q)}` : '/stalls-feed'} replace />;
}

// 2026-09-19: /chatapp, /community-chats, /live-rooms, /classroom(/:id),
// /skilldrop(/:id) all merge into /conversations -- the old pages and
// components are NOT deleted, only unreachable by their old paths. Carries
// `?room=<id>` across as /conversations' own `?c=<id>` (same chat_rooms
// row either way). Classroom/SkillDrop's instructor rail and drop-in
// animation (SessionPage.tsx) have no equivalent in plain ChatRoom usage
// and are lost once redirected -- the room itself still opens, just
// without that page's extra UI.
function LegacyChatRedirect() {
  const location = useLocation();
  const room = new URLSearchParams(location.search).get('room');
  return <Navigate to={room ? `/conversations?c=${encodeURIComponent(room)}` : '/conversations'} replace />;
}

function LegacyChatRoomIdRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/conversations?c=${encodeURIComponent(id)}` : '/conversations'} replace />;
}

// /wandering/* -- links of this shape reach us carrying a real, active
// referral code but no page: nothing in this repo has ever routed
// /wandering/<anything>, and nothing in it generates such a URL either
// (checked across the full git history, 2026-09-22). They predate this
// codebase or were written by hand. Whatever their origin, a person
// following an invitation must not be dropped on a 404.
//
// There is no honest destination to map them to -- /sow/pillow is "become
// a Wandering Pillow" and /seed/pillow/:id needs a listing id neither of
// which the URL carries -- so they land on /register, which is what the
// invitation was for. The ref is carried across explicitly rather than
// left to useReferralCapture(), so attribution does not depend on
// localStorage being writable.
function LegacyWanderingRedirect() {
  const location = useLocation();
  const ref = new URLSearchParams(location.search).get('ref');
  return <Navigate to={ref ? `/register?ref=${encodeURIComponent(ref)}` : '/register'} replace />;
}

const AppRoutes = () => (
  <>
    {/* Mounted once here, above every route -- not inside any specific
        page -- so a Gathering Room live survives in-app navigation and a
        backgrounded-tab reload alike. See GlobalLiveSessionOverlay.tsx's
        own doc comment for the full "silent auto-rejoin" design. */}
    <Suspense fallback={null}><GlobalLiveSessionOverlay /></Suspense>
    {/* Grove Station radio -- module-level store (src/lib/media/radioPlayback.ts)
        holds the actual <audio> element, mounted here for the same reason
        as GlobalLiveSessionOverlay above: never unmounted by in-app nav. */}
    <GlobalRadioPlayer />
    <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/sow" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><SowChooserPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/sow/classic" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><SowIndexPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/sow/music" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowMusicPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/sow/art" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowArtPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/sow/book" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowBookPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/sow/product" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowProductPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/sow/hand" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowHandPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/seed/hand/:id" element={
      <Suspense fallback={<LoadingFallback />}><HandSeedDetailPage /></Suspense>
    } />
    <Route path="/sow/wheel" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowWheelPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/seed/wheel/:id" element={
      <Suspense fallback={<LoadingFallback />}><WheelSeedDetailPage /></Suspense>
    } />
    <Route path="/my-listings" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><MyListingsPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/sleeping" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><SleepingSeedsPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/sow/pillow" element={
      <ProtectedRoute><RequireSettlementConsent><Suspense fallback={<LoadingFallback />}><SowPillowPage /></Suspense></RequireSettlementConsent></ProtectedRoute>
    } />
    <Route path="/seed/pillow/:id" element={
      <Suspense fallback={<LoadingFallback />}><PillowSeedDetailPage /></Suspense>
    } />
    <Route path="/register-wandering" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><RegisterWanderingPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/store/:slug" element={
      <Suspense fallback={<LoadingFallback />}><StorePage /></Suspense>
    } />
    <Route path="/privacy" element={<Suspense fallback={<LoadingFallback />}><PrivacyPage /></Suspense>} />
    <Route path="/terms" element={<Suspense fallback={<LoadingFallback />}><TermsPage /></Suspense>} />
    <Route path="/disclaimer" element={<Suspense fallback={<LoadingFallback />}><DisclaimerPage /></Suspense>} />
    <Route path="/.lovable/oauth/consent" element={
      <Suspense fallback={<LoadingFallback />}><OAuthConsent /></Suspense>
    } />

    <Route path="/register" element={<RegisterPage />} />
    <Route path="/start-your-journey" element={<RegisterPage />} />
    <Route path="/ambassador-thumbnail" element={<AmbassadorThumbnailPage />} />
    <Route path="/gosat-ghost-access-thumbnail" element={<GoSatGhostAccessThumbnailPage />} />
    <Route path="/tequfah-clock" element={<TrueTequfahClock />} />
    <Route path="/sow2grow-calendar" element={<Sow2GrowCalendarPage />} />
    <Route path="/calendar/print" element={
      <Suspense fallback={<LoadingFallback />}><PrintCalendarPage /></Suspense>
    } />
    <Route path="/enochian-calendar-design" element={
      <Layout><Suspense fallback={<LoadingFallback />}><EnochianCalendarDesignPage /></Suspense></Layout>
    } />
    <Route path="/auth-debug" element={
      <Suspense fallback={<div>Loading...</div>}><AuthDebugPage /></Suspense>
    } />
    <Route path="/cockpit" element={
      <ProtectedRoute>
        <RequireVerification>
          <DashboardPage />
        </RequireVerification>
      </ProtectedRoute>
    } />
    {/* Renamed to /cockpit -- kept as a redirect so existing bookmarks/links still land somewhere. */}
    <Route path="/dashboard" element={<Navigate to="/cockpit" replace />} />
    {/* The landing page's own "open my stall" buttons link here -- /register is the real route, this is just the friendlier name a marketing page would use. */}
    <Route path="/signup" element={<Navigate to="/register" replace />} />
    {/* Flow v2 step 9 (Davison decision): Let It Rain is retired as a
        separate feature -- the Heart tip picker on a SeedCard IS Let It
        Rain now. No code ever routed here, but redirect defensively in
        case an old link/bookmark exists. */}
    <Route path="/let-it-rain" element={<Navigate to="/stalls-feed" replace />} />
    <Route path="/stall/build" element={
      <ProtectedRoute>
        <RequireVerification>
          <Suspense fallback={<LoadingFallback />}><StallBuildPage /></Suspense>
        </RequireVerification>
      </ProtectedRoute>
    } />
    {/* Public visitor route -- registered ahead of no other /stall/:x route
        exists, but kept explicit and above any future one, same pattern as
        /pay/paystack/return vs /pay/:publicToken. No ProtectedRoute -- a
        guest can browse a published stall. */}
    <Route path="/stall/:username" element={
      <Layout><Suspense fallback={<LoadingFallback />}><StallVisitPage /></Suspense></Layout>
    } />
    <Route path="/dashboard/sower/upload" element={
      <ProtectedRoute>
        <RequireVerification>
          <RequireSettlementConsent>
            <Suspense fallback={<LoadingFallback />}><BulkUploadWizardPage /></Suspense>
          </RequireSettlementConsent>
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
    {/* Flow v2 step 7: /browse-orchards's content folded into /stalls-feed's
        Orchards tab (step 6) -- redirect with that tab pre-selected. */}
    <Route path="/browse-orchards" element={<Navigate to="/stalls-feed?chip=orchard" replace />} />
    <Route path="/orchard-alive" element={
      <ProtectedRoute><RequireVerification><Layout><TribalAliveFeedPage /></Layout></RequireVerification></ProtectedRoute>
    } />
    {/* Print-ready receipt -- deliberately no <Layout> (bare page, own
        header/footer) so print/PDF output isn't cluttered with app chrome.
        Still requires a session -- get_receipt() checks auth.uid() itself. */}
    <Route path="/receipt/:orderId" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><ReceiptPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/stalls-feed" element={
      <ProtectedRoute><RequireVerification><Layout><Suspense fallback={<LoadingFallback />}><StallsFeedPage /></Suspense></Layout></RequireVerification></ProtectedRoute>
    } />
    <Route path="/live-now" element={
      <ProtectedRoute><RequireVerification><Layout><Suspense fallback={<LoadingFallback />}><LiveNowPage /></Suspense></Layout></RequireVerification></ProtectedRoute>
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
    {/* Flow v2 step 1: duplicate route, same component as /live/:seedId/room */}
    <Route path="/seed/:seedId" element={<RedirectWithParams to="/live/:seedId/room" />} />
    <Route path="/live-lounge" element={
      <ProtectedRoute><Layout><LiveLoungePage /></Layout></ProtectedRoute>
    } />
    <Route path="/live-lounge" element={
      <ProtectedRoute><Layout><LiveLoungePage /></Layout></ProtectedRoute>
    } />
    {/* Flow v2 step 1: duplicate route, same component as /orchard/:orchardId */}
    <Route path="/orchards/:orchardId" element={<RedirectWithParams to="/orchard/:orchardId" />} />
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
      <ProtectedRoute><RequireVerification><RequireSettlementConsent><CreateOrchardPage /></RequireSettlementConsent></RequireVerification></ProtectedRoute>
    } />
    <Route path="/plant-new-seed" element={
      <ProtectedRoute><RequireVerification><RequireSettlementConsent><CreateOrchardPage /></RequireSettlementConsent></RequireVerification></ProtectedRoute>
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
    } />
    <Route path="/learn-share/:videoId" element={
      <Suspense fallback={<LoadingFallback />}><LearnShareVideoPage /></Suspense>
    } />
    <Route path="/wandering-directory" element={
    <ProtectedRoute><WanderingDirectoryPage /></ProtectedRoute>
    } />
    <Route path="/whisperers" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><WhisperersFeedPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/whisperer-requests" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><WhispererRequestsPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/become-a-whisperer" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><BecomeWhispererPage /></Suspense></ProtectedRoute>
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
    {/* The "ChatApp Go-Live" hub merged into /conversations 2026-09-19.
        CommunicationsHub.tsx is not deleted, only unreachable here.
        Carries ?room=<id> across like the other legacy chat redirects (see
        ChatList.tsx's "back to hub with a room" call); ?session=<id>&kind=
        (useLiveSessions.ts's classroom/skilldrop join links) has no
        equivalent resolution here and lands on the plain list -- a known,
        narrow gap, not silently pretended away. */}
    <Route path="/communications-hub" element={<ProtectedRoute allowIncompleteSetup><LegacyChatRedirect /></ProtectedRoute>} />
    {/* Legacy/hand-written invite links: /wandering/<anything>?ref=CODE.
        See LegacyWanderingRedirect above for why these land on /register. */}
    <Route path="/wandering/*" element={<LegacyWanderingRedirect />} />

    {/* /chatapp merged into /conversations 2026-09-19 -- see
        LegacyChatRedirect above. ChatApp.tsx is not deleted, only
        unreachable by this path. */}
    <Route path="/chatapp" element={<ProtectedRoute><LegacyChatRedirect /></ProtectedRoute>} />
    {/* Phase 1A/1B-lite: the unified conversation list, built alongside
        /chatapp. Now the only reachable path for it. */}
    <Route path="/conversations" element={
      <ProtectedRoute>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-xl">Loading...</div></div>}>
          <ConversationsPage />
        </Suspense>
      </ProtectedRoute>
    } />
    <Route path="/community-chats" element={<ProtectedRoute><LegacyChatRedirect /></ProtectedRoute>} />
    <Route path="/classroom" element={<ProtectedRoute><LegacyChatRedirect /></ProtectedRoute>} />
    <Route path="/classroom/:id" element={<ProtectedRoute><LegacyChatRoomIdRedirect /></ProtectedRoute>} />
    <Route path="/classroom/:id/dashboard" element={<ProtectedRoute><LegacyChatRoomIdRedirect /></ProtectedRoute>} />
    <Route path="/skilldrop" element={<ProtectedRoute><LegacyChatRedirect /></ProtectedRoute>} />
    <Route path="/skilldrop/:id" element={<ProtectedRoute><LegacyChatRoomIdRedirect /></ProtectedRoute>} />
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
    {/* Flow v2 step 11: consolidated into /grove-station's tabs. */}
    <Route path="/radio-slot-application" element={<Navigate to="/grove-station?tab=apply" replace />} />
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
    <Route path="/radio-management" element={<Navigate to="/grove-station?tab=management" replace />} />
    <Route path="/music-library" element={
      <Layout><Suspense fallback={<LoadingFallback />}><MusicLibraryPage /></Suspense></Layout>
    } />
    <Route path="/music-track/:id" element={
      <Layout><Suspense fallback={<LoadingFallback />}><MusicTrackDetailPage /></Suspense></Layout>
    } />
    <Route path="/my-radio-opt-in" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><MyRadioOptInPage /></Suspense></Layout></ProtectedRoute>
    } />
    {/* Duplicate of /radio-slot-application, same component -- same target. */}
    <Route path="/apply-radio-slot" element={<Navigate to="/grove-station?tab=apply" replace />} />
    <Route path="/create-premium-room" element={
      <ProtectedRoute><Layout><CreatePremiumRoomPage /></Layout></ProtectedRoute>
    } />
    {/* /radio's own component (src/components/radio/RadioPage.tsx) duplicated
        Grove Station's own "Listen Now" tab -- redirect to the plain
        default rather than embed a second listening UI. */}
    <Route path="/radio" element={<Navigate to="/grove-station" replace />} />
    <Route path="/sower/:id" element={
      <ProtectedRoute><Layout><SowerProfile /></Layout></ProtectedRoute>
    } />
    <Route path="/radio-sessions" element={<Navigate to="/grove-station?tab=sessions" replace />} />
    <Route path="/radio-generator" element={<Navigate to="/grove-station?tab=generator" replace />} />
    <Route path="/clubhouse" element={
      <ProtectedRoute><ClubhousePage /></ProtectedRoute>
    } />
    <Route path="/video/:id" element={<VideoPage />} />
    <Route path="/ai-assistant" element={
      <ProtectedRoute><Layout><CreateOrchardPage /></Layout></ProtectedRoute>
    } />
    {/* Companions Village phase 1: the top-level /companions URL now leads
        into the village stall instead of the raw hub grid -- the hub's own
        page moved to /my-companions, reached only from the village's "My
        helpers"/"Try me" hotspots now (see cockpitNav.ts, StallInteriorView
        nav-kind hotspots). */}
    <Route path="/companions" element={<Navigate to="/stall/companions" replace />} />
    <Route path="/my-companions" element={
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
    <Route path="/admin/treasury" element={
      <ProtectedRoute allowedRoles={['gosat']}>
        <Layout><Suspense fallback={<LoadingFallback />}><GosatTreasuryPage /></Suspense></Layout>
      </ProtectedRoute>
    } />
    <Route path="/admin/payouts" element={
      <ProtectedRoute allowedRoles={['gosat', 'admin']}>
        <Layout><Suspense fallback={<LoadingFallback />}><AdminPayoutsPage /></Suspense></Layout>
      </ProtectedRoute>
    } />
    <Route path="/admin/orchards" element={
      <ProtectedRoute allowedRoles={['gosat', 'admin']}>
        <Layout><Suspense fallback={<LoadingFallback />}><GosatOrchardsPage /></Suspense></Layout>
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
    {/* Flow v2 step 10: absorbed into /stall/build's Profile tab (step 9). */}
    <Route path="/profile" element={<Navigate to="/stall/build?tab=profile" replace />} />
    <Route path="/profile/:userId" element={
      <ProtectedRoute><MemberProfilePage /></ProtectedRoute>
    } />
    {/* Was its own stale wallet/payout stub (Binance Pay copy, a link-through
        to Payout Settings) -- there is exactly one payout settings page now,
        see /settings/payouts. */}
    <Route path="/wallet-settings" element={<Navigate to="/settings/payouts" replace />} />
    <Route path="/settings/payouts" element={
      <ProtectedRoute><Layout><PayoutSettingsPage /></Layout></ProtectedRoute>
    } />
    <Route path="/settings/payouts/paypal-connected" element={
      <ProtectedRoute><PaypalConnectedPage /></ProtectedRoute>
    } />
    <Route path="/my-orders" element={
      <ProtectedRoute><Layout><MyOrdersPage /></Layout></ProtectedRoute>
    } />
    <Route path="/my-seeds" element={
      <ProtectedRoute><Layout><MySeedsPage /></Layout></ProtectedRoute>
    } />
    <Route path="/gosat/escrow" element={
      <ProtectedRoute><Layout><EscrowQueuePage /></Layout></ProtectedRoute>
    } />
    <Route path="/books" element={
      <ProtectedRoute><Layout><BooksPage /></Layout></ProtectedRoute>
    } />
    <Route path="/books/catalog/:itemId" element={
      <ProtectedRoute><Layout><BooksCatalogItemPage /></Layout></ProtectedRoute>
    } />
    {/* Standalone invoice creation is superseded by the job/estimate flow
        below (an invoice now always belongs to an estimate's payment
        schedule) -- redirected rather than left live and broken. */}
    <Route path="/books/invoices/new" element={<Navigate to="/books/jobs/new" replace />} />
    <Route path="/books/invoices/:id" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><Layout><InvoiceViewPage /></Layout></Suspense></ProtectedRoute>
    } />
    <Route path="/books/invoicing" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><Layout><JobInvoicingDashboardPage /></Layout></Suspense></ProtectedRoute>
    } />
    <Route path="/books/jobs/new" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><Layout><JobNoteFormPage /></Layout></Suspense></ProtectedRoute>
    } />
    <Route path="/books/jobs/:id" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><Layout><JobDetailPage /></Layout></Suspense></ProtectedRoute>
    } />
    <Route path="/books/estimates/new" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><Layout><EstimateBuilderPage /></Layout></Suspense></ProtectedRoute>
    } />
    {/* Public: a customer paying an invoice or approving an estimate may
        have no S2G account at all -- no ProtectedRoute, no Layout (nothing
        here assumes a signed-in member's chrome). Keyed by the invoice's/
        estimate's own unguessable token. */}
    {/* Paystack's checkout callback_url -- registered before /pay/:publicToken
        so "paystack" is never swallowed as a publicToken value. */}
    <Route path="/pay/paystack/return" element={
      <Suspense fallback={<LoadingFallback />}><PaystackReturnPage /></Suspense>
    } />
    <Route path="/pay/:publicToken" element={
      <Suspense fallback={<LoadingFallback />}><PublicPayPage /></Suspense>
    } />
    <Route path="/estimate/:publicToken" element={
      <Suspense fallback={<LoadingFallback />}><PublicEstimateApprovalPage /></Suspense>
    } />
    <Route path="/join" element={
      <Suspense fallback={<LoadingFallback />}><JoinPage /></Suspense>
    } />
    <Route path="/call/:roomKind/:roomId" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><CallPage /></Suspense></ProtectedRoute>
    } />
    <Route path="/admin/subscriptions" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Suspense fallback={<LoadingFallback />}><Layout><GosatSubscriptionsPage /></Layout></Suspense></ProtectedRoute>
    } />
    {/* S2G Balance is feature-flagged off (non-custodial model, 2026-09-03
        legal decision) -- route kept, page hidden behind the flag rather
        than removed, so it can come back with one env var. */}
    <Route path="/wallet" element={
      S2G_BALANCE_ENABLED
        ? <ProtectedRoute><Layout><MyWalletPage /></Layout></ProtectedRoute>
        : <Navigate to="/dashboard" replace />
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
    {/* moderate-media's gosat alert links here (action_url) -- the queue
        itself lives in the "moderation" tab of the admin dashboard. */}
    <Route path="/admin/moderation" element={<Navigate to="/admin/dashboard?tab=moderation" replace />} />
    {/* Flow v2 step 1: duplicate route, same component as /admin/dashboard */}
    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
    <Route path="/admin/radio" element={<Navigate to="/grove-station?tab=admin" replace />} />
    <Route path="/admin/seeds" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}>
        <Layout><Suspense fallback={<LoadingFallback />}><AdminSeedsPage /></Suspense></Layout>
      </ProtectedRoute>
    } />
    <Route path="/admin/settlement-consents" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}>
        <Layout><Suspense fallback={<LoadingFallback />}><AdminSettlementConsentsPage /></Suspense></Layout>
      </ProtectedRoute>
    } />
    <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
    <Route path="/payment-success" element={<PaymentSuccessPage />} />
    {/* /commissions removed: fronted a "10% Commission Rate" badge for a
        program that doesn't exist -- the real mechanic (1% of S2G's fee to
        whoever invited a sower) has never paid anyone and isn't wired to a
        payout. Data and the underlying trigger are untouched; only this
        page is down. See spec-unified-fee-model.md follow-up discussion. */}
    <Route path="/my-tribe" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><MyTribePage /></Suspense></ProtectedRoute>
    } />
    <Route path="/achievements" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><GamificationDashboard /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/eternal-forest" element={
      <ProtectedRoute><Suspense fallback={<LoadingFallback />}><EternalForestPage /></Suspense></ProtectedRoute>
    } />
    {/* Flow v2 step 7: /search's content folded into /stalls-feed's own
        search box (step 6) -- redirect, carrying a `?q=` term across. */}
    <Route path="/search" element={<SearchRedirect />} />
    {/* 1-on-1 Live merged into /conversations 2026-09-19 -- see
        LegacyChatRedirect above. LiveRoomsPage.tsx is not deleted, only
        unreachable by this path. */}
    <Route path="/live-rooms" element={<ProtectedRoute><LegacyChatRedirect /></ProtectedRoute>} />

    <Route path="/create-live-room" element={
      <ProtectedRoute><Layout><CreateLiveRoomPage /></Layout></ProtectedRoute>
    } />
    {/* Flow v2, docs/FLOW-V2-MAP.md line 77: "MERGE INTO /stalls-feed --
        general marketplace browse folds into Tribal Gardens" -- same
        redirect-with-replace pattern as /browse-orchards below. No single
        chip fits "general marketplace" the way orchard fits
        /browse-orchards, so this lands on the default chip rather than a
        forced one. /products/upload, /products/edit/:id and
        /products/basket are untouched -- they're real routes reached
        internally (MyProductsPage's own Add/Edit actions, and the
        checkout basket respectively), not this browse page's own UI. */}
    <Route path="/products" element={<Navigate to="/stalls-feed" replace />} />
    {/* Flow v2 step 10: absorbed into /stall/build's Products tab (step
        9). /products/upload and /products/edit/:id stay real routes,
        deliberately NOT redirected -- MyProductsPage's own "Add"/"Edit"
        actions navigate to them directly (its own dedicated forms, never
        embedded inline), so redirecting them to the tab-view-only
        Products tab would drop the actual add/edit target and break
        those flows. Today's build (the tab embeds the list, not a
        rebuilt inline form) wins over the doc's "redirect all 7" here. */}
    <Route path="/my-products" element={<Navigate to="/stall/build?tab=products" replace />} />
    <Route path="/products/upload" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><UploadForm /></Suspense></Layout></ProtectedRoute>
    } />
    {/* Flow v2 step 10: absorbed into /stall/build's own Credentials/
        Business tabs (added in this step, alongside the redirect). */}
    <Route path="/seller/credentials" element={<Navigate to="/stall/build?tab=credentials" replace />} />
    <Route path="/seller/business-settings" element={<Navigate to="/stall/build?tab=business" replace />} />
    <Route path="/prescription/submit/:sowerId" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><PrescriptionSubmitPage /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/my-garden/prescriptions" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><PrescriptionsInboxPage /></Suspense></Layout></ProtectedRoute>
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
    <Route path="/admin/ai-usage" element={
      <ProtectedRoute allowedRoles={['admin', 'gosat']}><Layout><Suspense fallback={<LoadingFallback />}><AdminAiUsagePage /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/products/edit/:id" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><EditForm /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/products/basket" element={
      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><ProductBasketPage /></Suspense></Layout></ProtectedRoute>
    } />
    <Route path="/sower-library/:mode" element={
      <Layout><Suspense fallback={<LoadingFallback />}><SowerLibraryPage /></Suspense></Layout>
    } />
    {/* Flow v2 step 10: absorbed into /stall/build's Library tab (step
        9). /my-s2g-library/upload and /my-s2g-library/edit/:id stay real
        routes, same reasoning as /products/upload above -- their own
        dedicated forms, not redirected. */}
    <Route path="/my-s2g-library" element={<Navigate to="/stall/build?tab=library" replace />} />
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
  </>
);

export default AppRoutes;
