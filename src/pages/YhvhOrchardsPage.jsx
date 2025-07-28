import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Seedling, 
  Eye,
  Calendar,
  User,
  Play,
  Image as ImageIcon,
  Video,
  TreePine
} from 'lucide-react'
import { toast } from 'sonner'

export default function YhvhOrchardsPage() {
  const [seeds, setSeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSeed, setSelectedSeed] = useState(null)

  useEffect(() => {
    fetchSeeds()
  }, [])

  const fetchSeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('seeds')
        .select(`
          *,
          profiles:gifter_id (
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

  const getCategoryColor = (category) => {
    const colors = {
      product: 'bg-blue-100 text-blue-800',
      service: 'bg-green-100 text-green-800',
      skill: 'bg-purple-100 text-purple-800',
      knowledge: 'bg-yellow-100 text-yellow-800',
      resource: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors.other
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
      <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-warning/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-success"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-warning/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-6 bg-success/20 rounded-full animate-pulse">
                <TreePine className="h-16 w-16 text-success" />
              </div>
              <div className="absolute -top-2 -right-2 animate-bounce">
                <Seedling className="h-8 w-8 text-warning" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">364yhvh Community Orchards</h1>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
            Welcome to our community seed garden where members share their gifts, talents, and offerings. 
            Each seed represents a blessing planted by a community member to help others grow.
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              {seeds.length} Seeds Planted
            </Badge>
            <Badge variant="outline" className="px-4 py-2 text-sm">
              Growing Together
            </Badge>
          </div>
        </div>

        {/* Seeds Grid */}
        {seeds.length === 0 ? (
          <div className="text-center py-16">
            <TreePine className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No seeds planted yet</h3>
            <p className="text-muted-foreground">Be the first to plant a seed in our community orchard!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {seeds.map((seed, index) => (
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
                      </div>
                    </div>
                    <div className="ml-2 p-2 bg-success/10 rounded-full">
                      <Seedling className="h-4 w-4 text-success" />
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
                  
                  {/* View Details Button */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => setSelectedSeed(seed)}
                      >
                        <Eye className="h-3 w-3 mr-2" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                          <Seedling className="h-5 w-5 text-success" />
                          <span>{selectedSeed?.title}</span>
                        </DialogTitle>
                      </DialogHeader>
                      
                      {selectedSeed && (
                        <div className="space-y-6">
                          {/* Images */}
                          {selectedSeed.images && selectedSeed.images.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-semibold flex items-center">
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Images
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedSeed.images.map((image, index) => (
                                  <img
                                    key={index}
                                    src={image}
                                    alt={`${selectedSeed.title} ${index + 1}`}
                                    className="w-full h-48 object-cover rounded-lg border border-border"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Video */}
                          {selectedSeed.video_url && (
                            <div className="space-y-3">
                              <h4 className="font-semibold flex items-center">
                                <Video className="h-4 w-4 mr-2" />
                                Video
                              </h4>
                              <video
                                src={selectedSeed.video_url}
                                controls
                                className="w-full rounded-lg border border-border"
                              />
                            </div>
                          )}
                          
                          {/* Description */}
                          <div className="space-y-3">
                            <h4 className="font-semibold">Description</h4>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {selectedSeed.description}
                            </p>
                          </div>
                          
                          {/* Additional Details */}
                          {selectedSeed.additional_details?.notes && (
                            <div className="space-y-3">
                              <h4 className="font-semibold">Additional Details</h4>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {selectedSeed.additional_details.notes}
                              </p>
                            </div>
                          )}
                          
                          {/* Meta Info */}
                          <div className="space-y-3 pt-4 border-t border-border">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Category:</span>
                                <Badge className={`ml-2 ${getCategoryColor(selectedSeed.category)}`}>
                                  {selectedSeed.category}
                                </Badge>
                              </div>
                              <div>
                                <span className="font-medium">Gifted by:</span>
                                <span className="ml-2">{getGifterName(selectedSeed.profiles)}</span>
                              </div>
                              <div>
                                <span className="font-medium">Planted:</span>
                                <span className="ml-2">{formatDate(selectedSeed.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}