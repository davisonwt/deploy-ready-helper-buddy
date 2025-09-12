import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useRoles } from "../hooks/useRoles"

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const shouldCheckRoles = Array.isArray(allowedRoles) && allowedRoles.length > 0
  const roles = shouldCheckRoles ? useRoles() : null
  
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
  
  // Check roles if specified and roles are loaded
  if (shouldCheckRoles) {
    if (roles?.loading) {
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