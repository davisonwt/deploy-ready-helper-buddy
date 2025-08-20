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
  
  const audioRef = useRef(null)
  const peerConnectionRef = useRef(null)

  useEffect(() => {
    if (liveSession) {
      fetchActiveHosts()
      setupRealtimeSubscriptions()
      setViewerCount(liveSession.viewer_count || 0)
    }

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [liveSession])

  useEffect(() => {
    if (user && liveSession) {
      checkExistingGuestRequest()
    }
  }, [user, liveSession])

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

    // Subscribe to session updates
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
          setViewerCount(payload.new.viewer_count || 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(hostsSubscription)
      supabase.removeChannel(sessionSubscription)
    }
  }

  const togglePlayPause = async () => {
    if (!isPlaying) {
      try {
        await initializeAudioStream()
        setIsPlaying(true)
        
        // Increment viewer count
        await supabase
          .from('radio_live_sessions')
          .update({ 
            viewer_count: (liveSession.viewer_count || 0) + 1 
          })
          .eq('id', liveSession.id)

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
      
      // Decrement viewer count
      await supabase
        .from('radio_live_sessions')
        .update({ 
          viewer_count: Math.max(0, (liveSession.viewer_count || 1) - 1)
        })
        .eq('id', liveSession.id)
    }
  }

  const initializeAudioStream = async () => {
    try {
      // Create peer connection for receiving audio
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      // Handle incoming audio stream
      peerConnectionRef.current.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0]
        }
      }

      // For demo purposes, we'll simulate the connection
      // In a real implementation, you'd connect to the actual stream
      console.log('Audio stream initialized')
      
    } catch (error) {
      console.error('Error initializing audio stream:', error)
      throw error
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
              <h2 className="text-2xl font-bold">{currentShow?.show_name || 'Grove Station Live'}</h2>
              <p className="text-muted-foreground">
                with {activeHosts.filter(h => h.role === 'main_host')[0]?.radio_djs?.dj_name || 'Grove Station'}
              </p>
            </div>

            {/* Audio Player Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                className={isPlaying ? "bg-red-500 hover:bg-red-600" : ""}
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

            <audio ref={audioRef} />
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

      {/* Guest Request Modal */}
      <GuestRequestModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        liveSession={liveSession}
      />
    </div>
  )
}