import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Eye, 
  Users, 
  Heart, 
  Plus, 
  TreePine, 
  Droplets,
  Calendar,
  DollarSign,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { useCountUp } from '@/hooks/useCountUp';
import { useAuth } from '@/hooks/useAuth';
import { useBestowals } from '@/hooks/useBestowals';
import { useRealAnalytics } from '@/hooks/useRealAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { BinanceWalletManager } from '@/components/wallet/BinanceWalletManager';
import LiveActivityWidget from '@/components/LiveActivityWidget';
import Confetti from 'react-confetti';

interface DashboardStatsProps {
  className?: string;
}

export function DashboardStats({ className }: DashboardStatsProps) {
  const { user } = useAuth();
  const { getUserBestowals } = useBestowals();
  const { data: analyticsData } = useRealAnalytics(30);
  
  const [activeSowers, setActiveSowers] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [recentBestowals, setRecentBestowals] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Count-up animations
  const siteVisitors = useCountUp(analyticsData?.visitors?.total || 0);
  const activeSowersCount = useCountUp(activeSowers);
  const followersCount = useCountUp(followers);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      // Fetch active sowers (users who created orchards in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sowerData } = await supabase
        .from('orchards')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const uniqueSowers = new Set(sowerData?.map(s => s.user_id) || []);
      setActiveSowers(uniqueSowers.size);

      // Fetch followers
      const { data: followersData } = await supabase
        .from('followers')
        .select('id')
        .eq('following_id', user.id);
      
      setFollowers(followersData?.length || 0);

      // Fetch recent bestowals
      const bestowalsResult = await getUserBestowals();
      if (bestowalsResult.success) {
        setRecentBestowals(bestowalsResult.data.slice(0, 3));
      }
    };

    fetchStats();
  }, [user?.id, getUserBestowals]);

  const handleTopUp = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1200);
  };

  const handleLetItRain = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1200);
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      
      <div className={cn("space-y-6", className)}>
        {/* Wallet Balance & Top-up (Primary CTA) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Wallet className="h-5 w-5" />
                Wallet Balance & Top-up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BinanceWalletManager showTopUpActions={true} onTopUp={handleTopUp} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Site Visitors */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Site Visitors
                    </p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {siteVisitors.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 30 days of real platform traffic
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Active Sowers */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Active Sowers
                    </p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {activeSowersCount.count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creators actively growing orchards
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* My Followers */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      My Followers
                    </p>
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {followersCount.count}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Community members following you
                    </p>
                  </div>
                  <Heart className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Live Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Radio className="h-5 w-5" />
                Live Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveActivityWidget />
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Bestowals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Heart className="h-5 w-5" />
                Recent Bestowals
              </CardTitle>
              <Link to="/browse-orchards">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  See all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentBestowals.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No bestowals yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start supporting orchards to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBestowals.map((bestowal) => (
                    <motion.div
                      key={bestowal.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-black/20 border border-white/20"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {bestowal.orchards?.title || 'Unknown Orchard'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(bestowal.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(bestowal.amount)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="rounded-2xl bg-white/70 dark:bg-black/30 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-500/10">
            <CardHeader>
              <CardTitle className="text-amber-600 dark:text-amber-400">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/create-orchard">
                    <Button
                      className="w-full h-20 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-400/40 active:scale-95 transition-all"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Plant New Seed
                    </Button>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/browse-orchards">
                    <Button
                      className="w-full h-20 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-400/40 active:scale-95 transition-all"
                    >
                      <TreePine className="h-5 w-5 mr-2" />
                      Browse Orchards
                    </Button>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/tithing" onClick={handleLetItRain}>
                    <Button
                      className="w-full h-20 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-orange-400/40 active:scale-95 transition-all"
                    >
                      <Droplets className="h-5 w-5 mr-2" />
                      Let It Rain
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}

