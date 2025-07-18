import React, { useState } from 'react'
import { useCurrency } from '../hooks/useCurrency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Globe } from 'lucide-react'

export default function CurrencySelector({ className = "" }) {
  const { currency, currencies, loading, updatePreferredCurrency } = useCurrency()
  const [updating, setUpdating] = useState(false)
  
  const handleCurrencyChange = async (newCurrency) => {
    setUpdating(true)
    try {
      const success = await updatePreferredCurrency(newCurrency)
      if (success) {
        // Refresh the page to update all currency displays
        window.location.reload()
      }
    } catch (error) {
      console.error('Error updating currency:', error)
    } finally {
      setUpdating(false)
    }
  }
  
  if (loading || currencies.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Globe className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currency}
        onValueChange={handleCurrencyChange}
        disabled={updating}
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((curr) => (
            <SelectItem key={curr.code} value={curr.code}>
              <div className="flex items-center space-x-2">
                <span className="font-medium">{curr.code}</span>
                <span className="text-muted-foreground">{curr.symbol}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {updating && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      )}
    </div>
  )
}