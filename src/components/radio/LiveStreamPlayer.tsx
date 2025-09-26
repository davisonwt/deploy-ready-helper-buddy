import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const LiveStreamPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState([0.5]);
  const [muted, setMuted] = useState(false);
  const [nowPlaying, setNowPlaying] = useState('AOD Station Radio - Live');
  const [listenerCount, setListenerCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Demo stream URL - replace with actual stream
  const streamUrl = 'https://radio.example.com/stream'; // Replace with real stream URL

  useEffect(() => {
    // Subscribe to live radio updates
    const channel = supabase
      .channel('radio-live-updates')
      .on('broadcast', { event: 'now-playing' }, ({ payload }) => {
        if (payload.track) {
          setNowPlaying(payload.track);
        }
        if (payload.listener_count !== undefined) {
          setListenerCount(payload.listener_count);
        }
      })
      .subscribe();

    // Get current show info
    fetchCurrentShow();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCurrentShow = async () => {
    try {
      const { data } = await supabase.rpc('get_current_radio_show');
      if (data && typeof data === 'object') {
        const showData = data as any;
        setNowPlaying(`${showData.show_name || 'Live Show'} with ${showData.dj_name || 'DJ'}`);
        setListenerCount(showData.listener_count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch current show:', error);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
        // Update listener count
        setListenerCount(prev => prev + 1);
      }
    } catch (err) {
      toast({ 
        variant: 'destructive', 
        title: 'Stream Error',
        description: 'Unable to connect to live stream. Please try again later.' 
      });
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = value[0];
      setVolume(value);
      if (value[0] === 0) {
        setMuted(true);
        audio.muted = true;
      } else if (muted) {
        setMuted(false);
        audio.muted = false;
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume[0];
      audio.muted = muted;
      
      const handleLoadStart = () => setPlaying(false);
      const handlePlay = () => setPlaying(true);
      const handlePause = () => setPlaying(false);
      const handleError = () => {
        toast({ 
          variant: 'destructive', 
          title: 'Stream Error',
          description: 'Live stream is currently unavailable' 
        });
        setPlaying(false);
      };

      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [volume, muted, toast]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AOD Station Radio</span>
          <Badge variant="secondary">{listenerCount} listeners</Badge>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <Badge variant="outline" className="w-full justify-center">
            {nowPlaying}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <audio ref={audioRef} src={streamUrl} preload="none" />
        
        <Button onClick={togglePlay} className="w-full" size="lg">
          {playing ? (
            <Pause className="mr-2 h-5 w-5" />
          ) : (
            <Play className="mr-2 h-5 w-5" />
          )}
          {playing ? 'Pause Stream' : 'Play Live Stream'}
        </Button>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="p-2"
          >
            {muted || volume[0] === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={1}
              min={0}
              step={0.1}
              className="cursor-pointer"
            />
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          {playing && (
            <p>🔴 Live • Broadcasting from AOD Station</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStreamPlayer;