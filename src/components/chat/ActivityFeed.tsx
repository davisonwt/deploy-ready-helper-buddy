import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Users, BookOpen, GraduationCap, Dumbbell, Radio, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';

interface Activity {
  id: string;
  mode_type: string;
  action_type: string;
  content: string;
  created_at: string;
  actor_profile_id: string;
  profiles?: any;
}

interface ScheduledSlot {
  id: string;
  time_slot_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  show_subject: string | null;
  show_notes: string | null;
  broadcast_mode: string;
  radio_djs: { dj_name: string } | null;
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
  const [radioSlots, setRadioSlots] = useState<ScheduledSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Fetch activities and upcoming radio slots in parallel
        const [activitiesResult, slotsResult] = await Promise.all([
          user ? supabase
            .from('activity_feed')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20) : Promise.resolve({ data: [], error: null }),
          supabase
            .from('radio_schedule')
            .select('id, time_slot_date, start_time, end_time, status, show_subject, show_notes, broadcast_mode, radio_djs(dj_name)')
            .gte('end_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(5),
        ]);

        // Fetch profiles for activities
        const actData = activitiesResult.data || [];
        const actorIds = [...new Set(actData.map((a: any) => a.actor_profile_id).filter(Boolean))];
        let activitiesWithProfiles = actData;
        if (actorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', actorIds);
          activitiesWithProfiles = actData.map((activity: any) => ({
            ...activity,
            profiles: profilesData?.find((p: any) => p.id === activity.actor_profile_id),
          }));
        }

        setActivities(activitiesWithProfiles);
        setRadioSlots((slotsResult.data as ScheduledSlot[]) || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const subscription = supabase
        .channel('activity-feed-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_feed', filter: `user_id=eq.${user.id}` }, () => fetchData())
        .subscribe();
      return subscription;
    };

    const subscriptionPromise = setupSubscription();
    return () => { subscriptionPromise.then(sub => sub?.unsubscribe()); };
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

  const hasContent = activities.length > 0 || radioSlots.length > 0;

  return (
    <div className="glass-panel rounded-2xl p-6 h-[600px] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-heading-primary">Live Activity</h3>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-3">
          {/* Upcoming Radio Slots */}
          {radioSlots.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                <Radio className="w-3 h-3" /> Upcoming Radio
              </p>
              {radioSlots.map((slot) => {
                const startDate = new Date(slot.start_time);
                const endDate = new Date(slot.end_time);
                const isLive = slot.status === 'live';
                return (
                  <motion.div
                    key={slot.id}
                    className="glass-card p-3 rounded-xl mb-2 hover:bg-card/80 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {isLive ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 animate-pulse">LIVE</Badge>
                      ) : (
                        <Calendar className="w-3 h-3 text-primary" />
                      )}
                      <span className="text-xs font-semibold text-foreground truncate">
                        {slot.show_subject || slot.show_notes || 'Radio Slot'}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span>{format(startDate, 'MMM d')} • {format(startDate, 'HH:mm')}-{format(endDate, 'HH:mm')}</span>
                      <span>•</span>
                      <span>{slot.radio_djs?.dj_name || 'TBD'}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Activity Feed Items */}
          {activities.map((activity, index) => (
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
                    <div className="text-primary">{getModeIcon(activity.mode_type)}</div>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {activity.profiles?.display_name || activity.profiles?.username || 'Someone'}
                    </p>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-2">{activity.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {!hasContent && (
            <div className="text-center py-8 text-foreground/80">
              <Radio className="w-8 h-8 mx-auto mb-2 text-primary/50" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Schedule a radio slot or start chatting</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
