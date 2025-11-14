import React from 'react'
import { WalletOnboardingGuide } from '@/components/wallet/WalletOnboardingGuide'
import { BinanceWalletManager } from '@/components/wallet/BinanceWalletManager'

export default function WalletSettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">My Wallet</h1>
        <p className="text-muted-foreground mb-6">
          Link your personal Binance Pay ID to view your platform balance and top up your account
        </p>

        <div className="mb-6">
          <WalletOnboardingGuide />
        </div>

        <div className="mb-6">
          <BinanceWalletManager showTopUpActions />
        </div>
      </div>
    </div>
  )
}
