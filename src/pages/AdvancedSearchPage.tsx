import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { AdvancedSearch } from "@/components/search/AdvancedSearch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, DollarSign, Eye, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { GradientPlaceholder } from "@/components/ui/GradientPlaceholder"

interface SearchFilters {
  query: string
  category: string
  location: string
  priceRange: [number, number]
  status: string
  sortBy: string
}

const AdvancedSearchPage = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category: "",
    location: "",
    priceRange: [0, 10000],
    status: "",
    sortBy: "recent"
  })
  const [hasSearched, setHasSearched] = useState(false)

  const { data: searchResults = [], isLoading, refetch } = useQuery({
    queryKey: ['advanced-search', filters],
    queryFn: async () => {
      let query = supabase
        .from('orchards')
        .select(`*`)
        .eq('status', 'active')

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,category.ilike.%${filters.query}%`)
      }
      
      if (filters.category) {
        query = query.ilike('category', `%${filters.category}%`)
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }
      
      if (filters.status === 'active') {
        query = query.lt('filled_pockets', 'total_pockets')
      } else if (filters.status === 'completed') {
        query = query.gte('filled_pockets', 'total_pockets')
      }

      // Price range filter
      if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) {
        query = query.gte('pocket_price', filters.priceRange[0]).lte('pocket_price', filters.priceRange[1])
      }

      // Sorting
      switch (filters.sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'popular':
          query = query.order('views', { ascending: false })
          break
        case 'funded':
          query = query.order('filled_pockets', { ascending: false })
          break
        case 'completion':
          query = query.order('completion_rate', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query.limit(20)
      
      if (error) throw error
      return data || []
    },
    enabled: hasSearched
  })

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters)
    setHasSearched(true)
    refetch()
  }

  const handleClear = () => {
    setFilters({
      query: "",
      category: "",
      location: "",
      priceRange: [0, 10000],
      status: "",
      sortBy: "recent"
    })
    setHasSearched(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Advanced Search</h1>
        <p className="text-xl text-muted-foreground">
          Find the perfect orchard projects to support
        </p>
      </div>

      <AdvancedSearch onSearch={handleSearch} onClear={handleClear} />

      {hasSearched && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Search Results ({searchResults.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search filters or browse all orchards
              </p>
              <Button asChild className="mt-4">
                <Link to="/browse">Browse All Orchards</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((orchard) => {
                const progress = (orchard.filled_pockets / (orchard.total_pockets || 1)) * 100
                const isCompleted = orchard.filled_pockets >= (orchard.total_pockets || 0)

                return (
                  <Card key={orchard.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {orchard.images && orchard.images.length > 0 ? (
                        <img
                          src={orchard.images[0]}
                          alt={orchard.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <GradientPlaceholder 
                          type="orchard" 
                          title={orchard.title}
                          className="w-full h-48"
                          size="lg"
                        />
                      )}
                      <div className="absolute top-4 right-4">
                        <Badge variant={isCompleted ? "default" : "secondary"}>
                          {isCompleted ? "Completed" : "Active"}
                        </Badge>
                      </div>
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 line-clamp-2">
                            {orchard.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Creator #{orchard.user_id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {orchard.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{orchard.filled_pockets}/{orchard.total_pockets || 0} pockets</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {orchard.category}
                        </Badge>
                        {orchard.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {orchard.location}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${orchard.pocket_price}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {orchard.views}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {orchard.supporters}
                          </div>
                        </div>
                        <Button asChild size="sm">
                          <Link to={`/orchard/${orchard.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-6xl mb-4">🔍</div>
          <p>Use the search filters above to find orchards that match your interests</p>
        </div>
      )}
    </div>
  )
}

export default AdvancedSearchPage