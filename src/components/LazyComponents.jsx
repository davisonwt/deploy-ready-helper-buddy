import { lazy } from 'react'

// Lazy load heavy components to improve initial load time
export const LazyAdminDashboard = lazy(() => import('./admin/AdminDashboard'))
export const LazyEnhancedAnalyticsDashboard = lazy(() => import('./admin/EnhancedAnalyticsDashboard'))
export const LazyUserManagementDashboard = lazy(() => import('./admin/UserManagementDashboard'))
export const LazyContentModerationDashboard = lazy(() => import('./admin/ContentModerationDashboard'))
export const LazyPaymentMonitoring = lazy(() => import('./admin/PaymentMonitoring'))
export const LazyGamificationDashboard = lazy(() => import('./gamification/GamificationDashboard'))
export const LazyVideoFeed = lazy(() => import('./community/VideoFeed'))
export const LazyComprehensiveLiveSession = lazy(() => import('./live/ComprehensiveLiveSession'))
