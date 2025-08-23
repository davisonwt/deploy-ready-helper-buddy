import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  UserPlus,
  MessageCircle,
  Phone,
  PhoneOff,
  Heart,
  Gift,
  Camera,
  Volume2,
  VolumeX,
  Share,
  Hand,
  Crown,
  Shield,
  Clock,
  Send,
  ThumbsUp,
  Star,
  Settings,
  MoreHorizontal,
  UserX,
  UserCheck
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function ComprehensiveLiveSession({ 
  sessionData, 
  sessionType = 'chat', 
  onEndSession, 
  onLeaveSession 
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Core state
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [callQueue, setCallQueue] = useState([])
  const [guestRequests, setGuestRequests] = useState([])
  
  // UI state
  const [newMessage, setNewMessage] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [showQueue, setShowQueue] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  
  // Session info
  const [isHost, setIsHost] = useState(false)
  const [sessionInfo, setSessionInfo] = useState(null)
  const chatRef = useRef(null)

  // Initialize session and check permissions
  useEffect(() => {
    if (sessionData && user) {
      initializeSession()
      checkHostPermissions()
      setupRealtimeSubscriptions()
      fetchInitialData()
    }

    return () => {
      cleanupSubscriptions()
    }
  }, [sessionData, user])

  const initializeSession = async () => {
    try {
      // Determine session type and setup accordingly
      if (sessionType === 'radio') {
        await initializeRadioSession()
      } else if (sessionType === 'chat') {
        await initializeChatSession()
      } else {
        await initializeGenericSession()
      }
    } catch (error) {
      console.error('Error initializing session:', error)
    }
  }

  const initializeRadioSession = async () => {
    // For radio sessions, integrate with existing radio infrastructure
    setSessionInfo({
      id: sessionData.id,
      title: sessionData.title || 'Live Radio Session',
      type: 'radio',
      created_by: sessionData.created_by
    })
  }

  const initializeChatSession = async () => {
    setSessionInfo({
      id: sessionData.room_id || sessionData.id,
      title: sessionData.name || sessionData.title || 'Live Chat Session',
      type: 'chat',
      created_by: sessionData.created_by
    })
  }

  const initializeGenericSession = async () => {
    setSessionInfo({
      id: sessionData.id,
      title: sessionData.title || 'Live Session',
      type: 'generic',
      created_by: sessionData.created_by
    })
  }

  const checkHostPermissions = () => {
    const isSessionHost = sessionData.created_by === user?.id
    const isAdmin = user?.app_metadata?.role === 'admin' || user?.app_metadata?.role === 'gosat'
    setIsHost(isSessionHost || isAdmin)
  }

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchParticipants(),
        fetchMessages(),
        fetchCallQueue(),
        fetchGuestRequests(),
        updateViewerCount()
      ])
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  const fetchParticipants = async () => {
    // Mock participants for now - replace with real data
    const mockParticipants = [
      {
        id: '1',
        user_id: user?.id,
        display_name: user?.user_metadata?.display_name || 'You',
        avatar_url: user?.user_metadata?.avatar_url,
        role: isHost ? 'host' : 'participant',
        is_video_enabled: true,
        is_audio_enabled: true,
        joined_at: new Date(),
        is_speaking: false
      }
    ]
    setParticipants(mockParticipants)
  }

  const fetchMessages = async () => {
    if (sessionType === 'radio' && sessionData.id) {
      try {
        const { data, error } = await supabase
          .from('radio_live_messages')
          .select(`
            *,
            profiles:sender_id (display_name, avatar_url)
          `)
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) throw error
        setMessages(data || [])
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }
  }

  const fetchCallQueue = async () => {
    if (sessionType === 'radio' && sessionData.id) {
      try {
        const { data, error } = await supabase
          .from('radio_call_queue')
          .select(`
            *,
            profiles:user_id (display_name, avatar_url)
          `)
          .eq('session_id', sessionData.id)
          .eq('status', 'waiting')
          .order('created_at', { ascending: true })

        if (error) throw error
        setCallQueue(data || [])
      } catch (error) {
        console.error('Error fetching call queue:', error)
      }
    }
  }

  const fetchGuestRequests = async () => {
    if (sessionType === 'radio' && sessionData.id) {
      try {
        const { data, error } = await supabase
          .from('radio_guest_requests')
          .select(`
            *,
            profiles:user_id (display_name, avatar_url)
          `)
          .eq('session_id', sessionData.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (error) throw error
        setGuestRequests(data || [])
      } catch (error) {
        console.error('Error fetching guest requests:', error)
      }
    }
  }

  const updateViewerCount = async () => {
    // Mock viewer count - replace with real-time data
    setViewerCount(Math.floor(Math.random() * 500) + 50)
  }

  const setupRealtimeSubscriptions = () => {
    // Set up real-time subscriptions for messages, queue, etc.
    if (sessionType === 'radio' && sessionData.id) {
      // Messages subscription
      const messagesChannel = supabase
        .channel(`radio-messages-${sessionData.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'radio_live_messages',
          filter: `session_id=eq.${sessionData.id}`
        }, () => {
          fetchMessages()
        })
        .subscribe()

      // Queue subscription
      const queueChannel = supabase
        .channel(`radio-queue-${sessionData.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'radio_call_queue',
          filter: `session_id=eq.${sessionData.id}`
        }, () => {
          fetchCallQueue()
        })
        .subscribe()

      // Guest requests subscription
      const requestsChannel = supabase
        .channel(`radio-requests-${sessionData.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'radio_guest_requests',
          filter: `session_id=eq.${sessionData.id}`
        }, () => {
          fetchGuestRequests()
        })
        .subscribe()
    }
  }

  const cleanupSubscriptions = () => {
    // Clean up all subscriptions
    supabase.removeAllChannels()
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionInfo) return

    try {
      if (sessionType === 'radio') {
        const { error } = await supabase
          .from('radio_live_messages')
          .insert({
            session_id: sessionInfo.id,
            sender_id: user.id,
            message: newMessage.trim(),
            message_type: 'text'
          })

        if (error) throw error
      }

      // Add to local messages immediately for responsiveness
      const newMsg = {
        id: Date.now().toString(),
        sender_id: user.id,
        message: newMessage.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          display_name: user.user_metadata?.display_name || 'You',
          avatar_url: user.user_metadata?.avatar_url
        }
      }
      setMessages(prev => [...prev, newMsg])
      setNewMessage('')

      // Scroll to bottom
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const requestToSpeak = async () => {
    if (!sessionInfo) return

    try {
      if (sessionType === 'radio') {
        const { error } = await supabase
          .from('radio_guest_requests')
          .insert({
            session_id: sessionInfo.id,
            user_id: user.id,
            request_message: requestMessage.trim() || 'I would like to speak',
            status: 'pending'
          })

        if (error) throw error
      }

      toast({
        title: "Request Sent",
        description: "Your request to speak has been sent to the host",
      })
      setRequestMessage('')
    } catch (error) {
      console.error('Error sending request:', error)
      toast({
        title: "Error",
        description: "Failed to send request",
        variant: "destructive"
      })
    }
  }

  const joinCallQueue = async () => {
    if (!sessionInfo) return

    try {
      if (sessionType === 'radio') {
        const { error } = await supabase
          .from('radio_call_queue')
          .insert({
            session_id: sessionInfo.id,
            user_id: user.id,
            topic: requestMessage.trim() || 'General discussion',
            status: 'waiting'
          })

        if (error) throw error
      }

      toast({
        title: "Joined Queue",
        description: "You've been added to the call queue",
      })
      setRequestMessage('')
    } catch (error) {
      console.error('Error joining queue:', error)
      toast({
        title: "Error",
        description: "Failed to join queue",
        variant: "destructive"
      })
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
        title: "Request Approved",
        description: "Guest has been approved to join",
      })
    } catch (error) {
      console.error('Error approving request:', error)
    }
  }

  const approveCallQueueEntry = async (queueId) => {
    try {
      const { error } = await supabase
        .from('radio_call_queue')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', queueId)

      if (error) throw error

      toast({
        title: "Call Approved",
        description: "Caller has been approved to join",
      })
    } catch (error) {
      console.error('Error approving call:', error)
    }
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    toast({
      title: isVideoEnabled ? "Camera turned off" : "Camera turned on",
      duration: 2000
    })
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    toast({
      title: isAudioEnabled ? "Microphone muted" : "Microphone unmuted",
      duration: 2000
    })
  }

  const sendReaction = (reaction) => {
    toast({
      title: `${reaction} sent!`,
      duration: 1000
    })
  }

  const endOrLeaveSession = () => {
    if (isHost) {
      onEndSession?.()
    } else {
      onLeaveSession?.()
    }
  }

  const hostParticipant = participants.find(p => p.role === 'host')
  const otherParticipants = participants.filter(p => p.role !== 'host')

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={sessionData.image_url} />
              <AvatarFallback>
                {sessionInfo?.title?.[0] || 'L'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sm">{sessionInfo?.title || 'Live Session'}</h2>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                <span className="text-xs text-gray-300">{viewerCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Queue & Requests Controls for Host */}
          {isHost && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowQueue(!showQueue)}
                className={`text-white ${callQueue.length > 0 ? 'bg-orange-500/20' : ''}`}
              >
                <Phone className="h-4 w-4 mr-1" />
                Queue ({callQueue.length})
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowRequests(!showRequests)}
                className={`text-white ${guestRequests.length > 0 ? 'bg-blue-500/20' : ''}`}
              >
                <Hand className="h-4 w-4 mr-1" />
                Requests ({guestRequests.length})
              </Button>
            </>
          )}
          
          <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">{participants.length}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={endOrLeaveSession}>
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live Badge */}
      <div className="flex justify-center mb-4">
        <Badge className="bg-red-500 text-white px-3 py-1">
          🔴 LIVE - {sessionType.toUpperCase()}
        </Badge>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 px-4">
        {/* Host Video - Left Side */}
        <div className="flex-1 relative">
          <Card className="h-full bg-gradient-to-b from-blue-900/20 to-purple-600/20 border-blue-500/30 overflow-hidden">
            <div className="absolute top-2 left-2 z-10 flex gap-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                <Crown className="h-3 w-3 mr-1" />
                Host
              </Badge>
              {hostParticipant?.is_speaking && (
                <Badge className="bg-green-500 text-white">
                  <Mic className="h-3 w-3 mr-1" />
                  Speaking
                </Badge>
              )}
            </div>
            
            {/* Host Video/Avatar */}
            <div className="h-full flex items-center justify-center">
              {isVideoEnabled ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Camera className="h-16 w-16 text-white/50" />
                </div>
              ) : (
                <Avatar className="h-24 w-24">
                  <AvatarImage src={hostParticipant?.avatar_url} />
                  <AvatarFallback className="text-2xl">
                    {hostParticipant?.display_name?.[0] || 'H'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-white text-sm font-medium">
                {hostParticipant?.display_name || 'Host'}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side Panel */}
        <div className="w-80 flex flex-col gap-4">
          {/* Participants */}
          <Card className="bg-gray-900/50 border-gray-700 p-3">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Live Participants ({participants.length})
            </h3>
            <ScrollArea className="h-32">
              {otherParticipants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2 mb-2 p-2 bg-gray-800/30 rounded">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={participant.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {participant.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">{participant.display_name}</div>
                  {participant.is_audio_enabled ? (
                    <Mic className="h-3 w-3 text-green-500" />
                  ) : (
                    <MicOff className="h-3 w-3 text-red-500" />
                  )}
                </div>
              ))}
            </ScrollArea>
          </Card>

          {/* Queue Management (Host only) */}
          {isHost && showQueue && (
            <Card className="bg-orange-900/20 border-orange-500/30 p-3">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call Queue ({callQueue.length})
              </h3>
              <ScrollArea className="h-32">
                {callQueue.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2 mb-2 p-2 bg-orange-800/20 rounded">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={entry.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {entry.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm">{entry.profiles?.display_name}</div>
                      <div className="text-xs text-gray-400">{entry.topic}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => approveCallQueueEntry(entry.id)}
                      className="h-6 w-6 p-0"
                    >
                      <UserCheck className="h-3 w-3 text-green-500" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </Card>
          )}

          {/* Guest Requests (Host only) */}
          {isHost && showRequests && (
            <Card className="bg-blue-900/20 border-blue-500/30 p-3">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Hand className="h-4 w-4" />
                Guest Requests ({guestRequests.length})
              </h3>
              <ScrollArea className="h-32">
                {guestRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-2 mb-2 p-2 bg-blue-800/20 rounded">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={request.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {request.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm">{request.profiles?.display_name}</div>
                      <div className="text-xs text-gray-400">{request.request_message}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => approveGuestRequest(request.id)}
                      className="h-6 w-6 p-0"
                    >
                      <UserCheck className="h-3 w-3 text-green-500" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </Card>
          )}

          {/* Live Chat */}
          <Card className="bg-gray-900/50 border-gray-700 p-3 flex-1">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </h3>
            <ScrollArea className="h-32 mb-2" ref={chatRef}>
              {messages.map((msg) => (
                <div key={msg.id} className="mb-1 text-sm">
                  <span className="text-blue-400">{msg.profiles?.display_name || 'User'}</span>
                  <span className="ml-2 text-white">{msg.message}</span>
                </div>
              ))}
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-gray-800 border-gray-600 text-white text-sm h-8"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button size="sm" onClick={sendMessage} className="h-8 w-8 p-0">
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </Card>

          {/* Participant Actions */}
          {!isHost && (
            <Card className="bg-gray-900/50 border-gray-700 p-3">
              <h3 className="text-sm font-semibold mb-2">Join the Conversation</h3>
              <div className="space-y-2">
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Why would you like to speak?"
                  className="bg-gray-800 border-gray-600 text-white text-sm h-16"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={requestToSpeak} className="flex-1">
                    <Hand className="h-3 w-3 mr-1" />
                    Request to Speak
                  </Button>
                  <Button size="sm" variant="outline" onClick={joinCallQueue} className="flex-1">
                    <Phone className="h-3 w-3 mr-1" />
                    Join Queue
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5 text-red-500" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-500" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-pink-400"
            onClick={() => sendReaction('💖')}
          >
            <Heart className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-yellow-400"
            onClick={() => sendReaction('⭐')}
          >
            <Star className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-purple-400"
            onClick={() => sendReaction('🎁')}
          >
            <Gift className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-blue-400"
            onClick={() => sendReaction('👍')}
          >
            <ThumbsUp className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white">
            <Share className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}