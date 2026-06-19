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
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder'
import { SocialActionButtons } from '@/components/social/SocialActionButtons'
import { formatCurrency } from '@/lib/utils'
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
  const navigate = useNavigate()
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
    "The Gift of Platform Support",
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
      <div className='min-h-screen flex items-center justify-center text-slate-100' style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
        <Loader2 className='w-12 h-12 animate-spin text-cyan-300' />
      </div>
    )
  }

  return (
    <div className='min-h-screen text-slate-100 relative' style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
      <div aria-hidden className='pointer-events-none fixed inset-0 -z-0' style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(245,158,11,0.08), transparent 60%)' }} />

      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <Button onClick={() => navigate(-1)} variant='ghost' className='mb-4 gap-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10'>← Go Back</Button>

        {/* Hero Header — midnight glass */}
        <div className='relative overflow-hidden rounded-2xl mb-8 border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur shadow-[0_0_40px_rgba(34,211,238,0.10)]'>
          <div className='relative container mx-auto px-4 py-12'>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='text-center max-w-4xl mx-auto'>
              <div className='flex items-center justify-center gap-4 mb-6'>
                <div className='p-4 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 shadow-[0_0_25px_rgba(34,211,238,0.30)]'>
                  <Sprout className='w-12 h-12 text-cyan-300' />
                </div>
                <h1 className='text-4xl md:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)]'>S2G Community Orchards</h1>
              </div>
              <p className='text-slate-300/90 text-base md:text-lg mb-6 rounded-xl bg-white/5 border border-white/10 p-4'>
                Fully processed projects ready for community support and bestowals. Each orchard represents a completed project ready for community funding.
              </p>
              <div className='mt-2 flex flex-wrap gap-3 items-center justify-center'>
                <span className='rounded-full px-4 py-2 text-sm font-bold border border-cyan-400/30 bg-cyan-500/15 text-cyan-100'>{filteredOrchards.length} Active Orchards</span>
                <span className='rounded-full px-4 py-2 text-sm font-bold border border-emerald-400/30 bg-emerald-500/15 text-emerald-100'>Community Funded</span>
                <span className='rounded-full px-4 py-2 text-sm font-bold border border-amber-400/30 bg-amber-500/15 text-amber-100'>Growing Together</span>
                <div className='min-w-[200px]'>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className='border-violet-400/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15 transition'>
                      <SelectValue placeholder='Filter by Category' />
                    </SelectTrigger>
                    <SelectContent className='bg-[#0f172a]/95 border-violet-400/30 z-50'>
                      <SelectItem value='all'>All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
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
              You can edit pocket bestow values, amounts, and manage orchard settings.
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
                        className="group hover:shadow-lg transition-all duration-300 border-white/20 bg-white/10 backdrop-blur-md overflow-hidden animate-fade-in h-full"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold text-white line-clamp-2 group-hover:text-white/90 transition-colors">
                                {orchard.title}
                              </CardTitle>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge className={`text-xs bg-white/20 border-white/30 text-white ${getCategoryColor(orchard.category)}`}>
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
                            <div className="flex justify-between text-xs text-white/70 mb-1">
                              <span>Progress</span>
                              <span>{orchard.filled_pockets}/{(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets}</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${(orchard.filled_pockets / ((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-sm text-white/80 line-clamp-2 mb-3">
                            {orchard.description}
                          </p>
                          {/* Pocket Bestow Display */}
                          {orchard.pocket_bestow && (
                            <div className="mb-3 p-2 bg-purple-500/20 border border-purple-400/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white/70">Pocket Bestow</span>
                                <Badge className="bg-purple-500/30 text-white border-purple-400/50">
                                  {formatCurrency(orchard.pocket_bestow)}
                                </Badge>
                              </div>
                            </div>
                          )}
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full mb-2 text-white shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 border-0"
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
                                  <div className="flex gap-2 pt-2 border-t border-white/20 mt-2">
                                    <Link to={`/edit-orchard/${orchard.id}`} className="flex-1">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                                      >
                                        <Settings className="h-3 w-3 mr-1" />
                                        {orchard.user_id === user.id ? 'Edit' : 'Manage Orchard'}
                                      </Button>
                                    </Link>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleDeleteOrchard(orchard.id)}
                                      className="border-red-500/50 text-red-400 hover:bg-red-500/20 backdrop-blur-sm"
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