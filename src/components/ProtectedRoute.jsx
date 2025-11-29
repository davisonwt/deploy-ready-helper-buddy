import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import RoleChecker from './RoleChecker'

function AuthProtectedRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  if (authLoading) return <LoadingSpinner full text="Authenticating..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  return shouldCheckRoles ? (
    <RoleChecker allowedRoles={allowedRoles}>{children}</RoleChecker>
  ) : (
    <AuthProtectedRoute>{children}</AuthProtectedRoute>
  )
}
