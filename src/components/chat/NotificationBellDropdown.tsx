import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageCircle, Radio, Users, Calendar, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow, format } from 'date-fns';

interface RecentChat {
  id: string;
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

export const NotificationBellDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [radioSlots, setRadioSlots] = useState<ScheduledSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const totalCount = recentChats.length + radioSlots.length;

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: participations } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const roomIds = (participations || []).map(p => p.room_id);

      const [roomsResult, slotsResult] = await Promise.all([
        roomIds.length > 0
          ? supabase
              .from('chat_rooms')
              .select('id, name, room_type, updated_at')
              .in('id', roomIds)
              .eq('is_active', true)
              .order('updated_at', { ascending: false })
              .limit(8)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('radio_schedule')
          .select('id, start_time, end_time, status, show_subject, show_notes, radio_djs(dj_name)')
          .gte('end_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3),
      ]);

      setRadioSlots((slotsResult.data as ScheduledSlot[]) || []);

      const rooms = roomsResult.data || [];
      const chatItems: RecentChat[] = [];
      for (const room of rooms.slice(0, 5)) {
        const { data: msgs } = await supabase
          .from('chat_messages')
          .select('content, created_at, sender_id, message_type')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const msg = msgs?.[0];
        if (!msg) continue;

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

        chatItems.push({
          id: room.id,
          room_name: room.name || (room.room_type === 'direct' ? senderName : 'Chat'),
          room_type: room.room_type,
          last_message: msg.message_type === 'text' ? (msg.content || '') : `📎 ${msg.message_type}`,
          last_message_at: msg.created_at,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          participant_count: 0,
        });
      }
      setRecentChats(chatItems);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-card/50 transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 max-h-[70vh] rounded-2xl border border-border/30 shadow-xl overflow-hidden"
              style={{ backgroundColor: 'hsl(210 67% 12% / 0.95)', backdropFilter: 'blur(20px)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-border/20">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Activity
                </h3>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-card/50">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <ScrollArea className="max-h-[60vh]">
                <div className="p-2 space-y-1">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse p-3 rounded-xl">
                        <div className="h-3 bg-muted/30 rounded w-3/4 mb-1.5" />
                        <div className="h-2.5 bg-muted/20 rounded w-1/2" />
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Radio slots */}
                      {radioSlots.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold text-primary px-2 pt-1 flex items-center gap-1">
                            <Radio className="w-3 h-3" /> Upcoming Radio
                          </p>
                          {radioSlots.map(slot => {
                            const isLive = slot.status === 'live';
                            return (
                              <div key={slot.id} className="p-2.5 rounded-xl hover:bg-card/30 transition-colors cursor-pointer">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {isLive && <Badge variant="destructive" className="text-[8px] px-1 py-0 h-4 animate-pulse">LIVE</Badge>}
                                  <span className="text-xs font-semibold text-foreground truncate">
                                    {slot.show_subject || slot.show_notes || 'Radio Slot'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(slot.start_time), 'MMM d HH:mm')} • {slot.radio_djs?.dj_name || 'TBD'}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      {/* Recent chats */}
                      {recentChats.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold text-primary px-2 pt-2 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> Recent Chats
                          </p>
                          {recentChats.map(chat => (
                            <div key={chat.id} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-card/30 transition-colors cursor-pointer">
                              <Avatar className="w-7 h-7 shrink-0">
                                <AvatarImage src={chat.sender_avatar || undefined} />
                                <AvatarFallback className="bg-primary/20 text-[10px]">{chat.room_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-foreground truncate block">{chat.room_name}</span>
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  {chat.sender_name}: {chat.last_message}
                                </span>
                              </div>
                              <span className="text-[9px] text-muted-foreground/60 shrink-0">
                                {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {recentChats.length === 0 && radioSlots.length === 0 && (
                        <div className="text-center py-6">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-xs text-muted-foreground">No recent activity</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
