import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemrySeedCard } from './MemrySeedCard';
import { ProviderFeedCard } from './ProviderFeedCard';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { dedupeUrls, isAudioUrl, isVideoUrl, normalizeMemryMedia, normalizeMediaUrl } from '@/utils/memryFeedMedia';

interface MemryPost {
  id: string;
  user_id: string;
  content_type: string;
  media_url: string;
  media?: { type: 'image' | 'video' | 'audio'; url: string }[];
  image_urls?: string[];
  audio_url?: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  product_id?: string;
  product_price?: number;
  product_title?: string;
  product_type?: string;
  category?: string;
  orchard_id?: string;
  book_id?: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
  user_liked?: boolean;
  sower_seed_number?: number;
  content_category?: string;
}

interface FeedComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string };
}

const FALLBACK_MEDIA = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';

const isManifestUrl = (url?: string) => /manifest\.json(?:[?#]|$)/i.test(String(url || ''));
const isPlayableAudioUrl = (url?: string) => isAudioUrl(url) || isManifestUrl(url);

const toMediaPayload = (
  source: any,
  options: {
    forceVideoUrl?: string;
    forceImageUrl?: string;
    forceAudioUrl?: string;
  } = {}
) => {
  const normalized = normalizeMemryMedia(source);
  const forcedVideo = normalizeMediaUrl(options.forceVideoUrl || '');
  const forcedImage = normalizeMediaUrl(options.forceImageUrl || '');
  const forcedAudio = normalizeMediaUrl(options.forceAudioUrl || '');

  const normalizedVideos = normalized.videos.filter((url) => isVideoUrl(url));
  const normalizedAudios = normalized.audios.filter((url) => isPlayableAudioUrl(url));
  const normalizedImages = normalized.images.filter(
    (url) => !isVideoUrl(url) && !isPlayableAudioUrl(url)
  );

  const videos = dedupeUrls([
    ...(forcedVideo && isVideoUrl(forcedVideo) ? [forcedVideo] : []),
    ...normalizedVideos,
  ]);
  const images = dedupeUrls([
    ...(forcedImage && !isVideoUrl(forcedImage) && !isPlayableAudioUrl(forcedImage) ? [forcedImage] : []),
    ...normalizedImages,
  ]);
  const audios = dedupeUrls([
    ...(forcedAudio && isPlayableAudioUrl(forcedAudio) ? [forcedAudio] : []),
    ...normalizedAudios,
  ]);

  return {
    videos,
    images,
    audios,
    media: [
      ...videos.map((url) => ({ type: 'video' as const, url })),
      ...images.map((url) => ({ type: 'image' as const, url })),
      ...audios.map((url) => ({ type: 'audio' as const, url })),
    ],
  };
};

export const InlineMemryFeed: React.FC = () => {
  const [posts, setPosts] = useState<MemryPost[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
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

      // Fetch approved providers for feed cards
      const { data: approvedProviders } = await supabase
        .from('providers')
        .select('id, user_id, subtype, business_name, bio, city, country, logo_url, photos')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(20);
      if (approvedProviders) setProviders(approvedProviders);

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
        const descriptor = [p.category, p.type, p.product_type].filter(Boolean).join(' ').toLowerCase();
        const normalizedType = String(p.type || '').toLowerCase();
        const isAudioCategory = ['music', 'audio', 'song', 'track'].some((token) => descriptor.includes(token));
        const looksLikeMusic = normalizedType === 'music' || isAudioCategory;

        if (looksLikeMusic) {
          // ── MUSIC PRODUCTS: bypass normalizeMemryMedia entirely ──
          // Strictly separate image from audio to prevent cross-contamination
          const rawImageUrls = (Array.isArray(p.image_urls) ? p.image_urls : typeof p.image_urls === 'string' ? [p.image_urls] : []).filter(Boolean);
          const coverImage = rawImageUrls[0] || p.cover_image_url || '';
          const audioSource = p.file_url || p.audio_url || p.track_url || p.preview_url || '';
          const displayImage = coverImage || FALLBACK_MEDIA;

          console.log(`[InlineMemryFeed] 🎵 Music "${p.title}" → image: ${displayImage.slice(-60)}, audio: ${audioSource.slice(-60)}`);

          allPosts.push({
            id: `product-${p.id}`,
            user_id: userId,
            content_type: 'music',
            media_url: displayImage,
            media: [
              ...(coverImage ? [{ type: 'image' as const, url: coverImage }] : []),
              ...(audioSource ? [{ type: 'audio' as const, url: audioSource }] : []),
            ],
            image_urls: coverImage ? [coverImage] : undefined,
            audio_url: audioSource || undefined,
            caption: `🌱 SEED: ${p.title}`,
            likes_count: p.bestowal_count || 0,
            comments_count: 0,
            product_id: p.id,
            product_price: p.price,
            product_title: p.title,
            product_type: p.product_type || undefined,
            category: p.category || undefined,
            profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
            content_category: 'seed',
          });
        } else {
          // ── NON-MUSIC PRODUCTS: use the full media normalizer ──
          const normalizedFileUrl = normalizeMediaUrl(p.file_url);
          const normalizedCoverUrl = normalizeMediaUrl(p.cover_image_url);
          const normalizedImageUrls = (Array.isArray(p.image_urls) ? p.image_urls : []).map((url: string) => normalizeMediaUrl(url)).filter(Boolean);
          const preferredImageUrl = normalizedImageUrls[0] || normalizedCoverUrl;
          const mediaPayload = toMediaPayload(p, {
            forceVideoUrl: isVideoUrl(normalizedFileUrl) ? normalizedFileUrl : undefined,
            forceImageUrl: preferredImageUrl || undefined,
          });
          const videoUrl = mediaPayload.videos[0] || '';
          const primaryImage = mediaPayload.images[0] || preferredImageUrl || '';
          const mediaUrl = videoUrl || primaryImage || FALLBACK_MEDIA;

          allPosts.push({
            id: `product-${p.id}`,
            user_id: userId,
            content_type: 'new_product',
            media_url: mediaUrl,
            media: mediaPayload.media,
            image_urls: mediaPayload.images.length > 0 ? mediaPayload.images : undefined,
            caption: `🌱 SEED: ${p.title}`,
            likes_count: p.bestowal_count || 0,
            comments_count: 0,
            product_id: p.id,
            product_price: p.price,
            product_title: p.title,
            product_type: p.product_type || undefined,
            category: p.category || undefined,
            profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
            content_category: 'seed',
          });
        }
      });

      (orchards || []).forEach((o: any) => {
        const profile = profileMap.get(o.user_id);
        const normalizedVideo = normalizeMediaUrl(o.video_url);
        const mediaPayload = toMediaPayload(o, {
          forceVideoUrl: isVideoUrl(normalizedVideo) ? normalizedVideo : undefined,
        });
        const orchardMediaUrl = mediaPayload.videos[0] || mediaPayload.images[0] || FALLBACK_MEDIA;
        const orchardImages = mediaPayload.images;

        allPosts.push({
          id: `orchard-${o.id}`,
          user_id: o.user_id,
          content_type: 'new_orchard',
          media_url: orchardMediaUrl,
          media: mediaPayload.media,
          image_urls: orchardImages.length > 0 ? orchardImages : undefined,
          caption: `🌳 ORCHARD: ${o.name}`,
          likes_count: 0,
          comments_count: 0,
          orchard_id: o.id,
          product_title: o.name,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
          content_category: 'seed',
        });
      });

      (books || []).forEach((b: any) => {
        const userId = b.sower?.user_id || b.sower_id;
        const profile = profileMap.get(userId);
        const bookCover = normalizeMediaUrl(b.cover_image_url);
        const mediaPayload = toMediaPayload(b, {
          forceImageUrl: bookCover || undefined,
        });
        const bookMediaUrl = mediaPayload.videos[0] || mediaPayload.images[0] || FALLBACK_MEDIA;
        const bookImages = mediaPayload.images;

        allPosts.push({
          id: `book-${b.id}`,
          user_id: userId,
          content_type: 'new_book',
          media_url: bookMediaUrl,
          media: mediaPayload.media,
          image_urls: bookImages.length > 0 ? bookImages : undefined,
          caption: `📚 BOOK: ${b.title}`,
          likes_count: 0,
          comments_count: 0,
          book_id: b.id,
          product_price: b.bestowal_value || b.price || 0,
          product_title: b.title,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
          content_category: 'seed',
        });
      });

      (memryPosts || []).forEach((mp: any) => {
        const profile = profileMap.get(mp.user_id);
        const normalizedType = String(mp.content_type || '').toLowerCase();
        const sourceMediaUrl = normalizeMediaUrl(mp.media_url);
        const sourceThumbUrl = normalizeMediaUrl(mp.thumbnail_url);
        const mediaPayload = toMediaPayload(mp, {
          forceVideoUrl: isVideoUrl(sourceMediaUrl) ? sourceMediaUrl : undefined,
          forceImageUrl: sourceThumbUrl || (!isVideoUrl(sourceMediaUrl) ? sourceMediaUrl : undefined),
          forceAudioUrl: isAudioUrl(sourceMediaUrl) ? sourceMediaUrl : undefined,
        });
        const primaryVideo = mediaPayload.videos[0] || '';
        const primaryImage = mediaPayload.images[0] || '';
        const primaryAudio = mediaPayload.audios[0];
        const hasVideoSource = !!(primaryVideo || isVideoUrl(sourceMediaUrl));
        const isVideoType = hasVideoSource;
        const mpMediaUrl = isVideoType
          ? (primaryVideo || sourceMediaUrl || primaryImage || FALLBACK_MEDIA)
          : (primaryImage || primaryVideo || sourceMediaUrl || primaryAudio || FALLBACK_MEDIA);
        const mpImages = mediaPayload.images;
        const mpAudio = normalizedType === 'music'
          ? (primaryAudio || (isAudioUrl(mpMediaUrl) ? mpMediaUrl : undefined))
          : primaryAudio;
        const resolvedContentType = isVideoType || (normalizedType !== 'music' && isVideoUrl(mpMediaUrl))
          ? 'video'
          : normalizedType === 'video'
            ? (mpAudio ? 'audio' : 'photo')
            : (normalizedType || (mpAudio ? 'audio' : 'photo'));

        allPosts.push({
          id: mp.id,
          user_id: mp.user_id,
          content_type: resolvedContentType,
          media_url: mpMediaUrl,
          media: mediaPayload.media,
          image_urls: mpImages.length > 0 ? mpImages : undefined,
          audio_url: mpAudio,
          caption: mp.caption || '',
          likes_count: mp.likes_count || 0,
          comments_count: mp.comments_count || 0,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
          content_category: mp.content_category || 'homemade',
        });
      });

      // Interleave by sower to avoid long same-sower streaks
      const bySower = new Map<string, MemryPost[]>();
      allPosts.forEach((post) => {
        const key = post.user_id || 'unknown';
        const list = bySower.get(key) || [];
        list.push(post);
        bySower.set(key, list);
      });

      const interleaved: MemryPost[] = [];
      let safety = 0;
      while (safety < 5000) {
        safety += 1;
        let pushed = false;
        for (const [, queue] of bySower) {
          if (queue.length > 0) {
            interleaved.push(queue.shift()!);
            pushed = true;
          }
        }
        if (!pushed) break;
      }

      // Assign per-sower seed number badge (1 = most recent within current feed batch)
      const sowerCounter = new Map<string, number>();
      interleaved.forEach((post) => {
        const key = post.user_id || 'unknown';
        const current = (sowerCounter.get(key) || 0) + 1;
        sowerCounter.set(key, current);
        post.sower_seed_number = current;
      });

      // Mark liked for UI state
      const finalPosts = interleaved.length ? interleaved : allPosts;
      finalPosts.forEach(p => { p.user_liked = likedPostIds.has(p.id); });

      setPosts(finalPosts);
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

  const handleOpenComments = useCallback(async (postId: string) => {
    setCommentsPostId(postId);
    setCommentsOpen(true);
    setComments([]);
    setNewComment('');

    const realPostId = postId.replace(/^(product|book|music|orchard)-/, '');
    const { data } = await supabase
      .from('memry_comments')
      .select('*')
      .eq('post_id', realPostId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setComments(data.map((c: any) => {
        const p = pMap.get(c.user_id);
        return { id: c.id, user_id: c.user_id, content: c.content, created_at: c.created_at, profiles: p ? { display_name: p.display_name, avatar_url: p.avatar_url } : undefined };
      }));
    }
  }, []);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !commentsPostId) return;
    const realPostId = commentsPostId.replace(/^(product|book|music|orchard)-/, '');
    const { data: newC, error } = await supabase
      .from('memry_comments')
      .insert({ post_id: realPostId, user_id: user.id, content: newComment.trim() })
      .select()
      .single();
    if (!error && newC) {
      const { data: myProfile } = await supabase.from('public_profiles').select('display_name, avatar_url').eq('user_id', user.id).maybeSingle();
      setComments(prev => [...prev, { id: newC.id, user_id: user.id, content: newComment.trim(), created_at: new Date().toISOString(), profiles: myProfile ? { display_name: myProfile.display_name, avatar_url: myProfile.avatar_url } : undefined }]);
      setPosts(prev => prev.map(p => p.id === commentsPostId ? { ...p, comments_count: p.comments_count + 1 } : p));
      setNewComment('');
    }
  };

  const handlePrivateMessage = useCallback(async (targetUserId: string, seedCaption: string) => {
    if (!user) return;
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', { user1_id: user.id, user2_id: targetUserId });
      if (error) throw error;
      if (!roomId) throw new Error('No room ID returned');
      navigate(`/communications-hub?room=${roomId}`);
    } catch (err: any) {
      console.error('Private message error:', err);
    }
  }, [user, navigate]);

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
        {posts.map((post, idx) => (
          <React.Fragment key={post.id}>
            <MemrySeedCard
              post={post}
              user={user}
              isFollowing={followedUserIds.has(post.user_id)}
              onLike={handleLike}
              onFollow={handleFollow}
              onOpenComments={handleOpenComments}
              onPrivateMessage={handlePrivateMessage}
            />
            {/* Interleave a provider card every 5 posts */}
            {providers.length > 0 && (idx + 1) % 5 === 0 && providers[Math.floor(idx / 5) % providers.length] && (
              <ProviderFeedCard
                key={`provider-${providers[Math.floor(idx / 5) % providers.length].id}`}
                provider={providers[Math.floor(idx / 5) % providers.length]}
                onMessage={(userId) => handlePrivateMessage(userId, '')}
              />
            )}
          </React.Fragment>
        ))}
        {/* Show providers at the end if feed is small */}
        {posts.length < 5 && providers.map(p => (
          <ProviderFeedCard key={`provider-${p.id}`} provider={p} onMessage={(userId) => handlePrivateMessage(userId, '')} />
        ))}
      </div>

      {/* Comments Modal */}
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-md bg-card border-border rounded-2xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Messages</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[45vh] pr-2">
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No messages yet. Be the first!</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={c.profiles?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{c.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{c.profiles?.display_name || 'Sower'}</span>{' '}
                      <span className="text-muted-foreground">{c.content}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {user && (
            <div className="flex gap-2 pt-3 border-t border-border">
              <Input
                placeholder="Write a message..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                className="flex-1 bg-muted border-border"
              />
              <Button onClick={handleAddComment} size="sm" className="bg-primary text-primary-foreground">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
