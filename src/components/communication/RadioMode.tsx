import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScheduleRadioSlotDialog, type EditableSlotData } from './ScheduleRadioSlotDialog';
import { VoiceRecorderStudio } from '@/components/radio/VoiceRecorderStudio';
import { StickyRadioPlayer } from '@/components/radio/StickyRadioPlayer';
import { RadioInteractionTray } from '@/components/radio/RadioInteractionTray';
import { RadioSessionFeed } from '@/components/radio/RadioSessionFeed';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import JitsiRoom from '@/components/jitsi/JitsiRoom';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
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
  show_topic_description: string | null;
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
  const [voiceStudioOpen, setVoiceStudioOpen] = useState(false);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [editSlotData, setEditSlotData] = useState<EditableSlotData | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    if (!scheduleDialogOpen) {
      document.body.style.pointerEvents = 'auto';
    }
  }, [scheduleDialogOpen]);

  const loadContent = async () => {
    try {
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
      setScheduledSlots((prev) => prev.filter((s) => s.id !== deleteSlotId));
    } catch (error: any) {
      toast.error('Failed to delete slot: ' + error.message);
    } finally {
      setDeleteSlotId(null);
    }
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

  const handleJoinLiveSlot = (slot: ScheduledSlot) => {
    // Create a virtual stream from the slot to join via Jitsi
    const virtualStream: Stream = {
      id: slot.id,
      title: slot.show_subject || slot.show_notes || 'Radio Slot',
      description: slot.show_topic_description || null,
      status: 'live',
      viewer_count: null,
      user_id: slot.radio_djs?.user_id || '',
      thumbnail_url: null,
      tags: null,
    };
    joinStream(virtualStream);
  };

  const handleEditSlot = (slot: ScheduledSlot) => {
    setEditSlotData({
      id: slot.id,
      dj_id: slot.dj_id,
      time_slot_date: slot.time_slot_date,
      hour_slot: slot.hour_slot,
      show_subject: slot.show_subject,
      show_notes: slot.show_notes,
      show_topic_description: slot.show_topic_description,
    });
    setScheduleDialogOpen(true);
  };

  // Active stream Jitsi view
  if (activeStream) {
    const isDJ = user?.id === activeStream.user_id;
    const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Listener';
    const roomName = `radio_${activeStream.id.replace(/-/g, '')}`;

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 rounded-2xl border border-border/20 mb-4" style={{ backgroundColor: 'hsl(210 67% 12% / 0.8)' }}>
          <div>
            <h2 className="text-lg font-bold text-foreground">{activeStream.title}</h2>
            <p className="text-muted-foreground text-xs">{isDJ ? 'You are the DJ' : 'Live Radio Broadcast'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="animate-pulse text-xs">LIVE</Badge>
            {activeStream.viewer_count !== null && (
              <Badge variant="outline" className="text-xs">
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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/20 p-6 animate-pulse" style={{ backgroundColor: 'hsl(210 67% 12% / 0.6)' }}>
          <div className="h-16 bg-muted/20 rounded-xl mb-3" />
          <div className="h-4 bg-muted/20 rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted/20 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // Find if there's a live stream to show as primary
  const liveStream = streams.length > 0 ? streams[0] : null;

  return (
    <div className="space-y-4">
      {/* Sticky Player */}
      <StickyRadioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onVolumeChange={setVolume}
        listenerCount={liveStream?.viewer_count || 0}
        isLive={!!liveStream}
        onJoinConversation={liveStream ? () => joinStream(liveStream) : undefined}
        hostName={scheduledSlots[0]?.radio_djs?.dj_name}
      />

      {/* Interaction Tray */}
      <RadioInteractionTray
        messages={[]}
        queue={tracks.map((t) => ({
          id: t.id,
          title: t.track_title,
          artist: t.artist_name || 'Unknown',
          isNowPlaying: currentTrack?.id === t.id,
        }))}
        listeners={[]}
        onSendMessage={(msg) => toast.info(`Message sent: ${msg}`)}
        onRequestSong={() => toast.info('Song request feature coming soon!')}
        onRaiseHand={() => toast.info('Hand raised!')}
      />

      {/* Session Feed */}
      <RadioSessionFeed
        slots={scheduledSlots}
        currentUserId={user?.id}
        onEditSlot={handleEditSlot}
        onDeleteSlot={(id) => setDeleteSlotId(id)}
        onJoinSlot={handleJoinLiveSlot}
        onScheduleNew={() => setScheduleDialogOpen(true)}
        onOpenVoiceStudio={() => setVoiceStudioOpen(true)}
      />

      {/* Dialogs */}
      <ScheduleRadioSlotDialog
        open={scheduleDialogOpen}
        onOpenChange={(open) => {
          setScheduleDialogOpen(open);
          if (!open) {
            setEditSlotData(null);
            document.body.style.pointerEvents = 'auto';
          }
        }}
        onSuccess={loadContent}
        editSlot={editSlotData}
      />
      <VoiceRecorderStudio open={voiceStudioOpen} onOpenChange={setVoiceStudioOpen} />

      <AlertDialog open={!!deleteSlotId} onOpenChange={(open) => !open && setDeleteSlotId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Radio Slot?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this scheduled radio slot.</AlertDialogDescription>
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
