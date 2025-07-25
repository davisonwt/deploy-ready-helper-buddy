import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

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
        .select(`
          *,
          profiles!profile_id (
            first_name,
            last_name,
            display_name,
            location
          )
        `)
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

      // Increment view count
      await supabase.rpc('increment_orchard_views', { orchard_uuid: id })

      const { data, error: fetchError } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles!profile_id (
            first_name,
            last_name,
            display_name,
            location,
            avatar_url
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      return { success: true, data }
    } catch (err) {
      console.error('Error fetching orchard:', err)
      return { success: false, error: err.message }
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

      const { data, error: updateError } = await supabase
        .from('orchards')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

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

      const { error: deleteError } = await supabase
        .from('orchards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

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
        .select(`
          *,
          profiles!bestower_profile_id (
            first_name,
            last_name,
            display_name
          )
        `)
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