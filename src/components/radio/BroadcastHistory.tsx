import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Radio, Users, Heart, Gift } from 'lucide-react';
import { PostBroadcastStats } from './PostBroadcastStats';

interface BroadcastEntry {
  id: string;
  started_at: string;
  ended_at: string | null;
  viewer_count: number;
  peak_listeners: number;
  total_reactions: number;
  total_bestow_amount: number;
  schedule: {
    show_name: string;
  } | null;
}

interface BroadcastHistoryProps {
  djId: string;
}

export const BroadcastHistory: React.FC<BroadcastHistoryProps> = ({ djId }) => {
  const [sessions, setSessions] = useState<BroadcastEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!djId) return;

    const fetch = async () => {
      // Get DJ's schedule IDs
      const { data: schedules } = await supabase
        .from('radio_schedule')
        .select('id, radio_shows(show_name)')
        .eq('dj_id', djId);

      if (!schedules || schedules.length === 0) {
        setLoading(false);
        return;
      }

      const scheduleIds = schedules.map((s: any) => s.id);
      const scheduleMap = new Map(schedules.map((s: any) => [s.id, s.radio_shows]));

      const { data: sessionData } = await supabase
        .from('radio_live_sessions')
        .select('id, started_at, ended_at, viewer_count, peak_listeners, total_reactions, total_bestow_amount, schedule_id')
        .in('schedule_id', scheduleIds)
        .order('started_at', { ascending: false })
        .limit(20);

      if (sessionData) {
        setSessions(sessionData.map((s: any) => ({
          ...s,
          schedule: scheduleMap.get(s.schedule_id) || null,
        })));
      }

      setLoading(false);
    };

    fetch();
  }, [djId]);

  if (loading) {
    return <div className="text-center py-6 text-sm text-muted-foreground">Loading history...</div>;
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No broadcasts yet. Go live to see your history!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <History className="h-4 w-4" />
        Broadcast History ({sessions.length})
      </h3>
      {sessions.map((s) => (
        <div key={s.id}>
          <button
            onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {s.schedule?.show_name || 'Broadcast'}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {new Date(s.started_at).toLocaleDateString()}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {s.peak_listeners || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" /> {s.total_reactions || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Gift className="h-3 w-3" /> {s.total_bestow_amount || 0}
                </span>
              </div>
            </div>
          </button>
          {expandedId === s.id && (
            <div className="mt-2">
              <PostBroadcastStats sessionId={s.id} showName={s.schedule?.show_name} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
