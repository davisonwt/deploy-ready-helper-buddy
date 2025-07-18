import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { supabase } from "@/integrations/supabase/client"

export function useCurrency() {
  const { user } = useAuth()
  const [currencies, setCurrencies] = useState([])
  const [exchangeRates, setExchangeRates] = useState({})
  const [loading, setLoading] = useState(true)
  
  // Get user's preferred currency from profile, defaulting to USD
  const [userProfile, setUserProfile] = useState(null)
  const currency = userProfile?.preferred_currency || "USD"
  
  // Load user profile to get preferred currency
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('preferred_currency')
          .eq('user_id', user.id)
          .single()
        
        if (!error && data) {
          setUserProfile(data)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }
    
    loadUserProfile()
  }, [user])
  
  // Load currencies and exchange rates from external API
  useEffect(() => {
    const loadCurrencyData = async () => {
      try {
        setLoading(true)
        
        // Use a free exchange rate API
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
        const data = await response.json()
        
        if (data.rates) {
          setExchangeRates(data.rates)
          
          // Set up common currencies
          const commonCurrencies = [
            { code: 'USD', symbol: '$', name: 'US Dollar' },
            { code: 'EUR', symbol: '€', name: 'Euro' },
            { code: 'GBP', symbol: '£', name: 'British Pound' },
            { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
            { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
            { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
            { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
            { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
            { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
            { code: 'ZAR', symbol: 'R', name: 'South African Rand' }
          ]
          
          setCurrencies(commonCurrencies)
        }
      } catch (error) {
        console.error('Error loading currency data:', error)
        // Fallback to basic USD setup
        setCurrencies([{ code: 'USD', symbol: '$', name: 'US Dollar' }])
        setExchangeRates({ USD: 1 })
      } finally {
        setLoading(false)
      }
    }
    
    loadCurrencyData()
  }, [])
  
  // Format amount with currency symbol and proper locale
  const formatAmount = (amount, targetCurrency = currency) => {
    if (!amount || isNaN(amount)) return `${targetCurrency} 0.00`
    
    // Convert amount to target currency
    const convertedAmount = convertAmount(amount, "USD", targetCurrency)
    
    // Get currency symbol
    const currencyInfo = currencies.find(c => c.code === targetCurrency)
    const symbol = currencyInfo?.symbol || targetCurrency
    
    // Format with proper locale
    try {
      const locale = getLocaleForCurrency(targetCurrency)
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(convertedAmount)
    } catch (error) {
      // Fallback formatting
      return `${symbol} ${convertedAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    }
  }
  
  // Convert amount between currencies
  const convertAmount = (amount, fromCurrency, toCurrency) => {
    if (!amount || isNaN(amount) || fromCurrency === toCurrency) {
      return amount
    }
    
    const fromRate = exchangeRates[fromCurrency] || 1
    const toRate = exchangeRates[toCurrency] || 1
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate
    return usdAmount * toRate
  }
  
  // Get appropriate locale for currency
  const getLocaleForCurrency = (currencyCode) => {
    const currencyLocales = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'JPY': 'ja-JP',
      'CAD': 'en-CA',
      'AUD': 'en-AU',
      'CHF': 'de-CH',
      'CNY': 'zh-CN',
      'INR': 'hi-IN',
      'ZAR': 'en-ZA',
      'BRL': 'pt-BR',
      'RUB': 'ru-RU',
      'KRW': 'ko-KR',
      'MXN': 'es-MX',
      'SGD': 'en-SG',
      'NZD': 'en-NZ',
      'NOK': 'nb-NO',
      'SEK': 'sv-SE',
      'DKK': 'da-DK',
      'PLN': 'pl-PL'
    }
    
    return currencyLocales[currencyCode] || 'en-US'
  }
  
  // Format currency code to uppercase
  const formatCurrencyCode = (code) => {
    return code ? code.toUpperCase() : 'USD'
  }
  
  // Update user's preferred currency in Supabase
  const updatePreferredCurrency = async (newCurrency) => {
    if (!user) return false
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: newCurrency })
        .eq('user_id', user.id)
      
      if (!error) {
        setUserProfile(prev => ({ ...prev, preferred_currency: newCurrency }))
        return true
      }
    } catch (error) {
      console.error('Error updating preferred currency:', error)
    }
    return false
  }
  
  return {
    currency: formatCurrencyCode(currency),
    currencies,
    exchangeRates,
    loading,
    formatAmount,
    convertAmount,
    formatCurrencyCode,
    updatePreferredCurrency
  }
}