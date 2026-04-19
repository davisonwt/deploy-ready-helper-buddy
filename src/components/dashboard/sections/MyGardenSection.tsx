import React, { useState } from 'react';
import { Sprout, Plus, Music, Leaf, Droplets, Sparkles, TreePine, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { WalletSetupPrompt } from '@/components/wallet/WalletSetupPrompt';
import { SowerBalanceCard } from '@/components/wallet/SowerBalanceCard';
import { StatsCards } from '../StatsCards';
import { GardenSection as GardenOrchards } from './GardenSection';
import { KeeperContentGrid } from './KeeperContentGrid';
import { KeeperHelpButton } from './KeeperHelpButton';
import { SectionHeading } from './SectionHeading';
import { VisualGardenShell } from '@/components/garden/VisualGardenShell';
import { TribalScoreBadge } from '@/components/tribal/TribalScoreBadge';
import { TribalMatchesCards } from '@/components/tribal/TribalMatchesCards';
import { LogisticsPulseCard } from '@/components/tribal/LogisticsPulseCard';
import { PricingPulseCard } from '@/components/tribal/PricingPulseCard';
import { EventsPulseCard } from '@/components/tribal/EventsPulseCard';

interface MyGardenSectionProps {
  theme: DashboardTheme;
  stats: any;
}

const quickActions = [
  { href: '/create-orchard', label: 'New Orchard', icon: Plus, gradient: 'linear-gradient(135deg, #166534, #22c55e)' },
  { href: '/drop-music', label: 'Drop Music', icon: Music, gradient: 'linear-gradient(135deg, #15803d, #4ade80)' },
  { href: '/create-seed', label: 'New Seed', icon: Leaf, gradient: 'linear-gradient(135deg, #14532d, #16a34a)' },
  { href: '/quick-rain', label: 'Quick Rain', icon: Droplets, gradient: 'linear-gradient(135deg, #064e3b, #10b981)' },
];

const myContentItems = [
  { href: '/my-orchards', label: 'My S2G Orchards', icon: TreePine, gradient: 'linear-gradient(135deg, #166534, #15803d)' },
  { href: '/my-seeds', label: 'My S2G Seeds', icon: Leaf, gradient: 'linear-gradient(135deg, #14532d, #166534)' },
  { href: '/my-music', label: 'My S2G Music Library', icon: Music, gradient: 'linear-gradient(135deg, #064e3b, #14532d)' },
  { href: '/my-library', label: 'My S2G Library', icon: BookOpen, gradient: 'linear-gradient(135deg, #052e16, #064e3b)' },
];

export const MyGardenSection: React.FC<MyGardenSectionProps> = ({ theme, stats }) => {
  const [contentOpen, setContentOpen] = useState(false);

  return (
    <div className="space-y-4">
      <SectionHeading
        icon={Sprout}
        title="My Garden"
        subtitle={`${stats.totalFollowers} followers · ${stats.totalOrchards} seeds · ${stats.totalBestowals} bestowals`}
        theme={theme}
        gradientColors={['#16a34a', '#4ade80']}
        rightSlot={
          <div className="flex items-center gap-2">
            <TribalScoreBadge size="sm" showBadges />
            <KeeperHelpButton sectionName="My Garden" />
          </div>
        }
      />

      {/* Living Garden visualization */}
      <VisualGardenShell compact />

      {/* Tribal Collaboration Matches (Phase 2) */}
      <TribalMatchesCards theme={theme} dispatchDm />

      {/* Loaf + Sage intel (Phase 3) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <LogisticsPulseCard theme={theme} />
        <PricingPulseCard theme={theme} />
      </div>

      {/* Tribal Events (Phase 3.5) */}
      <EventsPulseCard theme={theme} />

      {/* Quick link to full matches inbox */}
      <Link
        to="/my-matches"
        className="block rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5 text-center text-xs font-semibold text-primary hover:border-primary/60 hover:bg-primary/10 transition"
      >
        Open full Tribal Matches inbox →
      </Link>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="rounded-xl p-3 text-center shadow-md transition-all hover:scale-105 active:scale-95"
            style={{ background: action.gradient }}
          >
            <action.icon className="w-5 h-5 text-white mx-auto mb-1" />
            <span className="text-[9px] font-semibold text-white/90 block leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Mystery Seed Banner */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-2xl p-4 shadow-lg text-center"
        style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)' }}
      >
        <Sparkles className="w-6 h-6 text-green-800 mx-auto mb-1" />
        <p className="font-bold text-green-900 text-sm">Daily Mystery Seed</p>
        <p className="text-[10px] text-green-800/70">Plant a seed of faith today — watch it grow 🌱</p>
      </motion.div>

      {/* My Content Collapsible */}
      <div>
        <button
          onClick={() => setContentOpen(!contentOpen)}
          className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all"
          style={{ background: theme.secondaryButton }}
        >
          <span className="font-bold text-sm" style={{ color: theme.textPrimary }}>
            My Content
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: theme.accent }}>
              {stats.totalOrchards + (stats.totalSeeds || 0)}
            </span>
            {contentOpen ? (
              <ChevronUp className="w-4 h-4" style={{ color: theme.textSecondary }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: theme.textSecondary }} />
            )}
          </div>
        </button>
        <AnimatePresence>
          {contentOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-3 mt-3">
                {myContentItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="rounded-2xl p-4 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: item.gradient }}
                  >
                    <item.icon className="w-5 h-5 text-white/80 mb-2" />
                    <p className="text-xs font-semibold text-white">{item.label}</p>
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keeper Content Grids (Phase 3) */}
      <KeeperContentGrid theme={theme} variant="personal" />
      <KeeperContentGrid theme={theme} variant="tribal" />

      {/* Wallet */}
      <div className="space-y-3">
        <WalletSetupPrompt variant="card" />
        <SowerBalanceCard compact theme={theme} />
      </div>

      {/* Stats */}
      <StatsCards theme={theme} />

      {/* Orchards */}
      <GardenOrchards theme={theme} />
    </div>
  );
};
