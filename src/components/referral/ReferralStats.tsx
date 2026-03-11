import { Card, CardContent } from '@/components/ui/card';
import { MousePointerClick, UserPlus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReferralStatsProps {
  totalClicks: number;
  totalSignups: number;
  circleSize: number;
  theme: any;
}

export function ReferralStats({ totalClicks, totalSignups, circleSize, theme }: ReferralStatsProps) {
  const stats = [
    { label: 'Ripples Sent', value: totalClicks, icon: MousePointerClick, emoji: '🌊' },
    { label: 'New Ripples', value: totalSignups, icon: UserPlus, emoji: '🌱' },
    { label: 'Tribe Size', value: circleSize, icon: Users, emoji: '🤝' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="border shadow-lg" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">{stat.emoji}</div>
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: theme.accent }}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-medium" style={{ color: theme.textSecondary }}>
                {stat.label}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
