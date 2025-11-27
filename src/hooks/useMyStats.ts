import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StatsData {
  followers: number;
  dailyNewFollowers: number;
  dailyBestowals: number;
  monthlyBestowals: number;
  streak: number;
  rank: number;
  registeredSowers: number;
  registeredSowersDelta: number;
  followersDelta: number;
  dailyBestowalsProducts?: Array<{ id: string; name: string; icon?: string }>;
}

const fetcher = async (userId: string): Promise<StatsData> => {
  // Get total followers
  const { count: totalFollowers } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  // Get followers from yesterday for delta
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const { count: yesterdayFollowers } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .lt('created_at', yesterday.toISOString());

  // Get daily new followers (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: dailyNewFollowers } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
    .gte('created_at', today.toISOString());

  // Get daily bestowals (today)
  const { data: dailyBestowalsData } = await supabase
    .from('bestowals')
    .select('amount, orchards(id, title)')
    .eq('bestower_id', userId)
    .gte('created_at', today.toISOString());

  const dailyBestowals = dailyBestowalsData?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

  // Get monthly bestowals
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyBestowalsData } = await supabase
    .from('bestowals')
    .select('amount')
    .eq('bestower_id', userId)
    .gte('created_at', firstDayOfMonth.toISOString());

  const monthlyBestowals = monthlyBestowalsData?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

  // Get registered sowers count (total users)
  const { count: registeredSowers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get registered sowers from yesterday
  const { count: yesterdaySowers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', yesterday.toISOString());

  // Calculate streak (consecutive days with activity)
  const { data: activityData } = await supabase
    .from('bestowals')
    .select('created_at')
    .eq('bestower_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  let streak = 0;
  if (activityData && activityData.length > 0) {
    const uniqueDays = new Set();
    activityData.forEach((item: any) => {
      const day = new Date(item.created_at).toDateString();
      uniqueDays.add(day);
    });
    streak = uniqueDays.size;
  }

  // Get rank (simplified - would need proper leaderboard query)
  const rank = 1; // Placeholder

  return {
    followers: totalFollowers || 0,
    dailyNewFollowers: dailyNewFollowers || 0,
    dailyBestowals,
    monthlyBestowals,
    streak,
    rank,
    registeredSowers: registeredSowers || 0,
    registeredSowersDelta: (registeredSowers || 0) - (yesterdaySowers || 0),
    followersDelta: (totalFollowers || 0) - (yesterdayFollowers || 0),
    dailyBestowalsProducts: dailyBestowalsData?.slice(0, 3).map((b: any) => ({
      id: b.orchards?.id || '',
      name: b.orchards?.title || 'Unknown'
    })) || []
  };
};

export function useMyStats() {
  const { user } = useAuth();
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  const { data, error, mutate } = useSWR(
    user?.id ? `stats-${user.id}` : null,
    () => fetcher(user!.id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds
    }
  );

  // WebSocket subscription for real-time deltas
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user:${user.id}:stats`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${user.id}`,
        },
        () => {
          mutate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bestowals',
          filter: `bestower_id=eq.${user.id}`,
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, mutate]);

  return {
    stats: data,
    loading: !data && !error,
    error,
    mutate,
    deltas,
  };
}

