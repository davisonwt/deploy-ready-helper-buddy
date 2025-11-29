import React, { useState, useEffect } from 'react'
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

// Wrapper component that delays rendering until React is ready
function DelayedRoleProtectedRoute({ children, allowedRoles }) {
  const [ready, setReady] = useState(false)
  
  useEffect(() => {
    // Use requestIdleCallback if available for better timing, otherwise use setTimeout
    // This ensures React's dispatcher is fully initialized before rendering hooks
    let timeoutId
    let idleCallbackId
    
    const scheduleRender = () => {
      if ('requestIdleCallback' in window) {
        idleCallbackId = requestIdleCallback(() => setReady(true), { timeout: 300 })
      } else {
        timeoutId = setTimeout(() => setReady(true), 300)
      }
    }
    
    scheduleRender()
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (idleCallbackId && 'cancelIdleCallback' in window) {
        cancelIdleCallback(idleCallbackId)
      }
    }
  }, [])
  
  if (!ready) {
    return <LoadingSpinner full text="Initializing permissions..." />
  }
  
  return <RoleProtectedRouteInner allowedRoles={allowedRoles}>{children}</RoleProtectedRouteInner>
}

// Inner component that uses hooks - only rendered after delay
function RoleProtectedRouteInner({ children, allowedRoles = [] }) {
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
    <DelayedRoleProtectedRoute allowedRoles={allowedRoles || []}>{children}</DelayedRoleProtectedRoute>
  ) : (
    <AuthProtectedRoute>{children}</AuthProtectedRoute>
  )
}
