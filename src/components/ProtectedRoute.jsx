import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import RoleChecker from './RoleChecker'
import { RequireSecuritySetup } from './auth/RequireSecuritySetup'

function AuthProtectedRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  if (authLoading) return <LoadingSpinner full text="Authenticating..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function ProtectedRoute({ children, allowedRoles = null, allowIncompleteSetup = false }) {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  const inner = shouldCheckRoles ? (
    <RoleChecker allowedRoles={allowedRoles}>{children}</RoleChecker>
  ) : (
    <AuthProtectedRoute>{children}</AuthProtectedRoute>
  )
  if (allowIncompleteSetup) return inner
  return <RequireSecuritySetup>{inner}</RequireSecuritySetup>
}
