import { Globe } from 'lucide-react'

export default function CurrencySelector({ className = "" }) {
  // USDC is now the mandatory payment method
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">USDC</span>
        <span className="text-sm text-muted-foreground">USD Coin</span>
      </div>
    </div>
  )
}