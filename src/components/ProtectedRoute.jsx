import { useMemo, memo } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useUserRoles } from "../hooks/useUserRoles"
import { logInfo } from "@/lib/logging"

const AuthProtectedRoute = memo(({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()

  console.log('🔐 AuthProtectedRoute:', { isAuthenticated, authLoading })

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    logInfo('ProtectedRoute redirect', { reason: 'unauthenticated', to: '/login' })
    return <Navigate to="/login" replace />
  }

  return children
}, (prev, next) => {
  // Only re-render if children actually change
  return prev.children === next.children
})

const RoleProtectedRoute = memo(({ children, allowedRoles }) => {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    logInfo('RoleProtectedRoute redirect', { reason: 'unauthenticated', to: '/login' })
    return <Navigate to="/login" replace />
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
}, (prev, next) => {
  // Only re-render if children or allowedRoles change
  return prev.children === next.children && 
         JSON.stringify(prev.allowedRoles) === JSON.stringify(next.allowedRoles)
})

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  return shouldCheckRoles 
    ? <RoleProtectedRoute allowedRoles={allowedRoles}>{children}</RoleProtectedRoute>
    : <AuthProtectedRoute>{children}</AuthProtectedRoute>
}

export default ProtectedRoute