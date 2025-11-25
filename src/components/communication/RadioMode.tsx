import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Play, Pause, Volume2, Music, Users, Heart, Share2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScheduleRadioSlotDialog } from './ScheduleRadioSlotDialog';

interface Track {
  id: string;
  track_title: string;
  artist_name: string | null;
  genre: string | null;
  duration_seconds: number | null;
  file_url: string;
  dj_id: string;
  is_public: boolean;
}

interface Stream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  viewer_count: number | null;
  user_id: string;
  thumbnail_url: string | null;
  tags: string[] | null;
}

export const RadioMode: React.FC = () => {
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [volume, setVolume] = useState([75]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      // Load tracks
      const { data: tracksData } = await supabase
        .from('dj_music_tracks')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      // Load live streams
      const { data: streamsData } = await supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(5);

      setTracks(tracksData || []);
      setStreams(streamsData || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    toast({
      title: 'Now Playing',
      description: `${track.track_title} by ${track.artist_name || 'Unknown Artist'}`,
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="glass-card bg-transparent border border-primary/20">
          <CardContent className="p-6 animate-pulse">
            <div className="h-32 bg-muted/30 rounded mb-4"></div>
            <div className="h-6 bg-muted/30 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-muted/20 rounded w-1/2"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Radio Broadcasts</h2>
          <p className="text-white/80">24/7 live streams • 2-hour slots available</p>
        </div>
        <Button 
          className="gap-2" 
          onClick={() => setScheduleDialogOpen(true)}
          style={{ backgroundColor: '#0A1931', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Request Radio Slot
        </Button>
      </div>

      {/* Now Playing Card */}
      {currentTrack && (
        <Card className="glass-card bg-transparent border-2 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <Music className="w-10 h-10 text-primary" />
                {isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-primary"
                    animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">{currentTrack.track_title}</h3>
                <p className="text-white/70">{currentTrack.artist_name || 'Unknown Artist'}</p>
              </div>

              <Button
                onClick={togglePlayPause}
                size="lg"
                className="rounded-full w-14 h-14"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Volume2 className="w-4 h-4 text-white/70" />
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-white/70 w-12">{volume[0]}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Streams */}
      {streams.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4">🔴 Live Now</h3>
          <div className="grid gap-4">
            {streams.map((stream) => (
              <Card key={stream.id} className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center">
                      <Radio className="w-8 h-8 text-destructive" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-white mb-1">{stream.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Badge variant="destructive" className="text-xs">LIVE</Badge>
                        {stream.viewer_count !== null && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {stream.viewer_count}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button>Listen</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Track Library */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Music Library</h3>
        <div className="grid gap-3">
          {tracks.length === 0 ? (
            <Card className="glass-card bg-transparent border border-primary/20">
              <CardContent className="p-12 text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-primary/50" />
                <h3 className="text-xl font-semibold text-white mb-2">No Tracks Available</h3>
                <p className="text-white/70">Check back soon for new music</p>
              </CardContent>
            </Card>
          ) : (
            tracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => playTrack(track)}
                        className="rounded-full"
                      >
                        <Play className="w-4 h-4" />
                      </Button>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{track.track_title}</h4>
                        <p className="text-sm text-white/70 truncate">
                          {track.artist_name || 'Unknown Artist'}
                        </p>
                      </div>

                      {track.genre && (
                        <Badge variant="outline" className="text-white border-primary/30">
                          {track.genre}
                        </Badge>
                      )}

                      <span className="text-sm text-white/70">
                        {formatDuration(track.duration_seconds)}
                      </span>

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ScheduleRadioSlotDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSuccess={loadContent}
      />
    </div>
  );
};