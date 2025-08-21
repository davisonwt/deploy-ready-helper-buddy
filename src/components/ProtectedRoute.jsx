import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useRoles } from "../hooks/useRoles"

export default function ProtectedRoute({ children, allowedRoles = null }) {
  try {
    const { isAuthenticated, loading: authLoading, user } = useAuth()
    const { hasRole, loading: rolesLoading } = useRoles()
    
    // EMERGENCY: Always allow access for specific admin user
    const isKnownAdmin = user?.id === '04754d57-d41d-4ea7-93df-542047a6785b'
    
    console.log('🛡️ ProtectedRoute check:', {
      user: user?.id,
      allowedRoles,
      isKnownAdmin,
      authLoading,
      rolesLoading
    })
    
    // Show loading while auth is loading (but skip role loading for known admin)
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
    
    // EMERGENCY: Always allow known admin user regardless of role check
    if (isKnownAdmin) {
      console.log('🚨 ADMIN USER BYPASSING ALL ROLE CHECKS')
      return children
    }
    
    // Check roles for other users only if roles are loaded
    if (allowedRoles && allowedRoles.length > 0 && !rolesLoading) {
      const hasRequiredRole = allowedRoles.some(role => hasRole(role))
      
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