import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, SkipForward, Music, Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
import { ListenerReactionBar } from './ListenerReactionBar';
import { BestowDuringBroadcast } from './BestowDuringBroadcast';
import { ListenerStreakBadge } from './ListenerStreakBadge';
import { NowPlayingSeedCard } from './NowPlayingSeedCard';
import { SeedRequestForm } from './SeedRequestQueue';
import { NowPlayingWidget } from './NowPlayingWidget';

interface Track {
  id: string;
  track_title: string;
  artist_name: string | null;
  duration_seconds: number | null;
  file_url: string;
}

const LiveStreamPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState([0.7]);
  const [muted, setMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [showName, setShowName] = useState('AOD Station Radio');
  const [djName, setDjName] = useState('');
  const [djId, setDjId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [broadcastMode, setBroadcastMode] = useState<string>('live');
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Fetch current or next scheduled slot and its playlist
  const fetchCurrentSlot = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();

      const { data: slot } = await supabase
        .from('radio_schedule')
        .select(`
          id,
          broadcast_mode,
          playlist_id,
          status,
          radio_shows (show_name, category),
          radio_djs (id, dj_name, avatar_url)
        `)
        .lte('start_time', now)
        .gte('end_time', now)
        .in('approval_status', ['approved'])
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (slot) {
        setShowName(slot.radio_shows?.show_name || 'AOD Station Live');
        setDjName(slot.radio_djs?.dj_name || '');
        setDjId(slot.radio_djs?.id || '');
        setScheduleId(slot.id || '');
        setBroadcastMode(slot.broadcast_mode || 'live');

        const { data: session } = await supabase
          .from('radio_live_sessions')
          .select('id')
          .eq('schedule_id', slot.id)
          .eq('status', 'live')
          .maybeSingle();
        if (session) setSessionId(session.id);

        await loadPlaylistTracks(slot.playlist_id, slot.radio_djs?.id);
      } else {
        const { data: next } = await supabase
          .from('radio_schedule')
          .select(`
            id, broadcast_mode, playlist_id,
            radio_shows (show_name),
            radio_djs (id, dj_name)
          `)
          .gt('start_time', now)
          .in('approval_status', ['approved'])
          .order('start_time', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (next) {
          setShowName(`Up Next: ${next.radio_shows?.show_name || 'Show'}`);
          setDjName(next.radio_djs?.dj_name || '');
          setBroadcastMode(next.broadcast_mode || 'live');
          await loadPlaylistTracks(next.playlist_id, next.radio_djs?.id);
        } else {
          setShowName('AOD Station Radio');
          setDjName('No shows scheduled');
        }
      }
    } catch (err) {
      console.error('Error fetching slot:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPlaylistTracks = async (playlistId: string | null, djId: string | null) => {
    let tracks: Track[] = [];

    if (playlistId) {
      const { data } = await supabase
        .from('dj_playlist_tracks')
        .select(`
          track_order,
          dj_music_tracks (id, track_title, artist_name, duration_seconds, file_url)
        `)
        .eq('playlist_id', playlistId)
        .eq('is_active', true)
        .order('track_order');

      tracks = (data || [])
        .sort((a: any, b: any) => a.track_order - b.track_order)
        .map((pt: any) => pt.dj_music_tracks)
        .filter(Boolean);
    }

    if (tracks.length === 0 && djId) {
      const { data } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, duration_seconds, file_url')
        .eq('dj_id', djId)
        .eq('is_public', true)
        .order('upload_date', { ascending: false });

      tracks = data || [];
    }

    setPlaylist(tracks);
    if (tracks.length > 0) {
      setTrackIndex(0);
      setCurrentTrack(tracks[0]);
    }
  };

  useEffect(() => {
    fetchCurrentSlot();
    const interval = setInterval(fetchCurrentSlot, 120000);
    const channel = supabase
      .channel('radio-player-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'radio_schedule' }, () => {
        fetchCurrentSlot();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchCurrentSlot]);

  const playTrack = async (track: Track) => {
    const audio = audioRef.current;
    if (!audio || !track?.file_url) return;

    try {
      const url = await resolveAudioUrl(track.file_url, { bucketForKeys: 'dj-music' });
      audio.src = url;
      audio.load();
      await audio.play();
      setCurrentTrack(track);
      setPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
      toast({ variant: 'destructive', title: 'Playback Error', description: 'Could not play this track.' });
      setPlaying(false);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else if (currentTrack) {
      await playTrack(currentTrack);
    } else if (playlist.length > 0) {
      await playTrack(playlist[0]);
    } else {
      toast({ variant: 'destructive', title: 'No Music', description: 'No tracks available for this slot.' });
    }
  };

  const skipTrack = async () => {
    if (playlist.length === 0) return;
    const nextIdx = (trackIndex + 1) % playlist.length;
    setTrackIndex(nextIdx);
    await playTrack(playlist[nextIdx]);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (playlist.length > 1) {
        const nextIdx = (trackIndex + 1) % playlist.length;
        setTrackIndex(nextIdx);
        playTrack(playlist[nextIdx]);
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [trackIndex, playlist]);

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
      if (value[0] === 0) { setMuted(true); audio.muted = true; }
      else if (muted) { setMuted(false); audio.muted = false; }
    }
  };

  return (
    <div className="space-y-3 w-full max-w-md mx-auto">
      {/* Now Playing Widget */}
      {currentTrack && playing && (
        <NowPlayingWidget
          trackTitle={currentTrack.track_title}
          artistName={currentTrack.artist_name || undefined}
          isPlaying={playing}
        />
      )}

      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              AOD Station Radio
            </span>
            <Badge variant={broadcastMode === 'pre_recorded' ? 'secondary' : 'destructive'}>
              {broadcastMode === 'pre_recorded' ? 'Auto-Play' : 'Live'}
            </Badge>
            <ListenerStreakBadge />
          </CardTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">{showName}</p>
            {djName && <p>with {djName}</p>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <audio ref={audioRef} preload="none" />

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={togglePlay}
              size="lg"
              disabled={loading || playlist.length === 0}
              className="gap-2"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {playing ? 'Pause' : 'Play'}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={skipTrack}
              disabled={playlist.length <= 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {muted || volume[0] === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 px-2">
            <VolumeX className="h-3 w-3 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={handleVolumeChange}
              max={1}
              min={0}
              step={0.05}
              className="cursor-pointer"
            />
            <Volume2 className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Track count */}
          {playlist.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Track {trackIndex + 1} of {playlist.length}
              {playing && ' • 🔴 Playing'}
            </p>
          )}

          {playlist.length === 0 && !loading && (
            <p className="text-center text-xs text-muted-foreground">
              No tracks available. DJs need to upload music for this slot.
            </p>
          )}

          {/* Reaction bar */}
          {sessionId && (
            <ListenerReactionBar sessionId={sessionId} />
          )}
        </CardContent>
      </Card>

      {/* Now Playing Seed Card */}
      {currentTrack && playing && (
        <NowPlayingSeedCard
          trackId={currentTrack.id}
          trackTitle={currentTrack.track_title}
          artistName={currentTrack.artist_name || undefined}
          durationSeconds={currentTrack.duration_seconds || undefined}
          djId={djId}
          sessionId={sessionId || undefined}
          scheduleId={scheduleId || undefined}
        />
      )}

      {/* Song Request */}
      {sessionId && (
        <SeedRequestForm sessionId={sessionId} />
      )}
    </div>
  );
};

export default LiveStreamPlayer;
