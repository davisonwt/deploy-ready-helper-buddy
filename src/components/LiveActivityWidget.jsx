import { useState, useEffect } from 'react'
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
  DollarSign,
  Mail,
  UserPlus
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { getCurrentTheme } from '@/utils/dashboardThemes'

export default function LiveActivityWidget() {
  const { user } = useAuth()
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded
  const [isVisible, setIsVisible] = useState(true)
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  
  console.log('LiveActivityWidget: user exists?', !!user, 'isVisible?', isVisible, 'isExpanded?', isExpanded)
  const [liveData, setLiveData] = useState({
    radioHosts: [],
    groupCalls: [],
    communityChats: [],
    lifeCourses: [],
    aodHereticFrequencies: null,
    unreadMessages: [],
    forumInvitations: []
  })
  const [loading, setLoading] = useState(true)

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, [])

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

      // Fetch active group calls from live_call_participants (no FK joins)
      const { data: callData } = await supabase
        .from('live_call_participants')
        .select('call_session_id, role, user_id, joined_at')
        .eq('is_active', true)
        .eq('role', 'host')
        .order('joined_at', { ascending: false })

      // Map host user_ids to profile display names
      const hostIds = Array.from(new Set((callData || []).map(c => c.user_id)))
      const profileMap = {}
      if (hostIds.length > 0) {
        const { data: hostProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', hostIds)
        ;(hostProfiles || []).forEach(p => {
          profileMap[p.user_id] = p.display_name
        })
      }

      // Group calls by session and count participants
      const groupCallsMap = new Map()
      for (const call of callData || []) {
        if (!groupCallsMap.has(call.call_session_id)) {
          groupCallsMap.set(call.call_session_id, {
            id: call.call_session_id,
            title: 'Live Session',
            host: profileMap[call.user_id] || 'Host',
            participants: 0,
            isLive: true,
            startedAt: new Date(),
            type: 'community'
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
      const { data: sessionData } = await supabase
        .from('live_session_participants')
        .select('session_id, participant_type, user_id, joined_at')
        .eq('status', 'active')
        .eq('participant_type', 'host')
        .order('joined_at', { ascending: false })

      // Resolve host names without relying on FK joins
      const hostUserIds = Array.from(new Set((sessionData || []).map(s => s.user_id)))
      const sessionProfileMap = {}
      if (hostUserIds.length > 0) {
        const { data: sessionProfiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', hostUserIds)
        ;(sessionProfiles || []).forEach(p => {
          sessionProfileMap[p.user_id] = p.display_name
        })
      }

      const lifeCourses = (sessionData || []).map(session => {
        const name = sessionProfileMap[session.user_id] || 'Host'
        return {
          id: session.session_id,
          title: `Live Session by ${name}`,
          instructor: name,
          isLive: true,
          participants: 0, // Will be updated below
          category: 'live',
          nextSession: new Date()
        }
      })

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
        .maybeSingle()

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

      // Fetch unread forum messages
      let unreadMessages = []
      if (user) {
        // Get all forums the user participates in
        const { data: userRooms } = await supabase
          .from('chat_participants')
          .select('room_id')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (userRooms && userRooms.length > 0) {
          const roomIds = userRooms.map(r => r.room_id)
          
          // Get unread messages (messages created after user joined, or use a read tracking system)
          // For now, we'll get recent messages from the last 24 hours
          // Fetch without FK joins to avoid 400 errors
          const { data: recentMessages } = await supabase
            .from('chat_messages')
            .select('*')
            .in('room_id', roomIds)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
            .limit(10)

          // Fetch rooms separately to filter group rooms
          const { data: rooms } = await supabase
            .from('chat_rooms')
            .select('id, name, room_type')
            .in('id', roomIds)
            .eq('room_type', 'group')
          
          const groupRoomIds = new Set((rooms || []).map(r => r.id))
          const groupMessages = (recentMessages || []).filter(m => groupRoomIds.has(m.room_id))
          
          // Fetch sender profiles separately
          const senderIds = [...new Set(groupMessages.map(m => m.sender_id).filter(Boolean))]
          let profileMap = new Map()
          if (senderIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .in('user_id', senderIds)
            profileMap = new Map((profiles || []).map(p => [p.user_id, p]))
          }
          
          const roomMap = new Map((rooms || []).map(r => [r.id, r]))
          
          // Group by room and get latest message per room
          const messagesByRoom = new Map()
          groupMessages.forEach(msg => {
            const room = roomMap.get(msg.room_id)
            const profile = profileMap.get(msg.sender_id)
            
            if (!messagesByRoom.has(msg.room_id)) {
              messagesByRoom.set(msg.room_id, {
                roomId: msg.room_id,
                roomName: room?.name || 'Forum',
                roomType: room?.room_type,
                latestMessage: {
                  id: msg.id,
                  content: msg.content,
                  senderName: profile?.display_name || 'Unknown',
                  senderAvatar: profile?.avatar_url,
                  createdAt: msg.created_at,
                  unreadCount: 1 // TODO: Implement proper unread tracking
                }
              })
            } else {
              const existing = messagesByRoom.get(msg.room_id)
              existing.latestMessage.unreadCount++
            }
          })
          
          unreadMessages = Array.from(messagesByRoom.values())
        }
      }

      // Fetch forum invitations
      let forumInvitations = []
      if (user) {
        // Fetch without FK joins to avoid 400 errors
        const { data: invitations } = await supabase
          .from('chat_join_requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5)

        // Fetch related data separately
        if (invitations && invitations.length > 0) {
          const roomIds = [...new Set(invitations.map(i => i.room_id).filter(Boolean))]
          const requesterIds = [...new Set(invitations.map(i => i.user_id).filter(Boolean))]
          
          // Fetch rooms separately
          const { data: rooms } = await supabase
            .from('chat_rooms')
            .select('id, name, description, room_type, created_by')
            .in('id', roomIds)
          
          // Fetch profiles separately
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', requesterIds)
          
          const roomMap = new Map((rooms || []).map(r => [r.id, r]))
          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))
          
          forumInvitations = invitations.map(inv => {
            const room = roomMap.get(inv.room_id)
            const profile = profileMap.get(inv.user_id)
            return {
              id: inv.id,
              roomId: inv.room_id,
              roomName: room?.name || 'Forum',
              roomDescription: room?.description,
              roomType: room?.room_type,
              inviterName: profile?.display_name || 'Unknown',
              inviterAvatar: profile?.avatar_url,
              message: inv.message,
              createdAt: inv.created_at
            }
          })
        }
      }

      setLiveData({
        radioHosts: allRadioSessions || [],
        groupCalls,
        communityChats: activeCommunityChats,
        lifeCourses,
        aodHereticFrequencies,
        unreadMessages,
        forumInvitations
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
        case 'chat': {
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
        }
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
        className="absolute -top-10 right-0 text-white text-xs px-2 py-1 rounded pointer-events-auto"
        style={{ 
          zIndex: 51,
          backgroundColor: currentTheme.accent,
          color: currentTheme.textPrimary
        }}
      >
        WIDGET ACTIVE
      </div>
      
      <Card 
        className="shadow-xl relative pointer-events-auto"
        style={{ 
          zIndex: 50,
          position: 'relative',
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
          borderWidth: '1px',
          boxShadow: `0 20px 25px -5px ${currentTheme.shadow}, 0 10px 10px -5px ${currentTheme.shadow}`
        }}
      >
        {!user && (
          <div 
            className="absolute -top-2 -right-2 pointer-events-none"
            style={{ zIndex: 51 }}
          >
            <div 
              className="text-white text-xs px-2 py-1 rounded-full animate-pulse shadow-lg"
              style={{
                backgroundColor: currentTheme.accent,
                color: currentTheme.textPrimary
              }}
            >
              🔴 LIVE NOW
            </div>
          </div>
        )}
        <CardHeader 
          className="pb-3 cursor-pointer relative pointer-events-auto transition-colors"
          style={{
            backgroundColor: currentTheme.secondaryButton,
            borderBottomColor: currentTheme.cardBorder,
            borderBottomWidth: '1px'
          }}
          onClick={() => {
            console.log('Header clicked, toggling expand from', isExpanded, 'to', !isExpanded)
            setIsExpanded(!isExpanded)
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className="h-6 w-6 animate-pulse" style={{ color: currentTheme.accent }} />
                {totalActivities > 0 && (
                  <div 
                    className="absolute -top-1 -right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center animate-bounce shadow-lg"
                    style={{
                      backgroundColor: currentTheme.accent,
                      color: currentTheme.textPrimary
                    }}
                  >
                    {totalActivities}
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-base font-bold" style={{ color: currentTheme.textPrimary }}>🎬 Live Activities</CardTitle>
                <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                  {user ? 'Click to join activities' : 'Login to participate'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" style={{ color: currentTheme.accent }} />
              ) : (
                <ChevronDown className="h-5 w-5" style={{ color: currentTheme.accent }} />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsVisible(false)
                }}
                className="inline-flex items-center justify-center rounded-full p-1 transition-all duration-200"
                style={{
                  color: currentTheme.textSecondary,
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
                  e.currentTarget.style.color = currentTheme.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = currentTheme.textSecondary;
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent 
            className="pt-0 max-h-96 overflow-y-auto space-y-4 relative pointer-events-auto"
            style={{ 
              zIndex: 50,
              backgroundColor: currentTheme.cardBg
            }}
          >
            {loading ? (
              <div className="text-center py-4">
                <div 
                  className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto"
                  style={{ borderColor: currentTheme.accent }}
                ></div>
                <p className="text-xs mt-2" style={{ color: currentTheme.textSecondary }}>Loading activities...</p>
              </div>
            ) : (
              <>
                {/* Live Radio Hosts */}
                {liveData.radioHosts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <Radio className="h-3 w-3" />
                      Live on Radio
                    </h4>
                    {liveData.radioHosts.slice(0, 2).map((session) => (
                      <div 
                        key={session.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        style={{
                          backgroundColor: currentTheme.secondaryButton,
                          borderColor: currentTheme.cardBorder
                        }}
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
                            <div className="text-xs font-medium" style={{ color: currentTheme.textPrimary }}>
                              {session.radio_schedule?.radio_djs?.dj_name || 'DJ Live'}
                            </div>
                            <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                              {session.viewer_count || 0} listeners
                            </div>
                          </div>
                        </div>
                        <button 
                          className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary
                          }}
                          onClick={() => joinActivity('radio', session.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                        >
                          Listen
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* AoD Heretic's Frequencies */}
                {liveData.aodHereticFrequencies && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <Radio className="h-3 w-3" />
                      AoD Heretic's Frequencies
                    </h4>
                    <div 
                      className="flex items-center justify-between p-2 rounded-lg border"
                      style={{
                        backgroundColor: currentTheme.secondaryButton,
                        borderColor: currentTheme.cardBorder
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={liveData.aodHereticFrequencies.hostAvatar} />
                            <AvatarFallback className="text-xs text-white" style={{ backgroundColor: currentTheme.accent }}>AH</AvatarFallback>
                          </Avatar>
                          {liveData.aodHereticFrequencies.isLive && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accent }} />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium" style={{ color: currentTheme.textPrimary }}>
                            {liveData.aodHereticFrequencies.currentHost}
                          </div>
                          <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                            {liveData.aodHereticFrequencies.frequency} • {liveData.aodHereticFrequencies.listeners} listeners
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs px-1 py-0 h-4"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary
                          }}
                        >
                          {liveData.aodHereticFrequencies.isLive ? 'LIVE' : 'OFF-AIR'}
                        </Badge>
                        <button 
                          className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary
                          }}
                          onClick={() => joinActivity('radio', liveData.aodHereticFrequencies.id)}
                          disabled={!liveData.aodHereticFrequencies.isLive}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = currentTheme.accent;
                              e.currentTarget.style.borderColor = currentTheme.accent;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                              e.currentTarget.style.borderColor = currentTheme.accent;
                            }
                          }}
                        >
                          {liveData.aodHereticFrequencies.isLive ? 'Tune In' : 'Offline'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Group Calls */}
                {liveData.groupCalls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <Phone className="h-3 w-3" />
                      Group Calls
                    </h4>
                    {liveData.groupCalls.slice(0, 2).map((call) => (
                      <div 
                        key={call.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        style={{
                          backgroundColor: currentTheme.secondaryButton,
                          borderColor: currentTheme.cardBorder
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: currentTheme.accent }}>
                              <Phone className="h-3 w-3 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accentLight }} />
                          </div>
                          <div>
                            <div className="text-xs font-medium line-clamp-1" style={{ color: currentTheme.textPrimary }}>
                              {call.title}
                            </div>
                            <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                              {call.participants}/{call.maxParticipants} • {call.host}
                            </div>
                          </div>
                        </div>
                        <button 
                          className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary
                          }}
                          onClick={() => joinActivity('call', call.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Community Chats */}
                {liveData.communityChats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <MessageCircle className="h-3 w-3" />
                      Community Chats
                    </h4>
                    {liveData.communityChats.slice(0, 2).map((chat) => (
                      <div 
                        key={chat.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        style={{
                          backgroundColor: currentTheme.secondaryButton,
                          borderColor: currentTheme.cardBorder
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: currentTheme.accent }}>
                            <MessageCircle className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-medium line-clamp-1" style={{ color: currentTheme.textPrimary }}>
                              {chat.name || 'Community Chat'}
                            </div>
                            <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                              {chat.chat_participants?.filter(p => p.is_active).length || 0} active
                            </div>
                          </div>
                        </div>
                        <button 
                          className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary
                          }}
                          onClick={() => joinActivity('chat', chat.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                        >
                          Chat
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Life Courses */}
                {liveData.lifeCourses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <GraduationCap className="h-3 w-3" />
                      Life Courses
                    </h4>
                    {liveData.lifeCourses.slice(0, 3).map((course) => (
                      <div 
                        key={course.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        style={{
                          backgroundColor: currentTheme.secondaryButton,
                          borderColor: currentTheme.cardBorder
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: currentTheme.accent }}>
                              <GraduationCap className="h-3 w-3 text-white" />
                            </div>
                            {course.isLive && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accentLight }} />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-medium line-clamp-1" style={{ color: currentTheme.textPrimary }}>
                              {course.title}
                            </div>
                            <div className="text-xs flex items-center gap-1" style={{ color: currentTheme.textSecondary }}>
                              {course.isPaid ? (
                                <><DollarSign className="h-2 w-2" />${course.price}</>
                              ) : (
                                'Free'
                              )}
                              {course.isLive ? (
                                <span className="font-medium" style={{ color: currentTheme.accent }}>• Live Now</span>
                              ) : (
                                <span>• {formatDistanceToNow(course.nextSession)} left</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.secondaryButton,
                            color: currentTheme.textPrimary
                          }}
                          onClick={() => joinActivity('course', course.id)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.accent;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                            e.currentTarget.style.borderColor = currentTheme.accent;
                          }}
                        >
                          {course.isLive ? 'Join' : 'Register'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Unread Forum Messages */}
                {liveData.unreadMessages.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <MessageCircle className="h-3 w-3" />
                      Unread Forum Messages
                    </h4>
                    {liveData.unreadMessages.slice(0, 3).map((msg) => (
                      <div 
                        key={msg.roomId}
                        className="flex items-center justify-between p-2 rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: currentTheme.secondaryButton,
                          borderColor: currentTheme.accent,
                          borderWidth: '2px'
                        }}
                        onClick={() => joinActivity('forum', msg.roomId)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = currentTheme.accent + '20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: currentTheme.accent }}>
                              <MessageCircle className="h-3 w-3 text-white" />
                            </div>
                            {msg.latestMessage.unreadCount > 0 && (
                              <div 
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold animate-pulse"
                                style={{
                                  backgroundColor: currentTheme.accent,
                                  color: currentTheme.textPrimary
                                }}
                              >
                                {msg.latestMessage.unreadCount > 9 ? '9+' : msg.latestMessage.unreadCount}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium line-clamp-1" style={{ color: currentTheme.textPrimary }}>
                              {msg.roomName}
                            </div>
                            <div className="text-xs line-clamp-1" style={{ color: currentTheme.textSecondary }}>
                              {msg.latestMessage.senderName}: {msg.latestMessage.content?.substring(0, 30) || 'New message'}...
                            </div>
                          </div>
                        </div>
                        <button 
                          className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200 ml-2"
                          style={{
                            borderColor: currentTheme.accent,
                            backgroundColor: currentTheme.accent,
                            color: currentTheme.textPrimary
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            joinActivity('forum', msg.roomId)
                          }}
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Forum Invitations */}
                {liveData.forumInvitations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1" style={{ color: currentTheme.accent }}>
                      <Users className="h-3 w-3" />
                      Forum Invitations ({liveData.forumInvitations.length})
                    </h4>
                    {liveData.forumInvitations.slice(0, 3).map((invitation) => (
                      <div 
                        key={invitation.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                        style={{
                          backgroundColor: currentTheme.secondaryButton,
                          borderColor: currentTheme.accent,
                          borderWidth: '2px'
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={invitation.inviterAvatar} />
                              <AvatarFallback className="text-xs" style={{ backgroundColor: currentTheme.accent, color: currentTheme.textPrimary }}>
                                {invitation.inviterName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium line-clamp-1" style={{ color: currentTheme.textPrimary }}>
                              {invitation.roomName}
                            </div>
                            <div className="text-xs line-clamp-1" style={{ color: currentTheme.textSecondary }}>
                              Invited by {invitation.inviterName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button 
                            className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                            style={{
                              borderColor: currentTheme.accent,
                              backgroundColor: currentTheme.secondaryButton,
                              color: currentTheme.textPrimary
                            }}
                            onClick={() => joinActivity('accept_invitation', invitation.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.accent;
                              e.currentTarget.style.borderColor = currentTheme.accent;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                              e.currentTarget.style.borderColor = currentTheme.accent;
                            }}
                          >
                            Accept
                          </button>
                          <button 
                            className="text-xs h-6 px-2 py-1 rounded border transition-all duration-200"
                            style={{
                              borderColor: currentTheme.cardBorder,
                              backgroundColor: 'transparent',
                              color: currentTheme.textSecondary
                            }}
                            onClick={async () => {
                              const { error } = await supabase
                                .from('chat_join_requests')
                                .update({ status: 'declined', reviewed_at: new Date().toISOString() })
                                .eq('id', invitation.id)
                              if (!error) {
                                toast.success('Invitation declined')
                                fetchLiveData()
                              }
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = currentTheme.cardBorder + '40';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalActivities === 0 && (
                  <div className="text-center py-6">
                    <Users className="h-8 w-8 mx-auto mb-2" style={{ color: currentTheme.textSecondary }} />
                    <p className="text-xs" style={{ color: currentTheme.textSecondary }}>No live activities right now</p>
                    <p className="text-xs" style={{ color: currentTheme.textSecondary }}>Check back later!</p>
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