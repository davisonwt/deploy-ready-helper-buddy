import React, { useEffect, useState } from 'react';
import { Zap, ChevronRight, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LiveBadge, UpcomingBadge } from '@/components/chat/SparkleEffects';
import { format } from 'date-fns';

interface Props {
  theme: DashboardTheme;
}

export const SkillDropSubSection: React.FC<Props> = ({ theme }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('skilldrop_sessions')
        .select('*, presenter_profile:profiles!lecture_halls_presenter_profile_id_fkey(display_name, avatar_url)')
        .in('status', ['live', 'scheduled'])
        .gte('scheduled_at', new Date(Date.now() - 3600000).toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(4);
      setSessions(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>SkillDrop</h3>
        </div>
        <Link to="/communications-hub" className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: theme.accent }}>
          See All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl p-3 text-center border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>No SkillDrop sessions active</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sessions.map((s, i) => {
            const isLive = s.status === 'live';
            const profile = s.presenter_profile;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div
                  className="rounded-xl p-2.5 border cursor-pointer hover:scale-[1.01] transition-transform"
                  style={{ background: theme.cardBg, borderColor: isLive ? 'hsl(var(--destructive) / 0.45)' : theme.cardBorder }}
                  onClick={() => navigate('/communications-hub')}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-[9px]" style={{ backgroundColor: theme.secondaryButton, color: theme.textPrimary }}>
                        {profile?.display_name?.charAt(0) || '⚡'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>{s.title}</p>
                      <div className="flex items-center gap-1 text-[9px]" style={{ color: theme.textSecondary }}>
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(s.scheduled_at), 'MMM d, HH:mm')}
                        {s.pricing_type !== 'free' && <span>· {s.pricing_type}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isLive ? <LiveBadge /> : <UpcomingBadge />}
                      <Button size="sm" className="text-[9px] h-5 px-2 rounded-full font-semibold" style={{ background: isLive ? theme.primaryButton : theme.secondaryButton, color: theme.textPrimary }}>
                        {isLive ? 'Join' : 'View'}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
