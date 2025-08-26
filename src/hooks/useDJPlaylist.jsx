import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const useDJPlaylist = () => {
  const [tracks, setTracks] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(false)
  const [djProfile, setDjProfile] = useState(null)

  useEffect(() => {
    fetchDJProfile()
  }, [])

  useEffect(() => {
    if (djProfile) {
      fetchTracks()
      fetchPlaylists()
    }
  }, [djProfile])

  const fetchDJProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        console.error('❌ No authenticated user:', userError)
        return
      }

      console.log('🎵 Fetching DJ profile for user:', userData.user.id)
      
      const { data, error } = await supabase
        .from('radio_djs')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (error) {
        console.error('❌ Error fetching DJ profile:', error)
        return
      }

      console.log('🎵 DJ Profile found:', data)
      setDjProfile(data)
    } catch (error) {
      console.error('❌ Exception fetching DJ profile:', error)
    }
  }

  const fetchTracks = async () => {
    if (!djProfile) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('dj_id', djProfile.id)
        .order('upload_date', { ascending: false })

      if (error) throw error
      setTracks(data || [])
    } catch (error) {
      console.error('Error fetching tracks:', error)
      toast.error('Failed to load tracks')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlaylists = async () => {
    if (!djProfile) return

    try {
      const { data, error } = await supabase
        .from('dj_playlists')
        .select(`
          *,
          dj_playlist_tracks (
            track_order,
            dj_music_tracks (
              id,
              track_title,
              artist_name,
              duration_seconds
            )
          )
        `)
        .eq('dj_id', djProfile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlaylists(data || [])
    } catch (error) {
      console.error('Error fetching playlists:', error)
      toast.error('Failed to load playlists')
    }
  }

  const uploadTrack = async (file, trackData) => {
    console.log('🎵 Upload started - DJ Profile:', djProfile)
    console.log('🎵 Upload started - File:', file)
    console.log('🎵 Upload started - Auth user:', (await supabase.auth.getUser()).data.user)
    
    if (!djProfile) {
      console.error('❌ No DJ profile found')
      toast.error('DJ profile required to upload tracks')
      return null
    }

    try {
      setLoading(true)

      // Try to create the bucket if it doesn't exist
      console.log('🎵 Ensuring bucket exists...')
      const { data: buckets } = await supabase.storage.listBuckets()
      console.log('🎵 Available buckets:', buckets)
      
      const djMusicBucket = buckets?.find(b => b.id === 'dj-music')
      if (!djMusicBucket) {
        console.log('🎵 Creating dj-music bucket...')
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('dj-music', {
          public: true,
          fileSizeLimit: 104857600,
          allowedMimeTypes: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/ogg', 'audio/flac']
        })
        console.log('🎵 Bucket creation result:', { newBucket, createError })
        if (createError) throw createError
      }

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      // Get current user ID for folder structure
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      
      console.log('🎵 Attempting to upload to dj-music bucket:', fileName)
      console.log('🎵 File details:', { name: file.name, size: file.size, type: file.type })
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dj-music')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      console.log('🎵 Upload result:', { uploadData, uploadError })
      
      if (uploadError) {
        console.error('🎵 Upload error details:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dj-music')
        .getPublicUrl(fileName)

      // Create track record
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .insert({
          dj_id: djProfile.id,
          track_title: trackData.title,
          artist_name: trackData.artist,
          duration_seconds: trackData.duration,
          file_url: publicUrl,
          file_size: file.size,
          track_type: trackData.type || 'music',
          tags: trackData.tags || [],
          genre: trackData.genre,
          bpm: trackData.bpm,
          is_explicit: trackData.isExplicit || false
        })
        .select()
        .single()

      if (error) throw error

      await fetchTracks()
      toast.success('Track uploaded successfully!')
      return data
    } catch (error) {
      console.error('Error uploading track:', error)
      toast.error('Failed to upload track')
      return null
    } finally {
      setLoading(false)
    }
  }

  const createPlaylist = async (playlistData) => {
    if (!djProfile) {
      toast.error('DJ profile required to create playlists')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('dj_playlists')
        .insert({
          dj_id: djProfile.id,
          playlist_name: playlistData.name,
          description: playlistData.description,
          playlist_type: playlistData.type || 'custom',
          is_public: playlistData.isPublic || false
        })
        .select()
        .single()

      if (error) throw error

      await fetchPlaylists()
      toast.success('Playlist created successfully!')
      return data
    } catch (error) {
      console.error('Error creating playlist:', error)
      toast.error('Failed to create playlist')
      return null
    }
  }

  const addTrackToPlaylist = async (playlistId, trackId, order = null) => {
    try {
      // Get the next order number if not specified
      if (order === null) {
        const { data: existingTracks } = await supabase
          .from('dj_playlist_tracks')
          .select('track_order')
          .eq('playlist_id', playlistId)
          .order('track_order', { ascending: false })
          .limit(1)

        order = existingTracks?.[0]?.track_order ? existingTracks[0].track_order + 1 : 1
      }

      const { error } = await supabase
        .from('dj_playlist_tracks')
        .insert({
          playlist_id: playlistId,
          track_id: trackId,
          track_order: order
        })

      if (error) throw error

      await fetchPlaylists()
      toast.success('Track added to playlist!')
    } catch (error) {
      console.error('Error adding track to playlist:', error)
      toast.error('Failed to add track to playlist')
    }
  }

  const removeTrackFromPlaylist = async (playlistId, trackId) => {
    try {
      const { error } = await supabase
        .from('dj_playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId)

      if (error) throw error

      await fetchPlaylists()
      toast.success('Track removed from playlist!')
    } catch (error) {
      console.error('Error removing track from playlist:', error)
      toast.error('Failed to remove track from playlist')
    }
  }

  const reorderPlaylistTracks = async (playlistId, trackIds) => {
    try {
      // Update track orders in sequence
      const updates = trackIds.map((trackId, index) => ({
        playlist_id: playlistId,
        track_id: trackId,
        track_order: index + 1
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('dj_playlist_tracks')
          .update({ track_order: update.track_order })
          .eq('playlist_id', update.playlist_id)
          .eq('track_id', update.track_id)

        if (error) throw error
      }

      await fetchPlaylists()
      toast.success('Playlist order updated!')
    } catch (error) {
      console.error('Error reordering playlist:', error)
      toast.error('Failed to reorder playlist')
    }
  }

  const scheduleAutomatedSession = async (scheduleId, playlistId) => {
    try {
      const { data, error } = await supabase
        .from('radio_automated_sessions')
        .insert({
          schedule_id: scheduleId,
          playlist_id: playlistId,
          session_type: 'automated',
          playback_status: 'scheduled'
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Automated session scheduled!')
      return data
    } catch (error) {
      console.error('Error scheduling automated session:', error)
      toast.error('Failed to schedule automated session')
      return null
    }
  }

  const deleteTrack = async (trackId) => {
    try {
      const { error } = await supabase
        .from('dj_music_tracks')
        .delete()
        .eq('id', trackId)

      if (error) throw error

      await fetchTracks()
      toast.success('Track deleted successfully!')
    } catch (error) {
      console.error('Error deleting track:', error)
      toast.error('Failed to delete track')
    }
  }

  const deletePlaylist = async (playlistId) => {
    try {
      const { error } = await supabase
        .from('dj_playlists')
        .delete()
        .eq('id', playlistId)

      if (error) throw error

      await fetchPlaylists()
      toast.success('Playlist deleted successfully!')
    } catch (error) {
      console.error('Error deleting playlist:', error)
      toast.error('Failed to delete playlist')
    }
  }

  return {
    tracks,
    playlists,
    loading,
    djProfile,
    uploadTrack,
    createPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
    scheduleAutomatedSession,
    deleteTrack,
    deletePlaylist,
    fetchTracks,
    fetchPlaylists
  }
}