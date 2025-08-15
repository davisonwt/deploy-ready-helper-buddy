import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Sprout, 
  Eye,
  Calendar,
  User,
  Play,
  Image as ImageIcon,
  Video,
  TreePine,
  Heart,
  Edit,
  Trash2,
  ArrowRight,
  Settings,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useRoles } from '../hooks/useRoles'

export default function YhvhOrchardsPage() {
  const { user } = useAuth()
  const { deleteOrchard } = useOrchards()
  const { isAdminOrGosat, userRoles, loading: rolesLoading } = useRoles()
  const [seeds, setSeeds] = useState([])
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Debug logging
  console.log('User:', user?.id)
  console.log('User roles:', userRoles)
  console.log('Is Admin or Gosat:', isAdminOrGosat())
  console.log('Roles loading:', rolesLoading)
  const [selectedSeed, setSelectedSeed] = useState(null)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [pocketPrice, setPocketPrice] = useState(150)
  const [totalPockets, setTotalPockets] = useState(10)
  const [converting, setConverting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSeeds()
    fetchOrchards()
  }, [])

  const fetchSeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('seeds')
        .select(`
          *,
          profiles (
            display_name,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSeeds(data || [])
    } catch (error) {
      console.error('Error fetching seeds:', error)
      toast.error('Failed to load seeds')
    } finally {
      setLoading(false)
    }
  }

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
      setOrchards(data || [])
    } catch (error) {
      console.error('Error fetching orchards:', error)
      toast.error('Failed to load orchards')
    }
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

  // Function to convert seed to orchard
  const convertSeedToOrchard = async () => {
    if (!selectedSeed) return

    setConverting(true)
    try {
      const { data: newOrchard, error } = await supabase
        .from('orchards')
        .insert({
          user_id: selectedSeed.gifter_id,
          title: selectedSeed.title,
          description: selectedSeed.description,
          category: selectedSeed.category,
          images: selectedSeed.images || [],
          video_url: selectedSeed.video_url,
          seed_value: selectedSeed.additional_details?.value || pocketPrice,
          original_seed_value: selectedSeed.additional_details?.value || pocketPrice,
          pocket_price: pocketPrice,
          total_pockets: totalPockets,
          currency: 'USD',
          orchard_type: 'standard',
          status: 'active',
          verification_status: 'approved'
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`Successfully converted "${selectedSeed.title}" to an orchard!`)
      setConvertDialogOpen(false)
      setSelectedSeed(null)
      setPocketPrice(150)
      setTotalPockets(10)
      
      // Refresh both lists
      fetchSeeds()
      fetchOrchards()
      
    } catch (error) {
      console.error('Error converting seed to orchard:', error)
      toast.error('Failed to convert seed to orchard')
    } finally {
      setConverting(false)
    }
  }

  // Function to check if seed already has an orchard
  const getSeedStatus = (seed) => {
    const hasValue = seed.additional_details?.value
    const matchingOrchard = orchards.find(orchard => 
      orchard.title.toLowerCase().includes(seed.title.toLowerCase()) ||
      (hasValue && orchard.original_seed_value === parseFloat(hasValue))
    )
    
    if (matchingOrchard) return 'converted'
    if (hasValue) return 'ready'
    return 'pending'
  }

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getGifterName = (profiles) => {
    if (!profiles) return 'Anonymous'
    return profiles.display_name || `${profiles.first_name} ${profiles.last_name}`.trim() || 'Anonymous'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-s2g-green/20 via-background to-s2g-green/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-success"></div>
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
        className="fixed top-0 left-0 w-full h-full object-cover z-0"
        onError={(e) => console.error('Video failed to load:', e)}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can play')}
      >
        <source src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/orchards%201a%201280x720.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Overlay for better text readability */}
      <div className="fixed top-0 left-0 w-full h-full bg-black/30 z-10"></div>
      
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 mt-4 bg-white/90">
          <div className="flex items-center space-x-6">
            <div className="p-4 bg-success/20 rounded-full">
              <TreePine className="h-12 w-12 text-success" />
            </div>
            <div>
              <h1 className="text-3xl font-bold px-8 py-4 rounded-lg" style={{ 
                color: '#e9d5ff', 
                textShadow: '2px 2px 4px #7c3aed'
              }}>364yhvh Community Orchards</h1>
              <p className="text-lg" style={{ color: '#663399' }}>
                Welcome to our community seed garden where members share their gifts, talents, and offerings.
              </p>
              <p className="text-sm mt-1" style={{ color: '#663399' }}>
                Each seed represents a blessing planted by a community member to help others grow.
              </p>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              {seeds.length} Seeds Planted
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              {orchards.length} Orchards Active
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Growing Together
            </Badge>
          </div>
        </div>

        {/* Admin/Gosat Management Zone */}
        {isAdminOrGosat() && (
          <div className="mb-8 p-6 bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-200 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">Gosat Management Zone</h3>
            </div>
            <p className="text-blue-700 text-sm mb-2">
              <strong>Process Seeds into Orchards:</strong> Review submitted seeds, add pricing, set pocket counts, and convert them into community-ready orchards.
            </p>
            <p className="text-blue-700 text-sm">
              <strong>Manage Active Orchards:</strong> Edit pocket prices, amounts, and orchard settings for existing community projects.
            </p>
          </div>
        )}

        {orchards.length > 0 && (
          <div className="mb-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 mb-6 mx-auto max-w-2xl">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <TreePine className="h-6 w-6 text-success" />
                <h2 className="text-2xl font-bold text-foreground">Community Orchards</h2>
                <TreePine className="h-6 w-6 text-success" />
              </div>
              {isAdminOrGosat() && (
                <p className="text-center text-gray-700 text-sm">
                  Fully processed projects ready for community support • Edit prices and manage settings
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orchards.map((orchard, index) => (
                <Card 
                  key={orchard.id} 
                  className="group hover:shadow-lg transition-all duration-300 border-border bg-card/90 backdrop-blur-sm overflow-hidden animate-fade-in"
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
                  
                  <CardContent className="pt-0">
                    {/* Image Preview */}
                    {orchard.images && orchard.images.length > 0 && (
                      <div className="mb-3 relative overflow-hidden rounded-lg">
                        <img
                          src={orchard.images[0]}
                          alt={orchard.title}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{orchard.filled_pockets}/{orchard.total_pockets} pockets</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div 
                          className="bg-success h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(orchard.filled_pockets / orchard.total_pockets) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {orchard.description}
                    </p>
                    
                    {/* Bestow Button */}
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
                    
                    {/* Owner Actions and Gosat Management */}
                    {user && (orchard.user_id === user.id || isAdminOrGosat()) && (
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
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Seeds Grid - Admin/Gosat Only */}
        {isAdminOrGosat() && (
          <>
            <div className="mb-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 mb-6 mx-auto max-w-2xl">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Sprout className="h-6 w-6 text-green-600" />
                  <h2 className="text-2xl font-bold text-foreground">Community Seeds</h2>
                  <Sprout className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-center text-gray-700 text-sm">
                  Seeds submitted by sowers via Free-Will Gifting • Convert valuable seeds into orchards
                </p>
              </div>
            </div>
            {seeds.length === 0 ? (
              <div className="text-center py-16">
                <TreePine className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No seeds planted yet</h3>
                <p className="text-muted-foreground">Waiting for community members to submit seeds via Free-Will Gifting!</p>
              </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {seeds.map((seed, index) => {
                   const seedStatus = getSeedStatus(seed)
                   return (
                     <Card 
                       key={seed.id} 
                       className="group hover:shadow-lg transition-all duration-300 border-border bg-card/90 backdrop-blur-sm overflow-hidden animate-fade-in"
                       style={{ animationDelay: `${index * 100}ms` }}
                     >
                       <CardHeader className="pb-3">
                         <div className="flex items-start justify-between">
                           <div className="flex-1">
                             <CardTitle className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                               {seed.title}
                             </CardTitle>
                             <div className="flex items-center space-x-2 mt-2">
                               <Badge className={`text-xs ${getCategoryColor(seed.category)}`}>
                                 {seed.category}
                               </Badge>
                               {/* Status Badge */}
                               {seedStatus === 'converted' && (
                                 <Badge className="text-xs bg-green-100 text-green-800">
                                   <CheckCircle className="h-3 w-3 mr-1" />
                                   Converted
                                 </Badge>
                               )}
                               {seedStatus === 'ready' && (
                                 <Badge className="text-xs bg-yellow-100 text-yellow-800">
                                   <Clock className="h-3 w-3 mr-1" />
                                   Ready
                                 </Badge>
                               )}
                               {seedStatus === 'pending' && (
                                 <Badge className="text-xs bg-gray-100 text-gray-800">
                                   <AlertCircle className="h-3 w-3 mr-1" />
                                   No Value
                                 </Badge>
                               )}
                             </div>
                           </div>
                           <div className="ml-2 p-2 bg-success/10 rounded-full">
                             <Sprout className="h-4 w-4 text-success" />
                           </div>
                         </div>
                       </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Image Preview */}
                      {seed.images && seed.images.length > 0 && (
                        <div className="mb-3 relative overflow-hidden rounded-lg">
                          <img
                            src={seed.images[0]}
                            alt={seed.title}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {seed.images.length > 1 && (
                            <Badge className="absolute top-2 right-2 bg-black/50 text-white text-xs">
                              +{seed.images.length - 1}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Description */}
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {seed.description}
                      </p>
                      
                      {/* Meta Info */}
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>By {getGifterName(seed.profiles)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Planted {formatDate(seed.created_at)}</span>
                        </div>
                        {seed.video_url && (
                          <div className="flex items-center space-x-1">
                            <Video className="h-3 w-3" />
                            <span>Has video</span>
                          </div>
                        )}
                      </div>
                       
                       {/* Action Buttons */}
                       <div className="space-y-2">
                         {/* Gosat Conversion Button */}
                         {seedStatus !== 'converted' && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="w-full border-green-500/30 text-green-700 hover:bg-green-50"
                             onClick={() => {
                               setSelectedSeed(seed)
                               setPocketPrice(seed.additional_details?.value || 150)
                               setTotalPockets(Math.ceil((seed.additional_details?.value || 1500) / (seed.additional_details?.value || 150)))
                               setConvertDialogOpen(true)
                             }}
                           >
                             <ArrowRight className="h-3 w-3 mr-2" />
                             Convert to Orchard
                           </Button>
                         )}
                       </div>
                    </CardContent>
                     </Card>
                   )
                 })}
               </div>
             )}
           </>
        )}

        {/* Conversion Dialog */}
        <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Convert Seed to Orchard</DialogTitle>
            </DialogHeader>
            {selectedSeed && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedSeed.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedSeed.category}</p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="pocketPrice">Pocket Price (USD)</Label>
                    <Input
                      id="pocketPrice"
                      type="number"
                      value={pocketPrice}
                      onChange={(e) => setPocketPrice(Number(e.target.value))}
                      min="1"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="totalPockets">Total Pockets</Label>
                    <Input
                      id="totalPockets"
                      type="number"
                      value={totalPockets}
                      onChange={(e) => setTotalPockets(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">Total Goal: ${(pocketPrice * totalPockets).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Seed Value: ${selectedSeed.additional_details?.value || 'Not specified'}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setConvertDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={convertSeedToOrchard}
                    disabled={converting}
                    className="flex-1"
                  >
                    {converting ? 'Converting...' : 'Convert'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}