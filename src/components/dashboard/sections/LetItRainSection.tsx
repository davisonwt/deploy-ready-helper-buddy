import React from 'react';
import { Cloud, HandHeart, Gift, Heart, Droplets, TrendingUp } from 'lucide-react';
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
      icon: <Droplets className="w-5 h-5 text-amber-400" />,
      duration: 4000,
    });
  };

  const rainCards = [
    { href: '/tithing', title: 'Tithing', subtitle: 'Give 10% · Support the work', icon: HandHeart, gradient: 'linear-gradient(135deg, #92400e, #d97706)' },
    { href: '/free-will-gifting', title: 'Free-Will Bestowing', subtitle: 'Give as led · Any amount', icon: Gift, gradient: 'linear-gradient(135deg, #9a3412, #ea580c)' },
    { href: '/364yhvh-orchards', title: 'Rain on Orchards', subtitle: 'Support community orchards', icon: Cloud, gradient: 'linear-gradient(135deg, #7c2d12, #b45309)' },
    { href: '/support-us', title: 'Support Us', subtitle: 'Help grow the community', icon: Heart, gradient: 'linear-gradient(135deg, #78350f, #a16207)' },
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
          className="rounded-2xl p-4 text-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #451a03, #92400e)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
            <Droplets className="w-5 h-5 text-amber-300" />
          </div>
          <span className="block font-bold text-sm text-white">Quick Rain</span>
          <span className="block text-[10px] text-white/60 mt-0.5">0.50 USDC</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => quickRain(1.00, 'Body Rain')}
          className="rounded-2xl p-4 text-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #78350f, #b45309)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-amber-300" />
          </div>
          <span className="block font-bold text-sm text-white">Body Rain</span>
          <span className="block text-[10px] text-white/60 mt-0.5">1.00 USDC</span>
        </motion.button>
      </div>

      {/* Ways to Bestow */}
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>
        Ways to Bestow
      </p>
      <div className="grid grid-cols-2 gap-3">
        {rainCards.map((card) => (
          <motion.div key={card.title} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to={card.href}
              className="block rounded-2xl p-4 shadow-lg"
              style={{ background: card.gradient }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-3">
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-sm">{card.title}</h3>
              <p className="text-[10px] text-white/60 mt-0.5">{card.subtitle}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
