import React from 'react';
import { Settings, Shield, Users, BarChart3, MessageSquare, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { useRoles } from '@/hooks/useRoles';

interface GosatsSectionProps {
  theme: DashboardTheme;
}

export const GosatsSection: React.FC<GosatsSectionProps> = ({ theme }) => {
  const { isGosat, isAdmin, isAdminOrGosat, loading } = useRoles();

  const adminLinks = [
    { href: '/admin/users', title: 'User Management', subtitle: 'Manage users & roles', icon: Users },
    { href: '/admin/analytics', title: 'Analytics', subtitle: 'Platform insights & metrics', icon: BarChart3 },
    { href: '/admin/moderation', title: 'Content Moderation', subtitle: 'Review flagged content', icon: Shield },
    { href: '/gosat-chat', title: 'GoSat Chat', subtitle: 'Team communication', icon: MessageSquare },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Settings className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            GoSat's
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Administration & platform tools
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl p-6 border text-center" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <p className="text-xs animate-pulse" style={{ color: theme.textSecondary }}>Loading access...</p>
        </div>
      ) : !isAdminOrGosat ? (
        <div className="rounded-xl p-6 border text-center" style={{ background: theme.cardBg, borderColor: theme.cardBorder }}>
          <Shield className="w-8 h-8 mx-auto mb-2" style={{ color: theme.textSecondary }} />
          <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>Restricted Access</p>
          <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
            GoSat admin tools are only available to authorized team members.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {adminLinks.map((link, index) => (
            <Link
              key={index}
              to={link.href}
              className="block rounded-xl p-4 border transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.secondaryButton }}>
                  <link.icon className="w-5 h-5" style={{ color: theme.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{link.title}</div>
                  <span className="text-xs" style={{ color: theme.textSecondary }}>{link.subtitle}</span>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: theme.textSecondary }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
