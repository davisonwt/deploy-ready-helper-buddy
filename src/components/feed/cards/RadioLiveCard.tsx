import React from 'react';
import { Link } from 'react-router-dom';
import { Radio, Users, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

export const RadioLiveCard: React.FC = () => {
  // Fetch active radio sessions
  const { data: radioSession } = useQuery({
    queryKey: ['feed-radio-live'],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_rooms')
        .select('id, name, description, current_listeners, created_by')
        .eq('room_type', 'radio')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  if (!radioSession) return null;

  return (
    <Link to={`/grove-station`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-card border border-border/30 p-4 hover:border-red-500/30 transition-all group"
      >
        <div className="flex items-start gap-3">
          {/* Animated equalizer */}
          <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0 relative">
            <Radio className="w-5 h-5 text-red-400" />
            <span className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate group-hover:text-red-400 transition-colors">
              {radioSession.name || 'S2G Radio Live'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {radioSession.description || 'Community radio is broadcasting now'}
            </p>

            <div className="flex items-center gap-3 mt-2">
              {/* Equalizer bars */}
              <div className="flex items-end gap-[2px] h-3">
                {[0.6, 1, 0.4, 0.8, 0.5].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] bg-red-400 rounded-full"
                    animate={{ height: [`${h * 12}px`, `${h * 4}px`, `${h * 12}px`] }}
                    transition={{ repeat: Infinity, duration: 0.6 + i * 0.1, ease: 'easeInOut' }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{radioSession.current_listeners || 0} listening</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
