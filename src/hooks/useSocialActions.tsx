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
      setLoading(true);
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('product_likes')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('product_likes')
          .delete()
          .eq('id', existingLike.id);
        
        if (error) throw error;
        toast.success('Unliked');
        return { success: false }; // false means unliked
      } else {
        // Like
        const { error } = await supabase
          .from('product_likes')
          .insert({ product_id: productId, user_id: user.id });

        if (error) throw error;
        toast.success('Liked!');
        return { success: true };
      }
    } catch (error: any) {
      console.error('Like product error:', error);
      toast.error('Failed to update like');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const likeOrchard = async (orchardId: string) => {
    if (!user) {
      toast.error('Please login to like');
      return { success: false };
    }

    try {
      setLoading(true);
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('orchard_likes')
        .select('id')
        .eq('orchard_id', orchardId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('orchard_likes')
          .delete()
          .eq('id', existingLike.id);
        
        if (error) throw error;
        toast.success('Unliked');
        return { success: false }; // false means unliked
      } else {
        // Like
        const { error } = await supabase
          .from('orchard_likes')
          .insert({ orchard_id: orchardId, user_id: user.id });

        if (error) throw error;
        toast.success('Liked!');
        return { success: true };
      }
    } catch (error: any) {
      console.error('Like orchard error:', error);
      toast.error('Failed to update like');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const shareContent = async (type: 'product' | 'orchard', id: string, title: string) => {
    try {
      const url = `${window.location.origin}/${type === 'product' ? 'products' : 'orchard'}/${id}`;
      
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          toast.success('Shared successfully!');
          return { success: true };
        } catch (error: any) {
          // User cancelled or error occurred
          if (error.name !== 'AbortError') {
            console.error('Share error:', error);
            // Fallback to clipboard
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
          }
          return { success: false };
        }
      } else {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(url);
          toast.success('Link copied to clipboard!');
          return { success: true };
        } catch (clipboardError) {
          console.error('Clipboard error:', clipboardError);
          toast.error('Failed to copy link. Please copy manually: ' + url);
          return { success: false };
        }
      }
    } catch (error) {
      console.error('Share content error:', error);
      toast.error('Failed to share content');
      return { success: false };
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
