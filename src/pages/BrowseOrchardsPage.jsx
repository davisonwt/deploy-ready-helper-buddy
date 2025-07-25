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
import { useOrchards } from "../hooks/useOrchards"

export default function BrowseOrchardsPage() {
  const { user } = useAuth()
  const { formatAmount } = useCurrency()
  const { orchards: rawOrchards, loading, error, fetchOrchards } = useOrchards()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [viewMode, setViewMode] = useState("grid")

  // Transform orchards data with safe defaults
  const orchards = useMemo(() => {
    return rawOrchards.map(orchard => ({
      ...orchard,
      title: orchard.title || "Untitled Orchard",
      category: orchard.category || "General",
      grower: orchard.profiles?.display_name || 
              `${orchard.profiles?.first_name || ''} ${orchard.profiles?.last_name || ''}`.trim() ||
              'Anonymous',
      location: orchard.location || orchard.profiles?.location || 'Unknown Location',
      progress: orchard.completion_rate || 0
    }))
  }, [rawOrchards])

  // Filter and sort orchards
  const filteredOrchards = useMemo(() => {
    let results = [...orchards]
    
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

    switch (sortBy) {
      case "newest": 
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case "popular": 
        results.sort((a, b) => (b.views || 0) - (a.views || 0))
        break
      case "progress": 
        results.sort((a, b) => (b.completion_rate || 0) - (a.completion_rate || 0))
        break
      default:
        break
    }

    return results
  }, [orchards, searchTerm, selectedCategory, sortBy])

  // Load orchards on mount
  useEffect(() => {
    fetchOrchards({ category: selectedCategory, search: searchTerm })
  }, [])

  // Handle refresh
  const handleRefresh = async () => {
    await fetchOrchards({ category: selectedCategory, search: searchTerm })
  }

  // Categories for filter dropdown
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-s2g-green" />
                <Input
                  type="text"
                  placeholder="Search orchards..."
                  className="pl-10 border-s2g-green/30 focus:border-s2g-green focus:ring-s2g-green"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="border-s2g-green/30 focus:border-s2g-green focus:ring-s2g-green">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-white border-s2g-green/30 shadow-xl z-50">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="border-green-300 focus:border-green-500 focus:ring-green-500">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="bg-white border-green-200 shadow-xl z-50">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="progress">Best Progress</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orchards Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-green-700">Loading orchards...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredOrchards.length > 0 ? (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-6"
          }>
            {filteredOrchards.map((orchard) => (
              <OrchardCard 
                key={orchard.id} 
                orchard={orchard} 
                formatAmount={formatAmount}
                viewMode={viewMode}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center max-w-md mx-auto">
              <Sprout className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">No orchards found</h3>
              <p className="text-green-600 mb-4">
                {searchTerm || selectedCategory !== "all" 
                  ? "No orchards match your current filters" 
                  : "No orchards available at the moment"
                }
              </p>
              {(searchTerm || selectedCategory !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("")
                    setSelectedCategory("all")
                  }}
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OrchardCard({ orchard, formatAmount, viewMode }) {
  return (
    <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      {/* Image Section */}
      {orchard.images && orchard.images.length > 0 && (
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          <img
            src={orchard.images[0]}
            alt={orchard.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-white/90 text-green-800">
              {Math.round(orchard.completion_rate || 0)}% complete
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-green-800 line-clamp-2 mb-2">
              {orchard.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
              <MapPin className="h-3 w-3" />
              <span>{orchard.location}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs border-green-300 text-green-700">
            {orchard.category}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
            {new Date(orchard.created_at).toLocaleDateString()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {orchard.description || "No description provided"}
        </p>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-green-50 p-2 rounded-lg">
            <div className="text-lg font-bold text-green-800">{formatAmount(orchard.pocket_price || 150)}</div>
            <div className="text-xs text-green-600">per pocket</div>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg">
            <div className="text-lg font-bold text-blue-800">{orchard.total_pockets || 0}</div>
            <div className="text-xs text-blue-600">total pockets</div>
          </div>
          <div className="bg-purple-50 p-2 rounded-lg">
            <div className="text-lg font-bold text-purple-800">{orchard.filled_pockets || 0}</div>
            <div className="text-xs text-purple-600">growing</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(orchard.completion_rate || 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(orchard.completion_rate || 0, 100)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{orchard.views || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{orchard.supporters || 0}</span>
            </div>
          </div>
          
          <Link to={`/orchard/${orchard.id}`}>
            <Button 
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Heart className="h-3 w-3 mr-1" />
              Bestow
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}