import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Disc } from 'lucide-react';
import { MusicLibraryTable } from '@/components/music/MusicLibraryTable';

interface PlaylistWithTracks {
  id: string;
  playlist_name: string;
  description: string | null;
  track_count: number | null;
  total_duration_seconds: number | null;
  created_at: string;
  tracks: Array<{ order: number; track: any }>;
}

interface PlaylistBrowserProps {
  playlistType?: string;
  emptyMessage?: string;
}

export function PlaylistBrowser({ playlistType, emptyMessage = 'No public albums yet.' }: PlaylistBrowserProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: playlists = [], isLoading } = useQuery({
    queryKey: ['community-playlists', playlistType],
    queryFn: async (): Promise<PlaylistWithTracks[]> => {
      let query = supabase
        .from('dj_playlists')
        .select(`
          id,
          playlist_name,
          description,
          track_count,
          total_duration_seconds,
          created_at,
          dj_playlist_tracks(
            track_order,
            track_id,
            dj_music_tracks(*)
          )
        `)
        .eq('is_public', true);
      
      if (playlistType) {
        query = query.eq('playlist_type', playlistType);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        playlist_name: p.playlist_name,
        description: p.description,
        track_count: p.track_count,
        total_duration_seconds: p.total_duration_seconds,
        created_at: p.created_at,
        tracks: (p.dj_playlist_tracks || [])
          .sort((a: any, b: any) => (a.track_order ?? 0) - (b.track_order ?? 0))
          .map((t: any) => ({ order: t.track_order, track: t.dj_music_tracks }))
      }));
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!playlists.length) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {playlists.map((pl) => {
        const isOpen = expanded === pl.id;
        const tracks = pl.tracks.map((t) => t.track).filter(Boolean);
        return (
          <Card key={pl.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Disc className="h-5 w-5" />
                  {pl.playlist_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground truncate max-w-[800px]">
                  {pl.description || 'Community album'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{pl.track_count ?? tracks.length} tracks</Badge>
                <Button variant="outline" size="sm" onClick={() => setExpanded(isOpen ? null : pl.id)}>
                  {isOpen ? (
                    <>
                      Hide tracks
                      <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      View tracks
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {isOpen && (
              <CardContent>
                <MusicLibraryTable
                  tracks={tracks}
                  showBestowalButton={true}
                  showEditButton={false}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
