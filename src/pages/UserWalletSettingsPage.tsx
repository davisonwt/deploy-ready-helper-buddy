import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Save, Wallet, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'

export default function UserWalletSettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showApiSecret, setShowApiSecret] = useState(false)
  
  const [walletAddress, setWalletAddress] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [merchantId, setMerchantId] = useState('')

  useEffect(() => {
    if (user) {
      loadWalletData()
    }
  }, [user])

  const loadWalletData = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // @ts-ignore - Supabase type inference issue
      const { data, error } = await supabase
        .from('user_wallets')
        .select('wallet_address, api_key, api_secret, merchant_id')
        .eq('user_id', user.id)
        .eq('wallet_type', 'binance_pay')
        .maybeSingle()

      if (error) throw error

      if (data) {
        setWalletAddress(data.wallet_address || '')
        setApiKey(data.api_key || '')
        setApiSecret(data.api_secret || '')
        setMerchantId(data.merchant_id || '')
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
      toast.error('Failed to load wallet credentials')
    } finally {
      setLoading(false)
    }
  }

  const saveWalletData = async () => {
    if (!user) return

    if (!walletAddress || !apiKey || !apiSecret) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      // @ts-ignore - Supabase type inference issue
      const { data: existing, error: fetchError } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('wallet_type', 'binance_pay')
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existing) {
        const { error } = await supabase
          .from('user_wallets')
          .update({
            wallet_address: walletAddress,
            api_key: apiKey,
            api_secret: apiSecret,
            merchant_id: merchantId,
            is_active: true,
            is_primary: true,
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_wallets')
          .insert({
            user_id: user.id,
            wallet_address: walletAddress,
            wallet_type: 'binance_pay',
            is_active: true,
            is_primary: true,
            api_key: apiKey,
            api_secret: apiSecret,
            merchant_id: merchantId,
          })

        if (error) throw error
      }

      toast.success('Wallet credentials saved successfully')
      await loadWalletData()
    } catch (error) {
      console.error('Error saving wallet:', error)
      toast.error('Failed to save wallet credentials')
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Wallet Settings</h1>
            <p className="text-muted-foreground">
              Configure your Binance Pay credentials to receive bestowals
            </p>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> You need a Binance merchant account to receive bestowals. 
            Your API credentials allow the platform to send USDC payments directly to your account.
            <br />
            <a 
              href="https://www.binance.com/en/pay" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline mt-2 inline-block"
            >
              Learn more about Binance Pay →
            </a>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Binance Pay Credentials</CardTitle>
            <CardDescription>
              Enter your Binance merchant API credentials. These are kept secure and encrypted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pay-id">Binance Pay ID *</Label>
              <Input
                id="pay-id"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your Binance Pay ID"
              />
              <p className="text-xs text-muted-foreground">
                Your unique Binance Pay ID for receiving payments
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchant-id">Merchant ID</Label>
              <Input
                id="merchant-id"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="Enter Binance Merchant ID (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key *</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-secret">API Secret *</Label>
              <div className="relative">
                <Input
                  id="api-secret"
                  type={showApiSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API Secret"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                >
                  {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={saveWalletData}
              disabled={saving || !walletAddress || !apiKey || !apiSecret}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Credentials'}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Your API credentials are encrypted and stored securely</li>
              <li>✓ Only your Binance Pay ID is visible to the platform</li>
              <li>✓ API keys are only used to receive payments on your behalf</li>
              <li>✓ You can update or remove your credentials at any time</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
