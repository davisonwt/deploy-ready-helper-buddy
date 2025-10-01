import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useRoles } from "../hooks/useRoles"

const AuthProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()

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

  return children
}

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const roles = useRoles()

  if (authLoading || roles?.loading) {
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
  if (!hasRequiredRole) {
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