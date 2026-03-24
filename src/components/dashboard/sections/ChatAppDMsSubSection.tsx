import React, { useEffect, useState } from 'react';
import { MessageSquare, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Props {
  theme: DashboardTheme;
}

export const ChatAppDMsSubSection: React.FC<Props> = ({ theme }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('id, name, room_type, description, current_listeners, is_active')
        .eq('is_active', true)
        .in('room_type', ['direct', 'group', 'community'])
        .order('updated_at', { ascending: false })
        .limit(5);
      setRooms(data || []);
      setLoading(false);
    };
    fetchRooms();
  }, [user]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>
            Chats & Groups
          </h3>
        </div>
        <Link to="/communications-hub" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl p-3 text-center border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>No active conversations yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {rooms.map((room, i) => (
            <motion.div key={room.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to="/communications-hub">
                <div
                  className="rounded-lg p-2.5 border flex items-center gap-2.5 hover:scale-[1.01] transition-transform"
                  style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-[9px] font-bold" style={{ background: theme.secondaryButton, color: theme.accent }}>
                      {room.room_type === 'direct' ? '💬' : room.room_type === 'group' ? '👥' : room.name?.charAt(0) || '💬'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>{room.name || 'Chat Room'}</p>
                    <p className="text-[9px] truncate" style={{ color: theme.textSecondary }}>
                      {room.room_type === 'direct' ? '1-on-1' : room.room_type === 'group' ? 'Group' : 'Community'}
                    </p>
                  </div>
                  {(room.current_listeners || 0) > 0 && (
                    <span className="text-[9px] font-medium flex-shrink-0" style={{ color: theme.accent }}>
                      <Users className="w-2.5 h-2.5 inline mr-0.5" />{room.current_listeners}
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
