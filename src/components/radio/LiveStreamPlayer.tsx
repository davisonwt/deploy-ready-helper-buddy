import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * EqBars — decorative equalizer visual honestly tied to <audio> play state.
 * Animates only while `playing === true`; freezes flat when paused/stopped.
 * Not derived from real frequency data (cross-origin stream blocks AnalyserNode).
 */
const EqBars = ({ playing, bars = 10 }: { playing: boolean; bars?: number }) => (
  <div
    className={`radio-eq ${playing ? 'is-playing' : ''}`}
    aria-hidden="true"
    role="presentation"
  >
    {Array.from({ length: bars }).map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

const LiveStreamPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState([0.5]);
  const [muted, setMuted] = useState(false);
  const [nowPlaying, setNowPlaying] = useState('AOD Station Radio — Live');
  const [listenerCount, setListenerCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Grove Station stream URL (replace with your actual stream URL)
  const streamUrl = 'https://s9.voscast.com:9525/stream';

  useEffect(() => {
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
        setListenerCount(prev => prev + 1);
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Stream Error',
        description: 'Unable to connect to live stream. Please try again later.',
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
          description: 'Live stream is currently unavailable',
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
    <Card className="radio-card w-full max-w-md mx-auto overflow-hidden">
      <CardHeader className="border-b border-radio-blue/15">
        <CardTitle className="flex items-center justify-between">
          <span className="font-bitter text-xl text-radio-mist">AOD Station Radio</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-radio-amber/40 bg-radio-bg/60 px-2.5 py-1 text-xs text-radio-amber">
            <Users className="h-3 w-3" />
            {listenerCount} listening
          </span>
        </CardTitle>
        <div className="mt-2">
          <div className="rounded-md border border-radio-blue/25 bg-radio-bg/50 px-3 py-2 text-center text-xs uppercase tracking-widest text-radio-mist/80">
            {nowPlaying}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <audio ref={audioRef} src={streamUrl} preload="none" />

        {/* Honest EQ: animates only while real <audio> is playing */}
        <div className="flex items-center justify-center gap-4 py-2">
          <EqBars playing={playing} bars={10} />
          {playing && (
            <span className="font-bitter text-xs uppercase tracking-[0.2em] text-radio-amber">
              On Air
            </span>
          )}
        </div>

        <Button
          onClick={togglePlay}
          className={`w-full h-12 font-bitter text-base tracking-wide transition-all ${
            playing
              ? 'bg-radio-blue text-white hover:bg-radio-blue/90 shadow-[0_0_24px_rgba(74,144,217,0.35)]'
              : 'bg-radio-amber text-radio-bg hover:bg-radio-amber/90 shadow-[0_0_24px_rgba(255,180,84,0.45)]'
          }`}
          size="lg"
        >
          {playing ? (
            <Pause className="mr-2 h-5 w-5" />
          ) : (
            <Play className="mr-2 h-5 w-5" />
          )}
          {playing ? 'Pause Stream' : 'Play Live Stream'}
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="p-2 text-radio-mist hover:text-radio-amber hover:bg-radio-bg/60"
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

        <div className="text-center text-xs uppercase tracking-widest">
          {playing ? (
            <p className="text-radio-amber flex items-center justify-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-radio-amber animate-pulse" />
              Live • Broadcasting from AOD Station
            </p>
          ) : (
            <p className="text-radio-mist/50">Standby</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveStreamPlayer;
