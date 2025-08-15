import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth.jsx'

export function useRoles() {
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchUserRoles = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (fetchError) throw fetchError

      setUserRoles(data?.map(r => r.role) || [])
    } catch (err) {
      console.error('Error fetching user roles:', err)
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

  const isAdmin = () => hasRole('admin')
  const isGosat = () => hasRole('gosat')
  const isAdminOrGosat = () => {
    const result = isAdmin() || isGosat()
    console.log('isAdminOrGosat():', result, 'userRoles:', userRoles, 'loading:', loading)
    return result
  }

  const fetchAllUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (
            role,
            granted_at,
            granted_by
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return { success: true, data: data || [] }
    } catch (err) {
      console.error('Error fetching users:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const grantRole = async (userId, role) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: grantError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role: role,
          granted_by: user.id
        }])
        .select()

      if (grantError) throw grantError

      return { success: true, data }
    } catch (err) {
      console.error('Error granting role:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const revokeRole = async (userId, role) => {
    try {
      setLoading(true)
      setError(null)

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

  useEffect(() => {
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