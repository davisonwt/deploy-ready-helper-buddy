import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Radio, X, ChevronUp, ChevronDown, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingLiveWidget() {
  const navigate = useNavigate();
  const [liveSessions, setLiveSessions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchLiveSessions();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveSessions, 30000);

    // Set up realtime subscription
    const channel = supabase
      .channel('live-sessions-floating')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_schedule'
        },
        () => {
          fetchLiveSessions();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          id,
          listener_count,
          radio_shows (
            show_name
          ),
          radio_djs (
            dj_name
          )
        `)
        .eq('status', 'live')
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      const sessions = data || [];
      setLiveSessions(sessions);
      setIsVisible(sessions.length > 0);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl shadow-2xl border-2 border-white/20 overflow-hidden max-w-sm">
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-white animate-pulse" />
            <span className="font-bold text-white">
              {liveSessions.length} LIVE NOW
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-white/20 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 space-y-2 bg-white/10 backdrop-blur-sm">
                {liveSessions.slice(0, 3).map((session) => (
                  <div
                    key={session.id}
                    className="bg-white/20 rounded-lg p-3 hover:bg-white/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/grove-station')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {session.radio_shows?.show_name}
                        </p>
                        <p className="text-white/80 text-xs truncate">
                          {session.radio_djs?.dj_name}
                        </p>
                      </div>
                      <Badge className="bg-white/30 text-white border-0 shrink-0">
                        {session.listener_count || 0} 👂
                      </Badge>
                    </div>
                  </div>
                ))}

                <Button
                  className="w-full bg-white hover:bg-white/90 text-red-600 font-bold"
                  onClick={() => navigate('/grove-station')}
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  Listen Now
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
