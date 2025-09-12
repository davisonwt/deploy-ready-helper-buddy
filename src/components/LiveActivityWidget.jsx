import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Radio,
  Users,
  MessageCircle,
  GraduationCap,
  Phone,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export default function LiveActivityWidget() {
  const { user } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded
  const [isVisible, setIsVisible] = useState(true)
  
  console.log('LiveActivityWidget: user exists?', !!user, 'isVisible?', isVisible, 'isExpanded?', isExpanded)
  const [liveData, setLiveData] = useState({
    radioHosts: [],
    groupCalls: [],
    communityChats: [],
    lifeCourses: [],
    aodHereticFrequencies: null
  })
  const [loading, setLoading] = useState(true)

  // Set up listener for schedule updates from Personnel Assignments
  useEffect(() => {
    const handleScheduleUpdate = (event) => {
      console.log('📅 Schedule updated, refreshing Live Activities...', event.detail)
      setTimeout(() => fetchLiveData(), 500)
    }

    window.addEventListener('scheduleUpdated', handleScheduleUpdate)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate)
    }
  }, [])

  useEffect(() => {
    // Always fetch data first to show something  
    fetchLiveData()
    
    if (user) {
      // Set up real-time subscriptions for authenticated users
      const subscriptions = setupRealtimeSubscriptions()
      
      return () => {
        subscriptions.forEach(sub => supabase.removeChannel(sub))
      }
    }
  }, [user])

  const fetchLiveData = async () => {
    try {
      setLoading(true)
      
      // Fetch live radio sessions AND scheduled sessions
      const { data: radioData, error: radioError } = await supabase
        .from('radio_live_sessions')
        .select(`
          *,
          radio_schedule!inner (
            *,
            radio_djs (
              dj_name,
              avatar_url
            ),
            radio_shows (
              show_name,
              category
            )
          )
        `)
        .eq('status', 'live')
        .order('created_at', { ascending: false })

      // ALSO fetch today's scheduled sessions that aren't necessarily live yet
      const today = new Date().toISOString().split('T')[0]
      const currentHour = new Date().getHours()
      
      const { data: scheduledData, error: scheduledError } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows (
            show_name,
            category,
            subject
          ),
          radio_djs (
            dj_name,
            avatar_url
          )
        `)
        .eq('time_slot_date', today)
        .eq('approval_status', 'approved')
        .gte('hour_slot', currentHour - 2) // Show sessions from 2 hours ago to future
        .order('hour_slot', { ascending: true })
        .limit(3)

      // Combine live and scheduled data
      const allRadioSessions = [
        ...(radioData || []),
        ...(scheduledData || []).map(schedule => ({
          id: schedule.id,
          status: schedule.status,
          viewer_count: schedule.listener_count || 0,
          created_at: schedule.start_time,
          radio_schedule: schedule
        }))
      ]

      // Fetch active group calls from live_call_participants
      const { data: callData, error: callError } = await supabase
        .from('live_call_participants')
        .select(`
          call_session_id,
          role,
          profiles!inner (
            display_name
          )
        `)
        .eq('is_active', true)
        .eq('role', 'host')
        .order('joined_at', { ascending: false })

      // Group calls by session and count participants
      const groupCallsMap = new Map()
      if (callData) {
        for (const call of callData) {
          if (!groupCallsMap.has(call.call_session_id)) {
            groupCallsMap.set(call.call_session_id, {
              id: call.call_session_id,
              title: `Live Session`,
              host: call.profiles.display_name,
              participants: 0,
              isLive: true,
              startedAt: new Date(),
              type: "community"
            })
          }
        }
        
        // Get participant counts for each session
        const { data: participantCounts } = await supabase
          .from('live_call_participants')
          .select('call_session_id')
          .eq('is_active', true)
        
        if (participantCounts) {
          const counts = participantCounts.reduce((acc, p) => {
            acc[p.call_session_id] = (acc[p.call_session_id] || 0) + 1
            return acc
          }, {})
          
          groupCallsMap.forEach((call, sessionId) => {
            call.participants = counts[sessionId] || 0
          })
        }
      }
      
      const groupCalls = Array.from(groupCallsMap.values())

      // Fetch active community chats with recent activity
      const { data: chatData, error: chatError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner (
            id,
            user_id,
            is_active
          ),
          chat_messages (
            created_at
          )
        `)
        .eq('is_active', true)
        .eq('room_type', 'group')
        .eq('chat_participants.is_active', true)
        .order('updated_at', { ascending: false })
        .limit(5)

      // Process chat data to show only recently active chats
      const activeCommunityChats = chatData?.filter(chat => {
        const hasRecentMessages = chat.chat_messages?.some(msg => 
          new Date(msg.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        )
        return hasRecentMessages && chat.chat_participants?.length > 1
      }) || []

      // Fetch live courses from live_session_participants
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_session_participants')
        .select(`
          session_id,
          participant_type,
          profiles!inner (
            display_name
          )
        `)
        .eq('status', 'active')
        .eq('participant_type', 'host')
        .order('joined_at', { ascending: false })

      const lifeCourses = sessionData?.map(session => ({
        id: session.session_id,
        title: `Live Session by ${session.profiles.display_name}`,
        instructor: session.profiles.display_name,
        isLive: true,
        participants: 0, // Will be updated below
        category: "live",
        nextSession: new Date()
      })) || []

      // Get participant counts for live sessions
      if (sessionData?.length > 0) {
        const { data: sessionParticipants } = await supabase
          .from('live_session_participants')
          .select('session_id')
          .eq('status', 'active')
        
        if (sessionParticipants) {
          const sessionCounts = sessionParticipants.reduce((acc, p) => {
            acc[p.session_id] = (acc[p.session_id] || 0) + 1
            return acc
          }, {})
          
          lifeCourses.forEach(course => {
            course.participants = sessionCounts[course.id] || 0
          })
        }
      }

      // Check for AoD Heretic's Frequencies - look for specific radio show
      const { data: aodData } = await supabase
        .from('radio_live_sessions')
        .select(`
          *,
          radio_schedule!inner (
            radio_shows!inner (
              show_name
            ),
            radio_djs (
              dj_name,
              avatar_url
            )
          )
        `)
        .ilike('radio_schedule.radio_shows.show_name', '%heretic%')
        .eq('status', 'live')
        .single()

      const aodHereticFrequencies = aodData ? {
        id: aodData.id,
        showName: aodData.radio_schedule?.radio_shows?.show_name || "AoD Heretic's Frequencies",
        currentHost: aodData.radio_schedule?.radio_djs?.dj_name || "Ed",
        hostAvatar: aodData.radio_schedule?.radio_djs?.avatar_url,
        isLive: true,
        listeners: aodData.viewer_count || 0,
        frequency: "777.7 MHz",
        description: "Unconventional wisdom and alternative perspectives",
        startedAt: new Date(aodData.created_at),
        topic: "Live Now"
      } : null

      setLiveData({
        radioHosts: allRadioSessions || [],
        groupCalls,
        communityChats: activeCommunityChats,
        lifeCourses,
        aodHereticFrequencies
      })

    } catch (err) {
      console.error('Error fetching live data:', err)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscriptions = () => {
    const radioChannel = supabase
      .channel('radio-live-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'radio_live_sessions'
      }, () => {
        setTimeout(() => fetchLiveData(), 0)
      })
      .subscribe()

    const scheduleChannel = supabase
      .channel('radio-schedule-updates')  
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'radio_schedule'
      }, () => {
        setTimeout(() => fetchLiveData(), 0)
      })
      .subscribe()

    const chatChannel = supabase
      .channel('chat-room-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms'
      }, () => {
        setTimeout(() => fetchLiveData(), 0)
      })
      .subscribe()

    const callParticipantsChannel = supabase
      .channel('call-participants-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_call_participants'
      }, () => {
        setTimeout(() => fetchLiveData(), 0)
      })
      .subscribe()

    const liveSessionChannel = supabase
      .channel('live-session-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_session_participants'
      }, () => {
        setTimeout(() => fetchLiveData(), 0)
      })
      .subscribe()

    const chatMessagesChannel = supabase
      .channel('chat-messages-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, () => {
        setTimeout(() => fetchLiveData(), 0)
      })
      .subscribe()

    return [radioChannel, scheduleChannel, chatChannel, callParticipantsChannel, liveSessionChannel, chatMessagesChannel]
  }

  const joinActivity = async (type, activityId) => {
    try {
      switch (type) {
        case 'radio':
          // Navigate to radio station
          window.location.href = '/grove-station'
          break
        case 'chat':
          // Join chat room
          const { error } = await supabase
            .from('chat_participants')
            .insert([{
              room_id: activityId,
              user_id: user.id,
              is_active: true
            }])
          
          if (error && error.code !== '23505') throw error // Ignore unique constraint violations
          toast.success('Joined chat room!')
          break
        case 'course':
          toast.info('Course registration feature coming soon!')
          break
        case 'call':
          toast.info('Group call feature coming soon!')
          break
        default:
          break
      }
    } catch (err) {
      console.error('Error joining activity:', err)
      toast.error('Failed to join activity')
    }
  }

  // Show widget for all users, with different content based on auth status
  if (!isVisible) {
    console.log('LiveActivityWidget: Not showing - isVisible:', isVisible)
    return null
  }

  const totalActivities = liveData.radioHosts.length + 
                         liveData.groupCalls.length + 
                         liveData.communityChats.length + 
                         liveData.lifeCourses.filter(course => course.isLive).length +
                         (liveData.aodHereticFrequencies?.isLive ? 1 : 0)

  return (
    <div 
      className="fixed bottom-6 left-6 w-80 max-w-[calc(100vw-3rem)] pointer-events-auto" 
      style={{ 
        zIndex: 50, // Reasonable z-index - above content but below modals/dropdowns
        position: 'fixed'
      }}
    >
      {/* Debug indicator */}
      <div 
        className="absolute -top-10 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded pointer-events-auto"
        style={{ zIndex: 51 }}
      >
        WIDGET ACTIVE
      </div>
      
      <Card 
        className="bg-white dark:bg-gray-900 border-primary/60 shadow-xl ring-1 ring-primary/20 relative pointer-events-auto"
        style={{ 
          zIndex: 50,
          position: 'relative'
        }}
      >
        {!user && (
          <div 
            className="absolute -top-2 -right-2 pointer-events-none"
            style={{ zIndex: 51 }}
          >
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse shadow-lg">
              🔴 LIVE NOW
            </div>
          </div>
        )}
        <CardHeader 
          className="pb-3 cursor-pointer bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/20 relative pointer-events-auto hover:bg-primary/5 transition-colors"
          onClick={() => {
            console.log('Header clicked, toggling expand from', isExpanded, 'to', !isExpanded)
            setIsExpanded(!isExpanded)
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className="h-6 w-6 text-primary animate-pulse" />
                {totalActivities > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-bounce shadow-lg">
                    {totalActivities}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-base font-bold text-primary">🎬 Live Activities</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {user ? 'Click to join activities' : 'Login to participate'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsVisible(false)
                }}
                className="hover:bg-destructive/20 hover:text-destructive rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent 
            className="pt-0 max-h-96 overflow-y-auto space-y-4 relative pointer-events-auto bg-white dark:bg-gray-900"
            style={{ zIndex: 50 }}
          >
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">Loading activities...</p>
              </div>
            ) : (
              <>
                {/* Live Radio Hosts */}
                {liveData.radioHosts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                      <Radio className="h-3 w-3" />
                      Live on Radio
                    </h4>
                    {liveData.radioHosts.slice(0, 2).map((session) => (
                      <div 
                        key={session.id}
                        className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={session.radio_schedule?.radio_djs?.avatar_url} />
                              <AvatarFallback className="text-xs">DJ</AvatarFallback>
                            </Avatar>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </div>
                          <div>
                            <div className="text-xs font-medium">
                              {session.radio_schedule?.radio_djs?.dj_name || 'DJ Live'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {session.viewer_count || 0} listeners
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => joinActivity('radio', session.id)}
                        >
                          Listen
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* AoD Heretic's Frequencies */}
                {liveData.aodHereticFrequencies && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-orange-600 flex items-center gap-1">
                      <Radio className="h-3 w-3" />
                      AoD Heretic's Frequencies
                    </h4>
                    <div className={`flex items-center justify-between p-2 rounded-lg border ${
                      liveData.aodHereticFrequencies.isLive 
                        ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                        : 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={liveData.aodHereticFrequencies.hostAvatar} />
                            <AvatarFallback className="text-xs bg-orange-500 text-white">AH</AvatarFallback>
                          </Avatar>
                          {liveData.aodHereticFrequencies.isLive && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium">
                            {liveData.aodHereticFrequencies.currentHost}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {liveData.aodHereticFrequencies.frequency} • {liveData.aodHereticFrequencies.listeners} listeners
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                          {liveData.aodHereticFrequencies.isLive ? 'LIVE' : 'OFF-AIR'}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => joinActivity('radio', liveData.aodHereticFrequencies.id)}
                          disabled={!liveData.aodHereticFrequencies.isLive}
                        >
                          {liveData.aodHereticFrequencies.isLive ? 'Tune In' : 'Offline'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Group Calls */}
                {liveData.groupCalls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Group Calls
                    </h4>
                    {liveData.groupCalls.slice(0, 2).map((call) => (
                      <div 
                        key={call.id}
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <Phone className="h-3 w-3 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          </div>
                          <div>
                            <div className="text-xs font-medium line-clamp-1">
                              {call.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {call.participants}/{call.maxParticipants} • {call.host}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => joinActivity('call', call.id)}
                        >
                          Join
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Community Chats */}
                {liveData.communityChats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Community Chats
                    </h4>
                    {liveData.communityChats.slice(0, 2).map((chat) => (
                      <div 
                        key={chat.id}
                        className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-medium line-clamp-1">
                              {chat.name || 'Community Chat'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {chat.chat_participants?.filter(p => p.is_active).length || 0} active
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => joinActivity('chat', chat.id)}
                        >
                          Chat
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Life Courses */}
                {liveData.lifeCourses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-primary flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      Life Courses
                    </h4>
                    {liveData.lifeCourses.slice(0, 3).map((course) => (
                      <div 
                        key={course.id}
                        className={`flex items-center justify-between p-2 rounded-lg border ${
                          course.isLive 
                            ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800'
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <GraduationCap className="h-3 w-3 text-white" />
                            </div>
                            {course.isLive && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium line-clamp-1">
                              {course.title}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {course.isPaid ? (
                                <><DollarSign className="h-2 w-2" />${course.price}</>
                              ) : (
                                'Free'
                              )}
                              {course.isLive ? (
                                <span className="text-purple-600 font-medium">• Live Now</span>
                              ) : (
                                <span>• {formatDistanceToNow(course.nextSession)} left</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-6"
                          onClick={() => joinActivity('course', course.id)}
                        >
                          {course.isLive ? 'Join' : 'Register'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {totalActivities === 0 && (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No live activities right now</p>
                    <p className="text-xs text-muted-foreground">Check back later!</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}