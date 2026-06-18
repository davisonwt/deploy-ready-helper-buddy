import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  createBestowal as apiCreateBestowal,
  updateBestowalStatus as apiUpdateBestowalStatus,
  fetchUserBestowals as apiFetchUserBestowals,
  fetchOrchardBestowalsWithProfiles as apiFetchOrchardBestowals,
} from '@/api/bestowals'

/**
 * Thin React wrapper around the bestowals data-access layer (src/api/bestowals.ts).
 * Public API and {success,error} return shapes are preserved exactly.
 */
export function useBestowals() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const createBestowal = async (bestowData) => {
    try {
      if (!user) throw new Error('User must be authenticated')
      setLoading(true)
      setError(null)
      const data = await apiCreateBestowal(bestowData, user.id)
      return { success: true, data }
    } catch (err) {
      console.error('Error creating bestowal:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const updateBestowStatus = async (bestowId, status, paymentReference = null) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiUpdateBestowalStatus(bestowId, status, paymentReference)
      return { success: true, data }
    } catch (err) {
      console.error('Error updating bestowal status:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const getUserBestowals = async () => {
    try {
      if (!user) throw new Error('User must be authenticated')
      setLoading(true)
      setError(null)
      const data = await apiFetchUserBestowals(user.id)
      return { success: true, data }
    } catch (err) {
      console.error('Error fetching user bestowals:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const getOrchardBestowals = async (orchardId) => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetchOrchardBestowals(orchardId)
      return { success: true, data }
    } catch (err) {
      console.error('Error fetching orchard bestowals:', err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    createBestowal,
    updateBestowStatus,
    getUserBestowals,
    getOrchardBestowals
  }
}
