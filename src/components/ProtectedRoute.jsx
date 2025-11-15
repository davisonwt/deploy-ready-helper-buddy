import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserRoles } from '@/hooks/useUserRoles'
import { LoadingSpinner } from '@/components/LoadingSpinner'

function AuthProtectedRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  if (authLoading) return <LoadingSpinner full text="Authenticating..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { userRoles, hasRole, loading: rolesLoading } = useUserRoles()

  if (authLoading || rolesLoading) return <LoadingSpinner full text="Loading permissions..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles.some((r) => hasRole(r))
    : true

  if (!hasRequiredRole) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  return shouldCheckRoles ? (
    <RoleProtectedRoute allowedRoles={allowedRoles || []}>{children}</RoleProtectedRoute>
  ) : (
    <AuthProtectedRoute>{children}</AuthProtectedRoute>
  )
}
