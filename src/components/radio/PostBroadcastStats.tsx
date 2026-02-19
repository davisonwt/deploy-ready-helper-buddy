import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { BarChart3, Users, Heart, Gift, Music, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SessionStats {
  id: string;
  started_at: string;
  ended_at: string | null;
  viewer_count: number;
  peak_listeners: number;
  total_reactions: number;
  total_bestow_amount: number;
  most_clapped_segment: number | null;
}

interface ReactionBreakdown {
  heart: number;
  clap: number;
  fire: number;
  pray: number;
  mind_blown: number;
}

interface PostBroadcastStatsProps {
  sessionId: string;
  showName?: string;
}

export const PostBroadcastStats: React.FC<PostBroadcastStatsProps> = ({ sessionId, showName }) => {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [reactions, setReactions] = useState<ReactionBreakdown>({ heart: 0, clap: 0, fire: 0, pray: 0, mind_blown: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const fetch = async () => {
      // Fetch session stats
      const { data: session } = await supabase
        .from('radio_live_sessions')
        .select('id, started_at, ended_at, viewer_count, peak_listeners, total_reactions, total_bestow_amount, most_clapped_segment')
        .eq('id', sessionId)
        .single();

      if (session) setStats(session as SessionStats);

      // Fetch reaction breakdown
      const { data: rxns } = await supabase
        .from('radio_reactions')
        .select('reaction_type')
        .eq('session_id', sessionId);

      if (rxns) {
        const breakdown: ReactionBreakdown = { heart: 0, clap: 0, fire: 0, pray: 0, mind_blown: 0 };
        rxns.forEach((r: any) => {
          if (r.reaction_type in breakdown) {
            breakdown[r.reaction_type as keyof ReactionBreakdown]++;
          }
        });
        setReactions(breakdown);
      }

      setLoading(false);

      // Celebration confetti on load
      setTimeout(() => {
        confetti({ particleCount: 60, spread: 80, origin: { y: 0.4 } });
      }, 500);
    };

    fetch();
  }, [sessionId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading broadcast stats...
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const duration = stats.ended_at && stats.started_at
    ? Math.round((new Date(stats.ended_at).getTime() - new Date(stats.started_at).getTime()) / 60000)
    : 0;

  const totalReactions = Object.values(reactions).reduce((sum, v) => sum + v, 0);
  const topReaction = Object.entries(reactions).sort(([, a], [, b]) => b - a)[0];

  const EMOJI_MAP: Record<string, string> = {
    heart: '❤️', clap: '👏', fire: '🔥', pray: '🙏', mind_blown: '🤯',
  };

  const statItems = [
    { icon: <Users className="h-5 w-5" />, label: 'Peak Listeners', value: stats.peak_listeners || 0, color: 'text-blue-500' },
    { icon: <Clock className="h-5 w-5" />, label: 'Duration', value: `${duration} min`, color: 'text-green-500' },
    { icon: <Heart className="h-5 w-5" />, label: 'Total Reactions', value: totalReactions, color: 'text-pink-500' },
    { icon: <Gift className="h-5 w-5" />, label: 'Seeds Received', value: stats.total_bestow_amount || 0, color: 'text-amber-500' },
  ];

  return (
    <Card className="border-2 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Broadcast Summary
          {showName && <span className="text-sm font-normal text-muted-foreground">— {showName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Main stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-4 rounded-xl bg-muted/50 border"
            >
              <div className={`${item.color} mx-auto mb-2`}>{item.icon}</div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Reaction breakdown */}
        {totalReactions > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Reaction Breakdown</p>
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(reactions)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <Badge key={type} variant="outline" className="gap-1 text-sm py-1 px-3">
                    <span>{EMOJI_MAP[type]}</span>
                    <span className="font-bold">{count}</span>
                  </Badge>
                ))}
            </div>
            {topReaction && topReaction[1] > 0 && (
              <p className="text-xs text-muted-foreground">
                Most popular: {EMOJI_MAP[topReaction[0]]} {topReaction[0]} ({topReaction[1]} times)
              </p>
            )}
          </div>
        )}

        {/* Broadcast date */}
        <p className="text-xs text-muted-foreground text-center">
          Broadcast on {new Date(stats.started_at).toLocaleDateString()} at{' '}
          {new Date(stats.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </CardContent>
    </Card>
  );
};
