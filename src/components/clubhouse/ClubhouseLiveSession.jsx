import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  X,
  Clock,
  Settings,
  Volume2,
  VolumeX
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

  // Speaking turn management
  const [currentSpeaker, setCurrentSpeaker] = useState(null) // 'host', 'guest', 'cohost-1', 'queue-1', etc.
  const [speakingTimeLeft, setSpeakingTimeLeft] = useState(0)
  const [speakingDuration, setSpeakingDuration] = useState(120) // 2 minutes default
  const [isHostControlsOpen, setIsHostControlsOpen] = useState(false)
  const [queueRotationEnabled, setQueueRotationEnabled] = useState(true)
  
  // Participant states
  const [participantStates, setParticipantStates] = useState({
    host: { canSpeak: true, isMuted: false, isCurrentSpeaker: false },
    guest: { canSpeak: false, isMuted: true, isCurrentSpeaker: false },
    'cohost-1': { canSpeak: true, isMuted: false, isCurrentSpeaker: false },
    'cohost-2': { canSpeak: true, isMuted: false, isCurrentSpeaker: false },
    'cohost-3': { canSpeak: true, isMuted: false, isCurrentSpeaker: false },
    'queue-1': { canSpeak: false, isMuted: true, isCurrentSpeaker: false, inQueue: true, user: 'User 1' },
    'queue-2': { canSpeak: false, isMuted: true, isCurrentSpeaker: false, inQueue: true, user: 'User 2' }
  })

  const timerRef = useRef(null)

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

  // Speaking turn management
  const startSpeakingTurn = (participantId) => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Update participant states
    setParticipantStates(prev => {
      const newStates = { ...prev }
      
      // Reset all speakers
      Object.keys(newStates).forEach(key => {
        newStates[key] = { 
          ...newStates[key], 
          isCurrentSpeaker: false,
          canSpeak: ['host', 'cohost-1', 'cohost-2', 'cohost-3'].includes(key)
        }
      })
      
      // Set new speaker
      if (newStates[participantId]) {
        newStates[participantId] = {
          ...newStates[participantId],
          isCurrentSpeaker: true,
          canSpeak: true,
          isMuted: false
        }
      }
      
      return newStates
    })

    setCurrentSpeaker(participantId)
    setSpeakingTimeLeft(speakingDuration)

    // Start timer
    timerRef.current = setInterval(() => {
      setSpeakingTimeLeft(prev => {
        if (prev <= 1) {
          endSpeakingTurn()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    toast({
      title: "Speaking turn started",
      description: `${participantId} is now speaking for ${speakingDuration} seconds`,
    })
  }

  const endSpeakingTurn = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    setParticipantStates(prev => {
      const newStates = { ...prev }
      if (currentSpeaker && newStates[currentSpeaker]) {
        newStates[currentSpeaker] = {
          ...newStates[currentSpeaker],
          isCurrentSpeaker: false,
          canSpeak: ['host', 'cohost-1', 'cohost-2', 'cohost-3'].includes(currentSpeaker),
          isMuted: !['host', 'cohost-1', 'cohost-2', 'cohost-3'].includes(currentSpeaker)
        }
      }
      return newStates
    })

    const previousSpeaker = currentSpeaker
    setCurrentSpeaker(null)
    setSpeakingTimeLeft(0)

    // Auto-rotate to next queue member if enabled and queue exists
    if (queueRotationEnabled && previousSpeaker?.startsWith('queue-')) {
      const queueMembers = Object.keys(participantStates).filter(id => 
        id.startsWith('queue-') && participantStates[id].inQueue && participantStates[id].user
      )
      
      if (queueMembers.length > 0) {
        const currentIndex = queueMembers.indexOf(previousSpeaker)
        const nextIndex = (currentIndex + 1) % queueMembers.length
        const nextSpeaker = queueMembers[nextIndex]
        
        setTimeout(() => startSpeakingTurn(nextSpeaker), 1000)
      }
    }
  }

  const toggleParticipantMute = (participantId) => {
    setParticipantStates(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        isMuted: !prev[participantId].isMuted
      }
    }))
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  return (
    <div className="h-screen bg-white flex flex-col">
      
      {/* Header */}
      <div className="bg-gray-100 border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="font-semibold text-lg">{roomData?.name || 'Live Session'}</span>
          <Badge variant="secondary">24 listening</Badge>
          
          {/* Speaking timer and controls */}
          {currentSpeaker && (
            <div className="flex items-center gap-2 ml-4">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-mono text-sm bg-blue-100 px-2 py-1 rounded">
                {formatTime(speakingTimeLeft)}
              </span>
              <Button size="sm" variant="outline" onClick={endSpeakingTurn}>
                End Turn
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Host controls */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsHostControlsOpen(!isHostControlsOpen)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Host Controls Panel */}
      {isHostControlsOpen && (
        <div className="bg-yellow-50 border-b p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Speaking Time:</label>
              <Select value={speakingDuration.toString()} onValueChange={(value) => setSpeakingDuration(Number(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">1 min</SelectItem>
                  <SelectItem value="120">2 min</SelectItem>
                  <SelectItem value="180">3 min</SelectItem>
                  <SelectItem value="300">5 min</SelectItem>
                  <SelectItem value="600">10 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="auto-rotate" 
                checked={queueRotationEnabled}
                onChange={(e) => setQueueRotationEnabled(e.target.checked)}
              />
              <label htmlFor="auto-rotate" className="text-sm">Auto-rotate queue</label>
            </div>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                // Find next queue member to give turn to
                const queueMembers = Object.keys(participantStates).filter(id => 
                  id.startsWith('queue-') && participantStates[id].inQueue && participantStates[id].user
                )
                if (queueMembers.length > 0) {
                  startSpeakingTurn(queueMembers[0])
                }
              }}
            >
              Start Queue
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        
        {/* Main Content Area - EXACTLY like your Excel layout */}
        <div className="flex-1 p-6 bg-gray-50">
          
          {/* Host Section - Single centered card */}
          <div className="text-center mb-6">
            <h3 className="text-sm text-gray-600 mb-2">Host</h3>
            <Card className={`w-48 h-32 mx-auto bg-yellow-100 border-2 ${
              participantStates.host?.isCurrentSpeaker ? 'border-green-500 border-4' : 'border-yellow-300'
            }`}>
              <CardContent className="p-4 h-full flex flex-col items-center justify-center relative">
                <Crown className="w-6 h-6 text-yellow-600 mb-2" />
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarFallback>H</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{roomData?.creator_name || 'Host'}</span>
                
                {/* Microphone control */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 p-1 h-6 w-6"
                  onClick={() => toggleParticipantMute('host')}
                >
                  {participantStates.host?.isMuted ? 
                    <MicOff className="w-3 h-3 text-red-500" /> : 
                    <Mic className="w-3 h-3 text-green-500" />
                  }
                </Button>
                
                {/* Speaking indicator */}
                {participantStates.host?.isCurrentSpeaker && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Speaking
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Guest Section - Single centered card */}
          <div className="text-center mb-6">
            <h3 className="text-sm text-gray-600 mb-2">Guest</h3>
            <Card className={`w-48 h-32 mx-auto bg-purple-100 border-2 ${
              participantStates.guest?.isCurrentSpeaker ? 'border-green-500 border-4' : 'border-purple-300'
            }`}>
              <CardContent className="p-4 h-full flex flex-col items-center justify-center relative">
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarFallback>G</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">Featured Guest</span>
                
                {/* Microphone control */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 p-1 h-6 w-6"
                  onClick={() => toggleParticipantMute('guest')}
                  disabled={!participantStates.guest?.canSpeak}
                >
                  {participantStates.guest?.isMuted ? 
                    <MicOff className="w-3 h-3 text-red-500" /> : 
                    <Mic className="w-3 h-3 text-green-500" />
                  }
                </Button>
                
                {/* Speaking indicator */}
                {participantStates.guest?.isCurrentSpeaker && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Speaking
                  </div>
                )}
                
                {/* Give speaking turn button for hosts */}
                <Button
                  size="sm"
                  variant="outline" 
                  className="absolute bottom-1 left-1 text-xs p-1 h-6"
                  onClick={() => startSpeakingTurn('guest')}
                >
                  Give Turn
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Co-hosts Section - 3 cards in a row */}
          <div className="mb-6">
            <h3 className="text-sm text-gray-600 mb-2 text-center">Co-hosts</h3>
            <div className="flex justify-center gap-4">
              {[1, 2, 3].map((i) => {
                const cohostId = `cohost-${i}`
                return (
                  <Card key={i} className={`w-32 h-24 bg-blue-100 border-2 ${
                    participantStates[cohostId]?.isCurrentSpeaker ? 'border-green-500 border-4' : 'border-blue-300'
                  }`}>
                    <CardContent className="p-2 h-full flex flex-col items-center justify-center relative">
                      <Avatar className="w-8 h-8 mb-1">
                        <AvatarFallback className="text-xs">C{i}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">Co-host {i}</span>
                      
                      {/* Microphone control */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-0 right-0 p-1 h-4 w-4"
                        onClick={() => toggleParticipantMute(cohostId)}
                      >
                        {participantStates[cohostId]?.isMuted ? 
                          <MicOff className="w-2 h-2 text-red-500" /> : 
                          <Mic className="w-2 h-2 text-green-500" />
                        }
                      </Button>
                      
                      {/* Speaking indicator */}
                      {participantStates[cohostId]?.isCurrentSpeaker && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full">
                          Speaking
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Queue Section - 8 numbered positions in grid */}
          <div>
            <h3 className="text-sm text-gray-600 mb-2 text-center">Queue</h3>
            <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
                const queueId = `queue-${pos}`
                const participant = participantStates[queueId]
                return (
                  <Card key={pos} className={`aspect-square bg-green-100 border-2 ${
                    participant?.isCurrentSpeaker ? 'border-green-500 border-4' : 'border-green-300'
                  }`}>
                    <CardContent className="p-2 h-full flex flex-col items-center justify-center relative">
                      <div className="text-lg font-bold text-green-700">{pos}</div>
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {participant?.user ? `U${pos}` : ''}
                        </AvatarFallback>
                      </Avatar>
                      {participant?.user && <span className="text-xs mt-1">{participant.user}</span>}
                      
                      {/* Microphone control for audience members */}
                      {participant?.user && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-0 right-0 p-1 h-4 w-4"
                          onClick={() => toggleParticipantMute(queueId)}
                          disabled={!participant?.canSpeak}
                        >
                          {participant?.isMuted ? 
                            <MicOff className="w-2 h-2 text-red-500" /> : 
                            <Mic className="w-2 h-2 text-green-500" />
                          }
                        </Button>
                      )}
                      
                      {/* Speaking indicator */}
                      {participant?.isCurrentSpeaker && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full">
                          Speaking
                        </div>
                      )}
                      
                      {/* Give speaking turn button for hosts */}
                      {participant?.user && (
                        <Button
                          size="sm"
                          variant="outline" 
                          className="absolute bottom-0 left-0 text-xs p-0.5 h-4"
                          onClick={() => startSpeakingTurn(queueId)}
                        >
                          Turn
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
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