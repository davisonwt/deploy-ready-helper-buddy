import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Heart,
  Gift,
  Camera,
  Share,
  Send,
  ChevronDown,
  Star,
  DollarSign,
  Crown,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useGamification } from '@/hooks/useGamification'

export function ComprehensiveLiveSession({ 
  sessionData, 
  sessionType = 'chat', 
  onEndSession, 
  onLeaveSession 
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { createNotification } = useGamification()
  
  // Core state
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [callQueue, setCallQueue] = useState([])
  const [guestRequests, setGuestRequests] = useState([])
  
  // UI state
  const [newMessage, setNewMessage] = useState('')
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [showGiftsMenu, setShowGiftsMenu] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  
  // Session info
  const [isHost, setIsHost] = useState(false)
  const [coHosts, setCoHosts] = useState([])
  const [currentGuest, setCurrentGuest] = useState(null)
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

  // Awards points for participation actions
  const awardPoints = async (action, points) => {
    try {
      await createNotification(
        'points_earned',
        `+${points} points!`,
        `You earned ${points} points for ${action}`,
      )
    } catch (error) {
      console.error('Error awarding points:', error)
    }
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

      // Add to local messages immediately
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

      // Award points for messaging
      await awardPoints('sending a message', 2)

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

  const joinCallQueue = async () => {
    if (!sessionInfo) return

    try {
      if (sessionType === 'radio') {
        const { error } = await supabase
          .from('radio_call_queue')
          .insert({
            session_id: sessionInfo.id,
            user_id: user.id,
            topic: 'General discussion',
            status: 'waiting'
          })

        if (error) throw error
      }

      // Award points for joining queue
      await awardPoints('joining the call queue', 5)

      toast({
        title: "Joined Queue",
        description: "You've been added to the call queue (+5 points!)",
      })
    } catch (error) {
      console.error('Error joining queue:', error)
    }
  }

  const sendGift = async (giftType) => {
    const points = giftType === 'usdc' ? 20 : giftType === 'hearts' ? 5 : 10
    await awardPoints(`sending ${giftType}`, points)
    
    toast({
      title: `${giftType} sent!`,
      description: `+${points} points earned!`,
      duration: 2000
    })
    setShowGiftsMenu(false)
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

  // Create numbered queue slots (1-8)
  const queueSlots = Array.from({ length: 8 }, (_, i) => {
    const queueNumber = i + 1
    const queueEntry = callQueue[i]
    return {
      number: queueNumber,
      participant: queueEntry || null
    }
  })

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex flex-col z-50">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Badge className="bg-red-500 text-white px-3 py-1">
            🔴 LIVE
          </Badge>
          <span className="text-lg font-semibold">{sessionInfo?.title || 'Live Session'}</span>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Heart className="h-4 w-4 text-red-500" />
            {viewerCount}
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onLeaveSession}
          className="text-white hover:bg-gray-700"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Video Grid */}
      <div className="flex-1 p-4 space-y-4">
        {/* Top Video Section */}
        <div className="grid grid-cols-3 gap-4 h-64">
          {/* Host */}
          <Card className="bg-gray-800/50 border-gray-600 relative overflow-hidden">
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-yellow-500 text-black px-2 py-1 text-xs">
                <Crown className="h-3 w-3 mr-1" />
                host
              </Badge>
            </div>
            <div className="h-full flex items-center justify-center">
              {isVideoEnabled ? (
                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-white/50" />
                </div>
              ) : (
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-2xl bg-blue-600">
                    {user?.user_metadata?.display_name?.[0] || 'H'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="absolute bottom-2 left-2 right-2 text-center">
              <div className="text-white text-sm font-medium bg-black/50 rounded px-2 py-1">
                {user?.user_metadata?.display_name || 'Host'}
              </div>
            </div>
          </Card>

          {/* Guest */}
          <Card className="bg-gray-800/50 border-gray-600 relative overflow-hidden">
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-green-500 text-white px-2 py-1 text-xs">
                guest
              </Badge>
            </div>
            <div className="h-full flex items-center justify-center">
              {currentGuest ? (
                <div className="w-full h-full bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={currentGuest.avatar_url} />
                    <AvatarFallback className="text-2xl bg-green-600">
                      {currentGuest.display_name?.[0] || 'G'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div className="text-gray-500 text-center">
                  <div className="text-4xl mb-2">👋</div>
                  <div className="text-sm">Waiting for guest</div>
                </div>
              )}
            </div>
            {currentGuest && (
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <div className="text-white text-sm font-medium bg-black/50 rounded px-2 py-1">
                  {currentGuest.display_name}
                </div>
              </div>
            )}
          </Card>

          {/* Co-hosts */}
          <div className="space-y-2">
            {[1, 2, 3].map((slot) => {
              const coHost = coHosts[slot - 1]
              return (
                <Card key={slot} className="bg-gray-800/50 border-gray-600 relative h-20 overflow-hidden">
                  <div className="absolute top-1 left-1 z-10">
                    <Badge className="bg-blue-500 text-white px-1 py-0.5 text-xs">
                      co-host
                    </Badge>
                  </div>
                  <div className="h-full flex items-center justify-center">
                    {coHost ? (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={coHost.avatar_url} />
                        <AvatarFallback className="bg-blue-600">
                          {coHost.display_name?.[0] || 'C'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="text-gray-500 text-xs">Empty slot</div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Bottom Section - Messages and Queue */}
        <div className="grid grid-cols-3 gap-4 h-40">
          {/* Messages */}
          <div className="col-span-2">
            <div className="text-sm font-medium mb-2 text-gray-300">messages:</div>
            <Card className="bg-gray-800/30 border-gray-600 p-3 h-32">
              <ScrollArea className="h-20 mb-2" ref={chatRef}>
                {messages.map((msg) => (
                  <div key={msg.id} className="mb-1 text-sm">
                    <span className="text-blue-400 font-medium">
                      {msg.profiles?.display_name || 'User'}:
                    </span>
                    <span className="ml-2 text-white">{msg.message}</span>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-gray-500 text-sm">No messages yet...</div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-gray-700 border-gray-600 text-white text-sm h-8 flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button size="sm" onClick={sendMessage} className="h-8 px-3 bg-blue-600 hover:bg-blue-700">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Queue */}
          <div>
            <div className="text-sm font-medium mb-2 text-gray-300">queue:</div>
            <Card className="bg-gray-800/30 border-gray-600 p-3 h-32">
              <div className="grid grid-cols-2 gap-1 h-full">
                {queueSlots.map((slot) => (
                  <div 
                    key={slot.number}
                    className={`border border-gray-600 rounded-sm p-1 text-center flex flex-col items-center justify-center
                      ${slot.participant ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-700/30'}`}
                  >
                    <div className="text-xs font-bold mb-1">{slot.number}</div>
                    {slot.participant ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={slot.participant.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs bg-orange-600">
                          {slot.participant.profiles?.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-6 w-6 bg-gray-600/50 rounded-full flex items-center justify-center">
                        <div className="text-xs text-gray-400">-</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {!isHost && (
                <Button 
                  size="sm" 
                  onClick={joinCallQueue}
                  className="w-full mt-2 h-6 text-xs bg-orange-600 hover:bg-orange-700"
                >
                  Join Queue (+5 pts)
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Camera */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVideo}
              className={`text-white hover:bg-gray-700 ${!isVideoEnabled ? 'text-red-400' : ''}`}
            >
              {isVideoEnabled ? <Camera className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              <span className="ml-2 text-sm">camera</span>
            </Button>

            {/* Mic */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudio}
              className={`text-white hover:bg-gray-700 ${!isAudioEnabled ? 'text-red-400' : ''}`}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              <span className="ml-2 text-sm">mic</span>
            </Button>

            {/* Gifts Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGiftsMenu(!showGiftsMenu)}
                className="text-white hover:bg-gray-700 flex items-center gap-2"
              >
                <Gift className="h-5 w-5" />
                <span className="text-sm">gifts:</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
              
              {showGiftsMenu && (
                <Card className="absolute bottom-full left-0 mb-2 bg-gray-800 border-gray-600 p-2 min-w-40 z-10">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('usdc')}
                      className="w-full justify-start text-green-400 hover:bg-gray-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      sent usdc (+20 pts)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('hearts')}
                      className="w-full justify-start text-red-400 hover:bg-gray-700"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      sent hearts (+5 pts)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('gifts')}
                      className="w-full justify-start text-purple-400 hover:bg-gray-700"
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      sent gifts (+10 pts)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('stars')}
                      className="w-full justify-start text-yellow-400 hover:bg-gray-700"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      etc (+8 pts)
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Share Life Button */}
          <Button
            variant="outline"
            size="sm"
            className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
          >
            <Share className="h-4 w-4 mr-2" />
            share life
          </Button>
        </div>
      </div>
    </div>
  )
}