import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Users, Radio, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';

interface RecentChat {
  id: string;
  room_id: string;
  room_name: string;
  room_type: string;
  last_message: string;
  last_message_at: string;
  sender_name: string;
  sender_avatar: string | null;
  participant_count: number;
}

interface ScheduledSlot {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  show_subject: string | null;
  show_notes: string | null;
  radio_djs: { dj_name: string } | null;
}

export const ActivityFeed: React.FC = () => {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [radioSlots, setRadioSlots] = useState<ScheduledSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get user's rooms
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const roomIds = (participations || []).map(p => p.room_id);

      // Fetch rooms, recent messages, and radio slots in parallel
      const [roomsResult, slotsResult] = await Promise.all([
        roomIds.length > 0
          ? supabase
              .from('chat_rooms')
              .select('id, name, room_type, updated_at')
              .in('id', roomIds)
              .eq('is_active', true)
              .order('updated_at', { ascending: false })
              .limit(10)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('radio_schedule')
          .select('id, start_time, end_time, status, show_subject, show_notes, radio_djs(dj_name)')
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5),
      ]);

      const rooms = roomsResult.data || [];
      setRadioSlots((slotsResult.data as ScheduledSlot[]) || []);

      if (rooms.length === 0) { setRecentChats([]); setLoading(false); return; }

      // Get latest message per room
      const chatItems: RecentChat[] = [];
      for (const room of rooms) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('id, content, created_at, sender_id, message_type')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const msg = msgs?.[0];
        if (!msg) continue;

        // Get sender profile
        let senderName = 'Unknown';
        let senderAvatar: string | null = null;
        if (msg.sender_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name, avatar_url')
            .eq('user_id', msg.sender_id)
            .single();
          if (prof) {
            senderName = prof.display_name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Unknown';
            senderAvatar = prof.avatar_url;
          }
        }

        // Get participant count
        const { count } = await supabase
          .from('chat_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id)
          .eq('is_active', true);

        chatItems.push({
          id: room.id,
          room_id: room.id,
          room_name: room.name || (room.room_type === 'direct' ? senderName : 'Unnamed Chat'),
          room_type: room.room_type,
          last_message: msg.message_type === 'text' ? (msg.content || '') : `📎 ${msg.message_type}`,
          last_message_at: msg.created_at,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          participant_count: count || 0,
        });
      }

      setRecentChats(chatItems);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);

    // Realtime subscription for new messages
    const channel = supabase
      .channel('activity-feed-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => fetchData())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 h-[600px]">
        <h3 className="text-lg font-bold text-heading-primary mb-4">Live Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 rounded-xl animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted/50 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasContent = recentChats.length > 0 || radioSlots.length > 0;

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

          {/* Recent Chat Activity */}
          {recentChats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> Recent Chats
              </p>
              {recentChats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  className="glass-card p-3 rounded-xl mb-2 hover:bg-card/80 transition-colors cursor-pointer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="w-8 h-8 border border-primary/20 shrink-0">
                      <AvatarImage src={chat.sender_avatar || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {chat.room_type === 'direct' ? chat.sender_name.charAt(0) : chat.room_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {chat.room_name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {chat.room_type !== 'direct' && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Users className="w-2.5 h-2.5" /> {chat.participant_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        <span className="font-medium">{chat.sender_name}:</span> {chat.last_message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!hasContent && (
            <div className="text-center py-8 text-foreground/80">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-primary/50" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Start a conversation to see activity here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
