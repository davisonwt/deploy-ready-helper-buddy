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
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos, tags, or creators..."
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <div className="flex items-center gap-2">
              {getSortIcon(sortBy)}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Newest First
              </div>
            </SelectItem>
            <SelectItem value="views">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Most Viewed
              </div>
            </SelectItem>
            <SelectItem value="likes">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Most Liked
              </div>
            </SelectItem>
            <SelectItem value="trending">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[9/16] bg-muted rounded-lg mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No videos found</h3>
          <p className="text-muted-foreground mb-4">
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