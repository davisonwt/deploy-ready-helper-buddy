import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useBestowals } from '../hooks/useBestowals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  Calendar
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export default function DashboardPage() {
  const { user } = useAuth()
  const { orchards, loading: orchardsLoading, fetchOrchards } = useOrchards()
  const { bestowals, loading: bestowalsLoading, fetchBestowals } = useBestowals()
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
      fetchBestowals({ bestower_id: user.id })
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

  useEffect(() => {
    setUserBestowals(bestowals.filter(bestowal => bestowal.bestower_id === user?.id))
  }, [bestowals, user])

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-blue-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 ring-2 ring-blue-200">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white">
                  {getInitials(user?.user_metadata?.first_name, user?.user_metadata?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.user_metadata?.first_name || 'Grower'}!
                </h1>
                <p className="text-gray-600">Here's what's growing in your garden</p>
              </div>
            </div>
            <Link to="/create-orchard">
              <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Plant New Seed
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">My Orchards</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrchards}</p>
                </div>
                <TreePine className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Raised</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRaised)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-yellow-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">My Bestowals</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBestowals}</p>
                </div>
                <Heart className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Supported</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSupported)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
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
                <Link to="/browse-orchards?filter=my-orchards">
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
                            {orchard.views} views
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {orchard.supporters} supporters
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