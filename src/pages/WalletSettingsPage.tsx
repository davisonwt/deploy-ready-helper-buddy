import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Save, Wallet, AlertCircle, ExternalLink, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SowerBalanceCard } from '@/components/wallet/SowerBalanceCard'

const WALLET_TYPES = [
  { value: 'ethereum', label: 'Ethereum (ETH/ERC-20)', placeholder: '0x...' },
  { value: 'bitcoin', label: 'Bitcoin (BTC)', placeholder: 'bc1... or 1...' },
  { value: 'tron', label: 'Tron (TRX/TRC-20)', placeholder: 'T...' },
  { value: 'solana', label: 'Solana (SOL)', placeholder: '...' },
  { value: 'polygon', label: 'Polygon (MATIC)', placeholder: '0x...' },
  { value: 'bsc', label: 'BNB Smart Chain', placeholder: '0x...' },
];

export default function WalletSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('ethereum')
  const [hasExistingBalance, setHasExistingBalance] = useState(false)

  useEffect(() => {
    if (user) {
      loadWalletData()
    }
  }, [user])

  const loadWalletData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sower_balances')
        .select('wallet_address, wallet_type')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setWalletAddress(data.wallet_address || '')
        setWalletType(data.wallet_type || 'ethereum')
        setHasExistingBalance(true)
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
      toast.error('Failed to load wallet settings')
    } finally {
      setLoading(false)
    }
  }

  const saveWalletData = async () => {
    if (!user) return

    if (!walletAddress) {
      toast.error('Please enter your wallet address')
      return
    }

    // Basic validation based on wallet type
    const isValidAddress = validateWalletAddress(walletAddress, walletType)
    if (!isValidAddress) {
      toast.error('Please enter a valid wallet address for the selected network')
      return
    }

    setSaving(true)
    try {
      if (hasExistingBalance) {
        // Update existing record
        const { error } = await supabase
          .from('sower_balances')
          .update({
            wallet_address: walletAddress,
            wallet_type: walletType,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('sower_balances')
          .insert({
            user_id: user.id,
            wallet_address: walletAddress,
            wallet_type: walletType,
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_withdrawn: 0,
            currency: 'USDC',
          })

        if (error) throw error
        setHasExistingBalance(true)
      }

      toast.success('Wallet settings saved successfully!')
    } catch (error) {
      console.error('Error saving wallet:', error)
      toast.error('Failed to save wallet settings')
    } finally {
      setSaving(false)
    }
  }

  const validateWalletAddress = (address: string, type: string): boolean => {
    if (!address) return false
    
    switch (type) {
      case 'ethereum':
      case 'polygon':
      case 'bsc':
        return /^0x[a-fA-F0-9]{40}$/.test(address)
      case 'bitcoin':
        return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(address)
      case 'tron':
        return /^T[a-zA-Z0-9]{33}$/.test(address)
      case 'solana':
        return address.length >= 32 && address.length <= 44
      default:
        return address.length > 10
    }
  }

  const selectedWalletConfig = WALLET_TYPES.find(w => w.value === walletType)

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to manage your wallet settings</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Link to="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Wallet Settings</h1>
            <p className="text-muted-foreground">
              Configure your payout wallet to receive earnings
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="mb-6">
          <SowerBalanceCard />
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>How payouts work:</strong> When you earn from bestowals to your orchards/seeds, 
            the funds are tracked in your balance. You can request a payout to your crypto wallet 
            when you have at least $10 USD available.
            <br />
            <a 
              href="https://nowpayments.io/supported-coins"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline mt-2 inline-flex items-center gap-1"
            >
              View supported cryptocurrencies <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Payout Wallet Address</CardTitle>
            <CardDescription>
              Enter your crypto wallet address where you want to receive payouts. 
              We recommend using USDC on Ethereum or Polygon for lowest fees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-type">Network / Coin Type</Label>
              <Select value={walletType} onValueChange={setWalletType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {WALLET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the blockchain network for your wallet
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address *</Label>
              <Input
                id="wallet-address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={selectedWalletConfig?.placeholder || 'Enter your wallet address'}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your public wallet address for receiving {walletType === 'ethereum' ? 'USDC (ERC-20)' : 'payouts'}
              </p>
            </div>

            <Button
              onClick={saveWalletData}
              disabled={saving || !walletAddress}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Wallet Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Security & Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Only your public wallet address is stored - never share private keys
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Payouts are processed via NOWPayments secure infrastructure
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Minimum payout: $10 USD | Payout fee: 0.5%
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                Payouts typically process within 24-48 hours
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
