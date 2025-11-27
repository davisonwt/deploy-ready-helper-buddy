import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyStats } from '@/hooks/useMyStats';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/formatters';
import { 
  TrendingUp, 
  Trophy, 
  Share2, 
  X,
  Heart,
  DollarSign,
  Flame,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardTable } from '@/components/stats/LeaderboardTable';
import { MarketingAnalyticsTab } from '@/components/stats/MarketingAnalyticsTab';

export default function StatsPage() {
  const { user } = useAuth();
  const { stats, loading } = useMyStats();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  const handleShare = async () => {
    setIsSharing(true);
    // Generate OG image and share
    // For now, just copy to clipboard
    const shareText = `Join me on sow2grow! Followers: ${stats?.followers || 0}, Bestowals: ${formatCurrency(stats?.monthlyBestowals || 0)}`;
    await navigator.clipboard.writeText(shareText);
    setIsSharing(false);
    // TODO: Generate OG image and share
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-yellow-900 dark:from-black dark:via-amber-950 dark:to-orange-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-amber-300">Loading your stats...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-yellow-900 dark:from-black dark:via-amber-950 dark:to-orange-950 flex items-center justify-center p-4">
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20">
          <CardContent className="p-8 text-center">
            <p className="text-amber-300 mb-4">Unable to load stats</p>
            <Button onClick={() => window.location.reload()} className="bg-amber-500 hover:bg-amber-600">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-orange-950 to-yellow-900 dark:from-black dark:via-amber-950 dark:to-orange-950 p-4 sm:p-6 lg:p-8">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="text-amber-300 hover:text-white hover:bg-amber-500/20"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">My S2G Stats</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="text-amber-300 hover:text-white hover:bg-amber-500/20"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Hero Summary - Auto-animating */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Heart className="h-8 w-8 text-amber-400 mx-auto mb-2 fill-amber-400" />
                </motion.div>
                <div className="font-mono text-4xl font-bold text-white mb-1">
                  {stats?.followers || 0}
                </div>
                <div className="text-sm text-amber-300/80">Followers</div>
              </div>
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                >
                  <DollarSign className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                </motion.div>
                <div className="font-mono text-4xl font-bold text-white mb-1">
                  {formatCurrency(stats?.monthlyBestowals || 0)}
                </div>
                <div className="text-sm text-amber-300/80">Monthly Bestowals</div>
              </div>
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}
                >
                  <Flame className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                </motion.div>
                <div className="font-mono text-4xl font-bold text-white mb-1">
                  {stats?.streak || 0}
                </div>
                <div className="text-sm text-amber-300/80">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Follower Growth Chart */}
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Follower Growth (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-2">
              {[...Array(7)].map((_, i) => {
                const height = Math.random() * 100;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="flex-1 bg-gradient-to-t from-amber-500 to-orange-500 rounded-t"
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bestowal Products */}
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Top Bestowal Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Product A', 'Product B', 'Product C', 'Product D', 'Product E'].map((product, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-amber-300">{product}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-amber-900/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(5 - i) * 20}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                      />
                    </div>
                    <span className="text-white font-mono text-sm">${(5 - i) * 10}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Activity Heat-map */}
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Hourly Activity (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const intensity = Math.random();
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="aspect-square rounded"
                    style={{
                      backgroundColor: `rgba(251, 191, 36, ${intensity})`,
                    }}
                    title={`${i}:00`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
          <CardHeader>
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {['First Follower', '10 Bestowals', '7 Day Streak', '100 Followers', 'Top Sower', 'Community Hero'].map((achievement, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  className="aspect-square bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg border border-amber-500/30 flex items-center justify-center p-2"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🏆</div>
                    <div className="text-xs text-amber-300">{achievement}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-amber-300 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v);
              setSearchParams({ tab: v });
            }}>
              <TabsList className="grid w-full grid-cols-5 bg-amber-900/30 border border-amber-500/20 mb-4">
                <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="marketing" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  📈 Marketing
                </TabsTrigger>
                <TabsTrigger value="growth" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  Growth
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  Activity
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold text-white mb-2">#{stats?.rank || 1}</div>
                    <div className="text-amber-300/80">Your current rank</div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400 text-lg px-4 py-2">
                      +2 to next rank
                    </Badge>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="leaderboard">
                <LeaderboardTable virtualised />
              </TabsContent>
              <TabsContent value="marketing">
                <MarketingAnalyticsTab />
              </TabsContent>
              <TabsContent value="growth">
                <div className="text-center py-8 text-amber-300/60">Growth charts coming soon...</div>
              </TabsContent>
              <TabsContent value="activity">
                <div className="text-center py-8 text-amber-300/60">Activity stats coming soon...</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Share Stats Footer */}
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Share Your Stats</h3>
              <p className="text-amber-300/80">Generate an image and share to double XP for 24h!</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {isSharing ? 'Sharing...' : 'Share Stats'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-amber-900/95 border-amber-500 text-amber-100">
                  <p>Share to double XP for 24 hours!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

