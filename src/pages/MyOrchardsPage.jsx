// v2
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Link } from 'react-router-dom'
import { Sprout, Plus, Eye, Users, TrendingUp, Calendar, DollarSign, Edit, Share2, MapPin, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/integrations/supabase/client'
import { formatCurrency } from '../utils/formatters'
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder'
import { processOrchardsUrls } from '../utils/urlUtils'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'

const WANDERING_ROLES = [
  { label: 'Wheel 🚗',      value: 'Wheel' },
  { label: 'Hand 🤲',       value: 'Hand' },
  { label: 'Whisperer 🌬️', value: 'Whisperer' },
  { label: 'Pillow 🛏️',    value: 'Pillow' },
  { label: 'Field 🌾',      value: 'Field' },
  { label: 'Hearth 🔥',     value: 'Hearth' },
  { label: 'Heart 💚',      value: 'Heart' },
  { label: 'Forge ⚒️',      value: 'Forge' },
  { label: 'Story 🎥',      value: 'Story' },
]

export default function MyOrchardsPage() {
  const { user } = useAuth()
  const [userSeeds, setUserSeeds] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRole, setSelectedRole] = useState('all')
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchSeeds = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orchards')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      setSeeds(data || [])
    } catch (err) {
      console.error('Error fetching seeds:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteSeed = async (id) => {
    try {
      const { error } = await supabase.from('orchards').delete().eq('id', id)
      if (error) throw error
      await fetchSeeds()
    } catch (err) {
      console.error('Error deleting seed:', err)
      throw err
    }
  }

  useEffect(() => {
    if (user) fetchSeeds()
  }, [user])

  useEffect(() => {
    const processed = processOrchardsUrls(seeds)
    let filtered = processed.filter(s => s.user_id === user?.id)
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.status === statusFilter)
    if (selectedRole !== 'all') filtered = filtered.filter(s => s.category === selectedRole)
    setUserSeeds(filtered)
  }, [seeds, user, statusFilter, selectedRole])

  const getCompletionPercentage = (seed) => {
    const total = (seed.intended_pockets && seed.intended_pockets > 1) ? seed.intended_pockets : seed.total_pockets || 1
    if (!total) return 0
    return Math.round((seed.filled_pockets / total) * 100)
  }

  const getTotalRaised = () =>
    userSeeds.reduce((sum, s) => sum + ((s.filled_pockets || 0) * (s.pocket_bestow || 0)), 0)

  const handleDeleteSeed = async (seedId) => {
    if (!window.confirm('Are you sure you want to remove this seed? This cannot be undone.')) return
    try {
      await deleteSeed(seedId)
      toast.success('Seed removed successfully')
    } catch {
      toast.error('Failed to remove seed')
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 25%, #047857 50%, #065f46 75%, #064e3b 100%)',
      }}>
        <Loader2 className='w-12 h-12 animate-spin text-white' />
      </div>
    )
  }

  return (
     <div style={{position:'fixed',inset:0,zIndex:9999,overflowY:'auto'}}>  <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Animated Background */}
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 25%, #047857 50%, #065f46 75%, #064e3b 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/20' />
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
            animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className='relative z-10'>
        {/* Hero */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10'>
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
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>My Garden</h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Manage and tend to your growing seeds. Watch each one blossom into something meaningful.
              </p>
              <p className='text-white/70 text-sm mb-6'>
                Payment Method: USDC (USD Coin) • Total Raised: {formatCurrency(getTotalRaised())}
              </p>
              <div className='flex flex-wrap items-center justify-center gap-4'>
                <Link to="/create-orchard">
                  <Button size="lg" className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                    <Plus className="h-5 w-5 mr-2" />Sow New Seed
                  </Button>
                </Link>
                <Link to="/community-offering">
                  <Button size="lg" variant="outline" className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                    <Sparkles className="h-5 w-5 mr-2" />AI Offering Generator
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        <div className='container mx-auto px-4 py-8'>
          {/* Stats */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
            <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
              <CardContent className='p-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-white/80'>Total Seeds</p>
                    <p className='text-2xl font-bold text-white'>{userSeeds.length}</p>
                  </div>
                  <Sprout className='h-8 w-8 text-white' />
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
                    <p className='text-sm font-medium text-white/80'>Active Seeds</p>
                    <p className='text-2xl font-bold text-white'>{userSeeds.filter(s => s.status === 'active').length}</p>
                  </div>
                  <TrendingUp className='h-8 w-8 text-white' />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className='mb-8 space-y-4'>
            <div className='flex justify-center'>
              <div className='min-w-[240px]'>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className='backdrop-blur-md bg-white/20 border-white/30 text-white'>
                    <SelectValue placeholder='Filter by Wandering Role' />
                  </SelectTrigger>
                  <SelectContent className='bg-white border border-border z-50'>
                    <SelectItem value='all'>All Roles</SelectItem>
                    {WANDERING_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='flex justify-center'>
              <div className='flex gap-2'>
                {['all', 'active', 'completed', 'paused'].map((status) => (
                  <Button
                    key={status}
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

          {/* Seeds Grid */}
          <div className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl rounded-2xl p-6 md:p-8'>
            {userSeeds.length === 0 ? (
              <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
                <CardContent className='p-12 text-center'>
                  <Sprout className='h-16 w-16 mx-auto text-white/70 mb-4' />
                  <h3 className='text-xl font-semibold text-white mb-2'>
                    {statusFilter !== 'all' || selectedRole !== 'all' ? 'No seeds found' : 'No seeds yet'}
                  </h3>
                  <p className='text-white/70 mb-6'>
                    {statusFilter !== 'all' || selectedRole !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Start your journey by sowing your first seed'}
                  </p>
                  {statusFilter === 'all' && selectedRole === 'all' && (
                    <Link to="/create-orchard">
                      <Button className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                        <Plus className="h-4 w-4 mr-2" />Sow Your First Seed
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="relative px-12">
                <Carousel opts={{ align: "start", loop: true }} className="w-full">
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {userSeeds.map((seed) => (
                      <CarouselItem key={seed.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                        <Card className='backdrop-blur-md bg-white/20 border-white/30 shadow-2xl hover:shadow-3xl transition-all flex flex-col'>
                          <div className="relative">
                            {seed.images?.[0] ? (
                              <img src={seed.images[0]} alt={seed.title} className="w-full h-48 object-cover rounded-t-lg" />
                            ) : (
                              <GradientPlaceholder type="orchard" title={seed.title} className="w-full h-48 rounded-t-lg" size="lg" />
                            )}
                            <div className="absolute top-4 right-4">
                              <Badge className={seed.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                {seed.status}
                              </Badge>
                            </div>
                            <div className="absolute top-4 left-4">
                              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                                {WANDERING_ROLES.find(r => r.value === seed.category)?.label || seed.category}
                              </Badge>
                            </div>
                          </div>
                          <CardHeader className="pb-4">
                            <CardTitle className='text-lg text-white mb-2 line-clamp-2'>{seed.title}</CardTitle>
                            <div className='flex items-center space-x-4 text-sm text-white/80'>
                              <span className="flex items-center"><Eye className="h-4 w-4 mr-1" />{seed.views || 0}</span>
                              <span className="flex items-center"><Users className="h-4 w-4 mr-1" />{seed.supporters || 0}</span>
                              {seed.location && <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{seed.location}</span>}
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <div className="space-y-4 flex-1">
                              <p className='text-white/80 text-sm line-clamp-2 mb-3'>{seed.description}</p>
                              {seed.pocket_bestow && (
                                <div className="mb-3 p-2 bg-purple-500/20 border border-purple-400/50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/70">Pocket Bestow</span>
                                    <Badge className="bg-purple-500/30 text-white border-purple-400/50">{formatCurrency(seed.pocket_bestow)}</Badge>
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='text-sm text-white/80'>Growth</span>
                                  <span className='text-sm font-medium text-white'>{getCompletionPercentage(seed)}%</span>
                                </div>
                                <Progress value={getCompletionPercentage(seed)} className='h-2' />
                              </div>
                              <div className='flex items-center justify-between text-sm'>
                                <span className='text-white/80'>Raised:</span>
                                <span className='font-medium text-white'>{formatCurrency((seed.filled_pockets || 0) * (seed.pocket_bestow || 0))}</span>
                              </div>
                              <div className='flex items-center justify-between text-sm'>
                                <span className='text-white/80'>Goal:</span>
                                <span className='font-medium text-white'>
                                  {formatCurrency(((seed.intended_pockets && seed.intended_pockets > 1) ? seed.intended_pockets : seed.total_pockets || 0) * (seed.pocket_bestow || 0))}
                                </span>
                              </div>
                              <div className='flex items-center text-sm text-white/70'>
                                <Calendar className='h-4 w-4 mr-1' />
                                Sown {new Date(seed.created_at).toLocaleDateString()}
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2 mt-auto">
                                <Link to={`/orchards/${seed.id}`} className='flex-1 min-w-[100px]'>
                                  <Button variant='outline' size='sm' className='w-full backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                                    <Eye className='h-4 w-4 mr-1' />View
                                  </Button>
                                </Link>
                                <Link to={`/edit-orchard/${seed.id}`} className='flex-1 min-w-[100px]'>
                                  <Button variant='outline' size='sm' className='w-full backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                                    <Edit className='h-4 w-4 mr-1' />Edit
                                  </Button>
                                </Link>
                                <Button
                                  variant='outline' size='sm'
                                  className='flex-1 min-w-[100px] backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/animated-orchard/${seed.id}`)
                                    toast.success('Seed link copied!')
                                  }}
                                >
                                  <Share2 className='h-4 w-4' />
                                </Button>
                                <Button
                                  variant='outline' size='sm'
                                  onClick={() => handleDeleteSeed(seed.id)}
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
    </div>
  )
}