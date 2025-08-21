import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { clearOrchardCache } from '../utils/orchardLoader'

export function useOrchards() {
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchOrchards = async (filters = {}) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('orchards')
        .select(`*`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setOrchards(data || [])
    } catch (err) {
      console.error('Error fetching orchards:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrchardById = async (id) => {
    try {
      setLoading(true)
      setError(null)

      // First verify we have authentication
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 fetchOrchardById session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        orchardId: id
      })

      if (!session) {
        console.error('❌ No session found in fetchOrchardById')
        return { success: false, error: 'Authentication session expired. Please log in again.' }
      }

      // Use maybeSingle() to handle cases where orchard doesn't exist or isn't accessible
      const { data, error: fetchError } = await supabase
        .from('orchards')
        .select(`*`)
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle()

      console.log('🔍 Orchard fetch result:', { 
        hasData: !!data, 
        error: fetchError?.message,
        orchardUserId: data?.user_id,
        currentUserId: session?.user?.id
      })

      if (fetchError) {
        console.error('❌ Database error:', fetchError)
        return { success: false, error: `Database error: ${fetchError.message}` }
      }

      if (!data) {
        console.warn('⚠️ No orchard found with ID:', id)
        return { success: false, error: 'Orchard not found or you do not have permission to view it.' }
      }

      // Try to increment view count, but don't fail if it doesn't work
      try {
        await supabase.rpc('increment_orchard_views', { orchard_uuid: id })
        console.log('✅ View count incremented for orchard:', id)
      } catch (viewError) {
        console.warn('⚠️ Failed to increment view count:', viewError)
      }

      return { success: true, data }
    } catch (err) {
      console.error('❌ Network/System error fetching orchard:', err)
      
      // Handle different types of errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        return { success: false, error: 'Network connection error. Please check your internet connection and try again.' }
      }
      
      return { success: false, error: err.message || 'Unknown error occurred while loading orchard.' }
    } finally {
      setLoading(false)
    }
  }

  const createOrchard = async (orchardData) => {
    try {
      if (!user) throw new Error('User must be authenticated')

      setLoading(true)
      setError(null)

      const { data, error: createError } = await supabase
        .from('orchards')
        .insert([{
          ...orchardData,
          user_id: user.id
        }])
        .select()
        .single()

      if (createError) throw createError

      return { success: true, data }
    } catch (err) {
      console.error('Error creating orchard:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateOrchard = async (id, updates) => {
    try {
      if (!user) throw new Error('User must be authenticated')

      setLoading(true)
      setError(null)

      // Check if user is gosat/admin
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      
      const userRoles = rolesData?.map(r => r.role) || []
      const isGosat = userRoles.includes('gosat') || userRoles.includes('admin')

      // Build query - gosats can update any orchard, others only their own
      let query = supabase
        .from('orchards')
        .update(updates)
        .eq('id', id)

      if (!isGosat) {
        query = query.eq('user_id', user.id)
      }

      const { data, error: updateError } = await query
        .select()
        .single()

      if (updateError) throw updateError

      // Clear cache for this orchard to force fresh data
      clearOrchardCache(id)

      return { success: true, data }
    } catch (err) {
      console.error('Error updating orchard:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteOrchard = async (id) => {
    try {
      if (!user) throw new Error('User must be authenticated')

      setLoading(true)
      setError(null)

      // Only add user_id filter if not admin/gosat
      // The RLS policy will handle permission checking
      const { error: deleteError } = await supabase
        .from('orchards')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      return { success: true }
    } catch (err) {
      console.error('Error deleting orchard:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const getBestowalsForOrchard = async (orchardId) => {
    try {
      const { data, error } = await supabase
        .from('bestowals')
        .select(`*`)
        .eq('orchard_id', orchardId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (err) {
      console.error('Error fetching bestowals:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    orchards,
    loading,
    error,
    fetchOrchards,
    fetchOrchardById,
    createOrchard,
    updateOrchard,
    deleteOrchard,
    getBestowalsForOrchard
  }
}