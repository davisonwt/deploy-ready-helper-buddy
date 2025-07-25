import React, { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Input } from "../components/ui/input"
import { 
  Search, Heart, Eye, MapPin, TrendingUp, 
  Calendar, Users, Filter, Grid, List,
  RefreshCw, Loader2, Sprout, User
} from "lucide-react"
import { useCurrency } from "../hooks/useCurrency"

export default function BrowseOrchardsPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const [orchards, setOrchards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState("grid")

  // Safely fetch orchards without using the problematic hook
  const fetchOrchards = async () => {
    try {
      setLoading(true)
      setError(null)
      // For now, show mock data to prevent errors
      setOrchards([])
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

  // Transform orchards data with safe defaults
  const processedOrchards = useMemo(() => {
    return orchards.map(orchard => ({
      ...orchard,
      title: orchard.title || "Untitled Orchard",
      category: orchard.category || "General",
      grower: orchard.profiles?.display_name || 
              `${orchard.profiles?.first_name || ''} ${orchard.profiles?.last_name || ''}`.trim() ||
              'Anonymous',
      location: orchard.location || orchard.profiles?.location || 'Unknown Location',
      progress: orchard.completion_rate || 0
    }))
  }, [orchards])

  // Filter and sort orchards
  const filteredOrchards = useMemo(() => {
    let results = [...processedOrchards]
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      results = results.filter(o => 
        o.title.toLowerCase().includes(term) || 
        o.description?.toLowerCase().includes(term) ||
        o.grower?.toLowerCase().includes(term)
      )
    }
    
    if (selectedCategory !== "all") {
      results = results.filter(o => o.category === selectedCategory)
    }
    
    // Sort orchards
    results.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at)
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at)
        case "progress":
          return b.progress - a.progress
        case "amount":
          return (b.seed_value || 0) - (a.seed_value || 0)
        default:
          return 0
      }
    })
    
    return results
  }, [processedOrchards, searchTerm, selectedCategory, sortBy])

  const categories = [
    "The Gift of Technology",
    "The Gift of Vehicles", 
    "The Gift of Property",
    "The Gift of Energy",
    "The Gift of Wellness",
    "The Gift of Tools",
    "The Gift of Services",
    "The Gift of Innovation",
    "The Gift of Electronics",
    "The Gift of Appliances"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-nav-community/20 via-background to-nav-community/10">
      {/* Welcome Section with Profile Picture */}
      <div className="bg-nav-community/20 backdrop-blur-sm p-8 rounded-2xl border border-nav-community/30 shadow-lg mb-8">
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
            <h1 className="text-3xl font-bold text-green-700">
              Community Orchards, {user?.first_name || 'Friend'}!
            </h1>
            <p className="text-green-600 text-lg">
              Discover and support orchards in our community
            </p>
            <p className="text-green-500 text-sm mt-1">
              Preferred Currency: {user?.preferred_currency || 'USD'}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-nav-community/30 rounded-full flex items-center justify-center shadow-lg">
              <Sprout className="h-8 w-8 text-green-700 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-700 mb-4">
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
        <Card className="bg-nav-community/10 backdrop-blur-sm border-nav-community/30 shadow-lg mb-8 hover:shadow-xl transition-all">
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
                  <SelectTrigger className="border-nav-community/30 focus:border-nav-community">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
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
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-green-700">Loading orchards...</span>
          </div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline" className="border-red-300 text-red-600">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : filteredOrchards.length === 0 ? (
          <Card className="bg-nav-community/10 backdrop-blur-sm border-nav-community/30">
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
          <div className="text-center py-8">
            <p className="text-green-600">Orchards will appear here once the data loading is fixed.</p>
            <Link to="/create-orchard">
              <Button className="mt-4 bg-nav-community hover:bg-nav-community/90 text-green-700">
                <Sprout className="h-4 w-4 mr-2" />
                Create Your First Orchard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}