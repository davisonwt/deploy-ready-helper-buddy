import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Heart, 
  TrendingUp, 
  DollarSign,
  Flame,
  Sparkles
} from 'lucide-react';
import { useMyStats } from '@/hooks/useMyStats';
import { dropDeltaRewards, checkStreakReward, triggerConfettiForFollowers } from '@/lib/gamification/deltaDrops';
import { formatCurrency } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';

export function StatsCards() {
  const { user } = useAuth();
  const { stats, loading, mutate } = useMyStats();
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const [hasTriggeredRewards, setHasTriggeredRewards] = useState<Record<string, boolean>>({});

  // Trigger confetti for daily new followers
  useEffect(() => {
    if (stats?.dailyNewFollowers && stats.dailyNewFollowers >= 5 && !hasTriggeredConfetti) {
      triggerConfettiForFollowers(stats.dailyNewFollowers);
      setHasTriggeredConfetti(true);
    }
  }, [stats?.dailyNewFollowers, hasTriggeredConfetti]);

  // Check for delta rewards
  useEffect(() => {
    if (!stats || !user?.id) return;

    const checkRewards = async () => {
      // Check registered sowers delta
      if (stats.registeredSowersDelta >= 5 && !hasTriggeredRewards.sowers) {
        await dropDeltaRewards(user.id, 'sowers', stats.registeredSowersDelta);
        setHasTriggeredRewards(prev => ({ ...prev, sowers: true }));
      }

      // Check followers delta
      if (stats.followersDelta >= 5 && !hasTriggeredRewards.followers) {
        await dropDeltaRewards(user.id, 'followers', stats.followersDelta);
        setHasTriggeredRewards(prev => ({ ...prev, followers: true }));
      }

      // Check streak reward
      if (stats.streak >= 7 && !hasTriggeredRewards.streak) {
        await checkStreakReward(user.id, stats.streak);
        setHasTriggeredRewards(prev => ({ ...prev, streak: true }));
      }
    };

    checkRewards();
  }, [stats, user?.id, hasTriggeredRewards]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/20 h-32" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardContent className="p-6 text-center text-amber-300/60">
            <p className="text-sm">Loading stats...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cardVariants = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Card 1: S2G Registered Sowers */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 h-full">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-amber-300/80">S2G Registered Sowers</span>
              </div>
              {stats.registeredSowersDelta >= 10 && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Flame className="h-5 w-5 text-emerald-400" />
                </motion.div>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-3xl sm:text-4xl tracking-tighter text-white">
                {stats.registeredSowers.toLocaleString()}
              </span>
              {stats.registeredSowersDelta !== 0 && (
                <Badge className={`bg-transparent border text-xs ${stats.registeredSowersDelta >= 10 ? 'text-emerald-400 border-emerald-400' : stats.registeredSowersDelta > 0 ? 'text-amber-400 border-amber-400' : 'text-red-400 border-red-400'}`}>
                  {stats.registeredSowersDelta > 0 ? '+' : ''}{stats.registeredSowersDelta} today
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Card 2: My Followers */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 h-full">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={stats.followersDelta > 0 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Heart className="h-5 w-5 text-amber-400 fill-amber-400" />
              </motion.div>
              <span className="text-sm text-amber-300/80">My Followers</span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-mono text-3xl sm:text-4xl tracking-tighter text-white">
                {stats.followers.toLocaleString()}
              </span>
              {stats.followersDelta !== 0 && (
                <Badge className={`bg-transparent border text-xs ${stats.followersDelta > 0 ? 'text-emerald-400 border-emerald-400' : 'text-red-400 border-red-400'}`}>
                  {stats.followersDelta > 0 ? '+' : ''}{stats.followersDelta} today
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Card 3: My Daily New Followers */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 h-full">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-amber-300/80">Daily New Followers</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl sm:text-4xl tracking-tighter text-white">
                {stats.dailyNewFollowers}
              </span>
            </div>
            {stats.dailyNewFollowers >= 5 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2"
              >
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400 text-xs">
                  🎉 Milestone!
                </Badge>
              </motion.div>
            )}
            {stats.dailyNewFollowers === 0 && (
              <p className="text-xs text-amber-300/60 mt-2">Start growing your community!</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Card 4: My Daily Bestowals */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 h-full">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-amber-300/80">Daily Bestowals</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-mono text-3xl sm:text-4xl tracking-tighter text-white">
                {formatCurrency(stats.dailyBestowals)}
              </span>
            </div>
            {stats.dailyBestowalsProducts && stats.dailyBestowalsProducts.length > 0 ? (
              <div className="flex gap-1 mt-2 flex-wrap">
                {stats.dailyBestowalsProducts.slice(0, 3).map((product, i) => (
                  <Badge key={i} className="bg-amber-500/20 text-amber-300 border-amber-400 text-xs truncate max-w-full">
                    {product.name}
                  </Badge>
                ))}
              </div>
            ) : stats.dailyBestowals === 0 && (
              <p className="text-xs text-amber-300/60 mt-2">Make your first bestowal today!</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Card 5: My Monthly Bestowals */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 h-full">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-amber-300/80">Monthly Bestowals</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono text-3xl sm:text-4xl tracking-tighter text-white">
                {formatCurrency(stats.monthlyBestowals)}
              </span>
            </div>
            {/* Progress ring to next milestone */}
            <div className="relative w-16 h-16 mx-auto flex-shrink-0">
              <svg className="transform -rotate-90 w-16 h-16" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="rgba(251, 191, 36, 0.2)"
                  strokeWidth="4"
                  fill="none"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - Math.min(stats.monthlyBestowals / 10, 1))}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 26 * (1 - Math.min(stats.monthlyBestowals / 10, 1)) }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center px-1">
                  <span className="text-[10px] text-amber-300 block leading-tight">
                    {Math.min(Math.ceil(stats.monthlyBestowals / 5) * 5, 10)}
                  </span>
                  <span className="text-[8px] text-amber-300/60 block mt-0.5 leading-tight">
                    USDC
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-300/60 mt-2 text-center">
              {stats.monthlyBestowals < 5 
                ? `${(5 - stats.monthlyBestowals).toFixed(2)} USDC to next tier`
                : 'Keep it up!'
              }
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

