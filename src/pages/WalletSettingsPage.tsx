import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wallet, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function WalletSettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">My Wallet Settings</h1>
            <p className="text-muted-foreground">
              Manage how you receive bestowals on Sow2Grow
            </p>
          </div>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Binance Pay credentials are no longer used.</strong> Sow2Grow now settles
            payments through NOWPayments (crypto) and PayPal only. Manage your payout method
            on the Payouts page.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
            <CardDescription>
              Configure where bestowals and earnings are sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/settings/payouts">Go to Payout Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
