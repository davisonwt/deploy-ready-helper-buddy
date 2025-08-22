import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TreePine,
  Heart,
  Settings,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOrchards } from '../hooks/useOrchards'
import { useRoles } from '../hooks/useRoles'

export default function YhvhOrchardsPage() {
  const { user } = useAuth()
  const { deleteOrchard } = useOrchards()
  const { isAdminOrGosat, userRoles } = useRoles()
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
      setOrchards(data || [])
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
      <div className="min-h-screen bg-gradient-to-br from-s2g-green/20 via-background to-s2g-green/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-success"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url(/364yhvh-orchards-1.jpg)' }}
      />
      
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
                Fully processed projects ready for community support and bestowals.
              </p>
              <p className="text-sm mt-1" style={{ color: '#663399' }}>
                Each orchard represents a completed project ready for community funding.
              </p>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <Badge variant="outline" className="px-4 py-2 text-sm">
              {orchards.length} Active Orchards
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Community Funded
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Growing Together
            </Badge>
          </div>
        </div>

        {/* Gosat Management Info */}
        {isAdminOrGosat && (
          <div className="mb-8 p-6 bg-white/90 rounded-2xl border border-white/50 shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <Settings className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-800">Gosat's Management Zone</h3>
            </div>
            <p className="text-blue-700 text-sm mb-2">
              <strong>Community Orchards:</strong> These are fully processed projects ready for community support. 
              You can edit pocket prices, amounts, and manage orchard settings.
            </p>
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> Seeds from Free-Will Gifting are managed on the Gosat's Dashboard where you can convert them into orchards.
            </p>
          </div>
        )}

        {/* Community Orchards Section */}
        {orchards.length > 0 ? (
          <div className="mb-12">
            <div className="p-6 bg-white/90 rounded-2xl border border-white/50 shadow-lg backdrop-blur-sm mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <TreePine className="h-6 w-6 text-success" />
                <h2 className="text-2xl font-bold text-foreground">Community Orchards</h2>
                <TreePine className="h-6 w-6 text-success" />
              </div>
              <p className="text-center text-muted-foreground text-sm">
                Fully processed projects ready for community support • Click to bestow into any orchard
              </p>
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
                         <span>{orchard.filled_pockets}/{(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets} pockets</span>
                       </div>
                       <div className="w-full bg-secondary rounded-full h-2">
                         <div 
                           className="bg-success h-2 rounded-full transition-all duration-300" 
                           style={{ width: `${(orchard.filled_pockets / ((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1)) * 100}%` }}
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
                    {user && (orchard.user_id === user.id || isAdminOrGosat) && (
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
        ) : (
          <div className="text-center py-16">
            <TreePine className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No orchards available yet</h3>
            <p className="text-muted-foreground">Gosats will convert seeds into orchards that will appear here for community support.</p>
          </div>
        )}
      </div>
    </div>
  )
}