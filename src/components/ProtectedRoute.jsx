import React, { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

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
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [userRoles, setUserRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)

  // Local role fetch to avoid cross-hook issues
  useEffect(() => {
    let active = true
    const loadRoles = async () => {
      if (!user?.id) { if (active) { setUserRoles([]); setRolesLoading(false) } ; return }
      try {
        setRolesLoading(true)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
        if (error) throw error
        if (active) setUserRoles((data || []).map(r => r.role))
      } catch (e) {
        console.error('RoleProtectedRoute: roles fetch failed', e)
        if (active) setUserRoles([])
      } finally {
        if (active) setRolesLoading(false)
      }
    }
    loadRoles()
    return () => { active = false }
  }, [user?.id])

  const hasRole = (role) => userRoles.includes(role)

  // Wait until both auth and roles are resolved; avoid premature redirect
  if (authLoading || rolesLoading || (Array.isArray(allowedRoles) && userRoles.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.some(role => hasRole(role))
  
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