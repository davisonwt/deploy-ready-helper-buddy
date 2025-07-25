import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useBestowals } from '../hooks/useBestowals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Link } from 'react-router-dom'
import { 
  Sprout, 
  TreePine, 
  Heart, 
  TrendingUp, 
  Users, 
  DollarSign,
  Plus,
  Eye,
  Calendar,
  User
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export default function DashboardPage() {
  const { user } = useAuth()
  const { orchards, loading: orchardsLoading, fetchOrchards } = useOrchards()
  const { getUserBestowals, loading: bestowalsLoading } = useBestowals()
  const [userOrchards, setUserOrchards] = useState([])
  const [userBestowals, setUserBestowals] = useState([])
  const [stats, setStats] = useState({
    totalOrchards: 0,
    totalBestowals: 0,
    totalRaised: 0,
    totalSupported: 0
  })

  useEffect(() => {
    if (user) {
      // Fetch user's orchards
      fetchOrchards({ user_id: user.id })
      
      // Fetch user's bestowals
      const fetchUserBestowals = async () => {
        try {
          const result = await getUserBestowals()
          if (result.success) {
            setUserBestowals(result.data)
          }
        } catch (error) {
          console.error('Error fetching bestowals:', error)
          setUserBestowals([])
        }
      }
      fetchUserBestowals()
    }
  }, [user])

  useEffect(() => {
    // Filter user's orchards
    const userCreatedOrchards = orchards.filter(orchard => orchard.user_id === user?.id)
    setUserOrchards(userCreatedOrchards)

    // Calculate stats
    const totalRaised = userCreatedOrchards.reduce((sum, orchard) => 
      sum + (orchard.filled_pockets * orchard.pocket_value || 0), 0
    )

    setStats({
      totalOrchards: userCreatedOrchards.length,
      totalBestowals: userBestowals.length,
      totalRaised: totalRaised,
      totalSupported: userBestowals.reduce((sum, bestowal) => 
        sum + (bestowal.amount || 0), 0
      )
    })
  }, [orchards, userBestowals, user])

  const getCompletionPercentage = (orchard) => {
    if (!orchard.total_pockets) return 0
    return Math.round((orchard.filled_pockets / orchard.total_pockets) * 100)
  }

  if (orchardsLoading || bestowalsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

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
                  <p className="text-sm font-medium text-slate-600">My Orchards</p>
                  <p className="text-2xl font-bold text-slate-700">{stats.totalOrchards}</p>
                </div>
                <TreePine className="h-8 w-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nav-dashboard/30 backdrop-blur-sm border-nav-dashboard hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Raised</p>
                  <p className="text-2xl font-bold text-slate-700">{formatCurrency(stats.totalRaised)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nav-dashboard/30 backdrop-blur-sm border-nav-dashboard hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">My Bestowals</p>
                  <p className="text-2xl font-bold text-slate-700">{stats.totalBestowals}</p>
                </div>
                <Heart className="h-8 w-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nav-dashboard/30 backdrop-blur-sm border-nav-dashboard hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Supported</p>
                  <p className="text-2xl font-bold text-slate-700">{formatCurrency(stats.totalSupported)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Orchards */}
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Sprout className="h-5 w-5 mr-2 text-green-600" />
                  My Orchards
                </span>
                <Link to="/my-orchards">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userOrchards.length === 0 ? (
                <div className="text-center py-8">
                  <TreePine className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">You haven't planted any seeds yet</p>
                  <Link to="/create-orchard">
                    <Button>Plant Your First Seed</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userOrchards.slice(0, 3).map((orchard) => (
                    <div key={orchard.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{orchard.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {orchard.views || 0} views
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {orchard.supporters || 0} supporters
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Progress</span>
                            <span className="text-sm font-medium">{getCompletionPercentage(orchard)}%</span>
                          </div>
                          <Progress value={getCompletionPercentage(orchard)} className="h-2" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <Badge variant={orchard.status === 'active' ? 'default' : 'secondary'}>
                          {orchard.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bestowals */}
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-red-500" />
                  Recent Bestowals
                </span>
                <Link to="/browse-orchards">
                  <Button variant="outline" size="sm">Explore More</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userBestowals.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">You haven't made any bestowals yet</p>
                  <Link to="/browse-orchards">
                    <Button>Discover Orchards</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {userBestowals.slice(0, 3).map((bestowal) => (
                    <div key={bestowal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {bestowal.orchards?.title || 'Unknown Orchard'}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(bestowal.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(bestowal.amount)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={bestowal.payment_status === 'completed' ? 'default' : 'secondary'}>
                        {bestowal.payment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm border-blue-200">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/create-orchard">
                <Button className="w-full h-20 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600">
                  <div className="text-center">
                    <Plus className="h-6 w-6 mx-auto mb-2" />
                    <span>Plant New Seed</span>
                  </div>
                </Button>
              </Link>
              
              <Link to="/browse-orchards">
                <Button variant="outline" className="w-full h-20">
                  <div className="text-center">
                    <TreePine className="h-6 w-6 mx-auto mb-2" />
                    <span>Browse Orchards</span>
                  </div>
                </Button>
              </Link>
              
              <Link to="/profile">
                <Button variant="outline" className="w-full h-20">
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <span>My Profile</span>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}