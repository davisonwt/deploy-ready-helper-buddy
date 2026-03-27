import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemrySeedCard } from './MemrySeedCard';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { convertToPublicUrl } from '@/utils/urlUtils';

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
}

interface FeedComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url: string };
}

const FALLBACK_MEDIA = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';

type MediaKind = 'image' | 'video' | 'audio';

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|avi)(\?|$)/i;
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|aac|ogg|flac)(\?|$)/i;

const dedupeUrls = (urls: string[]) => {
  const seen = new Set<string>();
  return urls.filter((url) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
};

const parseArrayish = (value: unknown): unknown[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const looksLikeJson =
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'));

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (typeof value === 'object') return [value];
  return [];
};

const extractUrl = (item: any): string | undefined => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return undefined;

  const candidate =
    item.url ??
    item.src ??
    item.path ??
    item.publicUrl ??
    item.public_url ??
    item.file ??
    item.file_url ??
    item.media_url ??
    item.mediaUrl ??
    item.image ??
    item.image1 ??
    item.image2 ??
    item.image3 ??
    item.image4 ??
    item.image_url ??
    item.video ??
    item.video_url ??
    item.audio ??
    item.audio_url ??
    item.thumbnail ??
    item.thumbnail_url ??
    item.cover ??
    item.cover_image_url;

  return typeof candidate === 'string' ? candidate : undefined;
};

const inferMediaKind = (url: string, hint?: unknown): MediaKind => {
  const hinted = String(hint || '').toLowerCase();

  if (hinted.startsWith('video')) return 'video';
  if (hinted.startsWith('audio')) return 'audio';
  if (hinted.startsWith('image') || hinted === 'photo' || hinted === 'picture') return 'image';

  if (VIDEO_EXT_RE.test(url)) return 'video';
  if (AUDIO_EXT_RE.test(url)) return 'audio';

  return 'image';
};

const normalizeMemryMedia = (source: any) => {
  const mediaMap = new Map<string, MediaKind>();
  const metadata = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {};

  const pushValue = (value: unknown, hint?: unknown) => {
    for (const item of parseArrayish(value)) {
      if (item && typeof item === 'object') {
        const obj = item as any;

        if (obj.tracks) pushValue(obj.tracks, 'audio');
        if (obj.file) pushValue(obj.file, hint);
        if (obj.files) pushValue(obj.files, hint);
        if (obj.media) pushValue(obj.media, hint);
        if (obj.media_items) pushValue(obj.media_items, hint);
        if (obj.attachments) pushValue(obj.attachments, hint);
        if (obj.media_urls) pushValue(obj.media_urls, hint);
        if (obj.image) pushValue(obj.image, 'image');
        if (obj.image1) pushValue(obj.image1, 'image');
        if (obj.image2) pushValue(obj.image2, 'image');
        if (obj.image3) pushValue(obj.image3, 'image');
        if (obj.image4) pushValue(obj.image4, 'image');
        if (obj.image_urls) pushValue(obj.image_urls, 'image');
        if (obj.video) pushValue(obj.video, 'video');
        if (obj.video_url) pushValue(obj.video_url, 'video');
        if (obj.video_urls) pushValue(obj.video_urls, 'video');
        if (obj.audio) pushValue(obj.audio, 'audio');
        if (obj.audio_url) pushValue(obj.audio_url, 'audio');
        if (obj.audio_urls) pushValue(obj.audio_urls, 'audio');
        if (obj.thumbnail) pushValue(obj.thumbnail, 'image');
        if (obj.thumbnail_url) pushValue(obj.thumbnail_url, 'image');
      }

      const rawUrl = extractUrl(item);
      if (!rawUrl) continue;
      const url = convertToPublicUrl(rawUrl.trim());
      if (!url) continue;

      const explicitHint =
        typeof item === 'object'
          ? (item as any).type ?? (item as any).mime_type ?? (item as any).media_type ?? hint
          : hint;

      const nextKind = inferMediaKind(url, explicitHint);
      const currentKind = mediaMap.get(url);

      if (!currentKind || (currentKind === 'image' && nextKind !== 'image')) {
        mediaMap.set(url, nextKind);
      }
    }
  };

  [
    source?.media,
    source?.files,
    source?.file,
    source?.media_items,
    source?.attachments,
    source?.media_urls,
    source?.image,
    source?.image1,
    source?.image2,
    source?.image3,
    source?.image4,
    source?.image_urls,
    source?.video,
    source?.video_urls,
    source?.audio_urls,
    source?.images,
    source?.gallery_images,
    source?.media_url,
    source?.image_url,
    source?.video_url,
    source?.audio_url,
    source?.cover_image_url,
    source?.banner_url,
    source?.logo_url,
    source?.thumbnail_url,
    source?.file_url,
    metadata?.media,
    metadata?.files,
    metadata?.file,
    metadata?.media_items,
    metadata?.attachments,
    metadata?.media_urls,
    metadata?.image,
    metadata?.image1,
    metadata?.image2,
    metadata?.image3,
    metadata?.image4,
    metadata?.image_urls,
    metadata?.video,
    metadata?.video_urls,
    metadata?.audio,
    metadata?.audio_urls,
    metadata?.images,
    metadata?.gallery_images,
    metadata?.cover,
    metadata?.cover_image_url,
    metadata?.thumbnail,
    metadata?.thumbnail_url,
    metadata?.video_url,
    metadata?.audio_url,
    metadata?.file_url,
  ].forEach((entry) => pushValue(entry));

  const entries = [...mediaMap.entries()];

  return {
    images: entries.filter(([, kind]) => kind === 'image').map(([url]) => url),
    videos: entries.filter(([, kind]) => kind === 'video').map(([url]) => url),
    audios: entries.filter(([, kind]) => kind === 'audio').map(([url]) => url),
  };
};

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
        const media = normalizeMemryMedia(p);
        const descriptor = [p.category, p.type, p.product_type].filter(Boolean).join(' ').toLowerCase();
        const normalizedType = String(p.type || '').toLowerCase();
        const isAudioCategory = ['music', 'audio', 'song', 'track'].some((token) => descriptor.includes(token));
        const audioUrl = media.audios[0];
        const videoUrl = media.videos[0];
        const looksLikeMusic = normalizedType === 'music' || isAudioCategory || !!audioUrl;
        const mediaUrl = videoUrl && !looksLikeMusic ? videoUrl : (media.images[0] || videoUrl || FALLBACK_MEDIA);
        const imageUrls = dedupeUrls([
          ...media.images,
          ...(!VIDEO_EXT_RE.test(mediaUrl) ? [mediaUrl] : []),
        ]);

        allPosts.push({
          id: `product-${p.id}`,
          user_id: userId,
          content_type: looksLikeMusic ? 'music' : 'new_product',
          media_url: mediaUrl,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          audio_url: audioUrl,
          caption: `🌱 SEED: ${p.title}`,
          likes_count: p.bestowal_count || 0,
          comments_count: 0,
          product_id: p.id,
          product_price: p.price,
          product_title: p.title,
          product_type: p.product_type || undefined,
          category: p.category || undefined,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
        });
      });

      (orchards || []).forEach((o: any) => {
        const profile = profileMap.get(o.user_id);
        const media = normalizeMemryMedia(o);
        const orchardMediaUrl = media.videos[0] || media.images[0] || FALLBACK_MEDIA;
        const orchardImages = dedupeUrls(media.images);

        allPosts.push({
          id: `orchard-${o.id}`,
          user_id: o.user_id,
          content_type: 'new_orchard',
          media_url: orchardMediaUrl,
          image_urls: orchardImages.length > 0 ? orchardImages : undefined,
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
        const media = normalizeMemryMedia(b);
        const bookMediaUrl = media.videos[0] || media.images[0] || FALLBACK_MEDIA;
        const bookImages = dedupeUrls(media.images);

        allPosts.push({
          id: `book-${b.id}`,
          user_id: userId,
          content_type: 'new_book',
          media_url: bookMediaUrl,
          image_urls: bookImages.length > 0 ? bookImages : undefined,
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
        const media = normalizeMemryMedia(mp);
        const normalizedType = String(mp.content_type || '').toLowerCase();
        const sourceMediaUrl = convertToPublicUrl(String(mp.media_url || '').trim());
        const sourceVideoUrl = convertToPublicUrl(String(mp.video_url || '').trim());
        const sourceImageUrl = convertToPublicUrl(String(mp.image_url || '').trim());
        const primaryVideo = media.videos[0];
        const primaryImage = media.images[0];
        const primaryAudio = media.audios[0];
        const sourceVideoCandidate = sourceVideoUrl || sourceMediaUrl;
        const hasSourceVideo = !!sourceVideoCandidate && VIDEO_EXT_RE.test(sourceVideoCandidate);
        const isVideoType = normalizedType === 'video' || hasSourceVideo;
        const mpMediaUrl = isVideoType
          ? (primaryVideo || sourceVideoCandidate || primaryImage || sourceImageUrl || FALLBACK_MEDIA)
          : (primaryImage || sourceImageUrl || primaryVideo || sourceVideoUrl || sourceMediaUrl || primaryAudio || FALLBACK_MEDIA);
        const mpImages = dedupeUrls(media.images);
        const mpAudio = normalizedType === 'music'
          ? (primaryAudio || (AUDIO_EXT_RE.test(mpMediaUrl) ? mpMediaUrl : undefined))
          : primaryAudio;

        allPosts.push({
          id: mp.id,
          user_id: mp.user_id,
          content_type: isVideoType || (normalizedType !== 'music' && VIDEO_EXT_RE.test(mpMediaUrl))
            ? 'video'
            : (normalizedType || 'photo'),
          media_url: mpMediaUrl,
          image_urls: mpImages.length > 0 ? mpImages : undefined,
          audio_url: mpAudio,
          caption: mp.caption || '',
          likes_count: mp.likes_count || 0,
          comments_count: mp.comments_count || 0,
          profiles: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url, username: profile.username } : undefined,
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
        {posts.map(post => (
          <MemrySeedCard
            key={post.id}
            post={post}
            user={user}
            isFollowing={followedUserIds.has(post.user_id)}
            onLike={handleLike}
            onFollow={handleFollow}
            onOpenComments={handleOpenComments}
            onPrivateMessage={handlePrivateMessage}
          />
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
