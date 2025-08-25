import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Hand, 
  Heart, 
  Gift, 
  Camera, 
  Share,
  Crown,
  Users,
  MessageSquare,
  Send,
  ChevronDown,
  Phone,
  PhoneOff,
  DollarSign,
  Play,
  Pause,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

export function ClubhouseLiveSession({ roomData, onLeave }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    { id: 1, user: 'Host', content: 'Welcome everyone to our live session!', time: '2:30 PM' },
    { id: 2, user: 'Guest1', content: 'Thank you for having me!', time: '2:31 PM' },
    { id: 3, user: 'Listener23', content: '🎉 This is amazing!', time: '2:32 PM' }
  ])
  const [queue, setQueue] = useState([
    { position: 1, user: { name: 'Sarah M.', avatar: '', id: 1 } },
    { position: 2, user: { name: 'John D.', avatar: '', id: 2 } },
    { position: 3, user: null },
    { position: 4, user: null },
    { position: 5, user: null },
    { position: 6, user: null },
    { position: 7, user: null },
    { position: 8, user: null }
  ])
  const [showGifts, setShowGifts] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  // Mock participants data
  const host = {
    id: 'host-1',
    name: roomData?.creator_name || 'Room Host',
    avatar: '',
    role: 'host',
    isSpeaking: true,
    isMuted: false
  }
  
  const guests = [
    {
      id: 'guest-1',
      name: 'Featured Guest',
      avatar: '',
      role: 'guest',
      isSpeaking: false,
      isMuted: true
    }
  ]
  
  const coHosts = [
    {
      id: 'cohost-1',
      name: 'Co-host 1',
      avatar: '',
      role: 'co-host',
      isSpeaking: false,
      isMuted: true
    },
    {
      id: 'cohost-2',
      name: 'Co-host 2',
      avatar: '',
      role: 'co-host',
      isSpeaking: false,
      isMuted: true
    },
    {
      id: 'cohost-3',
      name: 'Co-host 3',
      avatar: '',
      role: 'co-host',
      isSpeaking: false,
      isMuted: true
    }
  ]

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMsg = {
        id: Date.now(),
        user: user?.email || 'You',
        content: message,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, newMsg])
      setMessage('')
    }
  }

  const handleRaiseHand = () => {
    if (!handRaised) {
      // Find first empty slot in queue
      const emptySlot = queue.findIndex(slot => !slot.user)
      if (emptySlot !== -1) {
        const newQueue = [...queue]
        newQueue[emptySlot] = {
          position: emptySlot + 1,
          user: { name: user?.email || 'You', avatar: '', id: user?.id }
        }
        setQueue(newQueue)
        setHandRaised(true)
        toast({
          title: "Hand raised!",
          description: `You're in position ${emptySlot + 1} in the queue`,
        })
      } else {
        toast({
          title: "Queue is full",
          description: "All 8 queue slots are currently occupied",
          variant: "destructive"
        })
      }
    }
  }

  const handleSendGift = (giftType, amount = 1) => {
    toast({
      title: `${giftType} sent!`,
      description: `You sent ${amount} ${giftType} to the host`,
    })
    setShowGifts(false)
  }

  const SpeakerCard = ({ participant, size = "lg" }) => (
    <Card className={`bg-gradient-to-br backdrop-blur-sm border-2 transition-all duration-300 hover:scale-105 ${
      participant.role === 'host' 
        ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-yellow-500/20' :
      participant.role === 'guest'
        ? 'from-purple-500/20 to-pink-500/20 border-purple-500/50 shadow-purple-500/20' :
      participant.role === 'co-host'
        ? 'from-blue-500/20 to-cyan-500/20 border-blue-500/50 shadow-blue-500/20' :
        'from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-green-500/20'
    } ${size === 'lg' ? 'aspect-[4/3]' : 'aspect-square'} shadow-2xl`}>
      <CardContent className={`p-4 h-full flex flex-col items-center justify-center relative`}>
        {/* Role Badge */}
        <div className="absolute top-2 left-2">
          {participant.role === 'host' && (
            <Badge className="bg-yellow-500/80 text-yellow-900 border-yellow-400">
              <Crown className="w-3 h-3 mr-1" />
              Host
            </Badge>
          )}
          {participant.role === 'guest' && (
            <Badge className="bg-purple-500/80 text-purple-900 border-purple-400">
              Guest
            </Badge>
          )}
          {participant.role === 'co-host' && (
            <Badge className="bg-blue-500/80 text-blue-900 border-blue-400">
              <Users className="w-3 h-3 mr-1" />
              Co-host
            </Badge>
          )}
        </div>
        
        {/* Mic Status */}
        <div className="absolute top-2 right-2">
          {participant.isMuted ? (
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <Mic className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        
        {/* Avatar */}
        <Avatar className={`${size === 'lg' ? 'w-20 h-20' : 'w-16 h-16'} mb-3 border-4 border-white/30 shadow-xl`}>
          <AvatarImage src={participant.avatar} />
          <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-bold text-lg">
            {participant.name[0]}
          </AvatarFallback>
        </Avatar>
        
        {/* Name */}
        <div className="text-center">
          <p className="text-white font-semibold text-sm mb-1 truncate max-w-full">
            {participant.name}
          </p>
          {participant.isSpeaking && (
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
              <span className="text-green-300 text-xs">Speaking</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
            <span className="text-white font-bold text-lg">{roomData?.name || 'Live Session'}</span>
            <Badge className="bg-white/10 text-white border-white/20">
              <Users className="w-3 h-3 mr-1" />
              24 listening
            </Badge>
            {roomData?.session_type === 'paid' && (
              <Badge className="bg-purple-500/80 text-purple-100 border-purple-400">
                <DollarSign className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLeave}
            className="text-white/60 hover:text-white hover:bg-red-500/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Host Section */}
            <div className="text-center">
              <h3 className="text-white/80 text-sm font-medium mb-4 flex items-center justify-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                Host
              </h3>
              <div className="max-w-sm mx-auto">
                <SpeakerCard participant={host} size="lg" />
              </div>
            </div>

            {/* Guest Section */}
            <div className="text-center">
              <h3 className="text-white/80 text-sm font-medium mb-4">Featured Guest</h3>
              <div className="max-w-sm mx-auto">
                <SpeakerCard participant={guests[0]} size="lg" />
              </div>
            </div>

            {/* Co-hosts Section */}
            <div>
              <h3 className="text-white/80 text-sm font-medium mb-4 text-center flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Co-hosts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {coHosts.map((coHost, index) => (
                  <SpeakerCard key={coHost.id} participant={coHost} size="md" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-sm border-l border-white/10 flex flex-col">
          
          {/* Queue Section */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Hand className="w-4 h-4" />
              Queue
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {queue.map((slot, index) => (
                <Card key={index} className={`aspect-square ${
                  slot.user ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/10 border-dashed'
                } transition-all hover:scale-105`}>
                  <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                    <div className="text-xs text-white/80 mb-1">{slot.position}</div>
                    {slot.user ? (
                      <>
                        <Avatar className="w-8 h-8 mb-1">
                          <AvatarImage src={slot.user.avatar} />
                          <AvatarFallback className="text-xs bg-green-600">
                            {slot.user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-xs text-white/90 text-center truncate max-w-full">
                          {slot.user.name.split(' ')[0]}
                        </div>
                      </>
                    ) : (
                      <div className="w-8 h-8 border-2 border-dashed border-white/30 rounded-full flex items-center justify-center">
                        <span className="text-white/40 text-xs">+</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Messages Section */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Messages
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/90 font-medium text-sm">{msg.user}</span>
                      <span className="text-white/50 text-xs">{msg.time}</span>
                    </div>
                    <p className="text-white/80 text-sm">{msg.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button size="sm" onClick={handleSendMessage} className="bg-blue-500 hover:bg-blue-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/30 backdrop-blur-md border-t border-white/10 p-4 shadow-xl">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          
          {/* Left Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant={isVideoOn ? "default" : "secondary"}
              size="sm"
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="w-12 h-12 rounded-full"
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={isMuted ? "destructive" : "default"}
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="w-12 h-12 rounded-full"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </div>

          {/* Center Controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGifts(!showGifts)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Gift className="w-4 h-4 mr-2" />
                Gifts
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              
              {showGifts && (
                <Card className="absolute bottom-full mb-2 left-0 bg-black/90 border-white/20 p-3 min-w-48">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendGift('hearts', 5)}
                      className="w-full justify-start text-pink-300 hover:bg-pink-500/20"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Send Hearts (5)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendGift('usdc', 1)}
                      className="w-full justify-start text-green-300 hover:bg-green-500/20"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Send 1 USDC
                    </Button>
                  </div>
                </Card>
              )}
            </div>
            
            <Button
              variant={handRaised ? "default" : "outline"}
              size="sm"
              onClick={handleRaiseHand}
              disabled={handRaised}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
            >
              <Hand className="w-4 h-4 mr-2" />
              {handRaised ? 'In Queue' : 'Raise Hand'}
            </Button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Share className="w-4 h-4" />
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={onLeave}
              className="bg-red-500/80 hover:bg-red-500"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}