import React from 'react';
import { Cloud, HandHeart, Gift, Heart, Droplets, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface LetItRainSectionProps {
  theme: DashboardTheme;
}

export const LetItRainSection: React.FC<LetItRainSectionProps> = ({ theme }) => {
  const quickRain = (amount: number, label: string) => {
    toast.success(`${amount.toFixed(2)} USDC bestowed to a random creator!`, {
      description: `${label} — May it grow abundantly 🌱`,
      icon: <Droplets className="w-5 h-5" style={{ color: theme.accent }} />,
      duration: 4000,
    });
  };

  const rainCards = [
    { href: '/tithing', title: 'Tithing', subtitle: 'Give 10% · Support the work', icon: HandHeart },
    { href: '/free-will-gifting', title: 'Free-Will Bestowing', subtitle: 'Give as led · Any amount', icon: Gift },
    { href: '/364yhvh-orchards', title: 'Rain on Orchards', subtitle: 'Support community orchards', icon: Cloud },
    { href: '/support-us', title: 'Support Us', subtitle: 'Help grow the community', icon: Heart },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl" style={{ background: theme.secondaryButton }}>
          <Cloud className="w-5 h-5" style={{ color: theme.accent }} />
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight" style={{ color: theme.textPrimary }}>
            Let It Rain
          </h2>
          <p className="text-[10px]" style={{ color: theme.textSecondary }}>
            Bestow · Bless · Grow 💧
          </p>
        </div>
      </div>

      {/* Quick Bestow */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => quickRain(0.50, 'Quick Rain')}
          className="rounded-xl p-4 text-center border transition-all"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <Droplets className="w-7 h-7 mx-auto mb-2" style={{ color: theme.accent }} />
          <span className="block font-bold text-sm" style={{ color: theme.textPrimary }}>Quick Rain</span>
          <span className="block text-xs mt-0.5" style={{ color: theme.textSecondary }}>0.50 USDC</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => quickRain(1.00, 'Body Rain')}
          className="rounded-xl p-4 text-center border transition-all"
          style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
        >
          <TrendingUp className="w-7 h-7 mx-auto mb-2" style={{ color: theme.accent }} />
          <span className="block font-bold text-sm" style={{ color: theme.textPrimary }}>Body Rain</span>
          <span className="block text-xs mt-0.5" style={{ color: theme.textSecondary }}>1.00 USDC</span>
        </motion.button>
      </div>

      {/* Ways to Bestow */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
          Ways to Bestow
        </p>
        {rainCards.map((card, index) => (
          <Link
            key={index}
            to={card.href}
            className="block rounded-xl p-4 border transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: theme.cardBg, borderColor: theme.cardBorder, boxShadow: `0 4px 16px ${theme.shadow}` }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.secondaryButton }}>
                <card.icon className="w-5 h-5" style={{ color: theme.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: theme.textPrimary }}>{card.title}</div>
                <span className="text-xs" style={{ color: theme.textSecondary }}>{card.subtitle}</span>
              </div>
              <span className="text-lg" style={{ color: theme.textSecondary }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
