import React, { useEffect, useState } from 'react';
import { MessageSquare, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatSectionProps {
  theme: DashboardTheme;
}

export const ChatSection: React.FC<ChatSectionProps> = ({ theme }) => {
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
        .order('current_listeners', { ascending: false })
        .limit(5);
      setRooms(data || []);
      setLoading(false);
    };
    fetchRooms();
  }, [user]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: theme.secondaryButton }}>
            <MessageSquare className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
            Communications Hub
          </h2>
        </div>
        <Link to="/communications-hub" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl p-4 text-center border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="text-xs" style={{ color: theme.textSecondary }}>No active rooms — start a conversation!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to="/communications-hub">
                <div
                  className="rounded-xl p-3 border flex items-center gap-3 hover:scale-[1.01] transition-transform"
                  style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 12px ${theme.shadow}` }}
                >
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback
                      className="text-[10px] font-bold"
                      style={{ background: theme.secondaryButton, color: theme.accent }}
                    >
                      {room.name?.charAt(0) || '💬'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>
                      {room.name || 'Chat Room'}
                    </p>
                    {room.description && (
                      <p className="text-[10px] truncate mt-0.5" style={{ color: theme.textSecondary }}>
                        {room.description}
                      </p>
                    )}
                  </div>
                  {(room.current_listeners || 0) > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium flex-shrink-0" style={{ color: theme.accent }}>
                      <Users className="w-3 h-3" /> {room.current_listeners}
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
