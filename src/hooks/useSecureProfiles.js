import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'

/**
 * Secure profile access hook that enforces data privacy
 * Only exposes safe, non-sensitive profile data for public use
 */
export function useSecureProfiles() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Get public-safe profile data only
   * This function only returns non-sensitive fields
   */
  const getPublicProfile = async (userId) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.rpc('get_public_profile', {
        profile_user_id: userId
      })
      
      if (error) throw error
      return { success: true, data: data?.[0] || null }
    } catch (err) {
      console.error('Error fetching public profile:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get multiple public profiles (safe fields only)
   * Used for user lists, chat participants, etc.
   */
  const getPublicProfiles = async (userIds) => {
    try {
      setLoading(true)
      setError(null)
      
      // Use individual RPC calls for each user ID to maintain security
      const profilePromises = userIds.map(userId => 
        supabase.rpc('get_public_profile', { profile_user_id: userId })
      )
      
      const results = await Promise.all(profilePromises)
      const profiles = results
        .filter(result => !result.error && result.data?.[0])
        .map(result => result.data[0])
      
      return { success: true, data: profiles }
    } catch (err) {
      console.error('Error fetching public profiles:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get user's own complete profile (all fields)
   * Only works for the authenticated user's own profile
   */
  const getOwnProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: session } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('Not authenticated')
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, bio, location, website, social_links, created_at, updated_at, is_verified, username')
        .eq('user_id', session.user.id)
        .maybeSingle()
      
      if (error) throw error
      return { success: true, data }
    } catch (err) {
      console.error('Error fetching own profile:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update user's own profile
   * Only allows updating the authenticated user's own profile
   */
  const updateOwnProfile = async (updates) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: session } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('Not authenticated')
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single()
      
      if (error) throw error
      return { success: true, data }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Admin function to get profile data for moderation
   * Only available to admins/gosats with proper access logging
   */
  const getProfileForModeration = async (userId, reason) => {
    try {
      setLoading(true)
      setError(null)
      
      if (!reason || reason.trim().length < 10) {
        throw new Error('Access reason required (minimum 10 characters)')
      }
      
      const { data, error } = await supabase.rpc('get_profile_admin_data', {
        profile_user_id: userId,
        access_reason: reason.trim()
      })
      
      if (error) throw error
      return { success: true, data: data?.[0] || null }
    } catch (err) {
      console.error('Error fetching profile for moderation:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    getPublicProfile,
    getPublicProfiles,
    getOwnProfile,
    updateOwnProfile,
    getProfileForModeration
  }
}