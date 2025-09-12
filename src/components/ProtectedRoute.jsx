import { Navigate } from "react-router-dom"
import { useEffect, useRef } from "react"
import { useAuth } from "../hooks/useAuth"
import { useRoles } from "../hooks/useRoles"

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  const roles = shouldCheckRoles ? useRoles() : null
  const hasFetchedRolesRef = useRef(false)

  // Ensure roles are fetched before role-gated checks to avoid premature redirects
  useEffect(() => {
    if (shouldCheckRoles && roles && !roles.loading && (roles.userRoles?.length ?? 0) === 0 && !hasFetchedRolesRef.current) {
      roles.fetchUserRoles?.()
      hasFetchedRolesRef.current = true
    }
  }, [shouldCheckRoles, roles?.loading, roles?.userRoles?.length])

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  // Check roles if specified and ensure we've attempted to fetch them
  if (shouldCheckRoles) {
    if (roles?.loading || (!hasFetchedRolesRef.current && (roles?.userRoles?.length ?? 0) === 0)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )
    }

    const hasRequiredRole = allowedRoles.some(role => roles?.hasRole(role))

    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />
    }
  }

  
  return children
}

export default ProtectedRoute