import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  Send, 
  Hand,
  Mic,
  Radio,
  Clock,
  Users,
  Music,
  ShoppingCart,
  Play,
  Pause,
  Volume2,
  Download
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useMusicPurchase } from '@/hooks/useMusicPurchase'
import { MusicPurchaseInterface } from './MusicPurchaseInterface'
import { ListenerReactionBar } from './ListenerReactionBar'
import { BestowDuringBroadcast } from './BestowDuringBroadcast'
import { ListenerStreakBadge } from './ListenerStreakBadge'

export function RadioListenerInterface({ liveSession, currentShow }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { purchaseTrack, loading: purchasing } = useMusicPurchase()
  const [message, setMessage] = useState('')
  const [callTopic, setCallTopic] = useState('')
  const [showCallModal, setShowCallModal] = useState(false)
  const [isInCallQueue, setIsInCallQueue] = useState(false)
  const [queuePosition, setQueuePosition] = useState(null)
  const [viewerCount, setViewerCount] = useState(0)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [showTrackPurchase, setShowTrackPurchase] = useState(false)

  useEffect(() => {
    if (liveSession && user) {
      checkCallQueueStatus()
      fetchViewerCount()
      fetchCurrentPlaylist()
      setupRealtimeSubscriptions()
    }
  }, [liveSession, user])

  const checkCallQueueStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_call_queue')
        .select('*')
        .eq('session_id', liveSession.id)
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .maybeSingle()

      if (data && !error) {
        setIsInCallQueue(true)
        // Get queue position
        const { data: queueData } = await supabase
          .from('radio_call_queue')
          .select('id')
          .eq('session_id', liveSession.id)
          .eq('status', 'waiting')
          .order('created_at', { ascending: true })

        const position = queueData?.findIndex(item => item.id === data.id) + 1
        setQueuePosition(position)
      }
    } catch (error) {
      console.error('Error checking call queue status:', error)
    }
  }

  const fetchViewerCount = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_live_sessions')
        .select('viewer_count')
        .eq('id', liveSession.id)
        .single()

      if (error) throw error
      setViewerCount(data?.viewer_count || 0)
    } catch (error) {
      console.error('Error fetching viewer count:', error)
    }
  }

  const fetchCurrentPlaylist = async () => {
    try {
      // Get the automated session for this live session
      const { data: automatedSession, error: sessionError } = await supabase
        .from('radio_automated_sessions')
        .select(`
          *,
          dj_playlists (
            *,
            dj_playlist_tracks (
              track_order,
              dj_music_tracks (
                id,
                track_title,
                artist_name,
                duration_seconds,
                genre,
                file_url
              )
            )
          )
        `)
        .eq('session_id', liveSession.id)
        .eq('playback_status', 'playing')
        .single()

      if (sessionError || !automatedSession) {
        console.log('No automated session playing currently')
        return
      }

      const tracks = automatedSession.dj_playlists?.dj_playlist_tracks
        ?.sort((a, b) => a.track_order - b.track_order)
        ?.map(pt => pt.dj_music_tracks) || []

      setPlaylistTracks(tracks)
      
      // Set current track (simulate progression - in real app this would track actual playback)
      if (tracks.length > 0) {
        setCurrentTrack(tracks[0])
      }
    } catch (error) {
      console.error('Error fetching current playlist:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to session updates for viewer count
    const sessionChannel = supabase
      .channel(`session-${liveSession.id}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'radio_live_sessions',
          filter: `id=eq.${liveSession.id}`
        },
        (payload) => {
          setViewerCount(payload.new.viewer_count || 0)
        }
      )
      .subscribe()

    // Subscribe to call queue updates
    const queueChannel = supabase
      .channel(`queue-${liveSession.id}-${user.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'radio_call_queue',
          filter: `session_id=eq.${liveSession.id}`
        },
        () => checkCallQueueStatus()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionChannel)
      supabase.removeChannel(queueChannel)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !user) return

    try {
      const { error } = await supabase
        .from('radio_live_messages')
        .insert({
          session_id: liveSession.id,
          sender_id: user.id,
          message_text: message.trim(),
          message_type: 'listener_message'
        })

      if (error) throw error

      toast({
        title: "Message Sent",
        description: "Your message has been sent to the hosts",
      })

      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const requestToCall = async () => {
    if (!user || !callTopic.trim()) return

    try {
      const { error } = await supabase
        .from('radio_call_queue')
        .insert({
          session_id: liveSession.id,
          user_id: user.id,
          topic: callTopic.trim(),
          status: 'waiting'
        })

      if (error) throw error

      toast({
        title: "Call Request Sent",
        description: "You've been added to the call queue",
      })

      setCallTopic('')
      setShowCallModal(false)
      setIsInCallQueue(true)
      checkCallQueueStatus()
    } catch (error) {
      console.error('Error requesting call:', error)
      toast({
        title: "Error",
        description: "Failed to request call",
        variant: "destructive"
      })
    }
  }

  const leaveCallQueue = async () => {
    try {
      const { error } = await supabase
        .from('radio_call_queue')
        .update({ status: 'cancelled' })
        .eq('session_id', liveSession.id)
        .eq('user_id', user.id)
        .eq('status', 'waiting')

      if (error) throw error

      toast({
        title: "Left Queue",
        description: "You've left the call queue",
      })

      setIsInCallQueue(false)
      setQueuePosition(null)
    } catch (error) {
      console.error('Error leaving queue:', error)
      toast({
        title: "Error",
        description: "Failed to leave queue",
        variant: "destructive"
      })
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!liveSession) return null

  return (
    <div className="space-y-6">
      {/* Show Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-destructive" />
            {currentShow?.show_name || 'Live Show'}
            <Badge variant="destructive" className="ml-2">LIVE</Badge>
            <ListenerStreakBadge />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Hosted by {currentShow?.dj_name}
              </p>
              {currentShow?.description && (
                <p className="text-sm mt-1">{currentShow.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {currentShow?.dj_id && (
                <BestowDuringBroadcast
                  djId={currentShow.dj_id}
                  djName={currentShow.dj_name || 'DJ'}
                  scheduleId={liveSession?.schedule_id}
                />
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {viewerCount} listening
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emoji Reactions */}
      {liveSession?.id && (
        <ListenerReactionBar sessionId={liveSession.id} />
      )}

      {/* Music Purchase Interface */}
      <MusicPurchaseInterface 
        tracks={playlistTracks}
        currentTrack={currentTrack}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send Message to Hosts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Type your message to the hosts..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!message.trim()}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <p className="text-xs text-muted-foreground">
              Your message will be visible to all hosts and co-hosts during the live show.
            </p>
          </CardContent>
        </Card>

        {/* Raise Hand */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hand className="h-5 w-5" />
              Raise Your Hand
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isInCallQueue ? (
              <>
                <Textarea
                  placeholder="What would you like to share or ask?"
                  value={callTopic}
                  onChange={(e) => setCallTopic(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={requestToCall} 
                  disabled={!callTopic.trim()}
                  className="w-full gap-2"
                >
                  <Hand className="h-4 w-4" />
                  Raise Hand to Speak
                </Button>
                <p className="text-xs text-muted-foreground">
                  The host will see your request and invite you to speak when ready.
                </p>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Hand className="h-5 w-5 text-primary animate-bounce" />
                    <span className="font-medium">Hand Raised!</span>
                  </div>
                  {queuePosition && (
                    <p className="text-sm text-muted-foreground">
                      Position #{queuePosition} in queue
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Waiting for host to invite you...
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={leaveCallQueue}
                  className="w-full"
                >
                  Lower Hand
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RadioListenerInterface