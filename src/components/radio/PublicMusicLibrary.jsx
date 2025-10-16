import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Music, 
  Search, 
  Play, 
  Pause, 
  Clock,
  Tag,
  Disc,
  Volume2,
  ShoppingCart,
  DollarSign
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useMusicPurchase } from '@/hooks/useMusicPurchase'
import { useAuth } from '@/hooks/useAuth'

export default function PublicMusicLibrary() {
  const { user } = useAuth()
  const { purchaseTrack, loading: purchasing } = useMusicPurchase()
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [sortBy, setSortBy] = useState('upload_date')
  const [playingTrack, setPlayingTrack] = useState(null)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select(`
          *,
          radio_djs!inner (
            dj_name,
            avatar_url
          )
        `)
        .order('upload_date', { ascending: false })

      if (error) throw error
      setTracks(data || [])
    } catch (error) {
      console.error('Error fetching tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTracks()
  }, [])

  const filteredTracks = tracks
    .filter(track => {
      const matchesSearch = 
        track.track_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.radio_djs?.dj_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesGenre = !selectedGenre || track.genre === selectedGenre
      const matchesType = !selectedType || track.track_type === selectedType
      
      return matchesSearch && matchesGenre && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.track_title.localeCompare(b.track_title)
        case 'artist':
          return (a.artist_name || '').localeCompare(b.artist_name || '')
        case 'duration':
          return b.duration_seconds - a.duration_seconds
        case 'upload_date':
        default:
          return new Date(b.upload_date) - new Date(a.upload_date)
      }
    })

  const uniqueGenres = [...new Set(tracks.map(t => t.genre).filter(Boolean))]
  const uniqueTypes = [...new Set(tracks.map(t => t.track_type))]

  const handlePlay = async (track) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    if (playingTrack?.id === track.id) {
      setPlayingTrack(null)
      audioRef.current = null
      return
    }

    let playableUrl = track.file_url
    let derivedPath = ''

    const lastSegment = (p) => {
      const parts = (p || '').split('/').filter(Boolean)
      return decodeURIComponent(parts[parts.length - 1] || '')
    }

    const inferCandidates = (input) => {
      const candidates = []
      try {
        const u = new URL(input)
        const marker = '/storage/v1/object/'
        const idx = u.pathname.indexOf(marker)
        if (idx !== -1) {
          const after = u.pathname.substring(idx + marker.length)
          const parts = after.split('/')
          if (parts[1] === 'music-tracks') candidates.push(decodeURIComponent(parts.slice(2).join('/')))
        }
        const fname = lastSegment(u.pathname)
        if (fname) candidates.push(`music/${fname}`)
      } catch {
        const stripped = (input || '').replace(/^\/*/, '').replace(/^public\//, '')
        if (stripped.startsWith('music/')) candidates.push(stripped)
        const fname = lastSegment(stripped)
        if (fname) {
          candidates.push(`music/${fname}`)
          candidates.push(stripped)
        }
      }
      return Array.from(new Set(candidates.filter(Boolean)))
    }

    const candidates = inferCandidates(track.file_url)

    try {
      for (const cand of candidates) {
        const { data, error } = await supabase.storage.from('music-tracks').createSignedUrl(cand, 3600)
        if (!error && data?.signedUrl) {
          derivedPath = cand
          playableUrl = data.signedUrl
          break
        }
      }
      if (!derivedPath && candidates[0]) {
        const { data } = supabase.storage.from('music-tracks').getPublicUrl(candidates[0])
        if (data?.publicUrl) {
          derivedPath = candidates[0]
          playableUrl = data.publicUrl
        }
      }
    } catch {}

    const audio = new Audio(playableUrl)
    audio.crossOrigin = 'anonymous'
    audio.volume = 0.7
    audioRef.current = audio
    setPlayingTrack(track)

    const encodedFallbackUrl = (() => {
      try {
        const u = new URL(track.file_url)
        u.pathname = u.pathname
          .split('/')
          .map(seg => encodeURIComponent(decodeURIComponent(seg)))
          .join('/')
        return u.toString()
      } catch {
        return track.file_url
      }
    })()

    audio.onerror = () => {
      if (playableUrl !== encodedFallbackUrl) {
        audio.src = encodedFallbackUrl
        audio.play().catch((error) => {
          console.error('Audio play error (encoded fallback failed):', error, { fileUrl: track.file_url, derivedPath })
          setPlayingTrack(null)
          audioRef.current = null
        })
      }
    }

    audio.play().catch((error) => {
      console.error('Audio play error:', error, { fileUrl: track.file_url, derivedPath, playableUrl })
      setPlayingTrack(null)
      audioRef.current = null
    })

    audio.onended = () => {
      setPlayingTrack(null)
      audioRef.current = null
    }
  }

  const handlePurchase = async (track) => {
    await purchaseTrack(track)
  }

  const getTrackTypeLabel = (type) => {
    const labels = {
      music: 'Music',
      jingle: 'Jingle',
      voiceover: 'Voiceover',
      full_session: 'Full Session'
    }
    return labels[type] || type
  }

  const getTrackTypeColor = (type) => {
    const colors = {
      music: 'default',
      jingle: 'secondary',
      voiceover: 'outline',
      full_session: 'destructive'
    }
    return colors[type] || 'default'
  }

  if (loading) {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6" />
            Music Store
          </h2>
          <p className="text-muted-foreground">
            Discover and purchase exclusive tracks from our DJs
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{getTrackTypeLabel(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload_date">Latest First</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="artist">Artist A-Z</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span>{filteredTracks.length} tracks available</span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              $1.38 USDC each (includes fees)
            </span>
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
        <div className="space-y-3">
          {filteredTracks.map((track) => (
            <Card key={track.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => handlePlay(track)}
                      >
                        {playingTrack?.id === track.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => user ? handlePurchase(track) : null}
                          className={`text-left ${user ? 'hover:text-primary cursor-pointer' : 'cursor-default'}`}
                          disabled={!user || purchasing}
                        >
                          <h4 className="font-medium truncate">{track.track_title}</h4>
                        </button>
                        {track.artist_name && (
                          <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          by {track.radio_djs?.dj_name}
                        </p>
                      </div>
                      
                      <Badge variant={getTrackTypeColor(track.track_type)}>
                        {getTrackTypeLabel(track.track_type)}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(track.duration_seconds || 0)}
                      </span>
                      
                      {track.genre && (
                        <span className="flex items-center gap-1">
                          <Disc className="h-3 w-3" />
                          {track.genre}
                        </span>
                      )}
                      
                      {track.bpm && (
                        <span className="flex items-center gap-1">
                          <Volume2 className="h-3 w-3" />
                          {track.bpm} BPM
                        </span>
                      )}
                      
                      <span>{formatFileSize(track.file_size || 0)}</span>
                      
                      <span>
                        {new Date(track.upload_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {track.tags && track.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {track.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {user ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePurchase(track)}
                        disabled={purchasing}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        $1.38 USDC
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Login to Purchase
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Now Playing Info */}
      {playingTrack && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{playingTrack.track_title}</h4>
                  {playingTrack.artist_name && (
                    <p className="text-xs text-muted-foreground truncate">{playingTrack.artist_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    by {playingTrack.radio_djs?.dj_name}
                  </p>
                  <p className="text-xs text-primary">Now Playing</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.pause()
                      audioRef.current.src = ''
                      audioRef.current = null
                    }
                    setPlayingTrack(null)
                  }}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}