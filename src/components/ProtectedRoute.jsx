import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useRoles } from "../hooks/useRoles"

export default function ProtectedRoute({ children, allowedRoles = null }) {
  try {
    const { isAuthenticated, loading: authLoading, user } = useAuth()
    const { hasRole, loading: rolesLoading } = useRoles()
    
    // Show loading while auth or roles are loading
    if (authLoading || (allowedRoles && rolesLoading)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )
    }
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    
    // Check roles if specified
    if (allowedRoles && allowedRoles.length > 0) {
      // EMERGENCY: Allow specific admin user during auth issues
      const isKnownAdmin = user?.id === '04754d57-d41d-4ea7-93df-542047a6785b'
      
      const hasRequiredRole = allowedRoles.some(role => hasRole(role)) || isKnownAdmin
      
      if (!hasRequiredRole) {
        console.log('🚨 Access denied - user lacks required roles:', allowedRoles)
        return <Navigate to="/dashboard" replace />
      }
    }
    
    return children
  } catch (error) {
    console.error('ProtectedRoute error:', error)
    return <Navigate to="/login" replace />
  }
}