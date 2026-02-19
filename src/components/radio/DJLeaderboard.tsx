import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Trophy, Mic, Users, Gift, Flame } from 'lucide-react';

interface LeaderboardEntry {
  dj_id: string;
  dj_name: string;
  avatar_url?: string;
  total_shows: number;
  total_listeners: number;
  total_bestow: number;
  badge_count: number;
}

export const DJLeaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('shows');

  useEffect(() => {
    const fetch = async () => {
      // Get all active DJs
      const { data: djs } = await supabase
        .from('radio_djs')
        .select('id, dj_name, avatar_url')
        .eq('is_active', true);

      if (!djs) { setLoading(false); return; }

      // Get session stats per DJ
      const results: LeaderboardEntry[] = [];

      for (const dj of djs) {
        // Count shows
        const { count: showCount } = await supabase
          .from('radio_schedule')
          .select('id', { count: 'exact', head: true })
          .eq('dj_id', dj.id)
          .in('status', ['ended', 'completed']);

        // Sum listeners and bestow
        const { data: sessions } = await supabase
          .from('radio_live_sessions')
          .select('peak_listeners, total_bestow_amount')
          .in('schedule_id', 
            (await supabase.from('radio_schedule').select('id').eq('dj_id', dj.id)).data?.map((s: any) => s.id) || []
          );

        const totalListeners = sessions?.reduce((sum: number, s: any) => sum + (s.peak_listeners || 0), 0) || 0;
        const totalBestow = sessions?.reduce((sum: number, s: any) => sum + (Number(s.total_bestow_amount) || 0), 0) || 0;

        // Count badges
        const { count: badgeCount } = await supabase
          .from('radio_dj_badges')
          .select('id', { count: 'exact', head: true })
          .eq('dj_id', dj.id);

        results.push({
          dj_id: dj.id,
          dj_name: dj.dj_name,
          avatar_url: dj.avatar_url,
          total_shows: showCount || 0,
          total_listeners: totalListeners,
          total_bestow: totalBestow,
          badge_count: badgeCount || 0,
        });
      }

      setEntries(results);
      setLoading(false);
    };

    fetch();
  }, []);

  const sortedEntries = [...entries].sort((a, b) => {
    if (tab === 'shows') return b.total_shows - a.total_shows;
    if (tab === 'listeners') return b.total_listeners - a.total_listeners;
    if (tab === 'bestow') return b.total_bestow - a.total_bestow;
    return 0;
  });

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getValue = (entry: LeaderboardEntry) => {
    if (tab === 'shows') return `${entry.total_shows} shows`;
    if (tab === 'listeners') return `${entry.total_listeners} listeners`;
    if (tab === 'bestow') return `${entry.total_bestow} seeds`;
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          DJ Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="shows" className="gap-1 text-xs">
              <Mic className="h-3 w-3" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger value="listeners" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              Listeners
            </TabsTrigger>
            <TabsTrigger value="bestow" className="gap-1 text-xs">
              <Gift className="h-3 w-3" />
              Seeds
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading leaderboard...</div>
          ) : sortedEntries.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No DJs to rank yet</div>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry, i) => (
                <motion.div
                  key={entry.dj_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    i === 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300' :
                    i === 1 ? 'bg-slate-50 dark:bg-slate-950/20 border-slate-300' :
                    i === 2 ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-300' :
                    'bg-card'
                  }`}
                >
                  <span className="text-lg font-bold w-8 text-center shrink-0">{getMedal(i)}</span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {entry.dj_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{entry.dj_name}</p>
                    {entry.badge_count > 0 && (
                      <p className="text-[10px] text-muted-foreground">{entry.badge_count} badge{entry.badge_count > 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {getValue(entry)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};
