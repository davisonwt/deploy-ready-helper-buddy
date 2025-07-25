import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import { 
  TreePine, 
  User,
  Plus,
  Eye,
  Users,
  TrendingUp,
  Search,
  Calendar,
  DollarSign,
  Edit,
  Share2
} from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export default function MyOrchardsPage() {
  const { user } = useAuth()
  const { orchards, loading, fetchOrchards } = useOrchards()
  const [userOrchards, setUserOrchards] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Categories list - same as other pages
  const categories = [
    "The Gift of Accessories", 
    "The Gift of Adventure Packages",
    "The Gift of Appliances",
    "The Gift of Art",
    "The Gift of Bees",
    "The Gift of Courses",
    "The Gift of Custom Made",
    "The Gift of DIY",
    "The Gift of Electronics",
    "The Gift of Energy",
    "The Gift of Food",
    "The Gift of Free-will Gifting",
    "The Gift of Innovation",
    "The Gift of Kitchenware",
    "The Gift of Music",
    "The Gift of Nourishment",
    "The Gift of Pay as You Go",
    "The Gift of Property",
    "The Gift of Services",
    "The Gift of Technology",
    "The Gift of Tithing",
    "The Gift of Tools",
    "The Gift of Vehicles",
    "The Gift of Wellness"
  ]

  useEffect(() => {
    if (user) {
      fetchOrchards({ user_id: user.id })
    }
  }, [user])

  useEffect(() => {
    // Filter user's orchards
    let filtered = orchards.filter(orchard => orchard.user_id === user?.id)
    
    if (searchTerm) {
      filtered = filtered.filter(orchard => 
        orchard.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orchard.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(orchard => orchard.status === statusFilter)
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(orchard => orchard.category === selectedCategory)
    }
    
    setUserOrchards(filtered)
  }, [orchards, user, searchTerm, statusFilter, selectedCategory])

  const getCompletionPercentage = (orchard) => {
    if (!orchard.total_pockets) return 0
    return Math.round((orchard.filled_pockets / orchard.total_pockets) * 100)
  }

  const getTotalRaised = () => {
    return userOrchards.reduce((sum, orchard) => 
      sum + (orchard.filled_pockets * orchard.pocket_value || 0), 0
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-nav-orchards/20 via-background to-nav-orchards/10">
      {/* Welcome Section with Profile Picture */}
      <div className="bg-nav-orchards/20 backdrop-blur-sm p-8 rounded-2xl border border-nav-orchards/30 shadow-lg mb-8">
        <div className="flex items-center justify-between space-x-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-orchards shadow-lg">
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-nav-orchards to-nav-orchards/80 flex items-center justify-center">
                  <User className="h-10 w-10 text-orange-700" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-orange-700">
                My Orchards, {user?.first_name || 'Friend'}!
              </h1>
              <p className="text-orange-600 text-lg">
                Manage and track your growing orchards
              </p>
              <p className="text-orange-500 text-sm mt-1">
                Preferred Currency: {user?.preferred_currency || 'USD'} • Total Raised: {formatCurrency(getTotalRaised())}
              </p>
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-orange-700 mb-2">Filter by Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-nav-orchards/30 focus:border-nav-orchards bg-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-white border-nav-orchards/30 z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats and Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-nav-orchards/20 backdrop-blur-sm border-nav-orchards/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Orchards</p>
                  <p className="text-2xl font-bold text-orange-700">{userOrchards.length}</p>
                </div>
                <TreePine className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nav-orchards/20 backdrop-blur-sm border-nav-orchards/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Raised</p>
                  <p className="text-2xl font-bold text-orange-700">{formatCurrency(getTotalRaised())}</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nav-orchards/20 backdrop-blur-sm border-nav-orchards/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Active Orchards</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {userOrchards.filter(o => o.status === 'active').length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-nav-orchards/20 backdrop-blur-sm border-nav-orchards/30">
            <CardContent className="p-6 flex items-center justify-center">
              <Link to="/create-orchard" className="w-full">
                <Button className="w-full bg-nav-orchards hover:bg-nav-orchards/90 text-orange-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-nav-orchards/10 backdrop-blur-sm border-nav-orchards/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-500" />
                  <Input
                    placeholder="Search your orchards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-nav-orchards/30 focus:border-nav-orchards"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {['all', 'active', 'completed', 'paused'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className={statusFilter === status ? 'bg-nav-orchards text-orange-700' : 'border-nav-orchards/30 text-orange-700'}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orchards Grid */}
        {userOrchards.length === 0 ? (
          <Card className="bg-nav-orchards/10 backdrop-blur-sm border-nav-orchards/30">
            <CardContent className="p-12 text-center">
              <TreePine className="h-16 w-16 mx-auto text-orange-400 mb-4" />
              <h3 className="text-xl font-semibold text-orange-700 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No orchards found' : 'No orchards yet'}
              </h3>
              <p className="text-orange-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start your journey by planting your first seed'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link to="/create-orchard">
                  <Button className="bg-nav-orchards hover:bg-nav-orchards/90 text-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Plant Your First Seed
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userOrchards.map((orchard) => (
              <Card key={orchard.id} className="bg-nav-orchards/10 backdrop-blur-sm border-nav-orchards/30 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-orange-700 mb-2">{orchard.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-orange-600">
                        <span className="flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          {orchard.views || 0}
                        </span>
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {orchard.supporters || 0}
                        </span>
                      </div>
                    </div>
                    <Badge 
                      variant={orchard.status === 'active' ? 'default' : 'secondary'}
                      className={orchard.status === 'active' ? 'bg-nav-orchards text-orange-700' : ''}
                    >
                      {orchard.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-orange-600">Progress</span>
                        <span className="text-sm font-medium text-orange-700">
                          {getCompletionPercentage(orchard)}%
                        </span>
                      </div>
                      <Progress 
                        value={getCompletionPercentage(orchard)} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600">Raised:</span>
                      <span className="font-medium text-orange-700">
                        {formatCurrency(orchard.filled_pockets * orchard.pocket_value || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600">Goal:</span>
                      <span className="font-medium text-orange-700">
                        {formatCurrency(orchard.total_pockets * orchard.pocket_value || 0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-orange-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      Created {new Date(orchard.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Link to={`/orchards/${orchard.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-nav-orchards/30 text-orange-700">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link to={`/edit-orchard/${orchard.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full border-nav-orchards/30 text-orange-700">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/animated-orchard/${orchard.id}`
                          navigator.clipboard.writeText(url)
                        }}
                        className="border-nav-orchards/30 text-orange-700"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}