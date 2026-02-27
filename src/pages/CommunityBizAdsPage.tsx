import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Megaphone, Music, Image, Video, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
                <Card key={ad.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-muted relative">
                    {ad.media_type === 'image' ? (
                      <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                    ) : ad.media_type === 'video' ? (
                      <video src={ad.media_url} controls className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                        <Music className="w-12 h-12 text-muted-foreground" />
                        <audio src={ad.media_url} controls className="w-full" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2" variant="outline">
                      {ad.media_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : ad.media_type === 'audio' ? <Music className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
                      {ad.media_type}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-lg">{ad.title}</h3>
                    {ad.description && <p className="text-sm text-muted-foreground line-clamp-3">{ad.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      By {displayName} · {new Date(ad.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
