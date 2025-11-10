import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

// Stable return shape for consumers
export interface UseRolesResult {
  roles: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  // Backward compatible fields (kept to avoid breaking existing components)
  hasRole: (role: string) => boolean
  isAdmin: boolean
  isGosat: boolean
  isAdminOrGosat: boolean
  fetchAllUsers: () => Promise<{ success: boolean; data: any; error?: string }>
  grantRole: (userId: string, role: string) => Promise<{ success: boolean; data?: any; error?: string }>
  revokeRole: (userId: string, role: string) => Promise<{ success: boolean; error?: string }>
}

// Bullet-proof hook: top-level only usage inside; never throws; SSR-safe
export function useRoles(): UseRolesResult {
  const { user } = useAuth()
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserRoles = useCallback(async () => {
    // Never throw from hook; collect errors in state
    if (!user) {
      setRoles([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (fetchError) {
        setError(fetchError.message)
        setRoles([])
        return
      }

      const nextRoles = (data || []).map((r: any) => r.role as string)
      setRoles(nextRoles)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load roles')
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Only run on client
    void fetchUserRoles()
  }, [fetchUserRoles])

  const hasRole = useCallback((role: string) => roles.includes(role), [roles])
  const isAdmin = roles.includes('admin')
  const isGosat = roles.includes('gosat')
  const isAdminOrGosat = isAdmin || isGosat

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name, verification_status, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) {
        return { success: false, error: profilesError.message, data: [] as any }
      }

      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at, granted_by')
        .order('created_at', { ascending: false })

      if (rolesError) {
        return { success: false, error: rolesError.message, data: [] as any }
      }

      const combined = (profiles || []).map((profile: any) => ({
        ...profile,
        user_roles: (userRolesData || []).filter((r: any) => r.user_id === profile.user_id),
      }))

      return { success: true, data: combined as any }
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Failed to fetch users', data: [] as any }
    } finally {
      setLoading(false)
    }
  }, [])

  const grantRole = useCallback(async (userId: string, role: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session?.user) {
        return { success: false, error: 'Authentication required. Please log in again.' }
      }

      const { data, error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role, granted_by: sessionData.session.user.id })
        .select()

      if (insertError) {
        if ((insertError as any).code === '23505') {
          return { success: false, error: 'User already has this role' }
        }
        return { success: false, error: insertError.message }
      }

      return { success: true, data }
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Failed to grant role' }
    } finally {
      setLoading(false)
    }
  }, [])

  const revokeRole = useCallback(async (userId: string, role: string) => {
    try {
      setLoading(true)
      setError(null)

      await supabase.rpc('log_admin_action', {
        action_type: 'revoke_role',
        target_user_id: userId,
        action_details: { role },
      })

      const { error: revokeError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role)

      if (revokeError) {
        return { success: false, error: revokeError.message }
      }

      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Failed to revoke role' }
    } finally {
      setLoading(false)
    }
  }, [])

  const result: UseRolesResult = useMemo(() => ({
    roles,
    loading,
    error,
    refetch: fetchUserRoles,
    hasRole,
    isAdmin,
    isGosat,
    isAdminOrGosat,
    fetchAllUsers,
    grantRole,
    revokeRole,
  }), [roles, loading, error, fetchUserRoles, hasRole, isAdmin, isGosat, isAdminOrGosat, fetchAllUsers, grantRole, revokeRole])

  return result
}

export default useRoles
