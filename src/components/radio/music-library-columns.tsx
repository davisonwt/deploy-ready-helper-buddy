import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Trash2, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const createMusicColumns = (
  onPlayTrack: (trackId: string, fileUrl: string) => void | Promise<void>,
  currentTrackId: string | null,
  isPlayingGlobal: boolean
): ColumnDef<any>[] => [
  {
    accessorKey: 'track_title',
    header: 'Title',
  },
  {
    accessorKey: 'artist_name',
    header: 'Artist',
  },
  {
    accessorKey: 'genre',
    header: 'Genre',
    cell: ({ row }) => {
      const genre = row.original.genre;
      return genre ? <Badge variant="secondary">{genre}</Badge> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'duration_seconds',
    header: 'Duration',
    cell: ({ row }) => {
      const seconds = row.original.duration_seconds || 0;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
  },
  {
    accessorKey: 'file_size',
    header: 'Size',
    cell: ({ row }) => {
      const bytes = row.original.file_size || 0;
      const mb = (bytes / (1024 * 1024)).toFixed(1);
      return `${mb} MB`;
    },
  },
  {
    accessorKey: 'track_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.track_type;
      const typeColors = {
        music: 'default',
        jingle: 'secondary',
        advertisement: 'outline',
        voice_over: 'destructive',
      };
      return <Badge variant={typeColors[type] || 'default'}>{type}</Badge>;
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const { toast } = useToast();
      const isPlaying = currentTrackId === row.original.id && isPlayingGlobal;

      const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this track?')) {
          try {
            const { error } = await supabase
              .from('dj_music_tracks')
              .delete()
              .eq('id', row.original.id);
            
            if (error) throw error;
            
            toast({ title: 'Track deleted successfully' });
            window.location.reload();
          } catch (err) {
            toast({ variant: 'destructive', description: 'Failed to delete track' });
          }
        }
      };

      return (
        <div className="flex space-x-2">
          <Button 
            variant={isPlaying ? "default" : "outline"} 
            size="sm" 
            onClick={() => onPlayTrack(row.original.id, row.original.file_url)}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" /> Play
              </>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];