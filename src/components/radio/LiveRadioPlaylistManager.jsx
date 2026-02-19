import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Pause, 
  SkipForward, 
  Music, 
  Clock,
  Users,
  ShoppingCart
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useMusicPurchase } from '@/hooks/useMusicPurchase'
import { toast } from 'sonner'

export function LiveRadioPlaylistManager({ sessionId, isHost = false }) {
  const { user } = useAuth()
  const { purchaseTrack, loading: purchasing } = useMusicPurchase()
  const [automatedSession, setAutomatedSession] = useState(null)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [listeners, setListeners] = useState(0)

  useEffect(() => {
    if (sessionId) {
      fetchAutomatedSession()
      subscribeToSession()
    }
  }, [sessionId])

  const fetchAutomatedSession = async () => {
    try {
      const { data: session, error } = await supabase
        .from('radio_automated_sessions')
        .select(`
          *,
          dj_playlists (
            playlist_name,
            dj_playlist_tracks (
              track_order,
              dj_music_tracks (
                id,
                track_title,
                artist_name,
                duration_seconds,
                genre,
                file_url,
                file_size
              )
            )
          )
        `)
        .eq('session_id', sessionId)
        .eq('playback_status', 'playing')
        .single()

      if (error || !session) {
        console.log('No automated session found for this live session')
        return
      }

      setAutomatedSession(session)
      
      const tracks = session.dj_playlists?.dj_playlist_tracks
        ?.sort((a, b) => a.track_order - b.track_order)
        ?.map(pt => pt.dj_music_tracks) || []
      
      setPlaylistTracks(tracks)
      setCurrentTrackIndex(session.current_track_index || 0)
      
      if (tracks.length > 0 && tracks[session.current_track_index || 0]) {
        setCurrentTrack(tracks[session.current_track_index || 0])
        setIsPlaying(session.playback_status === 'playing')
      }
    } catch (error) {
      console.error('Error fetching automated session:', error)
    }
  }

  const subscribeToSession = () => {
    const channel = supabase
      .channel(`radio-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'radio_automated_sessions',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setCurrentTrackIndex(payload.new.current_track_index || 0)
        setIsPlaying(payload.new.playback_status === 'playing')
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'radio_live_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        setListeners(payload.new.viewer_count || 0)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handlePurchaseTrack = async (track) => {
    const result = await purchaseTrack(track)
    if (result.success) {
      toast.success(`🎵 "${track.track_title}" purchased! Check your direct messages.`)
    }
  }

  const nextTrack = async () => {
    if (!isHost || !automatedSession) return
    
    const newIndex = Math.min(currentTrackIndex + 1, playlistTracks.length - 1)
    
    try {
      await supabase
        .from('radio_automated_sessions')
        .update({ 
          current_track_index: newIndex,
          track_started_at: new Date().toISOString()
        })
        .eq('id', automatedSession.id)
      
      setCurrentTrackIndex(newIndex)
      setCurrentTrack(playlistTracks[newIndex])
      setProgress(0)
    } catch (error) {
      console.error('Error updating track:', error)
    }
  }

  const togglePlayback = async () => {
    if (!isHost || !automatedSession) return
    
    const newStatus = isPlaying ? 'paused' : 'playing'
    
    try {
      await supabase
        .from('radio_automated_sessions')
        .update({ playback_status: newStatus })
        .eq('id', automatedSession.id)
      
      setIsPlaying(!isPlaying)
    } catch (error) {
      console.error('Error toggling playback:', error)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!automatedSession || playlistTracks.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Current Track */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Now Playing
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{listeners} listening</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTrack && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{currentTrack.track_title}</h3>
                  <p className="text-muted-foreground">{currentTrack.artist_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {currentTrack.genre || 'Unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(currentTrack.duration_seconds)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {user && (
                    <Button
                      size="sm"
                      onClick={() => handlePurchaseTrack(currentTrack)}
                      disabled={purchasing}
                      className="flex items-center gap-1"
                    >
                      <ShoppingCart className="h-3 w-3" />
                      ${currentTrack?.price ? Number(currentTrack.price).toFixed(2) : '0.00'} USDC
                    </Button>
                  )}
                  <span className="text-xs text-muted-foreground">Get MP3</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatDuration(Math.floor(progress * currentTrack.duration_seconds / 100))}</span>
                  <span>{formatDuration(currentTrack.duration_seconds)}</span>
                </div>
              </div>

              {/* Host Controls */}
              {isHost && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayback}
                    className="flex items-center gap-1"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextTrack}
                    disabled={currentTrackIndex >= playlistTracks.length - 1}
                    className="flex items-center gap-1"
                  >
                    <SkipForward className="h-4 w-4" />
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Tracks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Tracks ({playlistTracks.length - currentTrackIndex - 1} remaining)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {playlistTracks.slice(currentTrackIndex + 1, currentTrackIndex + 6).map((track, index) => (
              <div key={track.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                    {currentTrackIndex + index + 2}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{track.track_title}</p>
                    <p className="text-xs text-foreground/70">{track.artist_name}</p>
                  </div>
                </div>
                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePurchaseTrack(track)}
                    disabled={purchasing}
                    className="flex items-center gap-1 text-xs"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    ${track.price ? Number(track.price).toFixed(2) : '0.00'}
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {user && (
            <div className="mt-3 p-2 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Purchase any track to get the high-quality MP3 file sent directly to your messages. 
                Files are private and not shareable.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LiveRadioPlaylistManager