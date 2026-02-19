import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Play, Pause, Volume2, Music, Users, Heart, Share2, Plus, Headphones, Calendar, Clock, Trash2, Edit, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScheduleRadioSlotDialog } from './ScheduleRadioSlotDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
import { format } from 'date-fns';

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

interface ScheduledSlot {
  id: string;
  time_slot_date: string;
  start_time: string;
  end_time: string;
  hour_slot: number;
  status: string | null;
  approval_status: string | null;
  show_subject: string | null;
  show_notes: string | null;
  broadcast_mode: string;
  dj_id: string | null;
  radio_djs: {
    dj_name: string;
    user_id: string;
    avatar_url: string | null;
  } | null;
}

export const RadioMode: React.FC = () => {
  const { toast: toastNotification } = useToast();
  const { user, profile } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [scheduledSlots, setScheduledSlots] = useState<ScheduledSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [volume, setVolume] = useState([75]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      // Load scheduled slots, tracks, and streams in parallel
      const [slotsResult, tracksResult, streamsResult] = await Promise.all([
        supabase
          .from('radio_schedule')
          .select('*, radio_djs(dj_name, user_id, avatar_url)')
          .order('time_slot_date', { ascending: true })
          .order('hour_slot', { ascending: true }),
        supabase
          .from('dj_music_tracks')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('live_streams')
          .select('*')
          .eq('status', 'live')
          .order('started_at', { ascending: false })
          .limit(5),
      ]);

      setScheduledSlots((slotsResult.data as ScheduledSlot[]) || []);
      setTracks(tracksResult.data || []);
      setStreams(streamsResult.data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotId) return;
    try {
      const { error } = await supabase
        .from('radio_schedule')
        .delete()
        .eq('id', deleteSlotId);

      if (error) throw error;
      toast.success('Radio slot deleted');
      setScheduledSlots(prev => prev.filter(s => s.id !== deleteSlotId));
    } catch (error: any) {
      toast.error('Failed to delete slot: ' + error.message);
    } finally {
      setDeleteSlotId(null);
    }
  };

  const isMySlot = (slot: ScheduledSlot) => {
    return user?.id && slot.radio_djs?.user_id === user.id;
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    toastNotification({
      title: 'Now Playing',
      description: `${track.track_title} by ${track.artist_name || 'Unknown Artist'}`,
    });
  };

  const joinStream = (stream: Stream) => {
    setActiveStream(stream);
    toastNotification({
      title: 'Joining Live Stream',
      description: `Connecting to ${stream.title}...`,
    });
  };

  const leaveStream = () => {
    setActiveStream(null);
    toastNotification({
      title: 'Left Stream',
      description: 'You have left the live broadcast.',
    });
  };

  const handleLike = async (track: Track, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please login to like tracks'); return; }
    const isLiked = likedTracks.has(track.id);
    if (isLiked) {
      setLikedTracks(prev => { const s = new Set(prev); s.delete(track.id); return s; });
      toast.success('Unliked');
    } else {
      setLikedTracks(prev => new Set(prev).add(track.id));
      toast.success('Liked!');
    }
  };

  const handleShare = async (track: Track, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({ title: track.track_title, text: `Check out ${track.track_title}`, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    }
  };

  const togglePlayPause = () => setIsPlaying(!isPlaying);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSlotTime = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
    } catch {
      return 'TBD';
    }
  };

  // Show JitsiRoom when in active stream
  if (activeStream) {
    const isDJ = user?.id === activeStream.user_id;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Listener';
    const roomName = `radio_${activeStream.id.replace(/-/g, '')}`;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 glass-card mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{activeStream.title}</h2>
            <p className="text-muted-foreground text-sm">
              {isDJ ? 'You are the DJ' : 'Live Radio Broadcast'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
            {activeStream.viewer_count !== null && (
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {activeStream.viewer_count}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[600px]">
          <JitsiRoom roomName={roomName} displayName={displayName} onLeave={leaveStream} isModerator={isDJ} />
        </div>
      </div>
    );
  }

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

  // Split slots into upcoming and past
  const now = new Date();
  const upcomingSlots = scheduledSlots.filter(s => new Date(s.end_time) >= now);
  const mySlots = scheduledSlots.filter(s => isMySlot(s));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Radio Broadcasts</h2>
          <p className="text-foreground/80">24/7 live streams • 2-hour slots available</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setScheduleDialogOpen(true)}
          style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
        >
          <Plus className="w-4 h-4" />
          Request Radio Slot
        </Button>
      </div>

      {/* Scheduled Slots Section */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Scheduled Slots ({upcomingSlots.length})
        </h3>
        {upcomingSlots.length === 0 ? (
          <Card className="glass-card bg-transparent border border-primary/20">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-3 text-primary/50" />
              <p className="text-foreground/70">No upcoming radio slots scheduled</p>
              <Button
                variant="outline"
                className="mt-3 gap-2"
                onClick={() => setScheduleDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Schedule One Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {upcomingSlots.map((slot) => {
              const slotDate = new Date(slot.time_slot_date);
              const isLive = slot.status === 'live';
              const isPending = slot.approval_status === 'pending';
              const isMine = isMySlot(slot);

              return (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`glass-card bg-transparent border transition-all ${isLive ? 'border-destructive/50' : 'border-primary/20 hover:border-primary/40'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-card/50 border border-border/30 shrink-0">
                          <span className="text-xs text-muted-foreground">{format(slotDate, 'MMM')}</span>
                          <span className="text-xl font-bold text-foreground">{format(slotDate, 'd')}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground truncate">
                              {slot.show_subject || slot.show_notes || 'Radio Slot'}
                            </h4>
                            {isLive && <Badge variant="destructive" className="text-xs animate-pulse">LIVE</Badge>}
                            {isPending && <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/50">Pending</Badge>}
                            {slot.approval_status === 'approved' && !isLive && (
                              <Badge variant="outline" className="text-xs text-green-400 border-green-400/50">Approved</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatSlotTime(slot.start_time, slot.end_time)}
                            </span>
                            <span>•</span>
                            <span>{slot.radio_djs?.dj_name || 'Unknown DJ'}</span>
                            <span>•</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {slot.broadcast_mode === 'pre_recorded' ? 'Auto-play' : 'Live'}
                            </Badge>
                          </div>
                        </div>

                        {/* Actions for slot owner */}
                        {isMine && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border border-border">
                              <DropdownMenuItem onClick={() => {
                                // Open edit dialog - for now navigate to the slot's timeline builder
                                toast.info('Edit slot: use the timeline builder on the DJ dashboard to add music, ads, and voice notes.');
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Slot Content
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteSlotId(slot.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Slot
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
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
                <h3 className="text-xl font-bold text-foreground mb-1">{currentTrack.track_title}</h3>
                <p className="text-foreground/70">{currentTrack.artist_name || 'Unknown Artist'}</p>
              </div>
              <Button onClick={togglePlayPause} size="lg" className="rounded-full w-14 h-14">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Volume2 className="w-4 h-4 text-foreground/70" />
              <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="flex-1" />
              <span className="text-sm text-foreground/70 w-12">{volume[0]}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Streams */}
      {streams.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">🔴 Live Now</h3>
          <div className="grid gap-4">
            {streams.map((stream) => (
              <Card key={stream.id} className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-destructive/30 to-destructive/10 flex items-center justify-center">
                      <Radio className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1">{stream.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-foreground/70">
                        <Badge variant="destructive" className="text-xs">LIVE</Badge>
                        {stream.viewer_count !== null && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stream.viewer_count}</span>
                        )}
                      </div>
                    </div>
                    <Button onClick={() => joinStream(stream)} className="gap-2">
                      <Headphones className="w-4 h-4" />
                      Listen Live
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Track Library */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">Music Library</h3>
        <div className="grid gap-3">
          {tracks.length === 0 ? (
            <Card className="glass-card bg-transparent border border-primary/20">
              <CardContent className="p-12 text-center">
                <Radio className="w-16 h-16 mx-auto mb-4 text-primary/50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Tracks Available</h3>
                <p className="text-foreground/70">Check back soon for new music</p>
              </CardContent>
            </Card>
          ) : (
            tracks.map((track, index) => (
              <motion.div key={track.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={() => playTrack(track)} className="rounded-full">
                        <Play className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{track.track_title}</h4>
                        <p className="text-sm text-foreground/70 truncate">{track.artist_name || 'Unknown Artist'}</p>
                      </div>
                      {track.genre && <Badge variant="outline" className="text-foreground border-primary/30">{track.genre}</Badge>}
                      <span className="text-sm text-foreground/70">{formatDuration(track.duration_seconds)}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 ${likedTracks.has(track.id) ? 'text-red-500' : ''}`} onClick={(e) => handleLike(track, e)} disabled={!user}>
                          <Heart className={`w-4 h-4 ${likedTracks.has(track.id) ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleShare(track, e)}>
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

      <ScheduleRadioSlotDialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} onSuccess={loadContent} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSlotId} onOpenChange={(open) => !open && setDeleteSlotId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Radio Slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this scheduled radio slot. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSlot} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
