import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LiveFeedCard, FeedItem } from './LiveFeedCard';
import { SparkleEntrance } from './SparkleEffects';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

export const UnifiedFeed: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const [radioResult, classroomResult, skilldropResult, communityResult] = await Promise.all([
        supabase
          .from('radio_schedule')
          .select('id, start_time, end_time, status, show_subject, show_notes, listener_count, broadcast_mode, radio_djs(dj_name, avatar_url, user_id)')
          .or('status.eq.live,status.eq.approved,status.eq.completed')
          .order('start_time', { ascending: false })
          .limit(10),
        supabase
          .from('classroom_sessions')
          .select('id, title, description, status, scheduled_at, session_fee, is_free, pricing_type, max_participants, instructor_profile_id, instructor_id, profiles:instructor_profile_id(display_name, avatar_url)')
          .in('status', ['active', 'scheduled', 'completed'])
          .order('scheduled_at', { ascending: false })
          .limit(10),
        supabase
          .from('skilldrop_sessions')
          .select('id, title, description, status, scheduled_at, session_fee, pricing_type, presenter_profile_id, presenter_profile:profiles!lecture_halls_presenter_profile_id_fkey(display_name, avatar_url)')
          .in('status', ['active', 'scheduled', 'completed'])
          .order('scheduled_at', { ascending: false })
          .limit(10),
        supabase
          .from('chat_rooms')
          .select('id, name, description, room_type, current_listeners, updated_at')
          .or('room_type.eq.community,is_system_room.eq.true')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(5),
      ]);

      const items: FeedItem[] = [];

      // Process radio — detect "host is present" for pre-recorded + live host
      (radioResult.data || []).forEach(slot => {
        const isLive = slot.status === 'live';
        const isCompleted = slot.status === 'completed';
        const isUpcoming = new Date(slot.start_time) > new Date();
        const djData = slot.radio_djs as any;
        const isPreRecordedWithHost = slot.broadcast_mode === 'pre_recorded' && isLive;
        items.push({
          id: `radio-${slot.id}`,
          type: 'radio',
          status: isLive ? 'live' : isCompleted ? 'replay' : isUpcoming ? 'upcoming' : 'active',
          title: slot.show_subject || slot.show_notes || 'Radio Show',
          hostName: djData?.dj_name || 'DJ',
          hostAvatar: djData?.avatar_url || null,
          participantCount: slot.listener_count || 0,
          nowPlayingTrack: isLive ? 'Tuning in...' : undefined,
          roomId: slot.id,
          scheduledAt: slot.start_time,
          hostIsPresent: isPreRecordedWithHost,
        });
      });

      // Process classrooms
      (classroomResult.data || []).forEach(session => {
        const profile = session.profiles as any;
        const isActive = session.status === 'active';
        const isCompleted = session.status === 'completed';
        items.push({
          id: `classroom-${session.id}`,
          type: 'classroom',
          status: isActive ? 'live' : isCompleted ? 'replay' : 'upcoming',
          title: session.title,
          description: session.description || undefined,
          hostName: profile?.display_name || 'Instructor',
          hostAvatar: profile?.avatar_url || null,
          participantCount: 0,
          price: session.session_fee,
          isFree: session.is_free || session.pricing_type === 'free',
          scheduledAt: session.scheduled_at,
          roomId: session.id,
        });
      });

      // Process skilldrop
      (skilldropResult.data || []).forEach(session => {
        const profile = session.presenter_profile as any;
        const isActive = session.status === 'active';
        const isCompleted = session.status === 'completed';
        items.push({
          id: `skilldrop-${session.id}`,
          type: 'skilldrop',
          status: isActive ? 'live' : isCompleted ? 'replay' : 'upcoming',
          title: session.title,
          description: session.description || undefined,
          hostName: profile?.display_name || 'Presenter',
          hostAvatar: profile?.avatar_url || null,
          participantCount: 0,
          price: session.session_fee,
          isFree: session.pricing_type === 'free',
          scheduledAt: session.scheduled_at,
          roomId: session.id,
        });
      });

      // Process community rooms
      (communityResult.data || []).forEach(room => {
        items.push({
          id: `community-${room.id}`,
          type: 'community',
          status: 'active',
          title: room.name || 'Community Chat',
          description: room.description || undefined,
          hostName: 'Community',
          participantCount: room.current_listeners || 0,
          roomId: room.id,
        });
      });

      // Sort: live first, then upcoming, then replays
      const statusOrder: Record<string, number> = { live: 0, active: 1, upcoming: 2, replay: 3 };
      items.sort((a, b) => {
        const orderDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (orderDiff !== 0) return orderDiff;
        if (a.scheduledAt && b.scheduledAt) return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
        return 0;
      });

      setFeedItems(items);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();

    const channel = supabase
      .channel('unified-feed-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'radio_schedule', filter: 'status=eq.live' }, () => fetchFeed())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classroom_sessions' }, () => fetchFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {})
      .subscribe();

    const interval = setInterval(fetchFeed, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchFeed]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const handleJoin = (item: FeedItem) => {
    toast({
      title: `Joining ${item.title}`,
      description: `Opening ${item.type} session...`,
    });
  };

  const handleBestow = (item: FeedItem) => {
    toast({
      title: '🌱 Bestow',
      description: `Opening bestowal flow for ${item.title}`,
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 p-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-2xl h-52" style={{ backgroundColor: 'hsl(212 49% 24% / 0.5)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">What's Happening Now 🌱</h2>
        </div>
        <button
          onClick={handleRefresh}
          className={`p-2 rounded-full hover:bg-card/50 transition-colors ${refreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Feed */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 px-2 pb-6">
          {feedItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🌱</div>
              <h3 className="text-lg font-semibold text-foreground mb-1">All quiet for now</h3>
              <p className="text-sm text-muted-foreground">Check back soon — new sessions and broadcasts pop up throughout the day!</p>
            </div>
          ) : (
            feedItems.map((item, index) => (
              <SparkleEntrance key={item.id}>
                <LiveFeedCard
                  item={item}
                  index={index}
                  onJoin={handleJoin}
                  onBestow={handleBestow}
                  immersive={isMobile}
                />
              </SparkleEntrance>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
