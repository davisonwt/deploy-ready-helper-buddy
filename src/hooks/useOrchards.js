import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { clearOrchardCache } from '../utils/orchardLoader'
import {
  fetchOrchardsList,
  fetchOrchardByIdWithSession,
  createOrchard as apiCreateOrchard,
  updateOrchard as apiUpdateOrchard,
  deleteOrchard as apiDeleteOrchard,
  fetchBestowals as apiFetchBestowals,
} from '@/api/orchards'

/**
 * Thin React wrapper around the orchards data-access layer (src/api/orchards.ts).
 * Public API and return shapes are preserved exactly so existing callers don't change.
 */
export function useOrchards() {
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchOrchards = async (filters = {}) => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchOrchardsList(filters)
      setOrchards(data)
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

      const data = await fetchOrchardByIdWithSession(id)

      if (!data) {
        return {
          success: false,
          error: 'Orchard not found or you do not have permission to view it.',
        }
      }
      return { success: true, data }
    } catch (err) {
      console.error('❌ Error fetching orchard:', err)

      if (err?.code === 'NO_SESSION') {
        return { success: false, error: err.message }
      }
      if (err?.code === 'DB_ERROR') {
        return { success: false, error: err.message }
      }
      if (err?.name === 'TypeError' && err.message?.includes('fetch')) {
        return {
          success: false,
          error: 'Network connection error. Please check your internet connection and try again.',
        }
      }
      return {
        success: false,
        error: err.message || 'Unknown error occurred while loading orchard.',
      }
    } finally {
      setLoading(false)
    }
  }

  const createOrchard = async (orchardData) => {
    try {
      if (!user) throw new Error('User must be authenticated')
      setLoading(true)
      setError(null)
      const data = await apiCreateOrchard(orchardData, user.id)
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

      // gosat/admin can update any orchard — role lookup stays in the hook (auth concern)
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      const userRoles = rolesData?.map(r => r.role) || []
      const isGosat = userRoles.includes('gosat') || userRoles.includes('admin')

      const data = await apiUpdateOrchard(id, updates, user.id, isGosat)

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
      await apiDeleteOrchard(id)
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
      const data = await apiFetchBestowals(orchardId)
      return { success: true, data }
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
