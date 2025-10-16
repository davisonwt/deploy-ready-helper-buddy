import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Music, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  
  Trash2,
  Clock,
  Tag,
  Disc,
  Volume2
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useDJPlaylist } from '@/hooks/useDJPlaylist'
import DJMusicUpload from './DJMusicUpload'

export default function DJMusicLibrary() {
  const { tracks, loading, deleteTrack } = useDJPlaylist()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [sortBy, setSortBy] = useState('upload_date')
  const [currentTrackId, setCurrentTrackId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
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

  const filteredTracks = tracks
    .filter(track => {
      const matchesSearch = 
        track.track_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
    let el = audioRef.current
    if (!el) {
      el = new Audio()
      audioRef.current = el
    }
    el.crossOrigin = 'anonymous'
    el.volume = 0.7

    // If switching to a new track: Stop current completely
    if (currentTrackId !== track.id) {
      console.log('[Radio] Switching to new track', { trackId: track.id })
      try {
        el.pause()
        el.src = ''
        el.load()
        setIsPlaying(false)
      } catch (e) {
        console.warn('Error stopping audio:', e)
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
            const bucketIndex = parts[0] === 'public' ? 1 : 0
            if (parts[bucketIndex] === 'music-tracks') {
              const key = decodeURIComponent(parts.slice(bucketIndex + 1).join('/'))
              if (key) candidates.push(key)
            }
          }
          const fname = lastSegment(u.pathname)
          if (fname) {
            candidates.push(`music/${fname}`)
          }
        } catch {
          const stripped = (input || '').replace(/^\/*/, '').replace(/^public\//, '')
          candidates.push(stripped)
          const fname = lastSegment(stripped)
          if (fname) {
            candidates.push(`music/${fname}`)
            candidates.push(stripped)
          }
        }
        return Array.from(new Set(candidates.filter(Boolean)))
      }

      const candidates = inferCandidates(track.file_url)
      console.log('[Radio] URL candidates', { fileUrl: track.file_url, candidates })

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

      const encodedFallbackUrl = (() => {
        try {
          const u = new URL(playableUrl.startsWith('http') ? playableUrl : track.file_url)
          u.pathname = u.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/')
          return u.toString()
        } catch {
          return playableUrl.startsWith('http') ? playableUrl : track.file_url
        }
      })()

      try { el.pause(); el.src = ''; el.load(); } catch {}

      let fallbackStage = 0
      el.onerror = () => {
        console.warn('Primary URL failed, trying fallback', { playableUrl, encodedFallbackUrl, stage: fallbackStage })
        try {
          if (fallbackStage === 0 && el.src !== encodedFallbackUrl) {
            fallbackStage = 1
            el.src = encodedFallbackUrl
            el.load()
            el.play().catch((error) => { console.error('Encoded fallback failed:', error) })
            return
          }
          if (fallbackStage === 1 && el.src !== track.file_url) {
            fallbackStage = 2
            el.src = track.file_url
            el.load()
            el.play().catch((error) => { console.error('Original URL fallback failed:', error) })
            return
          }
        } catch (e) {
          console.error('Fallback handling error:', e)
        }
        setCurrentTrackId(null)
        setIsPlaying(false)
      }

      el.onended = () => {
        console.log('[Radio] Track ended')
        setIsPlaying(false)
      }

      try {
        el.src = playableUrl
        el.load()
        await el.play()
        setCurrentTrackId(track.id)
        setIsPlaying(true)
      } catch (error) {
        console.error('Audio play error:', error, { fileUrl: track.file_url, derivedPath, playableUrl })
        setCurrentTrackId(null)
        setIsPlaying(false)
      }
      return
    }

    // Same track: Toggle play/pause (resume without restart)
    console.log('[Radio] Toggling same track', { trackId: track.id, isPlaying })
    if (isPlaying) {
      try {
        el.pause()
        setIsPlaying(false)
      } catch (e) {
        console.warn('Pause error:', e)
      }
    } else {
      try {
        await el.play()
        setIsPlaying(true)
      } catch (e) {
        console.error('Resume error:', e)
        setIsPlaying(false)
      }
    }
  }

  const handleDelete = async (trackId) => {
    if (confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
      await deleteTrack(trackId)
      if (currentTrackId === trackId) {
        setCurrentTrackId(null)
        setIsPlaying(false)
      }
    }
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
            Music Library
          </h2>
          <p className="text-muted-foreground">
            Manage your uploaded tracks and audio files
          </p>
        </div>
        
        <DJMusicUpload />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search tracks, artists, tags..."
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
            <span>{filteredTracks.length} of {tracks.length} tracks</span>
            <span>
              Total: {formatDuration(tracks.reduce((sum, track) => sum + (track.duration_seconds || 0), 0))}
            </span>
            <span>
              Size: {formatFileSize(tracks.reduce((sum, track) => sum + (track.file_size || 0), 0))}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Track List */}
      {filteredTracks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {tracks.length === 0 ? 'No tracks uploaded yet' : 'No tracks match your search'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {tracks.length === 0 
                ? 'Upload your first music track to start building your radio library'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {tracks.length === 0 && <DJMusicUpload />}
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
                        {currentTrackId === track.id && isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{track.track_title}</h4>
                        {track.artist_name && (
                          <p className="text-sm text-muted-foreground truncate">{track.artist_name}</p>
                        )}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(track.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Now Playing Info */}
      {currentTrackId && isPlaying && (() => {
        const nowPlayingTrack = tracks.find(t => t.id === currentTrackId);
        if (!nowPlayingTrack) return null;
        return (
          <div className="fixed bottom-4 right-4 z-50">
            <Card className="w-80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{nowPlayingTrack.track_title}</h4>
                    {nowPlayingTrack.artist_name && (
                      <p className="text-xs text-muted-foreground truncate">{nowPlayingTrack.artist_name}</p>
                    )}
                    <p className="text-xs text-primary">Now Playing</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.pause()
                        audioRef.current.src = ''
                      }
                      setCurrentTrackId(null)
                      setIsPlaying(false)
                    }}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  )
}