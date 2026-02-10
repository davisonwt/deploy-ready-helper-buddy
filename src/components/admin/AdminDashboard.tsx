import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, BarChart3, Users, CreditCard, Shield, Award } from 'lucide-react';
import { UserManagementDashboard } from './UserManagementDashboard';
import { AdminPaymentDashboard } from '../AdminPaymentDashboard';
import { ContentModerationDashboard } from './ContentModerationDashboard';
import { AmbassadorApplicationsDashboard } from './AmbassadorApplicationsDashboard';
import BasicAnalytics from './BasicAnalytics';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Settings className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive management hub</p>
        </div>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="ambassadors" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Ambassadors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <BasicAnalytics />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagementDashboard />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="bg-white rounded-lg border">
            <AdminPaymentDashboard />
          </div>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <ContentModerationDashboard />
        </TabsContent>

        <TabsContent value="ambassadors" className="mt-6">
          <AmbassadorApplicationsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}