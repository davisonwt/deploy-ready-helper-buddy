import { FC, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AnalyticsData {
  totalFollowers: number;
  newFollowers: number;
  totalLikes: number;
  sourceBreakdown: Array<{
    source_type: string;
    source_id: string;
    count: number;
    title?: string;
  }>;
}

interface SowerAnalyticsTooltipProps {
  userId: string;
  itemId?: string;
  itemType?: 'product' | 'orchard';
}

export const SowerAnalyticsTooltip: FC<SowerAnalyticsTooltipProps> = ({
  userId,
  itemId,
  itemType
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get total followers
        const { count: totalFollowers } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);

        // Get new followers (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { count: newFollowers } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId)
          .gte('created_at', sevenDaysAgo.toISOString());

        // Get total likes for specific item
        let totalLikes = 0;
        if (itemId && itemType) {
          if (itemType === 'product') {
            const { count } = await supabase
              .from('product_likes')
              .select('*', { count: 'exact', head: true })
              .eq('product_id', itemId);
            totalLikes = count || 0;
          } else {
            const { count } = await supabase
              .from('orchard_likes')
              .select('*', { count: 'exact', head: true })
              .eq('orchard_id', itemId);
            totalLikes = count || 0;
          }
        }

        // Get source breakdown (which products/orchards brought followers)
        const { data: sourceData } = await supabase
          .from('followers')
          .select('source_type, source_id')
          .eq('following_id', userId)
          .not('source_id', 'is', null);

        // Group by source
        const sourceBreakdown: { [key: string]: number } = {};
        sourceData?.forEach((item: any) => {
          const key = `${item.source_type}:${item.source_id}`;
          sourceBreakdown[key] = (sourceBreakdown[key] || 0) + 1;
        });

        // Fetch titles for sources
        const breakdown = await Promise.all(
          Object.entries(sourceBreakdown).map(async ([key, count]) => {
            const [source_type, source_id] = key.split(':');
            let title = 'Unknown';
            
            if (source_type === 'product') {
              const { data } = await supabase
                .from('products')
                .select('title')
                .eq('id', source_id)
                .maybeSingle();
              title = data?.title || 'Unknown Product';
            } else if (source_type === 'orchard') {
              const { data } = await supabase
                .from('orchards')
                .select('title')
                .eq('id', source_id)
                .maybeSingle();
              title = data?.title || 'Unknown Orchard';
            }

            return { source_type, source_id, count, title };
          })
        );

        setAnalytics({
          totalFollowers: totalFollowers || 0,
          newFollowers: newFollowers || 0,
          totalLikes,
          sourceBreakdown: breakdown.sort((a, b) => b.count - a.count).slice(0, 5)
        });
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userId, itemId, itemType]);

  if (loading) {
    return (
      <Card className="p-4 min-w-[300px]">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <Card className="p-4 min-w-[300px] space-y-3">
      <h3 className="font-semibold text-sm">Analytics</h3>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-medium">{analytics.totalFollowers}</span>
          <span className="text-muted-foreground">Total Followers</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="font-medium">+{analytics.newFollowers}</span>
          <span className="text-muted-foreground">New (7 days)</span>
        </div>

        {itemId && (
          <div className="flex items-center gap-2 text-sm">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="font-medium">{analytics.totalLikes}</span>
            <span className="text-muted-foreground">Likes</span>
          </div>
        )}
      </div>

      {analytics.sourceBreakdown.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Top Sources</p>
          <div className="space-y-1">
            {analytics.sourceBreakdown.map((source, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{source.title}</span>
                <span className="font-medium ml-2">+{source.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
