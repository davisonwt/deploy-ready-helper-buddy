import React, { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useBasket } from "../hooks/useBasket"
import { useCurrency } from "../hooks/useCurrency"
import { supabase } from "@/integrations/supabase/client"
import { loadOrchard } from "../utils/orchardLoader"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { AnimatedOrchardGrid } from "../components/AnimatedOrchardGrid"
import { useToast } from "@/hooks/use-toast"
import { 
  ArrowLeft, 
  Sprout, 
  Heart, 
  User, 
  MapPin, 
  Clock, 
  Star, 
  Sparkles,
  TrendingUp,
  Users,
  Eye,
  ShoppingCart,
  CheckCircle,
  Gift,
  CreditCard,
  Smartphone,
  Banknote,
  Calculator,
  Loader2,
  X
} from "lucide-react"

export default function AnimatedOrchardPage({ orchard: propOrchard, source }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToBasket } = useBasket()
  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  
  console.log("AnimatedOrchardPage loaded with:", { id, propOrchard: !!propOrchard, source })
  
  // State management
  const [orchard, setOrchard] = useState(propOrchard || null)
  const [loading, setLoading] = useState(!propOrchard)
  const [selectedPockets, setSelectedPockets] = useState([])
  const [takenPockets, setTakenPockets] = useState([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("")
  const [paymentConfig, setPaymentConfig] = useState(null)
  
  // 🔥 NUCLEAR UI LOCKDOWN GUARDS 🔥
  useEffect(() => {
    // Self-destruct if critical props missing
    if (!id || id === 'undefined' || id === 'null') {
      console.error("💥 FATAL ERROR: Missing orchard ID", { id });
      toast({
        title: "Error",
        description: "Invalid orchard ID. Redirecting to browse orchards.",
        variant: "destructive"
      })
      navigate('/browse-orchards');
      return;
    }

    console.log("🛡️ Orchard ID validated:", id);
    
    // Zombie process killer
    const interval = setInterval(() => {
      const orchardElement = document.querySelector(`[data-orchard-id="${id}"]`);
      if (!document.body.contains(orchardElement)) {
        console.log("🧟 Cleaning up zombie processes for orchard:", id);
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      console.log("🧹 Cleanup for orchard:", id);
      clearInterval(interval);
    };
  }, [id, navigate, toast])
  
  // Initialize orchard data with Supabase
  useEffect(() => {
    if (propOrchard) {
      console.log("✅ Using preloaded orchard data:", propOrchard.title);
      const safeOrchard = {
        ...propOrchard,
        features: propOrchard.features || [],
        images: propOrchard.image_url ? [propOrchard.image_url] : [],
        pockets: propOrchard.pockets || []
      };
      setOrchard(safeOrchard);
      setLoading(false);
      return;
    }
    
    // Fetch from Supabase
    const fetchOrchard = async () => {
      try {
        setLoading(true);
        const orchardData = await loadOrchard(id);
        
        if (orchardData && !orchardData._isFallback) {
          // Transform Supabase data to match expected format
          const transformedOrchard = {
            ...orchardData,
            grower: orchardData.profiles?.first_name || 'Unknown',
            grower_full_name: `${orchardData.profiles?.first_name || ''} ${orchardData.profiles?.last_name || ''}`.trim() || 'Unknown User',
            // Use the actual data from database instead of overriding
            seed_value: orchardData.seed_value,
            pocket_price: orchardData.pocket_price,
            total_pockets: orchardData.total_pockets,
            filled_pockets: orchardData.filled_pockets,
            completion_rate: orchardData.completion_rate,
            supporters: orchardData.supporters,
            views: orchardData.views,
            images: orchardData.images || [],
            features: orchardData.features || [],
            why_needed: orchardData.why_needed || orchardData.description,
            community_impact: orchardData.community_impact || orchardData.description,
            timeline: orchardData.expected_completion || 'As needed',
            verification_status: orchardData.verification_status || 'verified',
            location: orchardData.location || 'Unknown'
          };
          
          setOrchard(transformedOrchard);
          
          // Load taken pockets from bestowals
          const completedBestowals = orchardData.bestowals?.filter(b => b.status === 'completed') || [];
          const takenPocketsData = completedBestowals.flatMap((bestowal, index) => 
            (bestowal.pocket_numbers || []).map(pocketNum => ({
              number: pocketNum,
              daysGrowing: Math.floor((Date.now() - new Date(bestowal.created_at).getTime()) / (1000 * 60 * 60 * 24)),
              stage: getDaysGrowingStage(Math.floor((Date.now() - new Date(bestowal.created_at).getTime()) / (1000 * 60 * 60 * 24))),
              bestower: `${orchardData.user_profile?.first_name || 'Anonymous'} ${(orchardData.user_profile?.last_name || 'User')[0]}.`
            }))
          );
          setTakenPockets(takenPocketsData);
          
        } else {
          throw new Error('Failed to load orchard data');
        }
      } catch (error) {
        console.error("💥 Failed to load orchard:", error);
        toast({
          title: "Error",
          description: "Failed to load orchard data. Using fallback.",
          variant: "destructive"
        })
        
        // Use fallback data
        const safeMockOrchard = {
          ...mockOrchard,
          features: mockOrchard.features || [],
          images: mockOrchard.images || [],
          pockets: []
        };
        setOrchard(safeMockOrchard);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrchard();
  }, [id, propOrchard, toast]);
  
  // Helper function for growth stages
  const getDaysGrowingStage = (days) => {
    if (days <= 7) return "sprout"
    if (days <= 21) return "young"
    if (days <= 42) return "growing"
    return "mature"
  }

  // Cleanup effect to ensure navigation works
  useEffect(() => {
    let beforeUnloadHandler = null;
    
    // Only add beforeunload handler when actually processing payment
    if (processingPayment) {
      beforeUnloadHandler = (e) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);
    }
    
    return () => {
      if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    };
  }, [processingPayment]);

  // Escape key handler for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showPaymentForm) {
        resetAllStates();
      }
    };
    
    if (showPaymentForm) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showPaymentForm]);
  
  // Mock orchard data for fallback
  const mockOrchard = {
    id: "1",
    title: "2019 Toyota Corolla",
    description: "Reliable family car for daily transportation to work and supporting my family. This vehicle will help me maintain steady employment and provide for my children's education.",
    category: "The Gift of Vehicles",
    seed_value: 21708,
    original_seed_value: 18000,
    tithing_amount: 1800,
    payment_processing_fee: 1908,
    pocket_price: 150,
    total_pockets: 120,
    filled_pockets: 85,
    completion_rate: 70.8,
    location: "Cape Town, South Africa",
    grower: "Sarah M.",
    grower_full_name: "Sarah Miller",
    created_at: "2024-01-15T10:30:00Z",
    views: 234,
    supporters: 67,
    status: "active",
    images: [
      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4yMDE5IFRveW90YSBDb3JvbGxhPC90ZXh0Pjwvc3ZnPg=="
    ],
    features: ["Fuel efficient", "Reliable", "Low maintenance", "Family friendly"],
    why_needed: "I need reliable transportation to get to work and support my family.",
    community_impact: "Having reliable transportation will help me maintain steady employment and contribute to my community.",
    timeline: "Need by March 2024",
    verification_status: "verified"
  }
  
  // Load payment config from Supabase (if you have such a table)
  useEffect(() => {
    const loadPaymentConfig = async () => {
      try {
        // This would be a custom table for payment configurations
        // For now, using mock data
        setPaymentConfig({
          bank_details: {
            bank_name: "Standard Bank",
            account_name: "364yhvh Community Farm",
            account_number: "123456789",
            swift_code: "SBZAZAJJ"
          }
        })
      } catch (error) {
        console.error("Failed to load payment config:", error)
      }
    }
    
    loadPaymentConfig()
  }, [])
  
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
  
  // Reset all states function
  const resetAllStates = () => {
    console.log('🌱 Resetting all states...');
    setShowPaymentForm(false);
    setProcessingPayment(false);
    setSelectedPaymentMethod("");
    setSelectedPockets([]);
    
    // Force DOM cleanup
    setTimeout(() => {
      document.body.style.overflow = 'auto';
      const modalBackdrop = document.querySelector('.fixed.inset-0');
      if (modalBackdrop) {
        modalBackdrop.remove();
      }
      console.log('🌱 DOM cleanup completed');
    }, 50);
  };

  // Handle bestowal with Supabase
  const handleBestow = async () => {
    if (selectedPockets.length === 0) return
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a bestowal.",
        variant: "destructive"
      })
      return
    }
    
    setProcessingPayment(true)
    try {
      // Create bestowal record in Supabase
      const { data: bestowal, error } = await supabase
        .from('bestowals')
        .insert({
          orchard_id: id,
          user_id: user.id,
          amount: selectedPockets.length * orchard.pocket_price,
          pocket_numbers: selectedPockets,
          payment_method: selectedPaymentMethod,
          status: 'completed' // In production, this would be 'pending' until payment confirmed
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      // Update orchard current_amount
      const newCurrentAmount = (orchard.current_amount || 0) + (selectedPockets.length * orchard.pocket_price)
      const { error: updateError } = await supabase
        .from('orchards')
        .update({ current_amount: newCurrentAmount })
        .eq('id', id)
      
      if (updateError) {
        console.error('Failed to update orchard amount:', updateError)
      }
      
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
        supporters: (orchard.supporters || 0) + 1,
        current_amount: newCurrentAmount
      }
      setOrchard(updatedOrchard)
      
      // Reset states
      setSelectedPockets([])
      setShowPaymentForm(false)
      setProcessingPayment(false)
      setSelectedPaymentMethod("")
      
      toast({
        title: "Bestowal Successful! 🌱",
        description: `Thank you for supporting ${orchard.title} with ${selectedPockets.length} pockets!`,
      })
      
    } catch (error) {
      console.error("Error processing bestowal:", error)
      toast({
        title: "Bestowal Failed",
        description: error.message || "Failed to process bestowal. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingPayment(false)
    }
  }

  // 🚨 Emergency bestow handler for fallback
  const handleEmergencyBestow = async (amount) => {
    console.log("🚨 Emergency bestow activated:", { amount, currency: orchard?.currency, orchardId: id });
    
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to make a bestowal.",
          variant: "destructive"
        })
        return
      }

      const pocketsCount = Math.ceil(amount / (orchard.pocket_price || 150))
      
      const { data: bestowal, error } = await supabase
        .from('bestowals')
        .insert({
          orchard_id: id,
          user_id: user.id,
          amount: amount,
          pocket_numbers: Array.from({length: pocketsCount}, (_, i) => i + 1),
          payment_method: 'emergency',
          status: 'completed'
        })
        .select()
        .single()
      
      if (error) throw error
      
      toast({
        title: "Emergency Bestowal Successful! ✅",
        description: `Thank you for supporting this orchard with ${formatAmount(amount)}!`,
      })
      
      // Refresh to normal mode
      window.location.reload();
    } catch (error) {
      console.error("💥 Emergency bestow failed:", error);
      toast({
        title: "Bestowal Failed",
        description: error.message || "Failed to process emergency bestowal.",
        variant: "destructive"
      })
    }
  }
  
  // Safety check for orchard data
  if (!orchard || typeof orchard !== 'object') {
    console.log("⚠️ OrchardPage: Invalid orchard data, showing loading state");
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            Loading Orchard
          </h2>
          <p className="text-green-600">
            Preparing your orchard experience...
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }
  
  if (!orchard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          Orchard not found or failed to load
        </p>
        <p className="text-sm text-gray-500">
          Orchard ID: {id}
        </p>
        <Button 
          onClick={() => navigate('/browse-orchards')}
          className="mt-4"
        >
          Back to Browse Orchards
        </Button>
      </div>
    )
  }

  // 🚨 EMERGENCY MODE FALLBACK UI
  if (orchard.emergency_mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-amber-50 to-green-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-8 border-2 border-green-500">
            <div className="bestowal-emergency text-center">
              <h2 className="text-2xl font-bold text-green-800 mb-4">✨ Optimizing Your Experience ✨</h2>
              <p className="text-gray-600 mb-6">We're loading your orchard with enhanced stability...</p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-800 mb-4">Orchard: {orchard.title}</h3>
                <p className="text-green-700 mb-4">{orchard.description || 'No description available'}</p>
                <p className="text-sm text-green-600">Orchard ID: {id}</p>
              </div>

              <div id="manual-bestowal-container" className="bestowal-pockets" data-testid="orchard-pockets">
                <h4 className="text-lg font-semibold mb-4">Bestow Support - USD</h4>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button onClick={() => handleEmergencyBestow(150)} className="px-6 py-3">
                    $150
                  </Button>
                  <Button onClick={() => handleEmergencyBestow(300)} className="px-6 py-3">
                    $300
                  </Button>
                  <Button onClick={() => handleEmergencyBestow(500)} className="px-6 py-3">
                    $500
                  </Button>
                </div>
                
                <div className="mt-6">
                  <Button 
                    onClick={() => navigate('/browse-orchards')}
                    variant="outline"
                  >
                    Back to Browse Orchards
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-green-50 via-amber-50 to-green-100 relative overflow-hidden" 
      data-orchard-id={id}
      data-testid="animated-orchard-page"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-200/20 rounded-full animate-pulse" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-amber-200/20 rounded-full animate-bounce" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-green-300/10 rounded-full animate-pulse" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
      </div>
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50 animate-in slide-in-from-top-5 duration-500">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/browse-orchards" className="flex items-center space-x-3 group">
              <ArrowLeft className="h-5 w-5 text-green-600 group-hover:text-green-700 transition-all duration-200 group-hover:-translate-x-1" />
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                <Sprout className="h-7 w-7 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-800 transition-colors duration-200" style={{ fontFamily: "Playfair Display, serif" }}>
                  {orchard.title || 'Orchard'}
                </h1>
                <p className="text-xs text-green-600">{orchard.grower || 'Unknown'} • {orchard.location || 'Unknown Location'}</p>
              </div>
            </Link>
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className={`transition-all duration-300 ${selectedPockets.length > 0 ? "animate-pulse scale-105 shadow-lg bg-rose-100 text-rose-700" : "bg-green-100 text-green-700"}`}>
                {selectedPockets.length} pockets selected
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 animate-pulse">
                {takenPockets.length} growing
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Navigation Breadcrumb */}
          <div className="mb-6 animate-in slide-in-from-top-3 duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Link 
                  to="/browse-orchards" 
                  className="hover:text-green-600 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Community Orchards
                </Link>
                <span className="text-gray-400">•</span>
                <span className="text-green-800 font-medium">{orchard.title || 'Orchard'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => {
                    console.log('🧪 Testing navigation...');
                    console.log('States:', {
                      showPaymentForm,
                      processingPayment,
                      selectedPaymentMethod
                    });
                    navigate('/dashboard');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Test Nav
                </Button>
                <Link to="/my-orchards">
                  <Button variant="outline" size="sm">
                    My Orchards
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Orchard Info */}
          <section className="mb-8">
            <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl animate-in slide-in-from-bottom-5 duration-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl text-green-800 flex items-center gap-3 mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
                      🚗 {orchard.title || 'Orchard'}
                      <Sparkles className="h-6 w-6 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
                    </CardTitle>
                    <p className="text-green-600 mb-2">{orchard.grower_full_name || orchard.grower || 'Unknown'} • {orchard.location || 'Unknown Location'} • Live Growth Tracking</p>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className="bg-green-100 text-green-800">{orchard.category || 'General'}</Badge>
                      {orchard.verification_status === "verified" && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-800 animate-pulse">{formatAmount(orchard.pocket_price || 0)}</div>
                    <div className="text-sm text-green-600">per pocket</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center mb-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-300 hover:scale-105 shadow-lg">
                    <div className="text-3xl font-bold text-green-800 animate-pulse">{orchard.total_pockets || 0}</div>
                    <div className="text-sm text-green-600 font-semibold">Total Pockets</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl hover:from-amber-100 hover:to-amber-200 transition-all duration-300 hover:scale-105 shadow-lg">
                    <div className="text-3xl font-bold text-amber-800 animate-bounce">{orchard.filled_pockets || 0}</div>
                    <div className="text-sm text-amber-600 font-semibold">Growing</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 hover:scale-105 shadow-lg">
                    <div className="text-3xl font-bold text-blue-800">{(orchard.total_pockets || 0) - (orchard.filled_pockets || 0)}</div>
                    <div className="text-sm text-blue-600 font-semibold">Available</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-300 hover:scale-105 shadow-lg">
                    <div className="text-3xl font-bold text-purple-800 animate-pulse">{Math.round(orchard.completion_rate || 0)}%</div>
                    <div className="text-sm text-purple-600 font-semibold">Complete</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Why This is Needed</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{orchard.why_needed || orchard.description || 'No description available'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Community Impact</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{orchard.community_impact || orchard.description || 'No impact description available'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{orchard.views || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{orchard.supporters || 0} supporters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{orchard.timeline || 'No timeline specified'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(orchard.features || []).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          
          {/* Product Images Section */}
          {orchard.images && Array.isArray(orchard.images) && orchard.images.length > 0 && (
            <section className="mb-8">
              <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl animate-in slide-in-from-bottom-5 duration-700" style={{ animationDelay: "250ms" }}>
                <CardHeader>
                  <CardTitle className="text-xl text-green-800 text-center flex items-center justify-center gap-2" style={{ fontFamily: "Playfair Display, serif" }}>
                    📸 What You're Supporting
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(orchard.images || []).slice(0, 3).map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`${orchard.title} - Image ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200 shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg"></div>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          Image {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(orchard.images || []).length > 3 && (
                    <p className="text-center text-sm text-gray-600 mt-4">
                      +{(orchard.images || []).length - 3} more images
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
          
          {/* Orchard Grid */}
          <section className="mb-8">
            <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-2xl animate-in slide-in-from-bottom-5 duration-700" style={{ animationDelay: "300ms" }}>
              <CardHeader>
                <CardTitle className="text-2xl text-green-800 text-center flex items-center justify-center gap-3" style={{ fontFamily: "Playfair Display, serif" }}>
                  🌱 Live Orchard Growth Visualization
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-ping" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <AnimatedOrchardGrid 
                  totalPockets={orchard.total_pockets || 0}
                  pocketPrice={orchard.pocket_price || 150}
                  selectedPockets={selectedPockets}
                  onPocketClick={(pocketNumber) => {
                    console.log(`🌱 Pocket ${pocketNumber} clicked!`);
                    handlePocketClick(pocketNumber);
                  }}
                  takenPockets={takenPockets}
                  pocketsPerRow={10}
                  showNumbers={true}
                  interactive={true}
                />
                
                <div className="mt-8 text-center animate-in slide-in-from-bottom-3 duration-700" style={{ animationDelay: "1200ms" }}>
                  <p className="text-green-700 mb-6 text-lg">
                    Select a bestowal amount to support this orchard. Your contribution helps dreams grow! ✨
                  </p>
                  
                  {selectedPockets.length > 0 && (
                    <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-xl mb-6 animate-in slide-in-from-bottom-2 zoom-in-95 duration-300 border border-rose-200 shadow-lg">
                      <h4 className="font-semibold text-rose-800 mb-3 text-lg">Your Bestowal Selection ✨</h4>
                      <p className="text-rose-700 mb-2">
                        <strong>Selected Pockets:</strong> {selectedPockets.sort((a, b) => a - b).join(", ")}
                      </p>
                      <p className="text-rose-700 text-xl font-bold">
                        <strong>Total Amount:</strong> {formatAmount(selectedPockets.length * (orchard.pocket_price || 0))}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-6 justify-center flex-wrap">
                    <Button
                      onClick={() => setShowPaymentForm(true)}
                      disabled={selectedPockets.length === 0}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      <Sparkles className="h-6 w-6 mr-3" />
                      Make It Rain! ☔ ({selectedPockets.length} pockets)
                    </Button>
                    
                    <Button
                      onClick={handleSelectAllAvailable}
                      className="bg-gradient-to-r from-green-400 via-green-600 to-green-400 hover:from-green-300 hover:via-green-500 hover:to-green-300 text-white border-0 transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl px-6 py-4 text-lg"
                      style={{ borderRadius: "21px" }}
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Select All Available ({(orchard.total_pockets || 0) - (orchard.filled_pockets || 0)} pockets)
                    </Button>
                    
                    {selectedPockets.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedPockets([])}
                        className="border-green-600 text-green-600 hover:bg-green-50 transition-all duration-300 hover:scale-105 active:scale-95 animate-in slide-in-from-right-2 duration-300 shadow-lg hover:shadow-xl px-6 py-4 text-lg"
                        style={{ borderRadius: "21px" }}
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          
          {/* Grower Profile */}
          <section className="mb-8">
            <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl animate-in slide-in-from-bottom-5 duration-700" style={{ animationDelay: "400ms" }}>
              <CardContent className="p-8">
                <div className="flex items-center gap-6 hover:bg-green-50/50 p-6 rounded-xl transition-all duration-300 group">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-300 shadow-lg group-hover:shadow-xl">
                    <User className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">{orchard.grower_full_name}</h3>
                    <p className="text-green-600 mb-3">{orchard.location} • Community Member since 2022 • 🌟 Verified Grower</p>
                    <p className="text-gray-700 leading-relaxed">
                      "{orchard.description || 'Thank you for your support!'} Your kindness means the world to me. 🙏✨"
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="bg-green-100 px-4 py-2 rounded-full">
                      <span className="text-green-800 font-semibold">Active Farm Stall</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
      
      {/* Payment Modal */}
      {showPaymentForm && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetAllStates();
            }
          }}
        >
          <Card className="bg-white max-w-lg w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <CardHeader className="relative">
              <button
                onClick={resetAllStates}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <CardTitle className="text-center text-green-800 text-xl">
                Complete Your Bestowal
              </CardTitle>
              <p className="text-center text-gray-600 text-sm">
                Choose your payment method and complete your generous gift
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl">
                <div className="text-3xl font-bold text-green-800 mb-2">
                  {formatAmount(selectedPockets.length * (orchard.pocket_price || 0))}
                </div>
                <p className="text-gray-600">
                  {selectedPockets.length} pockets × {formatAmount(orchard.pocket_price || 0)} each
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Supporting: <strong>{orchard.title}</strong>
                </p>
              </div>
              
              {/* Payment Method Selection */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Select Payment Method:</div>
                
                {/* PayPal Option */}
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'paypal' 
                      ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100' 
                      : 'border-gray-200 hover:border-blue-300 bg-gray-50'
                  }`}
                  onClick={() => setSelectedPaymentMethod('paypal')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">PayPal</h3>
                        <p className="text-sm text-gray-600">Pay with your PayPal account</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPaymentMethod === 'paypal' 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'paypal' && (
                        <CheckCircle className="h-3 w-3 text-white m-0.5" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Credit/Debit Card Option */}
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'card' 
                      ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-100' 
                      : 'border-gray-200 hover:border-green-300 bg-gray-50'
                  }`}
                  onClick={() => setSelectedPaymentMethod('card')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">Credit/Debit Card</h3>
                        <p className="text-sm text-gray-600">Pay with Visa, MasterCard, etc.</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPaymentMethod === 'card' 
                        ? 'border-green-500 bg-green-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'card' && (
                        <CheckCircle className="h-3 w-3 text-white m-0.5" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* EFT Option */}
                <div 
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                    selectedPaymentMethod === 'eft' 
                      ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-violet-100' 
                      : 'border-gray-200 hover:border-purple-300 bg-gray-50'
                  }`}
                  onClick={() => setSelectedPaymentMethod('eft')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Banknote className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">EFT (Bank Transfer)</h3>
                        <p className="text-sm text-gray-600">Electronic Funds Transfer</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPaymentMethod === 'eft' 
                        ? 'border-purple-500 bg-purple-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'eft' && (
                        <CheckCircle className="h-3 w-3 text-white m-0.5" />
                      )}
                    </div>
                  </div>
                  
                  {/* Banking Details when EFT selected */}
                  {selectedPaymentMethod === 'eft' && paymentConfig?.bank_details && (
                    <div className="bg-white/80 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-semibold text-purple-800 mb-2">Banking Details:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bank:</span>
                          <span className="font-medium">{paymentConfig.bank_details.bank_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Name:</span>
                          <span className="font-medium">{paymentConfig.bank_details.account_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Account Number:</span>
                          <span className="font-medium">{paymentConfig.bank_details.account_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">SWIFT Code:</span>
                          <span className="font-medium">{paymentConfig.bank_details.swift_code}</span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-purple-50 rounded border border-purple-200">
                        <p className="text-xs text-purple-700">
                          <strong>Important:</strong> Use your bestowal reference as payment description for tracking.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t">
                {/* Primary Action Button */}
                <Button
                  onClick={handleBestow}
                  disabled={processingPayment || !selectedPaymentMethod}
                  className={`w-full py-3 shadow-lg transition-all duration-200 ${
                    selectedPaymentMethod === 'paypal' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800' 
                      : selectedPaymentMethod === 'card'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800'
                      : selectedPaymentMethod === 'eft'
                      ? 'bg-gradient-to-r from-purple-500 to-violet-700 hover:from-purple-600 hover:to-violet-800'
                      : 'bg-gray-400'
                  } text-white`}
                >
                  {processingPayment ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing Payment...
                    </div>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {selectedPaymentMethod === 'paypal' && 'Pay with PayPal'}
                      {selectedPaymentMethod === 'card' && 'Pay with Card'}
                      {selectedPaymentMethod === 'eft' && 'Pay with EFT'}
                      {!selectedPaymentMethod && 'Select Payment Method'}
                    </>
                  )}
                </Button>
                
                {/* Secondary Options */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => {
                      if (selectedPockets.length > 0) {
                        addToBasket({
                          orchardId: orchard.id,
                          orchardTitle: orchard.title,
                          pockets: selectedPockets.length,
                          amount: (orchard.pocket_price || 0) * selectedPockets.length
                        })
                        toast({
                          title: "Added to Basket",
                          description: `Added ${selectedPockets.length} pockets to basket!`,
                        })
                        setShowPaymentForm(false)
                      } else {
                        toast({
                          title: "No Selection",
                          description: "Please select at least one pocket first",
                          variant: "destructive"
                        })
                      }
                    }}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50 py-2"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Basket
                  </Button>
                  
                  <Button
                    onClick={() => {
                      toast({
                        title: "Coming Soon",
                        description: "Monthly giving feature will be available soon",
                      })
                      setShowPaymentForm(false)
                    }}
                    variant="outline"
                    className="border-purple-600 text-purple-600 hover:bg-purple-50 py-2"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Monthly Gift
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  onClick={resetAllStates}
                  className="w-full"
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}