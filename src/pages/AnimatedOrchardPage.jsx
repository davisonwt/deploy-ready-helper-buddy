import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useCurrency } from "../hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { loadOrchard } from "../utils/orchardLoader"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { AnimatedOrchardGrid } from "../components/AnimatedOrchardGrid"
import { OrchardHeader } from "../components/OrchardHeader"
import { OrchardInfo } from "../components/OrchardInfo"
import { OrchardImages } from "../components/OrchardImages"
import { OrchardActions } from "../components/OrchardActions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function AnimatedOrchardPage({ orchard: propOrchard }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
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
    
    const fetchOrchard = async () => {
      try {
        setLoading(true)
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
    for (let i = 1; i <= orchard.total_pockets; i++) {
      const isTaken = takenPockets.some(p => p.number === i)
      if (!isTaken) {
        availablePockets.push(i)
      }
    }
    setSelectedPockets(availablePockets)
  }

  // Handle bestowal
  const handleBestow = async () => {
    if (selectedPockets.length === 0 || !user) {
      toast({
        title: "Error",
        description: !user ? "Please log in to make a bestowal." : "Please select pockets first.",
        variant: "destructive"
      })
      return
    }
    
    setProcessing(true)
    try {
      // Create bestowal record
      const { data: bestowal, error } = await supabase
        .from('bestowals')
        .insert({
          orchard_id: id,
          bestower_id: user.id,
          amount: selectedPockets.length * orchard.pocket_price,
          pockets_count: selectedPockets.length,
          pocket_numbers: selectedPockets,
          payment_status: 'completed' // In production, this would be 'pending'
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Add selected pockets to taken pockets
      const newTakenPockets = selectedPockets.map(pocketNumber => ({
        number: pocketNumber,
        daysGrowing: 0,
        stage: "sprout",
        bestower: `${user?.user_metadata?.first_name || 'Anonymous'} ${(user?.user_metadata?.last_name || 'User')[0]}.`
      }))
      
      setTakenPockets([...takenPockets, ...newTakenPockets])
      
      // Update orchard stats
      const updatedOrchard = {
        ...orchard,
        filled_pockets: (orchard.filled_pockets || 0) + selectedPockets.length,
        completion_rate: (((orchard.filled_pockets || 0) + selectedPockets.length) / (orchard.total_pockets || 1)) * 100,
        supporters: (orchard.supporters || 0) + 1
      }
      setOrchard(updatedOrchard)
      
      // Reset selection
      setSelectedPockets([])
      
      toast({
        title: "Success! 🌱",
        description: `Thank you for supporting ${orchard.title} with ${selectedPockets.length} pockets!`,
      })
      
    } catch (error) {
      console.error("Error processing bestowal:", error)
      toast({
        title: "Error",
        description: "Failed to process bestowal. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
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
              {/* Growth Stages Row */}
              <div className="flex gap-2 mb-6">
                <div className="bg-emerald-50 p-4 rounded-xl flex-1 text-center">
                  <div className="text-2xl font-bold text-emerald-800">{takenPockets.filter(p => p.stage === 'sprout').length}</div>
                  <div className="text-sm text-emerald-600">Sprout 🌱</div>
                </div>
                <div className="bg-lime-50 p-4 rounded-xl flex-1 text-center">
                  <div className="text-2xl font-bold text-lime-800">{takenPockets.filter(p => p.stage === 'young').length}</div>
                  <div className="text-sm text-lime-600">Young 🌿</div>
                </div>
                <div className="bg-teal-50 p-4 rounded-xl flex-1 text-center">
                  <div className="text-2xl font-bold text-teal-800">{takenPockets.filter(p => p.stage === 'growing').length}</div>
                  <div className="text-sm text-teal-600">Growing 🌳</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl flex-1 text-center">
                  <div className="text-2xl font-bold text-green-800">{takenPockets.filter(p => p.stage === 'mature').length}</div>
                  <div className="text-sm text-green-600">Mature 🌲</div>
                </div>
              </div>

              <AnimatedOrchardGrid
                totalPockets={orchard.total_pockets || 195}
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