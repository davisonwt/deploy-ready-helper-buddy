import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/integrations/supabase/client'

export const useBillingInfo = () => {
  const { user } = useAuth()
  const [billingInfo, setBillingInfo] = useState(null)
  const [hasCompleteBillingInfo, setHasCompleteBillingInfo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      loadBillingInfo()
    }
  }, [user])

  const loadBillingInfo = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          billing_address_line1,
          billing_address_line2,
          billing_city,
          billing_state,
          billing_postal_code,
          billing_country,
          billing_phone,
          billing_email,
          billing_organization,
          has_complete_billing_info
        `)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (profile) {
        setBillingInfo(profile)
        setHasCompleteBillingInfo(profile.has_complete_billing_info || false)
      } else {
        setBillingInfo(null)
        setHasCompleteBillingInfo(false)
      }
    } catch (err) {
      console.error('Error loading billing info:', err)
      setError(err.message)
      setBillingInfo(null)
      setHasCompleteBillingInfo(false)
    } finally {
      setLoading(false)
    }
  }

  const updateBillingInfo = async (newBillingInfo) => {
    if (!user) return { success: false, error: 'User not authenticated' }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(newBillingInfo)
        .eq('user_id', user.id)
        .select(`
          billing_address_line1,
          billing_address_line2,
          billing_city,
          billing_state,
          billing_postal_code,
          billing_country,
          billing_phone,
          billing_email,
          billing_organization,
          has_complete_billing_info
        `)
        .single()

      if (error) throw error

      setBillingInfo(data)
      setHasCompleteBillingInfo(data.has_complete_billing_info || false)
      
      return { success: true, data }
    } catch (err) {
      console.error('Error updating billing info:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const checkBillingInfoComplete = () => {
    if (!billingInfo) return false
    
    const requiredFields = [
      'billing_address_line1',
      'billing_city',
      'billing_postal_code',
      'billing_country',
      'billing_email'
    ]
    
    return requiredFields.every(field => 
      billingInfo[field] && billingInfo[field].trim() !== ''
    )
  }

  return {
    billingInfo,
    hasCompleteBillingInfo,
    loading,
    error,
    loadBillingInfo,
    updateBillingInfo,
    checkBillingInfoComplete,
    needsBillingInfo: !hasCompleteBillingInfo
  }
}