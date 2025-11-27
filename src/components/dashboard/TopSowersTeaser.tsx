import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface TopSower {
  id: string;
  username: string;
  avatar_url?: string;
  xp: number;
  rank: number;
}

export function TopSowersTeaser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topSowers, setTopSowers] = useState<TopSower[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; gap: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopSowers();
  }, []);

  const fetchTopSowers = async () => {
    try {
      setLoading(true);
      
      // Fetch top 3 sowers by XP (this week)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      // For now, we'll use a simplified query - in production you'd have an XP/leaderboard table
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .limit(3);

      // Mock XP data - in production this would come from a gamification/XP table
      const mockTopSowers: TopSower[] = (profiles || []).slice(0, 3).map((p, i) => ({
        id: p.user_id,
        username: p.display_name || 'Anonymous',
        avatar_url: p.avatar_url,
        xp: (3 - i) * 1000 + Math.floor(Math.random() * 500),
        rank: i + 1
      }));

      setTopSowers(mockTopSowers);

      // Get user's rank
      if (user?.id) {
        // Mock user rank - in production calculate from leaderboard
        setUserRank({ rank: 14, gap: 2 });
      }
    } catch (error) {
      console.error('Error fetching top sowers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullBoard = () => {
    navigate('/stats?tab=leaderboard');
  };

  if (loading) {
    return (
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10 animate-pulse">
        <CardContent className="p-6 h-48" />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="rounded-3xl bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl border border-amber-500/20 shadow-2xl shadow-amber-500/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-amber-300 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Sowers This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top 3 Sowers */}
          <div className="space-y-3">
            {topSowers.map((sower, index) => (
              <motion.div
                key={sower.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                    {sower.rank}
                  </div>
                  <Avatar className="h-10 w-10 border-2 border-amber-500/30">
                    <AvatarImage src={sower.avatar_url} />
                    <AvatarFallback className="bg-amber-500/20 text-amber-300">
                      {sower.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{sower.username}</p>
                    <p className="text-xs text-amber-300/80">{sower.xp.toLocaleString()} XP</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* User Rank */}
          {userRank && (
            <div className="pt-3 border-t border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-300">You</span>
                  <span className="text-sm font-bold text-white">#{userRank.rank}</span>
                  <span className="text-xs text-emerald-400">+{userRank.gap} to next</span>
                </div>
              </div>
              <Progress 
                value={(userRank.gap / 5) * 100} 
                className="h-1.5 bg-amber-900/30"
              />
            </div>
          )}

          {/* CTA Button */}
          <Button
            onClick={handleViewFullBoard}
            className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            View Full Board
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

