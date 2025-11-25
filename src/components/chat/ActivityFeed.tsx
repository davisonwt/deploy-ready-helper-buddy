import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Users, BookOpen, GraduationCap, Dumbbell, Radio, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  mode_type: string;
  action_type: string;
  content: string;
  created_at: string;
  actor_profile_id: string;
  profiles?: any;
}

const getModeIcon = (mode: string) => {
  switch (mode) {
    case 'chat': return <MessageCircle className="w-4 h-4" />;
    case 'community': return <Users className="w-4 h-4" />;
    case 'classroom': return <BookOpen className="w-4 h-4" />;
    case 'lecture': return <GraduationCap className="w-4 h-4" />;
    case 'training': return <Dumbbell className="w-4 h-4" />;
    case 'radio': return <Radio className="w-4 h-4" />;
    default: return <MessageCircle className="w-4 h-4" />;
  }
};

export const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('activity_feed')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        // Fetch profiles separately
        const actorIds = [...new Set(data?.map(a => a.actor_profile_id).filter(Boolean) || [])];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', actorIds);

        const activitiesWithProfiles = data?.map(activity => ({
          ...activity,
          profiles: profilesData?.find((p: any) => p.id === activity.actor_profile_id),
        })) || [];

        setActivities(activitiesWithProfiles);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Subscribe to real-time updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscription = supabase
        .channel('activity-feed-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activity_feed',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchActivities();
          }
        )
        .subscribe();

      return subscription;
    };

    const subscriptionPromise = setupSubscription();

    return () => {
      subscriptionPromise.then(sub => sub?.unsubscribe());
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 h-[600px]">
        <h3 className="text-lg font-bold text-heading-primary mb-4">Activity Feed</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-4 rounded-xl animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted/50 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 h-[600px] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-heading-primary">Live Activity</h3>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-white/80">
              <p>No recent activity</p>
              <p className="text-sm mt-1">Start chatting to see updates here</p>
            </div>
          ) : (
            activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                className="glass-card p-4 rounded-xl hover:bg-card/80 transition-colors cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/20">
                    <AvatarImage src={activity.profiles?.avatar_url || activity.profiles?.profile_image_url} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {activity.profiles?.display_name?.charAt(0) || activity.profiles?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-primary">
                        {getModeIcon(activity.mode_type)}
                      </div>
                      <p className="text-sm font-semibold text-foreground truncate">
                        {activity.profiles?.display_name || activity.profiles?.username || 'Someone'}
                      </p>
                    </div>
                    
                    <p className="text-sm text-white/90 line-clamp-2">
                      {activity.content}
                    </p>
                    
                    <p className="text-xs text-white/70 mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
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
