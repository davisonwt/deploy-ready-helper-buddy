import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { OrganizationWalletSetup } from '@/components/admin/OrganizationWalletSetup'
import { WalletOnboardingGuide } from '@/components/wallet/WalletOnboardingGuide'

export default function WalletSettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Payment Settings</h1>
        <p className="text-muted-foreground mb-6">
          View Binance Pay wallet configuration and learn how to make payments
        </p>

        {/* Onboarding Guide */}
        <div className="mb-6">
          <WalletOnboardingGuide />
        </div>

        {/* Organization Wallet Setup (Admin View) */}
        <OrganizationWalletSetup />
      </div>
    </div>
  )
}
