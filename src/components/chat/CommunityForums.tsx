import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ThumbsUp, ThumbsDown, MessageSquare, Pin, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  reply_count: number;
  is_pinned: boolean;
  created_at: string;
  author_profile_id: string;
  circle_id: string;
  profiles?: any;
  circles?: any;
}

export const CommunityForums: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedCircle, setSelectedCircle] = useState<string>('');
  const [userCircles, setUserCircles] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserCircles();
    fetchPosts();
  }, []);

  const fetchUserCircles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('circle_members')
        .select('circle_id, circles(id, name, emoji)')
        .eq('user_id', user.id);

      if (error) throw error;
      
      const circles = data?.map(item => item.circles).filter(Boolean) || [];
      setUserCircles(circles);
      if (circles.length > 0) {
        setSelectedCircle(circles[0].id);
      }
    } catch (error) {
      console.error('Error fetching circles:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all circles user is a member of
      const { data: memberData } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', user.id);

      const circleIds = memberData?.map(m => m.circle_id) || [];

      if (circleIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .in('circle_id', circleIds)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles and circles separately
      const profileIds = [...new Set(data?.map(p => p.author_profile_id).filter(Boolean) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);

      const { data: circlesData } = await supabase
        .from('circles')
        .select('*')
        .in('id', circleIds);

      const postsWithData = data?.map(post => ({
        ...post,
        profiles: profilesData?.find((p: any) => p.id === post.author_profile_id),
        circles: circlesData?.find((c: any) => c.id === post.circle_id),
      })) || [];

      setPosts(postsWithData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !selectedCircle) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('community_posts')
        .insert({
          title: newPostTitle,
          content: newPostContent,
          circle_id: selectedCircle,
          author_id: user.id,
          author_profile_id: profile?.id,
        });

      if (error) throw error;

      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the community',
      });

      setNewPostOpen(false);
      setNewPostTitle('');
      setNewPostContent('');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
    }
  };

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('community_post_votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingVote) {
        // Update vote
        await supabase
          .from('community_post_votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);
      } else {
        // Create new vote
        await supabase
          .from('community_post_votes')
          .insert({
            post_id: postId,
            user_id: user.id,
            vote_type: voteType,
          });
      }

      fetchPosts();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="glass-card p-8 rounded-2xl">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/20 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-heading-primary">Community Forums</h2>
            <p className="text-sm text-muted-foreground">Share ideas and discussions with your circles</p>
          </div>
          
          <Dialog open={newPostOpen} onOpenChange={setNewPostOpen}>
            <DialogTrigger asChild>
              <Button className="glass-button gap-2">
                <Plus className="w-4 h-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>Share your thoughts with your community</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Circle</label>
                  <select
                    value={selectedCircle}
                    onChange={(e) => setSelectedCircle(e.target.value)}
                    className="w-full glass-input rounded-lg px-3 py-2"
                  >
                    {userCircles.map((circle) => (
                      <option key={circle.id} value={circle.id}>
                        {circle.emoji} {circle.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="Enter post title"
                    className="glass-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="glass-input min-h-[120px]"
                  />
                </div>
                <Button onClick={handleCreatePost} className="w-full">
                  Post to Community
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="glass-input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Posts List */}
      <ScrollArea className="h-[500px]">
        <div className="p-6 space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No posts yet</p>
              <p className="text-sm mt-1">Be the first to start a discussion!</p>
            </div>
          ) : (
            filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                className="glass-card p-6 rounded-xl hover:bg-card/80 transition-all cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01 }}
              >
                {/* Post Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={post.profiles?.avatar_url || post.profiles?.profile_image_url} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {post.profiles?.display_name?.charAt(0) || post.profiles?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {post.is_pinned && (
                        <Pin className="w-4 h-4 text-warning fill-warning" />
                      )}
                      <span className="font-semibold text-foreground">
                        {post.profiles?.display_name || post.profiles?.username || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.circles?.emoji} {post.circles?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-heading-primary mb-2">
                      {post.title}
                    </h3>
                    <p className="text-foreground/90 line-clamp-3">
                      {post.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-4">
                      <button
                        onClick={() => handleVote(post.id, 'upvote')}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {post.upvotes}
                      </button>
                      <button
                        onClick={() => handleVote(post.id, 'downvote')}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        {post.downvotes}
                      </button>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        {post.reply_count} replies
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
