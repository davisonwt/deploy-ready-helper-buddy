import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RadioSessionCard } from './cards/RadioSessionCard';
import { ActiveSowerCard } from './cards/ActiveSowerCard';
import { ChatRoomCard } from './cards/ChatRoomCard';
import { AIStoryCard } from './cards/AIStoryCard';
import { SeedPostCard } from './cards/SeedPostCard';
import { LiveSessionCard } from './cards/LiveSessionCard';
import { FeedHeader } from './FeedHeader';
import { Radio, Sprout, MessageSquare, Zap } from 'lucide-react';
import { InlineMemryFeed } from './cards/InlineMemryFeed';

interface HomeFeedProps {
  profile: any;
  calendarData: any;
  stats: any;
  unreadMessages: number;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  profile,
  calendarData,
  stats,
  unreadMessages,
}) => {
  const { user } = useAuth();

  // Fetch active/pre-recorded radio sessions (the 2 always-on ones)
  const { data: radioSessions } = useQuery({
    queryKey: ['feed-radio-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('radio_schedule')
        .select('id, show_subject, show_notes, status, broadcast_mode, listener_count, radio_djs(dj_name, avatar_url)')
        .eq('approval_status', 'approved')
        .or('status.eq.live,broadcast_mode.eq.pre_recorded')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  // Fetch active classroom sessions
  const { data: classroomSessions } = useQuery({
    queryKey: ['feed-classroom-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classroom_sessions')
        .select('id, title, description, status, scheduled_at, max_participants, pricing_type, instructor_id, profiles:instructor_profile_id(display_name, avatar_url)')
        .in('status', ['scheduled', 'live', 'active'])
        .order('scheduled_at', { ascending: true })
        .limit(5);
      return (data || []).map((s: any) => ({
        id: s.id, title: s.title, description: s.description,
        type: 'classroom' as const, status: s.status,
        hostName: s.profiles?.display_name || 'Instructor',
        hostAvatar: s.profiles?.avatar_url,
        scheduledAt: s.scheduled_at,
        maxParticipants: s.max_participants,
        pricingType: s.pricing_type,
      }));
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Fetch active skilldrop sessions
  const { data: skilldropSessions } = useQuery({
    queryKey: ['feed-skilldrop-sessions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('skilldrop_sessions')
        .select('id, title, description, status, scheduled_at, max_participants, pricing_type, presenter_id, profiles:presenter_profile_id(display_name, avatar_url)')
        .in('status', ['scheduled', 'live', 'active'])
        .order('scheduled_at', { ascending: true })
        .limit(5);
      return (data || []).map((s: any) => ({
        id: s.id, title: s.title, description: s.description,
        type: 'skilldrop' as const, status: s.status,
        hostName: s.profiles?.display_name || 'Presenter',
        hostAvatar: s.profiles?.avatar_url,
        scheduledAt: s.scheduled_at,
        maxParticipants: s.max_participants,
        pricingType: s.pricing_type,
      }));
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Fetch active sowers (users who have products via sowers table)
  const { data: activeSowers } = useQuery({
    queryKey: ['feed-active-sowers'],
    queryFn: async () => {
      // Get distinct sower_ids from active products
      const { data: products } = await supabase
        .from('products')
        .select('sower_id')
        .eq('status', 'active');

      const sowerIds = [...new Set((products || []).map((p: any) => p.sower_id))];
      if (sowerIds.length === 0) return [];

      // Get sower details with user_id
      const { data: sowers } = await supabase
        .from('sowers')
        .select('id, user_id')
        .in('id', sowerIds);

      if (!sowers || sowers.length === 0) return [];

      const userIds = sowers.map((s: any) => s.user_id);
      const sowerIdToUserId = Object.fromEntries(sowers.map((s: any) => [s.id, s.user_id]));

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Count products per sower
      const productCounts: Record<string, number> = {};
      (products || []).forEach((p: any) => {
        const uid = sowerIdToUserId[p.sower_id];
        if (uid) productCounts[uid] = (productCounts[uid] || 0) + 1;
      });

      // Count orchards per user
      const { data: orchards } = await supabase
        .from('orchards')
        .select('user_id')
        .eq('status', 'active')
        .in('user_id', userIds);

      const orchardCounts: Record<string, number> = {};
      (orchards || []).forEach((o: any) => {
        orchardCounts[o.user_id] = (orchardCounts[o.user_id] || 0) + 1;
      });

      return (profiles || []).map((p: any) => ({
        userId: p.user_id,
        displayName: p.display_name || 'Sower',
        avatarUrl: p.avatar_url,
        productCount: productCounts[p.user_id] || 0,
        orchardCount: orchardCounts[p.user_id] || 0,
      })).slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active chat rooms (community + group chats)
  const { data: chatRooms } = useQuery({
    queryKey: ['feed-chat-rooms', user?.id],
    queryFn: async () => {
      // Always include community room
      const { data: communityRooms } = await supabase
        .from('chat_rooms')
        .select('id, name, description, current_listeners, is_system_room, room_type')
        .eq('is_active', true)
        .eq('is_system_room', true)
        .eq('room_type', 'group')
        .order('updated_at', { ascending: false })
        .limit(5);

      // Get user's active chat rooms (non-system)
      let userRooms: any[] = [];
      if (user?.id) {
        const { data: participantData } = await supabase
          .from('chat_participants')
          .select('room_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (participantData && participantData.length > 0) {
          const roomIds = participantData.map((p: any) => p.room_id);
          const { data: rooms } = await supabase
            .from('chat_rooms')
            .select('id, name, description, current_listeners, is_system_room, room_type')
            .in('id', roomIds)
            .eq('is_active', true)
            .neq('room_type', 'direct')
            .eq('is_system_room', false)
            .order('updated_at', { ascending: false })
            .limit(5);
          userRooms = rooms || [];
        }
      }

      // Combine, deduplicate
      const allRooms = [...(communityRooms || []), ...userRooms];
      const seen = new Set<string>();
      return allRooms.filter((r: any) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      }).map((r: any) => ({
        id: r.id,
        name: r.name || 'Chat Room',
        description: r.description,
        isCommunity: r.is_system_room,
        currentListeners: r.current_listeners || 0,
      }));
    },
    staleTime: 30 * 1000,
  });

  // Fetch community posts (seeds)
  const { data: seeds } = useQuery({
    queryKey: ['feed-seeds'],
    queryFn: async () => {
      const { data } = await supabase
        .from('community_posts')
        .select('*, profiles:author_profile_id(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Map the 2 radio sessions
  const radioCards = (radioSessions || []).slice(0, 2).map((s: any) => {
    const dj = s.radio_djs as any;
    return {
      id: s.id,
      showSubject: s.show_subject || '',
      showNotes: s.show_notes || '',
      status: s.status,
      broadcastMode: s.broadcast_mode,
      djName: dj?.dj_name || 'DJ',
      djAvatar: dj?.avatar_url || null,
      listenerCount: s.listener_count || 0,
    };
  });

  return (
    <div className="max-w-2xl mx-auto">
      <FeedHeader
        profile={profile}
        calendarData={calendarData}
        unreadMessages={unreadMessages}
      />

      <div className="px-3 sm:px-4 space-y-5 pb-8">
        {/* === RADIO SESSIONS === */}
        {radioCards.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Radio className="w-4 h-4 text-destructive" />
              <h2 className="text-sm font-bold text-foreground">Live Radio Sessions</h2>
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            </div>
            <div className="space-y-3">
              {radioCards.map((session) => (
                <RadioSessionCard key={session.id} data={session} />
              ))}
            </div>
          </section>
        )}

        {/* === LIVE SESSIONS (Classroom, SkillDrop, Training) === */}
        {((classroomSessions || []).length > 0 || (skilldropSessions || []).length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Live Sessions</h2>
            </div>
            <div className="space-y-3">
              {(classroomSessions || []).map((session) => (
                <LiveSessionCard key={`cls-${session.id}`} data={session} />
              ))}
              {(skilldropSessions || []).map((session) => (
                <LiveSessionCard key={`sd-${session.id}`} data={session} />
              ))}
            </div>
          </section>
        )}

        {(activeSowers || []).length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Sprout className="w-4 h-4 text-success" />
              <h2 className="text-sm font-bold text-foreground">Active Sowers</h2>
            </div>
            <div className="space-y-2">
              {(activeSowers || []).map((sower: any, i: number) => (
                <ActiveSowerCard key={sower.userId} data={sower} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* === S2G MEMRY FEED (inline) === */}
        <InlineMemryFeed />

        {/* === CHAT ROOMS === */}
        {(chatRooms || []).length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Active Chats</h2>
            </div>
            <div className="space-y-2">
              {(chatRooms || []).map((room: any, i: number) => (
                <ChatRoomCard key={room.id} data={room} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* === SEED POSTS === */}
        {(seeds || []).length > 0 && (
          <section>
            <div className="space-y-3">
              {seeds!.map((s: any) => (
                <SeedPostCard
                  key={`seed-${s.id}`}
                  data={{
                    id: s.id,
                    title: s.title,
                    content: s.content,
                    author: s.profiles?.display_name || 'Community member',
                    authorAvatar: s.profiles?.avatar_url,
                    upvotes: s.upvotes || 0,
                    replyCount: s.reply_count || 0,
                    createdAt: s.created_at,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {radioCards.length === 0 && (activeSowers || []).length === 0 && (chatRooms || []).length === 0 && (seeds || []).length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Your feed is waking up… 🌱</p>
          </div>
        )}
      </div>
    </div>
  );
};
