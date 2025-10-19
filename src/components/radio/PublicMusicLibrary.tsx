import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Music, 
  Search, 
  Play, 
  Pause,
  DollarSign,
  Clock,
  User,
  Filter,
  ShoppingCart,
  Lock
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useMusicPurchase } from '@/hooks/useMusicPurchase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function PublicMusicLibrary() {
  const { user } = useAuth()
  const { purchaseTrack, loading: purchasing } = useMusicPurchase()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedArtist, setSelectedArtist] = useState('')
  const [sortBy, setSortBy] = useState('upload_date')
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewTimeLeft, setPreviewTimeLeft] = useState(30)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch all public music tracks with DJ info
  const { data: tracks, isLoading } = useQuery<any[]>({
    queryKey: ['public-music-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select(`
          *,
          radio_djs!inner (
            id,
            dj_name,
            avatar_url,
            user_id
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    initialData: []
  })

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current)
      }
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatPrice = (basePrice = 1.25) => {
    const fee = basePrice * 0.105
    return (basePrice + fee).toFixed(2)
  }

  const handlePlayPreview = async (track: any) => {
    let el = audioRef.current
    if (!el) {
      el = new Audio()
      audioRef.current = el
    }

    // Stop if same track
    if (currentTrackId === track.id) {
      if (isPlaying) {
        el.pause()
        setIsPlaying(false)
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current)
        }
      } else {
        await el.play()
        setIsPlaying(true)
        startPreviewTimer()
      }
      return
    }

    // New track
    try {
      el.pause()
      el.src = ''
      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current)
      }

      // Get playable URL
      let playableUrl = track.file_url
      const path = track.file_url.split('/').pop()
      if (path) {
        const { data } = await supabase.storage
          .from('music-tracks')
          .createSignedUrl(path, 3600)
        
        if (data?.signedUrl) {
          playableUrl = data.signedUrl
        }
      }

      el.src = playableUrl
      el.currentTime = 0
      await el.play()
      
      setCurrentTrackId(track.id)
      setIsPlaying(true)
      setPreviewTimeLeft(30)
      startPreviewTimer()

      // Auto-stop after 30 seconds
      const stopTimeout = setTimeout(() => {
        el.pause()
        setIsPlaying(false)
        setCurrentTrackId(null)
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current)
        }
      }, 30000)

      el.onended = () => {
        clearTimeout(stopTimeout)
        setIsPlaying(false)
        setCurrentTrackId(null)
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current)
        }
      }

    } catch (error) {
      console.error('Preview playback error:', error)
      toast.error('Failed to play preview')
      setIsPlaying(false)
      setCurrentTrackId(null)
    }
  }

  const startPreviewTimer = () => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current)
    }
    
    let timeLeft = 30
    previewTimerRef.current = setInterval(() => {
      timeLeft -= 1
      setPreviewTimeLeft(timeLeft)
      
      if (timeLeft <= 0) {
        if (previewTimerRef.current) {
          clearInterval(previewTimerRef.current)
        }
      }
    }, 1000)
  }

  const handlePurchase = async (track: any) => {
    if (!user) {
      toast.error('Please log in to purchase music')
      return
    }

    const result = await purchaseTrack(track)
    if (result.success) {
      toast.success(`🎵 "${track.track_title}" purchased! Check your direct messages.`)
    }
  }

  const filteredTracks = tracks
    .filter(track => {
      const matchesSearch = 
        track.track_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.radio_djs?.dj_name?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesGenre = !selectedGenre || track.genre === selectedGenre
      const matchesArtist = !selectedArtist || track.radio_djs?.dj_name === selectedArtist
      
      return matchesSearch && matchesGenre && matchesArtist
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.track_title.localeCompare(b.track_title)
        case 'artist':
          return (a.artist_name || '').localeCompare(b.artist_name || '')
        case 'upload_date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

  const uniqueGenres = [...new Set(tracks.map(t => t.genre).filter(Boolean))]
  const uniqueArtists = [...new Set(tracks.map(t => t.radio_djs?.dj_name).filter(Boolean))]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading music library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Music className="h-6 w-6" />
            Grove Station Music Library
          </CardTitle>
          <p className="text-muted-foreground">
            Browse, preview (30 sec), and purchase high-quality music tracks from our DJs
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Lock className="h-4 w-4" />
            <span>All purchases are secure • Full MP3 sent via direct message • $1.38 USDC per track</span>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tracks, artists, DJs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Genre Filter */}
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger>
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Genres</SelectItem>
                {uniqueGenres.map(genre => (
                  <SelectItem key={genre} value={genre as string}>{genre as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Artist/DJ Filter */}
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger>
                <SelectValue placeholder="All DJs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All DJs</SelectItem>
                {uniqueArtists.map(artist => (
                  <SelectItem key={artist} value={artist as string}>{artist as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {filteredTracks.length} tracks available
            </span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload_date">Latest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="artist">Artist A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      {filteredTracks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tracks found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTracks.map((track) => (
            <Card key={track.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Album Art / Avatar */}
                  <div className="flex-shrink-0">
                    <Avatar className="h-20 w-20 rounded-lg">
                      <AvatarImage src={track.radio_djs?.avatar_url} />
                      <AvatarFallback>
                        <Music className="h-8 w-8" />
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg truncate">{track.track_title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                    
                    {/* DJ Attribution */}
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={track.radio_djs?.avatar_url} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        Uploaded by <span className="font-medium">{track.radio_djs?.dj_name}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {track.genre && (
                        <Badge variant="secondary" className="text-xs">
                          {track.genre}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(track.duration_seconds || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 items-end justify-between">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-primary">
                        <DollarSign className="h-4 w-4" />
                        {formatPrice()}
                      </div>
                      <p className="text-xs text-muted-foreground">USDC</p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={currentTrackId === track.id && isPlaying ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePlayPreview(track)}
                        className="w-full"
                      >
                        {currentTrackId === track.id && isPlaying ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            {previewTimeLeft}s
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handlePurchase(track)}
                        disabled={purchasing || !user}
                        size="sm"
                        className="w-full"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        {user ? 'Bestow' : 'Login to Buy'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Now Playing Preview Info */}
      {currentTrackId && isPlaying && (() => {
        const nowPlayingTrack = tracks.find(t => t.id === currentTrackId)
        if (!nowPlayingTrack) return null
        return (
          <div className="fixed bottom-4 right-4 z-50">
            <Card className="w-80 border-primary shadow-xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={nowPlayingTrack.radio_djs?.avatar_url} />
                    <AvatarFallback>
                      <Music className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{nowPlayingTrack.track_title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{nowPlayingTrack.artist_name}</p>
                    <Badge variant="default" className="text-xs mt-1">
                      Preview: {previewTimeLeft}s left
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}
    </div>
  )
}

export default PublicMusicLibrary
