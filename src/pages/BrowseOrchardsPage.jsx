import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Input } from "../components/ui/input"
import { Progress } from "../components/ui/progress"
import { 
  Search, Heart, Eye, MapPin, TrendingUp, 
  Calendar, Users, Filter, Grid, List,
  RefreshCw, Loader2, Sprout, User, TreePine,
  Edit, Trash2
} from "lucide-react"
import { useCurrency } from "../hooks/useCurrency"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { processOrchardsUrls } from "../utils/urlUtils"


export default function BrowseOrchardsPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
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
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState("grid")

  // Fetch orchards from Supabase
  const fetchOrchards = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('orchards')
        .select(`
          *,
          profiles:profile_id (
            first_name,
            last_name,
            display_name,
            location
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orchards:', error)
        setError('Failed to load orchards')
        return
      }

      setOrchards(data || [])
    } catch (err) {
      setError('Failed to load orchards')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrchards()
  }, [])

  const handleRefresh = () => {
    fetchOrchards()
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

  // Transform orchards data with safe defaults
  const processedOrchards = useMemo(() => {
    // First process URLs for all orchards
    const orchardsWithUrls = processOrchardsUrls(orchards);
    
    return orchardsWithUrls.map(orchard => ({
      ...orchard,
      completion_percentage: (orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets 
        ? Math.round((orchard.filled_pockets / ((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets)) * 100)
        : 0,
      raised_amount: (orchard.filled_pockets || 0) * (orchard.pocket_price || 0),
      goal_amount: ((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) * (orchard.pocket_price || 0),
      grower_name: orchard.profiles?.display_name || 
                   `${orchard.profiles?.first_name || ''} ${orchard.profiles?.last_name || ''}`.trim() || 
                   'Anonymous Sower',
      main_image: orchard.images?.[0] || null // Already processed by processOrchardsUrls
    }))
  }, [orchards])

  // Filtered and sorted orchards
  const filteredOrchards = useMemo(() => {
    let results = processedOrchards

    // Filter by category
    if (selectedCategory !== "all") {
      results = results.filter(orchard => orchard.category === selectedCategory)
    }

    // Sort results
    results.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'progress':
          return (b.completion_percentage || 0) - (a.completion_percentage || 0)
        case 'amount':
          return (b.goal_amount || 0) - (a.goal_amount || 0)
        default:
          return 0
      }
    })
    
    return results
  }, [processedOrchards, selectedCategory, sortBy])

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

  return (
    <div className="min-h-screen relative pb-24" style={{ backgroundColor: '#001f3f' }}>
      {/* Overlay for better text readability */}
      <div className="fixed top-0 left-0 w-full h-full bg-black/30 z-10"></div>
      
      <div className="relative z-20">
      {/* Welcome Section with Profile Picture */}
      <div className="max-w-4xl mx-auto p-8 rounded-2xl border shadow-2xl mb-8 mt-4 bg-white/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-community shadow-lg">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-nav-community to-nav-community/80 flex items-center justify-center">
                    <User className="h-10 w-10 text-green-700" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold px-8 py-4 rounded-lg" style={{ 
                  color: 'hsl(137, 80%, 65%)', 
                  textShadow: '2px 2px 4px hsl(137, 80%, 45%)'
                }}>
                  Community Orchards
                </h1>
                <p className="text-lg" style={{ color: '#0b6623' }}>
                  Every bestowal helps dreams grow! 🌱
                </p>
                <p className="text-sm mt-1" style={{ color: '#0b6623' }}>
                  Payment Method: USDC (USD Coin)
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
              className="border-nav-community text-green-700 hover:bg-nav-community/10"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Orchards
            </Button>
          </div>
        </div>

      <div className="container mx-auto px-4 py-8 pb-32">
        {/* Filters */}
        <div className="flex justify-center mb-8">
          <Card className="bg-white/90 backdrop-blur-sm border-nav-community/30 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end justify-center">
                <div className="w-full sm:min-w-[150px]">
                <label className="block text-sm font-medium text-green-700 mb-2">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="border-nav-community/30 focus:border-nav-community bg-white">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-nav-community/30 z-50">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
                <div className="w-full sm:min-w-[120px]">
                <label className="block text-sm font-medium text-green-700 mb-2">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="border-nav-community/30 focus:border-nav-community">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="progress">Most Progress</SelectItem>
                    <SelectItem value="amount">Highest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "bg-nav-community text-green-700" : "border-nav-community/30 text-green-700"}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "bg-nav-community text-green-700" : "border-nav-community/30 text-green-700"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center items-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl mx-auto max-w-md">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-green-700">Loading orchards...</span>
          </div>
        ) : error ? (
          <Card className="bg-red-50/90 backdrop-blur-sm border-red-200">
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="border-red-300 text-red-600">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredOrchards.length === 0 ? (
          <Card className="bg-white/90 backdrop-blur-sm border-nav-community/30">
            <CardContent className="p-12 text-center">
              <Sprout className="h-16 w-16 mx-auto text-green-400 mb-4" />
              <h3 className="text-xl font-semibold text-green-700 mb-2">
                {selectedCategory !== "all" ? "No orchards found" : "No orchards available"}
              </h3>
              <p className="text-green-600 mb-6">
                {selectedCategory !== "all" 
                  ? "Try adjusting your category filter"
                  : "Be the first to plant a seed in our community!"
                }
              </p>
              <Link to="/create-orchard">
                <Button className="bg-nav-community hover:bg-nav-community/90 text-green-700">
                  <Sprout className="h-4 w-4 mr-2" />
                  Plant First Seed
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full pb-16"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {filteredOrchards.map((orchard) => (
                <CarouselItem key={orchard.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                  <Card className="bg-white/90 backdrop-blur-sm border-nav-community/30 hover:shadow-xl transition-all group flex flex-col h-full">
                    <div className="relative">
                      {orchard.main_image ? (
                        <img 
                          src={orchard.main_image} 
                          alt={orchard.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-nav-community/30 to-nav-community/50 rounded-t-lg flex items-center justify-center">
                          <TreePine className="h-12 w-12 text-green-600" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-nav-community/90 text-green-700 border-0">
                          {orchard.category}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg text-green-700 mb-2 line-clamp-2">
                            {orchard.title}
                          </CardTitle>
                          <div className="flex items-center space-x-4 text-sm text-green-600">
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {orchard.grower_name}
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
                        <p className="text-green-600 text-sm line-clamp-3">
                          {orchard.description}
                        </p>
                        
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-green-600">Progress</span>
                            <span className="text-sm font-medium text-green-700">
                              {orchard.completion_percentage}%
                            </span>
                          </div>
                          <Progress 
                            value={orchard.completion_percentage} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-green-600">Raised:</span>
                            <p className="font-medium text-green-700">
                              {formatAmount(orchard.raised_amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-green-600">Goal:</span>
                            <p className="font-medium text-green-700">
                              {formatAmount(orchard.goal_amount)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-green-500 mb-2">
                          <span className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {orchard.views || 0} views
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {orchard.supporters || 0} supporters
                          </span>
                        </div>
                        
                        <div className="flex gap-2 pt-2 mt-auto">
                          <Link to={`/animated-orchard/${orchard.id}`} className="flex-1">
                            <Button 
                              className="w-full text-white shadow-lg font-medium"
                              style={{ 
                                background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #8b5cf6 100%)',
                                border: '2px solid #1e40af'
                              }}
                            >
                              <Heart className="h-4 w-4 mr-2" />
                              Bestow into this Orchard
                            </Button>
                          </Link>
                        </div>
                        
                        {/* Owner Actions */}
                        {user && orchard.user_id === user.id && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-nav-community/20 mt-2">
                              <Link to={`/edit-orchard/${orchard.id}`} className="flex-1 min-w-full sm:min-w-[100px]">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full border-nav-community/30 text-green-700 hover:bg-nav-community/10"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                              <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteOrchard(orchard.id)}
                                className="border-destructive/30 text-destructive hover:bg-destructive/10 flex-1 min-w-full sm:min-w-[100px]"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-background/90 hover:bg-background border border-primary shadow-md" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-background/90 hover:bg-background border border-primary shadow-md" />
          </Carousel>
        ) : (
          <div className="grid gap-6 md:gap-8 pb-16 grid-cols-1 max-w-4xl mx-auto">
            {filteredOrchards.map((orchard) => (
              <Card key={orchard.id} className="bg-white/90 backdrop-blur-sm border-nav-community/30 hover:shadow-xl transition-all group flex flex-col">
                <div className="relative">
                  {orchard.main_image ? (
                    <img 
                      src={orchard.main_image} 
                      alt={orchard.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-nav-community/30 to-nav-community/50 rounded-t-lg flex items-center justify-center">
                      <TreePine className="h-12 w-12 text-green-600" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-nav-community/90 text-green-700 border-0">
                      {orchard.category}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg text-green-700 mb-2 line-clamp-2">
                        {orchard.title}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-green-600">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {orchard.grower_name}
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
                    <p className="text-green-600 text-sm line-clamp-3">
                      {orchard.description}
                    </p>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-green-600">Progress</span>
                        <span className="text-sm font-medium text-green-700">
                          {orchard.completion_percentage}%
                        </span>
                      </div>
                      <Progress 
                        value={orchard.completion_percentage} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-600">Raised:</span>
                        <p className="font-medium text-green-700">
                          {formatAmount(orchard.raised_amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-green-600">Goal:</span>
                        <p className="font-medium text-green-700">
                          {formatAmount(orchard.goal_amount)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-green-500 mb-2">
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {orchard.views || 0} views
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {orchard.supporters || 0} supporters
                      </span>
                    </div>
                    
                    <div className="flex gap-2 pt-2 mt-auto">
                      <Link to={`/animated-orchard/${orchard.id}`} className="flex-1">
                        <Button 
                          className="w-full text-white shadow-lg font-medium"
                          style={{ 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 50%, #8b5cf6 100%)',
                            border: '2px solid #1e40af'
                          }}
                        >
                          <Heart className="h-4 w-4 mr-2" />
                          Bestow into this Orchard
                        </Button>
                      </Link>
                    </div>
                    
                    {/* Owner Actions */}
                    {user && orchard.user_id === user.id && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-nav-community/20 mt-2">
                          <Link to={`/edit-orchard/${orchard.id}`} className="flex-1 min-w-full sm:min-w-[100px]">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full border-nav-community/30 text-green-700 hover:bg-nav-community/10"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </Link>
                          <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteOrchard(orchard.id)}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10 flex-1 min-w-full sm:min-w-[100px]"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}