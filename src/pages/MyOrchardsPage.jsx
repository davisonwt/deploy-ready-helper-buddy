import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
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
  Trash2,
  Sparkles,
  Loader2
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
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 25%, #047857 50%, #065f46 75%, #064e3b 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}>
        <Loader2 className='w-12 h-12 animate-spin text-white' />
      </div>
    )
  }

  return (
    <div className='min-h-screen relative overflow-hidden'>
      {/* Creative Animated Background */}
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 25%, #047857 50%, #065f46 75%, #064e3b 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/20' />
        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute rounded-full blur-3xl opacity-30'
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, rgba(${16 + i * 10}, ${185 - i * 5}, ${129 - i * 3}, 0.6), transparent)`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 12}%`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className='relative z-10'>
        {/* Hero Section */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10'>
          <div className='relative container mx-auto px-4 py-16'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <div className='p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30'>
                  <TreePine className='w-16 h-16 text-white' />
                </div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  My S2G Orchards
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Manage and track your growing orchards. Watch your seeds blossom into thriving community projects.
              </p>
              <p className='text-white/70 text-sm mb-6'>
                Payment Method: USDC (USD Coin) • Total Raised: {formatCurrency(getTotalRaised())}
              </p>
              <div className='flex flex-wrap items-center justify-center gap-4'>
                <Link to="/create-orchard">
                  <Button 
                    size="lg" 
                    className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Sow New Seed
                  </Button>
                </Link>
                <Link to="/community-offering">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    AI Offering Generator
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* Stats Section */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-white/80'>Total Orchards</p>
                    <p className='text-2xl font-bold text-white'>{userOrchards.length}</p>
                  </div>
                  <TreePine className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>

            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-white/80'>Total Raised</p>
                    <p className='text-2xl font-bold text-white'>{formatCurrency(getTotalRaised())}</p>
                  </div>
                  <DollarSign className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>

            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-white/80'>Active Orchards</p>
                    <p className='text-2xl font-bold text-white'>
                      {userOrchards.filter(o => o.status === 'active').length}
                    </p>
                  </div>
                  <TrendingUp className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Filters */}
          <div className='mb-8'>
            <div className='space-y-4'>
              {/* Category Filter Row */}
              <div className='flex justify-center'>
                <div className='min-w-[200px]'>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className='backdrop-blur-md bg-white/20 border-white/30 text-white'>
                      <SelectValue placeholder='Filter by Category' />
                    </SelectTrigger>
                    <SelectContent className='bg-white border border-border z-50'>
                      <SelectItem value='all'>All Categories</SelectItem>
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
              <div className='flex justify-center'>
                <div className='flex gap-2'>
                  {['all', 'active', 'completed', 'paused'].map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setStatusFilter(status)}
                      className={statusFilter === status 
                        ? 'backdrop-blur-md bg-white/30 border-white/40 text-white hover:bg-white/40' 
                        : 'backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Orchards Grid */}
          <div className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl rounded-2xl p-6 md:p-8'>
            {userOrchards.length === 0 ? (
              <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
                <CardContent className='p-12 text-center'>
                  <TreePine className='h-16 w-16 mx-auto text-white/70 mb-4' />
                  <h3 className='text-xl font-semibold text-white mb-2'>
                    {searchTerm || statusFilter !== 'all' ? 'No orchards found' : 'No orchards yet'}
                  </h3>
                  <p className='text-white/70 mb-6'>
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Start your journey by planting your first seed'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Link to="/create-orchard">
                      <Button className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
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
                <Card key={orchard.id} className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl hover:shadow-3xl transition-all flex flex-col'>
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
                        <CardTitle className='text-lg text-white mb-2 line-clamp-2'>{orchard.title}</CardTitle>
                        <div className='flex items-center space-x-4 text-sm text-white/80'>
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
                      <p className='text-white/80 text-sm line-clamp-2'>
                        {orchard.description}
                      </p>
                      
                      <div>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-sm text-white/80'>Progress</span>
                          <span className='text-sm font-medium text-white'>
                            {getCompletionPercentage(orchard)}%
                          </span>
                        </div>
                        <Progress 
                          value={getCompletionPercentage(orchard)} 
                          className='h-2'
                        />
                      </div>
                      
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-white/80'>Raised:</span>
                        <span className='font-medium text-white'>
                          {formatCurrency((orchard.filled_pockets || 0) * (orchard.pocket_price || 0))}
                        </span>
                      </div>
                      
                       <div className='flex items-center justify-between text-sm'>
                         <span className='text-white/80'>Goal:</span>
                         <span className='font-medium text-white'>
                           {formatCurrency(((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) * (orchard.pocket_price || 0))}
                         </span>
                       </div>
                      
                      <div className='flex items-center text-sm text-white/70'>
                        <Calendar className='h-4 w-4 mr-1' />
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
                        <Link to={`/orchards/${orchard.id}`} className='flex-1 min-w-[100px]'>
                          <Button variant='outline' size='sm' className='w-full backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                            <Eye className='h-4 w-4 mr-1' />
                            View
                          </Button>
                        </Link>
                        <Link to={`/edit-orchard/${orchard.id}`} className='flex-1 min-w-[100px]'>
                          <Button variant='outline' size='sm' className='w-full backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                            <Edit className='h-4 w-4 mr-1' />
                            Edit
                          </Button>
                        </Link>
                          <Button 
                          variant='outline' 
                          size='sm'
                          className='flex-1 min-w-[100px] backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
                          onClick={() => {
                            const url = `${window.location.origin}/animated-orchard/${orchard.id}`
                            navigator.clipboard.writeText(url)
                            toast.success('Orchard link copied to clipboard!')
                          }}
                        >
                          <Share2 className='h-4 w-4' />
                        </Button>
                        <Button 
                          variant='outline' 
                          size='sm'
                          onClick={() => handleDeleteOrchard(orchard.id)}
                          className='backdrop-blur-md bg-red-500/20 border-red-300/50 text-red-200 hover:bg-red-500/30'
                        >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className='absolute -left-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
                <CarouselNext className='absolute -right-4 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
              </Carousel>
            </div>
          )}
        </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
