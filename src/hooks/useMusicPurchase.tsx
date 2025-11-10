import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useMusicPurchase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  const { data: purchases = [] } = useQuery({
    queryKey: ['music-purchases', user?.id],
    queryFn: async () => {
      if (!user) return [];
      // @ts-ignore - New table not yet in types
      const { data, error } = await supabase
        .from('music_purchases')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ trackId, amount }: { trackId: string; amount: number }) => {
      if (!user) throw new Error('User not authenticated');

      // @ts-ignore - New table not yet in types
      const { data, error } = await (supabase
        .from('music_purchases') as any)
        .insert({
          user_id: user.id,
          track_id: trackId,
          amount: amount,
          currency: 'USDC',
          payment_status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['user-music-purchases'] });
      toast.success('Purchase completed successfully!');
    },
    onError: (error) => {
      console.error('Purchase error:', error);
      toast.error('Purchase failed. Please try again.');
    }
  });

  const purchaseTrack = async (trackId: string, amount: number) => {
    setProcessing(true);
    try {
      await purchaseMutation.mutateAsync({ trackId, amount });
    } finally {
      setProcessing(false);
    }
  };

  const hasPurchased = (trackId: string) => {
    return purchases.some((p: any) => p.track_id === trackId);
  };

  const canDownload = async (trackId: string) => {
    if (!user) return false;

    const { data: track } = await supabase
      .from('dj_music_tracks')
      .select('price')
      .eq('id', trackId)
      .single();

    if (!track?.price || track.price === 0) return true;

    return hasPurchased(trackId);
  };

  return {
    purchases,
    purchaseTrack,
    hasPurchased,
    canDownload,
    processing
  };
}