import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useUserRoles } from "@/hooks/useUserRoles"
import { logInfo } from "@/lib/logging"
import { LoadingSpinner } from "@/components/LoadingSpinner"

// Removed memo wrapper to fix React dispatcher issue
const AuthProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()

  console.log('🔐 AuthProtectedRoute:', { isAuthenticated, authLoading })

  if (authLoading) {
    return <LoadingSpinner full text="Authenticating..." />
  }

  if (!isAuthenticated) {
    logInfo('ProtectedRoute redirect', { reason: 'unauthenticated', to: '/login' })
    return <Navigate to="/login" replace />
  }

  return children
}

// Removed memo wrapper to prevent dispatcher issues
const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const { userRoles, hasRole, loading: rolesLoading } = useUserRoles()

  console.log('🔒 [ProtectedRoute] Component render:', {
    isAuthenticated,
    userId: user?.id,
    userRoles,
    allowedRoles,
    authLoading,
    rolesLoading,
    currentPath: window.location.pathname
  })

  // Only show loading if still fetching
  if (authLoading || rolesLoading) {
    console.log('⏳ [ProtectedRoute] Loading state:', { authLoading, rolesLoading })
    return <LoadingSpinner full text="Loading permissions..." />
  }

  if (!isAuthenticated) {
    logInfo('RoleProtectedRoute redirect', { reason: 'unauthenticated', to: '/login' })
    return <Navigate to="/login" replace />
  }

  // Wait for roles to be loaded before checking access
  if (!userRoles.length && !authLoading && !rolesLoading) {
    console.warn("⏳ [ProtectedRoute] Waiting for roles to load...", {
      userId: user?.id,
      userRoles,
      authLoading,
      rolesLoading
    })
    return <LoadingSpinner full text="Loading roles..." />
  }

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.some(role => hasRole(role))
  
  if (!hasRequiredRole) {
    console.error('🚫 [ROUTE_BLOCKED] Missing required role', { 
      userId: user?.id,
      userRoles, 
      allowedRoles, 
      currentPath: window.location.pathname,
      roleCheckResults: allowedRoles.map(role => ({ role, hasRole: hasRole(role) }))
    })
    return <Navigate to="/dashboard" replace />
  }

  console.log('✅ [ROUTE_ALLOWED] Role check passed', { 
    userId: user?.id,
    userRoles,
    allowedRoles, 
    currentPath: window.location.pathname 
  })

  return children
}

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  return shouldCheckRoles 
    ? <RoleProtectedRoute allowedRoles={allowedRoles}>{children}</RoleProtectedRoute>
    : <AuthProtectedRoute>{children}</AuthProtectedRoute>
}

export default ProtectedRoute