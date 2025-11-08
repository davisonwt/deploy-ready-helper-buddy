import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GroveType = 'chat_1on1' | 'community' | 'premium_room' | 'radio';

export interface Grove {
  id: string;
  type: GroveType;
  title: string;
  description?: string;
  creator_id: string;
  creator_name?: string;
  creator_avatar?: string;
  is_free: boolean;
  bestow_amount?: number;
  participants_count: number;
  files_count: number;
  preview_content?: string;
  is_live: boolean;
  live_listeners?: number;
  engagement_count: number;
  created_at: string;
  updated_at: string;
}

const GROVES_PER_PAGE = 10;

async function fetchGroves(pageParam: number, filters?: { type?: GroveType; search?: string }) {
  const rangeStart = pageParam * GROVES_PER_PAGE;
  const rangeEnd = rangeStart + GROVES_PER_PAGE - 1;

  // Fetch chat rooms (1-1 and community)
  let chatQuery = supabase
    .from('chat_rooms')
    .select(`
      id,
      name,
      description,
      room_type_detailed,
      created_by,
      is_premium,
      required_bestowal_amount,
      created_at,
      updated_at,
      profiles!chat_rooms_created_by_fkey(display_name, avatar_url)
    `)
    .eq('is_active', true);

  if (filters?.type === 'chat_1on1') {
    chatQuery = chatQuery.eq('room_type_detailed', 'direct');
  } else if (filters?.type === 'community') {
    chatQuery = chatQuery.eq('room_type_detailed', 'group');
  }

  // Fetch premium rooms
  let premiumQuery = supabase
    .from('chat_rooms')
    .select(`
      id,
      name,
      description,
      created_by,
      is_premium,
      required_bestowal_amount,
      premium_category,
      created_at,
      updated_at,
      profiles!chat_rooms_created_by_fkey(display_name, avatar_url)
    `)
    .eq('is_premium', true)
    .eq('is_active', true);

  // Fetch radio sessions (from radio_shows for now - simplified)
  const { data: radioData } = await supabase
    .from('radio_djs')
    .select(`
      id,
      stage_name,
      user_id,
      profiles!radio_djs_user_id_fkey(display_name, avatar_url)
    `)
    .limit(5);

  const radioResult = { data: [] };
  // Radio integration simplified - will be enhanced later

  const [chatResult, premiumResult] = await Promise.all([
    chatQuery,
    premiumQuery
  ]);

  // Transform all results into unified Grove format
  const groves: Grove[] = [];

  // Process chat rooms
  if (chatResult.data) {
    for (const room of chatResult.data) {
      const profile = Array.isArray(room.profiles) ? room.profiles[0] : room.profiles;
      
      groves.push({
        id: room.id,
        type: room.room_type_detailed === 'direct' ? 'chat_1on1' : 'community',
        title: room.name || 'Chat Room',
        description: room.description,
        creator_id: room.created_by,
        creator_name: profile?.display_name,
        creator_avatar: profile?.avatar_url,
        is_free: !room.is_premium,
        bestow_amount: room.required_bestowal_amount || 0,
        participants_count: 0,
        files_count: 0,
        is_live: false,
        engagement_count: 0,
        created_at: room.created_at,
        updated_at: room.updated_at
      });
    }
  }

  // Process premium rooms
  if (premiumResult.data) {
    for (const room of premiumResult.data) {
      const profile = Array.isArray(room.profiles) ? room.profiles[0] : room.profiles;
      
      groves.push({
        id: room.id,
        type: 'premium_room',
        title: room.name || 'Premium Room',
        description: room.description,
        creator_id: room.created_by,
        creator_name: profile?.display_name,
        creator_avatar: profile?.avatar_url,
        is_free: (room.required_bestowal_amount || 0) === 0,
        bestow_amount: room.required_bestowal_amount || 0,
        participants_count: 0,
        files_count: 0,
        is_live: false,
        engagement_count: 0,
        created_at: room.created_at,
        updated_at: room.updated_at
      });
    }
  }

  // Process radio sessions - simplified for now
  // Radio groves will show on hover in the feed but won't be primary content yet

  // Sort by most recent activity
  groves.sort((a, b) => {
    // Prioritize live content
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Apply pagination
  const paginatedGroves = groves.slice(rangeStart, rangeEnd + 1);
  
  return {
    data: paginatedGroves,
    hasMore: groves.length > rangeEnd + 1
  };
}

export function useGroveFeed(filters?: { type?: GroveType; search?: string }) {
  return useInfiniteQuery({
    queryKey: ['grove-feed', filters],
    queryFn: ({ pageParam = 0 }) => fetchGroves(pageParam, filters),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined;
    },
    initialPageParam: 0,
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  });
}
