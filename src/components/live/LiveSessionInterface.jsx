import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  UserPlus,
  MessageCircle,
  Settings,
  Phone,
  PhoneOff,
  Heart,
  Gift,
  Camera,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Share,
  Star
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function LiveSessionInterface({ room, onEndSession, onLeaveSession }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [isHost, setIsHost] = useState(false)
  const [showInviteSlots, setShowInviteSlots] = useState(true)
  const chatRef = useRef(null)

  // Mock participants data - replace with real data fetching
  useEffect(() => {
    // Simulate host and participants
    const mockParticipants = [
      {
        id: '1',
        user_id: user?.id,
        display_name: user?.user_metadata?.display_name || 'You',
        avatar_url: user?.user_metadata?.avatar_url,
        role: 'host',
        is_video_enabled: true,
        is_audio_enabled: true
      },
      {
        id: '2',
        user_id: '2',
        display_name: 'davison',
        avatar_url: null,
        role: 'participant',
        is_video_enabled: false,
        is_audio_enabled: true
      },
      {
        id: '3',
        user_id: '3',
        display_name: 'Caty',
        avatar_url: null,
        role: 'participant',
        is_video_enabled: false,
        is_audio_enabled: false
      }
    ]
    
    setParticipants(mockParticipants)
    setIsHost(mockParticipants[0]?.user_id === user?.id)
    setViewerCount(185) // Mock viewer count
  }, [user])

  // Mock messages
  useEffect(() => {
    const mockMessages = [
      {
        id: '1',
        sender: 'Tracy',
        message: '@Caty Shalom sis 😊',
        timestamp: new Date()
      },
      {
        id: '2',
        sender: 'davison',
        message: 'shalom all',
        timestamp: new Date()
      },
      {
        id: '3',
        sender: 'Caty',
        message: 'Yes',
        timestamp: new Date()
      }
    ]
    setMessages(mockMessages)
  }, [])

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

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now().toString(),
        sender: user?.user_metadata?.display_name || 'You',
        message: newMessage,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, message])
      setNewMessage('')
    }
  }

  const sendReaction = (reaction) => {
    toast({
      title: `${reaction} sent!`,
      duration: 1000
    })
  }

  const inviteUser = () => {
    toast({
      title: "Invite sent",
      description: "User has been invited to join the session",
      duration: 2000
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
  const emptySlots = Array(6 - otherParticipants.length).fill(null)

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/lovable-uploads/72bd9f21-20e8-4691-9dcc-f69772f64277.png" />
              <AvatarFallback>VI</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-sm">{room?.name || 'Vision AI'}</h2>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                <span className="text-xs text-gray-300">{viewerCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-orange-500 hover:bg-orange-600 border-orange-500 text-white">
            <UserPlus className="h-4 w-4 mr-1" />
            Join
          </Button>
          <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">3</span>
          </div>
          <Button variant="ghost" size="sm" onClick={endOrLeaveSession}>
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live Badge */}
      <div className="flex justify-center mb-4">
        <Badge className="bg-red-500 text-white px-3 py-1">
          🔴 Popular LIVE
        </Badge>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 px-4">
        {/* Host Video - Left Side */}
        <div className="flex-1 relative">
          <Card className="h-full bg-gradient-to-b from-amber-900/20 to-amber-600/20 border-amber-500/30 overflow-hidden">
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="secondary" className="bg-black/50 text-white">
                Host
              </Badge>
            </div>
            
            {/* Host Video/Avatar */}
            <div className="h-full flex items-center justify-center bg-cover bg-center" 
                 style={{backgroundImage: "url('/lovable-uploads/72bd9f21-20e8-4691-9dcc-f69772f64277.png')"}}>
              {!isVideoEnabled && (
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

        {/* Participants Grid - Right Side */}
        <div className="w-48 space-y-2">
          {/* Active Participants */}
          {otherParticipants.map((participant) => (
            <Card key={participant.id} className="bg-gray-800/50 border-gray-700 p-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {participant.display_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-gray-800" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{participant.display_name}</div>
                  <div className="flex items-center gap-1">
                    {participant.is_audio_enabled ? (
                      <Mic className="h-3 w-3 text-green-500" />
                    ) : (
                      <MicOff className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-gray-400">0</span>
                  </div>
                </div>
                {!participant.is_audio_enabled && (
                  <MicOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </Card>
          ))}

          {/* Invite Slots */}
          {showInviteSlots && emptySlots.map((_, index) => (
            <Card key={`empty-${index}`} className="bg-gray-800/30 border-gray-700 border-dashed p-3">
              <Button 
                variant="ghost" 
                className="w-full h-full flex flex-col items-center gap-1 text-gray-400 hover:text-white"
                onClick={inviteUser}
              >
                <UserPlus className="h-6 w-6" />
                <span className="text-xs">Invite</span>
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Chat Section */}
      <div className="h-32 bg-black/30 backdrop-blur-sm p-4 border-t border-gray-700">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto space-y-1" ref={chatRef}>
            {messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="text-gray-300">{msg.sender}</span>
                <span className="ml-2 text-white">{msg.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white"
            onClick={() => setNewMessage('Type...')}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white">
            <Camera className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5 text-red-500" />}
          </Button>
          <Button variant="ghost" size="sm" className="text-white">
            <Users className="h-5 w-5" />
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
            className="text-purple-400"
            onClick={() => sendReaction('🎁')}
          >
            <Gift className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white">
            <Share className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}