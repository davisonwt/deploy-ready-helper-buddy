import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Plus, Home, Search, User, 
  Camera, Video, ChefHat, X, Send, Bookmark, Play, Pause,
  MoreHorizontal, Music, Volume2, VolumeX, DollarSign, Gift,
  ArrowLeft, ChevronUp, ChevronDown, Sparkles, ShoppingBag, Trees
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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

interface MemryPost {
  id: string;
  user_id: string;
  content_type: 'photo' | 'video' | 'recipe' | 'music' | 'marketing_video' | 'new_product' | 'new_orchard';
  media_url: string;
  thumbnail_url?: string;
  caption: string;
  recipe_title?: string;
  recipe_ingredients?: string[];
  recipe_instructions?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  orchard_id?: string;
  product_id?: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    username: string;
    wallet_address?: string;
  };
  user_liked?: boolean;
  user_bookmarked?: boolean;
  is_notification?: boolean;
  notification_type?: 'new_product' | 'new_orchard' | 'marketing_video';
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
}

export default function MemryPage() {
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'create' | 'profile'>('feed');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [donateAmount, setDonateAmount] = useState([5]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  // New post state
  const [newPostType, setNewPostType] = useState<'photo' | 'video' | 'recipe' | 'music'>('photo');
  const [newPostCaption, setNewPostCaption] = useState('');
  const [newPostFile, setNewPostFile] = useState<File | null>(null);
  const [newPostPreview, setNewPostPreview] = useState<string>('');
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchPosts();
    loadLikedPosts();
  }, []);

  // Filter posts to only show loved ones in feed
  useEffect(() => {
    if (activeTab === 'feed') {
      // Show only loved posts for the user's feed
      const lovedPosts = allPosts.filter(post => likedPostIds.has(post.id) || post.user_liked);
      setPosts(lovedPosts.length > 0 ? lovedPosts : allPosts);
    } else {
      setPosts(allPosts);
    }
  }, [activeTab, allPosts, likedPostIds]);

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
    }
  };

  const loadLikedPosts = async () => {
    // This is now handled in fetchUser for logged-in users
  };

  const saveLikedPosts = (ids: Set<string>) => {
    // No longer using localStorage - using database
  };

  const fetchPosts = async () => {
    try {
      // Fetch posts from database
      const { data: dbPosts, error } = await supabase
        .from('memry_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
      }

      // Fetch marketing videos (approved ones with orchard_id)
      const { data: marketingVideos } = await supabase
        .from('community_videos')
        .select('*, profiles:uploader_profile_id(display_name, avatar_url, username)')
        .eq('status', 'approved')
        .not('orchard_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch recent products (last 7 days as "new" notifications)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentProducts } = await supabase
        .from('products')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent orchards (last 7 days as "new" notifications)
      const { data: recentOrchards } = await supabase
        .from('orchards')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      // Get all unique user IDs for profile lookup
      const allUserIds = [
        ...(dbPosts || []).map(p => p.user_id),
        ...(recentProducts || []).map(p => p.sower_id).filter(Boolean),
        ...(recentOrchards || []).map(o => o.user_id).filter(Boolean)
      ].filter(Boolean) as string[];

      const uniqueUserIds = [...new Set(allUserIds)];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, avatar_url, username')
        .in('user_id', uniqueUserIds);

      const profilesByUserId = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Transform memry_posts
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
      const videosPosts: MemryPost[] = (marketingVideos || []).map(video => ({
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
        profiles: video.profiles ? {
          display_name: video.profiles.display_name || 'Sower',
          avatar_url: video.profiles.avatar_url || '',
          username: video.profiles.username || 'sower'
        } : {
          display_name: 'Sower',
          avatar_url: '',
          username: 'sower'
        }
      }));

      // Transform recent products to notification posts
      const productPosts: MemryPost[] = (recentProducts || []).map(product => {
        const profile = product.sower_id ? profilesByUserId.get(product.sower_id) : null;
        return {
          id: `product-${product.id}`,
          user_id: product.sower_id || '',
          content_type: 'new_product' as const,
          media_url: product.cover_image_url || '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png',
          caption: `🌱 NEW SEED: ${product.title}`,
          likes_count: product.like_count || 0,
          comments_count: 0,
          created_at: product.created_at || new Date().toISOString(),
          product_id: product.id,
          is_notification: true,
          notification_type: 'new_product',
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

      // Transform recent orchards to notification posts
      const orchardPosts: MemryPost[] = (recentOrchards || []).map(orchard => {
        const profile = profilesByUserId.get(orchard.user_id);
        const coverImage = orchard.images && orchard.images.length > 0 
          ? orchard.images[0] 
          : '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';
        return {
          id: `orchard-${orchard.id}`,
          user_id: orchard.user_id,
          content_type: 'new_orchard' as const,
          media_url: coverImage,
          caption: `🌳 NEW ORCHARD: ${orchard.title}`,
          likes_count: orchard.like_count || 0,
          comments_count: 0,
          created_at: orchard.created_at,
          orchard_id: orchard.id,
          is_notification: true,
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

      // Combine all posts and sort by created_at
      const allCombinedPosts = [...transformedPosts, ...videosPosts, ...productPosts, ...orchardPosts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
    
    // Fetch real comments from database
    const { data: commentsData } = await supabase
      .from('memry_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (commentsData && commentsData.length > 0) {
      // Fetch profiles for commenters
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      const transformedComments: Comment[] = commentsData.map(c => {
        const profile = profilesMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          profiles: profile ? {
            display_name: profile.display_name || 'Anonymous',
            avatar_url: profile.avatar_url || ''
          } : {
            display_name: 'Anonymous',
            avatar_url: ''
          }
        };
      });
      setComments(transformedComments);
    } else {
      setComments([]);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !selectedPost) return;
    
    const { data: newCommentData, error } = await supabase
      .from('memry_comments')
      .insert({
        post_id: selectedPost.id,
        user_id: user.id,
        content: newComment.trim()
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Could not post comment",
        variant: "destructive"
      });
      return;
    }

    // Add to local state
    const comment: Comment = {
      id: newCommentData.id,
      user_id: user.id,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
      profiles: { display_name: 'You', avatar_url: '' }
    };
    
    setComments(prev => [...prev, comment]);
    setNewComment('');
    
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

  const currentPost = posts[currentPostIndex];

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (posts.length === 0) return;
    
    if (direction === 'down') {
      setCurrentPostIndex(prev => Math.min(prev + 1, posts.length - 1));
    } else if (direction === 'up') {
      setCurrentPostIndex(prev => Math.max(prev - 1, 0));
    }
  }, [posts.length]);

  // Reset currentPostIndex when posts change
  useEffect(() => {
    if (currentPostIndex >= posts.length && posts.length > 0) {
      setCurrentPostIndex(posts.length - 1);
    }
  }, [posts.length, currentPostIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5E6] via-[#FFECD2] to-[#FFE4C4] overflow-hidden">
      {/* Main Feed - TikTok Style */}
      <div className="h-screen relative">
        {/* Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-b from-black/30 to-transparent"
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

        {/* Content Feed */}
        <AnimatePresence mode="wait">
          {currentPost && (
            <motion.div
              key={currentPost.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="h-full relative"
              onWheel={(e) => {
                if (e.deltaY > 0) handleScroll('down');
                else handleScroll('up');
              }}
            >
              {/* Background Image/Video/Music */}
              <div className="absolute inset-0">
                {currentPost.content_type === 'video' || currentPost.content_type === 'marketing_video' ? (
                  <video
                    ref={videoRef}
                    src={currentPost.media_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                  />
                ) : currentPost.content_type === 'music' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
                    <Music className="w-24 h-24 text-white/80 mb-6" />
                    <audio 
                      src={currentPost.media_url} 
                      controls 
                      autoPlay
                      className="w-4/5 max-w-sm"
                    />
                    <p className="text-white/80 text-sm mt-4">🎵 Audio Track</p>
                  </div>
                ) : currentPost.content_type === 'new_product' || currentPost.content_type === 'new_orchard' ? (
                  <div className="w-full h-full relative">
                    <img
                      src={currentPost.media_url}
                      alt={currentPost.caption}
                      className="w-full h-full object-cover"
                    />
                    {/* Notification badge overlay */}
                    <div className="absolute top-20 left-4 right-4 z-10">
                      <Badge 
                        className={`px-4 py-2 text-sm font-bold ${
                          currentPost.content_type === 'new_product' 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        } text-white animate-pulse`}
                      >
                        {currentPost.content_type === 'new_product' ? (
                          <><ShoppingBag className="w-4 h-4 mr-2 inline" /> NEW SEED AVAILABLE</>
                        ) : (
                          <><Trees className="w-4 h-4 mr-2 inline" /> NEW ORCHARD PLANTED</>
                        )}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <img
                    src={currentPost.media_url}
                    alt={currentPost.caption}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
              </div>

              {/* Right Side Actions */}
              <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-20">
                {/* Profile */}
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                    <AvatarImage src={currentPost.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-400 to-orange-400 text-white">
                      {currentPost.profiles?.display_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="w-6 h-6 -mt-3 rounded-full bg-pink-500 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </motion.div>

                {/* Love (Like) */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleLike(currentPost.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentPost.user_liked || likedPostIds.has(currentPost.id) ? 'bg-pink-500' : 'bg-white/20 backdrop-blur-sm'
                  }`}>
                    <Heart className={`w-6 h-6 ${currentPost.user_liked || likedPostIds.has(currentPost.id) ? 'text-white fill-white' : 'text-white'}`} />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow">{currentPost.likes_count}</span>
                </motion.button>

                {/* Donate */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDonate(currentPost)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow">Donate</span>
                </motion.button>

                {/* Comment */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => openComments(currentPost)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow">{currentPost.comments_count}</span>
                </motion.button>

                {/* Bookmark */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleBookmark(currentPost.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentPost.user_bookmarked ? 'bg-amber-500' : 'bg-white/20 backdrop-blur-sm'
                  }`}>
                    <Bookmark className={`w-6 h-6 ${currentPost.user_bookmarked ? 'text-white fill-white' : 'text-white'}`} />
                  </div>
                </motion.button>

                {/* Share */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/memry?post=${currentPost.id}`;
                    const shareData = {
                      title: 'S2G Memry',
                      text: currentPost.caption || `Check out this post by ${currentPost.profiles?.display_name}`,
                      url: shareUrl
                    };
                    
                    try {
                      if (navigator.share) {
                        await navigator.share(shareData);
                        toast({
                          title: "Shared!",
                          description: "Post shared successfully"
                        });
                      } else {
                        await navigator.clipboard.writeText(shareUrl);
                        toast({
                          title: "Link copied!",
                          description: "Share link copied to clipboard"
                        });
                      }
                    } catch (error: any) {
                      if (error.name !== 'AbortError') {
                        await navigator.clipboard.writeText(shareUrl);
                        toast({
                          title: "Link copied!",
                          description: "Share link copied to clipboard"
                        });
                      }
                    }
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow">Share</span>
                </motion.button>

                {/* Sound toggle for videos */}
                {(currentPost.content_type === 'video' || currentPost.content_type === 'marketing_video') && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex flex-col items-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                    </div>
                  </motion.button>
                )}
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-20 left-4 right-20 z-20">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-bold text-lg drop-shadow">
                      @{currentPost.profiles?.username || 'user'}
                    </span>
                    {currentPost.content_type === 'recipe' && (
                      <span className="px-2 py-0.5 bg-orange-500 rounded-full text-xs text-white font-semibold">
                        <ChefHat className="w-3 h-3 inline mr-1" />
                        Recipe
                      </span>
                    )}
                    {currentPost.content_type === 'marketing_video' && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-xs text-white font-semibold">
                        <Video className="w-3 h-3 inline mr-1" />
                        Marketing
                      </span>
                    )}
                    {currentPost.content_type === 'new_product' && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-xs text-white font-semibold">
                        <ShoppingBag className="w-3 h-3 inline mr-1" />
                        New Seed
                      </span>
                    )}
                    {currentPost.content_type === 'new_orchard' && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-xs text-white font-semibold">
                        <Trees className="w-3 h-3 inline mr-1" />
                        New Orchard
                      </span>
                    )}
                  </div>
                  
                  {currentPost.content_type === 'recipe' && currentPost.recipe_title && (
                    <h3 className="text-white font-bold text-xl mb-1 drop-shadow">
                      {currentPost.recipe_title}
                    </h3>
                  )}
                  
                  <p className="text-white/90 text-sm line-clamp-3 drop-shadow">
                    {currentPost.caption}
                  </p>

                  {/* Recipe preview */}
                  {currentPost.content_type === 'recipe' && currentPost.recipe_ingredients && (
                    <motion.div 
                      className="mt-3 p-3 bg-white/20 backdrop-blur-sm rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <p className="text-white/80 text-xs">
                        📝 {currentPost.recipe_ingredients.slice(0, 3).join(' • ')}
                        {currentPost.recipe_ingredients.length > 3 && ' • ...'}
                      </p>
                    </motion.div>
                  )}

                  {/* View buttons for special content types */}
                  {(currentPost.content_type === 'marketing_video' || currentPost.content_type === 'new_orchard') && currentPost.orchard_id && (
                    <motion.div 
                      className="mt-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={() => navigate(`/orchard/${currentPost.orchard_id}`)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold"
                        size="sm"
                      >
                        <Trees className="w-4 h-4 mr-2" />
                        View Orchard & Bestow
                      </Button>
                    </motion.div>
                  )}

                  {currentPost.content_type === 'new_product' && currentPost.product_id && (
                    <motion.div 
                      className="mt-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Button
                        onClick={() => navigate(`/products`)}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold"
                        size="sm"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        View Product & Bestow
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Scroll indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <motion.div
                  animate={{ y: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-white/50 text-xs"
                >
                  Scroll for more
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-2 bg-gradient-to-t from-black/50 to-transparent">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-around bg-white/10 backdrop-blur-xl rounded-full py-2">
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'feed' ? 'text-pink-400' : 'text-white/70'}`}
                onClick={() => setActiveTab('feed')}
              >
                <Home className="w-6 h-6" />
                <span className="text-xs mt-1">Home</span>
              </button>
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'discover' ? 'text-pink-400' : 'text-white/70'}`}
                onClick={() => setActiveTab('discover')}
              >
                <Search className="w-6 h-6" />
                <span className="text-xs mt-1">Discover</span>
              </button>
              <button 
                className="flex flex-col items-center p-2"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="w-12 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </button>
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'create' ? 'text-pink-400' : 'text-white/70'}`}
              >
                <ChefHat className="w-6 h-6" />
                <span className="text-xs mt-1">Recipes</span>
              </button>
              <button 
                className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-pink-400' : 'text-white/70'}`}
                onClick={() => setActiveTab('profile')}
              >
                <User className="w-6 h-6" />
                <span className="text-xs mt-1">Profile</span>
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
                <motion.div
                  key={comment.id}
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
                    <p className="text-xs text-orange-400 mt-1">Just now</p>
                  </div>
                  <button className="self-start">
                    <Heart className="w-4 h-4 text-orange-300" />
                  </button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 mt-4 pt-4 border-t border-orange-200">
            <Input
              placeholder="Add a comment..."
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
