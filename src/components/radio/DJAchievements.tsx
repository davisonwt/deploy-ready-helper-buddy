import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface DJBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  badge_icon: string;
  badge_description: string;
  earned_at: string;
}

// All possible badges for display (earned + locked)
const ALL_BADGES = [
  { type: 'first_broadcast', name: 'First Broadcast', icon: '🎙️', desc: 'Complete your first broadcast', requirement: '1 show' },
  { type: 'master_mixer', name: 'Master Mixer', icon: '🎛️', desc: 'Complete 5 broadcasts', requirement: '5 shows' },
  { type: 'veteran_broadcaster', name: 'Veteran Broadcaster', icon: '👑', desc: 'Complete 25 broadcasts', requirement: '25 shows' },
  { type: 'crowd_puller', name: 'Crowd Puller', icon: '🎪', desc: 'Reach 100+ total listeners', requirement: '100 listeners' },
  { type: 'top_bestowed', name: 'Seed Magnet', icon: '🌱', desc: 'Receive 100+ seeds in bestowals', requirement: '100 seeds' },
  { type: 'streak_king', name: 'Streak King', icon: '🔥', desc: 'Broadcast 7 days in a row', requirement: '7 day streak' },
];

interface DJAchievementsProps {
  djId: string;
}

export const DJAchievements: React.FC<DJAchievementsProps> = ({ djId }) => {
  const [badges, setBadges] = useState<DJBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!djId) return;

    const fetch = async () => {
      // Trigger badge check
      try {
        await supabase.rpc('check_dj_badges', { p_dj_id: djId });
      } catch (e) {
        console.warn('Badge check failed:', e);
      }

      const { data } = await supabase
        .from('radio_dj_badges')
        .select('*')
        .eq('dj_id', djId)
        .order('earned_at');

      if (data) setBadges(data);
      setLoading(false);
    };

    fetch();
  }, [djId]);

  const earnedTypes = new Set(badges.map((b) => b.badge_type));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          DJ Achievements
          <Badge variant="secondary" className="ml-auto">
            {badges.length} / {ALL_BADGES.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading badges...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TooltipProvider>
              <AnimatePresence>
                {ALL_BADGES.map((badge, i) => {
                  const earned = earnedTypes.has(badge.type);
                  const earnedData = badges.find((b) => b.badge_type === badge.type);

                  return (
                    <Tooltip key={badge.type}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-4 rounded-xl border-2 text-center transition-all ${
                            earned
                              ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 shadow-md'
                              : 'border-border bg-muted/30 opacity-50 grayscale'
                          }`}
                        >
                          <div className="text-3xl mb-1">{badge.icon}</div>
                          <p className="text-xs font-semibold truncate">{badge.name}</p>
                          {earned && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(earnedData!.earned_at).toLocaleDateString()}
                            </p>
                          )}
                          {!earned && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {badge.requirement}
                            </p>
                          )}
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-medium">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">{badge.desc}</p>
                        {earned && (
                          <p className="text-xs text-primary mt-1">✅ Earned!</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </AnimatePresence>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
