import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Eye, EyeOff, Save, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WalletCredentials {
  wallet_name: string
  api_key: string
  api_secret: string
  merchant_id: string
}

export function OrganizationWalletCredentials() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  const [s2gholding, setS2gholding] = useState<WalletCredentials>({
    wallet_name: 's2gholding',
    api_key: '',
    api_secret: '',
    merchant_id: ''
  })
  
  const [s2gbestow, setS2gbestow] = useState<WalletCredentials>({
    wallet_name: 's2gbestow',
    api_key: '',
    api_secret: '',
    merchant_id: ''
  })

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('organization_wallets')
        .select('wallet_name, api_key, api_secret, merchant_id')
        .in('wallet_name', ['s2gholding', 's2gbestow'])

      if (error) throw error

      data?.forEach(wallet => {
        if (wallet.wallet_name === 's2gholding') {
          setS2gholding(prev => ({
            ...prev,
            api_key: wallet.api_key || '',
            api_secret: wallet.api_secret || '',
            merchant_id: wallet.merchant_id || ''
          }))
        } else if (wallet.wallet_name === 's2gbestow') {
          setS2gbestow(prev => ({
            ...prev,
            api_key: wallet.api_key || '',
            api_secret: wallet.api_secret || '',
            merchant_id: wallet.merchant_id || ''
          }))
        }
      })
    } catch (error) {
      console.error('Error loading credentials:', error)
      toast.error('Failed to load wallet credentials')
    } finally {
      setLoading(false)
    }
  }

  const saveCredentials = async (walletName: string, credentials: WalletCredentials) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('organization_wallets')
        .update({
          api_key: credentials.api_key,
          api_secret: credentials.api_secret,
          merchant_id: credentials.merchant_id
        })
        .eq('wallet_name', walletName)

      if (error) throw error

      toast.success(`${walletName} credentials saved successfully`)
    } catch (error) {
      console.error('Error saving credentials:', error)
      toast.error('Failed to save credentials')
    } finally {
      setSaving(false)
    }
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const renderWalletForm = (
    title: string,
    description: string,
    credentials: WalletCredentials,
    setCredentials: React.Dispatch<React.SetStateAction<WalletCredentials>>
  ) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${credentials.wallet_name}-merchant-id`}>Merchant ID</Label>
          <Input
            id={`${credentials.wallet_name}-merchant-id`}
            value={credentials.merchant_id}
            onChange={(e) => setCredentials(prev => ({ ...prev, merchant_id: e.target.value }))}
            placeholder="Enter Binance Pay Merchant ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${credentials.wallet_name}-api-key`}>API Key</Label>
          <div className="relative">
            <Input
              id={`${credentials.wallet_name}-api-key`}
              type={showSecrets[`${credentials.wallet_name}-key`] ? 'text' : 'password'}
              value={credentials.api_key}
              onChange={(e) => setCredentials(prev => ({ ...prev, api_key: e.target.value }))}
              placeholder="Enter API Key"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => toggleShowSecret(`${credentials.wallet_name}-key`)}
            >
              {showSecrets[`${credentials.wallet_name}-key`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${credentials.wallet_name}-api-secret`}>API Secret</Label>
          <div className="relative">
            <Input
              id={`${credentials.wallet_name}-api-secret`}
              type={showSecrets[`${credentials.wallet_name}-secret`] ? 'text' : 'password'}
              value={credentials.api_secret}
              onChange={(e) => setCredentials(prev => ({ ...prev, api_secret: e.target.value }))}
              placeholder="Enter API Secret"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => toggleShowSecret(`${credentials.wallet_name}-secret`)}
            >
              {showSecrets[`${credentials.wallet_name}-secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button
          onClick={() => saveCredentials(credentials.wallet_name, credentials)}
          disabled={saving || !credentials.api_key || !credentials.api_secret || !credentials.merchant_id}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Credentials
        </Button>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Each wallet requires its own Binance Pay API credentials. Get these from your Binance Merchant Dashboard for each sub-account.
        </AlertDescription>
      </Alert>

      {renderWalletForm(
        's2gholding Wallet',
        'Receives all payments initially (except digital products). Funds held until courier confirms delivery.',
        s2gholding,
        setS2gholding
      )}

      {renderWalletForm(
        's2gbestow Wallet',
        'Receives 10% tithing + 5% admin fees (15% total) from distributions.',
        s2gbestow,
        setS2gbestow
      )}
    </div>
  )
}
