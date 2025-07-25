import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { User } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-nav-dashboard/20 via-background to-nav-dashboard/10">
      {/* Welcome Section with Profile Picture */}
      <div className="bg-nav-dashboard/20 backdrop-blur-sm p-8 rounded-2xl border border-nav-dashboard/30 shadow-lg mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-dashboard shadow-lg">
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-nav-dashboard to-nav-dashboard/80 flex items-center justify-center">
                <User className="h-10 w-10 text-slate-700" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-700">
              Welcome back, {user?.first_name || 'Friend'}!
            </h1>
            <p className="text-slate-600 text-lg">
              Ready to grow your orchard today?
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Preferred Currency: {user?.preferred_currency || 'USD'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-nav-dashboard/30 backdrop-blur-sm border-nav-dashboard hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Dashboard loaded successfully!</p>
                  <p className="text-lg font-bold text-slate-700">Welcome {user?.first_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}