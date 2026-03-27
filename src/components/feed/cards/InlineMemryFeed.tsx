import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemrySeedCard } from './MemrySeedCard';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MemryPost {
  id: string;
  user_id: string;
  content_type: string;
  media_url: string;
  image_urls?: string[];
  audio_url?: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  product_id?: string;
  product_price?: number;
  product_title?: string;
  orchard_id?: string;
  book_id?: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
  user_liked?: boolean;
}

interface FeedComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string };
}

export const InlineMemryFeed: React.FC = () => {
  const [posts, setPosts] = useState<MemryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Load likes/follows for current user
      if (authUser) {
        const [{ data: likes }, { data: follows }] = await Promise.all([
          supabase.from('memry_likes').select('post_id').eq('user_id', authUser.id),
          supabase.from('followers').select('following_id').eq('follower_id', authUser.id),
        ]);
        if (likes) setLikedPostIds(new Set(likes.map(l => l.post_id)));
        if (follows) setFollowedUserIds(new Set(follows.map(f => f.following_id)));
      }

      // Fetch products (seeds)
      const { data: products } = await supabase
        .from('products')
        .select('*, sower:sowers!products_sower_id_fkey(user_id, display_name, logo_url)')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch orchards
      const { data: orchards } = await supabase
        .from('orchards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Fetch books
      const { data: books } = await supabase
        .from('sower_books')
        .select('*, sower:sowers!sower_books_sower_id_fkey(user_id, display_name, logo_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch memry_posts
      const { data: memryPosts } = await supabase
        .from('memry_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // Gather all user IDs for profile lookup
      const allUserIds = [
        ...(products || []).map((p: any) => p.sower?.user_id).filter(Boolean),
        ...(orchards || []).map((o: any) => o.user_id).filter(Boolean),
        ...(books || []).map((b: any) => b.sower?.user_id).filter(Boolean),
        ...(memryPosts || []).map((p: any) => p.user_id).filter(Boolean),
      ];
      const uniqueIds = [...new Set(allUserIds)];

      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', uniqueIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Transform into MemryPost format
      const allPosts: MemryPost[] = [];

      (products || []).forEach((p: any) => {
        const userId = p.sower?.user_id || p.sower_id;
        const profile = profileMap.get(userId);
        const images = [p.cover_image_url, ...(p.gallery_images || [])].filter(Boolean);
        allPosts.push({
          id: `product-${p.id}`,
          user_id: userId,
          content_type: 'new_product',
          media_url: p.cover_image_url || '/placeholder.svg',
          image_urls: images.length > 1 ? images : undefined,
          caption: `🌱 SEED: ${p.title}`,
          likes_count: p.bestowal_count || 0,
          comments_count: 0,
          product_id: p.id,
          product_price: p.price,
          product_title: p.title,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
        });
      });

      (orchards || []).forEach((o: any) => {
        const profile = profileMap.get(o.user_id);
        allPosts.push({
          id: `orchard-${o.id}`,
          user_id: o.user_id,
          content_type: 'new_orchard',
          media_url: o.banner_url || o.logo_url || '/placeholder.svg',
          caption: `🌳 ORCHARD: ${o.name}`,
          likes_count: 0,
          comments_count: 0,
          orchard_id: o.id,
          product_title: o.name,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
        });
      });

      (books || []).forEach((b: any) => {
        const userId = b.sower?.user_id || b.sower_id;
        const profile = profileMap.get(userId);
        allPosts.push({
          id: `book-${b.id}`,
          user_id: userId,
          content_type: 'new_book',
          media_url: b.cover_image_url || '/placeholder.svg',
          caption: `📚 BOOK: ${b.title}`,
          likes_count: 0,
          comments_count: 0,
          book_id: b.id,
          product_price: b.price,
          product_title: b.title,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
        });
      });

      (memryPosts || []).forEach((mp: any) => {
        const profile = profileMap.get(mp.user_id);
        allPosts.push({
          id: mp.id,
          user_id: mp.user_id,
          content_type: mp.content_type,
          media_url: mp.media_url,
          image_urls: mp.image_urls,
          caption: mp.caption || '',
          likes_count: mp.likes_count || 0,
          comments_count: mp.comments_count || 0,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
        });
      });

      // Sort by newest, mark liked
      allPosts.sort((a, b) => 0); // keep interleaved order
      allPosts.forEach(p => { p.user_liked = likedPostIds.has(p.id); });

      setPosts(allPosts);
    } catch (err) {
      console.error('InlineMemryFeed load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    const realPostId = postId.replace(/^(product|book|music|orchard)-/, '');
    const isLiked = likedPostIds.has(postId);

    // Optimistic
    setLikedPostIds(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, user_liked: !isLiked, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p
    ));

    if (isLiked) {
      await supabase.from('memry_likes').delete().eq('post_id', realPostId).eq('user_id', user.id);
    } else {
      await supabase.from('memry_likes').insert({ post_id: realPostId, user_id: user.id });
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;
    const isFollowing = followedUserIds.has(targetUserId);
    setFollowedUserIds(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(targetUserId) : next.add(targetUserId);
      return next;
    });
    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
    } else {
      await supabase.from('followers').insert({ follower_id: user.id, following_id: targetUserId, source_type: 'profile' });
    }
  };

  const handleComment = (postId: string) => {
    toast({ title: 'Comments', description: 'Opening comments...' });
  };

  if (loading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <Camera className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-bold text-foreground">S2G Memry</h2>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <Camera className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-bold text-foreground">S2G Memry</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">No memries yet</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        <Camera className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold text-foreground">S2G Memry</h2>
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <MemrySeedCard
            key={post.id}
            post={post}
            user={user}
            isFollowing={followedUserIds.has(post.user_id)}
            onLike={handleLike}
            onFollow={handleFollow}
            onComment={handleComment}
          />
        ))}
      </div>
    </section>
  );
};
