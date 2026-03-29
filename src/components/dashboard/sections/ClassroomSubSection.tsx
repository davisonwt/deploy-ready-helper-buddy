import React, { useEffect, useState } from 'react';
import { GraduationCap, ChevronRight, Users, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LiveBadge, UpcomingBadge } from '@/components/chat/SparkleEffects';
import { format, isAfter } from 'date-fns';

interface Props {
  theme: DashboardTheme;
}

export const ClassroomSubSection: React.FC<Props> = ({ theme }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('classroom_sessions')
        .select('*, profiles:instructor_profile_id(display_name, avatar_url)')
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
          <GraduationCap className="w-3.5 h-3.5" style={{ color: theme.accent }} />
          <h3 className="text-sm font-bold" style={{ color: theme.textPrimary }}>Classrooms</h3>
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
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>No active classrooms right now</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sessions.map((s, i) => {
            const isLive = s.status === 'live';
            const profile = s.profiles;
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div
                  className="rounded-xl border cursor-pointer hover:scale-[1.01] transition-transform overflow-hidden"
                  style={{ background: theme.cardBg, borderColor: isLive ? 'hsl(var(--destructive) / 0.45)' : theme.cardBorder }}
                  onClick={() => navigate('/communications-hub')}
                >
                  {/* Banner image */}
                  <div className="relative h-[60px] overflow-hidden">
                    <img src="/images/sessions/classroom.jpg" alt="Classroom" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {isLive && (
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[8px] font-bold text-white">LIVE</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]" style={{ backgroundColor: theme.secondaryButton, color: theme.textPrimary }}>
                          {profile?.display_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: theme.textPrimary }}>{s.title}</p>
                        <div className="flex items-center gap-1 text-[9px]" style={{ color: theme.textSecondary }}>
                          <Clock className="w-2.5 h-2.5" />
                          {format(new Date(s.scheduled_at), 'MMM d, HH:mm')}
                          {s.duration_minutes && <span>· {s.duration_minutes}min</span>}
                          {s.pricing_type === 'free' || s.is_free ? (
                            <span className="ml-1 text-green-500 font-semibold">FREE</span>
                          ) : s.session_fee ? (
                            <span className="ml-1 font-semibold" style={{ color: theme.accent }}>R{s.session_fee}</span>
                          ) : null}
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
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
