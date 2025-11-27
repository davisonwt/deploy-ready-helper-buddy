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

const fetcher = async (userId: string): Promise<MarketingStats> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Fetch today's funnel
  const { data: todayEvents } = await supabase
    .from('analytics_events')
    .select('event, revenue, product_id')
    .eq('user_id', userId)
    .gte('timestamp', today.toISOString());

  const impressions = todayEvents?.filter(e => e.event === 'product_view').length || 0;
  const views = todayEvents?.filter(e => e.event === 'product_tap').length || 0;
  const bestowals = todayEvents?.filter(e => e.event === 'bestowal_start').length || 0;
  const purchases = todayEvents?.filter(e => e.event === 'bestowal_complete').length || 0;
  const revenue = todayEvents?.reduce((sum, e) => sum + (e.revenue || 0), 0) || 0;
  const conversionRate = impressions > 0 ? (purchases / impressions) * 100 : 0;

  // Fetch top products
  const { data: productEvents } = await supabase
    .from('analytics_events')
    .select('product_id, revenue')
    .eq('user_id', userId)
    .in('event', ['bestowal_complete'])
    .gte('timestamp', weekAgo.toISOString());

  const productRevenue: Record<string, number> = {};
  productEvents?.forEach(e => {
    if (e.product_id) {
      productRevenue[e.product_id] = (productRevenue[e.product_id] || 0) + (e.revenue || 0);
    }
  });

  // Get product names
  const productIds = Object.keys(productRevenue);
  const { data: products } = await supabase
    .from('products')
    .select('id, title')
    .in('id', productIds);

  const topProducts = Object.entries(productRevenue)
    .map(([id, rev]) => ({
      productId: id,
      productName: products?.find(p => p.id === id)?.title || 'Unknown',
      revenue: rev,
      changePercent: Math.random() * 20 - 10, // Mock for now
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Attribution
  const { data: attributionEvents } = await supabase
    .from('analytics_events')
    .select('utm_source, utm_campaign, revenue')
    .eq('user_id', userId)
    .in('event', ['bestowal_complete'])
    .gte('timestamp', weekAgo.toISOString());

  const sourceRevenue: Record<string, number> = {};
  const campaignRevenue: Record<string, number> = {};

  attributionEvents?.forEach(e => {
    const source = e.utm_source || 'Organic';
    sourceRevenue[source] = (sourceRevenue[source] || 0) + (e.revenue || 0);
    
    if (e.utm_campaign) {
      campaignRevenue[e.utm_campaign] = (campaignRevenue[e.utm_campaign] || 0) + (e.revenue || 0);
    }
  });

  const totalAttributionRevenue = Object.values(sourceRevenue).reduce((a, b) => a + b, 0);
  const attributionBySource = Object.entries(sourceRevenue).map(([source, rev]) => ({
    source,
    revenue: rev,
    percentage: totalAttributionRevenue > 0 ? (rev / totalAttributionRevenue) * 100 : 0,
  }));

  const topCampaigns = Object.entries(campaignRevenue)
    .map(([campaign, rev]) => ({
      campaign,
      revenue: rev,
      ctr: Math.random() * 5, // Mock CTR
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Audience (mock for now - would need user profile data)
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

  // Hourly revenue
  const hourlyRevenue = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    revenue: Math.random() * 100,
  }));

  // Recent events
  const { data: recentEventsData } = await supabase
    .from('analytics_events')
    .select('event, ip_country, revenue, product_id, timestamp')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(10);

  const recentEvents = (recentEventsData || []).map(e => ({
    event: e.event,
    location: e.ip_country || 'Unknown',
    amount: e.revenue || undefined,
    productName: undefined, // Would need to join products
    timestamp: e.timestamp,
  }));

  return {
    funnel: {
      impressions,
      views,
      bestowals,
      purchases,
      conversionRate,
      revenue,
    },
    topProducts,
    attribution: {
      bySource: attributionBySource,
      topCampaigns,
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

    const channel = supabase
      .channel(`user_marketing_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analytics_events',
          filter: `user_id=eq.${user.id}`,
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

