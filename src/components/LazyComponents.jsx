import { lazy } from 'react'

// Lazy load heavy admin components
export const LazyAdminDashboard = lazy(() => import('./admin/AdminDashboard'))
export const LazyEnhancedAnalyticsDashboard = lazy(() => import('./admin/EnhancedAnalyticsDashboard'))
export const LazyUserManagementDashboard = lazy(() => import('./admin/UserManagementDashboard'))
export const LazyContentModerationDashboard = lazy(() => import('./admin/ContentModerationDashboard'))
export const LazyPaymentMonitoring = lazy(() => import('./admin/PaymentMonitoring'))

// Lazy load gamification features
export const LazyGamificationDashboard = lazy(() => import('./gamification/GamificationDashboard'))
export const LazyGamificationHUD = lazy(() => import('./gamification/GamificationHUD'))
export const LazyGamificationFloatingButton = lazy(() => import('./gamification/GamificationFloatingButton'))

// Lazy load community features
export const LazyVideoFeed = lazy(() => import('./community/VideoFeed'))
export const LazyVideoUploadModal = lazy(() => import('./community/VideoUploadModal'))

// Lazy load live session features
export const LazyComprehensiveLiveSession = lazy(() => import('./live/ComprehensiveLiveSession'))
export const LazyUniversalLiveSessionInterface = lazy(() => import('./live/UniversalLiveSessionInterface'))

// Lazy load radio features
export const LazyRadioPage = lazy(() => import('./radio/RadioPage'))
export const LazyLiveStreamInterface = lazy(() => import('./radio/LiveStreamInterface'))
export const LazyDJMusicLibrary = lazy(() => import('./radio/DJMusicLibrary'))

// Lazy load AI features
export const LazyOrchardMarketingAssistant = lazy(() => import('./ai/OrchardMarketingAssistant'))
export const LazyVideoMarketingDashboard = lazy(() => import('./ai/VideoMarketingDashboard'))

// Lazy load voice/call features
export const LazyCallInterface = lazy(() => import('./chat/CallInterface'))
export const LazyIncomingCallOverlay = lazy(() => import('./chat/IncomingCallOverlay'))
export const LazyVoiceVideoCall = lazy(() => import('./webrtc/VoiceVideoCall'))
