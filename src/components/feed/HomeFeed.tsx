import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RadioLiveCard } from './cards/RadioLiveCard';
import { AIStoryCard } from './cards/AIStoryCard';
import { SeedPostCard } from './cards/SeedPostCard';
import { ClassroomCard } from './cards/ClassroomCard';
import { SkillDropCard } from './cards/SkillDropCard';
import { FeedHeader } from './FeedHeader';

interface FeedItem {
  id: string;
  type: 'radio' | 'ai-story' | 'seed' | 'classroom' | 'skilldrop';
  data: any;
  timestamp: string;
}

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

  // Fetch active orchards for AI story cards
  const { data: orchards } = useQuery({
    queryKey: ['feed-orchards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orchards')
        .select('*, profiles!orchards_user_id_fkey(display_name, first_name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch live/upcoming classroom sessions
  const { data: classrooms } = useQuery({
    queryKey: ['feed-classrooms'],
    queryFn: async () => {
      const { data } = await supabase
        .from('classroom_sessions')
        .select('*, profiles:instructor_profile_id(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .order('scheduled_at', { ascending: true })
        .limit(5);
      return data || [];
    },
    staleTime: 60 * 1000,
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

  // Build feed items
  const feedItems: FeedItem[] = React.useMemo(() => {
    const items: FeedItem[] = [];

    // AI Story cards from orchards
    (orchards || []).forEach((o: any) => {
      const sowerName = o.profiles?.display_name || o.profiles?.first_name || 'A sower';
      const daysSincePlanted = Math.floor(
        (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const bestowalsCount = o.filled_pockets || 0;
      const totalPockets = o.total_pockets || 10;
      const stage = Math.min(5, Math.ceil((bestowalsCount / totalPockets) * 5));

      items.push({
        id: `story-${o.id}`,
        type: 'ai-story',
        data: {
          orchardId: o.id,
          sowerName,
          sowerAvatar: o.profiles?.avatar_url,
          title: o.title,
          daysSincePlanted,
          bestowalsCount,
          totalPockets,
          stage,
          pocketPrice: o.pocket_price,
        },
        timestamp: o.created_at,
      });
    });

    // Classroom cards
    (classrooms || []).forEach((c: any) => {
      items.push({
        id: `classroom-${c.id}`,
        type: 'classroom',
        data: {
          id: c.id,
          title: c.title,
          instructor: c.profiles?.display_name || 'Instructor',
          instructorAvatar: c.profiles?.avatar_url,
          status: c.status,
          scheduledAt: c.scheduled_at,
        },
        timestamp: c.scheduled_at || c.created_at,
      });
    });

    // Seed posts
    (seeds || []).forEach((s: any) => {
      items.push({
        id: `seed-${s.id}`,
        type: 'seed',
        data: {
          id: s.id,
          title: s.title,
          content: s.content,
          author: s.profiles?.display_name || 'Community member',
          authorAvatar: s.profiles?.avatar_url,
          upvotes: s.upvotes || 0,
          replyCount: s.reply_count || 0,
          createdAt: s.created_at,
        },
        timestamp: s.created_at,
      });
    });

    // Sort chronologically (newest first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [orchards, classrooms, seeds]);

  return (
    <div className="max-w-2xl mx-auto">
      <FeedHeader
        profile={profile}
        calendarData={calendarData}
        unreadMessages={unreadMessages}
      />

      <div className="px-3 sm:px-4 space-y-3 pb-8">
        {/* Radio card always at top when live */}
        <RadioLiveCard />

        {/* Mixed feed */}
        {feedItems.map((item) => {
          switch (item.type) {
            case 'ai-story':
              return <AIStoryCard key={item.id} data={item.data} />;
            case 'seed':
              return <SeedPostCard key={item.id} data={item.data} />;
            case 'classroom':
              return <ClassroomCard key={item.id} data={item.data} />;
            case 'skilldrop':
              return <SkillDropCard key={item.id} data={item.data} />;
            default:
              return null;
          }
        })}

        {feedItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">Your feed is waking up… 🌱</p>
          </div>
        )}
      </div>
    </div>
  );
};
