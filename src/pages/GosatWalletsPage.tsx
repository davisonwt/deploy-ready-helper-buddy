import { useState, useEffect } from 'react'
import { OrganizationWalletSetup } from '@/components/admin/OrganizationWalletSetup'
import { OrganizationWalletCredentials } from '@/components/admin/OrganizationWalletCredentials'
import { ManualDistributionQueue } from '@/components/wallet/ManualDistributionQueue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrentTheme } from '@/utils/dashboardThemes'

export default function GosatWalletsPage() {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6" style={{ background: currentTheme.background }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: currentTheme.textPrimary }}>Organization Wallets</h1>
        <p className="mb-6" style={{ color: currentTheme.textSecondary }}>
          Manage organization Binance Pay wallets and distribution queue
        </p>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList 
            style={{
              backgroundColor: currentTheme.secondaryButton,
              borderColor: currentTheme.cardBorder
            }}
          >
            <TabsTrigger 
              value="overview"
              style={{ color: currentTheme.textPrimary }}
            >
              Overview & Balances
            </TabsTrigger>
            <TabsTrigger 
              value="credentials"
              style={{ color: currentTheme.textPrimary }}
            >
              API Credentials
            </TabsTrigger>
            <TabsTrigger 
              value="distribution"
              style={{ color: currentTheme.textPrimary }}
            >
              Distribution Queue
            </TabsTrigger>
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
