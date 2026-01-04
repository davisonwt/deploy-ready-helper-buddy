import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';

interface AudioSnippetPlayerProps {
  fileUrl: string;
  duration?: number;
  snippetLength?: number;
}

export function AudioSnippetPlayer({
  fileUrl,
  duration = 30,
  snippetLength = 30000,
}: AudioSnippetPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Stop playback if the underlying file changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setCurrentTime(0);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [fileUrl]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const playSnippet = async () => {
    try {
      if (!audioRef.current) return;

      const audio = audioRef.current;

      if (playing) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      setLoading(true);

      // Many of our audio URLs are Supabase Storage URLs that require a signed URL.
      const resolvedUrl = await resolveAudioUrl(fileUrl, { bucketForKeys: 'music-tracks' });

      if (audio.src !== resolvedUrl) {
        audio.src = resolvedUrl;
        audio.load();
      }

      audio.currentTime = 0;
      audio.volume = 0.7;
      await audio.play();
      setPlaying(true);

      // Stop after snippet duration
      timeoutRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
      }, snippetLength);
    } catch (error) {
      console.error('Error playing snippet:', error);
      toast.error('Failed to play preview');
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={playSnippet}
        className="gap-2"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {playing ? 'Stop' : `Preview (${duration}s)`}
      </Button>

      {playing && (
        <span className="text-sm text-muted-foreground">
          {Math.floor(currentTime)}s / {duration}s
        </span>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
        crossOrigin="anonymous"
      />
    </div>
  );
}
