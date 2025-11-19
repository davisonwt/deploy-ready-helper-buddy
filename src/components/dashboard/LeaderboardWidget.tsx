import { FC, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, TrendingUp, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface LeaderItem {
  id: string;
  title: string;
  owner_name?: string;
  avatar_url?: string;
  metric: number;
  type: 'product' | 'orchard';
}

export const LeaderboardWidget: FC = () => {
  const [productLeaders, setProductLeaders] = useState<LeaderItem[]>([]);
  const [orchardLeaders, setOrchardLeaders] = useState<LeaderItem[]>([]);
  const [marketingLeaders, setMarketingLeaders] = useState<LeaderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        // Top Products by followers
        const { data: products } = await supabase
          .from('products')
          .select(`
            id,
            title,
            follower_count,
            like_count,
            profiles:user_id (
              display_name,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .order('follower_count', { ascending: false })
          .limit(5);

        // Top Orchards by followers
        const { data: orchards } = await supabase
          .from('orchards')
          .select(`
            id,
            title,
            follower_count,
            like_count,
            profiles:user_id (
              display_name,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .order('follower_count', { ascending: false })
          .limit(5);

        // Marketing leaders (by community videos view count)
        const { data: videos } = await supabase
          .from('community_videos')
          .select(`
            id,
            title,
            view_count,
            profiles:uploader_id (
              display_name,
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq('status', 'approved')
          .order('view_count', { ascending: false })
          .limit(5);

        setProductLeaders(
          products?.map(p => ({
            id: p.id,
            title: p.title,
            owner_name: (p.profiles as any)?.display_name || 
                       `${(p.profiles as any)?.first_name || ''} ${(p.profiles as any)?.last_name || ''}`.trim(),
            avatar_url: (p.profiles as any)?.avatar_url,
            metric: p.follower_count || 0,
            type: 'product' as const
          })) || []
        );

        setOrchardLeaders(
          orchards?.map(o => ({
            id: o.id,
            title: o.title,
            owner_name: (o.profiles as any)?.display_name || 
                       `${(o.profiles as any)?.first_name || ''} ${(o.profiles as any)?.last_name || ''}`.trim(),
            avatar_url: (o.profiles as any)?.avatar_url,
            metric: o.follower_count || 0,
            type: 'orchard' as const
          })) || []
        );

        setMarketingLeaders(
          videos?.map(v => ({
            id: v.id,
            title: v.title,
            owner_name: (v.profiles as any)?.display_name || 
                       `${(v.profiles as any)?.first_name || ''} ${(v.profiles as any)?.last_name || ''}`.trim(),
            avatar_url: (v.profiles as any)?.avatar_url,
            metric: v.view_count || 0,
            type: 'product' as const
          })) || []
        );
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  const renderLeaderList = (items: LeaderItem[], metricLabel: string) => (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            {idx === 0 ? (
              <Trophy className="h-4 w-4 text-yellow-500" />
            ) : (
              <span className="text-sm font-bold text-primary">{idx + 1}</span>
            )}
          </div>
          
          <Avatar className="h-8 w-8">
            <AvatarImage src={item.avatar_url} />
            <AvatarFallback>{item.owner_name?.[0] || 'U'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground truncate">{item.owner_name}</p>
          </div>

          <Badge variant="secondary" className="shrink-0">
            {item.metric} {metricLabel}
          </Badge>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          No data yet
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="flex w-full gap-4 bg-transparent p-1 sm:p-1.5 border-none shadow-none">
            <TabsTrigger 
              value="products"
              className="flex-1 rounded-2xl border border-primary/40 bg-primary/15 text-primary-foreground/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="orchards"
              className="flex-1 rounded-2xl border border-primary/40 bg-primary/15 text-primary-foreground/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Orchards
            </TabsTrigger>
            <TabsTrigger 
              value="marketing"
              className="flex-1 rounded-2xl border border-primary/40 bg-primary/15 text-primary-foreground/80 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              Marketing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4">
            {renderLeaderList(productLeaders, 'followers')}
          </TabsContent>

          <TabsContent value="orchards" className="mt-4">
            {renderLeaderList(orchardLeaders, 'followers')}
          </TabsContent>

          <TabsContent value="marketing" className="mt-4">
            {renderLeaderList(marketingLeaders, 'views')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
