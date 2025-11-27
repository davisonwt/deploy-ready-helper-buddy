import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
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
  Radio,
  User
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { BinanceWalletManager } from '@/components/wallet/BinanceWalletManager';
import LiveActivityWidget from '@/components/LiveActivityWidget';
import { useRealAnalytics } from '@/hooks/useRealAnalytics';
import { useBestowals } from '@/hooks/useBestowals';
import { formatCurrency } from '@/utils/formatters';
import CountUp from 'react-countup';
import confetti from 'canvas-confetti';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { getUserBestowals } = useBestowals();
  const { data: analyticsData } = useRealAnalytics(30);
  
  const [profile, setProfile] = useState(null);
  const [activeSowers, setActiveSowers] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [recentBestowals, setRecentBestowals] = useState([]);
  const [error, setError] = useState(null);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (user && !authLoading) {
      setError(null);
      
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') {
            setError(`Failed to load profile: ${error.message}`);
          } else {
            setProfile(data);
          }
        } catch (error) {
          setError(`Failed to load profile: ${error?.message}`);
        }
      };

      const fetchStats = async () => {
        try {
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
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };

      Promise.all([fetchProfile(), fetchStats()]).catch(err => {
        console.error('Error in data fetching:', err);
        setError('Failed to load dashboard data');
      });
    }
  }, [user, authLoading, getUserBestowals]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      ticks: 50,
      gravity: 1.2,
      origin: { y: 0.6 }
    });
  };

  const handleTopUp = () => {
    triggerConfetti();
  };

  const handleLetItRain = () => {
    triggerConfetti();
  };

  // Show loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 via-orange-100 to-yellow-50 dark:from-gray-900 dark:via-orange-950 dark:to-amber-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 dark:border-amber-300 mx-auto mb-4"></div>
          <p className="text-base text-gray-800 dark:text-gray-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 via-orange-100 to-yellow-50 dark:from-gray-900 dark:via-orange-950 dark:to-amber-950">
        <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30 p-8">
          <div className="text-center">
            <p className="text-base text-gray-800 dark:text-gray-200 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-6 py-3 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const staggerDelay = (index) => index * 0.1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-100 to-yellow-50 dark:from-gray-900 dark:via-orange-950 dark:to-amber-950 pb-24 md:pb-6">
      <main className="min-h-screen w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max">
        
        {/* a. Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(0) }}
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-600/30 dark:border-orange-500/30 shadow-lg flex-shrink-0">
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200">
                    {getGreeting()}, {profile?.first_name || profile?.display_name || 'Friend'}!
                  </h1>
                  <p className="text-sm text-amber-800/90 dark:text-amber-300/80 mt-1">
                    Ready to grow your orchard today?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* b. Wallet Balance & Top-up (Primary CTA) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(1) }}
          className="col-span-1 sm:col-span-2"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200">
                <Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Wallet Balance & Top-up
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BinanceWalletManager showTopUpActions={true} onTopUp={handleTopUp} />
            </CardContent>
          </Card>
        </motion.div>

        {/* c. Site Visitors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(2) }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="transition-transform hover:-translate-y-0.5"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30 h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    <p className="text-sm text-amber-800/90 dark:text-amber-300/80">
                      Site Visitors
                    </p>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-amber-100">
                    <CountUp 
                      start={0} 
                      end={analyticsData?.visitors?.total || 0} 
                      duration={1.2} 
                      separator=","
                    />
                  </p>
                  <p className="text-sm text-amber-800/90 dark:text-amber-300/80 mt-1">
                    Last 30 days of real platform traffic
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* d. Active Sowers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(3) }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="transition-transform hover:-translate-y-0.5"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30 h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    <p className="text-sm text-amber-800/90 dark:text-amber-300/80">
                      Active Sowers
                    </p>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-amber-100">
                    <CountUp 
                      start={0} 
                      end={activeSowers} 
                      duration={1.2} 
                      separator=","
                    />
                  </p>
                  <p className="text-sm text-amber-800/90 dark:text-amber-300/80 mt-1">
                    Creators actively growing orchards
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* e. My Followers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(4) }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="transition-transform hover:-translate-y-0.5"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30 h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    <p className="text-sm text-amber-800/90 dark:text-amber-300/80">
                      My Followers
                    </p>
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-amber-100">
                    <CountUp 
                      start={0} 
                      end={followers} 
                      duration={1.2} 
                      separator=","
                    />
                  </p>
                  <p className="text-sm text-amber-800/90 dark:text-amber-300/80 mt-1">
                    Community members following you
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* f. Live Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(5) }}
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200">
                <Radio className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Live Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LiveActivityWidget />
            </CardContent>
          </Card>
        </motion.div>

        {/* g. Recent Bestowals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(6) }}
          className="col-span-1 sm:col-span-2 lg:col-span-3"
        >
          <Card className="rounded-3xl bg-amber-50/80 dark:bg-gray-900/60 backdrop-blur-xl border border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl sm:text-3xl font-bold text-amber-900 dark:text-amber-200">
                <Heart className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                Recent Bestowals
              </CardTitle>
              <Link to="/browse-orchards">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="border-2 border-amber-600 text-amber-700 dark:text-amber-300 rounded-2xl px-5 py-2.5 hover:bg-amber-600/10 min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
                >
                  See all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentBestowals.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-amber-700/80 dark:text-amber-400/70 mb-3" />
                  <p className="text-base text-gray-800 dark:text-gray-200">No bestowals yet</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-1">
                    Start supporting orchards to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBestowals.map((bestowal) => (
                    <motion.div
                      key={bestowal.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 dark:bg-gray-800/50 border border-amber-200/30 dark:border-orange-900/30 transition-transform hover:-translate-y-0.5"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                          {bestowal.orchards?.title || 'Unknown Orchard'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-amber-700/80 dark:text-amber-400/70 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(bestowal.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
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

        {/* h. Quick Actions - Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: staggerDelay(7) }}
          className="hidden md:flex col-span-1 sm:col-span-2 lg:col-span-3 gap-4"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
            <Link to="/create-orchard">
              <Button
                className="w-full h-16 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-6 py-3 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Plant New Seed
              </Button>
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
            <Link to="/browse-orchards">
              <Button
                className="w-full h-16 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-6 py-3 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
              >
                <TreePine className="h-5 w-5 mr-2" />
                Browse Orchards
              </Button>
            </Link>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
            <Link to="/tithing" onClick={handleLetItRain}>
              <Button
                className="w-full h-16 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-6 py-3 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
              >
                <Droplets className="h-5 w-5 mr-2" />
                Let It Rain
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </main>

      {/* Quick Actions - Mobile Sticky Bottom Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: staggerDelay(7) }}
        className="md:hidden fixed bottom-0 left-0 right-0 pb-safe bg-amber-50/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-amber-200/30 dark:border-orange-900/30 shadow-2xl shadow-amber-900/10 dark:shadow-black/30 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-3 gap-2">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Link to="/create-orchard">
              <Button
                className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-3 py-2 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all text-xs sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
              >
                <Plus className="h-5 w-5 mb-1" />
                <span>Plant Seed</span>
              </Button>
            </Link>
          </motion.div>

          <motion.div whileTap={{ scale: 0.95 }}>
            <Link to="/browse-orchards">
              <Button
                className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-3 py-2 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all text-xs sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
              >
                <TreePine className="h-5 w-5 mb-1" />
                <span>Browse</span>
              </Button>
            </Link>
          </motion.div>

          <motion.div whileTap={{ scale: 0.95 }}>
            <Link to="/tithing" onClick={handleLetItRain}>
              <Button
                className="w-full h-14 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-2xl px-3 py-2 shadow-lg hover:shadow-orange-600/40 active:scale-95 transition-all text-xs sm:text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 dark:focus:ring-offset-gray-900 focus:ring-orange-500"
              >
                <Droplets className="h-5 w-5 mb-1" />
                <span>Let It Rain</span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
