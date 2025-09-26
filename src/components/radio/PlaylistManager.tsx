import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PlaylistManager = () => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: playlists } = useQuery({
    queryKey: ['dj-playlists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('dj_playlists')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tracks } = useQuery({
    queryKey: ['dj-tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: djData } = useQuery({
    queryKey: ['dj-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!djData?.id) throw new Error('DJ profile not found');
      const { error } = await supabase.from('dj_playlists').insert({
        dj_id: djData.id,
        playlist_name: name,
        playlist_type: 'custom',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-playlists'] });
      setNewPlaylistName('');
      toast({ title: 'Playlist created!' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('dj_playlists')
        .update({ playlist_name: name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-playlists'] });
      setEditingId(null);
      toast({ title: 'Playlist updated!' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('dj_playlists').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-playlists'] });
      toast({ title: 'Playlist deleted!' });
    },
  });

  const addTrackMutation = useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      // Get current track count
      const { data: playlistTracks } = await supabase
        .from('dj_playlist_tracks')
        .select('track_order')
        .eq('playlist_id', playlistId)
        .order('track_order', { ascending: false })
        .limit(1);

      const nextOrder = playlistTracks && playlistTracks.length > 0 ? playlistTracks[0].track_order + 1 : 1;

      const { error } = await supabase.from('dj_playlist_tracks').insert({
        playlist_id: playlistId,
        track_id: trackId,
        track_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedTrackId('');
      toast({ title: 'Track added to playlist!' });
    },
  });

  const handleCreate = () => createMutation.mutate(newPlaylistName);
  const handleUpdate = () => updateMutation.mutate({ id: editingId!, name: editName });
  const handleDelete = (id: string) => deleteMutation.mutate(id);
  const handleAddTrack = (playlistId: string) => {
    if (selectedTrackId) {
      addTrackMutation.mutate({ playlistId, trackId: selectedTrackId });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Playlist Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input 
                placeholder="New playlist name" 
                value={newPlaylistName} 
                onChange={(e) => setNewPlaylistName(e.target.value)} 
              />
              <Button onClick={handleCreate} disabled={!newPlaylistName}>
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
            
            <div className="space-y-2">
              {playlists?.map((playlist) => (
                <div key={playlist.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <Badge variant="outline">{playlist.playlist_name}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {playlist.track_count || 0} tracks • {playlist.playlist_type}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Select onValueChange={(trackId) => handleAddTrack(playlist.id)} value="">
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Add track" />
                      </SelectTrigger>
                      <SelectContent>
                        {tracks?.map((track) => (
                          <SelectItem key={track.id} value={track.id}>
                            {track.track_title} - {track.artist_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingId(playlist.id);
                            setEditName(playlist.playlist_name);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Playlist</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                            placeholder="Playlist name"
                          />
                          <Button onClick={handleUpdate} className="w-full">
                            Save Changes
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => handleDelete(playlist.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaylistManager;