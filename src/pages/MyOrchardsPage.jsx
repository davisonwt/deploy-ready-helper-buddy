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
  Share2,
  MapPin,
  Heart,
  Trash2
} from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '../utils/formatters'

export default function MyOrchardsPage() {
  const { user } = useAuth()
  const { orchards, loading, fetchOrchards, deleteOrchard } = useOrchards()
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
      fetchOrchards()
    }
  }, [user])

  useEffect(() => {
    // Show all orchards for now (temporary fix)
    let filtered = orchards.filter(orchard => {
      // Show all orchards regardless of user for debugging
      return true
    })
    
    if (searchTerm) {
      filtered = filtered.filter(orchard => 
        orchard.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orchard.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orchard.category?.toLowerCase().includes(searchTerm.toLowerCase())
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
      sum + ((orchard.filled_pockets || 0) * (orchard.pocket_price || 0)), 0
    )
  }

  const handleDeleteOrchard = async (orchardId) => {
    if (!window.confirm('Are you sure you want to delete this orchard? This action cannot be undone.')) {
      return
    }

    try {
      const result = await deleteOrchard(orchardId)
      
      if (result.success) {
        toast.success('Orchard deleted successfully')
        fetchOrchards() // Refresh the list
      } else {
        toast.error(result.error || 'Failed to delete orchard')
      }
    } catch (error) {
      console.error('Error deleting orchard:', error)
      toast.error('Failed to delete orchard')
  }

  // TESTING FUNCTION - Change orchard status for testing filter buttons
  const handleChangeStatus = async (orchardId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orchards')
        .update({ status: newStatus })
        .eq('id', orchardId)
        .eq('user_id', user.id)

      if (error) {
        toast.error(`Failed to change status: ${error.message}`)
      } else {
        toast.success(`Orchard status changed to ${newStatus}`)
        fetchOrchards() // Refresh the list
      }
    } catch (error) {
      console.error('Error changing orchard status:', error)
      toast.error('Failed to change orchard status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          console.error('Video failed to load:', e);
          e.target.style.display = 'none';
        }}
      >
        <source
          src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/s2g%20my%20orchard%20(1).mp4"
          type="video/mp4"
        />
      </video>
      
      {/* Solid dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
      
      {/* Content */}
      <div className="relative z-10">
      {/* Welcome Section with Profile Picture */}
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-lg mb-8" style={{ backgroundColor: '#C8B6A6' }}>
        <div className="flex items-center justify-between space-x-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-my shadow-lg">
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-nav-my to-nav-my/80 flex items-center justify-center">
                  <User className="h-10 w-10 text-orange-700" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold px-8 py-4 rounded-lg" style={{ 
                color: 'hsl(30, 100%, 50%)', 
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                backgroundColor: '#C8B6A6'
              }}>
                My Orchards
              </h1>
              <p className="text-lg" style={{ color: 'hsl(30, 100%, 50%)' }}>
                Manage and track your growing orchards
              </p>
              <p className="text-sm mt-1" style={{ color: 'hsl(30, 100%, 50%)' }}>
                Preferred Currency: {user?.preferred_currency || 'USD'} • Total Raised: {formatCurrency(getTotalRaised())}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
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

          <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
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

          <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
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
        </div>

        {/* Call to Action */}
        <div className="mb-8 text-center">
          <Link to="/create-orchard">
            <Button className="px-8 py-3 text-lg font-semibold text-green-800 border-2 border-green-700 hover:bg-lime-400 shadow-lg" style={{ backgroundColor: '#84CC16' }}>
              <Plus className="h-5 w-5 mr-2" />
              Sow a New Seed
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="space-y-4">
            {/* Category Filter Row */}
            <div className="flex justify-center">
              <div className="min-w-[200px]">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="border-nav-my/30 focus:border-nav-my bg-white">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-nav-my/30 z-50">
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
            
            {/* Status Filter Buttons Row */}
            <div className="flex justify-center">
              <div className="flex gap-2">
                {['all', 'active', 'completed', 'paused'].map((status) => {
                  const getStatusStyle = (status, isSelected) => {
                    const styles = {
                      all: isSelected 
                        ? { backgroundColor: '#DBEAFE', color: '#1E40AF', borderColor: '#93C5FD' }
                        : { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#DBEAFE' },
                      active: isSelected 
                        ? { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' }
                        : { backgroundColor: '#F0FDF4', color: '#15803D', borderColor: '#DCFCE7' },
                      completed: isSelected 
                        ? { backgroundColor: '#E9D5FF', color: '#7C2D12', borderColor: '#C4B5FD' }
                        : { backgroundColor: '#FAF5FF', color: '#8B5CF6', borderColor: '#E9D5FF' },
                      paused: isSelected 
                        ? { backgroundColor: '#FED7AA', color: '#C2410C', borderColor: '#FDBA74' }
                        : { backgroundColor: '#FFF7ED', color: '#EA580C', borderColor: '#FED7AA' }
                    };
                    return styles[status];
                  };
                  
                  return (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      style={getStatusStyle(status, statusFilter === status)}
                      className="border-2"
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Orchards Grid */}
        <div className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl rounded-2xl p-6">
          {userOrchards.length === 0 ? (
            <Card className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl">
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
                    <Button className="bg-nav-my hover:bg-nav-my/90 text-orange-700">
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
                <Card key={orchard.id} className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl hover:shadow-lg transition-all">
                  <div className="relative">
                    {orchard.images?.[0] ? (
                      <img 
                        src={orchard.images[0]} 
                        alt={orchard.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-nav-my/30 to-nav-my/50 rounded-t-lg flex items-center justify-center">
                        <TreePine className="h-12 w-12 text-orange-600" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge 
                        variant={orchard.status === 'active' ? 'default' : 'secondary'}
                        className={orchard.status === 'active' ? 'bg-nav-my text-orange-700' : ''}
                      >
                        {orchard.status}
                      </Badge>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-orange-100 text-orange-700 border-0">
                        {orchard.category}
                      </Badge>
                    </div>
                  </div>
                  
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
                          {orchard.location && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {orchard.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-orange-600 text-sm line-clamp-2">
                        {orchard.description}
                      </p>
                      
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
                          {formatCurrency((orchard.filled_pockets || 0) * (orchard.pocket_price || 0))}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-orange-600">Goal:</span>
                        <span className="font-medium text-orange-700">
                          {formatCurrency((orchard.total_pockets || 0) * (orchard.pocket_price || 0))}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-orange-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Created {new Date(orchard.created_at).toLocaleDateString()}
                      </div>
                      
                      {/* TESTING BUTTONS - Change status for testing filters */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="border-t pt-2">
                          <p className="text-xs text-gray-500 mb-2">Testing: Change Status</p>
                          <div className="flex gap-1">
                            <Button 
                              size="xs" 
                              onClick={() => handleChangeStatus(orchard.id, 'active')}
                              className="text-xs bg-green-100 text-green-700 hover:bg-green-200 border-green-300"
                            >
                              Active
                            </Button>
                            <Button 
                              size="xs" 
                              onClick={() => handleChangeStatus(orchard.id, 'completed')}
                              className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300"
                            >
                              Completed
                            </Button>
                            <Button 
                              size="xs" 
                              onClick={() => handleChangeStatus(orchard.id, 'paused')}
                              className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300"
                            >
                              Paused
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Link to={`/orchards/${orchard.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full border-nav-my/30 text-orange-700 hover:bg-nav-my/10">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link to={`/edit-orchard/${orchard.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full border-nav-my/30 text-orange-700 hover:bg-nav-my/10">
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
                            toast.success('Orchard link copied to clipboard!')
                          }}
                          className="border-nav-my/30 text-orange-700 hover:bg-nav-my/10"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteOrchard(orchard.id)}
                          className="border-red-300/50 text-red-700 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  )
}