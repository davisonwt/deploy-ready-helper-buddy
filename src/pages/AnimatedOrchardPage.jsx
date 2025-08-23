import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useBasket } from "../hooks/useBasket"
import { useCurrency } from "../hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { loadOrchard, clearOrchardCache } from "../utils/orchardLoader"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { AnimatedOrchardGrid } from "../components/AnimatedOrchardGrid"
import { OrchardHeader } from "../components/OrchardHeader"
import { OrchardInfo } from "../components/OrchardInfo"
import { OrchardImages } from "../components/OrchardImages"
import { OrchardActions } from "../components/OrchardActions"
import { VideoPlayer } from "@/components/ui/VideoPlayer"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function AnimatedOrchardPage({ orchard: propOrchard }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToBasket } = useBasket()
  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  
  // State management
  const [orchard, setOrchard] = useState(propOrchard || null)
  const [loading, setLoading] = useState(!propOrchard)
  const [selectedPockets, setSelectedPockets] = useState([])
  const [takenPockets, setTakenPockets] = useState([])
  const [processing, setProcessing] = useState(false)

  // Initialize orchard data
  useEffect(() => {
    if (propOrchard) {
      setOrchard(propOrchard)
      setLoading(false)
      return
    }
    
    const fetchOrchard = async (forceRefresh = false) => {
      try {
        setLoading(true)
        
        // Clear cache if forcing refresh
        if (forceRefresh) {
          clearOrchardCache(id)
        }
        
        const orchardData = await loadOrchard(id)
        
        if (orchardData && !orchardData._isFallback) {
          setOrchard(orchardData)
          
          // Load taken pockets from bestowals
          const completedBestowals = orchardData.bestowals?.filter(b => b.status === 'completed') || []
          const takenPocketsData = completedBestowals.flatMap(bestowal => 
            (bestowal.pocket_numbers || []).map(pocketNum => ({
              number: pocketNum,
              daysGrowing: Math.floor((Date.now() - new Date(bestowal.created_at).getTime()) / (1000 * 60 * 60 * 24)),
              stage: getDaysGrowingStage(Math.floor((Date.now() - new Date(bestowal.created_at).getTime()) / (1000 * 60 * 60 * 24))),
              bestower: `${orchardData.user_profile?.first_name || 'Anonymous'} ${(orchardData.user_profile?.last_name || 'User')[0]}.`
            }))
          )
          setTakenPockets(takenPocketsData)
        } else {
          throw new Error('Failed to load orchard data')
        }
      } catch (error) {
        console.error("Failed to load orchard:", error)
        toast({
          title: "Error",
          description: "Failed to load orchard data.",
          variant: "destructive"
        })
        navigate('/browse-orchards')
      } finally {
        setLoading(false)
      }
    }
    
    fetchOrchard()
    
    // Listen for storage events to refresh when data is updated elsewhere
    const handleStorageChange = (e) => {
      if (e.key === `orchard_updated_${id}`) {
        console.log('🔄 Orchard updated, refreshing data...')
        fetchOrchard(true)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [id, propOrchard, toast, navigate])
  
  // Helper function for growth stages
  const getDaysGrowingStage = (days) => {
    if (days <= 7) return "sprout"
    if (days <= 21) return "young"
    if (days <= 42) return "growing"
    return "mature"
  }

  // Handle pocket selection
  const handlePocketClick = (pocketNumber) => {
    if (selectedPockets.includes(pocketNumber)) {
      setSelectedPockets(selectedPockets.filter(p => p !== pocketNumber))
    } else {
      setSelectedPockets([...selectedPockets, pocketNumber])
    }
  }
  
  const handleSelectAllAvailable = () => {
    const availablePockets = []
    const actualTotalPockets = (orchard.intended_pockets && orchard.intended_pockets > 1) 
      ? orchard.intended_pockets 
      : orchard.total_pockets || 1
    for (let i = 1; i <= actualTotalPockets; i++) {
      const isTaken = takenPockets.some(p => p.number === i)
      if (!isTaken) {
        availablePockets.push(i)
      }
    }
    setSelectedPockets(availablePockets)
  }

  // Handle adding to basket
  const handleBestow = () => {
    console.log('🌱 handleBestow called', { selectedPockets, user })
    if (selectedPockets.length === 0 || !user) {
      toast({
        title: "Error",
        description: !user ? "Please log in to make a bestowal." : "Please select pockets first.",
        variant: "destructive"
      })
      return
    }
    
    // Add item to basket
    const basketItem = {
      orchardId: id,
      orchardTitle: orchard.title,
      pockets: selectedPockets,
      amount: orchard.pocket_price,
      currency: orchard.currency || 'USD'
    }
    
    console.log('🛒 Adding basketItem:', basketItem)
    addToBasket(basketItem)
    
    // Reset selection
    setSelectedPockets([])
    
    toast({
      title: "Added to Basket! 🛒",
      description: `${selectedPockets.length} pockets added to your basket. Go to basket to complete your bestowal.`,
    })
    
    // Navigate to basket page
    console.log('🧭 Navigating to basket...')
    navigate('/basket')
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-800 mb-2">Loading Orchard</h2>
          <p className="text-green-600">Preparing your orchard experience...</p>
        </div>
      </div>
    )
  }

  // Safety check
  if (!orchard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Orchard not found</p>
          <button 
            onClick={() => navigate('/browse-orchards')}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Back to Browse Orchards
          </button>
        </div>
      </div>
    )
  }

  // Debug the orchard data being used
  console.log('🌱 AnimatedOrchardPage Debug:', {
    id,
    title: orchard.title,
    total_pockets: orchard.total_pockets,
    intended_pockets: orchard.intended_pockets,
    filled_pockets: orchard.filled_pockets,
    actualTotalPockets: (orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-amber-50 to-green-100">
      <OrchardHeader 
        orchard={orchard}
        selectedPockets={selectedPockets}
        takenPockets={takenPockets}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Orchard Info */}
          <OrchardInfo orchard={orchard} />
          
          {/* Orchard Video */}
          {orchard.video_url && (
            <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl text-green-800 text-center">
                  📹 Orchard Video
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="max-w-4xl mx-auto">
                  <VideoPlayer
                    src={orchard.video_url}
                    className="w-full h-auto rounded-lg shadow-lg"
                    playsInline
                    fallbackImage="/placeholder.svg"
                  />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Product Images */}
          <OrchardImages orchard={orchard} />
          
          {/* Orchard Grid */}
          <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-green-800 text-center">
                🌱 Orchard Growth Visualization
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <AnimatedOrchardGrid 
                totalPockets={(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 1}
                pocketPrice={orchard.pocket_price || 150}
                selectedPockets={selectedPockets}
                onPocketClick={handlePocketClick}
                takenPockets={takenPockets}
                pocketsPerRow={10}
                showNumbers={true}
                interactive={true}
              />
              
              <OrchardActions
                selectedPockets={selectedPockets}
                orchard={orchard}
                onBestow={handleBestow}
                onSelectAll={handleSelectAllAvailable}
                onClearSelection={() => setSelectedPockets([])}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}