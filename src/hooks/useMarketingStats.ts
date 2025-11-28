import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MarketingStats {
  funnel: {
    impressions: number;
    views: number;
    bestowals: number;
    purchases: number;
    conversionRate: number;
    revenue: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    revenue: number;
    changePercent: number;
  }>;
  attribution: {
    bySource: Array<{ source: string; revenue: number; percentage: number }>;
    topCampaigns: Array<{ campaign: string; revenue: number; ctr: number }>;
  };
  audience: {
    age: Array<{ range: string; count: number }>;
    gender: Array<{ gender: string; count: number }>;
    country: Array<{ country: string; count: number }>;
    device: Array<{ device: string; count: number }>;
  };
  hourlyRevenue: Array<{ hour: number; revenue: number }>;
  recentEvents: Array<{
    event: string;
    location: string;
    amount?: number;
    productName?: string;
    timestamp: string;
  }>;
}

/**
 * Fetcher for marketing stats
 * NOTE: analytics_events table doesn't exist yet, so we return mock/empty data
 */
const fetcher = async (userId: string): Promise<MarketingStats> => {
  // analytics_events table doesn't exist yet - return mock data
  console.log('Marketing stats: analytics_events table not yet created, returning mock data');

  // Get some real data from bestowals table
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Fetch actual bestowals for revenue
  const { data: bestowalsData } = await supabase
    .from('bestowals')
    .select('id, amount, product_id:orchard_id, created_at')
    .eq('bestower_id', userId)
    .gte('created_at', weekAgo.toISOString());

  const todayBestowals = bestowalsData?.filter(b => new Date(b.created_at) >= today) || [];
  const revenue = todayBestowals.reduce((sum, b) => sum + (b.amount || 0), 0);

  // Get product names for top products (using orchards table with correct column names)
  const productIds = [...new Set(bestowalsData?.map(b => b.product_id).filter(Boolean) || [])];
  const { data: orchards } = await supabase
    .from('orchards')
    .select('id, title')
    .in('id', productIds.length > 0 ? productIds : ['none']);

  const productRevenue: Record<string, number> = {};
  bestowalsData?.forEach(b => {
    if (b.product_id) {
      productRevenue[b.product_id] = (productRevenue[b.product_id] || 0) + (b.amount || 0);
    }
  });

  const topProducts = Object.entries(productRevenue)
    .map(([id, rev]) => ({
      productId: id,
      productName: orchards?.find(o => o.id === id)?.title || 'Unknown',
      revenue: rev,
      changePercent: Math.random() * 20 - 10,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Mock audience data
  const audience = {
    age: [
      { range: '18-24', count: Math.floor(Math.random() * 100) },
      { range: '25-34', count: Math.floor(Math.random() * 100) },
      { range: '35-44', count: Math.floor(Math.random() * 100) },
      { range: '45+', count: Math.floor(Math.random() * 100) },
    ],
    gender: [
      { gender: 'Male', count: Math.floor(Math.random() * 100) },
      { gender: 'Female', count: Math.floor(Math.random() * 100) },
      { gender: 'Other', count: Math.floor(Math.random() * 50) },
    ],
    country: [
      { country: 'US', count: Math.floor(Math.random() * 100) },
      { country: 'UK', count: Math.floor(Math.random() * 100) },
      { country: 'CA', count: Math.floor(Math.random() * 100) },
      { country: 'AU', count: Math.floor(Math.random() * 100) },
      { country: 'DE', count: Math.floor(Math.random() * 100) },
    ],
    device: [
      { device: 'iPhone', count: Math.floor(Math.random() * 100) },
      { device: 'Android', count: Math.floor(Math.random() * 100) },
      { device: 'Desktop', count: Math.floor(Math.random() * 100) },
    ],
  };

  // Mock hourly revenue
  const hourlyRevenue = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    revenue: Math.random() * 100,
  }));

  // Mock recent events based on actual bestowals
  const recentEvents = (todayBestowals || []).slice(0, 10).map(b => ({
    event: 'bestowal_complete',
    location: 'Unknown',
    amount: b.amount,
    productName: orchards?.find(o => o.id === b.product_id)?.title,
    timestamp: b.created_at,
  }));

  return {
    funnel: {
      impressions: Math.floor(Math.random() * 100),
      views: Math.floor(Math.random() * 50),
      bestowals: todayBestowals.length,
      purchases: todayBestowals.length,
      conversionRate: todayBestowals.length > 0 ? Math.random() * 5 : 0,
      revenue,
    },
    topProducts,
    attribution: {
      bySource: [
        { source: 'Organic', revenue: revenue * 0.6, percentage: 60 },
        { source: 'Referral', revenue: revenue * 0.25, percentage: 25 },
        { source: 'Social', revenue: revenue * 0.15, percentage: 15 },
      ],
      topCampaigns: [],
    },
    audience,
    hourlyRevenue,
    recentEvents,
  };
};

export function useMarketingStats() {
  const { user } = useAuth();
  const [deltas, setDeltas] = useState<Record<string, any>>({});

  const { data, error, mutate } = useSWR(
    user?.id ? `marketing-stats-${user.id}` : null,
    () => fetcher(user!.id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 30 seconds
    }
  );

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to bestowals changes instead of analytics_events
    const channel = supabase
      .channel(`user_marketing_${user.id}`)
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
