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
  Globe
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
    file: null,
    title: '',
    artist: '',
    album: '',
    genre: '',
    bpm: ''
  })

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

      if (djError) throw djError

      if (!djProfile) {
        toast({
          title: "DJ Profile Required",
          description: "You need to create a DJ profile first to manage playlists",
          variant: "destructive"
        })
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
        .select('*')
        .eq('playlist_id', playlistId)
        .eq('is_active', true)
        .order('track_order', { ascending: true })

      if (error) throw error
      setTracks(data || [])
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

  const uploadTrack = async () => {
    if (!uploadData.file || !selectedPlaylist) return

    try {
      setUploading(true)
      setUploadProgress(0)

      // Create unique file path
      const fileExt = uploadData.file.name.split('.').pop()
      const fileName = `${Date.now()}-${uploadData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${user.id}/${fileName}`

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('music-tracks')
        .upload(filePath, uploadData.file, {
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100)
          }
        })

      if (uploadError) throw uploadError

      // Get file duration (simplified - in real app you'd use Web Audio API)
      const audioDuration = await getAudioDuration(uploadData.file)

      // Add track to playlist
      const { error: trackError } = await supabase
        .from('dj_playlist_tracks')
        .insert([{
          playlist_id: selectedPlaylist.id,
          file_path: filePath,
          file_name: uploadData.file.name,
          file_size: uploadData.file.size,
          duration_seconds: audioDuration,
          title: uploadData.title || uploadData.file.name.split('.')[0],
          artist: uploadData.artist || 'Unknown Artist',
          album: uploadData.album || '',
          genre: uploadData.genre || '',
          bpm: uploadData.bpm ? parseInt(uploadData.bpm) : null,
          uploaded_by: user.id
        }])

      if (trackError) throw trackError

      // Refresh tracks
      await fetchPlaylistTracks(selectedPlaylist.id)
      
      setShowUploadDialog(false)
      setUploadData({
        file: null,
        title: '',
        artist: '',
        album: '',
        genre: '',
        bpm: ''
      })

      toast({
        title: "Success",
        description: "Track uploaded successfully!"
      })
    } catch (error) {
      console.error('Error uploading track:', error)
      toast({
        title: "Error",
        description: "Failed to upload track",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
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
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center text-sm text-muted-foreground">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{track.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {track.artist} {track.album && `• ${track.album}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {track.genre && (
                            <Badge variant="secondary" size="sm">{track.genre}</Badge>
                          )}
                          {track.bpm && (
                            <span>{track.bpm} BPM</span>
                          )}
                          <span>{formatDuration(track.duration_seconds)}</span>
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
              <Label htmlFor="file">Audio File *</Label>
              <Input
                id="file"
                type="file"
                accept="audio/*"
                onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: MP3, WAV, FLAC, AAC
              </p>
            </div>
            
            {uploadData.file && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Track title"
                      value={uploadData.title}
                      onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="artist">Artist</Label>
                    <Input
                      id="artist"
                      placeholder="Artist name"
                      value={uploadData.artist}
                      onChange={(e) => setUploadData(prev => ({ ...prev, artist: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="album">Album</Label>
                    <Input
                      id="album"
                      placeholder="Album name"
                      value={uploadData.album}
                      onChange={(e) => setUploadData(prev => ({ ...prev, album: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="genre">Genre</Label>
                    <Input
                      id="genre"
                      placeholder="Genre"
                      value={uploadData.genre}
                      onChange={(e) => setUploadData(prev => ({ ...prev, genre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bpm">BPM</Label>
                    <Input
                      id="bpm"
                      type="number"
                      placeholder="120"
                      value={uploadData.bpm}
                      onChange={(e) => setUploadData(prev => ({ ...prev, bpm: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={uploadTrack}
                disabled={!uploadData.file || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Track'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}