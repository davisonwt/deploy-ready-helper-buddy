import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export function useBestowals() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const createBestowal = async (bestowData) => {
    try {
      if (!user) throw new Error('User must be authenticated')

      setLoading(true)
      setError(null)

      const { data, error: createError } = await supabase
        .from('bestowals')
        .insert([{
          ...bestowData,
          bestower_id: user.id,
          payment_status: 'pending'
        }])
        .select()
        .single()

      if (createError) throw createError

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

      const updateData = { payment_status: status }
      if (paymentReference) {
        updateData.payment_reference = paymentReference
      }

      const { data, error: updateError } = await supabase
        .from('bestowals')
        .update(updateData)
        .eq('id', bestowId)
        .select()
        .single()

      if (updateError) throw updateError

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

      const { data, error: fetchError } = await supabase
        .from('bestowals')
        .select(`
          *,
          orchards:orchard_id (
            title,
            category,
            images
          )
        `)
        .eq('bestower_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return { success: true, data: data || [] }
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

      const { data, error: fetchError } = await supabase
        .from('bestowals')
        .select(`
          *,
          profiles:bestower_id (
            first_name,
            last_name,
            display_name,
            avatar_url
          )
        `)
        .eq('orchard_id', orchardId)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      return { success: true, data: data || [] }
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