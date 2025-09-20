import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Plus, 
  Music, 
  Upload, 
  Play, 
  Pause, 
  Clock, 
  Hash,
  Trash2,
  Edit3,
  Save,
  X,
  Download,
  Users,
  Lock,
  Globe,
  Calendar
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'

export default function DJPlaylistManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [tracks, setTracks] = useState([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [newPlaylist, setNewPlaylist] = useState({
    playlist_name: '',
    description: '',
    playlist_type: 'custom',
    is_public: false
  })

  const [uploadData, setUploadData] = useState({
    files: [],
    tracks: []
  })

  const [showAddTracksDialog, setShowAddTracksDialog] = useState(false)
  const [availableTracks, setAvailableTracks] = useState([])
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [scheduleData, setScheduleData] = useState({
    date: '',
    hour_slot: '',
    show_name: '',
    category: 'music'
  })
  const [editingTrack, setEditingTrack] = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchPlaylists()
  }, [user])

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks(selectedPlaylist.id)
    }
  }, [selectedPlaylist])

  const fetchPlaylists = async () => {
    try {
      setLoading(true)
      
      // First get DJ profile
      const { data: djProfile, error: djError } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('🎵 DJ Profile fetch result:', { djProfile, djError, userId: user.id });

      if (djError) {
        console.error('DJ Profile error:', djError);
        toast({
          title: "Error fetching DJ profile",
          description: djError.message,
          variant: "destructive"
        })
        return
      }

      if (!djProfile) {
        console.log('❌ No DJ profile found for user:', user.id);
        toast({
          title: "DJ Profile Required",
          description: "You need to create a DJ profile first to manage playlists. Go to 'DJ Profiles' section.",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Fetch playlists for this DJ
      const { data, error } = await supabase
        .from('dj_playlists')
        .select('*')
        .eq('dj_id', djProfile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setPlaylists(data || [])
    } catch (error) {
      console.error('Error fetching playlists:', error)
      toast({
        title: "Error",
        description: "Failed to load playlists",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlaylistTracks = async (playlistId) => {
    try {
      const { data, error } = await supabase
        .from('dj_playlist_tracks')
        .select(`
          *,
          dj_music_tracks (
            track_title,
            artist_name,
            genre,
            bpm,
            duration_seconds
          )
        `)
        .eq('playlist_id', playlistId)
        .eq('is_active', true)
        .order('track_order', { ascending: true })

      if (error) throw error
      
      // Transform the data to match the expected format
      const transformedTracks = (data || []).map(track => ({
        ...track,
        title: track.dj_music_tracks?.track_title || 'Unknown Title',
        artist: track.dj_music_tracks?.artist_name || 'Unknown Artist',
        genre: track.dj_music_tracks?.genre,
        bpm: track.dj_music_tracks?.bpm,
        duration_seconds: track.dj_music_tracks?.duration_seconds
      }))
      
      setTracks(transformedTracks)
    } catch (error) {
      console.error('Error fetching tracks:', error)
    }
  }

  const createPlaylist = async () => {
    try {
      // Get DJ profile first
      const { data: djProfile, error: djError } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (djError) throw djError

      const { data, error } = await supabase
        .from('dj_playlists')
        .insert([{
          dj_id: djProfile.id,
          ...newPlaylist
        }])
        .select()
        .single()

      if (error) throw error

      setPlaylists(prev => [data, ...prev])
      setShowCreateDialog(false)
      setNewPlaylist({
        playlist_name: '',
        description: '',
        playlist_type: 'custom',
        is_public: false
      })

      toast({
        title: "Success",
        description: "Playlist created successfully!"
      })
    } catch (error) {
      console.error('Error creating playlist:', error)
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive"
      })
    }
  }

  const handleFileSelection = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const tracks = selectedFiles.map((file, index) => ({
      id: `temp-${Date.now()}-${index}`,
      file,
      title: file.name.split('.')[0],
      artist: '',
      album: '',
      genre: '',
      bpm: '',
      status: 'pending' // pending, uploading, success, error
    }))
    
    setUploadData({
      files: selectedFiles,
      tracks
    })
  }

  const updateTrackData = (trackId, field, value) => {
    setUploadData(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => 
        track.id === trackId ? { ...track, [field]: value } : track
      )
    }))
  }

  const uploadTracks = async () => {
    if (!uploadData.tracks.length || !selectedPlaylist) return

    try {
      setUploading(true)
      let completedUploads = 0
      const totalUploads = uploadData.tracks.length

      // Get DJ profile once
      const { data: djProfile, error: djError } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (djError) throw djError

      // Get starting order number for playlist
      const { data: existingTracks } = await supabase
        .from('dj_playlist_tracks')
        .select('track_order')
        .eq('playlist_id', selectedPlaylist.id)
        .order('track_order', { ascending: false })
        .limit(1)

      let nextOrder = existingTracks?.[0]?.track_order ? existingTracks[0].track_order + 1 : 1

      // Upload tracks in parallel
      const uploadPromises = uploadData.tracks.map(async (track, index) => {
        try {
          // Update track status to uploading
          setUploadData(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => 
              t.id === track.id ? { ...t, status: 'uploading' } : t
            )
          }))

          // Create unique file path
          const fileExt = track.file.name.split('.').pop()
          const fileName = `${Date.now()}-${index}-${track.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          const filePath = `${user.id}/${fileName}`

          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('music-tracks')
            .upload(filePath, track.file)

          if (uploadError) throw uploadError

          // Get file duration
          const audioDuration = await getAudioDuration(track.file)

          // Create track record
          const { data: trackData, error: trackInsertError } = await supabase
            .from('dj_music_tracks')
            .insert([{
              dj_id: djProfile.id,
              file_url: filePath,
              track_title: track.title || track.file.name.split('.')[0],
              artist_name: track.artist || 'Unknown Artist',
              genre: track.genre || '',
              bpm: track.bpm ? parseInt(track.bpm) : null,
              file_size: track.file.size,
              duration_seconds: audioDuration,
              track_type: 'music'
            }])
            .select()
            .single()

          if (trackInsertError) throw trackInsertError

          // Add to playlist
          const { error: playlistTrackError } = await supabase
            .from('dj_playlist_tracks')
            .insert([{
              playlist_id: selectedPlaylist.id,
              track_id: trackData.id,
              track_order: nextOrder + index
            }])

          if (playlistTrackError) throw playlistTrackError

          // Update track status to success
          setUploadData(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => 
              t.id === track.id ? { ...t, status: 'success' } : t
            )
          }))

          completedUploads++
          setUploadProgress((completedUploads / totalUploads) * 100)

          return { success: true, track }
        } catch (error) {
          console.error(`Error uploading track ${track.file.name}:`, error)
          
          // Update track status to error
          setUploadData(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => 
              t.id === track.id ? { ...t, status: 'error', error: error.message } : t
            )
          }))

          return { success: false, track, error: error.message }
        }
      })

      const results = await Promise.all(uploadPromises)
      
      // Show results
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      if (successful > 0) {
        await fetchPlaylistTracks(selectedPlaylist.id)
        
        if (failed === 0) {
          toast({
            title: "Success",
            description: `All ${successful} tracks uploaded successfully!`
          })
          setShowUploadDialog(false)
          setUploadData({ files: [], tracks: [] })
        } else {
          toast({
            title: "Partial Success",
            description: `${successful} tracks uploaded, ${failed} failed. Check the list for details.`
          })
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "All tracks failed to upload. Please try again.",
          variant: "destructive"
        })
      }

    } catch (error) {
      console.error('Error uploading tracks:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload tracks",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }


  const removeTrackFromPlaylist = async (trackId) => {
    try {
      const { error } = await supabase
        .from('dj_playlist_tracks')
        .delete()
        .eq('playlist_id', selectedPlaylist.id)
        .eq('track_id', trackId)

      if (error) throw error

      fetchPlaylistTracks(selectedPlaylist.id)
      toast({
        title: "Success",
        description: "Track removed from playlist"
      })
    } catch (error) {
      console.error('Error removing track:', error)
      toast({
        title: "Error",
        description: "Failed to remove track",
        variant: "destructive"
      })
    }
  }

  const fetchAvailableTracks = async () => {
    try {
      const { data: djProfile, error: djError } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (djError) throw djError

      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('dj_id', djProfile.id)
        .order('upload_date', { ascending: false })

      if (error) throw error

      // Filter out tracks already in the current playlist
      const playlistTrackIds = tracks.map(t => t.track_id)
      const availableTracks = (data || []).filter(track => !playlistTrackIds.includes(track.id))
      
      setAvailableTracks(availableTracks)
    } catch (error) {
      console.error('Error fetching available tracks:', error)
      toast({
        title: "Error",
        description: "Failed to load available tracks",
        variant: "destructive"
      })
    }
  }

  const addExistingTrackToPlaylist = async (trackId) => {
    try {
      const { data: existingTracks } = await supabase
        .from('dj_playlist_tracks')
        .select('track_order')
        .eq('playlist_id', selectedPlaylist.id)
        .order('track_order', { ascending: false })
        .limit(1)

      const nextOrder = existingTracks?.[0]?.track_order ? existingTracks[0].track_order + 1 : 1

      const { error } = await supabase
        .from('dj_playlist_tracks')
        .insert({
          playlist_id: selectedPlaylist.id,
          track_id: trackId,
          track_order: nextOrder
        })

      if (error) throw error

      fetchPlaylistTracks(selectedPlaylist.id)
      fetchAvailableTracks()
      toast({
        title: "Success",
        description: "Track added to playlist"
      })
    } catch (error) {
      console.error('Error adding track:', error)
      toast({
        title: "Error",
        description: "Failed to add track to playlist",
        variant: "destructive"
      })
    }
  }

  const schedulePlaylistToSlot = async () => {
    try {
      const { data: djProfile, error: djError } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (djError) throw djError

      // Create radio show first
      const { data: showData, error: showError } = await supabase
        .from('radio_shows')
        .insert({
          show_name: scheduleData.show_name,
          category: scheduleData.category,
          description: `Automated playlist: ${selectedPlaylist.playlist_name}`,
          dj_id: djProfile.id
        })
        .select()
        .single()

      if (showError) throw showError

      // Create schedule entry
      const scheduleTime = new Date(`${scheduleData.date}T${String(scheduleData.hour_slot).padStart(2, '0')}:00:00`)
      
      const { data: scheduleEntry, error: scheduleError } = await supabase
        .from('radio_schedule')
        .insert({
          dj_id: djProfile.id,
          show_id: showData.id,
          time_slot_date: scheduleData.date,
          hour_slot: parseInt(scheduleData.hour_slot),
          start_time: scheduleTime,
          end_time: new Date(scheduleTime.getTime() + 60 * 60 * 1000), // 1 hour
          status: 'scheduled'
        })
        .select()
        .single()

      if (scheduleError) throw scheduleError

      // Create automated session linked to the playlist
      const { error: automatedError } = await supabase
        .from('radio_automated_sessions')
        .insert({
          schedule_id: scheduleEntry.id,
          playlist_id: selectedPlaylist.id,
          session_type: 'automated',
          playback_status: 'scheduled',
          current_track_index: 0
        })

      if (automatedError) throw automatedError

      setShowScheduleDialog(false)
      setScheduleData({
        date: '',
        hour_slot: '',
        show_name: '',
        category: 'music'
      })

      toast({
        title: "Success",
        description: "Playlist scheduled to radio slot successfully!"
      })
    } catch (error) {
      console.error('Error scheduling playlist:', error)
      toast({
        title: "Error",
        description: "Failed to schedule playlist to radio slot",
        variant: "destructive"
      })
    }
  }

  const getAudioDuration = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration))
      }
      audio.onerror = () => {
        resolve(180) // Default 3 minutes if can't read duration
      }
      audio.src = URL.createObjectURL(file)
    })
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startEditTrack = (track) => {
    setEditingTrack(track.track_id)
    setEditData({
      track_title: track.title,
      artist_name: track.artist || '',
      genre: track.genre || '',
      bpm: track.bpm || ''
    })
  }

  const cancelEditTrack = () => {
    setEditingTrack(null)
    setEditData({})
  }

  const saveTrackEdit = async (trackId) => {
    try {
      const { error } = await supabase
        .from('dj_music_tracks')
        .update({
          track_title: editData.track_title,
          artist_name: editData.artist_name,
          genre: editData.genre,
          bpm: editData.bpm ? parseInt(editData.bpm) : null
        })
        .eq('id', trackId)

      if (error) throw error

      // Refresh the playlist tracks to show updated data
      await fetchPlaylistTracks(selectedPlaylist.id)
      
      setEditingTrack(null)
      setEditData({})
      
      toast({
        title: "Success",
        description: "Track updated successfully!"
      })
    } catch (error) {
      console.error('Error updating track:', error)
      toast({
        title: "Error",
        description: "Failed to update track",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading playlists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">My Playlists</h2>
          <p className="text-muted-foreground">Create and manage your music playlists for radio shows</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlists List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Playlists</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {playlists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">No playlists yet</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create Your First Playlist
                  </Button>
                </div>
              ) : (
                playlists.map((playlist) => (
                  <Card 
                    key={playlist.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedPlaylist?.id === playlist.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPlaylist(playlist)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{playlist.playlist_name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {playlist.track_count || 0} tracks • {formatDuration(playlist.total_duration_seconds || 0)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" size="sm">
                              {playlist.playlist_type}
                            </Badge>
                            {playlist.is_public ? (
                              <Globe className="h-3 w-3 text-green-600" />
                            ) : (
                              <Lock className="h-3 w-3 text-gray-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Playlist Details */}
        <div className="lg:col-span-2">
          {selectedPlaylist ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      {selectedPlaylist.playlist_name}
                    </CardTitle>
                    <p className="text-muted-foreground mt-1">
                      {selectedPlaylist.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {tracks.length} tracks
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(selectedPlaylist.total_duration_seconds || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        {selectedPlaylist.is_public ? (
                          <>
                            <Globe className="h-3 w-3 text-green-600" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Private
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Track
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      fetchAvailableTracks()
                      setShowAddTracksDialog(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Existing Tracks
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowScheduleDialog(true)}
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule to Radio Slot
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tracks.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No tracks in this playlist</p>
                    <Button onClick={() => setShowUploadDialog(true)}>
                      Upload Your First Track
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tracks.map((track, index) => (
                      <div key={track.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 text-center text-sm text-muted-foreground">
                            {index + 1}
                          </div>
                          {editingTrack === track.track_id ? (
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={editData.track_title}
                                  onChange={(e) => setEditData(prev => ({ ...prev, track_title: e.target.value }))}
                                  placeholder="Track title"
                                  className="h-8"
                                />
                                <Input
                                  value={editData.artist_name}
                                  onChange={(e) => setEditData(prev => ({ ...prev, artist_name: e.target.value }))}
                                  placeholder="Artist name"
                                  className="h-8"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={editData.genre}
                                  onChange={(e) => setEditData(prev => ({ ...prev, genre: e.target.value }))}
                                  placeholder="Genre"
                                  className="h-8"
                                />
                                <Input
                                  type="number"
                                  value={editData.bpm}
                                  onChange={(e) => setEditData(prev => ({ ...prev, bpm: e.target.value }))}
                                  placeholder="BPM"
                                  className="h-8"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1">
                              <p className="font-medium">{track.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {track.artist} {track.album && `• ${track.album}`}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {!editingTrack && track.genre && (
                            <Badge variant="secondary" size="sm">{track.genre}</Badge>
                          )}
                          {!editingTrack && track.bpm && (
                            <span>{track.bpm} BPM</span>
                          )}
                          {!editingTrack && (
                            <span>{formatDuration(track.duration_seconds)}</span>
                          )}
                          {editingTrack === track.track_id ? (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveTrackEdit(track.track_id)}
                                className="text-green-500 hover:text-green-700"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditTrack}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditTrack(track)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTrackFromPlaylist(track.track_id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a playlist to view its tracks</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Create a new playlist for your radio shows and upload tracks to it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playlist_name">Playlist Name *</Label>
              <Input
                id="playlist_name"
                placeholder="e.g., 2 Hour Live Set"
                value={newPlaylist.playlist_name}
                onChange={(e) => setNewPlaylist(prev => ({ ...prev, playlist_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this playlist..."
                value={newPlaylist.description}
                onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="playlist_type">Type</Label>
              <Select 
                value={newPlaylist.playlist_type} 
                onValueChange={(value) => setNewPlaylist(prev => ({ ...prev, playlist_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="live">Live Show</SelectItem>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="backup">Backup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={newPlaylist.is_public}
                onChange={(e) => setNewPlaylist(prev => ({ ...prev, is_public: e.target.checked }))}
              />
              <Label htmlFor="is_public">Make this playlist public</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={createPlaylist}
                disabled={!newPlaylist.playlist_name.trim()}
              >
                Create Playlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Track Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Track</DialogTitle>
            <DialogDescription>
              Add a new track to {selectedPlaylist?.playlist_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="files">Audio Files</Label>
              <Input
                id="files"
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileSelection}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select multiple files: MP3, WAV, FLAC, AAC • Hold Ctrl/Cmd to select multiple
              </p>
            </div>
            
            {uploadData.tracks.length > 0 && (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h4 className="font-medium">Selected Tracks ({uploadData.tracks.length})</h4>
                  {uploadData.tracks.map((track) => (
                    <div key={track.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          <span className="font-medium text-sm">{track.file.name}</span>
                          {track.status === 'uploading' && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                          {track.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {track.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(track.file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      
                      {track.status === 'error' && (
                        <p className="text-xs text-red-500">Error: {track.error}</p>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={track.title}
                            onChange={(e) => updateTrackData(track.id, 'title', e.target.value)}
                            placeholder="Track title"
                            className="h-8"
                            disabled={track.status === 'uploading' || track.status === 'success'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Artist</Label>
                          <Input
                            value={track.artist}
                            onChange={(e) => updateTrackData(track.id, 'artist', e.target.value)}
                            placeholder="Artist name"
                            className="h-8"
                            disabled={track.status === 'uploading' || track.status === 'success'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Genre</Label>
                          <Input
                            value={track.genre}
                            onChange={(e) => updateTrackData(track.id, 'genre', e.target.value)}
                            placeholder="Genre"
                            className="h-8"
                            disabled={track.status === 'uploading' || track.status === 'success'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">BPM</Label>
                          <Input
                            type="number"
                            value={track.bpm}
                            onChange={(e) => updateTrackData(track.id, 'bpm', e.target.value)}
                            placeholder="120"
                            className="h-8"
                            disabled={track.status === 'uploading' || track.status === 'success'}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading tracks... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadDialog(false)
                  setUploadData({ files: [], tracks: [] })
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={uploadTracks}
                disabled={!uploadData.tracks.length || uploading}
              >
                {uploading ? 'Uploading...' : `Upload ${uploadData.tracks.length} Track${uploadData.tracks.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Existing Tracks Dialog */}
      <Dialog open={showAddTracksDialog} onOpenChange={setShowAddTracksDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Existing Tracks</DialogTitle>
            <DialogDescription>
              Add tracks from your library to {selectedPlaylist?.playlist_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {availableTracks.length === 0 ? (
              <div className="text-center py-8">
                <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No available tracks to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTracks.map((track) => (
                  <div key={track.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{track.track_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {track.artist_name} {track.genre && `• ${track.genre}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {track.bpm && (
                        <Badge variant="secondary" size="sm">{track.bpm} BPM</Badge>
                      )}
                      <Button
                        size="sm"
                        onClick={() => addExistingTrackToPlaylist(track.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule to Radio Slot Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Playlist to Radio Slot</DialogTitle>
            <DialogDescription>
              Schedule {selectedPlaylist?.playlist_name} to play during a radio time slot
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="show_name">Show Name *</Label>
              <Input
                id="show_name"
                placeholder="e.g., Morning Music Mix"
                value={scheduleData.show_name}
                onChange={(e) => setScheduleData(prev => ({ ...prev, show_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={scheduleData.date}
                onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="hour_slot">Hour Slot *</Label>
              <Select 
                value={scheduleData.hour_slot} 
                onValueChange={(value) => setScheduleData(prev => ({ ...prev, hour_slot: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i === 0 ? '12 AM' : i === 12 ? '12 PM' : i < 12 ? `${i} AM` : `${i - 12} PM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={scheduleData.category} 
                onValueChange={(value) => setScheduleData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="talk">Talk</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="comedy">Comedy</SelectItem>
                  <SelectItem value="spiritual">Spiritual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={schedulePlaylistToSlot}
                disabled={!scheduleData.show_name.trim() || !scheduleData.date || !scheduleData.hour_slot}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Playlist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}