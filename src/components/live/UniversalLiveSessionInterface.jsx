import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Crown,
  Shield,
  User,
  Settings,
  MessageSquare,
  Phone,
  PhoneCall,
  Hand,
  Clock,
  Send,
  Users,
  Radio,
  BookOpen,
  MessageCircle
} from 'lucide-react'
import { LiveVideoCallInterface } from '@/components/radio/LiveVideoCallInterface'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function UniversalLiveSessionInterface({ 
  sessionData,
  sessionType = 'radio', // 'radio', 'chat', 'course', 'general'
  currentUser,
  isHost = false,
  onSessionEnd
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Session state
  const [activeHosts, setActiveHosts] = useState([])
  const [approvedGuests, setApprovedGuests] = useState([])
  const [callQueue, setCallQueue] = useState([])
  const [messages, setMessages] = useState([])
  const [guestRequests, setGuestRequests] = useState([])
  
  // UI state
  const [messageText, setMessageText] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  
  // Live features state
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [handRaised, setHandRaised] = useState(false)

  const messagesEndRef = useRef(null)

  // Get session type icon and title
  const getSessionTypeInfo = () => {
    switch (sessionType) {
      case 'radio':
        return { icon: Radio, title: 'Radio Session', color: 'text-red-500' }
      case 'course':
        return { icon: BookOpen, title: 'Live Course', color: 'text-blue-500' }
      case 'chat':
        return { icon: MessageCircle, title: 'Live Chat', color: 'text-green-500' }
      default:
        return { icon: Video, title: 'Live Session', color: 'text-purple-500' }
    }
  }

  const { icon: SessionIcon, title: sessionTitle, color: sessionColor } = getSessionTypeInfo()

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscriptions for session data
  useEffect(() => {
    if (!sessionData?.id) return

    const setupSubscriptions = () => {
      // Subscribe to active hosts changes
      const hostsSubscription = supabase
        .channel(`live-hosts-${sessionData.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'radio_live_hosts',
            filter: `session_id=eq.${sessionData.id}`
          },
          () => fetchActiveHosts()
        )
        .subscribe()

      // Subscribe to call queue changes
      const queueSubscription = supabase
        .channel(`call-queue-${sessionData.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'radio_call_queue',
            filter: `session_id=eq.${sessionData.id}`
          },
          () => fetchCallQueue()
        )
        .subscribe()

      // Subscribe to messages
      const messagesSubscription = supabase
        .channel(`live-messages-${sessionData.id}`)
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'radio_live_messages',
            filter: `session_id=eq.${sessionData.id}`
          },
          () => fetchMessages()
        )
        .subscribe()

      // Subscribe to guest requests
      const guestsSubscription = supabase
        .channel(`guest-requests-${sessionData.id}`)
        .on('postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'radio_guest_requests',
            filter: `session_id=eq.${sessionData.id}`
          },
          () => fetchGuestRequests()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(hostsSubscription)
        supabase.removeChannel(queueSubscription)
        supabase.removeChannel(messagesSubscription)
        supabase.removeChannel(guestsSubscription)
      }
    }

    return setupSubscriptions()
  }, [sessionData?.id])

  const fetchActiveHosts = async () => {
    if (!sessionData?.id) return

    try {
      const { data, error } = await supabase
        .from('radio_live_hosts')
        .select(`
          *,
          radio_djs (dj_name, avatar_url)
        `)
        .eq('session_id', sessionData.id)
        .eq('is_active', true)

      if (error) throw error
      setActiveHosts(data || [])
    } catch (error) {
      console.error('Error fetching active hosts:', error)
    }
  }

  const fetchCallQueue = async () => {
    if (!sessionData?.id) return

    try {
      const { data, error } = await supabase
        .from('radio_call_queue')
        .select('*')
        .eq('session_id', sessionData.id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })

      if (error) throw error
      setCallQueue(data || [])
    } catch (error) {
      console.error('Error fetching call queue:', error)
    }
  }

  const fetchMessages = async () => {
    if (!sessionData?.id) return

    try {
      const { data, error } = await supabase
        .from('radio_live_messages')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchGuestRequests = async () => {
    if (!sessionData?.id) return

    try {
      const { data, error } = await supabase
        .from('radio_guest_requests')
        .select('*')
        .eq('session_id', sessionData.id)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: true })

      if (error) throw error
      setGuestRequests(data || [])
      setApprovedGuests(data?.filter(g => g.status === 'approved') || [])
    } catch (error) {
      console.error('Error fetching guest requests:', error)
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !sessionData?.id) return

    try {
      const { error } = await supabase
        .from('radio_live_messages')
        .insert({
          session_id: sessionData.id,
          sender_id: user.id,
          message_text: messageText.trim(),
          message_type: 'text'
        })

      if (error) throw error
      setMessageText('')
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
    if (!sessionData?.id) return

    try {
      const { error } = await supabase
        .from('radio_call_queue')
        .insert({
          session_id: sessionData.id,
          user_id: user.id,
          topic: 'Live conversation request'
        })

      if (error) throw error
      
      toast({
        title: "Joined Queue",
        description: "You've been added to the call queue",
      })
    } catch (error) {
      console.error('Error joining queue:', error)
      toast({
        title: "Error",
        description: "Failed to join call queue",
        variant: "destructive"
      })
    }
  }

  const requestToSpeak = async () => {
    if (!sessionData?.id) return

    try {
      const { error } = await supabase
        .from('radio_guest_requests')
        .insert({
          session_id: sessionData.id,
          user_id: user.id,
          request_message: 'Request to speak in live session'
        })

      if (error) throw error
      
      setHandRaised(true)
      toast({
        title: "Hand Raised",
        description: "Your request to speak has been sent",
      })
    } catch (error) {
      console.error('Error requesting to speak:', error)
      toast({
        title: "Error",
        description: "Failed to request speaking permission",
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
        title: "Guest Approved",
        description: "Guest has been approved to join the session",
      })
    } catch (error) {
      console.error('Error approving guest:', error)
    }
  }

  const approveCallRequest = async (queueId) => {
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

  // Initialize data on component mount
  useEffect(() => {
    if (sessionData?.id) {
      fetchActiveHosts()
      fetchCallQueue()
      fetchMessages()
      fetchGuestRequests()
    }
  }, [sessionData?.id])

  if (!sessionData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No active session</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SessionIcon className={`h-6 w-6 ${sessionColor}`} />
              <div>
                <h2 className="text-xl font-bold">{sessionTitle}</h2>
                <p className="text-sm text-muted-foreground">{sessionData.title || 'Live Session'}</p>
              </div>
              <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-500/30">
                🔴 LIVE
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">{viewerCount} viewers</span>
              </div>
              {!isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handRaised ? null : requestToSpeak}
                  disabled={handRaised}
                  className={handRaised ? "bg-yellow-500/20 text-yellow-700" : ""}
                >
                  <Hand className="h-4 w-4 mr-1" />
                  {handRaised ? "Hand Raised" : "Raise Hand"}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Call Interface - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
            <LiveVideoCallInterface
              liveSession={sessionData}
              activeHosts={activeHosts}
              approvedGuests={approvedGuests}
              currentUser={user}
              isHost={isHost}
              onHostsUpdate={fetchActiveHosts}
              onGuestsUpdate={fetchGuestRequests}
            />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Queue, Messages, Controls */}
        <div className="space-y-4">
          <Tabs defaultValue="messages" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="messages">
                <MessageSquare className="h-4 w-4 mr-1" />
                Messages
              </TabsTrigger>
              <TabsTrigger value="queue">
                <Clock className="h-4 w-4 mr-1" />
                Queue ({callQueue.length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                <Hand className="h-4 w-4 mr-1" />
                Requests ({guestRequests.filter(r => r.status === 'pending').length})
              </TabsTrigger>
            </TabsList>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Live Chat</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-64 mb-4">
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div key={message.id} className="flex items-start space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={message.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {(message.profiles?.display_name?.charAt(0) || 'L')}
                              </AvatarFallback>
                            </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {message.profiles?.display_name || 'Listener'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground break-words">
                              {message.message_text}
                            </p>
                            {/* Show responses if any */}
                            {message.radio_message_responses?.map((response) => (
                              <div key={response.id} className="mt-2 ml-4 p-2 bg-primary/10 rounded text-xs">
                                <span className="font-medium">
                                  {response.responder_profile?.display_name}:
                                </span> {response.response_text}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="flex space-x-2">
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={sendMessage} disabled={!messageText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Call Queue Tab */}
            <TabsContent value="queue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Call Queue
                    {!isHost && (
                      <Button size="sm" variant="outline" onClick={joinCallQueue}>
                        <Phone className="h-4 w-4 mr-1" />
                        Join Queue
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {callQueue.map((caller, index) => (
                        <div key={caller.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={caller.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {(caller.profiles?.display_name?.charAt(0) || 'C')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{caller.profiles?.display_name || 'Caller'}</span>
                          </div>
                          {isHost && (
                            <Button size="sm" variant="outline" onClick={() => approveCallRequest(caller.id)}>
                              <PhoneCall className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {callQueue.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No callers in queue
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guest Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Speaking Requests</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {guestRequests.filter(req => req.status === 'pending').map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={request.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {(request.profiles?.display_name?.charAt(0) || 'G')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{request.profiles?.display_name || 'Guest'}</span>
                          </div>
                          {isHost && (
                            <Button size="sm" variant="outline" onClick={() => approveGuestRequest(request.id)}>
                              Approve
                            </Button>
                          )}
                        </div>
                      ))}
                      {guestRequests.filter(req => req.status === 'pending').length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No pending requests
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}