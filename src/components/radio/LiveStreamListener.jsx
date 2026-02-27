import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Volume2, 
  VolumeX, 
  Users, 
  Hand, 
  Heart,
  Radio,
  Mic,
  MicOff,
  Play,
  Pause
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { GuestRequestModal } from './GuestRequestModal'
import { MusicPurchaseInterface } from './MusicPurchaseInterface'
import { RadioHostPanel } from './RadioHostPanel'
import { resolveAudioUrl } from '@/utils/resolveAudioUrl'

export function LiveStreamListener({ liveSession, currentShow }) {
  const isPreRecorded = currentShow?.broadcast_mode === 'pre_recorded'
  const { user } = useAuth()
  const { toast } = useToast()
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [activeHosts, setActiveHosts] = useState([])
  const [viewerCount, setViewerCount] = useState(0)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [hasRequestedGuest, setHasRequestedGuest] = useState(false)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  
  const audioRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const pendingSeekOffset = useRef(0)

  const fetchActiveHosts = async () => {
    if (!liveSession) return

    try {
      const { data, error } = await supabase
        .from('radio_live_hosts')
        .select(`
          *,
          radio_djs (dj_name, avatar_url)
        `)
        .eq('session_id', liveSession.id)
        .eq('is_active', true)

      if (error) throw error
      setActiveHosts(data || [])
    } catch (error) {
      console.error('Error fetching active hosts:', error)
    }
  }

  const checkExistingGuestRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_guest_requests')
        .select('*')
        .eq('session_id', liveSession.id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle()

      if (data) {
        setHasRequestedGuest(true)
      }
    } catch (error) {
      // No existing request found
      setHasRequestedGuest(false)
    }
  }

  const setupRealtimeSubscriptions = () => {
    // Subscribe to host changes
    const hostsSubscription = supabase
      .channel(`live-hosts-${liveSession.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'radio_live_hosts',
          filter: `session_id=eq.${liveSession.id}`
        },
        () => fetchActiveHosts()
      )
      .subscribe()

    // Subscribe to session updates (using secure view)
    const sessionSubscription = supabase
      .channel(`live-session-${liveSession.id}`)
      .on('postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'radio_live_sessions',
          filter: `id=eq.${liveSession.id}`
        },
        (payload) => {
          // Only update non-sensitive data
          setViewerCount(payload.new.viewer_count || 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(hostsSubscription)
      supabase.removeChannel(sessionSubscription)
    }
  }

  useEffect(() => {
    if (liveSession) {
      fetchActiveHosts()
      setupRealtimeSubscriptions()
      setViewerCount(liveSession.viewer_count || 0)
    }
    
    // Always try to load playlist for current show
    if (currentShow) {
      fetchPlaylistForCurrentShow()
    }

    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [liveSession, currentShow])

  useEffect(() => {
    if (user && liveSession) {
      checkExistingGuestRequest()
    }
  }, [user, liveSession])

  // Auto-start playback when component mounts (listener joined = wants to listen)
  const autoPlayAttempted = useRef(false)
  useEffect(() => {
    if (autoPlayAttempted.current) return
    // Need either a live session or pre-recorded show with tracks
    const canPlay = isPreRecorded ? !!currentShow : !!liveSession?.id
    if (!canPlay) return
    // Wait for playlist tracks to load for pre-recorded mode
    if (isPreRecorded && playlistTracks.length === 0) return
    
    autoPlayAttempted.current = true
    // Small delay to ensure audio context is ready
    const timer = setTimeout(async () => {
      try {
        const started = await initializeAudioStream()
        if (!started) return

        setIsPlaying(true)
        if (liveSession?.id) {
          await supabase.rpc('update_viewer_count_secure', {
            session_id_param: liveSession.id,
            new_count: (liveSession.viewer_count || 0) + 1
          })
        }
      } catch (err) {
        // Browser blocked autoplay - user will need to click play
        console.log('Autoplay blocked, user interaction required:', err.message)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [liveSession, currentShow, playlistTracks, isPreRecorded])

  // Auto-play when tracks load and user has pressed play
  useEffect(() => {
    if (isPlaying && currentTrack && audioRef.current && !audioRef.current.src) {
      const offset = pendingSeekOffset.current || 0
      pendingSeekOffset.current = 0
      playCurrentTrackAudio(currentTrack, offset)
    }
  }, [currentTrack, isPlaying])

  // Handle track ended - play next
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = async () => {
      if (playlistTracks.length <= 1) {
        setIsPlaying(false)
        return
      }
      const currentIdx = playlistTracks.findIndex(t => t.id === currentTrack?.id)
      const nextIdx = (currentIdx + 1) % playlistTracks.length
      const nextTrack = playlistTracks[nextIdx]
      setCurrentTrack(nextTrack)
      await playCurrentTrackAudio(nextTrack)
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [playlistTracks, currentTrack])

  const togglePlayPause = async () => {
    // For pre-recorded mode, we only need currentShow (no live session required)
    if (!isPreRecorded && (!liveSession || !liveSession.id)) {
      toast({
        title: "Not Live Yet",
        description: "The host hasn't started the live session yet.",
        variant: "destructive"
      })
      return
    }

    if (!isPlaying) {
      try {
        const started = await initializeAudioStream()
        if (!started) {
          setIsPlaying(false)
          return
        }

        setIsPlaying(true)
        
        // Only update viewer count if we have a live session
        if (liveSession?.id) {
          const { error } = await supabase.rpc('update_viewer_count_secure', {
            session_id_param: liveSession.id,
            new_count: (liveSession.viewer_count || 0) + 1
          })
          if (error) console.error('Error updating viewer count:', error)
        }

      } catch (error) {
        console.error('Error starting stream:', error)
        toast({
          title: "Error",
          description: "Failed to connect to live stream",
          variant: "destructive"
        })
      }
    } else {
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
      
      if (liveSession?.id) {
        const { error } = await supabase.rpc('update_viewer_count_secure', {
          session_id_param: liveSession.id,
          new_count: Math.max(0, (liveSession.viewer_count || 1) - 1)
        })
        if (error) console.error('Error updating viewer count:', error)
      }
    }
  }

  // Calculate which track should be playing right now based on the strongest available clock anchor
  const calculateCurrentTrack = (tracks) => {
    if (tracks.length === 0) {
      return { trackIndex: 0, seekOffset: 0 }
    }

    const now = new Date()

    const liveAnchorRaw = liveSession?.started_at || liveSession?.created_at
    const scheduleAnchorRaw = currentShow?.start_time || null
    const fallbackAnchorRaw = currentShow?.created_at || null

    const parseDateSafe = (value) => {
      if (!value) return null
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const liveAnchor = parseDateSafe(liveAnchorRaw)
    const scheduleAnchor = parseDateSafe(scheduleAnchorRaw)
    const fallbackAnchor = parseDateSafe(fallbackAnchorRaw)

    const showStart = (liveAnchor && liveAnchor <= now)
      ? liveAnchor
      : (scheduleAnchor && scheduleAnchor <= now)
        ? scheduleAnchor
        : (fallbackAnchor && fallbackAnchor <= now)
          ? fallbackAnchor
          : scheduleAnchor || liveAnchor || fallbackAnchor

    if (!showStart || Number.isNaN(showStart.getTime()) || now < showStart) {
      console.warn('[Sync] No valid past anchor found yet, defaulting to track 0', {
        liveAnchor: liveAnchorRaw,
        scheduleAnchor: scheduleAnchorRaw,
        fallbackAnchor: fallbackAnchorRaw
      })
      return { trackIndex: 0, seekOffset: 0 }
    }

    const elapsedSeconds = Math.floor((now.getTime() - showStart.getTime()) / 1000)

    // Calculate total playlist duration
    const totalDuration = tracks.reduce((sum, t) => sum + (t.duration_seconds || 180), 0)

    if (totalDuration === 0) return { trackIndex: 0, seekOffset: 0 }

    // Loop: find position within the repeating playlist
    const positionInLoop = elapsedSeconds % totalDuration

    let cumulative = 0
    for (let i = 0; i < tracks.length; i++) {
      const trackDuration = tracks[i].duration_seconds || 180
      if (cumulative + trackDuration > positionInLoop) {
        const seekOffset = positionInLoop - cumulative
        console.log(`[Sync] Anchor ${showStart.toISOString()} elapsed ${elapsedSeconds}s, loop pos ${positionInLoop}s → track ${i + 1}/${tracks.length} "${tracks[i].track_title}" @ ${seekOffset}s`)
        return { trackIndex: i, seekOffset }
      }
      cumulative += trackDuration
    }

    return { trackIndex: 0, seekOffset: 0 }
  }

  const loadTracksForSchedule = async (scheduleId) => {
    const { data: sched, error } = await supabase
      .from('radio_schedule')
      .select('id, playlist_id, dj_id, show_topic_description')
      .eq('id', scheduleId)
      .maybeSingle()

    if (error) {
      console.error('[Listener] Error fetching schedule:', error)
      return []
    }

    if (!sched) return []

    let timelineItems = []
    if (Array.isArray(sched.show_topic_description)) {
      timelineItems = sched.show_topic_description
    } else if (typeof sched.show_topic_description === 'string' && sched.show_topic_description.trim()) {
      try {
        const parsed = JSON.parse(sched.show_topic_description)
        timelineItems = Array.isArray(parsed) ? parsed : []
      } catch (parseErr) {
        console.error('[Listener] Failed to parse show_topic_description JSON:', parseErr)
      }
    }

    if (timelineItems.length > 0) {
      const musicIds = [...new Set(
        timelineItems
          .filter(item => item?.type === 'music' && (item?.contentId || item?.content_id))
          .map(item => item.contentId || item.content_id)
      )]

      let djMusicTrackMap = new Map()
      let productTrackMap = new Map()

      if (musicIds.length > 0) {
        const [{ data: djMusicRows }, { data: productRows }] = await Promise.all([
          supabase
            .from('dj_music_tracks')
            .select('id, track_title, artist_name, duration_seconds, genre, file_url, price')
            .in('id', musicIds),
          supabase
            .from('products')
            .select('id, title, artist_name, duration, category, music_genre, file_url, price, sowers(display_name)')
            .in('id', musicIds)
            .eq('status', 'active')
        ])

        djMusicTrackMap = new Map((djMusicRows || []).map(track => [track.id, track]))
        productTrackMap = new Map((productRows || []).map(track => [track.id, track]))
      }

      const timelineTracks = timelineItems.flatMap((item, index) => {
        const voiceUrl = item?.fileUrl || item?.file_url || item?.audioUrl || item?.audio_url

        if (item?.type === 'voice_note' && voiceUrl) {
          return [{
            id: `voice-${scheduleId}-${index}`,
            track_title: item.title || `Voice Segment ${index + 1}`,
            artist_name: currentShow?.dj_name || 'Host',
            duration_seconds: item.durationMinutes ? Math.round(Number(item.durationMinutes) * 60) : null,
            genre: 'voice_note',
            file_url: voiceUrl,
            price: null,
            isVoiceNote: true,
            sourceType: 'voice_note'
          }]
        }

        if (item?.type === 'music') {
          const contentId = item?.contentId || item?.content_id
          const inlineMusicUrl = item?.fileUrl || item?.file_url || item?.audioUrl || item?.audio_url

          if (contentId) {
            const djTrack = djMusicTrackMap.get(contentId)
            if (djTrack) {
              return [{ ...djTrack, isVoiceNote: false, sourceType: 'dj_track' }]
            }

            const productTrack = productTrackMap.get(contentId)
            if (productTrack?.file_url) {
              return [{
                id: productTrack.id,
                track_title: productTrack.title || item.title || `Music Segment ${index + 1}`,
                artist_name: productTrack.artist_name || productTrack?.sowers?.display_name || 'Sower',
                duration_seconds: productTrack.duration ? Number(productTrack.duration) : null,
                genre: productTrack.music_genre || productTrack.category || 'music',
                file_url: productTrack.file_url,
                price: productTrack.price ?? null,
                isVoiceNote: false,
                sourceType: 'product'
              }]
            }
          }

          if (inlineMusicUrl) {
            return [{
              id: `music-inline-${scheduleId}-${index}`,
              track_title: item.title || `Music Segment ${index + 1}`,
              artist_name: currentShow?.dj_name || 'Host',
              duration_seconds: item.durationMinutes ? Math.round(Number(item.durationMinutes) * 60) : null,
              genre: 'music',
              file_url: inlineMusicUrl,
              price: item.bestowalAmount ?? null,
              isVoiceNote: false,
              sourceType: 'inline_music'
            }]
          }
        }

        return []
      })

      if (timelineTracks.length > 0) {
        console.log('[Listener] Loaded timeline sequence:', timelineTracks.length)
        return timelineTracks
      }

      console.warn('[Listener] Timeline exists but no playable timeline items were resolved; skipping library fallback to avoid wrong-slot playback')
      return []
    }

    let tracks = []

    if (sched.playlist_id) {
      const { data: ptData } = await supabase
        .from('dj_playlist_tracks')
        .select(`
          track_order,
          dj_music_tracks (id, track_title, artist_name, duration_seconds, genre, file_url, price)
        `)
        .eq('playlist_id', sched.playlist_id)
        .eq('is_active', true)
        .order('track_order')

      tracks = (ptData || [])
        .sort((a, b) => a.track_order - b.track_order)
        .map(pt => pt.dj_music_tracks)
        .filter(Boolean)
    }

    if (tracks.length === 0 && sched.dj_id) {
      const { data: djTracks } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, duration_seconds, genre, file_url, price')
        .eq('dj_id', sched.dj_id)
        .eq('is_public', true)
        .order('upload_date', { ascending: false })

      tracks = djTracks || []
    }

    return tracks
  }

  const initializeAudioStream = async () => {
    try {
      if (playlistTracks.length > 0) {
        const { trackIndex, seekOffset } = calculateCurrentTrack(playlistTracks)
        const targetTrack = playlistTracks[trackIndex]
        setCurrentTrack(targetTrack)
        await playCurrentTrackAudio(targetTrack, seekOffset)
      } else {
        const startedFromFetchedPlaylist = await fetchPlaylistAndPlay()
        if (!startedFromFetchedPlaylist) {
          return false
        }
      }
      
      console.log('[Listener] Audio stream initialized')
      return true
    } catch (error) {
      console.error('Error initializing audio stream:', error)
      return false
    }
  }

  const fetchPlaylistAndPlay = async () => {
    try {
      if (!currentShow?.schedule_id) {
        console.warn('[Listener] No schedule_id on currentShow')
        return false
      }

      const tracks = await loadTracksForSchedule(currentShow.schedule_id)

      console.log('[Listener] Fetched tracks:', tracks.length)
      setPlaylistTracks(tracks)

      if (tracks.length > 0) {
        const { trackIndex, seekOffset } = calculateCurrentTrack(tracks)
        const targetTrack = tracks[trackIndex]
        console.log(`[Listener] Resuming at track ${trackIndex + 1}/${tracks.length}: "${targetTrack.track_title}" (seek ${seekOffset}s)`)
        setCurrentTrack(targetTrack)
        await playCurrentTrackAudio(targetTrack, seekOffset)
        return true
      }

      toast({ title: "No Content", description: "No voice or music segments found for this slot.", variant: "destructive" })
      return false
    } catch (e) {
      console.error('[Listener] fetchPlaylistAndPlay failed:', e)
      return false
    }
  }

  const awardRadioPlayXP = async (track) => {
    if (!user || !track?.id) return
    try {
      // Look up the track owner (dj_id -> user_id)
      const { data: djTrack } = await supabase
        .from('dj_music_tracks')
        .select('dj_id, radio_djs(user_id)')
        .eq('id', track.id)
        .maybeSingle()

      const trackOwnerId = djTrack?.radio_djs?.user_id
      if (!trackOwnerId) return

      const { data: awarded, error } = await supabase.rpc('award_radio_play_xp', {
        p_track_owner_id: trackOwnerId,
        p_listener_id: user.id,
        p_track_id: track.id,
        p_points: 10
      })

      if (error) {
        console.error('[XP] Error awarding radio play XP:', error)
      } else if (awarded) {
        console.log(`[XP] ✅ +10 XP awarded to sower for "${track.track_title}"`)
      }
    } catch (e) {
      console.error('[XP] Failed to award XP:', e)
    }
  }

  const playCurrentTrackAudio = async (track, seekOffset = 0) => {
    if (!track?.file_url || !audioRef.current) {
      throw new Error('Missing playable track URL')
    }

    try {
      let resolvedUrl = track.file_url

      if (!track.isVoiceNote) {
        const preferredBucket = track.sourceType === 'product' ? 'music-tracks' : 'dj-music'
        resolvedUrl = await resolveAudioUrl(track.file_url, { bucketForKeys: preferredBucket })

        if (resolvedUrl === track.file_url && !String(resolvedUrl).startsWith('http')) {
          resolvedUrl = await resolveAudioUrl(track.file_url, { bucketForKeys: 'chat-files' })
        }
      }

      console.log('[Listener] Playing:', track.track_title, resolvedUrl?.substring(0, 80), seekOffset ? `(seek +${seekOffset}s)` : '')
      const audio = audioRef.current

      // Ensure audio is actually audible when starting a track
      audio.muted = false
      if (muted) setMuted(false)
      audio.volume = volume

      audio.src = resolvedUrl
      audio.load()

      // Seek AFTER metadata is loaded so currentTime actually works
      if (seekOffset > 0) {
        await new Promise((resolve) => {
          const onLoaded = () => {
            audio.removeEventListener('loadedmetadata', onLoaded)
            audio.currentTime = seekOffset
            console.log(`[Listener] Seeked to ${seekOffset}s`)
            resolve()
          }
          audio.addEventListener('loadedmetadata', onLoaded)
        })
      }

      await audio.play()
      console.log(`[Listener] ✅ Now playing: ${track.track_title}${seekOffset ? ` @ ${seekOffset}s` : ''}`)
      toast({ title: "Now Playing", description: `${track.track_title} by ${track.artist_name || 'Host'}` })

      // Award XP only for music tracks (not voice notes)
      if (!track.isVoiceNote) {
        awardRadioPlayXP(track)
      }

      return true
    } catch (playError) {
      if (playError?.name === 'NotAllowedError') {
        toast({ title: "Tap Play", description: "Click play to start the music" })
      } else {
        console.error('[Listener] Playback error:', playError)
        toast({ title: "Playback Error", description: "Could not play track", variant: "destructive" })
      }

      throw playError
    }
  }

  const fetchPlaylistForCurrentShow = async () => {
    try {
      if (!currentShow?.schedule_id) return

      const tracks = await loadTracksForSchedule(currentShow.schedule_id)

      setPlaylistTracks(tracks)
      if (tracks.length > 0) {
        // Always sync to clock position, not just first load
        const { trackIndex, seekOffset } = calculateCurrentTrack(tracks)
        setCurrentTrack(tracks[trackIndex])
        // Store seekOffset so autoplay can use it
        pendingSeekOffset.current = seekOffset
      }
    } catch (e) {
      console.error('Playlist preload failed:', e)
    }
  }

  const createAutomatedSessionForCurrentShow = async () => {
    try {
      if (!currentShow?.schedule_id) return

      // Get the schedule's playlist_id directly
      const { data: schedData } = await supabase
        .from('radio_schedule')
        .select('playlist_id, dj_id')
        .eq('id', currentShow.schedule_id)
        .single()

      let playlistId = schedData?.playlist_id

      // If no playlist_id on schedule, get DJ's first playlist
      if (!playlistId && schedData?.dj_id) {
        const { data: plData } = await supabase
          .from('dj_playlists')
          .select('id')
          .eq('dj_id', schedData.dj_id)
          .limit(1)
          .maybeSingle()
        playlistId = plData?.id
      }

      if (!playlistId) {
        toast({
          title: "No Playlist Found",
          description: "DJ hasn't uploaded any music yet",
          variant: "destructive"
        })
        return
      }

      // Create automated session
      const { data: newSession, error } = await supabase
        .from('radio_automated_sessions')
        .insert({
          session_id: liveSession.id,
          schedule_id: currentShow.schedule_id,
          playlist_id: playlistId,
          session_type: 'automated',
          playback_status: 'playing',
          current_track_index: 0,
          track_started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log('[Listener] Created automated session:', newSession)
      
      // Now fetch and play the track
      await fetchAndPlayCurrentTrack()
      
    } catch (error) {
      console.error('[Listener] Error creating automated session:', error)
      toast({
        title: "Setup Error",
        description: "Failed to set up music playback",
        variant: "destructive"
      })
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  const handleGuestRequest = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to request guest access",
        variant: "destructive"
      })
      return
    }
    
    setShowGuestModal(true)
  }

  const sendHeartReaction = async () => {
    // In a real implementation, you'd send this to other listeners
    toast({
      title: "❤️",
      description: "Sent love to the hosts!",
    })
  }

  return (
    <div className="space-y-6">
      {/* Live Stream Player */}
      <Card className="border-red-500 bg-gradient-to-r from-red-50 to-pink-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${liveSession ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
              <Badge variant={liveSession || isPreRecorded ? 'destructive' : 'secondary'} className="text-sm font-medium">
                {liveSession ? 'LIVE' : isPreRecorded ? 'AUTO-PLAY' : 'Scheduled'}
              </Badge>
              {liveSession && (
                <span className="text-sm text-muted-foreground">
                  {viewerCount} listening
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{currentShow?.show_name || 'AOD Station Live'}</h2>
              <p className="text-muted-foreground">
                with {activeHosts.filter(h => h.role === 'main_host')[0]?.radio_djs?.dj_name || currentShow?.dj_name || 'AOD Station'}
              </p>
              {/* Compact GoSat host avatars */}
              <div className="flex justify-center pt-1">
                <RadioHostPanel compact />
              </div>
            </div>

            {/* Audio Player Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                className={isPlaying ? "bg-red-500 hover:bg-red-600" : ""}
                disabled={!isPreRecorded && (!liveSession || !liveSession.id)}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 mr-2" />
                ) : (
                  <Play className="h-5 w-5 mr-2" />
                )}
                {isPlaying ? 'Pause' : 'Resume'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Volume Control */}
            {isPlaying && (
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <VolumeX className="h-4 w-4 text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <audio 
              ref={audioRef} 
              controls={false}
              loop={false}
              preload="auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Hosts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Live Hosts ({activeHosts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeHosts.map((host) => (
              <div key={host.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Radio className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {host.radio_djs?.dj_name || host.profiles?.display_name || 'Host'}
                    </span>
                    <Badge variant={host.role === 'main_host' ? 'default' : 'secondary'} className="text-xs">
                      {host.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {host.audio_enabled ? (
                      <Mic className="h-3 w-3 text-green-500" />
                    ) : (
                      <MicOff className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {host.audio_enabled ? 'Active' : 'Muted'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listener Actions */}
      {liveSession?.status === 'live' && (
        <Card>
          <CardHeader>
            <CardTitle>Join the Show</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={handleGuestRequest}
                disabled={hasRequestedGuest}
                className="flex-1"
              >
                <Hand className="h-4 w-4 mr-2" />
                {hasRequestedGuest ? 'Request Sent' : 'Request to Speak'}
              </Button>
              <Button
                variant="outline"
                onClick={sendHeartReaction}
              >
                <Heart className="h-4 w-4 mr-2" />
                Send Love
              </Button>
            </div>
            {hasRequestedGuest && (
              <p className="text-sm text-muted-foreground mt-2">
                Your guest request is pending. The hosts will review it shortly.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* GoSat Hosts — Message & Call */}
      <RadioHostPanel />

      {/* Music Purchase Interface */}
      <MusicPurchaseInterface 
        tracks={playlistTracks}
        currentTrack={currentTrack}
      />

      {/* Guest Request Modal */}
      <GuestRequestModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        liveSession={liveSession}
      />
    </div>
  )
}