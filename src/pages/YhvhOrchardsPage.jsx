import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TreePine,
  Heart,
  Settings,
  Trash2,
  Loader2,
  Sprout
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { SocialActionButtons } from '@/components/social/SocialActionButtons'
import { SowerAnalyticsTooltip } from '@/components/social/SowerAnalyticsTooltip'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
 
// import { useRoles } from '../hooks/useRoles'
import { processOrchardsUrls } from '../utils/urlUtils'

export default function YhvhOrchardsPage() {
  const { user } = useAuth()
  const deleteOrchard = async (id) => {
    try {
      const { error } = await supabase
        .from('orchards')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err) {
      console.error('Error deleting orchard:', err)
      return { success: false, error: err.message }
    }
  }
  // Local roles state to avoid cross-hook issues
  const [userRoles, setUserRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)

  useEffect(() => {
    let active = true
    const loadRoles = async () => {
      if (!user?.id) { if (active) setUserRoles([]); return }
      try {
        setRolesLoading(true)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
        if (error) throw error
        if (active) setUserRoles((data || []).map(r => r.role))
      } catch (e) {
        if (active) setUserRoles([])
        console.error('YhvhOrchardsPage: roles fetch failed', e)
      } finally {
        if (active) setRolesLoading(false)
      }
    }
    loadRoles()
    return () => { active = false }
  }, [user?.id])

  const isAdminOrGosat = userRoles.includes('admin') || userRoles.includes('gosat')
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const navigate = useNavigate()

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

  console.log('🌳 YhvhOrchardsPage: Component loaded', {
    user: !!user,
    userId: user?.id,
    isAdminOrGosat: isAdminOrGosat,
    userRoles
  });

  useEffect(() => {
    console.log('🌳 YhvhOrchardsPage: useEffect triggered, fetching orchards');
    fetchOrchards()
  }, [])

  const fetchOrchards = async () => {
    try {
      const { data, error } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles (
            display_name,
            first_name,
            last_name
          )
        `)
         .in('orchard_type', ['standard', 'full_value'])
         .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      const processedOrchards = processOrchardsUrls(data || [])
      setOrchards(processedOrchards)
    } catch (error) {
      console.error('Error fetching orchards:', error)
      toast.error('Failed to load orchards')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOrchard = async (orchardId) => {
    if (!window.confirm('Are you sure you want to delete this orchard? This action cannot be undone.')) {
      return
    }

    try {
      const result = await deleteOrchard(orchardId)
      
      if (result.success) {
        // Immediately remove the orchard from the state
        setOrchards(prevOrchards => prevOrchards.filter(orchard => orchard.id !== orchardId))
        toast.success('Orchard deleted successfully')
      } else {
        toast.error(result.error || 'Failed to delete orchard')
      }
    } catch (error) {
      console.error('Error deleting orchard:', error)
      toast.error('Failed to delete orchard')
    }
  }

  // Filter orchards by category
  const filteredOrchards = selectedCategory === 'all' 
    ? orchards 
    : orchards.filter(orchard => orchard.category === selectedCategory)

  const getCategoryColor = (category) => {
    const colors = {
      'The Gift of Accessories': 'bg-purple-100 text-purple-800',
      'The Gift of Adventure Packages': 'bg-green-100 text-green-800',
      'The Gift of Appliances': 'bg-blue-100 text-blue-800',
      'The Gift of Art': 'bg-pink-100 text-pink-800',
      'The Gift of Books & Literature': 'bg-amber-100 text-amber-800',
      'The Gift of Business Solutions': 'bg-slate-100 text-slate-800',
      'The Gift of Clothing & Fashion': 'bg-rose-100 text-rose-800',
      'The Gift of Computers & Technology': 'bg-indigo-100 text-indigo-800',
      'The Gift of Education & Training': 'bg-yellow-100 text-yellow-800',
      'The Gift of Entertainment': 'bg-orange-100 text-orange-800',
      'The Gift of Food & Beverages': 'bg-red-100 text-red-800',
      'The Gift of Furniture & Home Decor': 'bg-cyan-100 text-cyan-800',
      'The Gift of Gifts & Special Items': 'bg-violet-100 text-violet-800',
      'The Gift of Health & Medical': 'bg-emerald-100 text-emerald-800',
      'The Gift of Industrial & Scientific': 'bg-stone-100 text-stone-800',
      'The Gift of Music': 'bg-fuchsia-100 text-fuchsia-800',
      'The Gift of Personal Care': 'bg-teal-100 text-teal-800',
      'The Gift of Security': 'bg-gray-100 text-gray-800',
      'The Gift of Services': 'bg-lime-100 text-lime-800',
      'The Gift of Social Impact': 'bg-sky-100 text-sky-800',
      'The Gift of Software': 'bg-blue-100 text-blue-800',
      'The Gift of Sports & Recreation': 'bg-green-100 text-green-800',
      'The Gift of Tools & Equipment': 'bg-zinc-100 text-zinc-800',
      'The Gift of Transportation': 'bg-neutral-100 text-neutral-800',
      'The Gift of Travel & Tourism': 'bg-cyan-100 text-cyan-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6d28d9 50%, #5b21b6 75%, #4c1d95 100%)',
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
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 25%, #6d28d9 50%, #5b21b6 75%, #4c1d95 100%)',
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
              background: `radial-gradient(circle, rgba(${139 - i * 5}, ${92 - i * 3}, ${246 - i * 2}, 0.6), transparent)`,
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
      
      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Hero Header */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10 rounded-2xl mb-8 mt-4'>
          <div className='relative container mx-auto px-4 py-16'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <div className='p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30'>
                  <Sprout className='w-16 h-16 text-white' />
                </div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  S2G Community Orchards
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Fully processed projects ready for community support and bestowals. Each orchard represents a completed project ready for community funding.
              </p>
              <div className='mt-6 flex flex-wrap gap-4 items-center justify-center'>
                <Badge variant='outline' className='backdrop-blur-md bg-white/20 border-white/30 text-white px-4 py-2'>
                  {filteredOrchards.length} Active Orchards
                </Badge>
                <Badge variant='outline' className='backdrop-blur-md bg-white/20 border-white/30 text-white px-4 py-2'>
                  Community Funded
                </Badge>
                <Badge variant='outline' className='backdrop-blur-md bg-white/20 border-white/30 text-white px-4 py-2'>
                  Growing Together
                </Badge>
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
            </motion.div>
          </div>
        </div>

        {/* Gosat Management Info */}
        {isAdminOrGosat && (
          <div className='mb-8 p-6 backdrop-blur-md bg-white/20 border-white/30 rounded-2xl shadow-2xl'>
            <div className='flex items-center space-x-3 mb-4'>
              <Settings className='h-6 w-6 text-white' />
              <h3 className='text-lg font-semibold text-white'>Gosat's Management Zone</h3>
            </div>
            <p className='text-white/90 text-sm mb-2'>
              <strong>Community Orchards:</strong> These are fully processed projects ready for community support. 
              You can edit pocket prices, amounts, and manage orchard settings.
            </p>
            <p className='text-white/90 text-sm'>
              <strong>Note:</strong> Seeds from Free-Will Gifting are managed on the Gosat's Dashboard where you can convert them into orchards.
            </p>
          </div>
        )}

        {/* Community Orchards Section */}
        {filteredOrchards.length > 0 ? (
          <section className="mb-12">
            <div className="relative px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {filteredOrchards.map((orchard, index) => (
                    <CarouselItem key={orchard.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                      <Card 
                        className="group hover:shadow-lg transition-all duration-300 border-border bg-card/90 backdrop-blur-sm overflow-hidden animate-fade-in h-full"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                {orchard.title}
                              </CardTitle>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge className={`text-xs ${getCategoryColor(orchard.category)}`}>
                                  {orchard.category}
                                </Badge>
                              </div>
                            </div>
                            <div className="ml-2 p-2 bg-success/10 rounded-full">
                              <TreePine className="h-4 w-4 text-success" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 flex-1 flex flex-col">
                          <div className="mb-3 relative overflow-hidden rounded-lg">
                            {orchard.images && orchard.images.length > 0 ? (
                              <img
                                src={orchard.images[0]}
                                alt={orchard.title}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <GradientPlaceholder 
                                type="orchard" 
                                title={orchard.title}
                                className="w-full h-32"
                                size="md"
                              />
                            )}
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress</span>
                              <span>{orchard.filled_pockets}/{(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets}</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div 
                                className="bg-success h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(orchard.filled_pockets / ((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {orchard.description}
                          </p>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full mb-2 text-white shadow-lg"
                            style={{ 
                              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #8b5cf6 100%)',
                              border: '2px solid #1e40af'
                            }}
                            onClick={() => navigate(`/animated-orchard/${orchard.id}`)}
                          >
                            <Heart className="h-3 w-3 mr-2" />
                            Bestow into this Orchard
                          </Button>
                          <div className="mb-2">
                            <SocialActionButtons
                              type="orchard"
                              itemId={orchard.id}
                              ownerId={orchard.user_id}
                              ownerName={orchard.profiles?.display_name || `${orchard.profiles?.first_name || ''} ${orchard.profiles?.last_name || ''}`.trim()}
                              ownerWallet={orchard.profiles?.wallet_address}
                              title={orchard.title}
                              likeCount={orchard.like_count || 0}
                              isOwner={user?.id === orchard.user_id}
                              variant="compact"
                            />
                          </div>
                          {user && (orchard.user_id === user.id || isAdminOrGosat) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex gap-2 pt-2 border-t border-border mt-2">
                                    <Link to={`/edit-orchard/${orchard.id}`} className="flex-1">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full border-success/30 text-success hover:bg-success/10"
                                      >
                                        <Settings className="h-3 w-3 mr-1" />
                                        {orchard.user_id === user.id ? 'Edit' : 'Manage Orchard'}
                                      </Button>
                                    </Link>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleDeleteOrchard(orchard.id)}
                                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-0">
                                  <SowerAnalyticsTooltip
                                    userId={orchard.user_id}
                                    itemId={orchard.id}
                                    itemType="orchard"
                                  />
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-background/90 hover:bg-background border border-primary shadow-md" />
                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-background/90 hover:bg-background border border-primary shadow-md" />
              </Carousel>
            </div>
          </section>
        ) : (
          <div className="text-center py-16">
            <TreePine className='h-24 w-24 mx-auto text-white/70 mb-4' />
            <h3 className='text-xl font-semibold text-white mb-2'>No orchards available yet</h3>
            <p className='text-white/70'>Gosats will convert seeds into orchards that will appear here for community support.</p>
          </div>
        )}
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