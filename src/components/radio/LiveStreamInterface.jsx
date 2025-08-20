import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { SecureTextarea } from '@/components/ui/secure-input'
import { 
  Mic, 
  MicOff, 
  Radio, 
  Users, 
  MessageSquare, 
  Phone,
  Square,
  Pause,
  Play,
  Volume2,
  Send
} from 'lucide-react'
import { useGroveStation } from '@/hooks/useGroveStation'
import { useToast } from '@/hooks/use-toast'

export function LiveStreamInterface({ djProfile, currentShow, onEndShow }) {
  const { updateShowStatus } = useGroveStation()
  const { toast } = useToast()
  
  // Audio states
  const [isLive, setIsLive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [listenerCount, setListenerCount] = useState(1)
  const [messages, setMessages] = useState([])
  const [chatMessage, setChatMessage] = useState('')
  
  // WebSocket and audio references
  const wsRef = useRef(null)
  const audioContextRef = useRef(null)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  
  // Real-time audio streaming
  const initializeAudio = async () => {
    try {
      // Request microphone access
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      
      // Initialize WebSocket connection to Grove Station streaming
      wsRef.current = new WebSocket(`wss://zuwkgasbkpjlxzsjzumu.functions.supabase.co/functions/v1/grove-station-stream`)
      
      wsRef.current.onopen = () => {
        console.log('Connected to Grove Station streaming server')
        
        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are the AI co-host for Grove Station, helping DJ ${djProfile?.dj_name} with their show "${currentShow?.show_name}". You can:
            - Help with smooth transitions between segments
            - Provide interesting facts and trivia
            - Assist with listener interactions
            - Keep the energy up and engaging
            
            Keep responses brief and radio-appropriate. Always maintain a friendly, community-focused tone that fits Grove Station's "where ideas bloom and voices grow" theme.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            tools: [
              {
                type: 'function',
                name: 'get_community_updates',
                description: 'Get the latest community updates and orchard activities',
                parameters: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' }
                  }
                }
              },
              {
                type: 'function', 
                name: 'suggest_music',
                description: 'Suggest music based on show theme and listener preferences',
                parameters: {
                  type: 'object',
                  properties: {
                    genre: { type: 'string' },
                    mood: { type: 'string' }
                  }
                }
              }
            ],
            tool_choice: 'auto',
            temperature: 0.8
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
      console.error('Error initializing audio:', error)
      toast({
        title: "Audio Error",
        description: "Could not access microphone",
        variant: "destructive"
      })
    }
  }

  const handleWebSocketMessage = (data) => {
    console.log('WebSocket message:', data.type)
    
    switch (data.type) {
      case 'session.created':
        console.log('Session created')
        break
        
      case 'response.audio.delta':
        // Handle AI voice response
        handleAudioResponse(data.delta)
        break
        
      case 'response.audio_transcript.delta':
        // Handle AI text response for display
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai_response',
          content: data.delta,
          timestamp: new Date()
        }])
        break
        
      case 'response.function_call_arguments.done':
        // Handle function call completions
        handleFunctionCall(data)
        break
        
      case 'listener_update':
        setListenerCount(data.count)
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

  const handleAudioResponse = async (audioData) => {
    if (!audioContextRef.current) return
    
    try {
      // Convert base64 to audio buffer and play
      const binaryString = atob(audioData)
      const bytes = new Uint8Array(binaryString.length)
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Convert to WAV and play through audio context
      const audioBuffer = await createAudioBufferFromPCM(bytes)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start(0)
      
    } catch (error) {
      console.error('Error playing AI audio:', error)
    }
  }

  const createAudioBufferFromPCM = async (pcmData) => {
    // Convert PCM16 data to AudioBuffer
    const int16Data = new Int16Array(pcmData.length / 2)
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i]
    }
    
    // Create audio buffer
    const audioBuffer = audioContextRef.current.createBuffer(1, int16Data.length, 24000)
    const channelData = audioBuffer.getChannelData(0)
    
    for (let i = 0; i < int16Data.length; i++) {
      channelData[i] = int16Data[i] / 32768.0 // Convert to float
    }
    
    return audioBuffer
  }

  const handleFunctionCall = (data) => {
    const { call_id, arguments: args } = data
    const parsedArgs = JSON.parse(args)
    
    // Handle different function calls
    switch (data.name) {
      case 'get_community_updates':
        // Simulate community updates
        const updates = [
          "New orchard 'Digital Garden' just went live!",
          "Community member Sarah just completed her coding bootcamp orchard",
          "Weekend farmers market planning session this Saturday"
        ]
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'community_update',
          content: updates.join(' • '),
          timestamp: new Date()
        }])
        break
        
      case 'suggest_music':
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'music_suggestion',
          content: `🎵 Based on ${parsedArgs.mood} vibes, try some ${parsedArgs.genre} tracks!`,
          timestamp: new Date()
        }])
        break
    }
  }

  const startBroadcast = async () => {
    await initializeAudio()
    setIsLive(true)
    
    // Update show status in database
    if (currentShow) {
      await updateShowStatus(currentShow.schedule_id, 'live')
    }
    
    toast({
      title: "You're Live!",
      description: "Broadcasting to Grove Station community",
    })
  }

  const endBroadcast = async () => {
    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    // Close audio context
    if (audioContextRef.current) {
      await audioContextRef.current.close()
    }
    
    setIsLive(false)
    
    // Update show status
    if (currentShow) {
      await updateShowStatus(currentShow.schedule_id, 'completed')
    }
    
    toast({
      title: "Broadcast Ended",
      description: "Thanks for an amazing show!",
    })
    
    onEndShow()
  }

  const sendChatMessage = () => {
    if (!chatMessage.trim() || !wsRef.current) return
    
    wsRef.current.send(JSON.stringify({
      type: 'dj_message',
      message: chatMessage,
      dj_name: djProfile?.dj_name
    }))
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'dj',
      content: chatMessage,
      timestamp: new Date()
    }])
    
    setChatMessage('')
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted
      })
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={djProfile?.avatar_url} />
                <AvatarFallback>
                  <Mic className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={isLive ? "default" : "secondary"}>
                    {isLive ? "🔴 LIVE" : "📡 SETUP"}
                  </Badge>
                  <Badge variant="outline">{currentShow?.category}</Badge>
                </div>
                <h2 className="font-semibold">{currentShow?.show_name}</h2>
                <p className="text-sm text-muted-foreground">
                  DJ {djProfile?.dj_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                  <Users className="h-5 w-5" />
                  {listenerCount}
                </div>
                <div className="text-xs text-muted-foreground">Listeners</div>
              </div>
              
              {!isLive ? (
                <Button onClick={startBroadcast} size="lg" className="bg-red-600 hover:bg-red-700">
                  <Radio className="h-5 w-5 mr-2" />
                  Go Live
                </Button>
              ) : (
                <Button onClick={endBroadcast} variant="destructive" size="lg">
                  <Square className="h-5 w-5 mr-2" />
                  End Show
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Audio Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Audio Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                onClick={toggleMute}
                disabled={!isLive}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isMuted ? "Unmute" : "Mute"}
              </Button>
              
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant={isLive ? "default" : "secondary"}>
                  {isLive ? "Broadcasting" : "Offline"}
                </Badge>
              </div>
            </div>

            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Audio Quality:</span>
                <Badge variant="outline">24kHz • PCM16</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AI Co-host:</span>
                <Badge variant="outline" className="text-green-700">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      {message.type === 'dj' ? 'DJ' : 
                       message.type === 'ai_response' ? 'AI' : 
                       message.type === 'community_update' ? 'NEWS' :
                       message.type === 'music_suggestion' ? 'MUSIC' : 'LISTENER'}
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
              <SecureTextarea
                placeholder="Send a message to listeners..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                maxLength={280}
                rows={2}
                className="flex-1"
                sanitizeType="text"
              />
              <Button 
                onClick={sendChatMessage}
                disabled={!chatMessage.trim() || !isLive}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}