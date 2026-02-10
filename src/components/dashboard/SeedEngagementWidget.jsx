import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export function SeedEngagementWidget({ theme }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchEngagement();
  }, [user?.id]);

  const fetchEngagement = async () => {
    try {
      setLoading(true);

      // Get user's memry posts
      const { data: myPosts } = await supabase
        .from('memry_posts')
        .select('id, caption, content_type')
        .eq('user_id', user.id);

      if (!myPosts || myPosts.length === 0) {
        setActivities([]);
        setLoading(false);
        return;
      }

      const postIds = myPosts.map(p => p.id);
      const postMap = new Map(myPosts.map(p => [p.id, p]));

      // Fetch recent likes on my posts
      const { data: likes } = await supabase
        .from('memry_likes')
        .select('id, user_id, post_id, created_at')
        .in('post_id', postIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent comments on my posts
      const { data: comments } = await supabase
        .from('memry_comments')
        .select('id, user_id, post_id, content, created_at')
        .in('post_id', postIds)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get all unique user IDs for profile lookup
      const allUserIds = [
        ...new Set([
          ...(likes || []).map(l => l.user_id),
          ...(comments || []).map(c => c.user_id)
        ])
      ];

      let profilesMap = new Map();
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', allUserIds);

        profilesMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }

      // Combine and sort
      const combined = [
        ...(likes || []).map(l => {
          const profile = profilesMap.get(l.user_id);
          const post = postMap.get(l.post_id);
          return {
            id: `like-${l.id}`,
            type: 'love',
            userName: profile?.display_name || profile?.username || 'Sower',
            avatarUrl: profile?.avatar_url || '',
            postCaption: post?.caption || 'your seed',
            created_at: l.created_at
          };
        }),
        ...(comments || []).map(c => {
          const profile = profilesMap.get(c.user_id);
          const post = postMap.get(c.post_id);
          return {
            id: `comment-${c.id}`,
            type: 'comment',
            userName: profile?.display_name || profile?.username || 'Sower',
            avatarUrl: profile?.avatar_url || '',
            content: c.content,
            postCaption: post?.caption || 'your seed',
            created_at: c.created_at
          };
        })
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15);

      setActivities(combined);
    } catch (err) {
      console.error('Error fetching seed engagement:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border shadow-xl backdrop-blur-xl" style={{
        backgroundColor: theme?.cardBg,
        borderColor: theme?.cardBorder
      }}>
        <CardHeader className="p-4 sm:p-5">
          <CardTitle className="flex items-center text-base sm:text-lg" style={{ color: theme?.textPrimary }}>
            <Heart className="h-5 w-5 mr-2" style={{ color: theme?.accent }} />
            Seed Engagement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-xl backdrop-blur-xl" style={{
      backgroundColor: theme?.cardBg,
      borderColor: theme?.cardBorder
    }}>
      <CardHeader className="p-4 sm:p-5">
        <CardTitle className="flex items-center text-base sm:text-lg" style={{ color: theme?.textPrimary }}>
          <Heart className="h-5 w-5 mr-2" style={{ color: theme?.accent }} />
          Seed Engagement
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {activities.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: theme?.textSecondary }}>
            No engagement yet. Share your seeds to get loves & comments!
          </p>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {activities.map(activity => (
              <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg" style={{
                backgroundColor: theme?.cardBg ? theme.cardBg + '80' : undefined
              }}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={activity.avatarUrl} />
                  <AvatarFallback className="text-xs" style={{
                    background: theme?.primaryButton,
                    color: theme?.textPrimary
                  }}>
                    {activity.userName?.[0]?.toUpperCase() || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: theme?.textPrimary }}>
                    <span className="font-semibold">{activity.userName}</span>
                    {activity.type === 'love' ? (
                      <span> loved <span className="opacity-70">"{(activity.postCaption || '').slice(0, 30)}{(activity.postCaption || '').length > 30 ? '...' : ''}"</span></span>
                    ) : (
                      <span> commented: <span className="opacity-70">"{(activity.content || '').slice(0, 40)}{(activity.content || '').length > 40 ? '...' : ''}"</span></span>
                    )}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {activity.type === 'love' ? (
                      <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    ) : (
                      <MessageCircle className="w-3 h-3" style={{ color: theme?.accent }} />
                    )}
                    <span className="text-xs" style={{ color: theme?.textSecondary }}>
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
