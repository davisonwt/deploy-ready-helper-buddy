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
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [liveData, setLiveData] = useState({
    radioHosts: [],
    groupCalls: [],
    communityChats: [],
    lifeCourses: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchLiveData()
      // Set up real-time subscriptions
      const subscriptions = setupRealtimeSubscriptions()
      
      return () => {
        subscriptions.forEach(sub => supabase.removeChannel(sub))
      }
    }
  }, [user])

  const fetchLiveData = async () => {
    try {
      setLoading(true)
      
      // Fetch live radio hosts
      const { data: radioData, error: radioError } = await supabase
        .from('radio_live_sessions')
        .select(`
          *,
          radio_live_hosts (
            *,
            radio_djs (
              dj_name,
              avatar_url
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Fetch active group calls (simulated for now)
      const groupCalls = [
        {
          id: 1,
          title: "Daily Community Check-in",
          participants: 12,
          maxParticipants: 20,
          host: "Sarah M.",
          topic: "Personal Growth Discussion",
          isLive: true,
          startedAt: new Date(Date.now() - 1800000), // 30 mins ago
          type: "community"
        },
        {
          id: 2,
          title: "Business Networking Call",
          participants: 8,
          maxParticipants: 15,
          host: "Mike Chen",
          topic: "Entrepreneurship & Innovation",
          isLive: true,
          startedAt: new Date(Date.now() - 900000), // 15 mins ago
          type: "business"
        }
      ]

      // Fetch community chats
      const { data: chatData, error: chatError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants (
            id,
            user_id,
            is_active
          )
        `)
        .eq('is_active', true)
        .eq('is_premium', false)
        .limit(5)

      // Fetch life courses (mock data)
      const lifeCourses = [
        {
          id: 1,
          title: "Mindfulness & Meditation Basics",
          instructor: "Dr. Emma Watson",
          price: 0,
          isPaid: false,
          participants: 45,
          nextSession: new Date(Date.now() + 3600000), // 1 hour from now
          category: "wellness",
          isLive: false
        },
        {
          id: 2,
          title: "Financial Freedom Masterclass",
          instructor: "Robert Johnson",
          price: 29.99,
          isPaid: true,
          participants: 23,
          nextSession: new Date(Date.now() + 7200000), // 2 hours from now
          category: "finance",
          isLive: false
        },
        {
          id: 3,
          title: "Live Coding Workshop",
          instructor: "Alex Kumar",
          price: 0,
          isPaid: false,
          participants: 67,
          nextSession: new Date(),
          category: "technology",
          isLive: true
        }
      ]

      setLiveData({
        radioHosts: radioData || [],
        groupCalls,
        communityChats: chatData || [],
        lifeCourses
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
        fetchLiveData()
      })
      .subscribe()

    const chatChannel = supabase
      .channel('chat-room-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms'
      }, () => {
        fetchLiveData()
      })
      .subscribe()

    return [radioChannel, chatChannel]
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

  if (!isVisible) return null

  const totalActivities = liveData.radioHosts.length + 
                         liveData.groupCalls.length + 
                         liveData.communityChats.length + 
                         liveData.lifeCourses.filter(course => course.isLive).length

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur-sm border-primary/20 shadow-xl">
        <CardHeader 
          className="pb-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className="h-5 w-5 text-primary" />
                {totalActivities > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <CardTitle className="text-sm">Live Activities</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {totalActivities}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsVisible(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 max-h-96 overflow-y-auto space-y-4">
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
                              <AvatarImage src={session.radio_live_hosts?.[0]?.radio_djs?.avatar_url} />
                              <AvatarFallback className="text-xs">DJ</AvatarFallback>
                            </Avatar>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          </div>
                          <div>
                            <div className="text-xs font-medium">
                              {session.radio_live_hosts?.[0]?.radio_djs?.dj_name || 'DJ Live'}
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