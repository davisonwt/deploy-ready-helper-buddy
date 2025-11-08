import { useEffect, useState, useMemo, memo } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

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
    return <Navigate to="/login" replace />
  }

  return children
}, (prev, next) => {
  // Only re-render if children actually change
  return prev.children === next.children
})

const RoleProtectedRoute = memo(({ children, allowedRoles }) => {
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  
  // Stabilize userId to prevent cascading re-renders
  const userId = useMemo(() => user?.id, [user?.id])
  
  const [userRoles, setUserRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(true)

  // Local role fetch to avoid cross-hook issues
  useEffect(() => {
    let active = true
    const loadRoles = async () => {
      if (!userId) { 
        if (active) { 
          setUserRoles([])
          setRolesLoading(false)
        }
        return 
      }
      try {
        setRolesLoading(true)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
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
  }, [userId])

  // Memoize role check function
  const hasRole = useMemo(
    () => (role) => userRoles.includes(role),
    [userRoles]
  )

  // Only show loading if we're still fetching and there's a user
  if (authLoading || (userId && rolesLoading)) {
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
    return <Navigate to="/dashboard" replace />
  }

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