import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Calendar, Clock, DollarSign, Users, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface LiveSession {
  id: string;
  title: string;
  host_name: string;
  scheduled_at: string;
  pricing_type: string;
  session_fee: number | null;
  listener_count: number;
  mode: string;
}

export function LiveSessionAdBanner() {
  const navigate = useNavigate();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchLiveSession();
    const interval = setInterval(fetchLiveSession, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveSession = async () => {
    try {
      // Check radio first
      const { data: radioData } = await supabase
        .from('radio_schedule')
        .select('id, start_time, listener_count, radio_shows(show_name), radio_djs(dj_name)')
        .eq('status', 'live')
        .limit(1)
        .maybeSingle();

      if (radioData) {
        setSession({
          id: radioData.id,
          title: (radioData as any).radio_shows?.show_name || 'Live Show',
          host_name: (radioData as any).radio_djs?.dj_name || 'DJ',
          scheduled_at: radioData.start_time,
          pricing_type: 'free',
          session_fee: null,
          listener_count: radioData.listener_count || 0,
          mode: 'radio',
        });
        return;
      }

      // Check classrooms
      const { data: classData } = await supabase
        .from('classroom_sessions')
        .select('id, title, scheduled_at, pricing_type, session_fee, is_free, instructor_id')
        .eq('status', 'live')
        .limit(1)
        .maybeSingle();

      if (classData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', (classData as any).instructor_id)
          .maybeSingle();

        setSession({
          id: (classData as any).id,
          title: (classData as any).title,
          host_name: profile?.display_name || 'Instructor',
          scheduled_at: (classData as any).scheduled_at,
          pricing_type: (classData as any).is_free ? 'free' : ((classData as any).pricing_type || 'per_session'),
          session_fee: (classData as any).session_fee,
          listener_count: 0,
          mode: 'classroom',
        });
        return;
      }

      setSession(null);
    } catch (err) {
      console.error('LiveSessionAd error:', err);
    }
  };

  if (!session || dismissed) return null;

  const pricingText = session.pricing_type === 'free' 
    ? '🆓 FREE' 
    : session.pricing_type === 'monthly' 
    ? `💎 $${session.session_fee || 5} USDT/mo` 
    : `💰 $${session.session_fee || 0} USDT`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        className="fixed top-[56px] left-0 right-0 z-[45] px-3 pt-1"
      >
        <div 
          className="max-w-lg mx-auto bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 rounded-xl p-2 shadow-xl cursor-pointer relative"
          onClick={() => {
            if (session.mode === 'radio') navigate(`/grove-station?schedule=${session.id}`);
            else navigate(`/communications-hub?classroom=${session.id}`);
          }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-white"
          >
            <X className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse flex-shrink-0">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge className="bg-white/20 text-white border-0 text-[9px] px-1.5 py-0 animate-pulse">
                  🔴 LIVE NOW
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-[9px] px-1.5 py-0">
                  {pricingText}
                </Badge>
              </div>
              <p className="text-white font-bold text-sm truncate">{session.title}</p>
              <p className="text-white/80 text-xs">
                with {session.host_name} • {format(new Date(session.scheduled_at), 'h:mm a')}
                {session.listener_count > 0 && ` • ${session.listener_count} listening`}
              </p>
            </div>
            <Button size="sm" className="bg-white text-orange-600 hover:bg-white/90 border-0 font-bold flex-shrink-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Join
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
