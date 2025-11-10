import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useSocialActions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const followUser = async (followingId: string, sourceType: 'product' | 'orchard' | 'profile', sourceId?: string) => {
    if (!user) {
      toast.error('Please login to follow');
      return { success: false };
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('followers')
        .insert({
          follower_id: user.id,
          following_id: followingId,
          source_type: sourceType,
          source_id: sourceId
        });

      if (error) throw error;
      toast.success('Following successfully!');
      return { success: true };
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info('Already following');
      } else {
        toast.error('Failed to follow');
      }
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async (followingId: string) => {
    if (!user) return { success: false };

    try {
      setLoading(true);
      const { error } = await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      if (error) throw error;
      toast.success('Unfollowed');
      return { success: true };
    } catch (error) {
      toast.error('Failed to unfollow');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const likeProduct = async (productId: string) => {
    if (!user) {
      toast.error('Please login to like');
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('product_likes')
        .insert({ product_id: productId, user_id: user.id });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      if (error.code === '23505') {
        // Already liked, unlike
        await supabase
          .from('product_likes')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);
      }
      return { success: false };
    }
  };

  const likeOrchard = async (orchardId: string) => {
    if (!user) {
      toast.error('Please login to like');
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('orchard_likes')
        .insert({ orchard_id: orchardId, user_id: user.id });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      if (error.code === '23505') {
        // Already liked, unlike
        await supabase
          .from('orchard_likes')
          .delete()
          .eq('orchard_id', orchardId)
          .eq('user_id', user.id);
      }
      return { success: false };
    }
  };

  const shareContent = async (type: 'product' | 'orchard', id: string, title: string) => {
    const url = `${window.location.origin}/${type === 'product' ? 'products' : 'orchard'}/${id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return { success: true };
      } catch (error) {
        // User cancelled
        return { success: false };
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
      return { success: true };
    }
  };

  return {
    followUser,
    unfollowUser,
    likeProduct,
    likeOrchard,
    shareContent,
    loading
  };
}
