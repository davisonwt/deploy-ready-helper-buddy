import React from 'react';
import { Settings, Shield, Users, BarChart3, MessageSquare, Radio, Wallet, Leaf, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { useRoles } from '@/hooks/useRoles';

interface GosatsSectionProps {
  theme: DashboardTheme;
}

const quickAccessCards = [
  { href: '/admin/dashboard', title: 'Dashboard', icon: BarChart3, gradient: 'linear-gradient(135deg, #9a3412, #ea580c)' },
  { href: '/grove-station', title: 'Radio', icon: Radio, gradient: 'linear-gradient(135deg, #991b1b, #ef4444)' },
  { href: '/admin/wallets', title: 'Wallets', icon: Wallet, gradient: 'linear-gradient(135deg, #831843, #ec4899)' },
  { href: '/admin/seeds', title: 'Seeds', icon: Leaf, gradient: 'linear-gradient(135deg, #115e59, #14b8a6)' },
];

const managementTools = [
  { href: '/admin/users', title: 'User Management', subtitle: 'Manage users & roles', icon: Users, gradient: 'linear-gradient(135deg, #44403c, #78716c)' },
  { href: '/admin/analytics', title: 'Analytics', subtitle: 'Platform insights & metrics', icon: BarChart3, gradient: 'linear-gradient(135deg, #3f3f46, #71717a)' },
  { href: '/admin/moderation', title: 'Content Moderation', subtitle: 'Review flagged content', icon: Shield, gradient: 'linear-gradient(135deg, #292524, #57534e)' },
  { href: '/gosat-chat', title: 'GoSat Chat', subtitle: 'Team communication', icon: MessageSquare, gradient: 'linear-gradient(135deg, #1c1917, #44403c)' },
];

export const GosatsSection: React.FC<GosatsSectionProps> = ({ theme }) => {
  const { isAdminOrGosat, loading } = useRoles();

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
        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
          <p className="text-xs animate-pulse text-white/50">Loading access...</p>
        </div>
      ) : !isAdminOrGosat ? (
        <div className="rounded-2xl p-6 text-center shadow-lg" style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}>
          <Shield className="w-8 h-8 mx-auto mb-2 text-white/40" />
          <p className="text-sm font-medium text-white">Restricted Access</p>
          <p className="text-xs mt-1 text-white/50">
            GoSat admin tools are only available to authorized team members.
          </p>
        </div>
      ) : (
        <>
          {/* Quick Access Grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickAccessCards.map((card) => (
              <motion.div key={card.title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to={card.href}
                  className="block rounded-2xl p-5 shadow-lg"
                  style={{ background: card.gradient }}
                >
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white text-sm">{card.title}</h3>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Management Tools */}
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
            Management Tools
          </p>
          <div className="space-y-2">
            {managementTools.map((tool) => (
              <motion.div key={tool.title} whileTap={{ scale: 0.98 }}>
                <Link
                  to={tool.href}
                  className="flex items-center gap-4 rounded-2xl p-4 shadow-md"
                  style={{ background: tool.gradient }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <tool.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white">{tool.title}</div>
                    <span className="text-[10px] text-white/50">{tool.subtitle}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
