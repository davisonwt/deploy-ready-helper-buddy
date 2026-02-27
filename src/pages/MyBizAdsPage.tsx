import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Upload, Loader2, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BizAdCard from '@/components/biz-ads/BizAdCard';
import BizAdUploadDialog from '@/components/biz-ads/BizAdUploadDialog';

export default function MyBizAdsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: myAds = [], isLoading } = useQuery({
    queryKey: ['my-biz-ads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('biz_ads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('biz_ads').update({ is_active: !currentActive }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(currentActive ? 'Ad paused' : 'Ad activated');
    queryClient.invalidateQueries({ queryKey: ['my-biz-ads'] });
  };

  const deleteAd = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    const { error } = await supabase.from('biz_ads').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Ad deleted');
    queryClient.invalidateQueries({ queryKey: ['my-biz-ads'] });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="w-8 h-8 text-primary" />
              My S2G Biz Ads
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload ads to play on radio slots & show in the community gallery
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Ad
          </Button>
        </div>

        {user?.id && (
          <BizAdUploadDialog open={dialogOpen} onOpenChange={setDialogOpen} userId={user.id} />
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : myAds.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Megaphone className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Ads Yet</h3>
              <p className="text-muted-foreground mb-4">Upload your first business ad to promote on radio slots!</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Upload Your First Ad
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myAds.map((ad: any) => (
              <BizAdCard
                key={ad.id}
                ad={ad}
                showControls
                onToggleActive={toggleActive}
                onDelete={deleteAd}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
