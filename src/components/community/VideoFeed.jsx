import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, TrendingUp, Clock, Heart, Eye } from 'lucide-react'
import { useCommunityVideos } from '@/hooks/useCommunityVideos.jsx'
import VideoCard from './VideoCard.jsx'

export default function VideoFeed() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const { videos, loading, fetchVideos } = useCommunityVideos()

  const handleSearch = async (e) => {
    e.preventDefault()
    await fetchVideos({ search: searchQuery, sortBy })
  }

  const handleSortChange = async (value) => {
    setSortBy(value)
    await fetchVideos({ search: searchQuery, sortBy: value })
  }

  const getSortIcon = (value) => {
    switch (value) {
      case 'views':
        return <Eye className="h-4 w-4" />
      case 'likes':
        return <Heart className="h-4 w-4" />
      case 'trending':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex justify-end">
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <div className="flex items-center gap-2">
              {getSortIcon(sortBy)}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg z-50">
            <SelectItem value="newest">
              Newest First
            </SelectItem>
            <SelectItem value="views">
              Most Viewed
            </SelectItem>
            <SelectItem value="likes">
              Most Liked
            </SelectItem>
            <SelectItem value="trending">
              Trending
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[9/16] bg-muted/30 rounded-lg mb-3 border border-muted" />
              <div className="space-y-2">
                <div className="h-4 bg-muted/30 rounded w-3/4 border border-muted" />
                <div className="h-3 bg-muted/30 rounded w-1/2 border border-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2 text-slate-900" style={{textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'}}>No videos found</h3>
          <p className="mb-4 text-slate-800 font-medium" style={{textShadow: '0.5px 0.5px 0 white, -0.5px -0.5px 0 white, 0.5px -0.5px 0 white, -0.5px 0.5px 0 white'}}>
            {searchQuery 
              ? `No videos match "${searchQuery}". Try a different search term.`
              : 'No videos have been uploaded yet. Be the first to share!'
            }
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                fetchVideos({ sortBy })
              }}
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}