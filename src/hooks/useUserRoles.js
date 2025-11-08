import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

// Centralized role management with caching
const roleCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useUserRoles() {
  const { user } = useAuth()
  const userId = user?.id
  
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    
    const fetchRoles = async () => {
      console.log('🔍 [useUserRoles] Starting fetch for userId:', userId)
      
      if (!userId) {
        console.log('⚠️ [useUserRoles] No userId, clearing roles')
        setUserRoles([])
        setLoading(false)
        return
      }

      // Check cache first
      const cached = roleCache.get(userId)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ [useUserRoles] Using cached roles:', cached.roles)
        setUserRoles(cached.roles)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('🔄 [useUserRoles] Fetching from database for userId:', userId)
        
        const { data, error: fetchError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)

        console.log('📊 [useUserRoles] Database response:', { data, error: fetchError })

        if (fetchError) throw fetchError

        const roles = (data || []).map(r => r.role)
        
        console.log('✅ [useUserRoles] Extracted roles:', roles)
        
        // Cache the result
        roleCache.set(userId, {
          roles,
          timestamp: Date.now()
        })

        if (isMounted) {
          console.log('✅ [useUserRoles] Setting state with roles:', roles)
          setUserRoles(roles)
          setError(null)
        }
      } catch (err) {
        console.error('❌ [useUserRoles] Failed to fetch user roles:', err)
        if (isMounted) {
          setUserRoles([])
          setError(err.message)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchRoles()
    return () => { isMounted = false }
  }, [userId])

  // Memoize computed values
  const hasRole = useMemo(
    () => (role) => userRoles.includes(role),
    [userRoles]
  )

  const isAdmin = useMemo(() => userRoles.includes('admin'), [userRoles])
  const isGosat = useMemo(() => userRoles.includes('gosat'), [userRoles])
  const isAdminOrGosat = useMemo(() => isAdmin || isGosat, [isAdmin, isGosat])

  return useMemo(
    () => ({
      userRoles,
      loading,
      error,
      hasRole,
      isAdmin,
      isGosat,
      isAdminOrGosat
    }),
    [userRoles, loading, error, hasRole, isAdmin, isGosat, isAdminOrGosat]
  )
}

// Clear cache function for logout
export function clearRoleCache() {
  roleCache.clear()
}
