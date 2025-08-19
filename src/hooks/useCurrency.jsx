import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

export function useCurrency() {
  const { user } = useAuth()
  
  // USDC is now the mandatory payment method
  const currency = "USDC"
  
  // Fixed USDC currency data
  const currencies = [
    { code: 'USDC', symbol: 'USDC', name: 'USD Coin' }
  ]
  
  const loading = false
  
  // Format amount with USDC
  const formatAmount = (amount) => {
    if (!amount || isNaN(amount)) return `0.00 USDC`
    
    const value = parseFloat(amount)
    if (isNaN(value) || !isFinite(value)) {
      return `0.00 USDC`
    }
    
    return `${value.toFixed(2)} USDC`
  }
  
  // No conversion needed - everything is USDC
  const convertAmount = (amount) => {
    return parseFloat(amount) || 0
  }
  
  // Format currency code (always USDC)
  const formatCurrencyCode = () => {
    return 'USDC'
  }
  
  // Update user's preferred currency to USDC in Supabase
  const updatePreferredCurrency = async () => {
    if (!user) return false
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: 'USDC' })
        .eq('user_id', user.id)
      
      return !error
    } catch (error) {
      console.error('Error updating preferred currency to USDC:', error)
      return false
    }
  }
  
  return {
    currency,
    currencies,
    exchangeRates: { USDC: 1 },
    loading,
    formatAmount,
    convertAmount,
    formatCurrencyCode,
    updatePreferredCurrency
  }
}