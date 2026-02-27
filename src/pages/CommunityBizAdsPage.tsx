import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Megaphone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BizAdCard from '@/components/biz-ads/BizAdCard';

export default function CommunityBizAdsPage() {
  const navigate = useNavigate();

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['community-biz-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('biz_ads')
        .select('*, profiles:user_id(username, display_name, avatar_url)')
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="w-8 h-8 text-primary" />
              Community Biz Ads
            </h1>
            <p className="text-muted-foreground mt-1">
              Business ads from our community — featured on Grove Station radio
            </p>
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/my-biz-ads">
              <Megaphone className="w-4 h-4" /> My Ads
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : ads.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Ads Yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to advertise your business!</p>
              <Button asChild>
                <Link to="/my-biz-ads">Upload an Ad</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad: any) => {
              const profile = ad.profiles;
              const displayName = profile?.display_name || profile?.username || 'Sower';
              return (
                <BizAdCard key={ad.id} ad={ad} displayName={displayName} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
