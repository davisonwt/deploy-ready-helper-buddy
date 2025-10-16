import React from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useRoles() {
  const { user } = useAuth()
  const [userRoles, setUserRoles] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  const fetchUserRoles = async () => {
    if (!user) {
      console.log('🔑 fetchUserRoles: No user, skipping role fetch')
      return
    }

    try {
      console.log('🔑 fetchUserRoles: Fetching roles for user:', user.id)
      console.log('🔑 fetchUserRoles: User email:', user.email)
      setLoading(true)
      setError(null)

      // Force the query and log everything
      const { data, error: fetchError, status, statusText } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      console.log('🔑 fetchUserRoles: Raw response:', { data, error: fetchError, status, statusText, userId: user.id })

      if (fetchError) {
        console.error('🔑 fetchUserRoles: Supabase error:', fetchError)
        throw fetchError
      }

      const roles = data?.map(r => r.role) || []
      console.log('🔑 fetchUserRoles: Final roles:', roles)
      setUserRoles(roles)
    } catch (err) {
      console.error('🔑 fetchUserRoles: Catch block error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hasRole = (role) => {
    const result = userRoles.includes(role)
    console.log(`hasRole(${role}):`, result, 'userRoles:', userRoles)
    return result
  }

  const isAdmin = userRoles.includes('admin')
  const isGosat = userRoles.includes('gosat')
  const isAdminOrGosat = isAdmin || isGosat

  const fetchAllUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Fetching all users and their roles...')

      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, first_name, last_name, verification_status, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError)
        throw profilesError
      }

      console.log('✅ Fetched profiles:', profiles?.length || 0)

      // Then get ALL user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at, granted_by')
        .order('created_at', { ascending: false })

      if (rolesError) {
        console.error('❌ Error fetching user roles:', rolesError)
        throw rolesError
      }

      console.log('✅ Fetched user roles:', userRoles?.length || 0, userRoles)

      // Combine the data - make sure each user gets their roles
      const usersWithRoles = profiles.map(profile => {
        const userRolesList = userRoles.filter(role => role.user_id === profile.user_id) || []
        console.log(`👤 User ${profile.display_name} (${profile.user_id}) has ${userRolesList.length} roles:`, userRolesList.map(r => r.role))
        return {
          ...profile,
          user_roles: userRolesList
        }
      })

      console.log('✅ Combined users with roles:', usersWithRoles.length)
      return { success: true, data: usersWithRoles }
    } catch (err) {
      console.error('❌ Error fetching users:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const grantRole = async (userId, role) => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔐 Starting role grant process...')
      console.log('👤 Target user:', userId)
      console.log('🎭 Role to grant:', role)

      // First check current auth state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔑 Session check:', { 
        hasSession: !!session, 
        userId: session?.user?.id,
        error: sessionError 
      })

      if (!session?.user) {
        console.error('❌ No session found - user not authenticated')
        throw new Error('Authentication required. Please log in again.')
      }

      console.log('✅ Authenticated as:', session.user.id)

      // Try direct insert first
      console.log('📝 Inserting role into database...')
      const { data, error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          granted_by: session.user.id
        })
        .select()

      if (insertError) {
        console.error('❌ Insert failed:', insertError)
        
        // Handle specific error cases
        if (insertError.code === '42501') {
          console.error('❌ RLS policy violation - insufficient permissions')
          
          // Try with service role call as backup
          console.log('🔄 Attempting service role bypass...')
          const { data: serviceData, error: serviceError } = await supabase.rpc('grant_user_role_admin', {
            target_user_id: userId,
            target_role: role
          })
          
          if (serviceError) {
            console.error('❌ Service role call also failed:', serviceError)
            throw new Error(`Permission denied. You need admin/gosat role to grant roles. Error: ${insertError.message}`)
          }
          
          console.log('✅ Service role call succeeded')
          return { success: true, data: serviceData }
        } else if (insertError.code === '23505') {
          throw new Error('User already has this role')
        } else {
          throw new Error(`Database error: ${insertError.message}`)
        }
      }

      console.log('✅ Role granted successfully via direct insert')
      return { success: true, data }

    } catch (err) {
      console.error('❌ Grant role failed:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const revokeRole = async (userId, role) => {
    try {
      setLoading(true)
      setError(null)

      // SECURITY: Log admin action for audit trail
      await supabase.rpc('log_admin_action', {
        action_type: 'revoke_role',
        target_user_id: userId,
        action_details: { role: role }
      })

      const { error: revokeError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role)

      if (revokeError) throw revokeError

      return { success: true }
    } catch (err) {
      console.error('Error revoking role:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    console.log('🔑 useRoles: useEffect triggered', { user: !!user, userId: user?.id, userEmail: user?.email })
    if (!user) {
      console.log('🔑 useRoles: No user found, skipping fetchUserRoles')
      setLoading(false) // No user means no roles to load
      setUserRoles([]) // Clear any existing roles
      return
    }
    console.log('🔑 useRoles: User found, calling fetchUserRoles')
    fetchUserRoles()
  }, [user])

  return {
    userRoles,
    loading,
    error,
    hasRole,
    isAdmin,
    isGosat,
    isAdminOrGosat,
    fetchUserRoles,
    fetchAllUsers,
    grantRole,
    revokeRole
  }
}