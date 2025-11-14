import { OrganizationWalletSetup } from '@/components/admin/OrganizationWalletSetup'
import { ManualDistributionQueue } from '@/components/wallet/ManualDistributionQueue'

export default function GosatWalletsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Organization Wallets</h1>
        <p className="text-muted-foreground mb-6">
          Manage organization Binance Pay wallets and manual distribution queue
        </p>

        <div className="space-y-6">
          <OrganizationWalletSetup />
          <ManualDistributionQueue />
        </div>
      </div>
    </div>
  )
}
