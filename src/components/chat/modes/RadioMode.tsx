import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Mic, Calendar, Users, Music } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioLiveSessionManager } from '@/components/radio/RadioLiveSessionManager';
import { format } from 'date-fns';

interface RadioSchedule {
  id: string;
  show_name: string;
  description: string;
  scheduled_date: string;
  time_slot: string;
  dj_id: string;
  status: string;
  dj_profile?: {
    display_name: string;
    avatar_url: string;
  };
}

export const RadioMode: React.FC = () => {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<RadioSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<RadioSchedule | null>(null);

  useEffect(() => {
    loadRadioSchedule();
  }, [user]);

  const loadRadioSchedule = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: scheduleData } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          dj_profile:dj_id(display_name, avatar_url)
        `)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(20);

      setSchedule((scheduleData as any) || []);
    } catch (error) {
      console.error('Error loading radio schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      scheduled: { label: 'Upcoming', variant: 'secondary' },
      live: { label: 'Live Now', variant: 'default' },
      completed: { label: 'Completed', variant: 'outline' },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (selectedSchedule) {
    return (
      <div>
        <Button
          variant="outline"
          className="mb-4 glass-button"
          onClick={() => setSelectedSchedule(null)}
        >
          ← Back to Schedule
        </Button>
        <RadioLiveSessionManager
          schedule={selectedSchedule as any}
          currentShow={null}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            Radio Broadcasts
          </CardTitle>
          <CardDescription>
            Listen to live audio streams, DJ sets, and participate in real-time discussions
          </CardDescription>
        </CardHeader>
      </Card>

      {schedule.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Radio className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Shows Scheduled</h3>
            <p className="text-muted-foreground">
              There are no radio broadcasts scheduled at this time
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedule.map((show) => (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="glass-card h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{show.show_name}</CardTitle>
                      {getStatusBadge(show.status)}
                    </div>
                    {show.status === 'live' && (
                      <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {show.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mic className="w-4 h-4" />
                    <span>DJ: {(show.dj_profile as any)?.display_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(show.scheduled_date), 'PPP')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Music className="w-4 h-4" />
                    <span>{show.time_slot}</span>
                  </div>
                  {show.status === 'live' && (
                    <Button
                      onClick={() => setSelectedSchedule(show)}
                      className="w-full glass-button"
                    >
                      <Radio className="w-4 h-4 mr-2" />
                      Listen Live
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
