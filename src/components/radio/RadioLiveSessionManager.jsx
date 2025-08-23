import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ComprehensiveLiveSession } from '@/components/live/ComprehensiveLiveSession'
import { 
  Mic,
  Radio,
  Users,
  Play,
  Pause,
  Settings
} from 'lucide-react'

export function RadioLiveSessionManager({ 
  schedule, 
  currentShow, 
  onSessionStart,
  onSessionEnd 
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [liveSession, setLiveSession] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [showLiveInterface, setShowLiveInterface] = useState(false)

  useEffect(() => {
    if (schedule && user) {
      checkExistingSession()
      checkHostPermissions()
    }
  }, [schedule, user])

  const checkExistingSession = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_live_sessions')
        .select('*')
        .eq('schedule_id', schedule.id)
        .eq('status', 'live')
        .single()

      if (data && !error) {
        setLiveSession(data)
        setShowLiveInterface(true)
      }
    } catch (error) {
      // No existing session
      console.log('No existing live session found')
    }
  }

  const checkHostPermissions = async () => {
    try {
      // Check if user is the DJ for this schedule
      const { data: djData, error } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_djs!inner(user_id)
        `)
        .eq('id', schedule.id)
        .eq('radio_djs.user_id', user.id)
        .single()

      if (djData && !error) {
        setIsHost(true)
      } else {
        // Check for admin roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'gosat', 'radio_admin'])

        setIsHost(rolesData && rolesData.length > 0)
      }
    } catch (error) {
      console.error('Error checking host permissions:', error)
    }
  }

  const startLiveSession = async () => {
    try {
      // Create or get live session
      const { data: sessionData, error } = await supabase
        .from('radio_live_sessions')
        .upsert({
          schedule_id: schedule.id,
          status: 'live',
          session_token: generateSessionToken(),
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Add host to radio_live_hosts
      const { error: hostError } = await supabase
        .from('radio_live_hosts')
        .insert({
          session_id: sessionData.id,
          user_id: user.id,
          role: 'main_host',
          audio_enabled: true,
          is_active: true
        })

      if (hostError) {
        console.error('Error adding host:', hostError)
      }

      // Create session data for comprehensive interface
      const comprehensiveSessionData = {
        id: sessionData.id,
        title: currentShow?.show_name || 'Live Radio Session',
        description: currentShow?.description,
        type: 'radio',
        created_by: user.id,
        schedule_id: schedule.id,
        show_data: currentShow,
        session_token: sessionData.session_token,
        status: 'live',
        started_at: sessionData.started_at
      }

      setLiveSession(comprehensiveSessionData)
      setShowLiveInterface(true)
      onSessionStart?.(comprehensiveSessionData)

      toast({
        title: "Live Session Started",
        description: `${currentShow?.show_name || 'Radio session'} is now live!`,
      })

    } catch (error) {
      console.error('Error starting live session:', error)
      toast({
        title: "Error",
        description: "Failed to start live session",
        variant: "destructive"
      })
    }
  }

  const endLiveSession = async () => {
    try {
      if (liveSession?.id) {
        // Update session status
        const { error } = await supabase
          .from('radio_live_sessions')
          .update({ 
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', liveSession.id)

        if (error) throw error

        // Deactivate hosts
        const { error: hostError } = await supabase
          .from('radio_live_hosts')
          .update({ is_active: false })
          .eq('session_id', liveSession.id)

        if (hostError) {
          console.error('Error deactivating hosts:', hostError)
        }
      }

      setLiveSession(null)
      setShowLiveInterface(false)
      onSessionEnd?.()

      toast({
        title: "Live Session Ended",
        description: "The radio session has been ended",
      })

    } catch (error) {
      console.error('Error ending live session:', error)
      toast({
        title: "Error",
        description: "Failed to end live session",
        variant: "destructive"
      })
    }
  }

  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  // If showing live interface, render the comprehensive session
  if (showLiveInterface && liveSession) {
    return (
      <ComprehensiveLiveSession
        sessionData={liveSession}
        sessionType="radio"
        onEndSession={endLiveSession}
        onLeaveSession={() => setShowLiveInterface(false)}
      />
    )
  }

  // Pre-live interface for hosts and participants
  return (
    <div className="space-y-4">
      {/* Session Status Card */}
      <Card className="p-6 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <Radio className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {currentShow?.show_name || 'Radio Session'}
              </h2>
              <p className="text-purple-200">
                {currentShow?.description || 'Live radio broadcast'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-purple-300 border-purple-300">
                  {schedule?.time_slot_date} at {schedule?.start_time}
                </Badge>
                <Badge variant="outline" className="text-blue-300 border-blue-300">
                  {currentShow?.category || 'General'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isHost ? (
              <Button
                onClick={startLiveSession}
                className="bg-red-500 hover:bg-red-600 text-white"
                size="lg"
              >
                <Play className="h-5 w-5 mr-2" />
                Go Live
              </Button>
            ) : (
              <Badge className="bg-gray-500 text-white">
                Waiting for Host
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Pre-Session Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Host Features</h3>
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Live audio streaming</li>
            <li>• Manage call queue</li>
            <li>• Guest requests</li>
            <li>• Real-time chat</li>
          </ul>
        </Card>

        <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-400" />
            <h3 className="font-semibold text-white">Listener Features</h3>
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Join call queue</li>
            <li>• Request to speak</li>
            <li>• Send messages</li>
            <li>• React with emojis</li>
          </ul>
        </Card>

        <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Session Info</h3>
          </div>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Duration: {schedule?.duration || '60 minutes'}</li>
            <li>• Host: {currentShow?.dj_name || 'TBD'}</li>
            <li>• Format: Live Interactive</li>
            <li>• Category: {currentShow?.category}</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}