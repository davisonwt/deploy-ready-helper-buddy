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
  MessageCircle,
  Folder
} from 'lucide-react'
import { LiveVideoCallInterface } from '@/components/radio/LiveVideoCallInterface'
import { MediaDock } from '@/components/live/media/MediaDock'
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
      
      const queue = data || []
      if (queue.length > 0) {
        const userIds = [...new Set(queue.map(c => c.user_id).filter(Boolean))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', userIds)

        const profileMap = {}
        profiles?.forEach(p => {
          profileMap[p.user_id] = {
            display_name: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
            avatar_url: p.avatar_url
          }
        })

        setCallQueue(queue.map(c => ({ ...c, profiles: profileMap[c.user_id] || null })))
      } else {
        setCallQueue([])
      }
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
      
      // Resolve sender names from profiles
      const msgs = data || []
      if (msgs.length > 0) {
        const senderIds = [...new Set(msgs.map(m => m.sender_id).filter(Boolean))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', senderIds)

        const profileMap = {}
        profiles?.forEach(p => {
          profileMap[p.user_id] = {
            display_name: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
            avatar_url: p.avatar_url
          }
        })

        const enriched = msgs.map(m => ({
          ...m,
          profiles: profileMap[m.sender_id] || null
        }))
        setMessages(enriched)
      } else {
        setMessages([])
      }
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
      
      // Resolve profile names
      const requests = data || []
      if (requests.length > 0) {
        const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', userIds)

        const profileMap = {}
        profiles?.forEach(p => {
          profileMap[p.user_id] = {
            display_name: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
            avatar_url: p.avatar_url
          }
        })

        const enriched = requests.map(r => ({
          ...r,
          profiles: profileMap[r.user_id] || null
        }))
        setGuestRequests(enriched)
        setApprovedGuests(enriched.filter(g => g.status === 'approved'))
      } else {
        setGuestRequests([])
        setApprovedGuests([])
      }
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
      {/* Session Header - Darker Theme */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SessionIcon className={`h-6 w-6 ${sessionColor}`} />
              <div>
                <h2 className="text-xl font-bold text-white">{sessionTitle}</h2>
                <p className="text-sm text-slate-300">{sessionData.title || 'Live Session'}</p>
              </div>
              <Badge variant="outline" className="bg-red-500/30 text-red-400 border-red-500/50 animate-pulse">
                🔴 LIVE
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1 text-slate-300">
                <Users className="h-4 w-4" />
                <span className="text-sm">{viewerCount} viewers</span>
              </div>
              {!isHost && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handRaised ? null : requestToSpeak}
                  disabled={handRaised}
                  className={handRaised ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"}
                >
                  <Hand className="h-4 w-4 mr-1" />
                  {handRaised ? "Hand Raised" : "Raise Hand"}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Main Interface - Darker Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Call Interface - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-700">
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

        {/* Right Sidebar - Interactive Feed with Darker Theme */}
        <div className="space-y-4">
          <Tabs defaultValue="messages" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700 gap-2 p-1.5">
              <TabsTrigger value="messages" className="text-slate-300 text-[10px] px-0.5 py-1.5 leading-tight">
                Msgs
              </TabsTrigger>
              <TabsTrigger value="media" className="text-slate-300 text-[10px] px-0.5 py-1.5 leading-tight">
                Media
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-slate-300 text-[10px] px-0.5 py-1.5 leading-tight">
                Queue ({callQueue.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="text-slate-300 text-[10px] px-0.5 py-1.5 leading-tight">
                Req ({guestRequests.filter(r => r.status === 'pending').length})
              </TabsTrigger>
            </TabsList>

            {/* Messages Tab - Integrated Send Message */}
            <TabsContent value="messages" className="space-y-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="border-b border-slate-700 pb-3">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-green-400" />
                    <CardTitle className="text-sm text-white">Send Message to Hosts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Message Input - Prominent */}
                  <div className="space-y-3 mb-4">
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message to the hosts..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      className="min-h-[80px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-500"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={!messageText.trim()}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                      Your message will be visible to all hosts and co-hosts during the live show.
                    </p>
                  </div>

                  <Separator className="my-4 bg-slate-700" />

                  {/* Live Chat Feed */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-300 uppercase">Live Chat</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div key={message.id} className="flex items-start space-x-2 p-2 bg-slate-800/50 rounded">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={message.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs bg-slate-700">
                                {(message.profiles?.display_name?.charAt(0) || 'L')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-white">
                                  {message.profiles?.display_name || 'Listener'}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(message.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300 break-words">
                                {message.message_text}
                              </p>
                              {message.radio_message_responses?.map((response) => (
                                <div key={response.id} className="mt-2 ml-4 p-2 bg-green-500/20 rounded text-xs">
                                  <span className="font-medium text-green-400">
                                    {response.responder_profile?.display_name}:
                                  </span> <span className="text-slate-300">{response.response_text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {messages.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">
                            No messages yet. Be the first to send a message!
                          </p>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Media Dock Tab */}
            <TabsContent value="media" className="space-y-4">
              <MediaDock 
                sessionId={sessionData?.id} 
                isHost={isHost}
              />
            </TabsContent>

            {/* Call Queue Tab - Integrated Call In */}
            <TabsContent value="queue" className="space-y-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="border-b border-slate-700 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-blue-400" />
                      <CardTitle className="text-sm text-white">Call In to Show</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Call Request - Prominent */}
                  {!isHost && (
                    <div className="space-y-3 mb-4">
                      <Textarea
                        placeholder="What would you like to talk about?"
                        className="min-h-[80px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                      />
                      <Button 
                        onClick={joinCallQueue}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <PhoneCall className="h-4 w-4 mr-2" />
                        Request to Call In
                      </Button>
                      <p className="text-xs text-slate-400 text-center">
                        Briefly describe what you'd like to discuss. The hosts will review your request.
                      </p>
                    </div>
                  )}

                  <Separator className="my-4 bg-slate-700" />

                  {/* Call Queue List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-300 uppercase">Queue ({callQueue.length})</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {callQueue.map((caller, index) => (
                          <div key={caller.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                                #{index + 1}
                              </Badge>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={caller.profiles?.avatar_url} />
                                <AvatarFallback className="text-xs bg-slate-700">
                                  {(caller.profiles?.display_name?.charAt(0) || 'C')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-white">{caller.profiles?.display_name || 'Caller'}</span>
                            </div>
                            {isHost && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => approveCallRequest(caller.id)}
                                className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                              >
                                <PhoneCall className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {callQueue.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-4">
                            No callers in queue
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Guest Requests Tab - Darker Theme */}
            <TabsContent value="requests" className="space-y-4">
              <Card className="bg-slate-900 border-slate-700">
                <CardHeader className="border-b border-slate-700 pb-3">
                  <div className="flex items-center space-x-2">
                    <Hand className="h-5 w-5 text-yellow-400" />
                    <CardTitle className="text-sm text-white">Call In to Show</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-80">
                    <div className="space-y-2">
                      {guestRequests.filter(req => req.status === 'pending').map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={request.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs bg-slate-700">
                                {(request.profiles?.display_name?.charAt(0) || 'G')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="text-sm font-medium text-white">{request.profiles?.display_name || 'Guest'}</span>
                              <p className="text-xs text-slate-400">{request.request_message}</p>
                            </div>
                          </div>
                          {isHost && (
                            <Button 
                              size="sm" 
                              onClick={() => approveGuestRequest(request.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      ))}
                      {guestRequests.filter(req => req.status === 'pending').length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">
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