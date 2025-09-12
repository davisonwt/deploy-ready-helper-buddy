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

export function LiveStreamListener({ liveSession, currentShow }) {
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
          radio_djs (dj_name, avatar_url),
          profiles:user_id (display_name, avatar_url)
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
        .single()

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

  const togglePlayPause = async () => {
    // Hard guard to prevent undefined liveSession usage
    if (!liveSession || !liveSession.id) {
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
        
        // Increment viewer count using secure function
        const { error } = await supabase.rpc('update_viewer_count_secure', {
          session_id_param: liveSession.id,
          new_count: (liveSession.viewer_count || 0) + 1
        })
        
        if (error) {
          console.error('Error updating viewer count:', error)
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
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      
      // Decrement viewer count using secure function
      const { error } = await supabase.rpc('update_viewer_count_secure', {
        session_id_param: liveSession.id,
        new_count: Math.max(0, (liveSession.viewer_count || 1) - 1)
      })
      
      if (error) {
        console.error('Error updating viewer count:', error)
      }
    }
  }

  const initializeAudioStream = async () => {
    try {
      // Instead of WebRTC, let's fetch and play the actual music tracks
      await fetchAndPlayCurrentTrack()
      
      console.log('Audio stream initialized - playing music tracks')
      
    } catch (error) {
      console.error('Error initializing audio stream:', error)
      throw error
    }
  }

  const fetchAndPlayCurrentTrack = async () => {
    try {
      // Get the automated session for this live session
      const { data: automatedSession, error: sessionError } = await supabase
        .from('radio_automated_sessions')
        .select(`
          *,
          dj_playlists (
            *,
            dj_playlist_tracks (
              track_order,
              dj_music_tracks (
                id,
                track_title,
                artist_name,
                duration_seconds,
                file_url
              )
            )
          )
        `)
        .eq('session_id', liveSession.id)
        .eq('playback_status', 'playing')
        .maybeSingle()

      if (sessionError) {
        console.log('No automated session found, creating one...')
        // If no automated session exists, try to create one
        await createAutomatedSessionForCurrentShow()
        return
      }

      if (automatedSession && automatedSession.dj_playlists) {
        const tracks = automatedSession.dj_playlists.dj_playlist_tracks
          ?.sort((a, b) => a.track_order - b.track_order)
          ?.map(pt => pt.dj_music_tracks) || []

        setPlaylistTracks(tracks) // Store tracks for purchase interface

        if (tracks.length > 0) {
          const currentTrackIndex = automatedSession.current_track_index || 0
          const currentTrack = tracks[currentTrackIndex]
          
          setCurrentTrack(currentTrack) // Store current track for purchase interface
          
          if (currentTrack?.file_url && audioRef.current) {
            audioRef.current.src = currentTrack.file_url
            audioRef.current.load()
            
            // Auto-play the track
            try {
              await audioRef.current.play()
              console.log(`Now playing: ${currentTrack.track_title} by ${currentTrack.artist_name}`)
              
              toast({
                title: "Now Playing",
                description: `${currentTrack.track_title} by ${currentTrack.artist_name}`,
              })
            } catch (playError) {
              console.error('Error playing track:', playError)
              toast({
                title: "Autoplay Blocked",
                description: "Click play to start the music - browser autoplay policy",
                variant: "destructive"
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current track:', error)
    }
  }

  const fetchPlaylistForCurrentShow = async () => {
    try {
      if (!currentShow?.schedule_id) return
      const { data: sched, error } = await supabase
        .from('radio_schedule')
        .select(`
          id,
          radio_djs (
            id,
            dj_playlists (
              id,
              playlist_name,
              dj_playlist_tracks (
                track_order,
                dj_music_tracks (
                  id,
                  track_title,
                  artist_name,
                  duration_seconds,
                  genre,
                  file_url
                )
              )
            )
          )
        `)
        .eq('id', currentShow.schedule_id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching playlist for show:', error)
        return
      }

      const playlists = sched?.radio_djs?.dj_playlists || []
      if (playlists.length === 0) return

      const pl = playlists[0]
      const tracks = (pl.dj_playlist_tracks || [])
        .sort((a, b) => a.track_order - b.track_order)
        .map(pt => pt.dj_music_tracks)
        .filter(Boolean)

      setPlaylistTracks(tracks)
      if (!currentTrack && tracks.length > 0) setCurrentTrack(tracks[0])
    } catch (e) {
      console.error('Playlist preload failed:', e)
    }
  }

  const createAutomatedSessionForCurrentShow = async () => {
    try {
      if (!currentShow?.schedule_id) return

      // Get the DJ's default playlist
      const { data: djData } = await supabase
        .from('radio_schedule')
        .select(`
          radio_djs (
            id,
            dj_playlists (
              id,
              playlist_name
            )
          )
        `)
        .eq('id', currentShow.schedule_id)
        .single()

      const djPlaylists = djData?.radio_djs?.dj_playlists || []
      if (djPlaylists.length === 0) {
        toast({
          title: "No Playlist Found",
          description: "DJ hasn't uploaded any music yet",
          variant: "destructive"
        })
        return
      }

      // Use the first available playlist
      const playlist = djPlaylists[0]

      // Create automated session
      const { data: newSession, error } = await supabase
        .from('radio_automated_sessions')
        .insert({
          session_id: liveSession.id,
          schedule_id: currentShow.schedule_id,
          playlist_id: playlist.id,
          session_type: 'automated',
          playback_status: 'playing',
          current_track_index: 0,
          track_started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log('Created automated session:', newSession)
      
      // Now fetch and play the track
      await fetchAndPlayCurrentTrack()
      
    } catch (error) {
      console.error('Error creating automated session:', error)
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
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <Badge variant="destructive" className="text-sm font-medium">
                LIVE
              </Badge>
              <span className="text-sm text-muted-foreground">
                {viewerCount} listening
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{currentShow?.show_name || 'AOD Station Live'}</h2>
              <p className="text-muted-foreground">
                with {activeHosts.filter(h => h.role === 'main_host')[0]?.radio_djs?.dj_name || 'AOD Station'}
              </p>
            </div>

            {/* Audio Player Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                className={isPlaying ? "bg-red-500 hover:bg-red-600" : ""}
                disabled={!liveSession || !liveSession.id}
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
              onEnded={() => {
                // Auto-advance to next track when current ends
                console.log('Track ended, should advance to next')
                setIsPlaying(false)
              }}
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