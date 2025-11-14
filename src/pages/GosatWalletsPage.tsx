import { OrganizationWalletSetup } from '@/components/admin/OrganizationWalletSetup'
import { OrganizationWalletCredentials } from '@/components/admin/OrganizationWalletCredentials'
import { ManualDistributionQueue } from '@/components/wallet/ManualDistributionQueue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function GosatWalletsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Organization Wallets</h1>
        <p className="text-muted-foreground mb-6">
          Manage organization Binance Pay wallets and distribution queue
        </p>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview & Balances</TabsTrigger>
            <TabsTrigger value="credentials">API Credentials</TabsTrigger>
            <TabsTrigger value="distribution">Distribution Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OrganizationWalletSetup />
          </TabsContent>

          <TabsContent value="credentials">
            <OrganizationWalletCredentials />
          </TabsContent>

          <TabsContent value="distribution">
            <ManualDistributionQueue />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
