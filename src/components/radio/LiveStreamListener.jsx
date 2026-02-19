import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Volume2, 
  VolumeX, 
  Users, 
  Hand, 
  Heart,
  Radio,
  Mic,
  MicOff,
  Play,
  Pause
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { GuestRequestModal } from './GuestRequestModal'
import { MusicPurchaseInterface } from './MusicPurchaseInterface'
import { resolveAudioUrl } from '@/utils/resolveAudioUrl'

export function LiveStreamListener({ liveSession, currentShow }) {
  const isPreRecorded = currentShow?.broadcast_mode === 'pre_recorded'
  const { user } = useAuth()
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [activeHosts, setActiveHosts] = useState([])
  const [viewerCount, setViewerCount] = useState(0)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [hasRequestedGuest, setHasRequestedGuest] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  
  const audioRef = useRef(null)
  const peerConnectionRef = useRef(null)

  const fetchActiveHosts = async () => {
    if (!liveSession) return

    try {
      const { data, error } = await supabase
        .from('radio_live_hosts')
        .select(`
          *,
          radio_djs (dj_name, avatar_url)
        `)
        .eq('session_id', liveSession.id)
        .eq('is_active', true)

      if (error) throw error
      setActiveHosts(data || [])
    } catch (error) {
      console.error('Error fetching active hosts:', error)
    }
  }

  const checkExistingGuestRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_guest_requests')
        .select('*')
        .eq('session_id', liveSession.id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle()

      if (data) {
        setHasRequestedGuest(true)
      }
    } catch (error) {
      // No existing request found
      setHasRequestedGuest(false)
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to host changes
    const hostsSubscription = supabase
      .channel(`live-hosts-${liveSession.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'radio_live_hosts',
          filter: `session_id=eq.${liveSession.id}`
        },
        () => fetchActiveHosts()
      )
      .subscribe()

    // Subscribe to session updates (using secure view)
    const sessionSubscription = supabase
      .channel(`live-session-${liveSession.id}`)
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'radio_live_sessions',
          filter: `id=eq.${liveSession.id}`
        },
        (payload) => {
          // Only update non-sensitive data
          setViewerCount(payload.new.viewer_count || 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(hostsSubscription)
      supabase.removeChannel(sessionSubscription)
    }
  }

  useEffect(() => {
    if (liveSession) {
      fetchActiveHosts()
      setupRealtimeSubscriptions()
      setViewerCount(liveSession.viewer_count || 0)
    }
    
    // Always try to load playlist for current show
    if (currentShow) {
      fetchPlaylistForCurrentShow()
    }

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [liveSession, currentShow])

  useEffect(() => {
    if (user && liveSession) {
      checkExistingGuestRequest()
    }
  }, [user, liveSession])

  // Auto-play when tracks load and user has pressed play
  useEffect(() => {
    if (isPlaying && currentTrack && audioRef.current && !audioRef.current.src) {
      playCurrentTrackAudio(currentTrack)
    }
  }, [currentTrack, isPlaying])

  // Handle track ended - play next
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = async () => {
      if (playlistTracks.length <= 1) {
        setIsPlaying(false)
        return
      }
      const currentIdx = playlistTracks.findIndex(t => t.id === currentTrack?.id)
      const nextIdx = (currentIdx + 1) % playlistTracks.length
      const nextTrack = playlistTracks[nextIdx]
      setCurrentTrack(nextTrack)
      await playCurrentTrackAudio(nextTrack)
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [playlistTracks, currentTrack])

  const togglePlayPause = async () => {
    // For pre-recorded mode, we only need currentShow (no live session required)
    if (!isPreRecorded && (!liveSession || !liveSession.id)) {
      toast({
        title: "Not Live Yet",
        description: "The host hasn't started the live session yet.",
        variant: "destructive"
      })
      return
    }

    if (!isPlaying) {
      try {
        await initializeAudioStream()
        setIsPlaying(true)
        
        // Only update viewer count if we have a live session
        if (liveSession?.id) {
          const { error } = await supabase.rpc('update_viewer_count_secure', {
            session_id_param: liveSession.id,
            new_count: (liveSession.viewer_count || 0) + 1
          })
          if (error) console.error('Error updating viewer count:', error)
        }

      } catch (error) {
        console.error('Error starting stream:', error)
        toast({
          title: "Error",
          description: "Failed to connect to live stream",
          variant: "destructive"
        })
      }
    } else {
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      
      if (liveSession?.id) {
        const { error } = await supabase.rpc('update_viewer_count_secure', {
          session_id_param: liveSession.id,
          new_count: Math.max(0, (liveSession.viewer_count || 1) - 1)
        })
        if (error) console.error('Error updating viewer count:', error)
      }
    }
  }

  const initializeAudioStream = async () => {
    try {
      // Fetch playlist and play the first track directly
      if (playlistTracks.length > 0 && currentTrack) {
        await playCurrentTrackAudio(currentTrack)
      } else if (playlistTracks.length > 0) {
        const firstTrack = playlistTracks[0]
        setCurrentTrack(firstTrack)
        await playCurrentTrackAudio(firstTrack)
      } else {
        // Need to fetch playlist first, then play
        await fetchPlaylistAndPlay()
      }
      
      console.log('[Listener] Audio stream initialized')
      
    } catch (error) {
      console.error('Error initializing audio stream:', error)
      throw error
    }
  }

  const fetchPlaylistAndPlay = async () => {
    try {
      if (!currentShow?.schedule_id) {
        console.warn('[Listener] No schedule_id on currentShow')
        return
      }

      const { data: sched } = await supabase
        .from('radio_schedule')
        .select('id, playlist_id, dj_id')
        .eq('id', currentShow.schedule_id)
        .maybeSingle()

      let tracks = []

      if (sched?.playlist_id) {
        const { data: ptData } = await supabase
          .from('dj_playlist_tracks')
          .select(`
            track_order,
            dj_music_tracks (id, track_title, artist_name, duration_seconds, genre, file_url, price)
          `)
          .eq('playlist_id', sched.playlist_id)
          .eq('is_active', true)
          .order('track_order')

        tracks = (ptData || [])
          .sort((a, b) => a.track_order - b.track_order)
          .map(pt => pt.dj_music_tracks)
          .filter(Boolean)
      }

      if (tracks.length === 0 && sched?.dj_id) {
        const { data: djTracks } = await supabase
          .from('dj_music_tracks')
          .select('id, track_title, artist_name, duration_seconds, genre, file_url, price')
          .eq('dj_id', sched.dj_id)
          .eq('is_public', true)
          .order('upload_date', { ascending: false })

        tracks = djTracks || []
      }

      console.log('[Listener] Fetched tracks:', tracks.length)
      setPlaylistTracks(tracks)

      if (tracks.length > 0) {
        const firstTrack = tracks[0]
        setCurrentTrack(firstTrack)
        await playCurrentTrackAudio(firstTrack)
      } else {
        toast({ title: "No Music", description: "No tracks available for this slot.", variant: "destructive" })
      }
    } catch (e) {
      console.error('[Listener] fetchPlaylistAndPlay failed:', e)
    }
  }

  const playCurrentTrackAudio = async (track) => {
    if (!track?.file_url || !audioRef.current) return
    try {
      const resolvedUrl = await resolveAudioUrl(track.file_url, { bucketForKeys: 'dj-music' })
      console.log('[Listener] Playing:', track.track_title, resolvedUrl?.substring(0, 80))
      audioRef.current.src = resolvedUrl
      audioRef.current.load()
      await audioRef.current.play()
      console.log(`[Listener] ✅ Now playing: ${track.track_title}`)
      toast({ title: "Now Playing", description: `${track.track_title} by ${track.artist_name}` })
    } catch (playError) {
      if (playError?.name === 'NotAllowedError') {
        toast({ title: "Tap Play", description: "Click play to start the music" })
      } else {
        console.error('[Listener] Playback error:', playError)
        toast({ title: "Playback Error", description: "Could not play track", variant: "destructive" })
      }
    }
  }

  const fetchPlaylistForCurrentShow = async () => {
    try {
      if (!currentShow?.schedule_id) return

      // First get the schedule's playlist_id directly (avoids deep nested query timeout)
      const { data: sched, error } = await supabase
        .from('radio_schedule')
        .select('id, playlist_id, dj_id')
        .eq('id', currentShow.schedule_id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching schedule:', error)
        return
      }

      let tracks = []

      // Use playlist_id if available
      if (sched?.playlist_id) {
        const { data: ptData } = await supabase
          .from('dj_playlist_tracks')
          .select(`
            track_order,
            dj_music_tracks (id, track_title, artist_name, duration_seconds, genre, file_url, price)
          `)
          .eq('playlist_id', sched.playlist_id)
          .eq('is_active', true)
          .order('track_order')

        tracks = (ptData || [])
          .sort((a, b) => a.track_order - b.track_order)
          .map(pt => pt.dj_music_tracks)
          .filter(Boolean)
      }

      // Fallback: get all DJ tracks
      if (tracks.length === 0 && sched?.dj_id) {
        const { data: djTracks } = await supabase
          .from('dj_music_tracks')
          .select('id, track_title, artist_name, duration_seconds, genre, file_url, price')
          .eq('dj_id', sched.dj_id)
          .eq('is_public', true)
          .order('upload_date', { ascending: false })

        tracks = djTracks || []
      }

      setPlaylistTracks(tracks)
      if (!currentTrack && tracks.length > 0) setCurrentTrack(tracks[0])
    } catch (e) {
      console.error('Playlist preload failed:', e)
    }
  }

  const createAutomatedSessionForCurrentShow = async () => {
    try {
      if (!currentShow?.schedule_id) return

      // Get the schedule's playlist_id directly
      const { data: schedData } = await supabase
        .from('radio_schedule')
        .select('playlist_id, dj_id')
        .eq('id', currentShow.schedule_id)
        .single()

      let playlistId = schedData?.playlist_id

      // If no playlist_id on schedule, get DJ's first playlist
      if (!playlistId && schedData?.dj_id) {
        const { data: plData } = await supabase
          .from('dj_playlists')
          .select('id')
          .eq('dj_id', schedData.dj_id)
          .limit(1)
          .maybeSingle()
        playlistId = plData?.id
      }

      if (!playlistId) {
        toast({
          title: "No Playlist Found",
          description: "DJ hasn't uploaded any music yet",
          variant: "destructive"
        })
        return
      }

      // Create automated session
      const { data: newSession, error } = await supabase
        .from('radio_automated_sessions')
        .insert({
          session_id: liveSession.id,
          schedule_id: currentShow.schedule_id,
          playlist_id: playlistId,
          session_type: 'automated',
          playback_status: 'playing',
          current_track_index: 0,
          track_started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log('[Listener] Created automated session:', newSession)
      
      // Now fetch and play the track
      await fetchAndPlayCurrentTrack()
      
    } catch (error) {
      console.error('[Listener] Error creating automated session:', error)
      toast({
        title: "Setup Error",
        description: "Failed to set up music playback",
        variant: "destructive"
      })
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const handleGuestRequest = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to request guest access",
        variant: "destructive"
      })
      return
    }
    
    setShowGuestModal(true)
  }

  const sendHeartReaction = async () => {
    // In a real implementation, you'd send this to other listeners
    toast({
      title: "❤️",
      description: "Sent love to the hosts!",
    })
  }

  return (
    <div className="space-y-6">
      {/* Live Stream Player */}
      <Card className="border-red-500 bg-gradient-to-r from-red-50 to-pink-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${liveSession ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
              <Badge variant={liveSession || isPreRecorded ? 'destructive' : 'secondary'} className="text-sm font-medium">
                {liveSession ? 'LIVE' : isPreRecorded ? 'AUTO-PLAY' : 'Scheduled'}
              </Badge>
              {liveSession && (
                <span className="text-sm text-muted-foreground">
                  {viewerCount} listening
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{currentShow?.show_name || 'AOD Station Live'}</h2>
              <p className="text-muted-foreground">
                with {activeHosts.filter(h => h.role === 'main_host')[0]?.radio_djs?.dj_name || currentShow?.dj_name || 'AOD Station'}
              </p>
            </div>

            {/* Audio Player Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                className={isPlaying ? "bg-red-500 hover:bg-red-600" : ""}
                disabled={!isPreRecorded && (!liveSession || !liveSession.id)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 mr-2" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                {isPlaying ? 'Pause' : 'Listen Live'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Volume Control */}
            {isPlaying && (
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <VolumeX className="h-4 w-4 text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <audio 
              ref={audioRef} 
              controls={false}
              loop={false}
              preload="auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Hosts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Live Hosts ({activeHosts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeHosts.map((host) => (
              <div key={host.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Radio className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {host.radio_djs?.dj_name || host.profiles?.display_name || 'Host'}
                    </span>
                    <Badge variant={host.role === 'main_host' ? 'default' : 'secondary'} className="text-xs">
                      {host.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {host.audio_enabled ? (
                      <Mic className="h-3 w-3 text-green-500" />
                    ) : (
                      <MicOff className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {host.audio_enabled ? 'Active' : 'Muted'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listener Actions */}
      {liveSession?.status === 'live' && (
        <Card>
          <CardHeader>
            <CardTitle>Join the Show</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={handleGuestRequest}
                disabled={hasRequestedGuest}
                className="flex-1"
              >
                <Hand className="h-4 w-4 mr-2" />
                {hasRequestedGuest ? 'Request Sent' : 'Request to Speak'}
              </Button>
              <Button
                variant="outline"
                onClick={sendHeartReaction}
              >
                <Heart className="h-4 w-4 mr-2" />
                Send Love
              </Button>
            </div>
            {hasRequestedGuest && (
              <p className="text-sm text-muted-foreground mt-2">
                Your guest request is pending. The hosts will review it shortly.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Music Purchase Interface */}
      <MusicPurchaseInterface 
        tracks={playlistTracks}
        currentTrack={currentTrack}
      />

      {/* Guest Request Modal */}
      <GuestRequestModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        liveSession={liveSession}
      />
    </div>
  )
}