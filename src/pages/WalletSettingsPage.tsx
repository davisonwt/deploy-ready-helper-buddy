import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wallet, AlertCircle, LayoutDashboard, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function WalletSettingsPage() {
  const navigate = useNavigate()
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
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
