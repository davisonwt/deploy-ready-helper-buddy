import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Lazy load the role-checking component to avoid hooks issues during flushSync
const RoleChecker = React.lazy(() => import('./RoleChecker'))

function AuthProtectedRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  if (authLoading) return <LoadingSpinner full text="Authenticating..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleProtectedRoute({ children, allowedRoles = [] }) {
  return (
    <Suspense fallback={<LoadingSpinner full text="Loading permissions..." />}>
      <RoleChecker allowedRoles={allowedRoles}>{children}</RoleChecker>
    </Suspense>
  )
}

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  return shouldCheckRoles ? (
    <RoleProtectedRoute allowedRoles={allowedRoles || []}>{children}</RoleProtectedRoute>
  ) : (
    <AuthProtectedRoute>{children}</AuthProtectedRoute>
  )
}
