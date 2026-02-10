import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, TrendingUp, TrendingDown, Share2, Medal, Crown, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useVirtualizer } from '@tanstack/react-virtual';

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  avatar_url?: string;
  score: number;
  delta: number;
  badge?: string;
}

type FilterType = 'xp' | 'bestowals' | 'followers' | 'streak';
type TimeRange = 'week' | 'month' | 'all-time';

interface LeaderboardTableProps {
  filters?: FilterType[];
  virtualised?: boolean;
}

export function LeaderboardTable({ filters = ['xp', 'bestowals', 'followers', 'streak'], virtualised = true }: LeaderboardTableProps) {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('xp');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: leaderboard.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedFilter, timeRange]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      let entries: LeaderboardEntry[] = [];
      
      if (selectedFilter === 'xp') {
        // Real XP data from user_points joined with profiles
        const { data: points } = await supabase
          .from('user_points')
          .select('user_id, total_points, level')
          .order('total_points', { ascending: false })
          .limit(100);

        if (points && points.length > 0) {
          const userIds = points.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

          entries = points.map((p, i) => {
            const profile = profileMap.get(p.user_id);
            return {
              id: p.user_id,
              rank: i + 1,
              username: profile?.display_name || 'Anonymous',
              avatar_url: profile?.avatar_url || undefined,
              score: p.total_points || 0,
              delta: 0,
              badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
            };
          });
        }
      } else if (selectedFilter === 'bestowals') {
        // Real bestowals data grouped by bestower
        const query = supabase
          .from('bestowals')
          .select('bestower_id, amount')
          .eq('payment_status', 'completed');
        
        if (timeRange !== 'all-time') {
          query.gte('created_at', startDate.toISOString());
        }

        const { data: bestowals } = await query;

        const grouped: Record<string, number> = {};
        (bestowals || []).forEach(b => {
          grouped[b.bestower_id] = (grouped[b.bestower_id] || 0) + (b.amount || 0);
        });

        const sortedIds = Object.entries(grouped)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 100);

        if (sortedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', sortedIds.map(([id]) => id));

          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

          entries = sortedIds.map(([id, score], i) => {
            const profile = profileMap.get(id);
            return {
              id,
              rank: i + 1,
              username: profile?.display_name || 'Anonymous',
              avatar_url: profile?.avatar_url || undefined,
              score,
              delta: 0,
              badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
            };
          });
        }
      } else if (selectedFilter === 'followers') {
        // Real followers data grouped by following_id
        const query = supabase
          .from('followers')
          .select('following_id');

        if (timeRange !== 'all-time') {
          query.gte('created_at', startDate.toISOString());
        }

        const { data: followers } = await query;

        const grouped: Record<string, number> = {};
        (followers || []).forEach(f => {
          grouped[f.following_id] = (grouped[f.following_id] || 0) + 1;
        });

        const sortedIds = Object.entries(grouped)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 100);

        if (sortedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', sortedIds.map(([id]) => id));

          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

          entries = sortedIds.map(([id, score], i) => {
            const profile = profileMap.get(id);
            return {
              id,
              rank: i + 1,
              username: profile?.display_name || 'Anonymous',
              avatar_url: profile?.avatar_url || undefined,
              score,
              delta: 0,
              badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
            };
          });
        }
      } else if (selectedFilter === 'streak') {
        // Use level from user_points as streak indicator
        const { data: points } = await supabase
          .from('user_points')
          .select('user_id, level, total_points')
          .order('level', { ascending: false })
          .order('total_points', { ascending: false })
          .limit(100);

        if (points && points.length > 0) {
          const userIds = points.map(p => p.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', userIds);

          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

          entries = points.map((p, i) => {
            const profile = profileMap.get(p.user_id);
            return {
              id: p.user_id,
              rank: i + 1,
              username: profile?.display_name || 'Anonymous',
              avatar_url: profile?.avatar_url || undefined,
              score: p.level || 1,
              delta: 0,
              badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
            };
          });
        }
      }

      setLeaderboard(entries);

      // Find user's rank
      if (user?.id) {
        const userEntry = entries.find(e => e.id === user.id);
        setUserRank(userEntry ? userEntry.rank : null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score: number) => {
    if (selectedFilter === 'bestowals') {
      return `$${score.toFixed(2)}`;
    }
    return score.toLocaleString();
  };

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'crown':
        return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'medal':
        return <Medal className="h-4 w-4 text-amber-400" />;
      case 'star':
        return <Star className="h-4 w-4 text-amber-300" />;
      default:
        return null;
    }
  };

  const handleShareRank = async () => {
    if (!userRank) return;
    const shareText = `I'm ranked #${userRank} on sow2grow leaderboard! Join me: s2gapp.com`;
    await navigator.clipboard.writeText(shareText);
    // TODO: Generate OG image
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Time Range */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs value={selectedFilter} onValueChange={(v) => setSelectedFilter(v as FilterType)}>
          <TabsList className="bg-amber-900/30 border border-amber-500/20">
            {filters.map((filter) => (
              <TabsTrigger 
                key={filter} 
                value={filter}
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-32 bg-amber-900/30 border-amber-500/20 text-amber-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-amber-900/95 border-amber-500/20">
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="all-time">All-time</SelectItem>
          </SelectContent>
        </Select>

        {userRank && (
          <Button
            onClick={handleShareRank}
            size="sm"
            className="ml-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Rank #{userRank}
          </Button>
        )}
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-amber-950/95 backdrop-blur-sm border-b border-amber-500/20 py-3 px-4 grid grid-cols-5 gap-4 text-xs font-semibold text-amber-300/80">
        <div>Rank</div>
        <div>User</div>
        <div className="text-center">Score</div>
        <div className="text-center">Δ Yesterday</div>
        <div className="text-center">Badge</div>
      </div>

      {/* Virtualized List */}
      {virtualised ? (
        <div ref={parentRef} className="h-[600px] overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = leaderboard[virtualRow.index];
              const isCurrentUser = entry.id === user?.id;

              return (
                <motion.div
                  key={entry.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: virtualRow.index * 0.02 }}
                >
                  <div
                    className={`grid grid-cols-5 gap-4 py-4 px-4 border-b border-amber-500/10 hover:bg-amber-900/20 transition-colors ${
                      isCurrentUser ? 'bg-amber-500/20 ring-2 ring-amber-500/50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <span className={`font-bold ${isCurrentUser ? 'text-amber-300' : 'text-white'}`}>
                        #{entry.rank}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 border border-amber-500/30">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback className="bg-amber-500/20 text-amber-300 text-xs">
                          {entry.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`text-sm truncate ${isCurrentUser ? 'text-amber-300 font-semibold' : 'text-white'}`}>
                        {entry.username}
                        {isCurrentUser && ' (You)'}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-white font-mono">{formatScore(entry.score)}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      {entry.delta > 0 ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400 text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{entry.delta}
                        </Badge>
                      ) : entry.delta < 0 ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-400 text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {entry.delta}
                        </Badge>
                      ) : (
                        <span className="text-xs text-amber-300/60">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-center">
                      {getBadgeIcon(entry.badge)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.id === user?.id;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`grid grid-cols-5 gap-4 py-4 px-4 border-b border-amber-500/10 hover:bg-amber-900/20 transition-colors ${
                  isCurrentUser ? 'bg-amber-500/20 ring-2 ring-amber-500/50' : ''
                }`}
              >
                <div className="flex items-center">
                  <span className={`font-bold ${isCurrentUser ? 'text-amber-300' : 'text-white'}`}>
                    #{entry.rank}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 border border-amber-500/30">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback className="bg-amber-500/20 text-amber-300 text-xs">
                      {entry.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`text-sm truncate ${isCurrentUser ? 'text-amber-300 font-semibold' : 'text-white'}`}>
                    {entry.username}
                    {isCurrentUser && ' (You)'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-white font-mono">{formatScore(entry.score)}</span>
                </div>
                <div className="flex items-center justify-center">
                  {entry.delta > 0 ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{entry.delta}
                    </Badge>
                  ) : entry.delta < 0 ? (
                    <Badge className="bg-red-500/20 text-red-400 border-red-400 text-xs">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {entry.delta}
                    </Badge>
                  ) : (
                    <span className="text-xs text-amber-300/60">—</span>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {getBadgeIcon(entry.badge)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

