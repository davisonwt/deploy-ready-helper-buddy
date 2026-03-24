import React, { useEffect, useState } from 'react';
import { Radio, Play, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface RadioSectionProps {
  theme: DashboardTheme;
}

export const RadioSection: React.FC<RadioSectionProps> = ({ theme }) => {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSlots = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase
        .from('radio_scheduled_slots' as any)
        .select('id, time_slot_date, start_time, end_time, show_subject, broadcast_mode, status, radio_djs(dj_name, avatar_url)')
        .gte('time_slot_date', today)
        .eq('approval_status', 'approved')
        .order('time_slot_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5) as any);
      setSlots(data || []);
      setLoading(false);
    };
    fetchSlots();
  }, []);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: theme.secondaryButton }}>
            <Radio className="w-4 h-4" style={{ color: theme.accent }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: theme.textPrimary }}>
            Grove Station Radio
          </h2>
        </div>
        <Link to="/grove-station" className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : slots.length === 0 ? (
        <div
          className="rounded-xl p-4 text-center border"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder }}
        >
          <p className="text-xs" style={{ color: theme.textSecondary }}>No upcoming shows — tune in later!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to="/grove-station">
                <div
                  className="rounded-xl p-3 border flex items-center gap-3 hover:scale-[1.01] transition-transform"
                  style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 12px ${theme.shadow}` }}
                >
                  <div className="p-2 rounded-lg flex-shrink-0" style={{ background: theme.secondaryButton }}>
                    <Play className="w-4 h-4" style={{ color: theme.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>
                      {slot.show_subject || 'Open Slot'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" style={{ color: theme.textSecondary }} />
                      <span className="text-[10px]" style={{ color: theme.textSecondary }}>
                        {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                      </span>
                      {slot.radio_djs?.dj_name && (
                        <span className="text-[10px] font-medium" style={{ color: theme.accent }}>
                          · {slot.radio_djs.dj_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0"
                    style={{ background: theme.secondaryButton, color: theme.accent }}
                  >
                    {slot.broadcast_mode === 'live' ? '🔴 Live' : slot.broadcast_mode}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
