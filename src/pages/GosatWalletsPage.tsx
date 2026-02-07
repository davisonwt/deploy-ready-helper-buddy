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
          Manage organization payment wallets and distribution queue
        </p>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList 
            className="grid grid-cols-3 gap-4 bg-transparent p-0 border-none shadow-none h-auto"
          >
            <TabsTrigger 
              value="overview"
              className="rounded-xl border px-6 py-3 text-sm font-semibold transition-all duration-300"
              style={{
                backgroundColor: 'transparent',
                borderColor: currentTheme.cardBorder,
                color: currentTheme.textSecondary
              }}
            >
              Overview & Balances
            </TabsTrigger>
            <TabsTrigger 
              value="credentials"
              className="rounded-xl border px-6 py-3 text-sm font-semibold transition-all duration-300"
              style={{
                backgroundColor: 'transparent',
                borderColor: currentTheme.cardBorder,
                color: currentTheme.textSecondary
              }}
            >
              API Credentials
            </TabsTrigger>
            <TabsTrigger 
              value="distribution"
              className="rounded-xl border px-6 py-3 text-sm font-semibold transition-all duration-300"
              style={{
                backgroundColor: 'transparent',
                borderColor: currentTheme.cardBorder,
                color: currentTheme.textSecondary
              }}
            >
              Distribution Queue
            </TabsTrigger>
          </TabsList>
          
          <style>{`
            [data-state="active"] {
              background: ${currentTheme.primaryButton} !important;
              border-color: ${currentTheme.accent} !important;
              color: ${currentTheme.textPrimary} !important;
              box-shadow: 0 4px 6px -1px ${currentTheme.shadow}, 0 2px 4px -1px ${currentTheme.shadow} !important;
              transform: scale(1.05) !important;
            }
            [data-state="inactive"]:hover {
              background-color: ${currentTheme.accent}20 !important;
              border-color: ${currentTheme.accent} !important;
              color: ${currentTheme.textPrimary} !important;
            }
          `}</style>

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
