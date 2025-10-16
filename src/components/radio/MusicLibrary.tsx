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

  const handlePlayTrack = useCallback(async (trackId: string, fileUrl: string) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // If clicking the same track, just stop it
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      audioRef.current = null;
      return;
    }

    // Resolve a playable URL (prefer signed URL), with robust parsing + logging
    let playableUrl = fileUrl;
    let derivedPath = '';

    const lastSegment = (p: string) => {
      const parts = p.split('/').filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] || '');
    };

    const inferCandidates = (input: string): string[] => {
      const candidates: string[] = [];
      try {
        const u = new URL(input);
        const marker = '/storage/v1/object/';
        const idx = u.pathname.indexOf(marker);
        if (idx !== -1) {
          const after = u.pathname.substring(idx + marker.length); // e.g. public/music-tracks/<path>
          const parts = after.split('/');
          if (parts[1] === 'music-tracks') candidates.push(decodeURIComponent(parts.slice(2).join('/')));
        }
        // If it's already a full URL, still try filename heuristic
        const fname = lastSegment(u.pathname);
        if (fname) candidates.push(`music/${fname}`);
      } catch {
        // Not a full URL
        const stripped = input.replace(/^\/*/, '').replace(/^public\//, '');
        if (stripped.startsWith('music/')) candidates.push(stripped);
        const fname = lastSegment(stripped);
        if (fname) {
          candidates.push(`music/${fname}`);
          // Some older uploads used userId as folder
          candidates.push(`${user?.id ? `${user.id}/` : ''}${fname}`);
        }
      }
      // De-dup
      return Array.from(new Set(candidates.filter(Boolean)));
    };

    const candidates = inferCandidates(fileUrl);

    try {
      for (const cand of candidates) {
        const { data, error } = await supabase.storage
          .from('music-tracks')
          .createSignedUrl(cand, 3600);
        if (!error && data?.signedUrl) {
          derivedPath = cand;
          playableUrl = data.signedUrl;
          break;
        }
      }
      if (!derivedPath && candidates[0]) {
        // Fallback to public URL if bucket is public
        const { data } = supabase.storage.from('music-tracks').getPublicUrl(candidates[0]);
        if (data?.publicUrl) {
          derivedPath = candidates[0];
          playableUrl = data.publicUrl;
        }
      }
    } catch (e) {
      console.warn('URL signing error', e, { fileUrl, derivedPath });
    }

    // Encode path as a robust fallback for filenames with spaces/parentheses
    const encodedFallbackUrl = (() => {
      try {
        const u = new URL(playableUrl.startsWith('http') ? playableUrl : fileUrl);
        u.pathname = u.pathname
          .split('/')
          .map(seg => encodeURIComponent(decodeURIComponent(seg)))
          .join('/');
        return u.toString();
      } catch {
        return playableUrl.startsWith('http') ? playableUrl : fileUrl;
      }
    })();

    console.log('[Radio] Play request', { trackId, fileUrl, derivedPath, playableUrl, encodedFallbackUrl });

    // Create and play new audio with fallback on error
    const prev = audioRef.current;
    if (prev) {
      try {
        prev.pause();
        prev.src = '';
      } catch {}
    }
    const audio = new Audio(playableUrl);
    (audio as any).crossOrigin = 'anonymous';
    audio.volume = 0.7;
    audioRef.current = audio;
    setPlayingTrackId(trackId);

    audio.onerror = () => {
      if (playableUrl !== encodedFallbackUrl) {
        console.warn('Primary URL failed, falling back to encoded URL', { encodedFallbackUrl });
        audio.src = encodedFallbackUrl;
        audio.load();
        audio.play().catch((error) => {
          console.error('Audio play error (encoded fallback failed):', error, { fileUrl, derivedPath });
          if (encodedFallbackUrl !== fileUrl) {
            audio.src = fileUrl;
            audio.load();
            audio.play().catch((err2) => {
              console.error('Audio play error (raw fallback failed):', err2, { fileUrl, derivedPath });
              toast({ 
                variant: 'destructive', 
                title: 'Playback Error',
                description: 'Failed to play track. Check audio file.' 
              });
              setPlayingTrackId(null);
              audioRef.current = null;
            });
          }
        });
      }
    };

    audio.play().catch((error) => {
      console.error('Audio play error:', error, { fileUrl, derivedPath, playableUrl, encodedFallbackUrl });
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