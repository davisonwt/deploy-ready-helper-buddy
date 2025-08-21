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
      // Get the billing completion status from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('has_complete_billing_info')
        .eq('user_id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      // Get the actual billing data from secure function
      const { data: billingData, error: billingError } = await supabase
        .rpc('get_user_billing_info_secure', { target_user_id: user.id })

      if (billingError) {
        // If there's no billing data yet, that's okay
        if (billingError.code !== 'PGRST116') {
          console.error('Error fetching billing data:', billingError)
        }
      }

      // Combine the data - billing function returns array, take first item
      const billing = billingData?.[0] || {}
      const billingInfo = {
        billing_address_line1: billing.billing_address_line1 || '',
        billing_address_line2: billing.billing_address_line2 || '',
        billing_city: billing.billing_city || '',
        billing_state: billing.billing_state || '',
        billing_postal_code: billing.billing_postal_code || '',
        billing_country: billing.billing_country || '',
        billing_phone: billing.billing_phone || '',
        billing_email: billing.billing_email || '',
        billing_organization: billing.billing_organization || '',
        has_complete_billing_info: profile?.has_complete_billing_info || false
      }

      setBillingInfo(billingInfo)
      setHasCompleteBillingInfo(profile?.has_complete_billing_info || false)
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
      // Use the secure update function
      const { data, error } = await supabase
        .rpc('update_user_billing_info_secure', {
          target_user_id: user.id,
          p_billing_address_line1: newBillingInfo.billing_address_line1,
          p_billing_address_line2: newBillingInfo.billing_address_line2,
          p_billing_city: newBillingInfo.billing_city,
          p_billing_state: newBillingInfo.billing_state,
          p_billing_postal_code: newBillingInfo.billing_postal_code,
          p_billing_country: newBillingInfo.billing_country,
          p_billing_phone: newBillingInfo.billing_phone,
          p_billing_email: newBillingInfo.billing_email,
          p_billing_organization: newBillingInfo.billing_organization,
        })

      if (error) throw error

      // Reload billing info to get the updated data
      await loadBillingInfo()
      
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