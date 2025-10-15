import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Shield, 
  Mic,
  MessageSquare,
  Send,
  Check,
  X,
  Phone,
  PhoneCall,
  Clock
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function RadioModerationPanel({ 
  liveSession, 
  djProfile, 
  activeHosts = [], 
  guestRequests = [],
  onHostsUpdate,
  onGuestRequestsUpdate 
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [availableDJs, setAvailableDJs] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddHostModal, setShowAddHostModal] = useState(false)
  const [liveMessages, setLiveMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [callQueue, setCallQueue] = useState([])

  useEffect(() => {
    if (liveSession) {
      fetchAvailableDJs()
      fetchLiveMessages()
      fetchCallQueue()
      setupRealtimeSubscriptions()
    }
  }, [liveSession])

  const fetchAvailableDJs = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_djs')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('is_active', true)
        .order('dj_name')

      if (error) throw error
      setAvailableDJs(data || [])
    } catch (error) {
      console.error('Error fetching DJs:', error)
    }
  }

  const fetchLiveMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_live_messages')
        .select('*')
        .eq('session_id', liveSession.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setLiveMessages(data || [])
    } catch (error) {
      console.error('Error fetching live messages:', error)
    }
  }

  const fetchCallQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_call_queue')
        .select('*')
        .eq('session_id', liveSession.id)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })

      if (error) throw error
      setCallQueue(data || [])
    } catch (error) {
      console.error('Error fetching call queue:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to live messages
    const messagesChannel = supabase
      .channel(`radio-messages-${liveSession.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'radio_live_messages',
          filter: `session_id=eq.${liveSession.id}`
        },
        () => fetchLiveMessages()
      )
      .subscribe()

    // Subscribe to call queue changes
    const queueChannel = supabase
      .channel(`call-queue-${liveSession.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'radio_call_queue',
          filter: `session_id=eq.${liveSession.id}`
        },
        () => fetchCallQueue()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(queueChannel)
    }
  }

  const addCoHost = async (djId) => {
    try {
      const { error } = await supabase
        .from('radio_live_hosts')
        .insert({
          session_id: liveSession.id,
          dj_id: djId,
          user_id: availableDJs.find(dj => dj.id === djId)?.user_id,
          role: 'co_host'
        })

      if (error) throw error

      toast({
        title: "Co-Host Added",
        description: "Successfully added co-host to the session",
      })

      setShowAddHostModal(false)
      onHostsUpdate?.()
    } catch (error) {
      console.error('Error adding co-host:', error)
      toast({
        title: "Error",
        description: "Failed to add co-host",
        variant: "destructive"
      })
    }
  }

  const removeHost = async (hostId) => {
    try {
      const { error } = await supabase
        .from('radio_live_hosts')
        .update({ 
          is_active: false,
          left_at: new Date().toISOString()
        })
        .eq('id', hostId)

      if (error) throw error

      toast({
        title: "Host Removed",
        description: "Host has been removed from the session",
      })

      onHostsUpdate?.()
    } catch (error) {
      console.error('Error removing host:', error)
      toast({
        title: "Error",
        description: "Failed to remove host",
        variant: "destructive"
      })
    }
  }

  const approveCallRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('radio_call_queue')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      toast({
        title: "Call Approved",
        description: "Caller has been approved to join",
      })

      fetchCallQueue()
    } catch (error) {
      console.error('Error approving call:', error)
      toast({
        title: "Error",
        description: "Failed to approve call request",
        variant: "destructive"
      })
    }
  }

  const rejectCallRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('radio_call_queue')
        .update({ 
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      fetchCallQueue()
    } catch (error) {
      console.error('Error rejecting call:', error)
    }
  }

  const sendResponse = async (messageId, response) => {
    try {
      const { error } = await supabase
        .from('radio_message_responses')
        .insert({
          message_id: messageId,
          responder_id: user.id,
          response_text: response,
          session_id: liveSession.id
        })

      if (error) throw error

      toast({
        title: "Response Sent",
        description: "Your response has been sent",
      })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending response:', error)
      toast({
        title: "Error",
        description: "Failed to send response",
        variant: "destructive"
      })
    }
  }

  const filteredDJs = availableDJs.filter(dj => 
    dj.dj_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !activeHosts.some(host => host.dj_id === dj.id)
  )

  const isMainHost = activeHosts.some(host => 
    host.user_id === user?.id && host.role === 'main_host'
  )

  const isCoHost = activeHosts.some(host => 
    host.user_id === user?.id && host.role === 'co_host'
  )

  const canManageHosts = isMainHost

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Current Hosts Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Hosts
          </CardTitle>
          {canManageHosts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddHostModal(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Co-Host
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {activeHosts.map((host) => (
                <div key={host.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={host.radio_djs?.avatar_url} />
                      <AvatarFallback>
                        {host.radio_djs?.dj_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {host.radio_djs?.dj_name || host.profiles?.display_name}
                      </p>
                      <div className="flex items-center gap-2">
                        {host.role === 'main_host' ? (
                          <Badge variant="default" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Main Host
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Co-Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManageHosts && host.role !== 'main_host' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHost(host.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Live Messages Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Live Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {liveMessages.map((message) => (
                <div key={message.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={message.profiles?.avatar_url} />
                        <AvatarFallback>
                          {message.profiles?.display_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {message.profiles?.display_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{message.message_text}</p>
                  {(isMainHost || isCoHost) && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type response..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => sendResponse(message.id, newMessage)}
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Call Queue Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {callQueue.map((caller, index) => (
                <div key={caller.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={caller.profiles?.avatar_url} />
                        <AvatarFallback>
                          {caller.profiles?.display_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {caller.profiles?.display_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(caller.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  {caller.topic && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Topic: {caller.topic}
                    </p>
                  )}
                  
                  {(isMainHost || isCoHost) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveCallRequest(caller.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectCallRequest(caller.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {callQueue.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No callers in queue</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Co-Host Modal */}
      <Dialog open={showAddHostModal} onOpenChange={setShowAddHostModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Co-Host</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search DJs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {filteredDJs.map((dj) => (
                  <div key={dj.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={dj.avatar_url} />
                        <AvatarFallback>{dj.dj_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{dj.dj_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dj.profiles?.display_name}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addCoHost(dj.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RadioModerationPanel