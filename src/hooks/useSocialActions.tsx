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

  const voteForTrack = async (trackId: string) => {
    if (!user) {
      toast.error('Please login to vote');
      return { success: false, voted: false };
    }

    try {
      setLoading(true);
      // Get current week ID for voting
      const now = new Date();
      const weekId = `${now.getFullYear()}-W${Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)}`;
      
      // Check if already voted this week
      const { data: existingVote } = await supabase
        .from('song_votes')
        .select('id')
        .eq('song_id', trackId)
        .eq('user_id', user.id)
        .eq('week_id', weekId)
        .maybeSingle();

      if (existingVote) {
        // Remove vote
        const { error } = await supabase
          .from('song_votes')
          .delete()
          .eq('id', existingVote.id);
        
        if (error) throw error;
        toast.success('Vote removed');
        return { success: true, voted: false };
      } else {
        // Add vote
        const { error } = await supabase
          .from('song_votes')
          .insert({ 
            song_id: trackId, 
            user_id: user.id,
            week_id: weekId
          });

        if (error) throw error;
        toast.success('Voted for Torah Top Ten! 🎵');
        return { success: true, voted: true };
      }
    } catch (error: any) {
      console.error('Vote error:', error);
      toast.error('Failed to vote');
      return { success: false, voted: false };
    } finally {
      setLoading(false);
    }
  };

  const shareTrack = async (trackId: string, title: string, artist?: string) => {
    try {
      const url = `https://sow2growapp.com/music-library?track=${trackId}`;
      const shareText = `Check out "${title}"${artist ? ` by ${artist}` : ''} on S2G Music!`;
      
      if (navigator.share) {
        try {
          await navigator.share({ title: shareText, url });
          toast.success('Shared successfully!');
          return { success: true };
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
          }
          return { success: false };
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        return { success: true };
      }
    } catch (error) {
      console.error('Share track error:', error);
      toast.error('Failed to share');
      return { success: false };
    }
  };

  const shareContent = async (type: 'product' | 'orchard', id: string, title: string) => {
    try {
      const url = `https://sow2growapp.com/${type === 'product' ? 'products' : 'orchard'}/${id}`;
      
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
    voteForTrack,
    shareTrack,
    shareContent,
    loading
  };
}
