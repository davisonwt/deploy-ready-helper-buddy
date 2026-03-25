import React from 'react';
import { Home, Users, UserPlus, Mail, Bell, TreePine, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { SabbathDashboardBanner } from '@/components/SabbathDashboardBanner';
import SecurityQuestionsAlert from '@/components/auth/SecurityQuestionsAlert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardOverviewSectionProps {
  theme: DashboardTheme;
  profile: any;
  calendarData: any;
  stats: any;
  unreadMessages: number;
  communityUnread: number;
}

export const DashboardOverviewSection: React.FC<DashboardOverviewSectionProps> = ({
  theme, profile, calendarData, stats, unreadMessages, communityUnread,
}) => {
  const displayName = profile?.display_name || profile?.first_name || 'Sower';

  const { data: communityCount } = useQuery({
    queryKey: ['community-keeper-count'],
    queryFn: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statCards = [
    { label: 'Unread Messages', value: unreadMessages, icon: Mail, gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb)' },
    { label: 'Community Updates', value: communityUnread, icon: Bell, gradient: 'linear-gradient(135deg, #4c1d95, #7c3aed)' },
    { label: 'Active Orchards', value: stats.totalOrchards, icon: TreePine, gradient: 'linear-gradient(135deg, #134e4a, #14b8a6)' },
    { label: 'Followers', value: stats.totalFollowers, icon: Heart, gradient: 'linear-gradient(135deg, #312e81, #6366f1)' },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Home className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            Dashboard
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Welcome back, {displayName}
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        <SecurityQuestionsAlert />
        <SabbathDashboardBanner />
      </div>

      {/* Community Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e40af)' }}
      >
        <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-2">S2G Community</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <Users className="w-5 h-5 text-white/80 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{communityCount?.toLocaleString() || '—'}</p>
            <p className="text-[9px] text-white/60">Total Keepers</p>
          </div>
          <div className="text-center">
            <Heart className="w-5 h-5 text-white/80 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.totalFollowers}</p>
            <p className="text-[9px] text-white/60">Your Tribe</p>
          </div>
          <div className="text-center">
            <UserPlus className="w-5 h-5 text-white/80 mx-auto mb-1" />
            <p className="text-xl font-bold text-white">{stats.newFollowersThisWeek || 0}</p>
            <p className="text-[9px] text-white/60">New This Week</p>
          </div>
        </div>
      </motion.div>

      {/* Gradient Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl p-4 text-center shadow-lg"
            style={{ background: card.gradient }}
          >
            <card.icon className="w-6 h-6 text-white/80 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-[10px] text-white/60">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Calendar Quick View */}
      {calendarData && (
        <div
          className="rounded-2xl p-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #3730a3)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📅</span>
            <h3 className="text-sm font-bold text-white">
              Today: Day {calendarData.dayOfMonth}, Month {calendarData.month}
            </h3>
          </div>
          <p className="text-xs text-white/60">
            {calendarData.season} • Year {calendarData.year}
          </p>
        </div>
      )}
    </div>
  );
};
