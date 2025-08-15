import React, { useState, useEffect, useMemo } from "react"
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
import { useOrchards } from "../hooks/useOrchards"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

export default function BrowseOrchardsPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const { deleteOrchard } = useOrchards()
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
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
    return orchards.map(orchard => ({
      ...orchard,
      completion_percentage: orchard.total_pockets 
        ? Math.round((orchard.filled_pockets / orchard.total_pockets) * 100)
        : 0,
      raised_amount: (orchard.filled_pockets || 0) * (orchard.pocket_price || 0),
      goal_amount: (orchard.total_pockets || 0) * (orchard.pocket_price || 0),
      grower_name: orchard.profiles?.display_name || 
                   `${orchard.profiles?.first_name || ''} ${orchard.profiles?.last_name || ''}`.trim() || 
                   'Anonymous Grower',
      main_image: orchard.images?.[0] || null
    }))
  }, [orchards])

  // Filtered and sorted orchards
  const filteredOrchards = useMemo(() => {
    let results = processedOrchards

    // Filter by search term
    if (searchTerm) {
      results = results.filter(orchard =>
        orchard.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orchard.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orchard.grower_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        orchard.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

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
  }, [processedOrchards, searchTerm, selectedCategory, sortBy])

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
    "The Gift of Tithing",
    "The Gift of Tools",
    "The Gift of Vehicles",
    "The Gift of Wellness"
  ]

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed pb-24" 
      style={{ 
        backgroundImage: 'url(https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-images/community%20orchards%201.jpg)',
        backgroundColor: '#f8fafc'
      }}
    >
      {/* Welcome Section with Profile Picture */}
      <div className="max-w-4xl mx-auto p-4 rounded-2xl border shadow-lg mb-8 bg-white/90 backdrop-blur-sm" style={{ backgroundColor: 'rgba(200, 182, 166, 0.9)' }}>
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-nav-community shadow-lg">
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
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
                textShadow: '2px 2px 4px hsl(137, 80%, 45%)',
                backgroundColor: '#C8B6A6'
              }}>
                Community Orchards
              </h1>
              <p className="text-lg" style={{ color: '#0b6623' }}>
                Discover and support orchards in our community
              </p>
              <p className="text-sm mt-1" style={{ color: '#0b6623' }}>
                Preferred Currency: {user?.preferred_currency || 'USD'}
              </p>
            </div>
          </div>
        </div>

      <div className="container mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-nav-community/30 rounded-full flex items-center justify-center shadow-lg">
              <Sprout className="h-8 w-8 text-green-700 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-nav-community mb-4">
            Browse Community Orchards
          </h2>
          <p className="text-lg text-green-600 max-w-2xl mx-auto mb-6">
            Every bestowal helps dreams grow! 🌱
          </p>
          <div className="flex justify-center">
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

        {/* Filters */}
        <Card className="bg-white/90 backdrop-blur-sm border-nav-community/30 shadow-lg mb-8 hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-green-700 mb-2">Search Orchards</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  <Input
                    placeholder="Search orchards, growers, descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-nav-community/30 focus:border-nav-community"
                  />
                </div>
              </div>
              
              <div className="min-w-[150px]">
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
              
              <div className="min-w-[120px]">
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
                {searchTerm || selectedCategory !== "all" ? "No orchards found" : "No orchards available"}
              </h3>
              <p className="text-green-600 mb-6">
                {searchTerm || selectedCategory !== "all" 
                  ? "Try adjusting your search or filters"
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
        ) : (
          <div className={`grid gap-6 pb-16 ${
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "grid-cols-1 max-w-4xl mx-auto"
          }`}>
            {filteredOrchards.map((orchard) => (
              <Card key={orchard.id} className="bg-white/90 backdrop-blur-sm border-nav-community/30 hover:shadow-xl transition-all group">
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
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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
                
                <CardContent>
                  <div className="space-y-4">
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
                    
                    <div className="flex items-center justify-between text-sm text-green-500">
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        {orchard.views || 0} views
                      </span>
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {orchard.supporters || 0} supporters
                      </span>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
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
                      <div className="flex gap-2 pt-2 border-t border-nav-community/20 mt-4">
                        <Link to={`/edit-orchard/${orchard.id}`} className="flex-1">
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
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
  )
}