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
  Share,
  Crown,
  Users,
  MessageSquare,
  Send,
  PhoneOff,
  DollarSign,
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
    setHandRaised(!handRaised)
    toast({
      title: handRaised ? "Hand lowered" : "Hand raised!",
      description: handRaised ? "You're no longer in the queue" : "You're now in the speaker queue",
    })
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      
      {/* Header */}
      <div className="bg-gray-100 border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="font-semibold text-lg">{roomData?.name || 'Live Session'}</span>
          <Badge variant="secondary">24 listening</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onLeave}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1">
        
        {/* Main Content Area - EXACTLY like your Excel layout */}
        <div className="flex-1 p-6 bg-gray-50">
          
          {/* Host Section - Single centered card */}
          <div className="text-center mb-6">
            <h3 className="text-sm text-gray-600 mb-2">Host</h3>
            <Card className="w-48 h-32 mx-auto bg-yellow-100 border-2 border-yellow-300">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                <Crown className="w-6 h-6 text-yellow-600 mb-2" />
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarFallback>H</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{roomData?.creator_name || 'Host'}</span>
              </CardContent>
            </Card>
          </div>

          {/* Guest Section - Single centered card */}
          <div className="text-center mb-6">
            <h3 className="text-sm text-gray-600 mb-2">Guest</h3>
            <Card className="w-48 h-32 mx-auto bg-purple-100 border-2 border-purple-300">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarFallback>G</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Featured Guest</span>
              </CardContent>
            </Card>
          </div>

          {/* Co-hosts Section - 3 cards in a row */}
          <div className="mb-6">
            <h3 className="text-sm text-gray-600 mb-2 text-center">Co-hosts</h3>
            <div className="flex justify-center gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="w-32 h-24 bg-blue-100 border-2 border-blue-300">
                  <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                    <Avatar className="w-8 h-8 mb-1">
                      <AvatarFallback className="text-xs">C{i}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">Co-host {i}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Queue Section - 8 numbered positions in grid */}
          <div>
            <h3 className="text-sm text-gray-600 mb-2 text-center">Queue</h3>
            <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => (
                <Card key={pos} className="aspect-square bg-green-100 border-2 border-green-300">
                  <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                    <div className="text-lg font-bold text-green-700">{pos}</div>
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {pos <= 2 ? `U${pos}` : ''}
                      </AvatarFallback>
                    </Avatar>
                    {pos <= 2 && <span className="text-xs mt-1">User {pos}</span>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Messages Section - Right sidebar */}
        <div className="w-80 bg-white border-l flex flex-col">
          
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Messages
            </h3>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gray-50 rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{msg.user}</span>
                    <span className="text-gray-500 text-xs">{msg.time}</span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button size="sm" onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls - Simple and clean */}
      <div className="bg-gray-100 border-t p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "default"}
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={isVideoOn ? "default" : "secondary"}
            size="sm"
            onClick={() => setIsVideoOn(!isVideoOn)}
          >
            {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={handRaised ? "default" : "outline"}
            size="sm"
            onClick={handleRaiseHand}
          >
            <Hand className="w-4 h-4 mr-2" />
            {handRaised ? 'Lower Hand' : 'Raise Hand'}
          </Button>
          
          <Button variant="outline" size="sm">
            <Gift className="w-4 h-4 mr-2" />
            Gifts
          </Button>
          
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4" />
          </Button>
          
          <Button variant="destructive" size="sm" onClick={onLeave}>
            <PhoneOff className="w-4 h-4 mr-2" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  )
}