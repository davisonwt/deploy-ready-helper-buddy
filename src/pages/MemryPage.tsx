import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Plus, Home, Search, User, 
  Camera, Video, ChefHat, X, Send, Bookmark, Play, Pause,
  MoreHorizontal, Music, Volume2, VolumeX, DollarSign, Gift,
  ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sparkles, ShoppingBag, Trees, Book,
  UserPlus, UserCheck, MessageSquare
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { resolveAudioUrl } from '@/utils/resolveAudioUrl';
import { LiveSessionAdBanner } from '@/components/memry/LiveSessionAdBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

const toHandle = (value?: string) => {
  const v = (value || '').trim().toLowerCase();
  if (!v) return 'sower';
  const slug = v
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'sower';
};

interface MemryPost {
  id: string;
  user_id: string;
  content_type: 'photo' | 'video' | 'recipe' | 'music' | 'marketing_video' | 'new_product' | 'new_orchard' | 'new_book';
  media_url: string;
  image_urls?: string[];
  thumbnail_url?: string;
  audio_url?: string;
  caption: string;
  recipe_title?: string;
  recipe_ingredients?: string[];
  recipe_instructions?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  orchard_id?: string;
  product_id?: string;
  book_id?: string;
  product_price?: number;
  product_title?: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    username: string;
    wallet_address?: string;
  };
  user_liked?: boolean;
  user_bookmarked?: boolean;
  is_notification?: boolean;
  notification_type?: 'new_product' | 'new_orchard' | 'marketing_video' | 'new_book';
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
  replies?: Comment[];
}

// 30-second looping audio preview for music posts on Memry feed
function MusicPreviewPlayer({ mediaUrl, caption, transparent = false, onPreviewEnd, isActive = true }: { mediaUrl: string; caption: string; transparent?: boolean; onPreviewEnd?: () => void; isActive?: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const PREVIEW_DURATION = 30;

  // Resolve the audio URL (handles bare keys + full Supabase URLs)
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    console.log('[MusicPreview] Resolving URL for:', mediaUrl);

    const resolve = async () => {
      let urlToResolve = mediaUrl;

      // Handle manifest.json files (album products)
      if (mediaUrl.includes('manifest.json')) {
        try {
          const resp = await fetch(mediaUrl);
          const manifest = await resp.json();
          if (manifest.tracks && manifest.tracks.length > 0) {
            urlToResolve = manifest.tracks[0].url;
            console.log('[MusicPreview] Extracted first track from manifest:', urlToResolve);
          }
        } catch (err) {
          console.warn('[MusicPreview] Could not parse manifest:', err);
        }
      }

      try {
        const url = await resolveAudioUrl(urlToResolve, { bucketForKeys: 'music-tracks' });
        if (!cancelled) {
          console.log('[MusicPreview] Resolved to:', url);
          setResolvedUrl(url);
        }
      } catch {
        if (!cancelled) setResolvedUrl(urlToResolve);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [mediaUrl]);

  // Play audio once URL is resolved — only when isActive
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;

    // If not active, pause and bail
    if (!isActive) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }

    setLoadError(false);
    audio.src = resolvedUrl;
    audio.load();

    // Try autoplay (may be blocked by browser policy)
    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => setPlaying(true))
        .catch((err) => {
          console.warn('[MusicPreview] Autoplay blocked:', err.message);
          setPlaying(false);
        });
    }

    let previewFinished = false;
    const completePreview = () => {
      if (previewFinished) return;
      previewFinished = true;
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      onPreviewEnd?.();
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= PREVIEW_DURATION) {
        completePreview();
      }
    };

    const onEnded = () => {
      completePreview();
    };

    const onError = () => {
      console.error('[MusicPreview] Audio load error for:', resolvedUrl);
      setLoadError(true);
      setPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, [resolvedUrl, onPreviewEnd, isActive]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !resolvedUrl) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch((err) => {
        console.error('[MusicPreview] Play failed:', err);
      });
    }
  };

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center ${transparent ? '' : 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400'}`}>
      <Music className={`w-24 h-24 text-white/80 mb-6 ${playing ? 'animate-pulse' : ''}`} />
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous" className="hidden" />
      
      {loadError ? (
        <p className="text-white/70 text-sm">⚠️ Could not load audio</p>
      ) : (
        <>
          <div className="flex items-center gap-4 bg-black/30 rounded-full px-6 py-3 backdrop-blur-sm">
            <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
              {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
            <div className="w-48 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(currentTime / PREVIEW_DURATION) * 100}%` }}
              />
            </div>
            <span className="text-white text-xs font-mono">
              {Math.floor(currentTime)}s / {PREVIEW_DURATION}s
            </span>
          </div>
          {!playing && currentTime === 0 && (
            <p className="text-white text-base mt-4 font-semibold animate-bounce">
              ▶ Tap Play to hear 30s preview
            </p>
          )}
          {playing && (
            <p className="text-white/80 text-sm mt-4">🎵 30s Preview</p>
          )}
        </>
      )}
    </div>
  );
}

export default function MemryPage() {
  const navigate = useNavigate();
  const { addToBasket } = useProductBasket();
  const [posts, setPosts] = useState<MemryPost[]>([]);
  const [allPosts, setAllPosts] = useState<MemryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MemryPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'create' | 'recipes' | 'profile'>('feed');
  const [isPlaying, setIsPlaying] = useState(true);
  const [memryImageIndex, setMemryImageIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [donateAmount, setDonateAmount] = useState([5]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverResults, setDiscoverResults] = useState<any[]>([]);
  const [messageCountsByUser, setMessageCountsByUser] = useState<Record<string, number>>({});
  // New post state
  const [newPostType, setNewPostType] = useState<'photo' | 'video' | 'recipe' | 'music'>('photo');
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostFile, setNewPostFile] = useState<File | null>(null);
  const [newPostPreview, setNewPostPreview] = useState<string>('');
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [uploading, setUploading] = useState(false);
  const [inlineChat, setInlineChat] = useState('');
  const [creatorPostIndices, setCreatorPostIndices] = useState<Record<string, number>>({});
  const [creatorImageIndices, setCreatorImageIndices] = useState<Record<string, number>>({});
  const [activeCreatorId, setActiveCreatorId] = useState<string | null>(null);
  const hTouchStartX = useRef<number | null>(null);
  const hTouchCreatorId = useRef<string | null>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
    fetchPosts();
    loadLikedPosts();
    fetchMessageCounts();
  }, []);

  // Show all posts in the feed - the "Home" tab should show everything
  useEffect(() => {
    // Always show all posts in the feed (discovery mode)
    // Users can like posts to curate their experience, but all posts are visible
    setPosts(allPosts);
  }, [allPosts]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      // Load user's liked posts from database
      const { data: likes } = await supabase
        .from('memry_likes')
        .select('post_id')
        .eq('user_id', user.id);
      if (likes) {
        setLikedPostIds(new Set(likes.map(l => l.post_id)));
      }
      // Load user's followed users
      const { data: follows } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);
      if (follows) {
        setFollowedUserIds(new Set(follows.map(f => f.following_id)));
      }
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to follow", variant: "destructive" });
      return;
    }
    if (targetUserId === user.id) return;

    const isFollowing = followedUserIds.has(targetUserId);

    // Optimistic update
    setFollowedUserIds(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetUserId);
      else next.add(targetUserId);
      return next;
    });

    if (isFollowing) {
      await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      toast({ title: "Unfollowed" });
    } else {
      const { error } = await supabase.from('followers').insert({ follower_id: user.id, following_id: targetUserId, source_type: 'profile' });
      if (error && error.code === '23505') {
        toast({ title: "Already following" });
      } else if (!error) {
        toast({ title: "Following! 🌱", description: "You'll see their content in your feed" });
      }
    }
  };

  const loadLikedPosts = async () => {
    // This is now handled in fetchUser for logged-in users
  };

  const saveLikedPosts = (ids: Set<string>) => {
    // No longer using localStorage - using database
  };

  const fetchMessageCounts = async () => {
    try {
      const { data } = await supabase
        .from('activity_feed')
        .select('user_id')
        .eq('action_type', 'new_message');
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(row => {
          counts[row.user_id] = (counts[row.user_id] || 0) + 1;
        });
        setMessageCountsByUser(counts);
      }
    } catch (err) {
      console.warn('Failed to load message counts:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      // Fetch posts from memry_posts database
      const { data: dbPosts, error } = await supabase
        .from('memry_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memry posts:', error);
      }

      // Fetch marketing videos (approved ones with orchard_id)
      const { data: marketingVideos } = await supabase
        .from('community_videos')
        .select('id, uploader_id, video_url, thumbnail_url, title, like_count, comment_count, created_at, orchard_id')
        .eq('status', 'approved')
        .not('orchard_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch ALL products (seeds) - no date limit
      const { data: allProducts } = await supabase
        .from('products')
        .select('*, sower:sowers!products_sower_id_fkey(user_id, display_name, logo_url)')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch ALL orchards - no date limit
      const { data: allOrchards } = await supabase
        .from('orchards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch ALL sower books
      const { data: allBooks } = await supabase
        .from('sower_books')
        .select('*, sower:sowers!sower_books_sower_id_fkey(user_id, display_name, logo_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch ALL music tracks
      const { data: allMusic } = await supabase
        .from('dj_music_tracks')
        .select('*, dj:radio_djs!fk_dj_music_tracks_dj_id(user_id, dj_name, avatar_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      const products = (allProducts || []) as any[];
      const books = (allBooks || []) as any[];
      const music = (allMusic || []) as any[];

      // Get all unique user IDs for profile lookup
      const allUserIds = [
        ...(dbPosts || []).map((p: any) => p.user_id),
        ...products.map((p: any) => p.sower?.user_id).filter(Boolean),
        ...(allOrchards || []).map((o: any) => o.user_id).filter(Boolean),
        ...books.map((b: any) => b.sower?.user_id).filter(Boolean),
        ...music.map((m: any) => m.dj?.user_id).filter(Boolean)
      ].filter(Boolean) as string[];

      const uniqueUserIds = [...new Set(allUserIds)];
      
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', uniqueUserIds);

      const profilesByUserId = new Map(
        (profilesData || []).map((p: any) => [p.user_id, p])
      );

      // Transform memry_posts (photos, videos, recipes uploaded directly to Memry)
      const transformedPosts: MemryPost[] = (dbPosts || []).map(post => {
        const profile = profilesByUserId.get(post.user_id);
        return {
          id: post.id,
          user_id: post.user_id,
          content_type: post.content_type as 'photo' | 'video' | 'recipe' | 'music',
          media_url: post.media_url,
          thumbnail_url: post.thumbnail_url,
          caption: post.caption || '',
          recipe_title: post.recipe_title,
          recipe_ingredients: post.recipe_ingredients,
          recipe_instructions: post.recipe_instructions,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          created_at: post.created_at,
          profiles: profile ? {
            display_name: profile.display_name || 'Anonymous',
            avatar_url: profile.avatar_url || '',
            username: profile.username || 'user'
          } : {
            display_name: 'Anonymous',
            avatar_url: '',
            username: 'user'
          }
        };
      });

      // Transform marketing videos to MemryPost format
      const videosPosts: MemryPost[] = (marketingVideos || []).map((video: any) => {
        const profile = video.uploader_id ? profilesByUserId.get(video.uploader_id) : null;
        const displayName = profile?.display_name || 'Sower';
        const avatarUrl = profile?.avatar_url || '';
        const username = profile?.username || toHandle(displayName);

        return {
          id: `video-${video.id}`,
          user_id: video.uploader_id,
          content_type: 'marketing_video' as const,
          media_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          caption: video.title || '',
          likes_count: video.like_count || 0,
          comments_count: video.comment_count || 0,
          created_at: video.created_at,
          orchard_id: video.orchard_id,
          is_notification: false,
          profiles: {
            display_name: displayName,
            avatar_url: avatarUrl,
            username
          }
        } as MemryPost;
      });

      // Transform ALL products to posts
      const productPosts: MemryPost[] = products.map((product: any) => {
        const sowerUserId = product.sower?.user_id as string | undefined;
        const profile = sowerUserId ? profilesByUserId.get(sowerUserId) : null;

        const displayName = profile?.display_name || product.sower?.display_name || 'Sower';
        const avatarUrl = profile?.avatar_url || product.sower?.logo_url || '';
        const username = profile?.username || toHandle(displayName);

        // Detect if this product is music-related
        const isMusicProduct = (product.category || '').toLowerCase().includes('music') ||
          (product.file_url || '').match(/\.(mp3|wav|ogg|m4a|flac)(\?|$)/i) != null;

        return {
          id: `product-${product.id}`,
          // Use the actual auth user_id from sowers join, fallback to sower_id
          user_id: sowerUserId || product.sower_id || '',
          content_type: 'new_product' as const,
          media_url: product.cover_image_url || '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png',
          image_urls: product.image_urls?.length > 0 ? product.image_urls : undefined,
          audio_url: isMusicProduct ? (product.file_url || undefined) : undefined,
          caption: `🌱 SEED: ${product.title}`,
          likes_count: product.like_count || 0,
          comments_count: 0,
          created_at: product.created_at || new Date().toISOString(),
          product_id: product.id,
          product_price: product.price || 0,
          product_title: product.title,
          is_notification: false,
          notification_type: 'new_product',
          profiles: {
            display_name: displayName,
            avatar_url: avatarUrl,
            username
          }
        };
      });

      // Transform ALL orchards to posts
      const orchardPosts: MemryPost[] = (allOrchards || []).map(orchard => {
        const profile = profilesByUserId.get(orchard.user_id);
        const coverImage = orchard.images && orchard.images.length > 0 
          ? orchard.images[0] 
          : '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';
        return {
          id: `orchard-${orchard.id}`,
          user_id: orchard.user_id,
          content_type: 'new_orchard' as const,
          media_url: coverImage,
          image_urls: orchard.images && orchard.images.length > 1 ? orchard.images : undefined,
          caption: `🌳 ORCHARD: ${orchard.title}`,
          likes_count: orchard.like_count || 0,
          comments_count: 0,
          created_at: orchard.created_at,
          orchard_id: orchard.id,
          is_notification: false,
          notification_type: 'new_orchard',
          profiles: profile ? {
            display_name: profile.display_name || 'Sower',
            avatar_url: profile.avatar_url || '',
            username: profile.username || 'sower'
          } : {
            display_name: 'Sower',
            avatar_url: '',
            username: 'sower'
          }
        };
      });

      // Transform ALL books to posts
      const bookPosts: MemryPost[] = books.map((book: any) => {
        const sowerUserId = book.sower?.user_id as string | undefined;
        const profile = sowerUserId ? profilesByUserId.get(sowerUserId) : null;

        const displayName = profile?.display_name || book.sower?.display_name || 'Sower';
        const avatarUrl = profile?.avatar_url || book.sower?.logo_url || '';
        const username = profile?.username || toHandle(displayName);

        return {
          id: `book-${book.id}`,
          // Use the actual auth user_id from sowers join, fallback to sower_id
          user_id: sowerUserId || book.sower_id || '',
          content_type: 'new_book' as const,
          media_url: book.cover_image_url || '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png',
          image_urls: book.image_urls?.length > 0 ? book.image_urls : undefined,
          caption: `📚 BOOK: ${book.title}`,
          likes_count: 0,
          comments_count: 0,
          created_at: book.created_at,
          book_id: book.id,
          product_price: book.bestowal_value || 0,
          product_title: book.title,
          is_notification: false,
          notification_type: 'new_book',
          profiles: {
            display_name: displayName,
            avatar_url: avatarUrl,
            username
          }
        };
      });

      // Transform ALL music tracks to posts
      const musicPosts: MemryPost[] = music.map((track: any) => {
        const djUserId = track.dj?.user_id as string | undefined;
        const profile = djUserId ? profilesByUserId.get(djUserId) : null;

        const displayName = profile?.display_name || track.dj?.dj_name || track.artist_name || 'Artist';
        const avatarUrl = profile?.avatar_url || track.dj?.avatar_url || '';
        const username = profile?.username || toHandle(displayName);

        return {
          id: `music-${track.id}`,
          // Use the actual auth user_id from radio_djs join, fallback to dj_id
          user_id: djUserId || track.dj_id || '',
          content_type: 'music' as const,
          media_url: track.file_url || track.preview_url || '',
          caption: `🎵 MUSIC: ${track.track_title}`,
          likes_count: 0,
          comments_count: 0,
          created_at: track.created_at,
          is_notification: false,
          profiles: {
            display_name: displayName,
            avatar_url: avatarUrl,
            username
          }
        };
      });

      // Combine all posts and sort by created_at
      const allCombinedPosts = [
        ...transformedPosts, 
        ...videosPosts, 
        ...productPosts, 
        ...orchardPosts,
        ...bookPosts,
        ...musicPosts
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log('Fetched posts:', {
        memryPosts: transformedPosts.length,
        videos: videosPosts.length,
        products: productPosts.length,
        orchards: orchardPosts.length,
        books: bookPosts.length,
        music: musicPosts.length,
        total: allCombinedPosts.length
      });

      setAllPosts(allCombinedPosts);
      setPosts(allCombinedPosts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive"
      });
      return;
    }

    const isCurrentlyLiked = likedPostIds.has(postId);
    
    // Optimistic update
    const newLikedIds = new Set(likedPostIds);
    if (isCurrentlyLiked) {
      newLikedIds.delete(postId);
    } else {
      newLikedIds.add(postId);
    }
    setLikedPostIds(newLikedIds);

    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likes_count: isCurrentlyLiked ? p.likes_count - 1 : p.likes_count + 1, user_liked: !isCurrentlyLiked }
        : p
    ));
    setAllPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likes_count: isCurrentlyLiked ? p.likes_count - 1 : p.likes_count + 1, user_liked: !isCurrentlyLiked }
        : p
    ));

    // Database update
    if (isCurrentlyLiked) {
      await supabase
        .from('memry_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      toast({
        title: "Removed from favorites",
        description: "This post won't appear in your personalized feed"
      });
    } else {
      await supabase
        .from('memry_likes')
        .insert({ post_id: postId, user_id: user.id });
      toast({
        title: "Added to favorites! ❤️",
        description: "This creator's content will appear in your feed"
      });
    }
  };

  const handleDonate = (post: MemryPost) => {
    setSelectedPost(post);
    setShowDonateModal(true);
  };

  const confirmDonate = async () => {
    if (!selectedPost) return;
    
    toast({
      title: "Donation sent! 💝",
      description: `$${donateAmount[0]} USDT sent to ${selectedPost.profiles?.display_name}`
    });
    setShowDonateModal(false);
    setDonateAmount([5]);
  };

  const handleBookmark = async (postId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark posts",
        variant: "destructive"
      });
      return;
    }

    const post = posts.find(p => p.id === postId);
    const isBookmarked = post?.user_bookmarked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, user_bookmarked: !p.user_bookmarked }
        : p
    ));

    if (isBookmarked) {
      await supabase
        .from('memry_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      toast({
        title: "Removed from collection"
      });
    } else {
      await supabase
        .from('memry_bookmarks')
        .insert({ post_id: postId, user_id: user.id });
      toast({
        title: "Saved!",
        description: "Added to your collection"
      });
    }
  };

  const openComments = async (post: MemryPost) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
    
    // Strip prefixes like "product-", "book-", "music-", "orchard-" to get real UUID
    const realPostId = post.id.replace(/^(product|book|music|orchard)-/, '');
    
    // Fetch real comments from database
    const { data: commentsData } = await supabase
      .from('memry_comments')
      .select('*')
      .eq('post_id', realPostId)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      // Fetch profiles for commenters
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('public_profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      const transformedComments: Comment[] = commentsData.map(c => {
        const profile = profilesMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          parent_comment_id: (c as any).parent_comment_id || null,
          profiles: profile ? {
            display_name: profile.display_name || profile.username || 'Sower',
            avatar_url: profile.avatar_url || ''
          } : {
            display_name: 'Sower',
            avatar_url: ''
          }
        };
      });

      // Nest replies under parent comments
      const topLevel = transformedComments.filter(c => !c.parent_comment_id);
      const replies = transformedComments.filter(c => c.parent_comment_id);
      for (const reply of replies) {
        const parent = topLevel.find(c => c.id === reply.parent_comment_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(reply);
        } else {
          topLevel.push(reply); // orphan reply, show at top level
        }
      }
      setComments(topLevel);
    } else {
      setComments([]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !selectedPost) return;
    
    // Strip prefixes like "product-", "book-", "music-", "orchard-" to get real UUID
    const realPostId = selectedPost.id.replace(/^(product|book|music|orchard)-/, '');
    
    const insertData: any = {
      post_id: realPostId,
      user_id: user.id,
      content: newComment.trim()
    };
    if (replyingTo) {
      insertData.parent_comment_id = replyingTo.id;
    }

    const { data: newCommentData, error } = await supabase
      .from('memry_comments')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Comment insert error:', error, insertData);
      toast({
        title: "Error",
        description: error.message || "Could not post comment",
        variant: "destructive"
      });
      return;
    }

    // Fetch current user's profile for display
    const { data: myProfile } = await supabase
      .from('public_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle();

    const comment: Comment = {
      id: newCommentData.id,
      user_id: user.id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      parent_comment_id: replyingTo?.id || null,
      profiles: { 
        display_name: myProfile?.display_name || 'You', 
        avatar_url: myProfile?.avatar_url || '' 
      }
    };
    
    if (replyingTo) {
      // Add reply nested under the parent
      setComments(prev => prev.map(c => 
        c.id === replyingTo.id 
          ? { ...c, replies: [...(c.replies || []), comment] }
          : c
      ));
    } else {
      setComments(prev => [...prev, comment]);
    }
    setNewComment('');
    setReplyingTo(null);
    
    // Update comment count in posts
    setPosts(prev => prev.map(p => 
      p.id === selectedPost.id 
        ? { ...p, comments_count: p.comments_count + 1 }
        : p
    ));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clean up previous preview URL if it was an object URL
      if (newPostPreview && newPostPreview.startsWith('blob:')) {
        URL.revokeObjectURL(newPostPreview);
      }
      
      setNewPostFile(file);
      
      // Use createObjectURL for video/audio for better codec support
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const objectUrl = URL.createObjectURL(file);
        setNewPostPreview(objectUrl);
      } else {
        // Use data URL for images (works better for small files)
        const reader = new FileReader();
        reader.onload = (e) => {
          setNewPostPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create posts",
        variant: "destructive"
      });
      return;
    }

    if (!newPostFile && newPostType !== 'recipe') {
      toast({
        title: "Missing media",
        description: "Please select a photo, video, or music file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      let mediaUrl = '';
      
      if (newPostFile) {
        // Upload file to storage
        const fileExt = newPostFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memry-media')
          .upload(fileName, newPostFile);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('memry-media')
          .getPublicUrl(fileName);
        
        mediaUrl = urlData.publicUrl;
      }

      // Create post in database
      const { error: postError } = await supabase
        .from('memry_posts')
        .insert({
          user_id: user.id,
          content_type: newPostType,
          media_url: mediaUrl || 'https://via.placeholder.com/400',
          caption: newPostCaption,
          recipe_title: newPostType === 'recipe' ? recipeTitle : null,
          recipe_ingredients: newPostType === 'recipe' ? recipeIngredients.split('\n').filter(i => i.trim()) : null,
          recipe_instructions: newPostType === 'recipe' ? recipeInstructions : null
        });

      if (postError) {
        throw postError;
      }

      toast({
        title: "Posted! 🎉",
        description: "Your memry has been shared with the community"
      });
      
      // Reset form and refresh posts
      setShowCreateModal(false);
      setNewPostFile(null);
      setNewPostPreview('');
      setNewPostCaption('');
      setRecipeTitle('');
      setRecipeIngredients('');
      setRecipeInstructions('');
      fetchPosts();
      
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error.message || "Could not create post",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Group posts by creator for dual-axis browsing
  const groupedCreators = useMemo(() => {
    const groups: Record<string, { profile: MemryPost['profiles'], userId: string, posts: MemryPost[] }> = {};
    posts.forEach(post => {
      const uid = post.user_id;
      if (!groups[uid]) groups[uid] = { profile: post.profiles, userId: uid, posts: [] };
      groups[uid].posts.push(post);
    });
    return Object.values(groups).sort((a, b) =>
      new Date(b.posts[0].created_at).getTime() - new Date(a.posts[0].created_at).getTime()
    );
  }, [posts]);

  const navigateCreatorPost = useCallback((userId: string, direction: number) => {
    setCreatorPostIndices(prev => {
      const current = prev[userId] || 0;
      const creator = groupedCreators.find(c => c.userId === userId);
      if (!creator) return prev;
      const newIdx = Math.max(0, Math.min(creator.posts.length - 1, current + direction));
      return { ...prev, [userId]: newIdx };
    });
    setCreatorImageIndices(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (k.startsWith(userId + '-')) delete next[k]; });
      return next;
    });
  }, [groupedCreators]);

  const getCreatorImgIdx = useCallback((userId: string, postIdx: number) =>
    creatorImageIndices[`${userId}-${postIdx}`] || 0, [creatorImageIndices]);

  const setCreatorImgIdx = useCallback((userId: string, postIdx: number, imgIdx: number) => {
    setCreatorImageIndices(prev => ({ ...prev, [`${userId}-${postIdx}`]: imgIdx }));
  }, []);

  // Render media background for a post card
  const renderMedia = (post: MemryPost, creatorUserId: string, postIdx: number, imgIdx: number) => (
    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center">
      {post.content_type === 'video' || post.content_type === 'marketing_video' ? (
        <video
          src={post.media_url}
          className="max-w-[80%] max-h-full object-contain mx-auto"
          autoPlay muted={isMuted} playsInline
          onEnded={() => navigateCreatorPost(creatorUserId, 1)}
        />
      ) : post.content_type === 'music' ? (
        <MusicPreviewPlayer key={post.id} mediaUrl={post.media_url} caption={post.caption} onPreviewEnd={() => navigateCreatorPost(creatorUserId, 1)} />
      ) : post.content_type === 'new_product' || post.content_type === 'new_orchard' || post.content_type === 'new_book' ? (
        <div className="w-full h-full relative flex items-center justify-center max-w-[80%] mx-auto">
          {(() => {
            const allImages = post.image_urls && post.image_urls.length > 1 ? post.image_urls : [post.media_url];
            const hasMultiple = allImages.length > 1;
            return (
              <>
                <img src={allImages[imgIdx] || post.media_url} alt={post.caption} className="max-w-full max-h-full object-contain"
                  onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png'; } }} />
                {hasMultiple && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); setCreatorImgIdx(creatorUserId, postIdx, Math.max(0, imgIdx - 1)); }} disabled={imgIdx === 0}
                      className="absolute left-[15%] top-1/2 -translate-y-1/2 z-[60] w-12 h-12 rounded-full bg-white/90 hover:bg-white text-black disabled:opacity-20 flex items-center justify-center shadow-lg">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setCreatorImgIdx(creatorUserId, postIdx, Math.min(allImages.length - 1, imgIdx + 1)); }} disabled={imgIdx === allImages.length - 1}
                      className="absolute right-[15%] top-1/2 -translate-y-1/2 z-[60] w-12 h-12 rounded-full bg-white/90 hover:bg-white text-black disabled:opacity-20 flex items-center justify-center shadow-lg">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full z-10">{imgIdx + 1}/{allImages.length}</div>
                  </>
                )}
              </>
            );
          })()}
          {post.audio_url && (
            <div className="absolute inset-0 flex items-center justify-center z-5">
              <MusicPreviewPlayer mediaUrl={post.audio_url} caption={post.caption} transparent />
            </div>
          )}
          <div className="absolute top-20 left-4 right-4 z-10">
            <Badge className={`px-4 py-2 text-sm font-bold ${post.content_type === 'new_product' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : post.content_type === 'new_book' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'} text-white animate-pulse`}>
              {post.content_type === 'new_product' ? (<><ShoppingBag className="w-4 h-4 mr-2 inline" /> NEW SEED AVAILABLE</>) : post.content_type === 'new_book' ? (<><Book className="w-4 h-4 mr-2 inline" /> NEW BOOK AVAILABLE</>) : (<><Trees className="w-4 h-4 mr-2 inline" /> NEW ORCHARD PLANTED</>)}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center max-w-[80%] mx-auto">
          <img src={post.media_url} alt={post.caption} className="max-w-full max-h-full object-contain mx-auto"
            onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png'; } }} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
    </div>
  );

  // Render right-side action buttons for a post
  const renderActions = (post: MemryPost) => (
    <div className="absolute right-4 top-28 bottom-32 flex flex-col items-center justify-end gap-4 z-40 overflow-y-auto">
      <HoverCard>
        <HoverCardTrigger asChild>
          <Link to={`/member/${post.user_id}`} className="flex flex-col items-center">
            <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white">{post.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </Link>
        </HoverCardTrigger>
        <HoverCardContent side="left" className="w-64 bg-black/80 backdrop-blur-md border-white/20 text-white">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14 border-2 border-white/50"><AvatarImage src={post.profiles?.avatar_url} /><AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white">{post.profiles?.display_name?.[0] || 'U'}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{post.profiles?.display_name || 'Sower'}</p><p className="text-xs text-white/60">@{toHandle(post.profiles?.username || post.profiles?.display_name)}</p></div>
          </div>
          <Button asChild size="sm" className="w-full mt-3 bg-white text-black hover:bg-white/90 border-0"><Link to={`/member/${post.user_id}`}>View Profile</Link></Button>
        </HoverCardContent>
      </HoverCard>

      {user && post.user_id !== user.id && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleFollow(post.user_id)} className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${followedUserIds.has(post.user_id) ? 'bg-emerald-500' : 'bg-pink-500'}`}>
            {followedUserIds.has(post.user_id) ? <UserCheck className="w-5 h-5 text-white" /> : <UserPlus className="w-5 h-5 text-white" />}
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow">{followedUserIds.has(post.user_id) ? 'Following' : 'Follow'}</span>
        </motion.button>
      )}

      {user && post.user_id !== user.id && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={async () => {
          if (!user) { toast({ title: "Sign in required", description: "Please sign in to message", variant: "destructive" }); return; }
          try {
            const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', { user1_id: user.id, user2_id: post.user_id });
            if (error) throw error;
            if (!roomId) throw new Error('No room ID returned');
            supabase.from('activity_feed').insert({ user_id: post.user_id, actor_id: user.id, action_type: 'new_message', content: 'Someone sent you a message about your seed', entity_type: 'chat_room', entity_id: roomId, mode_type: 'chatapp', metadata: { seed_id: post.id, seed_caption: post.caption?.slice(0, 100) } });
            navigate(`/communications-hub?room=${roomId}`);
          } catch (error: any) {
            console.error('Error starting direct chat:', error);
            toast({ title: "Error", description: error?.message || "Could not start chat", variant: "destructive" });
          }
        }} className="flex flex-col items-center gap-1">
          <div className="relative w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-md">
            <MessageSquare className="w-5 h-5 text-white" />
            {(messageCountsByUser[post.user_id] || 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {messageCountsByUser[post.user_id] > 99 ? '99+' : messageCountsByUser[post.user_id]}
              </span>
            )}
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow">Message</span>
        </motion.button>
      )}

      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleLike(post.id)} className="flex flex-col items-center gap-1">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${post.user_liked || likedPostIds.has(post.id) ? 'bg-pink-500' : 'bg-white/20 backdrop-blur-sm'}`}>
          <Heart className={`w-6 h-6 ${post.user_liked || likedPostIds.has(post.id) ? 'text-white fill-white' : 'text-white'}`} />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow">{post.likes_count}</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDonate(post)} className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow">Donate</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.9 }} onClick={() => openComments(post)} className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow">{post.comments_count}</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleBookmark(post.id)} className="flex flex-col items-center gap-1">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${post.user_bookmarked ? 'bg-amber-500' : 'bg-white/20 backdrop-blur-sm'}`}>
          <Bookmark className={`w-6 h-6 ${post.user_bookmarked ? 'text-white fill-white' : 'text-white'}`} />
        </div>
      </motion.button>

      <motion.button whileTap={{ scale: 0.9 }} onClick={async () => {
        const shareUrl = `${window.location.origin}/memry?post=${post.id}`;
        try {
          if (navigator.share) { await navigator.share({ title: 'S2G Memry', text: post.caption || `Check out this post by ${post.profiles?.display_name}`, url: shareUrl }); toast({ title: "Shared!" }); }
          else { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied!" }); }
        } catch (error: any) {
          if (error.name !== 'AbortError') { await navigator.clipboard.writeText(shareUrl); toast({ title: "Link copied!" }); }
        }
      }} className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Share2 className="w-6 h-6 text-white" />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow">Share</span>
      </motion.button>

      {(post.content_type === 'video' || post.content_type === 'marketing_video') && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </div>
        </motion.button>
      )}
    </div>
  );

  // Render bottom info panel for a post
  const renderInfoPanel = (post: MemryPost) => (
    <div className="absolute bottom-36 left-4 right-20 z-40 max-h-[45vh] overflow-y-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-black/40 backdrop-blur-md rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Link to={`/member/${post.user_id}`} className="flex-shrink-0">
                <Avatar className="w-10 h-10 border-2 border-white/50 cursor-pointer">
                  <AvatarImage src={post.profiles?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-sm">{post.profiles?.display_name?.[0] || 'S'}</AvatarFallback>
                </Avatar>
              </Link>
            </HoverCardTrigger>
            <HoverCardContent side="top" className="w-64 bg-black/80 backdrop-blur-md border-white/20 text-white">
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14 border-2 border-white/50"><AvatarImage src={post.profiles?.avatar_url} /><AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white">{post.profiles?.display_name?.[0] || 'S'}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{post.profiles?.display_name || 'Sower'}</p><p className="text-xs text-white/60">@{toHandle(post.profiles?.username || post.profiles?.display_name)}</p></div>
              </div>
              <Button asChild size="sm" className="w-full mt-3 bg-white text-black hover:bg-white/90 border-0"><Link to={`/member/${post.user_id}`}>View Profile</Link></Button>
            </HoverCardContent>
          </HoverCard>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-base drop-shadow truncate">{post.profiles?.display_name || 'Sower'}</span>
              {post.content_type === 'recipe' && <span className="px-2 py-0.5 bg-orange-500 rounded-full text-xs text-white font-semibold flex-shrink-0"><ChefHat className="w-3 h-3 inline mr-1" />Recipe</span>}
              {post.content_type === 'marketing_video' && <span className="px-2 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-xs text-white font-semibold flex-shrink-0"><Video className="w-3 h-3 inline mr-1" />Marketing</span>}
              {post.content_type === 'new_product' && <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-xs text-white font-semibold flex-shrink-0"><ShoppingBag className="w-3 h-3 inline mr-1" />Seed</span>}
              {post.content_type === 'new_orchard' && <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs text-white font-semibold flex-shrink-0"><Trees className="w-3 h-3 inline mr-1" />Orchard</span>}
              {post.content_type === 'music' && <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full text-xs text-white font-semibold flex-shrink-0"><Music className="w-3 h-3 inline mr-1" />Music</span>}
              {post.content_type === 'new_book' && <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full text-xs text-white font-semibold flex-shrink-0"><Book className="w-3 h-3 inline mr-1" />Book</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs">@{post.profiles?.username || 'sower'}</span>
              {user && post.user_id !== user.id && (
                <button onClick={() => handleFollow(post.user_id)} className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${followedUserIds.has(post.user_id) ? 'bg-white/20 text-white/80' : 'bg-pink-500 text-white'}`}>
                  {followedUserIds.has(post.user_id) ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        {post.content_type === 'recipe' && post.recipe_title && <h3 className="text-white font-bold text-lg mb-1 drop-shadow">{post.recipe_title}</h3>}
        <p className="text-white/90 text-sm line-clamp-2 drop-shadow mb-3">{post.caption}</p>

        {post.content_type === 'recipe' && post.recipe_ingredients && (
          <div className="mb-3 p-2 bg-white/10 rounded-lg">
            <p className="text-white/80 text-xs">📝 {post.recipe_ingredients.slice(0, 3).join(' • ')}{post.recipe_ingredients.length > 3 && ' • ...'}</p>
          </div>
        )}

        {user && post.user_id !== user.id && (
          <div className="flex items-center gap-2 mb-3">
            <Input
              placeholder={`Message ${post.profiles?.display_name || 'sower'}...`}
              value={inlineChat}
              onChange={(e) => setInlineChat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inlineChat.trim()) {
                  e.preventDefault();
                  const realPostId = post.id.replace(/^(product|book|music|orchard)-/, '');
                  supabase.from('memry_comments').insert({ post_id: realPostId, user_id: user.id, content: inlineChat.trim() }).then(({ error }) => {
                    if (!error) { toast({ title: "Message sent! 💬" }); setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments_count: p.comments_count + 1 } : p)); setInlineChat(''); }
                    else { toast({ title: "Error", description: error.message, variant: "destructive" }); }
                  });
                }
              }}
              className="flex-1 h-8 text-xs rounded-full px-3 !bg-input-bg !border-input-border !text-input-text placeholder:!text-input-placeholder focus:!border-input-border-focus focus:!ring-input-border-focus/20"
            />
            <button
              onClick={() => {
                if (!inlineChat.trim()) return;
                const realPostId = post.id.replace(/^(product|book|music|orchard)-/, '');
                supabase.from('memry_comments').insert({ post_id: realPostId, user_id: user.id, content: inlineChat.trim() }).then(({ error }) => {
                  if (!error) { toast({ title: "Message sent! 💬" }); setPosts(prev => prev.map(p => p.id === post.id ? { ...p, comments_count: p.comments_count + 1 } : p)); setInlineChat(''); }
                  else { toast({ title: "Error", description: error.message, variant: "destructive" }); }
                });
              }}
              className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        )}

        {(post.content_type === 'marketing_video' || post.content_type === 'new_orchard') && post.orchard_id && (
          <Button onClick={() => navigate(`/orchard/${post.orchard_id}`)} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold shadow-lg" size="lg">
            <Gift className="w-5 h-5 mr-2" /> Bestow & Get This Seed
          </Button>
        )}
        {post.content_type === 'new_product' && post.product_id && (
          <Button onClick={() => {
            const productId = post.product_id?.replace('product-', '') || post.product_id || '';
            addToBasket({ id: productId, title: post.product_title || post.caption.replace('🌱 SEED: ', ''), price: post.product_price || 0, cover_image_url: post.media_url, sower_id: post.user_id, bestowal_count: 1, sowers: { display_name: post.profiles?.display_name || 'Sower' } });
            toast({ title: "Added to basket! 🛒", description: "Redirecting to checkout..." });
            navigate('/products/basket');
          }} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold shadow-lg" size="lg">
            <Gift className="w-5 h-5 mr-2" /> Bestow & Get This Seed
          </Button>
        )}
        {post.content_type === 'new_book' && post.book_id && (
          <Button onClick={() => {
            const bookId = post.book_id?.replace('book-', '') || post.book_id || '';
            addToBasket({ id: bookId, title: post.product_title || post.caption.replace('📚 BOOK: ', ''), price: post.product_price || 0, cover_image_url: post.media_url, sower_id: post.user_id, bestowal_count: 1, sowers: { display_name: post.profiles?.display_name || 'Sower' } });
            toast({ title: "Book added to basket! 📚", description: "Redirecting to checkout..." });
            navigate('/products/basket');
          }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg" size="lg">
            <Book className="w-5 h-5 mr-2" /> Bestow & Get This Book
          </Button>
        )}
        {post.content_type === 'music' && (
          <Button onClick={() => navigate('/community-music-library')} className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-bold shadow-lg" size="lg">
            <Gift className="w-5 h-5 mr-2" /> Bestow & Get This Track
          </Button>
        )}
        {(post.content_type === 'photo' || post.content_type === 'video' || post.content_type === 'recipe') && (
          <Button onClick={() => handleDonate(post)} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg" size="lg">
            <Gift className="w-5 h-5 mr-2" /> Support This Creator
          </Button>
        )}
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-b from-[#FFF5E6] via-[#FFECD2] to-[#FFE4C4] overflow-hidden">
      {/* Live Session Ad Banner */}
      <LiveSessionAdBanner />
      {/* Main Feed - TikTok Style */}
      <div className="h-full relative">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-[56px] left-0 right-0 z-30 px-4 py-3 bg-gradient-to-b from-black/30 to-transparent"
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
              </Link>
              <h1 className="text-2xl font-black text-white drop-shadow-lg tracking-tight">
                s2g memry
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* === DISCOVER TAB === */}
        {activeTab === 'discover' && (
          <div className="h-full flex flex-col p-4 pt-20 pb-24 overflow-y-auto">
            <div className="max-w-lg mx-auto w-full space-y-4">
              <Input
                placeholder="Search users, sowers, content..."
                value={discoverSearch}
                onChange={async (e) => {
                  const q = e.target.value;
                  setDiscoverSearch(q);
                  if (q.trim().length < 2) { setDiscoverResults([]); return; }
                  const { data } = await supabase
                    .from('public_profiles')
                    .select('user_id, display_name, username, avatar_url')
                    .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
                    .limit(20);
                  setDiscoverResults(data || []);
                }}
                className="bg-white/80 border-orange-200 text-orange-900 placeholder:text-orange-400 rounded-full"
              />
              {discoverResults.length > 0 ? (
                <div className="space-y-2">
                  {discoverResults.map((u: any) => (
                    <Link key={u.user_id} to={`/member/${u.user_id}`} className="flex items-center gap-3 p-3 bg-white/60 backdrop-blur rounded-xl no-underline">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-sm">
                          {u.display_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-orange-800 text-sm">{u.display_name || 'Sower'}</p>
                        {u.username && <p className="text-xs text-orange-500">@{u.username}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : discoverSearch.trim().length >= 2 ? (
                <p className="text-center text-orange-500 mt-8">No results found</p>
              ) : (
                <p className="text-center text-orange-400 mt-8">Type to search for users and content</p>
              )}
            </div>
          </div>
        )}

        {/* === RECIPES TAB === */}
        {activeTab === 'recipes' && (
          <div className="h-full flex flex-col p-4 pt-20 pb-24 overflow-y-auto">
            <div className="max-w-lg mx-auto w-full space-y-4">
              <h2 className="text-xl font-bold text-orange-800">Community Recipes</h2>
              {allPosts.filter(p => p.content_type === 'recipe').length === 0 ? (
                <div className="text-center py-12">
                  <ChefHat className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                  <p className="text-orange-600">No recipes shared yet</p>
                  <Button onClick={() => { setNewPostType('recipe'); setShowCreateModal(true); }} className="mt-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Share a Recipe
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {allPosts.filter(p => p.content_type === 'recipe').map((recipe) => (
                    <motion.div
                      key={recipe.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        for (const creator of groupedCreators) {
                          const pIdx = creator.posts.findIndex(p => p.id === recipe.id);
                          if (pIdx >= 0) {
                            setCreatorPostIndices(prev => ({ ...prev, [creator.userId]: pIdx }));
                            setActiveTab('feed');
                            setTimeout(() => document.getElementById(`creator-row-${creator.userId}`)?.scrollIntoView({ behavior: 'smooth' }), 100);
                            break;
                          }
                        }
                      }}
                      className="bg-white/60 backdrop-blur rounded-xl overflow-hidden cursor-pointer"
                    >
                      {recipe.media_url && (
                        <img src={recipe.media_url} alt="" className="w-full h-28 object-cover" />
                      )}
                      <div className="p-2">
                        <p className="text-sm font-semibold text-orange-800 line-clamp-2">{recipe.caption || 'Recipe'}</p>
                        <p className="text-xs text-orange-500 mt-1">{recipe.profiles?.display_name}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === PROFILE TAB === */}
        {activeTab === 'profile' && (
          <div className="h-full flex flex-col p-4 pt-20 pb-24 overflow-y-auto">
            <div className="max-w-lg mx-auto w-full space-y-4">
              {user ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur rounded-2xl">
                    <Avatar className="w-16 h-16 border-2 border-orange-300">
                      <AvatarImage src={allPosts.find(p => p.user_id === user.id)?.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-xl">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg text-orange-800">My Memries</h3>
                      <p className="text-sm text-orange-500">{allPosts.filter(p => p.user_id === user.id).length} posts</p>
                    </div>
                  </div>
                  {allPosts.filter(p => p.user_id === user.id).length === 0 ? (
                    <div className="text-center py-12">
                      <Camera className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                      <p className="text-orange-600">You haven't posted yet</p>
                      <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-gradient-to-r from-pink-500 to-orange-500 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Create Your First Memry
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1">
                      {allPosts.filter(p => p.user_id === user.id).map((post) => (
                        <motion.div
                          key={post.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            for (const creator of groupedCreators) {
                              const pIdx = creator.posts.findIndex(p => p.id === post.id);
                              if (pIdx >= 0) {
                                setCreatorPostIndices(prev => ({ ...prev, [creator.userId]: pIdx }));
                                setActiveTab('feed');
                                setTimeout(() => document.getElementById(`creator-row-${creator.userId}`)?.scrollIntoView({ behavior: 'smooth' }), 100);
                                break;
                              }
                            }
                          }}
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer relative"
                        >
                          {post.content_type === 'video' ? (
                            <video src={post.media_url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={post.media_url || '/placeholder.svg'} alt="" className="w-full h-full object-cover" />
                          )}
                          {post.content_type === 'recipe' && (
                            <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
                              <ChefHat className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-orange-300 mx-auto mb-4" />
                  <p className="text-orange-600">Sign in to see your Memries</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === FEED TAB (main content) === */}
        {activeTab === 'feed' && (
        <>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-orange-800 font-medium">Loading memries...</p>
            </div>
          </div>
        ) : groupedCreators.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <Camera className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-orange-800 mb-2">No memries yet</h3>
              <p className="text-orange-600 mb-4">Be the first to share a photo, video, or recipe with the community!</p>
              <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-pink-500 to-orange-500 text-white">
                <Plus className="w-4 h-4 mr-2" /> Create First Memry
              </Button>
            </div>
          </div>
        ) : (
        <div className="h-full overflow-y-auto" style={{ scrollSnapType: 'y mandatory' }}>
          {groupedCreators.map((creator) => {
            const postIdx = creatorPostIndices[creator.userId] || 0;
            const post = creator.posts[postIdx];
            const totalPosts = creator.posts.length;
            const imgIdx = getCreatorImgIdx(creator.userId, postIdx);

            if (!post) return null;

            return (
              <div
                key={creator.userId}
                id={`creator-row-${creator.userId}`}
                className="h-full relative"
                style={{ scrollSnapAlign: 'start' }}
                onTouchStart={(e) => {
                  hTouchStartX.current = e.touches[0].clientX;
                  hTouchCreatorId.current = creator.userId;
                }}
                onTouchEnd={(e) => {
                  if (hTouchStartX.current === null || hTouchCreatorId.current !== creator.userId) return;
                  const deltaX = hTouchStartX.current - e.changedTouches[0].clientX;
                  if (Math.abs(deltaX) > 60) {
                    navigateCreatorPost(creator.userId, deltaX > 0 ? 1 : -1);
                  }
                  hTouchStartX.current = null;
                }}
              >
                {renderMedia(post, creator.userId, postIdx, imgIdx)}

                {/* Horizontal Post Navigation */}
                {totalPosts > 1 && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
                    <button
                      onClick={() => navigateCreatorPost(creator.userId, -1)}
                      disabled={postIdx === 0}
                      className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-white text-xs font-bold bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
                      {postIdx + 1} / {totalPosts}
                    </span>
                    <button
                      onClick={() => navigateCreatorPost(creator.userId, 1)}
                      disabled={postIdx === totalPosts - 1}
                      className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white disabled:opacity-30 transition-opacity"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {renderActions(post)}
                {renderInfoPanel(post)}

                {/* Scroll indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                  <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-white/50 text-xs">
                    ↕ Scroll for more creators
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
        )}
        </>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[env(safe-area-inset-bottom,8px)] pt-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-around bg-white/15 backdrop-blur-xl rounded-full py-1.5 px-1">
              <button 
                className={`flex flex-col items-center px-3 py-1 rounded-xl transition-colors ${activeTab === 'feed' ? 'text-pink-400 bg-white/10' : 'text-white/70'}`}
                onClick={() => setActiveTab('feed')}
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Home</span>
              </button>
              <button 
                className={`flex flex-col items-center px-3 py-1 rounded-xl transition-colors ${activeTab === 'discover' ? 'text-pink-400 bg-white/10' : 'text-white/70'}`}
                onClick={() => setActiveTab('discover')}
              >
                <Search className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Discover</span>
              </button>
              <button 
                className="flex flex-col items-center px-2 py-1"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="w-10 h-7 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </button>
              <button 
                className={`flex flex-col items-center px-3 py-1 rounded-xl transition-colors ${activeTab === 'recipes' ? 'text-pink-400 bg-white/10' : 'text-white/70'}`}
                onClick={() => setActiveTab('recipes')}
              >
                <ChefHat className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Recipes</span>
              </button>
              <button 
                className={`flex flex-col items-center px-3 py-1 rounded-xl transition-colors ${activeTab === 'profile' ? 'text-pink-400 bg-white/10' : 'text-white/70'}`}
                onClick={() => setActiveTab('profile')}
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md bg-gradient-to-b from-[#FFF5E6] to-[#FFECD2] border-none rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-orange-800">Create Memry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Type Selection */}
            <Tabs value={newPostType} onValueChange={(v) => setNewPostType(v as any)}>
              <TabsList className="grid grid-cols-4 bg-orange-100">
                <TabsTrigger value="photo" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">
                  <Camera className="w-4 h-4 mr-1" /> Photo
                </TabsTrigger>
                <TabsTrigger value="video" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">
                  <Video className="w-4 h-4 mr-1" /> Video
                </TabsTrigger>
                <TabsTrigger value="music" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">
                  <Music className="w-4 h-4 mr-1" /> Music
                </TabsTrigger>
                <TabsTrigger value="recipe" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs">
                  <ChefHat className="w-4 h-4 mr-1" /> Recipe
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Media Upload */}
            <div className="relative">
              {newPostPreview ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  {newPostType === 'video' ? (
                    <video src={newPostPreview} className="w-full h-full object-cover" controls />
                  ) : newPostType === 'music' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                      <Music className="w-16 h-16 text-white mb-4" />
                      <audio src={newPostPreview} controls className="w-4/5" />
                      <p className="text-white text-sm mt-2">{newPostFile?.name}</p>
                    </div>
                  ) : (
                    <img src={newPostPreview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => { setNewPostFile(null); setNewPostPreview(''); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors">
                  <input
                    type="file"
                    accept={
                      newPostType === 'video' ? 'video/*' : 
                      newPostType === 'music' ? 'audio/*' : 
                      'image/*'
                    }
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {newPostType === 'video' ? (
                    <Video className="w-12 h-12 text-orange-300 mb-2" />
                  ) : newPostType === 'music' ? (
                    <Music className="w-12 h-12 text-orange-300 mb-2" />
                  ) : (
                    <Camera className="w-12 h-12 text-orange-300 mb-2" />
                  )}
                  <span className="text-orange-400 font-medium">
                    Tap to add {newPostType}
                  </span>
                </label>
              )}
            </div>

            {/* Recipe Fields */}
            {newPostType === 'recipe' && (
              <div className="space-y-3">
                <Input
                  placeholder="Recipe title..."
                  value={recipeTitle}
                  onChange={(e) => setRecipeTitle(e.target.value)}
                  className="bg-white/50 border-orange-200 text-orange-900 placeholder:text-orange-400"
                />
                <Textarea
                  placeholder="Ingredients (one per line)..."
                  value={recipeIngredients}
                  onChange={(e) => setRecipeIngredients(e.target.value)}
                  className="bg-white/50 border-orange-200 min-h-[80px] text-orange-900 placeholder:text-orange-400"
                />
                <Textarea
                  placeholder="Instructions..."
                  value={recipeInstructions}
                  onChange={(e) => setRecipeInstructions(e.target.value)}
                  className="bg-white/50 border-orange-200 min-h-[80px] text-orange-900 placeholder:text-orange-400"
                />
              </div>
            )}

            {/* Caption */}
            <Textarea
              placeholder="Write a caption... ✨"
              value={newPostCaption}
              onChange={(e) => setNewPostCaption(e.target.value)}
              className="bg-white/50 border-orange-200 min-h-[80px] text-orange-900 placeholder:text-orange-400"
            />

            {/* Post Button */}
            <Button
              onClick={handleCreatePost}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold py-6 rounded-2xl"
            >
              {uploading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                'Share Memry 💝'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={showCommentsModal} onOpenChange={setShowCommentsModal}>
        <DialogContent className="max-w-md bg-gradient-to-b from-[#FFF5E6] to-[#FFECD2] border-none rounded-t-3xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-800">Comments</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white text-sm">
                        {comment.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-bold text-orange-800">{comment.profiles?.display_name}</span>{' '}
                        <span className="text-orange-700">{comment.content}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-orange-400">Just now</p>
                        {user && (
                          <button
                            onClick={() => {
                              setReplyingTo(comment);
                              setNewComment(`@${comment.profiles?.display_name} `);
                            }}
                            className="text-xs font-semibold text-orange-500 hover:text-orange-700"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                    <button className="self-start">
                      <Heart className="w-4 h-4 text-orange-300" />
                    </button>
                  </motion.div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 mt-2 space-y-3 border-l-2 border-orange-200 pl-3">
                      {comment.replies.map((reply) => (
                        <motion.div
                          key={reply.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-2"
                        >
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={reply.profiles?.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-br from-teal-400 to-blue-400 text-white text-[10px]">
                              {reply.profiles?.display_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-xs">
                              <span className="font-bold text-orange-800">{reply.profiles?.display_name}</span>{' '}
                              <span className="text-orange-700">{reply.content}</span>
                            </p>
                            <p className="text-[10px] text-orange-400 mt-0.5">Just now</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between px-2 py-1 bg-orange-100 rounded-lg text-xs text-orange-700">
              <span>Replying to <strong>{replyingTo.profiles?.display_name}</strong></span>
              <button onClick={() => { setReplyingTo(null); setNewComment(''); }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex gap-2 mt-2 pt-4 border-t border-orange-200">
            <Input
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              className="bg-white/50 border-orange-200 text-orange-900 placeholder:text-orange-400"
            />
            <Button
              onClick={handleAddComment}
              className="bg-gradient-to-r from-pink-500 to-orange-500 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Donate Modal */}
      <Dialog open={showDonateModal} onOpenChange={setShowDonateModal}>
        <DialogContent className="max-w-md bg-gradient-to-b from-[#FFF5E6] to-[#FFECD2] border-none rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-orange-800 flex items-center gap-2">
              <Gift className="w-6 h-6 text-emerald-500" />
              Donate to Creator
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Creator Info */}
            <div className="flex items-center gap-4 p-4 bg-white/50 rounded-2xl">
              <Avatar className="w-16 h-16 border-2 border-emerald-400">
                <AvatarImage src={selectedPost?.profiles?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-xl">
                  {selectedPost?.profiles?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg text-orange-800">{selectedPost?.profiles?.display_name}</h3>
                <p className="text-sm text-orange-500">@{selectedPost?.profiles?.username}</p>
              </div>
            </div>

            {/* Amount Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-orange-700 font-medium">Donation Amount</span>
                <span className="text-2xl font-black text-emerald-600">${donateAmount[0]} USDT</span>
              </div>
              <Slider
                value={donateAmount}
                onValueChange={setDonateAmount}
                min={0.5}
                max={100}
                step={0.5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-orange-400">
                <span>$0.50</span>
                <span>$100</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 5, 10, 25].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setDonateAmount([amount])}
                  className={`border-orange-300 ${donateAmount[0] === amount ? 'bg-emerald-100 border-emerald-400' : ''}`}
                >
                  ${amount}
                </Button>
              ))}
            </div>

            {/* Confirm Button */}
            <Button
              onClick={confirmDonate}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-6 rounded-2xl"
            >
              <Gift className="w-5 h-5 mr-2" />
              Send ${donateAmount[0]} USDT
            </Button>

            <p className="text-xs text-center text-orange-400">
              15% goes to platform (10% tithing + 5% admin)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
