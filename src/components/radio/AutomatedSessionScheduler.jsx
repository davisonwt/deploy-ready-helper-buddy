import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Calendar,
  Clock, 
  Music, 
  Play, 
  Settings, 
  Zap,
  Radio,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useDJPlaylist } from '@/hooks/useDJPlaylist'
import { useGroveStation } from '@/hooks/useGroveStation'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export default function AutomatedSessionScheduler() {
  const { playlists, scheduleAutomatedSession } = useDJPlaylist()
  const { schedule, userDJProfile } = useGroveStation()
  const [automatedSessions, setAutomatedSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState('')

  useEffect(() => {
    if (userDJProfile) {
      fetchAutomatedSessions()
    }
  }, [userDJProfile])

  const fetchAutomatedSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_automated_sessions')
        .select(`
          *,
          radio_schedule (
            id,
            time_slot_date,
            hour_slot,
            start_time,
            end_time,
            radio_shows (
              show_name,
              description
            )
          ),
          dj_playlists (
            playlist_name,
            track_count,
            total_duration_seconds
          )
        `)
        .eq('radio_schedule.dj_id', userDJProfile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAutomatedSessions(data || [])
    } catch (error) {
      console.error('Error fetching automated sessions:', error)
    }
  }

  const getMyScheduleSlots = () => {
    if (!userDJProfile || !schedule) return []
    
    return schedule.filter(slot => 
      slot.dj_id === userDJProfile.id && 
      slot.approval_status === 'approved' &&
      new Date(slot.start_time) > new Date() // Only future slots
    )
  }

  const handleScheduleSession = async () => {
    if (!selectedSlot || !selectedPlaylist) {
      toast.error('Please select both a time slot and playlist')
      return
    }

    const playlist = playlists.find(p => p.id === selectedPlaylist)
    if (!playlist) {
      toast.error('Selected playlist not found')
      return
    }

    // Check if session duration matches slot (approximately 2 hours = 7200 seconds)
    const slotDuration = (new Date(selectedSlot.end_time) - new Date(selectedSlot.start_time)) / 1000
    if (Math.abs(playlist.total_duration_seconds - slotDuration) > 300) { // 5 minute tolerance
      const confirm = window.confirm(
        `Playlist duration (${formatDuration(playlist.total_duration_seconds)}) doesn't match slot duration (${formatDuration(slotDuration)}). Continue anyway?`
      )
      if (!confirm) return
    }

    const result = await scheduleAutomatedSession(selectedSlot.id, selectedPlaylist)
    
    if (result) {
      await fetchAutomatedSessions()
      setShowScheduleDialog(false)
      setSelectedSlot(null)
      setSelectedPlaylist('')
    }
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'playing':
        return <Play className="h-4 w-4 text-green-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'playing':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const myScheduleSlots = getMyScheduleSlots()
  const sessionPlaylists = playlists.filter(p => p.playlist_type === 'scheduled_session' || p.playlist_type === 'custom')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automated Sessions
          </h2>
          <p className="text-muted-foreground">
            Schedule playlists to play automatically during your radio slots
          </p>
        </div>
        
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" disabled={myScheduleSlots.length === 0 || sessionPlaylists.length === 0}>
              <Settings className="h-4 w-4" />
              Schedule Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Automated Session</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Time Slot</label>
                <Select value={selectedSlot?.id || ''} onValueChange={(value) => {
                  const slot = myScheduleSlots.find(s => s.id === value)
                  setSelectedSlot(slot)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a scheduled slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {myScheduleSlots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        <div className="flex flex-col">
                          <span>{formatDateTime(slot.start_time)}</span>
                          <span className="text-xs text-muted-foreground">
                            {slot.radio_shows?.show_name || 'Untitled Show'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Select Playlist</label>
                <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionPlaylists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        <div className="flex flex-col">
                          <span>{playlist.playlist_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {playlist.track_count} tracks • {formatDuration(playlist.total_duration_seconds)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedSlot && selectedPlaylist && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Session Preview</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Time:</strong> {formatDateTime(selectedSlot.start_time)}</p>
                    <p><strong>Duration:</strong> {formatDuration((new Date(selectedSlot.end_time) - new Date(selectedSlot.start_time)) / 1000)}</p>
                    <p><strong>Playlist:</strong> {playlists.find(p => p.id === selectedPlaylist)?.playlist_name}</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleScheduleSession}
                  disabled={!selectedSlot || !selectedPlaylist || loading}
                >
                  Schedule Session
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{myScheduleSlots.length}</div>
            <div className="text-sm text-muted-foreground">Available Slots</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Music className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{sessionPlaylists.length}</div>
            <div className="text-sm text-muted-foreground">Session Playlists</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Radio className="h-8 w-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{automatedSessions.filter(s => s.playback_status === 'scheduled').length}</div>
            <div className="text-sm text-muted-foreground">Scheduled Sessions</div>
          </CardContent>
        </Card>
      </div>

      {/* Automated Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Automated Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {automatedSessions.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No automated sessions yet</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first automated session to let your playlists play themselves!
              </p>
              {myScheduleSlots.length === 0 ? (
                <p className="text-sm text-yellow-600">
                  You need approved radio slots to schedule automated sessions
                </p>
              ) : sessionPlaylists.length === 0 ? (
                <p className="text-sm text-yellow-600">
                  Create some playlists first to schedule automated sessions
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {automatedSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(session.playback_status)}
                      <h4 className="font-medium">
                        {session.radio_schedule?.radio_shows?.show_name || 'Untitled Show'}
                      </h4>
                      <Badge variant={getStatusBadgeVariant(session.playback_status)}>
                        {session.playback_status}
                      </Badge>
                    </div>
                    
                    {session.listener_count > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {session.listener_count}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Scheduled:</strong> {formatDateTime(session.radio_schedule?.start_time)}</p>
                      <p><strong>Playlist:</strong> {session.dj_playlists?.playlist_name}</p>
                    </div>
                    <div>
                      <p><strong>Tracks:</strong> {session.dj_playlists?.track_count}</p>
                      <p><strong>Duration:</strong> {formatDuration(session.dj_playlists?.total_duration_seconds)}</p>
                    </div>
                  </div>
                  
                  {session.error_message && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {session.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}