import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Mic,
  MicOff,
  Hand,
  Heart,
  Gift,
  DollarSign,
  Crown,
  Users,
  Eye,
  X,
  MoreVertical,
  Play,
  Pause,
  Send,
  Star
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useGamification } from '@/hooks/useGamification'

export function ClubhouseLiveSession({ roomData, onEndSession }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { createNotification } = useGamification()
  
  // State
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [recordings, setRecordings] = useState([])
  const [gifts, setGifts] = useState([])
  const [queue, setQueue] = useState(Array.from({ length: 8 }, (_, i) => ({ position: i + 1, user: null })))
  
  const [newMessage, setNewMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isInQueue, setIsInQueue] = useState(false)
  const [userRole, setUserRole] = useState('audience')
  const [showGifts, setShowGifts] = useState(false)
  const [playingRecording, setPlayingRecording] = useState(null)
  
  const messagesRef = useRef(null)
  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingChunksRef = useRef([])

  useEffect(() => {
    if (roomData && user) {
      initializeSession()
      setupRealtimeSubscriptions()
    }
    return () => cleanupSubscriptions()
  }, [roomData, user])

  const initializeSession = async () => {
    // Determine user role
    let role = 'audience'
    if (roomData.creator_id === user.id) {
      role = 'host'
    } else if (roomData.admins?.includes(user.id)) {
      role = 'admin'
    } else if (roomData.co_hosts?.includes(user.id)) {
      role = 'co_host'
    } else if (roomData.starting_guests?.includes(user.id)) {
      role = 'guest'
    }
    setUserRole(role)

    // Join as participant
    await joinAsParticipant(role)
    await fetchInitialData()
  }

  const joinAsParticipant = async (role) => {
    try {
      const { error } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomData.id,
          user_id: user.id,
          role: role,
          is_speaking: role === 'host' || role === 'admin',
          is_muted: role === 'audience'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error joining session:', error)
    }
  }

  const fetchInitialData = async () => {
    await Promise.all([
      fetchParticipants(),
      fetchMessages(),
      fetchRecordings(),
      fetchGifts(),
      fetchQueue()
    ])
  }

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url, first_name, last_name)
        `)
        .eq('room_id', roomData.id)
        .is('left_at', null)

      if (error) throw error
      setParticipants(data || [])
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error && error.code !== 'PGRST116') throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('room_recordings')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') throw error
      setRecordings(data || [])
    } catch (error) {
      console.error('Error fetching recordings:', error)
    }
  }

  const fetchGifts = async () => {
    try {
      const { data, error } = await supabase
        .from('room_gifts')
        .select(`
          *,
          sender:sender_id (display_name),
          recipient:recipient_id (display_name)
        `)
        .eq('room_id', roomData.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error && error.code !== 'PGRST116') throw error
      setGifts(data || [])
    } catch (error) {
      console.error('Error fetching gifts:', error)
    }
  }

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('room_id', roomData.id)
        .not('queue_position', 'is', null)
        .order('queue_position', { ascending: true })

      if (error) throw error

      const newQueue = Array.from({ length: 8 }, (_, i) => ({ 
        position: i + 1, 
        user: data?.find(p => p.queue_position === i + 1) || null 
      }))
      setQueue(newQueue)
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    const participantsChannel = supabase
      .channel(`room-participants-${roomData.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomData.id}`
      }, () => {
        fetchParticipants()
        fetchQueue()
      })
      .subscribe()

    // Add other subscriptions for messages, recordings, gifts
  }

  const cleanupSubscriptions = () => {
    supabase.removeAllChannels()
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      const { error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        })

      if (error) throw error
      setNewMessage('')
      
      // Award points
      await createNotification(
        'points_earned',
        '+2 points!',
        'You earned 2 points for participating in chat',
      )
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const joinQueue = async () => {
    if (isInQueue) return

    const nextPosition = queue.findIndex(slot => !slot.user)
    if (nextPosition === -1) {
      toast({
        title: "Queue is full",
        description: "All 8 queue slots are currently occupied",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('room_participants')
        .upsert({
          room_id: roomData.id,
          user_id: user.id,
          role: 'audience',
          queue_position: nextPosition + 1,
          hand_raised_at: new Date().toISOString()
        })

      if (error) throw error
      setIsInQueue(true)
      
      toast({
        title: "Joined queue!",
        description: `You're in position ${nextPosition + 1}`,
      })
    } catch (error) {
      console.error('Error joining queue:', error)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      recordingChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        recordingChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/wav' })
        await uploadRecording(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      // Auto-stop after 60 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          stopRecording()
        }
      }, 60000)
    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Recording failed",
        description: "Could not access microphone",
        variant: "destructive"
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const uploadRecording = async (blob) => {
    try {
      const fileName = `${roomData.id}/${user.id}/${Date.now()}.wav`
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('room_recordings')
        .insert({
          room_id: roomData.id,
          user_id: user.id,
          audio_url: fileName,
          duration_seconds: 60 // Estimate
        })

      if (dbError) throw dbError

      toast({
        title: "Recording saved!",
        description: "Your voice memo has been shared with the room",
      })
    } catch (error) {
      console.error('Error uploading recording:', error)
    }
  }

  const sendGift = async (giftType, amount, recipientId) => {
    try {
      const { error } = await supabase
        .from('room_gifts')
        .insert({
          room_id: roomData.id,
          sender_id: user.id,
          recipient_id: recipientId,
          gift_type: giftType,
          amount: amount
        })

      if (error) throw error

      const points = giftType === 'usdc' ? amount * 10 : amount * 2
      await createNotification(
        'points_earned',
        `+${points} points!`,
        `You earned ${points} points for sending a ${giftType}!`,
      )

      setShowGifts(false)
      toast({
        title: `${giftType} sent!`,
        description: `+${points} points earned!`,
      })
    } catch (error) {
      console.error('Error sending gift:', error)
    }
  }

  const getSpeakers = () => {
    return participants.filter(p => p.is_speaking && !p.left_at)
  }

  const getAudience = () => {
    return participants.filter(p => !p.is_speaking && !p.left_at)
  }

  const isHost = () => userRole === 'host' || userRole === 'admin'

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium">{roomData.name}</span>
            <Badge variant="secondary">
              <Eye className="w-3 h-3 mr-1" />
              {participants.length}
            </Badge>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onEndSession}
            className="text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Stage Area */}
        <div className="flex-1 flex flex-col p-6">
          {/* Room Description */}
          {roomData.description && (
            <Card className="bg-white/5 border-white/10 mb-6 p-4">
              <p className="text-white/80 text-sm">{roomData.description}</p>
            </Card>
          )}

          {/* Speakers Grid */}
          <div className="flex-1 space-y-6">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Mic className="w-4 h-4" />
              On Stage ({getSpeakers().length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {getSpeakers().map((participant, index) => (
                <Card key={participant.id} className={`bg-gradient-to-br ${
                  participant.role === 'host' ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30' :
                  participant.role === 'admin' ? 'from-red-500/20 to-pink-500/20 border-red-500/30' :
                  participant.role === 'co_host' ? 'from-blue-500/20 to-purple-500/20 border-blue-500/30' :
                  'from-green-500/20 to-emerald-500/20 border-green-500/30'
                } backdrop-blur-sm overflow-hidden`}>
                  <div className="aspect-square relative p-4 flex flex-col items-center justify-center">
                    <Avatar className="w-16 h-16 mb-3 border-2 border-white/20">
                      <AvatarImage src={participant.profiles?.avatar_url} />
                      <AvatarFallback>
                        {(participant.profiles?.display_name || participant.profiles?.first_name || 'U')[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="text-center">
                      <p className="text-white font-medium text-sm truncate">
                        {participant.profiles?.display_name || 
                         `${participant.profiles?.first_name} ${participant.profiles?.last_name}` || 
                         'Unknown'}
                      </p>
                      
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {participant.role === 'host' && <Crown className="w-3 h-3 text-yellow-400" />}
                        {participant.role === 'admin' && <Star className="w-3 h-3 text-red-400" />}
                        {participant.role === 'co_host' && <Users className="w-3 h-3 text-blue-400" />}
                        {participant.is_muted ? 
                          <MicOff className="w-3 h-3 text-red-400" /> : 
                          <Mic className="w-3 h-3 text-green-400" />
                        }
                      </div>
                    </div>

                    {isHost() && participant.user_id !== user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l border-white/10 bg-black/20 backdrop-blur-sm flex flex-col">
          {/* Queue Section */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Queue</h3>
              {userRole === 'audience' && !isInQueue && (
                <Button
                  size="sm"
                  onClick={joinQueue}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Hand className="w-3 h-3 mr-1" />
                  Raise Hand
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {queue.map((slot) => (
                <div key={slot.position} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
                    {slot.position}
                  </div>
                  
                  {slot.user ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={slot.user.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {(slot.user.profiles?.display_name || 'U')[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-white/80 truncate">
                        {slot.user.profiles?.display_name || 'Unknown User'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-white/40">Empty</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-medium">Chat</h3>
            </div>
            
            <ScrollArea className="flex-1 p-4" ref={messagesRef}>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarImage src={message.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(message.profiles?.display_name || 'U')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white/80">
                          {message.profiles?.display_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/90">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {recordings.map((recording) => (
                  <div key={recording.id} className="flex gap-3 p-3 bg-blue-500/10 rounded-lg">
                    <Avatar className="w-6 h-6 mt-1">
                      <AvatarImage src={recording.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(recording.profiles?.display_name || 'U')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-white/80">
                          {recording.profiles?.display_name || 'Unknown'}
                        </span>
                        <Badge variant="secondary" className="text-xs">Voice</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // TODO: Play recording
                          toast({
                            title: "Playing voice memo",
                            description: "Audio will play for all participants",
                          })
                        }}
                        className="h-8 px-3 bg-blue-500/20 hover:bg-blue-500/30"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Play ({recording.duration_seconds}s)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-white/5 border-white/10"
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button size="sm" onClick={sendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 ${isRecording ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}
                >
                  {isRecording ? <Pause className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
                  {isRecording ? 'Stop' : 'Record'}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowGifts(!showGifts)}
                  className="bg-pink-500/20 text-pink-400"
                >
                  <Gift className="w-3 h-3" />
                </Button>
              </div>
              
              {showGifts && (
                <div className="mt-2 p-3 bg-white/5 rounded-lg">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => sendGift('hearts', 1, getSpeakers()[0]?.user_id)}
                      className="bg-red-500/20 text-red-400"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      ❤️
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => sendGift('diamonds', 5, getSpeakers()[0]?.user_id)}
                      className="bg-blue-500/20 text-blue-400"
                    >
                      💎 5
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => sendGift('usdc', 1, getSpeakers()[0]?.user_id)}
                      className="bg-green-500/20 text-green-400"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />
                      $1
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}