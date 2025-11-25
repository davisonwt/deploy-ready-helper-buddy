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
import { Checkbox } from '@/components/ui/checkbox';
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
  const [selectedCircles, setSelectedCircles] = useState<string[]>([]);
  const [postToNonCircle, setPostToNonCircle] = useState(false);
  const [userCircles, setUserCircles] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserCircles();
    fetchAllMembers();
    fetchPosts();
  }, []);

  const fetchUserCircles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all circles directly
      const { data: allCircles, error: circlesError } = await supabase
        .from('circles')
        .select('id, name, emoji, color')
        .order('name');

      if (circlesError) throw circlesError;
      
      console.log('Loaded circles:', allCircles);
      setUserCircles(allCircles || []);
    } catch (error) {
      console.error('Error fetching circles:', error);
    }
  };

  const toggleCircleSelection = (circleId: string) => {
    setSelectedCircles(prev => 
      prev.includes(circleId) 
        ? prev.filter(id => id !== circleId)
        : [...prev, circleId]
    );
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const fetchAllMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, first_name, last_name, avatar_url')
        .neq('user_id', user.id)
        .order('display_name');

      if (error) throw error;
      setAllMembers(profiles || []);
    } catch (error) {
      console.error('Error fetching members:', error);
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
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please enter a title and content',
        variant: 'destructive',
      });
      return;
    }

    if (selectedCircles.length === 0 && !postToNonCircle && selectedMembers.length === 0) {
      toast({
        title: 'No audience selected',
        description: 'Please select at least one circle, members, or "Not in any circles"',
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

      // Handle custom group creation if members are selected
      if (selectedMembers.length > 0) {
        // Create a group chat room for custom members
        const { data: groupRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: `${newPostTitle} - Custom Group`,
            room_type: 'group',
            created_by: user.id,
            is_active: true,
          })
          .select()
          .single();

        if (roomError) throw roomError;

        // Add creator and selected members to the group
        const participantsToAdd = [user.id, ...selectedMembers];
        const participantInserts = participantsToAdd.map(userId => ({
          room_id: groupRoom.id,
          user_id: userId,
          is_active: true,
        }));

        const { error: participantError } = await supabase
          .from('chat_participants')
          .insert(participantInserts);

        if (participantError) throw participantError;

        // Post the content as a message in the group
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            room_id: groupRoom.id,
            sender_id: user.id,
            content: `**${newPostTitle}**\n\n${newPostContent}`,
            message_type: 'text',
          });

        if (messageError) throw messageError;

        toast({
          title: 'Custom group created!',
          description: `Your post has been shared with ${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''}`,
        });
      }

      // Create posts for selected circles
      if (selectedCircles.length > 0) {
        const postPromises = selectedCircles.map(circleId => 
          supabase
            .from('community_posts')
            .insert({
              title: newPostTitle,
              content: newPostContent,
              circle_id: circleId,
              author_id: user.id,
              author_profile_id: profile?.id,
            })
        );

        const results = await Promise.all(postPromises);
        const errors = results.filter(r => r.error);

        if (errors.length > 0) {
          throw new Error('Some posts failed to create');
        }

        toast({
          title: 'Post created!',
          description: `Your post has been shared with ${selectedCircles.length} circle${selectedCircles.length > 1 ? 's' : ''}`,
        });
      }

      setNewPostOpen(false);
      setNewPostTitle('');
      setNewPostContent('');
      setSelectedCircles([]);
      setSelectedMembers([]);
      setPostToNonCircle(false);
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
              <Button 
                className="gap-2" 
                style={{ backgroundColor: '#17A2B8', color: 'white', border: '2px solid #0A1931' }}
              >
                <Plus className="w-4 h-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
                <DialogDescription>Share your thoughts with your community</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-3 block">Select Circles to Post To</label>
                    <div className="space-y-3 max-h-48 overflow-y-auto glass-card p-4 rounded-lg">
                      {userCircles.map((circle) => (
                        <div key={circle.id} className="flex items-center space-x-3 hover:bg-primary/5 p-2 rounded transition-colors">
                          <Checkbox
                            id={`circle-${circle.id}`}
                            checked={selectedCircles.includes(circle.id)}
                            onCheckedChange={() => toggleCircleSelection(circle.id)}
                            className="border-primary/30"
                          />
                          <label
                            htmlFor={`circle-${circle.id}`}
                            className="flex-1 text-sm font-medium cursor-pointer"
                          >
                            {circle.emoji} {circle.name}
                          </label>
                        </div>
                      ))}
                      
                      {/* Not in any circles option */}
                      <div className="flex items-center space-x-3 hover:bg-primary/5 p-2 rounded transition-colors border-t border-border/30 pt-3 mt-3">
                        <Checkbox
                          id="non-circle"
                          checked={postToNonCircle}
                          onCheckedChange={(checked) => setPostToNonCircle(!!checked)}
                          className="border-primary/30"
                        />
                        <label
                          htmlFor="non-circle"
                          className="flex-1 text-sm font-medium cursor-pointer"
                        >
                          🌐 Not in any circles
                        </label>
                       </div>
                     </div>
                     {selectedCircles.length > 0 && (
                       <p className="text-xs text-muted-foreground mt-2">
                         {selectedCircles.length} circle{selectedCircles.length > 1 ? 's' : ''} selected
                       </p>
                     )}
                   </div>

                   {/* Custom Group Selection */}
                   <div>
                     <label className="text-sm font-medium mb-3 block">Or Select Individual Members for Custom Group</label>
                     <div className="space-y-2 max-h-60 overflow-y-auto glass-card p-4 rounded-lg">
                       {allMembers.map((member) => (
                         <div key={member.id} className="flex items-center space-x-3 hover:bg-primary/5 p-2 rounded transition-colors">
                           <Checkbox
                             id={`member-${member.id}`}
                             checked={selectedMembers.includes(member.user_id)}
                             onCheckedChange={() => toggleMemberSelection(member.user_id)}
                             className="border-primary/30"
                           />
                           <Avatar className="h-8 w-8">
                             <AvatarImage src={member.avatar_url} />
                             <AvatarFallback>
                               {(member.display_name || member.first_name || 'U')[0]}
                             </AvatarFallback>
                           </Avatar>
                           <label
                             htmlFor={`member-${member.id}`}
                             className="flex-1 text-sm font-medium cursor-pointer"
                           >
                             {member.display_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown User'}
                           </label>
                         </div>
                       ))}
                       {allMembers.length === 0 && (
                         <p className="text-sm text-muted-foreground text-center py-4">
                           No members available
                         </p>
                       )}
                     </div>
                     {selectedMembers.length > 0 && (
                       <p className="text-xs text-muted-foreground mt-2">
                         {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected for custom group
                       </p>
                     )}
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
              </ScrollArea>
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
