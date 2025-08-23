import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Radio, 
  Users, 
  Clock, 
  Mic,
  Video,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export function PublicLiveSessionsBrowser({ onJoinSession }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLiveSessions()
    
    // Set up real-time subscription for session updates
    const subscription = supabase
      .channel('public-live-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_live_sessions'
        },
        () => {
          fetchLiveSessions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  const fetchLiveSessions = async () => {
    try {
      setLoading(true)

      // Fetch active radio sessions
      const { data: radioSessions, error: radioError } = await supabase
        .from('radio_live_sessions')
        .select(`
          *,
          radio_schedule:schedule_id (
            show_id,
            dj_id,
            radio_djs:dj_id (
              dj_name,
              avatar_url,
              bio
            ),
            radio_shows:show_id (
              show_name,
              description,
              category
            )
          )
        `)
        .in('status', ['waiting', 'live'])
        .order('started_at', { ascending: false })

      if (radioError) throw radioError

      // Fetch generic live sessions (chat rooms, etc.)
      const { data: genericSessions, error: genericError } = await supabase
        .from('live_session_participants')
        .select(`
          session_id,
          created_at,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('participant_type', 'host')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (genericError) throw genericError

      // Combine and format sessions
      const allSessions = []

      // Add radio sessions
      if (radioSessions) {
        radioSessions.forEach(session => {
          const schedule = session.radio_schedule
          const dj = schedule?.radio_djs
          const show = schedule?.radio_shows

          allSessions.push({
            id: session.id,
            type: 'radio',
            title: show?.show_name || 'Live Radio Show',
            description: show?.description || 'Live radio broadcast',
            category: show?.category || 'General',
            host: {
              name: dj?.dj_name || 'Anonymous DJ',
              avatar: dj?.avatar_url,
              bio: dj?.bio
            },
            status: session.status,
            viewerCount: session.viewer_count || 0,
            startedAt: session.started_at,
            createdAt: session.created_at,
            sessionData: session
          })
        })
      }

      // Add generic live sessions (group by session_id for hosts)
      if (genericSessions) {
        const sessionGroups = genericSessions.reduce((acc, participant) => {
          if (!acc[participant.session_id]) {
            acc[participant.session_id] = {
              sessionId: participant.session_id,
              hosts: [],
              createdAt: participant.created_at
            }
          }
          acc[participant.session_id].hosts.push(participant.profiles)
          return acc
        }, {})

        Object.values(sessionGroups).forEach(group => {
          allSessions.push({
            id: group.sessionId,
            type: 'live_session',
            title: 'Live Discussion',
            description: 'Join the conversation',
            category: 'Community',
            host: {
              name: group.hosts[0]?.display_name || 'Anonymous Host',
              avatar: group.hosts[0]?.avatar_url
            },
            coHosts: group.hosts.slice(1),
            status: 'live',
            viewerCount: 0,
            createdAt: group.createdAt,
            sessionData: { id: group.sessionId, type: 'live_session' }
          })
        })
      }

      setSessions(allSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      
    } catch (error) {
      console.error('Error fetching live sessions:', error)
      toast({
        title: "Error",
        description: "Failed to load live sessions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJoinSession = (session) => {
    if (onJoinSession) {
      onJoinSession(session.sessionData, session.type)
    }
  }

  const getStatusBadge = (status, type) => {
    if (status === 'live') {
      return (
        <Badge className="bg-red-500 text-white animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
          LIVE
        </Badge>
      )
    }
    if (status === 'waiting') {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Starting Soon
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        {type === 'radio' ? 'Radio' : 'Discussion'}
      </Badge>
    )
  }

  if (!user) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-16 w-16 mx-auto text-primary/60 mb-4" />
          <h3 className="text-xl font-semibold text-primary mb-2">
            Join Live Sessions
          </h3>
          <p className="text-muted-foreground">
            Please log in to discover and join live sessions in our community
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Radio className="h-6 w-6" />
            Live Sessions
          </h3>
          <p className="text-muted-foreground">
            Discover active conversations and broadcasts
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLiveSessions}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading sessions...</span>
        </div>
      ) : sessions.length === 0 ? (
        <Card className="bg-gradient-to-br from-muted/20 to-muted/40 border-dashed">
          <CardContent className="p-12 text-center">
            <Radio className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              No Live Sessions
            </h3>
            <p className="text-muted-foreground">
              Be the first to start a live session in our community!
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card 
                key={session.id} 
                className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary/30 hover:border-l-primary"
                onClick={() => handleJoinSession(session)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={session.host.avatar} />
                        <AvatarFallback>
                          {session.host.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-semibold">
                            {session.title}
                          </CardTitle>
                          {getStatusBadge(session.status, session.type)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Hosted by {session.host.name}
                        </p>
                        {session.coHosts && session.coHosts.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            + {session.coHosts.length} co-host{session.coHosts.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {session.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{session.viewerCount} watching</span>
                      </div>
                      {session.startedAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(session.startedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {session.category}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {session.type === 'radio' && (
                        <div className="flex items-center gap-1 text-primary">
                          <Mic className="h-4 w-4" />
                          <span className="text-sm">Audio</span>
                        </div>
                      )}
                      {session.type === 'live_session' && (
                        <div className="flex items-center gap-1 text-primary">
                          <Video className="h-4 w-4" />
                          <span className="text-sm">Video</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export default PublicLiveSessionsBrowser