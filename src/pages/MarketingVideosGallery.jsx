import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, Play, Heart, Filter, Eye, MessageCircle, ThumbsUp, ExternalLink, Share2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityVideos } from '@/hooks/useCommunityVideos'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function MarketingVideosGallery() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredVideos, setFilteredVideos] = useState([])
  const { user } = useAuth()
  const { videos, loading, likeVideo, fetchVideos } = useCommunityVideos()
  const navigate = useNavigate()

  // Categories for filtering - same as Create Orchard page
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'The Gift of Accessories', label: 'The Gift of Accessories' },
    { value: 'The Gift of Adventure Packages', label: 'The Gift of Adventure Packages' },
    { value: 'The Gift of Appliances', label: 'The Gift of Appliances' },
    { value: 'The Gift of Art', label: 'The Gift of Art' },
    { value: 'The Gift of Books & Literature', label: 'The Gift of Books & Literature' },
    { value: 'The Gift of Business Solutions', label: 'The Gift of Business Solutions' },
    { value: 'The Gift of Clothing & Fashion', label: 'The Gift of Clothing & Fashion' },
    { value: 'The Gift of Computers & Technology', label: 'The Gift of Computers & Technology' },
    { value: 'The Gift of Education & Training', label: 'The Gift of Education & Training' },
    { value: 'The Gift of Entertainment', label: 'The Gift of Entertainment' },
    { value: 'The Gift of Food & Beverages', label: 'The Gift of Food & Beverages' },
    { value: 'The Gift of Furniture & Home Decor', label: 'The Gift of Furniture & Home Decor' },
    { value: 'The Gift of Gifts & Special Items', label: 'The Gift of Gifts & Special Items' },
    { value: 'The Gift of Health & Medical', label: 'The Gift of Health & Medical' },
    { value: 'The Gift of Industrial & Scientific', label: 'The Gift of Industrial & Scientific' },
    { value: 'The Gift of Music', label: 'The Gift of Music' },
    { value: 'The Gift of Personal Care', label: 'The Gift of Personal Care' },
    { value: 'The Gift of Security', label: 'The Gift of Security' },
    { value: 'The Gift of Services', label: 'The Gift of Services' },
    { value: 'The Gift of Social Impact', label: 'The Gift of Social Impact' },
    { value: 'The Gift of Software', label: 'The Gift of Software' },
    { value: 'The Gift of Sports & Recreation', label: 'The Gift of Sports & Recreation' },
    { value: 'The Gift of Technology & Hardware (Consumer Electronics)', label: 'The Gift of Technology & Hardware (Consumer Electronics)' },
    { value: 'The Gift of Tools & Equipment', label: 'The Gift of Tools & Equipment' },
    { value: 'The Gift of Transportation', label: 'The Gift of Transportation' },
    { value: 'The Gift of Travel & Tourism', label: 'The Gift of Travel & Tourism' }
  ]

  useEffect(() => {
    fetchVideos()
  }, [])

  useEffect(() => {
    if (!videos) return
    
    let filtered = videos.filter(video => 
      video.status === 'approved' && 
      video.tags && 
      (video.tags.includes('marketing') || video.orchard_id) // Include marketing tagged videos or orchard-linked videos
    )

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(video =>
        video.tags && video.tags.some(tag => 
          tag === selectedCategory || tag.toLowerCase().includes(selectedCategory.toLowerCase())
        )
      )
    }

    setFilteredVideos(filtered)
  }, [videos, selectedCategory])

  const handleVideoClick = (video) => {
    // Navigate to the orchard page if the video is linked to an orchard
    if (video.orchard_id) {
      navigate(`/orchard/${video.orchard_id}`)
      toast.success('Taking you to the orchard - bestow to support this sower!')
    } else {
      // Fallback: search orchards by category/tags
      if (video.tags && video.tags.length > 0) {
        const searchTerm = video.tags.find(tag => tag !== 'marketing' && tag !== 'orchard') || video.tags[0]
        navigate(`/browse-orchards?search=${encodeURIComponent(searchTerm)}`)
      } else {
        navigate('/browse-orchards')
      }
      toast.success('Searching orchards - find the matching orchard to bestow!')
    }
  }

  const handleShare = async (video, e) => {
    e.stopPropagation()
    
    const shareUrl = video.orchard_id 
      ? `${window.location.origin}/orchard/${video.orchard_id}?from=video` 
      : `${window.location.origin}/marketing-videos`
    
    const shareData = {
      title: video.title,
      text: `Check out this marketing video from ${video.profiles?.display_name || 'a sower'} on sow2grow - the 364yhvh community farm! 🌱`,
      url: shareUrl
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        toast.success('Video shared successfully!')
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`)
        toast.success('Link copied to clipboard!')
      } catch (clipboardError) {
        toast.error('Failed to share video')
      }
    }
  }

  const handleLike = async (videoId, e) => {
    e.stopPropagation()
    if (!user) {
      toast.error('Please log in to like videos')
      return
    }
    
    try {
      await likeVideo(videoId)
      toast.success('Video liked!')
    } catch (error) {
      toast.error('Failed to like video')
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVideoThumbnail = (video) => {
    if (video.thumbnail_url) return video.thumbnail_url
    // Fallback thumbnail based on category
    return '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png'
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-15"
        >
          <source src="/orchards-strip2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-background/85" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background/50 border-b backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900" style={{textShadow: '2px 2px 0 white, -2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white'}}>
                  <Video className="h-8 w-8 text-primary" style={{filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'}} />
                  Marketing Videos Gallery
                </h1>
                <p className="text-lg text-slate-800 font-medium" style={{textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'}}>
                  Discover inspiring marketing content from fellow sowers - click to find their orchards and bestow!
                </p>
              </div>
            </div>

            {/* Filter Section */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by category:</span>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg z-50">
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="ml-auto">
                {filteredVideos.length} videos
              </Badge>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No marketing videos found</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedCategory === 'all' 
                    ? 'No marketing videos have been uploaded yet.' 
                    : `No videos found in the ${categories.find(c => c.value === selectedCategory)?.label} category.`}
                </p>
                <Button onClick={() => setSelectedCategory('all')}>
                  View All Categories
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card 
                  key={video.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => handleVideoClick(video)}
                >
                  {/* Video Thumbnail */}
                  <div className="aspect-video relative overflow-hidden rounded-t-lg bg-black">
                    <img 
                      src={getVideoThumbnail(video)}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 rounded-full p-3">
                        <Play className="h-6 w-6 text-primary fill-current" />
                      </div>
                    </div>

                    {/* Duration Badge */}
                    {video.duration_seconds && (
                      <Badge 
                        variant="secondary" 
                        className="absolute bottom-2 right-2 bg-black/70 text-white border-none"
                      >
                        {formatDuration(video.duration_seconds)}
                      </Badge>
                    )}

                    {/* Category Badge */}
                    {video.tags && video.tags.length > 0 && (
                      <Badge 
                        variant="default"
                        className="absolute top-2 left-2 bg-primary/90"
                      >
                        {video.tags[0]}
                      </Badge>
                    )}
                  </div>

                  {/* Video Info */}
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    
                    {video.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    {/* Creator Info */}
                    <div className="flex items-center gap-2 mb-3">
                      {video.profiles?.avatar_url ? (
                        <img 
                          src={video.profiles.avatar_url} 
                          alt="Creator"
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {(video.profiles?.display_name || video.profiles?.first_name || 'U')[0]}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {video.profiles?.display_name || 
                         `${video.profiles?.first_name || ''} ${video.profiles?.last_name || ''}`.trim() || 
                         'Anonymous Sower'}
                      </span>
                    </div>

                    {/* Stats and Actions */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {video.view_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {video.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {video.comment_count || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Share Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                          onClick={(e) => handleShare(video, e)}
                          title="Share video"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        
                        {/* Like Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                          onClick={(e) => handleLike(video.id, e)}
                          title="Like video"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Call to Action */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {video.orchard_id ? 'Click to visit orchard' : 'Click to find orchard'}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Call to Action */}
          {!user && filteredVideos.length > 0 && (
            <Card className="mt-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6 text-center">
                <Video className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Join the Community</h3>
                <p className="text-muted-foreground mb-4">
                  Log in to like videos, leave comments, and upload your own marketing content!
                </p>
                <Button onClick={() => navigate('/login')}>
                  Sign In to Participate
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}