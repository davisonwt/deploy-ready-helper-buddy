import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Phone, MessageCircle, Users, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useCallManager } from '@/hooks/useCallManager'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

/**
 * RadioHostPanel — Shows online GoSat members as available hosts during broadcasts.
 * Listeners can message or voice-call hosts without interrupting pre-recorded playback.
 */
export function RadioHostPanel({ compact = false }) {
  const { user } = useAuth()
  const { startCall } = useCallManager()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [onlineHosts, setOnlineHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [quickMessage, setQuickMessage] = useState({})
  const [sendingTo, setSendingTo] = useState(null)

  // Track online GoSat users via Supabase Realtime Presence
  useEffect(() => {
    if (!user) return

    let mounted = true

    const fetchGosatUsers = async () => {
      try {
        // Get all gosat user IDs
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'gosat')

        if (roleError) throw roleError
        const gosatIds = (roleData || []).map(r => r.user_id).filter(Boolean)
        if (gosatIds.length === 0) {
          if (mounted) { setOnlineHosts([]); setLoading(false) }
          return
        }

        // Get their profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, first_name, last_name, avatar_url')
          .in('user_id', gosatIds)

        if (profileError) throw profileError
        if (mounted) setOnlineHosts(profiles || [])
      } catch (err) {
        console.error('[RadioHostPanel] Error fetching gosat users:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchGosatUsers()

    // Set up presence channel so GoSats broadcast their online status
    const channel = supabase.channel('radio-host-presence', {
      config: { presence: { key: user.id } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const onlineIds = new Set(Object.keys(state))
        setOnlineHosts(prev => prev.map(h => ({
          ...h,
          _isOnline: onlineIds.has(h.user_id)
        })))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, joined_at: new Date().toISOString() })
        }
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleMessage = useCallback(async (host) => {
    if (!user) return
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: user.id,
        user2_id: host.user_id
      })

      if (error) throw error

      // If there's a quick message, send it
      const msg = quickMessage[host.user_id]?.trim()
      if (msg) {
        await supabase.from('chat_messages').insert({
          room_id: roomId,
          sender_id: user.id,
          content: msg,
          message_type: 'text'
        })
        setQuickMessage(prev => ({ ...prev, [host.user_id]: '' }))
        toast({ title: 'Message sent', description: `Sent to ${host.display_name || 'Host'}` })
      } else {
        // Navigate to chat with this host
        navigate(`/chatapp?room=${roomId}`)
      }
    } catch (err) {
      console.error('[RadioHostPanel] Message error:', err)
      toast({ title: 'Error', description: 'Could not send message', variant: 'destructive' })
    }
  }, [user, quickMessage, navigate, toast])

  const handleCall = useCallback(async (host) => {
    if (!user) return
    try {
      const hostName = host.display_name || host.first_name || 'Host'
      await startCall(host.user_id, hostName, 'audio')
      toast({ title: 'Calling...', description: `Calling ${hostName}` })
    } catch (err) {
      console.error('[RadioHostPanel] Call error:', err)
      toast({ title: 'Call failed', description: 'Could not start call', variant: 'destructive' })
    }
  }, [user, startCall, toast])

  const getDisplayName = (host) =>
    host.display_name || [host.first_name, host.last_name].filter(Boolean).join(' ') || 'GoSat Host'

  const getInitials = (host) => {
    const name = getDisplayName(host)
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  }

  const onlineHostsList = onlineHosts.filter(h => h._isOnline)
  const offlineHostsList = onlineHosts.filter(h => !h._isOnline)

  // Compact mode: just show avatars row (for inside the player)
  if (compact) {
    if (loading || onlineHosts.length === 0) return null

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Hosts:</span>
        <div className="flex -space-x-2">
          {onlineHosts.slice(0, 5).map(host => (
            <Avatar key={host.user_id} className="h-7 w-7 border-2 border-background cursor-pointer hover:scale-110 transition-transform"
              onClick={() => handleMessage(host)}
              title={getDisplayName(host)}
            >
              <AvatarImage src={host.avatar_url} />
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                {getInitials(host)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        {onlineHostsList.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
            {onlineHostsList.length} online
          </Badge>
        )}
      </div>
    )
  }

  // Full panel mode (Hosts tab)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Available Hosts
          {onlineHostsList.length > 0 && (
            <Badge className="bg-green-600 text-xs">{onlineHostsList.length} online</Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Send a message or call a host — your broadcast won't be interrupted
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading hosts...</p>
        ) : onlineHosts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hosts available right now</p>
        ) : (
          <>
            {/* Online hosts first */}
            {[...onlineHostsList, ...offlineHostsList].map(host => {
              const isOnline = host._isOnline
              const isSelf = host.user_id === user?.id

              return (
                <div key={host.user_id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={host.avatar_url} />
                      <AvatarFallback>{getInitials(host)}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{getDisplayName(host)}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">GoSat</Badge>
                      {isOnline && <span className="text-[10px] text-green-600 font-medium">Online</span>}
                      {isSelf && <span className="text-[10px] text-muted-foreground">(You)</span>}
                    </div>

                    {!isSelf && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Input
                          placeholder="Quick message..."
                          className="h-7 text-xs flex-1"
                          value={quickMessage[host.user_id] || ''}
                          onChange={e => setQuickMessage(prev => ({ ...prev, [host.user_id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleMessage(host)}
                          disabled={sendingTo === host.user_id}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleMessage(host)}
                          title="Send message"
                        >
                          {quickMessage[host.user_id]?.trim() ? (
                            <Send className="h-3.5 w-3.5" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleCall(host)}
                          title="Voice call"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </CardContent>
    </Card>
  )
}
