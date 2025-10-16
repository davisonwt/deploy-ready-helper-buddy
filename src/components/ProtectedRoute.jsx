import React, { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useRoles } from "../hooks/useRoles"

const AuthProtectedRoute = ({ children }) => {
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
    console.warn('🔐 Not authenticated → redirecting to /login')
    return <Navigate to="/login" replace />
  }

  return children
}

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const roles = useRoles()
  const [initiated, setInitiated] = useState(false)

  // Ensure roles are fetched when this guard mounts
  useEffect(() => {
    if (!initiated) {
      roles?.fetchUserRoles?.()
      setInitiated(true)
    }
  }, [initiated])

  console.log('🛡️ RoleProtectedRoute check:', {
    allowedRoles,
    userRoles: roles?.userRoles,
    rolesLoading: roles?.loading,
    authLoading,
    isAuthenticated
  })

  // Wait until both auth and roles are resolved; avoid premature redirect
  if (authLoading || roles?.loading || (Array.isArray(allowedRoles) && (roles?.userRoles?.length ?? 0) === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.some(role => roles?.hasRole(role))
  
  console.log('🛡️ Role check result:', {
    hasRequiredRole,
    allowedRoles,
    userRoles: roles?.userRoles
  })

  if (!hasRequiredRole) {
    console.warn('🚫 Access denied - redirecting to dashboard')
    return <Navigate to="/dashboard" replace />
  }

  return children
}

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  return shouldCheckRoles 
    ? <RoleProtectedRoute allowedRoles={allowedRoles}>{children}</RoleProtectedRoute>
    : <AuthProtectedRoute>{children}</AuthProtectedRoute>
}

export default ProtectedRoute