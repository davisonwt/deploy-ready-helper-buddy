import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Music, Search, DollarSign, ShoppingCart } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useMusicPurchase } from '@/hooks/useMusicPurchase'
import { useAuth } from '@/hooks/useAuth'
import { ConfirmBestowModal } from '@/components/payments/ConfirmBestowModal'
import { Button } from '@/components/ui/button'
import SeedCard from '@/components/seeds/SeedCard'

export default function PublicMusicLibrary() {
  const { user } = useAuth()
  const { purchaseTrack, loading: purchasing } = useMusicPurchase()
  const [confirmTrack, setConfirmTrack] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [sortBy, setSortBy] = useState('upload_date')

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select(`
          *,
          radio_djs!inner (
            dj_name,
            avatar_url,
            user_id
          )
        `)
        .eq('radio_eligible', true)
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
  const uniqueTypes = [...new Set(tracks.map(t => t.track_type).filter(Boolean))]

  const getTrackTypeLabel = (type) => {
    const labels = {
      music: 'Music',
      jingle: 'Jingle',
      voiceover: 'Voiceover',
      full_session: 'Full Session'
    }
    return labels[type] || type
  }

  const handlePurchase = (track) => {
    setConfirmTrack(track)
  }

  const confirmPurchaseWithProvider = async (provider) => {
    if (!confirmTrack) return
    await purchaseTrack(confirmTrack, confirmTrack?.price, { provider })
    setConfirmTrack(null)
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
      {confirmTrack && (
        <ConfirmBestowModal
          isOpen
          onClose={() => setConfirmTrack(null)}
          title={confirmTrack.track_title || confirmTrack.title || 'this track'}
          amount={Number(confirmTrack.price) || 0}
          confirming={purchasing}
          onConfirm={confirmPurchaseWithProvider}
          enablePaystack
        />
      )}

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
            <Select value={selectedGenre || undefined} onValueChange={(value) => setSelectedGenre(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {uniqueGenres.map(genre => (
                  <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            <Select value={selectedType || undefined} onValueChange={(value) => setSelectedType(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
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

      {/* Track List -- SeedCard carries cover/title/sower/45s-sample/Bestow/
          Message/Voice/Video/Share/Report now (Flow v2 step 3); Heart and
          the Whisperer badge stay off since a dj_music_tracks row isn't a
          products row (product_likes/product_whisperer_assignments are
          FK'd to products, not this table). Purchase (a fixed-price full
          download, a different transaction than Bestow's free-will gift)
          stays this page's own action, layered below each card. */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map((track) => (
            <div key={track.id} className="space-y-2">
              <SeedCard
                id={track.id}
                kind="music"
                title={track.track_title}
                subtitle={[track.artist_name, track.genre, getTrackTypeLabel(track.track_type)].filter(Boolean).join(' · ')}
                cover={track.cover_image_url}
                ownerId={track.radio_djs?.user_id}
                ownerName={track.radio_djs?.dj_name}
                ownerAvatar={track.radio_djs?.avatar_url}
                openPath="/music-library"
                previewUrl={track.preview_url ?? null}
                isProductRow={false}
              />
              {user ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handlePurchase(track)}
                  disabled={purchasing}
                  className="w-full flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Purchase $1.38 USDC
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="w-full">
                  Login to Purchase
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}