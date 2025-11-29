import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserRoles } from '@/hooks/useUserRoles'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function RoleChecker({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hasRole, loading: rolesLoading } = useUserRoles()

  if (authLoading || rolesLoading) {
    return <LoadingSpinner full text="Loading permissions..." />
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles.some((r) => hasRole(r))
    : true

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}
