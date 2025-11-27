import React, { useState, useMemo } from 'react';
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

      // Fetch leaderboard data based on filter
      let entries: LeaderboardEntry[] = [];
      
      if (selectedFilter === 'xp') {
        // Mock XP leaderboard - in production would query XP table
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .limit(100);

        entries = (profiles || []).map((p, i) => ({
          id: p.user_id,
          rank: i + 1,
          username: p.display_name || 'Anonymous',
          avatar_url: p.avatar_url,
          score: (100 - i) * 100 + Math.floor(Math.random() * 500),
          delta: Math.floor(Math.random() * 20) - 10,
          badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
        }));
      } else if (selectedFilter === 'bestowals') {
        // Fetch by bestowals amount
        const { data: bestowals } = await supabase
          .from('bestowals')
          .select('bestower_id, amount, profiles!bestower_id(display_name, avatar_url)')
          .gte('created_at', startDate.toISOString())
          .order('amount', { ascending: false })
          .limit(100);

        const grouped = (bestowals || []).reduce((acc: any, b: any) => {
          const id = b.bestower_id;
          if (!acc[id]) {
            acc[id] = {
              id,
              username: b.profiles?.display_name || 'Anonymous',
              avatar_url: b.profiles?.avatar_url,
              score: 0,
              delta: 0
            };
          }
          acc[id].score += b.amount || 0;
          return acc;
        }, {});

        entries = Object.values(grouped)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 100)
          .map((entry: any, i) => ({
            ...entry,
            rank: i + 1,
            delta: Math.floor(Math.random() * 50) - 25,
            badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
          }));
      } else if (selectedFilter === 'followers') {
        // Fetch by followers count
        const { data: followers } = await supabase
          .from('followers')
          .select('following_id, profiles!following_id(display_name, avatar_url)')
          .gte('created_at', startDate.toISOString());

        const grouped = (followers || []).reduce((acc: any, f: any) => {
          const id = f.following_id;
          if (!acc[id]) {
            acc[id] = {
              id,
              username: f.profiles?.display_name || 'Anonymous',
              avatar_url: f.profiles?.avatar_url,
              score: 0,
              delta: 0
            };
          }
          acc[id].score += 1;
          return acc;
        }, {});

        entries = Object.values(grouped)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 100)
          .map((entry: any, i) => ({
            ...entry,
            rank: i + 1,
            delta: Math.floor(Math.random() * 10) - 5,
            badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
          }));
      } else {
        // Streak - mock data
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .limit(100);

        entries = (profiles || []).map((p, i) => ({
          id: p.user_id,
          rank: i + 1,
          username: p.display_name || 'Anonymous',
          avatar_url: p.avatar_url,
          score: Math.floor(Math.random() * 30) + 1,
          delta: Math.floor(Math.random() * 5) - 2,
          badge: i === 0 ? 'crown' : i < 3 ? 'medal' : i < 10 ? 'star' : undefined
        }));
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

