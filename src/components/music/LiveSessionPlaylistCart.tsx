import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useLiveSessionPlaylist } from '@/contexts/LiveSessionPlaylistContext';
import { Music, X, Radio, GripVertical, Save } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function LiveSessionPlaylistCart() {
  const { selectedTracks, removeTrack, clearPlaylist, reorderTracks } = useLiveSessionPlaylist();
  const { user } = useAuth();
  const [playlistName, setPlaylistName] = useState('');
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleSavePlaylist = async () => {
    if (!user) {
      toast.error('Please sign in to save playlist');
      return;
    }

    if (!playlistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    if (selectedTracks.length === 0) {
      toast.error('Please add at least one track');
      return;
    }

    setSaving(true);
    try {
      // Get user's DJ profile
      const { data: djProfiles } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id);

      if (!djProfiles || djProfiles.length === 0) {
        toast.error('You need a DJ profile to create playlists. Please apply for a radio slot first.');
        setSaving(false);
        return;
      }

      const djId = djProfiles[0].id;

      // Calculate total duration
      const totalDuration = selectedTracks.reduce((sum, track) => sum + (track.duration_seconds || 0), 0);

      // Create playlist
      const { data: playlist, error: playlistError } = await supabase
        .from('dj_playlists')
        .insert({
          dj_id: djId,
          playlist_name: playlistName,
          playlist_type: 'live_session',
          is_public: true,
          track_count: selectedTracks.length,
          total_duration_seconds: totalDuration
        })
        .select()
        .single();

      if (playlistError) throw playlistError;

      // Add tracks to playlist
      const playlistTracks = selectedTracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        track_order: index + 1,
        is_active: true
      }));

      const { error: tracksError } = await supabase
        .from('dj_playlist_tracks')
        .insert(playlistTracks);

      if (tracksError) throw tracksError;

      toast.success(`Playlist "${playlistName}" saved successfully!`);
      setPlaylistName('');
      clearPlaylist();
    } catch (error) {
      console.error('Save playlist error:', error);
      toast.error('Failed to save playlist. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderTracks(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = selectedTracks.reduce((sum, track) => sum + (track.duration_seconds || 0), 0);
  const totalMins = Math.floor(totalDuration / 60);

  if (selectedTracks.length === 0) {
    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Live Session Playlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select tracks from community music to build your live session playlist</p>
            <p className="text-sm mt-2">For radio shows, rooms, and live streams</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Live Playlist
          </span>
          <Badge variant="secondary">
            {selectedTracks.length} tracks
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Enter playlist name..."
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          className="w-full"
        />

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {selectedTracks.map((track, index) => (
            <div
              key={track.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-move ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{track.track_title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artist_name || track.profiles?.username || 'Unknown'} • {formatDuration(track.duration_seconds)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTrack(track.id)}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total Duration</span>
            <span className="font-medium">{totalMins} minutes</span>
          </div>

          <Button
            onClick={handleSavePlaylist}
            disabled={saving || !playlistName.trim()}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Playlist'}
          </Button>

          {selectedTracks.length > 0 && (
            <Button
              variant="outline"
              onClick={clearPlaylist}
              className="w-full"
              size="sm"
            >
              Clear Playlist
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
