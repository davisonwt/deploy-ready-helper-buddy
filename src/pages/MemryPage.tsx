import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Plus, Home, Search, User, 
  Camera, Video, ChefHat, X, Send, Bookmark, Play, Pause,
  MoreHorizontal, Music, Volume2, VolumeX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MemryPost {
  id: string;
  user_id: string;
  content_type: 'photo' | 'video' | 'recipe';
  media_url: string;
  thumbnail_url?: string;
  caption: string;
  recipe_title?: string;
  recipe_ingredients?: string[];
  recipe_instructions?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    username: string;
  };
  user_liked?: boolean;
  user_bookmarked?: boolean;
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
  const [posts, setPosts] = useState<MemryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<MemryPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'create' | 'profile'>('feed');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  // New post state
  const [newPostType, setNewPostType] = useState<'photo' | 'video' | 'recipe'>('photo');
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
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchPosts = async () => {
    try {
      // For now, we'll use a mock data approach since we need to create the table
      // In production, this would fetch from supabase
      setLoading(false);
      
      // Mock data for demonstration
      setPosts([
        {
          id: '1',
          user_id: 'mock',
          content_type: 'photo',
          media_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
          caption: 'Beautiful homemade breakfast to start the day! 🌅',
          likes_count: 234,
          comments_count: 45,
          created_at: new Date().toISOString(),
          profiles: {
            display_name: 'Sarah Kitchen',
            avatar_url: '',
            username: 'sarahcooks'
          }
        },
        {
          id: '2',
          user_id: 'mock',
          content_type: 'recipe',
          media_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
          caption: 'My grandmother\'s secret pancake recipe 🥞',
          recipe_title: 'Fluffy Pancakes',
          recipe_ingredients: ['2 cups flour', '2 eggs', '1 cup milk', '2 tbsp sugar', '1 tsp vanilla'],
          recipe_instructions: 'Mix dry ingredients. Add wet ingredients. Cook on medium heat until golden.',
          likes_count: 892,
          comments_count: 123,
          created_at: new Date().toISOString(),
          profiles: {
            display_name: 'Chef Marcus',
            avatar_url: '',
            username: 'chefmarcus'
          }
        },
        {
          id: '3',
          user_id: 'mock',
          content_type: 'photo',
          media_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
          caption: 'Pizza night with the family! 🍕❤️',
          likes_count: 567,
          comments_count: 89,
          created_at: new Date().toISOString(),
          profiles: {
            display_name: 'Food Lover',
            avatar_url: '',
            username: 'foodlover'
          }
        }
      ]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes_count: post.user_liked ? post.likes_count - 1 : post.likes_count + 1, user_liked: !post.user_liked }
        : post
    ));
  };

  const handleBookmark = async (postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, user_bookmarked: !post.user_bookmarked }
        : post
    ));
    toast({
      title: "Saved!",
      description: "Added to your collection"
    });
  };

  const openComments = (post: MemryPost) => {
    setSelectedPost(post);
    setShowCommentsModal(true);
    // Fetch comments for this post
    setComments([
      {
        id: '1',
        user_id: 'mock',
        content: 'This looks amazing! 😍',
        created_at: new Date().toISOString(),
        profiles: { display_name: 'Happy User', avatar_url: '' }
      },
      {
        id: '2',
        user_id: 'mock',
        content: 'Can\'t wait to try this recipe!',
        created_at: new Date().toISOString(),
        profiles: { display_name: 'Foodie Fan', avatar_url: '' }
      }
    ]);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      user_id: user?.id || 'mock',
      content: newComment,
      created_at: new Date().toISOString(),
      profiles: { display_name: 'You', avatar_url: '' }
    };
    
    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewPostPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostFile && newPostType !== 'recipe') {
      toast({
        title: "Missing media",
        description: "Please select a photo or video",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      toast({
        title: "Posted! 🎉",
        description: "Your memry has been shared with the community"
      });
      setUploading(false);
      setShowCreateModal(false);
      setNewPostFile(null);
      setNewPostPreview('');
      setNewPostCaption('');
      setRecipeTitle('');
      setRecipeIngredients('');
      setRecipeInstructions('');
    }, 2000);
  };

  const currentPost = posts[currentPostIndex];

  const handleScroll = (direction: 'up' | 'down') => {
    if (direction === 'down' && currentPostIndex < posts.length - 1) {
      setCurrentPostIndex(prev => prev + 1);
    } else if (direction === 'up' && currentPostIndex > 0) {
      setCurrentPostIndex(prev => prev - 1);
    }
  };

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
            <h1 className="text-2xl font-black text-white drop-shadow-lg tracking-tight">
              s2g memry
            </h1>
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
              {/* Background Image/Video */}
              <div className="absolute inset-0">
                {currentPost.content_type === 'video' ? (
                  <video
                    ref={videoRef}
                    src={currentPost.media_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                  />
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

                {/* Like */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleLike(currentPost.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    currentPost.user_liked ? 'bg-pink-500' : 'bg-white/20 backdrop-blur-sm'
                  }`}>
                    <Heart className={`w-6 h-6 ${currentPost.user_liked ? 'text-white fill-white' : 'text-white'}`} />
                  </div>
                  <span className="text-white text-xs font-semibold drop-shadow">{currentPost.likes_count}</span>
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
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                </motion.button>

                {/* Sound toggle for videos */}
                {currentPost.content_type === 'video' && (
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
              <TabsList className="grid grid-cols-3 bg-orange-100">
                <TabsTrigger value="photo" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <Camera className="w-4 h-4 mr-1" /> Photo
                </TabsTrigger>
                <TabsTrigger value="video" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <Video className="w-4 h-4 mr-1" /> Video
                </TabsTrigger>
                <TabsTrigger value="recipe" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <ChefHat className="w-4 h-4 mr-1" /> Recipe
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Media Upload */}
            <div className="relative">
              {newPostPreview ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  {newPostType === 'video' ? (
                    <video src={newPostPreview} className="w-full h-full object-cover" />
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
                    accept={newPostType === 'video' ? 'video/*' : 'image/*'}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {newPostType === 'video' ? (
                    <Video className="w-12 h-12 text-orange-300 mb-2" />
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
                  className="bg-white/50 border-orange-200"
                />
                <Textarea
                  placeholder="Ingredients (one per line)..."
                  value={recipeIngredients}
                  onChange={(e) => setRecipeIngredients(e.target.value)}
                  className="bg-white/50 border-orange-200 min-h-[80px]"
                />
                <Textarea
                  placeholder="Instructions..."
                  value={recipeInstructions}
                  onChange={(e) => setRecipeInstructions(e.target.value)}
                  className="bg-white/50 border-orange-200 min-h-[80px]"
                />
              </div>
            )}

            {/* Caption */}
            <Textarea
              placeholder="Write a caption... ✨"
              value={newPostCaption}
              onChange={(e) => setNewPostCaption(e.target.value)}
              className="bg-white/50 border-orange-200 min-h-[80px]"
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
              className="bg-white/50 border-orange-200"
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
    </div>
  );
}
