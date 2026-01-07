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
      
      // Fetch top 3 sowers by XP from user_points table
      const { data: topUsers, error } = await supabase
        .from('user_points')
        .select('user_id, total_points, level')
        .order('total_points', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get profiles for top users
      const userIds = (topUsers || []).map(u => u.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const realTopSowers: TopSower[] = (topUsers || []).slice(0, 3).map((u, i) => {
        const profile = profileMap.get(u.user_id);
        return {
          id: u.user_id,
          username: profile?.display_name || 'Anonymous',
          avatar_url: profile?.avatar_url,
          xp: u.total_points || 0,
          rank: i + 1
        };
      });

      setTopSowers(realTopSowers);

      // Get user's rank
      if (user?.id) {
        const userIndex = (topUsers || []).findIndex(u => u.user_id === user.id);
        if (userIndex >= 0) {
          const nextUser = topUsers?.[userIndex - 1];
          const gap = nextUser ? (nextUser.total_points - (topUsers?.[userIndex]?.total_points || 0)) : 0;
          setUserRank({ rank: userIndex + 1, gap: Math.max(1, gap) });
        } else {
          // User not in top 10, estimate rank
          const { count } = await supabase.from('user_points').select('*', { count: 'exact', head: true });
          setUserRank({ rank: Math.min((count || 100) + 1, 999), gap: 100 });
        }
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

