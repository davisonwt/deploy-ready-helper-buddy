import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users, 
  UserPlus, 
  UserMinus, 
  Volume2, 
  VolumeX,
  Radio,
  Settings,
  MessageSquare,
  Hand,
  PhoneCall,
  PhoneOff,
  Square,
  Send,
  Play,
  Pause
} from 'lucide-react'
import RadioModerationPanel from '@/components/radio/RadioModerationPanel'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import RadioModerationPanel from './RadioModerationPanel'

export function LiveStreamInterface({ djProfile, currentShow, onEndShow }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLive, setIsLive] = useState(false)
  const [liveSession, setLiveSession] = useState(null)
  const [activeHosts, setActiveHosts] = useState([])
  const [guestRequests, setGuestRequests] = useState([])
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [currentGuest, setCurrentGuest] = useState(null)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [messages, setMessages] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  
  const audioRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    if (currentShow && djProfile) {
      initializeLiveSession()
      setupRealtimeSubscriptions()
    }
    
    return () => {
      cleanupConnections()
    }
  }, [currentShow, djProfile])

  const initializeLiveSession = async () => {
    if (!currentShow?.schedule_id) return

    try {
      const { data: sessionId, error } = await supabase.rpc('get_or_create_live_session', {
        schedule_id_param: currentShow.schedule_id
      })

      if (error) throw error

      // Fetch session details using secure view (excludes session tokens)
      const { data: session, error: sessionError } = await supabase
        .from('radio_sessions_public')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      setLiveSession(session)
      setIsLive(session.status === 'live')
      setViewerCount(session.viewer_count || 0)

      // Add current user as main host
      await joinAsHost('main_host')
      
    } catch (error) {
      console.error('Error initializing live session:', error)
      toast({
        title: "Error",
        description: "Failed to initialize live session",
        variant: "destructive"
      })
    }
  }

  const setupRealtimeSubscriptions = () => {
    if (!liveSession) return

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

    // Subscribe to guest requests
    const guestsSubscription = supabase
      .channel(`guest-requests-${liveSession.id}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'radio_guest_requests',
          filter: `session_id=eq.${liveSession.id}`
        },
        () => fetchGuestRequests()
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
          setLiveSession(prev => ({
            ...prev,
            status: payload.new.status,
            viewer_count: payload.new.viewer_count,
            started_at: payload.new.started_at,
            ended_at: payload.new.ended_at,
            updated_at: payload.new.updated_at
          }))
          setViewerCount(payload.new.viewer_count || 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(hostsSubscription)
      supabase.removeChannel(guestsSubscription)
      supabase.removeChannel(sessionSubscription)
    }
  }

  const fetchActiveHosts = async () => {
    if (!liveSession) return

    try {
      const { data, error } = await supabase
        .from('radio_live_hosts')
        .select(`
          *,
          radio_djs (dj_name, avatar_url),
          profiles:user_id (display_name)
        `)
        .eq('session_id', liveSession.id)
        .eq('is_active', true)

      if (error) throw error
      setActiveHosts(data || [])
    } catch (error) {
      console.error('Error fetching active hosts:', error)
    }
  }

  const fetchGuestRequests = async () => {
    if (!liveSession) return

    try {
      const { data, error } = await supabase
        .from('radio_guest_requests')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('session_id', liveSession.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error
      setGuestRequests(data || [])
    } catch (error) {
      console.error('Error fetching guest requests:', error)
    }
  }

  const joinAsHost = async (role = 'co_host') => {
    if (!liveSession || !djProfile) return

    try {
      const { error } = await supabase
        .from('radio_live_hosts')
        .insert({
          session_id: liveSession.id,
          dj_id: djProfile.id,
          user_id: user.id,
          role: role
        })

      if (error && !error.message.includes('duplicate')) throw error
      await fetchActiveHosts()
    } catch (error) {
      console.error('Error joining as host:', error)
      if (!error.message.includes('duplicate')) {
        toast({
          title: "Error",
          description: "Failed to join as host",
          variant: "destructive"
        })
      }
    }
  }

  const startLiveStream = async () => {
    try {
      // Initialize WebRTC and audio
      await initializeWebRTC()
      
      // Update session status (only authorized users can do this directly)
      const { error } = await supabase
        .from('radio_live_sessions')
        .update({ 
          status: 'live',
          started_at: new Date().toISOString()
        })
        .eq('id', liveSession.id)

      if (error) throw error

      setIsLive(true)
      toast({
        title: "🔴 Live!",
        description: "You're now broadcasting live to AOD Station!",
      })

    } catch (error) {
      console.error('Error starting live stream:', error)
      toast({
        title: "Error",
        description: "Failed to start live stream",
        variant: "destructive"
      })
    }
  }

  const endLiveStream = async () => {
    try {
      cleanupConnections()

      // Update session status (only authorized users can do this directly)
      const { error } = await supabase
        .from('radio_live_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', liveSession.id)

      if (error) throw error

      // Update all hosts to inactive
      await supabase
        .from('radio_live_hosts')
        .update({ 
          is_active: false,
          left_at: new Date().toISOString()
        })
        .eq('session_id', liveSession.id)

      setIsLive(false)
      onEndShow?.()
      
      toast({
        title: "Stream Ended",
        description: "Live stream has been ended successfully",
      })

    } catch (error) {
      console.error('Error ending live stream:', error)
      toast({
        title: "Error",
        description: "Failed to end live stream",
        variant: "destructive"
      })
    }
  }

  const initializeWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: videoEnabled
      })

      localStreamRef.current = stream

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      })

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream)
      })

      // Handle audio output
      if (audioRef.current) {
        audioRef.current.srcObject = stream
      }

      // Initialize WebSocket for live streaming
      initializeWebSocket()

    } catch (error) {
      console.error('Error initializing WebRTC:', error)
      throw error
    }
  }

  const initializeWebSocket = () => {
    try {
      wsRef.current = new WebSocket(`wss://zuwkgasbkpjlxzsjzumu.functions.supabase.co/functions/v1/grove-station-stream`)
      
      wsRef.current.onopen = () => {
        console.log('Connected to AOD Station streaming server')
        
        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are the AI co-host for AOD Station, helping DJ ${djProfile?.dj_name} with their show "${currentShow?.show_name}".`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16'
          }
        }
        
        wsRef.current.send(JSON.stringify(sessionConfig))
      }

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        toast({
          title: "Connection Error",
          description: "Lost connection to streaming server",
          variant: "destructive"
        })
      }

    } catch (error) {
      console.error('Error initializing WebSocket:', error)
    }
  }

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'listener_update':
        setViewerCount(data.count)
        break
        
      case 'listener_message':
        setMessages(prev => [...prev, {
          id: data.id,
          type: 'listener',
          content: data.message,
          author: data.author,
          timestamp: new Date(data.timestamp)
        }])
        break
    }
  }

  const cleanupConnections = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setAudioEnabled(audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setVideoEnabled(videoTrack.enabled)
      }
    }
  }

  const approveGuestRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('radio_guest_requests')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      toast({
        title: "Guest Approved",
        description: "Guest request has been approved",
      })

      await fetchGuestRequests()
    } catch (error) {
      console.error('Error approving guest:', error)
      toast({
        title: "Error",
        description: "Failed to approve guest request",
        variant: "destructive"
      })
    }
  }

  const rejectGuestRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('radio_guest_requests')
        .update({ 
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      await fetchGuestRequests()
    } catch (error) {
      console.error('Error rejecting guest:', error)
    }
  }

  const removeHost = async (hostId) => {
    try {
      const { error } = await supabase
        .from('radio_live_hosts')
        .update({ 
          is_active: false,
          left_at: new Date().toISOString()
        })
        .eq('id', hostId)

      if (error) throw error
      await fetchActiveHosts()
    } catch (error) {
      console.error('Error removing host:', error)
    }
  }

  const sendChatMessage = () => {
    if (!chatMessage.trim()) return
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'dj_message',
        message: chatMessage,
        dj_name: djProfile?.dj_name
      }))
    }
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'dj',
      content: chatMessage,
      timestamp: new Date()
    }])
    
    setChatMessage('')
  }

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <Card className={isLive ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
              <Avatar className="h-12 w-12">
                <AvatarImage src={djProfile?.avatar_url} />
                <AvatarFallback>
                  <Mic className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={isLive ? "default" : "secondary"}>
                    {isLive ? "🔴 LIVE" : "📡 READY"}
                  </Badge>
                  <Badge variant="outline">{currentShow?.category}</Badge>
                </div>
                <h3 className="font-semibold text-lg">{currentShow?.show_name}</h3>
                <p className="text-sm text-muted-foreground">
                  DJ {djProfile?.dj_name} • {viewerCount} listeners • {activeHosts.length} hosts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isLive ? (
                <Button onClick={startLiveStream} className="bg-red-500 hover:bg-red-600">
                  <Radio className="h-4 w-4 mr-2" />
                  Go Live
                </Button>
              ) : (
                <Button onClick={endLiveStream} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  End Stream
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audio Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant={audioEnabled ? "default" : "destructive"}
                size="sm"
                onClick={toggleAudio}
              >
                {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {audioEnabled ? 'Mute' : 'Unmute'}
              </Button>
              <Button
                variant={videoEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleVideo}
              >
                {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                {videoEnabled ? 'Video On' : 'Video Off'}
              </Button>
            </div>
            <audio ref={audioRef} autoPlay muted />
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Audio Quality:</span>
                <Badge variant="outline">24kHz • PCM16</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Status:</span>
                <Badge variant={isLive ? "default" : "secondary"}>
                  {isLive ? "Broadcasting" : "Offline"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Hosts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Hosts ({activeHosts.length}/3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeHosts.map((host) => (
                <div key={host.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={host.role === 'main_host' ? 'default' : 'secondary'}>
                      {host.role.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm">
                      {host.radio_djs?.dj_name || host.profiles?.display_name || 'Unknown'}
                    </span>
                    {host.audio_enabled ? 
                      <Mic className="h-3 w-3 text-green-500" /> : 
                      <MicOff className="h-3 w-3 text-red-500" />
                    }
                  </div>
                  {host.role !== 'main_host' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHost(host.id)}
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guest Requests */}
      {guestRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              Guest Requests ({guestRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {guestRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">
                      {request.profiles?.display_name || 'Anonymous Listener'}
                    </p>
                    {request.request_message && (
                      <p className="text-sm text-muted-foreground">
                        "{request.request_message}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveGuestRequest(request.id)}
                    >
                      <PhoneCall className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectGuestRequest(request.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radio Moderation Panel - Enhanced Management */}
      {liveSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Heretic Management - Live Session Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioModerationPanel
              liveSession={liveSession}
              djProfile={djProfile}
              activeHosts={activeHosts}
              guestRequests={guestRequests}
              onHostsUpdate={fetchActiveHosts}
              onGuestRequestsUpdate={fetchGuestRequests}
            />
          </CardContent>
        </Card>
      )}

      {/* Live Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Live Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-48 overflow-y-auto border rounded p-3 space-y-2">
            {messages.map((message) => (
              <div key={message.id} className="text-sm">
                <div className="flex items-start gap-2">
                  <Badge 
                    variant={message.type === 'dj' ? 'default' : 'outline'} 
                    className="text-xs"
                  >
                    {message.type === 'dj' ? 'DJ' : 'LISTENER'}
                  </Badge>
                  <div className="flex-1">
                    <p>{message.content}</p>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Chat messages will appear here</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Input
              placeholder="Send a message to listeners..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              className="flex-1"
            />
            <Button 
              onClick={sendChatMessage}
              disabled={!chatMessage.trim() || !isLive}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
  
  // ... keep existing code (remaining content truncated for brevity)