import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Radio, Users, Headphones, Play } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function LiveSessionsWidget() {
  const navigate = useNavigate();
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveSessions();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveSessions, 30000);

    // Set up realtime subscription
    const channel = supabase
      .channel('live-sessions-widget')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'radio_schedule'
        },
        () => {
          fetchLiveSessions();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          id,
          start_time,
          end_time,
          listener_count,
          radio_shows (
            show_name,
            description,
            category
          ),
          radio_djs (
            dj_name,
            avatar_url
          ),
          radio_live_sessions (
            id,
            status
          )
        `)
        .eq('status', 'live')
        .order('start_time', { ascending: true })
        .limit(3);

      if (error) throw error;
      setLiveSessions(data || []);
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || liveSessions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-red-500/10 via-orange-500/10 to-red-500/10 border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500 animate-pulse" />
          🔴 Live Now on Grove Station
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {liveSessions.map((session) => (
          <Card key={session.id} className="border-2 hover:border-primary/50 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="animate-pulse">
                      <Radio className="h-3 w-3 mr-1" />
                      LIVE
                    </Badge>
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {session.listener_count || 0} listening
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-bold">{session.radio_shows?.show_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      with {session.radio_djs?.dj_name}
                    </p>
                  </div>

                  {session.radio_shows?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {session.radio_shows.description}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => navigate('/grove-station')}
                  className="bg-red-600 hover:bg-red-700 shrink-0"
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/grove-station')}
        >
          <Play className="h-4 w-4 mr-2" />
          View All Live Shows
        </Button>
      </CardContent>
    </Card>
  );
}
