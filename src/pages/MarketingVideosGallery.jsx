import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, Play, Heart, Filter, Eye, MessageCircle, ThumbsUp, ExternalLink, Share2, Pause, DollarSign, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityVideos } from '@/hooks/useCommunityVideos'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { VideoPlayer } from '@/components/ui/VideoPlayer'
import VideoGifting from '@/components/community/VideoGifting'
import VideoCommentsSection from '@/components/community/VideoCommentsSection'
import VideoSocialShare from '@/components/community/VideoSocialShare'
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import { motion } from 'framer-motion'


export default function MarketingVideosGallery() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [filteredVideos, setFilteredVideos] = useState([])
  const [playingVideos, setPlayingVideos] = useState(new Set())
  const [api, setApi] = useState()
  
  const { user } = useAuth()
  const { videos, loading, toggleLike, fetchVideos, incrementViews } = useCommunityVideos()
  const navigate = useNavigate()

  const autoplayPlugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true, stopOnMouseEnter: true })
  )

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
    { value: 'The Gift of Everything Bee\'s', label: 'The Gift of Everything Bee\'s' },
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
      video.orchard_id !== null
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

  const toggleVideoPlay = (videoId) => {
    setPlayingVideos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(videoId)) {
        newSet.delete(videoId)
      } else {
        newSet.add(videoId)
      }
      return newSet
    })
  }

  const handleOrchardVisit = (video, e) => {
    e.stopPropagation()
    if (video.orchard_id) {
      navigate(`/orchard/${video.orchard_id}`)
      toast.success('Taking you to the orchard - bestow to support this sower!')
    } else {
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
        await navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`)
        toast.success('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
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
      await toggleLike(videoId)
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
    return '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png'
  }

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center' style={{
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 25%, #c44569 50%, #a55eea 75%, #8854d0 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}>
        <Loader2 className='w-12 h-12 animate-spin text-white' />
      </div>
    )
  }

  return (
    <div className='min-h-screen relative overflow-hidden'>
      {/* Creative Animated Background */}
      <div className='fixed inset-0 z-0'>
        <div className='absolute inset-0' style={{
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 25%, #c44569 50%, #a55eea 75%, #8854d0 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 20s ease infinite'
        }} />
        <div className='absolute inset-0 bg-black/20' />
        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className='absolute rounded-full blur-3xl opacity-30'
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: `radial-gradient(circle, rgba(${255 - i * 20}, ${107 - i * 10}, ${107 - i * 5}, 0.6), transparent)`,
              left: `${10 + i * 15}%`,
              top: `${10 + i * 12}%`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className='relative z-10'>
        {/* Hero Header */}
        <div className='relative overflow-hidden border-b border-white/20 backdrop-blur-md bg-white/10'>
          <div className='relative container mx-auto px-4 py-16'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='text-center max-w-4xl mx-auto'
            >
              <div className='flex items-center justify-center gap-4 mb-6'>
                <div className='p-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30'>
                  <Video className='w-16 h-16 text-white' />
                </div>
                <h1 className='text-6xl font-bold text-white drop-shadow-2xl'>
                  S2G Marketing Video Gallery
                </h1>
              </div>
              <p className='text-white/90 text-xl mb-4 backdrop-blur-sm bg-white/10 rounded-lg p-4 border border-white/20'>
                Discover inspiring marketing content from fellow sowers - watch videos with autoplay and send free-will gifts!
              </p>
            </motion.div>

            {/* Filter Section */}
            <div className='mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center'>
              <div className='flex items-center gap-2'>
                <Filter className='h-5 w-5 text-white' />
                <span className='text-sm font-medium text-white'>Filter by category:</span>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className='w-full sm:w-64 backdrop-blur-md bg-white/20 border-white/30 text-white'>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent className='bg-white border border-border shadow-lg z-50'>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant='outline' className='backdrop-blur-md bg-white/20 border-white/30 text-white'>
                {filteredVideos.length} videos
              </Badge>
            </div>
          </div>
        </div>

        {/* Videos Grid */}
        <div className='container mx-auto px-4 py-8'>
          {filteredVideos.length === 0 ? (
            <Card className='max-w-2xl mx-auto mt-12 backdrop-blur-md bg-white/20 border-white/30'>
              <CardContent className='p-12 text-center'>
                <Video className='w-20 h-20 mx-auto text-white/70 mb-4' />
                <h3 className='text-2xl font-bold mb-2 text-white'>No marketing videos found</h3>
                <p className='text-white/70 mb-6'>
                  {selectedCategory === 'all' 
                    ? 'No marketing videos have been uploaded yet.' 
                    : `No videos found in the ${categories.find(c => c.value === selectedCategory)?.label} category.`}
                </p>
                <Button onClick={() => setSelectedCategory('all')} className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                  View All Categories
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Carousel
              setApi={setApi}
              opts={{
                align: 'start',
                loop: true,
                dragFree: true,
              }}
              plugins={[autoplayPlugin.current]}
              className='w-full'
            >
              <CarouselContent className='-ml-4'>
                {filteredVideos.map((video) => (
                  <CarouselItem key={video.id} className='pl-4 md:basis-1/2 lg:basis-1/2'>
                    <div className='h-full'>
                      <Card className='overflow-hidden flex flex-col h-full backdrop-blur-md bg-white/20 border-white/30 shadow-2xl'>
                        {/* Video Player Section */}
                        <div className='aspect-video relative bg-black'>
                          <VideoPlayer
                            src={video.video_url}
                            className='w-full h-full'
                            autoPlay={true}
                            muted={true}
                            loop={true}
                            playsInline={true}
                            fallbackImage={getVideoThumbnail(video)}
                            onError={(error) => {
                              console.error('Video playbook error:', error)
                            }}
                            onPlay={() => {
                              incrementViews(video.id)
                            }}
                          />
                          
                          {/* Category Badge */}
                          {video.tags && video.tags.length > 0 && (
                            <Badge 
                              variant='default'
                              className='absolute top-2 left-2 bg-primary/90 text-white backdrop-blur-md'
                            >
                              {video.tags[0]}
                            </Badge>
                          )}

                          {/* Duration Badge */}
                          {video.duration_seconds && (
                            <Badge 
                              variant='secondary' 
                              className='absolute bottom-2 right-2 bg-black/70 text-white border-none backdrop-blur-md'
                            >
                              {formatDuration(video.duration_seconds)}
                            </Badge>
                          )}
                        </div>

                        {/* Video Info Section */}
                        <CardContent className='p-6 pb-8 space-y-4 flex-1 flex flex-col'>
                          {/* Title and Description */}
                          <div>
                            <h3 className='font-semibold text-xl mb-2 line-clamp-2 text-white'>
                              {video.title}
                            </h3>
                            {video.description && (
                              <p className='text-sm text-white/80 line-clamp-3'>
                                {video.description}
                              </p>
                            )}
                          </div>

                          {/* Creator Info */}
                          <div className='flex items-center gap-3'>
                            {video.profiles?.avatar_url ? (
                              <img 
                                src={video.profiles.avatar_url} 
                                alt='Creator'
                                className='w-8 h-8 rounded-full'
                              />
                            ) : (
                              <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center'>
                                <span className='text-sm font-medium text-white'>
                                  {(video.profiles?.display_name || video.profiles?.first_name || 'U')[0]}
                                </span>
                              </div>
                            )}
                            <div className='flex-1'>
                              <p className='font-medium text-sm text-white'>
                                {video.profiles?.display_name || 
                                 `${video.profiles?.first_name || ''} ${video.profiles?.last_name || ''}`.trim() || 
                                 'Anonymous Sower'}
                              </p>
                              <p className='text-xs text-white/70'>Creator</p>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className='flex items-center gap-6 text-sm text-white/80'>
                            <span className='flex items-center gap-1'>
                              <Eye className='h-4 w-4' />
                              {video.view_count || 0} views
                            </span>
                            <span className='flex items-center gap-1'>
                              <ThumbsUp className='h-4 w-4' />
                              {video.like_count || 0} likes
                            </span>
                            <span className='flex items-center gap-1'>
                              <MessageCircle className='h-4 w-4' />
                              {video.comment_count || 0} comments
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 mt-auto border-t border-white/20'>
                            <div className='flex flex-wrap items-center gap-2'>
                              {/* Like Button */}
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-white hover:text-white hover:bg-white/20'
                                onClick={(e) => {
                                  e.preventDefault()
                                  handleLike(video.id, e)
                                }}
                              >
                                <ThumbsUp className='h-4 w-4 mr-1' />
                                Like
                              </Button>
                              
                              {/* Comments Button */}
                              <VideoCommentsSection video={video} />
                              
                              {/* Share Button */}
                              <VideoSocialShare video={video} />
                              
                              {/* Visit Orchard Button */}
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-white hover:text-white hover:bg-white/20'
                                onClick={(e) => handleOrchardVisit(video, e)}
                              >
                                <ExternalLink className='h-4 w-4 mr-1' />
                                {video.orchard_id ? 'Visit Orchard' : 'Find Orchard'}
                              </Button>
                            </div>

                            {/* Free-Will Gift Button - Prominent */}
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='text-xs text-white/80 whitespace-nowrap'>send free-will gift:</span>
                              <VideoGifting
                                video={video}
                                onGiftSent={() => {
                                  fetchVideos()
                                  toast.success('Gift sent to creator! 💝')
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className='absolute -left-12 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
              <CarouselNext className='absolute -right-12 top-1/2 -translate-y-1/2 backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30' />
            </Carousel>
          )}

          {/* Call to Action */}
          {!user && filteredVideos.length > 0 && (
            <Card className='mt-8 backdrop-blur-md bg-white/20 border-white/30'>
              <CardContent className='p-6 text-center'>
                <Video className='h-12 w-12 text-white mx-auto mb-4' />
                <h3 className='text-xl font-semibold mb-2 text-white'>Join the Community</h3>
                <p className='text-white/80 mb-4'>
                  Log in to like videos, leave comments, and upload your own marketing content!
                </p>
                <Button onClick={() => navigate('/login')} className='backdrop-blur-md bg-white/20 border-white/30 text-white hover:bg-white/30'>
                  Sign In to Participate
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
