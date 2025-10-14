import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrganizationWalletSetup } from '@/components/admin/OrganizationWalletSetup'

export default function WalletSettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wallet Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationWalletSetup />
        </CardContent>
      </Card>
    </div>
  )
}
