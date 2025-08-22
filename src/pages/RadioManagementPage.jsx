import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Users, Calendar, Radio, BarChart3, Clock } from 'lucide-react'
import TimezoneSlotAssignment from '@/components/radio/TimezoneSlotAssignment'
import GlobalDJScheduler from '@/components/radio/GlobalDJScheduler'
import AdminRadioManagement from '@/components/radio/AdminRadioManagement'
import PersonnelSlotAssignment from '@/components/radio/PersonnelSlotAssignment'
import { StationStats } from '@/components/radio/StationStats'

export default function RadioManagementPage() {
  const [activeTab, setActiveTab] = useState('schedule')

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Settings className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-4xl font-bold">Heretic Management System</h1>
            <p className="text-muted-foreground">Complete radio station administration</p>
          </div>
        </div>
      </div>

      {/* Expanded Management Interface */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${activeTab === 'schedule' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">Schedule Management</h3>
            </div>
            <p className="text-muted-foreground">Manage radio show schedules and time slots</p>
          </Card>
          
          <Card 
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${activeTab === 'personnel' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            onClick={() => setActiveTab('personnel')}
          >
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">Personnel Assignment</h3>
            </div>
            <p className="text-muted-foreground">Assign DJs and staff to time slots</p>
          </Card>
          
          <Card 
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${activeTab === 'global' ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            onClick={() => setActiveTab('global')}
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-semibold">Global Scheduling</h3>
            </div>
            <p className="text-muted-foreground">24/7 worldwide coverage management</p>
          </Card>
        </div>
      </div>

      {/* Management Interface */}
      <Tabs value={activeTab} className="w-full">
        {/* Schedule Management */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Detailed Schedule Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 min-h-[600px]">
              <TimezoneSlotAssignment />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personnel Assignment */}
        <TabsContent value="personnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                DJ & Personnel Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PersonnelSlotAssignment />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Global Scheduling */}
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                24/7 Global Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalDJScheduler />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Controls */}
        <TabsContent value="admin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Station Administration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminRadioManagement />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Station Analytics & Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StationStats />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}