import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AudioSnippetPlayerProps {
  fileUrl: string;
  duration?: number;
  snippetLength?: number;
}

export function AudioSnippetPlayer({ 
  fileUrl, 
  duration = 30,
  snippetLength = 30000 
}: AudioSnippetPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (contextRef.current) {
        contextRef.current.close();
      }
    };
  }, []);

  const playSnippet = async () => {
    try {
      if (!audioRef.current) return;

      if (playing) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlaying(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
      }

      const audio = audioRef.current;
      
      // Create audio context for better control
      if (!contextRef.current) {
        contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = contextRef.current;
      const source = audioContext.createMediaElementSource(audio);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.7;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      audio.currentTime = 0;
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
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {playing ? 'Stop' : `Preview (${duration}s)`}
      </Button>
      
      {playing && (
        <span className="text-sm text-muted-foreground">
          {Math.floor(currentTime)}s / {duration}s
        </span>
      )}

      <audio
        ref={audioRef}
        src={fileUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />
    </div>
  );
}
