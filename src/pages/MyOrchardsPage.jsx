import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

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
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { formatCurrency } from '../utils/formatters';
import { processOrchardsUrls } from '../utils/urlUtils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function MyOrchardsPage() {
  const { user } = useAuth()
  
  // Initialize state first
  const [userOrchards, setUserOrchards] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Data state and loaders
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchOrchards = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orchards')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      setOrchards(data || [])
    } catch (err) {
      console.error('Error fetching orchards:', err)
    } finally {
      setLoading(false)
    }
  }


  const deleteOrchard = async (id) => {
    try {
      const { error } = await supabase
        .from('orchards')
        .delete()
        .eq('id', id)
      if (error) throw error
      // refresh
      await fetchOrchards()
    } catch (err) {
      console.error('Error deleting orchard:', err)
      throw err
    }
  }

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
    "The Gift of Everything Bee's",
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
    "The Gift of Technology & Hardware (Consumer Electronics)",
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
    // First process URLs to ensure they're public URLs
    const processedOrchards = processOrchardsUrls(orchards);
    
  // Filter to show only user's own orchards - Debug logging
    console.log('🔍 MyOrchards Debug:', {
      userHasId: !!user?.id,
      userId: user?.id,
      totalOrchards: processedOrchards.length,
      orchardUserIds: processedOrchards.map(o => ({ id: o.id, user_id: o.user_id, title: o.title }))
    });
    
    let filtered = processedOrchards.filter(orchard => {
      const isUserOrchard = orchard.user_id === user?.id;
      if (!isUserOrchard) {
        console.log(`❌ Orchard ${orchard.title} not owned by user:`, { orchard_user_id: orchard.user_id, current_user_id: user?.id });
      }
      return isUserOrchard;
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
    
    console.log('🖼️ MyOrchards URL Debug:', {
      originalOrchards: orchards.length,
      processedOrchards: processedOrchards.length,
      userOrchards: filtered.length,
      sampleImageURLs: filtered.slice(0, 2).map(o => ({ id: o.id, images: o.images }))
    });
    
    setUserOrchards(filtered)
  }, [orchards, user, searchTerm, statusFilter, selectedCategory])

  const getCompletionPercentage = (orchard) => {
    const totalPockets = (orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1;
    if (!totalPockets || totalPockets === 0) return 0;
    return Math.round((orchard.filled_pockets / totalPockets) * 100);
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
      <VideoPlayer
        src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/s2g%20my%20orchard%20(1).mp4"
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay={true}
        loop={true}
        muted={true}
        playsInline={true}
        onError={(e) => {
          console.warn('Background video failed to load, using fallback');
        }}
      />
      
      {/* Solid dark overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/80"></div>
      
      {/* Content */}
      <div className="relative z-10">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center py-12 px-4 mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <TreePine className="h-12 w-12 text-green-600" />
          <h1 className="text-4xl md:text-5xl font-bold">
            <span className="text-green-600">My</span>{" "}
            <span className="text-lime-500">Orchards</span>
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mb-6">
          Manage and track your growing orchards
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Payment Method: USDC (USD Coin) • Total Raised: {formatCurrency(getTotalRaised())}
        </p>
        <Link to="/create-orchard">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-green-500 to-lime-400 hover:from-green-600 hover:to-lime-500 text-white font-semibold shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Sow New Seed
          </Button>
        </Link>
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
        <div className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl rounded-2xl p-6 md:p-8">
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
            <div className="relative px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {userOrchards.map((orchard) => (
                    <CarouselItem key={orchard.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">{" "}
                <Card key={orchard.id} className="bg-white/90 backdrop-blur-sm border-white/50 shadow-xl hover:shadow-2xl transition-all flex flex-col">
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
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-orange-700 mb-2 line-clamp-2">{orchard.title}</CardTitle>
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
                  
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
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
                           {formatCurrency(((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) * (orchard.pocket_price || 0))}
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
                      
                      <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                        <Link to={`/orchards/${orchard.id}`} className="flex-1 min-w-[100px]">
                          <Button variant="outline" size="sm" className="w-full border-nav-my/30 text-orange-700 hover:bg-nav-my/10">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link to={`/edit-orchard/${orchard.id}`} className="flex-1 min-w-[100px]">
                          <Button variant="outline" size="sm" className="w-full border-nav-my/30 text-orange-700 hover:bg-nav-my/10">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                          <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 min-w-[100px] border-nav-my/30 text-orange-700 hover:bg-nav-my/10"
                          onClick={() => {
                            const url = `${window.location.origin}/animated-orchard/${orchard.id}`
                            navigator.clipboard.writeText(url)
                            toast.success('Orchard link copied to clipboard!')
                          }}
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
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
                <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background border-2 border-primary" />
              </Carousel>
            </div>
          )}
        </div>

      </div>
      </div>
    </div>
  )
}
