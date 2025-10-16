import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createMusicColumns } from './music-library-columns';

const MusicLibrary = () => {
  const [uploading, setUploading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Stop any playing audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayTrack = useCallback((trackId: string, fileUrl: string) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // If clicking the same track, just stop it
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
      audioRef.current = null;
      return;
    }

    // Create and play new audio
    const audio = new Audio(fileUrl);
    audio.volume = 0.7;
    audioRef.current = audio;
    setPlayingTrackId(trackId);

    audio.play().catch((error) => {
      console.error('Audio play error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Playback Error',
        description: 'Failed to play track. Check audio file.' 
      });
      setPlayingTrackId(null);
      audioRef.current = null;
    });

    audio.onended = () => {
      setPlayingTrackId(null);
      audioRef.current = null;
    };
  }, [playingTrackId, toast]);

  const { data: tracks } = useQuery({
    queryKey: ['dj-music-tracks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      // Extract basic metadata
      const title = file.name.replace(/\.[^/.]+$/, '');
      const artist_name = 'Unknown Artist';

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `music/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('music-tracks')
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('music-tracks').getPublicUrl(filePath);

      // Get DJ ID
      const { data: djData } = await supabase
        .from('radio_djs')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!djData) throw new Error('DJ profile not found');

      const { error: insertError } = await supabase.from('dj_music_tracks').insert({
        dj_id: djData.id,
        track_title: title,
        artist_name,
        duration_seconds: 0,
        file_url: publicUrl,
        file_size: file.size,
        track_type: 'music',
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-music-tracks'] });
      toast({ title: 'Track uploaded successfully!' });
      setUploading(false);
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', description: err.message });
      setUploading(false);
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploading(true);
      uploadMutation.mutate(acceptedFiles[0]);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'] },
    maxFiles: 1,
  });

  const columnsWithHandlers = createMusicColumns(handlePlayTrack, playingTrackId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Music Library</CardTitle>
        </CardHeader>
        <CardContent>
...
        </CardContent>
      </Card>
      <DataTable columns={columnsWithHandlers} data={tracks || []} />
    </div>
  );
};

export default MusicLibrary;