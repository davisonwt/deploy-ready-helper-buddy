import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Music, 
  Plus, 
  Play, 
  Pause, 
  Clock, 
  Users, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit,
  GripVertical,
  MoreHorizontal
} from 'lucide-react'
import { useDJPlaylist } from '@/hooks/useDJPlaylist'
import { toast } from 'sonner'

export default function DJPlaylistManager() {
  const { playlists, tracks, loading, createPlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist } = useDJPlaylist()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [showTrackSelector, setShowTrackSelector] = useState(false)
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    type: 'custom',
    isPublic: false
  })

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCreatePlaylist = async (e) => {
    e.preventDefault()
    
    if (!newPlaylist.name.trim()) {
      toast.error('Please enter a playlist name')
      return
    }

    const result = await createPlaylist(newPlaylist)
    
    if (result) {
      setNewPlaylist({ name: '', description: '', type: 'custom', isPublic: false })
      setShowCreateDialog(false)
    }
  }

  const handleDeletePlaylist = async (playlistId) => {
    if (confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      await deletePlaylist(playlistId)
    }
  }

  const handleAddTrackToPlaylist = async (trackId) => {
    if (!selectedPlaylist) return
    
    await addTrackToPlaylist(selectedPlaylist.id, trackId)
    setShowTrackSelector(false)
  }

  const handleRemoveTrackFromPlaylist = async (trackId) => {
    if (!selectedPlaylist) return
    
    await removeTrackFromPlaylist(selectedPlaylist.id, trackId)
  }

  const getPlaylistTypeLabel = (type) => {
    const types = {
      custom: 'Custom',
      scheduled_session: 'Scheduled Session',
      backup: 'Backup'
    }
    return types[type] || type
  }

  const getPlaylistTypeBadgeVariant = (type) => {
    const variants = {
      custom: 'default',
      scheduled_session: 'secondary',
      backup: 'outline'
    }
    return variants[type] || 'default'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading playlists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">DJ Playlists</h2>
          <p className="text-muted-foreground">Manage your music playlists and automated sessions</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-name">Playlist Name *</Label>
                <Input
                  id="playlist-name"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter playlist name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="playlist-description">Description</Label>
                <Textarea
                  id="playlist-description"
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="playlist-type">Type</Label>
                <Select 
                  value={newPlaylist.type} 
                  onValueChange={(value) => setNewPlaylist(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Playlist</SelectItem>
                    <SelectItem value="scheduled_session">2-Hour Session</SelectItem>
                    <SelectItem value="backup">Backup Playlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="playlist-public"
                  checked={newPlaylist.isPublic}
                  onChange={(e) => setNewPlaylist(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
                <Label htmlFor="playlist-public">Make this playlist public</Label>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Playlist</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlists Grid */}
      {playlists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No playlists yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first playlist to organize your tracks for radio sessions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      {playlist.playlist_name}
                      {playlist.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </CardTitle>
                    <Badge variant={getPlaylistTypeBadgeVariant(playlist.playlist_type)}>
                      {getPlaylistTypeLabel(playlist.playlist_type)}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePlaylist(playlist.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {playlist.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {playlist.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Music className="h-4 w-4" />
                      {playlist.track_count} tracks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(playlist.total_duration_seconds)}
                    </span>
                  </div>
                  
                  <Separator />
                  
                  {/* Track List Preview */}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {playlist.dj_playlist_tracks?.slice(0, 5).map((playlistTrack, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">
                          {index + 1}. {playlistTrack.dj_music_tracks?.track_title}
                          {playlistTrack.dj_music_tracks?.artist_name && (
                            <span className="text-muted-foreground">
                              {' - '}{playlistTrack.dj_music_tracks.artist_name}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {formatDuration(playlistTrack.dj_music_tracks?.duration_seconds || 0)}
                        </span>
                      </div>
                    ))}
                    {playlist.track_count > 5 && (
                      <div className="text-xs text-muted-foreground">
                        +{playlist.track_count - 5} more tracks
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedPlaylist(playlist)
                        setShowTrackSelector(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Tracks
                    </Button>
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Track Selector Dialog */}
      <Dialog open={showTrackSelector} onOpenChange={setShowTrackSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Add Tracks to "{selectedPlaylist?.playlist_name}"
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {tracks.length === 0 ? (
              <div className="text-center py-8">
                <Music className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No tracks available</p>
              </div>
            ) : (
              tracks.map((track) => {
                const isInPlaylist = selectedPlaylist?.dj_playlist_tracks?.some(
                  plt => plt.dj_music_tracks?.id === track.id
                )
                
                return (
                  <div key={track.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{track.track_title}</h4>
                      {track.artist_name && (
                        <p className="text-sm text-muted-foreground">{track.artist_name}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span>{formatDuration(track.duration_seconds)}</span>
                        {track.genre && <span>• {track.genre}</span>}
                        {track.bpm && <span>• {track.bpm} BPM</span>}
                      </div>
                    </div>
                    
                    <Button
                      variant={isInPlaylist ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (isInPlaylist) {
                          handleRemoveTrackFromPlaylist(track.id)
                        } else {
                          handleAddTrackToPlaylist(track.id)
                        }
                      }}
                      disabled={isInPlaylist}
                    >
                      {isInPlaylist ? 'In Playlist' : 'Add Track'}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}